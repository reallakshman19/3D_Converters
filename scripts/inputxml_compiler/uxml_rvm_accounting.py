"""Independent relational source-accounting proof for UXML/RVM projection."""
from __future__ import annotations
from decimal import Decimal
from typing import Any
from .uxml_rvm_contracts import (
    ACCOUNTING_SCHEMA, clean, normalized_identity, semantic_hash, sha256_bytes,
    stable_json_bytes, transform_point, unique_index,
)

EXT_NS = "urn:reallaksh19:inputxml:extension:v1"
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
    unique = len(set(identities))
    return {
        "expectedCount": len(rows), "actualCount": len(rows),
        "uniqueIdentityCount": unique, "duplicateCount": len(identities) - unique,
        "orderedIdentitySequence": identities,
        "semanticHashSha256": sha256_bytes(stable_json_bytes(rows)),
    }

def expected_elements(inventory: dict[str, Any], topology: dict[str, Any], lines: dict[str, Any], engineering: dict[str, Any], coordinate_context: dict[str, Any]) -> list[dict[str, Any]]:
    node_number = {node["logicalNodeId"]: node["engineeringNodeNumber"] for node in topology["nodes"]}
    records = []
    for component_id in inventory["pipeComponentIds"]:
        ports = [port for port in inventory["ports"] if clean(port.get("componentId")) == component_id]
        role_to_port = {normalized_identity(port.get("role")): port for port in ports}
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
    records.sort(key=lambda row: (row["lineId"], row["fromNodeNumber"], row["toNodeNumber"], row["componentId"]))
    return _jsonable(records)

def _xml_records(root: Any) -> list[dict[str, Any]]:
    records = []
    for element in root.findall("PIPINGMODEL/PIPINGELEMENT"):
        attr = element.attrib
        records.append({
            "elementId": attr.get("ID", ""), "lineId": attr.get("LINE", ""),
            "fromNodeNumber": int(attr["FROM_NODE"]), "toNodeNumber": int(attr["TO_NODE"]),
            "fromCoordinate": {"x": attr["FROM_X"], "y": attr["FROM_Y"], "z": attr["FROM_Z"]},
            "toCoordinate": {"x": attr["TO_X"], "y": attr["TO_Y"], "z": attr["TO_Z"]},
            "delta": {"x": attr["DELTA_X"], "y": attr["DELTA_Y"], "z": attr["DELTA_Z"]},
            "outsideDiameterMm": attr["DIAMETER"], "wallThicknessMm": attr["WALL_THICK"],
        })
    return records

def _xml_projection(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = (
        "elementId", "lineId", "fromNodeNumber", "toNodeNumber",
        "fromCoordinate", "toCoordinate", "delta",
        "outsideDiameterMm", "wallThicknessMm",
    )
    return [{key: row[key] for key in keys} for row in records]

def _ledger_rows(records: list[dict[str, Any]], source_type: str) -> list[dict[str, Any]]:
    return [row for row in records if row.get("sourceType") == source_type]

def _ledger_elements(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = _ledger_rows(records, "PIPE")
    return [_jsonable(row.get("sourceFields") or {}) for row in rows if row.get("disposition") == "EMIT_1_TO_1"]

def _node_tuples(topology: dict[str, Any]) -> list[tuple[Any, ...]]:
    return sorted((
        row["logicalNodeId"], tuple(row["sourcePortIds"]), row["engineeringNodeNumber"],
        row["lineId"], _jsonable(row["coordinate"]), row["authority"],
    ) for row in topology["nodes"])

def _ledger_node_tuples(records: list[dict[str, Any]]) -> list[tuple[Any, ...]]:
    rows = [row.get("sourceFields") or {} for row in _ledger_rows(records, "UXML_RVM_LOGICAL_NODE_DECISION")]
    return sorted((
        row.get("logicalNodeId"), tuple(row.get("sourcePortIds") or []), row.get("engineeringNodeNumber"),
        row.get("lineId"), row.get("coordinate"), row.get("authority"),
    ) for row in rows)

def _line_tuples(lines: dict[str, Any]) -> list[tuple[str, str]]:
    return sorted((component, row["lineId"]) for component, row in lines.items())

def _ledger_line_tuples(records: list[dict[str, Any]]) -> list[tuple[str, str]]:
    return sorted((clean(row.get("sourceEntityId")), clean((row.get("sourceFields") or {}).get("lineId"))) for row in _ledger_rows(records, "UXML_RVM_LINE_DECISION"))

def _engineering_tuples(engineering: dict[str, Any]) -> list[tuple[str, str, str]]:
    return sorted((component, field, _jsonable(decision["canonicalValueMm"])) for component, fields in engineering.items() for field, decision in fields.items())

def _ledger_engineering_tuples(records: list[dict[str, Any]]) -> list[tuple[str, str, str]]:
    result = []
    for row in _ledger_rows(records, "UXML_RVM_ENGINEERING_FIELD_DECISION"):
        fields = row.get("sourceFields") or {}
        result.append((clean(fields.get("componentId")), clean(fields.get("field")), clean(fields.get("canonicalValueMm"))))
    return sorted(result)

def _extension_values(root: Any) -> dict[str, list[str]]:
    model = root.find("PIPINGMODEL"); result: dict[str, list[str]] = {}
    if model is None:
        return result
    for record in model.findall(f"{{{EXT_NS}}}Extension/{{{EXT_NS}}}Record"):
        result.setdefault(clean(record.get("name")), []).append(clean(record.text))
    return result

def _metadata_actual(root: Any) -> dict[str, Any]:
    model = root.find("PIPINGMODEL")
    if model is None:
        return {}
    return {
        "jobName": model.get("JOBNAME", ""), "time": model.get("TIME", ""),
        "issueNo": model.get("ISSUE_NO", ""), "version": root.get("VERSION", ""),
        "north": [model.get("NORTH_X", ""), model.get("NORTH_Y", ""), model.get("NORTH_Z", "")],
    }

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
        "bridgeCollectionHashMismatch": sum(expected[field] != clean(bridge.get(field)) for field in ("componentHashSha256", "anchorHashSha256", "portHashSha256", "segmentHashSha256", "pipelineHashSha256")),
        "bridgeDiagnosticHashMismatch": _different(expected["diagnosticHashSha256"], clean(bridge.get("diagnosticHashSha256"))),
    }

def build_accounting_proof(
    *, source_hash: str, source_kind: str, bridge_result: dict[str, Any], uxml: dict[str, Any],
    inventory: dict[str, Any], coordinate_hash: str, topology_hash: str, engineering_hash: str,
    metadata_hash: str, topology: dict[str, Any], lines: dict[str, Any], engineering: dict[str, Any],
    coordinate_context: dict[str, Any], canonical_root: Any, ledger_records: list[dict[str, Any]],
    unsupported_component_ids: list[str], unsupported_support_ids: list[str], metadata: dict[str, Any],
    expected_extension_hashes: dict[str, str], canonical_elements: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    expected = expected_elements(inventory, topology, lines, engineering, coordinate_context)
    actual_xml = _xml_records(canonical_root)
    actual_ledger = _ledger_elements(ledger_records)
    expected_xml = _xml_projection(expected)
    if canonical_elements is not None and not actual_xml:
        actual_xml = _xml_projection(_jsonable(canonical_elements))
    source_components = sorted(clean(row.get("id")) for row in inventory["components"])
    source_ports = sorted(clean(row.get("id")) for row in inventory["ports"])
    unsupported = sorted(unsupported_component_ids); supports = sorted(unsupported_support_ids)
    emitted = sorted(row["componentId"] for row in expected)
    collections = {"rvmRows": _collection_accounting("rvmRows", bridge_result.get("rows") or []), **{name: _collection_accounting(name, list(uxml.get(name) or [])) for name in _COLLECTIONS}}
    extensions = _extension_values(canonical_root)
    support_rows = _ledger_rows(ledger_records, "UXML_SUPPORT")
    expected_metadata = {
        "jobName": metadata["jobName"], "time": metadata["time"], "issueNo": metadata["issueNo"],
        "version": metadata["version"], "north": [clean(value) for value in metadata["north"]],
    }
    actual_metadata = _metadata_actual(canonical_root)
    invariants = {
        "sourceIdentityDuplicateMismatch": sum(row["duplicateCount"] for name, row in collections.items() if name not in {"diagnostics", "rvmRows"}),
        "sourceComponentDecisionMismatch": _different(source_components, sorted(emitted + unsupported)),
        "sourcePortDecisionMismatch": _different(source_ports, sorted(set(topology["portToNode"]) | {clean(port.get("id")) for port in inventory["ports"] if clean(port.get("componentId")) in unsupported})),
        "unsupportedSupportDispositionMismatch": 0 if len(support_rows) == len(supports) and all(row.get("disposition") == "UNSUPPORTED_BLOCKING" for row in support_rows) else 1,
        "canonicalXmlCardinalityMismatch": _different(len(actual_xml), len(expected_xml)),
        "canonicalXmlRelationMismatch": _different(expected_xml, actual_xml),
        "ledgerElementCardinalityMismatch": _different(len(actual_ledger), len(expected)),
        "ledgerElementRelationMismatch": _different(expected, actual_ledger),
        "xmlLedgerRelationMismatch": _different(actual_xml, _xml_projection(actual_ledger)),
        "ledgerNodeDecisionMismatch": _different(_node_tuples(topology), _ledger_node_tuples(ledger_records)),
        "ledgerLineDecisionMismatch": _different(_line_tuples(lines), _ledger_line_tuples(ledger_records)),
        "ledgerEngineeringDecisionMismatch": _different(_engineering_tuples(engineering), _ledger_engineering_tuples(ledger_records)),
        "canonicalMetadataMismatch": _different(expected_metadata, actual_metadata),
        "extensionAuthorityHashMismatch": sum(extensions.get(name) != [value] for name, value in expected_extension_hashes.items()),
        "bridgeSourceHashMismatch": 0 if clean(bridge_result.get("sourceByteHashSha256")) == source_hash else 1,
        **_bridge_hash_invariants(bridge_result, uxml),
    }
    proof = {
        "schema": ACCOUNTING_SCHEMA, "sourceHashSha256": source_hash, "sourceKind": source_kind,
        "adaptedUxmlHashSha256": bridge_result["adaptedUxmlHashSha256"],
        "sourceInventoryHashSha256": bridge_result["sourceInventoryHashSha256"],
        "coordinateContextHashSha256": coordinate_hash, "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash, "canonicalMetadataHashSha256": metadata_hash,
        "sourceCollectionAccounting": collections,
        "expectedCanonicalElements": expected, "actualXmlCanonicalElements": actual_xml,
        "actualLedgerCanonicalElements": actual_ledger, "actualCanonicalMetadata": actual_metadata,
        "unsupportedComponentIds": unsupported, "unsupportedSupportIds": supports,
        "actualExtensionBindings": extensions, "invariants": invariants,
    }
    proof["accountingProofHashSha256"] = semantic_hash(proof, "accountingProofHashSha256")
    return proof

def accounting_is_closed(proof: dict[str, Any]) -> bool:
    return all(value == 0 for value in proof.get("invariants", {}).values())

def verify_final_accounting_binding(root: Any, ledger_records: list[dict[str, Any]], proof: dict[str, Any]) -> bool:
    extension = _extension_values(root).get("UxmlRvmSourceAccountingProofHash", [])
    proof_rows = _ledger_rows(ledger_records, "INPUTXML_UXML_RVM_SOURCE_ACCOUNTING_PROOF")
    return extension == [proof["accountingProofHashSha256"]] and len(proof_rows) == 1 and proof_rows[0].get("sourceFields") == proof

def accounting_bytes(proof: dict[str, Any]) -> bytes:
    return stable_json_bytes(proof)
