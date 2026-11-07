"""R1 F1: ordinary PCOM/FLAN XML must emit byte-identical CII as main @3377b7f4.

Never use an S1 packet. This compares the actual production CLI against an
independent subprocess running main's exact production Python module bytes.
CI checks out full git history to permit pinned git show (no network here).
"""
import hashlib
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "3377b7f4baeeee5851e72dcc414d6c4a93f5a933"
PRODUCTION = (
    "xml229_native_final_mass_binding.py",
    "xml_cii_weight_output_custody.py",
    "xml_to_cii2019_runtime_custody.py",
)


def ordinary_pcom_flange_source():
    nodes = (
        (10, "VALV", "PUBLIC/VALVE", 2, "0 0 0", 0, False),
        (-1, "PCOM", "PUBLIC/PCOM", 1, "3.2 0 0", 0, False),
        (-1, "PCOM", "PUBLIC/PCOM", 2, "15.9 0 0", 0, False),
        (20, "FLAN", "PUBLIC/FLANGE", 1, "19.1 0 0", 0, True),
        (30, "RIGID", "PUBLIC/FLANGE", 2, "128.1 0 0", 15, True),
    )
    body = []
    for no, kind, ref, endpoint, xyz, kg, rigid in nodes:
        body.append(
            "<Node>"
            f"<NodeNumber>{no}</NodeNumber>"
            f"<ComponentType>{kind}</ComponentType>"
            f"<ComponentRefNo>{ref}</ComponentRefNo>"
            f"<Endpoint>{endpoint}</Endpoint>"
            f"<Position>{xyz}</Position>"
            "<OutsideDiameter>60.3</OutsideDiameter>"
            "<BoreMm>50</BoreMm><Rating>900</Rating>"
            f"<Weight>{kg}</Weight>"
            + ("<Rigid>2</Rigid>" if rigid else "")
            + "</Node>")
    return ("<PipeStressExport xmlns='http://aveva.com/pipeStress116.xsd'>"
            "<Pipe><Branch><Branchname>/PUBLIC-REGRESSION/B1</Branchname>"
            + "".join(body) + "</Branch></Pipe></PipeStressExport>")


class R1MainPositiveControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_files = {}
        for name in PRODUCTION:
            target = f"converters/scripts/{name}"
            result = subprocess.run(
                ["git", "show", f"{BASE}:{target}"],
                cwd=ROOT, capture_output=True, check=True)
            cls.base_files[name] = result.stdout
        cls._runtime_head = (ROOT/"converters/scripts"/PRODUCTION[-1]).read_bytes()

    def _run(self, script, source, output, *, packet=None):
        command = [sys.executable, str(script),
                   "--input", str(source), "--output", str(output),
                   "--weight-scale", "10"]
        if packet:
            command += ["--xml229-native-final-packet", str(packet)]
        return subprocess.run(command, cwd=ROOT, capture_output=True,
                              text=True, timeout=45)

    def _main_runner(self, path):
        base_folder = path/"main"/"converters"/"scripts"
        shutil.copytree(ROOT/"converters"/"scripts", base_folder)
        for name, data in self.base_files.items():
            (base_folder/name).write_bytes(data)
        return base_folder/"xml_to_cii2019_runtime_custody.py"

    def test_f1_ordinary_pcom_flange_bytes_identical_to_main(self):
        with tempfile.TemporaryDirectory() as td:
            directory = Path(td)
            source = directory/"ordinary.xml"
            source.write_text(ordinary_pcom_flange_source(), encoding="utf-8")
            base_runner = self._main_runner(directory)
            head_runner = ROOT/"converters/scripts/xml_to_cii2019_runtime_custody.py"
            baseline = directory/"main.cii"
            candidate = directory/"head.cii"
            a = self._run(base_runner, source, baseline)
            b = self._run(head_runner, source, candidate)
            self.assertEqual(a.returncode, 0, a.stdout + a.stderr)
            self.assertEqual(b.returncode, 0, b.stdout + b.stderr)
            expected = baseline.read_bytes()
            self.assertEqual(candidate.read_bytes(), expected,
                "R1 F1: ordinary PCOM/FLAN CII must equal pinned main bytes")
            self.assertIn(b"#$ RIGID", expected)
            print("R1_F1_ORDINARY_MAIN_EQ_HEAD=YES",
                  "sha256="+hashlib.sha256(expected).hexdigest(),
                  "bytes="+str(len(expected)))

    def test_f1_existing_main_runtime_and_lineage_error_precedence_retained(self):
        self.assertEqual(self._runtime_head,
                         self.base_files["xml_to_cii2019_runtime_custody.py"])
        binder = (ROOT/"converters/scripts"/PRODUCTION[0]).read_bytes()
        self.assertTrue(binder.startswith(
            self.base_files["xml229_native_final_mass_binding.py"].rstrip()))
        with tempfile.TemporaryDirectory() as td:
            p = Path(td)
            source = p/"ordinary.xml"
            source.write_text(ordinary_pcom_flange_source())
            invalid = p/"invalid-packet.json"
            invalid.write_text('{"schema":"XML229.NativeFinalPhysicalPacket.v1"}')
            a = self._run(self._main_runner(p), source, p/"main.cii",
                          packet=invalid)
            b = self._run(
                ROOT/"converters/scripts/xml_to_cii2019_runtime_custody.py",
                source, p/"head.cii", packet=invalid)
            self.assertNotEqual(a.returncode, 0)
            self.assertNotEqual(b.returncode, 0)
            errors = lambda s: re.findall(r"(?:NATIVE|ORIGINAL)_[A-Z0-9_]+",s)
            base_codes = errors(a.stdout+a.stderr)
            head_codes = errors(b.stdout+b.stderr)
            self.assertTrue(base_codes, a.stdout+a.stderr)
            self.assertEqual(head_codes,base_codes)
            print("R1_F1_NATIVE_ERROR_CODES_MAIN_EQ_HEAD=YES",
                  ",".join(base_codes))


if __name__ == "__main__":
    unittest.main()
