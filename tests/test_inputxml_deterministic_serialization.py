import json
from decimal import Decimal
import pytest
from lxml import etree as ET

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from inputxml_compiler.serialization import (
    canonical_decimal_text,
    serialize_canonical_xml,
    serialize_decision_ledger,
    SerializationPolicyError,
)

def test_canonical_decimal_text():
    assert canonical_decimal_text(0) == "0"
    assert canonical_decimal_text("-0.0") == "0"
    assert canonical_decimal_text(1.200) == "1.2"
    assert canonical_decimal_text("1E+3") == "1000"
    assert canonical_decimal_text("12345.6789000") == "12345.6789"
    assert canonical_decimal_text("42") == "42"

    with pytest.raises(ValueError):
        canonical_decimal_text("NaN")
    with pytest.raises(ValueError):
        canonical_decimal_text("Infinity")

def test_serialize_canonical_xml_attribute_order():
    policy = {
        "xml": {
            "declaration": True,
            "encoding": "UTF-8",
            "prettyPrint": False,
            "lineEnding": "LF",
            "trailingNewline": False,
            "unlistedCanonicalAttribute": "REJECT_POLICY_DRIFT",
            "unlistedExtensionAttribute": "LEXICAL_QNAME_ORDER",
            "attributeOrder": {
                "PIPINGELEMENT": [
                    "FROM_NODE",
                    "TO_NODE",
                    "DIAMETER"
                ]
            }
        }
    }

    # Create element with wrong insertion order
    element = ET.Element("PIPINGELEMENT")
    element.set("DIAMETER", "10.0")
    element.set("FROM_NODE", "10")
    element.set("TO_NODE", "20")

    result = serialize_canonical_xml(element, policy)
    expected = b'<?xml version=\'1.0\' encoding=\'UTF-8\'?>\n<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DIAMETER="10.0"/>'
    assert result == expected

def test_serialize_canonical_xml_extension_attributes():
    policy = {
        "xml": {
            "declaration": False,
            "encoding": "UTF-8",
            "prettyPrint": False,
            "lineEnding": "LF",
            "trailingNewline": False,
            "unlistedCanonicalAttribute": "REJECT_POLICY_DRIFT",
            "unlistedExtensionAttribute": "LEXICAL_QNAME_ORDER",
            "attributeOrder": {
                "PIPINGELEMENT": ["FROM_NODE", "TO_NODE"]
            }
        }
    }

    element = ET.Element("PIPINGELEMENT", nsmap={"ext": "urn:reallaksh19:inputxml:extension:v1"})
    element.set("TO_NODE", "20")
    element.set("{urn:reallaksh19:inputxml:extension:v1}B_EXT", "bbb")
    element.set("FROM_NODE", "10")
    element.set("{urn:reallaksh19:inputxml:extension:v1}A_EXT", "aaa")

    result = serialize_canonical_xml(element, policy)
    # Ext attributes should be sorted lexically by the QName (which includes namespace)
    assert b'<PIPINGELEMENT xmlns:ext="urn:reallaksh19:inputxml:extension:v1" FROM_NODE="10" TO_NODE="20" ext:A_EXT="aaa" ext:B_EXT="bbb"/>' in result

def test_serialize_canonical_xml_rejects_unlisted():
    policy = {
        "xml": {
            "unlistedCanonicalAttribute": "REJECT_POLICY_DRIFT",
            "attributeOrder": {
                "PIPINGELEMENT": ["FROM_NODE"]
            }
        }
    }
    element = ET.Element("PIPINGELEMENT")
    element.set("FROM_NODE", "10")
    element.set("UNKNOWN_ATTR", "bad")

    with pytest.raises(SerializationPolicyError, match="Policy drift"):
        serialize_canonical_xml(element, policy)

def test_serialize_decision_ledger_json():
    policy = {
        "json": {
            "encoding": "UTF-8",
            "indentation": 2,
            "sortKeys": True,
            "allowNan": False,
            "lineEnding": "LF",
            "trailingNewline": False
        }
    }
    
    payload = {
        "b": 2,
        "a": 1,
        "c": 3
    }
    
    result = serialize_decision_ledger(payload, policy)
    assert result == b'{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}'
