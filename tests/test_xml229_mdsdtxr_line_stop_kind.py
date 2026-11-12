"""A staged member with no DTXR but MDSDTXR 'LINE STOP ...' is a LINESTOP,
even when the stage labelled it SUPPORT_KIND=REST (synthetic data only).

Owner case (12 Nov): a line stop with shoe (25 mm gap) and a pipe rest (no
gap) at the same position were both read as REST -> false
PREFINAL_RESTRAINT_GAP_AMBIGUOUS.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "converters" / "scripts"))
from xml229_prefinal_restraints import kinds  # noqa: E402


class Refused(Exception):
    pass


def require(ok, code):
    if not ok:
        raise Refused(code)


REST = {"NAME": "/PS-9.3.1", "DTXR": "REST", "SUPPORT_KIND": "REST", "SUPPORT_TYPE": "REST",
        "SUPPORT_MAPPER_KIND": "REST", "MDSSUPPTYPE": "PIPE-REST", "NODEGAP": "0", "NODETYPE": "14"}
LINE_STOP = {"NAME": "/PS-9.1.1", "DTXR": "", "CMPSUPGAP": "25MM GAP", "MDSSUPPTYPE": "ST572",
             "MDSDTXR": "LINE STOP ON BARE PIPE WITH WEAR PAD ( NORMAL AXIAL LOAD )",
             "SUPPORT_KIND": "REST", "SUPPORT_TYPE": "REST", "SUPPORT_MAPPER_KIND": "REST"}


class MdsDtxrLineStopKindTest(unittest.TestCase):
    def test_line_stop_with_rest_label_is_line_stop(self):
        out = kinds([{"attrs": dict(LINE_STOP), "desc": "/MDS-Ancillaries/ANCI/ST572-50mm"}], require)
        self.assertEqual(set(out), {"LINESTOP"})

    def test_rest_and_line_stop_at_one_position_do_not_conflict(self):
        out = kinds([{"attrs": dict(REST), "desc": "REST"},
                     {"attrs": dict(LINE_STOP), "desc": "/MDS-Ancillaries/ANCI/ST572-50mm"}], require)
        self.assertEqual(set(out), {"REST", "LINESTOP"})
        self.assertEqual(out["LINESTOP"]["CMPSUPGAP"], "25MM GAP")

    def test_dtxr_still_wins_over_mdsdtxr(self):
        member = dict(LINE_STOP, DTXR="REST")
        out = kinds([{"attrs": member, "desc": ""}], require)
        self.assertEqual(set(out), {"REST"})

    def test_two_real_rests_with_different_gaps_still_refused(self):
        other = dict(REST, NAME="/PS-9.4.1", NODEGAP="10")
        with self.assertRaises(Refused):
            kinds([{"attrs": dict(REST), "desc": ""}, {"attrs": other, "desc": ""}], require)

    def test_run_path_entry_keeps_mdsdtxr_and_skips_label_backfill(self):
        import xml_to_cii2019_patched as patched
        rest = patched._staged_member_kind_entry(
            {"sourceAttrs": dict(REST), "dtxr": "REST", "sourceType": "ANCI"})
        stop = patched._staged_member_kind_entry(
            {"sourceAttrs": dict(LINE_STOP), "dtxr": "/PS-9.1.1 REST", "sourceType": "ANCI"})
        self.assertEqual(stop["attrs"]["DTXR"], "")
        self.assertEqual(stop["desc"], "")
        out = kinds([rest, stop], require)
        self.assertEqual(set(out), {"REST", "LINESTOP"})

    def test_run_path_without_mdsdtxr_still_backfills_label(self):
        import xml_to_cii2019_patched as patched
        entry = patched._staged_member_kind_entry(
            {"sourceAttrs": {"NAME": "/PS-9.5.1"}, "dtxr": "GUIDE", "sourceType": "ANCI"})
        self.assertEqual(entry["attrs"]["DTXR"], "GUIDE")

    def test_staged_position_whitelist_carries_mdsdtxr(self):
        import inspect
        import xml_to_cii2019_master_addon as addon
        self.assertIn('"MDSDTXR"', inspect.getsource(addon))


if __name__ == "__main__":
    unittest.main()
