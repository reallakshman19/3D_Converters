"""Source-only BM2 support witness census for the old-state authority comparison.

No interpreted type/axis is asserted here: NODETYPE and abbreviated GT/ST
must be reconciled against semantic evidence before an automatic repair.
"""
from pathlib import Path
from zipfile import ZipFile
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
STAGED = ROOT / "Benchmarks/STF_2026Sep16-0859_managed_stage.zip"
MEMBER = "STF_2026Sep16-0859_managed_stage.json"


class Bm2SupportSourceWitness(unittest.TestCase):
    def test_original_gt_st_and_gap_provenance(self):
        with ZipFile(STAGED) as archive:
            source = json.loads(archive.read(MEMBER))
        supports = [(branch.get("name"), child)
                    for branch in source if isinstance(branch, dict)
                    for child in branch.get("children", [])
                    if child.get("type") == "SUPPORT"]
        self.assertEqual(len(supports), 87)
        code_rows = {}
        for branch, component in supports:
            attrs = component.get("attributes") or {}
            code = attrs.get("MDSSUPPTYPE")
            if code in ("GT571", "ST572"):
                self.assertNotIn(code, code_rows, "duplicate unique witness")
                code_rows[code] = {
                    "branch": branch,
                    "name": component.get("name"),
                    "DTXR": attrs.get("DTXR"),
                    "SPRE": attrs.get("SPRE"),
                    "SUPPORT_KIND": attrs.get("SUPPORT_KIND"),
                    "SUPPORT_MAPPER_KIND": attrs.get("SUPPORT_MAPPER_KIND"),
                    "SUPPORT_TYPE": attrs.get("SUPPORT_TYPE"),
                    "MDSSUPPFUNC": attrs.get("MDSSUPPFUNC"),
                    "NODETYPE": attrs.get("NODETYPE"),
                    "NODEGAP": attrs.get("NODEGAP"),
                    "CMPSUPGAP": attrs.get("CMPSUPGAP"),
                }
        self.assertEqual(set(code_rows), {"GT571", "ST572"})
        for row in code_rows.values():
            self.assertEqual(str(row["NODEGAP"]), "0")
            self.assertEqual(str(row["NODETYPE"]), "14")
            self.assertIsNone(row["CMPSUPGAP"])
        print("BM2_GTST_SOURCE_WITNESS " + json.dumps(code_rows, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
