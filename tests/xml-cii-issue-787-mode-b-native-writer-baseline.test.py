#!/usr/bin/env python3
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

TARGET_REF = "1006657924/45669"


def load_writer(root: Path):
    path = root / "converters" / "scripts" / "xml_to_cii2019.py"
    spec = importlib.util.spec_from_file_location("xml_to_cii2019_issue787_modeb04_baseline", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load native writer: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def normalized_ref(value):
    return str(value or "").strip().lstrip("=").replace(" ", "")


def target_occurrences(document, degrees):
    rows = []
    for branch in document.branches:
        for node in branch.nodes:
            if normalized_ref(node.component_ref_no) != TARGET_REF:
                continue
            rows.append({
                "branchName": branch.branch_name,
                "nodeNumber": node.node_number,
                "nodeName": node.node_name,
                "componentRefNo": node.component_ref_no,
                "degree": degrees[node.node_number],
                "position": list(node.position),
                "hasExplicitRestraint": bool(node.restraint_specs),
            })
    return rows


def restraint_summary(writer, path: Path):
    writer.DROPPED_SHORT_ELEMENT_NODES.clear()
    document = writer._parse_xml_document(path)
    edges = writer._build_edges(document.branches)
    degrees = writer._build_degree_map(edges)
    explicit = writer._build_explicit_restraint_specs(document.branches)
    node_specs = set(explicit)
    if document.metadata.restrain_open_ends:
        node_specs.update(node_number for node_number, degree in degrees.items() if degree == 1)
    result = {
        "path": path.name,
        "branchCount": len(document.branches),
        "edgeCount": len(edges),
        "explicitRestraintNodeCount": len(explicit),
        "generatedOpenEndNodeCount": len(node_specs - set(explicit)),
        "droppedShortNodeCount": len(writer.DROPPED_SHORT_ELEMENT_NODES),
        "targetRef": TARGET_REF,
        "targetOccurrences": target_occurrences(document, degrees),
    }
    try:
        model = writer._build_conversion_model(document)
        result.update({"modelStatus": "PASS", "modelRestraintCount": len(model.restraints)})
        return result
    except Exception as exc:
        result.update({"modelStatus": "FAIL", "errorType": type(exc).__name__, "error": str(exc)})

    occupied = {}
    assigned = set()
    collisions = []

    def restraint_kind(node_number):
        return "EXPLICIT" if node_number in explicit else "GENERATED_OPEN_END"

    def note(edge_index, node, phase):
        if node.node_number not in node_specs or node.node_number in assigned:
            return False
        prior = occupied.get(edge_index)
        if prior is not None:
            collisions.append({
                "edgeNumber": edge_index + 1,
                "phase": phase,
                "existingNodeNumber": prior["nodeNumber"],
                "incomingNodeNumber": node.node_number,
                "existingRestraintKind": prior["restraintKind"],
                "incomingRestraintKind": restraint_kind(node.node_number),
                "existingNodeName": prior["nodeName"],
                "incomingNodeName": node.node_name,
                "existingComponentRefNo": prior["componentRefNo"],
                "incomingComponentRefNo": node.component_ref_no,
                "branchName": edges[edge_index].branch_name,
                "fromNodeNumber": edges[edge_index].from_node.node_number,
                "toNodeNumber": edges[edge_index].to_node.node_number,
                "fromNodeName": edges[edge_index].from_node.node_name,
                "toNodeName": edges[edge_index].to_node.node_name,
                "fromComponentRefNo": edges[edge_index].from_node.component_ref_no,
                "toComponentRefNo": edges[edge_index].to_node.component_ref_no,
            })
            return False
        occupied[edge_index] = {
            "nodeNumber": node.node_number,
            "nodeName": node.node_name,
            "componentRefNo": node.component_ref_no,
            "restraintKind": restraint_kind(node.node_number),
        }
        assigned.add(node.node_number)
        return True

    for edge_index, edge in enumerate(edges):
        if note(edge_index, edge.to_node, "forward-to"):
            continue
        if degrees[edge.from_node.node_number] == 1:
            note(edge_index, edge.from_node, "forward-open-from")
    for node_number in sorted(node_specs):
        if node_number in assigned:
            continue
        for edge_index, edge in enumerate(edges):
            if edge.to_node.node_number == node_number and note(edge_index, edge.to_node, "unresolved-to"):
                break
            if edge.from_node.node_number == node_number and note(edge_index, edge.from_node, "unresolved-from"):
                break

    result["collisions"] = collisions
    result["collisionCount"] = len(collisions)
    result["edgeDegreeHistogram"] = dict(sorted(Counter(degrees.values()).items()))
    return result


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: baseline.test.py <materialized.xml>")
    root = Path(__file__).resolve().parents[1]
    corpus = root / "Benchmarks" / "XML-CII-2019"
    cases = [
        corpus / "SYS-6-S8810010-01.xml",
        corpus / "SYS-6-S8810011-01.xml",
        corpus / "SYS-S8811956-01.xml",
        corpus / "SYS-001_Single.xml",
        Path(sys.argv[1]).resolve(),
    ]
    writer = load_writer(root)
    results = [restraint_summary(writer, path) for path in cases]
    print(json.dumps(results, indent=2, sort_keys=True))

    for baseline in results[:-1]:
        assert baseline["modelStatus"] == "PASS", f"baseline native writer must pass: {baseline}"
    source_0011 = next(row for row in results if row["path"] == "SYS-6-S8810011-01.xml")
    assert len(source_0011["targetOccurrences"]) >= 2, source_0011["targetOccurrences"]
    assert len({row["nodeNumber"] for row in source_0011["targetOccurrences"]}) == 1, source_0011["targetOccurrences"]
    assert all(row["degree"] > 1 for row in source_0011["targetOccurrences"]), source_0011["targetOccurrences"]

    modeb = results[-1]
    assert modeb["modelStatus"] == "FAIL", "diagnostic currently expects the reproduced Mode B native-writer failure"
    assert "multiple restraints" in modeb.get("error", "").lower()
    assert modeb.get("collisions"), "must identify the concrete restraint/edge collision behind the failure"
    assert any(row["edgeNumber"] == 58 for row in modeb["collisions"]), modeb["collisions"]
    assert len({row["nodeNumber"] for row in modeb["targetOccurrences"]}) > 1, modeb["targetOccurrences"]
    assert any(row["degree"] == 1 for row in modeb["targetOccurrences"]), modeb["targetOccurrences"]


if __name__ == "__main__":
    main()
