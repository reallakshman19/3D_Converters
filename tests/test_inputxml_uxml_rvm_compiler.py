from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path

from scripts.inputxml_compiler.uxml_rvm_contracts import (
    decode_source, sha256_bytes, validate_coordinate_context,
)
from tests import test_inputxml_uxml_rvm_support as support

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "inputxml_canonical_compiler.py"
CONTRACTS = ROOT / "contracts" / "inputxml" / "v1"


def load_compiler():
    spec = importlib.util.spec_from_file_location("inputxml_uxml_rvm_compiler_test", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def context_for(source: bytes, *, plan=None):
    _, kind = decode_source(source)
    coordinate = support.coordinate_context(source, kind)
    _, coordinate_hash = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
    topology_hash = plan["topologyPlanHashSha256"] if plan else support.EMPTY_HASH
    manifest = support.authority_manifest(source, kind, coordinate_hash, topology_hash)
    return {
        "version": "11.00",
        "north": [0, 1, 0],
        "uxmlRvmCoordinateContext": coordinate,
        "uxmlRvmExactTopologyPlan": plan,
        "uxmlRvmAuthorityManifest": manifest,
        "uxmlRvmApprovedAuthorityManifestHashSha256": manifest["authorityManifestHashSha256"],
    }


@unittest.skipUnless(MODULE_PATH.is_file() and CONTRACTS.is_dir(), "full repository compiler checkout required")
class UxmlRvmCompilerIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compiler = load_compiler()

    def compile(self, source: bytes, context: dict):
        return self.compiler.compile_document(
            source,
            source_name="uxml-rvm.json",
            source_repository="reallaksh19/3D_Converters",
            source_path="test://uxml-rvm.json",
            producer="uxml-rvm-pr9-test",
            registry_path=CONTRACTS / "inputxml-dialect-registry.json",
            adapter_registry_path=CONTRACTS / "compiler" / "inputxml-compiler-adapters.json",
            alias_registry_path=CONTRACTS / "catalogs" / "inputxml-alias-registry.json",
            canonical_xsd_path=CONTRACTS / "inputxml-canonical-v1.xsd",
            categorized_xsd_path=CONTRACTS / "categorized-inputxml-v3.xsd",
            semantic_rules_path=CONTRACTS / "inputxml-semantic-rules-v1.sch",
            dialect_override="uxml-rvm-intake",
            context=context,
        )

    def test_direct_exact_fixture_passes_full_compiler_chain(self):
        source = support.fixture("direct-exact.json")
        root, ledger, validation = self.compile(source, context_for(source))
        self.assertIsNotNone(root)
        self.assertEqual("PASS", validation["status"])
        self.assertEqual("PASS", ledger["status"])
        self.assertEqual(2, len(root.findall("PIPINGMODEL/PIPINGELEMENT")))
        proofs = [row for row in ledger["records"] if row["sourceType"] == "INPUTXML_UXML_RVM_SOURCE_ACCOUNTING_PROOF"]
        self.assertEqual(1, len(proofs))
        self.assertTrue(all(value == 0 for value in proofs[0]["sourceFields"]["invariants"].values()))

    def test_coordinate_only_direct_source_blocks_full_compiler_chain(self):
        document = json.loads(support.fixture("direct-exact.json"))
        document["topologyHints"] = []
        source = support.json_source(document)
        root, ledger, validation = self.compile(source, context_for(source))
        self.assertIsNone(root)
        self.assertEqual("BLOCKED", validation["status"])
        self.assertIn("UXML_RVM_PORT_ACCOUNTING", {row["code"] for row in validation["diagnostics"]})
        self.assertEqual("BLOCKED", ledger["status"])

    def test_rvm_rows_with_exact_plan_pass_full_compiler_chain(self):
        source = support.fixture("rvm-rows.json")
        _, kind = decode_source(source)
        coordinate = support.coordinate_context(source, kind)
        _, coordinate_hash = validate_coordinate_context(coordinate, sha256_bytes(source), kind)
        plan = support.topology_plan(source, support.discover(source, coordinate_hash))
        root, ledger, validation = self.compile(source, context_for(source, plan=plan))
        self.assertIsNotNone(root)
        self.assertEqual("PASS", validation["status"])
        self.assertEqual("PASS", ledger["status"])
        self.assertEqual(2, len(root.findall("PIPINGMODEL/PIPINGELEMENT")))


if __name__ == "__main__":
    unittest.main()
