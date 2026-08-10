#!/usr/bin/env python3
"""X001 regression for standalone PSI116 XML -> CII coordinate custody.

The governing GLRD benchmark is converted through the same Python entrypoint
selected by the standalone browser invocation. The test proves the reported
branch-start nodes receive their source-derived absolute CII coordinates and
exercises two fail-closed negative controls.
"""

from __future__ import annotations

import math
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET


SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parents[1]
CONVERTER = SCRIPT_DIR / "xml_to_cii2019_coordinate_custody.py"
GLRD = REPO / "Benchmarks" / "XML to CII 2019" / "GLRD-1000-PI-01.xml"
TARGET_NODES = (10, 760, 1200, 1640, 2080, 2520, 2960)
POSITION_TOLERANCE_MM = 0.5
OUTPUT_TOLERANCE_MM = 1.0e-3


def _local_name(tag: str) -> str:
    return tag.split("}", 1)[1] if tag.startswith("{") else tag


def _child_text(parent: ET.Element, name: str) -> str:
    for child in list(parent):
        if _local_name(child.tag) == name:
            return (child.text or "").strip()
    return ""


def _position(text: str) -> tuple[float, float, float]:
    values = tuple(float(value) for value in text.split())
    assert len(values) == 3
    assert all(math.isfinite(value) for value in values)
    return values  # type: ignore[return-value]


def _distance(left: tuple[float, float, float], right: tuple[float, float, float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def _mapped(position: tuple[float, float, float]) -> tuple[float, float, float]:
    # Production converter authority: XML XYZ -> CII X,Z,-Y.
    return (position[0], position[2], -position[1])


def _source_positions(path: Path) -> dict[int, list[tuple[float, float, float]]]:
    root = ET.parse(path).getroot()
    wanted = set(TARGET_NODES)
    found: dict[int, list[tuple[float, float, float]]] = {number: [] for number in TARGET_NODES}
    for node in root.iter():
        if _local_name(node.tag) != "Node":
            continue
        raw_number = _child_text(node, "NodeNumber")
        try:
            number = int(raw_number)
        except ValueError:
            continue
        if number not in wanted:
            continue
        found[number].append(_position(_child_text(node, "Position")))
    return found


def _cii_coords(text: str) -> dict[int, tuple[float, float, float]]:
    lines = text.splitlines()
    start = lines.index("#$ COORDS") + 1
    assert start < len(lines), "COORDS section has no payload"
    count_tokens = lines[start].split()
    assert count_tokens, "COORDS record count is missing"
    expected_count = int(float(count_tokens[0]))
    out: dict[int, tuple[float, float, float]] = {}
    for line in lines[start + 1 :]:
        if line.startswith("#$ "):
            break
        tokens = line.split()
        if len(tokens) < 4:
            continue
        number = int(float(tokens[0]))
        out[number] = (float(tokens[1]), float(tokens[2]), float(tokens[3]))
    assert len(out) == expected_count, (
        f"COORDS declared {expected_count} records but parsed {len(out)} unique node records"
    )
    return out


def _run(input_path: Path, output_path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(CONVERTER),
            "--input",
            str(input_path),
            "--output",
            str(output_path),
            "--coords-mode",
            "first",
        ],
        cwd=str(REPO),
        text=True,
        capture_output=True,
        check=False,
    )


def _minimal_xml(branches: str) -> str:
    return (
        "<PipeStressExport>"
        "<RestrainOpenEnds>No</RestrainOpenEnds>"
        "<AmbientTemperature>21</AmbientTemperature>"
        f"<Pipe>{branches}</Pipe>"
        "</PipeStressExport>"
    )


def _node(number: int, position: str, component: str = "BRAN") -> str:
    return (
        "<Node>"
        f"<NodeNumber>{number}</NodeNumber>"
        "<Endpoint>1</Endpoint>"
        f"<ComponentType>{component}</ComponentType>"
        "<OutsideDiameter>100</OutsideDiameter>"
        "<WallThickness>5</WallThickness>"
        f"<Position>{position}</Position>"
        "</Node>"
    )


def _negative_controls(temp_root: Path) -> None:
    malformed = temp_root / "malformed-position.xml"
    malformed.write_text(
        _minimal_xml(
            "<Branch><Branchname>/BAD-POS</Branchname>"
            + _node(10, "not-a-position")
            + _node(20, "10 0 0")
            + "</Branch>"
        ),
        encoding="utf-8",
    )
    malformed_result = _run(malformed, temp_root / "malformed.cii")
    assert malformed_result.returncode != 0, "Malformed Position must block conversion"
    malformed_log = malformed_result.stdout + "\n" + malformed_result.stderr
    assert "refusing implicit (0,0,0) fallback" in malformed_log, malformed_log

    conflict = temp_root / "duplicate-node-position-conflict.xml"
    conflict.write_text(
        _minimal_xml(
            "<Branch><Branchname>/B1</Branchname>"
            + _node(100, "0 0 0")
            + _node(110, "10 0 0")
            + "</Branch>"
            + "<Branch><Branchname>/B2</Branchname>"
            + _node(100, "100 0 0")
            + _node(120, "110 0 0")
            + "</Branch>"
        ),
        encoding="utf-8",
    )
    conflict_result = _run(conflict, temp_root / "conflict.cii")
    assert conflict_result.returncode != 0, "Conflicting final CII node coordinates must block conversion"
    conflict_log = conflict_result.stdout + "\n" + conflict_result.stderr
    assert "CII_NODE_POSITION_CONFLICT" in conflict_log, conflict_log


def main() -> None:
    assert CONVERTER.exists(), CONVERTER
    assert GLRD.exists(), GLRD

    source_positions = _source_positions(GLRD)
    expected: dict[int, tuple[float, float, float]] = {}
    for number in TARGET_NODES:
        occurrences = source_positions[number]
        assert occurrences, f"GLRD source is missing target NodeNumber {number}"
        authority = occurrences[0]
        for occurrence in occurrences[1:]:
            distance = _distance(authority, occurrence)
            assert distance <= POSITION_TOLERANCE_MM, (
                f"GLRD NodeNumber {number} is itself coordinate-ambiguous in source: "
                f"{authority} vs {occurrence}, distance={distance:.6f}mm"
            )
        expected[number] = _mapped(authority)

    with tempfile.TemporaryDirectory(prefix="xml-cii-x001-glrd-") as raw_temp:
        temp_root = Path(raw_temp)
        output = temp_root / "GLRD-1000-PI-01.x001.cii"
        result = _run(GLRD, output)
        assert result.returncode == 0, (
            "GLRD conversion failed through X001 production entrypoint:\n"
            + result.stdout
            + "\n"
            + result.stderr
        )
        assert output.exists(), output
        coords = _cii_coords(output.read_text(encoding="utf-8"))

        for number in TARGET_NODES:
            assert number in coords, (
                f"GLRD reported origin-risk node {number} has no absolute COORDS record; "
                f"available anchors={sorted(coords)}"
            )
            actual = coords[number]
            wanted = expected[number]
            error = _distance(actual, wanted)
            assert error <= OUTPUT_TOLERANCE_MM, (
                f"Node {number} COORDS mismatch: actual={actual}, expected={wanted}, "
                f"error={error:.6f}mm"
            )
            assert any(abs(value) > OUTPUT_TOLERANCE_MM for value in actual), (
                f"Node {number} was incorrectly emitted at the CII origin: {actual}"
            )

        # Node 10 is a direct, known mapping from the frozen GLRD benchmark.
        node10 = coords[10]
        known_node10 = (111369.76, 101088.18, -108416.90)
        assert _distance(node10, known_node10) <= OUTPUT_TOLERANCE_MM, (
            f"Node 10 mapping regression: actual={node10}, expected={known_node10}"
        )

        _negative_controls(temp_root)

    print(
        "X001 GLRD coordinate custody passed: "
        + ", ".join(str(number) for number in TARGET_NODES)
        + "; malformed Position and duplicate-node conflict both fail closed."
    )


if __name__ == "__main__":
    main()
