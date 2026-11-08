"""Rigid S2: 144 source-matched R9 RIGID projections, FULL physical mass budget.

TEST ONLY. Protected R9 XML is not in this repository. The CII here is a
native-writer projection of its 144 rigid source-matched elements, NOT the
ordinary complete Native Final export and NOT independent S3 release proof.
"""
import copy
from collections import Counter
from dataclasses import replace
import hashlib
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "converters" / "scripts"))
import xml_to_cii2019 as native
from xml229_native_final_mass_binding import emitted_sections, _cii_elements

SOURCE_HASH = "5cf2bfbe4cbe88361afcb3374c5230ee4badf42d9f503ec2cb5b2f0b7414e00c"
FIXTURE = ROOT / "tests" / "fixtures" / "rigid-s2-r9-ledger.json"


class S2NonreleaseError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def require(ok, code):
    if not ok:
        raise S2NonreleaseError(code)


def load_ledger():
    d = json.loads(FIXTURE.read_text(encoding="utf-8"))
    require(d["sourceXmlSha256"] == SOURCE_HASH and
            d["releaseAuthorized"] is False and
            d["splitGeometryIndependentlyVerified"] is False,
            "S2_NOT_RELEASE_AUTHORIZED")
    return d


def source_has_hold_reason(source):
    reason = source.get("holdReason")
    rule = source.get("holdRuleFileLine")
    return (isinstance(reason, str) and
            source["componentRef"] in reason and
            source["branch"] in reason and
            isinstance(rule, str) and
            rule.startswith("converters/scripts/xml229_native_final_mass_binding.py:") and
            ("VALVE_BODY" in reason if source["physicalFamily"] == "VALV"
             else "PRODUCT_COLLAPSED" in reason if source["componentRef"].endswith("/26728")
             else "NO_UNIQUE_SOURCE_RIGID_OWNER" in reason))


def verify_budget(ledger):
    """Each known kg belongs once to OWNED or HELD; unknown is null."""
    elements = ledger["elements"]
    sources = ledger["sources"]
    require(len(elements) == 144 and len(sources) == 154 and
            len({(e["branch"], tuple(e["nodePair"])) for e in elements}) == 144 and
            len({e["elementId"] for e in elements}) == 144,
            "S2_RIGID_ELEMENT_CENSUS")
    owned = [s for s in sources if s["status"] == "OWNED"]
    held = [s for s in sources if s["status"] == "HELD"]
    unknown = [s for s in sources if s["status"] == "REVIEW"]
    require(len(owned) == 50 and len(held) == 32 and len(unknown) == 72 and
            len({s["sourceId"] for s in sources}) == 154,
            "S2_SOURCE_POPULATION")
    require(all(s["knownMassKg"] is None for s in unknown),
            "S2_UNKNOWN_NOT_ZERO")
    require(all(s["ownerElementId"] is None for s in held) and
            all(s["knownMassKg"] is not None and s["knownMassKg"] > 0 for s in held),
            "S2_HELD_MUST_NOT_ASSIGN")
    require(all(source_has_hold_reason(s) for s in held),
            "S2_HELD_MISSING_GEOMETRY_REASON")
    # M3: this is a geometric hold, not merely a status label. A held
    # physical's exact source two-endpoint span must not already be a
    # single same-component RIGID ownership edge.
    for source in held:
        nums = source["sourceNodeNumbers"]
        require(not any(e["branch"] == source["branch"] and
                        e["sourceGeometryClass"] == "OWNED" and
                        e["nodePair"] == [int(nums[0]), int(nums[-1])]
                        for e in elements), "S2_HELD_GEOMETRY_OWNER_EXISTS")
    owner_ids = [s["ownerElementId"] for s in owned]
    require(all(isinstance(i, str) and i.startswith("E") for i in owner_ids) and
            len(set(owner_ids)) == 50,
            "S2_DOUBLE_COUNT")
    established = [e for e in elements if e["status"] == "OWNED"]
    suggested = [e for e in elements if e["status"] == "SUGGESTED"]
    unresolved = [e for e in elements if e["status"] in ("HELD", "REVIEW")]
    require(len(established) == 50 and len(suggested) == 14 and
            len(unresolved) == 80 and
            all(e["weightKg"] is None and e["ownerElementId"] is None
                for e in unresolved), "S2_UNRESOLVED_MASS_INVENTED")
    require(all(e["ownerElementId"] is None and e["weightKg"] == 2.63 and
                e["masterRowId"] == 252 for e in suggested),
            "S2_SUGGESTION_NOT_AN_OWNER")
    require(all(e["ownerElementId"] == e["elementId"] and
                e["weightKg"] > 0 and
                any(s["ownerElementId"] == e["elementId"] and
                    s["sourceId"] == e["ownerSourceId"] and
                    s["knownMassKg"] == e["weightKg"] for s in owned)
                for e in established), "S2_OWNED_SOURCE_PROVENANCE")
    assigned = sum(s["knownMassKg"] for s in owned)
    heldkg = sum(s["knownMassKg"] for s in held)
    require(assigned == 894 and heldkg == 976 and assigned + heldkg == 1870,
            "S2_KNOWN_KG_CONSERVATION")
    return {"ownedElements": 50, "suggestedElements": 14,
            "heldElements": 0, "reviewElements": 80,
            "knownSources": 82, "ownedSources": 50,
            "heldSources": 32, "unknownSources": 72,
            "ownedSourceKg": 894, "heldSourceKg": 976,
            "knownSourceKg": 1870, "testOnlySuggestedKg": 36.82}


def native_test_only_model(ledger):
    """Feed actual native CII serializer with R9-attested projected geometry."""
    metadata = native.XmlMetadata(
        date_time="S2 NONRELEASE", source="R9 RIGID projection",
        version="TEST ONLY", user_name="nonrelease", purpose="S2 audit only",
        project_name="RIGID-S2", mdb_name="NO-PRODUCTION", title_lines=[],
        restrain_open_ends=False, ambient_temperature=20.0)
    edges = []
    for e in ledger["elements"]:
        left, right = e["nodePair"]
        dn = e["dn"] or 50
        from_node = native.XmlNode(
            node_number=left, node_name="", endpoint=1,
            component_type="RIGID", component_ref_no="S2/NO-PRODUCTION",
            rigid=2, weight=0.0, material_code=None,
            outside_diameter=60.3 if dn == 50 else dn + 10,
            alpha_angle=None, wall_thickness=3.0,
            corrosion_allowance=0.0, insulation_thickness=0.0,
            bend_radius=0.0, bend_type=None,
            position=tuple(e["fromPositionMm"]), restraint_specs=())
        to_node = replace(
            from_node, node_number=right, endpoint=2,
            position=tuple(e["toPositionMm"]),
            weight=e["weightKg"] if e["weightKg"] is not None else 0.0)
        edges.append(native.Edge(
            from_node=from_node, to_node=to_node,
            branch_temperature=120.0, branch_pressure=13001.0,
            branch_fluid_density=109.9, branch_name=e["branch"],
            branch_material_number=None))
    return native.ConversionModel(
        metadata=metadata, edges=edges, degrees=Counter(),
        nodename_lines=[], edge_to_nodename_index={},
        bend_edges=[], edge_to_bend_index={},
        rigid_edges=edges,
        edge_to_rigid_index={i: i + 1 for i in range(len(edges))},
        sif_edges=[], edge_to_sif_index={},
        reducer_edges=[], edge_to_reducer_index={},
        restraints=[], edge_to_restraint_index={})


def render_nonrelease(ledger):
    verify_budget(ledger)
    model = native_test_only_model(ledger)
    cii = native._build_cii_text(
        model, "first", "S2 NON-RELEASE TEST ONLY",
        weight_scale=10, support_config={})
    receipt = verify_actual_bytes(cii, ledger)
    return cii, receipt


def verify_actual_bytes(cii, ledger):
    """Parse actual ELEMENTS row-13 pointers to actual RIGID force N values."""
    require(ledger.get("releaseAuthorized") is False and
            ledger.get("splitGeometryIndependentlyVerified") is False,
            "S2_RELEASE_BLOCKED")
    slots, weights = emitted_sections(cii)
    parsed = _cii_elements(cii)
    elements = ledger["elements"]
    require(len(parsed) == 144 and len(weights) == 144 and len(slots) == 144,
            "S2_CII_POPULATION_DRIFT")
    claim_pointers = set()
    rows = []
    for idx, e in enumerate(elements):
        fr, to, pointer = parsed[idx]
        require((int(float(fr)), int(float(to))) == tuple(e["nodePair"]) and
                pointer == idx + 1 and (pointer - 1) in slots and
                slots[pointer - 1][0] == idx,
                "S2_CII_POINTER_OWNER_DRIFT")
        force = weights[pointer - 1]
        if e["status"] in ("OWNED", "SUGGESTED"):
            require(math.isclose(force, 10 * e["weightKg"],
                                 abs_tol=1e-6, rel_tol=1e-9),
                    "S2_CII_FORCE_DRIFT")
            claim_pointers.add(pointer)
        else:
            require(force == 0.0, "S2_CII_UNALLOCATED_FORCE")
        rows.append({
            "elementId": e["elementId"], "pointer": pointer,
            "actualForceN": force, "status": e["status"],
            "sourceKg": e["weightKg"], "ownerElementId": e["ownerElementId"]})
    # The 64 assigned pointer census is already enforced by the 50+14
    # ledger statuses and the one-to-one per-element pointer check.
    return {
        "schema": "RIGID.S2.NonreleaseActualBytes.v1",
        "releaseAuthorized": False,
        "splitGeometryIndependentlyVerified": False,
        "ciiSha256": hashlib.sha256(cii.encode()).hexdigest(),
        "actualElementCount": len(parsed),
        "actualRigidCount": len(weights),
        "sourceBudget": verify_budget(ledger), "actualElements": rows}


class S2BudgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ledger = load_ledger()

    def reject(self, data, code):
        with self.assertRaisesRegex(S2NonreleaseError, "^" + code + "$"):
            verify_budget(data)

    def test_m1_full_budget_reconciles(self):
        p = verify_budget(self.ledger)
        self.assertEqual(
            (p["ownedSourceKg"], p["heldSourceKg"], p["knownSourceKg"]),
            (894, 976, 1870))

    def test_m1_duplicate_element_id_refused(self):
        data = copy.deepcopy(self.ledger)
        review = [e for e in data["elements"] if e["status"] == "REVIEW"]
        review[1]["elementId"] = review[0]["elementId"]
        self.reject(data, "S2_RIGID_ELEMENT_CENSUS")

    def test_m1_known_mass_sum_mutant_refused(self):
        data = copy.deepcopy(self.ledger)
        next(x for x in data["sources"] if x["status"] == "HELD")["knownMassKg"] += 1
        self.reject(data, "S2_KNOWN_KG_CONSERVATION")

    def test_m1_double_owner_mutant_refused(self):
        data = copy.deepcopy(self.ledger)
        claimed = [x for x in data["sources"] if x["status"] == "OWNED"]
        claimed[1]["ownerElementId"] = claimed[0]["ownerElementId"]
        self.reject(data, "S2_DOUBLE_COUNT")

    def test_m1_unknown_is_null_mutant_refused(self):
        data = copy.deepcopy(self.ledger)
        next(x for x in data["sources"] if x["status"] == "REVIEW")["knownMassKg"] = 0.0
        self.reject(data, "S2_UNKNOWN_NOT_ZERO")

    def test_m1_unique_source_identity_mutant_refused(self):
        data = copy.deepcopy(self.ledger)
        unknowns = [s for s in data["sources"] if s["status"] == "REVIEW"]
        unknowns[1]["sourceId"] = unknowns[0]["sourceId"]
        self.reject(data, "S2_SOURCE_POPULATION")

    def test_m1_held_must_carry_no_mass_mutant_refused(self):
        data = copy.deepcopy(self.ledger)
        next(x for x in data["sources"] if x["status"] == "HELD")["ownerElementId"] = "E4"
        self.reject(data, "S2_HELD_MUST_NOT_ASSIGN")

    def test_m3_each_held_component_requires_geometry_reason(self):
        self.assertEqual(sum(x["status"] == "HELD"
                             for x in self.ledger["sources"]), 32)
        data = copy.deepcopy(self.ledger)
        next(x for x in data["sources"] if x["status"] == "HELD")["holdReason"] = None
        self.reject(data, "S2_HELD_MISSING_GEOMETRY_REASON")

    def test_m1_unresolved_element_not_zero(self):
        data = copy.deepcopy(self.ledger)
        next(e for e in data["elements"] if e["status"] == "REVIEW")["weightKg"] = 0.0
        self.reject(data, "S2_UNRESOLVED_MASS_INVENTED")

    def test_m1_owned_source_provenance(self):
        data = copy.deepcopy(self.ledger)
        next(e for e in data["elements"] if e["status"] == "OWNED")["ownerSourceId"] = "UNATTESTED"
        self.reject(data, "S2_OWNED_SOURCE_PROVENANCE")

    def test_m3_held_never_has_a_complete_owner_edge(self):
        data = copy.deepcopy(self.ledger)
        h = next(s for s in data["sources"] if s["status"] == "HELD")
        candidate = next(e for e in data["elements"]
                         if e["branch"] == h["branch"] and
                         e["sourceGeometryClass"] == "OWNED")
        h["sourceNodeNumbers"] = [str(n) for n in candidate["nodePair"]]
        self.reject(data, "S2_HELD_GEOMETRY_OWNER_EXISTS")

    def test_m1_suggested_is_not_owned(self):
        data = copy.deepcopy(self.ledger)
        next(x for x in data["elements"]
             if x["status"] == "SUGGESTED")["ownerElementId"] = "E65"
        self.reject(data, "S2_SUGGESTION_NOT_AN_OWNER")

    def test_m2_actual_writer_144_record_mass_and_status(self):
        cii, receipt = render_nonrelease(self.ledger)
        self.assertEqual((receipt["actualElementCount"],
                          receipt["actualRigidCount"]), (144, 144))
        self.assertEqual(Counter(x["status"] for x in receipt["actualElements"]),
                         Counter({"OWNED": 50, "SUGGESTED": 14, "REVIEW": 80}))
        self.assertEqual(sum(x["actualForceN"] for x in receipt["actualElements"]
                             if x["status"] == "OWNED"), 8940)
        self.assertAlmostEqual(sum(
            x["actualForceN"] for x in receipt["actualElements"]
            if x["status"] == "SUGGESTED"), 368.2, places=6)

    def change_force(self, cii, index, value):
        lines = cii.splitlines()
        pos = lines.index("#$ RIGID") + 1 + index
        parts = lines[pos].split()
        self.assertEqual(len(parts), 2)
        parts[0] = str(value)
        lines[pos] = " ".join(parts)
        return "\n".join(lines) + "\n"

    def test_m2_actual_pointer_swap_between_review_edges_refused(self):
        cii, _ = render_nonrelease(self.ledger)
        indices = [i for i, e in enumerate(self.ledger["elements"])
                   if e["status"] == "REVIEW"][:2]
        lines = cii.splitlines()
        start = lines.index("#$ ELEMENTS") + 1
        a, b = [start + i * 15 + 12 for i in indices]
        first, second = lines[a].split(), lines[b].split()
        first[1], second[1] = second[1], first[1]
        lines[a], lines[b] = " ".join(first), " ".join(second)
        with self.assertRaisesRegex(S2NonreleaseError, "S2_CII_POINTER_OWNER_DRIFT"):
            verify_actual_bytes("\n".join(lines) + "\n", self.ledger)

    def test_m2_145th_actual_element_refused(self):
        cii, _ = render_nonrelease(self.ledger)
        lines = cii.splitlines()
        e_start = lines.index("#$ ELEMENTS") + 1
        extra = list(lines[e_start:e_start + 15])
        first = extra[0].split()
        first[0], first[1] = "98989", "98990"
        extra[0] = " ".join(first)
        row13 = extra[12].split()
        row13[1] = "145"
        extra[12] = " ".join(row13)
        lines[e_start + 144 * 15:e_start + 144 * 15] = extra
        r_start = lines.index("#$ RIGID") + 1
        lines.insert(r_start + 144, "0 0")
        control = lines.index("#$ CONTROL") + 1
        fields1, fields2 = lines[control].split(), lines[control + 1].split()
        fields1[0], fields2[1] = "145", "145"
        lines[control], lines[control + 1] = (
            " ".join(fields1), " ".join(fields2))
        with self.assertRaisesRegex(S2NonreleaseError, "S2_CII_POPULATION_DRIFT"):
            verify_actual_bytes("\n".join(lines) + "\n", self.ledger)

    def test_m2_actual_owned_force_tamper_refused(self):
        cii, _ = render_nonrelease(self.ledger)
        idx = next(i for i, e in enumerate(self.ledger["elements"])
                   if e["status"] == "OWNED")
        with self.assertRaisesRegex(S2NonreleaseError, "S2_CII_FORCE_DRIFT"):
            verify_actual_bytes(self.change_force(cii, idx, 0), self.ledger)

    def test_m2_rlt10_suggested_actual_force_tamper_refused(self):
        cii, _ = render_nonrelease(self.ledger)
        idx = next(i for i, e in enumerate(self.ledger["elements"])
                   if e["status"] == "SUGGESTED")
        with self.assertRaisesRegex(S2NonreleaseError, "S2_CII_FORCE_DRIFT"):
            verify_actual_bytes(self.change_force(cii, idx, 150), self.ledger)

    def test_m2_unclaimed_review_force_tamper_refused(self):
        cii, _ = render_nonrelease(self.ledger)
        idx = next(i for i, e in enumerate(self.ledger["elements"])
                   if e["status"] == "REVIEW")
        with self.assertRaisesRegex(S2NonreleaseError, "S2_CII_UNALLOCATED_FORCE"):
            verify_actual_bytes(self.change_force(cii, idx, 150), self.ledger)

    def test_m2_test_receipt_cannot_authorize_release(self):
        cii, _ = render_nonrelease(self.ledger)
        data = copy.deepcopy(self.ledger)
        data["releaseAuthorized"] = True
        with self.assertRaisesRegex(S2NonreleaseError, "S2_RELEASE_BLOCKED"):
            verify_actual_bytes(cii, data)


def write_artifacts(folder):
    folder.mkdir(parents=True, exist_ok=True)
    ledger = load_ledger()
    cii, receipt = render_nonrelease(ledger)
    files = {
        "S2_R9_PROJECTED_LEDGER_NON_RELEASE.json":
            (json.dumps(ledger, indent=2, sort_keys=True) + "\n").encode(),
        "S2_TEST_ONLY_NON_RELEASE.cii": cii.encode(),
        "S2_TEST_ONLY_CII_RECEIPT.json":
            (json.dumps(receipt, indent=2, sort_keys=True) + "\n").encode()}
    for name, payload in files.items():
        (folder / name).write_bytes(payload)
    manifest = "".join(
        hashlib.sha256(payload).hexdigest() + "  " + name + "\n"
        for name, payload in files.items())
    (folder / "SHA256SUMS_S2.txt").write_text(manifest)
    print("S2_TEST_ONLY_ARTIFACTS\n" + manifest, flush=True)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--write-test-only-dir":
        write_artifacts(Path(sys.argv[2]))
    else:
        unittest.main()
