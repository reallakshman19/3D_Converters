"""Rigid S1 14-pair NON-RELEASE actual native CII byte regression + delete-one mutants.

The fixture below is wholly invented with 14 independent connections and
distinct 19.1mm/109mm spans. CI never fetches protected Owner R9 data.
No source-specific R9 bytes, branch identities, or coordinates are committed.
"""
import copy
import json
import math
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'converters'/'scripts'))
from xml229_native_final_mass_binding import (
    NativeMassError, s1_build_test_only_fixture,
    s1_rlt10_length_suggestion, stage_native_original_lineage,
)
from xml229_rigid_s1_testonly import (
    MASTER_ROWS, render_s1_nonrelease, verify_actual_cii, nonrelease_guard,
)

# All 14 fixture branches, IDs, refs, and coordinates are invented.
# The geometry alone encodes R-LT9 (19.1mm PCOM, separate 109mm flange).
# Original Owner R9 is ONLY replayed in the offline Owner custody workflow.
PAIR_ROWS=[
    (f"SYNTH-CASE-{i:02d}", 5000+20*i, 6000+20*i, 5001+20*i,
     7000+i, 8000+i, 1000.0+500*i, 'P' if i%2==0 else 'B')
    for i in range(14)
]
ROUTE_POS={
    'P':([200.0]*5,[100.0,103.2,115.9,119.1,228.1]),
    'B':([300.0]*5,[400.0,403.2,415.9,419.1,528.1]),
}

def derived_source():
    root=ET.Element('PipeStressExport')
    pipe=ET.SubElement(root,'Pipe')
    for i,(section,from_id,flange_id,to_id,pcom_id,flange_ref,x,kind) in enumerate(PAIR_ROWS):
        branch=ET.SubElement(pipe,'Branch')
        ET.SubElement(branch,'Branchname').text=(
            f'SYNTH-S1-CASE-{i:02d}')
        y,z=ROUTE_POS[kind]
        pos=[f'{x:.2f} {y[j]:.2f} {z[j]:.2f}' for j in range(5)]
        row_types=['VALV','PCOM','PCOM','FLAN','RIGID']
        endpoints=['2','1','2','1','2']
        nums=[from_id,-1,-1,flange_id,to_id]
        refs=[f'134234934/TESTVALVE{i}', f'134234934/{pcom_id}',
              f'134234934/{pcom_id}', f'134234934/{flange_ref}',
              f'134234934/{flange_ref}']
        weights=['47','0','0','15','157.034']
        for j in range(5):
            node=ET.SubElement(branch,'Node')
            fields={
                'NodeNumber':str(nums[j]),'ComponentType':row_types[j],
                'ComponentRefNo':'='+refs[j], 'Endpoint':endpoints[j],
                'Weight':weights[j], 'Position':pos[j],
                'BoreMm':'50.000','Rating':'900',
                'OutsideDiameter':'60.3', 'WallThickness':'3.9116',
            }
            if j in (0,3,4):fields['Rigid']='2'
            if j in (3,4):
                fields['DTXR_POS']='WELDING NECK FLANGE SCH 40S 900+1500#'
                fields['ElementLengthMm']='109.000'
            for k,v in fields.items():
                ET.SubElement(node,k).text=v
    return ET.tostring(root,encoding='utf-8')


class RigidS1ActualCiiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=derived_source()
        cls.cii,cls.receipt=render_s1_nonrelease(cls.source)

    def test_s1a_pcom_minus1_and_geometry_pass(self):
        checks=self.receipt['checkpoints']
        self.assertEqual(len(checks),14)
        self.assertTrue(all(p['extractedFixtureLocalPCOMMinus1Ordinals']==[1,2] for p in checks))
        self.assertTrue(all(abs(p['connectionMm']-19.1)<.03 for p in checks))
        self.assertTrue(all(abs(p['flangeMm']-109)<.03 for p in checks))
        self.assertTrue(self.receipt['actualCiiBytesChecked'])
        # Delete ONE original PCOM source record: the 14-pair source gate RED.
        root=ET.fromstring(self.source)
        first=next(e for e in root.iter() if e.tag=='Branch')
        n=[n for n in first if n.tag=='Node']
        first.remove(n[1])
        with self.assertRaises(NativeMassError) as caught:
            s1_build_test_only_fixture(ET.tostring(root),MASTER_ROWS)
        self.assertEqual(caught.exception.code,'S1_SOURCE_14_PCOM_PAIR_CENSUS')

    def test_existing_main_owner_cardinality_duplicate_packet_mutant(self):
        fixture,packet,_=s1_build_test_only_fixture(self.source,MASTER_ROWS)
        self.assertEqual(packet['physicalCount'],14)
        self.assertEqual(len({x['occurrenceId'] for x in packet['components']}),14)
        packet['components'].append(copy.deepcopy(packet['components'][0]))
        packet['physicalCount']+=1
        with TemporaryDirectory() as td:
            src=Path(td)/'source.xml';src.write_bytes(fixture)
            manifest=Path(td)/'packet.json'
            manifest.write_text(json.dumps(packet))
            with self.assertRaises(NativeMassError) as caught:
                stage_native_original_lineage(src,manifest)
            self.assertEqual(caught.exception.code,'NATIVE_OWNER_DUPLICATED')

    def test_s1c_actual_cii_byte_pointer_and_mass_and_deleted_pointer(self):
        rec=copy.deepcopy(self.receipt)
        verified=verify_actual_cii(self.cii,rec)
        self.assertEqual(verified['actualTestCiiElementCount'],28)
        self.assertEqual(verified['actualTestCiiRigidCount'],28)
        self.assertTrue(all(p['actualTestCiiFlangeForceN']==150 for p in
                            verified['checkpoints']))
        self.assertTrue(all(p['actualTestCiiSuggestedForceN']==26.3 for p in
                            verified['checkpoints']))
        lines=self.cii.splitlines()
        j=lines.index('#$ ELEMENTS')+1+12
        lines[j]='0 0 0 0 0 0'  # DELETE one real row-13 RIGID pointer.
        bad='\n'.join(lines)+'\n'
        with self.assertRaises(NativeMassError):
            verify_actual_cii(bad, copy.deepcopy(self.receipt))

    def test_s1d_rlt10_formula_missing_master_and_threshold_mutants(self):
        for p in self.receipt['checkpoints']:
            self.assertEqual(p['status'],'SUGGESTED')
            self.assertEqual(p['weightKg'],2.63)
            self.assertEqual(p['referenceRow']['id'],252)
            self.assertEqual(p['referenceRow']['lengthMm'],109)
            self.assertEqual(p['referenceRow']['weightKg'],15)
        self.assertEqual(s1_rlt10_length_suggestion(
            400,50,900,MASTER_ROWS)['referenceRow']['id'],974)
        self.assertEqual(s1_rlt10_length_suggestion(
            115,50,900,MASTER_ROWS)['status'],'REVIEW')
        missing=tuple(row for row in MASTER_ROWS if row['id']!=252)
        self.assertEqual(s1_rlt10_length_suggestion(
            19.1,50,900,missing)['weightKg'],None)
        with self.assertRaises(NativeMassError) as caught:
            s1_build_test_only_fixture(self.source,missing)
        self.assertEqual(caught.exception.code,
                         'S1_UNKNOWN_REFERENCE_REVIEW_NO_TEST_CII')

    def test_s1e_nonrelease_and_deleted_hold_mutant(self):
        self.assertIs(nonrelease_guard(self.receipt),False)
        self.assertFalse(self.receipt['nativeCiiReleaseAuthorized'])
        wrong=copy.deepcopy(self.receipt)
        wrong['nativeCiiReleaseAuthorized']=True  # DELETE release hold.
        with self.assertRaises(NativeMassError) as caught:
            nonrelease_guard(wrong)
        self.assertEqual(caught.exception.code,'S1_FINAL_RELEASE_BLOCKED')
        # R1: ordinary Native Final packets retain MAIN's error precedence.
        # S1-specific invalid witnesses are tested in RigidS1ExclusiveCustodyMutants.


# R1/F3: These tests invoke the actual public custody function with a BAD S1
# witness. Delete the call to _s1_assert_pcom_release_hold in the shared
# require_rigid_weight_owners() and each S1-specific negative becomes GREEN
# unexpectedly (this suite fails). The pre-existing NATIVE_OWNER_DUPLICATED
# guard is intentionally NOT credited as an R1-specific mutant.
from contextlib import contextmanager
import hashlib
import xml_to_cii2019 as native
import xml_to_cii2019_patched as patched
from xml229_native_final_mass_binding import bind_native_final_xml
from xml_cii_weight_output_custody import require_rigid_weight_owners
from xml229_rigid_s1_testonly import require_s1_test_only_weight_owners


@contextmanager
def _s1_bound_witness():
    fixture, packet, receipt = s1_build_test_only_fixture(
        derived_source(), MASTER_ROWS)
    with TemporaryDirectory() as td:
        src = Path(td)/"source.xml"
        pkt = Path(td)/"packet.json"
        src.write_bytes(fixture)
        pkt.write_text(json.dumps(packet))
        staged = stage_native_original_lineage(src, pkt)
        bound, owners = bind_native_final_xml(
            src, staged, pkt, require_staged_lineage=True)
        assert len(owners) == 14
        receipt["boundTestInputSha256"] = hashlib.sha256(
            bound.read_bytes()).hexdigest()
        document = native._parse_xml_document(
            bound, preserve_rigid_weight_owners=False)
        model = patched._build_conversion_model(document, {}, {}, {})
        yield bound, model, receipt


class RigidS1ExclusiveCustodyMutants(unittest.TestCase):

    def _must_fail(self, code, alter):
        with _s1_bound_witness() as (bound, model, witness):
            alter(bound, model, witness)
            with self.assertRaises(ValueError) as e:
                require_rigid_weight_owners(
                    bound, model, s1_test_only_witness=witness)
            self.assertIn(code, str(e.exception))

    def test_r1_s1b_double_owner_guard_red(self):
        def mutation(bound, model, witness):
            # Duplicate a *physical occurrence* in the second otherwise
            # distinct branch; old owner-cardinality check remains satisfied.
            a, b = witness["checkpoints"][:2]
            b["branch"], b["flangeRef"] = a["branch"], a["flangeRef"]
        self._must_fail("CII_S1_DOUBLE_PHYSICAL_OWNER", mutation)

    def test_r1_s1b_neighbor_15kg_on_connection_red(self):
        def mutation(bound, model, witness):
            # Maliciously attest the neighbour flange's FULL 15 kg on the
            # connection, with source and model changed consistently. Only
            # the S1 prohibition on neighbour-master borrowing detects it.
            root = ET.parse(bound).getroot()
            first = next(e for e in root.iter() if e.tag == "Branch")
            ns = [n for n in first if n.tag == "Node"]
            next(e for e in ns[3] if e.tag.endswith("Weight")).text = "15"
            bound.write_bytes(ET.tostring(root, encoding="utf-8"))
            witness["boundTestInputSha256"] = hashlib.sha256(
                bound.read_bytes()).hexdigest()
            witness["checkpoints"][0]["weightKg"] = 15
            updated = native._parse_xml_document(
                bound, preserve_rigid_weight_owners=False)
            model2 = patched._build_conversion_model(updated, {}, {}, {})
            model.rigid_edges[:] = model2.rigid_edges
            model.edges[:] = model2.edges
        self._must_fail("CII_S1_CONNECTION_BORROWED_FLANGE_MASS", mutation)

    def test_r1_s1b_mass_moved_flange_to_connection_red(self):
        def mutation(bound, model, witness):
            # Change ACTUAL staged XML mass allocation and the native model
            # consistently: ordinary source-owner cardinality still PASSES.
            root = ET.parse(bound).getroot()
            first = next(e for e in root.iter() if e.tag == "Branch")
            ns = [n for n in first if n.tag == "Node"]
            next(e for e in ns[3] if e.tag.endswith("Weight")).text = "15"
            next(e for e in ns[4] if e.tag.endswith("Weight")).text = "2.63"
            bound.write_bytes(ET.tostring(root, encoding="utf-8"))
            witness["boundTestInputSha256"] = hashlib.sha256(
                bound.read_bytes()).hexdigest()
            updated = native._parse_xml_document(
                bound, preserve_rigid_weight_owners=False)
            replacement = patched._build_conversion_model(updated, {}, {}, {})
            model.rigid_edges[:] = replacement.rigid_edges
            model.edges[:] = replacement.edges
        self._must_fail("CII_S1_CONNECTION_BORROWED_FLANGE_MASS", mutation)

    def test_r1_s1b_owner_approved_true_red(self):
        def mutation(bound, model, witness):
            witness["checkpoints"][0]["ownerApproved"] = True
        self._must_fail("CII_S1_UNAPPROVED_MASS_CLAIM", mutation)

    def test_r1_s1b_duplicate_edge_cannot_steal_owner_red(self):
        def mutation(bound, model, witness):
            # Clone the same FROM/TO and weight but change the source identity,
            # so main's source-owner cardinality is still satisfied; only the
            # S1 edge-uniqueness rule catches it.
            from dataclasses import replace
            copied = copy.deepcopy(model.rigid_edges[0])
            fake_to = replace(copied.to_node,
                component_ref_no="=UNATTESTED/DUPLICATE",
                position=tuple(x+0.123 for x in copied.to_node.position))
            extra = replace(copied, to_node=fake_to)
            model.rigid_edges.append(extra)
            model.edges.append(extra)
        self._must_fail(
            "CII_S1_CONNECTION_FLANGE_EDGE_OWNER_AMBIGUOUS", mutation)

    def test_r1_s1b_test_renderer_missing_witness_red_not_normal_conversion(self):
        with _s1_bound_witness() as (bound, model, receipt):
            # This must be allowed for ordinary app conversions.
            self.assertIsNone(require_rigid_weight_owners(bound, model))
            # Only the S1 TEST renderer requires the explicit witness.
            with self.assertRaises(NativeMassError) as e:
                require_s1_test_only_weight_owners(bound, model, None)
            self.assertEqual(e.exception.code,"S1_TEST_ONLY_WITNESS_REQUIRED")
            # And explicit S1 test custody still accepts the correct witness.
            self.assertIsNone(require_s1_test_only_weight_owners(
                bound, model, receipt))


class RigidS1Rlt10LookupMutants(unittest.TestCase):
    def test_r1_s1d_dn_rating_and_duplicate_master_fail_closed(self):
        invalid = [(80,900,MASTER_ROWS),(50,600,MASTER_ROWS),
                   (50,900,(*MASTER_ROWS,dict(MASTER_ROWS[0])))]
        for dn,rating,rows in invalid:
            with self.subTest(dn=dn,rating=rating,rows=len(rows)):
                suggestion = s1_rlt10_length_suggestion(
                    19.1,dn,rating,rows)
                self.assertEqual(suggestion["status"],"REVIEW")
                self.assertIsNone(suggestion["weightKg"])
                self.assertFalse(suggestion["ownerApproved"])


if __name__=='__main__':
    unittest.main()
