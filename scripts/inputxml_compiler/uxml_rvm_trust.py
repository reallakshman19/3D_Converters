"""Process-configured trust root for approved UXML/RVM authority manifests."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .uxml_rvm_common import (
    clean, fail, require_hash, require_list, require_object, require_source_binding,
    require_strings, semantic_normalize, strict_json_loads,
)
from .uxml_rvm_contracts import TRUST_STORE_SCHEMA

TRUST_STORE_ENV = "INPUTXML_UXML_RVM_TRUST_STORE"
MAX_TRUST_STORE_BYTES = 1024 * 1024


@dataclass(frozen=True)
class ApprovalDecision:
    approved: bool
    code: str
    message: str
    trust_store_hash: str = ""
    approval_id: str = ""


def _load_store(path: Path) -> tuple[dict[str, Any], str]:
    try:
        data = path.read_bytes()
    except OSError as exc:
        fail("UXML_RVM_TRUST_STORE_READ", str(exc))
    if len(data) > MAX_TRUST_STORE_BYTES:
        fail("UXML_RVM_TRUST_STORE_LIMIT", "Trust store exceeds bounded size")
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail("UXML_RVM_TRUST_STORE_UTF8", str(exc))
    store = require_object(strict_json_loads(text), "UXML_RVM_TRUST_STORE_SHAPE", "trust store")
    if clean(store.get("schema")) != TRUST_STORE_SCHEMA:
        fail("UXML_RVM_TRUST_STORE_SCHEMA", f"Expected {TRUST_STORE_SCHEMA}")
    require_strings(store.get("evidenceReferences"), "UXML_RVM_TRUST_STORE_EVIDENCE", "evidenceReferences")
    approvals = require_list(store.get("approvals"), "UXML_RVM_TRUST_STORE_APPROVALS", "approvals")
    seen: set[str] = set()
    for index, item in enumerate(approvals):
        row = require_object(item, "UXML_RVM_TRUST_STORE_APPROVAL", f"approvals[{index}]")
        approval_id = clean(row.get("approvalId"))
        if not approval_id or approval_id in seen:
            fail("UXML_RVM_TRUST_STORE_APPROVAL", "Approval identities must be non-empty and unique")
        seen.add(approval_id)
        require_strings(row.get("evidenceReferences"), "UXML_RVM_TRUST_STORE_APPROVAL", "approval evidence")
    digest = require_hash(store, "trustStoreHashSha256", "UXML_RVM_TRUST_STORE_HASH")
    return semantic_normalize(store), digest


def verify_manifest_approval(
    manifest: dict[str, Any], manifest_hash: str, *, source_hash: str, source_kind: str,
    caller_context: dict[str, Any],
) -> ApprovalDecision:
    if clean(caller_context.get("uxmlRvmApprovedAuthorityManifestHashSha256")):
        return ApprovalDecision(
            False, "UXML_RVM_CALLER_APPROVAL_FORBIDDEN",
            "Caller-supplied manifest approval pins have no trust authority",
        )
    configured = clean(os.environ.get(TRUST_STORE_ENV))
    if not configured:
        return ApprovalDecision(
            False, "UXML_RVM_TRUST_ROOT_MISSING",
            f"No process trust store is configured in {TRUST_STORE_ENV}",
        )
    store, store_hash = _load_store(Path(configured))
    matches = []
    for row in store["approvals"]:
        if (
            clean(row.get("manifestHashSha256")).lower() == manifest_hash
            and clean(row.get("sourceHashSha256")).lower() == source_hash
            and clean(row.get("sourceKind")).upper() == source_kind
            and clean(row.get("authorityId")) == clean(manifest.get("authorityId"))
            and clean(row.get("disposition")) == "APPROVED"
        ):
            matches.append(row)
    if len(matches) != 1:
        return ApprovalDecision(
            False, "UXML_RVM_MANIFEST_NOT_TRUSTED",
            "Authority manifest is not uniquely approved by the process trust root",
            store_hash,
        )
    return ApprovalDecision(
        True, "UXML_RVM_MANIFEST_TRUSTED", "Authority manifest approved",
        store_hash, clean(matches[0].get("approvalId")),
    )
