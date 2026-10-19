#!/usr/bin/env python3
"""Owner-local non-releasing observation of the ACTUAL native runtime model.

Calls the unchanged production Python runtime and intercepts its final CII
builder to record retained edges and emitted slot indices. The private witness
is authored by the runtime (NOT an independent engineering approval). Its
claims must be challenged against R2 and G5; never use as release authority.
"""
from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
NATIVE = ROOT / "converters" / "scripts"
sys.path.insert(0, str(NATIVE))
import xml_to_cii2019 as base
import xml_to_cii2019_runtime_custody as runtime

G5_SPEC = importlib.util.spec_from_file_location(
    "xml229_g5_observer", ROOT / "scripts" / "xml229-g5-native-element-lineage.py"
)
G5 = importlib.util.module_from_spec(G5_SPEC)
G5_SPEC.loader.exec_module(G5)


def require(flag, code):
    if not flag:
        raise ValueError(code)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean_number(value):
    value = Decimal(str(value))
    require(value.is_finite(), "NONFINITE_NATIVE_MODEL_VALUE")
    return str(value)


def record_node(node):
    return {
        "nativeNodeNumber": node.node_number,
        "sourceNodeNumber": (
            node.source_node_number
            if node.source_node_number is not None else node.node_number
        ),
        "componentType": node.component_type,
        "componentRefNo": node.component_ref_no,
        "endpoint": node.endpoint,
        "position": [clean_number(x) for x in node.position],
        "rigid": node.rigid,
        "weightKg": clean_number(node.weight),
    }


def observe(input_path, output_path, witness_path, scale):
    # Only the plain R2-engine XML path is permitted in this observer.
    require(input_path.resolve() != output_path.resolve() and
            output_path.resolve() != witness_path.resolve() and
            input_path.resolve() != witness_path.resolve(),
            "OVERLAPPING_OUTPUT_PATHS")
    input_bytes = input_path.read_bytes()
    original = base._build_cii_text
    captured = []

    def capture(model, *args, **kwargs):
        cii = original(model, *args, **kwargs)
        require(not captured, "MORE_THAN_ONE_NATIVE_MODEL")
        edges = []
        for index, edge in enumerate(model.edges):
            ridx = model.edge_to_rigid_index.get(index, 0)
            edges.append({
                "nativeElementIndex": index,
                "ciiFromNode": edge.from_node.node_number,
                "ciiToNode": edge.to_node.node_number,
                "branchName": edge.branch_name,
                "from": record_node(edge.from_node),
                "to": record_node(edge.to_node),
                "rigidRecordIndex": ridx - 1 if ridx else None,
            })
        captured.append((cii, edges))
        return cii

    base._build_cii_text = capture
    try:
        original_argv = sys.argv
        sys.argv = [
            str(NATIVE / "xml_to_cii2019_runtime_custody.py"),
            "--input", str(input_path),
            "--output", str(output_path),
            "--weight-scale", str(scale),
        ]
        try:
            runtime.main()
        finally:
            sys.argv = original_argv
    finally:
        base._build_cii_text = original
    require(len(captured) == 1 and output_path.is_file(),
            "NATIVE_MODEL_OR_OUTPUT_MISSING")
    cii, edges = captured[0]
    output = output_path.read_bytes()
    require(output == cii.encode("utf-8"), "NATIVE_CII_BYTES_DRIFT")
    native_edges, by_rigid = G5.parse_elements(cii)
    require(len(native_edges) == len(edges),
            "NATIVE_ELEMENTS_MODEL_COUNT_DRIFT")
    parts = G5.sections_from_output(cii)["RIGID"]
    factor = Decimal(str(scale))
    require(factor.is_finite() and factor > 0, "NATIVE_SCALE_INVALID")
    for index, (edge, emitted) in enumerate(zip(edges, native_edges)):
        a, b, ridx = emitted
        require((a, b, ridx) ==
                (edge["ciiFromNode"], edge["ciiToNode"], edge["rigidRecordIndex"]),
                "NATIVE_EDGE_POINTER_DRIFT")
        if ridx is None:
            continue
        require(by_rigid.get(ridx) == index and ridx < len(parts),
                "NATIVE_EDGE_SLOT_DRIFT")
        require(Decimal(parts[ridx].split()[0]) ==
                Decimal(edge["to"]["weightKg"]) * factor,
                "NATIVE_EDGE_MASS_DRIFT")
    witness = {
        "schema": "XML229.NativeRetainedEdgeObservation.v1",
        "evidenceKind": "OWNER_LOCAL_RUNTIME_MODEL_NOT_INDEPENDENT_AUTHORITY",
        "engineInputSha256": sha(input_bytes),
        "ciiSha256": sha(output),
        "weightScale": clean_number(scale),
        "edges": edges,
        "modelElementCount": len(edges),
        "modelRigidCount": len(parts),
        "verifiedClaimAuthor": False,
        "physicalMatch2ConsumptionVerified": False,
        "nativeCiiPhysicalSlotVerified": False,
        "nativeCiiReleaseAuthorized": False,
    }
    witness_path.write_text(json.dumps(witness, indent=2) + "\n", encoding="utf-8")
    print("XML229_NATIVE_RETAINED_OBSERVATION HELD; private witness written")


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--engine-xml", type=Path, required=True)
    cli.add_argument("--cii-out", type=Path, required=True)
    cli.add_argument("--private-witness-out", type=Path, required=True)
    cli.add_argument("--weight-scale", type=str, default="10")
    args = cli.parse_args()
    try:
        scale = Decimal(args.weight_scale)
    except (InvalidOperation, ValueError):
        raise ValueError("NATIVE_SCALE_INVALID") from None
    require(scale.is_finite() and scale > 0, "NATIVE_SCALE_INVALID")
    observe(args.engine_xml, args.cii_out, args.private_witness_out, scale)


if __name__ == "__main__":
    main()
