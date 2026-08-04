from __future__ import annotations
import copy
import json
import os
import subprocess
from pathlib import Path
from typing import Any
from scripts.inputxml_compiler.uxml_rvm_accounting import build_accounting_proof, expected_elements
from scripts.inputxml_compiler.uxml_rvm_authority import (
    resolve_engineering, resolve_lines, resolve_topology,
    validate_engineering_context, validate_node_lines,
)
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    COORDINATE_SCHEMA, ENGINEERING_SCHEMA, METADATA_SCHEMA, TOPOLOGY_SCHEMA,
    build_bridge_request, decode_source, semantic_hash, sha256_bytes,
    stable_json_bytes, strict_json_loads, validate_canonical_metadata,
    validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_inventory import source_inventory, validate_topology_plan, verify_bridge_result
from scripts.inputxml_compiler.uxml_rvm_manifest import MANIFEST_SCHEMA, validate_authority_manifest
from scripts.inputxml_compiler.uxml_rvm_trust import (
    APPROVAL_KEY_ENV, APPROVAL_KEY_ID_ENV, approval_mac, manifest_hash,
)

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "inputxml" / "uxml-rvm"
BRIDGE = ROOT / "scripts" / "inputxml_compiler" / "node_uxml_rvm_bridge.mjs"
EMPTY_HASH = sha256_bytes(b"")
TEST_APPROVAL_KEY = "pr9-focused-owner-approval-key"
TEST_APPROVAL_KEY_ID = "PR9-TEST-OWNER-V1"
os.environ[APPROVAL_KEY_ENV] = TEST_APPROVAL_KEY
os.environ[APPROVAL_KEY_ID_ENV] = TEST_APPROVAL_KEY_ID

def fixture(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()

def coordinate_context(source: bytes, source_kind: str, **overrides: Any) -> dict[str, Any]:
    value = {
        "schema": COORDINATE_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "CC-TEST",
        "authorityType": "APPROVED_COORDINATE_CONTEXT", "sourceFrameId": "RVM_WORLD",
        "targetFrameId": "CAESAR_GLOBAL", "sourceCoordinateUnits": "MM",
        "targetCoordinateUnits": "MM",
        "axisMap": {
            "targetX": {"sourceAxis": "X", "sign": 1},
            "targetY": {"sourceAxis": "Y", "sign": 1},
            "targetZ": {"sourceAxis": "Z", "sign": 1},
        },
        "scaleToMillimetres": 1, "offsetMillimetres": {"x": 0, "y": 0, "z": 0},
        "handedness": {"source": "RIGHT_HANDED", "target": "RIGHT_HANDED"},
        "evidenceReferences": ["test:coordinate-authority"],
    }
    value.update(copy.deepcopy(overrides))
    value["coordinateContextHashSha256"] = semantic_hash(value, "coordinateContextHashSha256")
    return value

def canonical_metadata(source: bytes, source_kind: str, **overrides: Any) -> dict[str, Any]:
    value = {
        "schema": METADATA_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "META-TEST",
        "authorityType": "APPROVED_CANONICAL_METADATA", "jobName": "PR9-TEST",
        "time": "2026-07-22T00:00:00Z", "issueNo": "1", "version": "11.00",
        "north": [0, 1, 0], "evidenceReferences": ["test:metadata-authority"],
    }
    value.update(copy.deepcopy(overrides))
    value["canonicalMetadataHashSha256"] = semantic_hash(value, "canonicalMetadataHashSha256")
    return value

def engineering_context(source: bytes, source_kind: str, decisions: list[dict[str, Any]]) -> dict[str, Any]:
    value = {
        "schema": ENGINEERING_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "EC-TEST",
        "authorityType": "APPROVED_ENGINEERING_CONTEXT",
        "componentDecisions": decisions,
        "evidenceReferences": ["test:engineering-authority"],
    }
    value["engineeringContextHashSha256"] = semantic_hash(value, "engineeringContextHashSha256")
    return value

def authority_manifest(
    source: bytes, source_kind: str, coordinate_hash: str,
    topology_hash: str = EMPTY_HASH, engineering_hash: str = EMPTY_HASH,
    metadata_hash: str = EMPTY_HASH,
) -> dict[str, Any]:
    value = {
        "schema": MANIFEST_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "AM-TEST",
        "authorityType": "APPROVED_UXML_RVM_AUTHORITY_MANIFEST",
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "canonicalMetadataHashSha256": metadata_hash,
        "evidenceReferences": ["test:independent-approval"],
        "approvalKeyId": TEST_APPROVAL_KEY_ID,
    }
    value["authorityManifestHashSha256"] = manifest_hash(value)
    value["approvalMacSha256"] = approval_mac(value["authorityManifestHashSha256"], TEST_APPROVAL_KEY)
    return value

def run_bridge(request: dict[str, Any], *, hash_seed: str | None = None) -> dict[str, Any]:
    env = dict(os.environ)
    if hash_seed is not None:
        env["PYTHONHASHSEED"] = hash_seed
    completed = subprocess.run(
        ["node", str(BRIDGE)], input=stable_json_bytes(request), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False, env=env, timeout=10,
    )
    payload = strict_json_loads(completed.stdout.decode("utf-8"))
    if completed.returncode:
        raise RuntimeError(f"{payload.get('code')}: {payload.get('error')}")
    return verify_bridge_result(request, payload)

def discover(source: bytes, coordinate_hash: str, metadata_hash: str = EMPTY_HASH) -> dict[str, Any]:
    _, kind = decode_source(source)
    request = build_bridge_request(source, kind, coordinate_hash, "0" * 64, EMPTY_HASH, "0" * 64, metadata_hash)
    return run_bridge(request)

def topology_plan(source: bytes, bridge: dict[str, Any]) -> dict[str, Any]:
    _, kind = decode_source(source)
    inventory = source_inventory(bridge["uxml"])
    ids = ["R1", "R2"] if kind == "RVM_ROWS" else ["C1", "C2"]
    p11, p12 = f"P-{ids[0]}-PIPE_END_1", f"P-{ids[0]}-PIPE_END_2"
    p21, p22 = f"P-{ids[1]}-PIPE_END_1", f"P-{ids[1]}-PIPE_END_2"
    line = "L-RVM" if kind == "RVM_ROWS" else "L-100"
    value = {
        "schema": TOPOLOGY_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": kind, "adaptedUxmlHashSha256": bridge["adaptedUxmlHashSha256"],
        "authorityId": "TP-TEST", "authorityType": "APPROVED_EXACT_TOPOLOGY_PLAN",
        "componentOccurrences": [
            {"componentId": row["id"], "componentHashSha256": sha256_bytes(stable_json_bytes(row))}
            for row in inventory["components"]
        ],
        "portOccurrences": [
            {"sourcePortId": row["id"], "componentId": row["componentId"],
             "anchorId": row["anchorId"], "portHashSha256": sha256_bytes(stable_json_bytes(row))}
            for row in inventory["ports"]
        ],
        "logicalNodes": [
            {"logicalNodeId": "N10", "sourcePortIds": [p11], "engineeringNodeNumber": 10, "lineId": line, "evidenceReferences": ["plan:N10"]},
            {"logicalNodeId": "N20", "sourcePortIds": [p12, p21], "engineeringNodeNumber": 20, "lineId": line, "evidenceReferences": ["plan:N20"]},
            {"logicalNodeId": "N30", "sourcePortIds": [p22], "engineeringNodeNumber": 30, "lineId": line, "evidenceReferences": ["plan:N30"]},
        ],
        "explicitConnections": [
            {"sourcePortId": p12, "targetPortId": p21, "authority": "APPROVED_EXACT_CONNECTION", "reconciliation": "UNDIRECTED_EXACT", "evidenceReferences": ["plan:connection"]}
        ],
        "lineAssignments": [
            {"componentId": component_id, "lineId": line, "authority": "APPROVED_LINE_ASSIGNMENT", "evidenceReferences": [f"plan:line:{component_id}"]}
            for component_id in ids
        ],
        "evidenceReferences": ["test:topology-authority"],
    }
    value["topologyPlanHashSha256"] = semantic_hash(value, "topologyPlanHashSha256")
    return value

def evaluate(
    source: bytes, *, plan: dict[str, Any] | None = None,
    coordinate: dict[str, Any] | None = None,
    engineering_artifact: dict[str, Any] | None = None,
    metadata_artifact: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _, kind = decode_source(source); source_hash = sha256_bytes(source)
    coordinate = coordinate or coordinate_context(source, kind)
    coordinate, coordinate_hash = validate_coordinate_context(coordinate, source_hash, kind)
    topology_hash = plan["topologyPlanHashSha256"] if plan else EMPTY_HASH
    engineering_artifact, engineering_hash = validate_engineering_context(engineering_artifact, source_hash, kind)
    engineering_hash = engineering_hash or EMPTY_HASH
    metadata_artifact = metadata_artifact or canonical_metadata(source, kind)
    metadata_artifact, metadata_hash = validate_canonical_metadata(metadata_artifact, source_hash, kind)
    manifest = authority_manifest(source, kind, coordinate_hash, topology_hash, engineering_hash, metadata_hash)
    manifest, manifest_hash = validate_authority_manifest(
        manifest, source_hash=source_hash, source_kind=kind, coordinate_hash=coordinate_hash,
        topology_hash=topology_hash, engineering_hash=engineering_hash, metadata_hash=metadata_hash,
    )
    request = build_bridge_request(source, kind, coordinate_hash, topology_hash, engineering_hash, manifest_hash, metadata_hash)
    bridge = run_bridge(request); inventory = source_inventory(bridge["uxml"], coordinate)
    plan, topology_hash = validate_topology_plan(
        plan, source_hash=source_hash, source_kind=kind,
        adapted_hash=bridge["adaptedUxmlHashSha256"], inventory=inventory,
    )
    topology = resolve_topology(bridge["uxml"], inventory, plan, coordinate)
    lines = resolve_lines(bridge["uxml"], inventory, plan)
    engineering = resolve_engineering(bridge["uxml"], inventory, engineering_artifact)
    validate_node_lines(topology, inventory, lines)
    elements = expected_elements(inventory, topology, lines, engineering, coordinate)
    unsupported = [row["id"] for row in inventory["components"] if str(row.get("normalizedType") or row.get("type")).upper() != "PIPE"]
    return {
        "sourceHash": source_hash, "coordinate": coordinate, "coordinateHash": coordinate_hash,
        "metadata": metadata_artifact, "metadataHash": metadata_hash,
        "manifest": manifest, "manifestHash": manifest_hash, "request": request, "bridge": bridge,
        "inventory": inventory, "plan": plan, "topology": topology, "lines": lines,
        "engineering": engineering, "elements": elements, "unsupported": unsupported,
    }

def isolated_two_line_source() -> bytes:
    document = json.loads(fixture("direct-exact.json"))
    document["components"][1]["pipelineRef"] = "L-200"; document["components"][1]["lineKey"] = "L-200"
    document["pipelines"].append({"id": "PL-2", "pipelineRef": "L-200", "lineKey": "L-200", "lineNo": "L-200"})
    document["anchors"][2]["nodeNumber"] = 400; document["anchors"][3]["nodeNumber"] = 500
    document["topologyHints"] = [
        {"id":"N1","hintType":"EXACT_LOGICAL_NODE","sourceConfidence":"EXACT_SOURCE","logicalNodeId":"N1","sourcePortIds":["P-C1-PIPE_END_1"],"lineId":"L-100","evidenceReferences":["source:N1"]},
        {"id":"N2A","hintType":"EXACT_LOGICAL_NODE","sourceConfidence":"EXACT_SOURCE","logicalNodeId":"N2A","sourcePortIds":["P-C1-PIPE_END_2"],"lineId":"L-100","evidenceReferences":["source:N2A"]},
        {"id":"N2B","hintType":"EXACT_LOGICAL_NODE","sourceConfidence":"EXACT_SOURCE","logicalNodeId":"N2B","sourcePortIds":["P-C2-PIPE_END_1"],"lineId":"L-200","evidenceReferences":["source:N2B"]},
        {"id":"N3","hintType":"EXACT_LOGICAL_NODE","sourceConfidence":"EXACT_SOURCE","logicalNodeId":"N3","sourcePortIds":["P-C2-PIPE_END_2"],"lineId":"L-200","evidenceReferences":["source:N3"]},
    ]
    return json_source(document)

def json_source(document: dict[str, Any]) -> bytes:
    return json.dumps(document, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
