"""S2-R3: seven isolated behavior mutants of public synthetic-source rules.

Each clean test is GREEN. Mutating the named geometric / master guard in a
temporary copy forces the target behavior to fail (RED). No Owner data.
"""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
SYNTH="rigid-s2-r2-synthetic.test.py"
BASIS="rigid_s2_r3_synthetic_basis.py"
GEOMETRY="rigid_s2_r3_geometry.py"

# Reviewer ID, file, unique before, after, behavior test.
MUTANTS=[
 ("X1-merge-accepts-all-lengths",GEOMETRY,
  "3.0 <= length_gap <= 3.4", "0.0 <= length_gap <= 1000.0",
  "test_q4_three_merge_window_points"),
 ("X2-tail-preference-swapped",GEOMETRY,
  "return min(matches)[1]", "return max(matches)[1]",
  "test_q3_tail_has_priority_over_head"),
 ("X3-head-fallback-removed",GEOMETRY,
  "elif head <= tolerance_mm:", "elif False:",
  "test_q3_head_fallback_accepted"),
 ("X6-valve-known-master-zero",BASIS,
  '"RF/RTJ KG": 365', '"RF/RTJ KG": 0',
  "test_q1_valve_held_known_mass"),
 ("X7-length-40-forced-to-19",BASIS,
  "s1_rlt10_length_suggestion(length, dn, rating, rows)",
  "s1_rlt10_length_suggestion(19.1, dn, rating, rows)",
  "test_q1_length_40_has_different_suggestion"),
 ("X8-valve-is-TEE",BASIS,
  'kind[1] == "VALV"', 'kind[1] == "TEE"',
  "test_q1_valve_type_tee_rejected"),
 ("X9-any-review-pointer",GEOMETRY,
  "if tail <= tolerance_mm:", "if True:",
  "test_q3_not_any_review_pointer_in_branch"),
]


class S2R3MutationAudit(unittest.TestCase):
    def test_seven_public_reviewer_mutants_red(self):
        killed=0
        for label,filename,before,after,target in MUTANTS:
            with self.subTest(label=label):
                with tempfile.TemporaryDirectory(prefix="rigid-s2-r3-") as td:
                    root=Path(td)
                    shutil.copytree(ROOT/"converters"/"scripts",
                                    root/"converters"/"scripts",
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    tests=root/"tests"
                    tests.mkdir()
                    for src in (SYNTH,BASIS,GEOMETRY):
                        shutil.copyfile(ROOT/"tests"/src, tests/src)
                    path=tests/filename
                    code=path.read_text(encoding="utf-8")
                    self.assertEqual(code.count(before),1,
                                     "non-unique guard: "+label)
                    path.write_text(code.replace(before,after,1),
                                    encoding="utf-8")
                    run=subprocess.run(
                        [sys.executable,str(tests/SYNTH),
                         "SyntheticNativeProofTests."+target,"-v"],
                        cwd=root,capture_output=True,text=True,timeout=90)
                    output=run.stdout+run.stderr
                    self.assertNotEqual(run.returncode,0,
                        "SURVIVED "+label+" "+output[-1400:])
                    self.assertNotIn("SyntaxError",output,label)
                    self.assertNotIn("ImportError",output,label)
                    self.assertNotIn("ModuleNotFoundError",output,label)
                    self.assertIn("AssertionError",output,
                        "non-behavioral failure "+label+" "+output[-1400:])
                    self.assertIn(target,output,label)
                    killed+=1
                    print("S2_R3_MUTANT_RED behavior",label,target,flush=True)
        self.assertEqual(killed,7)
        print("S2_R3_DELETE_ONE_BEHAVIOR_KILLS",killed,flush=True)


if __name__=="__main__":
    unittest.main()
