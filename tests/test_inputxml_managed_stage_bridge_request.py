import json
import shutil
import subprocess
import unittest
from pathlib import Path

from tests.managed_stage_test_support import build_intake

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "scripts/inputxml_compiler/node_managed_stage_bridge.mjs"


class ManagedStageBridgeRequestTests(unittest.TestCase):
    def test_duplicate_top_level_request_keys_are_rejected_before_construction(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        intake, _ = build_intake()
        request = intake.bridge_request()
        for field in ("profileId", "adapterId", "sourceHashSha256", "sourceContext"):
            with self.subTest(field=field):
                raw = self.duplicate_field_json(request, field)
                completed = subprocess.run(
                    [node, str(BRIDGE)],
                    input=raw.encode("utf-8"),
                    capture_output=True,
                    check=False,
                )
                self.assertNotEqual(0, completed.returncode)
                self.assertIn(
                    f'duplicate JSON key "{field}"',
                    completed.stderr.decode("utf-8", errors="replace"),
                )
                self.assertEqual(b"", completed.stdout)

    def test_nested_duplicate_context_key_is_rejected(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        intake, _ = build_intake()
        request = intake.bridge_request()
        context = request["sourceContext"]
        context_pairs = [
            json.dumps("version") + ":" + json.dumps(context["version"]),
            json.dumps("version") + ":" + json.dumps(context["version"]),
            *[
                json.dumps(key) + ":" + json.dumps(value, separators=(",", ":"))
                for key, value in context.items()
                if key != "version"
            ],
        ]
        raw = self.replace_field_json(request, "sourceContext", "{" + ",".join(context_pairs) + "}")
        completed = subprocess.run(
            [node, str(BRIDGE)],
            input=raw.encode("utf-8"),
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(0, completed.returncode)
        self.assertIn('duplicate JSON key "version"', completed.stderr.decode("utf-8"))

    @staticmethod
    def duplicate_field_json(request, field):
        pairs = []
        for key, value in request.items():
            encoded = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
            pairs.append(json.dumps(key) + ":" + encoded)
            if key == field:
                pairs.append(json.dumps(key) + ":" + encoded)
        return "{" + ",".join(pairs) + "}"

    @staticmethod
    def replace_field_json(request, field, replacement):
        pairs = []
        for key, value in request.items():
            encoded = replacement if key == field else json.dumps(
                value,
                separators=(",", ":"),
                ensure_ascii=False,
            )
            pairs.append(json.dumps(key) + ":" + encoded)
        return "{" + ",".join(pairs) + "}"


if __name__ == "__main__":
    unittest.main()
