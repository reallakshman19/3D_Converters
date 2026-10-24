"""Actual docs-served/native CLI execution contract for PR #335 (no private fixtures).

python -m unittest discover -s tests -p test_cii2019_served_path.py -v

The served path must not merely contain a syntactically matching wrapper:
it must be able to import its *own* simplifier + validators, preserve the
default-OFF writer, contract a genuine emitted 6 mm link, and withhold an
invalid noncollinear candidate. This is not a CAESAR II solver qualification.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET


REPO = Path(__file__).resolve().parents[1]
NATIVE = REPO / "converters" / "scripts"
SERVED = REPO / "docs" / "converters" / "scripts"
MIRRORED = (
    "xml_to_cii2019_patched.py",
    "cii2019_short_simplify.py",
    "xml_to_cii2019.py",
    "cii_syntax_check_2019.py",
    "cii2019_section_rules.py",
)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_xml(path: Path, *, turn: bool = False) -> bytes:
    """Three real XML nodes: straight 6+100 mm or noncollinear 3+4 mm."""
    root = ET.Element("PipeStressExport")
    for tag, value in (
        ("DateTime", ""), ("Source", ""), ("Version", ""), ("UserName", ""),
        ("Purpose", ""), ("ProjectName", ""), ("MDBName", ""), ("TitleLine", ""),
        ("RestrainOpenEnds", "No"), ("AmbientTemperature", "20"),
    ):
        ET.SubElement(root, tag).text = value
    pipe = ET.SubElement(root, "Pipe")
    ET.SubElement(pipe, "FullName").text = "/CII_SHORT_TEST"
    ET.SubElement(pipe, "Ref").text = "=TEST"
    branch = ET.SubElement(pipe, "Branch")
    ET.SubElement(branch, "Branchname").text = "LINE1"
    temp = ET.SubElement(branch, "Temperature")
    ET.SubElement(temp, "Temperature1").text = "100"
    pressure = ET.SubElement(branch, "Pressure")
    ET.SubElement(pressure, "Pressure1").text = "5"
    ET.SubElement(branch, "MaterialNumber").text = "1"
    ET.SubElement(branch, "InsulationDensity").text = "0"
    ET.SubElement(branch, "FluidDensity").text = "0"
    pts = [(10, 0, 0), (20, 3, 0), (30, 3, 4)] if turn else [
        (10, 0, 0), (20, 6, 0), (30, 106, 0)
    ]
    for number, x, y in pts:
        node = ET.SubElement(branch, "Node")
        for tag, value in (
            ("NodeNumber", str(number)), ("Endpoint", "1"),
            ("ComponentType", "PIPE"), ("MaterialCode", "1"),
            ("OutsideDiameter", "100"), ("WallThickness", "4"),
            ("Weight", "0"), ("InsulationThickness", "0"),
            ("Position", f"{x} {y} 0"),
        ):
            ET.SubElement(node, tag).text = value
    path.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True))
    return path.read_bytes()


def invoke(directory: Path, source: Path, output: Path, report: Path | None = None):
    command = [
        sys.executable, str(directory / "xml_to_cii2019_patched.py"),
        "--input", str(source), "--output", str(output), "--coords-mode", "none",
    ]
    if report is not None:
        command.extend([
            "--simplify-eligible-short-cii",
            "--short-element-report", str(report),
        ])
    result = subprocess.run(
        command, cwd=REPO, capture_output=True, text=True, timeout=45,
        check=False,
    )
    return result


def count_elements(data: bytes) -> int:
    rows = data.decode("utf-8").splitlines()
    first = rows.index("#$ ELEMENTS") + 1
    last = next((i for i in range(first, len(rows))
                 if rows[i].startswith("#$ ")), len(rows))
    assert (last - first) % 15 == 0
    return (last - first) // 15


class ServedPathContract(unittest.TestCase):
    def test_served_sources_match_native_exact_bytes(self):
        for name in MIRRORED:
            with self.subTest(name=name):
                self.assertEqual(
                    (SERVED / name).read_bytes(),
                    (NATIVE / name).read_bytes(),
                    f"missing or divergent served module: {name}",
                )

    def test_actual_served_wrapper_default_off_is_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            src = d / "original.xml"
            original = source_xml(src)
            outputs = []
            for name, scripts in (("native", NATIVE), ("served", SERVED)):
                with self.subTest(surface=name):
                    output = d / f"{name}-default.cii"
                    result = invoke(scripts, src, output)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                    self.assertTrue(output.is_file())
                    self.assertEqual(count_elements(output.read_bytes()), 2)
                    self.assertFalse((d / "short-element-simplification-report.json").exists())
                    self.assertEqual(src.read_bytes(), original)
                    outputs.append(output.read_bytes())
            self.assertEqual(outputs[0], outputs[1])

    def test_actual_served_wrapper_contracts_real_6mm_element(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            src = d / "original.xml"
            original = source_xml(src)
            candidate_bytes = []
            for name, scripts in (("native", NATIVE), ("served", SERVED)):
                with self.subTest(surface=name):
                    output = d / f"{name}-simplified.cii"
                    report = d / f"{name}-audit.json"
                    result = invoke(scripts, src, output, report)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                    self.assertTrue(output.is_file())
                    self.assertTrue(report.is_file())
                    audit = json.loads(report.read_text(encoding="utf-8"))
                    self.assertEqual(audit["status"], "PASS_SCOPED", audit)
                    self.assertTrue(audit["candidate_published"])
                    self.assertEqual((audit["input_elements"], audit["output_elements"]), (2, 1))
                    self.assertEqual(audit["short_elements_le_6mm"], 1)
                    self.assertEqual([c["disposition"] for c in audit["candidates"]], ["MERGED_SAFE"])
                    self.assertEqual(count_elements(output.read_bytes()), 1)
                    self.assertEqual(audit["output_cii_sha256"], sha(output.read_bytes()))
                    self.assertEqual(audit["topology"]["before"]["component_count"], 1)
                    self.assertEqual(audit["topology"]["after"]["component_count"], 1)
                    self.assertEqual(audit["syntax"]["after"]["ok"], True)
                    self.assertEqual(src.read_bytes(), original)
                    candidate_bytes.append(output.read_bytes())
            self.assertEqual(candidate_bytes[0], candidate_bytes[1])

    def test_actual_served_wrapper_withholds_noncollinear_hold(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            src = d / "original.xml"
            original = source_xml(src, turn=True)
            for name, scripts in (("native", NATIVE), ("served", SERVED)):
                with self.subTest(surface=name):
                    output = d / f"{name}-hold.cii"
                    report = d / f"{name}-audit.json"
                    result = invoke(scripts, src, output, report)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("CII_SHORT_SIMPLIFICATION_HOLD", result.stderr)
                    self.assertFalse(output.exists(), "HOLD output must never be published")
                    audit = json.loads(report.read_text(encoding="utf-8"))
                    self.assertEqual(audit["status"], "HOLD", audit)
                    self.assertFalse(audit["candidate_published"])
                    self.assertIsNone(audit["output_cii_sha256"])
                    self.assertIsNone(audit["output_elements"])
                    self.assertEqual(audit["short_elements_le_6mm"], 2)
                    self.assertTrue(all(c["disposition"] == "BLOCKED_UNRESOLVED"
                                        for c in audit["candidates"]))
                    self.assertEqual(src.read_bytes(), original)
                    self.assertIn("WITHHELD", report.with_suffix(".txt").read_text())


if __name__ == "__main__":
    unittest.main()
