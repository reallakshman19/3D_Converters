import hashlib
import json
import copy
from decimal import Decimal
from typing import Any
import lxml.etree as ET

class SerializationPolicyError(Exception):
    pass

def canonical_decimal_text(value: object) -> str:
    number = Decimal(str(value))

    if not number.is_finite():
        raise ValueError("Non-finite numeric value")

    if number == 0:
        return "0"

    text = format(number, "f")

    if "." in text:
        text = text.rstrip("0").rstrip(".")

    return text

def _sort_element_attributes(element: ET._Element, xml_policy: dict[str, Any]) -> None:
    tag = element.tag
    if tag.startswith("{") and "}" in tag:
        # Check if full tag is in attributeOrder
        if tag not in xml_policy.get("attributeOrder", {}):
            tag = tag.split("}", 1)[1]
    
    order_list = xml_policy.get("attributeOrder", {}).get(tag, [])
    
    attrs = dict(element.attrib)
    element.attrib.clear()
    
    unlisted_canonical = xml_policy.get("unlistedCanonicalAttribute", "REJECT_POLICY_DRIFT")
    
    ordered_keys = []
    
    # 1. Listed canonical attributes in exact order
    for k in order_list:
        if k in attrs:
            ordered_keys.append(k)
            
    # 2. Unlisted attributes
    unlisted = [k for k in attrs if k not in order_list]
    for k in unlisted:
        if k.startswith("{"):
            # Extension namespace attribute
            pass # sorted lexically below
        else:
            # Unlisted canonical attribute
            if unlisted_canonical == "REJECT_POLICY_DRIFT":
                raise SerializationPolicyError(f"Policy drift: unlisted canonical attribute {k} on {tag}")
                
    # Sort unlisted extension attributes lexically
    unlisted.sort()
    ordered_keys.extend(unlisted)
    
    for k in ordered_keys:
        element.attrib[k] = attrs[k]
        
    for child in element:
        _sort_element_attributes(child, xml_policy)

def serialize_canonical_xml(root: ET._Element, policy: dict[str, Any]) -> bytes:
    xml_policy = policy.get("xml", {})
    encoding = xml_policy.get("encoding", "UTF-8")
    declaration = xml_policy.get("declaration", True)
    pretty_print = xml_policy.get("prettyPrint", True)
    
    tree_copy = copy.deepcopy(root)
    _sort_element_attributes(tree_copy, xml_policy)
    
    # lxml cleanup namespaces to ensure consistent prefix generation
    ET.cleanup_namespaces(tree_copy, top_nsmap={None: "http://www.coade.com/xml/CAESARII", "ext": "urn:reallaksh19:inputxml:extension:v1"})
    
    xml_bytes = ET.tostring(
        tree_copy,
        xml_declaration=declaration,
        encoding=encoding,
        pretty_print=pretty_print,
    )
    
    line_ending = xml_policy.get("lineEnding", "LF")
    if line_ending == "LF":
        xml_bytes = xml_bytes.replace(b"\r\n", b"\n")
        
    trailing = xml_policy.get("trailingNewline", True)
    if trailing and not xml_bytes.endswith(b"\n"):
        xml_bytes += b"\n"
    elif not trailing and xml_bytes.endswith(b"\n"):
        xml_bytes = xml_bytes.rstrip(b"\n")
        
    return xml_bytes

def serialize_decision_ledger(ledger_dict: dict[str, Any], policy: dict[str, Any]) -> bytes:
    json_policy = policy.get("json", {})
    
    # Sort records and diagnostics? Wait, the base.py will pre-sort diagnostics.
    # Records are preserved in authoritative append order.
    
    return _serialize_json(ledger_dict, json_policy)

def serialize_validation_report(validation_dict: dict[str, Any], policy: dict[str, Any]) -> bytes:
    json_policy = policy.get("json", {})
    return _serialize_json(validation_dict, json_policy)

def _serialize_json(payload: dict[str, Any], json_policy: dict[str, Any]) -> bytes:
    encoding = json_policy.get("encoding", "UTF-8")
    indent = json_policy.get("indentation", 2)
    sort_keys = json_policy.get("sortKeys", True)
    ensure_ascii = json_policy.get("ensureAscii", False)
    allow_nan = json_policy.get("allowNan", False)
    
    json_str = json.dumps(
        payload,
        indent=indent,
        sort_keys=sort_keys,
        ensure_ascii=ensure_ascii,
        allow_nan=allow_nan,
    )
    
    line_ending = json_policy.get("lineEnding", "LF")
    if line_ending == "LF":
        json_str = json_str.replace("\r\n", "\n")
        
    trailing = json_policy.get("trailingNewline", False)
    if trailing and not json_str.endswith("\n"):
        json_str += "\n"
    elif not trailing and json_str.endswith("\n"):
        json_str = json_str.rstrip("\n")
        
    return json_str.encode(encoding)

def hash_source_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def hash_canonical_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def hash_ledger_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def serialization_policy_metadata(policy: dict[str, Any]) -> dict[str, Any]:
    # Stable digest of the policy itself
    policy_bytes = json.dumps(policy, sort_keys=True, separators=(",", ":")).encode("utf-8")
    policy_digest = hashlib.sha256(policy_bytes).hexdigest()
    
    return {
        "policyId": policy.get("policyId", "unknown"),
        "policySchema": policy.get("schema", "unknown"),
        "policySha256": policy_digest,
    }

__all__ = [name for name in globals() if not name.startswith("__")]
