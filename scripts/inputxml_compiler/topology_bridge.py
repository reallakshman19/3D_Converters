#!/usr/bin/env python3
"""Semantic verification for the strict Root topology bridge."""
from __future__ import annotations

import hashlib
import json
from typing import Any

from .base import CompileBlocked, DecisionLedger
from .topology_bridge_io import (
    node_executable,
    request_bytes,
    run_bridge,
    strict_json_object,
)
from .topology_diagnostics import block, diagnose, diagnostic_policy

_ENGINE_IDENTITY = "strict-root-topology-engine"
_ENGINE_VERSION = "1.0.0"
_RESULT_SCHEMA = "InputXmlTopologyBridgeResult.v1"
_MAX_DIAGNOSTICS = 1000
_RESULT_FIELDS = {
    "schema",
    "resolutionStatus",
    "engineIdentity",
    "engineVersion",
    "profileId",
    "adapterId",
    "sourceHashSha256",
    "nodes",
    "edges",
    "components",
    "auxiliaries",
    "elementMappings",
    "nodeMappings",
    "topologyProof",
    "diagnostics",
    "metrics",
}
_PROHIBITED_METRICS = {
    "duplicateNodeDroppedCount": "PROHIBITED_COORDINATE_COALESCING",
    "fillerCount": "PROHIBITED_FILLER_TOPOLOGY",
    "shortFillerCount": "PROHIBITED_FILLER_TOPOLOGY",
    "rayFillerCount": "PROHIBITED_FILLER_TOPOLOGY",
    "raySplitNodeCount": "PROHIBITED_FILLER_TOPOLOGY",
    "syntheticNodeCount": "SYNTHETIC_NODE_PROHIBITED",
    "droppedRouteNodeCount": "BRIDGE_MAPPING_INCOMPLETE",
}


def invoke_topology_bridge(
    request: dict[str, Any],
    *,
    context: dict[str, Any],
    ledger: DecisionLedger,
) -> dict[str, Any]:
    completed = run_bridge(
        node_executable(context, ledger),
        request_bytes(request),
        ledger,
    )
    result = strict_json_object(completed.stdout, ledger)
    _verify_result(request, result, ledger)
    _record_bridge_proof(result, ledger)
    return result


def _verify_result(
    request: dict[str, Any],
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    _verify_result_shape(request, result, ledger)
    diagnostics = result.get("diagnostics")
    if not isinstance(diagnostics, list) or len(diagnostics) > _MAX_DIAGNOSTICS:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            "Bridge diagnostics must be a bounded array.",
            "topology-bridge",
        )
    if result.get("resolutionStatus") == "BLOCKED":
        _record_blocked_result(diagnostics, ledger)
    if result.get("resolutionStatus") != "RESOLVED" or diagnostics:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            "Bridge result status/diagnostics are contradictory.",
            "topology-bridge",
        )
    _verify_metrics(result.get("metrics"), ledger)
    _verify_mappings(request, result, ledger)
    _verify_topology_hash(result, ledger)


def _verify_result_shape(
    request: dict[str, Any],
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    missing = sorted(_RESULT_FIELDS - set(result))
    extra = sorted(set(result) - _RESULT_FIELDS)
    if missing or extra:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Bridge result field mismatch: missing={missing}, extra={extra}.",
            "topology-bridge",
        )
    expected = {
        "schema": _RESULT_SCHEMA,
        "engineIdentity": _ENGINE_IDENTITY,
        "engineVersion": _ENGINE_VERSION,
        "profileId": request["profileId"],
        "adapterId": request["adapterId"],
    }
    for field, value in expected.items():
        if result.get(field) != value:
            block(
                ledger,
                "BRIDGE_CONTRACT_INVALID",
                f"Bridge result {field} does not match request/runtime authority.",
                "topology-bridge",
                expected=value,
                actual=result.get(field),
            )
    if result.get("sourceHashSha256") != request.get("sourceHashSha256"):
        block(
            ledger,
            "BRIDGE_SOURCE_HASH_MISMATCH",
            "Bridge result source hash differs from the request source hash.",
            "topology-bridge",
        )


def _record_blocked_result(
    diagnostics: list[dict[str, Any]],
    ledger: DecisionLedger,
) -> None:
    if not diagnostics:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            "A blocked bridge result requires structured diagnostics.",
            "topology-bridge",
        )
    for row in diagnostics:
        if not isinstance(row, dict):
            block(
                ledger,
                "BRIDGE_CONTRACT_INVALID",
                "Bridge diagnostic entries must be objects.",
                "topology-bridge",
            )
        code = _registered_bridge_code(row)
        source_id = str(row.get("sourceEntityId") or "topology-bridge")
        message = str(row.get("message") or code)
        ledger.add(
            source_entity_id=source_id,
            source_type="STRICT_TOPOLOGY_BRIDGE_DIAGNOSTIC",
            source_fields=row,
            projection_cardinality="1_TO_0",
            disposition="REJECT_INVALID",
            diagnostics=[message],
        )
        diagnose(ledger, code, message, source_id)
    raise CompileBlocked("Strict topology bridge returned a blocked result.")


def _registered_bridge_code(row: dict[str, Any]) -> str:
    code = str(row.get("code") or "")
    try:
        diagnostic_policy(code)
    except RuntimeError:
        return "BRIDGE_CONTRACT_INVALID"
    return code


def _verify_metrics(value: Any, ledger: DecisionLedger) -> None:
    if not isinstance(value, dict):
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            "Bridge metrics must be an object.",
            "topology-bridge",
        )
    for field, code in _PROHIBITED_METRICS.items():
        if value.get(field) != 0:
            block(
                ledger,
                code,
                f"Prohibited strict-topology metric {field}={value.get(field)!r}.",
                "topology-bridge",
            )


def _verify_mappings(
    request: dict[str, Any],
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    source_nodes = [
        node["sourcePath"]
        for branch in request["branches"]
        for node in branch["nodes"]
    ]
    expected_edges = sum(len(branch["nodes"]) - 1 for branch in request["branches"])
    node_mappings = result.get("nodeMappings")
    element_mappings = result.get("elementMappings")
    if not isinstance(node_mappings, list) or not isinstance(element_mappings, list):
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge mappings must be arrays.",
            "topology-bridge",
        )
    mapped_nodes = [str(row.get("sourceNodePath") or "") for row in node_mappings]
    if mapped_nodes != source_nodes or len(set(mapped_nodes)) != len(mapped_nodes):
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge node mapping does not exactly cover ordered source node occurrences.",
            "topology-bridge",
        )
    if len(element_mappings) != expected_edges:
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge element mapping count differs from authoritative adjacency count.",
            "topology-bridge",
        )
    canonical_ids = [str(row.get("canonicalElementId") or "") for row in element_mappings]
    if not all(canonical_ids) or len(set(canonical_ids)) != len(canonical_ids):
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge canonical element mappings are missing or duplicated.",
            "topology-bridge",
        )
    _verify_proof_counts(
        request,
        result.get("topologyProof"),
        len(source_nodes),
        expected_edges,
        ledger,
    )


def _verify_proof_counts(
    request: dict[str, Any],
    proof: Any,
    node_count: int,
    edge_count: int,
    ledger: DecisionLedger,
) -> None:
    if not isinstance(proof, dict):
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge topology proof is missing.",
            "topology-bridge",
        )
    if proof.get("sourceInventorySummary") != request.get("sourceInventorySummary"):
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge topology proof inventory summary differs from the request.",
            "topology-bridge",
        )
    expected = {
        "logicalNodeCount": node_count,
        "logicalEdgeCount": edge_count,
        "nodeMappingCount": node_count,
        "elementMappingCount": edge_count,
        "unresolvedEdgeCount": 0,
        "unresolvedOwnershipCount": 0,
        "syntheticTopologyCount": 0,
    }
    for field, value in expected.items():
        if proof.get(field) != value:
            block(
                ledger,
                "BRIDGE_MAPPING_INCOMPLETE",
                f"Bridge topology proof {field} mismatch.",
                "topology-bridge",
                expected=value,
                actual=proof.get(field),
            )


def _verify_topology_hash(
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    value = {
        key: result[key]
        for key in (
            "nodes",
            "edges",
            "components",
            "auxiliaries",
            "nodeMappings",
            "elementMappings",
        )
    }
    raw = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")
    actual = hashlib.sha256(raw).hexdigest()
    expected = result["topologyProof"].get("topologyHashSha256")
    if actual != expected:
        block(
            ledger,
            "BRIDGE_MAPPING_INCOMPLETE",
            "Bridge topology proof hash does not match the structured mappings.",
            "topology-bridge",
            expected=expected,
            actual=actual,
        )


def _record_bridge_proof(
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    ledger.add(
        source_entity_id="topology-bridge-proof",
        source_type="STRICT_TOPOLOGY_BRIDGE_PROOF",
        source_fields={
            "engineIdentity": result["engineIdentity"],
            "engineVersion": result["engineVersion"],
            "sourceHashSha256": result["sourceHashSha256"],
            "topologyProof": result["topologyProof"],
            "metrics": result["metrics"],
        },
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION",
        evidence=[
            "versioned JSON-only bridge result independently verified by Python",
            "all prohibited topology-operation metrics are exactly zero",
        ],
    )


# Kept as stable test hooks for duplicate-key/trailing-output and mapping tamper proof.
_strict_json_object = strict_json_object


__all__ = ["invoke_topology_bridge"]
