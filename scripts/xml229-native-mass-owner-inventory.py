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


_RETAINED_SCHEMA = "XML229.NativeRetainedEdgeObservation.v1"

def challenge_retained_native_edges(transfer, engine_xml_bytes, cii_bytes,
                                    observation, *, weight_scale,
                                    expected_cii_sha256):
    """Source-to-retained-model-to-emitted-CII challenge, always HELD.

    The retained model comes from the production native runtime, not from an
    independent engineering source. Unique exact R2 identity and emitted CII
    slot agreement are required. Ambiguous, cleaned, split or renumbered owners
    without a unique match stay unverified; no guesses are made.
    """
    inventory(transfer, engine_xml_bytes, cii_bytes,
              weight_scale=weight_scale,
              expected_cii_sha256=expected_cii_sha256)
    require(isinstance(observation, dict) and
            observation.get("schema") == _RETAINED_SCHEMA and
            observation.get("nativeCiiReleaseAuthorized") is False and
            observation.get("physicalMatch2ConsumptionVerified") is False and
            observation.get("nativeCiiPhysicalSlotVerified") is False and
            observation.get("engineInputSha256") == digest(engine_xml_bytes) and
            observation.get("ciiSha256") == expected_cii_sha256 and
            decimal(observation.get("weightScale"), positive=True) ==
              decimal(weight_scale, positive=True),
            "RETAINED_OBSERVATION_CUSTODY_DRIFT")
    edges = observation.get("edges")
    require(isinstance(edges, list) and
            observation.get("modelElementCount") == len(edges),
            "RETAINED_EDGE_POPULATION_DRIFT")
    try:
        text = cii_bytes.decode("utf-8")
        native_edges, by_rigid = _G5.parse_elements(text)
        slots = _G5.sections_from_output(text)["RIGID"]
    except (UnicodeDecodeError, _G5.LineageError):
        raise InventoryError("NATIVE_CII_STRUCTURE_INVALID") from None
    require(len(edges) == len(native_edges) and
            observation.get("modelRigidCount") == len(slots),
            "RETAINED_EDGE_POPULATION_DRIFT")
    factor = decimal(weight_scale, positive=True)
    matches_by_key = {}
    branches = branches_from_xml(engine_xml_bytes)
    for row in transfer["matches"]:
        branch = branches[row["branchOccurrenceIndex"]]
        nodes = [n for n in branch if local_name(n) == "Node"]
        node = nodes[row["engineNodeOrdinal"]]
        key = (
            row["branchName"],
            int(row["engineNodeNumber"]),
            row["componentType"].upper(),
            row["componentRefNo"],
            row["endpoint"] or "",
            tuple(decimal(x) for x in row["enginePosition"].split()),
        )
        require(len(key[-1]) == 3, "R2_ENGINE_IDENTITY_DRIFT")
        matches_by_key.setdefault(key, []).append(
            (row["originalOccurrenceId"],decimal(row["engineWeightKg"],positive=True)))
    linked_source = set()
    bound_positive_slots = set()
    matched_kg = Decimal(0)
    matched_count = 0
    for index, (edge, actual) in enumerate(zip(edges, native_edges)):
        require(isinstance(edge, dict) and
                edge.get("nativeElementIndex") == index and
                type(edge.get("ciiFromNode")) is int and
                type(edge.get("ciiToNode")) is int and
                (edge["ciiFromNode"],edge["ciiToNode"],
                 edge.get("rigidRecordIndex")) == actual,
                "RETAINED_EDGE_TO_OUTPUT_DRIFT")
        to = edge.get("to")
        require(isinstance(to, dict) and
                isinstance(to.get("position"), list) and
                len(to["position"]) == 3 and
                type(to.get("sourceNodeNumber")) is int,
                "RETAINED_MODEL_NODE_INVALID")
        ridx = edge.get("rigidRecordIndex")
        if ridx is not None:
            require(type(ridx) is int and
                    by_rigid.get(ridx) == index and
                    ridx < len(slots),
                    "RETAINED_EDGE_TO_OUTPUT_DRIFT")
            parts = slots[ridx].split()
            require(len(parts) == 2 and
                    decimal(parts[0]) ==
                      decimal(to.get("weightKg")) * factor,
                    "RETAINED_EDGE_MASS_DRIFT")
        key = (
            edge.get("branchName"),to["sourceNodeNumber"],
            str(to.get("componentType","")).upper(),
            to.get("componentRefNo"),"" if to.get("endpoint") is None
            else str(to.get("endpoint")),
            tuple(decimal(x) for x in to["position"]),
        )
        owners = matches_by_key.get(key,[])
        require(len(owners) <= 1, "RETAINED_ORIGINAL_AMBIGUOUS")
        if not owners:
            if ridx is not None and decimal(to.get("weightKg")) > 0:
                raise InventoryError("RETAINED_POSITIVE_RIGID_WITHOUT_R2_OWNER")
            continue
        oid, verified_kg = owners[0]
        require(oid not in linked_source,"RETAINED_DUPLICATE_SOURCE_OWNER")
        linked_source.add(oid)
        require(decimal(to.get("weightKg")) == verified_kg,
                "RETAINED_SOURCE_MASS_DRIFT")
        if ridx is not None and verified_kg > 0:
            # Independently bind the retained upstream node to the ORIGINAL
            # engine XML branch, not a claimant-supplied CII endpoint alone.
            # Any split/rewrite requiring a synthetic predecessor must be
            # handled by an independently authored native child-allocation
            # ledger, never assumed here.
            original = next(r for r in transfer["matches"]
                            if r["originalOccurrenceId"] == oid)
            source_branch = branches[original["branchOccurrenceIndex"]]
            source_nodes = [
                n for n in source_branch if local_name(n) == "Node"
            ]
            from_node = edge.get("from")
            require(isinstance(from_node, dict),
                    "RETAINED_FROM_SOURCE_UNMATCHED")
            preceding = []
            for prior in source_nodes[:original["engineNodeOrdinal"]]:
                prior_position = field(prior, "Position").split()
                if len(prior_position) != 3:
                    continue
                if (
                    str(from_node.get("sourceNodeNumber")) ==
                      field(prior,"NodeNumber") and
                    from_node.get("componentType") ==
                      field(prior,"ComponentType") and
                    from_node.get("componentRefNo") ==
                      field(prior,"ComponentRefNo") and
                    ("" if from_node.get("endpoint") is None
                     else str(from_node["endpoint"])) ==
                      field(prior,"Endpoint") and
                    tuple(decimal(x) for x in from_node.get("position",[])) ==
                      tuple(decimal(x) for x in prior_position)
                ):
                    preceding.append(prior)
            require(len(preceding) == 1, "RETAINED_FROM_SOURCE_UNMATCHED")
            actual_source_node = source_nodes[original["engineNodeOrdinal"]]
            observed_rigid = "" if to.get("rigid") is None else str(to["rigid"])
            require(observed_rigid == field(actual_source_node,"Rigid"),
                    "RETAINED_SOURCE_CLASSIFICATION_DRIFT")
            before = preceding[0]
            to_ref = normalized_ref(field(actual_source_node,"ComponentRefNo"))
            from_ref = normalized_ref(field(before,"ComponentRefNo"))
            permitted = (
                field(actual_source_node,"Rigid") == "2" or
                (field(before,"Rigid") == "2" and
                 field(actual_source_node,"ComponentType").upper() == "FLAN"
                 and bool(to_ref) and to_ref == from_ref)
            )
            require(permitted, "RETAINED_NATIVE_CLASS_RULE_UNVERIFIED")
            require(ridx not in bound_positive_slots,
                    "RETAINED_POSITIVE_SLOT_DUPLICATE")
            bound_positive_slots.add(ridx)
            matched_count += 1
            matched_kg += verified_kg
    positive_output = {
        i for i,slot in enumerate(slots)
        if decimal(slot.split()[0]) > 0
    }
    require(positive_output == bound_positive_slots,
            "RETAINED_POSITIVE_NATIVE_SLOT_UNACCOUNTED")
    source_kg = sum(
        (decimal(row["engineWeightKg"],positive=True)
         for row in transfer["matches"]),Decimal(0))
    require(source_kg >= matched_kg, "RETAINED_MASS_INCONSISTENT")
    return {
        "schema":"XML229.NativeRetainedEdgeChallenge.v1",
        "status":"RUNTIME_MODEL_AND_CII_CHALLENGED_HELD",
        "sourcePhysicalCount":len(transfer["matches"]),
        "modelEdgeCount":len(edges),
        "nativeRigidCount":len(slots),
        "sourcePhysicalsWithUniqueRetainedArrival":len(linked_source),
        "nativePositiveRigidOwnersBoundToR2":matched_count,
        "nativePositiveRigidKgBoundToR2":str(matched_kg),
        "unrepresentedOriginalKg":str(source_kg-matched_kg),
        "independentRuntimeAuthorVerified":False,
        "independentOriginalToNativeGeometryVerified":False,
        "physicalMatch2ConsumptionVerified":False,
        "nativeCiiPhysicalSlotVerified":False,
        "nativeCiiReleaseAuthorized":False,
    }

_CLAIMS_SCHEMA = "XML229.NativeMassOwnerProvisionalClaims.v1"

def challenge_provisional_native_slots(transfer, engine_xml_bytes, cii_bytes,
                                       claims, *, weight_scale,
                                       expected_cii_sha256):
    """Challenge proposed original→RIGID slot matches, never review/release."""
    inventory(transfer, engine_xml_bytes, cii_bytes,
              weight_scale=weight_scale, expected_cii_sha256=expected_cii_sha256)
    require(isinstance(claims, dict) and
            claims.get("schema") == _CLAIMS_SCHEMA and
            claims.get("nativeCiiReleaseAuthorized") is False and
            claims.get("basisId") == transfer["basisId"] and
            claims.get("finalIntentSha256") == transfer["finalIntentSha256"] and
            claims.get("engineInputSha256") == transfer["engineInputSha256"] and
            claims.get("ciiSha256") == expected_cii_sha256,
            "PROVISIONAL_LINEAGE_BASIS_OR_AUTHORITY_DRIFT")
    declared = claims.get("rows")
    require(isinstance(declared, list), "PROVISIONAL_LINEAGE_ROWS_REQUIRED")
    source_rows = {row["originalOccurrenceId"]: row for row in transfer["matches"]}
    require(len(source_rows) == len(transfer["matches"]) and
            len(declared) == len(source_rows),
            "PROVISIONAL_LINEAGE_POPULATION_DRIFT")
    try:
        output_text = cii_bytes.decode("utf-8")
        elements, by_rigid = _G5.parse_elements(output_text)
        cii_slots = _G5.sections_from_output(output_text)["RIGID"]
    except (UnicodeDecodeError, _G5.LineageError):
        raise InventoryError("NATIVE_CII_STRUCTURE_INVALID") from None
    native_weights = []
    for slot in cii_slots:
        parts=slot.split()
        require(len(parts) == 2, "CII_RIGID_RECORD_INVALID")
        native_weights.append(decimal(parts[0]))
    branches = branches_from_xml(engine_xml_bytes)
    assigned_original, assigned_rigid, assigned_elements = set(), set(), set()
    matched_kg, unresolved_kg = Decimal(0), Decimal(0)
    matched_count = unresolved_count = 0
    factor = decimal(weight_scale, positive=True)
    for claim in declared:
        require(isinstance(claim, dict), "PROVISIONAL_LINEAGE_ROW_INVALID")
        oid = claim.get("originalOccurrenceId")
        require(isinstance(oid, str) and oid in source_rows and
                oid not in assigned_original,
                "PROVISIONAL_LINEAGE_ORIGINAL_DRIFT")
        assigned_original.add(oid)
        source = source_rows[oid]
        branch = branches[source["branchOccurrenceIndex"]]
        nodes = [node for node in branch if local_name(node) == "Node"]
        ordinal = source["engineNodeOrdinal"]
        kg = decimal(source["engineWeightKg"], positive=True)
        classification = incoming_rigid_candidate(nodes, ordinal)
        status = claim.get("status")
        if status == "UNRESOLVED":
            require(isinstance(claim.get("reason"), str) and
                    3 <= len(claim["reason"].strip()) <= 512 and
                    not any(key in claim for key in (
                        "nativeElementIndex", "rigidRecordIndex",
                        "ciiFromNode", "ciiToNode")),
                    "PROVISIONAL_UNRESOLVED_WITH_SLOT")
            unresolved_count += 1
            unresolved_kg += kg
            continue
        require(status == "CII_RIGID_CANDIDATE",
                "PROVISIONAL_LINEAGE_STATUS_INVALID")
        require(classification in ("DIRECT_RIGID2", "SAME_REF_RIGID_TO_FLAN"),
                "PROVISIONAL_NATIVE_CLASS_RULE_UNVERIFIED")
        ridx, eidx = claim.get("rigidRecordIndex"), claim.get("nativeElementIndex")
        require(type(ridx) is int and type(eidx) is int and
                ridx >= 0 and eidx >= 0 and eidx < len(elements) and
                ridx < len(cii_slots) and
                ridx not in assigned_rigid and eidx not in assigned_elements,
                "PROVISIONAL_NATIVE_SLOT_DUPLICATE_OR_RANGE")
        require(by_rigid.get(ridx) == eidx,
                "PROVISIONAL_NATIVE_RIGID_POINTER_DRIFT")
        actual_from, actual_to, _ = elements[eidx]
        require(type(claim.get("ciiFromNode")) is int and
                type(claim.get("ciiToNode")) is int and
                (actual_from, actual_to) ==
                  (claim["ciiFromNode"], claim["ciiToNode"]),
                "PROVISIONAL_NATIVE_ELEMENT_ENDPOINT_DRIFT")
        # We challenge actual output pointers and emitted owner-node mass,
        # but do NOT authenticate who authored this mapping or prove geometry.
        require(native_weights[ridx] == kg * factor,
                "PROVISIONAL_NATIVE_RIGID_MASS_DRIFT")
        assigned_rigid.add(ridx)
        assigned_elements.add(eidx)
        matched_count += 1
        matched_kg += kg
    require(assigned_original == set(source_rows),
            "PROVISIONAL_LINEAGE_POPULATION_DRIFT")
    for idx, value in enumerate(native_weights):
        require(idx in assigned_rigid or value == 0,
                "PROVISIONAL_UNACCOUNTED_POSITIVE_RIGID")
    return {
        "schema": "XML229.NativeProvisionalSlotChallenge.v1",
        "status": "PROVISIONAL_CLAIMS_CHALLENGED_NOT_RELEASED",
        "sourcePhysicalCount": len(source_rows),
        "oneToOneNativeCandidateCount": matched_count,
        "oneToOneNativeCandidateKg": str(matched_kg),
        "unresolvedPhysicalCount": unresolved_count,
        "unresolvedPhysicalKg": str(unresolved_kg),
        "unassignedZeroNativeRigidSlots": len(native_weights) - len(assigned_rigid),
        "verifiedClaimAuthor": False,
        "independentSourceLineageVerified": False,
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
    parser.add_argument("--provisional-lineage-claims", type=Path,
                        help="Owner-local nonreleasing per-original CII pointer/mass claim challenge; claims not authenticated.")
    parser.add_argument("--private-retained-edge-observation", type=Path,
                        help="Owner-local actual runtime retained-edge witness; not independently authored.")
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
    if args.provisional_lineage_claims:
        result["provisionalNativeChallenge"] = challenge_provisional_native_slots(
            json.loads(args.r2_transfer.read_text(encoding="utf-8")),
            args.engine_xml.read_bytes(), args.cii.read_bytes(),
            json.loads(args.provisional_lineage_claims.read_text(encoding="utf-8")),
            weight_scale=args.weight_scale,
            expected_cii_sha256=args.expected_cii_sha256)
    if args.private_retained_edge_observation:
        result["retainedEdgeChallenge"] = challenge_retained_native_edges(
            json.loads(args.r2_transfer.read_text(encoding="utf-8")),
            args.engine_xml.read_bytes(), args.cii.read_bytes(),
            json.loads(args.private_retained_edge_observation.read_text(encoding="utf-8")),
            weight_scale=args.weight_scale,
            expected_cii_sha256=args.expected_cii_sha256)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("XML229 native owner inventory held; output private; native release=false")


if __name__ == "__main__":
    main()
