from __future__ import annotations

import base64
import subprocess
import unittest
from unittest.mock import patch

from scripts.inputxml_compiler.uxml_rvm import _run_bridge
from scripts.inputxml_compiler.uxml_rvm_contracts import (
    ContractError, MAX_STDOUT_BYTES, build_bridge_request, decode_source, semantic_hash,
    sha256_bytes, strict_json_loads, validate_coordinate_context,
)
from scripts.inputxml_compiler.uxml_rvm_inventory import verify_bridge_result
from tests import test_inputxml_uxml_rvm_support as s


def valid_request():
    source=s.fixture("direct-exact.json"); _,kind=decode_source(source); cc=s.coordinate_context(source,kind)
    _,ch=validate_coordinate_context(cc,sha256_bytes(source),kind); manifest=s.authority_manifest(source,kind,ch)
    return build_bridge_request(source,kind,ch,s.EMPTY_HASH,s.EMPTY_HASH,manifest["authorityManifestHashSha256"])

def code(fn):
    try: fn()
    except ContractError as exc: return exc.code
    raise AssertionError("expected ContractError")

class IntakeAndBridgeSecurityTests(unittest.TestCase):
    def test_61_duplicate_json_keys(self):
        self.assertEqual("UXML_RVM_DUPLICATE_JSON_KEY",code(lambda:strict_json_loads('{"a":1,"a":2}')))
    def test_62_invalid_utf8(self):
        from scripts.inputxml_compiler.uxml_rvm_contracts import decode_source
        self.assertEqual("UXML_RVM_INVALID_UTF8",code(lambda:decode_source(b'\xff')))
    def test_63_trailing_json(self):
        self.assertEqual("UXML_RVM_TRAILING_JSON",code(lambda:strict_json_loads('{}{}')))
    def test_64_trailing_bridge_stdout(self):
        request=valid_request(); completed=subprocess.CompletedProcess([],0,stdout=b'{}{}',stderr=b'')
        with patch('scripts.inputxml_compiler.uxml_rvm.shutil.which',return_value='/usr/bin/node'), patch('scripts.inputxml_compiler.uxml_rvm.subprocess.run',return_value=completed):
            self.assertEqual("UXML_RVM_TRAILING_JSON",code(lambda:_run_bridge(request)))
    def test_65_wrong_bridge_identity(self):
        request=valid_request(); result=s.run_bridge(request); result["bridgeImplementationIdentity"]="wrong"; result["resultHashSha256"]=semantic_hash(result,"resultHashSha256")
        self.assertEqual("UXML_RVM_BRIDGE_IDENTITY",code(lambda:verify_bridge_result(request,result)))
    def test_66_wrong_request_hash(self):
        request=valid_request(); request["requestHashSha256"]="0"*64
        self.assertEqual("UXML_RVM_BRIDGE_REQUEST_HASH",code(lambda:s.run_bridge(request)))
    def test_67_wrong_result_hash(self):
        request=valid_request(); result=s.run_bridge(request); result["resultHashSha256"]="0"*64
        self.assertEqual("UXML_RVM_BRIDGE_RESULT_HASH",code(lambda:verify_bridge_result(request,result)))
    def test_68_bridge_timeout(self):
        request=valid_request()
        with patch('scripts.inputxml_compiler.uxml_rvm.shutil.which',return_value='/usr/bin/node'), patch('scripts.inputxml_compiler.uxml_rvm.subprocess.run',side_effect=subprocess.TimeoutExpired(cmd='node',timeout=20)):
            self.assertEqual("UXML_RVM_BRIDGE_TIMEOUT",code(lambda:_run_bridge(request)))
    def test_69_bounded_output_overflow(self):
        request=valid_request(); completed=subprocess.CompletedProcess([],0,stdout=b'x'*(MAX_STDOUT_BYTES+1),stderr=b'')
        with patch('scripts.inputxml_compiler.uxml_rvm.shutil.which',return_value='/usr/bin/node'), patch('scripts.inputxml_compiler.uxml_rvm.subprocess.run',return_value=completed):
            self.assertEqual("UXML_RVM_BRIDGE_OUTPUT_LIMIT",code(lambda:_run_bridge(request)))
    def test_70_unpaired_unicode_surrogate(self):
        self.assertEqual("UXML_RVM_UNPAIRED_SURROGATE",code(lambda:strict_json_loads('"\\ud800"')))
    def test_71_source_mutated_between_request_and_verification(self):
        request=valid_request(); source=base64.b64decode(request["sourceBase64"]); changed=bytearray(source); changed[-2]=changed[-2]^1
        request["sourceBase64"]=base64.b64encode(bytes(changed)).decode('ascii'); request["requestHashSha256"]=semantic_hash(request,"requestHashSha256")
        self.assertEqual("UXML_RVM_SOURCE_HASH",code(lambda:s.run_bridge(request)))

if __name__=='__main__': unittest.main()
