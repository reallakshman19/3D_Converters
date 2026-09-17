#!/usr/bin/env python3
"""Read-only provenance mapper for generated/enriched XML node numbers.

This diagnostic never participates in XML->CII conversion. It reads an enriched
XML document, optionally joins each record to a raw source XML document using
exact stable identity fields, and emits JSON suitable for Issue #769 evidence.
"""
from __future__ import annotations

import argparse
import json
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


def _local_name(tag: str) -> str:
    return tag.split("}", 1)[1] if tag.startswith("{") else tag


def _child_text(parent: ET.Element, name: str) -> str:
    for child in list(parent):
        if _local_name(child.tag) == name:
            return (child.text or "").strip()
    return ""


def _numeric_position(value: str) -> tuple[float, ...] | None:
    parts = value.replace(",", " ").split()
    if len(parts) != 3:
        return None
    try:
        return tuple(float(part) for part in parts)
    except ValueError:
        return None


def _numeric_node(value: str) -> int | None:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _record(branch_name: str, branch_index: int, node_index: int, node: ET.Element) -> dict[str, Any]:
    position_text = _child_text(node, "Position")
    return {
        "branch_name": branch_name,
        "branch_index": branch_index,
        "branch_node_index": node_index,
        "node_number": _numeric_node(_child_text(node, "NodeNumber")),
        "node_number_text": _child_text(node, "NodeNumber"),
        "component_type": _child_text(node, "ComponentType").upper(),
        "component_ref_no": _child_text(node, "ComponentRefNo"),
        "endpoint": _child_text(node, "Endpoint"),
        "position": position_text,
        "position_numeric": _numeric_position(position_text),
        "element_length_mm": _child_text(node, "ElementLengthMm"),
        "outside_diameter": _child_text(node, "OutsideDiameter"),
        "node_name": _child_text(node, "NodeName"),
    }


def collect_node_records(xml_path: str | Path) -> list[dict[str, Any]]:
    root = ET.parse(Path(xml_path)).getroot()
    records: list[dict[str, Any]] = []
    branch_index = 0
    for branch in root.iter():
        if _local_name(branch.tag) != "Branch":
            continue
        branch_name = _child_text(branch, "Branchname")
        node_index = 0
        for child in list(branch):
            if _local_name(child.tag) != "Node":
                continue
            records.append(_record(branch_name, branch_index, node_index, child))
            node_index += 1
        branch_index += 1
    return records


def _source_key(record: dict[str, Any]) -> tuple[Any, ...] | None:
    position = record.get("position_numeric")
    if position is None:
        return None
    return (
        record.get("branch_name", ""),
        record.get("component_ref_no", ""),
        record.get("endpoint", ""),
        record.get("component_type", ""),
        tuple(position),
    )


def bind_source_records(
    enriched_records: Iterable[dict[str, Any]],
    source_records: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    source_by_key: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for source in source_records:
        key = _source_key(source)
        if key is not None:
            source_by_key[key].append(source)

    bound: list[dict[str, Any]] = []
    for enriched in enriched_records:
        record = dict(enriched)
        key = _source_key(record)
        matches = source_by_key.get(key, []) if key is not None else []
        if len(matches) == 1:
            source = matches[0]
            record.update(
                {
                    "source_match": "EXACT",
                    "source_node_number": source.get("node_number"),
                    "source_node_number_text": source.get("node_number_text"),
                    "source_branch_index": source.get("branch_index"),
                    "source_branch_node_index": source.get("branch_node_index"),
                }
            )
        elif len(matches) > 1:
            record.update(
                {
                    "source_match": "AMBIGUOUS",
                    "source_match_count": len(matches),
                    "source_node_number": None,
                    "source_branch_index": None,
                    "source_branch_node_index": None,
                }
            )
        else:
            record.update(
                {
                    "source_match": "NONE",
                    "source_node_number": None,
                    "source_branch_index": None,
                    "source_branch_node_index": None,
                }
            )
        bound.append(record)
    return bound


def parse_node_range(value: str) -> tuple[int, int]:
    raw = value.strip()
    if ":" in raw:
        left, right = raw.split(":", 1)
    elif "-" in raw:
        left, right = raw.split("-", 1)
    else:
        left = right = raw
    start, end = int(left), int(right)
    return (start, end) if start <= end else (end, start)


def filter_node_ranges(
    records: Iterable[dict[str, Any]],
    ranges: Iterable[tuple[int, int]],
) -> list[dict[str, Any]]:
    ranges = list(ranges)
    if not ranges:
        return list(records)
    out: list[dict[str, Any]] = []
    for record in records:
        node_number = record.get("node_number")
        if node_number is None:
            continue
        if any(start <= node_number <= end for start, end in ranges):
            out.append(record)
    return out


def build_report(
    enriched_xml: str | Path,
    source_xml: str | Path | None = None,
    node_ranges: Iterable[tuple[int, int]] = (),
) -> dict[str, Any]:
    enriched = collect_node_records(enriched_xml)
    if source_xml is not None:
        records = bind_source_records(enriched, collect_node_records(source_xml))
    else:
        records = [
            {
                **record,
                "source_match": "NOT_REQUESTED",
                "source_node_number": None,
                "source_branch_index": None,
                "source_branch_node_index": None,
            }
            for record in enriched
        ]
    selected = filter_node_ranges(records, node_ranges)
    counts: dict[str, int] = defaultdict(int)
    for record in selected:
        counts[str(record.get("source_match", "UNKNOWN"))] += 1
    return {
        "diagnostic": "xml_to_cii2019_order_provenance",
        "enriched_xml": str(enriched_xml),
        "source_xml": str(source_xml) if source_xml is not None else None,
        "node_ranges": [list(item) for item in node_ranges],
        "record_count": len(selected),
        "source_match_counts": dict(sorted(counts.items())),
        "records": selected,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Map generated/enriched XML node numbers back to exact raw source XML identities."
    )
    parser.add_argument("enriched_xml", help="Enriched XML containing generated/renumbered NodeNumber values.")
    parser.add_argument("--source-xml", help="Optional raw source XML used for exact provenance binding.")
    parser.add_argument(
        "--node-range",
        action="append",
        default=[],
        metavar="START:END",
        help="Inclusive generated node range; repeat for multiple ranges (for example 2909:2920).",
    )
    parser.add_argument("--output", help="Optional JSON output file; stdout is used when omitted.")
    parser.add_argument("--compact", action="store_true", help="Emit compact JSON instead of pretty JSON.")
    args = parser.parse_args()

    ranges = [parse_node_range(value) for value in args.node_range]
    report = build_report(args.enriched_xml, args.source_xml, ranges)
    payload = json.dumps(
        report,
        indent=None if args.compact else 2,
        sort_keys=True,
        ensure_ascii=False,
    )
    if args.output:
        Path(args.output).write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
