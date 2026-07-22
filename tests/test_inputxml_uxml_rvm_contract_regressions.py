from __future__ import annotations

import copy
import unittest

from scripts.inputxml_compiler.uxml_rvm_contracts import (
    ContractError, decode_source, semantic_hash, sha256_bytes, validate_coordinate_context,
)
from tests import test_inputxml_uxml_rvm_support as support


class UxmlRvmContractRegressionTests(unittest.TestCase):
    def test_direct_absent_topology_plan_uses_empty_semantic_hash(self):
        result = support.evaluate(support.fixture("direct-exact.json"))
        self.assertEqual(support.EMPTY_HASH, result["proof"]["topologyPlanHashSha256"])

    def test_nested_axis_decision_rejects_unknown_matrix_field(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        context = support.coordinate_context(source, kind)
        context["axisMap"]["targetX"]["matrixCoefficient"] = 1
        context["coordinateContextHashSha256"] = semantic_hash(context, "coordinateContextHashSha256")
        with self.assertRaises(ContractError) as caught:
            validate_coordinate_context(context, sha256_bytes(source), kind)
        self.assertEqual("UXML_RVM_AXIS_MAP", caught.exception.code)

    def test_contract_errors_support_normal_traceback_state(self):
        source = support.fixture("direct-exact.json")
        _, kind = decode_source(source)
        context = copy.deepcopy(support.coordinate_context(source, kind))
        context["sourceHashSha256"] = "0" * 64
        context["coordinateContextHashSha256"] = semantic_hash(context, "coordinateContextHashSha256")
        with self.assertRaises(ContractError) as caught:
            validate_coordinate_context(context, sha256_bytes(source), kind)
        self.assertEqual("UXML_RVM_COORDINATE_SOURCE_BINDING", caught.exception.code)
        error = ContractError("TEST", "traceback assignment")
        error.__traceback__ = None


if __name__ == "__main__":
    unittest.main()
