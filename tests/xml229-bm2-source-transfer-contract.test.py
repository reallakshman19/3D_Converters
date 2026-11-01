#!/usr/bin/env python3
"""Source-bound BM2 transfer regressions; no private Owner authority is asserted."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "converters" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import xml_to_cii2019_patched as patched

BM2 = ROOT / "Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml"
MASTER = ROOT / "docs/Masters/SpecwisePipingClass/93833.json"


def field(node, name):
    return next((str(c.text or "").strip() for c in node
                 if c.tag.rsplit("}", 1)[-1] == name), "")


def node_by_number(root, number):
    return next(n for n in root.iter()
                if n.tag.rsplit("}", 1)[-1] == "Node"
                and field(n, "NodeNumber") == str(number))


def branch_sample(path, name):
    tree = ET.parse(BM2)
    root = tree.getroot()
    for pipe in list(root):
        for branch in list(pipe):
            if branch.tag.rsplit("}", 1)[-1] == "Branch" and field(branch, "Branchname") != name:
                pipe.remove(branch)
    tree.write(path, encoding="utf-8")


class SourceTransferRegression(unittest.TestCase):
    def test_class_93833_first_element_10_to_20_materializes_7112(self):
        rows = json.loads(MASTER.read_text(encoding="utf-8"))["rows"]
        branch = '/GLRD-1000-6"-P4110001-93833-01/B6'
        with TemporaryDirectory() as directory:
            source = Path(directory) / "first.xml"
            branch_sample(source, branch)
            before = ET.parse(source).getroot()
            self.assertEqual(field(node_by_number(before, 10), "WallThickness"), "0")
            out = patched._apply_process_data_to_xml(source, {
                "pipingClass": {"masterRows": rows}})
            updated = ET.parse(out).getroot()
            self.assertAlmostEqual(float(field(node_by_number(updated, 10), "WallThickness")), 7.112)
            self.assertAlmostEqual(float(field(node_by_number(updated, 20), "WallThickness")), 7.112)
            self.assertAlmostEqual(float(field(node_by_number(updated, 30), "WallThickness")), 7.112)
            self.assertEqual(field(node_by_number(updated, 20), "Weight"),
                             field(node_by_number(before, 20), "Weight"))
            self.assertEqual(field(node_by_number(updated, 20), "Position"),
                             field(node_by_number(before, 20), "Position"))

    def test_actual_native_cli_first_element_publishes_exact_master_wall(self):
        rows = json.loads(MASTER.read_text(encoding='utf-8'))['rows']
        branch = '/GLRD-1000-6"-P4110001-93833-01/B6'
        with TemporaryDirectory() as directory:
            source = Path(directory) / 'first.xml'
            output = Path(directory) / 'first.cii'
            branch_sample(source, branch)
            cmd = [sys.executable, str(SCRIPTS / 'xml_to_cii2019_runtime_custody.py'),
                   '--input', str(source), '--output', str(output),
                   '--support-config-json', json.dumps({'pipingClass': {'masterRows': rows}}),
                   '--weight-scale', '10']
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            text = output.read_text(encoding='utf-8')
            self.assertIn('#$ ELEMENTS', text)
            block = text.split('#$ ELEMENTS\n', 1)[1].splitlines()
            self.assertEqual([float(x) for x in block[0].split()[:2]], [10.0, 20.0])
            self.assertAlmostEqual(float(block[1].split()[0]), 7.112)
            self.assertNotEqual(float(block[1].split()[0]), 0.01)

    def test_conflicting_master_fails_closed(self):
        rows = [r for r in json.loads(MASTER.read_text())["rows"]
                if str(r.get("Size")) == "6"]
        conflicting = {**rows[0], "Wall thickness": "8.0"}
        with self.assertRaisesRegex(ValueError, "XML229_CLASS_SOURCE_AMBIGUOUS"):
            patched._source_bound_class_row(
                '/GLRD-1000-6"-P4110001-93833-01/B6',
                {"pipingClass": {"masterRows": rows + [conflicting]}})

    def test_legacy_without_master_keeps_zero_wall_for_existing_writer_fallback(self):
        with TemporaryDirectory() as directory:
            source = Path(directory) / "first.xml"
            branch_sample(source, '/GLRD-1000-6"-P4110001-93833-01/B6')
            out = patched._apply_process_data_to_xml(source, {})
            self.assertEqual(field(node_by_number(ET.parse(out).getroot(), 10), "WallThickness"), "0")

    def test_3430_current_saved_mapper_regex_and_mutation_pass_to_native_xml(self):
        # The same position, exact branch and source tag are reused. The only
        # changes are user-authored Tab 7 / Tab 8 configuration and staged text.
        tree = ET.parse(BM2)
        root = tree.getroot()
        node = node_by_number(root, 3430)
        namespace = node.tag.rsplit("}", 1)[0] + "}" if "}" in node.tag else ""
        ET.SubElement(node, namespace + "DTXR_POS").text = "REST"
        with TemporaryDirectory() as directory:
            source = Path(directory) / "node3430.xml"
            stage = Path(directory) / "node3430-stage.json"
            tree.write(source, encoding="utf-8")
            branch = '/GLRD-1000-8"-B4110003-13451-01/B1'
            def run(dtxr, cfg, node_type):
                stage.write_text(json.dumps([{
                    "type": "BRANCH", "name": branch, "children": [{
                        "type": "SUPPORT", "attributes": {
                            "NAME": "/PS00574.1", "DTXR": dtxr,
                            "POSI": "123504.12 114999.98 1330.73",
                            "NODETYPE": node_type, "CMPSUPGAP": "6mm"},
                    }]}]), encoding="utf-8")
                cfg["dtxrPositionOffset"] = {
                    "enabled": True, "xOffset": 0, "yOffset": 0,
                    "zOffset": 100000, "tolerance": 0.5}
                staged_xml = patched._maybe_enrich_from_staged_json(source, stage, cfg)
                final_xml = patched._apply_process_data_to_xml(staged_xml, cfg)
                target = node_by_number(ET.parse(final_xml).getroot(), 3430)
                return [(field(r, "Type"), field(r, "Gap")) for r in target
                        if r.tag.rsplit("}", 1)[-1] == "Restraint"]
            from_tab7 = run("CRADLE RETAINER STYLE-314",
                            {"supportTypeMapper": {"rows": [
                                {"kind": "REST", "aliases": ["CRADLE RETAINER"]}]}},
                            "17")
            self.assertEqual(from_tab7, [("+Y", "6.0")])
            from_tab8 = run("ORBITAL GUARDRAIL QZ-443", {
                "supportMapping": {"version": 2, "rules": [
                    {"id": "user-orbital-guide", "enabled": True,
                     "priority": 1, "source": "staged-json",
                     "field": "DTXR", "pattern": r"ORBITAL\\s+GUARDRAIL",
                     "match": "regex", "kind": "GUIDE"}]},
                "inputXmlRestraintTypeMutation": {"enabled": True,
                    "rows": [{"from": "21", "to": "8"}]},
            }, "21")
            self.assertEqual(from_tab8, [("GUI", "6.0")])

    def test_3430_z_datum_existing_rest_does_not_skip_json_enrichment(self):
        # Real XML source position, synthetic GUIDE/LINESTOP and gap only;
        # the Owner's real staged JSON/gap is NOT in the benchmark repository.
        tree = ET.parse(BM2)
        root = tree.getroot()
        node = node_by_number(root, 3430)
        namespace = node.tag.rsplit("}", 1)[0] + "}" if "}" in node.tag else ""
        ET.SubElement(node, namespace + "DTXR_POS").text = "REST"
        prior = ET.SubElement(node, namespace + "Restraint")
        ET.SubElement(prior, namespace + "Type").text = "+Y"
        ET.SubElement(prior, namespace + "Gap").text = "0"
        with TemporaryDirectory() as directory:
            source = Path(directory) / "prior-rest.xml"
            staged = Path(directory) / "staged.json"
            tree.write(source, encoding="utf-8")
            values = [
                {"type": "SUPPORT", "name": "GUIDE", "attributes": {
                    "DTXR": "GUIDE", "POSI": "123504.12 114999.98 1330.73",
                    "CMPSUPGAP": "0mm"}},
                {"type": "SUPPORT", "name": "STOP", "attributes": {
                    "DTXR": "LINE STOP", "POSI": "123504.12 114999.98 1330.73",
                    "CMPSUPGAP": "15mm"}},
            ]
            self.assertTrue(patched._xml_has_dtxr_annotations(source))
            staged.write_text(json.dumps([{
                "type": "BRANCH", "name": '/GLRD-1000-8"-B4110003-13451-01/B1',
                "children": values}]), encoding="utf-8")
            cfg = {"dtxrPositionOffset": {
                "enabled": True, "xOffset": 0, "yOffset": 0,
                "zOffset": 100000, "tolerance": 0.5, "autoCalibrate": False}}
            out = patched._maybe_enrich_from_staged_json(source, staged, cfg)
            enriched = node_by_number(ET.parse(out).getroot(), 3430)
            self.assertIn("GUIDE(CMPSUPGAP=0mm)", field(enriched, "DTXR_POS"))
            self.assertIn("LINE STOP(CMPSUPGAP=15mm)", field(enriched, "DTXR_POS"))
            self.assertTrue(cfg.get("_generatedDtxrEnrichment"))
            self.assertFalse(cfg.get("_inputAlreadyEnriched", False))
            final = patched._apply_process_data_to_xml(out, cfg)
            finished = node_by_number(ET.parse(final).getroot(), 3430)
            restraints = [n for n in finished if n.tag.rsplit("}", 1)[-1] == "Restraint"]
            codes = {field(r, "Type"): float(field(r, "Gap")) for r in restraints}
            self.assertEqual(set(codes), {"GUI", "LIM"})
            self.assertAlmostEqual(codes["LIM"], 15.0)
            self.assertNotIn("+Y", codes)



if __name__ == "__main__":
    unittest.main()
