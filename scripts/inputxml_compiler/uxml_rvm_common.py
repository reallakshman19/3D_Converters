"""Shared strict JSON and scalar contracts for the UXML/RVM resolver."""
from __future__ import annotations

import hashlib
import json
import unicodedata
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable


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


def decimal_value(value: Any, code: str, field: str, *, positive: bool = False) -> Decimal:
    try:
        number = value if isinstance(value, Decimal) else Decimal(str(value))
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
    return int(number)


def decimal_text(value: Any) -> str:
    number = decimal_value(value, "UXML_RVM_NON_CANONICAL_JSON", "number")
    if number == 0:
        return "0"
    rendered = format(number, "f")
    if "." in rendered:
        rendered = rendered.rstrip("0").rstrip(".")
    return rendered


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
            parse_int=int,
            parse_float=Decimal,
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


def _json_text(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, (Decimal, float)):
        return decimal_text(value)
    if isinstance(value, str):
        reject_unpaired_surrogates(value)
        return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(_json_text(item) for item in value) + "]"
    if isinstance(value, tuple):
        return "[" + ",".join(_json_text(item) for item in value) + "]"
    if isinstance(value, dict):
        if any(not isinstance(key, str) for key in value):
            fail("UXML_RVM_NON_CANONICAL_JSON", "JSON object keys must be strings")
        keys = sorted(value, key=lambda item: item.encode("utf-8"))
        return "{" + ",".join(f"{_json_text(key)}:{_json_text(value[key])}" for key in keys) + "}"
    fail("UXML_RVM_NON_CANONICAL_JSON", f"Unsupported JSON type {type(value).__name__}")


def stable_json_bytes(value: Any) -> bytes:
    return _json_text(value).encode("utf-8")


def jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return decimal_text(value)
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [jsonable(item) for item in value]
    return value


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


_UNORDERED_LISTS = {
    "evidenceReferences", "componentOccurrences", "portOccurrences", "logicalNodes",
    "explicitConnections", "lineAssignments", "componentDecisions", "fieldDecisions",
    "diagnostics", "approvals",
}


def semantic_normalize(value: Any, parent_key: str = "") -> Any:
    if isinstance(value, dict):
        return {key: semantic_normalize(item, key) for key, item in value.items()}
    if isinstance(value, list):
        items = [semantic_normalize(item) for item in value]
        if parent_key in _UNORDERED_LISTS:
            items.sort(key=stable_json_bytes)
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


def require_source_binding(artifact: dict[str, Any], source_hash: str, source_kind: str, code: str) -> None:
    if clean(artifact.get("sourceHashSha256")).lower() != source_hash:
        fail(code, "Artifact source hash does not match exact received bytes")
    if normalized_identity(artifact.get("sourceKind")) != source_kind:
        fail(code, "Artifact source kind does not match detected intake")


def unique_index(
    rows: Iterable[Any], field: str, code: str, label: str
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    sequence = list(rows)
    objects = [require_object(row, code, f"{label}[{index}]") for index, row in enumerate(sequence)]
    identities = [clean(row.get(field)) for row in objects]
    if any(not identity for identity in identities):
        fail(code, f"{label} contains a missing {field}")
    if len(set(identities)) != len(identities):
        fail(code, f"{label} contains duplicate {field} values")
    return objects, dict(zip(identities, objects))
