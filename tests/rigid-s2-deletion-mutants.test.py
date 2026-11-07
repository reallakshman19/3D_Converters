"""S2 isolated delete-one audit: all kills are behavioral assertion failures.

A production source is never edited. Each mutant replaces exactly one TEST-ONLY
S2 guard and runs one corresponding public derived-R9 behavior test in a
temporary copy, with the native writer and R9-projection fixture unchanged.
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "rigid-s2-owner-budget.test.py"
CLASS = "S2BudgetTests."

# Label, exact unique source clause, deletion, protected behavioral test.
MUTANTS = [
    ("M1-element-identity",
     'len({e["elementId"] for e in elements}) == 144,', 'True,',
     "test_m1_duplicate_element_id_refused"),
    ("M1-source-known-mass-conservation",
     'assigned == 894 and heldkg == 976 and assigned + heldkg == 1870,',
     'True,', "test_m1_known_mass_sum_mutant_refused"),
    ("M1-source-one-owner",
     'len(set(owner_ids)) == 50,', 'True,',
     "test_m1_double_owner_mutant_refused"),
    ("M1-unknown-not-zero",
     'all(s["knownMassKg"] is None for s in unknown),', 'True,',
     "test_m1_unknown_is_null_mutant_refused"),
    ("M1-held-no-assignment",
     'all(s["ownerElementId"] is None for s in held) and', 'True and',
     "test_m1_held_must_carry_no_mass_mutant_refused"),
    ("M3-held-named-geometry-reason",
     's["holdReason"] in (', 'True or s["holdReason"] in (',
     "test_m3_each_held_component_requires_geometry_reason"),
    ("M3-held-no-complete-owner-edge",
     'e["nodePair"] == [int(nums[0]), int(nums[-1])]', 'False',
     "test_m3_held_never_has_a_complete_owner_edge"),
    ("M1-unresolved-null-not-zero",
     'all(e["weightKg"] is None and e["ownerElementId"] is None',
     'all(True',
     "test_m1_unresolved_element_not_zero"),
    ("M1-owned-ref-provenance",
     's["sourceId"] == e["ownerSourceId"] and', 'True and',
     "test_m1_owned_source_provenance"),
    ("M1-suggested-not-owner",
     'e["ownerElementId"] is None and e["weightKg"] == 2.63',
     'True and e["weightKg"] == 2.63',
     "test_m1_suggested_is_not_owned"),
    ("M2-actual-pointer",
     'require((int(float(fr)), int(float(to))) == tuple(e["nodePair"]) and\n'
     '                pointer == idx + 1 and (pointer - 1) in slots and\n'
     '                slots[pointer - 1][0] == idx,\n'
     '                "S2_CII_POINTER_OWNER_DRIFT")',
     'require(True, "S2_CII_POINTER_OWNER_DRIFT")',
     "test_m2_actual_pointer_swap_between_review_edges_refused"),
    ("M2-actual-owned-force",
     'math.isclose(force, 10 * e["weightKg"],\n'
     '                                 abs_tol=1e-6, rel_tol=1e-9),',
     'True,', "test_m2_actual_owned_force_tamper_refused"),
    ("M2-unclaimed-force",
     'require(force == 0.0, "S2_CII_UNALLOCATED_FORCE")',
     'require(True, "S2_CII_UNALLOCATED_FORCE")',
     "test_m2_unclaimed_review_force_tamper_refused"),
    ("M2-release-quarantine",
     'ledger.get("releaseAuthorized") is False and', 'True and',
     "test_m2_test_receipt_cannot_authorize_release"),
]


class S2DeleteOneMutationAudit(unittest.TestCase):
    def test_fourteen_real_s2_source_deletions_red(self):
        count = 0
        for label, before, after, method in MUTANTS:
            with self.subTest(label=label):
                with tempfile.TemporaryDirectory(prefix="rigid-s2-deleteone-") as td:
                    target = Path(td)
                    scripts = target / "converters" / "scripts"
                    shutil.copytree(
                        ROOT / "converters" / "scripts", scripts,
                        ignore=shutil.ignore_patterns("__pycache__"))
                    tests = target / "tests"
                    (tests / "fixtures").mkdir(parents=True)
                    shutil.copyfile(ROOT / "tests" / SOURCE, tests / SOURCE)
                    shutil.copyfile(
                        ROOT / "tests" / "fixtures" / "rigid-s2-r9-ledger.json",
                        tests / "fixtures" / "rigid-s2-r9-ledger.json")
                    code = (tests / SOURCE).read_text(encoding="utf-8")
                    self.assertEqual(code.count(before), 1,
                                     f"non-unique mutation anchor: {label}")
                    (tests / SOURCE).write_text(
                        code.replace(before, after, 1), encoding="utf-8")
                    test = CLASS + method
                    run = subprocess.run(
                        [sys.executable, str(tests / SOURCE), test, "-v"],
                        cwd=target, text=True, capture_output=True, timeout=75)
                    output = run.stdout + run.stderr
                    self.assertNotEqual(run.returncode, 0,
                                        f"MUTANT SURVIVED {label}: {output[-1300:]}")
                    self.assertNotIn("SyntaxError", output, label)
                    self.assertNotIn("ImportError", output, label)
                    self.assertNotIn("ModuleNotFoundError", output, label)
                    self.assertIn("AssertionError", output,
                                  f"not a behavioral kill {label}: {output[-1300:]}")
                    self.assertIn(method, output, label)
                    count += 1
                    print("S2_MUTANT_RED behavior", label, method, flush=True)
        self.assertEqual(count, 14)
        print("S2_DELETE_ONE_BEHAVIOR_KILLS", count, "TOTAL", len(MUTANTS),
              flush=True)


if __name__ == "__main__":
    unittest.main()
