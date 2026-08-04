from __future__ import annotations
import base64
import json
import os
import subprocess
import sys
import unittest
from unittest.mock import patch
from scripts.inputxml_compiler.uxml_rvm import _run_bridge
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    ContractError, build_bridge_request, decode_source, semantic_hash,
    sha256_bytes, strict_json_loads, validate_canonical_metadata,
    validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_inventory import verify_bridge_result
from scripts.inputxml_compiler.uxml_rvm_process import BoundedProcessError, run_bounded_process
from tests import test_inputxml_uxml_rvm_support as s

def valid_request(source: bytes | None = None):
    source = source or s.fixture("direct-exact.json"); _, kind = decode_source(source)
    cc = s.coordinate_context(source, kind); _, ch = validate_coordinate_context(cc, sha256_bytes(source), kind)
    metadata = s.canonical_metadata(source, kind); _, mh = validate_canonical_metadata(metadata, sha256_bytes(source), kind)
    manifest = s.authority_manifest(source, kind, ch, metadata_hash=mh)
    return build_bridge_request(source, kind, ch, s.EMPTY_HASH, s.EMPTY_HASH, manifest["authorityManifestHashSha256"], mh)

def code(fn):
    try: fn()
    except ContractError as exc: return exc.code
    raise AssertionError("expected ContractError")

class IntakeAndBridgeSecurityTests(unittest.TestCase):
    def test_61_duplicate_json_keys(self):
        self.assertEqual("UXML_RVM_DUPLICATE_JSON_KEY", code(lambda: strict_json_loads('{"a":1,"a":2}')))
    def test_62_invalid_utf8(self):
        self.assertEqual("UXML_RVM_INVALID_UTF8", code(lambda: decode_source(b'\xff')))
    def test_63_trailing_json(self):
        self.assertEqual("UXML_RVM_TRAILING_JSON", code(lambda: strict_json_loads('{}{}')))
    def test_64_trailing_bridge_stdout(self):
        request = valid_request(); completed = type("R", (), {"returncode":0,"stdout":b'{}{}',"stderr":b''})()
        with patch('scripts.inputxml_compiler.uxml_rvm.shutil.which', return_value='/usr/bin/node'), patch('scripts.inputxml_compiler.uxml_rvm.run_bounded_process', return_value=completed):
            self.assertEqual("UXML_RVM_TRAILING_JSON", code(lambda: _run_bridge(request)))
    def test_65_wrong_bridge_identity(self):
        request = valid_request(); result = s.run_bridge(request); result["bridgeImplementationIdentity"] = "wrong"; result["resultHashSha256"] = semantic_hash(result, "resultHashSha256")
        self.assertEqual("UXML_RVM_BRIDGE_IDENTITY", code(lambda: verify_bridge_result(request, result)))
    def test_66_wrong_request_hash(self):
        request = valid_request(); request["requestHashSha256"] = "0" * 64
        with self.assertRaises(RuntimeError) as caught: s.run_bridge(request)
        self.assertIn("UXML_RVM_BRIDGE_REQUEST_HASH", str(caught.exception))
    def test_67_wrong_result_hash(self):
        request = valid_request(); result = s.run_bridge(request); result["resultHashSha256"] = "0" * 64
        self.assertEqual("UXML_RVM_BRIDGE_RESULT_HASH", code(lambda: verify_bridge_result(request, result)))
    def test_68_bridge_timeout(self):
        request = valid_request()
        with patch('scripts.inputxml_compiler.uxml_rvm.shutil.which', return_value='/usr/bin/node'), patch('scripts.inputxml_compiler.uxml_rvm.run_bounded_process', side_effect=BoundedProcessError('TIMEOUT','timeout')):
            self.assertEqual("UXML_RVM_BRIDGE_TIMEOUT", code(lambda: _run_bridge(request)))
    def test_69_real_output_overflow_terminates_child(self):
        with self.assertRaises(BoundedProcessError) as caught:
            run_bounded_process([sys.executable, '-c', 'import sys;sys.stdout.write("x"*200000)'], input_bytes=b'', env=os.environ, timeout_seconds=5, stdout_limit=1024, stderr_limit=1024)
        self.assertEqual("OUTPUT_LIMIT", caught.exception.code)
    def test_70_unpaired_unicode_surrogate(self):
        self.assertEqual("UXML_RVM_UNPAIRED_SURROGATE", code(lambda: strict_json_loads('"\\ud800"')))
    def test_71_source_mutated_between_request_and_verification(self):
        request = valid_request(); source = base64.b64decode(request["sourceBase64"]); changed = bytearray(source); changed[-2] ^= 1
        request["sourceBase64"] = base64.b64encode(bytes(changed)).decode('ascii'); request["requestHashSha256"] = semantic_hash(request, "requestHashSha256")
        with self.assertRaises(RuntimeError) as caught: s.run_bridge(request)
        self.assertIn("UXML_RVM_SOURCE_HASH", str(caught.exception))
    def test_prototype_keys_are_preserved_as_own_data(self):
        document = json.loads(s.fixture("direct-exact.json")); document["metadata"]["__proto__"] = {"polluted": True}; document["metadata"]["constructor"] = "data"; document["metadata"]["prototype"] = "data"
        source = s.json_source(document); request = valid_request(source); result = s.run_bridge(request)
        self.assertEqual({"polluted": True}, result["uxml"]["metadata"]["__proto__"])
    def test_unsafe_integer_rejected_before_bridge(self):
        self.assertEqual("UXML_RVM_UNSAFE_INTEGER", code(lambda: strict_json_loads('9007199254740992')))
    def test_high_precision_decimal_rejected_before_bridge(self):
        self.assertEqual("UXML_RVM_PRECISION_LOSS", code(lambda: strict_json_loads('0.1234567890123456789')))
    def test_non_bmp_key_order_is_cross_language_stable(self):
        document = json.loads(s.fixture("direct-exact.json")); document["metadata"] = {"😀": 1, "": 2}
        source = s.json_source(document); request = valid_request(source)
        self.assertEqual(s.run_bridge(request), s.run_bridge(request))

if __name__ == '__main__': unittest.main()
