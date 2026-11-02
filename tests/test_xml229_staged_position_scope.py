"""Source-bound staged position ownership regression. Synthetic data only.

Checks that non-restraint ambiguity cannot veto independently corroborated
support and that mandatory support ambiguity is still a native release hold.
"""
from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "converters" / "scripts"))
from xml_to_cii2019_master_addon import enrich_xml_addons
from xml_to_cii2019_patched import _maybe_enrich_from_staged_json

XML = (
    "<PipeStressExport><Pipe><Branch><Branchname>/TEST/B1</Branchname>"
    "<Node><NodeNumber>10</NodeNumber><NodeName>PS00001</NodeName>"
    "<Position>1 2 3</Position></Node>"
    "<Node><NodeNumber>20</NodeNumber><NodeName>PS00002</NodeName>"
    "<Position>1 2 3</Position></Node>"
    "</Branch></Pipe></PipeStressExport>"
)


def staged(kind="EQUIPMENT", additional=False):
    components = [
        {"type": kind, "name": "unrelated", "attributes": {
            "POSI": "1 2 3", "DTXR": "CONTEXT ONLY"}},
        {"type": "SUPPORT", "name": "/PS00001", "attributes": {
            "POSI": "1 2 3", "NAME": "/PS00001", "DTXR": "GUIDE"}},
    ]
    if additional:
        components.append({"type": "SUPPORT", "name": "unowned", "attributes": {
            "POSI": "1 2 3", "DTXR": "LINE STOP"}})
    return json.dumps([{"type": "BRANCH", "name": "/TEST/B1",
                        "children": components}])


class ScopedAmbiguityTests(unittest.TestCase):
    def execute(self, payload):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / "test.xml"
            source_json = Path(directory) / "test.json"
            original.write_text(XML, encoding="utf8")
            source_json.write_text(payload, encoding="utf8")
            model = enrich_xml_addons(original, None, None, payload, {"enabled": False})
            log = io.StringIO()
            output = None
            error = None
            try:
                with contextlib.redirect_stdout(log):
                    path = _maybe_enrich_from_staged_json(
                        original, source_json, {"dtxrPositionOffset": {"enabled": False}})
                output = path.read_text(encoding="utf8")
            except ValueError as exc:
                error = str(exc)
            return model, log.getvalue(), output, error

    def test_unrelated_nonrestraint_collision_does_not_block_unique_support(self):
        model, logs, output, error = self.execute(staged())
        self.assertIsNone(error)
        self.assertEqual(model["stats"]["dtxrPosAmbiguous"], 1)
        self.assertEqual(model["stats"]["dtxrPosMandatoryAmbiguous"], 0)
        self.assertEqual(model["stats"]["dtxrPosExcludedAmbiguous"], 1)
        self.assertEqual(model["stats"]["dtxrPosMandatoryUnmatched"], 0)
        self.assertEqual(model["stats"]["dtxrPos"], 1)
        root = ET.fromstring(output)
        nodes = [n for n in root.iter() if n.tag.endswith("Node")]
        dtxr = lambda n: [c.text for c in n if c.tag.endswith("DTXR_POS")]
        self.assertEqual(dtxr(nodes[0]), ["GUIDE"])
        self.assertEqual(dtxr(nodes[1]), [])
        self.assertIn("XML229_STAGED_SCOPE_EXCLUSIONS", logs)

    def test_ambiguous_in_scope_support_still_fails_closed(self):
        model, logs, output, error = self.execute(staged("SUPPORT"))
        self.assertIsNone(output)
        self.assertEqual(error, "XML229_STAGED_POSITION_AMBIGUOUS")
        self.assertEqual(model["stats"]["dtxrPosMandatoryAmbiguous"], 1)
        self.assertEqual(model["stats"]["dtxrPosExcludedAmbiguous"], 0)
        marker = next(s for s in logs.splitlines()
                      if s.startswith("XML229_STAGED_POSITION_AMBIGUITY "))
        sample = json.loads(marker.split(" ", 1)[1])
        self.assertEqual(sample["count"], 1)
        self.assertEqual(sample["sample"][0]["scope"], "MANDATORY")
        self.assertEqual(sample["sample"][0]["sourceClaimIndex"], 0)
        self.assertEqual(sample["sample"][0]["candidateCount"], 2)

    def test_mixed_ambiguity_receipt_reports_only_mandatory_claim(self):
        model, logs, output, error = self.execute(staged(additional=True))
        self.assertIsNone(output)
        self.assertEqual(error, "XML229_STAGED_POSITION_AMBIGUOUS")
        self.assertEqual(model["stats"]["dtxrPosAmbiguous"], 2)
        self.assertEqual(model["stats"]["dtxrPosMandatoryAmbiguous"], 1)
        self.assertEqual(model["stats"]["dtxrPosExcludedAmbiguous"], 1)
        marker = next(s for s in logs.splitlines()
                      if s.startswith("XML229_STAGED_POSITION_AMBIGUITY "))
        sample = json.loads(marker.split(" ", 1)[1])
        self.assertEqual([s["sourceClaimIndex"] for s in sample["sample"]], [2])

    def test_bounded_witness_keeps_mandatory_after_21_exclusions(self):
        payload = json.loads(staged())
        original = payload[0]["children"]
        payload[0]["children"] = [original[0] for _ in range(21)] + [
            {"type": "SUPPORT", "name": "unowned", "attributes": {
                "POSI": "1 2 3", "DTXR": "LINE STOP"}}, original[1]]
        model, logs, output, error = self.execute(json.dumps(payload))
        self.assertIsNone(output)
        self.assertEqual(error, "XML229_STAGED_POSITION_AMBIGUOUS")
        self.assertEqual(model["stats"]["dtxrPosAmbiguous"], 22)
        self.assertEqual(model["stats"]["dtxrPosMandatoryAmbiguous"], 1)
        marker = next(s for s in logs.splitlines()
                      if s.startswith("XML229_STAGED_POSITION_AMBIGUITY "))
        witness = json.loads(marker.split(" ", 1)[1])
        self.assertEqual(witness["count"], 1)
        self.assertEqual([s["sourceClaimIndex"] for s in witness["sample"]], [21])

    def test_unmatched_mandatory_support_still_fails_partial_transfer(self):
        source = json.dumps([{"type": "BRANCH", "name": "/TEST/B1",
            "children": [{"type": "SUPPORT", "name": "unmatched",
                "attributes": {"POSI": "999 998 997", "DTXR": "GUIDE"}}]}])
        model, logs, output, error = self.execute(source)
        self.assertIsNone(output)
        self.assertEqual(error, "XML229_STAGED_POSITION_PARTIAL_TRANSFER")
        self.assertEqual(model["stats"]["dtxrPosMandatoryUnmatched"], 1)


if __name__ == "__main__":
    unittest.main()
