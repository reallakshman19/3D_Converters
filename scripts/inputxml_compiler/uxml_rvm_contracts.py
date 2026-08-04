"""Immutable contracts for the UXML/RVM exact-authority compiler path."""
from __future__ import annotations

import base64
import math
from decimal import Decimal
from typing import Any, Iterable

from .uxml_rvm_json import *

COORDINATE_SCHEMA = "UxmlRvmCoordinateContext.v1"
TOPOLOGY_SCHEMA = "UxmlRvmExactTopologyPlan.v1"
ENGINEERING_SCHEMA = "UxmlRvmEngineeringContext.v1"
METADATA_SCHEMA = "UxmlRvmCanonicalMetadata.v1"
REQUEST_SCHEMA = "InputXmlUxmlRvmBridgeRequest.v1"
RESULT_SCHEMA = "InputXmlUxmlRvmBridgeResult.v1"
ACCOUNTING_SCHEMA = "InputXmlUxmlRvmSourceAccountingProof.v1"
BRIDGE_IDENTITY = "inputxml-uxml-rvm-exact-bridge/v1"
DIALECT = "uxml-rvm-intake"
ADAPTER = "uxml-rvm-to-canonical"
MAX_STDOUT_BYTES = 64 * 1024 * 1024
MAX_STDERR_BYTES = 1024 * 1024
BRIDGE_TIMEOUT_SECONDS = 20
UNIT_SCALE_MM = {
    "MM": Decimal("1"), "CM": Decimal("10"), "M": Decimal("1000"),
    "IN": Decimal("25.4"), "FT": Decimal("304.8"),
}

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
        "EXACT_SOURCE_COORDINATE_CONTEXT", "APPROVED_COORDINATE_CONTEXT"
    }:
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
    if source_hand not in {"RIGHT_HANDED", "LEFT_HANDED"} or target_hand not in {
        "RIGHT_HANDED", "LEFT_HANDED"
    }:
        fail("UXML_RVM_HANDEDNESS", "Source and target handedness must be explicit")
    permutation = ["XYZ".index(axis) for axis in axes]
    inversions = sum(
        permutation[i] > permutation[j]
        for i in range(3)
        for j in range(i + 1, 3)
    )
    determinant = (-1 if inversions % 2 else 1) * math.prod(signs)
    expected = 1 if source_hand == target_hand else -1
    if determinant != expected:
        fail("UXML_RVM_HANDEDNESS_CONTRADICTION", "Axis-map determinant contradicts declared handedness")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_COORDINATE_EVIDENCE", "evidenceReferences")
    digest = require_hash(context, "coordinateContextHashSha256", "UXML_RVM_COORDINATE_HASH")
    return semantic_normalize(context), digest


def validate_canonical_metadata(
    artifact: Any, source_hash: str, source_kind: str
) -> tuple[dict[str, Any], str]:
    metadata = require_object(artifact, "UXML_RVM_CANONICAL_METADATA_MISSING", "canonical metadata")
    if clean(metadata.get("schema")) != METADATA_SCHEMA:
        fail("UXML_RVM_CANONICAL_METADATA_SCHEMA", f"Expected {METADATA_SCHEMA}")
    allowed = {
        "schema", "sourceHashSha256", "sourceKind", "authorityId", "authorityType",
        "jobName", "time", "issueNo", "version", "north", "evidenceReferences",
        "canonicalMetadataHashSha256",
    }
    unknown = sorted(set(metadata) - allowed)
    if unknown:
        fail("UXML_RVM_CANONICAL_METADATA_FIELD", f"Unknown canonical metadata fields: {unknown}")
    require_source_binding(metadata, source_hash, source_kind, "UXML_RVM_CANONICAL_METADATA_SOURCE")
    if clean(metadata.get("authorityType")) != "APPROVED_CANONICAL_METADATA":
        fail("UXML_RVM_CANONICAL_METADATA_AUTHORITY", "Unknown canonical metadata authority")
    for field in ("authorityId", "jobName", "time", "issueNo", "version"):
        if not clean(metadata.get(field)):
            fail("UXML_RVM_CANONICAL_METADATA_REQUIRED", f"Missing {field}")
    if clean(metadata.get("time")) in {
        "1970-01-01T00:00:00.000Z", "1970-01-01T00:00:00Z"
    }:
        fail("UXML_RVM_CANONICAL_METADATA_GENERATED", "Adapter-generated epoch time is not authority")
    north = require_list(metadata.get("north"), "UXML_RVM_CANONICAL_METADATA_NORTH", "north")
    if len(north) != 3:
        fail("UXML_RVM_CANONICAL_METADATA_NORTH", "north must contain exactly three values")
    for index, value in enumerate(north):
        decimal_value(value, "UXML_RVM_CANONICAL_METADATA_NORTH", f"north[{index}]")
    require_strings(metadata.get("evidenceReferences"), "UXML_RVM_CANONICAL_METADATA_EVIDENCE", "evidenceReferences")
    digest = require_hash(metadata, "canonicalMetadataHashSha256", "UXML_RVM_CANONICAL_METADATA_HASH")
    return semantic_normalize(metadata), digest


def transform_point(point: Any, context: dict[str, Any]) -> dict[str, Decimal]:
    source = require_object(point, "UXML_RVM_POINT_SHAPE", "point")
    if set(source) != {"x", "y", "z"}:
        fail("UXML_RVM_POINT_SHAPE", "point must define exactly x, y, z")
    vector = {
        axis: decimal_value(source.get(axis.lower()), "UXML_RVM_POINT_VALUE", axis)
        for axis in "XYZ"
    }
    scale = Decimal(str(context["scaleToMillimetres"]))
    offset = context["offsetMillimetres"]
    result: dict[str, Decimal] = {}
    for target_name, target_axis in (
        ("targetX", "x"), ("targetY", "y"), ("targetZ", "z")
    ):
        decision = context["axisMap"][target_name]
        value = vector[decision["sourceAxis"].upper()] * int(decision["sign"]) * scale
        value += Decimal(str(offset[target_axis]))
        result[target_axis] = Decimal("0") if value == 0 else value
    return result


def build_bridge_request(
    source: bytes,
    source_kind: str,
    coordinate_hash: str,
    topology_hash: str,
    engineering_hash: str,
    authority_manifest_hash: str = "",
    metadata_hash: str = "",
) -> dict[str, Any]:
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
        "canonicalMetadataHashSha256": metadata_hash,
        "authorityManifestHashSha256": authority_manifest_hash,
        "expectedBridgeIdentity": BRIDGE_IDENTITY,
    }
    request["requestHashSha256"] = semantic_hash(request, "requestHashSha256")
    return request


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


__all__ = [name for name in globals() if not name.startswith("__")]
