#!/usr/bin/env python3
"""Exact managed-stage source identity and topology artifact hash algorithms."""
from __future__ import annotations

import hashlib
import json
import math
from typing import Any

HASH_ALGORITHM = "fnv1a64-canonical-json-v1"
_SELF_HASH_KEYS = frozenset({
    "canonicalTopologyHash",
    "topologyTraceLedgerHash",
    "svgSceneHash",
    "parsedInputXmlTopologyHash",
    "topologyParityReportHash",
})


def normalize_source_text(value: str) -> str:
    text = str(value)
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def source_content_hash(source_text: str) -> str:
    normalized = normalize_source_text(source_text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def source_file_id(source_text: str, source_kind: str = "stagedjson") -> str:
    normalized = normalize_source_text(source_text)
    raw = f"{source_kind}\0{normalized}".encode("utf-8")
    return f"source-{hashlib.sha256(raw).hexdigest()[:32]}"


def source_entity_id(
    file_id: str,
    source_path: str,
    *,
    source_kind: str = "stagedjson",
    entity_kind: str = "json-object",
) -> str:
    raw = f"{file_id}\0{source_kind}\0{source_path}\0{entity_kind}".encode("utf-8")
    return f"entity-{hashlib.sha256(raw).hexdigest()[:32]}"


def canonical_json(value: Any, *, extra_omit: tuple[str, ...] = ()) -> str:
    omit = _SELF_HASH_KEYS | set(extra_omit)
    normalized = _canonical_value(value, omit)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )


def deterministic_hash(value: Any, *, hash_field: str | None = None) -> str:
    omit = (hash_field,) if hash_field else ()
    data = canonical_json(value, extra_omit=omit).encode("utf-8")
    current = 0xCBF29CE484222325
    for byte in data:
        current ^= byte
        current = (current * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return f"fnv1a64:{current:016x}"


def _canonical_value(value: Any, omit: set[str]) -> Any:
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"Cannot hash non-finite number: {value!r}.")
        if value == 0:
            return 0
        return int(value) if value.is_integer() else value
    if isinstance(value, list):
        return [_canonical_value(item, omit) for item in value]
    if isinstance(value, dict):
        return {
            key: _canonical_value(value[key], omit)
            for key in sorted(value)
            if key not in omit
        }
    raise TypeError(f"Unsupported topology hash value: {type(value).__name__}.")


__all__ = [
    "HASH_ALGORITHM",
    "canonical_json",
    "deterministic_hash",
    "normalize_source_text",
    "source_content_hash",
    "source_entity_id",
    "source_file_id",
]
