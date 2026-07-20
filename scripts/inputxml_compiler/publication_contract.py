#!/usr/bin/env python3
"""Exact-byte publication contract for completed compiler results."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from lxml import etree as ET

from .publication_state import PublicationInvariantError
from .xml import _sha256, _xml_bytes
from .serialization import (
    serialize_canonical_xml,
    serialize_decision_ledger,
    serialize_validation_report,
    hash_canonical_bytes,
    hash_ledger_bytes,
)

PUBLICATION_SCHEMA = "InputXmlArtifactPublication.v1"
PUBLICATION_PROTOCOL = "VALIDATION_COMMIT_MARKER_V1"
VALID_STATUSES = {"PASS", "BLOCKED"}
VALID_BUNDLE_KINDS = {
    "PASS_WITH_CANONICAL",
    "BLOCKED_WITH_CANONICAL",
    "BLOCKED_NO_CANONICAL",
}


@dataclass(frozen=True)
class CompilationView:
    """Immutable exact-byte view of one completed compiler result."""

    stem: str
    source_hash: str
    dialect: str
    terminal_status: str
    resolver_outcome_kind: str | None
    canonical_bytes: bytes | None
    ledger_bytes: bytes
    validation_base_bytes: bytes

    @classmethod
    def from_compiler_result(
        cls,
        *,
        stem: str,
        source_hash: str,
        canonical: ET._Element | None,
        ledger: dict[str, Any],
        validation: dict[str, Any],
        policy: dict[str, Any] | None = None,
    ) -> "CompilationView":
        _validate_stem(stem)
        if policy:
            canonical_bytes = serialize_canonical_xml(canonical, policy) if canonical is not None else None
            ledger_bytes = serialize_decision_ledger(ledger, policy)
            validation_bytes = serialize_validation_report(validation, policy)
        else:
            canonical_bytes = _xml_bytes(canonical) if canonical is not None else None
            ledger_bytes = json_bytes(ledger)
            validation_bytes = json_bytes(validation)
            
        resolver = validation.get("resolverOutcome") or {}
        view = cls(
            stem=stem,
            source_hash=source_hash,
            dialect=str(validation.get("dialect", "unresolved")),
            terminal_status=str(validation.get("status", "FAILED")),
            resolver_outcome_kind=resolver.get("outcomeKind"),
            canonical_bytes=canonical_bytes,
            ledger_bytes=ledger_bytes,
            validation_base_bytes=validation_bytes,
        )
        validate_compilation_view(view)
        return view


def json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


def json_payload(data: bytes, label: str) -> dict[str, Any]:
    try:
        payload = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PublicationInvariantError(f"{label} is not valid UTF-8 JSON.") from exc
    if not isinstance(payload, dict):
        raise PublicationInvariantError(f"{label} must be a JSON object.")
    return payload


def bundle_kind(view: CompilationView) -> str:
    if view.terminal_status == "PASS":
        return "PASS_WITH_CANONICAL"
    if view.canonical_bytes is not None:
        return "BLOCKED_WITH_CANONICAL"
    return "BLOCKED_NO_CANONICAL"


def publication_metadata(
    view: CompilationView,
    kind: str,
) -> dict[str, Any]:
    canonical_meta: dict[str, Any] | None = None
    if view.canonical_bytes is not None:
        canonical_meta = {
            "name": f"{view.stem}.canonical.input.xml",
            "sha256": hash_canonical_bytes(view.canonical_bytes),
            "bytes": len(view.canonical_bytes),
        }
    return {
        "schema": PUBLICATION_SCHEMA,
        "state": "COMMITTED",
        "protocol": PUBLICATION_PROTOCOL,
        "bundleKind": kind,
        "terminalStatus": view.terminal_status,
        "sourceHashSha256": view.source_hash,
        "dialect": view.dialect,
        "canonicalCandidatePublished": view.canonical_bytes is not None,
        "files": {
            "canonical": canonical_meta,
            "ledger": {
                "name": f"{view.stem}.canonicalization-ledger.json",
                "sha256": hash_ledger_bytes(view.ledger_bytes),
                "bytes": len(view.ledger_bytes),
            },
            "validation": {
                "name": f"{view.stem}.canonical-validation.json",
            },
        },
    }


def validate_compilation_view(view: CompilationView) -> None:
    if view.terminal_status not in VALID_STATUSES:
        raise PublicationInvariantError(
            f"Unsupported compiler terminal status: {view.terminal_status}."
        )
    ledger = json_payload(view.ledger_bytes, "Decision ledger")
    validation = json_payload(view.validation_base_bytes, "Validation report")
    if ledger.get("status") != view.terminal_status:
        raise PublicationInvariantError("Ledger status does not match compiler status.")
    if validation.get("status") != view.terminal_status:
        raise PublicationInvariantError("Validation status does not match compiler status.")
    if ledger.get("sourceHashSha256") != view.source_hash:
        raise PublicationInvariantError("Ledger source hash does not match source bytes.")
    orchestration = validation.get("orchestration") or {}
    if orchestration.get("terminalStatus") != view.terminal_status:
        raise PublicationInvariantError(
            "Compiler orchestration status does not match validation status."
        )
    if view.terminal_status == "PASS" and view.canonical_bytes is None:
        raise PublicationInvariantError("PASS requires a canonical candidate.")
    canonical_hash = ledger.get("canonicalHashSha256")
    if view.canonical_bytes is None and canonical_hash is not None:
        raise PublicationInvariantError(
            "A result without a candidate cannot carry a canonical hash."
        )
    if view.canonical_bytes is not None:
        if canonical_hash != hash_canonical_bytes(view.canonical_bytes) and canonical_hash != _sha256(view.canonical_bytes):
            raise PublicationInvariantError(
                "Ledger canonical hash does not match exact canonical bytes."
            )
    if view.resolver_outcome_kind == "BLOCKED_NO_CANDIDATE":
        if view.canonical_bytes is not None:
            raise PublicationInvariantError(
                "Resolver declared no candidate but compiler returned canonical bytes."
            )
    if view.resolver_outcome_kind == "BLOCKED_WITH_CANDIDATE":
        if view.canonical_bytes is None:
            raise PublicationInvariantError(
                "Resolver declared a blocked candidate but none was returned."
            )


def _validate_stem(stem: str) -> None:
    if not stem or stem in {".", ".."}:
        raise PublicationInvariantError("A non-empty safe output stem is required.")
    if any(character in stem for character in ("/", "\\", "\0")):
        raise PublicationInvariantError("Output stem contains a path separator or NUL.")


__all__ = [
    "CompilationView",
    "PUBLICATION_PROTOCOL",
    "PUBLICATION_SCHEMA",
    "VALID_BUNDLE_KINDS",
    "VALID_STATUSES",
    "bundle_kind",
    "json_bytes",
    "json_payload",
    "publication_metadata",
    "validate_compilation_view",
]
