#!/usr/bin/env python3
"""Verify byte-level Stage 1 package integrity and path allowlist."""
import hashlib, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent
manifest_path = root / "MANIFEST.json"
receipt = (root / "MANIFEST.sha256").read_text(encoding="ascii").strip().split()[0]
actual = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
assert actual == receipt, f"Manifest receipt mismatch: {actual} != {receipt}"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
expected = {"MANIFEST.json", "MANIFEST.sha256", "verify_package.py"}
for e in manifest["files"]:
    p = e["archive_path"]
    assert not p.startswith("/") and not any(x in ("", ".", "..") for x in p.split("/")), p
    expected.add(p)
    data = (root / p).read_bytes()
    assert len(data) == e["size"], f"size mismatch: {p}"
    assert hashlib.sha256(data).hexdigest() == e["sha256"], f"hash mismatch: {p}"
for p in root.rglob("*"):
    if p.is_file():
        rel = p.relative_to(root).as_posix()
        assert rel in expected, f"Unexpected file: {rel}"
assert not any((root / p).is_symlink() for p in expected)
print(f"PASS: {len(manifest['files'])} hashed manifest entries + receipt, no extra files")
