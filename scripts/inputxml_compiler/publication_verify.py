#!/usr/bin/env python3
"""Fail-closed verifier for committed InputXML result bundles."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .publication_contract import (
    PUBLICATION_PROTOCOL,
    PUBLICATION_SCHEMA,
    VALID_BUNDLE_KINDS,
    VALID_STATUSES,
)
from .publication_state import PublicationIntegrityError
from .xml import _sha256


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise PublicationIntegrityError(f"Duplicate JSON key: {key}.")
        result[key] = value
    return result


def _load_json(data: bytes, label: str) -> dict[str, Any]:
    try:
        payload = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PublicationIntegrityError(f"{label} is not valid UTF-8 JSON.") from exc
    if not isinstance(payload, dict):
        raise PublicationIntegrityError(f"{label} must be a JSON object.")
    return payload


def _require_file_meta(
    metadata: dict[str, Any],
    key: str,
    expected_name: str,
) -> dict[str, Any]:
    files = metadata.get("files")
    if not isinstance(files, dict):
        raise PublicationIntegrityError("Publication files metadata is missing.")
    item = files.get(key)
    if not isinstance(item, dict):
        raise PublicationIntegrityError(f"Publication metadata lacks {key}.")
    if item.get("name") != expected_name:
        raise PublicationIntegrityError(f"Unexpected {key} filename in metadata.")
    return item


def _verify_hashed_file(path: Path, metadata: dict[str, Any], ops) -> bytes:
    if not ops.is_file(path):
        raise PublicationIntegrityError(f"Committed file is missing: {path.name}.")
    data = ops.read_bytes(path)
    if metadata.get("bytes") != len(data):
        raise PublicationIntegrityError(f"Committed byte length mismatch: {path.name}.")
    if metadata.get("sha256") != _sha256(data):
        raise PublicationIntegrityError(f"Committed hash mismatch: {path.name}.")
    return data


def _expected_bundle_kind(status: str, has_canonical: bool) -> str:
    if status == "PASS":
        return "PASS_WITH_CANONICAL"
    return "BLOCKED_WITH_CANONICAL" if has_canonical else "BLOCKED_NO_CANONICAL"


def _verify_status_contract(
    validation: dict[str, Any],
    ledger: dict[str, Any],
    metadata: dict[str, Any],
) -> tuple[str, bool]:
    status = validation.get("status")
    if status not in VALID_STATUSES:
        raise PublicationIntegrityError(f"Invalid validation status: {status}.")
    if ledger.get("status") != status:
        raise PublicationIntegrityError("Ledger status does not match validation status.")
    if metadata.get("terminalStatus") != status:
        raise PublicationIntegrityError(
            "Publication terminal status does not match validation status."
        )
    orchestration = validation.get("orchestration") or {}
    if orchestration.get("terminalStatus") != status:
        raise PublicationIntegrityError(
            "Compiler orchestration status does not match validation status."
        )
    has_canonical = metadata.get("canonicalCandidatePublished")
    if not isinstance(has_canonical, bool):
        raise PublicationIntegrityError("Canonical publication flag must be boolean.")
    kind = metadata.get("bundleKind")
    if kind not in VALID_BUNDLE_KINDS:
        raise PublicationIntegrityError(f"Unknown publication bundle kind: {kind}.")
    if kind != _expected_bundle_kind(status, has_canonical):
        raise PublicationIntegrityError("Bundle kind is inconsistent with final status.")
    if status == "PASS" and not has_canonical:
        raise PublicationIntegrityError("PASS bundle has no canonical candidate.")
    return status, has_canonical


def _verify_identity_contract(
    validation: dict[str, Any],
    ledger: dict[str, Any],
    metadata: dict[str, Any],
) -> None:
    source_hash = metadata.get("sourceHashSha256")
    if not source_hash or source_hash != ledger.get("sourceHashSha256"):
        raise PublicationIntegrityError("Publication source hash does not match ledger.")
    dialect = metadata.get("dialect")
    if not dialect or dialect != validation.get("dialect"):
        raise PublicationIntegrityError("Publication dialect does not match validation.")
    if dialect != ledger.get("dialect"):
        raise PublicationIntegrityError("Publication dialect does not match ledger.")
    resolver = validation.get("resolverOutcome")
    if resolver is None:
        return
    if not isinstance(resolver, dict):
        raise PublicationIntegrityError("Resolver outcome must be a JSON object.")
    if resolver.get("profileId") != validation.get("dialect"):
        raise PublicationIntegrityError("Resolver profile does not match dialect.")
    if not resolver.get("adapterId"):
        raise PublicationIntegrityError("Resolver adapter identity is missing.")


def verify_committed_bundle(
    output_dir: Path,
    stem: str,
    *,
    ops=None,
) -> dict[str, Any]:
    """Verify a committed bundle without invoking the CII writer."""
    if ops is None:
        from .publication_io import FileOps

        ops = FileOps()
    validation_path = output_dir / f"{stem}.canonical-validation.json"
    ledger_path = output_dir / f"{stem}.canonicalization-ledger.json"
    canonical_path = output_dir / f"{stem}.canonical.input.xml"
    if not ops.is_file(validation_path):
        raise PublicationIntegrityError(
            "Validation commit marker is missing; bundle is not committed."
        )
    validation = _load_json(ops.read_bytes(validation_path), "Validation report")
    metadata = validation.get("publication")
    if not isinstance(metadata, dict):
        raise PublicationIntegrityError("Publication metadata is missing.")
    if metadata.get("schema") != PUBLICATION_SCHEMA:
        raise PublicationIntegrityError("Unknown publication schema.")
    if metadata.get("protocol") != PUBLICATION_PROTOCOL:
        raise PublicationIntegrityError("Unknown publication protocol.")
    if metadata.get("state") != "COMMITTED":
        raise PublicationIntegrityError("Publication state is not COMMITTED.")
    validation_meta = _require_file_meta(
        metadata,
        "validation",
        validation_path.name,
    )
    if set(validation_meta) != {"name"}:
        raise PublicationIntegrityError(
            "Validation self-hash or byte length is not permitted."
        )
    ledger_meta = _require_file_meta(metadata, "ledger", ledger_path.name)
    ledger_bytes = _verify_hashed_file(ledger_path, ledger_meta, ops)
    ledger = _load_json(ledger_bytes, "Decision ledger")
    status, has_canonical = _verify_status_contract(validation, ledger, metadata)
    _verify_identity_contract(validation, ledger, metadata)
    canonical_meta = (metadata.get("files") or {}).get("canonical")
    if has_canonical:
        if not isinstance(canonical_meta, dict):
            raise PublicationIntegrityError("Canonical metadata is missing.")
        if canonical_meta.get("name") != canonical_path.name:
            raise PublicationIntegrityError("Unexpected canonical filename in metadata.")
        canonical_bytes = _verify_hashed_file(canonical_path, canonical_meta, ops)
        if ledger.get("canonicalHashSha256") != _sha256(canonical_bytes):
            raise PublicationIntegrityError(
                "Canonical hash does not match decision ledger."
            )
    else:
        if canonical_meta is not None:
            raise PublicationIntegrityError("No-candidate bundle has canonical metadata.")
        if ops.exists(canonical_path):
            raise PublicationIntegrityError(
                "No-candidate bundle has a stale canonical file."
            )
        if ledger.get("canonicalHashSha256") is not None:
            raise PublicationIntegrityError(
                "No-candidate bundle carries a canonical hash."
            )
    resolver = validation.get("resolverOutcome") or {}
    outcome_kind = resolver.get("outcomeKind")
    if outcome_kind == "BLOCKED_WITH_CANDIDATE" and not has_canonical:
        raise PublicationIntegrityError("Blocked candidate outcome lost its canonical file.")
    if outcome_kind == "BLOCKED_NO_CANDIDATE" and has_canonical:
        raise PublicationIntegrityError("No-candidate outcome published canonical XML.")
    if status == "PASS" and outcome_kind not in {None, "CANONICAL_CANDIDATE"}:
        raise PublicationIntegrityError("PASS has a non-accepting resolver outcome.")
    return {
        "schema": "InputXmlCommittedBundleVerification.v1",
        "verified": True,
        "stem": stem,
        "status": status,
        "bundleKind": metadata["bundleKind"],
        "sourceHashSha256": metadata["sourceHashSha256"],
        "canonicalPublished": has_canonical,
    }


__all__ = ["verify_committed_bundle"]
