"""Exact UXML/RVM topology, node-number, and line authority."""
from __future__ import annotations
from collections import defaultdict, deque
from typing import Any
from .uxml_rvm_contracts import (
    clean, fail, integer_value, normalized_identity, require_list, require_object,
    require_strings, transform_point, unique_index,
)

LINE_KEYS = {"PIPELINEREF", "LINEKEY", "LINENO"}

def _key(value: Any) -> str:
    return normalized_identity(value).replace("_", "").replace("-", "").replace(" ", "")

def _source_topology(uxml: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    hints = require_list(uxml.get("topologyHints") or [], "UXML_RVM_TOPOLOGY_HINTS", "topologyHints")
    if hints:
        unique_index(hints, "id", "UXML_RVM_TOPOLOGY_HINT_IDENTITY", "topologyHints")
    nodes, connections = [], []
    for index, item in enumerate(hints):
        hint = require_object(item, "UXML_RVM_TOPOLOGY_HINT", f"topologyHints[{index}]")
        hint_type = normalized_identity(hint.get("hintType") or hint.get("type"))
        confidence = normalized_identity(hint.get("sourceConfidence") or hint.get("confidence"))
        if confidence != "EXACT_SOURCE":
            fail("UXML_RVM_TOPOLOGY_HINT_CONFIDENCE", "Direct topology hints require EXACT_SOURCE confidence")
        evidence = sorted(require_strings(hint.get("evidenceReferences"), "UXML_RVM_TOPOLOGY_HINT_EVIDENCE", "evidenceReferences"))
        if hint_type == "EXACT_LOGICAL_NODE":
            nodes.append({
                "logicalNodeId": clean(hint.get("logicalNodeId") or hint.get("id")),
                "sourcePortIds": require_strings(hint.get("sourcePortIds"), "UXML_RVM_TOPOLOGY_HINT_PORTS", "sourcePortIds"),
                "engineeringNodeNumber": None,
                "declaredHintNodeNumber": hint.get("engineeringNodeNumber"),
                "lineId": clean(hint.get("lineId")),
                "evidenceReferences": evidence,
                "authority": "EXACT_SOURCE_TOPOLOGY_DECLARATION",
            })
        elif hint_type == "EXACT_PORT_CONNECTION":
            connections.append({
                "sourcePortId": clean(hint.get("sourcePortId")),
                "targetPortId": clean(hint.get("targetPortId")),
                "authority": "EXACT_SOURCE_CONNECTION",
                "reconciliation": clean(hint.get("reconciliation") or "UNDIRECTED_EXACT"),
                "evidenceReferences": evidence,
            })
        else:
            fail("UXML_RVM_TOPOLOGY_HINT_TYPE", f"Unregistered topology hint type {hint_type or '<missing>'}")
    return nodes, connections

def _anchor_numbers(port_ids: list[str], inventory: dict[str, Any]) -> list[int]:
    values, aliases = [], {"NODENUMBER", "ENGINEERINGNODENUMBER"}
    for port_id in port_ids:
        anchor = inventory["anchorById"][clean(inventory["portById"][port_id].get("anchorId"))]
        for origin in (anchor, anchor.get("rawAttributes") or {}):
            if not isinstance(origin, dict):
                continue
            for key, value in origin.items():
                if _key(key) in aliases and value not in (None, ""):
                    values.append(integer_value(value, "UXML_RVM_NODE_NUMBER_VALUE", f"{anchor['id']}.{key}"))
    return values

def _validate_connections(nodes: list[dict[str, Any]], connections: list[Any]) -> None:
    node_by_port = {port: clean(node["logicalNodeId"]) for node in nodes for port in node["sourcePortIds"]}
    adjacency: dict[str, set[str]] = defaultdict(set)
    seen: set[tuple[str, str]] = set()
    for index, item in enumerate(connections):
        connection = require_object(item, "UXML_RVM_CONNECTION_SHAPE", f"explicitConnections[{index}]")
        authority = clean(connection.get("authority")); reconciliation = clean(connection.get("reconciliation"))
        if authority not in {"APPROVED_EXACT_CONNECTION", "EXACT_SOURCE_CONNECTION"} or reconciliation not in {"SYMMETRIC", "UNDIRECTED_EXACT"}:
            fail("UXML_RVM_CONNECTION_AUTHORITY", "Connection lacks registered exact symmetric authority")
        require_strings(connection.get("evidenceReferences"), "UXML_RVM_CONNECTION_EVIDENCE", "connection evidenceReferences")
        left, right = clean(connection.get("sourcePortId")), clean(connection.get("targetPortId"))
        if not left or not right or left == right:
            fail("UXML_RVM_CONNECTION_REFERENCE", "Connections require two different exact port identities")
        pair = tuple(sorted((left, right)))
        if pair in seen:
            fail("UXML_RVM_DUPLICATE_CONNECTION", f"Duplicate connection {pair}")
        seen.add(pair)
        if left not in node_by_port or right not in node_by_port or node_by_port[left] != node_by_port[right]:
            fail("UXML_RVM_CONNECTION_NODE_CONTRADICTION", f"Connection {pair} crosses or misses declared logical nodes")
        adjacency[left].add(right); adjacency[right].add(left)
    for node in nodes:
        ports = list(node["sourcePortIds"])
        if len(ports) > 2:
            fail("UXML_RVM_UNSUPPORTED_JUNCTION_NODE", f"Logical node {node['logicalNodeId']} has degree {len(ports)} without TEE/OLET/SIF authority")
        if len(ports) < 2:
            continue
        visited, queue = {ports[0]}, deque([ports[0]])
        while queue:
            current = queue.popleft()
            for other in adjacency[current]:
                if other not in visited:
                    visited.add(other); queue.append(other)
        if visited != set(ports):
            fail("UXML_RVM_ASYMMETRIC_CONNECTION", f"Logical node {node['logicalNodeId']} is not explicitly connected")

def _node_number(node: dict[str, Any], ports: list[str], inventory: dict[str, Any], plan: bool) -> int:
    node_id = clean(node["logicalNodeId"]); source_numbers = _anchor_numbers(ports, inventory)
    if len(set(source_numbers)) > 1:
        fail("UXML_RVM_SOURCE_NODE_NUMBER_CONFLICT", f"Source anchors disagree for logical node {node_id}")
    source_number = source_numbers[0] if source_numbers else None
    hinted = node.get("declaredHintNodeNumber")
    hint_number = integer_value(hinted, "UXML_RVM_NODE_NUMBER_VALUE", f"{node_id}.hintNodeNumber") if hinted not in (None, "") else None
    if source_number is not None and hint_number is not None and source_number != hint_number:
        fail("UXML_RVM_NODE_NUMBER_CONTRADICTION", f"Topology hint and anchor node numbers disagree for {node_id}")
    number = source_number if source_number is not None else hint_number
    external = node.get("engineeringNodeNumber") if plan else None
    if external not in (None, ""):
        plan_number = integer_value(external, "UXML_RVM_NODE_NUMBER_MISSING", f"{node_id}.engineeringNodeNumber")
        if number is not None and number != plan_number:
            fail("UXML_RVM_NODE_NUMBER_CONTRADICTION", f"Source and plan node numbers disagree for {node_id}")
        number = plan_number
    if number is None:
        fail("UXML_RVM_NODE_NUMBER_MISSING", f"Logical node {node_id} lacks engineering node-number authority")
    return number

def resolve_topology(uxml: dict[str, Any], inventory: dict[str, Any], plan: dict[str, Any] | None, coordinate_context: dict[str, Any]) -> dict[str, Any]:
    source_nodes, source_connections = _source_topology(uxml) if (uxml.get("topologyHints") or []) else ([], [])
    raw_nodes = plan.get("logicalNodes") if plan else source_nodes
    nodes, _ = unique_index(raw_nodes or [], "logicalNodeId", "UXML_RVM_LOGICAL_NODE_IDENTITY", "logicalNodes")
    if plan and source_nodes:
        source_partition = sorted(sorted(node["sourcePortIds"]) for node in source_nodes)
        plan_partition = sorted(sorted(require_strings(node.get("sourcePortIds"), "UXML_RVM_NODE_PORTS", "sourcePortIds")) for node in nodes)
        if source_partition != plan_partition:
            fail("UXML_RVM_TOPOLOGY_PLAN_SOURCE_CONTRADICTION", "External topology plan contradicts explicit source topology")
    memberships, node_numbers, port_to_node, decisions = [], {}, {}, []
    for node in nodes:
        node_id = clean(node["logicalNodeId"])
        ports = require_strings(node.get("sourcePortIds"), "UXML_RVM_NODE_PORTS", f"{node_id}.sourcePortIds")
        if len(set(ports)) != len(ports):
            fail("UXML_RVM_DUPLICATE_NODE_PORT", f"Logical node {node_id} repeats a port")
        if len(ports) > 2:
            fail("UXML_RVM_UNSUPPORTED_JUNCTION_NODE", f"Logical node {node_id} has degree {len(ports)} without TEE/OLET/SIF authority")
        for port_id in ports:
            if port_id not in inventory["portById"]:
                fail("UXML_RVM_MISSING_PORT_REFERENCE", f"Logical node {node_id} references unknown port {port_id}")
            if port_id in port_to_node:
                fail("UXML_RVM_PORT_MULTI_NODE", f"Port {port_id} belongs to two logical nodes")
            port_to_node[port_id] = node_id
        number = _node_number(node, ports, inventory, bool(plan))
        if number in node_numbers:
            fail("UXML_RVM_DUPLICATE_NODE_NUMBER", f"Engineering node number {number} owns two logical nodes")
        node_numbers[number] = node_id
        transformed = [transform_point(inventory["portById"][port_id].get("point"), coordinate_context) for port_id in ports]
        if any(point != transformed[0] for point in transformed[1:]):
            fail("UXML_RVM_CONNECTED_COORDINATE_MISMATCH", f"Connected ports in logical node {node_id} have unequal transformed coordinates")
        memberships.extend(ports)
        evidence = require_strings(node.get("evidenceReferences"), "UXML_RVM_NODE_EVIDENCE", f"{node_id}.evidenceReferences")
        decisions.append({
            "logicalNodeId": node_id, "sourcePortIds": ports, "engineeringNodeNumber": number,
            "lineId": clean(node.get("lineId")), "coordinate": transformed[0],
            "authority": clean(node.get("authority") or ("APPROVED_EXACT_TOPOLOGY_PLAN" if plan else "EXACT_SOURCE_TOPOLOGY_DECLARATION")),
            "evidenceReferences": sorted(evidence),
        })
    if sorted(memberships) != sorted(inventory["requiredPortIds"]):
        missing = sorted(set(inventory["requiredPortIds"]) - set(memberships)); extra = sorted(set(memberships) - set(inventory["requiredPortIds"]))
        fail("UXML_RVM_PORT_ACCOUNTING", f"Required endpoint membership mismatch; missing={missing}, extra={extra}")
    connections = require_list(plan.get("explicitConnections") or [], "UXML_RVM_CONNECTIONS", "explicitConnections") if plan else source_connections
    if plan and source_connections:
        source_pairs = sorted(tuple(sorted((row["sourcePortId"], row["targetPortId"]))) for row in source_connections)
        plan_pairs = sorted(tuple(sorted((clean(row.get("sourcePortId")), clean(row.get("targetPortId"))))) for row in connections)
        if source_pairs != plan_pairs:
            fail("UXML_RVM_TOPOLOGY_PLAN_SOURCE_CONTRADICTION", "External connection plan contradicts explicit source connections")
    _validate_connections(decisions, connections)
    decisions.sort(key=lambda item: item["logicalNodeId"])
    return {"nodes": decisions, "portToNode": port_to_node, "nodeNumberOwner": node_numbers}

def _alias_occurrences(mapping: Any, aliases: set[str], origin: str) -> list[dict[str, Any]]:
    if not isinstance(mapping, dict):
        return []
    return [{"origin": origin, "spelling": key, "value": value} for key, value in mapping.items() if _key(key) in aliases and value not in (None, "")]

def resolve_lines(uxml: dict[str, Any], inventory: dict[str, Any], plan: dict[str, Any] | None) -> dict[str, Any]:
    assignments = plan.get("lineAssignments") if plan else []
    assignment_rows, assignment_by_component = unique_index(assignments or [], "componentId", "UXML_RVM_LINE_ASSIGNMENT_IDENTITY", "lineAssignments") if assignments else ([], {})
    for row in assignment_rows:
        if clean(row.get("componentId")) not in inventory["componentById"]:
            fail("UXML_RVM_LINE_ASSIGNMENT_REFERENCE", f"Unknown component {row.get('componentId')} in line assignment")
        if clean(row.get("authority")) != "APPROVED_LINE_ASSIGNMENT":
            fail("UXML_RVM_LINE_AUTHORITY", "Unknown line-assignment authority")
        require_strings(row.get("evidenceReferences"), "UXML_RVM_LINE_EVIDENCE", "line evidenceReferences")
    decisions, pipeline_ids = {}, {clean(row.get("id")) for row in inventory["pipelines"]}
    for component in inventory["components"]:
        component_id = clean(component["id"]); occurrences = []; pipeline_ref = clean(component.get("pipelineRef"))
        component_scope = {key: value for key, value in component.items() if not (key == "pipelineRef" and pipeline_ref in pipeline_ids)}
        for origin_name, origin in (("component", component_scope), ("rawAttributes", component.get("rawAttributes") or {}), ("normalized", component.get("normalized") or {}), ("derived", component.get("derived") or {})):
            occurrences += _alias_occurrences(origin, LINE_KEYS, f"{component_id}.{origin_name}")
        for pipeline in inventory["pipelines"]:
            if pipeline_ref and pipeline_ref in {clean(pipeline.get("id")), clean(pipeline.get("pipelineRef"))}:
                occurrences += _alias_occurrences(pipeline, LINE_KEYS, f"pipeline:{pipeline.get('id')}")
        normalized = {normalized_identity(item["value"]) for item in occurrences}
        if len(normalized) > 1:
            fail("UXML_RVM_LINE_ALIAS_CONFLICT", f"Component {component_id} has contradictory line aliases")
        source_line = next(iter(normalized), ""); plan_row = assignment_by_component.get(component_id)
        plan_line = normalized_identity(plan_row.get("lineId")) if plan_row else ""
        if source_line and plan_line and source_line != plan_line:
            fail("UXML_RVM_LINE_PLAN_CONTRADICTION", f"Source and plan line disagree for {component_id}")
        line_id = source_line or plan_line
        if not line_id:
            fail("UXML_RVM_LINE_MISSING", f"Component {component_id} has no exact line authority")
        decisions[component_id] = {"componentId": component_id, "lineId": line_id, "occurrences": occurrences, "planAssignment": plan_row}
    return decisions

def validate_node_lines(topology: dict[str, Any], inventory: dict[str, Any], lines: dict[str, Any]) -> None:
    for node in topology["nodes"]:
        incident = {lines[clean(inventory["portById"][port_id].get("componentId"))]["lineId"] for port_id in node["sourcePortIds"]}
        if len(incident) != 1:
            fail("UXML_RVM_CROSS_LINE_NODE", f"Logical node {node['logicalNodeId']} joins different lines")
        declared = normalized_identity(node.get("lineId"))
        if declared and declared != next(iter(incident)):
            fail("UXML_RVM_NODE_LINE_CONTRADICTION", f"Logical node {node['logicalNodeId']} line contradicts component ownership")
