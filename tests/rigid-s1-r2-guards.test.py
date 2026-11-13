"""RIGID S1-R2: source-witnessed negative tests. Non-release; public derived fixture only.

Behavioral tests mutate real serializer CII bytes, source XML, bound-witness
data, and native model edges. They do not permit runtime authorization.
"""
import copy
from dataclasses import replace
import hashlib
from pathlib import Path
import runpy
import sys
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "converters" / "scripts"))
import xml229_rigid_s1_testonly as s1
import xml229_native_final_mass_binding as binder
import xml_cii_weight_output_custody as custody

FIXTURE = runpy.run_path(str(ROOT / "tests" / "rigid-s1-testonly.test.py"))
derived_source = FIXTURE["derived_source"]
bound_witness = FIXTURE["_s1_bound_witness"]


def change_rigid_force(cii, rigid_index, value):
    lines = cii.splitlines()
    index = lines.index("#$ RIGID") + 1 + rigid_index
    fields = lines[index].split()
    assert len(fields) == 2
    fields[0] = str(value)
    lines[index] = " ".join(fields)
    return "\n".join(lines) + "\n"


def change_pointer(cii, element_index, pointer):
    lines = cii.splitlines()
    index = lines.index("#$ ELEMENTS") + 1 + element_index * 15 + 12
    fields = lines[index].split()
    assert len(fields) == 6
    fields[1] = str(pointer)
    lines[index] = " ".join(fields)
    return "\n".join(lines) + "\n"


def remove_last_pair_element_and_rigid(cii):
    """Delete one full ELEMENTS record and RIGID record; keep CONTROL coherent."""
    lines = cii.splitlines()
    e_start = lines.index("#$ ELEMENTS") + 1
    del lines[e_start + 27 * 15:e_start + 28 * 15]
    r_start = lines.index("#$ RIGID") + 1
    del lines[r_start + 27]
    control = lines.index("#$ CONTROL") + 1
    head = lines[control].split()
    head[0] = "27"
    lines[control] = " ".join(head)
    subhead = lines[control + 1].split()
    subhead[1] = "27"
    lines[control + 1] = " ".join(subhead)
    return "\n".join(lines) + "\n"


def set_xml_field(raw, index, field, value):
    root = ET.fromstring(raw)
    branch = next(b for b in root.iter() if b.tag == "Branch")
    nodes = [n for n in branch if n.tag == "Node"]
    next(ch for ch in nodes[index] if ch.tag == field).text = value
    return ET.tostring(root, encoding="utf-8")


class R2ActualCiiByteGuards(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cii, cls.receipt = s1.render_s1_nonrelease(derived_source())

    def assert_cii_refused(self, cii, receipt=None):
        with self.assertRaises(binder.NativeMassError):
            s1.verify_actual_cii(cii, copy.deepcopy(receipt or self.receipt))

    def test_t1_flange_150_changed_to_26_3_refused(self):
        self.assert_cii_refused(change_rigid_force(self.cii, 1, 26.3))

    def test_t1_flange_149_refused_independent_flange_clause(self):
        self.assert_cii_refused(change_rigid_force(self.cii, 1, 149))

    def test_t1_span_26_3_changed_to_150_refused(self):
        self.assert_cii_refused(change_rigid_force(self.cii, 0, 150))

    def test_t1_suggested_force_27_refused(self):
        self.assert_cii_refused(change_rigid_force(self.cii, 0, 27))

    def test_t1_two_elements_share_one_rigid_pointer(self):
        self.assert_cii_refused(change_pointer(self.cii, 1, 1))

    def test_t1_two_rigid_pointers_swapped(self):
        bad = change_pointer(change_pointer(self.cii, 0, 2), 1, 1)
        self.assert_cii_refused(bad)

    def test_t1_mismatched_slot_index_refused(self):
        slots, weights = binder.emitted_sections(self.cii)
        slots[0] = (999, slots[0][1], slots[0][2])
        with patch.object(s1, "emitted_sections", return_value=(slots, weights)):
            self.assert_cii_refused(self.cii)

    def test_t1_population_drift_in_coherent_tampered_cii(self):
        self.assert_cii_refused(remove_last_pair_element_and_rigid(self.cii))

    def test_y3_29th_nonrigid_element_population_refused(self):
        # Append an actual fifteenth-row ELEMENTS block with RIGID pointer 0;
        # the RIGID section remains 28 records and CONTROL is consistent.
        lines = self.cii.splitlines()
        start = lines.index("#$ ELEMENTS") + 1
        extra = list(lines[start:start + 15])
        # Give the unclaimed record unique endpoints so no checkpoint
        # _emitted_force() lookup can reject it for duplicate FROM/TO.
        first_fields = extra[0].split()
        self.assertEqual(len(first_fields), 6)
        first_fields[0], first_fields[1] = "99999", "99998"
        extra[0] = " ".join(first_fields)
        pointer_fields = extra[12].split()
        self.assertEqual(len(pointer_fields), 6)
        pointer_fields[1] = "0"
        extra[12] = " ".join(pointer_fields)
        lines[start + 28 * 15:start + 28 * 15] = extra
        control = lines.index("#$ CONTROL") + 1
        fields = lines[control].split()
        self.assertEqual(fields[0], "28")
        fields[0] = "29"
        lines[control] = " ".join(fields)
        bad = "\n".join(lines) + "\n"
        with self.assertRaises(binder.NativeMassError) as caught:
            s1.verify_actual_cii(bad, copy.deepcopy(self.receipt))
        self.assertEqual(caught.exception.code, "S1_CII_PAIR_POPULATION_DRIFT")

    def test_t1_used_and_equal_force_guards_present(self):
        # Logical overlap: c_n == f_n is subsumed by c_n == 150 plus
        # f_n == 150. Used-index uniqueness is also implied by the 28-owner
        # final census. Presence tests kill deletion but are NOT counted
        # as independent behavior-based mutation kills.
        source = (ROOT / "converters/scripts/xml229_rigid_s1_testonly.py").read_text()
        for marker in ("c_n == 150", "c_n == f_n",
                       "c_idx in used", "f_idx in used",
                       "len(used) != 28",
                       "len(checkpoints) != 14"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_t2_owner_approved_true_blocked(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["checkpoints"][0]["ownerApproved"] = True
        with self.assertRaisesRegex(binder.NativeMassError, "S1_FINAL_RELEASE_BLOCKED"):
            s1.nonrelease_guard(receipt)

    def test_t2_review_not_suggested_blocked(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["checkpoints"][0]["status"] = "REVIEW"
        with self.assertRaisesRegex(binder.NativeMassError, "S1_FINAL_RELEASE_BLOCKED"):
            s1.nonrelease_guard(receipt)

    def test_t2_wrong_schema_blocked(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["schema"] = "RigidS1.NonReleasePcomFlangeWitness.v0"
        with self.assertRaisesRegex(binder.NativeMassError, "S1_FINAL_RELEASE_BLOCKED"):
            s1.nonrelease_guard(receipt)


class R2ExplicitWitnessGuards(unittest.TestCase):
    def must_fail(self, code, alter, skip_main_audit=False):
        with bound_witness() as (bound, model, witness):
            alter(bound, model, witness)
            context = (patch.object(custody, "audit_rigid_weight_owners",
                                    return_value=[]) if skip_main_audit
                       else patch.object(custody, "_no_op_unrelated", create=True))
            with context:
                with self.assertRaisesRegex(ValueError, code):
                    custody.require_rigid_weight_owners(
                        bound, model, s1_test_only_witness=witness)

    def test_t3_witness_bound_to_different_xml_refused(self):
        self.must_fail("CII_S1_TEST_WITNESS_INVALID",
                       lambda b, m, w: w.__setitem__("boundTestInputSha256", "0" * 64))

    def test_t3_release_flag_true_refused(self):
        self.must_fail("CII_S1_TEST_WITNESS_INVALID",
                       lambda b, m, w: w.__setitem__("nativeCiiReleaseAuthorized", True))

    def test_t3_wrong_status_refused(self):
        self.must_fail("CII_S1_UNAPPROVED_MASS_CLAIM",
                       lambda b, m, w: w["checkpoints"][0].__setitem__("status", "REVIEW"))

    def test_t3_pcom_node_number_five_refused(self):
        def alter(bound, model, witness):
            root = ET.parse(bound).getroot()
            branch = next(b for b in root.iter() if b.tag == "Branch")
            nodes = [n for n in branch if n.tag == "Node"]
            next(c for c in nodes[1] if c.tag == "NodeNumber").text = "5"
            bound.write_bytes(ET.tostring(root, encoding="utf-8"))
            witness["boundTestInputSha256"] = hashlib.sha256(bound.read_bytes()).hexdigest()
        self.must_fail("CII_S1_PCOM_ORDINAL_WITNESS_MISSING", alter)

    def test_y2_second_pcom_witness_number_five_refused(self):
        def alter(bound, model, witness):
            root = ET.parse(bound).getroot()
            branch = next(b for b in root.iter() if b.tag == "Branch")
            nodes = [n for n in branch if n.tag == "Node"]
            self.assertEqual(next(c for c in nodes[2] if c.tag == "NodeNumber").text,
                             "-1")
            next(c for c in nodes[2] if c.tag == "NodeNumber").text = "5"
            bound.write_bytes(ET.tostring(root, encoding="utf-8"))
            witness["boundTestInputSha256"] = hashlib.sha256(bound.read_bytes()).hexdigest()
        self.must_fail("CII_S1_PCOM_ORDINAL_WITNESS_MISSING", alter)

    def test_t3_duplicate_pcom_identity_refused(self):
        # This case also becomes a branch-lineage error if the duplicate-ID
        # check is deleted. Marker audit explicitly covers that redundancy.
        def alter(bound, model, witness):
            a, b = witness["checkpoints"][:2]
            b["branch"], b["pcomRef"] = a["branch"], a["pcomRef"]
        self.must_fail("CII_S1_DOUBLE_PHYSICAL_OWNER", alter)

    def test_t3_edge_kind_drift_refused(self):
        def alter(bound, model, witness):
            edge = model.rigid_edges[0]
            model.rigid_edges[0] = replace(
                edge, to_node=replace(edge.to_node, component_type="VALV"))
        self.must_fail("CII_S1_CONNECTION_FLANGE_EDGE_OWNER_AMBIGUOUS",
                       alter, skip_main_audit=True)

    def test_t3_edge_weight_drift_refused(self):
        def alter(bound, model, witness):
            edge = model.rigid_edges[0]
            model.rigid_edges[0] = replace(
                edge, to_node=replace(edge.to_node, weight=999))
        self.must_fail("CII_S1_CONNECTION_FLANGE_EDGE_OWNER_AMBIGUOUS",
                       alter, skip_main_audit=True)

    def test_t3_witness_census_drift_refused(self):
        self.must_fail("CII_S1_TEST_WITNESS_INVALID",
                       lambda b, m, w: w["checkpoints"].pop())

    def test_t3_redundant_pcom_and_edge_census_guards_present(self):
        source = (ROOT / "converters/scripts/xml229_rigid_s1_testonly.py").read_text()
        self.assertIn("pc in pcom_ids", source)
        self.assertIn("len(checked_edges) != 2 * len(checks)", source)
        self.assertIn("pc in pcom_ids", source)


class R2SourceAndReferenceGuards(unittest.TestCase):
    def source_rejected(self, raw, code):
        with self.assertRaisesRegex(binder.NativeMassError, code):
            binder.s1_build_test_only_fixture(raw, s1.MASTER_ROWS)

    def test_t4_source_pcom_renumbered_to_five(self):
        self.source_rejected(
            set_xml_field(derived_source(), 1, "NodeNumber", "5"),
            "S1_SOURCE_14_PCOM_PAIR_CENSUS")

    def test_y1_source_second_pcom_number_five_refused(self):
        raw = derived_source()
        self.source_rejected(
            set_xml_field(raw, 2, "NodeNumber", "5"),
            "S1_SOURCE_14_PCOM_PAIR_CENSUS")

    def test_t4_source_19_5mm_connection_drift(self):
        raw = derived_source()
        root = ET.fromstring(raw)
        branch = next(b for b in root.iter() if b.tag == "Branch")
        nodes = [n for n in branch if n.tag == "Node"]
        position = next(c for c in nodes[3] if c.tag == "Position")
        xyz = position.text.split()
        xyz[2] = str(float(xyz[2]) + 0.4)
        position.text = " ".join(xyz)
        # Translate the tail by the same 0.4mm: flange stays 109mm,
        # isolating the 19.5mm PCOM connection-span guard.
        tail_position = next(c for c in nodes[4] if c.tag == "Position")
        tail_xyz = tail_position.text.split()
        tail_xyz[2] = str(float(tail_xyz[2]) + 0.4)
        tail_position.text = " ".join(tail_xyz)
        self.source_rejected(ET.tostring(root), "S1_R9_CHECKPOINT_GEOMETRY_DRIFT")

    def test_t4_tail_rating_600_material_mismatch(self):
        self.source_rejected(
            set_xml_field(derived_source(), 4, "Rating", "600"),
            "S1_FLANGE_MATERIAL_ID_DRIFT")

    def test_t4_both_flange_tail_rating_600_unexpected(self):
        raw = set_xml_field(derived_source(), 3, "Rating", "600")
        raw = set_xml_field(raw, 4, "Rating", "600")
        self.source_rejected(raw, "S1_CHECKPOINT_UNEXPECTED_BORE_RATING")

    def test_t4_invalid_length_nan_zero_negative_review_null(self):
        for value in (float("nan"), float("inf"), 0, -1):
            with self.subTest(value=value):
                result = binder.s1_rlt10_length_suggestion(
                    value, 50, 900, s1.MASTER_ROWS)
                self.assertEqual(result["status"], "REVIEW")
                self.assertIsNone(result["weightKg"])

    def test_t4_missing_ball_valve_row_review_null(self):
        rows = tuple(r for r in s1.MASTER_ROWS if r["id"] != 974)
        try:
            result = binder.s1_rlt10_length_suggestion(400, 50, 900, rows)
        except (TypeError, ValueError) as error:
            self.fail(f"missing valve reference must return REVIEW/null, not {type(error).__name__}")
        self.assertEqual(result["status"], "REVIEW")
        self.assertIsNone(result["weightKg"])
        self.assertFalse(result["ownerApproved"])

    def test_y4_nan_reference_weight_and_length_review_null(self):
        # Separate exact master-row corruption cases (not unknown input length).
        for field in ("RF/RTJ KG", "length"):
            with self.subTest(master_field=field):
                rows = [dict(r) for r in s1.MASTER_ROWS]
                rows[0][field] = float("nan")
                result = binder.s1_rlt10_length_suggestion(19.1, 50, 900, rows)
                self.assertEqual(result["status"], "REVIEW")
                self.assertIsNone(result["weightKg"])
                self.assertFalse(result["ownerApproved"])

    def test_t4_invalid_reference_defensive_guards_present(self):
        source = (ROOT / "converters/scripts/xml229_native_final_mass_binding.py").read_text()
        self.assertIn("if not math.isfinite(length_mm) or length_mm <= 0:", source)
        self.assertIn("if selected is None:", source)


if __name__ == "__main__":
    unittest.main()
