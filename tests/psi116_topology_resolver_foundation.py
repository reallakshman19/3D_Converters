#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from converters.psi116_topology_resolver import ResolverConfig, resolve_psi116, write_sidecars


SYNTHETIC_XML = '''<?xml version="1.0"?>
<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">
  <Pipe><Branch><Branchname>/A</Branchname>
    <Node><NodeNumber>10</NodeNumber><Endpoint>0</Endpoint><Rigid>2</Rigid><ComponentType>PIPE</ComponentType><Position>0 0 0</Position></Node>
    <Node><NodeNumber>20</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>ELBO</ComponentType><ComponentRefNo>=E1</ComponentRefNo><Position>0 0 0</Position><BendRadius>305</BendRadius></Node>
    <Node><NodeNumber>30</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>5 0 0</Position></Node>
    <Node><NodeNumber>40</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>100 0 0</Position></Node>
  </Branch></Pipe>
  <Pipe><Branch><Branchname>/B</Branchname>
    <Node><NodeNumber>50</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>REDU</ComponentType><ComponentRefNo>=R1</ComponentRefNo><Position>0 0 0</Position><AlphaAngle>10</AlphaAngle></Node>
    <Node><NodeNumber>60</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>100 0 0</Position></Node>
  </Branch></Pipe>
  <Pipe><Branch><Branchname>/C</Branchname>
    <Node><NodeNumber>70</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>0 100 0</Position></Node>
    <Node><NodeNumber>80</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>5 100 0</Position></Node>
    <Node><NodeNumber>90</NodeNumber><Endpoint>0</Endpoint><Rigid>0</Rigid><ComponentType>PIPE</ComponentType><Position>100 100 0</Position></Node>
  </Branch></Pipe>
</PipeStressExport>'''


class Psi116TopologyResolverFoundationTests(unittest.TestCase):
    def test_dry_run_findings_and_dispositions(self) -> None:
        result = resolve_psi116(SYNTHETIC_XML, source_name="synthetic.xml")
        codes = {finding.code for finding in result.findings}
        self.assertIn("ZERO_LENGTH_ROUTE_SPAN", codes)
        self.assertIn("SHORT_ROUTE_SPAN", codes)
        self.assertIn("NON_RIGID_COMPONENT_CLASSIFIED_RIGID", codes)
        self.assertIn("COINCIDENT_NODE_ALIAS_CANDIDATE", codes)
        self.assertIn("ELBO_HELPER_PORTS_MISSING", codes)

        dispositions = {action.disposition for action in result.fix_actions}
        self.assertIn("CONTRACT_PRESERVE_OWNER", dispositions)
        self.assertIn("SAFE_DROP_PIPE_GEOMETRY", dispositions)
        self.assertIn("REMOVE_FALSE_RIGID", dispositions)
        self.assertIn("ALIAS_COINCIDENT_NODE", dispositions)

        plan = result.fix_plan_payload(ResolverConfig())
        self.assertEqual(plan["mutationPolicy"], "DRY_RUN_ONLY")
        self.assertFalse(plan["sourceXmlMutated"])
        self.assertEqual(result.document.source_text, SYNTHETIC_XML)

    def test_sidecars_are_deterministic_and_do_not_emit_xml(self) -> None:
        config = ResolverConfig()
        result = resolve_psi116(SYNTHETIC_XML, config, source_name="synthetic.xml")
        with tempfile.TemporaryDirectory() as tmp:
            first = write_sidecars(result, tmp, config, stem="case")
            first_bytes = [path.read_bytes() for path in first]
            second = write_sidecars(result, tmp, config, stem="case")
            second_bytes = [path.read_bytes() for path in second]
            self.assertEqual(first_bytes, second_bytes)
            self.assertFalse(any(Path(tmp).glob("*.xml")))
            findings = json.loads(first[0].read_text(encoding="utf-8"))
            plan = json.loads(first[1].read_text(encoding="utf-8"))
            self.assertEqual(findings["source"]["sha256"], plan["source"]["sha256"])

    def test_real_1885_detects_known_topology_defects_without_mutation(self) -> None:
        fixture = Path(__file__).resolve().parents[1] / "Benchmarks" / "1885Sjson" / "FirstpassXML"
        self.assertTrue(fixture.is_file(), fixture)
        source_before = fixture.read_text(encoding="utf-8")
        result = resolve_psi116(fixture)
        source_after = fixture.read_text(encoding="utf-8")
        self.assertEqual(source_before, source_after)
        self.assertEqual(result.document.source_text, source_before)

        zero_1600_1610 = [
            finding for finding in result.findings
            if finding.code == "ZERO_LENGTH_ROUTE_SPAN" and {1600, 1610}.issubset(set(finding.node_numbers))
        ]
        self.assertEqual(len(zero_1600_1610), 1)

        alias_1570_2260 = [
            finding for finding in result.findings
            if finding.code == "COINCIDENT_NODE_ALIAS_CANDIDATE"
            and {1570, 2260}.issubset(set(finding.node_numbers))
            and finding.details.get("ownerNodeNumber") == 1570
        ]
        self.assertEqual(len(alias_1570_2260), 1)

        contract_1610 = [
            action for action in result.fix_actions
            if action.disposition == "CONTRACT_PRESERVE_OWNER" and action.owner_node_number == 1610
        ]
        self.assertEqual(len(contract_1610), 1)

        alias_1570 = [
            action for action in result.fix_actions
            if action.disposition == "ALIAS_COINCIDENT_NODE"
            and action.owner_node_number == 1570
            and 2260 in action.absorbed_node_numbers
        ]
        self.assertEqual(len(alias_1570), 1)


if __name__ == "__main__":
    unittest.main()
