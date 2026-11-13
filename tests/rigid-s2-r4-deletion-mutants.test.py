"""S2-R4 T1/T2/T3 isolated source-deletion behavior audit; no Owner inputs."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
GUARDS='rigid-s2-r4-guards.test.py'
SYNTH='rigid-s2-r2-synthetic.test.py'
BASIS='rigid_s2_r3_synthetic_basis.py'
GEOM='rigid_s2_r3_geometry.py'
MUTANTS=[
 ('T1-PCOM-flange-master-length',BASIS,
  'math.isclose(flange_length, master["lengthMm"],',
  'True or math.isclose(flange_length, master["lengthMm"],',
  'test_t1_pcom_flange_19p1_mm_review_null'),
 ('T1-generic-flange-master-length',BASIS,
  'if master is None or not math.isclose(\n                    length, master["lengthMm"], abs_tol=.01):',
  'if master is None or False:',
  'test_t1_generic_flange_19p1_mm_review_null'),
 ('T2-merge-start-proximity',GEOM,
  'if start_gap <= tolerance_mm and 3.0 <= length_gap <= 3.4:',
  'if True and 3.0 <= length_gap <= 3.4:',
  'test_t2_start_offset_5mm_rejected'),
 ('T2-two-merge-candidates',GEOM,
  'require(len(candidates) == 1,',
  'require(len(candidates) >= 1,',
  'test_t2_two_same_branch_sources_rejected'),
 ('T2-cross-branch-candidate',GEOM,
  'if source["branch"] != edge.branch_name:',
  'if False:',
  'test_t2_cross_branch_colocated_source_rejected'),
 ('T3-HELD-branch',GEOM,
  'if index not in model.edge_to_rigid_index or edge.branch_name != branch:',
  'if index not in model.edge_to_rigid_index or False:',
  'test_t3_cross_branch_held_pointer_decoy'),
 ('T3-HELD-REVIEW-status',GEOM,
  'if sidecar[str(pointer)]["status"] not in ("REVIEW", "HELD"):',
  'if False:',
  'test_t3_owned_status_held_pointer_decoy'),
 ('T3-merge-lower-closed',GEOM,
  '3.0 <= length_gap <= 3.4',
  '3.0 < length_gap <= 3.4',
  'test_t3_both_merge_window_boundaries'),
 ('T3-merge-upper-closed',GEOM,
  '3.0 <= length_gap <= 3.4',
  '3.0 <= length_gap < 3.4',
  'test_t3_both_merge_window_boundaries')
]

class S2R4BehaviorMutationAudit(unittest.TestCase):
    def test_nine_isolated_guard_deletions_are_behaviourally_red(self):
        for label,file,before,after,target in MUTANTS:
            with self.subTest(label=label):
                with tempfile.TemporaryDirectory(prefix='rigid-s2-r4-mutate-') as td:
                    root=Path(td)
                    shutil.copytree(ROOT/'converters'/'scripts',
                                    root/'converters'/'scripts',
                                    ignore=shutil.ignore_patterns('__pycache__'))
                    tests=root/'tests';tests.mkdir()
                    for name in (SYNTH,BASIS,GEOM,GUARDS):
                        shutil.copyfile(ROOT/'tests'/name,tests/name)
                    path=tests/file
                    content=path.read_text(encoding='utf-8')
                    self.assertEqual(content.count(before),1,
                                     'mutation guard unique: '+label)
                    path.write_text(content.replace(before,after,1),encoding='utf-8')
                    run=subprocess.run([sys.executable,str(tests/GUARDS),
                         'S2R4NegativeGuards.'+target,'-v'],
                         cwd=root,text=True,capture_output=True,timeout=75)
                    log=run.stdout+run.stderr
                    self.assertNotEqual(run.returncode,0,
                                        f'MUTANT SURVIVED {label}: {log[-1100:]}')
                    self.assertNotIn('SyntaxError',log,label)
                    self.assertNotIn('ImportError',log,label)
                    self.assertNotIn('ModuleNotFoundError',log,label)
                    self.assertTrue('AssertionError' in log or
                                    'GeometryWitnessError' in log,
                                    f'not behavioral RED {label}: {log[-1100:]}')
                    self.assertIn(target,log,label)
                    print('S2_R4_MUTANT_RED behavior',label,target,flush=True)
        self.assertEqual(len(MUTANTS),9)
        print('S2_R4_DELETE_ONE_BEHAVIOR_KILLS 9/9',flush=True)

if __name__=='__main__':
    unittest.main()
