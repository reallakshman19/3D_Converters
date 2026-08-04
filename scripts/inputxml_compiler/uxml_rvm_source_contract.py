"""Closed source-document contract for the UXML/RVM compiler profile."""
from __future__ import annotations

from typing import Any

from .uxml_rvm_contracts import (
    clean, fail, normalized_identity, require_list, require_object,
    require_strings, unique_index,
)

_REQUIRED_SECTIONS = (
    "header", "sources", "mappings", "units", "pipelines", "components",
    "anchors", "ports", "segments", "supports", "topologyHints",
    "rayEvidence", "lossContract", "diagnostics",
)
_DIAGNOSTIC_COLLECTIONS = (
    "sources", "pipelines", "components", "anchors", "ports", "segments",
    "supports", "topologyHints", "rayEvidence",
)
_BLOCKING_SEVERITIES = {"ERROR", "FATAL", "BLOCKING"}


def require_source_sections(uxml: dict[str, Any]) -> None:
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


def validate_source_units(uxml: dict[str, Any], coordinate_context: dict[str, Any]) -> None:
    units = uxml["units"]
    coordinate_unit = clean(units.get("coordinates")).upper()
    length_unit = clean(units.get("length")).upper()
    if not coordinate_unit or not length_unit:
        fail("UXML_RVM_SOURCE_UNITS_MISSING", "Source coordinate and length units are mandatory")
    if coordinate_unit != clean(coordinate_context.get("sourceCoordinateUnits")).upper():
        fail("UXML_RVM_SOURCE_COORDINATE_UNIT_CONTRADICTION", "Source and coordinate-context units disagree")


def validate_component_source_refs(
    components: list[dict[str, Any]], source_by_id: dict[str, dict[str, Any]],
) -> None:
    for component in components:
        refs = require_strings(
            component.get("sourceRefs"), "UXML_RVM_COMPONENT_SOURCE_REFS",
            f"{component.get('id')}.sourceRefs",
        )
        unknown = sorted(set(refs) - set(source_by_id))
        if unknown:
            fail("UXML_RVM_COMPONENT_SOURCE_REF", f"Component {component['id']} has unknown sourceRefs {unknown}")


def validate_mappings(
    mappings: list[dict[str, Any]], source_by_id: dict[str, dict[str, Any]],
) -> None:
    source_formats = {
        normalized_identity(source.get("format"))
        for source in source_by_id.values()
        if clean(source.get("format"))
    }
    for index, mapping in enumerate(mappings):
        row = require_object(mapping, "UXML_RVM_MAPPING_SHAPE", f"mappings[{index}]")
        for field in ("profile", "sourceFormat", "sourceField", "targetField", "confidence"):
            if not clean(row.get(field)):
                fail("UXML_RVM_MAPPING_FIELD", f"Mapping {row.get('id') or index} lacks {field}")
        source_format = normalized_identity(row.get("sourceFormat"))
        if source_format not in source_formats:
            fail(
                "UXML_RVM_MAPPING_SOURCE_FORMAT",
                f"Mapping {row.get('id') or index} refers to unavailable source format {source_format}",
            )


def _diagnostic_severity(row: dict[str, Any]) -> str:
    return normalized_identity(row.get("severity") or row.get("level") or "INFO")


def _block_if_required(row: dict[str, Any], location: str) -> None:
    if _diagnostic_severity(row) in _BLOCKING_SEVERITIES:
        fail(
            "UXML_RVM_SOURCE_DIAGNOSTIC_BLOCKING",
            f"Source diagnostic blocks at {location}: {row.get('code') or row.get('id') or '<unnamed>'}",
        )


def validate_source_diagnostics(uxml: dict[str, Any]) -> None:
    top_rows = require_list(uxml.get("diagnostics") or [], "UXML_RVM_DIAGNOSTIC_SHAPE", "diagnostics")
    top_objects, top_by_id = unique_index(
        top_rows, "id", "UXML_RVM_DIAGNOSTIC_IDENTITY", "diagnostics",
    ) if top_rows else ([], {})
    for index, row in enumerate(top_objects):
        _block_if_required(row, f"diagnostics[{index}]")
    for collection in _DIAGNOSTIC_COLLECTIONS:
        for row_index, entity in enumerate(uxml.get(collection) or []):
            if not isinstance(entity, dict):
                continue
            diagnostics = require_list(
                entity.get("diagnostics") or [], "UXML_RVM_ENTITY_DIAGNOSTICS",
                f"{collection}[{row_index}].diagnostics",
            )
            for index, diagnostic in enumerate(diagnostics):
                location = f"{collection}[{row_index}].diagnostics[{index}]"
                if isinstance(diagnostic, str):
                    reference = clean(diagnostic)
                    if reference not in top_by_id:
                        fail("UXML_RVM_DIAGNOSTIC_REFERENCE", f"{location} refers to missing diagnostic {reference}")
                    _block_if_required(top_by_id[reference], location)
                elif isinstance(diagnostic, dict):
                    _block_if_required(diagnostic, location)
                else:
                    fail("UXML_RVM_ENTITY_DIAGNOSTICS", f"{location} must be an object or diagnostic id")


def validate_source_contract(
    uxml: dict[str, Any], coordinate_context: dict[str, Any] | None,
    source_by_id: dict[str, dict[str, Any]], mappings: list[dict[str, Any]],
    components: list[dict[str, Any]],
) -> None:
    if coordinate_context is not None:
        validate_source_units(uxml, coordinate_context)
    validate_component_source_refs(components, source_by_id)
    validate_mappings(mappings, source_by_id)
    validate_source_diagnostics(uxml)
