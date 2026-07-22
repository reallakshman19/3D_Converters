"""Bounded subprocess execution for the UXML/RVM bridge."""
from __future__ import annotations

import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Mapping, Sequence


@dataclass(frozen=True)
class BoundedProcessResult:
    returncode: int
    stdout: bytes
    stderr: bytes


class BoundedProcessError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def run_bounded_process(
    command: Sequence[str],
    *,
    input_bytes: bytes,
    env: Mapping[str, str],
    timeout_seconds: float,
    stdout_limit: int,
    stderr_limit: int,
) -> BoundedProcessResult:
    process = subprocess.Popen(
        list(command),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=dict(env),
    )
    stdout = bytearray()
    stderr = bytearray()
    overflow: list[str] = []
    lock = threading.Lock()

    def reader(stream, sink: bytearray, limit: int, code: str) -> None:
        while True:
            chunk = stream.read(65536)
            if not chunk:
                return
            with lock:
                if len(sink) + len(chunk) > limit:
                    overflow.append(code)
                    return
                sink.extend(chunk)

    def writer() -> None:
        try:
            assert process.stdin is not None
            process.stdin.write(input_bytes)
            process.stdin.close()
        except (BrokenPipeError, OSError):
            return

    threads = [
        threading.Thread(target=reader, args=(process.stdout, stdout, stdout_limit, "STDOUT"), daemon=True),
        threading.Thread(target=reader, args=(process.stderr, stderr, stderr_limit, "STDERR"), daemon=True),
        threading.Thread(target=writer, daemon=True),
    ]
    for thread in threads:
        thread.start()
    deadline = time.monotonic() + timeout_seconds
    while process.poll() is None:
        if overflow:
            process.kill()
            break
        if time.monotonic() >= deadline:
            process.kill()
            process.wait()
            raise BoundedProcessError("TIMEOUT", "Bridge exceeded its hard timeout")
        time.sleep(0.01)
    process.wait()
    for thread in threads:
        thread.join(timeout=1)
    for stream in (process.stdout, process.stderr):
        if stream is not None:
            stream.close()
    if overflow:
        raise BoundedProcessError("OUTPUT_LIMIT", f"Bridge exceeded bounded {overflow[0].lower()}")
    return BoundedProcessResult(process.returncode, bytes(stdout), bytes(stderr))
