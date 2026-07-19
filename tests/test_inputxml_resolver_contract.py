import unittest
from lxml import etree as ET
from pathlib import Path
from scripts.inputxml_compiler.base import DecisionLedger
from scripts.inputxml_compiler.dispatcher import resolve_registered_profile
from scripts.inputxml_compiler.resolver_contract import ResolverOutcome, OutcomeKind

class TestInputXMLResolverContract(unittest.TestCase):

    def setUp(self):
        self.ledger = DecisionLedger("repo", "path", "prod", "dialect")
        self.aliases = {}
        self.context = {}
        self.categorized_xsd_path = Path("fake.xsd")

    def test_canonical_inputxml_v1(self):
        root = ET.Element("CAESARII")
        outcome = resolve_registered_profile(
            dialect="canonical-inputxml-v1",
            source=b"",
            root=root,
            ledger=self.ledger,
            aliases=self.aliases,
            context=self.context,
            source_name="test",
            source_path="path",
            categorized_xsd_path=self.categorized_xsd_path,
        )
        self.assertIsInstance(outcome, ResolverOutcome)
        self.assertEqual(outcome.outcome_kind, OutcomeKind.CANONICAL_CANDIDATE)
        self.assertIsNotNone(outcome.canonical_candidate)

    def test_xml_to_cii_diagnostic_sidecar(self):
        root = ET.Element("{COADE}CAESARII", XML_TYPE="Input", VERSION="11.00")
        model = ET.SubElement(root, "PIPINGMODEL", JOBNAME="T")
        ET.SubElement(model, "PIPINGELEMENT", FROM_NODE="10", TO_NODE="20", LINE="L1", DELTA_X="1", DELTA_Y="0", DELTA_Z="0", DIAMETER="10", WALL_THICK="1")
        outcome = resolve_registered_profile(
            dialect="xml-to-cii-diagnostic-sidecar",
            source=b"",
            root=root,
            ledger=self.ledger,
            aliases=self.aliases,
            context={"north": [0, 1, 0]},
            source_name="test",
            source_path="path",
            categorized_xsd_path=self.categorized_xsd_path,
        )
        self.assertEqual(outcome.outcome_kind, OutcomeKind.BLOCKED_WITH_CANDIDATE)
        self.assertTrue(self.ledger.blocked)
        
if __name__ == '__main__':
    unittest.main()
