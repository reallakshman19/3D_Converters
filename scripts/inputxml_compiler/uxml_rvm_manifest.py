"""Authority-manifest validation; approval is delegated to an external trust root."""
from __future__ import annotations

from typing import Any

from .uxml_rvm_common import (
    clean, fail, require_hash, require_object, require_source_binding,
    require_strings, semantic_normalize,
)
from .uxml_rvm_contracts import MANIFEST_SCHEMA


def validate_authority_manifest(
    artifact: Any, *, source_hash: str, source_kind: str, coordinate_hash: str,
    topology_hash: str, engineering_hash: str, metadata_hash: str,
) -> tuple[dict[str, Any], str]:
    manifest = require_object(artifact, "UXML_RVM_AUTHORITY_MANIFEST_MISSING", "authority manifest")
    if clean(manifest.get("schema")) != MANIFEST_SCHEMA:
        fail("UXML_RVM_AUTHORITY_MANIFEST_SCHEMA", f"Expected {MANIFEST_SCHEMA}")
    allowed = {
        "schema", "sourceHashSha256", "sourceKind", "authorityId", "authorityType",
        "coordinateContextHashSha256", "topologyPlanHashSha256",
        "engineeringContextHashSha256", "canonicalMetadataContextHashSha256",
        "evidenceReferences", "authorityManifestHashSha256",
    }
    unknown = sorted(set(manifest) - allowed)
    if unknown:
        fail("UXML_RVM_AUTHORITY_MANIFEST_FIELD", f"Unknown manifest fields: {unknown}")
    require_source_binding(manifest, source_hash, source_kind, "UXML_RVM_AUTHORITY_MANIFEST_SOURCE")
    if clean(manifest.get("authorityType")) != "APPROVED_UXML_RVM_AUTHORITY_MANIFEST":
        fail("UXML_RVM_AUTHORITY_MANIFEST_TYPE", "Unknown authority-manifest type")
    if not clean(manifest.get("authorityId")):
        fail("UXML_RVM_AUTHORITY_MANIFEST_ID", "Authority manifest requires authorityId")
    require_strings(manifest.get("evidenceReferences"), "UXML_RVM_AUTHORITY_MANIFEST_EVIDENCE", "evidenceReferences")
    expected = {
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": topology_hash,
        "engineeringContextHashSha256": engineering_hash,
        "canonicalMetadataContextHashSha256": metadata_hash,
    }
    for field, value in expected.items():
        if clean(manifest.get(field)).lower() != value:
            fail("UXML_RVM_AUTHORITY_MANIFEST_BINDING", f"Authority manifest {field} mismatch")
    actual = require_hash(manifest, "authorityManifestHashSha256", "UXML_RVM_AUTHORITY_MANIFEST_HASH")
    return semantic_normalize(manifest), actual
