import json
import subprocess
import unittest
from copy import deepcopy
from pathlib import Path

from scripts.inputxml_compiler.base import CompileBlocked, DecisionLedger
from scripts.inputxml_compiler import topology_bridge

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "scripts" / "inputxml_compiler" / "node_xml_builder_bridge.cjs"


def node(path, number, position):
    return {
        "sourcePath": path,
        "sequence": number,
        "nodeNumber": number,
        "nodeNumberLexical": str(number),
        "position": [str(value) for value in position],
        "fields": {"ComponentType": "PIPE", "ComponentRefNo": f"C-{number}"},
        "fieldPaths": {"ComponentType": f"{path}/ComponentType[1]"},
        "restraints": [],
    }


def request():
    branch = "/Root[1]/Branch[1]"
    return {
        "schema": "InputXmlTopologyBridgeRequest.v1",
        "profileId": "xml-builder-root-branch-node",
        "adapterId": "xml-cii-node-to-canonical",
        "sourceHashSha256": "a" * 64,
        "sourceDocumentIdentity": {
            "rootPath": "/Root[1]",
            "profileId": "xml-builder-root-branch-node",
            "producer": "",
            "sourceIdentity": "",
        },
        "context": {"version": "11.00", "jobName": "T", "north": [0, 1, 0]},
        "branches": [
            {
                "sourcePath": branch,
                "sequence": 1,
                "lineIdentity": "L1",
                "fields": {},
                "fieldPaths": {},
                "nodes": [
                    node(f"{branch}/Node[1]", 10, [0, 0, 0]),
                    node(f"{branch}/Node[2]", 20, [1000, 0, 0]),
                ],
            }
        ],
        "sourceInventorySummary": {
            "inventoryCount": 20,
            "elementCount": 20,
            "attributeCount": 0,
            "duplicateInventoryIdentityCount": 0,
        },
        "engineOptions": {
            "adjacencyAuthority": "DIRECT_NODE_CHILD_ORDER_REGISTERED_PRODUCER_V1",
            "coordinateCoalescing": False,
            "shortFillers": False,
            "rayFillers": False,
            "secondPassFillers": False,
            "midspanSplits": False,
            "syntheticNodes": False,
        },
    }


def valid_result(value):
    completed = subprocess.run(
        ["node", str(BRIDGE)],
        input=json.dumps(value, sort_keys=True, separators=(",", ":")).encode(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return json.loads(completed.stdout)


class TopologyBridgeContractTests(unittest.TestCase):
    def setUp(self):
        self.request = request()
        self.result = valid_result(self.request)
        self.ledger = DecisionLedger("repo", "path", "producer", self.request["profileId"])

    def assert_blocked(self, code, result):
        with self.assertRaises(CompileBlocked):
            topology_bridge._verify_result(self.request, result, self.ledger)
        self.assertTrue(
            any(row["code"] == code for row in self.ledger.diagnostics),
            self.ledger.diagnostics,
        )

    def test_valid_result_is_accepted(self):
        topology_bridge._verify_result(self.request, self.result, self.ledger)
        self.assertFalse(self.ledger.blocked)

    def test_source_hash_tamper_blocks(self):
        result = deepcopy(self.result)
        result["sourceHashSha256"] = "b" * 64
        self.assert_blocked("BRIDGE_SOURCE_HASH_MISMATCH", result)

    def test_profile_tamper_blocks(self):
        result = deepcopy(self.result)
        result["profileId"] = "seljson-custom-root"
        self.assert_blocked("BRIDGE_CONTRACT_INVALID", result)

    def test_missing_node_mapping_blocks(self):
        result = deepcopy(self.result)
        result["nodeMappings"].pop()
        self.assert_blocked("BRIDGE_MAPPING_INCOMPLETE", result)

    def test_duplicate_element_mapping_blocks(self):
        result = deepcopy(self.result)
        result["elementMappings"].append(deepcopy(result["elementMappings"][0]))
        self.assert_blocked("BRIDGE_MAPPING_INCOMPLETE", result)

    def test_topology_hash_tamper_blocks(self):
        result = deepcopy(self.result)
        result["topologyProof"]["topologyHashSha256"] = "0" * 64
        self.assert_blocked("BRIDGE_MAPPING_INCOMPLETE", result)

    def test_nonzero_synthetic_metric_blocks(self):
        result = deepcopy(self.result)
        result["metrics"]["syntheticNodeCount"] = 1
        self.assert_blocked("SYNTHETIC_NODE_PROHIBITED", result)

    def test_duplicate_json_key_is_rejected(self):
        raw = b'{"schema":"x","schema":"y"}'
        with self.assertRaises(CompileBlocked):
            topology_bridge._strict_json_object(raw, self.ledger)
        self.assertTrue(
            any(row["code"] == "BRIDGE_CONTRACT_INVALID" for row in self.ledger.diagnostics)
        )

    def test_trailing_bridge_output_is_rejected(self):
        raw = json.dumps(self.result).encode() + b"\ntrailing"
        with self.assertRaises(CompileBlocked):
            topology_bridge._strict_json_object(raw, self.ledger)
        self.assertTrue(
            any(row["code"] == "BRIDGE_CONTRACT_INVALID" for row in self.ledger.diagnostics)
        )


if __name__ == "__main__":
    unittest.main()
