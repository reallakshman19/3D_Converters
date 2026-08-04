"""Detached owner approval for UXML/RVM authority artifacts."""
from __future__ import annotations

from typing import Any

from .uxml_rvm_contracts import (
    clean,
    fail,
    require_object,
    require_source_binding,
    require_strings,
    semantic_normalize,
)
from .uxml_rvm_trust import manifest_hash, verify_manifest_approval

MANIFEST_SCHEMA = "UxmlRvmAuthorityManifest.v1"


def validate_authority_manifest(
    artifact: Any,
    *,
    source_hash: str,
    source_kind: str,
    coordinate_hash: str,
    topology_hash: str,
    engineering_hash: str,
    metadata_hash: str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    approved_hash: Any = None,
) -> tuple[dict[str, Any], str]:
    manifest = require_object(
        artifact,
        "UXML_RVM_AUTHORITY_MANIFEST_MISSING",
        "authority manifest",
    )
    if clean(manifest.get("schema")) != MANIFEST_SCHEMA:
        fail("UXML_RVM_AUTHORITY_MANIFEST_SCHEMA", f"Expected {MANIFEST_SCHEMA}")
    allowed = {
        "schema", "sourceHashSha256", "sourceKind", "authorityId", "authorityType",
        "coordinateContextHashSha256", "topologyPlanHashSha256",
        "engineeringContextHashSha256", "canonicalMetadataHashSha256",
        "evidenceReferences", "approvalKeyId", "approvalMacSha256",
        "authorityManifestHashSha256",
    }
    unknown = sorted(set(manifest) - allowed)
    if unknown:
        fail("UXML_RVM_AUTHORITY_MANIFEST_FIELD", f"Unknown authority-manifest fields: {unknown}")
    require_source_binding(
        manifest,
        source_hash,
        source_kind,
        "UXML_RVM_AUTHORITY_MANIFEST_SOURCE",
    )
    if clean(manifest.get("authorityType")) != "APPROVED_UXML_RVM_AUTHORITY_MANIFEST":
        fail("UXML_RVM_AUTHORITY_MANIFEST_TYPE", "Unknown authority-manifest type")
    if not clean(manifest.get("authorityId")):
        fail("UXML_RVM_AUTHORITY_MANIFEST_ID", "Authority manifest requires authorityId")
    require_strings(
        manifest.get("evidenceReferences"),
        "UXML_RVM_AUTHORITY_MANIFEST_EVIDENCE",
        "evidenceReferences",
    )
    expected = {
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "canonicalMetadataHashSha256": metadata_hash,
    }
    for field, value in expected.items():
        if clean(manifest.get(field)).lower() != value:
            fail("UXML_RVM_AUTHORITY_MANIFEST_BINDING", f"Authority manifest {field} mismatch")
    actual = manifest_hash(manifest)
    if clean(manifest.get("authorityManifestHashSha256")).lower() != actual:
        fail("UXML_RVM_AUTHORITY_MANIFEST_HASH", "Authority manifest semantic hash mismatch")
    if approved_hash not in (None, "") and clean(approved_hash).lower() != actual:
        fail("UXML_RVM_AUTHORITY_MANIFEST_NOT_APPROVED", "Supplied test pin does not match authority manifest")
    verify_manifest_approval(manifest, actual)
    return semantic_normalize(manifest), actual
