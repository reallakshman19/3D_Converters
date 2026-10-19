#!/usr/bin/env python3
"""Private, read-only XML229 engine->native CII mass-owner inventory.

Consumes the non-releasing R2 original-physical-to-engine-input attestation,
the exact engine XML bytes and actual emitted CII bytes. Never fabricates
RIGID slots, accepts Final decisions, or authorizes Run. Data stays local.
"""
from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import json
from pathlib import Path
import xml.etree.ElementTree as ET

_SCHEMA = "XML229.NativeMassOwnerInventory.v1"
_TRANSFER = "XML229.R2.OriginalPhysicalEngineInputTransfer.v1"
_G5_SPEC = importlib.util.spec_from_file_location(
    "xml229_native_g5_challenge",
    Path(__file__).with_name("xml229-g5-native-element-lineage.py"),
)
_G5 = importlib.util.module_from_spec(_G5_SPEC)
_G5_SPEC.loader.exec_module(_G5)


class InventoryError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def require(ok, code):
    if not ok:
        raise InventoryError(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decimal(value, *, positive=False):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise InventoryError("MASS_OR_SCALE_INVALID") from None
    require(number.is_finite() and (number > 0 if positive else number >= 0),
            "MASS_OR_SCALE_INVALID")
    return number


def local_name(element):
    return element.tag.rsplit("}", 1)[-1]


def child(element, name):
    return next((item for item in element if local_name(item) == name), None)


def field(element, name):
    item = child(element, name)
    return "" if item is None else (item.text or "").strip()


def branches_from_xml(data):
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        raise InventoryError("ENGINE_XML_INVALID") from None
    require(local_name(root) == "PipeStressExport", "ENGINE_XML_INVALID")
    branches = [e for e in root.iter() if local_name(e) == "Branch"]
    require(bool(branches), "ENGINE_XML_EMPTY")
    return branches


def sha256_field(value):
    return (isinstance(value, str) and len(value) == 64
            and all(c in "0123456789abcdef" for c in value))


def normalized_ref(value):
    # Match the current native Python _normalized_component_ref semantics.
    return str(value).lstrip("=").replace(" ", "").upper()


def incoming_rigid_candidate(nodes, ordinal):
    """Pre-conversion hint, NOT post-cleanup/native-slot lineage.

    The native edge predicate accepts a Rigid=2 *arrival* or, for a FLAN
    arrival, a Rigid=2 predecessor sharing a nonblank component reference.
    Its rigid weight is the arrival node's own Weight, never the predecessor's.
    """
    # Native ELEMENTS arise only from edges. The first node of a branch
    # has no incoming edge even if its own Rigid tag says 2.
    if ordinal == 0:
        return "NO_KNOWN_NATIVE_RIGID_EDGE"
    node = nodes[ordinal]
    if field(node, "Rigid") == "2":
        return "DIRECT_RIGID2"
    if field(node, "ComponentType").upper() != "FLAN":
        return "NO_KNOWN_NATIVE_RIGID_EDGE"
    before = nodes[ordinal - 1]
    ref = normalized_ref(field(node, "ComponentRefNo"))
    if (field(before, "Rigid") == "2" and ref and
            ref == normalized_ref(field(before, "ComponentRefNo"))):
        return "SAME_REF_RIGID_TO_FLAN"
    return "NO_KNOWN_NATIVE_RIGID_EDGE"


def inventory(transfer, engine_xml_bytes, cii_bytes, *, weight_scale,
              expected_cii_sha256):
    """Build local diagnostics; never claim Final authorship or CII release."""
    require(isinstance(transfer, dict) and transfer.get("schema") == _TRANSFER,
            "R2_TRANSFER_REQUIRED")
    require(transfer.get("complete") is True and
            transfer.get("status") == "ENGINE_INPUT_MASS_TRANSFER_VERIFIED_ONLY" and
            transfer.get("mappingKind") == "STRICT_EXACT_PRE_SPLIT" and
            transfer.get("nativeCiiReleaseAuthorized") is False and
            transfer.get("nativeCiiPhysicalSlotVerified") is False,
            "TRANSFER_RELEASE_OR_COMPLETENESS_INVALID")
    for name in ("basisId", "finalIntentSha256", "engineInputSha256",
                 "originalJsonSha256"):
        require(sha256_field(transfer.get(name)), "R2_DIGEST_REQUIRED")
    require(digest(engine_xml_bytes) == transfer["engineInputSha256"],
            "ENGINE_INPUT_SHA_DRIFT")
    require(sha256_field(expected_cii_sha256) and
            digest(cii_bytes) == expected_cii_sha256, "CII_SHA_DRIFT")
    factor = decimal(weight_scale, positive=True)
    matches = transfer.get("matches")
    n = transfer.get("originalPhysicalCount")
    require(isinstance(matches, list) and type(n) is int and n > 0 and
            transfer.get("verifiedEnginePhysicalCount") == n and
            len(matches) == n, "R2_PHYSICAL_CENSUS_DRIFT")
    branches = branches_from_xml(engine_xml_bytes)
    used_original, used_engine = set(), set()
    by_type = {}
    all_kg = Decimal(0)
    unresolved_kg = Decimal(0)
    explicitly_rigid2_kg = Decimal(0)
    same_ref_flange_kg = Decimal(0)
    for row in matches:
        require(isinstance(row, dict), "R2_MATCH_INVALID")
        try:
            occurrence = json.loads(row["originalOccurrenceId"])
        except (KeyError, TypeError, ValueError):
            raise InventoryError("R2_ORIGINAL_OCCURRENCE_INVALID") from None
        bi, ordinal = row.get("branchOccurrenceIndex"), row.get("engineNodeOrdinal")
        require(isinstance(occurrence, list) and len(occurrence) == 4 and
                occurrence == [row.get("sourceId"), bi,
                               row.get("originalNodeOrdinal"),
                               row.get("componentSignature")] and
                type(bi) is int and bi >= 0 and type(ordinal) is int and ordinal >= 0 and
                bi < len(branches), "R2_ORIGINAL_OCCURRENCE_INVALID")
        uid = row["originalOccurrenceId"]
        target = (bi, ordinal)
        require(uid not in used_original and target not in used_engine,
                "R2_DUPLICATE_PHYSICAL_OWNER")
        used_original.add(uid)
        used_engine.add(target)
        branch = branches[bi]
        nodes = [node for node in branch if local_name(node) == "Node"]
        require(ordinal < len(nodes), "R2_ENGINE_OWNER_MISSING")
        node = nodes[ordinal]
        for xml_field, name in (
            ("Branchname", "branchName"), ("NodeNumber", "engineNodeNumber"),
            ("Position", "enginePosition"), ("ComponentType", "componentType"),
            ("ComponentRefNo", "componentRefNo"), ("Endpoint", "endpoint"),
            ("NodeName", "nodeName"), ("Rigid", "rigid")
        ):
            actual = field(branch if xml_field == "Branchname" else node, xml_field)
            require(actual == row.get(name), "R2_ENGINE_IDENTITY_DRIFT")
        weight = decimal(field(node, "Weight"), positive=True)
        require(weight == decimal(row.get("engineWeightKg"), positive=True),
                "R2_ENGINE_MASS_DRIFT")
        kind = field(node, "ComponentType").upper()
        predicate = incoming_rigid_candidate(nodes, ordinal)
        explicit = predicate == "DIRECT_RIGID2"
        same_ref_flange = predicate == "SAME_REF_RIGID_TO_FLAN"
        entry = by_type.setdefault(kind, {
            "positivePhysicals": 0, "engineKg": Decimal(0),
            "explicitRigid2": 0, "sameRefRigidToFlan": 0, "ruleRequired": 0,
            "explicitRigid2Kg": Decimal(0), "sameRefFlangeKg": Decimal(0),
            "requiresRuleKg": Decimal(0)
        })
        entry["positivePhysicals"] += 1
        entry["engineKg"] += weight
        if explicit:
            entry["explicitRigid2"] += 1
            entry["explicitRigid2Kg"] += weight
            explicitly_rigid2_kg += weight
        elif same_ref_flange:
            entry["sameRefRigidToFlan"] += 1
            entry["sameRefFlangeKg"] += weight
            same_ref_flange_kg += weight
        else:
            entry["ruleRequired"] += 1
            entry["requiresRuleKg"] += weight
            unresolved_kg += weight
        # A pre-cleanup native predicate match is not a proven RIGID slot.
        # Do not infer output ownership merely from this eligibility.
        all_kg += weight
    try:
        cii_text = cii_bytes.decode("utf-8")
        elements, pointers = _G5.parse_elements(cii_text)
        sections = _G5.sections_from_output(cii_text)
    except (UnicodeDecodeError, _G5.LineageError):
        raise InventoryError("NATIVE_CII_STRUCTURE_INVALID") from None
    units = [line.strip() for line in sections.get("UNITS", [])]
    require("N." in units, "CII_FORCE_UNIT_UNVERIFIED")
    raw_slots = sections["RIGID"]
    values = []
    for slot in raw_slots:
        parts = slot.split()
        require(len(parts) == 2, "CII_RIGID_RECORD_INVALID")
        values.append(decimal(parts[0]))
    native_units = sum(values, Decimal(0))
    components = {
        kind: {
            "positivePhysicals": entry["positivePhysicals"],
            "engineKg": str(entry["engineKg"]),
            "explicitRigid2": entry["explicitRigid2"],
            "sameRefRigidToFlanCandidates": entry["sameRefRigidToFlan"],
            "preConversionRigidEdgeCandidates":
                entry["explicitRigid2"] + entry["sameRefRigidToFlan"],
            "needsNativeOwnerRule": entry["ruleRequired"],
            "explicitRigid2Kg": str(entry["explicitRigid2Kg"]),
            "sameRefRigidToFlanCandidateKg": str(entry["sameRefFlangeKg"]),
            "needsNativeOwnerRuleKg": str(entry["requiresRuleKg"]),
        }
        for kind, entry in sorted(by_type.items())
    }
    return {
        "schema": _SCHEMA,
        "evidenceKind": "LOCAL_READ_ONLY_NONRELEASING",
        "basisId": transfer["basisId"],
        "finalIntentSha256": transfer["finalIntentSha256"],
        "engineInputSha256": transfer["engineInputSha256"],
        "ciiSha256": expected_cii_sha256,
        "sourcePhysicalCount": n,
        "sourceApprovedEngineKg": str(all_kg),
        "nativeElementCount": len(elements),
        "nativeRigidCount": len(raw_slots),
        "nativeRigidPointerCount": len(pointers),
        "claimedNativeScale": str(factor),
        "nativeCiiUnits": "N.",
        "nativeRigidOutputForce": str(native_units),
        "nativeRigidEquivalentKgUnderClaimedScale": str(native_units / factor),
        "nativeAggregateDifferenceKgUnderClaimedScale":
            str(all_kg - native_units / factor),
        "explicitRigid2SourceKg": str(explicitly_rigid2_kg),
        "sameRefRigidToFlanCandidateKg": str(same_ref_flange_kg),
        "preConversionRigidEdgeCandidateKg":
            str(explicitly_rigid2_kg + same_ref_flange_kg),
        "unresolvedPositiveNativeOwnerKg": str(unresolved_kg),
        "aggregateBalanceIsNotLineageProof": True,
        "byComponentType": components,
        "nativeOwnerRuleRequiredCount":
            sum(row["needsNativeOwnerRule"] for row in components.values()),
        "coverageStatus": "NATIVE_ORIGINAL_OCCURRENCE_TO_OUTPUT_UNVERIFIED",
        "unresolvedOwnerRuleStatus":
            ("BLOCKED_MISSING_NATIVE_OWNER_RULE" if unresolved_kg > 0
             else "NO_NON_RIGID2_OWNER_IN_THIS_CENSUS"),
        "independentLineageAuthorVerified": False,
        "physicalMatch2ConsumptionVerified": False,
        "nativeCiiPhysicalSlotVerified": False,
        "nativeCiiReleaseAuthorized": False,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--r2-transfer", type=Path, required=True)
    parser.add_argument("--engine-xml", type=Path, required=True)
    parser.add_argument("--cii", type=Path, required=True)
    parser.add_argument("--weight-scale", required=True)
    parser.add_argument("--deny-unresolved-mass", action="store_true",
                        help="Fail closed if positive physicals match neither known native incoming-edge predicate. Pre-conversion matches are not output lineage or release.")
    parser.add_argument("--expected-cii-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True,
                        help="OWNER-LOCAL PRIVATE output; never upload original rows")
    args = parser.parse_args(argv)
    result = inventory(json.loads(args.r2_transfer.read_text(encoding="utf-8")),
                       args.engine_xml.read_bytes(), args.cii.read_bytes(),
                       weight_scale=args.weight_scale,
                       expected_cii_sha256=args.expected_cii_sha256)
    if args.deny_unresolved_mass and Decimal(result["unresolvedPositiveNativeOwnerKg"]) > 0:
        raise InventoryError("NATIVE_OWNER_RULE_UNRESOLVED")
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("XML229 native owner inventory held; output private; native release=false")


if __name__ == "__main__":
    main()
