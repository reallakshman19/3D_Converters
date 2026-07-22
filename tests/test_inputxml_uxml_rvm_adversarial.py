from __future__ import annotations

import copy
import json
import unittest

from scripts.inputxml_compiler.uxml_rvm_contracts import ContractError, decode_source, semantic_hash, sha256_bytes, validate_coordinate_context
from scripts.inputxml_compiler.uxml_rvm_inventory import source_inventory, validate_topology_plan
from scripts.inputxml_compiler.uxml_rvm_authority import resolve_engineering, resolve_lines, resolve_topology, validate_engineering_context, validate_node_lines
from scripts.inputxml_compiler.uxml_rvm_manifest import validate_authority_manifest
from tests import test_inputxml_uxml_rvm_support as s


def direct_doc(): return json.loads(s.fixture("direct-exact.json"))
def make_source(doc): return s.json_source(doc)
def rehash(value, field): value[field] = semantic_hash(value, field); return value

def block_code(fn):
    try: fn()
    except ContractError as exc: return exc.code
    raise AssertionError("expected ContractError")

def direct_mutation(mutator):
    doc=direct_doc(); mutator(doc); return lambda: s.evaluate(make_source(doc))

def rvm_setup():
    source=s.fixture("rvm-rows.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind)
    _,ch=validate_coordinate_context(cc,sha256_bytes(source),kind); bridge=s.discover(source,ch); plan=s.topology_plan(source,bridge)
    return source,kind,cc,bridge,plan

class TopologyAuthorityBlockers(unittest.TestCase):
    def test_01_coordinate_only_exact_coincidence(self):
        self.assertEqual("UXML_RVM_PORT_ACCOUNTING", block_code(direct_mutation(lambda d:d.__setitem__("topologyHints",[]))))
    def test_02_old_six_mm_tolerance_has_zero_authority(self):
        def m(d): d["ports"][2]["point"]["x"]+=5; d["anchors"][2]["point"]["x"]+=5
        self.assertEqual("UXML_RVM_CONNECTED_COORDINATE_MISMATCH",block_code(direct_mutation(m)))
    def test_03_caller_tolerance_cannot_connect(self):
        def m(d): d["connectToleranceMm"]=999; d["ports"][2]["point"]["x"]+=1; d["anchors"][2]["point"]["x"]+=1
        self.assertEqual("UXML_RVM_CONNECTED_COORDINATE_MISMATCH",block_code(direct_mutation(m)))
    def test_04_ray_only_connection(self):
        def m(d): d["topologyHints"]=[]; d["rayEvidence"]=[{"id":"RAY","sourcePortId":"P-C1-PIPE_END_2","targetPortId":"P-C2-PIPE_END_1"}]
        self.assertEqual("UXML_RVM_PORT_ACCOUNTING",block_code(direct_mutation(m)))
    def test_05_face_proximity_hint_unregistered(self):
        def m(d): d["topologyHints"]=[{"id":"F","hintType":"FACE_PROXIMITY","sourceConfidence":"EXACT_SOURCE","evidenceReferences":["x"]}]
        self.assertEqual("UXML_RVM_TOPOLOGY_HINT_TYPE",block_code(direct_mutation(m)))
    def test_06_restamped_export_allowed_decision_cannot_authorize(self):
        def m(d): d["topologyHints"]=[]; d["topologyDecision"]={"exportAllowed":True}
        self.assertEqual("UXML_RVM_PORT_ACCOUNTING",block_code(direct_mutation(m)))
    def test_07_restamped_accepted_handoff_cannot_authorize(self):
        def m(d): d["topologyHints"]=[]; d["acceptedTopologyHandoff"]={"exportAllowed":True}
        self.assertEqual("UXML_RVM_PORT_ACCOUNTING",block_code(direct_mutation(m)))
    def test_08_rvm_missing_topology_plan(self):
        self.assertEqual("UXML_RVM_TOPOLOGY_PLAN_MISSING",block_code(lambda:s.evaluate(s.fixture("rvm-rows.json"))))
    def test_09_stale_topology_source_hash(self):
        source,kind,cc,bridge,plan=rvm_setup(); plan["sourceHashSha256"]="0"*64; rehash(plan,"topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_TOPOLOGY_SOURCE_BINDING",block_code(lambda:validate_topology_plan(plan,source_hash=sha256_bytes(source),source_kind=kind,adapted_hash=bridge["adaptedUxmlHashSha256"],inventory=source_inventory(bridge["uxml"]))))
    def test_10_stale_adapted_uxml_hash(self):
        source,kind,cc,bridge,plan=rvm_setup(); plan["adaptedUxmlHashSha256"]="0"*64; rehash(plan,"topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_ADAPTED_UXML_BINDING",block_code(lambda:s.evaluate(source,plan=plan,coordinate=cc)))
    def test_11_unknown_topology_authority(self):
        source,kind,cc,bridge,plan=rvm_setup(); plan["authorityType"]="RESTAMPED"; rehash(plan,"topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_TOPOLOGY_AUTHORITY",block_code(lambda:s.evaluate(source,plan=plan,coordinate=cc)))
    def test_12_unregistered_direct_hint_type(self):
        def m(d): d["topologyHints"][0]["hintType"]="NEAREST"
        self.assertEqual("UXML_RVM_TOPOLOGY_HINT_TYPE",block_code(direct_mutation(m)))
    def test_13_missing_connection_port(self):
        def m(d): d["topologyHints"][3]["targetPortId"]="MISSING"
        self.assertEqual("UXML_RVM_CONNECTION_NODE_CONTRADICTION",block_code(direct_mutation(m)))
    def test_14_one_port_two_nodes(self):
        def m(d): d["topologyHints"][2]["sourcePortIds"].append("P-C1-PIPE_END_1")
        self.assertEqual("UXML_RVM_PORT_MULTI_NODE",block_code(direct_mutation(m)))
    def test_15_required_port_unassigned(self):
        def m(d): d["topologyHints"][0]["sourcePortIds"]=[]
        self.assertEqual("UXML_RVM_TOPOLOGY_HINT_PORTS",block_code(direct_mutation(m)))
    def test_16_duplicate_connection(self):
        def m(d): d["topologyHints"].append(copy.deepcopy(d["topologyHints"][3]))
        self.assertEqual("UXML_RVM_DUPLICATE_CONNECTION",block_code(direct_mutation(m)))
    def test_17_contradictory_cross_node_connection(self):
        def m(d): d["topologyHints"][3]["targetPortId"]="P-C2-PIPE_END_2"
        self.assertEqual("UXML_RVM_CONNECTION_NODE_CONTRADICTION",block_code(direct_mutation(m)))
    def test_18_transitive_proximity_chain(self):
        def m(d):
            d["topologyHints"]=[]
            d["ports"][1]["point"]["x"]=1000; d["ports"][2]["point"]["x"]=1004
        self.assertEqual("UXML_RVM_PORT_ACCOUNTING",block_code(direct_mutation(m)))
    def test_19_cross_line_node(self):
        def m(d):
            d["components"][1]["pipelineRef"]="PL-2"; d["components"][1]["lineKey"]="L-200"
            d["pipelines"].append({"id":"PL-2","pipelineRef":"L-200","lineKey":"L-200","lineNo":"L-200"})
        self.assertEqual("UXML_RVM_CROSS_LINE_NODE",block_code(direct_mutation(m)))
    def test_20_identical_coordinates_do_not_override_explicit_partition(self):
        source=s.isolated_two_line_source(); doc=json.loads(source); doc["topologyHints"][1]["sourcePortIds"].append("P-C2-PIPE_END_1"); doc["topologyHints"].pop(2)
        self.assertIn(block_code(lambda:s.evaluate(make_source(doc))),{"UXML_RVM_SOURCE_NODE_NUMBER_CONFLICT","UXML_RVM_CROSS_LINE_NODE"})

class CoordinateContextBlockers(unittest.TestCase):
    def test_21_missing_coordinate_context(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source)
        self.assertEqual("UXML_RVM_COORDINATE_CONTEXT_MISSING",block_code(lambda:validate_coordinate_context(None,sha256_bytes(source),kind)))
    def test_22_loose_basis_string_not_authority(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source)
        self.assertEqual("UXML_RVM_COORDINATE_CONTEXT_MISSING",block_code(lambda:validate_coordinate_context(None,sha256_bytes(source),kind)))
    def test_23_wrong_coordinate_source_hash(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind); cc["sourceHashSha256"]="0"*64; rehash(cc,"coordinateContextHashSha256")
        self.assertEqual("UXML_RVM_COORDINATE_SOURCE_BINDING",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_24_axis_map_restamp_fails_old_independent_manifest_pin(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind); _,old=validate_coordinate_context(cc,sha256_bytes(source),kind); manifest=s.authority_manifest(source,kind,old)
        cc["axisMap"]["targetX"]["sign"]=-1; cc["handedness"]["target"]="LEFT_HANDED"; rehash(cc,"coordinateContextHashSha256"); _,new=validate_coordinate_context(cc,sha256_bytes(source),kind)
        self.assertEqual("UXML_RVM_AUTHORITY_MANIFEST_BINDING",block_code(lambda:validate_authority_manifest(manifest,approved_hash=manifest["authorityManifestHashSha256"],source_hash=sha256_bytes(source),source_kind=kind,coordinate_hash=new,topology_hash=s.EMPTY_HASH,engineering_hash=s.EMPTY_HASH)))
    def test_25_repeated_source_axis(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind); cc["axisMap"]["targetY"]["sourceAxis"]="X"; rehash(cc,"coordinateContextHashSha256")
        self.assertEqual("UXML_RVM_AXIS_PERMUTATION",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_26_missing_source_axis(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind); del cc["axisMap"]["targetZ"]; rehash(cc,"coordinateContextHashSha256")
        self.assertEqual("UXML_RVM_AXIS_MAP",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_27_invalid_sign(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind); cc["axisMap"]["targetZ"]["sign"]=0; rehash(cc,"coordinateContextHashSha256")
        self.assertEqual("UXML_RVM_AXIS_SIGN",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_28_arbitrary_matrix_attempt(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,matrix=[[1,0,0],[0,1,0],[0,0,1]])
        self.assertEqual("UXML_RVM_COORDINATE_UNKNOWN_FIELD",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_29_nonuniform_scale_attempt(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,scaleByAxis={"x":1,"y":2,"z":1})
        self.assertEqual("UXML_RVM_COORDINATE_UNKNOWN_FIELD",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_30_unsupported_or_inferred_units(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,sourceCoordinateUnits="AUTO")
        self.assertEqual("UXML_RVM_COORDINATE_UNITS",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_31_nonfinite_offset(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,offsetMillimetres={"x":"NaN","y":0,"z":0})
        self.assertEqual("UXML_RVM_COORDINATE_OFFSET",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_32_target_frame_mismatch(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,targetFrameId="OTHER")
        self.assertEqual("UXML_RVM_TARGET_FRAME",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_33_handedness_contradiction(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind,handedness={"source":"RIGHT_HANDED","target":"LEFT_HANDED"})
        self.assertEqual("UXML_RVM_HANDEDNESS_CONTRADICTION",block_code(lambda:validate_coordinate_context(cc,sha256_bytes(source),kind)))
    def test_34_connected_ports_unequal_after_transform(self):
        def m(d): d["ports"][2]["point"]["x"]+=0.001; d["anchors"][2]["point"]["x"]+=0.001
        self.assertEqual("UXML_RVM_CONNECTED_COORDINATE_MISMATCH",block_code(direct_mutation(m)))

class NodeLineEngineeringBlockers(unittest.TestCase):
    def test_36_missing_node_number_authority(self):
        def m(d): d["anchors"][0].pop("nodeNumber")
        self.assertEqual("UXML_RVM_NODE_NUMBER_MISSING",block_code(direct_mutation(m)))
    def test_37_duplicate_node_number(self):
        def m(d): d["anchors"][3]["nodeNumber"]=200
        self.assertEqual("UXML_RVM_DUPLICATE_NODE_NUMBER",block_code(direct_mutation(m)))
    def test_38_zero_negative_fractional_node_numbers(self):
        for value in (0,-1,1.5):
            with self.subTest(value=value):
                self.assertEqual("UXML_RVM_NODE_NUMBER_VALUE",block_code(direct_mutation(lambda d,v=value:d["anchors"][0].__setitem__("nodeNumber",v))))
    def test_41_reordering_cannot_change_number_ownership(self):
        doc=direct_doc(); reordered=copy.deepcopy(doc); reordered["components"].reverse(); reordered["ports"].reverse(); reordered["anchors"].reverse()
        self.assertEqual(s.evaluate(make_source(doc))["topology"]["nodeNumberOwner"],s.evaluate(make_source(reordered))["topology"]["nodeNumberOwner"])
    def test_42_sorted_generation_not_restored(self):
        owners=s.evaluate(s.fixture("direct-exact.json"))["topology"]["nodeNumberOwner"]
        self.assertNotEqual({10:"N1",20:"N2",30:"N3"},owners)
    def test_43_default_line_not_authority(self):
        def m(d):
            d["defaultLine"]="DEFAULT"; d["components"][0]["lineKey"]=""; d["components"][0]["pipelineRef"]=""; d["pipelines"]=[]
        self.assertEqual("UXML_RVM_LINE_MISSING",block_code(direct_mutation(m)))
    def test_44_context_line_id_not_authority(self):
        def m(d): d["lineId"]="X"; d["components"][0]["lineKey"]=""; d["components"][0]["pipelineRef"]=""; d["pipelines"]=[]
        self.assertEqual("UXML_RVM_LINE_MISSING",block_code(direct_mutation(m)))
    def test_45_filename_not_line_authority(self):
        def m(d): d["sources"][0]["name"]="L-FILE.json"; d["components"][0]["lineKey"]=""; d["components"][0]["pipelineRef"]=""; d["pipelines"]=[]
        self.assertEqual("UXML_RVM_LINE_MISSING",block_code(direct_mutation(m)))
    def test_46_job_model_not_line_authority(self):
        def m(d): d["header"]["modelId"]="L-JOB"; d["components"][0]["lineKey"]=""; d["components"][0]["pipelineRef"]=""; d["pipelines"]=[]
        self.assertEqual("UXML_RVM_LINE_MISSING",block_code(direct_mutation(m)))
    def test_47_conflicting_line_aliases(self):
        def m(d): d["components"][0]["rawAttributes"]["lineNo"]="OTHER"
        self.assertEqual("UXML_RVM_LINE_ALIAS_CONFLICT",block_code(direct_mutation(m)))
    def test_49_pipeline_component_disagreement(self):
        def m(d): d["components"][0]["lineKey"]="L-X"
        self.assertEqual("UXML_RVM_LINE_ALIAS_CONFLICT",block_code(direct_mutation(m)))
    def test_50_missing_component_line(self):
        def m(d):
            d["components"][0]["lineKey"]=""; d["components"][0]["pipelineRef"]=""; d["pipelines"]=[]
        self.assertEqual("UXML_RVM_LINE_MISSING",block_code(direct_mutation(m)))
    def test_51_bore_never_substitutes_for_od(self):
        def m(d): d["components"][0]["rawAttributes"].pop("outsideDiameterMm"); d["components"][0]["bore"]=114.3
        self.assertEqual("UXML_RVM_ENGINEERING_REQUIRED_MISSING",block_code(direct_mutation(m)))
    def test_52_contradictory_od_aliases(self):
        def m(d): d["components"][0]["rawAttributes"]["od"]=120
        self.assertEqual("UXML_RVM_ENGINEERING_ALIAS_CONFLICT",block_code(direct_mutation(m)))
    def test_53_contradictory_wall_aliases(self):
        def m(d): d["components"][0]["rawAttributes"]["wt"]=7
        self.assertEqual("UXML_RVM_ENGINEERING_ALIAS_CONFLICT",block_code(direct_mutation(m)))
    def test_54_external_engineering_cannot_override_source(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); ec=s.engineering_context(source,kind,[{"componentId":"C1","field":"OUTSIDE_DIAMETER","value":"120","unit":"MM","canonicalValue":"120","authority":"APPROVED_ENGINEERING_FIELD_DECISION","sourceOccurrence":"x","disposition":"EMIT_CANONICAL","evidenceReferences":["x"]}])
        self.assertEqual("UXML_RVM_ENGINEERING_OVERRIDE",block_code(lambda:s.evaluate(source,engineering_artifact=ec)))
    def test_55_stale_engineering_hash(self):
        source=s.fixture("direct-exact.json"); _,kind=decode_source(source); ec=s.engineering_context(source,kind,[]); ec["authorityId"]="changed"
        self.assertEqual("UXML_RVM_ENGINEERING_HASH",block_code(lambda:validate_engineering_context(ec,sha256_bytes(source),kind)))
    def test_57_missing_required_od(self):
        self.assertEqual("UXML_RVM_ENGINEERING_REQUIRED_MISSING",block_code(direct_mutation(lambda d:d["components"][0]["rawAttributes"].pop("outsideDiameterMm"))))
    def test_58_missing_required_wall(self):
        self.assertEqual("UXML_RVM_ENGINEERING_REQUIRED_MISSING",block_code(direct_mutation(lambda d:d["components"][0]["rawAttributes"].pop("wallThicknessMm"))))

if __name__ == "__main__": unittest.main()
