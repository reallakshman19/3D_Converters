"""Exact topology, line, node-number, and engineering authority resolution."""
from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

from .uxml_rvm_contracts import (
    ENGINEERING_SCHEMA, UNIT_SCALE_MM, clean, decimal_value, fail, integer_value,
    normalized_identity, require_hash, require_list, require_object,
    require_source_binding, require_strings, transform_point, unique_index, semantic_normalize,
)

LINE_KEYS = {"PIPELINEREF", "LINEKEY", "LINENO"}
FIELD_ALIASES = {
    "OUTSIDE_DIAMETER": {"DIAMETERMM", "OUTSIDEDIAMETERMM", "PIPEODMM", "OUTSIDEDIAMETER", "ODMM", "OD"},
    "WALL_THICKNESS": {"WALLTHICKNESSMM", "WALLTHICKNESS", "WALLTHKMM", "WALLTHK", "WTMM", "WT"},
}
def _key(value: Any) -> str:
    return normalized_identity(value).replace("_", "").replace("-", "").replace(" ", "")

def _source_topology(uxml: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    hints = require_list(uxml.get("topologyHints") or [], "UXML_RVM_TOPOLOGY_HINTS", "topologyHints")
    nodes: list[dict[str, Any]] = []
    connections: list[dict[str, Any]] = []
    for index, item in enumerate(hints):
        hint = require_object(item, "UXML_RVM_TOPOLOGY_HINT", f"topologyHints[{index}]")
        hint_type = normalized_identity(hint.get("hintType") or hint.get("type"))
        confidence = normalized_identity(hint.get("sourceConfidence") or hint.get("confidence"))
        if confidence != "EXACT_SOURCE":
            fail("UXML_RVM_TOPOLOGY_HINT_CONFIDENCE", "Direct topology hints require EXACT_SOURCE confidence")
        evidence = sorted(require_strings(
            hint.get("evidenceReferences"), "UXML_RVM_TOPOLOGY_HINT_EVIDENCE", "evidenceReferences"
        ))
        if hint_type == "EXACT_LOGICAL_NODE":
            nodes.append({
                "logicalNodeId": clean(hint.get("logicalNodeId") or hint.get("id")),
                "sourcePortIds": require_strings(
                    hint.get("sourcePortIds"), "UXML_RVM_TOPOLOGY_HINT_PORTS", "sourcePortIds"
                ),
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
    values: list[int] = []
    aliases = {"NODENUMBER", "ENGINEERINGNODENUMBER"}
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
        authority = clean(connection.get("authority"))
        if authority not in {"APPROVED_EXACT_CONNECTION", "EXACT_SOURCE_CONNECTION"} or clean(connection.get("reconciliation")) not in {"SYMMETRIC", "UNDIRECTED_EXACT"}:
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
        adjacency[left].add(right)
        adjacency[right].add(left)
    for node in nodes:
        ports = list(node["sourcePortIds"])
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

def resolve_topology(
    uxml: dict[str, Any], inventory: dict[str, Any], plan: dict[str, Any] | None, coordinate_context: dict[str, Any]
) -> dict[str, Any]:
    source_nodes, source_connections = _source_topology(uxml) if (uxml.get("topologyHints") or []) else ([], [])
    raw_nodes = plan.get("logicalNodes") if plan else source_nodes
    nodes, _ = unique_index(raw_nodes or [], "logicalNodeId", "UXML_RVM_LOGICAL_NODE_IDENTITY", "logicalNodes")
    if plan and source_nodes:
        source_partition = sorted(sorted(node["sourcePortIds"]) for node in source_nodes)
        plan_partition = sorted(sorted(require_strings(node.get("sourcePortIds"), "UXML_RVM_NODE_PORTS", "sourcePortIds")) for node in nodes)
        if source_partition != plan_partition:
            fail("UXML_RVM_TOPOLOGY_PLAN_SOURCE_CONTRADICTION", "External topology plan contradicts explicit source topology")
    memberships: list[str] = []
    node_numbers: dict[int, str] = {}
    port_to_node: dict[str, str] = {}
    decisions: list[dict[str, Any]] = []
    for node in nodes:
        node_id = clean(node["logicalNodeId"])
        ports = require_strings(node.get("sourcePortIds"), "UXML_RVM_NODE_PORTS", f"{node_id}.sourcePortIds")
        if len(set(ports)) != len(ports):
            fail("UXML_RVM_DUPLICATE_NODE_PORT", f"Logical node {node_id} repeats a port")
        for port_id in ports:
            if port_id not in inventory["portById"]:
                fail("UXML_RVM_MISSING_PORT_REFERENCE", f"Logical node {node_id} references unknown port {port_id}")
            if port_id in port_to_node:
                fail("UXML_RVM_PORT_MULTI_NODE", f"Port {port_id} belongs to two logical nodes")
            port_to_node[port_id] = node_id
        source_numbers = _anchor_numbers(ports, inventory)
        if len(set(source_numbers)) > 1:
            fail("UXML_RVM_SOURCE_NODE_NUMBER_CONFLICT", f"Source anchors disagree for logical node {node_id}")
        external_number = node.get("engineeringNodeNumber") if plan else None
        number = integer_value(external_number, "UXML_RVM_NODE_NUMBER_MISSING", f"{node_id}.engineeringNodeNumber") if external_number not in (None, "") else (source_numbers[0] if source_numbers else None)
        hinted_number = node.get("declaredHintNodeNumber")
        if hinted_number not in (None, "") and source_numbers and integer_value(hinted_number, "UXML_RVM_NODE_NUMBER_CONTRADICTION", f"{node_id}.hintNodeNumber") != source_numbers[0]:
            fail("UXML_RVM_NODE_NUMBER_CONTRADICTION", f"Topology hint and anchor node numbers disagree for {node_id}")
        if number is None:
            fail("UXML_RVM_NODE_NUMBER_MISSING", f"Logical node {node_id} lacks engineering node-number authority")
        if source_numbers and source_numbers[0] != number:
            fail("UXML_RVM_NODE_NUMBER_CONTRADICTION", f"Source and plan node numbers disagree for {node_id}")
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
        missing = sorted(set(inventory["requiredPortIds"]) - set(memberships))
        extra = sorted(set(memberships) - set(inventory["requiredPortIds"]))
        fail("UXML_RVM_PORT_ACCOUNTING", f"Required endpoint membership mismatch; missing={missing}, extra={extra}")
    if plan:
        plan_connections = require_list(plan.get("explicitConnections") or [], "UXML_RVM_CONNECTIONS", "explicitConnections")
        if source_connections:
            source_pairs = sorted(tuple(sorted((row["sourcePortId"], row["targetPortId"]))) for row in source_connections)
            plan_pairs = sorted(tuple(sorted((clean(row.get("sourcePortId")), clean(row.get("targetPortId"))))) for row in plan_connections)
            if source_pairs != plan_pairs:
                fail("UXML_RVM_TOPOLOGY_PLAN_SOURCE_CONTRADICTION", "External connection plan contradicts explicit source connections")
        _validate_connections(decisions, plan_connections)
    else:
        _validate_connections(decisions, source_connections)
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
    decisions: dict[str, Any] = {}
    for component in inventory["components"]:
        component_id = clean(component["id"])
        occurrences = []
        pipeline_ref = clean(component.get("pipelineRef"))
        pipeline_ids = {clean(row.get("id")) for row in inventory["pipelines"]}
        component_scope = {key: value for key, value in component.items() if not (key == "pipelineRef" and pipeline_ref in pipeline_ids)}
        for origin_name, origin in (("component", component_scope), ("rawAttributes", component.get("rawAttributes") or {}), ("normalized", component.get("normalized") or {}), ("derived", component.get("derived") or {})):
            occurrences += _alias_occurrences(origin, LINE_KEYS, f"{component_id}.{origin_name}")
        for pipeline in inventory["pipelines"]:
            if pipeline_ref and pipeline_ref in {clean(pipeline.get("id")), clean(pipeline.get("pipelineRef"))}:
                occurrences += _alias_occurrences(pipeline, LINE_KEYS, f"pipeline:{pipeline.get('id')}")
        normalized = {normalized_identity(item["value"]) for item in occurrences}
        if len(normalized) > 1:
            fail("UXML_RVM_LINE_ALIAS_CONFLICT", f"Component {component_id} has contradictory line aliases")
        source_line = next(iter(normalized), "")
        plan_row = assignment_by_component.get(component_id)
        plan_line = normalized_identity(plan_row.get("lineId")) if plan_row else ""
        if source_line and plan_line and source_line != plan_line:
            fail("UXML_RVM_LINE_PLAN_CONTRADICTION", f"Source and plan line disagree for {component_id}")
        line_id = source_line or plan_line
        if not line_id:
            fail("UXML_RVM_LINE_MISSING", f"Component {component_id} has no exact line authority")
        decisions[component_id] = {"componentId": component_id, "lineId": line_id, "occurrences": occurrences, "planAssignment": plan_row}
    return decisions

def validate_engineering_context(artifact: Any, source_hash: str, source_kind: str) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        return None, ""
    context = require_object(artifact, "UXML_RVM_ENGINEERING_CONTEXT_SHAPE", "engineering context")
    if clean(context.get("schema")) != ENGINEERING_SCHEMA:
        fail("UXML_RVM_ENGINEERING_SCHEMA", f"Expected {ENGINEERING_SCHEMA}")
    require_source_binding(context, source_hash, source_kind, "UXML_RVM_ENGINEERING_SOURCE_BINDING")
    if clean(context.get("authorityType")) != "APPROVED_ENGINEERING_CONTEXT":
        fail("UXML_RVM_ENGINEERING_AUTHORITY", "Unknown engineering authority type")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_ENGINEERING_EVIDENCE", "evidenceReferences")
    digest = require_hash(context, "engineeringContextHashSha256", "UXML_RVM_ENGINEERING_HASH")
    return semantic_normalize(context), digest

def resolve_engineering(uxml: dict[str, Any], inventory: dict[str, Any], context: dict[str, Any] | None) -> dict[str, Any]:
    decisions = context.get("componentDecisions") if context else []
    rows = require_list(decisions or [], "UXML_RVM_ENGINEERING_DECISIONS", "componentDecisions")
    external: dict[tuple[str, str], dict[str, Any]] = {}
    for index, item in enumerate(rows):
        row = require_object(item, "UXML_RVM_ENGINEERING_DECISION", f"componentDecisions[{index}]")
        key = (clean(row.get("componentId")), normalized_identity(row.get("field")))
        if key in external:
            fail("UXML_RVM_ENGINEERING_DUPLICATE_DECISION", f"Duplicate engineering decision {key}")
        if key[0] not in inventory["componentById"] or key[1] not in FIELD_ALIASES:
            fail("UXML_RVM_ENGINEERING_DECISION_REFERENCE", f"Unknown engineering decision target {key}")
        if key[0] not in inventory["pipeComponentIds"]:
            fail("UXML_RVM_ENGINEERING_DECISION_REFERENCE", f"Engineering projection is not approved for {key[0]}")
        if clean(row.get("authority")) != "APPROVED_ENGINEERING_FIELD_DECISION":
            fail("UXML_RVM_ENGINEERING_FIELD_AUTHORITY", f"Unknown field authority for {key}")
        if not clean(row.get("sourceOccurrence")):
            fail("UXML_RVM_ENGINEERING_SOURCE_OCCURRENCE", f"Engineering decision {key} lacks sourceOccurrence")
        disposition = normalized_identity(row.get("disposition"))
        if disposition not in {"EMIT_CANONICAL", "EXPLICIT_ABSENCE"}:
            fail("UXML_RVM_ENGINEERING_DISPOSITION", f"Unknown engineering disposition for {key}")
        if disposition == "EXPLICIT_ABSENCE":
            if row.get("value") not in (None, "") or row.get("canonicalValue") not in (None, ""):
                fail("UXML_RVM_ENGINEERING_EXPLICIT_ABSENCE", f"Explicit absence for {key} cannot carry a value")
        elif row.get("value") in (None, "") or row.get("canonicalValue") in (None, "") or not clean(row.get("unit")):
            fail("UXML_RVM_ENGINEERING_FIELD_SHAPE", f"Engineering decision {key} requires value, canonicalValue, and unit")
        require_strings(row.get("evidenceReferences"), "UXML_RVM_ENGINEERING_FIELD_EVIDENCE", "field evidenceReferences")
        external[key] = row
    resolved: dict[str, Any] = {}
    source_unit = clean((uxml.get("units") or {}).get("length") or "MM").upper()
    if source_unit not in UNIT_SCALE_MM:
        fail("UXML_RVM_ENGINEERING_UNITS", f"Unsupported source length unit {source_unit}")
    for component_id in inventory["pipeComponentIds"]:
        component = inventory["componentById"][component_id]
        fields: dict[str, Any] = {}
        for field, aliases in FIELD_ALIASES.items():
            occurrences = []
            for origin_name, origin in (("component", component), ("rawAttributes", component.get("rawAttributes") or {}), ("normalized", component.get("normalized") or {}), ("derived", component.get("derived") or {})):
                occurrences += _alias_occurrences(origin, aliases, f"{component_id}.{origin_name}")
            source_values = [decimal_value(item["value"], "UXML_RVM_ENGINEERING_VALUE", f"{item['origin']}.{item['spelling']}") * UNIT_SCALE_MM[source_unit] for item in occurrences]
            if len(set(source_values)) > 1:
                fail("UXML_RVM_ENGINEERING_ALIAS_CONFLICT", f"Component {component_id} has contradictory {field} aliases")
            source_value = source_values[0] if source_values else None
            external_row = external.get((component_id, field))
            external_value = None
            if external_row:
                if normalized_identity(external_row.get("disposition")) == "EXPLICIT_ABSENCE":
                    external_value = None
                else:
                    unit = clean(external_row.get("unit")).upper()
                    if unit not in UNIT_SCALE_MM:
                        fail("UXML_RVM_ENGINEERING_UNITS", f"Unsupported unit {unit} for {component_id}.{field}")
                    external_value = decimal_value(external_row.get("value"), "UXML_RVM_ENGINEERING_VALUE", f"{component_id}.{field}") * UNIT_SCALE_MM[unit]
                    canonical = decimal_value(external_row.get("canonicalValue"), "UXML_RVM_ENGINEERING_CANONICAL", f"{component_id}.{field}.canonicalValue")
                    if canonical != external_value:
                        fail("UXML_RVM_ENGINEERING_CANONICAL", f"Canonical value mismatch for {component_id}.{field}")
            if source_value is not None and external_value is not None and source_value != external_value:
                fail("UXML_RVM_ENGINEERING_OVERRIDE", f"External evidence contradicts source {component_id}.{field}")
            final = source_value if source_value is not None else external_value
            if final is None:
                fail("UXML_RVM_ENGINEERING_REQUIRED_MISSING", f"PIPE {component_id} lacks required {field}")
            if final <= 0:
                fail("UXML_RVM_ENGINEERING_NONPOSITIVE", f"PIPE {component_id} requires positive {field}")
            fields[field] = {"canonicalValueMm": final, "sourceOccurrences": occurrences, "externalDecision": external_row}
        resolved[component_id] = fields
    return resolved

def validate_node_lines(topology: dict[str, Any], inventory: dict[str, Any], lines: dict[str, Any]) -> None:
    for node in topology["nodes"]:
        incident = {lines[clean(inventory["portById"][port_id].get("componentId"))]["lineId"] for port_id in node["sourcePortIds"]}
        if len(incident) != 1:
            fail("UXML_RVM_CROSS_LINE_NODE", f"Logical node {node['logicalNodeId']} joins different lines")
        declared = normalized_identity(node.get("lineId"))
        if declared and declared != next(iter(incident)):
            fail("UXML_RVM_NODE_LINE_CONTRADICTION", f"Logical node {node['logicalNodeId']} line contradicts component ownership")
