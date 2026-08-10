#!/usr/bin/env python3
"""Standalone XML -> CII(2019) coordinate/topology custody wrapper.

This is the X001 production wrapper for the standalone XML -> CII route.
It deliberately composes the existing PSI116 component-topology wrapper and
adds coordinate-specific fail-closed rules without changing OD, bore, rigid
weight, SIF, reducer, or process-data mechanics.

Coordinate authority:
- malformed/missing numeric Position values never become an implicit origin;
- after PSI116 topology canonicalization, one CII NodeNumber may represent
  only physically coincident source positions within the governed topology
  tolerance;
- coords-mode=first writes an absolute coordinate for the first retained node
  of every serialized branch occurrence, eliminating branch-island origin
  resets while keeping the payload compact;
- coords-mode=all writes one deterministic absolute coordinate for every
  unique retained CII node number;
- coords-mode=none preserves the explicit no-COORDS behavior.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path

import xml_to_cii2019 as base
import xml_to_cii2019_contracted_direction as contracted
import xml_to_cii2019_direction as direction


NODE_POSITION_EQUIVALENCE_TOLERANCE_MM = float(
    getattr(contracted, "BRANCH_LINK_TOLERANCE_MM", 0.5)
)

_CONTRACTED_PARSE_XML_DOCUMENT = base._parse_xml_document


@dataclass(frozen=True)
class NodeOccurrence:
    occurrence_id: str
    branch_index: int
    branch_name: str
    node_index: int
    node_number: int
    position: tuple[float, float, float]


def _strict_parse_position(value: str) -> tuple[float, float, float]:
    text = base._safe_text(value)
    parts = text.split()
    if len(parts) != 3:
        raise ValueError(
            "Invalid XML Position: expected exactly three finite numeric "
            f"coordinates, got {text!r}; refusing implicit (0,0,0) fallback."
        )
    try:
        position = (float(parts[0]), float(parts[1]), float(parts[2]))
    except ValueError as exc:
        raise ValueError(
            "Invalid XML Position: expected exactly three finite numeric "
            f"coordinates, got {text!r}; refusing implicit (0,0,0) fallback."
        ) from exc
    if not all(math.isfinite(value) for value in position):
        raise ValueError(
            "Invalid XML Position: non-finite coordinate encountered in "
            f"{text!r}; refusing implicit (0,0,0) fallback."
        )
    return position


def _fnv1a32_text(value: str) -> str:
    hash_value = 0x811C9DC5
    for char in value:
        hash_value ^= ord(char)
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return f"fnv1a32:{hash_value:08x}:{len(value)}"


def _converter_parse_xml_digest(path: Path) -> str:
    return _fnv1a32_text(path.read_text(encoding="utf-8"))


def _position_distance(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> float:
    return math.sqrt(
        (left[0] - right[0]) ** 2
        + (left[1] - right[1]) ** 2
        + (left[2] - right[2]) ** 2
    )


def _document_occurrences(document: base.XmlDocument) -> list[NodeOccurrence]:
    occurrences: list[NodeOccurrence] = []
    for branch_index, branch in enumerate(document.branches, start=1):
        for node_index, node in enumerate(branch.nodes, start=1):
            if node.node_number <= 0:
                continue
            occurrences.append(
                NodeOccurrence(
                    occurrence_id=f"B{branch_index}:N{node_index}",
                    branch_index=branch_index,
                    branch_name=branch.branch_name,
                    node_index=node_index,
                    node_number=node.node_number,
                    position=node.position,
                )
            )
    return occurrences


def _validate_node_number_coordinate_identity(document: base.XmlDocument) -> None:
    first_by_number: dict[int, NodeOccurrence] = {}
    for occurrence in _document_occurrences(document):
        prior = first_by_number.get(occurrence.node_number)
        if prior is None:
            first_by_number[occurrence.node_number] = occurrence
            continue
        distance = _position_distance(prior.position, occurrence.position)
        if distance <= NODE_POSITION_EQUIVALENCE_TOLERANCE_MM:
            continue
        raise ValueError(
            "CII_NODE_POSITION_CONFLICT: one final CII NodeNumber maps to "
            "non-equivalent physical positions after PSI116 topology "
            f"canonicalization. NodeNumber={occurrence.node_number}; "
            f"first={prior.occurrence_id} branch={prior.branch_name!r} "
            f"position={prior.position}; conflicting={occurrence.occurrence_id} "
            f"branch={occurrence.branch_name!r} position={occurrence.position}; "
            f"distance={distance:.6f}mm > "
            f"tolerance={NODE_POSITION_EQUIVALENCE_TOLERANCE_MM:.6f}mm."
        )


def _parse_xml_document_with_coordinate_custody(path: Path) -> base.XmlDocument:
    # X004/X005 provenance boundary: this is the exact post-Python-enrichment
    # file handed to the parser. Emit both path and digest before model mutation.
    print(f"CONVERTER_PARSE_XML_PATH={path}")
    print(f"CONVERTER_PARSE_XML_DIGEST={_converter_parse_xml_digest(path)}")
    document = _CONTRACTED_PARSE_XML_DOCUMENT(path)
    _validate_node_number_coordinate_identity(document)
    return document


def _canonical_position_by_node(
    model: base.ConversionModel,
) -> dict[int, tuple[float, float, float]]:
    positions: dict[int, tuple[float, float, float]] = {}
    evidence: dict[int, tuple[str, tuple[float, float, float]]] = {}
    for edge_index, edge in enumerate(model.edges, start=1):
        for role, node in (("from", edge.from_node), ("to", edge.to_node)):
            prior = positions.get(node.node_number)
            if prior is None:
                positions[node.node_number] = node.position
                evidence[node.node_number] = (
                    f"edge={edge_index}:{role}:branch={edge.branch_name}",
                    node.position,
                )
                continue
            distance = _position_distance(prior, node.position)
            if distance <= NODE_POSITION_EQUIVALENCE_TOLERANCE_MM:
                continue
            prior_evidence = evidence[node.node_number]
            raise ValueError(
                "CII_NODE_POSITION_CONFLICT: element model contains one CII "
                f"NodeNumber with conflicting positions. NodeNumber={node.node_number}; "
                f"first={prior_evidence[0]} position={prior_evidence[1]}; "
                f"conflicting=edge={edge_index}:{role}:branch={edge.branch_name} "
                f"position={node.position}; distance={distance:.6f}mm."
            )
    return positions


def _branch_start_node_numbers(model: base.ConversionModel) -> list[int]:
    """Return first retained node of every serialized branch occurrence."""
    starts: list[int] = []
    previous = None
    for edge in model.edges:
        is_start = previous is None
        if previous is not None:
            is_start = (
                edge.branch_name != previous.branch_name
                or edge.from_node.node_number != previous.to_node.node_number
            )
        if is_start:
            starts.append(edge.from_node.node_number)
        previous = edge
    return starts


def _unique_in_order(values: list[int]) -> list[int]:
    out: list[int] = []
    seen: set[int] = set()
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def _build_coords_payload_with_coordinate_custody(
    model: base.ConversionModel,
    coords_mode: str,
) -> list[str]:
    if coords_mode == "none":
        return [base._row(["0"])]

    positions = _canonical_position_by_node(model)
    if coords_mode == "all":
        selected_numbers = list(positions)
    else:
        selected_numbers = _unique_in_order(_branch_start_node_numbers(model))

    if not selected_numbers:
        return [base._row(["0"])]

    payload = [base._row([str(len(selected_numbers))])]
    for node_number in selected_numbers:
        position = positions.get(node_number)
        if position is None:
            raise ValueError(
                "COORDS anchor references a NodeNumber that is absent from the "
                f"element model: {node_number}."
            )
        mapped = base._map_position_to_cii(position)
        payload.append(
            base._row(
                [
                    str(node_number),
                    base._format_fixed_float(mapped[0], 4),
                    base._format_fixed_float(mapped[1], 4),
                    base._format_fixed_float(mapped[2], 4),
                ]
            )
        )
    return payload


def install_coordinate_custody_patch() -> None:
    if getattr(base, "_XML_CII_COORDINATE_CUSTODY_APPLIED", False):
        return
    base._parse_position = _strict_parse_position  # type: ignore[assignment]
    base._parse_xml_document = _parse_xml_document_with_coordinate_custody  # type: ignore[assignment]
    base._build_coords_payload = _build_coords_payload_with_coordinate_custody  # type: ignore[assignment]
    base._XML_CII_COORDINATE_CUSTODY_APPLIED = True


install_coordinate_custody_patch()


if __name__ == "__main__":
    direction.main()
