"""P1-P4 isolated delete-one mutants; only assertion failures count as RED."""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SYNTH="rigid-s2-r2-synthetic.test.py"
GUARD="rigid-s2-r2-owner-leak-guard.test.py"

# target file, source clause, source mutation, test class.method
MUTANTS=[
 ("P1-unapproved-connection-label","rigid_s2_r3_synthetic_basis.py",
  'return source["status"],source["weightKg"],None',
  'return "OWNED",source["weightKg"],None',
  "SyntheticNativeProofTests.test_p1_synthetic_fixture_covers_all_six_rules"),
 ("P2-owner-leak-content-guard",GUARD,
  "if marker not in data:", "if True:",
  "OwnerSourceContentGuards.test_p2_readded_owner_branch_marker_rejected"),
 ("P3-held-CII-force-guard","rigid_s2_r3_synthetic_basis.py",
  'if kg is not None else force==0.0',
  'if kg is not None else True',
  "SyntheticNativeProofTests.test_p3_held_source_force_tamper_must_be_rejected"),
 ("P4-canonical-junction-3p2mm",SYNTH,
  'def synthetic_xml(short_gap=3.2, span_mm=19.1, valve_type="VALV"):',
  'def synthetic_xml(short_gap=9.2, span_mm=19.1, valve_type="VALV"):',
  "SyntheticNativeProofTests.test_p1_synthetic_fixture_covers_all_six_rules"),
]


class S2R2MutationAudit(unittest.TestCase):
    def test_four_behavioral_p1_to_p4_mutants_red(self):
        killed=0
        for label,filename,before,after,target in MUTANTS:
            with self.subTest(mutant=label):
                with tempfile.TemporaryDirectory(prefix="s2-r2-deleteone-") as td:
                    root=Path(td)
                    scripts=root/"converters"/"scripts"
                    shutil.copytree(ROOT/"converters"/"scripts",scripts,
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    tests=root/"tests";tests.mkdir()
                    for source in (SYNTH,GUARD,"rigid_s2_r3_synthetic_basis.py",
                                   "rigid_s2_r3_geometry.py"):
                        shutil.copyfile(ROOT/"tests"/source,tests/source)
                    path=tests/filename
                    content=path.read_text(encoding="utf-8")
                    self.assertEqual(content.count(before),1,
                                     f"unique mutation marker required: {label}")
                    path.write_text(content.replace(before,after,1),encoding="utf-8")
                    run=subprocess.run(
                        [sys.executable,str(tests/(GUARD if filename==GUARD else SYNTH)),
                         target,"-v"],
                        cwd=root,text=True,capture_output=True,timeout=75)
                    log=run.stdout+run.stderr
                    self.assertNotEqual(run.returncode,0,
                        f"MUTANT SURVIVED {label}: {log[-1200:]}")
                    self.assertIn("AssertionError",log,
                        f"non-behavioral mutation kill forbidden: {label}: {log[-900:]}")
                    self.assertNotIn("SyntaxError",log,label)
                    self.assertNotIn("ImportError",log,label)
                    self.assertNotIn("ModuleNotFoundError",log,label)
                    self.assertIn(target.split(".")[-1],log)
                    killed+=1
                    print("S2_R2_MUTANT_RED behavior",label,target,flush=True)
        self.assertEqual(killed,len(MUTANTS))
        print("S2_R2_DELETE_ONE_BEHAVIOR_KILLS",killed,flush=True)


if __name__=="__main__":
    unittest.main()
