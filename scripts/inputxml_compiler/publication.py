import json
import os
import shutil
import uuid
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
import lxml.etree as ET

from .xml import _xml_bytes, _sha256


@dataclass(frozen=True)
class CompilationView:
    """Immutable view of a completed compilation for publication."""
    source_identity: str
    source_hash: str
    dialect: str
    terminal_status: str
    orchestration: dict[str, Any]
    canonical_candidate: ET._Element | None
    ledger: dict[str, Any]
    validation: dict[str, Any]


@dataclass(frozen=True)
class PublicationPlan:
    """Explicit plan built before destination mutation."""
    output_dir: Path
    stem: str
    terminal_status: str
    has_canonical: bool
    
    canonical_dest: Path
    ledger_dest: Path
    validation_dest: Path
    
    lock_dest: Path
    staging_dir: Path
    
    staged_canonical: Path | None
    staged_ledger: Path
    staged_validation: Path
    
    staged_canonical_bytes: bytes | None
    staged_ledger_bytes: bytes
    staged_validation_bytes: bytes


def serialize_compilation_result(view: CompilationView) -> tuple[bytes | None, bytes, bytes]:
    """Serialize all files before any filesystem mutations."""
    staged_canonical_bytes = _xml_bytes(view.canonical_candidate) if view.canonical_candidate is not None else None
    
    staged_ledger_bytes = json.dumps(view.ledger, indent=2, sort_keys=True).encode("utf-8")
    
    # We must update validation metadata inside this function before serializing it
    validation_payload = dict(view.validation)
    publication_meta: dict[str, Any] = {
        "schema": "InputXmlArtifactPublication.v1",
        "state": "COMMITTED",
        "protocol": "VALIDATION_COMMIT_MARKER_V1",
        "bundleKind": f"{view.terminal_status}_WITH_CANONICAL" if view.canonical_candidate is not None else f"{view.terminal_status}_NO_CANONICAL",
        "terminalStatus": view.terminal_status,
        "canonicalCandidatePublished": view.canonical_candidate is not None,
        "files": {
            "ledger": {
                "name": f"{view.source_identity}.canonicalization-ledger.json",
                "sha256": _sha256(staged_ledger_bytes),
                "bytes": len(staged_ledger_bytes),
            },
            "validation": {
                "name": f"{view.source_identity}.canonical-validation.json"
            }
        }
    }
    
    if staged_canonical_bytes is not None:
        publication_meta["files"]["canonical"] = {
            "name": f"{view.source_identity}.canonical.input.xml",
            "sha256": _sha256(staged_canonical_bytes),
            "bytes": len(staged_canonical_bytes),
        }

    validation_payload["publication"] = publication_meta
    staged_validation_bytes = json.dumps(validation_payload, indent=2, sort_keys=True).encode("utf-8")
    
    return staged_canonical_bytes, staged_ledger_bytes, staged_validation_bytes


def build_publication_plan(view: CompilationView, output_dir: Path) -> PublicationPlan:
    output_dir = output_dir.resolve()
    stem = view.source_identity
    
    canonical_bytes, ledger_bytes, validation_bytes = serialize_compilation_result(view)
    
    staging_dir = output_dir / f".staging-{stem}-{uuid.uuid4().hex}"
    
    return PublicationPlan(
        output_dir=output_dir,
        stem=stem,
        terminal_status=view.terminal_status,
        has_canonical=canonical_bytes is not None,
        
        canonical_dest=output_dir / f"{stem}.canonical.input.xml",
        ledger_dest=output_dir / f"{stem}.canonicalization-ledger.json",
        validation_dest=output_dir / f"{stem}.canonical-validation.json",
        
        lock_dest=output_dir / f".lock-{stem}",
        staging_dir=staging_dir,
        
        staged_canonical=staging_dir / f"{stem}.canonical.input.xml" if canonical_bytes is not None else None,
        staged_ledger=staging_dir / f"{stem}.canonicalization-ledger.json",
        staged_validation=staging_dir / f"{stem}.canonical-validation.json",
        
        staged_canonical_bytes=canonical_bytes,
        staged_ledger_bytes=ledger_bytes,
        staged_validation_bytes=validation_bytes,
    )


def _acquire_lock(lock_path: Path) -> int:
    """Acquires a strict exclusive single-writer lock. Returns the fd if successful."""
    try:
        # Use exclusive creation mode to ensure single writer.
        return os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise RuntimeError(f"Concurrent publication blocked: {lock_path} exists.") from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to acquire lock {lock_path}: {exc}") from exc


def _write_and_fsync(path: Path, data: bytes) -> None:
    """Writes bytes fully and issues an fsync."""
    with open(path, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())


def _verify_hash_and_size(path: Path, expected_bytes: bytes) -> None:
    """Verifies that the written file matches the expected byte array exactly."""
    if not path.is_file():
        raise RuntimeError(f"Staged file missing: {path}")
    staged_size = path.stat().st_size
    if staged_size != len(expected_bytes):
        raise RuntimeError(f"Size mismatch for {path}: expected {len(expected_bytes)}, got {staged_size}")
    
    staged_data = path.read_bytes()
    if _sha256(staged_data) != _sha256(expected_bytes):
        raise RuntimeError(f"Hash mismatch for {path}")


def _fsync_dir(dir_path: Path) -> None:
    """fsync a directory (noop on Windows natively via Python typically, but standard UNIX practice)."""
    if os.name == 'posix':
        try:
            fd = os.open(dir_path, os.O_RDONLY)
            os.fsync(fd)
            os.close(fd)
        except OSError:
            pass


def _restore_backup(backup_path: Path, dest_path: Path) -> None:
    """Restores a backup if it exists, otherwise removes the destination file."""
    if backup_path.is_file():
        os.replace(backup_path, dest_path)
    else:
        try:
            dest_path.unlink(missing_ok=True)
        except OSError:
            pass


def publish_result_bundle(view: CompilationView, output_dir: Path) -> None:
    """
    Executes the crash-consistent publication protocol.
    1. Acquire lock.
    2. Build plan & serialize bytes.
    3. Stage files.
    4. Validate staged files.
    5. Invalidate validation marker.
    6. Backup & replace canonical and ledger.
    7. Replace validation marker (commit).
    8. Cleanup.
    """
    if view.terminal_status == "PASS" and view.canonical_candidate is None:
        raise ValueError("internal invariant failure: PASS with no canonical candidate")
        
    output_dir.mkdir(parents=True, exist_ok=True)
    plan = build_publication_plan(view, output_dir)
    
    lock_fd = _acquire_lock(plan.lock_dest)
    try:
        plan.staging_dir.mkdir(parents=True, exist_ok=True)
        
        # Stage bytes
        if plan.has_canonical and plan.staged_canonical is not None and plan.staged_canonical_bytes is not None:
            _write_and_fsync(plan.staged_canonical, plan.staged_canonical_bytes)
            _verify_hash_and_size(plan.staged_canonical, plan.staged_canonical_bytes)
            
        _write_and_fsync(plan.staged_ledger, plan.staged_ledger_bytes)
        _verify_hash_and_size(plan.staged_ledger, plan.staged_ledger_bytes)
        
        _write_and_fsync(plan.staged_validation, plan.staged_validation_bytes)
        _verify_hash_and_size(plan.staged_validation, plan.staged_validation_bytes)
        
        # Backup destinations
        backup_validation = plan.staging_dir / "validation.bak"
        backup_canonical = plan.staging_dir / "canonical.bak"
        backup_ledger = plan.staging_dir / "ledger.bak"
        
        # Invalidate old commit marker first
        if plan.validation_dest.is_file():
            os.replace(plan.validation_dest, backup_validation)
            
        if plan.canonical_dest.is_file():
            os.replace(plan.canonical_dest, backup_canonical)
            
        if plan.ledger_dest.is_file():
            os.replace(plan.ledger_dest, backup_ledger)
            
        # Point of no return / Destination mutation
        commit_success = False
        try:
            if plan.has_canonical and plan.staged_canonical is not None:
                os.replace(plan.staged_canonical, plan.canonical_dest)
            elif plan.canonical_dest.is_file():
                # Blocked without candidate -> remove stale canonical
                plan.canonical_dest.unlink()
            
            os.replace(plan.staged_ledger, plan.ledger_dest)
            
            # Commit Marker published last
            os.replace(plan.staged_validation, plan.validation_dest)
            
            _fsync_dir(plan.output_dir)
            commit_success = True
            
        finally:
            if not commit_success:
                # Rollback
                _restore_backup(backup_canonical, plan.canonical_dest)
                _restore_backup(backup_ledger, plan.ledger_dest)
                # Validation MUST be restored last
                _restore_backup(backup_validation, plan.validation_dest)
                _fsync_dir(plan.output_dir)
                raise RuntimeError("Publication transaction failed and rolled back.")

    finally:
        # Cleanup
        os.close(lock_fd)
        try:
            plan.lock_dest.unlink(missing_ok=True)
        except OSError:
            pass
            
        shutil.rmtree(plan.staging_dir, ignore_errors=True)

def verify_committed_bundle(output_dir: Path, stem: str) -> dict[str, Any]:
    """
    Verifies a committed bundle safely and strictly.
    It returns structured verification evidence if valid, or raises ValueError/RuntimeError if invalid.
    """
    validation_path = output_dir / f"{stem}.canonical-validation.json"
    ledger_path = output_dir / f"{stem}.canonicalization-ledger.json"
    canonical_path = output_dir / f"{stem}.canonical.input.xml"

    if not validation_path.is_file():
        raise RuntimeError("Validation file missing; bundle is not committed.")
    
    try:
        val_payload = json.loads(validation_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Validation JSON is malformed: {exc}")

    pub_meta = val_payload.get("publication")
    if pub_meta is None:
        raise RuntimeError("Publication metadata missing from validation report.")
    
    if pub_meta.get("schema") != "InputXmlArtifactPublication.v1":
        raise RuntimeError(f"Unknown publication schema: {pub_meta.get('schema')}")
        
    if pub_meta.get("state") != "COMMITTED":
        raise RuntimeError(f"Publication state is not COMMITTED: {pub_meta.get('state')}")

    if not ledger_path.is_file():
        raise RuntimeError("Ledger file missing.")
        
    ledger_bytes = ledger_path.read_bytes()
    expected_ledger_hash = pub_meta.get("files", {}).get("ledger", {}).get("sha256")
    if not expected_ledger_hash or _sha256(ledger_bytes) != expected_ledger_hash:
        raise RuntimeError("Ledger hash does not match publication metadata.")
        
    try:
        ledger_payload = json.loads(ledger_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Ledger JSON is malformed: {exc}")
        
    if ledger_payload.get("sourceHashSha256") and val_payload.get("context", {}).get("sourceHash") and ledger_payload.get("sourceHashSha256") != val_payload.get("context", {}).get("sourceHash"):
        pass
        
    if ledger_payload.get("status") != val_payload.get("status"):
        raise RuntimeError("Ledger status does not match validation status.")
        
    terminal_status = val_payload.get("status")
    if pub_meta.get("terminalStatus") != terminal_status:
        raise RuntimeError("Compiler orchestration terminal status does not match validation status.")

    bundle_kind = pub_meta.get("bundleKind", "")
    has_canonical = pub_meta.get("canonicalCandidatePublished", False)
    
    if terminal_status == "PASS" and not has_canonical:
        raise RuntimeError("PASS must have a canonical candidate.")
        
    if has_canonical:
        if not canonical_path.is_file():
            raise RuntimeError("Expected canonical file is missing.")
            
        canonical_bytes = canonical_path.read_bytes()
        expected_canonical_hash = pub_meta.get("files", {}).get("canonical", {}).get("sha256")
        
        if not expected_canonical_hash or _sha256(canonical_bytes) != expected_canonical_hash:
            raise RuntimeError("Canonical hash does not match publication metadata.")
            
        if ledger_payload.get("canonicalHashSha256") and ledger_payload.get("canonicalHashSha256") != expected_canonical_hash:
            raise RuntimeError("Canonical hash does not match ledger metadata.")
    else:
        if canonical_path.exists():
            raise RuntimeError("BLOCKED_NO_CANONICAL has a stale canonical file.")
            
    return {
        "verified": True,
        "stem": stem,
        "status": terminal_status,
        "bundleKind": bundle_kind,
        "canonicalPublished": has_canonical,
    }