from __future__ import annotations

import json
import unittest

from scripts.inputxml_compiler.uxml_rvm_accounting import accounting_bytes, accounting_is_closed
from scripts.inputxml_compiler.uxml_rvm_contracts import decode_source, sha256_bytes, stable_json_bytes, validate_coordinate_context
from tests import test_inputxml_uxml_rvm_support as support

EMPTY_HASH = support.EMPTY_HASH

class UxmlRvmPositiveTests(unittest.TestCase):
    def test_direct_uxml_explicit_port_topology_passes(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        self.assertEqual(2, len(result["elements"]))
        self.assertTrue(accounting_is_closed(result["proof"]))

    def test_rvm_rows_complete_exact_topology_plan_passes(self):
        source = support.fixture("rvm-rows.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind)
        _, coordinate_hash = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
        plan = support.topology_plan(source, support.discover(source, coordinate_hash))
        result = support.evaluate(source, plan=plan, coordinate=coordinate)
        self.assertEqual([10, 20, 30], sorted(result["topology"]["nodeNumberOwner"]))

    def test_explicit_source_anchor_node_numbers_are_authority(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        self.assertEqual({100: "N1", 200: "N2", 300: "N3"}, result["topology"]["nodeNumberOwner"])

    def test_approved_external_node_number_plan_is_authority(self):
        source = support.fixture("rvm-rows.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind)
        _, coordinate_hash = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
        plan = support.topology_plan(source, support.discover(source, coordinate_hash))
        result = support.evaluate(source, plan=plan, coordinate=coordinate)
        self.assertEqual({10: "N10", 20: "N20", 30: "N30"}, result["topology"]["nodeNumberOwner"])

    def test_two_lines_are_isolated_with_distinct_node_numbers(self):
        result = support.evaluate(support.isolated_two_line_source())
        self.assertEqual({"L-100", "L-200"}, {row["lineId"] for row in result["elements"]})
        self.assertEqual(4, len(result["topology"]["nodeNumberOwner"]))

    def test_identical_coordinates_do_not_merge_distinct_nodes(self):
        result = support.evaluate(support.isolated_two_line_source())
        nodes = {node["logicalNodeId"]: node for node in result["topology"]["nodes"]}
        self.assertEqual(nodes["N2A"]["coordinate"], nodes["N2B"]["coordinate"])
        self.assertNotEqual(nodes["N2A"]["engineeringNodeNumber"], nodes["N2B"]["engineeringNodeNumber"])

    def test_connected_ports_require_exact_equal_transformed_coordinates(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        node = next(item for item in result["topology"]["nodes"] if item["logicalNodeId"] == "N2")
        self.assertEqual(["P-C1-PIPE_END_2", "P-C2-PIPE_END_1"], node["sourcePortIds"])

    def test_signed_axis_coordinate_transformation(self):
        document = json.loads(support.fixture("direct-exact.json"))
        document["anchors"][3]["point"]["y"] = 1000
        document["ports"][3]["point"]["y"] = 1000
        source = support.json_source(document)
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind, axisMap={
            "targetX": {"sourceAxis": "X", "sign": 1},
            "targetY": {"sourceAxis": "Z", "sign": 1},
            "targetZ": {"sourceAxis": "Y", "sign": -1},
        })
        result = support.evaluate(source, coordinate=coordinate)
        self.assertEqual("-1000", result["elements"][1]["delta"]["z"])

    def test_exact_unit_conversion_to_millimetres(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind, sourceCoordinateUnits="IN", scaleToMillimetres="25.4")
        result = support.evaluate(source, coordinate=coordinate)
        self.assertEqual("25400.0", result["elements"][0]["delta"]["x"])

    def test_valid_source_offset_is_applied_without_delta_change(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind, offsetMillimetres={"x": 10, "y": -20, "z": 30})
        result = support.evaluate(source, coordinate=coordinate)
        self.assertEqual({"x": "10", "y": "-20", "z": "30"}, result["elements"][0]["fromCoordinate"])
        self.assertEqual("1000", result["elements"][0]["delta"]["x"])

    def test_source_and_external_engineering_evidence_agree(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        decisions = []
        for component in ("C1", "C2"):
            for field, value in (("OUTSIDE_DIAMETER", "114.3"), ("WALL_THICKNESS", "6.02")):
                decisions.append({"componentId": component, "field": field, "value": value, "unit": "MM", "canonicalValue": value, "authority": "APPROVED_ENGINEERING_FIELD_DECISION", "sourceOccurrence": "approved:test", "disposition": "EMIT_CANONICAL", "evidenceReferences": [f"engineering:{component}:{field}"]})
        result = support.evaluate(source, engineering_artifact=support.engineering_context(source, kind, decisions))
        self.assertEqual("114.3", result["elements"][0]["outsideDiameterMm"])

    def test_output_is_stable_under_shuffled_object_key_order(self):
        source = support.fixture("direct-exact.json")
        document = json.loads(source)
        def reverse(value):
            if isinstance(value, dict): return {key: reverse(value[key]) for key in reversed(list(value))}
            if isinstance(value, list): return [reverse(item) for item in value]
            return value
        shuffled = json.dumps(reverse(document), ensure_ascii=False, separators=(",", ":")).encode()
        self.assertEqual(support.evaluate(source)["elements"], support.evaluate(shuffled)["elements"])

    def test_output_is_stable_under_shuffled_nonsemantic_evidence(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        first = support.coordinate_context(source, kind, evidenceReferences=["b", "a", "c"])
        second = support.coordinate_context(source, kind, evidenceReferences=["c", "b", "a"])
        self.assertEqual(first["coordinateContextHashSha256"], second["coordinateContextHashSha256"])
        self.assertEqual(support.evaluate(source, coordinate=first)["elements"], support.evaluate(source, coordinate=second)["elements"])

    def test_repeated_node_processes_are_byte_deterministic_across_hash_seeds(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind)
        _, coordinate_hash = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
        manifest = support.authority_manifest(source, kind, coordinate_hash)
        from scripts.inputxml_compiler.uxml_rvm_contracts import build_bridge_request
        request = build_bridge_request(source, kind, coordinate_hash, EMPTY_HASH, EMPTY_HASH, manifest["authorityManifestHashSha256"])
        results = [stable_json_bytes(support.run_bridge(request, hash_seed=seed)) for seed in ("1", "17", "991")]
        self.assertEqual(results[0], results[1])
        self.assertEqual(results[1], results[2])

    def test_complete_source_accounting_proof_has_zero_invariants(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        self.assertTrue(all(value == 0 for value in result["proof"]["invariants"].values()))
        self.assertEqual(accounting_bytes(result["proof"]), stable_json_bytes(result["proof"]))

    def test_authority_ledger_records_are_strict_json_serializable(self):
        from scripts.inputxml_compiler.uxml_rvm_ledger import ledger_authority_decisions
        class Ledger:
            def __init__(self):
                self.records = []
            def add(self, **record):
                self.records.append(record)
        result = support.evaluate(support.fixture("direct-exact.json"))
        ledger = Ledger()
        ledger_authority_decisions(ledger, result["topology"], result["lines"], result["engineering"])
        json.dumps(ledger.records, ensure_ascii=False, allow_nan=False, sort_keys=True)


if __name__ == "__main__":
    unittest.main()
