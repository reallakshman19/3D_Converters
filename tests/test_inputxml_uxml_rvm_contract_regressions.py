from __future__ import annotations
import copy
import json
import unittest
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    ContractError, decode_source, semantic_hash, sha256_bytes,
    validate_canonical_metadata, validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_inventory import source_inventory
from tests import test_inputxml_uxml_rvm_support as support


def blocked(fn):
    try: fn()
    except ContractError as exc: return exc.code
    raise AssertionError("expected ContractError")

class UxmlRvmContractRegressionTests(unittest.TestCase):
    def test_direct_absent_topology_plan_uses_empty_semantic_hash(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        self.assertIsNone(result["plan"])
    def test_nested_axis_decision_rejects_unknown_matrix_field(self):
        source = support.fixture("direct-exact.json"); _, kind = decode_source(source)
        context = support.coordinate_context(source, kind); context["axisMap"]["targetX"]["matrixCoefficient"] = 1
        context["coordinateContextHashSha256"] = semantic_hash(context, "coordinateContextHashSha256")
        self.assertEqual("UXML_RVM_AXIS_MAP", blocked(lambda: validate_coordinate_context(context, sha256_bytes(source), kind)))
    def test_contract_errors_support_normal_traceback_state(self):
        error = ContractError("TEST", "traceback assignment"); error.__traceback__ = None
    def test_source_coordinate_unit_must_match_context(self):
        source = support.fixture("direct-exact.json"); document = json.loads(source); document["units"]["coordinates"] = "IN"
        changed = support.json_source(document); _, kind = decode_source(changed); coordinate = support.coordinate_context(changed, kind)
        coordinate, _ = validate_coordinate_context(coordinate, sha256_bytes(changed), kind)
        self.assertEqual("UXML_RVM_SOURCE_COORDINATE_UNIT_CONTRADICTION", blocked(lambda: source_inventory(document, coordinate)))
    def test_missing_source_length_unit_blocks(self):
        document = json.loads(support.fixture("direct-exact.json")); document["units"].pop("length")
        source = support.json_source(document)
        self.assertEqual("UXML_RVM_SOURCE_UNITS_MISSING", blocked(lambda: support.evaluate(source)))
    def test_anchor_port_coordinate_disagreement_blocks(self):
        document = json.loads(support.fixture("direct-exact.json")); document["ports"][0]["point"]["x"] = 1
        source = support.json_source(document)
        self.assertEqual("UXML_RVM_PORT_ANCHOR_COORDINATE", blocked(lambda: support.evaluate(source)))
    def test_unknown_component_source_reference_blocks(self):
        document = json.loads(support.fixture("direct-exact.json")); document["components"][0]["sourceRefs"] = ["MISSING"]
        source = support.json_source(document)
        self.assertEqual("UXML_RVM_COMPONENT_SOURCE_REF", blocked(lambda: support.evaluate(source)))
    def test_orphan_support_owner_blocks(self):
        document = json.loads(support.fixture("direct-exact.json")); document["supports"] = [{"id":"S1","componentId":"MISSING","supportAnchorId":"A-C1-EP1","type":"GUIDE"}]
        source = support.json_source(document)
        self.assertEqual("UXML_RVM_SUPPORT_OWNER", blocked(lambda: support.evaluate(source)))
    def test_pipe_owned_support_is_valid_intake_but_blocks_projection(self):
        document = json.loads(support.fixture("direct-exact.json")); document["supports"] = [{"id":"S1","componentId":"C1","supportAnchorId":"A-C1-EP1","type":"GUIDE"}]
        source = support.json_source(document); result = support.evaluate(source)
        self.assertEqual(["S1"], [row["id"] for row in result["inventory"]["supports"]])
    def test_three_port_logical_node_blocks_without_junction_semantics(self):
        document = json.loads(support.fixture("direct-exact.json"))
        document["topologyHints"][1]["sourcePortIds"].append("P-C2-PIPE_END_2")
        document["anchors"][3]["nodeNumber"] = 200
        document["topologyHints"].pop(2)
        document["topologyHints"].append({"id":"TH-C13","hintType":"EXACT_PORT_CONNECTION","sourceConfidence":"EXACT_SOURCE","sourcePortId":"P-C1-PIPE_END_2","targetPortId":"P-C2-PIPE_END_2","reconciliation":"UNDIRECTED_EXACT","evidenceReferences":["x"]})
        source = support.json_source(document)
        self.assertEqual("UXML_RVM_UNSUPPORTED_JUNCTION_NODE", blocked(lambda: support.evaluate(source)))
    def test_generated_epoch_metadata_blocks(self):
        source = support.fixture("direct-exact.json"); _, kind = decode_source(source)
        metadata = support.canonical_metadata(source, kind, time="1970-01-01T00:00:00.000Z")
        self.assertEqual("UXML_RVM_CANONICAL_METADATA_GENERATED", blocked(lambda: validate_canonical_metadata(metadata, sha256_bytes(source), kind)))
    def test_missing_approval_trust_root_blocks(self):
        source = support.fixture("direct-exact.json"); result = support.evaluate(source)
        from scripts.inputxml_compiler.uxml_rvm_manifest import validate_authority_manifest
        from scripts.inputxml_compiler.uxml_rvm_trust import APPROVAL_KEY_ENV
        import os
        key = os.environ.pop(APPROVAL_KEY_ENV)
        try:
            self.assertEqual("UXML_RVM_APPROVAL_TRUST_MISSING", blocked(lambda: validate_authority_manifest(
                result["manifest"], source_hash=result["sourceHash"], source_kind="UXML_DOCUMENT",
                coordinate_hash=result["coordinateHash"], topology_hash=support.EMPTY_HASH,
                engineering_hash=support.EMPTY_HASH, metadata_hash=result["metadataHash"],
            )))
        finally:
            os.environ[APPROVAL_KEY_ENV] = key

if __name__ == "__main__": unittest.main()
