"""R1 deletion mutation audit: run one exact guard deletion per isolated negative.

These mutants exist ONLY in temporary copies of the source tree. A mutant is
RED only when its designated S1/R1 test assertion fails. Syntax and import
errors are never counted as mutation kills.
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST = "rigid-s1-testonly.test.py"
CUSTODY = "xml_cii_weight_output_custody.py"
S1 = "xml229_rigid_s1_testonly.py"
BINDER = "xml229_native_final_mass_binding.py"

D = "RigidS1ExclusiveCustodyMutants."
M = "RigidS1Rlt10LookupMutants."
MUTANTS = [
    ("whole-S1-guard-call", CUSTODY,
     "        _s1_assert_pcom_release_hold(xml_path, model, s1_test_only_witness)",
     "        pass",
     D+"test_r1_s1b_double_owner_guard_red"),
    ("double-owner", S1,
     "if physical in physical_ids or pc in pcom_ids or physical == pc:",
     "if False:",
     D+"test_r1_s1b_double_owner_guard_red"),
    ("borrow-neighbour-15kg", S1,
     '                p["weightKg"] == 15):',
     '                False):',
     D+"test_r1_s1b_neighbor_15kg_on_connection_red"),
    ("moved-flange-mass", S1,
     '                abs(float(_text(c, "Weight")) - p["weightKg"]) > 1e-8 or\n'
     '                abs(float(_text(d, "Weight")) - 15) > 1e-8 or',
     '                False or\n'
     '                False or',
     D+"test_r1_s1b_mass_moved_flange_to_connection_red"),
    ("missing-witness", S1,
     "if not isinstance(witness, dict):",
     "if False:",
     D+"test_r1_s1b_test_renderer_missing_witness_red_not_normal_conversion"),
    ("owner-approved-true", S1,
     'p.get("ownerApproved") is not False or',
     'False or',
     D+"test_r1_s1b_owner_approved_true_red"),
    ("duplicate-edge", S1,
     "if len(matching_edges) != 1 or key in checked_edges:",
     "if key in checked_edges:",
     D+"test_r1_s1b_duplicate_edge_cannot_steal_owner_red"),
    ("master-DN-match", BINDER,
     'and float(r.get("DN", r.get("bore", 0)) or 0) == dn',
     'and True',
     M+"test_r1_s1d_dn_rating_and_duplicate_master_fail_closed"),
    ("master-rating-match", BINDER,
     'and float(r.get("Rating", r.get("rating", 0)) or 0) == rating',
     'and True',
     M+"test_r1_s1d_dn_rating_and_duplicate_master_fail_closed"),
    ("unique-master-reference", BINDER,
     'if len(candidates) != 1:',
     'if not candidates:',
     M+"test_r1_s1d_dn_rating_and_duplicate_master_fail_closed"),
]


class R1DeletionMutationAudit(unittest.TestCase):
    def test_all_ten_mutants_are_red(self):
        for label, path, before, after, target in MUTANTS:
            with self.subTest(mutant=label):
                with tempfile.TemporaryDirectory(prefix="rigid-s1-mutant-") as d:
                    root = Path(d)
                    scripts = root/"converters"/"scripts"
                    shutil.copytree(ROOT/"converters"/"scripts",scripts,
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    tests = root/"tests"
                    tests.mkdir()
                    shutil.copyfile(ROOT/"tests"/TEST,tests/TEST)
                    file = scripts/path
                    source = file.read_text(encoding="utf-8")
                    self.assertEqual(source.count(before),1,
                        f"{label}: source marker must be unique")
                    file.write_text(source.replace(before,after,1),encoding="utf-8")
                    p=subprocess.run([sys.executable,str(tests/TEST),target,"-v"],
                                     cwd=root,capture_output=True,text=True,timeout=40)
                    output=p.stdout+p.stderr
                    self.assertNotEqual(p.returncode,0,
                        f"surviving deletion mutant {label}: {output[-1400:]}")
                    self.assertNotIn("SyntaxError",output)
                    self.assertNotIn("ImportError",output)
                    self.assertIn("AssertionError",output,
                        f"non-assertion failure is NOT a counted kill: {label} {output[-1400:]}")
                    self.assertIn(target.split(".")[-1],output)
                    print("R1_DELETION_MUTANT_RED",label,target)

if __name__=="__main__":
    unittest.main()
