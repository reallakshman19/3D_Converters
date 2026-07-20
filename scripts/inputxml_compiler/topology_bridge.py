#!/usr/bin/env python3
"""Bounded JSON subprocess contract for the strict Root topology engine."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .base import CompileBlocked, DecisionLedger
from .topology_diagnostics import block, diagnose, diagnostic_policy


_BRIDGE_SCRIPT = Path(__file__).with_name("node_xml_builder_bridge.cjs")
_ENGINE_IDENTITY = "strict-root-topology-engine"
_ENGINE_VERSION = "1.0.0"
_REQUEST_SCHEMA = "InputXmlTopologyBridgeRequest.v1"
_RESULT_SCHEMA = "InputXmlTopologyBridgeResult.v1"
_MAX_REQUEST_BYTES = 8 * 1024 * 1024
_MAX_STDOUT_BYTES = 8 * 1024 * 1024
_MAX_STDERR_BYTES = 64 * 1024
_MAX_DIAGNOSTICS = 1000
_TIMEOUT_SECONDS = 10
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
    payload = _request_bytes(request)
    node = _node_executable(context, ledger)
    completed = _run_bridge(node, payload, ledger)
    result = _strict_json_object(completed.stdout, ledger)
    _verify_result(request, result, ledger)
    _record_bridge_proof(result, ledger)
    return result


def _request_bytes(request: dict[str, Any]) -> bytes:
    if request.get("schema") != _REQUEST_SCHEMA:
        raise CompileBlocked("Internal topology request schema mismatch.")
    payload = json.dumps(
        request,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")
    if len(payload) > _MAX_REQUEST_BYTES:
        raise CompileBlocked(
            f"Topology bridge request exceeds {_MAX_REQUEST_BYTES} bytes."
        )
    return payload


def _node_executable(
    context: dict[str, Any],
    ledger: DecisionLedger,
) -> str:
    configured = str(context.get("nodeExecutable") or "node").strip()
    path = shutil.which(configured)
    if path is None:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge requires Node.js executable {configured!r}.",
            "topology-bridge",
        )
    if not _BRIDGE_SCRIPT.is_file():
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge script is missing: {_BRIDGE_SCRIPT}.",
            "topology-bridge",
        )
    return str(Path(path).resolve())


def _run_bridge(
    node: str,
    payload: bytes,
    ledger: DecisionLedger,
) -> subprocess.CompletedProcess[bytes]:
    allowed_env = {
        key: os.environ[key]
        for key in ("SystemRoot", "WINDIR")
        if key in os.environ
    }
    process = subprocess.Popen(
        [node, str(_BRIDGE_SCRIPT)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=allowed_env,
        shell=False,
    )
    try:
        stdout, stderr = process.communicate(payload, timeout=_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as exc:
        process.kill()
        process.communicate()
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge exceeded {_TIMEOUT_SECONDS} seconds.",
            "topology-bridge",
        )
        raise CompileBlocked("Topology bridge timeout.") from exc
    if len(stdout) > _MAX_STDOUT_BYTES:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge stdout exceeds {_MAX_STDOUT_BYTES} bytes.",
            "topology-bridge",
        )
    if len(stderr) > _MAX_STDERR_BYTES:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge stderr exceeds {_MAX_STDERR_BYTES} bytes.",
            "topology-bridge",
        )
    if process.returncode != 0:
        detail = stderr.decode("utf-8", errors="replace").strip()
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge internal failure {process.returncode}: {detail}",
            "topology-bridge",
        )
    return subprocess.CompletedProcess(
        [node, str(_BRIDGE_SCRIPT)], process.returncode, stdout, stderr
    )


def _reject_duplicate_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def _strict_json_object(raw: bytes, ledger: DecisionLedger) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", errors="strict")
        decoder = json.JSONDecoder(object_pairs_hook=_reject_duplicate_pairs)
        value, end = decoder.raw_decode(text)
        if text[end:].strip():
            raise ValueError("extra trailing bridge output")
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            f"Strict topology bridge returned invalid JSON: {exc}",
            "topology-bridge",
        )
    if not isinstance(value, dict):
        block(
            ledger,
            "BRIDGE_CONTRACT_INVALID",
            "Strict topology bridge result must be one JSON object.",
            "topology-bridge",
        )
    return value


def _verify_result(
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
        code = str(row.get("code") or "")
        try:
            diagnostic_policy(code)
        except RuntimeError:
            code = "BRIDGE_CONTRACT_INVALID"
        ledger.add(
            source_entity_id=str(row.get("sourceEntityId") or "topology-bridge"),
            source_type="STRICT_TOPOLOGY_BRIDGE_DIAGNOSTIC",
            source_fields=row,
            projection_cardinality="1_TO_0",
            disposition="REJECT_INVALID",
            diagnostics=[str(row.get("message") or code)],
        )
        diagnose(
            ledger,
            code,
            str(row.get("message") or code),
            str(row.get("sourceEntityId") or "topology-bridge"),
        )
    raise CompileBlocked("Strict topology bridge returned a blocked result.")


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
    proof = result.get("topologyProof")
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
        "logicalNodeCount": len(source_nodes),
        "logicalEdgeCount": expected_edges,
        "nodeMappingCount": len(source_nodes),
        "elementMappingCount": expected_edges,
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


def _verify_topology_hash(result: dict[str, Any], ledger: DecisionLedger) -> None:
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


__all__ = ["invoke_topology_bridge"]
