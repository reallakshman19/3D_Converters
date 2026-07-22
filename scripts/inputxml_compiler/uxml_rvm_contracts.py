"""Immutable contracts for the UXML/RVM exact-authority compiler path."""
from __future__ import annotations

import base64
import hashlib
import json
import math
import unicodedata
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable

COORDINATE_SCHEMA = "UxmlRvmCoordinateContext.v1"
TOPOLOGY_SCHEMA = "UxmlRvmExactTopologyPlan.v1"
ENGINEERING_SCHEMA = "UxmlRvmEngineeringContext.v1"
REQUEST_SCHEMA = "InputXmlUxmlRvmBridgeRequest.v1"
RESULT_SCHEMA = "InputXmlUxmlRvmBridgeResult.v1"
ACCOUNTING_SCHEMA = "InputXmlUxmlRvmSourceAccountingProof.v1"
BRIDGE_IDENTITY = "inputxml-uxml-rvm-exact-bridge/v1"
DIALECT = "uxml-rvm-intake"
ADAPTER = "uxml-rvm-to-canonical"
MAX_SOURCE_BYTES = 16 * 1024 * 1024
MAX_STDOUT_BYTES = 64 * 1024 * 1024
MAX_STDERR_BYTES = 1024 * 1024
BRIDGE_TIMEOUT_SECONDS = 20
UNIT_SCALE_MM = {
    "MM": Decimal("1"),
    "CM": Decimal("10"),
    "M": Decimal("1000"),
    "IN": Decimal("25.4"),
    "FT": Decimal("304.8"),
}

@dataclass
class ContractError(ValueError):
    code: str
    message: str

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

def fail(code: str, message: str) -> None:
    raise ContractError(code, message)

def stable_json_bytes(value: Any) -> bytes:
    try:
        text = json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError) as exc:
        fail("UXML_RVM_NON_CANONICAL_JSON", str(exc))
    return text.encode("utf-8")

def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

_UNORDERED_SEMANTIC_LISTS = {
    "evidenceReferences", "componentOccurrences", "portOccurrences", "logicalNodes",
    "explicitConnections", "lineAssignments", "componentDecisions", "diagnostics",
}

def semantic_normalize(value: Any, parent_key: str = "") -> Any:
    if isinstance(value, dict):
        return {key: semantic_normalize(item, key) for key, item in value.items()}
    if isinstance(value, list):
        items = [semantic_normalize(item) for item in value]
        if parent_key in _UNORDERED_SEMANTIC_LISTS:
            items.sort(key=lambda item: json.dumps(item, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
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
            parse_constant=lambda item: fail("UXML_RVM_NON_FINITE_JSON", f"Non-finite JSON number {item}"),
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

def clean(value: Any) -> str:
    return str(value if value is not None else "").strip()

def normalized_identity(value: Any) -> str:
    return " ".join(unicodedata.normalize("NFKC", clean(value)).split()).upper()

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
    return int(number)

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
    if clean(artifact.get("sourceKind")).upper() != source_kind:
        fail(code, "Artifact source kind does not match detected intake")

def validate_coordinate_context(artifact: Any, source_hash: str, source_kind: str) -> tuple[dict[str, Any], str]:
    context = require_object(artifact, "UXML_RVM_COORDINATE_CONTEXT_MISSING", "coordinate context")
    if clean(context.get("schema")) != COORDINATE_SCHEMA:
        fail("UXML_RVM_COORDINATE_SCHEMA", f"Expected {COORDINATE_SCHEMA}")
    allowed = {
        "schema", "sourceHashSha256", "sourceKind", "authorityId", "authorityType",
        "sourceFrameId", "targetFrameId", "sourceCoordinateUnits", "targetCoordinateUnits",
        "axisMap", "scaleToMillimetres", "offsetMillimetres", "handedness",
        "evidenceReferences", "coordinateContextHashSha256",
    }
    unknown = sorted(set(context) - allowed)
    if unknown:
        fail("UXML_RVM_COORDINATE_UNKNOWN_FIELD", f"Unknown coordinate-context fields: {unknown}")
    require_source_binding(context, source_hash, source_kind, "UXML_RVM_COORDINATE_SOURCE_BINDING")
    if clean(context.get("authorityType")) not in {"EXACT_SOURCE_COORDINATE_CONTEXT", "APPROVED_COORDINATE_CONTEXT"}:
        fail("UXML_RVM_COORDINATE_AUTHORITY", "Unknown coordinate authority type")
    for field in ("authorityId", "sourceFrameId", "targetFrameId"):
        if not clean(context.get(field)):
            fail("UXML_RVM_COORDINATE_FIELD", f"Missing {field}")
    if clean(context.get("targetFrameId")).upper() != "CAESAR_GLOBAL":
        fail("UXML_RVM_TARGET_FRAME", "targetFrameId must be the registered CAESAR_GLOBAL frame")
    source_unit = clean(context.get("sourceCoordinateUnits")).upper()
    target_unit = clean(context.get("targetCoordinateUnits")).upper()
    if source_unit not in UNIT_SCALE_MM or target_unit != "MM":
        fail("UXML_RVM_COORDINATE_UNITS", "Units must use a registered source unit and target MM")
    scale = decimal_value(context.get("scaleToMillimetres"), "UXML_RVM_COORDINATE_SCALE", "scale", positive=True)
    if scale != UNIT_SCALE_MM[source_unit]:
        fail("UXML_RVM_COORDINATE_SCALE", "Scale does not exactly match registered unit conversion")
    axis_map = require_object(context.get("axisMap"), "UXML_RVM_AXIS_MAP", "axisMap")
    if set(axis_map) != {"targetX", "targetY", "targetZ"}:
        fail("UXML_RVM_AXIS_MAP", "axisMap must define exactly targetX, targetY, and targetZ")
    axes: list[str] = []
    signs: list[int] = []
    for target in ("targetX", "targetY", "targetZ"):
        decision = require_object(axis_map.get(target), "UXML_RVM_AXIS_MAP", target)
        if set(decision) != {"sourceAxis", "sign"}:
            fail("UXML_RVM_AXIS_MAP", f"{target} must contain exactly sourceAxis and sign")
        source_axis = clean(decision.get("sourceAxis")).upper()
        if source_axis not in {"X", "Y", "Z"}:
            fail("UXML_RVM_AXIS_MAP", f"Invalid source axis for {target}")
        sign_number = decimal_value(decision.get("sign"), "UXML_RVM_AXIS_SIGN", f"{target}.sign")
        if sign_number != sign_number.to_integral_value() or int(sign_number) not in {-1, 1}:
            fail("UXML_RVM_AXIS_SIGN", "Axis signs must be exactly -1 or 1")
        axes.append(source_axis)
        signs.append(int(sign_number))
    if sorted(axes) != ["X", "Y", "Z"]:
        fail("UXML_RVM_AXIS_PERMUTATION", "Each source axis must be used exactly once")
    offset = require_object(context.get("offsetMillimetres"), "UXML_RVM_COORDINATE_OFFSET", "offset")
    if set(offset) != {"x", "y", "z"}:
        fail("UXML_RVM_COORDINATE_OFFSET", "offsetMillimetres must define exactly x, y, z")
    for axis in ("x", "y", "z"):
        decimal_value(offset.get(axis), "UXML_RVM_COORDINATE_OFFSET", axis)
    handedness = require_object(context.get("handedness"), "UXML_RVM_HANDEDNESS", "handedness")
    if set(handedness) != {"source", "target"}:
        fail("UXML_RVM_HANDEDNESS", "handedness must define exactly source and target")
    source_hand = clean(handedness.get("source")).upper()
    target_hand = clean(handedness.get("target")).upper()
    if source_hand not in {"RIGHT_HANDED", "LEFT_HANDED"} or target_hand not in {"RIGHT_HANDED", "LEFT_HANDED"}:
        fail("UXML_RVM_HANDEDNESS", "Source and target handedness must be explicit")
    permutation = ["XYZ".index(axis) for axis in axes]
    inversions = sum(permutation[i] > permutation[j] for i in range(3) for j in range(i + 1, 3))
    determinant = (-1 if inversions % 2 else 1) * math.prod(signs)
    expected = 1 if source_hand == target_hand else -1
    if determinant != expected:
        fail("UXML_RVM_HANDEDNESS_CONTRADICTION", "Axis-map determinant contradicts declared handedness")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_COORDINATE_EVIDENCE", "evidenceReferences")
    digest = require_hash(context, "coordinateContextHashSha256", "UXML_RVM_COORDINATE_HASH")
    return semantic_normalize(context), digest

def transform_point(point: Any, context: dict[str, Any]) -> dict[str, Decimal]:
    source = require_object(point, "UXML_RVM_POINT_SHAPE", "point")
    vector = {axis: decimal_value(source.get(axis.lower()), "UXML_RVM_POINT_VALUE", axis) for axis in "XYZ"}
    scale = Decimal(str(context["scaleToMillimetres"]))
    offset = context["offsetMillimetres"]
    result: dict[str, Decimal] = {}
    for target_name, target_axis in (("targetX", "x"), ("targetY", "y"), ("targetZ", "z")):
        decision = context["axisMap"][target_name]
        value = vector[decision["sourceAxis"].upper()] * int(decision["sign"]) * scale
        value += Decimal(str(offset[target_axis]))
        result[target_axis] = Decimal("0") if value == 0 else value
    return result

def build_bridge_request(source: bytes, source_kind: str, coordinate_hash: str, topology_hash: str,
                         engineering_hash: str, authority_manifest_hash: str = "") -> dict[str, Any]:
    request = {
        "schema": REQUEST_SCHEMA,
        "dialect": DIALECT,
        "adapter": ADAPTER,
        "sourceKind": source_kind,
        "sourceByteHashSha256": sha256_bytes(source),
        "sourceByteLength": len(source),
        "sourceBase64": base64.b64encode(source).decode("ascii"),
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "authorityManifestHashSha256": authority_manifest_hash,
        "expectedBridgeIdentity": BRIDGE_IDENTITY,
    }
    request["requestHashSha256"] = semantic_hash(request, "requestHashSha256")
    return request

def unique_index(rows: Iterable[Any], field: str, code: str, label: str) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    sequence = list(rows)
    objects = [require_object(row, code, f"{label}[{index}]") for index, row in enumerate(sequence)]
    identities = [clean(row.get(field)) for row in objects]
    if any(not identity for identity in identities):
        fail(code, f"{label} contains a missing {field}")
    if len(set(identities)) != len(identities):
        fail(code, f"{label} contains duplicate {field} values")
    return objects, dict(zip(identities, objects))
