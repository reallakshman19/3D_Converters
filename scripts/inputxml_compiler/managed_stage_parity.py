#!/usr/bin/env python3
"""Independent parsed-InputXML, SVG, parity-report, and metric reconciliation."""
from __future__ import annotations

from collections import Counter
from typing import Any

from .base import DecisionLedger
from .managed_stage_diagnostics import block
from .managed_stage_policy import component_policy


def verify_parity_and_metrics(
    result: dict[str, Any],
    source: dict[str, Any],
    topology: dict[str, Any],
    engineering: dict[str, Any],
    ledger: DecisionLedger,
) -> dict[str, Any]:
    parsed = result["parsedInputXmlTopology"]
    scene = result["topologySvgScene"]
    report = result["topologyParityReport"]
    _verify_parsed(parsed, topology, ledger)
    _verify_scene(scene, topology, ledger)
    _verify_report(report, parsed, scene, topology, ledger)
    expected_metrics = _recompute_metrics(
        result,
        source,
        topology,
        engineering,
        parsed,
        scene,
        report,
    )
    _require_subset_equal(result.get("metrics"), expected_metrics, "metrics", ledger)
    ledger.add(
        source_entity_id="managed-stage-parity-metrics",
        source_type="MANAGED_STAGE_PARITY_METRIC_CLOSURE",
        source_fields={
            "parityStatus": report.get("status"),
            "mismatchCount": len(report.get("mismatches") or []),
            "metrics": expected_metrics,
        },
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION",
        evidence=[
            "parsed InputXML and SVG populations were compared directly to canonical arrays",
            "every producer metric was independently recomputed from structured evidence",
        ],
    )
    return expected_metrics


def _verify_parsed(
    parsed: dict[str, Any],
    topology: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    nodes = _object_array(parsed.get("nodes"), "parsedInputXmlTopology.nodes", ledger)
    elements = _object_array(parsed.get("elements"), "parsedInputXmlTopology.elements", ledger)
    restraints = _object_array(parsed.get("restraints"), "parsedInputXmlTopology.restraints", ledger)
    rigids = _object_array(parsed.get("rigids"), "parsedInputXmlTopology.rigids", ledger)
    issues = _object_array(parsed.get("issues"), "parsedInputXmlTopology.issues", ledger)
    if issues:
        _inputxml_block(ledger, "Parsed InputXML topology contains parser issues.")
    canonical_nodes = topology["indexes"]["nodes"]
    canonical_edges = topology["indexes"]["edges"]
    if len(nodes) != len(canonical_nodes) or len(elements) != len(canonical_edges):
        _inputxml_block(ledger, "Parsed InputXML node/edge populations differ from canonical topology.")
    element_ids = [str(row.get("inputXmlElementId") or row.get("id") or "") for row in elements]
    if len(element_ids) != len(set(element_ids)):
        _inputxml_block(ledger, "Parsed InputXML contains duplicate element IDs.")
    by_edge = {str(row.get("canonicalEdgeId") or ""): row for row in elements}
    if set(by_edge) != set(canonical_edges):
        _inputxml_block(ledger, "Parsed InputXML canonical-edge population is incomplete or extra.")
    for edge_id, edge in canonical_edges.items():
        row = by_edge[edge_id]
        from_node = canonical_nodes[str(edge["fromNodeId"])]
        to_node = canonical_nodes[str(edge["toNodeId"])]
        expected = {
            "inputXmlElementId": str(edge["inputXmlElementIds"][0]),
            "fromCanonicalNodeId": str(edge["fromNodeId"]),
            "toCanonicalNodeId": str(edge["toNodeId"]),
            "fromNode": str(from_node["inputXmlNodeIds"][0]),
            "toNode": str(to_node["inputXmlNodeIds"][0]),
            "sourceEntityIds": edge.get("sourceEntityIds") or [],
            "sourcePortIds": edge.get("sourcePortIds") or [],
            "projectionCardinality": edge.get("projectionCardinality") or "ONE_TO_ONE",
            "mergeAuthority": edge.get("projectionMergeAuthority") or "",
        }
        for field, value in expected.items():
            actual = row.get(field)
            if field in {"sourceEntityIds", "sourcePortIds"}:
                if set(actual or []) != set(value):
                    _inputxml_block(ledger, f"Parsed InputXML edge {edge_id} has wrong {field}.")
            elif actual != value:
                _inputxml_block(ledger, f"Parsed InputXML edge {edge_id} has wrong {field}.")
        if not _same_position(row.get("fromPosition"), from_node.get("position"), 3):
            _inputxml_block(ledger, f"Parsed InputXML edge {edge_id} has wrong FROM global coordinates.")
        if not _same_position(row.get("toPosition"), to_node.get("position"), 3):
            _inputxml_block(ledger, f"Parsed InputXML edge {edge_id} has wrong TO global coordinates.")
        expected_delta = {
            axis: round(float(to_node["position"][axis]) - float(from_node["position"][axis]), 6)
            for axis in ("x", "y", "z")
        }
        if not _same_position(row.get("delta"), expected_delta, 6):
            _inputxml_block(ledger, f"Parsed InputXML edge {edge_id} has wrong delta.")
    expected_restraints = sum(
        len(row.get("restraints") or [])
        for row in topology["collections"]["supports"]
    )
    expected_rigids = len({str(row.get("edgeId") or "") for row in topology["collections"]["rigids"]})
    if len(restraints) != expected_restraints or len(rigids) != expected_rigids:
        _inputxml_block(ledger, "Parsed InputXML support/rigid child populations differ from canonical ownership.")


def _verify_scene(
    scene: dict[str, Any],
    topology: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    pairs = (
        ("nodes", "nodes", "canonicalNodeId"),
        ("edges", "edges", "canonicalEdgeId"),
        ("supports", "supports", "canonicalSupportId"),
        ("junctions", "junctions", "canonicalJunctionId"),
        ("boundaries", "boundaries", "canonicalBoundaryId"),
        ("pointFeatures", "pointFeatures", "canonicalPointFeatureId"),
    )
    for scene_field, canonical_field, identity_field in pairs:
        rows = _object_array(scene.get(scene_field), f"topologySvgScene.{scene_field}", ledger)
        canonical = topology["collections"][canonical_field]
        actual_ids = [str(row.get(identity_field) or row.get("id") or "") for row in rows]
        expected_ids = [str(row.get("id") or "") for row in canonical]
        if actual_ids != expected_ids:
            _parity_block(ledger, f"SVG {scene_field} population/order differs from canonical topology.")
    edge_by_id = {
        str(row.get("canonicalEdgeId") or ""): row
        for row in scene.get("edges") or []
    }
    for edge in topology["collections"]["edges"]:
        row = edge_by_id[str(edge["id"])]
        if row.get("fromCanonicalNodeId") != edge.get("fromNodeId") or row.get("toCanonicalNodeId") != edge.get("toNodeId"):
            _parity_block(ledger, f"SVG edge {edge['id']} incidence differs from canonical topology.")


def _verify_report(
    report: dict[str, Any],
    parsed: dict[str, Any],
    scene: dict[str, Any],
    topology: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    mismatches = _object_array(report.get("mismatches"), "topologyParityReport.mismatches", ledger)
    if report.get("ok") is not True or report.get("status") != "PASS" or mismatches:
        _parity_block(ledger, "Producer topology parity report is failed or contains mismatches.")
    summary = report.get("summary")
    if not isinstance(summary, dict):
        _parity_block(ledger, "Topology parity summary is missing.")
    expected = {
        "canonicalNodes": len(topology["collections"]["nodes"]),
        "canonicalEdges": len(topology["collections"]["edges"]),
        "inputXmlNodes": len(parsed.get("nodes") or []),
        "inputXmlElements": len(parsed.get("elements") or []),
        "svgNodes": len(scene.get("nodes") or []),
        "svgEdges": len(scene.get("edges") or []),
        "topologyMismatchCount": 0,
        "mismatches": 0,
    }
    for field, value in expected.items():
        if summary.get(field) != value:
            _parity_block(ledger, f"Topology parity summary {field} is inconsistent with returned arrays.")


def _recompute_metrics(
    result: dict[str, Any],
    source: dict[str, Any],
    topology: dict[str, Any],
    engineering: dict[str, Any],
    parsed: dict[str, Any],
    scene: dict[str, Any],
    report: dict[str, Any],
) -> dict[str, Any]:
    entities = list(source["entityById"].values())
    components = [row for row in entities if row["sourceType"] != "BRANCH"]
    categories = Counter(component_policy(row["sourceType"]).category for row in components)
    trace_rows = list(topology["traceByEntity"].values())
    references = _reference_counts(source, components)
    canonical = topology["collections"]
    supports = canonical["supports"]
    rigids = canonical["rigids"]
    return {
        "source": {
            "branches": len(entities) - len(components),
            "childRecords": len(components),
            "routeComponents": sum(
                categories[name]
                for name in ("PIPE", "ELBO/BEND", "TEE", "VALVE", "FLANGE", "GASK", "INST", "REDUCER")
            ),
            "supports": categories["SUPPORT"],
            "componentCounts": dict(categories),
        },
        "references": references,
        "canonical": {
            "nodes": len(canonical["nodes"]),
            "edges": len(canonical["edges"]),
            "pointFeatures": len(canonical["pointFeatures"]),
            "junctions": len(canonical["junctions"]),
            "boundaries": len(canonical["boundaries"]),
            "supports": len(supports),
            "rigids": len(rigids),
            "zeroLengthEdges": 0,
        },
        "ledger": {
            "records": len(trace_rows),
            "routeRecords": sum(1 for row in trace_rows if row.get("primaryDisposition") == "EMIT_ROUTE_EDGE"),
            "blockedRecords": sum(1 for row in trace_rows if row.get("status") == "ERROR" or row.get("primaryDisposition") == "BLOCK_AMBIGUOUS"),
            "deferredSupports": sum(1 for row in trace_rows if row.get("primaryDisposition") == "DEFER_SUPPORT"),
        },
        "engineering": {
            "supports": len(result["engineeringProjection"].get("supports") or []),
            "restraints": sum(len(row.get("restraints") or []) for row in result["engineeringProjection"].get("supports") or []),
            "rigids": len(result["engineeringProjection"].get("rigids") or []),
        },
        "inputXml": {
            "elements": len(canonical["edges"]),
            "restraints": sum(len(row.get("restraints") or []) for row in supports),
            "rigids": len({str(row.get("edgeId") or "") for row in rigids}),
            "rigidBodies": len(rigids),
        },
        "parsedInputXml": {
            "nodes": len(parsed.get("nodes") or []),
            "elements": len(parsed.get("elements") or []),
            "restraints": len(parsed.get("restraints") or []),
            "rigids": len(parsed.get("rigids") or []),
            "parseIssues": len(parsed.get("issues") or []),
        },
        "svgScene": scene.get("summary") or {},
        "parity": report.get("summary") or {},
    }


def _reference_counts(source: dict[str, Any], components: list[dict[str, Any]]) -> dict[str, int]:
    branch_names = {
        str(row.get("name") or "").strip()
        for row in source["entityById"].values()
        if row["sourceType"] == "BRANCH"
    }
    aliases = {
        text
        for row in components
        for text in (str(row.get("sourceRef") or "").strip(), str(row.get("name") or "").strip())
        if text
    }
    branch_refs: list[str] = []
    cref: list[str] = []
    for row in source["entityById"].values():
        attrs = row.get("attributes") or {}
        if row["sourceType"] == "BRANCH":
            branch_refs.extend(str(attrs.get(key) or "").strip() for key in ("HREF", "TREF") if str(attrs.get(key) or "").strip())
        else:
            value = str(attrs.get("CREF") or "").strip()
            if value:
                cref.append(value)
    return {
        "cref": len(cref),
        "resolvedCref": sum(value in branch_names for value in cref),
        "hrefTref": len(branch_refs),
        "resolvedHrefTref": sum(value in branch_names or value in aliases for value in branch_refs),
        "externalReferences": sum(value not in branch_names and value not in aliases for value in branch_refs),
    }


def _require_subset_equal(actual: Any, expected: dict[str, Any], path: str, ledger: DecisionLedger) -> None:
    if not isinstance(actual, dict):
        _metric_block(ledger, f"{path} must be an object.")
    for key, value in expected.items():
        field = f"{path}.{key}"
        current = actual.get(key)
        if isinstance(value, dict):
            _require_subset_equal(current, value, field, ledger)
        elif current != value:
            _metric_block(ledger, f"Metric {field} differs from independently recomputed evidence.")


def _same_position(actual: Any, expected: Any, decimals: int) -> bool:
    if not isinstance(actual, dict) or not isinstance(expected, dict):
        return False
    try:
        return all(round(float(actual[axis]), decimals) == round(float(expected[axis]), decimals) for axis in ("x", "y", "z"))
    except (KeyError, TypeError, ValueError):
        return False


def _object_array(value: Any, name: str, ledger: DecisionLedger) -> list[dict[str, Any]]:
    if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
        block(ledger, "MANAGED_STAGE_ARTIFACT_SCHEMA_INVALID", f"{name} must be an object array.", name)
    return value


def _inputxml_block(ledger: DecisionLedger, message: str) -> None:
    block(ledger, "MANAGED_STAGE_INPUTXML_RELATION_MISMATCH", message, "parsedInputXmlTopology")


def _parity_block(ledger: DecisionLedger, message: str) -> None:
    block(ledger, "MANAGED_STAGE_PARITY_FAILED", message, "topologyParityReport")


def _metric_block(ledger: DecisionLedger, message: str) -> None:
    block(ledger, "MANAGED_STAGE_METRIC_MISMATCH", message, "metrics")


__all__ = ["verify_parity_and_metrics"]
