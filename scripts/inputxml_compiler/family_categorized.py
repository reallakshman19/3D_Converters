#!/usr/bin/env python3
"""CategorizedInputXML v3 reconciliation for PR-5 family resolution."""
from __future__ import annotations

import copy
from typing import Any

from lxml import etree as ET

from .base import CompileBlocked, DecisionLedger
from .extension import _ensure_extension_last, _extension_record, _preserve_child
from .family_counts import apply_canonical_counts
from .family_profiles import FamilyProfileContract
from .family_resolution import IdentityRegistry, LineScopeState, resolve_document_context
from .family_element import normalize_family_element
from .counts import _new_root
from .xml import _local, _namespace, _parse_xml, _same_numeric

_NUMERIC_OVERLAYS = {
    "FROM_NODE", "TO_NODE", "DELTA_X", "DELTA_Y", "DELTA_Z",
    "DIAMETER", "WALL_THICK", "INSUL_THICK",
}
_TEXT_OVERLAYS = {"FROM_NAME", "TO_NAME", "LINE"}
_REVIEW_BLOCKS = {
    "DerivedBlock", "BendBlock", "RigidBlock", "FlangeBlock", "MiscBlock",
    "NodesBlock",
}


def compile_categorized_candidate(
    root: ET._Element,
    *,
    profile: FamilyProfileContract,
    ledger: DecisionLedger,
    aliases: dict[str, dict[str, str]],
    context: dict[str, Any],
) -> ET._Element:
    resolved = resolve_document_context(
        profile=profile,
        source_version=None,
        source_job_name=None,
        source_time=None,
        source_issue_no=None,
        source_north=(None, None, None),
        context=context,
        ledger=ledger,
    )
    canonical, model = _new_root(resolved["version"])
    _apply_model_context(model, resolved)
    line_scope = LineScopeState()
    identities = IdentityRegistry()
    ordinal = 0
    for line_index, line in enumerate(root.findall("Line"), 1):
        line_identity, line_evidence = _line_identity(line, line_index, ledger)
        _preserve_line_evidence(
            canonical,
            line,
            line_index,
            line_identity,
            line_evidence,
            ledger,
        )
        for element_index, element in enumerate(line.findall("Element"), 1):
            ordinal += 1
            source_id = f"CategorizedInputXML/Line[{line_index}]/Element[{element_index}]"
            original_text, original = _original_element(element, source_id, ledger)
            _reconcile_element_identity(element, original, source_id, ledger)
            overlays = _categorized_overlays(element, line_identity)
            _apply_overlays(original, overlays, source_id, ledger)
            _preserve_original_and_review(
                original,
                original_text,
                element,
                source_id,
                ledger,
            )
            normalized = normalize_family_element(
                original,
                index=ordinal,
                source_entity_id=source_id,
                model=model,
                ledger=ledger,
                aliases=aliases,
                profile=profile,
                context=context,
                line_scope=line_scope,
                identities=identities,
            )
            model.append(normalized)
    if ordinal == 0:
        _block(
            ledger,
            "CATEGORIZED_ORIGINAL_MISSING",
            "CategorizedInputXML contains no transferable Element records.",
            "document",
        )
    apply_canonical_counts(model, ledger)
    _ensure_extension_last(model)
    _ensure_extension_last(canonical)
    ledger.add(
        source_entity_id="generated:CAESARII",
        source_type="SYNTHETIC_CANONICAL_WRAPPER",
        source_fields={"profileId": profile.profile_id, "elementCount": ordinal},
        disposition="EMIT_1_TO_1",
        evidence=["profile-required canonical wrapper generated from categorized transfer evidence"],
        cii_section="VERSION",
    )
    return canonical


def _apply_model_context(model: ET._Element, resolved: dict[str, Any]) -> None:
    model.set("JOBNAME", resolved["jobName"])
    if resolved["time"] is not None:
        model.set("TIME", resolved["time"])
    if resolved["issueNo"] is not None:
        model.set("ISSUE_NO", resolved["issueNo"])
    for field, value in zip(("NORTH_X", "NORTH_Y", "NORTH_Z"), resolved["north"]):
        model.set(field, value)


def _line_identity(
    line: ET._Element,
    line_index: int,
    ledger: DecisionLedger,
) -> tuple[str, dict[str, str]]:
    block = line.find("LineBlock")
    if block is None:
        _block(
            ledger,
            "CATEGORIZED_OVERLAY_CONFLICT",
            f"Categorized Line[{line_index}] lacks LineBlock.",
            f"CategorizedInputXML/Line[{line_index}]",
        )
    evidence = {
        "lineId": (line.get("id") or "").strip(),
        "branchName": (block.findtext("Branchname") or "").strip(),
        "lineNo": (block.findtext("LineNo") or "").strip(),
    }
    line_identity = evidence["lineNo"]
    if not line_identity:
        _block(
            ledger,
            "CATEGORIZED_OVERLAY_CONFLICT",
            f"Categorized Line[{line_index}] requires LineBlock/LineNo.",
            f"CategorizedInputXML/Line[{line_index}]",
        )
    for field in ("lineId", "branchName"):
        value = evidence[field]
        if value and value != line_identity:
            _block(
                ledger,
                "CATEGORIZED_OVERLAY_CONFLICT",
                f"Categorized Line[{line_index}] {field}={value!r} conflicts with LineNo={line_identity!r}.",
                f"CategorizedInputXML/Line[{line_index}]",
            )
    return line_identity, evidence


def _preserve_line_evidence(
    canonical: ET._Element,
    line: ET._Element,
    line_index: int,
    line_identity: str,
    evidence: dict[str, str],
    ledger: DecisionLedger,
) -> None:
    block = line.find("LineBlock")
    source_id = f"CategorizedInputXML/Line[{line_index}]"
    ledger.add(
        source_entity_id=source_id,
        source_type="CATEGORIZED_LINE",
        source_fields=evidence,
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION",
        evidence=["LineNo is the authoritative transfer scope; grouping evidence retained"],
    )
    for name in ("PipingClass", "Rating"):
        node = block.find(name) if block is not None else None
        if node is None:
            continue
        value = (node.text or "").strip()
        _extension_record(
            canonical,
            producer=ledger.producer,
            dialect=ledger.dialect,
            name=f"Categorized{name}",
            source_path=ledger.source_path,
            source_entity_id=source_id,
            source_field=name,
            value=value,
            disposition="PRESERVE_EXTENSION",
            criticality="MEDIUM",
            confidence=1.0,
        )
        ledger.add(
            source_entity_id=f"{source_id}/{name}",
            source_type="CATEGORIZED_ENRICHMENT_EVIDENCE",
            source_fields={name: value, "lineIdentity": line_identity},
            projection_cardinality="1_TO_0",
            disposition="PRESERVE_EXTENSION",
            evidence=["review metadata is not canonical engineering authority"],
        )


def _original_element(
    element: ET._Element,
    source_id: str,
    ledger: DecisionLedger,
) -> tuple[str, ET._Element]:
    node = element.find("OriginalElement")
    text = (node.text or "") if node is not None else ""
    if not text.strip():
        _block(
            ledger,
            "CATEGORIZED_ORIGINAL_MISSING",
            f"{source_id} lacks OriginalElement evidence.",
            source_id,
        )
    try:
        original = _parse_xml(
            text.encode("utf-8"),
            f"{source_id}/OriginalElement",
        )
    except CompileBlocked as exc:
        ledger.diagnostic(
            "BLOCKING",
            "CATEGORIZED_ORIGINAL_MALFORMED",
            str(exc),
            f"{source_id}/OriginalElement",
        )
        raise
    if _namespace(original.tag) != "" or _local(original.tag) != "PIPINGELEMENT":
        _block(
            ledger,
            "CATEGORIZED_ORIGINAL_MISSING",
            f"{source_id} OriginalElement must contain one unqualified PIPINGELEMENT root.",
            source_id,
        )
    return text, copy.deepcopy(original)


def _reconcile_element_identity(
    element: ET._Element,
    original: ET._Element,
    source_id: str,
    ledger: DecisionLedger,
) -> None:
    pairs = {
        "FROM_NODE": element.get("fromNode") or "",
        "TO_NODE": element.get("toNode") or "",
    }
    for field, normalized in pairs.items():
        if not normalized:
            _block(
                ledger,
                "CATEGORIZED_OVERLAY_CONFLICT",
                f"{source_id} requires {field} transfer identity.",
                source_id,
            )
        source_value = original.get(field)
        if source_value is not None and not _same_numeric(source_value, normalized):
            _overlay_conflict(ledger, source_id, field, normalized, source_value)
        original.set(field, normalized)
    element_key = (element.get("elementKey") or "").strip()
    if not element_key:
        _block(
            ledger,
            "CATEGORIZED_OVERLAY_CONFLICT",
            f"{source_id} requires elementKey.",
            source_id,
        )
    if original.get("ID") is None:
        original.set("ID", element_key)
    elif original.get("ID") != element_key:
        ledger.add(
            source_entity_id=f"{source_id}@elementKey",
            source_type="CATEGORIZED_IDENTITY_EVIDENCE",
            source_fields={"elementKey": element_key, "originalId": original.get("ID")},
            disposition="PRESERVE_EXTENSION",
            evidence=["OriginalElement ID remains source identity; elementKey retained separately"],
        )


def _categorized_overlays(
    element: ET._Element,
    line_identity: str,
) -> dict[str, str]:
    overlays = {"LINE": line_identity}
    mappings = {
        "NameBlock": ("FROM_NAME", "TO_NAME"),
        "RouteGeometryBlock": ("DELTA_X", "DELTA_Y", "DELTA_Z"),
        "SectionDimensionBlock": ("DIAMETER", "WALL_THICK", "INSUL_THICK"),
    }
    for block_name, fields in mappings.items():
        block = element.find(block_name)
        if block is None:
            continue
        for field in fields:
            node = block.find(field)
            if node is not None and (node.text or "").strip() != "":
                overlays[field] = (node.text or "").strip()
    return overlays


def _apply_overlays(
    original: ET._Element,
    overlays: dict[str, str],
    source_id: str,
    ledger: DecisionLedger,
) -> None:
    for field, normalized in overlays.items():
        source_value = original.get(field)
        if source_value is not None:
            same = (
                source_value.strip() == normalized.strip()
                if field in _TEXT_OVERLAYS
                else _same_numeric(source_value, normalized)
            )
            if not same:
                _overlay_conflict(ledger, source_id, field, normalized, source_value)
        original.set(field, normalized)
        ledger.add(
            source_entity_id=f"{source_id}@{field}",
            source_type="CATEGORIZED_NORMALIZED_FIELD",
            source_fields={"field": field, "normalized": normalized, "original": source_value},
            disposition="EMIT_1_TO_1",
            evidence=["normalized overlay is equivalent to or fills absent OriginalElement evidence"],
        )


def _preserve_original_and_review(
    original: ET._Element,
    original_text: str,
    element: ET._Element,
    source_id: str,
    ledger: DecisionLedger,
) -> None:
    _extension_record(
        original,
        producer=ledger.producer,
        dialect=ledger.dialect,
        name="OriginalElement",
        source_path=ledger.source_path,
        source_entity_id=source_id,
        source_field="OriginalElement",
        value=original_text,
        disposition="PRESERVE_EXTENSION",
        criticality="HIGH",
        confidence=1.0,
    )
    ledger.add(
        source_entity_id=f"{source_id}/OriginalElement",
        source_type="CATEGORIZED_ORIGINAL_ELEMENT",
        source_fields={"xml": original_text},
        disposition="PRESERVE_EXTENSION",
        evidence=["embedded original evidence retained losslessly"],
    )
    for child in element:
        name = _local(child.tag)
        if name in {"OriginalElement", "NameBlock", "RouteGeometryBlock", "SectionDimensionBlock"}:
            continue
        if name in _REVIEW_BLOCKS:
            _preserve_child(
                original,
                child,
                ledger.source_path,
                source_id,
                ledger,
                blocking=False,
            )
        else:
            _preserve_child(
                original,
                child,
                ledger.source_path,
                source_id,
                ledger,
                blocking=True,
            )
    _ensure_extension_last(original)


def _overlay_conflict(
    ledger: DecisionLedger,
    source_id: str,
    field: str,
    normalized: str,
    original: str,
) -> None:
    ledger.add(
        source_entity_id=f"{source_id}@{field}",
        source_type="CATEGORIZED_CONFLICT",
        source_fields={"field": field, "normalized": normalized, "original": original},
        disposition="REJECT_INVALID",
        diagnostics=["categorized normalized value conflicts with OriginalElement"],
    )
    _block(
        ledger,
        "CATEGORIZED_OVERLAY_CONFLICT",
        f"Categorized conflict at {source_id}/{field}: normalized={normalized!r}, original={original!r}.",
        f"{source_id}@{field}",
    )


def _block(
    ledger: DecisionLedger,
    code: str,
    message: str,
    source_entity_id: str,
) -> None:
    ledger.diagnostic("BLOCKING", code, message, source_entity_id)
    raise CompileBlocked(message)


__all__ = ["compile_categorized_candidate"]
