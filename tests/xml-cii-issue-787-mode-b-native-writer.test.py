#!/usr/bin/env python3
import importlib.util
import json
import sys
from pathlib import Path


def load_writer(root: Path):
    path = root / "converters" / "scripts" / "xml_to_cii2019.py"
    spec = importlib.util.spec_from_file_location("xml_to_cii2019_issue787_modeb04", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load native writer: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def normalized_ref(value):
    return str(value or "").strip().lstrip("=").replace(" ", "")


def find_node(document, component_ref):
    wanted = normalized_ref(component_ref)
    for branch in document.branches:
        for node in branch.nodes:
            if normalized_ref(node.component_ref_no) == wanted:
                return branch, node
    raise AssertionError(f"Missing native-writer node for ComponentRefNo {component_ref}")


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: test.py <materialized.xml> <evidence.json>")
    root = Path(__file__).resolve().parents[1]
    xml_path = Path(sys.argv[1]).resolve()
    evidence = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    writer = load_writer(root)
    document = writer._parse_xml_document(xml_path)
    model = writer._build_conversion_model(document)

    aliases = evidence.get("aliases") or []
    assert len(aliases) == 1, f"expected exactly one runtime junction alias, got {len(aliases)}"
    alias = aliases[0]
    junction = int(alias["renderedNodeNumber"])

    upstream_branch, upstream = find_node(document, "1006649732/121515")
    downstream_branch, downstream = find_node(document, "1006649732/121345")
    _, weak = find_node(document, "1006649732/121346")
    assert upstream.node_number == junction, (upstream.node_number, junction)
    assert downstream.node_number == junction, (downstream.node_number, junction)
    assert weak.node_number > 0 and weak.node_number != junction
    assert "S8810010" in upstream_branch.branch_name
    assert "S8811956" in downstream_branch.branch_name

    upstream_edges = [edge for edge in model.edges if edge.branch_name == upstream_branch.branch_name]
    downstream_edges = [edge for edge in model.edges if edge.branch_name == downstream_branch.branch_name]
    assert any(edge.to_node.node_number == junction for edge in upstream_edges), "upstream branch must terminate at accepted junction"
    assert any(edge.from_node.node_number == junction for edge in downstream_edges), "downstream branch must start from accepted junction"
    assert model.degrees[junction] >= 2, f"native writer must connect both routes at junction {junction}"

    type14 = [
        restraint for restraint in model.restraints
        if any(spec.type_code == 14 for spec in restraint.specs)
    ]
    assert len(type14) >= 2, "explicit +Y restraints must remain native-writer type 14 authority"

    print(json.dumps({
        "junctionNodeNumber": junction,
        "upstreamBranch": upstream_branch.branch_name,
        "downstreamBranch": downstream_branch.branch_name,
        "junctionDegree": model.degrees[junction],
        "nativeEdgeCount": len(model.edges),
        "type14RestraintCount": len(type14),
        "weakCoincidentNodeNumber": weak.node_number,
    }, indent=2))


if __name__ == "__main__":
    main()
