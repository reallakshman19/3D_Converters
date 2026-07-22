"""Exact UXML/RVM engineering-field authority."""
from __future__ import annotations
from typing import Any
from .uxml_rvm_contracts import (
    ENGINEERING_SCHEMA, UNIT_SCALE_MM, clean, decimal_value, fail,
    normalized_identity, require_hash, require_list, require_object,
    require_source_binding, require_strings, semantic_normalize,
)

FIELD_ALIASES = {
    "OUTSIDE_DIAMETER": {"DIAMETERMM", "OUTSIDEDIAMETERMM", "PIPEODMM", "OUTSIDEDIAMETER", "ODMM", "OD"},
    "WALL_THICKNESS": {"WALLTHICKNESSMM", "WALLTHICKNESS", "WALLTHKMM", "WALLTHK", "WTMM", "WT"},
}

def _key(value: Any) -> str:
    return normalized_identity(value).replace("_", "").replace("-", "").replace(" ", "")

def _occurrences(mapping: Any, aliases: set[str], origin: str) -> list[dict[str, Any]]:
    if not isinstance(mapping, dict):
        return []
    return [{"origin": origin, "spelling": key, "value": value} for key, value in mapping.items() if _key(key) in aliases and value not in (None, "")]

def validate_engineering_context(artifact: Any, source_hash: str, source_kind: str) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        return None, ""
    context = require_object(artifact, "UXML_RVM_ENGINEERING_CONTEXT_SHAPE", "engineering context")
    if clean(context.get("schema")) != ENGINEERING_SCHEMA:
        fail("UXML_RVM_ENGINEERING_SCHEMA", f"Expected {ENGINEERING_SCHEMA}")
    require_source_binding(context, source_hash, source_kind, "UXML_RVM_ENGINEERING_SOURCE_BINDING")
    if clean(context.get("authorityType")) != "APPROVED_ENGINEERING_CONTEXT":
        fail("UXML_RVM_ENGINEERING_AUTHORITY", "Unknown engineering authority type")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_ENGINEERING_EVIDENCE", "evidenceReferences")
    digest = require_hash(context, "engineeringContextHashSha256", "UXML_RVM_ENGINEERING_HASH")
    return semantic_normalize(context), digest

def _external_decisions(context: dict[str, Any] | None, inventory: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    rows = require_list((context or {}).get("componentDecisions") or [], "UXML_RVM_ENGINEERING_DECISIONS", "componentDecisions")
    external: dict[tuple[str, str], dict[str, Any]] = {}
    for index, item in enumerate(rows):
        row = require_object(item, "UXML_RVM_ENGINEERING_DECISION", f"componentDecisions[{index}]")
        key = (clean(row.get("componentId")), normalized_identity(row.get("field")))
        if key in external:
            fail("UXML_RVM_ENGINEERING_DUPLICATE_DECISION", f"Duplicate engineering decision {key}")
        if key[0] not in inventory["componentById"] or key[1] not in FIELD_ALIASES or key[0] not in inventory["pipeComponentIds"]:
            fail("UXML_RVM_ENGINEERING_DECISION_REFERENCE", f"Unknown engineering decision target {key}")
        if clean(row.get("authority")) != "APPROVED_ENGINEERING_FIELD_DECISION":
            fail("UXML_RVM_ENGINEERING_FIELD_AUTHORITY", f"Unknown field authority for {key}")
        if not clean(row.get("sourceOccurrence")):
            fail("UXML_RVM_ENGINEERING_SOURCE_OCCURRENCE", f"Engineering decision {key} lacks sourceOccurrence")
        disposition = normalized_identity(row.get("disposition"))
        if disposition not in {"EMIT_CANONICAL", "EXPLICIT_ABSENCE"}:
            fail("UXML_RVM_ENGINEERING_DISPOSITION", f"Unknown engineering disposition for {key}")
        if disposition == "EXPLICIT_ABSENCE":
            if row.get("value") not in (None, "") or row.get("canonicalValue") not in (None, ""):
                fail("UXML_RVM_ENGINEERING_EXPLICIT_ABSENCE", f"Explicit absence for {key} cannot carry a value")
        elif row.get("value") in (None, "") or row.get("canonicalValue") in (None, "") or not clean(row.get("unit")):
            fail("UXML_RVM_ENGINEERING_FIELD_SHAPE", f"Engineering decision {key} requires value, canonicalValue, and unit")
        require_strings(row.get("evidenceReferences"), "UXML_RVM_ENGINEERING_FIELD_EVIDENCE", "field evidenceReferences")
        external[key] = row
    return external

def resolve_engineering(uxml: dict[str, Any], inventory: dict[str, Any], context: dict[str, Any] | None) -> dict[str, Any]:
    external = _external_decisions(context, inventory)
    source_unit = clean((uxml.get("units") or {}).get("length")).upper()
    if not source_unit:
        fail("UXML_RVM_SOURCE_UNITS_MISSING", "Source length unit is mandatory")
    if source_unit not in UNIT_SCALE_MM:
        fail("UXML_RVM_ENGINEERING_UNITS", f"Unsupported source length unit {source_unit}")
    resolved: dict[str, Any] = {}
    for component_id in inventory["pipeComponentIds"]:
        component = inventory["componentById"][component_id]; fields = {}
        for field, aliases in FIELD_ALIASES.items():
            occurrences = []
            for origin_name, origin in (("component", component), ("rawAttributes", component.get("rawAttributes") or {}), ("normalized", component.get("normalized") or {}), ("derived", component.get("derived") or {})):
                occurrences += _occurrences(origin, aliases, f"{component_id}.{origin_name}")
            source_values = [decimal_value(item["value"], "UXML_RVM_ENGINEERING_VALUE", f"{item['origin']}.{item['spelling']}") * UNIT_SCALE_MM[source_unit] for item in occurrences]
            if len(set(source_values)) > 1:
                fail("UXML_RVM_ENGINEERING_ALIAS_CONFLICT", f"Component {component_id} has contradictory {field} aliases")
            source_value = source_values[0] if source_values else None
            external_row = external.get((component_id, field)); external_value = None
            if external_row and normalized_identity(external_row.get("disposition")) != "EXPLICIT_ABSENCE":
                unit = clean(external_row.get("unit")).upper()
                if unit not in UNIT_SCALE_MM:
                    fail("UXML_RVM_ENGINEERING_UNITS", f"Unsupported unit {unit} for {component_id}.{field}")
                external_value = decimal_value(external_row.get("value"), "UXML_RVM_ENGINEERING_VALUE", f"{component_id}.{field}") * UNIT_SCALE_MM[unit]
                canonical = decimal_value(external_row.get("canonicalValue"), "UXML_RVM_ENGINEERING_CANONICAL", f"{component_id}.{field}.canonicalValue")
                if canonical != external_value:
                    fail("UXML_RVM_ENGINEERING_CANONICAL", f"Canonical value mismatch for {component_id}.{field}")
            if source_value is not None and external_value is not None and source_value != external_value:
                fail("UXML_RVM_ENGINEERING_OVERRIDE", f"External evidence contradicts source {component_id}.{field}")
            final = source_value if source_value is not None else external_value
            if final is None:
                fail("UXML_RVM_ENGINEERING_REQUIRED_MISSING", f"PIPE {component_id} lacks required {field}")
            if final <= 0:
                fail("UXML_RVM_ENGINEERING_NONPOSITIVE", f"PIPE {component_id} requires positive {field}")
            fields[field] = {"canonicalValueMm": final, "sourceOccurrences": occurrences, "externalDecision": external_row}
        resolved[component_id] = fields
    return resolved
