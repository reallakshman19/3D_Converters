"""Independent canonical PIPE projection reconstruction for UXML/RVM."""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from .uxml_rvm_common import clean, decimal_text, fail, normalized_identity
from .uxml_rvm_contracts import transform_point


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return decimal_text(value)
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _safe_id(value: str) -> str:
    raw = re.sub(r"[^A-Za-z0-9_.-]+", "-", clean(value)) or "UXML-PIPE"
    return raw if re.match(r"[A-Za-z_]", raw) else f"UXML-{raw}"


def _component_ports(component_id: str, inventory: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    ports = [port for port in inventory["ports"] if clean(port.get("componentId")) == component_id]
    role_to_port = {normalized_identity(port.get("role")): port for port in ports}
    return role_to_port["PIPE_END_1"], role_to_port["PIPE_END_2"]


def expected_elements(
    inventory: dict[str, Any], topology: dict[str, Any], lines: dict[str, Any],
    engineering: dict[str, Any], coordinate_context: dict[str, Any],
) -> list[dict[str, Any]]:
    """Reconstruct expected canonical elements only from source and approved authority."""
    node_number = {
        node["logicalNodeId"]: node["engineeringNodeNumber"]
        for node in topology["nodes"]
    }
    records: list[dict[str, Any]] = []
    for component_id in inventory["pipeComponentIds"]:
        start, end = _component_ports(component_id, inventory)
        start_id, end_id = clean(start["id"]), clean(end["id"])
        start_node = topology["portToNode"][start_id]
        end_node = topology["portToNode"][end_id]
        start_point = transform_point(start.get("point"), coordinate_context)
        end_point = transform_point(end.get("point"), coordinate_context)
        delta = {axis: end_point[axis] - start_point[axis] for axis in "xyz"}
        if start_node == end_node:
            fail("UXML_RVM_PIPE_NODE_COLLAPSE", f"PIPE {component_id} endpoints share one node")
        if all(value == 0 for value in delta.values()):
            fail("UXML_RVM_ZERO_LENGTH_PIPE", f"PIPE {component_id} is zero length")
        fields = engineering[component_id]
        records.append({
            "elementId": _safe_id(component_id), "componentId": component_id,
            "lineId": lines[component_id]["lineId"],
            "fromPortId": start_id, "toPortId": end_id,
            "fromLogicalNodeId": start_node, "toLogicalNodeId": end_node,
            "fromNodeNumber": node_number[start_node],
            "toNodeNumber": node_number[end_node],
            "fromCoordinate": start_point, "toCoordinate": end_point, "delta": delta,
            "outsideDiameterMm": fields["OUTSIDE_DIAMETER"]["canonicalValueMm"],
            "wallThicknessMm": fields["WALL_THICKNESS"]["canonicalValueMm"],
        })
    records.sort(key=lambda row: (
        row["lineId"], row["fromNodeNumber"], row["toNodeNumber"], row["componentId"],
    ))
    return _jsonable(records)


__all__ = ["expected_elements"]
