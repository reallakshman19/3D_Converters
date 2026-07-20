#!/usr/bin/env python3
"""Bounded subprocess and strict JSON I/O for managed-stage artifacts."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .base import CompileBlocked, DecisionLedger
from .managed_stage_diagnostics import block

BRIDGE_SCRIPT = Path(__file__).with_name("node_managed_stage_bridge.mjs")
REQUEST_SCHEMA = "InputXmlManagedStageBridgeRequest.v1"
RESULT_SCHEMA = "InputXmlManagedStageBridgeResult.v1"
MAX_REQUEST_BYTES = 12 * 1024 * 1024
MAX_STDOUT_BYTES = 64 * 1024 * 1024
MAX_STDERR_BYTES = 64 * 1024
TIMEOUT_SECONDS = 45


def request_bytes(request: dict[str, Any]) -> bytes:
    if request.get("schema") != REQUEST_SCHEMA:
        raise CompileBlocked("Internal managed-stage request schema mismatch.")
    payload = json.dumps(
        request,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")
    if len(payload) > MAX_REQUEST_BYTES:
        raise CompileBlocked(
            f"Managed-stage bridge request exceeds {MAX_REQUEST_BYTES} bytes."
        )
    return payload


def resolved_node(context: dict[str, Any], ledger: DecisionLedger) -> str:
    configured = str(context.get("nodeExecutable") or "node").strip()
    path = shutil.which(configured)
    if path is None:
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage requires Node.js executable {configured!r}.",
            "managed-stage-bridge",
        )
    if not BRIDGE_SCRIPT.is_file():
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage bridge script is missing: {BRIDGE_SCRIPT}.",
            "managed-stage-bridge",
        )
    return str(Path(path).resolve())


def run_bridge(
    request: dict[str, Any],
    *,
    context: dict[str, Any],
    ledger: DecisionLedger,
) -> dict[str, Any]:
    payload = request_bytes(request)
    env = {
        key: os.environ[key]
        for key in ("SystemRoot", "WINDIR")
        if key in os.environ
    }
    process = subprocess.Popen(
        [resolved_node(context, ledger), str(BRIDGE_SCRIPT)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        env=env,
    )
    try:
        stdout, stderr = process.communicate(payload, timeout=TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as exc:
        process.kill()
        process.communicate()
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage bridge exceeded {TIMEOUT_SECONDS} seconds.",
            "managed-stage-bridge",
        )
        raise CompileBlocked("Managed-stage bridge timeout.") from exc
    _verify_streams(stdout, stderr, ledger)
    if process.returncode != 0:
        message = stderr.decode("utf-8", errors="replace").strip()
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage bridge internal failure {process.returncode}: {message}",
            "managed-stage-bridge",
        )
    return strict_json_object(stdout, ledger)


def strict_json_object(raw: bytes, ledger: DecisionLedger) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", errors="strict")
        decoder = json.JSONDecoder(
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_nonfinite,
        )
        value, end = decoder.raw_decode(text)
        if text[end:].strip():
            raise ValueError("extra trailing bridge output")
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage bridge returned invalid JSON: {exc}.",
            "managed-stage-bridge",
        )
    if not isinstance(value, dict):
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            "Managed-stage bridge result must be one JSON object.",
            "managed-stage-bridge",
        )
    return value


def _verify_streams(
    stdout: bytes,
    stderr: bytes,
    ledger: DecisionLedger,
) -> None:
    if len(stdout) > MAX_STDOUT_BYTES:
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage stdout exceeds {MAX_STDOUT_BYTES} bytes.",
            "managed-stage-bridge",
        )
    if len(stderr) > MAX_STDERR_BYTES:
        block(
            ledger,
            "MANAGED_STAGE_BRIDGE_CONTRACT_INVALID",
            f"Managed-stage stderr exceeds {MAX_STDERR_BYTES} bytes.",
            "managed-stage-bridge",
        )


def _reject_duplicate_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def _reject_nonfinite(value: str) -> Any:
    raise ValueError(f"non-finite JSON value {value!r}")


__all__ = [
    "BRIDGE_SCRIPT",
    "REQUEST_SCHEMA",
    "RESULT_SCHEMA",
    "request_bytes",
    "resolved_node",
    "run_bridge",
    "strict_json_object",
]
