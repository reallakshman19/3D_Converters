"""XML229 non-releasing witness from the ACTUAL retained native model + CII bytes.

First-party runtime observation only. Never independent mass authority or release.
No inference that VALV, INST or FLAN has a CII RIGID mass owner.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
from pathlib import Path


def refuse(code):
    raise ValueError("XML229_NATIVE_WITNESS_" + code)


def number(value):
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        refuse("NUMBER_INVALID")
    if not result.is_finite():
        refuse("NUMBER_NONFINITE")
    return result


def parse_cii(cii_text):
    sections, current = {}, None
    for line in cii_text.splitlines():
        if line.startswith("#$ "):
            current = line[3:].strip()
            if not current or current in sections:
                refuse("SECTION_INVALID")
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line)
    if not all(key in sections for key in ("CONTROL", "ELEMENTS", "RIGID", "UNITS")):
        refuse("SECTIONS_MISSING")
    control = sections["CONTROL"]
    if len(control) != 4:
        refuse("CONTROL_INVALID")
    try:
        count = int(control[0].split()[0])
    except (IndexError, ValueError):
        refuse("CONTROL_INVALID")
    if count < 1 or len(sections["ELEMENTS"]) != 15 * count:
        refuse("ELEMENT_COUNT_DRIFT")
    if "N." not in [line.strip() for line in sections["UNITS"]]:
        refuse("FORCE_UNIT_UNVERIFIED")
    rigid = sections["RIGID"]
    pointers = []
    referenced = set()
    for index in range(count):
        block = sections["ELEMENTS"][index * 15:(index + 1) * 15]
        first, row13 = block[0].split(), block[12].split()
        if len(first) != 6 or len(row13) != 6:
            refuse("ELEMENT_FORMAT_INVALID")
        start, end = number(first[0]), number(first[1])
        if start != int(start) or end != int(end):
            refuse("ELEMENT_NODES_INVALID")
        try:
            pointer = int(row13[1])
        except ValueError:
            refuse("POINTER_INVALID")
        if pointer < 0 or pointer > len(rigid):
            refuse("POINTER_OUT_OF_RANGE")
        slot = pointer - 1 if pointer else None
        if slot is not None:
            if slot in referenced:
                refuse("DUPLICATE_RIGID_POINTER")
            referenced.add(slot)
        pointers.append((int(start), int(end), slot))
    if len(referenced) != len(rigid):
        refuse("ORPHAN_RIGID_SLOT")
    for record in rigid:
        fields = record.split()
        if len(fields) != 2:
            refuse("RIGID_FORMAT_INVALID")
        number(fields[0])
    return pointers, rigid


def _node(node):
    return {
        "nativeNodeNumber": int(node.node_number),
        "sourceNodeNumber": int(node.source_node_number)
        if node.source_node_number is not None else int(node.node_number),
        "componentType": node.component_type,
        "componentRefNo": node.component_ref_no,
        "endpoint": node.endpoint,
        "position": [float(v) for v in node.position],
        "rigid": node.rigid,
        "weightKg": float(node.weight),
    }


def build_witness(model, cii_text, *, weight_scale, engine_input_bytes):
    pointers, rigid = parse_cii(cii_text)
    factor = number(weight_scale)
    if factor <= 0 or len(pointers) != len(model.edges):
        refuse("MODEL_OR_SCALE_INVALID")
    edges = []
    for i, edge in enumerate(model.edges):
        start, end, slot = pointers[i]
        native_slot = model.edge_to_rigid_index.get(i, 0)
        expected_slot = native_slot - 1 if native_slot else None
        if (int(edge.from_node.node_number), int(edge.to_node.node_number),
                expected_slot) != (start, end, slot):
            refuse("MODEL_ELEMENT_POINTER_DRIFT")
        row = {
            "nativeElementIndex": i,
            "ciiFromNode": start,
            "ciiToNode": end,
            "branchName": edge.branch_name,
            "from": _node(edge.from_node),
            "to": _node(edge.to_node),
            "rigidRecordIndex": slot,
        }
        if slot is not None:
            expected_force = number(edge.to_node.weight) * factor
            observed_force = number(rigid[slot].split()[0])
            tolerance = max(Decimal("0.0001"), abs(expected_force) * Decimal("0.00001"))
            if abs(observed_force - expected_force) > tolerance:
                refuse("MODEL_RIGID_FORCE_DRIFT")
            row["rigidForce"] = str(observed_force)
        edges.append(row)
    return {
        "schema": "XML229.NativeRetainedCandidateWitness.v1",
        "evidenceKind": "FIRST_PARTY_RUNTIME_NOT_INDEPENDENT_AUTHORITY",
        "engineInputSha256": hashlib.sha256(engine_input_bytes).hexdigest(),
        "ciiSha256": hashlib.sha256(cii_text.encode("utf-8")).hexdigest(),
        "weightScale": str(factor),
        "modelElementCount": len(model.edges),
        "modelRigidCount": len(rigid),
        "edges": edges,
        "physicalMatch2ConsumptionVerified": False,
        "nativeCiiPhysicalSlotVerified": False,
        "nativeCiiReleaseAuthorized": False,
    }


def write_witness(path: Path, model, cii_text, *, weight_scale, engine_input):
    dest = Path(path)
    if dest.exists() or dest == Path(engine_input):
        refuse("DESTINATION_INVALID")
    proof = build_witness(model, cii_text, weight_scale=weight_scale,
                          engine_input_bytes=Path(engine_input).read_bytes())
    # Candidate sidecar is private to the isolated Pyodide virtual FS.
    dest.write_text(json.dumps(proof, separators=(",", ":"), allow_nan=False),
                    encoding="utf-8")
