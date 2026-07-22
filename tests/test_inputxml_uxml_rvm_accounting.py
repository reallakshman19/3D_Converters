from __future__ import annotations
import copy
import json
import unittest
from lxml import etree as ET
from scripts.inputxml_compiler.base import DecisionLedger, CompileBlocked
from scripts.inputxml_compiler.uxml_rvm import _compile_uxml_rvm_source
from scripts.inputxml_compiler.uxml_rvm_accounting import build_accounting_proof
from scripts.inputxml_compiler.uxml_rvm_contracts import decode_source, semantic_hash, sha256_bytes, validate_canonical_metadata, validate_coordinate_context
from scripts.inputxml_compiler.uxml_rvm_manifest import validate_authority_manifest
from scripts.inputxml_compiler.uxml_rvm_trust import manifest_hash
from tests import test_inputxml_uxml_rvm_support as s


def context_for(source: bytes, *, plan=None):
    _, kind = decode_source(source)
    cc = s.coordinate_context(source, kind); _, ch = validate_coordinate_context(cc, sha256_bytes(source), kind)
    metadata = s.canonical_metadata(source, kind); _, mh = validate_canonical_metadata(metadata, sha256_bytes(source), kind)
    topology_hash = plan["topologyPlanHashSha256"] if plan else s.EMPTY_HASH
    manifest = s.authority_manifest(source, kind, ch, topology_hash, s.EMPTY_HASH, mh)
    return {"uxmlRvmCoordinateContext": cc, "uxmlRvmExactTopologyPlan": plan, "uxmlRvmCanonicalMetadata": metadata, "uxmlRvmAuthorityManifest": manifest}


def compile_source(source: bytes, *, plan=None):
    ledger = DecisionLedger("reallaksh19/3D_Converters", "fixture", "test", "uxml-rvm-intake")
    root = _compile_uxml_rvm_source(source, source_name="x", source_path="x", ledger=ledger, context=context_for(source, plan=plan))
    return root, ledger


def proof_with(result, root, ledger_records):
    digests = {
        "UxmlRvmBridgeResultHash": result["bridge"]["resultHashSha256"],
        "UxmlRvmCoordinateContextHash": result["coordinateHash"],
        "UxmlRvmTopologyPlanHash": result["plan"]["topologyPlanHashSha256"] if result["plan"] else s.EMPTY_HASH,
        "UxmlRvmEngineeringContextHash": s.EMPTY_HASH,
        "UxmlRvmCanonicalMetadataHash": result["metadataHash"],
        "UxmlRvmAuthorityManifestHash": result["manifestHash"],
    }
    return build_accounting_proof(
        source_hash=result["sourceHash"], source_kind=decode_source(s.fixture("direct-exact.json"))[1],
        bridge_result=result["bridge"], uxml=result["bridge"]["uxml"], inventory=result["inventory"],
        coordinate_hash=result["coordinateHash"], topology_hash=s.EMPTY_HASH, engineering_hash=s.EMPTY_HASH,
        metadata_hash=result["metadataHash"], topology=result["topology"], lines=result["lines"],
        engineering=result["engineering"], coordinate_context=result["coordinate"],
        canonical_root=root, ledger_records=ledger_records,
        unsupported_component_ids=result["unsupported"], unsupported_support_ids=[row["id"] for row in result["inventory"]["supports"]],
        metadata=result["metadata"], expected_extension_hashes=digests,
    )


class AccountingTamperTests(unittest.TestCase):
    def setUp(self):
        self.source = s.fixture("direct-exact.json"); self.result = s.evaluate(self.source)
        self.root, self.ledger = compile_source(self.source)

    def test_baseline_reparsed_xml_and_actual_ledger_close(self):
        proof = proof_with(self.result, self.root, self.ledger.records)
        self.assertTrue(all(value == 0 for value in proof["invariants"].values()))

    def coordinated(self, xml_attribute, ledger_field, new_value):
        root = ET.fromstring(ET.tostring(self.root)); records = copy.deepcopy(self.ledger.records)
        root.findall("PIPINGMODEL/PIPINGELEMENT")[0].set(xml_attribute, str(new_value))
        pipe = next(row for row in records if row.get("sourceType") == "PIPE")
        pipe["sourceFields"][ledger_field] = new_value
        return proof_with(self.result, root, records)

    def test_39_node_number_substitution_in_xml_and_ledger_blocks(self):
        proof = self.coordinated("FROM_NODE", "fromNodeNumber", 999)
        self.assertGreater(proof["invariants"]["canonicalXmlRelationMismatch"], 0)
        self.assertGreater(proof["invariants"]["ledgerElementRelationMismatch"], 0)

    def test_48_line_substitution_with_matching_ledger_blocks(self):
        proof = self.coordinated("LINE", "lineId", "L-OTHER")
        self.assertGreater(proof["invariants"]["canonicalXmlRelationMismatch"], 0)

    def test_56_engineering_value_changed_in_xml_and_ledger_blocks(self):
        proof = self.coordinated("DIAMETER", "outsideDiameterMm", "120")
        self.assertGreater(proof["invariants"]["ledgerElementRelationMismatch"], 0)

    def test_83_coordinate_and_delta_coordinated_restamp_blocks(self):
        root = ET.fromstring(ET.tostring(self.root)); records = copy.deepcopy(self.ledger.records)
        element = root.findall("PIPINGMODEL/PIPINGELEMENT")[0]; element.set("FROM_X", "10"); element.set("TO_X", "1010")
        pipe = next(row for row in records if row.get("sourceType") == "PIPE"); pipe["sourceFields"]["fromCoordinate"]["x"] = "10"; pipe["sourceFields"]["toCoordinate"]["x"] = "1010"
        proof = proof_with(self.result, root, records)
        self.assertGreater(proof["invariants"]["canonicalXmlRelationMismatch"], 0)

    def test_85_full_authority_restamp_cannot_replace_detached_approval(self):
        manifest = copy.deepcopy(self.result["manifest"]); manifest["canonicalMetadataHashSha256"] = "0" * 64
        manifest["authorityManifestHashSha256"] = manifest_hash(manifest)
        with self.assertRaises(Exception) as caught:
            validate_authority_manifest(
                manifest, source_hash=self.result["sourceHash"], source_kind="UXML_DOCUMENT",
                coordinate_hash=self.result["coordinateHash"], topology_hash=s.EMPTY_HASH,
                engineering_hash=s.EMPTY_HASH, metadata_hash="0" * 64,
            )
        self.assertIn("UXML_RVM_AUTHORITY_MANIFEST_NOT_APPROVED", str(caught.exception))


class UnsupportedEvidenceTests(unittest.TestCase):
    def test_59_unsupported_component_is_preserved_and_blocks(self):
        doc = json.loads(s.fixture("direct-exact.json")); doc["components"][1]["type"] = "VALVE"; doc["components"][1]["normalizedType"] = "VALVE"; doc["topologyHints"] = doc["topologyHints"][:2]; doc["topologyHints"][1]["sourcePortIds"] = ["P-C1-PIPE_END_2"]
        source = s.json_source(doc); root, ledger = compile_source(source)
        self.assertIsNotNone(root); self.assertTrue(ledger.blocked)
        self.assertTrue(any(row.get("sourceType") == "VALVE" and row.get("disposition") == "UNSUPPORTED_BLOCKING" for row in ledger.records))

    def test_60_pipe_owned_support_record_independently_blocks(self):
        doc = json.loads(s.fixture("direct-exact.json")); doc["supports"] = [{"id":"SUP-C1","componentId":"C1","type":"GUIDE","supportAnchorId":"A-C1-EP1","pipelineRef":"PL-1"}]
        source = s.json_source(doc); root, ledger = compile_source(source)
        self.assertIsNotNone(root); self.assertTrue(ledger.blocked)
        self.assertTrue(any(row.get("sourceType") == "UXML_SUPPORT" and row.get("disposition") == "UNSUPPORTED_BLOCKING" for row in ledger.records))

    def test_orphan_support_blocks_before_projection(self):
        doc = json.loads(s.fixture("direct-exact.json")); doc["supports"] = [{"id":"SUP-X","componentId":"MISSING","type":"GUIDE","supportAnchorId":"A-C1-EP1"}]
        with self.assertRaises(CompileBlocked) as caught: compile_source(s.json_source(doc))
        self.assertIn("UXML_RVM_SUPPORT_OWNER", str(caught.exception))


if __name__ == "__main__": unittest.main()
