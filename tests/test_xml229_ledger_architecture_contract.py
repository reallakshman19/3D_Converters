"""Adversarial, executable *architecture-model* proof; NOT product certification.

The fixtures are deliberately SYNTHETIC. These tests prove refusal/acceptance
properties of tests/xml229_ledger_architecture_model.py, NOT real source parsing,
native CII serialisation, original EF05 21 claims or deployed Pyodide behavior.
"""
from __future__ import annotations

from copy import deepcopy
import unittest

from xml229_ledger_architecture_model import ContractHold, digest, verify


def example():
    source = {
        "routes": [{"branch": 0, "ref": "=111/44", "name": "remote route edge"}],
        "supports": [
            {"id": "source/0/12", "branch": 0, "carrier": "=111/44", "port": "END",
             "kind": "REST", "gapMm": 0, "position": [0, 0, 0]},
            {"id": "source/0/13", "branch": 0, "carrier": "=111/44", "port": "END",
             "kind": "GUIDE", "gapMm": 5, "ps": "PS001", "position": [0, 0, 0]},
            {"id": "source/0/14", "branch": 0, "carrier": "=111/44", "port": "END",
             "kind": "LINESTOP", "gapMm": 8, "position": [0, 0, 0]},
        ],
    }
    original = {"nodes": [
        {"branch": 0, "ordinal": 699, "sourceNumber": -1, "nodeNumber": 1699,
         "position": [0, 0, 0], "ps": "PS002", "originalAuthored": [],
         "unrelatedFields": {"wall": "7.112", "teeSif": 3}},
        {"branch": 0, "ordinal": 700, "sourceNumber": -1, "nodeNumber": 1700,
         "position": [0, 0, 0], "ps": "PS001", "originalAuthored": [],
         "unrelatedFields": {"wall": "7.112", "teeSif": 3}},
    ], "routePortIncidence": [
        {"branch": 0, "routeRef": "=111/44", "port": "END", "node": [0, 700]}
    ]}
    config = {"toleranceMm": 0.5, "supportMapping": "Step7/8 verified snapshot"}
    ledger = {"owners": [
        {"sourceId": s["id"], "owner": [0, 700]} for s in source["supports"]
    ], "sourceSha256": digest(source), "xmlSha256": digest(original),
        "configSha256": digest(config)}
    enriched = {"nodes": deepcopy(original["nodes"])}
    enriched["nodes"][0]["restraints"] = []
    enriched["nodes"][1]["restraints"] = [
        {"kind": "REST", "gapMm": 0},
        {"kind": "GUIDE", "gapMm": 5},
        {"kind": "LINESTOP", "gapMm": 8},
    ]
    cii = {"restraints": [
        {"nodeNumber": 1700, "code": 14, "gapMm": 0},
        {"nodeNumber": 1700, "code": 8, "gapMm": 5},
        {"nodeNumber": 1700, "code": 9, "gapMm": 8},
    ], "rigids": [{"nodeNumber": 1700, "weightN": 125}],
           "consumedEnrichedSha256": digest(enriched)}
    final = {"masses": [{"nodeNumber": 1700, "kg": 12.5}],
             "sourceSha256": digest(source), "xmlSha256": digest(original),
             "configSha256": digest(config)}
    return source, original, config, ledger, enriched, cii, final


def validate(data):
    return verify(*data)


def refresh_enriched_digest(data):
    data[5]["consumedEnrichedSha256"] = digest(data[4])


def choose_one(data, which=1):
    source, xml, cfg, ledger, enriched, cii, final = data
    source["supports"] = [source["supports"][which]]
    ledger["owners"] = [ledger["owners"][which]]
    enriched["nodes"][1]["restraints"] = [enriched["nodes"][1]["restraints"][which]]
    cii["restraints"] = [cii["restraints"][which]]
    ledger["sourceSha256"] = final["sourceSha256"] = digest(source)
    refresh_enriched_digest(data)


class LedgerArchitectureContract(unittest.TestCase):
    def assertHeld(self, data, code):
        with self.assertRaises(ContractHold) as err:
            validate(data)
        self.assertEqual(str(err.exception), code)

    def test_positive_coincident_source_occurrence_exact_route_port(self):
        data = example()
        result = validate(data)
        self.assertEqual(result["verifiedSupports"], 3)
        self.assertEqual(result["verifiedCiiRestraintSlots"], 3)
        self.assertEqual(result["verifiedMassOwners"], 1)
        self.assertEqual(data[1]["nodes"][0]["sourceNumber"], -1)
        self.assertEqual(data[1]["nodes"][1]["sourceNumber"], -1)

    def test_verified_route_port_beats_nearer_ambiguous_xyz(self):
        data = example()
        # Node 699 is *closer*. Only source-declared route END proves node 700.
        data[1]["nodes"][1]["position"] = [0.2, 0, 0]
        data[4]["nodes"][1]["position"] = [0.2, 0, 0]
        data[3]["xmlSha256"] = data[6]["xmlSha256"] = digest(data[1])
        refresh_enriched_digest(data)
        self.assertEqual(validate(data)["verifiedSupports"], 3)

    def test_remote_carrier_does_not_veto_verified_unique_ps(self):
        data = example()
        choose_one(data, which=1)
        del data[0]["supports"][0]["port"]
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        # The route is valid, but need not equal the actual XML support node.
        data[1]["routePortIncidence"] = []
        data[3]["xmlSha256"] = data[6]["xmlSha256"] = digest(data[1])
        self.assertEqual(validate(data)["verifiedSupports"], 1)

    def test_original_authored_unique_kind_and_gap_is_independent_evidence(self):
        data = example()
        choose_one(data, which=1)
        s = data[0]["supports"][0]
        s.pop("carrier")
        s.pop("port")
        s.pop("ps")
        data[1]["nodes"][1]["originalAuthored"] = [["GUIDE", 5.0]]
        data[4]["nodes"][1]["originalAuthored"] = [["GUIDE", 5.0]]
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        data[3]["xmlSha256"] = data[6]["xmlSha256"] = digest(data[1])
        refresh_enriched_digest(data)
        self.assertEqual(validate(data)["verifiedSupports"], 1)

    def test_malformed_carrier_holds_even_if_unique_ps(self):
        data = example()
        data[0]["supports"][1]["carrier"] = "wrong/grammar"
        self.assertHeld(data, "SOURCE_BASIS_DRIFT")
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "CARRIER_GRAMMAR_UNVERIFIED")

    def test_duplicate_route_ref_holds(self):
        data = example()
        data[0]["routes"].append(deepcopy(data[0]["routes"][0]))
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "CARRIER_ROUTE_NOT_UNIQUE_IN_BRANCH")

    def test_cross_branch_route_ref_holds(self):
        data = example()
        data[0]["routes"][0]["branch"] = 1
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "CARRIER_ROUTE_NOT_UNIQUE_IN_BRANCH")

    def test_duplicate_route_port_incidence_holds(self):
        data = example()
        data[1]["routePortIncidence"].append(deepcopy(data[1]["routePortIncidence"][0]))
        data[3]["xmlSha256"] = data[6]["xmlSha256"] = digest(data[1])
        self.assertHeld(data, "CARRIER_PORT_INCIDENCE_NOT_UNIQUE")

    def test_no_original_source_evidence_holds_instead_of_first_node(self):
        data = example()
        choose_one(data)
        data[0]["supports"][0].pop("carrier")
        data[0]["supports"][0].pop("port")
        data[0]["supports"][0].pop("ps")
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "OWNER_EVIDENCE_REQUIRED")

    def test_conflicting_carrier_port_and_ps_holds(self):
        data = example()
        choose_one(data, which=1)
        data[1]["routePortIncidence"][0]["node"] = [0, 699]
        data[3]["xmlSha256"] = data[6]["xmlSha256"] = digest(data[1])
        self.assertHeld(data, "OWNER_PROOFS_CONTRADICT")

    def test_swapped_ledger_owner_holds(self):
        data = example()
        data[3]["owners"][1]["owner"] = [0, 699]
        self.assertHeld(data, "LEDGER_OWNER_NOT_SOURCE_PROVEN")

    def test_missing_mandatory_member_holds(self):
        data = example()
        data[3]["owners"].pop()
        self.assertHeld(data, "LEDGER_MEMBER_CENSUS_INVALID")

    def test_duplicate_support_source_occurrence_holds(self):
        data = example()
        data[0]["supports"][1]["id"] = data[0]["supports"][0]["id"]
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "SOURCE_SUPPORT_OCCURRENCE_DUPLICATED")

    def test_invalid_support_gap_does_not_default_to_zero(self):
        data = example()
        data[0]["supports"][1]["gapMm"] = None
        data[3]["sourceSha256"] = data[6]["sourceSha256"] = digest(data[0])
        self.assertHeld(data, "SUPPORT_GAP_UNVERIFIED")

    def test_wrong_enriched_guide_gap_is_rejected(self):
        data = example()
        data[4]["nodes"][1]["restraints"][1]["gapMm"] = 0
        refresh_enriched_digest(data)
        self.assertHeld(data, "ENRICHED_RESTRAINT_CENSUS_DRIFT")

    def test_dropped_enriched_line_stop_is_rejected(self):
        data = example()
        data[4]["nodes"][1]["restraints"].pop()
        refresh_enriched_digest(data)
        self.assertHeld(data, "ENRICHED_RESTRAINT_CENSUS_DRIFT")

    def test_reversed_guide_line_stop_numeric_codes_holds(self):
        data = example()
        data[5]["restraints"][1]["code"] = 9
        data[5]["restraints"][2]["code"] = 8
        self.assertHeld(data, "EMITTED_CII_RESTRAINT_DRIFT")

    def test_tampered_emitted_cii_gap_holds(self):
        data = example()
        data[5]["restraints"][1]["gapMm"] = 8
        self.assertHeld(data, "EMITTED_CII_RESTRAINT_DRIFT")

    def test_duplicate_emitted_cii_slot_holds(self):
        data = example()
        data[5]["restraints"].append(deepcopy(data[5]["restraints"][1]))
        self.assertHeld(data, "EMITTED_CII_RESTRAINT_DRIFT")

    def test_stale_original_source_holds(self):
        data = example()
        data[0]["supports"][0]["gapMm"] = 4
        self.assertHeld(data, "SOURCE_BASIS_DRIFT")

    def test_stale_config_holds(self):
        data = example()
        data[2]["supportMapping"] = "changed Step7 alias"
        self.assertHeld(data, "SOURCE_BASIS_DRIFT")

    def test_stale_final_holds_even_if_ledger_updated(self):
        data = example()
        data[6]["sourceSha256"] = "0" * 64
        self.assertHeld(data, "FINAL_BASIS_DRIFT")

    def test_geometry_drift_after_accepted_final_holds(self):
        data = example()
        data[4]["nodes"][1]["position"] = [0.2, 0, 0]
        refresh_enriched_digest(data)
        self.assertHeld(data, "ENRICHED_GEOMETRY_OR_ORDER_DRIFT")

    def test_wall_or_tee_change_without_separate_source_proof_holds(self):
        data = example()
        data[4]["nodes"][1]["unrelatedFields"]["wall"] = "0.01"
        refresh_enriched_digest(data)
        self.assertHeld(data, "ENRICHED_UNRELATED_FIELD_DRIFT")

    def test_second_enrichment_replay_digest_drift_holds(self):
        data = example()
        data[5]["consumedEnrichedSha256"] = "f" * 64
        self.assertHeld(data, "CII_CONSUMED_ENRICHED_BYTES_DRIFT")

    def test_final_valve_mass_dropped_to_zero_holds(self):
        data = example()
        data[5]["rigids"][0]["weightN"] = 0
        self.assertHeld(data, "EMITTED_CII_FINAL_MASS_DRIFT")

    def test_approved_zero_is_not_missing_mass_slot(self):
        data = example()
        data[6]["masses"][0]["kg"] = 0
        data[5]["rigids"][0]["weightN"] = 0
        self.assertEqual(validate(data)["verifiedMassOwners"], 1)
        data[5]["rigids"].clear()
        self.assertHeld(data, "EMITTED_CII_FINAL_MASS_DRIFT")


if __name__ == "__main__":
    unittest.main()
