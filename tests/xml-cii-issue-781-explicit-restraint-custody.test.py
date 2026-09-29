#!/usr/bin/env python3
"""Issue #781 regression: explicit +Y restraint custody must survive collapse to final CII."""

from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "converters" / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import xml_to_cii2019 as converter
import xml_to_cii2019_runtime_custody as runtime

runtime.install_runtime_custody_patch()

CASES = (
    (ROOT / "Benchmarks" / "XML-CII-2019" / "SYS-6-S8810011-01.xml", "PS-14292.1"),
    (ROOT / "Benchmarks" / "XML-CII-2019" / "SYS-6-S8810010-01.xml", "PS-14259.4"),
)


def local_name(tag: str) -> str:
    return tag.split("}", 1)[-1]


def child_text(parent: ET.Element, name: str) -> str:
    for child in list(parent):
        if local_name(child.tag) == name:
            return (child.text or "").strip()
    return ""


def source_node(path: Path, node_name: str) -> ET.Element:
    root = ET.parse(path).getroot()
    for node in root.iter():
        if local_name(node.tag) != "Node":
            continue
        if child_text(node, "NodeName") == node_name:
            return node
    raise AssertionError(f"{node_name}: source Node not found in {path.name}")


def source_restraint_types(node: ET.Element) -> list[str]:
    return [
        child_text(child, "Type")
        for child in list(node)
        if local_name(child.tag) == "Restraint"
    ]


def source_position(node: ET.Element) -> tuple[float, float, float]:
    values = tuple(float(value) for value in child_text(node, "Position").split())
    assert len(values) == 3
    return values


def restraint_section_rows(cii_text: str) -> list[tuple[str, ...]]:
    lines = cii_text.splitlines()
    start = lines.index("#$ RESTRANT") + 1
    rows: list[tuple[str, ...]] = []
    for line in lines[start:]:
        if line.startswith("#$ "):
            break
        tokens = tuple(line.split())
        if tokens:
            rows.append(tokens)
    return rows


def assert_case(path: Path, node_name: str) -> None:
    raw_node = source_node(path, node_name)
    raw_node_number = int(child_text(raw_node, "NodeNumber"))
    raw_position = source_position(raw_node)
    assert "+Y" in source_restraint_types(raw_node), (
        f"{node_name}: benchmark source must contain explicit +Y restraint"
    )

    document = converter._parse_xml_document(path)
    parsed_nodes = [node for branch in document.branches for node in branch.nodes]
    parsed = next((node for node in parsed_nodes if node.node_name == node_name), None)
    assert parsed is not None, (
        f"{node_name}: support identity disappeared during short-node cleanup"
    )
    assert runtime._distance(parsed.position, raw_position) <= runtime.EXPLICIT_RESTRAINT_IDENTITY_TOLERANCE_MM, (
        f"{node_name}: restored support identity moved away from source position"
    )
    assert parsed.component_type == "OLET", (
        f"{node_name}: identity restoration must not replace retained component authority"
    )
    assert parsed.node_number != raw_node_number, (
        f"{node_name}: benchmark no longer exercises collapsed-node custody"
    )
    assert any(spec.type_code == 14 for spec in parsed.restraint_specs), (
        f"{node_name}: parsed node lost +Y -> CII type 14 restraint authority"
    )

    model = converter._build_conversion_model(document)
    assigned = next((row for row in model.restraints if row.node_name == node_name), None)
    assert assigned is not None, (
        f"{node_name}: explicit restraint was not assigned into conversion model"
    )
    assert any(spec.type_code == 14 for spec in assigned.specs), (
        f"{node_name}: conversion model does not carry +Y / CII type 14"
    )

    payload = converter._build_restraint_payload(model, {})
    expected_prefix = (str(assigned.node_number), "14")
    writer_rows = [tuple(line.split()[:2]) for line in payload if len(line.split()) >= 2]
    assert expected_prefix in writer_rows, (
        f"{node_name}: RESTRANT writer input lacks node {assigned.node_number} type 14 row"
    )

    cii_text = converter._build_cii_text(
        model,
        "none",
        converter.DEFAULT_VERSION_LINE,
        1.0,
        {},
    )
    final_rows = restraint_section_rows(cii_text)
    assert any(row[:2] == expected_prefix for row in final_rows if len(row) >= 2), (
        f"{node_name}: final CII RESTRANT section lacks node {assigned.node_number} type 14"
    )

    assert converter._direction_cosines_for_restraint_type(14, False) == (0.0, 1.0, 0.0), (
        f"{node_name}: +Y writer direction cosine mapping drifted"
    )


for benchmark, identity in CASES:
    assert_case(benchmark, identity)

print("PASS issue #781 explicit +Y source identity -> collapsed retained node -> model -> final CII custody")
