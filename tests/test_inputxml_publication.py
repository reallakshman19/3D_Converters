import json
import os
import shutil
import tempfile
import unittest
import lxml.etree as ET
from pathlib import Path
from unittest import mock

from scripts.inputxml_compiler.xml import _xml_bytes, _sha256
from scripts.inputxml_compiler.publication import (
    CompilationView,
    PublicationPlan,
    build_publication_plan,
    publish_result_bundle,
)

class TestInputXMLPublication(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir)
        self.stem = "test-doc"
        
        self.canonical_root = ET.Element("root")
        self.ledger = {"mock": "ledger"}
        self.validation = {"mock": "validation", "status": "PASS"}
        
        self.view_pass = CompilationView(
            source_identity=self.stem,
            source_hash="abcd",
            dialect="mock-dialect",
            terminal_status="PASS",
            orchestration={},
            canonical_candidate=self.canonical_root,
            ledger=self.ledger,
            validation=self.validation,
        )
        
        self.view_blocked_with_candidate = CompilationView(
            source_identity=self.stem,
            source_hash="abcd",
            dialect="mock-dialect",
            terminal_status="BLOCKED",
            orchestration={},
            canonical_candidate=self.canonical_root,
            ledger=self.ledger,
            validation=dict(self.validation, status="BLOCKED"),
        )
        
        self.view_blocked_no_candidate = CompilationView(
            source_identity=self.stem,
            source_hash="abcd",
            dialect="mock-dialect",
            terminal_status="BLOCKED",
            orchestration={},
            canonical_candidate=None,
            ledger=self.ledger,
            validation=dict(self.validation, status="BLOCKED"),
        )

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_publication_plan_pass(self):
        plan = build_publication_plan(self.view_pass, self.output_dir)
        self.assertTrue(plan.has_canonical)
        self.assertEqual(plan.terminal_status, "PASS")
        self.assertEqual(plan.canonical_dest, self.output_dir / f"{self.stem}.canonical.input.xml")
        
        # Verify validation metadata has been injected with hashes
        val_payload = json.loads(plan.staged_validation_bytes.decode("utf-8"))
        self.assertEqual(val_payload["publication"]["state"], "COMMITTED")
        self.assertEqual(val_payload["publication"]["terminalStatus"], "PASS")
        self.assertTrue(val_payload["publication"]["canonicalCandidatePublished"])
        self.assertIn("canonical", val_payload["publication"]["files"])

    def test_pass_without_canonical_fails(self):
        bad_view = CompilationView(
            source_identity=self.stem,
            source_hash="abcd",
            dialect="mock-dialect",
            terminal_status="PASS",
            orchestration={},
            canonical_candidate=None,
            ledger=self.ledger,
            validation=self.validation,
        )
        with self.assertRaisesRegex(ValueError, "invariant failure"):
            publish_result_bundle(bad_view, self.output_dir)

    def test_stale_canonical_removal(self):
        # 1. Publish PASS (creates canonical)
        publish_result_bundle(self.view_pass, self.output_dir)
        self.assertTrue((self.output_dir / f"{self.stem}.canonical.input.xml").is_file())
        
        # 2. Publish BLOCKED with NO candidate
        publish_result_bundle(self.view_blocked_no_candidate, self.output_dir)
        
        # Canonical must be gone!
        self.assertFalse((self.output_dir / f"{self.stem}.canonical.input.xml").is_file())
        self.assertTrue((self.output_dir / f"{self.stem}.canonicalization-ledger.json").is_file())
        self.assertTrue((self.output_dir / f"{self.stem}.canonical-validation.json").is_file())
        
        val_payload = json.loads((self.output_dir / f"{self.stem}.canonical-validation.json").read_text())
        self.assertEqual(val_payload["status"], "BLOCKED")
        self.assertFalse(val_payload["publication"]["canonicalCandidatePublished"])
        self.assertNotIn("canonical", val_payload["publication"]["files"])

    def test_failure_injection_rollback(self):
        # Publish an old bundle first (unmocked)
        publish_result_bundle(self.view_pass, self.output_dir)
        
        original_canonical = (self.output_dir / f"{self.stem}.canonical.input.xml").read_bytes()
        original_ledger = (self.output_dir / f"{self.stem}.canonicalization-ledger.json").read_bytes()
        original_validation = (self.output_dir / f"{self.stem}.canonical-validation.json").read_bytes()
        
        # We will make os.replace fail when it tries to replace canonical (first replacement)
        # We must allow the 3 backup replacements to succeed, then fail on the 4th (commit step)
        
        call_count = 0
        def side_effect(src, dst):
            nonlocal call_count
            call_count += 1
            if call_count == 4: # First destination mutation
                raise OSError("Injected Failure!")
            os.rename(src, dst) # use rename for the successful ones to actually move
            
        with mock.patch("scripts.inputxml_compiler.publication.os.replace", side_effect=side_effect):
            with self.assertRaisesRegex(RuntimeError, "Publication transaction failed and rolled back"):
                publish_result_bundle(self.view_blocked_with_candidate, self.output_dir)
            
        # Verify old bundle is intact
        self.assertEqual((self.output_dir / f"{self.stem}.canonical.input.xml").read_bytes(), original_canonical)
        self.assertEqual((self.output_dir / f"{self.stem}.canonicalization-ledger.json").read_bytes(), original_ledger)
        self.assertEqual((self.output_dir / f"{self.stem}.canonical-validation.json").read_bytes(), original_validation)
        
        # Verify no staging junk left over
        for p in self.output_dir.iterdir():
            self.assertFalse(p.name.startswith(".staging"))
            self.assertFalse(p.name.startswith(".lock"))

    def test_concurrency_lock(self):
        # Acquire lock manually
        lock_path = self.output_dir / f".lock-{self.stem}"
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        try:
            with self.assertRaisesRegex(RuntimeError, "Concurrent publication blocked"):
                publish_result_bundle(self.view_pass, self.output_dir)
        finally:
            os.close(fd)
            lock_path.unlink()

    def test_exact_byte_hash_binding(self):
        publish_result_bundle(self.view_pass, self.output_dir)
        
        canonical_bytes = (self.output_dir / f"{self.stem}.canonical.input.xml").read_bytes()
        ledger_bytes = (self.output_dir / f"{self.stem}.canonicalization-ledger.json").read_bytes()
        val_payload = json.loads((self.output_dir / f"{self.stem}.canonical-validation.json").read_text())
        
        self.assertEqual(val_payload["publication"]["files"]["canonical"]["sha256"], _sha256(canonical_bytes))
        self.assertEqual(val_payload["publication"]["files"]["ledger"]["sha256"], _sha256(ledger_bytes))

if __name__ == "__main__":
    unittest.main()
