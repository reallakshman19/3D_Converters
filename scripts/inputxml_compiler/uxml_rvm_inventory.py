"""Bridge-result and adapted-source inventory verification for UXML/RVM."""
from __future__ import annotations

from typing import Any

from .uxml_rvm_contracts import (
    BRIDGE_IDENTITY, RESULT_SCHEMA, TOPOLOGY_SCHEMA, clean, fail, normalized_identity,
    require_hash, require_object, require_source_binding, require_strings,
    sha256_bytes, stable_json_bytes, unique_index, semantic_normalize,
)

PIPE_ROLES = {"PIPE_END_1", "PIPE_END_2"}


def verify_bridge_result(request: dict[str, Any], result: Any) -> dict[str, Any]:
    value = require_object(result, "UXML_RVM_BRIDGE_RESULT_SHAPE", "bridge result")
    if clean(value.get("schema")) != RESULT_SCHEMA:
        fail("UXML_RVM_BRIDGE_RESULT_SCHEMA", f"Expected {RESULT_SCHEMA}")
    if clean(value.get("bridgeImplementationIdentity")) != BRIDGE_IDENTITY:
        fail("UXML_RVM_BRIDGE_IDENTITY", "Bridge implementation identity mismatch")
    if clean(value.get("requestHashSha256")) != clean(request.get("requestHashSha256")):
        fail("UXML_RVM_BRIDGE_REQUEST_HASH", "Bridge result request hash mismatch")
    for field in ("sourceByteHashSha256", "sourceByteLength", "sourceKind"):
        if value.get(field) != request.get(field):
            fail("UXML_RVM_BRIDGE_SOURCE_BINDING", f"Bridge result {field} mismatch")
    uxml = require_object(value.get("uxml"), "UXML_RVM_BRIDGE_UXML", "bridge uxml")
    if not isinstance(value.get("rows") or [], list):
        fail("UXML_RVM_BRIDGE_ROWS", "Bridge rows must be an array")
    expected = {
        "adaptedUxmlHashSha256": sha256_bytes(stable_json_bytes(uxml)),
        "componentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("components") or [])),
        "anchorHashSha256": sha256_bytes(stable_json_bytes(uxml.get("anchors") or [])),
        "portHashSha256": sha256_bytes(stable_json_bytes(uxml.get("ports") or [])),
        "segmentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("segments") or [])),
        "pipelineHashSha256": sha256_bytes(stable_json_bytes(uxml.get("pipelines") or [])),
        "diagnosticHashSha256": sha256_bytes(stable_json_bytes(value.get("diagnostics") or [])),
    }
    inventory = {name: uxml.get(name) or [] for name in (
        "sources", "mappings", "pipelines", "components", "anchors", "ports",
        "segments", "supports", "topologyHints", "rayEvidence", "lossContract",
    )}
    expected["sourceInventoryHashSha256"] = sha256_bytes(stable_json_bytes(inventory))
    for field, actual in expected.items():
        if clean(value.get(field)).lower() != actual:
            fail("UXML_RVM_BRIDGE_RESULT_HASH", f"Bridge result {field} mismatch")
    require_hash(value, "resultHashSha256", "UXML_RVM_BRIDGE_RESULT_HASH")
    return value


def source_inventory(uxml: dict[str, Any]) -> dict[str, Any]:
    components, component_by_id = unique_index(uxml.get("components") or [], "id", "UXML_RVM_COMPONENT_IDENTITY", "components")
    anchors, anchor_by_id = unique_index(uxml.get("anchors") or [], "id", "UXML_RVM_ANCHOR_IDENTITY", "anchors")
    ports, port_by_id = unique_index(uxml.get("ports") or [], "id", "UXML_RVM_PORT_IDENTITY", "ports")
    segments, segment_by_id = unique_index(uxml.get("segments") or [], "id", "UXML_RVM_SEGMENT_IDENTITY", "segments")
    pipelines, pipeline_by_id = unique_index(uxml.get("pipelines") or [], "id", "UXML_RVM_PIPELINE_IDENTITY", "pipelines")
    for port in ports:
        component_id, anchor_id = clean(port.get("componentId")), clean(port.get("anchorId"))
        if component_id not in component_by_id or anchor_id not in anchor_by_id:
            fail("UXML_RVM_PORT_REFERENCE", f"Port {port['id']} has an unresolved owner or anchor")
        if clean(anchor_by_id[anchor_id].get("componentId")) != component_id:
            fail("UXML_RVM_PORT_ANCHOR_OWNER", f"Port {port['id']} and anchor {anchor_id} disagree on owner")
    for anchor in anchors:
        if clean(anchor.get("componentId")) not in component_by_id:
            fail("UXML_RVM_ANCHOR_OWNER", f"Anchor {anchor['id']} has an unresolved component owner")
    for segment in segments:
        component_id = clean(segment.get("componentId"))
        start_id, end_id = clean(segment.get("startAnchorId")), clean(segment.get("endAnchorId"))
        if component_id not in component_by_id or start_id not in anchor_by_id or end_id not in anchor_by_id:
            fail("UXML_RVM_SEGMENT_REFERENCE", f"Segment {segment['id']} has unresolved ownership or anchors")
        if any(clean(anchor_by_id[item].get("componentId")) != component_id for item in (start_id, end_id)):
            fail("UXML_RVM_SEGMENT_OWNER", f"Segment {segment['id']} anchors disagree on component owner")
    for component in components:
        component_id = clean(component["id"])
        declared = {
            "anchorIds": list(component.get("anchorIds") or []),
            "portIds": list(component.get("portIds") or []),
            "segmentIds": list(component.get("segmentIds") or []),
        }
        actual = {
            "anchorIds": [row["id"] for row in anchors if clean(row.get("componentId")) == component_id],
            "portIds": [row["id"] for row in ports if clean(row.get("componentId")) == component_id],
            "segmentIds": [row["id"] for row in segments if clean(row.get("componentId")) == component_id],
        }
        for field in declared:
            if len(declared[field]) != len(set(declared[field])) or sorted(declared[field]) != sorted(actual[field]):
                fail("UXML_RVM_COMPONENT_OWNERSHIP", f"Component {component_id} {field} does not exactly match source relations")
    required_ports, pipe_components = [], []
    for component in components:
        component_id = clean(component.get("id"))
        if normalized_identity(component.get("normalizedType") or component.get("type")) != "PIPE":
            continue
        pipe_components.append(component_id)
        owned = [port for port in ports if clean(port.get("componentId")) == component_id and normalized_identity(port.get("role")) in PIPE_ROLES]
        roles = [normalized_identity(port.get("role")) for port in owned]
        if len(owned) != 2 or sorted(roles) != sorted(PIPE_ROLES):
            fail("UXML_RVM_PIPE_PORT_CARDINALITY", f"PIPE {component_id} requires exactly one port for each endpoint role")
        required_ports.extend(clean(port.get("id")) for port in owned)
    return {
        "components": components, "componentById": component_by_id,
        "anchors": anchors, "anchorById": anchor_by_id,
        "ports": ports, "portById": port_by_id,
        "segments": segments, "segmentById": segment_by_id,
        "pipelines": pipelines, "pipelineById": pipeline_by_id,
        "requiredPortIds": required_ports, "pipeComponentIds": pipe_components,
    }


def _occurrence_hashes(rows: list[dict[str, Any]], identity_field: str) -> dict[str, str]:
    return {clean(row.get(identity_field)): sha256_bytes(stable_json_bytes(row)) for row in rows}


def validate_topology_plan(
    artifact: Any, *, source_hash: str, source_kind: str, adapted_hash: str, inventory: dict[str, Any]
) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        if source_kind == "RVM_ROWS":
            fail("UXML_RVM_TOPOLOGY_PLAN_MISSING", "RVM rows require an approved exact-topology plan")
        return None, ""
    plan = require_object(artifact, "UXML_RVM_TOPOLOGY_PLAN_SHAPE", "topology plan")
    if clean(plan.get("schema")) != TOPOLOGY_SCHEMA:
        fail("UXML_RVM_TOPOLOGY_PLAN_SCHEMA", f"Expected {TOPOLOGY_SCHEMA}")
    require_source_binding(plan, source_hash, source_kind, "UXML_RVM_TOPOLOGY_SOURCE_BINDING")
    if clean(plan.get("adaptedUxmlHashSha256")).lower() != adapted_hash:
        fail("UXML_RVM_ADAPTED_UXML_BINDING", "Topology plan adapted-UXML hash mismatch")
    if clean(plan.get("authorityType")) != "APPROVED_EXACT_TOPOLOGY_PLAN":
        fail("UXML_RVM_TOPOLOGY_AUTHORITY", "Unknown topology authority type")
    require_strings(plan.get("evidenceReferences"), "UXML_RVM_TOPOLOGY_EVIDENCE", "evidenceReferences")
    component_occ, _ = unique_index(plan.get("componentOccurrences") or [], "componentId", "UXML_RVM_COMPONENT_OCCURRENCE", "componentOccurrences")
    port_occ, _ = unique_index(plan.get("portOccurrences") or [], "sourcePortId", "UXML_RVM_PORT_OCCURRENCE", "portOccurrences")
    expected_components = _occurrence_hashes(inventory["components"], "id")
    actual_components = {clean(row["componentId"]): clean(row.get("componentHashSha256")).lower() for row in component_occ}
    if actual_components != expected_components:
        fail("UXML_RVM_COMPONENT_OCCURRENCE", "Topology plan component occurrences do not exactly match adapted UXML")
    expected_ports = _occurrence_hashes(inventory["ports"], "id")
    actual_ports = {clean(row["sourcePortId"]): clean(row.get("portHashSha256")).lower() for row in port_occ}
    if actual_ports != expected_ports:
        fail("UXML_RVM_PORT_OCCURRENCE", "Topology plan port occurrences do not exactly match adapted UXML")
    for row in port_occ:
        source_port = inventory["portById"].get(clean(row["sourcePortId"]))
        if not source_port or clean(row.get("componentId")) != clean(source_port.get("componentId")) or clean(row.get("anchorId")) != clean(source_port.get("anchorId")):
            fail("UXML_RVM_PORT_OCCURRENCE_OWNER", f"Topology plan port occurrence {row['sourcePortId']} has wrong ownership")
    digest = require_hash(plan, "topologyPlanHashSha256", "UXML_RVM_TOPOLOGY_PLAN_HASH")
    return semantic_normalize(plan), digest
