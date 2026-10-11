#!/usr/bin/env python3
"""NEXT-06D test-only raw-original / retained-model runtime probe.

Imports and invokes the actual unmodified native runtime with the same CLI
configuration as NEXT-06C. Wrappers ONLY observe returned objects. The runtime
and production Python source files are never changed or rewritten.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import traceback
import xml.etree.ElementTree as ET

def local(tag):
    return str(tag).split("}")[-1]

def field(node, name):
    for child in node:
        if local(child.tag) == name:
            return (child.text or "").strip()
    return ""

def raw_unfiltered(path):
    """Count every original Restraint tag, even if converter audit omits it."""
    root = ET.parse(path).getroot()  # Bad XML must not become zero rows.
    rows, node_count, negative = [], 0, 0
    branches = [e for e in root.iter() if local(e.tag) == "Branch"]
    for bi, branch in enumerate(branches, 1):
        bn = field(branch, "Branchname")
        nodes = [n for n in branch if local(n.tag) == "Node"]
        for ni, node in enumerate(nodes, 1):
            node_count += 1
            number = field(node, "NodeNumber")
            if number == "-1":
                negative += 1
            name, raw_pos = field(node, "NodeName"), field(node, "Position")
            tokens = raw_pos.split()
            try:
                xyz = [float(t) for t in tokens] if len(tokens) == 3 else None
                if xyz is not None and not all(math.isfinite(v) for v in xyz):
                    xyz = None
            except ValueError:
                xyz = None
            restraints = [r for r in node if local(r.tag) == "Restraint"]
            for ri, restraint in enumerate(restraints, 1):
                type_text = field(restraint, "Type")
                issues = []
                if not name:
                    issues.append("EMPTY_NODE_NAME")
                if xyz is None:
                    issues.append("INVALID_POSITION")
                if not type_text:
                    issues.append("EMPTY_RESTRAINT_TYPE")
                rows.append({
                    "occurrenceId": f"branch[{bi}]/node[{ni}]/restraint[{ri}]",
                    "sourcePath": f"/PipeStressExport/Pipe/Branch[{bi}]/Node[{ni}]/Restraint[{ri}]",
                    "branchOrdinal": bi, "nodeOrdinal": ni, "restraintOrdinal": ri,
                    "branchName": bn, "nodeNumber": number, "nodeName": name,
                    "positionRaw": raw_pos, "position": xyz, "type": type_text,
                    "auditAdmissionIssues": issues,
                })
    if len({x["occurrenceId"] for x in rows}) != len(rows):
        raise ValueError("DUPLICATE_ORIGINAL_OCCURRENCE_KEY")
    return {"branches": len(branches), "nodes": node_count,
            "minusOne": negative, "restraints": rows}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    args = parser.parse_args()
    original = raw_unfiltered(args.input)
    # The production converter's sys.path contains this directory when invoked
    # as a script; reproduce that import resolution exactly.
    script_dir = str(Path(__file__).resolve().parents[2] / "converters" / "scripts")
    sys.path.insert(0, script_dir)
    import xml_to_cii2019_runtime_custody as runtime

    captured = {"retainedBranches": [], "assignments": [],
                "edgeToRestantIndex": {}, "auditEvents": [],
                "droppedShortNodes": [], "error": None}
    actual_parse = runtime.base._parse_xml_document
    actual_build = runtime.patched._build_conversion_model

    def observe_parse(*a, **kw):
        document = actual_parse(*a, **kw)
        captured["retainedBranches"] = [{
            "branchName": branch.branch_name,
            "retainedOrdinal": bi + 1,
            "nodes": [{
                "retainedNodeOrdinal": ni + 1,
                "nodeNumber": int(node.node_number),
                "nodeName": str(node.node_name or ""),
                "position": list(node.position),
                "typeCodes": [int(round(float(s.type_code))) for s in node.restraint_specs],
                "sourceNodeNumber": node.source_node_number,
            } for ni, node in enumerate(branch.nodes)]
        } for bi, branch in enumerate(document.branches)]
        return document

    def observe_build(*a, **kw):
        model = actual_build(*a, **kw)
        captured["assignments"] = [{
            "blockOrdinal": i + 1,
            "nodeNumber": int(assigned.node_number),
            "nodeName": str(assigned.node_name or ""),
            "position": list(assigned.position),
            "specs": [{
                "slotOrdinal": j + 1,
                "typeCode": int(round(float(spec.type_code))),
                "isSyntheticOpenEnd": bool(spec.is_open_end),
            } for j, spec in enumerate(assigned.specs)]
        } for i, assigned in enumerate(model.restraints)]
        captured["edgeToRestantIndex"] = {
            str(k): int(v) for k, v in model.edge_to_restraint_index.items()
        }
        captured["elementCount"] = len(model.edges)
        return model

    runtime.base._parse_xml_document = observe_parse
    runtime.patched._build_conversion_model = observe_build
    sys.argv = ["xml_to_cii2019_runtime_custody.py", "--input",
                str(args.input), "--output", str(args.output),
                "--coords-mode", "first", "--weight-scale", "10"]
    try:
        runtime.main()
    except Exception as error:
        captured["error"] = {"type": type(error).__name__,
                             "message": str(error),
                             "traceback": traceback.format_exc()}
    finally:
        # The raw audit events are the full in-process list, not a truncated
        # log tail or an inference from absence of stderr text.
        captured["auditEvents"] = list(runtime.EXPLICIT_RESTRAINT_CUSTODY_EVENTS)
        captured["droppedShortNodes"] = list(runtime.base.DROPPED_SHORT_ELEMENT_NODES)
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps({
            "schema": "LFJ.NEXT06D.NativeRetainedProbe.v1",
            "qualification": "TEST_ONLY_NOT_OWNER_APPROVAL",
            "original": original, "runtime": captured,
        }, indent=2, default=str) + "\n", encoding="utf8")
    if captured["error"]:
        print("NEXT06D_NATIVE_ERROR " + captured["error"]["message"], file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
