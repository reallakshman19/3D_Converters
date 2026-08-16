from __future__ import annotations

from pathlib import Path
import json
import re
import tempfile
import unittest
import zipfile

import cii_v11_v14 as mod

REPO_ROOT = Path(__file__).resolve().parents[2]
BENCHMARK_ZIP = REPO_ROOT / "Benchmarks" / "v11-v14.zip"


def _benchmark_pair() -> tuple[bytes, bytes]:
    if not BENCHMARK_ZIP.is_file():
        raise FileNotFoundError(f"Missing benchmark archive: {BENCHMARK_ZIP}")
    with zipfile.ZipFile(BENCHMARK_ZIP) as archive:
        names = archive.namelist()
        v14_name = next(name for name in names if name.lower().endswith("v14.cii"))
        v11_name = next(name for name in names if name.lower().endswith("v11.cii"))
        return archive.read(v14_name), archive.read(v11_name)


def _section_map(data: bytes) -> dict[str, list[str]]:
    return {section.name: section.lines for section in mod.parse_sections(data)}


def _nums(line: str) -> list[float]:
    parsed = mod._extract_numbers(line)
    if parsed is None:
        raise AssertionError(f"Not numeric: {line!r}")
    return parsed[0]


class CiiV11V14BenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.v14, cls.v11 = _benchmark_pair()
        cls.m14 = _section_map(cls.v14)
        cls.m11 = _section_map(cls.v11)

    def test_detect_versions(self) -> None:
        self.assertEqual(mod.detect_version(mod.parse_sections(self.v11)), 11)
        self.assertEqual(mod.detect_version(mod.parse_sections(self.v14)), 14)

    def test_same_version_is_exact_noop(self) -> None:
        self.assertEqual(mod.convert_bytes(self.v11, 11).data, self.v11)
        self.assertEqual(mod.convert_bytes(self.v14, 14).data, self.v14)

    def test_cli_auto_converts_to_opposite_detected_version(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.CII"
            output = root / "output.cii"
            audit = root / "audit.json"
            source.write_bytes(self.v14)
            self.assertEqual(mod.main([str(source), str(output), "--target", "auto", "--audit-json", str(audit)]), 0)
            self.assertEqual(mod.detect_version(mod.parse_sections(output.read_bytes())), 11)
            report = json.loads(audit.read_text(encoding="utf-8"))
            self.assertEqual(report["source_version"], 14)
            self.assertEqual(report["target_version"], 11)

    def test_v14_to_v11_matches_target_record_shape(self) -> None:
        result = mod.convert_bytes(self.v14, 11)
        data = result.data
        converted = _section_map(data)
        self.assertEqual(len(data), len(self.v11))
        self.assertNotIn(b"\r\n", data)
        self.assertTrue(data.startswith(b"#$ VERSION\n"))
        for name in self.m11:
            self.assertEqual(len(converted[name]), len(self.m11[name]), name)
            self.assertEqual(
                [len(line) for line in converted[name]],
                [len(line) for line in self.m11[name]],
                name,
            )
        self.assertEqual(converted["VERSION"][0], self.m11["VERSION"][0])
        self.assertEqual(converted["UNITS"], self.m11["UNITS"])
        got = _nums(converted["ELEMENTS"][1])
        expected = _nums(self.m14["ELEMENTS"][1])
        self.assertEqual(got[3], expected[3])
        for actual, source in zip(got, expected):
            self.assertLessEqual(abs(actual - source), max(1e-6, abs(source) * 6e-6))

    def test_v11_to_v14_matches_target_record_shape(self) -> None:
        result = mod.convert_bytes(self.v11, 14)
        data = result.data
        converted = _section_map(data)
        self.assertEqual(len(data), len(self.v14))
        self.assertIsNone(re.search(br"(?<!\r)\n", data))
        self.assertTrue(data.startswith(b"#$ VERSION \r\n"))
        for name in self.m14:
            self.assertEqual(len(converted[name]), len(self.m14[name]), name)
            self.assertEqual(
                [len(line) for line in converted[name]],
                [len(line) for line in self.m14[name]],
                name,
            )
        self.assertEqual(converted["VERSION"][0], self.m14["VERSION"][0])
        self.assertEqual(converted["UNITS"], self.m14["UNITS"])
        sif = converted["SIF&TEES"]
        for base in range(0, len(sif), 14):
            self.assertTrue(all(mod._row_is_all_zero(line) for line in sif[base + 10:base + 14]))
        reducers = converted["REDUCERS"]
        for base in range(0, len(reducers), 2):
            self.assertTrue(mod._row_is_all_zero(reducers[base + 1]))

    def test_restraint_sentinel_mapping(self) -> None:
        to11 = _section_map(mod.convert_bytes(self.v14, 11).data)["RESTRANT"]
        to14 = _section_map(mod.convert_bytes(self.v11, 14).data)["RESTRANT"]
        source14_first = _nums(self.m14["RESTRANT"][0])
        source11_first = _nums(self.m11["RESTRANT"][0])
        if abs(source14_first[0]) < 1e-9:
            self.assertTrue(mod._close_to(_nums(to11[0])[2], mod._V11_DEFAULT_STIFFNESS))
        if abs(source11_first[0]) < 1e-9:
            self.assertAlmostEqual(_nums(to14[0])[2], 0.0)

    def test_nonzero_v14_sif_extension_fails_closed(self) -> None:
        sections = [mod.Section(s.name, list(s.lines)) for s in mod.parse_sections(self.v14)]
        sif = next(section for section in sections if section.name == "SIF&TEES")
        sif.lines[10] = mod._render_float_row([1.0, 0, 0, 0, 0, 0], 14)
        bad = mod._serialize(sections, 14)
        with self.assertRaises(mod.CiiConversionError):
            mod.convert_bytes(bad, 11)
        lossy = mod.convert_bytes(bad, 11, allow_lossy=True)
        self.assertEqual(len(lossy.audit.loss_events), 1)

    def test_nonzero_v14_reducer_extension_fails_closed(self) -> None:
        sections = [mod.Section(s.name, list(s.lines)) for s in mod.parse_sections(self.v14)]
        reducers = next(section for section in sections if section.name == "REDUCERS")
        reducers.lines[1] = mod._render_float_row([0, 0, 0, 2.0, 0], 14)
        bad = mod._serialize(sections, 14)
        with self.assertRaises(mod.CiiConversionError):
            mod.convert_bytes(bad, 11)


if __name__ == "__main__":
    unittest.main(verbosity=2)
