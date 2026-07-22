"""Strict JSON and scalar primitives for UXML/RVM contracts."""
from __future__ import annotations

import hashlib
import json
import math
import unicodedata
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

MAX_SOURCE_BYTES = 16 * 1024 * 1024
MAX_SAFE_INTEGER = 2**53 - 1

@dataclass
class ContractError(ValueError):
    code: str
    message: str

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"


def fail(code: str, message: str) -> None:
    raise ContractError(code, message)


def clean(value: Any) -> str:
    return str(value if value is not None else "").strip()


def normalized_identity(value: Any) -> str:
    return " ".join(unicodedata.normalize("NFKC", clean(value)).split()).upper()


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(Decimal("0") if value == 0 else value, "f")
    raise TypeError(f"Unsupported JSON value {type(value).__name__}")


def stable_json_bytes(value: Any) -> bytes:
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
            default=_json_default,
        )
    except (TypeError, ValueError) as exc:
        fail("UXML_RVM_NON_CANONICAL_JSON", str(exc))
    return text.encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


_UNORDERED_SEMANTIC_LISTS = {
    "evidenceReferences",
    "componentOccurrences",
    "portOccurrences",
    "logicalNodes",
    "explicitConnections",
    "lineAssignments",
    "componentDecisions",
    "diagnostics",
}


def semantic_normalize(value: Any, parent_key: str = "") -> Any:
    if isinstance(value, dict):
        return {key: semantic_normalize(item, key) for key, item in value.items()}
    if isinstance(value, list):
        items = [semantic_normalize(item) for item in value]
        if parent_key in _UNORDERED_SEMANTIC_LISTS:
            items.sort(key=lambda item: stable_json_bytes(item))
        return items
    return value


def semantic_hash(value: dict[str, Any], hash_field: str) -> str:
    body = {key: item for key, item in value.items() if key != hash_field}
    return sha256_bytes(stable_json_bytes(semantic_normalize(body)))


def require_hash(value: dict[str, Any], hash_field: str, code: str) -> str:
    declared = clean(value.get(hash_field)).lower()
    actual = semantic_hash(value, hash_field)
    if declared != actual:
        fail(code, f"{hash_field} mismatch: declared={declared or '<missing>'}, actual={actual}")
    return actual


def reject_unpaired_surrogates(value: Any, path: str = "$") -> None:
    if isinstance(value, str):
        for index, char in enumerate(value):
            if 0xD800 <= ord(char) <= 0xDFFF:
                fail("UXML_RVM_UNPAIRED_SURROGATE", f"Unpaired surrogate at {path}[{index}]")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            reject_unpaired_surrogates(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            reject_unpaired_surrogates(key, f"{path}.<key>")
            reject_unpaired_surrogates(item, f"{path}.{key}")


def _canonical_decimal_token(token: str) -> str:
    number = Decimal(token)
    if not number.is_finite():
        fail("UXML_RVM_NON_FINITE_JSON", f"Non-finite JSON number {token}")
    if number == 0:
        return "0"
    text = format(number.normalize(), "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def _safe_int(token: str) -> int:
    value = int(token)
    if abs(value) > MAX_SAFE_INTEGER:
        fail("UXML_RVM_UNSAFE_INTEGER", f"JSON integer exceeds exact bridge range: {token}")
    return value


def _safe_float(token: str) -> float:
    value = float(token)
    if not math.isfinite(value):
        fail("UXML_RVM_NON_FINITE_JSON", f"Non-finite JSON number {token}")
    if _canonical_decimal_token(token) != _canonical_decimal_token(str(value)):
        fail("UXML_RVM_PRECISION_LOSS", f"JSON number cannot round-trip exactly through bridge: {token}")
    return value


def strict_json_loads(text: str) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                fail("UXML_RVM_DUPLICATE_JSON_KEY", f"Duplicate JSON key {key!r}")
            result[key] = value
        return result

    try:
        decoder = json.JSONDecoder(
            object_pairs_hook=pairs,
            parse_int=_safe_int,
            parse_float=_safe_float,
            parse_constant=lambda item: fail(
                "UXML_RVM_NON_FINITE_JSON", f"Non-finite JSON number {item}"
            ),
        )
        start = len(text) - len(text.lstrip())
        value, end = decoder.raw_decode(text, start)
        if text[end:].strip():
            fail("UXML_RVM_TRAILING_JSON", "Trailing JSON content")
    except ContractError:
        raise
    except json.JSONDecodeError as exc:
        fail("UXML_RVM_INVALID_JSON", f"{exc.msg} at line {exc.lineno} column {exc.colno}")
    reject_unpaired_surrogates(value)
    return value


def decode_source(source: bytes) -> tuple[Any, str]:
    if len(source) > MAX_SOURCE_BYTES:
        fail("UXML_RVM_SOURCE_LIMIT", f"Source is {len(source)} bytes; limit is {MAX_SOURCE_BYTES}")
    try:
        text = source.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail("UXML_RVM_INVALID_UTF8", str(exc))
    payload = strict_json_loads(text)
    if isinstance(payload, list):
        return payload, "RVM_ROWS"
    if not isinstance(payload, dict):
        fail("UXML_RVM_TOP_LEVEL_SHAPE", "Top-level JSON must be an object or registered RVM-row array")
    explicit = clean(payload.get("inputKind")).upper().replace("-", "_")
    if explicit in {"RVM_ROWS", "ROWS"}:
        rows = payload.get("rows", payload.get("rvmRows"))
        if not isinstance(rows, list):
            fail("UXML_RVM_ROW_SHAPE", "RVM_ROWS input requires a rows array")
        return payload, "RVM_ROWS"
    document = payload.get("uxml", payload)
    if isinstance(document, dict) and clean(document.get("schemaVersion")) == "uxml-topology-v1":
        return payload, "UXML_DOCUMENT"
    fail("UXML_RVM_INPUT_KIND", "Input is neither registered UXML nor RVM-row shape")


def decimal_value(value: Any, code: str, field: str, *, positive: bool = False) -> Decimal:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        fail(code, f"{field} is not a decimal: {value!r} ({exc})")
    if not number.is_finite():
        fail(code, f"{field} must be finite")
    if positive and number <= 0:
        fail(code, f"{field} must be positive")
    return number


def integer_value(value: Any, code: str, field: str) -> int:
    number = decimal_value(value, code, field, positive=True)
    if number != number.to_integral_value():
        fail(code, f"{field} must be an integer")
    result = int(number)
    if result > MAX_SAFE_INTEGER:
        fail(code, f"{field} exceeds exact bridge integer range")
    return result


def require_object(value: Any, code: str, name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(code, f"{name} must be an object")
    return value


def require_list(value: Any, code: str, name: str) -> list[Any]:
    if not isinstance(value, list):
        fail(code, f"{name} must be an array")
    return value


def require_strings(value: Any, code: str, name: str, *, nonempty: bool = True) -> list[str]:
    items = require_list(value, code, name)
    cleaned = [clean(item) for item in items]
    if any(not item for item in cleaned) or (nonempty and not cleaned):
        fail(code, f"{name} must contain non-empty strings")
    return cleaned


def require_source_binding(
    artifact: dict[str, Any], source_hash: str, source_kind: str, code: str
) -> None:
    if clean(artifact.get("sourceHashSha256")).lower() != source_hash:
        fail(code, "Artifact source hash does not match exact received bytes")
    if clean(artifact.get("sourceKind")).upper() != source_kind:
        fail(code, "Artifact source kind does not match detected intake")



__all__ = [name for name in globals() if not name.startswith("__")]
