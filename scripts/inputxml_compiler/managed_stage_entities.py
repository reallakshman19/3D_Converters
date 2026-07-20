#!/usr/bin/env python3
"""Exact source entity, path, attribute, and producer-port reconciliation."""
from __future__ import annotations

from collections import Counter
from typing import Any

from .base import DecisionLedger
from .managed_stage_diagnostics import block
from .managed_stage_hashes import source_entity_id
from .managed_stage_intake import ManagedStageIntake, MAX_SOURCE_PORTS

_COMPONENT_PORTS = (("APOS", "A"), ("POS", "P"), ("LPOS", "L"))
_BRANCH_PORTS = (("HPOS", "H"), ("TPOS", "T"))


def verify_source_entities_and_ports(
    intake: ManagedStageIntake,
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> dict[str, Any]:
    model = result["sourceModel"]
    expected_entities, expected_ports = _expected_source_rows(intake)
    model_entities = _object_array(model.get("entities"), "sourceModel.entities", ledger)
    result_entities = _object_array(result.get("sourceEntities"), "sourceEntities", ledger)
    model_ports = _object_array(model.get("sourcePorts"), "sourceModel.sourcePorts", ledger)
    result_ports = _object_array(result.get("sourcePorts"), "sourcePorts", ledger)
    if len(expected_ports) > MAX_SOURCE_PORTS:
        _port_block(ledger, "Managed-stage source-port limit is exceeded.")
    _verify_unique_entities(model_entities, ledger)
    _verify_entity_rows(expected_entities, model_entities, "source model", ledger)
    _verify_entity_rows(expected_entities, result_entities, "bridge entity array", ledger)
    _verify_model_collections(model, expected_entities, ledger)
    _verify_ports(expected_ports, model_ports, "source model", ledger)
    _verify_ports(expected_ports, result_ports, "bridge port array", ledger)
    _verify_entity_port_union(model_entities, expected_ports, ledger)
    _verify_trace_port_manifest(expected_ports, result["traceLedger"], ledger)
    ledger.add(
        source_entity_id="managed-stage-source-model-closure",
        source_type="MANAGED_STAGE_SOURCE_MODEL_CLOSURE",
        source_fields={
            "sourceEntityCount": len(expected_entities),
            "sourcePortCount": len(expected_ports),
            "branchCount": len(intake.branches),
            "componentCount": len(expected_entities) - len(intake.branches),
        },
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION",
        evidence=[
            "source paths and identities were independently derived from strict JSON occurrences",
            "source-model, bridge, entity-owned, and trace-ledger port manifests are equal",
        ],
    )
    return {
        "entities": tuple(expected_entities),
        "ports": tuple(expected_ports),
        "entityById": {row["sourceEntityId"]: row for row in expected_entities},
        "portById": {row["sourcePortId"]: row for row in expected_ports},
    }


def _expected_source_rows(
    intake: ManagedStageIntake,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    file_id = source_entity_id.__globals__["source_file_id"](intake.source_text)
    entities: list[dict[str, Any]] = []
    ports: list[dict[str, Any]] = []
    for branch_index, branch in enumerate(intake.branches):
        branch_path = _branch_path(intake.branch_collection_path, branch_index)
        branch_row = _entity_row(branch, branch_path, "BRANCH", file_id, "")
        entities.append(branch_row)
        ports.extend(_port_rows(branch_row, branch, _BRANCH_PORTS, file_id))
        children = branch.get("children") if isinstance(branch.get("children"), list) else []
        for child_index, child in enumerate(children):
            if not isinstance(child, dict):
                continue
            child_path = f"{branch_path}.children[{child_index}]"
            source_type = str(child.get("type") or _attributes(child).get("TYPE") or "").strip().upper()
            component = _entity_row(
                child,
                child_path,
                source_type,
                file_id,
                branch_row["sourceEntityId"],
            )
            component["sourceBranchName"] = branch_row["name"]
            entities.append(component)
            ports.extend(_port_rows(component, child, _COMPONENT_PORTS, file_id))
    return entities, ports


def _entity_row(
    source: dict[str, Any],
    path: str,
    source_type: str,
    file_id: str,
    branch_id: str,
) -> dict[str, Any]:
    attributes = _attributes(source)
    return {
        "sourceEntityId": source_entity_id(file_id, path),
        "sourcePath": path,
        "sourceType": source_type,
        "name": str(source.get("name") or attributes.get("NAME") or "").strip(),
        "sourceRef": str(attributes.get("REF") or "").strip(),
        "sourceBranchEntityId": branch_id,
        "attributes": attributes,
        "enrichedAttributes": _record(source.get("enrichedAttributes")),
    }


def _port_rows(
    entity: dict[str, Any],
    source: dict[str, Any],
    definitions: tuple[tuple[str, str], ...],
    file_id: str,
) -> list[dict[str, Any]]:
    attributes = _attributes(source)
    rows: list[dict[str, Any]] = []
    for field, role in definitions:
        position = _point(attributes.get(field))
        if position is None:
            continue
        path = f"{entity['sourcePath']}.attributes.{field}"
        rows.append({
            "sourcePortId": source_entity_id(file_id, path),
            "sourceEntityId": entity["sourceEntityId"],
            "sourcePath": path,
            "field": field,
            "role": role,
            "sourceType": entity["sourceType"],
            "position": position,
        })
    return rows


def _verify_unique_entities(
    rows: list[dict[str, Any]],
    ledger: DecisionLedger,
) -> None:
    ids = [str(row.get("sourceEntityId") or "") for row in rows]
    paths = [str(row.get("sourcePath") or "") for row in rows]
    if not all(ids) or len(ids) != len(set(ids)):
        block(
            ledger,
            "MANAGED_STAGE_SOURCE_ENTITY_DUPLICATE",
            "Managed-stage source entity IDs are empty or duplicated.",
            "sourceModel.entities",
        )
    if not all(paths) or len(paths) != len(set(paths)):
        block(
            ledger,
            "MANAGED_STAGE_SOURCE_ENTITY_DUPLICATE",
            "Managed-stage source paths are empty or duplicated.",
            "sourceModel.entities",
        )


def _verify_entity_rows(
    expected: list[dict[str, Any]],
    actual: list[dict[str, Any]],
    label: str,
    ledger: DecisionLedger,
) -> None:
    if len(actual) != len(expected):
        _entity_block(ledger, f"{label} source entity count does not match strict source inventory.")
    for wanted, row in zip(expected, actual):
        for field in (
            "sourceEntityId", "sourcePath", "sourceType", "name", "sourceRef",
            "sourceBranchEntityId", "attributes", "enrichedAttributes",
        ):
            actual_value = row.get(field, "" if field == "sourceBranchEntityId" else None)
            if actual_value != wanted[field]:
                _entity_block(
                    ledger,
                    f"{label} field {field} differs for {wanted['sourcePath']}.",
                )


def _verify_model_collections(
    model: dict[str, Any],
    expected: list[dict[str, Any]],
    ledger: DecisionLedger,
) -> None:
    expected_branches = [row for row in expected if row["sourceType"] == "BRANCH"]
    expected_components = [row for row in expected if row["sourceType"] != "BRANCH"]
    for field, wanted in (("branches", expected_branches), ("components", expected_components)):
        actual = _object_array(model.get(field), f"sourceModel.{field}", ledger)
        ids = [str(row.get("sourceEntityId") or "") for row in actual]
        if ids != [row["sourceEntityId"] for row in wanted]:
            _entity_block(ledger, f"sourceModel.{field} order or coverage differs from source arrays.")


def _verify_ports(
    expected: list[dict[str, Any]],
    actual: list[dict[str, Any]],
    label: str,
    ledger: DecisionLedger,
) -> None:
    ids = [str(row.get("sourcePortId") or "") for row in actual]
    collisions = len(ids) - len(set(ids))
    path_roles = [
        (str(row.get("sourcePath") or ""), str(row.get("role") or ""))
        for row in actual
    ]
    if collisions or len(path_roles) != len(set(path_roles)):
        block(
            ledger,
            "MANAGED_STAGE_SOURCE_PORT_DUPLICATE",
            f"{label} source ports contain duplicate identities or path/role pairs.",
            "sourcePorts",
        )
    if len(actual) != len(expected):
        _port_block(ledger, f"{label} source-port count differs from strict source evidence.")
    for wanted, row in zip(expected, actual):
        for field in (
            "sourcePortId", "sourceEntityId", "sourcePath", "field", "role", "position",
        ):
            if row.get(field) != wanted[field]:
                _port_block(
                    ledger,
                    f"{label} source port {wanted['sourcePath']} has wrong {field}.",
                )


def _verify_entity_port_union(
    entities: list[dict[str, Any]],
    expected: list[dict[str, Any]],
    ledger: DecisionLedger,
) -> None:
    union = [port for entity in entities for port in entity.get("ports") or []]
    _verify_ports(expected, union, "entity-owned", ledger)
    owners = {str(row.get("sourceEntityId") or "") for row in entities}
    if any(str(port.get("sourceEntityId") or "") not in owners for port in union):
        block(
            ledger,
            "MANAGED_STAGE_SOURCE_PORT_ORPHAN",
            "Managed-stage entity-owned port references a missing owner.",
            "sourceModel.entities",
        )


def _verify_trace_port_manifest(
    expected: list[dict[str, Any]],
    trace: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    manifest = _object_array(trace.get("sourcePorts"), "traceLedger.sourcePorts", ledger)
    if len(manifest) != len(expected):
        _port_block(ledger, "Trace-ledger source-port manifest is incomplete.")
    for wanted, row in zip(expected, manifest):
        for field in ("sourcePortId", "sourceEntityId", "sourcePath", "field", "role", "sourceType"):
            if row.get(field) != wanted[field]:
                _port_block(
                    ledger,
                    f"Trace-ledger source port {wanted['sourcePath']} has wrong {field}.",
                )


def _branch_path(collection: str, index: int) -> str:
    return f"$[{index}]" if collection == "$" else f"{collection}[{index}]"


def _attributes(source: dict[str, Any]) -> dict[str, Any]:
    return _record(source.get("attributes"))


def _record(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _point(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None
    try:
        point = {axis: float(value[axis]) for axis in ("x", "y", "z")}
    except (KeyError, TypeError, ValueError):
        return None
    if any(item != item or item in {float("inf"), float("-inf")} for item in point.values()):
        return None
    return point


def _object_array(value: Any, name: str, ledger: DecisionLedger) -> list[dict[str, Any]]:
    if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
        block(
            ledger,
            "MANAGED_STAGE_ARTIFACT_SCHEMA_INVALID",
            f"{name} must be an object array.",
            name,
        )
    return value


def _entity_block(ledger: DecisionLedger, message: str) -> None:
    block(
        ledger,
        "MANAGED_STAGE_SOURCE_ENTITY_MISSING",
        message,
        "sourceModel.entities",
    )


def _port_block(ledger: DecisionLedger, message: str) -> None:
    block(
        ledger,
        "MANAGED_STAGE_SOURCE_PORT_ORPHAN",
        message,
        "sourcePorts",
    )


__all__ = ["verify_source_entities_and_ports"]
