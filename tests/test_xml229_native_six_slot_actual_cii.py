"""Actual native XML -> CII serializer contract for 1..6 REST/GUI/LIM slots.

This verifies the existing native serialization capability, NOT that the new
JSON physical-vertex projection is wired into governed Final yet.
"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WRITER = ROOT / "converters/scripts/xml_to_cii2019.py"


def xml_input(count=6):
    specifications = (
        ("+Y", "0"),
        ("GUI", "5"),
        ("LIM", "8"),
        ("+Y", "2"),
        ("GUI", "4"),
        ("LIM", "6"),
        ("GUI", "7"),
    )
    members = "".join(
        "<Restraint>"
        f"<Type>{kind}</Type><Gap>{gap}</Gap>"
        "<Stiffness>1000000000000</Stiffness><Friction>0.25</Friction>"
        "</Restraint>"
        for kind, gap in specifications[:count]
    )
    return (
        "<PipeStressExport><Pipe><Branch><Branchname>/SIX-SLOT/B1</Branchname>"
        "<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>"
        "<Position>0 0 0</Position><OutsideDiameter>50</OutsideDiameter>"
        "<WallThickness>3</WallThickness></Node>"
        "<Node><NodeNumber>20</NodeNumber><NodeName>SIX-SLOT</NodeName>"
        "<ComponentType>PIPE</ComponentType><Position>100 0 0</Position>"
        "<OutsideDiameter>50</OutsideDiameter><WallThickness>3</WallThickness>"
        f"{members}</Node></Branch></Pipe></PipeStressExport>"
    )


def invoke_native(count):
    with tempfile.TemporaryDirectory(prefix="xml229-six-slot-native-") as directory:
        inp = Path(directory) / "source.xml"
        out = Path(directory) / "actual.cii"
        inp.write_text(xml_input(count), encoding="utf-8")
        result = subprocess.run(
            [sys.executable, str(WRITER), "--input", str(inp), "--output", str(out)],
            capture_output=True, text=True, timeout=35, cwd=ROOT,
        )
        return result, out.read_text(encoding="utf-8") if out.exists() else None


class NativeSixSlotActualCii(unittest.TestCase):
    def test_actual_cii_writer_serializes_all_six_slots_on_one_node(self):
        result, cii = invoke_native(6)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("#$ RESTRANT\n", cii)
        payload = cii.split("#$ RESTRANT\n", 1)[1].split("#$ DISPLMNT\n", 1)[0]
        rows = [r for r in payload.splitlines() if r]
        self.assertEqual(len(rows), 24, "6 supported slots, 4 CII rows each")
        actual = []
        for i in range(6):
            spec_line = rows[4 * i]
            actual.append((
                int(float(spec_line[:15])),
                int(float(spec_line[15:28])),
                float(spec_line[41:54]),
            ))
        self.assertEqual(
            actual,
            [(20, 14, 0), (20, 8, 5), (20, 9, 8),
             (20, 14, 2), (20, 8, 4), (20, 9, 6)],
        )
        self.assertIn("#$ ELEMENTS\n", cii)

    def test_native_rejects_seven_slots_without_emitting_wrong_cii(self):
        result, cii = invoke_native(7)
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(cii)
        self.assertIn("Only 6 Restraint entries per node", result.stderr)


if __name__ == "__main__":
    unittest.main()
