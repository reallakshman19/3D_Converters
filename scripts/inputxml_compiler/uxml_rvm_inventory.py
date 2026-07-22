"""Bridge-result and adapted-source inventory verification for UXML/RVM."""
from __future__ import annotations

import base64
from typing import Any

from .uxml_rvm_contracts import (
    BRIDGE_IDENTITY,
    RESULT_SCHEMA,
    TOPOLOGY_SCHEMA,
    clean,
    decode_source,
    fail,
    normalized_identity,
    require_hash,
    require_object,
    require_source_binding,
    require_strings,
    sha256_bytes,
    stable_json_bytes,
    strict_json_loads,
    unique_index,
    semantic_normalize,
)

PIPE_ROLES = {"PIPE_END_1", "PIPE_END_2"}
_REQUIRED_SECTIONS = (
    "header", "sources", "mappings", "units", "pipelines", "components",
    "anchors", "ports", "segments", "supports", "topologyHints",
    "rayEvidence", "lossContract", "diagnostics",
)
_BLOCKING_SEVERITIES = {"ERROR", "FATAL", "BLOCKING"}

def _request_source(request: dict[str, Any]) -> tuple[Any, str]:
    encoded = clean(request.get("sourceBase64"))
    try:
        source = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        fail("UXML_RVM_SOURCE_BASE64", f"Invalid source base64: {exc}")
    if base64.b64encode(source).decode("ascii") != encoded:
        fail("UXML_RVM_SOURCE_BASE64", "Non-canonical source base64")
    payload, kind = decode_source(source)
    if kind != request.get("sourceKind"):
        fail("UXML_RVM_BRIDGE_SOURCE_BINDING", "Request source kind mismatch")
    return payload, kind

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
    rows = value.get("rows") or []
    if not isinstance(rows, list):
        fail("UXML_RVM_BRIDGE_ROWS", "Bridge rows must be an array")
    payload, source_kind = _request_source(request)
    if source_kind == "UXML_DOCUMENT":
        expected_uxml = payload.get("uxml", payload)
        if expected_uxml != uxml:
            fail("UXML_RVM_DIRECT_SOURCE_MUTATION", "Bridge altered direct UXML source semantics")
    else:
        expected_rows = payload if isinstance(payload, list) else payload.get("rows", payload.get("rvmRows"))
        if expected_rows != rows:
            fail("UXML_RVM_RVM_ROW_MUTATION", "Bridge altered exact RVM row semantics")
    expected = {
        "adaptedUxmlHashSha256": sha256_bytes(stable_json_bytes(uxml)),
        "componentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("components") or [])),
        "anchorHashSha256": sha256_bytes(stable_json_bytes(uxml.get("anchors") or [])),
        "portHashSha256": sha256_bytes(stable_json_bytes(uxml.get("ports") or [])),
        "segmentHashSha256": sha256_bytes(stable_json_bytes(uxml.get("segments") or [])),
        "pipelineHashSha256": sha256_bytes(stable_json_bytes(uxml.get("pipelines") or [])),
        "diagnosticHashSha256": sha256_bytes(stable_json_bytes(value.get("diagnostics") or [])),
    }
    inventory_doc = {
        name: uxml.get(name) or []
        for name in (
            "sources", "mappings", "pipelines", "components", "anchors", "ports",
            "segments", "supports", "topologyHints", "rayEvidence", "lossContract",
        )
    }
    expected["sourceInventoryHashSha256"] = sha256_bytes(stable_json_bytes(inventory_doc))
    for field, actual in expected.items():
        if clean(value.get(field)).lower() != actual:
            fail("UXML_RVM_BRIDGE_RESULT_HASH", f"Bridge result {field} mismatch")
    require_hash(value, "resultHashSha256", "UXML_RVM_BRIDGE_RESULT_HASH")
    return value

def _require_sections(uxml: dict[str, Any]) -> None:
    missing = [name for name in _REQUIRED_SECTIONS if name not in uxml]
    if missing:
        fail("UXML_RVM_REQUIRED_SECTION", f"UXML is missing required sections: {missing}")
    if not isinstance(uxml.get("header"), dict) or not isinstance(uxml.get("units"), dict):
        fail("UXML_RVM_REQUIRED_SECTION", "header and units must be objects")
    for name in _REQUIRED_SECTIONS:
        if name in {"header", "units"}:
            continue
        if not isinstance(uxml.get(name), list):
            fail("UXML_RVM_REQUIRED_SECTION", f"{name} must be an array")

def _validate_units(uxml: dict[str, Any], coordinate_context: dict[str, Any]) -> None:
    units = uxml["units"]
    coordinate_unit = clean(units.get("coordinates")).upper()
    length_unit = clean(units.get("length")).upper()
    if not coordinate_unit or not length_unit:
        fail("UXML_RVM_SOURCE_UNITS_MISSING", "Source coordinate and length units are mandatory")
    if coordinate_unit != clean(coordinate_context.get("sourceCoordinateUnits")).upper():
        fail("UXML_RVM_SOURCE_COORDINATE_UNIT_CONTRADICTION", "Source and coordinate-context units disagree")

def _validate_source_refs(
    components: list[dict[str, Any]], source_by_id: dict[str, dict[str, Any]]
) -> None:
    for component in components:
        refs = require_strings(
            component.get("sourceRefs"),
            "UXML_RVM_COMPONENT_SOURCE_REFS",
            f"{component.get('id')}.sourceRefs",
        )
        unknown = sorted(set(refs) - set(source_by_id))
        if unknown:
            fail("UXML_RVM_COMPONENT_SOURCE_REF", f"Component {component['id']} has unknown sourceRefs {unknown}")

def _validate_diagnostics(uxml: dict[str, Any]) -> None:
    for index, diagnostic in enumerate(uxml.get("diagnostics") or []):
        row = require_object(diagnostic, "UXML_RVM_DIAGNOSTIC_SHAPE", f"diagnostics[{index}]")
        severity = normalized_identity(row.get("severity") or row.get("level") or "INFO")
        if severity in _BLOCKING_SEVERITIES:
            fail("UXML_RVM_SOURCE_DIAGNOSTIC_BLOCKING", f"Source diagnostic blocks: {row.get('code') or index}")

def source_inventory(
    uxml: dict[str, Any], coordinate_context: dict[str, Any] | None = None
) -> dict[str, Any]:
    _require_sections(uxml)
    if coordinate_context is not None:
        _validate_units(uxml, coordinate_context)
    sources, source_by_id = unique_index(
        uxml.get("sources") or [], "id", "UXML_RVM_SOURCE_IDENTITY", "sources"
    )
    mappings, mapping_by_id = unique_index(
        uxml.get("mappings") or [], "id", "UXML_RVM_MAPPING_IDENTITY", "mappings"
    ) if uxml.get("mappings") else ([], {})
    components, component_by_id = unique_index(
        uxml.get("components") or [], "id", "UXML_RVM_COMPONENT_IDENTITY", "components"
    )
    anchors, anchor_by_id = unique_index(
        uxml.get("anchors") or [], "id", "UXML_RVM_ANCHOR_IDENTITY", "anchors"
    )
    ports, port_by_id = unique_index(
        uxml.get("ports") or [], "id", "UXML_RVM_PORT_IDENTITY", "ports"
    )
    segments, segment_by_id = unique_index(
        uxml.get("segments") or [], "id", "UXML_RVM_SEGMENT_IDENTITY", "segments"
    )
    pipelines, pipeline_by_id = unique_index(
        uxml.get("pipelines") or [], "id", "UXML_RVM_PIPELINE_IDENTITY", "pipelines"
    )
    supports, support_by_id = unique_index(
        uxml.get("supports") or [], "id", "UXML_RVM_SUPPORT_IDENTITY", "supports"
    ) if uxml.get("supports") else ([], {})
    _validate_source_refs(components, source_by_id)
    _validate_diagnostics(uxml)
    for port in ports:
        component_id, anchor_id = clean(port.get("componentId")), clean(port.get("anchorId"))
        if component_id not in component_by_id or anchor_id not in anchor_by_id:
            fail("UXML_RVM_PORT_REFERENCE", f"Port {port['id']} has an unresolved owner or anchor")
        anchor = anchor_by_id[anchor_id]
        if clean(anchor.get("componentId")) != component_id:
            fail("UXML_RVM_PORT_ANCHOR_OWNER", f"Port {port['id']} and anchor {anchor_id} disagree on owner")
        if port.get("point") != anchor.get("point"):
            fail("UXML_RVM_PORT_ANCHOR_COORDINATE", f"Port {port['id']} and anchor {anchor_id} coordinates disagree")
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
    for support in supports:
        component_id = clean(support.get("componentId"))
        anchor_id = clean(support.get("supportAnchorId"))
        if component_id not in component_by_id:
            fail("UXML_RVM_SUPPORT_OWNER", f"Support {support['id']} has an unresolved component owner")
        if not anchor_id or anchor_id not in anchor_by_id:
            fail("UXML_RVM_SUPPORT_ANCHOR", f"Support {support['id']} has an unresolved support anchor")
        if clean(anchor_by_id[anchor_id].get("componentId")) != component_id:
            fail("UXML_RVM_SUPPORT_OWNER", f"Support {support['id']} anchor owner is substituted")
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
    required_ports: list[str] = []
    pipe_components: list[str] = []
    for component in components:
        component_id = clean(component.get("id"))
        if normalized_identity(component.get("normalizedType") or component.get("type")) != "PIPE":
            continue
        pipe_components.append(component_id)
        owned = [
            port for port in ports
            if clean(port.get("componentId")) == component_id
            and normalized_identity(port.get("role")) in PIPE_ROLES
        ]
        roles = [normalized_identity(port.get("role")) for port in owned]
        if len(owned) != 2 or sorted(roles) != sorted(PIPE_ROLES):
            fail("UXML_RVM_PIPE_PORT_CARDINALITY", f"PIPE {component_id} requires exactly one port for each endpoint role")
        required_ports.extend(clean(port.get("id")) for port in owned)
    return {
        "sources": sources, "sourceById": source_by_id,
        "mappings": mappings, "mappingById": mapping_by_id,
        "components": components, "componentById": component_by_id,
        "anchors": anchors, "anchorById": anchor_by_id,
        "ports": ports, "portById": port_by_id,
        "segments": segments, "segmentById": segment_by_id,
        "pipelines": pipelines, "pipelineById": pipeline_by_id,
        "supports": supports, "supportById": support_by_id,
        "requiredPortIds": required_ports, "pipeComponentIds": pipe_components,
    }

def _occurrence_hashes(rows: list[dict[str, Any]], identity_field: str) -> dict[str, str]:
    return {clean(row.get(identity_field)): sha256_bytes(stable_json_bytes(row)) for row in rows}

def validate_topology_plan(
    artifact: Any,
    *,
    source_hash: str,
    source_kind: str,
    adapted_hash: str,
    inventory: dict[str, Any],
) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        if source_kind == "RVM_ROWS":
            fail("UXML_RVM_TOPOLOGY_PLAN_MISSING", "RVM rows require an approved exact-topology plan")
        return None, sha256_bytes(b"")
    plan = require_object(artifact, "UXML_RVM_TOPOLOGY_PLAN_SHAPE", "topology plan")
    if clean(plan.get("schema")) != TOPOLOGY_SCHEMA:
        fail("UXML_RVM_TOPOLOGY_PLAN_SCHEMA", f"Expected {TOPOLOGY_SCHEMA}")
    require_source_binding(plan, source_hash, source_kind, "UXML_RVM_TOPOLOGY_SOURCE_BINDING")
    if clean(plan.get("adaptedUxmlHashSha256")).lower() != adapted_hash:
        fail("UXML_RVM_ADAPTED_UXML_BINDING", "Topology plan adapted-UXML hash mismatch")
    if clean(plan.get("authorityType")) != "APPROVED_EXACT_TOPOLOGY_PLAN":
        fail("UXML_RVM_TOPOLOGY_AUTHORITY", "Unknown topology authority type")
    require_strings(plan.get("evidenceReferences"), "UXML_RVM_TOPOLOGY_EVIDENCE", "evidenceReferences")
    component_occ, _ = unique_index(
        plan.get("componentOccurrences") or [], "componentId",
        "UXML_RVM_COMPONENT_OCCURRENCE", "componentOccurrences",
    )
    port_occ, _ = unique_index(
        plan.get("portOccurrences") or [], "sourcePortId",
        "UXML_RVM_PORT_OCCURRENCE", "portOccurrences",
    )
    expected_components = _occurrence_hashes(inventory["components"], "id")
    actual_components = {
        clean(row["componentId"]): clean(row.get("componentHashSha256")).lower()
        for row in component_occ
    }
    if actual_components != expected_components:
        fail("UXML_RVM_COMPONENT_OCCURRENCE", "Topology plan component occurrences do not exactly match adapted UXML")
    expected_ports = _occurrence_hashes(inventory["ports"], "id")
    actual_ports = {
        clean(row["sourcePortId"]): clean(row.get("portHashSha256")).lower()
        for row in port_occ
    }
    if actual_ports != expected_ports:
        fail("UXML_RVM_PORT_OCCURRENCE", "Topology plan port occurrences do not exactly match adapted UXML")
    for row in port_occ:
        source_port = inventory["portById"].get(clean(row["sourcePortId"]))
        if (
            not source_port
            or clean(row.get("componentId")) != clean(source_port.get("componentId"))
            or clean(row.get("anchorId")) != clean(source_port.get("anchorId"))
        ):
            fail("UXML_RVM_PORT_OCCURRENCE_OWNER", f"Topology plan port occurrence {row['sourcePortId']} has wrong ownership")
    digest = require_hash(plan, "topologyPlanHashSha256", "UXML_RVM_TOPOLOGY_PLAN_HASH")
    return semantic_normalize(plan), digest
