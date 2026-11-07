"""R2/R3 delete-one mutation audit.

Each source deletion executes its designated *passing* R2 test in an isolated
copy. Only assertion failures count. Structural kills for redundant source-presence clauses are reported separately
from assertion-based behavioral kills. The four R3 mutants are behavioral.
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST = "rigid-s1-r2-guards.test.py"
FIXTURE = "rigid-s1-testonly.test.py"
S1 = "xml229_rigid_s1_testonly.py"
BINDER = "xml229_native_final_mass_binding.py"
BYTE = "R2ActualCiiByteGuards."
WITNESS = "R2ExplicitWitnessGuards."
SOURCE = "R2SourceAndReferenceGuards."

# label, script, UNIQUE source substring, replacement, targeted test, proof class
MUTANTS = [
    ("T1-flange-150", S1,
     "                f_n != 150):", "                False):",
     BYTE + "test_t1_flange_149_refused_independent_flange_clause", "behavior"),
    ("T1-suggested-match", S1,
     'not math.isclose(c_n, check["weightKg"] * 10, abs_tol=1e-6) or',
     "False or", BYTE + "test_t1_suggested_force_27_refused", "behavior"),
    ("T1-rigid-slot-mismatch", S1,
     "if pointer_slots[pointer - 1][0] != i:", "if False:",
     BYTE + "test_t1_mismatched_slot_index_refused", "behavior"),
    ("T1-span-150-overlap", S1,
     "c_n == 150 or", "False or",
     BYTE + "test_t1_used_and_equal_force_guards_present", "structural"),
    ("T1-equal-force-overlap", S1,
     "c_n == f_n or", "False or",
     BYTE + "test_t1_used_and_equal_force_guards_present", "structural"),
    ("T1-used-index-overlap", S1,
     "c_idx in used or", "False or",
     BYTE + "test_t1_used_and_equal_force_guards_present", "structural"),
    ("T1-population-overlap", S1,
     "len(checkpoints) != 14", "False",
     BYTE + "test_t1_used_and_equal_force_guards_present", "structural"),
    ("T2-owner-approval", S1,
     'p.get("ownerApproved") is not False\n                for p in receipt.get("checkpoints", []))',
     'False\n                for p in receipt.get("checkpoints", []))',
     BYTE + "test_t2_owner_approved_true_blocked", "behavior"),
    ("T2-REVIEW-nonSUGGESTED", S1,
     'any(p.get("status") != "SUGGESTED"\n                for p in receipt.get("checkpoints", []))',
     'any(False for p in receipt.get("checkpoints", []))',
     BYTE + "test_t2_review_not_suggested_blocked", "behavior"),
    ("T2-schema", S1,
     'receipt.get("schema") != "RigidS1.NonReleasePcomFlangeWitness.v1" or',
     'False or', BYTE + "test_t2_wrong_schema_blocked", "behavior"),
    ("T3-bound-XML-hash", S1,
     'witness.get("boundTestInputSha256") !=\n            hashlib.sha256(Path(xml_path).read_bytes()).hexdigest()',
     "False", WITNESS + "test_t3_witness_bound_to_different_xml_refused", "behavior"),
    ("T3-witness-release-flag", S1,
     'witness.get("nativeCiiReleaseAuthorized") is not False or',
     'False or', WITNESS + "test_t3_release_flag_true_refused", "behavior"),
    ("T3-wrong-status", S1,
     'p.get("status") != "SUGGESTED" or',
     'False or', WITNESS + "test_t3_wrong_status_refused", "behavior"),
    ("T3-pcom-minus1", S1,
     'and _text(a, "NodeNumber") == "-1" and',
     'and True and', WITNESS + "test_t3_pcom_node_number_five_refused", "behavior"),
    ("T3-pcom-set-overlap", S1,
     'pc in pcom_ids or', 'False or',
     WITNESS + "test_t3_duplicate_pcom_identity_refused", "behavior"),
    ("T3-edge-kind", S1,
     'e.to_node.component_type == kind and',
     'True and', WITNESS + "test_t3_edge_kind_drift_refused", "behavior"),
    ("T3-edge-weight", S1,
     'abs(e.to_node.weight - kg) <= 1e-8]',
     'True]', WITNESS + "test_t3_edge_weight_drift_refused", "behavior"),
    ("T3-checkpoint-census", S1,
     'len(checks) != len(target) or', 'False or',
     WITNESS + "test_t3_witness_census_drift_refused", "behavior"),
    ("T3-checked-edge-census-overlap", S1,
     'len(checked_edges) != 2 * len(checks)',
     'False',
     WITNESS + "test_t3_redundant_pcom_and_edge_census_guards_present", "structural"),
    ("T4-source-pcom-minus1", BINDER,
     'if (txt(pc1, "NodeNumber") != "-1" or',
     'if (False or',
     SOURCE + "test_t4_source_pcom_renumbered_to_five", "behavior"),
    ("T4-source-19.5mm", BINDER,
     'require(abs(distance - 19.1) <= 0.03 and',
     'require(True and',
     SOURCE + "test_t4_source_19_5mm_connection_drift", "behavior"),
    ("T4-source-rating-drift", BINDER,
     'txt(flange, "Rating") == txt(tail, "Rating"),',
     'True,',
     SOURCE + "test_t4_tail_rating_600_material_mismatch", "behavior"),
    ("T4-unexpected-rating", BINDER,
     'require(pair["dn"] == 50 and pair["rating"] == 900,',
     'require(True,',
     SOURCE + "test_t4_both_flange_tail_rating_600_unexpected", "behavior"),
    ("T4-nonfinite-length", BINDER,
     'if not math.isfinite(length_mm) or length_mm <= 0:',
     'if False:',
     SOURCE + "test_t4_invalid_length_nan_zero_negative_review_null", "behavior"),
    ("T4-missing-ball-row", BINDER,
     'if selected is None:', 'if False:',
     SOURCE + "test_t4_missing_ball_valve_row_review_null", "behavior"),
    ("Y1-second-source-PCOM-minus1", BINDER,
     'txt(pc2, "NodeNumber") != "-1" or',
     'False or',
     SOURCE + "test_y1_source_second_pcom_number_five_refused", "behavior"),
    ("Y2-second-witness-PCOM-minus1", S1,
     '_text(b, "NodeNumber") == "-1" and',
     'True and',
     WITNESS + "test_y2_second_pcom_witness_number_five_refused", "behavior"),
    ("Y3-extra-unclaimed-CII-element", S1,
     'len(elements) != 28 or', 'False or',
     BYTE + "test_y3_29th_nonrigid_element_population_refused", "behavior"),
    ("Y4-reference-row-finite-positive", BINDER,
     'if not all(math.isfinite(x) and x > 0 for x in (L, W)):',
     'if False:',
     SOURCE + "test_y4_nan_reference_weight_and_length_review_null", "behavior"),
]


class R2DeletionMutationAudit(unittest.TestCase):
    def test_all_r2_delete_one_mutants_red(self):
        results = {"behavior": 0, "structural": 0}
        for label, filename, before, after, target, kind in MUTANTS:
            with self.subTest(mutant=label):
                with tempfile.TemporaryDirectory(prefix="rigid-s1-r2-mutant-") as tmp:
                    root = Path(tmp)
                    scripts = root / "converters" / "scripts"
                    shutil.copytree(ROOT / "converters" / "scripts", scripts,
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    tests = root / "tests"
                    tests.mkdir()
                    for file in (TEST, FIXTURE):
                        shutil.copyfile(ROOT / "tests" / file, tests / file)
                    path = scripts / filename
                    code = path.read_text(encoding="utf-8")
                    self.assertEqual(code.count(before), 1,
                                     f"source marker must be unique: {label}")
                    path.write_text(code.replace(before, after, 1), encoding="utf-8")
                    p = subprocess.run(
                        [sys.executable, str(tests / TEST), target, "-v"],
                        cwd=root, capture_output=True, text=True, timeout=65)
                    output = p.stdout + p.stderr
                    self.assertNotEqual(p.returncode, 0,
                        f"surviving mutant {label}: {output[-1200:]}")
                    self.assertNotIn("SyntaxError", output, label)
                    self.assertNotIn("ImportError", output, label)
                    self.assertNotIn("ModuleNotFoundError", output, label)
                    self.assertIn("AssertionError", output,
                        f"runtime errors are NOT kills: {label}: {output[-1500:]}")
                    self.assertIn(target.split(".")[-1], output)
                    results[kind] += 1
                    print("R2_MUTANT_RED", kind, label, target, flush=True)
        print("R2_DELETE_ONE_KILLS", results, "TOTAL", sum(results.values()),
              flush=True)


if __name__ == "__main__":
    unittest.main()
