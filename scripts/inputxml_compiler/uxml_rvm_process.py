"""Bounded streaming subprocess execution for the UXML/RVM Node bridge."""
from __future__ import annotations

import os
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence

from .uxml_rvm_common import fail


@dataclass(frozen=True)
class BoundedProcessResult:
    returncode: int
    stdout: bytes
    stderr: bytes


def _terminate(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        try:
            process.kill()
        except ProcessLookupError:
            pass


def run_bounded_process(
    command: Sequence[str], *, input_bytes: bytes, cwd: Path | None,
    env: Mapping[str, str], timeout_seconds: float,
    stdout_limit: int, stderr_limit: int,
) -> BoundedProcessResult:
    process = subprocess.Popen(
        list(command), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        cwd=str(cwd) if cwd else None, env=dict(env), close_fds=True,
        start_new_session=(os.name != "nt"),
    )
    assert process.stdin is not None and process.stdout is not None and process.stderr is not None
    stdout = bytearray(); stderr = bytearray()
    overflow = threading.Event()
    overflow_label: list[str] = []

    def reader(pipe, target: bytearray, limit: int, label: str) -> None:
        while True:
            chunk = pipe.read(65536)
            if not chunk:
                return
            remaining = max(0, limit + 1 - len(target))
            target.extend(chunk[:remaining])
            if len(target) > limit:
                if not overflow.is_set():
                    overflow_label.append(label)
                overflow.set(); _terminate(process)
                return

    threads = [
        threading.Thread(target=reader, args=(process.stdout, stdout, stdout_limit, "stdout"), daemon=True),
        threading.Thread(target=reader, args=(process.stderr, stderr, stderr_limit, "stderr"), daemon=True),
    ]
    for thread in threads:
        thread.start()
    try:
        process.stdin.write(input_bytes)
        process.stdin.close()
        deadline = time.monotonic() + timeout_seconds
        while process.poll() is None:
            if overflow.is_set():
                _terminate(process); break
            if time.monotonic() >= deadline:
                _terminate(process)
                process.wait(timeout=2)
                fail("UXML_RVM_BRIDGE_TIMEOUT", "UXML/RVM bridge exceeded its hard timeout")
            time.sleep(0.005)
        process.wait(timeout=2)
    finally:
        try:
            process.stdin.close()
        except OSError:
            pass
        for thread in threads:
            thread.join(timeout=2)
        for pipe in (process.stdout, process.stderr):
            try:
                pipe.close()
            except OSError:
                pass
        _terminate(process)
    if overflow.is_set():
        label = overflow_label[0] if overflow_label else "output"
        fail("UXML_RVM_BRIDGE_OUTPUT_LIMIT", f"UXML/RVM bridge exceeded bounded {label}")
    return BoundedProcessResult(process.returncode, bytes(stdout), bytes(stderr))
