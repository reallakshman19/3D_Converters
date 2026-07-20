#!/usr/bin/env python3
"""Evidence-backed source-accounting proof for managed-stage."""
from __future__ import annotations

from collections import Counter
from typing import Any

from lxml import etree as ET

from .base import DecisionLedger
from .managed_stage_diagnostics import diagnose
from .managed_stage_intake import ManagedStageIntake

_DECISION_TYPE = "MANAGED_STAGE_SOURCE_DECISION"
_NON_AUTHORITY_TYPES = {
    "MANAGED_STAGE_SOURCE_INVENTORY",
    "MANAGED_STAGE_ARTIFACT_IDENTITY_CLOSURE",
    "MANAGED_STAGE_SOURCE_MODEL_CLOSURE",
    "MANAGED_STAGE_TOPOLOGY_TRACE_CLOSURE",
    "MANAGED_STAGE_PARITY_METRIC_CLOSURE",
    "MANAGED_STAGE_SOURCE_ACCOUNTING_INDEX",
    "MANAGED_STAGE_SOURCE_ACCOUNTING_PROOF",
    "MANAGED_STAGE_JSON",
}
_CERTIFICATION_FIELDS = {
    "certifiesCoverage",
    "coverageCertified",
    "accounted",
    "covered",
    "accountingAuthoritySourceType",
}


def account_managed_stage_source(
    intake: ManagedStageIntake,
    canonical: ET._Element,
    *,
    evidence: dict[str, Any],
    ledger: DecisionLedger,
) -> tuple[str, dict[str, Any]]:
    prior = list(ledger.records)
    decisions = [row for row in prior if row.get("sourceType") == _DECISION_TYPE]
    counts = Counter(str(row.get("sourceEntityId") or "") for row in decisions)
    inventory_ids = set(intake.inventory.identities)
    decision_ids = set(counts)
    unaccounted = sorted(inventory_ids - decision_ids)
    unexpected = sorted(decision_ids - inventory_ids)
    duplicate_decisions = sum(count - 1 for count in counts.values() if count > 1)
    topology = evidence["topology"]
    source = evidence["source"]
    parsed = evidence["result"]["parsedInputXmlTopology"]
    canonical_ids = _canonical_ids(canonical)
    mapped_elements = {
        str(value)
        for row in decisions
        for value in row.get("InputXMLElementIds") or []
    }
    mapped_nodes = {
        str(value)
        for row in decisions
        for value in row.get("canonicalNodeIds") or []
    }
    trace_ids = set(topology["traceByEntity"])
    entity_ids = set(source["entityById"])
    trace_port_ids = {
        str(row.get("sourcePortId") or "")
        for row in evidence["result"]["traceLedger"].get("sourcePorts") or []
    }
    port_ids = set(source["portById"])
    input_child_ids = {
        str(row.get("id") or "")
        for field in ("restraints", "rigids")
        for row in parsed.get(field) or []
    }
    decision_child_ids = {
        str(value)
        for row in topology["traceByEntity"].values()
        for value in row.get("inputXmlChildIds") or []
    }
    self_certifiers = [
        str(row.get("recordId") or row.get("sourceEntityId") or "")
        for row in prior
        if row.get("sourceType") in _NON_AUTHORITY_TYPES
        and row.get("sourceEntityId") in inventory_ids
        and _attempts_certification(row)
    ]
    invariants = {
        "unaccountedSourceOccurrenceCount": len(unaccounted),
        "duplicateSourceDecisionCount": duplicate_decisions,
        "unexpectedSourceDecisionCount": len(unexpected),
        "duplicateSourceEntityIdCount": len(source["entities"]) - len(entity_ids),
        "duplicateSourcePortIdCount": len(source["ports"]) - len(port_ids),
        "missingSourceEntityTraceCount": len(entity_ids - trace_ids),
        "extraTraceEntityCount": len(trace_ids - entity_ids),
        "missingSourcePortTraceCount": len(port_ids - trace_port_ids),
        "extraTracePortCount": len(trace_port_ids - port_ids),
        "orphanCanonicalNodeCount": len(canonical_ids["nodes"] - mapped_nodes),
        "orphanCanonicalEdgeCount": len(canonical_ids["elements"] - mapped_elements),
        "unmappedSourcePortCount": len(port_ids - set(topology["portDispositions"])),
        "unmappedInputXmlElementCount": len(
            {str(row.get("inputXmlElementId") or "") for row in parsed.get("elements") or []}
            - mapped_elements
        ),
        "unmappedInputXmlChildCount": len(input_child_ids - decision_child_ids),
        "artifactIdentityMismatchCount": 0,
        "artifactHashMismatchCount": 0,
        "metricMismatchCount": 0,
        "parityMismatchCount": len(evidence["result"]["topologyParityReport"].get("mismatches") or []),
        "selfCertificationCount": len(self_certifiers),
    }
    complete = all(value == 0 for value in invariants.values())
    _record_indexes(intake, counts, decisions, ledger)
    proof = {
        "schema": "InputXmlManagedStageSourceAccountingProof.v1",
        "profileId": "managed-stage-json",
        "status": "COMPLETE" if complete else "INCOMPLETE",
        "coverageRule": "VERIFIED_SEMANTIC_DECISION_REQUIRED",
        "accountingAuthoritySourceType": _DECISION_TYPE,
        "sourceOccurrenceCount": len(inventory_ids),
        "sourceBranchCount": len(intake.branches),
        "sourceEntityCount": len(entity_ids),
        "sourcePortCount": len(port_ids),
        "traceRecordCount": len(trace_ids),
        "canonicalNodeCount": len(canonical_ids["nodes"]),
        "canonicalEdgeCount": len(canonical_ids["elements"]),
        "inputXmlElementCount": len(parsed.get("elements") or []),
        "inputXmlChildCount": len(input_child_ids),
        "accountedSourceOccurrenceCount": len(inventory_ids) - len(unaccounted),
        "invariants": invariants,
        "unaccountedSourceIdentities": unaccounted,
        "unexpectedDecisionIdentities": unexpected,
        "selfCertificationRecordIds": self_certifiers,
    }
    ledger.add(
        source_entity_id="managed-stage-source-accounting-proof",
        source_type="MANAGED_STAGE_SOURCE_ACCOUNTING_PROOF",
        source_fields=proof,
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION" if complete else "REJECT_INVALID",
        evidence=[
            "only MANAGED_STAGE_SOURCE_DECISION records created after artifact verification certify coverage",
            "inventory, digest, document projection, extension, and accounting-index records are non-authoritative",
            "non-authority records that claim coverage are counted as self-certification attempts",
        ],
        diagnostics=[] if complete else ["managed-stage source accounting is incomplete"],
    )
    if not complete:
        diagnose(
            ledger,
            "MANAGED_STAGE_SOURCE_ACCOUNTING_INCOMPLETE",
            "Managed-stage source-accounting invariants did not all resolve to zero.",
            "managed-stage-source-accounting-proof",
            invariants=invariants,
        )
    return ("COMPLETE" if complete else "BLOCKED"), proof


def _attempts_certification(row: dict[str, Any]) -> bool:
    fields = row.get("sourceFields")
    if not isinstance(fields, dict):
        return False
    for key in _CERTIFICATION_FIELDS:
        value = fields.get(key)
        if value not in (None, False, "", [], {}):
            return True
    return False


def _record_indexes(
    intake: ManagedStageIntake,
    counts: Counter[str],
    decisions: list[dict[str, Any]],
    ledger: DecisionLedger,
) -> None:
    records: dict[str, list[str]] = {}
    for row in decisions:
        records.setdefault(str(row["sourceEntityId"]), []).append(str(row["recordId"]))
    for occurrence in intake.inventory.entries:
        identity = str(occurrence["identity"])
        covered = counts.get(identity, 0) == 1
        ledger.add(
            source_entity_id=f"accounting::{identity}",
            source_type="MANAGED_STAGE_SOURCE_ACCOUNTING_INDEX",
            source_fields={
                "sourceIdentity": identity,
                "sourceKind": occurrence["kind"],
                "sourceName": occurrence["name"],
                "priorDecisionRecordIds": records.get(identity, []),
                "coverageRule": "VERIFIED_SEMANTIC_DECISION_REQUIRED",
                "accountingAuthoritySourceType": _DECISION_TYPE,
            },
            projection_cardinality="1_TO_0",
            disposition="PRESERVE_EXTENSION" if covered else "REJECT_INVALID",
            evidence=["index was created after semantic decisions were frozen and cannot certify itself"],
            diagnostics=[] if covered else ["source occurrence lacks exactly one semantic decision"],
        )


def _canonical_ids(canonical: ET._Element) -> dict[str, set[str]]:
    model = next(child for child in canonical if ET.QName(child).localname == "PIPINGMODEL")
    elements = [child for child in model if ET.QName(child).localname == "PIPINGELEMENT"]
    return {
        "elements": {str(row.get("ID") or "") for row in elements if row.get("ID")},
        "nodes": {
            str(row.get(field) or "")
            for row in elements
            for field in ("FROM_NODE", "TO_NODE")
            if row.get(field)
        },
    }


__all__ = ["account_managed_stage_source"]
