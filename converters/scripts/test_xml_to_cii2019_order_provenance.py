from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("xml_to_cii2019_order_provenance.py")
SPEC = importlib.util.spec_from_file_location("order_provenance", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def _xml(node_numbers: list[int], refs: list[str], changed_position: bool = False) -> str:
    nodes = []
    for index, (number, ref) in enumerate(zip(node_numbers, refs, strict=True), start=1):
        y = 999.0 if changed_position and index == 12 else float(index)
        nodes.append(
            f"""
<Node>
  <NodeNumber>{number}</NodeNumber>
  <NodeName></NodeName>
  <Endpoint>{1 if index % 2 else 2}</Endpoint>
  <ComponentType>FLAN</ComponentType>
  <ComponentRefNo>{ref}</ComponentRefNo>
  <OutsideDiameter>60.3</OutsideDiameter>
  <Position>100.0 {y:.1f} 200.0</Position>
  <ElementLengthMm>26.8</ElementLengthMm>
</Node>"""
        )
    return f"""<?xml version="1.0"?>
<PipeStressExport>
  <Pipe>
    <Branch>
      <Branchname>/GLRD-TEST/B1</Branchname>
      {''.join(nodes)}
    </Branch>
  </Pipe>
</PipeStressExport>
"""


def test_generated_range_maps_to_exact_source_records(tmp_path: Path) -> None:
    refs = [f"=REF/{index}" for index in range(1, 13)]
    source = tmp_path / "source.xml"
    enriched = tmp_path / "enriched.xml"
    source.write_text(_xml([-1] * 12, refs), encoding="utf-8")
    enriched.write_text(_xml(list(range(2909, 2921)), refs), encoding="utf-8")

    report = MODULE.build_report(enriched, source, [(2909, 2920)])

    assert report["record_count"] == 12
    assert report["source_match_counts"] == {"EXACT": 12}
    assert [row["node_number"] for row in report["records"]] == list(range(2909, 2921))
    assert [row["source_node_number"] for row in report["records"]] == [-1] * 12
    assert [row["source_branch_node_index"] for row in report["records"]] == list(range(12))
    assert [row["component_ref_no"] for row in report["records"]] == refs


def test_exact_join_does_not_guess_changed_position(tmp_path: Path) -> None:
    refs = [f"=REF/{index}" for index in range(1, 13)]
    source = tmp_path / "source.xml"
    enriched = tmp_path / "enriched.xml"
    source.write_text(_xml([-1] * 12, refs), encoding="utf-8")
    enriched.write_text(_xml(list(range(2909, 2921)), refs, changed_position=True), encoding="utf-8")

    report = MODULE.build_report(enriched, source, [(2920, 2920)])

    assert report["record_count"] == 1
    row = report["records"][0]
    assert row["node_number"] == 2920
    assert row["source_match"] == "NONE"
    assert row["source_node_number"] is None


def test_range_parser_and_filter_are_inclusive() -> None:
    records = [{"node_number": 2908}, {"node_number": 2909}, {"node_number": 2920}, {"node_number": 2921}]
    assert MODULE.parse_node_range("2920:2909") == (2909, 2920)
    assert [row["node_number"] for row in MODULE.filter_node_ranges(records, [(2909, 2920)])] == [2909, 2920]
