from __future__ import annotations

import copy
import json
import unittest

from scripts.inputxml_compiler.base import DecisionLedger
from scripts.inputxml_compiler.uxml_rvm import _compile_uxml_rvm_source
from scripts.inputxml_compiler.uxml_rvm_accounting import build_accounting_proof
from scripts.inputxml_compiler.uxml_rvm_contracts import ContractError, decode_source, semantic_hash, sha256_bytes, validate_coordinate_context
from scripts.inputxml_compiler.uxml_rvm_inventory import source_inventory
from scripts.inputxml_compiler.uxml_rvm_manifest import validate_authority_manifest
from tests import test_inputxml_uxml_rvm_support as s


def proof_with(result, *, elements=None, topology=None, lines=None, engineering=None, unsupported=None):
    return build_accounting_proof(
        source_hash=result["sourceHash"], source_kind=decode_source(s.fixture("direct-exact.json"))[1],
        bridge_result=result["bridge"], uxml=result["bridge"]["uxml"], inventory=result["inventory"],
        coordinate_hash=result["coordinateHash"], topology_hash=s.EMPTY_HASH, engineering_hash=s.EMPTY_HASH,
        topology=topology or result["topology"], lines=lines or result["lines"],
        engineering=engineering or result["engineering"], coordinate_context=result["coordinate"],
        canonical_elements=elements if elements is not None else result["elements"],
        unsupported_component_ids=unsupported if unsupported is not None else [],
    )

def context_for(source: bytes):
    _,kind=decode_source(source); cc=s.coordinate_context(source,kind); _,ch=validate_coordinate_context(cc,sha256_bytes(source),kind)
    manifest=s.authority_manifest(source,kind,ch)
    return {"version":"11.00","north":[0,1,0],"uxmlRvmCoordinateContext":cc,"uxmlRvmAuthorityManifest":manifest,"uxmlRvmApprovedAuthorityManifestHashSha256":manifest["authorityManifestHashSha256"]}

class AccountingTamperTests(unittest.TestCase):
    def setUp(self): self.result=s.evaluate(s.fixture("direct-exact.json"))
    def test_35_coordinate_and_delta_coordinated_restamp_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["fromCoordinate"]["x"]="10"; elements[0]["toCoordinate"]["x"]="1010"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["sourceCoordinateTransformMismatch"],0)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_39_node_number_substitution_in_xml_and_ledger_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["fromNodeNumber"]=999
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_40_node_number_moved_to_other_valid_node_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["fromNodeNumber"],elements[0]["toNodeNumber"]=elements[0]["toNodeNumber"],elements[0]["fromNodeNumber"]
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_48_line_substitution_with_matching_ledger_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["lineId"]="L-OTHER"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_56_engineering_value_changed_in_xml_and_ledger_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["outsideDiameterMm"]="120"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["engineeringFieldDecisionMismatch"],0)
    def test_72_missing_source_component_decision_blocks(self):
        proof=proof_with(self.result,elements=self.result["elements"][:-1])
        self.assertGreater(proof["invariants"]["canonicalElementCardinalityMismatch"],0)
    def test_73_duplicated_source_component_decision_blocks(self):
        with self.assertRaises(ContractError) as caught:
            proof_with(self.result,elements=self.result["elements"]+[copy.deepcopy(self.result["elements"][0])])
        self.assertEqual("UXML_RVM_ELEMENT_IDENTITY",caught.exception.code)
    def test_74_missing_port_decision_blocks(self):
        topology=copy.deepcopy(self.result["topology"]); topology["portToNode"].pop("P-C1-PIPE_END_1")
        proof=proof_with(self.result,topology=topology)
        self.assertGreater(proof["invariants"]["portLogicalNodeOwnershipMismatch"],0)
    def test_75_substituted_valid_port_identity_blocks(self):
        topology=copy.deepcopy(self.result["topology"]); topology["portToNode"]["P-C1-PIPE_END_1"]="N3"
        proof=proof_with(self.result,topology=topology)
        self.assertGreater(proof["invariants"]["portLogicalNodeOwnershipMismatch"],0)
    def test_76_wrong_component_to_port_ownership_blocks(self):
        uxml=copy.deepcopy(self.result["bridge"]["uxml"]); uxml["ports"][0]["componentId"]="C2"
        with self.assertRaises(ContractError) as caught: source_inventory(uxml)
        self.assertEqual("UXML_RVM_PORT_ANCHOR_OWNER",caught.exception.code)
    def test_77_wrong_port_to_node_ownership_blocks(self):
        topology=copy.deepcopy(self.result["topology"]); topology["portToNode"]["P-C2-PIPE_END_1"]="N3"
        proof=proof_with(self.result,topology=topology)
        self.assertGreater(proof["invariants"]["portLogicalNodeOwnershipMismatch"],0)
    def test_78_wrong_node_to_number_ownership_blocks(self):
        topology=copy.deepcopy(self.result["topology"]); topology["nodeNumberOwner"]={100:"N2",200:"N1",300:"N3"}
        proof=proof_with(self.result,topology=topology)
        self.assertGreater(proof["invariants"]["logicalNodeNumberOwnershipMismatch"],0)
    def test_79_wrong_component_to_element_ownership_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["componentId"]="C2"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_80_source_element_cardinality_mismatch_blocks(self):
        proof=proof_with(self.result,elements=[])
        self.assertGreater(proof["invariants"]["canonicalElementCardinalityMismatch"],0)
    def test_81_coordinated_ledger_xml_node_substitution_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["fromNodeNumber"]=300
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_82_coordinated_ledger_xml_line_substitution_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[0]["lineId"]="L-200"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["canonicalElementRelationMismatch"],0)
    def test_83_coordinated_ledger_xml_coordinate_substitution_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[1]["toCoordinate"]["x"]="2001"; elements[1]["delta"]["x"]="1001"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["sourceCoordinateTransformMismatch"],0)
    def test_84_coordinated_ledger_xml_engineering_substitution_blocks(self):
        elements=copy.deepcopy(self.result["elements"]); elements[1]["wallThicknessMm"]="7"
        proof=proof_with(self.result,elements=elements)
        self.assertGreater(proof["invariants"]["engineeringFieldDecisionMismatch"],0)
    def test_85_complete_hash_chain_restamp_fails_independent_pin(self):
        source,kind,cc,bridge,plan=s.fixture("rvm-rows.json"),None,None,None,None
        _,kind=decode_source(source); cc=s.coordinate_context(source,kind); _,ch=validate_coordinate_context(cc,sha256_bytes(source),kind); bridge=s.discover(source,ch); plan=s.topology_plan(source,bridge)
        old_manifest=s.authority_manifest(source,kind,ch,plan["topologyPlanHashSha256"])
        plan["logicalNodes"][0]["engineeringNodeNumber"]=999; plan["topologyPlanHashSha256"]=semantic_hash(plan,"topologyPlanHashSha256")
        new_manifest=s.authority_manifest(source,kind,ch,plan["topologyPlanHashSha256"])
        with self.assertRaises(ContractError) as caught:
            validate_authority_manifest(new_manifest,approved_hash=old_manifest["authorityManifestHashSha256"],source_hash=sha256_bytes(source),source_kind=kind,coordinate_hash=ch,topology_hash=plan["topologyPlanHashSha256"],engineering_hash=s.EMPTY_HASH)
        self.assertEqual("UXML_RVM_AUTHORITY_MANIFEST_NOT_APPROVED",caught.exception.code)

class UnsupportedEvidenceTests(unittest.TestCase):
    def test_59_unsupported_component_is_preserved_and_blocks(self):
        doc=json.loads(s.fixture("direct-exact.json")); doc["components"][1]["type"]="VALVE"; doc["components"][1]["normalizedType"]="VALVE"; doc["topologyHints"]=doc["topologyHints"][:2]; doc["topologyHints"][1]["sourcePortIds"]=["P-C1-PIPE_END_2"]
        source=s.json_source(doc); ledger=DecisionLedger("reallaksh19/3D_Converters","fixture","test","uxml-rvm-intake"); root=_compile_uxml_rvm_source(source,source_name="x",source_path="x",ledger=ledger,context=context_for(source))
        self.assertIsNotNone(root); self.assertTrue(ledger.blocked)
        self.assertTrue(any((r.get("sourceType") or r.get("source_type"))=="VALVE" and r.get("disposition")=="UNSUPPORTED_BLOCKING" for r in ledger.records))
    def test_60_support_evidence_is_not_silently_ignored(self):
        doc=json.loads(s.fixture("direct-exact.json")); doc["components"].append({"id":"C3","sourceRefs":["SRC-1"],"type":"SUPPORT","normalizedType":"SUPPORT","pipelineRef":"PL-1","lineKey":"L-100","anchorIds":["A-C3-S"],"portIds":["P-C3-S"],"segmentIds":[],"rawAttributes":{},"normalized":{},"derived":{}}); doc["anchors"].append({"id":"A-C3-S","componentId":"C3","role":"SUPPORT_POINT","point":{"x":500,"y":0,"z":0}}); doc["ports"].append({"id":"P-C3-S","componentId":"C3","anchorId":"A-C3-S","role":"SUPPORT_POINT","point":{"x":500,"y":0,"z":0}}); doc["supports"].append({"id":"SUP-C3","componentId":"C3","type":"GUIDE","supportAnchorId":"A-C3-S","pipelineRef":"PL-1"})
        source=s.json_source(doc); ledger=DecisionLedger("reallaksh19/3D_Converters","fixture","test","uxml-rvm-intake"); root=_compile_uxml_rvm_source(source,source_name="x",source_path="x",ledger=ledger,context=context_for(source))
        self.assertIsNotNone(root); self.assertTrue(ledger.blocked)
        self.assertTrue(any((r.get("sourceType") or r.get("source_type"))=="SUPPORT" and r.get("disposition")=="UNSUPPORTED_BLOCKING" for r in ledger.records))

if __name__=="__main__": unittest.main()
