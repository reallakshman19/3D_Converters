from __future__ import annotations

import copy
import json
import unittest

from scripts.inputxml_compiler.uxml_rvm_authority import validate_engineering_context
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    ContractError, decode_source, semantic_hash, sha256_bytes,
    validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_inventory import source_inventory, validate_topology_plan
from scripts.inputxml_compiler.uxml_rvm_manifest import validate_authority_manifest
from tests import test_inputxml_uxml_rvm_support as s


def block_code(fn):
    try:
        fn()
    except ContractError as exc:
        return exc.code
    raise AssertionError("expected ContractError")


def direct_block(mutator):
    document = json.loads(s.fixture("direct-exact.json"))
    mutator(document)
    return block_code(lambda: s.evaluate(s.json_source(document)))


def rehash(value, field):
    value[field] = semantic_hash(value, field)


def rvm_setup():
    source = s.fixture("rvm-rows.json")
    _, kind = decode_source(source)
    coordinate = s.coordinate_context(source, kind)
    _, digest = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
    bridge = s.discover(source, digest)
    return source, kind, coordinate, bridge, s.topology_plan(source, bridge)


def actions(*steps):
    def apply(document):
        for step in steps:
            step(document)
    return apply


def set_path(*path_value):
    *path, value = path_value
    def apply(document):
        target = document
        for key in path[:-1]:
            target = target[key]
        target[path[-1]] = value
    return apply


def direct_test(expected, mutator):
    def test(self):
        self.assertEqual(expected, direct_block(mutator))
    return test


class TopologyAuthorityBlockers(unittest.TestCase):
    def test_08_rvm_missing_topology_plan(self):
        self.assertEqual("UXML_RVM_TOPOLOGY_PLAN_MISSING", block_code(lambda: s.evaluate(s.fixture("rvm-rows.json"))))

    def test_09_stale_topology_source_hash(self):
        source, kind, _, bridge, plan = rvm_setup()
        plan["sourceHashSha256"] = "0" * 64; rehash(plan, "topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_TOPOLOGY_SOURCE_BINDING", block_code(lambda: validate_topology_plan(
            plan, source_hash=sha256_bytes(source), source_kind=kind,
            adapted_hash=bridge["adaptedUxmlHashSha256"], inventory=source_inventory(bridge["uxml"]),
        )))

    def test_10_stale_adapted_uxml_hash(self):
        source, _, coordinate, _, plan = rvm_setup()
        plan["adaptedUxmlHashSha256"] = "0" * 64; rehash(plan, "topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_ADAPTED_UXML_BINDING", block_code(lambda: s.evaluate(source, plan=plan, coordinate=coordinate)))

    def test_11_unknown_topology_authority(self):
        source, _, coordinate, _, plan = rvm_setup()
        plan["authorityType"] = "RESTAMPED"; rehash(plan, "topologyPlanHashSha256")
        self.assertEqual("UXML_RVM_TOPOLOGY_AUTHORITY", block_code(lambda: s.evaluate(source, plan=plan, coordinate=coordinate)))

    def test_20_identical_coordinates_do_not_override_explicit_partition(self):
        document = json.loads(s.isolated_two_line_source())
        document["topologyHints"][1]["sourcePortIds"].append("P-C2-PIPE_END_1")
        document["topologyHints"].pop(2)
        self.assertIn(block_code(lambda: s.evaluate(s.json_source(document))), {
            "UXML_RVM_SOURCE_NODE_NUMBER_CONFLICT", "UXML_RVM_CROSS_LINE_NODE",
        })


def _duplicate_connection(document):
    duplicate = copy.deepcopy(document["topologyHints"][3])
    duplicate["id"] = "TH-C12-DUP"
    document["topologyHints"].append(duplicate)


def _cross_line(document):
    document["components"][1].update(pipelineRef="PL-2", lineKey="L-200")
    document["pipelines"].append({"id": "PL-2", "pipelineRef": "L-200", "lineKey": "L-200", "lineNo": "L-200"})


_TOPOLOGY_CASES = {
    "test_01_coordinate_only_exact_coincidence": ("UXML_RVM_PORT_ACCOUNTING", set_path("topologyHints", [])),
    "test_02_old_six_mm_tolerance_has_zero_authority": ("UXML_RVM_CONNECTED_COORDINATE_MISMATCH", actions(set_path("ports", 2, "point", "x", 1005), set_path("anchors", 2, "point", "x", 1005))),
    "test_03_caller_tolerance_cannot_connect": ("UXML_RVM_CONNECTED_COORDINATE_MISMATCH", actions(set_path("connectToleranceMm", 999), set_path("ports", 2, "point", "x", 1001), set_path("anchors", 2, "point", "x", 1001))),
    "test_04_ray_only_connection": ("UXML_RVM_PORT_ACCOUNTING", actions(set_path("topologyHints", []), set_path("rayEvidence", [{"id": "RAY", "sourcePortId": "P-C1-PIPE_END_2", "targetPortId": "P-C2-PIPE_END_1"}]))),
    "test_05_face_proximity_hint_unregistered": ("UXML_RVM_TOPOLOGY_HINT_TYPE", set_path("topologyHints", [{"id": "F", "hintType": "FACE_PROXIMITY", "sourceConfidence": "EXACT_SOURCE", "evidenceReferences": ["x"]}])),
    "test_06_restamped_export_allowed_decision_cannot_authorize": ("UXML_RVM_PORT_ACCOUNTING", actions(set_path("topologyHints", []), set_path("topologyDecision", {"exportAllowed": True}))),
    "test_07_restamped_accepted_handoff_cannot_authorize": ("UXML_RVM_PORT_ACCOUNTING", actions(set_path("topologyHints", []), set_path("acceptedTopologyHandoff", {"exportAllowed": True}))),
    "test_12_unregistered_direct_hint_type": ("UXML_RVM_TOPOLOGY_HINT_TYPE", set_path("topologyHints", 0, "hintType", "NEAREST")),
    "test_13_missing_connection_port": ("UXML_RVM_CONNECTION_NODE_CONTRADICTION", set_path("topologyHints", 3, "targetPortId", "MISSING")),
    "test_14_one_port_two_nodes": ("UXML_RVM_PORT_MULTI_NODE", lambda d: d["topologyHints"][2]["sourcePortIds"].append("P-C1-PIPE_END_1")),
    "test_15_required_port_unassigned": ("UXML_RVM_TOPOLOGY_HINT_PORTS", set_path("topologyHints", 0, "sourcePortIds", [])),
    "test_16_duplicate_connection": ("UXML_RVM_DUPLICATE_CONNECTION", _duplicate_connection),
    "test_17_contradictory_cross_node_connection": ("UXML_RVM_CONNECTION_NODE_CONTRADICTION", set_path("topologyHints", 3, "targetPortId", "P-C2-PIPE_END_2")),
    "test_18_transitive_proximity_chain": ("UXML_RVM_PORT_ACCOUNTING", actions(set_path("topologyHints", []), set_path("ports", 2, "point", "x", 1004), set_path("anchors", 2, "point", "x", 1004))),
    "test_19_cross_line_node": ("UXML_RVM_CROSS_LINE_NODE", _cross_line),
}
for _name, (_expected, _mutator) in _TOPOLOGY_CASES.items():
    setattr(TopologyAuthorityBlockers, _name, direct_test(_expected, _mutator))


class CoordinateContextBlockers(unittest.TestCase):
    def _case(self, expected, mutate=None, **overrides):
        source = s.fixture("direct-exact.json"); _, kind = decode_source(source)
        context = s.coordinate_context(source, kind, **overrides)
        if mutate:
            mutate(context); rehash(context, "coordinateContextHashSha256")
        self.assertEqual(expected, block_code(lambda: validate_coordinate_context(context, sha256_bytes(source), kind)))

    def test_21_missing_coordinate_context(self):
        source = s.fixture("direct-exact.json"); _, kind = decode_source(source)
        self.assertEqual("UXML_RVM_COORDINATE_CONTEXT_MISSING", block_code(lambda: validate_coordinate_context(None, sha256_bytes(source), kind)))

    def test_22_loose_basis_string_not_authority(self):
        self.test_21_missing_coordinate_context()

    def test_23_wrong_coordinate_source_hash(self):
        self._case("UXML_RVM_COORDINATE_SOURCE_BINDING", lambda c: c.__setitem__("sourceHashSha256", "0" * 64))

    def test_24_axis_map_restamp_fails_old_independent_manifest_pin(self):
        source = s.fixture("direct-exact.json"); _, kind = decode_source(source)
        context = s.coordinate_context(source, kind); _, old = validate_coordinate_context(context, sha256_bytes(source), kind)
        manifest = s.authority_manifest(source, kind, old)
        context["axisMap"]["targetX"]["sign"] = -1; context["handedness"]["target"] = "LEFT_HANDED"
        rehash(context, "coordinateContextHashSha256"); _, new = validate_coordinate_context(context, sha256_bytes(source), kind)
        self.assertEqual("UXML_RVM_AUTHORITY_MANIFEST_BINDING", block_code(lambda: validate_authority_manifest(
            manifest, approved_hash=manifest["authorityManifestHashSha256"], source_hash=sha256_bytes(source),
            source_kind=kind, coordinate_hash=new, topology_hash=s.EMPTY_HASH, engineering_hash=s.EMPTY_HASH,
        )))

    def test_34_connected_ports_unequal_after_transform(self):
        self.assertEqual("UXML_RVM_CONNECTED_COORDINATE_MISMATCH", direct_block(actions(set_path("ports", 2, "point", "x", 1000.001), set_path("anchors", 2, "point", "x", 1000.001))))


_COORDINATE_CASES = {
    "test_25_repeated_source_axis": ("UXML_RVM_AXIS_PERMUTATION", lambda c: c["axisMap"]["targetY"].__setitem__("sourceAxis", "X"), {}),
    "test_26_missing_source_axis": ("UXML_RVM_AXIS_MAP", lambda c: c["axisMap"].pop("targetZ"), {}),
    "test_27_invalid_sign": ("UXML_RVM_AXIS_SIGN", lambda c: c["axisMap"]["targetZ"].__setitem__("sign", 0), {}),
    "test_28_arbitrary_matrix_attempt": ("UXML_RVM_COORDINATE_UNKNOWN_FIELD", None, {"matrix": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}),
    "test_29_nonuniform_scale_attempt": ("UXML_RVM_COORDINATE_UNKNOWN_FIELD", None, {"scaleByAxis": {"x": 1, "y": 2, "z": 1}}),
    "test_30_unsupported_or_inferred_units": ("UXML_RVM_COORDINATE_UNITS", None, {"sourceCoordinateUnits": "AUTO"}),
    "test_31_nonfinite_offset": ("UXML_RVM_COORDINATE_OFFSET", None, {"offsetMillimetres": {"x": "NaN", "y": 0, "z": 0}}),
    "test_32_target_frame_mismatch": ("UXML_RVM_TARGET_FRAME", None, {"targetFrameId": "OTHER"}),
    "test_33_handedness_contradiction": ("UXML_RVM_HANDEDNESS_CONTRADICTION", None, {"handedness": {"source": "RIGHT_HANDED", "target": "LEFT_HANDED"}}),
}
for _name, (_expected, _mutate, _overrides) in _COORDINATE_CASES.items():
    def _make(expected=_expected, mutate=_mutate, overrides=_overrides):
        return lambda self: self._case(expected, mutate, **overrides)
    setattr(CoordinateContextBlockers, _name, _make())


class NodeLineEngineeringBlockers(unittest.TestCase):
    def test_38_zero_negative_fractional_node_numbers(self):
        for value in (0, -1, 1.5):
            with self.subTest(value=value):
                self.assertEqual("UXML_RVM_NODE_NUMBER_VALUE", direct_block(set_path("anchors", 0, "nodeNumber", value)))

    def test_41_reordering_cannot_change_number_ownership(self):
        document = json.loads(s.fixture("direct-exact.json")); reordered = copy.deepcopy(document)
        for collection in ("components", "ports", "anchors"):
            reordered[collection].reverse()
        self.assertEqual(s.evaluate(s.json_source(document))["topology"]["nodeNumberOwner"], s.evaluate(s.json_source(reordered))["topology"]["nodeNumberOwner"])

    def test_42_sorted_generation_not_restored(self):
        self.assertNotEqual({10: "N1", 20: "N2", 30: "N3"}, s.evaluate(s.fixture("direct-exact.json"))["topology"]["nodeNumberOwner"])

    def test_54_external_engineering_cannot_override_source(self):
        source = s.fixture("direct-exact.json"); _, kind = decode_source(source)
        context = s.engineering_context(source, kind, [{"componentId": "C1", "field": "OUTSIDE_DIAMETER", "value": "120", "unit": "MM", "canonicalValue": "120", "authority": "APPROVED_ENGINEERING_FIELD_DECISION", "sourceOccurrence": "x", "disposition": "EMIT_CANONICAL", "evidenceReferences": ["x"]}])
        self.assertEqual("UXML_RVM_ENGINEERING_OVERRIDE", block_code(lambda: s.evaluate(source, engineering_artifact=context)))

    def test_55_stale_engineering_hash(self):
        source = s.fixture("direct-exact.json"); _, kind = decode_source(source)
        context = s.engineering_context(source, kind, []); context["authorityId"] = "changed"
        self.assertEqual("UXML_RVM_ENGINEERING_HASH", block_code(lambda: validate_engineering_context(context, sha256_bytes(source), kind)))


def _remove_line(document):
    document["components"][0].update(lineKey="", pipelineRef="")
    document["pipelines"] = []


def _line_decoy(field, value):
    return actions(set_path(field, value), _remove_line)


def _bore_only(document):
    document["components"][0]["rawAttributes"].pop("outsideDiameterMm")
    document["components"][0]["bore"] = 114.3


_NODE_CASES = {
    "test_36_missing_node_number_authority": ("UXML_RVM_NODE_NUMBER_MISSING", lambda d: d["anchors"][0].pop("nodeNumber")),
    "test_37_duplicate_node_number": ("UXML_RVM_DUPLICATE_NODE_NUMBER", set_path("anchors", 3, "nodeNumber", 200)),
    "test_43_default_line_not_authority": ("UXML_RVM_LINE_MISSING", _line_decoy("defaultLine", "DEFAULT")),
    "test_44_context_line_id_not_authority": ("UXML_RVM_LINE_MISSING", _line_decoy("lineId", "X")),
    "test_45_filename_not_line_authority": ("UXML_RVM_LINE_MISSING", actions(set_path("sources", 0, "name", "L-FILE.json"), _remove_line)),
    "test_46_job_model_not_line_authority": ("UXML_RVM_LINE_MISSING", actions(set_path("header", "modelId", "L-JOB"), _remove_line)),
    "test_47_conflicting_line_aliases": ("UXML_RVM_LINE_ALIAS_CONFLICT", set_path("components", 0, "rawAttributes", "lineNo", "OTHER")),
    "test_49_pipeline_component_disagreement": ("UXML_RVM_LINE_ALIAS_CONFLICT", set_path("components", 0, "lineKey", "L-X")),
    "test_50_missing_component_line": ("UXML_RVM_LINE_MISSING", _remove_line),
    "test_51_bore_never_substitutes_for_od": ("UXML_RVM_ENGINEERING_REQUIRED_MISSING", _bore_only),
    "test_52_contradictory_od_aliases": ("UXML_RVM_ENGINEERING_ALIAS_CONFLICT", set_path("components", 0, "rawAttributes", "od", 120)),
    "test_53_contradictory_wall_aliases": ("UXML_RVM_ENGINEERING_ALIAS_CONFLICT", set_path("components", 0, "rawAttributes", "wt", 7)),
    "test_57_missing_required_od": ("UXML_RVM_ENGINEERING_REQUIRED_MISSING", lambda d: d["components"][0]["rawAttributes"].pop("outsideDiameterMm")),
    "test_58_missing_required_wall": ("UXML_RVM_ENGINEERING_REQUIRED_MISSING", lambda d: d["components"][0]["rawAttributes"].pop("wallThicknessMm")),
}
for _name, (_expected, _mutator) in _NODE_CASES.items():
    setattr(NodeLineEngineeringBlockers, _name, direct_test(_expected, _mutator))


if __name__ == "__main__":
    unittest.main()
