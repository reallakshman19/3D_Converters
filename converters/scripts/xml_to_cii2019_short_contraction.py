"""Short-span contraction for XML -> CII 2019 conversion.

The base converter builds final CII elements from positive NodeNumber order after
``xml_to_cii2019._drop_short_element_nodes``. This module replaces that function
with a graph-contraction implementation so short spans are collapsed into the
best representative node instead of deleting connectivity/SIF anchors.
"""

from __future__ import annotations

from collections import Counter
import math

import xml_to_cii2019 as base


def _shared_node_numbers(branches):
    counts = Counter()
    for branch in branches:
        for node in branch.nodes:
            counts[node.node_number] += 1
    return {node_number for node_number, count in counts.items() if count > 1}


def _priority(node, shared_node_numbers, is_first_node=False, is_last_node=False):
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


def _merge_nodes(representative, absorbed):
    merged_specs = base._merge_restraint_specs(representative.restraint_specs, absorbed.restraint_specs)
    node_name = representative.node_name or absorbed.node_name
    return base.replace(representative, node_name=node_name, restraint_specs=merged_specs)


def _distance(left, right):
    return math.sqrt(
        (right.position[0] - left.position[0]) ** 2
        + (right.position[1] - left.position[1]) ** 2
        + (right.position[2] - left.position[2]) ** 2
    )


def _contract_short_element_nodes(branches, threshold_mm=base.SHORT_ELEMENT_LENGTH_DROP_THRESHOLD_MM):
    new_branches = []
    shared = _shared_node_numbers(branches)
    for branch in branches:
        if len(branch.nodes) < 2:
            new_branches.append(branch)
            continue

        kept = [branch.nodes[0]]
        kept_original_indices = [0]
        for index, node in enumerate(branch.nodes[1:], start=1):
            previous = kept[-1]
            length = _distance(previous, node)
            if length <= threshold_mm:
                previous_index = kept_original_indices[-1]
                previous_priority = _priority(
                    previous,
                    shared,
                    is_first_node=(previous_index == 0),
                    is_last_node=(previous_index == len(branch.nodes) - 1),
                )
                node_priority = _priority(
                    node,
                    shared,
                    is_first_node=(index == 0),
                    is_last_node=(index == len(branch.nodes) - 1),
                )
                if node_priority > previous_priority:
                    kept[-1] = _merge_nodes(node, previous)
                    kept_original_indices[-1] = index
                    representative = node
                    absorbed = previous
                else:
                    kept[-1] = _merge_nodes(previous, node)
                    representative = previous
                    absorbed = node

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


def apply():
    if getattr(base, "_SHORT_SPAN_CONTRACTION_APPLIED", False):
        return
    base._drop_short_element_nodes = _contract_short_element_nodes
    base._SHORT_SPAN_CONTRACTION_APPLIED = True


__all__ = ["apply", "_contract_short_element_nodes"]
