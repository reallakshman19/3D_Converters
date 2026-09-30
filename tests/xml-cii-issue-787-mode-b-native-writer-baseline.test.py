#!/usr/bin/env python3
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path


def load_writer(root: Path):
    path = root / "converters" / "scripts" / "xml_to_cii2019.py"
    spec = importlib.util.spec_from_file_location("xml_to_cii2019_issue787_modeb04_baseline", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load native writer: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def restraint_summary(writer, path: Path):
    writer.DROPPED_SHORT_ELEMENT_NODES.clear()
    document = writer._parse_xml_document(path)
    edges = writer._build_edges(document.branches)
    degrees = writer._build_degree_map(edges)
    explicit = writer._build_explicit_restraint_specs(document.branches)
    result = {
        "path": path.name,
        "branchCount": len(document.branches),
        "edgeCount": len(edges),
        "explicitRestraintNodeCount": len(explicit),
        "droppedShortNodeCount": len(writer.DROPPED_SHORT_ELEMENT_NODES),
    }
    try:
        model = writer._build_conversion_model(document)
        result.update({"modelStatus": "PASS", "modelRestraintCount": len(model.restraints)})
        return result
    except Exception as exc:  # diagnostic classification must retain exact native failure
        result.update({"modelStatus": "FAIL", "errorType": type(exc).__name__, "error": str(exc)})

    occupied = {}
    assigned = set()
    collisions = []

    def note(edge_index, node, phase):
        specs = explicit.get(node.node_number)
        if not specs or node.node_number in assigned:
            return False
        prior = occupied.get(edge_index)
        if prior is not None:
            collisions.append({
                "edgeNumber": edge_index + 1,
                "phase": phase,
                "existingNodeNumber": prior["nodeNumber"],
                "incomingNodeNumber": node.node_number,
                "existingNodeName": prior["nodeName"],
                "incomingNodeName": node.node_name,
                "existingComponentRefNo": prior["componentRefNo"],
                "incomingComponentRefNo": node.component_ref_no,
                "branchName": edges[edge_index].branch_name,
                "fromNodeNumber": edges[edge_index].from_node.node_number,
                "toNodeNumber": edges[edge_index].to_node.node_number,
            })
            return False
        occupied[edge_index] = {
            "nodeNumber": node.node_number,
            "nodeName": node.node_name,
            "componentRefNo": node.component_ref_no,
        }
        assigned.add(node.node_number)
        return True

    for edge_index, edge in enumerate(edges):
        if note(edge_index, edge.to_node, "forward-to"):
            continue
        if degrees[edge.from_node.node_number] == 1:
            note(edge_index, edge.from_node, "forward-open-from")
    for node_number in explicit:
        if node_number in assigned:
            continue
        for edge_index, edge in enumerate(edges):
            if edge.to_node.node_number == node_number:
                if note(edge_index, edge.to_node, "unresolved-to"):
                    break
            if edge.from_node.node_number == node_number:
                if note(edge_index, edge.from_node, "unresolved-from"):
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

    modeb = results[-1]
    assert modeb["modelStatus"] == "FAIL", "diagnostic currently expects the reproduced Mode B native-writer failure"
    assert "multiple restraints" in modeb.get("error", "").lower()
    assert modeb.get("collisions"), "must identify the concrete restraint/edge collision behind the failure"


if __name__ == "__main__":
    main()
