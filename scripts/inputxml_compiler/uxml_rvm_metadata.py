"""Canonical metadata authority for UXML/RVM projection."""
from __future__ import annotations

from typing import Any

from .uxml_rvm_common import (
    clean, fail, normalized_identity, require_hash, require_object,
    require_source_binding, require_strings, semantic_normalize,
)
from .uxml_rvm_contracts import METADATA_SCHEMA

EPOCH_VALUES = {"1970-01-01T00:00:00.000Z", "1970-01-01T00:00:00Z"}


def validate_metadata_context(
    artifact: Any, source_hash: str, source_kind: str
) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        return None, ""
    context = require_object(artifact, "UXML_RVM_METADATA_CONTEXT_SHAPE", "metadata context")
    if clean(context.get("schema")) != METADATA_SCHEMA:
        fail("UXML_RVM_METADATA_SCHEMA", f"Expected {METADATA_SCHEMA}")
    allowed = {
        "schema", "sourceHashSha256", "sourceKind", "authorityId", "authorityType",
        "jobName", "time", "issueNo", "issueNoDisposition", "evidenceReferences",
        "canonicalMetadataContextHashSha256",
    }
    unknown = sorted(set(context) - allowed)
    if unknown:
        fail("UXML_RVM_METADATA_UNKNOWN_FIELD", f"Unknown metadata fields: {unknown}")
    require_source_binding(context, source_hash, source_kind, "UXML_RVM_METADATA_SOURCE_BINDING")
    if clean(context.get("authorityType")) != "APPROVED_CANONICAL_METADATA_CONTEXT":
        fail("UXML_RVM_METADATA_AUTHORITY", "Unknown canonical metadata authority")
    if not clean(context.get("authorityId")):
        fail("UXML_RVM_METADATA_AUTHORITY", "metadata context requires authorityId")
    if not clean(context.get("jobName")) or not clean(context.get("time")):
        fail("UXML_RVM_METADATA_REQUIRED", "Approved metadata requires jobName and time")
    disposition = normalized_identity(context.get("issueNoDisposition") or "EMIT_CANONICAL")
    if disposition not in {"EMIT_CANONICAL", "EXPLICIT_ABSENCE"}:
        fail("UXML_RVM_METADATA_DISPOSITION", "Unknown issueNo disposition")
    if disposition == "EXPLICIT_ABSENCE" and clean(context.get("issueNo")):
        fail("UXML_RVM_METADATA_DISPOSITION", "Explicit issueNo absence cannot carry a value")
    require_strings(context.get("evidenceReferences"), "UXML_RVM_METADATA_EVIDENCE", "evidenceReferences")
    digest = require_hash(
        context, "canonicalMetadataContextHashSha256", "UXML_RVM_METADATA_HASH"
    )
    return semantic_normalize(context), digest


def _source_metadata(uxml: dict[str, Any]) -> dict[str, Any] | None:
    header = require_object(uxml.get("header"), "UXML_RVM_HEADER_SHAPE", "header")
    authority = header.get("canonicalAuthority")
    if authority in (None, {}):
        return None
    decision = require_object(authority, "UXML_RVM_SOURCE_METADATA_AUTHORITY", "header.canonicalAuthority")
    if clean(decision.get("authorityType")) != "EXACT_SOURCE_CANONICAL_METADATA":
        fail("UXML_RVM_SOURCE_METADATA_AUTHORITY", "Unknown source metadata authority")
    require_strings(decision.get("evidenceReferences"), "UXML_RVM_SOURCE_METADATA_EVIDENCE", "evidenceReferences")
    job_name = clean(header.get("modelId"))
    time = clean(header.get("createdAt"))
    if not job_name or not time or time in EPOCH_VALUES:
        fail("UXML_RVM_SOURCE_METADATA_REQUIRED", "Source metadata authority requires non-generated modelId and createdAt")
    return {
        "jobName": job_name,
        "time": time,
        "issueNo": clean(header.get("issueNo")),
        "authority": "EXACT_SOURCE_CANONICAL_METADATA",
        "evidenceReferences": sorted(decision["evidenceReferences"]),
    }


def resolve_canonical_metadata(
    uxml: dict[str, Any], external: dict[str, Any] | None
) -> dict[str, Any]:
    source = _source_metadata(uxml)
    external_value = None
    if external:
        external_value = {
            "jobName": clean(external["jobName"]),
            "time": clean(external["time"]),
            "issueNo": "" if normalized_identity(external.get("issueNoDisposition")) == "EXPLICIT_ABSENCE" else clean(external.get("issueNo")),
            "authority": "APPROVED_CANONICAL_METADATA_CONTEXT",
            "evidenceReferences": sorted(external["evidenceReferences"]),
        }
    if source and external_value:
        for field in ("jobName", "time", "issueNo"):
            if source[field] != external_value[field]:
                fail("UXML_RVM_METADATA_CONTRADICTION", f"Source and external metadata disagree for {field}")
    selected = source or external_value
    if selected is None:
        fail("UXML_RVM_METADATA_MISSING", "Canonical JOBNAME and TIME require explicit authority")
    return selected
