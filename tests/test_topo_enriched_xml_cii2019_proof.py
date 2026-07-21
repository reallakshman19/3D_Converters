from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "converters" / "scripts"
FIXTURES = ROOT / "tests" / "fixtures" / "topo-enriched-xml" / "cii2019-proof"
CONTRACTS = ROOT / "contracts" / "topo-enriched-xml" / "cii2019-proof"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


proof = load_module("te014_proof_test", SCRIPTS / "topo_enriched_xml_cii2019_proof.py")
from scripts.inputxml_compiler.psi116_adapter import _build_element, build_segments
from scripts.inputxml_compiler.psi116_common import load_projection_policy
from scripts.inputxml_compiler.psi116_intake import Psi116Branch, Psi116Intake, Psi116Node, Psi116Restraint


def production_result(writer: str) -> dict:
    completed = subprocess.run(
        ["node", str(FIXTURES / "generate-production-result.mjs"), writer],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return json.loads(completed.stdout)


class TopoEnrichedXmlCii2019ProofTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.canonical_result = production_result("CANONICAL")
        cls.sequential_result = production_result("SEQUENTIAL")
        cls.result_schema = json.loads(
            (CONTRACTS / "topo-enriched-xml-cii-proof-result.v1.schema.json").read_text()
        )
        cls.ledger_schema = json.loads(
            (CONTRACTS / "topo-enriched-xml-cii-projection-ledger.v1.schema.json").read_text()
        )

    def test_canonical_selected_bundle_reaches_reparsed_cii(self):
        result = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        self.assertEqual("PASS", result["status"], result["diagnostics"])
        self.assertEqual("PASS", result["reparseEvidence"]["status"])
        self.assertTrue(result["acceptedCiiBytes"])
        self.assertEqual([], result["lossAccounting"]["unexplained"])
        self.assertEqual(0, result["nodeNumberMismatches"])
        self.assertEqual(0, result["unaccountedOccurrences"])
        jsonschema.Draft202012Validator(self.result_schema).validate(result)
        jsonschema.Draft202012Validator(self.ledger_schema).validate(result["projectionLedger"])
        self.assertEqual([], proof.validate_projection_ledger(result["projectionLedger"]))
        accounting = result["evidence"]["compilerValidation"]["resolverOutcome"]["profileMetrics"]["sourceAccounting"]
        self.assertEqual("COMPLETE", accounting["status"])
        self.assertEqual(accounting["expectedSourceEntityCount"], accounting["accountedSourceEntityCount"])

    def test_source_sequential_selected_bundle_reaches_reparsed_cii(self):
        result = proof.prove_topo_enriched_xml_to_cii2019(self.sequential_result)
        self.assertEqual("PASS", result["status"], result["diagnostics"])
        self.assertEqual("SOURCE_SEQUENTIAL", result["evidence"]["te013Boundary"]["projectionKind"])
        self.assertEqual(0, result["projectionLedger"]["summary"]["nodeNumberMismatchCount"])

    def test_identical_input_is_byte_deterministic(self):
        left = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        right = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        self.assertEqual(proof.serialize_proof_result(left), proof.serialize_proof_result(right))
        self.assertEqual(left["acceptedCiiBytes"], right["acceptedCiiBytes"])

    def test_exact_source_and_canonical_hash_binding(self):
        result = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        chain = result["projectionLedger"]["chain"]
        self.assertEqual(self.canonical_result["productionResultHash"], chain["te013ProductionResultHash"])
        self.assertEqual(self.canonical_result["productionBundle"]["xmlHash"], chain["selectedXmlHash"])
        self.assertEqual(chain["selectedXmlHash"].removeprefix("sha256:"), chain["psiSourceHashSha256"])
        self.assertEqual(result["canonicalHashSha256"], chain["canonicalHashSha256"])
        self.assertEqual(
            result["acceptedCiiArtifact"]["ciiHashSha256"], chain["ciiHashSha256"]
        )

    def test_occurrence_accounting_is_complete(self):
        result = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        summary = result["projectionLedger"]["summary"]
        self.assertEqual(3, summary["emittedOccurrenceCount"])
        self.assertEqual(1, summary["reservedOccurrenceCount"])
        self.assertEqual(1, summary["projectedOccurrenceCount"])
        self.assertEqual(2, summary["intentionallyOmittedOccurrenceCount"])
        self.assertEqual(0, summary["blockedOccurrenceCount"])
        self.assertEqual(0, summary["unaccountedOccurrenceCount"])

    def test_reparse_operates_through_saved_read_bytes(self):
        result = proof.prove_topo_enriched_xml_to_cii2019(self.canonical_result)
        reparse = result["reparseEvidence"]
        self.assertEqual("PASS", reparse["savedReadBoundary"])
        self.assertEqual(
            result["acceptedCiiArtifact"]["ciiHashSha256"], reparse["ciiHashSha256"]
        )

    def test_bend_rigid_and_restraint_mapping_policy(self):
        restraint = Psi116Restraint("/r", "ANC", "0", "1000", "0")
        def node(index, number, kind, endpoint, rigid, x, restraints=()):
            return Psi116Node(
                source_path=f"/n{index}", branch_index=0, node_index=index,
                node_number=number, node_name=f"N{number}", endpoint=endpoint,
                component_type=kind, rigid=rigid, weight="12.5",
                component_ref_no=f"R{number}", connection_type="",
                outside_diameter="114.3", wall_thickness="6.02",
                corrosion_allowance="1.5", insulation_thickness="0",
                position=(Decimal(str(x)), Decimal("0"), Decimal("0")),
                bend_radius="152.4", bend_type=0 if kind == "ELBO" else None,
                alpha_angle=None, sif="0", restraints=tuple(restraints),
                evidence_fields=(),
                trace={"occurrenceId": f"O{number}", "logicalNodeId": f"L{number}",
                       "engineeringNodeNumber": number, "sourceEntityId": f"S{number}",
                       "componentProjectionId": f"P{number}", "psiComponentType": kind,
                       "endpoint": endpoint, "branchName": "L1", "branchIndex": 0,
                       "nodeIndexInBranch": index},
            )
        nodes = (
            node(0, 10, "PIPE", 0, 0, 0),
            node(1, 20, "ELBO", 0, None, 100, (restraint,)),
            node(2, 30, "VALV", 1, 2, 200),
        )
        branch = Psi116Branch("/b", 0, "L1", tuple(["0"] * 9), tuple(["0"] * 9), 106, "0", "0", nodes)
        intake = Psi116Intake("Psi116StrictIntake.v1", "pipesstressexport-psi116-xml", "h", "p", "2026/07/21 01:15:00", "JOB", "/P", "No", "21", (), (branch,), ("O10", "O20", "O30"), (), {})
        policy, _ = load_projection_policy()
        segments = build_segments(intake)
        bend = _build_element(segments[0], policy)
        rigid = _build_element(segments[1], policy)
        self.assertEqual("152.4", bend.find("BEND").get("RADIUS"))
        self.assertEqual("1", bend.find("RESTRAINT").get("TYPE"))
        self.assertEqual("12.5", rigid.find("RIGID").get("WEIGHT"))


if __name__ == "__main__":
    unittest.main()
