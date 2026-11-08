"""S2-R1 isolated deletion mutants: real R9-derived native parser/sidecar guards.

Each mutant deletes one effective TEST-only check and reruns a specific
behavioral test in an isolated copy. Import and syntax crashes do not count.
"""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE="rigid-s2-r1-native-proof.test.py"
TARGET="S2R1NativeR9Tests."
MUTANTS=[["D1-individual-source-kg","must(source[\"knownMassKg\"]==kg and","must(True or source[\"knownMassKg\"]==kg and","test_d1_sum_preserving_per_component_kg_swap_rejected"],["D2-owned-source-geometry","must(e[\"sourceGeometryClass\"]==\"OWNED\" and","must(True or e[\"sourceGeometryClass\"]==\"OWNED\" and","test_d2_e9_59kg_moved_to_valve_span_e4_rejected"],["D3-suggested-owner-ref","must(e[\"ownerSourceId\"] is None and e[\"ownerElementId\"] is None and","must(True and e[\"ownerElementId\"] is None and","test_d3_suggested_e65_borrows_e66_owner_refused"],["D4-review-owner-ref","e[\"status\"] in (\"REVIEW\",\"HELD\") and\n                 e[\"ownerSourceId\"] is None and e[\"ownerElementId\"] is None and","e[\"status\"] in (\"REVIEW\",\"HELD\") and\n                 True and e[\"ownerElementId\"] is None and","test_d4_review_e4_borrows_e9_owner_refused"],["D5-R9-length","math.isclose(math.dist(pa,pz),e[\"lengthMm\"],abs_tol=.01) and","True and","test_d5_e9_length_147_to_999_rejected"],["N1-product-143-census","len(model.rigid_edges)==143 and","True and","test_n1_corrupted_model_143_census_refused"],["N2-zero-status-sidecar","must(p[\"status\"] in (\"REVIEW\",\"HELD\") and p[\"weightKg\"] is None,","must(True,","test_n2_zero_force_labeled_owned_is_rejected"],["N2-release-block","sidecar[\"releaseBlocked\"] is True,","True,","test_n2_sidecar_release_authorization_is_rejected"],["N2-CII-sidecar-SHA","must(sidecar[\"ciiSha256\"]==hashlib.sha256(cii.encode(\"utf-8\")).hexdigest(),","must(True,","test_n2_sidecar_sha_corruption_is_rejected"],["N3-DN100-coordinate-match","must(candidates==[\"E403\"] and","must(True or candidates==[\"E403\"] and","test_n3_dn100_position_match_must_stay_held_named_e403"]]

class S2R1DeleteOneAudit(unittest.TestCase):
    def test_ten_independent_source_deletions_fail_behaviourally(self):
        count=0
        for label,before,after,method in MUTANTS:
            with self.subTest(mutant=label):
                with tempfile.TemporaryDirectory(prefix="s2-r1-delete-") as d:
                    root=Path(d)
                    scripts=root/"converters"/"scripts"
                    shutil.copytree(ROOT/"converters"/"scripts",scripts,
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    tests=root/"tests"
                    (tests/"fixtures").mkdir(parents=True)
                    shutil.copyfile(ROOT/"tests"/SOURCE,tests/SOURCE)
                    for fixture in ("rigid-s2-r9-ledger.json",
                                    "rigid-s2-r1-derived-native-geometry.xml"):
                        shutil.copyfile(ROOT/"tests"/"fixtures"/fixture,
                                        tests/"fixtures"/fixture)
                    path=tests/SOURCE
                    code=path.read_text(encoding="utf-8")
                    self.assertEqual(code.count(before),1,label)
                    path.write_text(code.replace(before,after,1),encoding="utf-8")
                    run=subprocess.run([sys.executable,str(path),TARGET+method,"-v"],
                                       cwd=root,capture_output=True,text=True,timeout=90)
                    log=run.stdout+run.stderr
                    self.assertNotEqual(run.returncode,0,
                                        f"SURVIVED {label}: {log[-900:]}")
                    self.assertNotIn("SyntaxError",log,label)
                    self.assertNotIn("ModuleNotFoundError",log,label)
                    self.assertNotIn("ImportError",log,label)
                    self.assertIn("AssertionError",log,
                                  f"not a behavioural kill: {label}: {log[-1300:]}")
                    self.assertIn(method,log,label)
                    count+=1
                    print("S2_R1_MUTANT_RED behavior",label,method,flush=True)
        self.assertEqual(count,10)
        print("S2_R1_DELETE_ONE_BEHAVIOR_KILLS",count,flush=True)

if __name__=="__main__":
    unittest.main()
