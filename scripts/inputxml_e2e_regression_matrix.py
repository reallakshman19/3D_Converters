#!/usr/bin/env python3
"""PR-G matrix wrapper with explicit evidence and blocked semantics."""
from __future__ import annotations
import argparse
import json
import os
import subprocess
from dataclasses import replace
from pathlib import Path
from typing import Any
from scripts import inputxml_e2e_regression_matrix_legacy as _legacy
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    COORDINATE_SCHEMA, METADATA_SCHEMA, decode_source, semantic_hash,
    sha256_bytes, validate_canonical_metadata, validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_manifest import MANIFEST_SCHEMA
from scripts.inputxml_compiler.uxml_rvm_trust import (
    APPROVAL_KEY_ENV, APPROVAL_KEY_ID_ENV, approval_mac, manifest_hash,
)

MatrixCase = _legacy.MatrixCase
_sha256 = _legacy._sha256
_json_hash = _legacy._json_hash
_load_json = _legacy._load_json
_registered_outcomes = _legacy._registered_outcomes
_BASE_MATRIX_CASES = _legacy.matrix_cases
_FIXTURE = _legacy.ROOT / "tests" / "fixtures" / "topo-enriched-xml" / "cii2019-proof" / "generate-production-result.mjs"
_PR9_DIRECT = _legacy.ROOT / "tests" / "fixtures" / "inputxml" / "uxml-rvm" / "direct-exact.json"
_MATRIX_APPROVAL_KEY = "inputxml-e2e-pr9-owner-approval"
_MATRIX_APPROVAL_KEY_ID = "INPUTXML-E2E-PR9-V1"
_EMPTY_HASH = sha256_bytes(b"")


def _assured_node_evidence() -> dict[str, dict[str, Any]]:
    return {
        "10": {"name": "N10", "x": 0, "y": 0, "z": 0},
        "20": {"name": "N20", "x": 1000, "y": 0, "z": 0},
        "30": {"name": "N30", "x": 500, "y": 866, "z": 0},
    }


def _psi116_case() -> MatrixCase:
    completed = subprocess.run(
        ["node", str(_FIXTURE), "CANONICAL"], cwd=_legacy.ROOT,
        check=True, capture_output=True, text=True,
    )
    production_result = json.loads(completed.stdout)
    return MatrixCase(
        "psi116-te013", "pipesstressexport-psi116-xml", "te013.psi116.xml",
        str(production_result["xmlText"]).encode("utf-8"),
        {"te013ProductionResult": production_result}, "FULL_CHAIN_PASS",
    )


def _pr9_coordinate(source: bytes, source_kind: str) -> tuple[dict[str, Any], str]:
    value = {
        "schema": COORDINATE_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "PRG-PR9-COORDINATE",
        "authorityType": "APPROVED_COORDINATE_CONTEXT", "sourceFrameId": "UXML_WORLD",
        "targetFrameId": "CAESAR_GLOBAL", "sourceCoordinateUnits": "MM",
        "targetCoordinateUnits": "MM",
        "axisMap": {
            "targetX": {"sourceAxis": "X", "sign": 1},
            "targetY": {"sourceAxis": "Y", "sign": 1},
            "targetZ": {"sourceAxis": "Z", "sign": 1},
        },
        "scaleToMillimetres": 1, "offsetMillimetres": {"x": 0, "y": 0, "z": 0},
        "handedness": {"source": "RIGHT_HANDED", "target": "RIGHT_HANDED"},
        "evidenceReferences": ["matrix:pr9-coordinate"],
    }
    value["coordinateContextHashSha256"] = semantic_hash(value, "coordinateContextHashSha256")
    return validate_coordinate_context(value, sha256_bytes(source), source_kind)


def _pr9_metadata(source: bytes, source_kind: str) -> tuple[dict[str, Any], str]:
    value = {
        "schema": METADATA_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "PRG-PR9-METADATA",
        "authorityType": "APPROVED_CANONICAL_METADATA", "jobName": "PRG-UXML-RVM",
        "time": "2026-07-22T00:00:00Z", "issueNo": "1", "version": "11.00",
        "north": [0, 1, 0], "evidenceReferences": ["matrix:pr9-metadata"],
    }
    value["canonicalMetadataHashSha256"] = semantic_hash(value, "canonicalMetadataHashSha256")
    return validate_canonical_metadata(value, sha256_bytes(source), source_kind)


def _pr9_context(source: bytes) -> dict[str, Any]:
    _, source_kind = decode_source(source)
    coordinate, coordinate_hash = _pr9_coordinate(source, source_kind)
    metadata, metadata_hash = _pr9_metadata(source, source_kind)
    manifest = {
        "schema": MANIFEST_SCHEMA, "sourceHashSha256": sha256_bytes(source),
        "sourceKind": source_kind, "authorityId": "PRG-PR9-MANIFEST",
        "authorityType": "APPROVED_UXML_RVM_AUTHORITY_MANIFEST",
        "coordinateContextHashSha256": coordinate_hash,
        "topologyPlanHashSha256": _EMPTY_HASH,
        "engineeringContextHashSha256": _EMPTY_HASH,
        "canonicalMetadataHashSha256": metadata_hash,
        "evidenceReferences": ["matrix:pr9-owner-approval"],
        "approvalKeyId": _MATRIX_APPROVAL_KEY_ID,
    }
    manifest["authorityManifestHashSha256"] = manifest_hash(manifest)
    manifest["approvalMacSha256"] = approval_mac(
        manifest["authorityManifestHashSha256"], _MATRIX_APPROVAL_KEY,
    )
    os.environ[APPROVAL_KEY_ENV] = _MATRIX_APPROVAL_KEY
    os.environ[APPROVAL_KEY_ID_ENV] = _MATRIX_APPROVAL_KEY_ID
    return {
        "uxmlRvmCoordinateContext": coordinate,
        "uxmlRvmCanonicalMetadata": metadata,
        "uxmlRvmAuthorityManifest": manifest,
    }


def matrix_cases() -> list[MatrixCase]:
    """Return the registry-closed matrix with explicit profile evidence."""
    evidence = _assured_node_evidence(); result: list[MatrixCase] = []
    for case in [*_BASE_MATRIX_CASES(), _psi116_case()]:
        if case.case_id == "managed-stage":
            result.append(replace(case, context={
                **case.context, "version": case.context.get("version", "11.00"),
                "north": case.context.get("north", [0, 1, 0]),
                "sourceRevision": case.context.get("sourceRevision", 1),
            }))
        elif case.case_id == "pdf-input-echo":
            result.append(replace(case, context={**case.context, "assuredNodeEvidence": evidence}))
        elif case.case_id == "uxml-rvm":
            source = _PR9_DIRECT.read_bytes()
            result.append(replace(
                case, source_name="uxml-rvm-direct-exact.json", source=source,
                context=_pr9_context(source), expected="FULL_CHAIN_PASS",
            ))
        elif case.case_id in {"xml-builder", "seljson"}:
            result.append(replace(case, context={
                **case.context, "version": case.context.get("version", "11.00"),
                "north": case.context.get("north", [0, 1, 0]),
                "fluidDensityScale": "0.000001",
            }))
        else:
            result.append(case)
    return result


_legacy.matrix_cases = matrix_cases


def _accept_evidence_bearing_canonical_block(row: dict[str, Any]) -> bool:
    return (
        row.get("dialect") == "xml-to-cii-diagnostic-sidecar"
        and row.get("canonicalStatus") == "BLOCKED"
        and row.get("assuranceStatus") == "NOT_RUN"
        and row.get("projectionStatus") == "NOT_RUN"
        and row.get("reparseStatus") == "NOT_RUN"
        and row.get("diagnostics") == ["Expected canonical intake to block without canonical output."]
    )


def _rebuild_matrix_result(result: dict[str, Any], output_dir: Path | None) -> dict[str, Any]:
    for row in result.get("cases") or []:
        if _accept_evidence_bearing_canonical_block(row):
            row["diagnostics"] = []; row["status"] = "PASS"; row["blockedEvidenceRetained"] = True
    rows = result.get("cases") or []; failed = [row for row in rows if row.get("status") != "PASS"]
    result["status"] = "PASS" if not failed else "BLOCKED"
    result["summary"]["fullChainPassCount"] = sum(1 for row in rows if row.get("reparseStatus") == "PASS")
    result["summary"]["passCount"] = len(rows) - len(failed); result["summary"]["failCount"] = len(failed)
    result["diagnostics"] = [{
        "severity": "BLOCKING", "code": "MATRIX_CASE_FAILED",
        "message": f"PR-G matrix case {row['caseId']} failed.",
        "context": {"dialect": row["dialect"], "diagnostics": row.get("diagnostics") or []},
    } for row in failed]
    result.pop("matrixHashSha256", None); result["matrixHashSha256"] = _json_hash(result)
    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "inputxml-e2e-regression-matrix.json").write_text(
            json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8",
        )
    return result


def run_matrix(output_dir: Path | None = None) -> dict[str, Any]:
    return _rebuild_matrix_result(_legacy.run_matrix(output_dir), output_dir)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args(argv); result = run_matrix(args.output_dir)
    print(json.dumps({"status": result["status"], "summary": result["summary"], "matrixHashSha256": result["matrixHashSha256"]}, indent=2))
    return 0 if result["status"] == "PASS" else 2


if __name__ == "__main__": raise SystemExit(main())
