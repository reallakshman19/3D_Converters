#!/usr/bin/env python3
"""Build and validate TE-014 occurrence-to-CII semantic projection evidence."""
from __future__ import annotations

import hashlib
from copy import deepcopy
from typing import Any

from lxml import etree as LET

from scripts.inputxml_compiler.psi116_adapter import build_segments
from scripts.inputxml_compiler.psi116_common import json_hash, load_projection_policy


class LedgerBuildBlocked(RuntimeError):
    pass

def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_te014_projection_ledger(
    *,
    production_result: dict[str, Any],
    boundary: dict[str, Any],
    intake,
    canonical: LET._Element,
    canonical_bytes: bytes,
    compiler_ledger: dict[str, Any],
    compiler_validation: dict[str, Any],
    assured_ledger: dict[str, Any],
    assured_projection: dict[str, Any],
    reparse_evidence: dict[str, Any],
) -> dict[str, Any]:
    policy, policy_hash = load_projection_policy()
    segments = build_segments(intake)
    canonical_elements = _canonical_elements(canonical)
    assured_elements = {
        str(row.get("inputXmlElementId") or ""): row
        for row in assured_projection.get("elements") or []
    }
    reparsed_elements = {
        int(row["index"]): row
        for row in (reparse_evidence.get("reparsed") or {}).get("elements") or []
    }
    rows: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []
    node_mismatches = 0
    projected_ids: set[str] = set()
    for segment in segments:
        canonical_element = canonical_elements.get(segment.element_id)
        assured_element = assured_elements.get(segment.element_id)
        row, row_errors = _projected_occurrence_row(
            segment=segment,
            canonical_element=canonical_element,
            assured_element=assured_element,
            reparsed_elements=reparsed_elements,
            production_result=production_result,
            policy=policy,
            policy_hash=policy_hash,
        )
        rows.append(row)
        projected_ids.add(row["occurrenceId"])
        node_mismatches += sum(1 for error in row_errors if error["code"] == "NODE_NUMBER_MISMATCH")
        diagnostics.extend(row_errors)
    rows.extend(_unprojected_emitted_rows(intake, projected_ids, production_result, policy_hash))
    rows.extend(_reserved_rows(production_result, policy_hash))
    emitted_ids = {
        str(row["occurrenceId"])
        for row in boundary["nodePlan"]["emittedOccurrences"]
    }
    accounted_emitted = {row["occurrenceId"] for row in rows if row["sourceDisposition"] != "RESERVED"}
    unaccounted = sorted(emitted_ids - accounted_emitted)
    if unaccounted:
        diagnostics.append({
            "severity": "BLOCKING", "code": "UNACCOUNTED_EMITTED_OCCURRENCE",
            "message": "Not every emitted TE-013 occurrence has a projection disposition.",
            "context": {"occurrenceIds": unaccounted},
        })
    duplicate_cii = _duplicate_values(
        row.get("ciiElementIndex") for row in rows if row.get("disposition") == "PROJECTED"
    )
    if duplicate_cii:
        diagnostics.append({
            "severity": "BLOCKING", "code": "DUPLICATE_CII_PROJECTION",
            "message": "Multiple emitted occurrences claim the same CII element record.",
            "context": {"ciiElementIndexes": duplicate_cii},
        })
    blocking = [row for row in diagnostics if row.get("severity") in {"ERROR", "BLOCKING"}]
    summary = _projection_summary(rows, node_mismatches, len(unaccounted))
    ledger: dict[str, Any] = {
        "schema": "TopoEnrichedXmlCiiProjectionLedger.v1",
        "status": "PASS" if not blocking else "BLOCKED",
        "chain": {
            "te013ProductionResultHash": boundary["productionResultHash"],
            "selectedBundleHash": boundary["selectedBundleHash"],
            "selectedXmlHash": boundary["selectedXmlHash"],
            "selectedTraceHash": boundary["selectedTraceHash"],
            "nodePlanHash": boundary["nodePlanHash"],
            "topologyIndexHash": boundary["topologyIndexHash"],
            "registrySnapshotHash": boundary["registrySnapshotHash"],
            "registryPatchHash": boundary["registryPatchHash"],
            "psi116ProjectionPolicyHashSha256": policy_hash,
            "psiSourceHashSha256": compiler_ledger.get("sourceHashSha256"),
            "canonicalHashSha256": _sha(canonical_bytes),
            "canonicalizationLedgerHashSha256": json_hash(compiler_ledger),
            "assuranceHashSha256": assured_ledger["assuranceHashSha256"],
            "assuredProjectionHashSha256": assured_projection["projectionHashSha256"],
            "ciiHashSha256": (assured_projection.get("chain") or {}).get("ciiHashSha256"),
            "reparseProofHashSha256": reparse_evidence["reparseProofHashSha256"],
        },
        "authority": {
            "source": "accepted TE-013 ENFORCED production result",
            "canonicalCompilerProfile": "pipesstressexport-psi116-xml",
            "assuredWriter": "converters/scripts/inputxml_to_cii2019.py via accepted assured boundary",
            "reparse": "converters/scripts/cii2019_reparse_proof.py through saved/read bytes",
        },
        "summary": summary,
        "lossAccounting": _loss_rows(rows),
        "records": rows,
        "diagnostics": diagnostics,
    }
    ledger["projectionLedgerHashSha256"] = json_hash(ledger)
    return ledger


def _projected_occurrence_row(
    *,
    segment,
    canonical_element: LET._Element | None,
    assured_element: dict[str, Any] | None,
    reparsed_elements: dict[int, dict[str, Any]],
    production_result: dict[str, Any],
    policy: dict[str, Any],
    policy_hash: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    errors: list[dict[str, Any]] = []
    occurrence = segment.to_node.trace
    node_plan = _node_plan_row(production_result, occurrence["occurrenceId"])
    ports = _source_ports(production_result, occurrence)
    if canonical_element is None or assured_element is None:
        errors.append(_blocking("CANONICAL_OR_CII_ELEMENT_MISSING", occurrence["occurrenceId"]))
        cii_index = None
    else:
        cii_index = int(assured_element["elementIndex"])
        reparsed = reparsed_elements.get(cii_index)
        if reparsed is None:
            errors.append(_blocking("CII_ELEMENT_REPARSE_MISSING", occurrence["occurrenceId"]))
        else:
            expected_nodes = (str(segment.from_node.node_number), str(segment.to_node.node_number))
            actual_nodes = (str(reparsed.get("fromNode")), str(reparsed.get("toNode")))
            if expected_nodes != actual_nodes:
                errors.append(_blocking("NODE_NUMBER_MISMATCH", occurrence["occurrenceId"], {
                    "expected": expected_nodes, "actual": actual_nodes,
                }))
        errors.extend(_verify_canonical_semantics(segment, canonical_element, assured_element, policy))
    if not ports:
        errors.append(_blocking("SOURCE_PORT_OWNERSHIP_MISSING", occurrence["occurrenceId"]))
    return ({
        "recordId": f"TE014-PROJ-{segment.branch_index + 1:04d}-{segment.segment_index + 1:06d}",
        "occurrenceId": occurrence["occurrenceId"],
        "sourceDisposition": "EMITTED",
        "disposition": "PROJECTED",
        "logicalNodeId": occurrence["logicalNodeId"],
        "historyNodeId": node_plan.get("historyNodeId"),
        "engineeringNodeNumber": occurrence["engineeringNodeNumber"],
        "sourceEntityId": occurrence["sourceEntityId"],
        "sourcePortIds": ports,
        "componentProjectionId": occurrence["componentProjectionId"],
        "componentType": occurrence["psiComponentType"],
        "endpoint": occurrence["endpoint"],
        "branchName": occurrence["branchName"],
        "psiBranchIndex": occurrence["branchIndex"],
        "psiNodeIndex": occurrence["nodeIndexInBranch"],
        "canonicalElementId": segment.element_id,
        "canonicalElementIndex": cii_index,
        "ciiElementIndex": cii_index,
        "projectionRule": "CONSECUTIVE_PSI_NODES_TO_CANONICAL_ELEMENT_OWNED_BY_TO_NODE",
        "governingPolicyHashSha256": policy_hash,
        "evidence": {
            "fromOccurrenceId": segment.from_node.trace["occurrenceId"],
            "fromEngineeringNodeNumber": segment.from_node.node_number,
            "assuredElement": assured_element,
        },
    }, errors)


def _verify_canonical_semantics(segment, element, assured, policy) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    right = segment.to_node
    expected = {
        "FROM_NODE": str(segment.from_node.node_number), "TO_NODE": str(right.node_number),
        "DIAMETER": right.outside_diameter, "WALL_THICK": right.wall_thickness,
        "INSUL_THICK": right.insulation_thickness, "CORR_ALLOW": right.corrosion_allowance,
        "MATERIAL_NUM": str(segment.branch.material_number), "LINE": segment.branch.branch_name,
    }
    for name, value in expected.items():
        if element.get(name) != value:
            errors.append(_blocking("CANONICAL_ENGINEERING_FIELD_MISMATCH", right.trace["occurrenceId"], {
                "field": name, "expected": value, "actual": element.get(name),
            }))
    pointers = assured.get("pointers") or {}
    bend_expected = right.component_type == "ELBO" and right.endpoint == 0
    rigid_expected = right.rigid in set(policy["componentPolicy"]["rigidOwnerValues"])
    restraint_expected = bool(right.restraints)
    checks = (
        ("BEND", bend_expected, len(element.findall("BEND"))),
        ("RIGID", rigid_expected, len(element.findall("RIGID"))),
        ("RESTRANT", restraint_expected, len(element.findall("RESTRAINT"))),
    )
    for section, expected_present, canonical_count in checks:
        pointer_present = int(pointers.get(section) or 0) > 0
        if expected_present != pointer_present or expected_present != bool(canonical_count):
            errors.append(_blocking("AUXILIARY_PROJECTION_MISMATCH", right.trace["occurrenceId"], {
                "section": section, "expected": expected_present,
                "canonicalCount": canonical_count, "ciiPointer": pointers.get(section),
            }))
    return errors


def _unprojected_emitted_rows(intake, projected_ids, result, policy_hash):
    rows = []
    for branch in intake.branches:
        for node in branch.nodes:
            occurrence_id = node.trace["occurrenceId"]
            if occurrence_id in projected_ids:
                continue
            isolated = len(branch.nodes) == 1
            disposition = (
                "INTENTIONALLY_OMITTED_ISOLATED_NODE"
                if isolated else "INTENTIONALLY_OMITTED_BRANCH_BOUNDARY"
            )
            plan = _node_plan_row(result, occurrence_id)
            rows.append({
                "recordId": f"TE014-OMIT-{branch.branch_index + 1:04d}-{node.node_index + 1:06d}",
                "occurrenceId": occurrence_id,
                "sourceDisposition": "EMITTED",
                "disposition": disposition,
                "logicalNodeId": node.trace["logicalNodeId"],
                "historyNodeId": plan.get("historyNodeId"),
                "engineeringNodeNumber": node.node_number,
                "sourceEntityId": node.trace["sourceEntityId"],
                "sourcePortIds": _source_ports(result, node.trace),
                "componentProjectionId": node.trace["componentProjectionId"],
                "componentType": node.component_type,
                "endpoint": node.endpoint,
                "branchName": branch.branch_name,
                "psiBranchIndex": branch.branch_index,
                "psiNodeIndex": node.node_index,
                "canonicalElementId": None,
                "canonicalElementIndex": None,
                "ciiElementIndex": None,
                "projectionRule": "EXPLICIT_ZERO_ELEMENT_BOUNDARY_ACCOUNTING",
                "governingPolicyHashSha256": policy_hash,
                "evidence": {"reason": disposition},
            })
    return rows


def _reserved_rows(result, policy_hash):
    rows = []
    for index, row in enumerate((result.get("nodePlan") or {}).get("reservedOccurrences") or [], 1):
        occurrence_id = str(row.get("occurrenceId") or "")
        topology = _topology_occurrence(result, occurrence_id)
        trace_like = {
            "occurrenceId": occurrence_id,
            "sourceEntityId": topology.get("sourceEntityId"),
            "logicalNodeId": row.get("logicalNodeId"),
        }
        rows.append({
            "recordId": f"TE014-RESERVED-{index:07d}",
            "occurrenceId": occurrence_id,
            "sourceDisposition": "RESERVED",
            "disposition": "RESERVED",
            "logicalNodeId": row.get("logicalNodeId"),
            "historyNodeId": row.get("historyNodeId"),
            "engineeringNodeNumber": row.get("engineeringNodeNumber"),
            "sourceEntityId": topology.get("sourceEntityId"),
            "sourcePortIds": _source_ports(result, trace_like),
            "componentProjectionId": row.get("componentProjectionId"),
            "componentType": row.get("psiComponentType"),
            "endpoint": row.get("endpoint"),
            "branchName": None,
            "psiBranchIndex": None,
            "psiNodeIndex": None,
            "canonicalElementId": None,
            "canonicalElementIndex": None,
            "ciiElementIndex": None,
            "projectionRule": "TE013_RESERVED_OCCURRENCE_MUST_NOT_APPEAR_IN_PSI_OR_CII",
            "governingPolicyHashSha256": policy_hash,
            "evidence": {"nodePlanDisposition": row.get("disposition")},
        })
    return rows


def _canonical_elements(root: LET._Element) -> dict[str, LET._Element]:
    model = next(
        child for child in root
        if LET.QName(child).localname == "PIPINGMODEL" and (LET.QName(child).namespace or "") == ""
    )
    return {
        str(child.get("ID") or ""): child
        for child in model
        if LET.QName(child).localname == "PIPINGELEMENT" and (LET.QName(child).namespace or "") == ""
    }


def _node_plan_row(result: dict[str, Any], occurrence_id: str) -> dict[str, Any]:
    plan = result.get("nodePlan") or {}
    rows = (plan.get("emittedOccurrences") or []) + (plan.get("reservedOccurrences") or [])
    matches = [row for row in rows if row.get("occurrenceId") == occurrence_id]
    if len(matches) != 1:
        raise LedgerBuildBlocked(f"TE-013 node plan has {len(matches)} rows for {occurrence_id}.")
    return matches[0]



def _topology_occurrence(result: dict[str, Any], occurrence_id: str) -> dict[str, Any]:
    rows = (result.get("topologyIndex") or {}).get("occurrences") or []
    if isinstance(rows, dict):
        value = rows.get(occurrence_id)
        return value if isinstance(value, dict) else {}
    return next(
        (row for row in rows if isinstance(row, dict) and row.get("occurrenceId") == occurrence_id),
        {},
    )

def _source_ports(result: dict[str, Any], trace: dict[str, Any]) -> list[str]:
    topology = result.get("topologyIndex") or {}
    occurrence_rows = topology.get("occurrences") or []
    if isinstance(occurrence_rows, dict):
        occurrence = occurrence_rows.get(trace.get("occurrenceId")) or {}
    else:
        occurrence = next(
            (row for row in occurrence_rows if row.get("occurrenceId") == trace.get("occurrenceId")), {}
        )
    explicit = occurrence.get("sourcePortIds") or occurrence.get("exactSourcePortIds") or []
    if explicit:
        return sorted({str(value) for value in explicit if str(value)})
    ports = topology.get("sourcePorts") or []
    result_ids = []
    for row in ports if isinstance(ports, list) else []:
        if row.get("sourceEntityId") == trace.get("sourceEntityId"):
            logical = row.get("logicalNodeId") or row.get("ownerLogicalNodeId")
            if not logical or logical == trace.get("logicalNodeId"):
                value = row.get("sourcePortId") or row.get("id")
                if value:
                    result_ids.append(str(value))
    return sorted(set(result_ids))


def _projection_summary(rows, node_mismatches, unaccounted):
    dispositions = {}
    for row in rows:
        key = row["disposition"]
        dispositions[key] = dispositions.get(key, 0) + 1
    return {
        "emittedOccurrenceCount": sum(row["sourceDisposition"] == "EMITTED" for row in rows),
        "reservedOccurrenceCount": sum(row["sourceDisposition"] == "RESERVED" for row in rows),
        "projectedOccurrenceCount": dispositions.get("PROJECTED", 0),
        "intentionallyOmittedOccurrenceCount": sum(
            count for name, count in dispositions.items() if name.startswith("INTENTIONALLY_OMITTED")
        ),
        "blockedOccurrenceCount": dispositions.get("BLOCKED", 0),
        "nodeNumberMismatchCount": node_mismatches,
        "unaccountedOccurrenceCount": unaccounted,
    }


def _loss_rows(rows):
    return {
        "projected": [row["occurrenceId"] for row in rows if row["disposition"] == "PROJECTED"],
        "intentionallyOmitted": [
            row["occurrenceId"] for row in rows
            if row["disposition"].startswith("INTENTIONALLY_OMITTED")
        ],
        "defaulted": [],
        "blocked": [row["occurrenceId"] for row in rows if row["disposition"] == "BLOCKED"],
        "reserved": [row["occurrenceId"] for row in rows if row["disposition"] == "RESERVED"],
        "unexplained": [],
    }


def loss_accounting(ledger):
    if not isinstance(ledger, dict):
        return {"projected": [], "intentionallyOmitted": [], "defaulted": [], "blocked": [], "reserved": [], "unexplained": []}
    return deepcopy(ledger.get("lossAccounting") or {})


def summary_value(ledger, field):
    return int(((ledger or {}).get("summary") or {}).get(field, 0))


def _blocking(code: str, occurrence_id: str, context: dict[str, Any] | None = None):
    return {
        "severity": "BLOCKING", "code": code,
        "message": f"{code} for occurrence {occurrence_id}.",
        "context": {"occurrenceId": occurrence_id, **(context or {})},
    }


def _duplicate_values(values):
    seen, duplicate = set(), set()
    for value in values:
        if value in seen:
            duplicate.add(value)
        else:
            seen.add(value)
    return sorted(value for value in duplicate if value is not None)



def validate_projection_ledger(value: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if value.get("schema") != "TopoEnrichedXmlCiiProjectionLedger.v1":
        errors.append("schema must be TopoEnrichedXmlCiiProjectionLedger.v1")
    if value.get("status") not in {"PASS", "BLOCKED"}:
        errors.append("status must be PASS or BLOCKED")
    records = value.get("records")
    if not isinstance(records, list):
        return errors + ["records must be an array"]
    ids = [str(row.get("recordId") or "") for row in records]
    occurrences = [str(row.get("occurrenceId") or "") for row in records]
    if any(not item for item in ids) or len(ids) != len(set(ids)):
        errors.append("recordId values must be nonblank and unique")
    if any(not item for item in occurrences) or len(occurrences) != len(set(occurrences)):
        errors.append("occurrenceId values must be nonblank and unique")
    cii = [row.get("ciiElementIndex") for row in records if row.get("disposition") == "PROJECTED"]
    if len(cii) != len(set(cii)):
        errors.append("projected CII element indexes must be unique")
    summary = value.get("summary") or {}
    if summary.get("unaccountedOccurrenceCount") != 0 and value.get("status") == "PASS":
        errors.append("PASS requires zero unaccounted occurrences")
    if summary.get("nodeNumberMismatchCount") != 0 and value.get("status") == "PASS":
        errors.append("PASS requires zero node-number mismatches")
    loss = value.get("lossAccounting") or {}
    if loss.get("unexplained") and value.get("status") == "PASS":
        errors.append("PASS requires zero unexplained losses")
    expected_hash = json_hash({key: item for key, item in value.items() if key != "projectionLedgerHashSha256"})
    if value.get("projectionLedgerHashSha256") != expected_hash:
        errors.append("projectionLedgerHashSha256 mismatch")
    return errors


__all__ = [
    "LedgerBuildBlocked", "build_te014_projection_ledger", "loss_accounting",
    "summary_value", "validate_projection_ledger",
]
