"""Immutable contracts for the corrected UXML/RVM compiler path."""
from __future__ import annotations

import base64
import math
from decimal import Decimal
from typing import Any

from .uxml_rvm_common import (
    ContractError, clean, decimal_value, fail, normalized_identity, require_hash,
    require_object, require_source_binding, require_strings, semantic_normalize,
    semantic_hash, sha256_bytes, stable_json_bytes, strict_json_loads,
)

COORDINATE_SCHEMA = "UxmlRvmCoordinateContext.v1"
TOPOLOGY_SCHEMA = "UxmlRvmExactTopologyPlan.v1"
ENGINEERING_SCHEMA = "UxmlRvmEngineeringContext.v1"
METADATA_SCHEMA = "UxmlRvmCanonicalMetadataContext.v1"
MANIFEST_SCHEMA = "UxmlRvmAuthorityManifest.v2"
TRUST_STORE_SCHEMA = "UxmlRvmTrustedApprovalStore.v1"
REQUEST_SCHEMA = "InputXmlUxmlRvmBridgeRequest.v2"
RESULT_SCHEMA = "InputXmlUxmlRvmBridgeResult.v2"
ACCOUNTING_SCHEMA = "InputXmlUxmlRvmSourceAccountingProof.v2"
BRIDGE_IDENTITY = "inputxml-uxml-rvm-exact-bridge/v2"
DIALECT = "uxml-rvm-intake"
ADAPTER = "uxml-rvm-to-canonical"
MAX_SOURCE_BYTES = 16 * 1024 * 1024
MAX_STDOUT_BYTES = 64 * 1024 * 1024
MAX_STDERR_BYTES = 1024 * 1024
BRIDGE_TIMEOUT_SECONDS = 20
EMPTY_HASH = sha256_bytes(b"")
UNIT_SCALE_MM = {
    "MM": Decimal("1"), "CM": Decimal("10"), "M": Decimal("1000"),
    "IN": Decimal("25.4"), "FT": Decimal("304.8"),
}


def decode_source(source: bytes) -> tuple[Any, str]:
    if len(source) > MAX_SOURCE_BYTES:
        fail("UXML_RVM_SOURCE_LIMIT", f"Source is {len(source)} bytes; limit is {MAX_SOURCE_BYTES}")
    try:
        text = source.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail("UXML_RVM_INVALID_UTF8", str(exc))
    payload = strict_json_loads(text)
    if isinstance(payload, list):
        fail("UXML_RVM_RVM_ENVELOPE_REQUIRED", "Raw RVM-row arrays lack explicit source-unit authority")
    if not isinstance(payload, dict):
        fail("UXML_RVM_TOP_LEVEL_SHAPE", "Top-level JSON must be an object")
    explicit = normalized_identity(payload.get("inputKind")).replace("-", "_")
    if explicit in {"RVM_ROWS", "ROWS"}:
        rows = payload.get("rows", payload.get("rvmRows"))
        if not isinstance(rows, list):
            fail("UXML_RVM_ROW_SHAPE", "RVM_ROWS input requires a rows array")
        return payload, "RVM_ROWS"
    document = payload.get("uxml", payload)
    if isinstance(document, dict) and clean(document.get("schemaVersion")) == "uxml-topology-v1":
        return payload, "UXML_DOCUMENT"
    fail("UXML_RVM_INPUT_KIND", "Input is neither registered UXML nor RVM-row envelope")


def validate_coordinate_context(
    artifact: Any, source_hash: str, source_kind: str
) -> tuple[dict[str, Any], str]:
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
    if clean(context.get("authorityType")) not in {
        "EXACT_SOURCE_COORDINATE_CONTEXT", "APPROVED_COORDINATE_CONTEXT",
    }:
        fail("UXML_RVM_COORDINATE_AUTHORITY", "Unknown coordinate authority type")
    for field in ("authorityId", "sourceFrameId", "targetFrameId"):
        if not clean(context.get(field)):
            fail("UXML_RVM_COORDINATE_FIELD", f"Missing {field}")
    if normalized_identity(context.get("targetFrameId")) != "CAESAR_GLOBAL":
        fail("UXML_RVM_TARGET_FRAME", "targetFrameId must be CAESAR_GLOBAL")
    source_unit = normalized_identity(context.get("sourceCoordinateUnits"))
    target_unit = normalized_identity(context.get("targetCoordinateUnits"))
    if source_unit not in UNIT_SCALE_MM or target_unit != "MM":
        fail("UXML_RVM_COORDINATE_UNITS", "Units require registered source and target MM")
    scale = decimal_value(context.get("scaleToMillimetres"), "UXML_RVM_COORDINATE_SCALE", "scale", positive=True)
    if scale != UNIT_SCALE_MM[source_unit]:
        fail("UXML_RVM_COORDINATE_SCALE", "Scale does not exactly match source units")
    axis_map = require_object(context.get("axisMap"), "UXML_RVM_AXIS_MAP", "axisMap")
    if set(axis_map) != {"targetX", "targetY", "targetZ"}:
        fail("UXML_RVM_AXIS_MAP", "axisMap must contain exactly targetX,targetY,targetZ")
    axes: list[str] = []
    signs: list[int] = []
    for target in ("targetX", "targetY", "targetZ"):
        decision = require_object(axis_map[target], "UXML_RVM_AXIS_MAP", target)
        if set(decision) != {"sourceAxis", "sign"}:
            fail("UXML_RVM_AXIS_MAP", f"{target} must contain only sourceAxis and sign")
        source_axis = normalized_identity(decision.get("sourceAxis"))
        sign_value = decimal_value(decision.get("sign"), "UXML_RVM_AXIS_SIGN", f"{target}.sign")
        if source_axis not in {"X", "Y", "Z"} or sign_value not in {Decimal("-1"), Decimal("1")}:
            fail("UXML_RVM_AXIS_MAP", f"Invalid signed-axis decision for {target}")
        axes.append(source_axis); signs.append(int(sign_value))
    if sorted(axes) != ["X", "Y", "Z"]:
        fail("UXML_RVM_AXIS_PERMUTATION", "Each source axis must be used exactly once")
    offset = require_object(context.get("offsetMillimetres"), "UXML_RVM_COORDINATE_OFFSET", "offset")
    if set(offset) != {"x", "y", "z"}:
        fail("UXML_RVM_COORDINATE_OFFSET", "offset requires exactly x,y,z")
    for axis in "xyz":
        decimal_value(offset[axis], "UXML_RVM_COORDINATE_OFFSET", axis)
    handed = require_object(context.get("handedness"), "UXML_RVM_HANDEDNESS", "handedness")
    if set(handed) != {"source", "target"}:
        fail("UXML_RVM_HANDEDNESS", "handedness requires source and target")
    source_hand, target_hand = map(normalized_identity, (handed["source"], handed["target"]))
    if source_hand not in {"RIGHT_HANDED", "LEFT_HANDED"} or target_hand not in {"RIGHT_HANDED", "LEFT_HANDED"}:
        fail("UXML_RVM_HANDEDNESS", "Source and target handedness must be explicit")
    permutation = ["XYZ".index(axis) for axis in axes]
    inversions = sum(permutation[i] > permutation[j] for i in range(3) for j in range(i + 1, 3))
    determinant = (-1 if inversions % 2 else 1) * math.prod(signs)
    if determinant != (1 if source_hand == target_hand else -1):
        fail("UXML_RVM_HANDEDNESS_CONTRADICTION", "Axis map contradicts handedness")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_COORDINATE_EVIDENCE", "evidenceReferences")
    digest = require_hash(context, "coordinateContextHashSha256", "UXML_RVM_COORDINATE_HASH")
    return semantic_normalize(context), digest


def transform_point(point: Any, context: dict[str, Any]) -> dict[str, Decimal]:
    source = require_object(point, "UXML_RVM_POINT_SHAPE", "point")
    if set(source) != {"x", "y", "z"}:
        fail("UXML_RVM_POINT_SHAPE", "point requires exactly x,y,z")
    vector = {axis: decimal_value(source[axis.lower()], "UXML_RVM_POINT_VALUE", axis) for axis in "XYZ"}
    scale = Decimal(str(context["scaleToMillimetres"]))
    result: dict[str, Decimal] = {}
    for target_name, target_axis in (("targetX", "x"), ("targetY", "y"), ("targetZ", "z")):
        decision = context["axisMap"][target_name]
        value = vector[decision["sourceAxis"].upper()] * int(decision["sign"]) * scale
        value += Decimal(str(context["offsetMillimetres"][target_axis]))
        result[target_axis] = Decimal("0") if value == 0 else value
    return result


def build_bridge_request(
    source: bytes, source_kind: str, coordinate_hash: str, topology_hash: str,
    engineering_hash: str, metadata_hash: str, manifest_hash: str,
) -> dict[str, Any]:
    request = {
        "schema": REQUEST_SCHEMA, "dialect": DIALECT, "adapter": ADAPTER,
        "sourceKind": source_kind, "sourceByteHashSha256": sha256_bytes(source),
        "sourceByteLength": len(source), "sourceBase64": base64.b64encode(source).decode("ascii"),
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "canonicalMetadataContextHashSha256": metadata_hash,
        "authorityManifestHashSha256": manifest_hash,
        "expectedBridgeIdentity": BRIDGE_IDENTITY,
    }
    request["requestHashSha256"] = semantic_hash(request, "requestHashSha256")
    return request


__all__ = [name for name in globals() if not name.startswith("_")]
