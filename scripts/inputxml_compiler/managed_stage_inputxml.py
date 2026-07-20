#!/usr/bin/env python3
"""Secure topology InputXML reconciliation and profile-specific canonical candidate."""
from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from typing import Any

from lxml import etree as ET

from .base import COADE_NS, COUNT_FIELDS, EXT_NS, DecisionLedger
from .extension import _ensure_extension_last, _extension_record
from .managed_stage_diagnostics import block, retain_blocker
from .managed_stage_intake import ManagedStageIntake
from .xml import _local, _namespace, _parse_xml

_SENTINEL = Decimal("-1.0101")
_ELEMENT_TRACE = {
    "CANONICAL_EDGE_ID", "FROM_CANONICAL_NODE_ID", "TO_CANONICAL_NODE_ID",
    "SOURCE_ENTITY_IDS", "SOURCE_PORT_IDS", "FROM_SOURCE_ENTITY_IDS",
    "TO_SOURCE_ENTITY_IDS", "FROM_SOURCE_PORT_IDS", "TO_SOURCE_PORT_IDS",
    "BRANCH_IDS", "TOPOLOGY_OPERATION", "PROJECTION_CARDINALITY", "MERGE_AUTHORITY",
}
_RESTRAINT_TRACE = {
    "SUPPORT_ID", "CANONICAL_NODE_ID", "SOURCE_ENTITY_IDS", "SOURCE_PATHS",
    "BRANCH_IDS", "ATTACHMENT_AUTHORITY", "ATTACHMENT_REFERENCES",
    "CONNECTION_RESIDUAL", "SOURCE_X", "SOURCE_Y", "SOURCE_Z",
    "ATTACHMENT_X", "ATTACHMENT_Y", "ATTACHMENT_Z",
}
_RIGID_TRACE = {
    "CANONICAL_EDGE_ID", "SOURCE_ENTITY_IDS", "SOURCE_PATHS", "BRANCH_IDS",
    "ASSIGNMENT_AUTHORITY", "CONNECTION_RESIDUAL",
}
_MODEL_TRACE = {
    "CANONICAL_TOPOLOGY_HASH", "TOPOLOGY_TRACE_LEDGER_HASH",
    "TOPOLOGY_EDIT_DRAFT_HASH", "TOPOLOGY_EDIT_LEDGER_HASH",
}
_ELEMENT_COMPAT = {
    "MODULUS", "POISSONS", "PIPE_DENSITY", "MATERIAL_NAME", "NAME",
    "GLOBAL_COORD_BASIS_NODE", "SOURCE_TYPE",
}
_ELEMENT_CANONICAL = {
    "ID", "FROM_NODE", "TO_NODE", "DELTA_X", "DELTA_Y", "DELTA_Z",
    "DIAMETER", "WALL_THICK", "INSUL_THICK", "CORR_ALLOW",
    *{f"TEMP_EXP_C{i}" for i in range(1, 10)},
    *{f"PRESSURE_C{i}" for i in range(1, 10)},
    "HYDRO_PRESSURE", "INSUL_DENSITY", "FLUID_DENSITY", "MATERIAL_NUM",
    "FROM_NAME", "TO_NAME", "LINE", "FROM_X", "FROM_Y", "FROM_Z",
    "TO_X", "TO_Y", "TO_Z",
}
_CHILD_CANONICAL = {
    "BEND": {"RADIUS", "TYPE", "ANGLE1", "NODE1", "ANGLE2", "NODE2", "ANGLE3", "NODE3", "NUM_MITER", "FITTINGTHICKNESS", "KFACTOR"},
    "RIGID": {"WEIGHT"},
    "RESTRAINT": {"NUM", "NODE", "TYPE", "STIFFNESS", "GAP", "FRIC_COEF", "CNODE", "XCOSINE", "YCOSINE", "ZCOSINE", "TAG", "GUID"},
}


def build_managed_stage_candidate(
    result: dict[str, Any],
    intake: ManagedStageIntake,
    topology: dict[str, Any],
    ledger: DecisionLedger,
) -> ET._Element:
    root = _parse_xml(result["topologyInputXml"].encode("utf-8"), "managed-stage.topology.input.xml")
    if _namespace(root.tag) != COADE_NS or _local(root.tag) != "CAESARII":
        _inputxml_block(ledger, "Topology InputXML root is not {COADE}CAESARII.")
    if root.get("XML_TYPE") != "Input":
        _inputxml_block(ledger, "Topology InputXML XML_TYPE is not Input.")
    model = _direct_one(root, "PIPINGMODEL", ledger)
    _verify_context_assertions(root, model, intake, ledger)
    parsed_elements = {
        str(row.get("inputXmlElementId") or row.get("id") or ""): row
        for row in result["parsedInputXmlTopology"].get("elements") or []
    }
    canonical_edges = {
        str(row["inputXmlElementIds"][0]): row
        for row in topology["collections"]["edges"]
    }
    elements = [child for child in model if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGELEMENT"]
    if [str(row.get("ID") or "") for row in elements] != list(canonical_edges):
        _inputxml_block(ledger, "Topology InputXML element order/population differs from canonical edges.")
    for element in elements:
        element_id = str(element.get("ID") or "")
        parsed = parsed_elements.get(element_id)
        if parsed is None or dict(element.attrib) != parsed.get("attributes"):
            _inputxml_block(ledger, f"Securely parsed element {element_id} differs from ParsedInputXmlTopology.v1.")
        _sanitize_element(element, canonical_edges[element_id], parsed, ledger)
    _reconcile_counts(model, elements, topology, ledger)
    _sanitize_model(model, intake, result, ledger)
    _preserve_artifact_evidence(model, intake, result, ledger)
    _ensure_extension_last(model)
    _ensure_extension_last(root)
    return root


def _verify_context_assertions(
    root: ET._Element,
    model: ET._Element,
    intake: ManagedStageIntake,
    ledger: DecisionLedger,
) -> None:
    context = intake.source_context
    if root.get("VERSION") != context["version"]:
        block(
            ledger,
            "MANAGED_STAGE_INPUTXML_RELATION_MISMATCH",
            "Producer topology InputXML version differs from explicit profile context.",
            "topologyInputXml@VERSION",
            expected=context["version"],
            actual=root.get("VERSION"),
        )
    if model.get("JOBNAME") != context["jobName"]:
        _inputxml_block(ledger, "Producer topology InputXML JOBNAME differs from explicit context.")
    north = [model.get(field) for field in ("NORTH_X", "NORTH_Y", "NORTH_Z")]
    if not all(_same_decimal(value, expected) for value, expected in zip(north, context["north"])):
        _inputxml_block(ledger, "Producer topology InputXML north vector differs from explicit context.")


def _sanitize_element(
    element: ET._Element,
    edge: dict[str, Any],
    parsed: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    _verify_element_trace(element, edge, parsed, ledger)
    aliases = {
        "LINE_ID": "LINE",
        "FROM_GLOBAL_X": "FROM_X", "FROM_GLOBAL_Y": "FROM_Y", "FROM_GLOBAL_Z": "FROM_Z",
        "TO_GLOBAL_X": "TO_X", "TO_GLOBAL_Y": "TO_Y", "TO_GLOBAL_Z": "TO_Z",
        **{f"PRESSURE{i}": f"PRESSURE_C{i}" for i in range(1, 10)},
    }
    for source_name, target_name in aliases.items():
        if source_name not in element.attrib:
            continue
        value = element.attrib.pop(source_name)
        if target_name in element.attrib and not _same_decimal(element.get(target_name), value):
            _inputxml_block(ledger, f"Element {element.get('ID')} alias {source_name}/{target_name} conflicts.")
        element.set(target_name, value)
        _record_removed_attribute(element, source_name, value, "ALIAS_RENAMED", ledger)
    for name in list(element.attrib):
        value = element.get(name) or ""
        if name in _ELEMENT_TRACE:
            _record_removed_attribute(element, name, value, "TRACE_RECONCILED", ledger)
            del element.attrib[name]
        elif name in _ELEMENT_COMPAT:
            _record_removed_attribute(element, name, value, "COMPATIBILITY_EVIDENCE", ledger)
            del element.attrib[name]
        elif name not in _ELEMENT_CANONICAL:
            _inputxml_block(ledger, f"Element {element.get('ID')} has unknown attribute {name}.")
    for name in list(element.attrib):
        value = element.get(name) or ""
        if name in {"FROM_NODE", "TO_NODE", "MATERIAL_NUM"}:
            element.set(name, _integer_lexical(value, f"{element.get('ID')}@{name}", ledger, positive=True))
        elif name not in {"ID", "FROM_NAME", "TO_NAME", "LINE"}:
            if _is_sentinel(value):
                if name in {"DELTA_X", "DELTA_Y", "DELTA_Z"}:
                    _inputxml_block(ledger, f"Element {element.get('ID')} required geometry uses a sentinel.")
                _record_removed_attribute(element, name, value, "EXPLICIT_SOURCE_ABSENCE", ledger)
                del element.attrib[name]
            else:
                element.set(name, _decimal_lexical(value, f"{element.get('ID')}@{name}", ledger))
    _sanitize_children(element, parsed, ledger)


def _verify_element_trace(
    element: ET._Element,
    edge: dict[str, Any],
    parsed: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    expected = {
        "CANONICAL_EDGE_ID": str(edge["id"]),
        "FROM_CANONICAL_NODE_ID": str(edge["fromNodeId"]),
        "TO_CANONICAL_NODE_ID": str(edge["toNodeId"]),
        "SOURCE_ENTITY_IDS": ",".join(edge.get("sourceEntityIds") or []),
        "SOURCE_PORT_IDS": ",".join(edge.get("sourcePortIds") or []),
        "BRANCH_IDS": ",".join(edge.get("branchIds") or edge.get("sourceBranchEntityIds") or []),
        "TOPOLOGY_OPERATION": str(edge.get("topologyOperation") or edge.get("segmentRole") or ""),
        "PROJECTION_CARDINALITY": str(edge.get("projectionCardinality") or "ONE_TO_ONE"),
        "MERGE_AUTHORITY": str(edge.get("projectionMergeAuthority") or ""),
    }
    for name, value in expected.items():
        if element.get(name, "") != value:
            _inputxml_block(ledger, f"Element {element.get('ID')} trace attribute {name} contradicts canonical topology.")
    if parsed.get("canonicalEdgeId") != edge["id"]:
        _inputxml_block(ledger, f"Parsed element {element.get('ID')} canonical edge identity is wrong.")


def _sanitize_children(
    element: ET._Element,
    parsed: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    parsed_children = {
        str(row.get("id") or ""): row
        for field in ("restraints", "rigids", "otherChildren")
        for row in parsed.get(field) or []
    }
    for child in list(element):
        name = _local(child.tag)
        if _namespace(child.tag) == EXT_NS:
            continue
        if name not in _CHILD_CANONICAL:
            _inputxml_block(ledger, f"Element {element.get('ID')} has unsupported child {name}.")
        child_id = str(child.get("ID") or "")
        parsed_child = parsed_children.get(child_id)
        if parsed_child is None or dict(child.attrib) != parsed_child.get("attributes"):
            _inputxml_block(ledger, f"Child {child_id or name} differs from ParsedInputXmlTopology.v1.")
        trace_names = _RESTRAINT_TRACE if name == "RESTRAINT" else _RIGID_TRACE if name == "RIGID" else set()
        for attr in list(child.attrib):
            value = child.get(attr) or ""
            if attr == "ID" or attr in trace_names or (name == "BEND" and attr == "RADIUS_AUTHORITY") or (name == "RIGID" and attr in {"TYPE", "SOURCE_BODY_COUNT"}):
                _record_removed_attribute(element, f"{name}.{attr}", value, "CHILD_EVIDENCE_RECONCILED", ledger)
                del child.attrib[attr]
            elif attr not in _CHILD_CANONICAL[name]:
                _inputxml_block(ledger, f"Child {child_id or name} has unknown attribute {attr}.")
        for attr in list(child.attrib):
            value = child.get(attr) or ""
            if attr in {"NUM", "NODE", "TYPE", "CNODE", "NODE1", "NODE2", "NODE3", "NUM_MITER"}:
                if _is_sentinel(value):
                    if name == "RESTRAINT" and attr == "CNODE":
                        child.set(attr, "0")
                        _record_removed_attribute(element, f"{name}.{attr}", value, "EXPLICIT_NO_CONNECTING_NODE", ledger)
                    elif attr in {"NODE2", "NODE3", "NUM_MITER", "TYPE"} and name == "BEND":
                        del child.attrib[attr]
                    else:
                        _inputxml_block(ledger, f"Child {child_id or name} required identity {attr} uses a sentinel.")
                else:
                    child.set(attr, _integer_lexical(value, f"{child_id or name}@{attr}", ledger, positive=attr not in {"CNODE", "NUM_MITER"}))
            elif attr not in {"TAG", "GUID"}:
                if _is_sentinel(value):
                    if attr == "RADIUS" or attr == "WEIGHT":
                        _inputxml_block(ledger, f"Child {child_id or name} required value {attr} uses a sentinel.")
                    del child.attrib[attr]
                else:
                    child.set(attr, _decimal_lexical(value, f"{child_id or name}@{attr}", ledger))


def _reconcile_counts(
    model: ET._Element,
    elements: list[ET._Element],
    topology: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    actual = {field: 0 for field in COUNT_FIELDS}
    actual["NUMELT"] = len(elements)
    actual["NUMBEND"] = sum(1 for element in elements if element.find("BEND") is not None)
    actual["NUMRIGID"] = sum(1 for element in elements if element.find("RIGID") is not None)
    actual["NUMREST"] = sum(1 for element in elements if element.find("RESTRAINT") is not None)
    for field, value in actual.items():
        asserted = _integer_lexical(model.get(field, ""), f"PIPINGMODEL@{field}", ledger, positive=False)
        if int(asserted) != value:
            if field == "NUMBEND" and value == 0 and any(
                str(row.get("segmentRole") or "").startswith("ELBO/BEND")
                for row in topology["collections"]["edges"]
            ):
                retain_blocker(
                    ledger,
                    "MANAGED_STAGE_BEND_PROJECTION_GAP",
                    "Bend topology exists but no canonical BEND child was emitted.",
                    "PIPINGMODEL@NUMBEND",
                    asserted=int(asserted),
                    actual=value,
                )
            else:
                block(
                    ledger,
                    "MANAGED_STAGE_COUNT_MISMATCH",
                    f"Producer count {field}={asserted} differs from canonical value {value}.",
                    f"PIPINGMODEL@{field}",
                )
        ledger.add(
            source_entity_id=f"topologyInputXml/PIPINGMODEL@{field}",
            source_type="MANAGED_STAGE_COUNT_ASSERTION",
            source_fields={"field": field, "asserted": int(asserted), "canonical": value},
            projection_cardinality="1_TO_1",
            disposition="EMIT_1_TO_1" if int(asserted) == value else "DEFER_EXPLICITLY",
            evidence=["producer NUM* assertion reconciled to canonical owner/count authority"],
        )
        model.set(field, str(value))


def _sanitize_model(
    model: ET._Element,
    intake: ManagedStageIntake,
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    hashes = {
        "CANONICAL_TOPOLOGY_HASH": result["canonicalTopology"]["canonicalTopologyHash"],
        "TOPOLOGY_TRACE_LEDGER_HASH": result["traceLedger"]["topologyTraceLedgerHash"],
    }
    for name in list(model.attrib):
        if name in _MODEL_TRACE:
            if name in hashes and model.get(name) != hashes[name]:
                _inputxml_block(ledger, f"PIPINGMODEL {name} is stale.")
            _record_removed_attribute(model, name, model.get(name) or "", "ARTIFACT_HASH_RECONCILED", ledger)
            del model.attrib[name]
        elif name not in {"JOBNAME", "TIME", "ISSUE_NO", *COUNT_FIELDS, "NORTH_X", "NORTH_Y", "NORTH_Z"}:
            _inputxml_block(ledger, f"PIPINGMODEL has unknown attribute {name}.")
    context = intake.source_context
    model.set("JOBNAME", context["jobName"])
    for field, value in zip(("NORTH_X", "NORTH_Y", "NORTH_Z"), context["north"]):
        model.set(field, _decimal_lexical(value, f"compiler-context@{field}", ledger))
    for key, field in (("time", "TIME"), ("issueNo", "ISSUE_NO")):
        if key in context and str(context[key]).strip():
            model.set(field, str(context[key]).strip())
        else:
            model.attrib.pop(field, None)
    for key in ("version", "jobName", "north", "time", "issueNo"):
        if key not in context:
            continue
        ledger.add(
            source_entity_id=f"compiler-context@{key}",
            source_type="MANAGED_STAGE_CONTEXT_FIELD",
            source_fields={"key": key, "value": context[key]},
            projection_cardinality="1_TO_1",
            disposition="EMIT_1_TO_1",
            evidence=["explicit managed-stage context authority"],
        )


def _preserve_artifact_evidence(
    model: ET._Element,
    intake: ManagedStageIntake,
    result: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    values = {
        "ManagedStageSourceDocument": intake.source_text,
        "ManagedStageSourceIdentity": result["sourceIdentity"],
        "ManagedStageArtifactHashes": {
            "canonicalTopologyHash": result["canonicalTopology"]["canonicalTopologyHash"],
            "topologyTraceLedgerHash": result["traceLedger"]["topologyTraceLedgerHash"],
            "parsedInputXmlTopologyHash": result["parsedInputXmlTopology"]["parsedInputXmlTopologyHash"],
            "svgSceneHash": result["topologySvgScene"]["svgSceneHash"],
            "topologyParityReportHash": result["topologyParityReport"]["topologyParityReportHash"],
        },
    }
    for name, value in values.items():
        _extension_record(
            model,
            producer=ledger.producer,
            dialect="managed-stage-json",
            name=name,
            source_path=ledger.source_path,
            source_entity_id="$",
            source_field=name,
            value=value if isinstance(value, str) else json.dumps(value, sort_keys=True, separators=(",", ":")),
            disposition="PRESERVE_EXTENSION",
            criticality="HIGH",
            confidence=1.0,
        )


def _record_removed_attribute(
    owner: ET._Element,
    name: str,
    value: str,
    disposition: str,
    ledger: DecisionLedger,
) -> None:
    _extension_record(
        owner,
        producer=ledger.producer,
        dialect="managed-stage-json",
        name="ManagedStageTopologyInputXmlAttribute",
        source_path=ledger.source_path,
        source_entity_id=f"topologyInputXml::{owner.get('ID') or _local(owner.tag)}@{name}",
        source_field=name,
        value=value,
        disposition="PRESERVE_EXTENSION",
        criticality="MEDIUM",
        confidence=1.0,
    )


def _direct_one(root: ET._Element, name: str, ledger: DecisionLedger) -> ET._Element:
    rows = [child for child in root if _namespace(child.tag) == "" and _local(child.tag) == name]
    if len(rows) != 1:
        _inputxml_block(ledger, f"Topology InputXML requires exactly one direct {name}.")
    return rows[0]


def _integer_lexical(value: str, field: str, ledger: DecisionLedger, *, positive: bool) -> str:
    try:
        number = Decimal(str(value))
        integral = number.to_integral_value()
    except InvalidOperation:
        _inputxml_block(ledger, f"{field} is not an integer-like decimal.")
    if not number.is_finite() or number != integral or (positive and integral <= 0) or (not positive and integral < 0):
        _inputxml_block(ledger, f"{field} is outside its integer contract.")
    return str(int(integral))


def _decimal_lexical(value: Any, field: str, ledger: DecisionLedger) -> str:
    try:
        number = Decimal(str(value))
    except InvalidOperation:
        _inputxml_block(ledger, f"{field} is not a finite decimal.")
    if not number.is_finite():
        _inputxml_block(ledger, f"{field} is not a finite decimal.")
    if number == 0:
        return "0"
    text = format(number, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def _is_sentinel(value: Any) -> bool:
    try:
        return Decimal(str(value)) == _SENTINEL
    except InvalidOperation:
        return False


def _same_decimal(left: Any, right: Any) -> bool:
    try:
        return Decimal(str(left)) == Decimal(str(right))
    except InvalidOperation:
        return str(left).strip() == str(right).strip()


def _inputxml_block(ledger: DecisionLedger, message: str) -> None:
    block(ledger, "MANAGED_STAGE_INPUTXML_RELATION_MISMATCH", message, "topologyInputXml")


__all__ = ["build_managed_stage_candidate"]
