#!/usr/bin/env python3
"""XML -> CII(2019) wrapper with short-span contraction.

This wrapper keeps the existing direction-cosine XML -> CII path intact, but
installs a Python-side contraction rule before the input XML is parsed into the
positive-node branch model.

The problem being fixed is not XML formatting or helper-node classification:
`xml_to_cii2019.py` ignores `NodeNumber <= 0` helper geometry, then builds CII
edges from the remaining positive-node branch order. Therefore the robust fix is
at the positive-node short-span stage, before `_build_edges(...)` runs.
"""

from __future__ import annotations

from collections import Counter
import math

import xml_to_cii2019 as base
import xml_to_cii2019_direction as direction


def _distance(left: base.XmlNode, right: base.XmlNode) -> float:
    return math.sqrt(
        (right.position[0] - left.position[0]) ** 2
        + (right.position[1] - left.position[1]) ** 2
        + (right.position[2] - left.position[2]) ** 2
    )


def _shared_node_numbers(branches: list[base.XmlBranch]) -> set[int]:
    counts: Counter[int] = Counter()
    for branch in branches:
        for node in branch.nodes:
            counts[node.node_number] += 1
    return {node_number for node_number, count in counts.items() if count > 1}


def _node_priority(
    node: base.XmlNode,
    shared_node_numbers: set[int],
    *,
    is_first_node: bool,
    is_last_node: bool,
) -> int:
    component = base._safe_text(node.component_type).upper()
    score = 0
    if node.node_number in shared_node_numbers:
        score = max(score, 1000)
    if component in {"TEE", "OLET"} and node.endpoint == 0:
        score = max(score, 900)
    if component in {"TEE", "OLET", "BRAN"}:
        score = max(score, 800)
    if node.restraint_specs:
        score = max(score, 700)
    if base._safe_text(node.node_name):
        score = max(score, 600)
    if is_first_node or is_last_node:
        score = max(score, 500)
    if component == "RIGID" or node.rigid == 2:
        score = max(score, 400)
    return score


def _merge_nodes(representative: base.XmlNode, absorbed: base.XmlNode) -> base.XmlNode:
    return base.replace(
        representative,
        node_name=representative.node_name or absorbed.node_name,
        restraint_specs=base._merge_restraint_specs(representative.restraint_specs, absorbed.restraint_specs),
    )


def _contract_short_element_nodes(
    branches: list[base.XmlBranch],
    threshold_mm: float = base.SHORT_ELEMENT_LENGTH_DROP_THRESHOLD_MM,
) -> list[base.XmlBranch]:
    """Contract short positive-node spans instead of deleting node blocks.

    For each short span A -> B, keep one representative node. The representative
    is chosen to preserve connectivity and stress semantics: shared branch nodes,
    TEE/OLET SIF owners, branch junctions, restraints, names, branch endpoints,
    and rigid connectors outrank disposable inline geometry.
    """
    new_branches: list[base.XmlBranch] = []
    shared = _shared_node_numbers(branches)

    for branch in branches:
        if len(branch.nodes) < 2:
            new_branches.append(branch)
            continue

        kept: list[base.XmlNode] = [branch.nodes[0]]
        kept_original_indices: list[int] = [0]

        for index, node in enumerate(branch.nodes[1:], start=1):
            previous = kept[-1]
            length = _distance(previous, node)
            if length <= threshold_mm:
                previous_index = kept_original_indices[-1]
                previous_priority = _node_priority(
                    previous,
                    shared,
                    is_first_node=previous_index == 0,
                    is_last_node=previous_index == len(branch.nodes) - 1,
                )
                node_priority = _node_priority(
                    node,
                    shared,
                    is_first_node=index == 0,
                    is_last_node=index == len(branch.nodes) - 1,
                )

                if node_priority > previous_priority:
                    representative = node
                    absorbed = previous
                    kept[-1] = _merge_nodes(node, previous)
                    kept_original_indices[-1] = index
                else:
                    representative = previous
                    absorbed = node
                    kept[-1] = _merge_nodes(previous, node)

                base.DROPPED_SHORT_ELEMENT_NODES.append(
                    f"Branch '{branch.branch_name}' short span {previous.node_number}->{node.node_number}: "
                    f"length {length:.3f}mm <= {threshold_mm}mm; contracted into "
                    f"NodeNumber {representative.node_number} ({representative.component_type}); "
                    f"absorbed NodeNumber {absorbed.node_number} ({absorbed.component_type})"
                )
                continue

            if kept[-1].node_number == node.node_number:
                kept[-1] = _merge_nodes(kept[-1], node)
                kept_original_indices[-1] = index
                continue

            kept.append(node)
            kept_original_indices.append(index)

        if len(kept) < 2:
            new_branches.append(branch)
            continue
        new_branches.append(base.replace(branch, nodes=kept))

    return new_branches


def _sif_owner_node(edge: base.Edge) -> base.XmlNode | None:
    if edge.to_node.endpoint == 0 and edge.to_node.component_type in {"TEE", "OLET"}:
        return edge.to_node
    if edge.from_node.endpoint == 0 and edge.from_node.component_type in {"TEE", "OLET"}:
        return edge.from_node
    return None


def _build_sif_indices(edges: list[base.Edge]) -> tuple[list[base.Edge], dict[int, int]]:
    sif_edges: list[base.Edge] = []
    edge_to_index: dict[int, int] = {}
    assigned_nodes: set[int] = set()
    for edge_index, edge in enumerate(edges):
        owner = _sif_owner_node(edge)
        if owner is None or owner.node_number in assigned_nodes:
            continue
        sif_edges.append(edge)
        edge_to_index[edge_index] = len(sif_edges)
        assigned_nodes.add(owner.node_number)
    return sif_edges, edge_to_index


def _sif_payload_factory(tee_desc_by_node: dict[int, str], support_config: dict):
    def _build_sif_payload(model: base.ConversionModel) -> list[str]:
        lines: list[str] = []
        zero_row = base._row([
            base._format_fixed_float(0.0, 6),
            base._format_fixed_float(0.0, 6),
            base._format_fixed_float(0.0, 6),
            base._format_fixed_float(0.0, 6),
            base._format_fixed_float(0.0, 6),
            base._format_fixed_float(0.0, 6),
        ])
        for edge in model.sif_edges:
            owner = _sif_owner_node(edge)
            if owner is None:
                continue
            desc = tee_desc_by_node.get(owner.node_number, "")
            tee_type = direction._tee_sif_type_from_description(desc, support_config)
            first = base._row([
                base._format_auto_float(float(owner.node_number)),
                base._format_fixed_float(float(tee_type), 5),
                base._format_fixed_float(0.0, 6),
                base._format_fixed_float(0.0, 6),
                base._format_fixed_float(0.0, 6),
                base._format_fixed_float(0.0, 6),
            ])
            lines.append(first)
            for _ in range(9):
                lines.append(zero_row)
        return lines
    return _build_sif_payload


def install_short_span_contraction_patch() -> None:
    if getattr(base, "_SHORT_SPAN_CONTRACTION_APPLIED", False):
        return
    base._drop_short_element_nodes = _contract_short_element_nodes  # type: ignore[assignment]
    base._build_sif_indices = _build_sif_indices  # type: ignore[assignment]
    direction._sif_payload_factory = _sif_payload_factory  # type: ignore[assignment]
    base._SHORT_SPAN_CONTRACTION_APPLIED = True


install_short_span_contraction_patch()


if __name__ == "__main__":
    direction.main()
