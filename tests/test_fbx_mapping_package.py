import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class FbxMappingPackageStaticTests(unittest.TestCase):
    def read(self, relative):
        return (ROOT / relative).read_text(encoding="utf-8")

    def test_schema_is_closed_and_versioned(self):
        schema = json.loads(self.read("contracts/fbx/fbx-mapping-package.v1.schema.json"))
        self.assertEqual(schema["$id"], "FbxMappingPackage.v1")
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(
            set(schema["required"]),
            {"schema", "packageId", "source", "parser", "sourceGraph", "mapping"},
        )
        self.assertEqual(schema["$defs"]["sha256"]["pattern"], "^[0-9a-f]{64}$")

    def test_runtime_contains_distinct_binding_statuses(self):
        source = self.read("tabs/model-converters/converters/fbx/conversion.js")
        package_source = self.read("tabs/model-converters/converters/fbx/mapping-package.js")
        combined = source + package_source
        for status in (
            "BLOCKED_SOURCE_BINDING",
            "BLOCKED_PARSER_BINDING",
            "BLOCKED_SOURCE_GRAPH_BINDING",
            "BLOCKED_MAPPING_BINDING",
            "BLOCKED_MAPPING",
            "STAGEDJSON_PASS",
        ):
            self.assertIn(status, combined)

    def test_package_hashes_reuse_canonical_json(self):
        source = self.read("tabs/model-converters/converters/fbx/mapping-package.js")
        self.assertIn("import { canonicalJson }", source)
        self.assertRegex(source, r"sha256Hex\(canonicalJson\(value\)\)")
        self.assertNotRegex(source, r"JSON\.stringify\([^)]*mapping")

    def test_operator_description_lists_all_families(self):
        registry = self.read("tabs/model-converters/converter-registry.js")
        block = registry[registry.index("fbx_to_stagedjson:"):]
        block = block[:block.index("},")]
        for family in ("PIPE", "ELBOW", "TEE", "REDUCER", "FLANGE", "VALVE"):
            self.assertIn(family, block)
        self.assertNotIn("two-port PIPE occurrences", block)

    def test_run_all_contains_package_proofs(self):
        runner = self.read("tests/fbx/run-all.mjs")
        for name in (
            "test-mapping-package.mjs",
            "test-fbx-mapping-package.mjs",
            "test-mapping-package-static.mjs",
        ):
            self.assertIn(name, runner)

    def test_new_sources_stay_within_size_policy(self):
        paths = [
            "tabs/model-converters/converters/fbx/sha256.js",
            "tabs/model-converters/converters/fbx/parser-provenance.js",
            "tabs/model-converters/converters/fbx/mapping-package.js",
            "tabs/model-converters/converters/fbx/binding-report.js",
            "scripts/fbx/build-mapping-package.mjs",
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertLessEqual(len(self.read(path).splitlines()), 300)


if __name__ == "__main__":
    unittest.main()
