"""Independent relational source-accounting proof for UXML/RVM projection."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from .uxml_rvm_contracts import (
    ACCOUNTING_SCHEMA, clean, normalized_identity, semantic_hash, sha256_bytes,
    stable_json_bytes, transform_point, unique_index,
)

_COLLECTIONS = (
    "sources", "mappings", "pipelines", "components", "anchors", "ports",
    "segments", "supports", "topologyHints", "rayEvidence", "lossContract",
    "diagnostics",
)


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(Decimal("0") if value == 0 else value, "f")
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _safe_id(value: str) -> str:
    import re
    raw = re.sub(r"[^A-Za-z0-9_.-]+", "-", clean(value)) or "UXML-PIPE"
    return raw if re.match(r"[A-Za-z_]", raw) else f"UXML-{raw}"


def _identity(name: str, row: Any) -> str:
    if isinstance(row, dict):
        for field in ("id", "componentId", "rowId", "rowNo", "refNo", "CA97"):
            if clean(row.get(field)):
                return clean(row[field])
    return f"sha256:{sha256_bytes(stable_json_bytes(row))}"


def _collection_accounting(name: str, rows: list[Any]) -> dict[str, Any]:
    identities = [_identity(name, row) for row in rows]
    return {
        "expectedCount": len(rows),
        "actualCount": len(rows),
        "uniqueIdentityCount": len(set(identities)),
        "duplicateCount": len(identities) - len(set(identities)),
        "orderedIdentitySequence": identities,
        "semanticHashSha256": sha256_bytes(stable_json_bytes(rows)),
    }


def expected_elements(
    inventory: dict[str, Any], topology: dict[str, Any], lines: dict[str, Any],
    engineering: dict[str, Any], coordinate_context: dict[str, Any],
) -> list[dict[str, Any]]:
    node_number = {node["logicalNodeId"]: node["engineeringNodeNumber"] for node in topology["nodes"]}
    records = []
    for component_id in inventory["pipeComponentIds"]:
        component_ports = [port for port in inventory["ports"] if clean(port.get("componentId")) == component_id]
        role_to_port = {normalized_identity(port.get("role")): port for port in component_ports}
        start, end = role_to_port["PIPE_END_1"], role_to_port["PIPE_END_2"]
        start_id, end_id = clean(start["id"]), clean(end["id"])
        start_node, end_node = topology["portToNode"][start_id], topology["portToNode"][end_id]
        start_point = transform_point(start.get("point"), coordinate_context)
        end_point = transform_point(end.get("point"), coordinate_context)
        delta = {axis: end_point[axis] - start_point[axis] for axis in ("x", "y", "z")}
        if start_node == end_node:
            from .uxml_rvm_contracts import fail
            fail("UXML_RVM_PIPE_NODE_COLLAPSE", f"PIPE {component_id} endpoints share one logical node")
        if all(value == 0 for value in delta.values()):
            from .uxml_rvm_contracts import fail
            fail("UXML_RVM_ZERO_LENGTH_PIPE", f"PIPE {component_id} is zero length after transformation")
        fields = engineering[component_id]
        records.append({
            "elementId": _safe_id(component_id), "componentId": component_id,
            "lineId": lines[component_id]["lineId"],
            "fromPortId": start_id, "toPortId": end_id,
            "fromLogicalNodeId": start_node, "toLogicalNodeId": end_node,
            "fromNodeNumber": node_number[start_node], "toNodeNumber": node_number[end_node],
            "fromCoordinate": start_point, "toCoordinate": end_point, "delta": delta,
            "outsideDiameterMm": fields["OUTSIDE_DIAMETER"]["canonicalValueMm"],
            "wallThicknessMm": fields["WALL_THICKNESS"]["canonicalValueMm"],
        })
    records.sort(key=lambda row: (
        row["lineId"], row["fromNodeNumber"], row["toNodeNumber"], row["componentId"]
    ))
    return _jsonable(records)


def _different(expected: Any, actual: Any) -> int:
    return 0 if expected == actual else 1


def _bridge_hash_invariants(bridge: dict[str, Any], uxml: dict[str, Any]) -> dict[str, int]:
    inventory_doc = {name: uxml.get(name) or [] for name in _COLLECTIONS if name != "diagnostics"}
    expected = {
        "adaptedUxmlHashSha256": sha256_bytes(stable_json_bytes(uxml)),
        "sourceInventoryHashSha256": sha256_bytes(stable_json_bytes(inventory_doc)),
        "componentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("components") or [])),
        "anchorHashSha256": sha256_bytes(stable_json_bytes(uxml.get("anchors") or [])),
        "portHashSha256": sha256_bytes(stable_json_bytes(uxml.get("ports") or [])),
        "segmentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("segments") or [])),
        "pipelineHashSha256": sha256_bytes(stable_json_bytes(uxml.get("pipelines") or [])),
        "diagnosticHashSha256": sha256_bytes(stable_json_bytes(bridge.get("diagnostics") or [])),
    }
    return {
        "bridgeAdaptedUxmlHashMismatch": _different(expected["adaptedUxmlHashSha256"], clean(bridge.get("adaptedUxmlHashSha256"))),
        "bridgeSourceInventoryHashMismatch": _different(expected["sourceInventoryHashSha256"], clean(bridge.get("sourceInventoryHashSha256"))),
        "bridgeCollectionHashMismatch": sum(
            expected[field] != clean(bridge.get(field)) for field in (
                "componentHashSha256", "anchorHashSha256", "portHashSha256",
                "segmentHashSha256", "pipelineHashSha256",
            )
        ),
        "bridgeDiagnosticHashMismatch": _different(expected["diagnosticHashSha256"], clean(bridge.get("diagnosticHashSha256"))),
    }


def build_accounting_proof(
    *, source_hash: str, source_kind: str, bridge_result: dict[str, Any],
    uxml: dict[str, Any], inventory: dict[str, Any], coordinate_hash: str,
    topology_hash: str, engineering_hash: str, topology: dict[str, Any],
    lines: dict[str, Any], engineering: dict[str, Any], coordinate_context: dict[str, Any],
    canonical_elements: list[dict[str, Any]], unsupported_component_ids: list[str],
) -> dict[str, Any]:
    actual_elements, _ = unique_index(
        canonical_elements, "elementId", "UXML_RVM_ELEMENT_IDENTITY", "canonicalElements"
    )
    port_nodes = {port: node["logicalNodeId"] for node in topology["nodes"] for port in node["sourcePortIds"]}
    number_owner = {node["engineeringNodeNumber"]: node["logicalNodeId"] for node in topology["nodes"]}
    reconstructed = {**topology, "portToNode": port_nodes, "nodeNumberOwner": number_owner}
    expected = expected_elements(inventory, reconstructed, lines, engineering, coordinate_context)
    actual = _jsonable(actual_elements)
    source_components = sorted(clean(row.get("id")) for row in inventory["components"])
    source_ports = sorted(clean(row.get("id")) for row in inventory["ports"])
    unsupported = sorted(unsupported_component_ids)
    emitted_components = sorted(row["componentId"] for row in expected)
    decided_components = sorted(emitted_components + unsupported)
    decided_ports = sorted(set(topology["portToNode"]) | {
        clean(port.get("id")) for port in inventory["ports"]
        if clean(port.get("componentId")) in unsupported
    })
    collections = {
        "rvmRows": _collection_accounting("rvmRows", bridge_result.get("rows") or []),
        **{name: _collection_accounting(name, list(uxml.get(name) or [])) for name in _COLLECTIONS},
    }
    component_ports = sorted((clean(row.get("componentId")), clean(row.get("id"))) for row in inventory["ports"])
    component_anchors = sorted((clean(row.get("componentId")), clean(row.get("id"))) for row in inventory["anchors"])
    component_segments = sorted((clean(row.get("componentId")), clean(row.get("id"))) for row in inventory["segments"])
    port_anchors = sorted((clean(row.get("id")), clean(row.get("anchorId"))) for row in inventory["ports"])
    node_numbers = sorted((row["logicalNodeId"], row["engineeringNodeNumber"]) for row in topology["nodes"])
    line_relations = sorted((component_id, row["lineId"]) for component_id, row in lines.items())
    transformed_ports = sorted((
        clean(port.get("id")), _jsonable(port.get("point")), _jsonable(transform_point(port.get("point"), coordinate_context))
    ) for port in inventory["ports"])
    engineering_relations = sorted((
        component_id, field, _jsonable(decision["canonicalValueMm"])
    ) for component_id, fields in engineering.items() for field, decision in fields.items())
    duplicate_count = sum(row["duplicateCount"] for name, row in collections.items() if name not in {"diagnostics", "rvmRows"})
    invariants = {
        "sourceIdentityDuplicateMismatch": duplicate_count,
        "sourceComponentDecisionMismatch": _different(source_components, decided_components),
        "sourcePortDecisionMismatch": _different(source_ports, decided_ports),
        "componentPortOwnershipMismatch": _different(len(component_ports), len(source_ports)),
        "componentAnchorOwnershipMismatch": _different(len(component_anchors), len(inventory["anchors"])),
        "componentSegmentOwnershipMismatch": _different(len(component_segments), len(inventory["segments"])),
        "portAnchorOwnershipMismatch": sum(
            clean(inventory["anchorById"][clean(port.get("anchorId"))].get("componentId"))
            != clean(port.get("componentId")) for port in inventory["ports"]
        ),
        "portLogicalNodeOwnershipMismatch": 0 if sorted(topology.get("portToNode", {}).items()) == sorted(port_nodes.items()) and sorted(port_nodes) == sorted(inventory["requiredPortIds"]) else 1,
        "logicalNodeNumberOwnershipMismatch": 0 if topology.get("nodeNumberOwner", {}) == number_owner and len(node_numbers) == len({number for _, number in node_numbers}) else 1,
        "componentLineOwnershipMismatch": 0 if sorted(lines) == source_components else 1,
        "componentCanonicalElementOwnershipMismatch": _different(emitted_components, sorted(inventory["pipeComponentIds"])),
        "canonicalElementCardinalityMismatch": _different(len(actual), len(expected)),
        "canonicalElementRelationMismatch": _different(expected, actual),
        "sourceCoordinateTransformMismatch": _different(
            [(row["fromCoordinate"], row["toCoordinate"], row["delta"]) for row in expected],
            [(row.get("fromCoordinate"), row.get("toCoordinate"), row.get("delta")) for row in actual],
        ),
        "engineeringFieldDecisionMismatch": _different(
            [(row["outsideDiameterMm"], row["wallThicknessMm"]) for row in expected],
            [(row.get("outsideDiameterMm"), row.get("wallThicknessMm")) for row in actual],
        ),
        "unsupportedBlockingDispositionMismatch": 0 if set(unsupported) == set(source_components) - set(inventory["pipeComponentIds"]) else 1,
        "bridgeSourceHashMismatch": 0 if clean(bridge_result.get("sourceByteHashSha256")) == source_hash else 1,
        **_bridge_hash_invariants(bridge_result, uxml),
    }
    proof = {
        "schema": ACCOUNTING_SCHEMA,
        "sourceHashSha256": source_hash,
        "sourceKind": source_kind,
        "adaptedUxmlHashSha256": bridge_result["adaptedUxmlHashSha256"],
        "sourceInventoryHashSha256": bridge_result["sourceInventoryHashSha256"],
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "sourceCollectionAccounting": collections,
        "orderedIdentities": {
            "logicalNodes": [node["logicalNodeId"] for node in topology["nodes"]],
            "nodeDecisions": [f"{node}:{number}" for node, number in node_numbers],
            "lineDecisions": [f"{component}:{line}" for component, line in line_relations],
            "fieldDecisions": [f"{component}:{field}" for component, field, _ in engineering_relations],
            "canonicalElements": [row["elementId"] for row in actual],
            "unsupportedRecords": unsupported,
        },
        "relations": {
            "componentToAnchors": component_anchors,
            "componentToPorts": component_ports,
            "componentToSegments": component_segments,
            "portToAnchor": port_anchors,
            "portToLogicalNode": sorted(port_nodes.items()),
            "logicalNodeToNodeNumber": node_numbers,
            "componentToLine": line_relations,
            "componentToCanonicalElement": sorted((row["componentId"], row["elementId"]) for row in expected),
            "sourceCoordinateToTransformedCoordinate": transformed_ports,
            "engineeringSourceToCanonicalField": engineering_relations,
        },
        "authorityArtifacts": {
            "coordinateContextHashSha256": coordinate_hash,
            "topologyPlanHashSha256": topology_hash,
            "engineeringContextHashSha256": engineering_hash,
            "bridgeRequestHashSha256": bridge_result["requestHashSha256"],
            "bridgeResultHashSha256": bridge_result["resultHashSha256"],
        },
        "expectedCanonicalElements": expected,
        "actualCanonicalElements": actual,
        "unsupportedComponentIds": unsupported,
        "invariants": invariants,
    }
    proof["accountingProofHashSha256"] = semantic_hash(proof, "accountingProofHashSha256")
    return proof


def accounting_is_closed(proof: dict[str, Any]) -> bool:
    return all(value == 0 for value in proof.get("invariants", {}).values())


def accounting_bytes(proof: dict[str, Any]) -> bytes:
    return stable_json_bytes(proof)
