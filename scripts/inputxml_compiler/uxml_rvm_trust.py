"""Process-configured approval trust for UXML/RVM authority manifests."""
from __future__ import annotations

import hashlib
import hmac
import os
from typing import Any

from .uxml_rvm_contracts import clean, fail, stable_json_bytes

APPROVAL_KEY_ENV = "INPUTXML_UXML_RVM_APPROVAL_HMAC_KEY"
APPROVAL_KEY_ID_ENV = "INPUTXML_UXML_RVM_APPROVAL_KEY_ID"
DEFAULT_KEY_ID = "UXML-RVM-OWNER-APPROVAL-V1"


def manifest_hash(manifest: dict[str, Any]) -> str:
    body = {
        key: value
        for key, value in manifest.items()
        if key not in {"authorityManifestHashSha256", "approvalMacSha256"}
    }
    return hashlib.sha256(stable_json_bytes(body)).hexdigest()


def approval_mac(manifest_hash_sha256: str, key: str) -> str:
    return hmac.new(
        key.encode("utf-8"),
        manifest_hash_sha256.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()


def verify_manifest_approval(manifest: dict[str, Any], actual_hash: str) -> None:
    configured_key = os.environ.get(APPROVAL_KEY_ENV, "")
    configured_key_id = os.environ.get(APPROVAL_KEY_ID_ENV, DEFAULT_KEY_ID)
    if not configured_key:
        fail(
            "UXML_RVM_APPROVAL_TRUST_MISSING",
            f"Process trust root {APPROVAL_KEY_ENV} is not configured",
        )
    if clean(manifest.get("approvalKeyId")) != configured_key_id:
        fail("UXML_RVM_APPROVAL_KEY_ID", "Authority manifest approval key is not trusted")
    declared = clean(manifest.get("approvalMacSha256")).lower()
    expected = approval_mac(actual_hash, configured_key)
    if not declared or not hmac.compare_digest(declared, expected):
        fail("UXML_RVM_AUTHORITY_MANIFEST_NOT_APPROVED", "Detached authority approval is invalid")
