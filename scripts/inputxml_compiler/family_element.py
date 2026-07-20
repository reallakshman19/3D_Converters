#!/usr/bin/env python3
"""Profile-aware PIPINGELEMENT resolver for PR-5 family adapters."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from lxml import etree as ET

from .base import (
    ELEMENT_CHILD_ORDER,
    ELEMENT_CORE_ATTRS,
    INHERITED_DECIMAL_FIELDS,
    INHERITED_INTEGER_FIELDS,
    KNOWN_ENRICHMENT_CHILDREN,
    PRESERVE_ELEMENT_ATTRS,
    CompileBlocked,
    DecisionLedger,
)
from .extension import (
    _copy_existing_extension,
    _ensure_extension_last,
    _preserve_attr,
    _preserve_child,
)
from .family_auxiliary import normalize_family_auxiliary
from .family_profiles import FamilyProfileContract
from .family_resolution import (
    IdentityRegistry,
    LineScopeState,
    ledger_context_value,
    reconcile_coordinate_delta,
)
from .xml import (
    _decimal,
    _decimal_text,
    _integer_text,
    _is_sentinel,
    _local,
    _namespace,
    _same_numeric,
)

_TEXT_FIELDS = {"LINE", "FROM_NAME", "TO_NAME", "MATERIAL_NAME"}
_REQUIRED_SCOPE_SEEDS = {"DIAMETER", "WALL_THICK"}
_COORDINATE_FIELDS = (
    "FROM_X", "FROM_Y", "FROM_Z", "TO_X", "TO_Y", "TO_Z"
)


def normalize_family_element(
    source: ET._Element,
    *,
    index: int,
    source_entity_id: str,
    model: ET._Element,
    ledger: DecisionLedger,
    aliases: dict[str, dict[str, str]],
    profile: FamilyProfileContract,
    context: dict[str, Any],
    line_scope: LineScopeState,
    identities: IdentityRegistry,
) -> ET._Element:
    source_lexical_id = source.get("ID")
    canonical_id = identities.resolve(
        source_id=source_lexical_id,
        fallback_id=f"E{index:06d}",
        ledger=ledger,
        source_entity_id=source_entity_id,
    )
    canonical_path = f"/CAESARII/PIPINGMODEL[1]/PIPINGELEMENT[{index}]"
    target = ET.Element("PIPINGELEMENT", ID=canonical_id)
    element_aliases = aliases.get("PIPINGELEMENT", {}) if profile.permitted_aliases else {}

    def field(name: str) -> tuple[str | None, str | None]:
        return _resolve_source_field(
            source,
            canonical=name,
            aliases=element_aliases,
            ledger=ledger,
            source_entity_id=source_entity_id,
            canonical_id=canonical_id,
            canonical_path=canonical_path,
        )

    _resolve_nodes(source_entity_id, target, field, ledger)
    deltas = _resolve_deltas(source_entity_id, target, field, ledger)
    line = _resolve_line(
        source_entity_id,
        target,
        field,
        profile,
        context,
        ledger,
    )
    new_scope = line_scope.enter(line, canonical_id)
    _resolve_inherited_fields(
        source_entity_id=source_entity_id,
        target=target,
        field=field,
        line_scope=line_scope,
        new_scope=new_scope,
        ledger=ledger,
    )
    _resolve_names(target, field)
    coordinates = _resolve_coordinates(source_entity_id, target, field, ledger)
    reconcile_coordinate_delta(
        element_id=source_entity_id,
        deltas=deltas,
        coordinates=coordinates,
        ledger=ledger,
    )
    _preserve_element_attributes(
        source=source,
        target=target,
        source_entity_id=source_entity_id,
        canonical_id=canonical_id,
        aliases=element_aliases,
        ledger=ledger,
    )
    _resolve_children(
        source=source,
        target=target,
        source_entity_id=source_entity_id,
        canonical_id=canonical_id,
        profile=profile,
        ledger=ledger,
    )
    _validate_auxiliary_ownership(target, canonical_id, ledger)
    _assert_no_canonical_sentinel(target, source_entity_id, ledger)
    _ensure_extension_last(target)
    ledger.add(
        source_entity_id=source_entity_id,
        source_type="PIPINGELEMENT",
        source_fields={
            "attributes": dict(source.attrib),
            "childCount": len(source),
            "lineScopeId": line_scope.scope_id,
            "lineScopeSeedElementId": line_scope.seed_element_id,
        },
        canonical_element_ids=[canonical_id],
        canonical_node_ids=[target.get("FROM_NODE"), target.get("TO_NODE")],
        inputxml_element_ids=[canonical_id],
        cii_section="ELEMENTS",
        disposition="EMIT_1_TO_1",
    )
    return target


def _resolve_nodes(source_entity_id, target, field, ledger) -> None:
    for name in ("FROM_NODE", "TO_NODE"):
        raw, _ = field(name)
        if raw is None:
            _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} missing required {name}.", source_entity_id)
        target.set(name, _integer_text(raw, f"PIPINGELEMENT@{name}", positive=True))
    if target.get("FROM_NODE") == target.get("TO_NODE"):
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} has identical FROM_NODE and TO_NODE.", source_entity_id)


def _resolve_deltas(source_entity_id, target, field, ledger) -> dict[str, str]:
    deltas: dict[str, str] = {}
    for name in ("DELTA_X", "DELTA_Y", "DELTA_Z"):
        raw, _ = field(name)
        if raw is None:
            _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} missing required {name}.", source_entity_id)
        if _is_sentinel(raw):
            _block(
                ledger,
                "GEOMETRY_SENTINEL_PROHIBITED",
                f"{source_entity_id} uses the missing sentinel for {name}; geometry cannot inherit or default.",
                f"{source_entity_id}@{name}",
            )
        value = _decimal_text(raw, f"PIPINGELEMENT@{name}")
        target.set(name, value)
        deltas[name] = value
    if all(Decimal(deltas[name]) == 0 for name in deltas):
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} resolves to zero-length geometry.", source_entity_id)
    return deltas


def _resolve_line(
    source_entity_id,
    target,
    field,
    profile,
    context,
    ledger,
) -> str:
    raw, _ = field("LINE")
    if raw is None and "defaultLine" in profile.permitted_context:
        raw = context.get("defaultLine")
        if raw is not None:
            ledger_context_value(
                key="defaultLine",
                value=str(raw),
                ledger=ledger,
                canonical_target=f"{source_entity_id}@LINE",
            )
    line = str(raw or "").strip()
    if not line:
        _block(ledger, "CONTEXT_AUTHORITY_MISSING", f"{source_entity_id} has no authoritative line identity.", source_entity_id)
    target.set("LINE", line)
    return line


def _resolve_inherited_fields(
    *,
    source_entity_id: str,
    target: ET._Element,
    field,
    line_scope: LineScopeState,
    new_scope: bool,
    ledger: DecisionLedger,
) -> None:
    for name in INHERITED_DECIMAL_FIELDS:
        raw, raw_name = field(name)
        _resolve_inherited_value(
            source_entity_id=source_entity_id,
            target=target,
            name=name,
            raw=raw,
            raw_name=raw_name,
            integer=False,
            line_scope=line_scope,
            new_scope=new_scope,
            ledger=ledger,
        )
    for name in INHERITED_INTEGER_FIELDS:
        raw, raw_name = field(name)
        _resolve_inherited_value(
            source_entity_id=source_entity_id,
            target=target,
            name=name,
            raw=raw,
            raw_name=raw_name,
            integer=True,
            line_scope=line_scope,
            new_scope=new_scope,
            ledger=ledger,
        )


def _resolve_inherited_value(
    *,
    source_entity_id,
    target,
    name,
    raw,
    raw_name,
    integer,
    line_scope,
    new_scope,
    ledger,
) -> None:
    explicit = raw is not None and not _is_sentinel(raw)
    if explicit:
        value = (
            _integer_text(raw, f"PIPINGELEMENT@{name}", nonnegative=True)
            if integer
            else _decimal_text(raw, f"PIPINGELEMENT@{name}")
        )
        _validate_inherited_value(source_entity_id, name, value, ledger)
        target.set(name, value)
        line_scope.define(name, value, target.get("ID"))
        return
    inherited = line_scope.inherit(name)
    if inherited is not None:
        target.set(name, inherited)
        ledger.add(
            source_entity_id=f"{source_entity_id}@{name}",
            source_type="INHERITED_FIELD",
            source_fields={
                "sourceField": raw_name or name,
                "sourceValue": raw,
                "scopeId": line_scope.scope_id,
                "lineIdentity": line_scope.line_identity,
                "seedElementId": line_scope.seed_element_id,
            },
            canonical_element_ids=[target.get("ID")],
            inputxml_element_ids=[target.get("ID")],
            cii_section="ELEMENTS",
            disposition="EMIT_1_TO_1",
            evidence=["inherited only within the current contiguous line scope"],
        )
        return
    if name in _REQUIRED_SCOPE_SEEDS:
        code = "LINE_SCOPE_SEED_MISSING" if new_scope else "LINE_SCOPE_CROSSING_PROHIBITED"
        _block(
            ledger,
            code,
            f"First element of scope {line_scope.scope_id} ({line_scope.line_identity!r}) lacks explicit {name}.",
            f"{source_entity_id}@{name}",
        )


def _validate_inherited_value(source_entity_id, name, value, ledger) -> None:
    number = Decimal(value)
    if name == "DIAMETER" and number <= 0:
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} DIAMETER must be positive.", source_entity_id)
    if name in {"WALL_THICK", "INSUL_THICK", "CORR_ALLOW"} and number < 0:
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} {name} cannot be negative.", source_entity_id)


def _resolve_names(target, field) -> None:
    for name in ("FROM_NAME", "TO_NAME"):
        raw, _ = field(name)
        if raw is not None:
            target.set(name, raw.strip())


def _resolve_coordinates(source_entity_id, target, field, ledger) -> dict[str, str]:
    values: dict[str, str] = {}
    present: list[str] = []
    for name in _COORDINATE_FIELDS:
        raw, _ = field(name)
        if raw is None:
            continue
        present.append(name)
        if _is_sentinel(raw):
            _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} coordinate {name} cannot use the missing sentinel.", f"{source_entity_id}@{name}")
        values[name] = _decimal_text(raw, f"PIPINGELEMENT@{name}")
    if present and len(present) != 6:
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} has a partial endpoint coordinate sextet.", source_entity_id)
    for name, value in values.items():
        target.set(name, value)
    return values


def _preserve_element_attributes(
    *,
    source,
    target,
    source_entity_id,
    canonical_id,
    aliases,
    ledger,
) -> None:
    alias_names = set(aliases)
    for attr, value in source.attrib.items():
        if attr == "ID":
            if value != canonical_id:
                _preserve_attr(target, ledger.source_path, source_entity_id, "SOURCE_ID", value, ledger, blocking=False)
            continue
        if attr in ELEMENT_CORE_ATTRS or attr in alias_names:
            continue
        _preserve_attr(
            target,
            ledger.source_path,
            source_entity_id,
            attr,
            value,
            ledger,
            blocking=attr not in PRESERVE_ELEMENT_ATTRS,
        )


def _resolve_children(
    *,
    source,
    target,
    source_entity_id,
    canonical_id,
    profile,
    ledger,
) -> None:
    grouped: dict[str, list[tuple[int, ET._Element]]] = {
        name: [] for name in ELEMENT_CHILD_ORDER
    }
    for ordinal, child in enumerate(source, 1):
        name = _local(child.tag)
        ns = _namespace(child.tag)
        if ns == "" and name in grouped:
            grouped[name].append((ordinal, child))
    limits = {"BEND": 1, "RIGID": 1, "SIF": 2, "RESTRAINT": 6}
    for name, limit in limits.items():
        if len(grouped[name]) > limit:
            _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{source_entity_id} contains {len(grouped[name])} {name} records; limit is {limit}.", source_entity_id)
    for name in sorted(ELEMENT_CHILD_ORDER, key=ELEMENT_CHILD_ORDER.get):
        for occurrence, (ordinal, child) in enumerate(grouped[name], 1):
            normalize_family_auxiliary(
                child,
                target=target,
                element_id=canonical_id,
                source_entity_id=f"{source_entity_id}/{name}[{occurrence}]",
                ledger=ledger,
            )
    extension_seen = False
    for child in source:
        name = _local(child.tag)
        ns = _namespace(child.tag)
        if ns and name == "Extension":
            if not extension_seen:
                _copy_existing_extension(source, target, ledger, source_entity_id)
                extension_seen = True
            continue
        if ns == "" and name in ELEMENT_CHILD_ORDER:
            continue
        if ns == "" and name in KNOWN_ENRICHMENT_CHILDREN and profile.allow_enrichment_evidence:
            _preserve_child(target, child, ledger.source_path, source_entity_id, ledger, blocking=False)
        else:
            _preserve_child(target, child, ledger.source_path, source_entity_id, ledger, blocking=True)
            ledger.diagnostic(
                "BLOCKING",
                "UNSUPPORTED_ENGINEERING_FIELD",
                f"Unknown or unsupported child {name!r} is retained and blocks production.",
                f"{source_entity_id}/{name}",
            )


def _validate_auxiliary_ownership(target, canonical_id, ledger) -> None:
    owned = {target.get("FROM_NODE"), target.get("TO_NODE")}
    for child in target:
        if _namespace(child.tag) != "":
            continue
        name = _local(child.tag)
        if name in {"RESTRAINT", "SIF", "HANGER"} and child.get("NODE") not in owned:
            _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{canonical_id}/{name} NODE {child.get('NODE')} is not owned by element endpoints {sorted(owned)}.", canonical_id)
    slots = [child.get("NUM") for child in target.findall("RESTRAINT")]
    if len(slots) != len(set(slots)):
        _block(ledger, "UNSUPPORTED_ENGINEERING_FIELD", f"{canonical_id} has duplicate RESTRAINT NUM slots.", canonical_id)


def _assert_no_canonical_sentinel(target, source_entity_id, ledger) -> None:
    for attr, value in target.attrib.items():
        if _is_sentinel(value):
            _block(ledger, "GEOMETRY_SENTINEL_PROHIBITED", f"Canonical field {attr} retains the missing sentinel.", f"{source_entity_id}@{attr}")


def _resolve_source_field(
    source,
    *,
    canonical,
    aliases,
    ledger,
    source_entity_id,
    canonical_id,
    canonical_path,
):
    candidate_names = [canonical] + [
        alias for alias, target in aliases.items() if target == canonical
    ]
    present = [(name, source.get(name)) for name in candidate_names if source.get(name) is not None]
    if not present:
        return None, None
    chosen_name, chosen_value = next(
        ((name, value) for name, value in present if name == canonical),
        present[0],
    )
    for name, value in present:
        equivalent = (
            str(chosen_value or "").strip() == str(value or "").strip()
            if canonical in _TEXT_FIELDS
            else _same_numeric(chosen_value or "", value or "")
        )
        if not equivalent:
            ledger.add(
                source_entity_id=f"{source_entity_id}@{canonical}",
                source_type="FIELD_ALIAS_CONFLICT",
                source_fields={key: item for key, item in present},
                disposition="REJECT_INVALID",
                diagnostics=[f"Alias collision for {canonical}"],
            )
            _block(ledger, "ALIAS_VALUE_CONFLICT", f"Alias values conflict for {source_entity_id}/{canonical}.", f"{source_entity_id}@{canonical}")
    if len(present) > 1:
        ledger.add(
            source_entity_id=f"{source_entity_id}@{canonical}:equivalence",
            source_type="ATTRIBUTE_ALIAS_EQUIVALENCE",
            source_fields={key: item for key, item in present},
            canonical_element_ids=[canonical_id],
            inputxml_element_ids=[canonical_id],
            disposition="EMIT_1_TO_1",
            evidence=["all registered source spellings are type-equivalent; one canonical field emitted"],
        )
    if chosen_name != canonical:
        ledger.add(
            source_entity_id=f"{canonical_path}@{canonical}",
            source_type="ATTRIBUTE_ALIAS",
            source_fields={
                "sourceEntityId": source_entity_id,
                "sourceAlias": chosen_name,
                "canonicalField": canonical,
                "value": chosen_value,
            },
            canonical_element_ids=[canonical_id],
            inputxml_element_ids=[canonical_id],
            disposition="EMIT_1_TO_1",
            evidence=[f"exact registered alias {chosen_name} renamed to {canonical}"],
        )
    return chosen_value, chosen_name


def _block(ledger, code, message, source_entity_id) -> None:
    ledger.diagnostic("BLOCKING", code, message, source_entity_id)
    raise CompileBlocked(message)


__all__ = ["normalize_family_element"]
