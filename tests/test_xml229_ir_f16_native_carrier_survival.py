"""F16 native Final admission: a removed source restraint carrier is HOLD.

Direct tests of the same guard invoked after independent Python pre-Final
replay and before Final's original-source-ordinal deletion. These tests do
not certify an emitted CII or any private Owner production XML.
"""
from pathlib import Path
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "converters" / "scripts"))
from xml229_native_final_mass_binding import (
    assert_v2_retained_source_restraint_carriers, NativeMassError,
)

def node(number, gap=None):
    restraint = (f"<Restraint><Type>GUI</Type><Gap>{gap}</Gap>"
                 f"<Stiffness>123456</Stiffness></Restraint>"
                 if gap is not None else "")
    return (f"<Node><NodeNumber>{number}</NodeNumber>"
            f"<Position>100 0 0</Position><ComponentType>ATTA</ComponentType>"
            f"{restraint}</Node>")

def source(*rows):
    return ET.fromstring("<PipeStressExport><Pipe><Branch>"
                         "<Branchname>/CASE/B1</Branchname>" +
                         "".join(rows) +
                         "</Branch></Pipe></PipeStressExport>")

class NativeCarrierSurvivalTest(unittest.TestCase):
    def test_F16_refuses_drop_of_restraint_bearing_source_occurrence(self):
        root = source(node("-1", "5"), node("-1"))
        with self.assertRaises(NativeMassError) as ctx:
            assert_v2_retained_source_restraint_carriers(root, [[1]])
        self.assertEqual(ctx.exception.code,
                         "NATIVE_V2_RESTRAINT_CARRIER_REMOVED_BY_CLEANUP")

    def test_F16_accepts_retained_carrier_and_unrestrained_drop(self):
        root = source(node("-1"), node("-1", "5"))
        assert_v2_retained_source_restraint_carriers(root, [[1]])

    def test_F16_refuses_one_of_two_separate_members_being_lost(self):
        root = source(node("-1", "5"), node("-1", "8"))
        with self.assertRaisesRegex(NativeMassError,
                                    "NATIVE_V2_RESTRAINT_CARRIER_REMOVED_BY_CLEANUP"):
            assert_v2_retained_source_restraint_carriers(root, [[1]])

    def test_F16_retains_same_node_without_any_cleanup(self):
        root = source(node("-1", "5"), node("-1", "8"))
        assert_v2_retained_source_restraint_carriers(root, [[0, 1]])

    def test_F16_rejects_missing_or_invalid_retention_census(self):
        root = source(node("-1", "5"))
        for retained in (None, [], [None]):
            with self.subTest(retained=retained):
                with self.assertRaises(NativeMassError):
                    assert_v2_retained_source_restraint_carriers(root, retained)

if __name__ == "__main__":
    unittest.main()
