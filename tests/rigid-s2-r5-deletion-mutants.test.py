"""S2-R5 isolated synthetic source-guard deletion mutations; nonrelease.

Each mutated source runs an unchanged behavior test in its own sandbox.
Syntax/import failures never qualify as RED.
"""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
TEST='rigid-s2-r5-guards.test.py'
SYNTH='rigid-s2-r2-synthetic.test.py'
BASIS='rigid_s2_r3_synthetic_basis.py'
GEOM='rigid_s2_r3_geometry.py'
MUTANTS=[
 ('Z1-source-custody-conservation',SYNTH,
  "assert (len(expected)==len(set(x[0] for x in expected)) and\n"
  "            len(actual)==len(expected) and\n"
  "            sorted(actual)==sorted(expected) and\n"
  "            math.isclose(sum(x[1] for x in actual),\n"
  "                         sum(x[1] for x in expected),abs_tol=1e-9)), (",
  "assert True, (",
  'test_z1_missing_owner_annotation_fails_source_to_product_bijection'),
 ('Z1-missing-owner-not-held',BASIS,
  'held_locations = [*derived["held"], *missing_owners]',
  'held_locations = [*derived["held"]]',
  'test_z1_short_gaps_demote_unpaired_owner_to_held'),
 ('Z2-duplicate-held-source-id',GEOM,
  'sid not in ids and isinstance(kg, (int, float))',
  'True and isinstance(kg, (int, float))',
  'test_z2_duplicate_held_source_id_rejected_by_real_annotator'),
 ('Z2-owner-branch-filter',BASIS,
  'if source["branch"] != edge.branch_name:',
  'if False:',
  'test_z2_owner_requires_same_branch_not_colocated_decoy'),
 ('Z2-suggestion-branch-filter',BASIS,
  'source["branch"] == edge.branch_name and',
  'True and',
  'test_z2_suggestion_requires_same_branch_not_colocated_decoy'),
 ('Z2-only-flange-promotes-HELD',BASIS,
  'x["kind"]=="FLAN" for x in held_locations',
  'True for x in held_locations',
  'test_z2_only_flange_held_promotes_review_to_held'),
]


class S2R5MutationAudit(unittest.TestCase):
    def test_six_real_z1_z2_guard_deletions_red(self):
        kills=0
        for label,filename,before,after,target in MUTANTS:
            with self.subTest(label=label):
                with tempfile.TemporaryDirectory(prefix='rigid-s2-r5-') as td:
                    root=Path(td)
                    shutil.copytree(ROOT/'converters'/'scripts',
                                    root/'converters'/'scripts',
                                    ignore=shutil.ignore_patterns('__pycache__'))
                    tests=root/'tests';tests.mkdir()
                    for f in (TEST,SYNTH,BASIS,GEOM):
                        shutil.copyfile(ROOT/'tests'/f,tests/f)
                    path=tests/filename
                    code=path.read_text(encoding='utf-8')
                    self.assertEqual(code.count(before),1,
                                     'nonunique mutant anchor: '+label)
                    path.write_text(code.replace(before,after,1),
                                    encoding='utf-8')
                    run=subprocess.run([sys.executable,str(tests/TEST),
                        'S2R5CustodyGuards.'+target,'-v'],
                        cwd=root,capture_output=True,text=True,timeout=90)
                    log=run.stdout+run.stderr
                    self.assertNotEqual(run.returncode,0,
                        f'SURVIVED {label}: {log[-1200:]}')
                    self.assertNotIn('SyntaxError',log,label)
                    self.assertNotIn('ImportError',log,label)
                    self.assertNotIn('ModuleNotFoundError',log,label)
                    self.assertIn('AssertionError',log,
                        f'non-behavioral kill {label}: {log[-1200:]}')
                    self.assertIn(target,log,label)
                    kills+=1
                    print('S2_R5_MUTANT_RED behavior',label,target,flush=True)
        self.assertEqual(kills,6)
        print('S2_R5_Z1_Z2_BEHAVIORAL_KILLS 6/6',flush=True)


if __name__=='__main__':
    unittest.main()
