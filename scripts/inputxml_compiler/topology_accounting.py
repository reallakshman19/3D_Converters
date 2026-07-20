#!/usr/bin/env python3
"""Evidence-backed source and topology accounting for PR-6 profiles."""
from __future__ import annotations

from typing import Any

from lxml import etree as ET

from .base import DecisionLedger
from .topology_diagnostics import diagnose
from .topology_inventory import build_source_inventory
from .xml import _local, _namespace


_ACCOUNTING_TYPES = {
    "TOPOLOGY_SOURCE_ACCOUNTING_INDEX",
    "TOPOLOGY_SOURCE_ACCOUNTING_PROOF",
}


def account_topology_profile_source(
    root: ET._Element,
    canonical: ET._Element,
    *,
    profile_id: str,
    ledger: DecisionLedger,
) -> tuple[str, dict[str, Any]]:
    inventory = build_source_inventory(root)
    prior_records = list(ledger.records)
    prior_by_identity: dict[str, list[str]] = {}
    for record in prior_records:
        if record.get("sourceType") in _ACCOUNTING_TYPES:
            continue
        identity = str(record.get("sourceEntityId") or "")
        if identity:
            prior_by_identity.setdefault(identity, []).append(str(record["recordId"]))
    unaccounted = [
        identity for identity in inventory.identities if not prior_by_identity.get(identity)
    ]
    canonical_elements, canonical_nodes = _canonical_identities(canonical)
    mapped_elements = _mapped_values(
        prior_records,
        "TOPOLOGY_EDGE_MAPPING",
        "canonicalElementIds",
    )
    mapped_nodes = _mapped_values(
        prior_records,
        "TOPOLOGY_NODE_MAPPING",
        "canonicalNodeIds",
    )
    proof_record = next(
        (
            record
            for record in prior_records
            if record.get("sourceType") == "STRICT_TOPOLOGY_BRIDGE_PROOF"
        ),
        None,
    )
    bridge_proof = (
        ((proof_record or {}).get("sourceFields") or {}).get("topologyProof") or {}
    )
    invariants = {
        "unaccountedSourceOccurrenceCount": len(unaccounted),
        "duplicateInventoryIdentityCount": inventory.duplicate_identity_count,
        "unmappedCanonicalNodeCount": len(canonical_nodes - mapped_nodes),
        "unmappedCanonicalElementCount": len(canonical_elements - mapped_elements),
        "unresolvedEdgeCount": int(bridge_proof.get("unresolvedEdgeCount") or 0),
        "unresolvedOwnershipCount": int(
            bridge_proof.get("unresolvedOwnershipCount") or 0
        ),
        "syntheticTopologyCount": int(
            bridge_proof.get("syntheticTopologyCount") or 0
        ),
        "duplicateCanonicalNodeMappingCount": _duplicate_count(
            prior_records,
            "TOPOLOGY_NODE_MAPPING",
            "canonicalNodeIds",
        ),
        "duplicateCanonicalElementMappingCount": _duplicate_count(
            prior_records,
            "TOPOLOGY_EDGE_MAPPING",
            "canonicalElementIds",
        ),
        "accountingIndexSelfCertificationCount": 0,
    }
    complete = all(value == 0 for value in invariants.values())
    for row in inventory.entries:
        identity = str(row["identity"])
        ledger.add(
            source_entity_id=f"accounting::{identity}",
            source_type="TOPOLOGY_SOURCE_ACCOUNTING_INDEX",
            source_fields={
                "sourceIdentity": identity,
                "parentIdentity": row["parentIdentity"],
                "kind": row["kind"],
                "name": row["name"],
                "priorDecisionRecordIds": prior_by_identity.get(identity, []),
                "coverageRule": "PRIOR_TRANSFORMATION_DECISION_REQUIRED",
            },
            projection_cardinality="1_TO_0",
            disposition="PRESERVE_EXTENSION" if prior_by_identity.get(identity) else "REJECT_INVALID",
            evidence=[
                "accounting index was created only after prior decisions were frozen",
                "accounting records cannot satisfy their own coverage requirement",
            ],
            diagnostics=[] if prior_by_identity.get(identity) else ["source occurrence has no prior decision"],
        )
    proof = {
        "schema": "InputXmlTopologySourceAccountingProof.v1",
        "profileId": profile_id,
        "status": "COMPLETE" if complete else "INCOMPLETE",
        "coverageRule": "PRIOR_TRANSFORMATION_DECISION_REQUIRED",
        "sourceOccurrenceCount": len(inventory.entries),
        "sourceBranchOccurrenceCount": _source_count(root, "Branch"),
        "sourceNodeOccurrenceCount": _source_count(root, "Node"),
        "sourceComponentEvidenceCount": _source_count(root, "ComponentType"),
        "sourceRestraintEvidenceCount": _source_count(
            root,
            "Restraint",
            "CustomRestraint",
        ),
        "logicalNodeCount": int(bridge_proof.get("logicalNodeCount") or 0),
        "logicalEdgeCount": int(bridge_proof.get("logicalEdgeCount") or 0),
        "canonicalNodeCount": len(canonical_nodes),
        "canonicalElementCount": len(canonical_elements),
        "accountedSourceOccurrenceCount": len(inventory.entries) - len(unaccounted),
        "invariants": invariants,
        "unaccountedSourceIdentities": unaccounted,
    }
    ledger.add(
        source_entity_id="topology-source-accounting-proof",
        source_type="TOPOLOGY_SOURCE_ACCOUNTING_PROOF",
        source_fields=proof,
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION" if complete else "REJECT_INVALID",
        evidence=[
            "source inventory, bridge mappings and canonical identities reconciled independently",
            "document-level projection records are not used as field-level accounting substitutes",
        ],
        diagnostics=[] if complete else ["topology source accounting is incomplete"],
    )
    if not complete:
        diagnose(
            ledger,
            "TOPOLOGY_SOURCE_ACCOUNTING_INCOMPLETE",
            "Strict topology source-accounting invariants did not all resolve to zero.",
            "topology-source-accounting-proof",
            invariants=invariants,
        )
    return proof["status"], proof


def _canonical_identities(
    canonical: ET._Element,
) -> tuple[set[str], set[str]]:
    model = next(
        child
        for child in canonical
        if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGMODEL"
    )
    elements = {
        str(child.get("ID") or "")
        for child in model
        if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGELEMENT"
    }
    nodes = {
        str(child.get(field) or "")
        for child in model
        if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGELEMENT"
        for field in ("FROM_NODE", "TO_NODE")
    }
    return {value for value in elements if value}, {value for value in nodes if value}


def _mapped_values(
    records: list[dict[str, Any]],
    source_type: str,
    field: str,
) -> set[str]:
    return {
        str(value)
        for record in records
        if record.get("sourceType") == source_type
        for value in record.get(field) or []
        if str(value)
    }


def _duplicate_count(
    records: list[dict[str, Any]],
    source_type: str,
    field: str,
) -> int:
    values = [
        str(value)
        for record in records
        if record.get("sourceType") == source_type
        for value in record.get(field) or []
        if str(value)
    ]
    return len(values) - len(set(values))


def _source_count(root: ET._Element, *names: str) -> int:
    accepted = set(names)
    return sum(
        1
        for element in root.iter()
        if _namespace(element.tag) == "" and _local(element.tag) in accepted
    )


__all__ = ["account_topology_profile_source"]
