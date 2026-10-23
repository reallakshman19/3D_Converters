"""Real CII-writer fixtures + negative/surviving-error challenges.

Run from repository root:
python -m unittest discover -s tests -p test_cii2019_short_simplify.py -v
"""
import json
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "converters" / "scripts"
sys.path.insert(0,str(SCRIPTS))
import xml_to_cii2019 as writer
import cii2019_short_simplify as simplify


def node(number, x, *, y=0.0, z=0.0, type="PIPE", rigid=None, weight=0, node_name=""):
    return writer.XmlNode(
        node_number=number,node_name=node_name,endpoint=1,component_type=type,
        component_ref_no="",rigid=rigid,weight=weight,material_code=1,
        outside_diameter=100,alpha_angle=None,wall_thickness=4,
        corrosion_allowance=0,insulation_thickness=0,bend_radius=0,
        bend_type=None,position=(float(x),float(y),float(z)),restraint_specs=(),
    )


def emitted(branches, *, restraints=(), restraint_map=None, mass=False):
    b = [writer.XmlBranch(branch_name=f"LINE{j}",branch_temperature=100,
        branch_pressure=5,branch_fluid_density=0,material_number=1,
        temperatures=(100,),pressures=(5,),nodes=nodes)
        for j,nodes in enumerate(branches,1)]
    metadata=writer.XmlMetadata(date_time="",source="",version="",user_name="",purpose="",
        project_name="",mdb_name="",title_lines=[],restrain_open_ends=False,ambient_temperature=20.)
    edges=writer._build_edges(b)
    rigid_edges, rigid_map = writer._build_rigid_indices(edges)
    m=writer.ConversionModel(
        metadata=metadata,edges=edges,degrees=writer._build_degree_map(edges),
        nodename_lines=[],edge_to_nodename_index={},bend_edges=[],edge_to_bend_index={},
        rigid_edges=rigid_edges,edge_to_rigid_index=rigid_map,
        sif_edges=[],edge_to_sif_index={},reducer_edges=[],edge_to_reducer_index={},
        restraints=list(restraints),edge_to_restraint_index=restraint_map or {},
    )
    return writer._build_cii_text(m,"none",writer.DEFAULT_VERSION_LINE)


def rename_element(text,index,name):
    order,s=simplify.sections_of(text)
    offset=index*15+9
    s["ELEMENTS"][offset]=f"{len(name):12d} {name}"
    return "\n".join(row for key in order for row in ["#$ "+key,*s[key]])+"\n"


def invalid_units(text):
    return text.replace("  SI (mm)        ","  UNKNOWN        ")


class ShortElements(unittest.TestCase):
    def run_case(self,text,mode="simplify",packet=None):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)
            source=d/"input.cii"; target=d/"candidate.cii"; report=d/"short-element-simplification-report.json"
            source.write_text(text)
            final=d/"final.json" if packet else None
            if final:
                final.write_text('{"owner":"a"}')
            rc,audit=simplify.process(source,target,report,mode=mode,native_final_packet=final)
            self.assertEqual(audit,json.loads(report.read_text()))
            return rc,audit,target.read_bytes() if target.exists() else None

    def test_straight_run_merges_only_short_element_and_preserves_total_length(self):
        text=emitted([[node(10,0),node(20,6),node(30,106)]])
        rc,r,output=self.run_case(text)
        self.assertEqual(rc,0,json.dumps(r,sort_keys=True)[:5000])
        self.assertEqual((r["input_elements"],r["output_elements"]),(2,1))
        self.assertEqual([c["disposition"] for c in r["candidates"]],["MERGED_SAFE"])
        self.assertEqual(simplify.parse(output.decode())[2][0].length,106)
        self.assertEqual(r["topology"]["before"]["component_count"],r["topology"]["after"]["component_count"])

    def test_threshold_inclusive_and_outside(self):
        text=emitted([[node(10,0),node(20,6.000),node(30,106.000)]])
        self.assertEqual(self.run_case(text)[1]["short_elements_le_6mm"],1)
        text=emitted([[node(10,0),node(20,6.001),node(30,106.001)]])
        self.assertEqual(self.run_case(text)[1]["short_elements_le_6mm"],0)

    def test_gasket_2mm_named_owner_protected(self):
        text=rename_element(emitted([[node(10,0),node(20,2),node(30,102)]]),0,"GASKET")
        rc,r,output=self.run_case(text)
        self.assertEqual((r["input_elements"],r["output_elements"]),(2,2),json.dumps(r,sort_keys=True)[:5000])
        self.assertEqual(r["candidates"][0]["disposition"],"PROTECTED")
        self.assertEqual(output,text.encode())

    def test_restraint_on_internal_node_protected(self):
        rs=writer.RestraintSpec(type_code=14,stiffness=1.75127e12,gap=0,
                                friction=0.3,is_open_end=False)
        assigned=writer.AssignedRestraint(node_number=20,specs=(rs,),position=(3,0,0),kind="REST")
        text=emitted([[node(10,0),node(20,3),node(30,103)]],
                     restraints=[assigned],restraint_map={0:1})
        rc,r,_=self.run_case(text)
        self.assertEqual(r["candidates"][0]["disposition"],"PROTECTED")

    def test_tee_branch_protected(self):
        text=emitted([[node(10,0),node(20,3),node(30,103)],
                      [node(20,3),node(40,3),node(50,103)]])
        rc,r,_=self.run_case(text)
        self.assertTrue(any(c["disposition"]=="PROTECTED" for c in r["candidates"]))

    def test_accepted_rigid_mass_owner_protected(self):
        text=emitted([[node(10,0),node(20,3,rigid=2,weight=50),node(30,103)]])
        rc,r,_=self.run_case(text)
        self.assertEqual(r["candidates"][0]["disposition"],"PROTECTED")
        self.assertEqual(r["output_elements"],2)

    def test_final_packet_forbids_physical_merge(self):
        text=emitted([[node(10,0),node(20,3),node(30,103)]])
        rc,r,_=self.run_case(text,packet=True)
        self.assertEqual(rc,2)
        self.assertEqual(r["status"],"HOLD")
        self.assertEqual(r["candidates"][0]["disposition"],"PROTECTED")

    def test_overlapping_short_chain_cannot_double_contract(self):
        text=emitted([[node(10,0),node(20,3),node(30,6),node(40,106)]])
        rc,r,output=self.run_case(text)
        self.assertEqual(rc,2)  # second short candidate remains HOLD, no silent success
        self.assertIsNone(output, "HOLD must never publish a partial contraction")
        self.assertIsNone(r["output_elements"])
        self.assertIsNone(r["output_cii_sha256"])
        self.assertFalse(r["candidate_published"])
        self.assertLess(r["proposed_elements"],r["input_elements"])
        self.assertTrue(any(x["disposition"]=="BLOCKED_UNRESOLVED" for x in r["candidates"]))
        self.assertFalse(any(x["disposition"]=="MERGED_SAFE" for x in r["candidates"]))
        self.assertEqual(r["topology"]["after"]["status"],"NOT_RUN")
        self.assertEqual(r["topology"]["before"]["component_count"],
                         r["topology"]["proposed"]["component_count"])

    def test_disconnected_component_membership_is_preserved(self):
        # A component-count-only checker would accept accidental rewiring of
        # separate islands. The after graph must match projected partitions.
        text=emitted([[node(10,0),node(20,6),node(30,106)],
                      [node(100,500),node(110,620)]])
        rc,r,out=self.run_case(text)
        self.assertEqual(rc,0,json.dumps(r,sort_keys=True)[:3000])
        self.assertEqual(r["topology"]["before"]["component_count"],2)
        self.assertEqual(r["topology"]["after"]["components"],[[10,30],[100,110]])
        self.assertEqual((r["input_elements"],r["output_elements"]),(3,2))

    def test_reversed_emitted_edge_orientation(self):
        # The emitted neutral graph may encode a segment in reverse order.
        # Merge must preserve directed deltas rather than assume node IDs grow.
        text=emitted([[node(30,106),node(20,6),node(10,0)]])
        rc,r,out=self.run_case(text)
        self.assertEqual(rc,0,json.dumps(r,sort_keys=True)[:3000])
        self.assertEqual((r["input_elements"],r["output_elements"]),(2,1))
        self.assertEqual(r["topology"]["after"]["terminal_nodes"],[10,30])
        self.assertAlmostEqual(simplify.parse(out.decode())[2][0].length,106.0,places=4)

    def test_report_path_collision_never_modifies_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            content=emitted([[node(10,0),node(20,3),node(30,103)]])
            source=p/"immutable.cii"
            source.write_text(content)
            output=p/"candidate.cii"
            with self.assertRaisesRegex(simplify.UnsafeModel,"CII_SHORT_PATH_COLLISION"):
                simplify.process(source,output,source,mode="simplify")
            self.assertEqual(source.read_text(),content)
            self.assertFalse(output.exists())
            xml=p/"immutable.xml"
            xml.write_text("XML SOURCE MUST SURVIVE")
            with self.assertRaisesRegex(simplify.UnsafeModel,"CII_SHORT_PATH_COLLISION"):
                simplify.process(source,output,xml,mode="simplify",source_xml=xml)
            self.assertEqual(xml.read_text(),"XML SOURCE MUST SURVIVE")
            with self.assertRaisesRegex(simplify.UnsafeModel,"CII_SHORT_PATH_COLLISION"):
                simplify.validate_existing(source,output,output)
            self.assertFalse(output.exists())

    def test_unknown_units_fails_closed(self):
        text=invalid_units(emitted([[node(10,0),node(20,3),node(30,103)]]))
        rc,r,_=self.run_case(text)
        self.assertEqual(rc,2)
        self.assertNotIn("MERGED_SAFE", [c["disposition"] for c in r["candidates"]])

    def test_zero_length_and_inconsistent_loop_fail_closed(self):
        zero=emitted([[node(10,0),node(20,0),node(30,100)]])
        rc,r,_=self.run_case(zero)
        self.assertEqual(r["candidates"][0]["disposition"],"BLOCKED_UNRESOLVED")
        # Last 10 repeats with an incompatible position. Node-ID-only union
        # would silently assert false topology despite valid-looking CII rows.
        conflict=emitted([[node(10,0),node(20,3),node(30,103),node(10,1)]])
        rc,r,out=self.run_case(conflict)
        self.assertEqual(rc,2)
        self.assertIsNone(out)
        self.assertIn("CONFLICTING_NODE_GEOMETRY",r.get("failure",""))

    def test_duplicate_node_identity_and_unresolved_coordinates_fail(self):
        duplicate=emitted([[node(10,0),node(20,3),node(20,3),node(30,100)]])
        rc,r,out=self.run_case(duplicate)
        self.assertEqual(rc,2)
        self.assertIsNone(out)
        self.assertIn("SELF_LOOP",r.get("failure",""))
        order, sections = simplify.sections_of(emitted([[node(10,0),node(20,3),node(30,103)]]))
        sections["COORDS"]=[writer._row(["1"]),writer._row(["999","0","0","0"])]
        unresolved="\\n".join("#$ "+key+"\\n"+"\\n".join(sections[key]) for key in order)+"\\n"
        rc,r,out=self.run_case(unresolved)
        self.assertEqual(rc,2)
        self.assertIsNone(out)
        self.assertEqual(r["status"],"FAIL")

    def test_candidate_reproduction_catches_silent_geometry_edit(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            inp=p/"source.cii"; candidate=p/"candidate.cii"; report=p/"audit.json"
            inp.write_text(emitted([[node(10,0),node(20,6),node(30,106)]]))
            rc,r=simplify.process(inp,candidate,report,mode="simplify")
            self.assertEqual(rc,0,json.dumps(r,sort_keys=True)[:5000])
            rc,valid=simplify.validate_existing(inp,candidate,report)
            self.assertEqual(rc,0)
            self.assertTrue(valid["validation"]["exact_reproduction"])
            candidate.write_text(candidate.read_text().replace("106.000000","105.000000"))
            rc,invalid=simplify.validate_existing(inp,candidate,report)
            self.assertEqual(rc,2)
            self.assertEqual(invalid["validation"]["status"],"FAIL")

    def test_no_short_elements_is_byte_identical(self):
        text=emitted([[node(10,0),node(20,10),node(30,110)]])
        rc,r,out=self.run_case(text)
        self.assertEqual(rc,0)
        self.assertEqual(r["short_elements_le_6mm"],0)
        self.assertEqual(r["input_cii_sha256"],r["output_cii_sha256"])
        self.assertEqual(out,text.encode())

    def test_surviving_error_noncollinear_requires_no_merge(self):
        # A *genuine* right-angle turn: both segments have nonzero lengths.
        # A broken cosine/straightness check would incorrectly coalesce them.
        text=emitted([[node(10,0),node(20,3),node(30,3,y=4)]])
        _,_,elements=simplify.parse(text)
        self.assertEqual(tuple(round(e.length,6) for e in elements),(3.0,4.0))
        self.assertEqual(elements[0].delta,(3.0,0.0,0.0))
        self.assertEqual(elements[1].delta,(0.0,4.0,0.0))
        self.assertFalse(simplify.collinear(elements[0].delta,elements[1].delta))
        rc,r,output=self.run_case(text)
        self.assertEqual(rc,2)
        self.assertEqual(r["status"],"HOLD")
        self.assertIsNone(output)
        self.assertFalse(r["candidate_published"])
        self.assertEqual(r["input_elements"],2)
        self.assertEqual(r["short_elements_le_6mm"],2)
        self.assertTrue(all(c["reason"]=="NO_UNOWNED_COLLINEAR_SAME_PROPERTY_NEIGHBOR"
                            for c in r["candidates"]))
        self.assertTrue(all(c["disposition"]=="BLOCKED_UNRESOLVED" for c in r["candidates"]))

    def test_hold_removes_existing_output_without_touching_source(self):
        text=emitted([[node(10,0),node(20,3),node(30,6),node(40,106)]])
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            source=p/"source.cii"; output=p/"candidate.cii"; audit=p/"audit.json"
            source.write_text(text,encoding="utf-8")
            original=source.read_bytes()
            output.write_bytes(b"STALE_PARTIAL_CII_MUST_BE_DESTROYED")
            rc,r=simplify.process(source,output,audit,mode="simplify")
            self.assertEqual(rc,2)
            self.assertEqual(r["status"],"HOLD")
            self.assertFalse(r["candidate_published"])
            self.assertIsNone(r["output_cii_sha256"])
            self.assertIsNone(r["output_elements"])
            self.assertFalse(output.exists(), "No stale or partial HOLD output permitted")
            self.assertEqual(source.read_bytes(),original)
            self.assertIn("WITHHELD",audit.with_suffix(".txt").read_text())
            self.assertEqual(json.loads(audit.read_text())["status"],"HOLD")

    def test_fail_removes_existing_output_without_touching_source(self):
        text=emitted([[node(10,0),node(20,3),node(30,103)]])
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            source=p/"source.cii"; output=p/"candidate.cii"; audit=p/"audit.json"
            source.write_text(text.replace("  SI (mm)","  INVALID"),encoding="utf-8")
            original=source.read_bytes()
            # Deliberately corrupt syntax to exercise FAIL instead of HOLD.
            source.write_bytes(original.replace(b"#$ ELEMENTS",b"#$ BADSECT",1))
            original=source.read_bytes()
            output.write_bytes(b"PREEXISTING_INVALID_CII")
            rc,r=simplify.process(source,output,audit,mode="simplify")
            self.assertEqual(rc,2)
            self.assertEqual(r["status"],"FAIL")
            self.assertFalse(output.exists())
            self.assertIsNone(r["output_cii_sha256"])
            self.assertEqual(source.read_bytes(),original)

if __name__ == "__main__": unittest.main()
