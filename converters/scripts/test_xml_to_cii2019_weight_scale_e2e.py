#!/usr/bin/env python3
"""BM-002: full XML->CII CLI rigid-weight scale end-to-end qualification."""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("xml_to_cii2019.py")

RIGID_XML = """<PipeStressExport>
  <RestrainOpenEnds>No</RestrainOpenEnds>
  <Pipe>
    <Branch>
      <Branchname>/BM002-TEST-250-B1</Branchname>
      <Temperature><Temperature1>80</Temperature1></Temperature>
      <MaterialNumber>0</MaterialNumber>
      <Node>
        <NodeNumber>10</NodeNumber><Endpoint>1</Endpoint><ComponentType>PIPE</ComponentType>
        <OutsideDiameter>273</OutsideDiameter><WallThickness>21.4376</WallThickness>
        <CorrosionAllowance>1</CorrosionAllowance><InsulationThickness>120</InsulationThickness>
        <Position>0 0 0</Position>
      </Node>
      <Node>
        <NodeNumber>20</NodeNumber><Endpoint>2</Endpoint><Rigid>2</Rigid>
        <ComponentType>RIGID</ComponentType><Weight>12.5</Weight><MaterialCode>106</MaterialCode>
        <OutsideDiameter>273</OutsideDiameter><WallThickness>21.4376</WallThickness>
        <CorrosionAllowance>1</CorrosionAllowance><InsulationThickness>120</InsulationThickness>
        <Position>191 0 0</Position>
      </Node>
      <Node>
        <NodeNumber>30</NodeNumber><Endpoint>1</Endpoint><ComponentType>PIPE</ComponentType>
        <OutsideDiameter>273</OutsideDiameter><WallThickness>21.4376</WallThickness>
        <CorrosionAllowance>1</CorrosionAllowance><InsulationThickness>120</InsulationThickness>
        <Position>1000 0 0</Position>
      </Node>
    </Branch>
  </Pipe>
</PipeStressExport>"""


def rigid_weight_from_cii(text: str) -> float:
    lines = text.splitlines()
    try:
        start = lines.index("#$ RIGID") + 1
    except ValueError as exc:
        raise AssertionError("CII output has no RIGID section") from exc

    payload = []
    for line in lines[start:]:
        if line.startswith("#$ "):
            break
        if line.strip():
            payload.append(line)

    if len(payload) != 1:
        raise AssertionError(f"Expected exactly one RIGID payload row, found {len(payload)}")
    return float(payload[0].split()[0])


def run_cli(weight_scale: float | None) -> tuple[float, str]:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        input_path = root / "bm002-rigid.xml"
        output_path = root / "bm002-rigid.cii"
        input_path.write_text(RIGID_XML, encoding="utf-8")

        cmd = [
            sys.executable,
            str(SCRIPT),
            "--input",
            str(input_path),
            "--output",
            str(output_path),
            "--coords-mode",
            "none",
        ]
        if weight_scale is not None:
            cmd.extend(["--weight-scale", str(weight_scale)])

        completed = subprocess.run(
            cmd,
            cwd=SCRIPT.parent,
            check=True,
            capture_output=True,
            text=True,
        )
        if not output_path.is_file():
            raise AssertionError("CLI reported success but did not create CII output")
        return rigid_weight_from_cii(output_path.read_text(encoding="utf-8")), completed.stdout


class TestXmlToCiiWeightScaleE2E(unittest.TestCase):
    def test_rigid_weight_is_scaled_once_by_real_cli(self):
        default_weight, default_stdout = run_cli(None)
        scaled_weight, scaled_stdout = run_cli(10.0)

        self.assertAlmostEqual(default_weight, 12.5)
        self.assertAlmostEqual(scaled_weight, 125.0)
        self.assertAlmostEqual(scaled_weight / default_weight, 10.0)
        self.assertNotAlmostEqual(scaled_weight, 1250.0)
        self.assertIn("Wrote", default_stdout)
        self.assertIn("Wrote", scaled_stdout)


if __name__ == "__main__":
    unittest.main()
