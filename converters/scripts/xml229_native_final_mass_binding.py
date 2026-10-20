"""Strict GC-PW Final -> native XML -> actual CII RIGID mass binding.

Not a release oracle: an *independently sourced* G5 original-to-native-child
geometry/lineage witness and actual Owner basis remain necessary. This module
never accepts a proposal or guesses an original physical owner.
"""
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

SCHEMA = "XML229.NativeFinalPhysicalPacket.v1"


class NativeMassError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def require(ok, code):
    if not ok:
        raise NativeMassError(code)


def tag(element):
    return element.tag.rsplit("}", 1)[-1]


def child(element, wanted):
    return next((n for n in element if tag(n) == wanted), None)


def txt(element, wanted):
    n = child(element, wanted)
    return (n.text or "").strip() if n is not None else ""


def branches(root):
    return [node for node in root.iter() if tag(node) == "Branch"]


def nodes(branch):
    return [n for n in branch if tag(n) == "Node"]


def signature(node):
    return json.dumps([txt(node, "ComponentType"), txt(node, "ComponentRefNo"),
                       txt(node, "Endpoint"), txt(node, "NodeName")],
                      separators=(",", ":"), ensure_ascii=False)


def identity(node):
    return (signature(node), txt(node, "NodeNumber"), txt(node, "Position"))


def parse_bytes(data):
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        raise NativeMassError("ENGINE_XML_MALFORMED") from None
    require(tag(root) == "PipeStressExport", "ENGINE_XML_NOT_PIPESTRESSEXPORT")
    return root


def read_packet(path, xml_path):
    try:
        packet = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise NativeMassError("NATIVE_PACKET_INVALID") from None
    require(isinstance(packet, dict) and packet.get("schema") == SCHEMA,
            "NATIVE_PACKET_SCHEMA")
    original_bytes = Path(xml_path).read_bytes()
    require(packet.get("sourceXmlSha256") == hashlib.sha256(original_bytes).hexdigest(),
            "ORIGINAL_SOURCE_SHA_DRIFT")
    require(isinstance(packet.get("basisId"), str) and
            len(packet["basisId"]) == 64 and
            isinstance(packet.get("finalIntentSha256"), str) and
            len(packet["finalIntentSha256"]) == 64,
            "NATIVE_FINAL_INTENT_REQUIRED")
    physicals = packet.get("components")
    require(isinstance(physicals, list) and
            len(physicals) == packet.get("physicalCount") and len(physicals) > 0,
            "NATIVE_FINAL_POPULATION_INCOMPLETE")
    return packet, parse_bytes(original_bytes)


def bind_native_final_xml(original_path, enriched_path, packet_path):
    """Write positive Owner-designated masses to exact enriched XML owners.

    Works only when every original physical has precisely ONE unchanged
    signature + NodeNumber + Position owner in the same branch occurrence.
    Splits, lost nodes, renumbers and scope changes require another attested
    lineage implementation, not an ordinal guess.
    """
    packet, source = read_packet(packet_path, original_path)
    source_branches = branches(source)
    enriched_path = Path(enriched_path)
    enriched = parse_bytes(enriched_path.read_bytes())
    engine_branches = branches(enriched)
    require(len(source_branches) == len(engine_branches),
            "NATIVE_BRANCH_OCCURRENCE_DRIFT")
    used = set()
    owners = []
    source_id = packet.get("sourceId")
    require(isinstance(source_id, str) and bool(source_id),
            "NATIVE_SOURCE_ID_REQUIRED")
    for item in packet["components"]:
        require(isinstance(item, dict), "NATIVE_MASS_ROW_INVALID")
        oid = item.get("occurrenceId")
        try:
            decoded = json.loads(oid)
        except (ValueError, TypeError):
            raise NativeMassError("NATIVE_OCCURRENCE_INVALID") from None
        require(isinstance(decoded, list) and len(decoded) == 4 and
                decoded[0] == source_id and type(decoded[1]) is int and
                type(decoded[2]) is int and decoded[1] >= 0 and decoded[2] >= 0 and
                isinstance(decoded[3], str) and bool(decoded[3]) and
                json.dumps(decoded, separators=(",", ":"), ensure_ascii=False) == oid,
                "NATIVE_OCCURRENCE_INVALID")
        kg = item.get("effectiveKg")
        require(type(kg) in (int, float) and math.isfinite(kg) and kg > 0,
                "NATIVE_FINAL_MASS_REQUIRED")
        bi, ni = decoded[1], decoded[2]
        require(bi < len(source_branches), "NATIVE_BRANCH_OUT_OF_RANGE")
        src, dest = source_branches[bi], engine_branches[bi]
        require(txt(src, "Branchname") == txt(dest, "Branchname"),
                "NATIVE_BRANCH_NAME_DRIFT")
        src_nodes = nodes(src)
        require(ni < len(src_nodes), "NATIVE_NODE_ORDINAL_OUT_OF_RANGE")
        original = src_nodes[ni]
        require(signature(original) == decoded[3],
                "NATIVE_PHYSICAL_SIGNATURE_DRIFT")
        witness = identity(original)
        matches = [(j, node) for j, node in enumerate(nodes(dest))
                   if identity(node) == witness]
        require(len(matches) == 1, "NATIVE_OWNER_LINEAGE_AMBIGUOUS")
        j, owner = matches[0]
        key = (bi, j)
        require(key not in used, "NATIVE_OWNER_DUPLICATED")
        used.add(key)
        # Native RIGID emission must claim this owner in the actual converter
        # graph. Never set Rigid=2 on non-rigid valve/flange/instrument geometry.
        require(txt(owner, "Rigid") == "2", "NATIVE_RIGID_OWNER_UNSUPPORTED")
        weight = child(owner, "Weight")
        if weight is None:
            weight = ET.SubElement(owner, owner.tag.rsplit("}", 1)[0] + "}Weight"
                                   if "}" in owner.tag else "Weight")
        weight.text = format(kg, ".17g")
        owners.append({
            "occurrenceId": oid, "branchOccurrenceIndex": bi,
            "engineNodeOrdinal": j, "branchName": txt(dest, "Branchname"),
            "nodeNumber": txt(owner, "NodeNumber"),
            "componentType": txt(owner, "ComponentType"),
            "componentRefNo": txt(owner, "ComponentRefNo"),
            "endpoint": txt(owner, "Endpoint"),
            "position": txt(owner, "Position"), "kg": float(kg),
        })
    require(len(used) == packet["physicalCount"],
            "NATIVE_ORIGINAL_POPULATION_DRIFT")
    output = enriched_path.with_name(enriched_path.stem + "_xml229_final.xml")
    ET.ElementTree(enriched).write(output, encoding="utf-8", xml_declaration=True)
    return output, owners


def emitted_sections(text):
    sections = {}
    current = None
    for line in text.splitlines():
        if line.startswith("#$ "):
            current = line[3:].strip()
            require(bool(current) and current not in sections, "CII_SECTION_DUPLICATED")
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line)
    require({"CONTROL", "ELEMENTS", "RIGID", "UNITS"} <= sections.keys(),
            "CII_MASS_SECTION_MISSING")
    require(any(row.strip() == "N." for row in sections["UNITS"]),
            "CII_FORCE_UNIT_UNVERIFIED")
    control = sections["CONTROL"]
    require(len(control) == 4, "CII_CONTROL_INVALID")
    try:
        nr_elements = int(control[0].split()[0])
        nr_rigid = int(control[1].split()[1])
    except (ValueError, IndexError):
        raise NativeMassError("CII_CONTROL_INVALID") from None
    require(nr_elements >= 0 and nr_rigid >= 0 and
            len(sections["ELEMENTS"]) == 15*nr_elements and
            len(sections["RIGID"]) == nr_rigid, "CII_MASS_RECORD_COUNT_MISMATCH")
    slots = {}
    for i in range(nr_elements):
        element = sections["ELEMENTS"][i*15:(i+1)*15]
        row1, row13 = element[0].split(), element[12].split()
        require(len(row1) == 6 and len(row13) == 6,
                "CII_ELEMENTS_FORMAT_INVALID")
        try:
            pointer = int(row13[1])
        except ValueError:
            raise NativeMassError("CII_RIGID_POINTER_INVALID") from None
        require(0 <= pointer <= nr_rigid, "CII_RIGID_POINTER_INVALID")
        if pointer:
            require(pointer-1 not in slots, "CII_RIGID_DOUBLE_OWNER")
            slots[pointer-1] = (i, row1[0], row1[1])
    require(len(slots) == nr_rigid, "CII_RIGID_ORPHANED")
    weights = []
    for row in sections["RIGID"]:
        vals = row.split()
        require(len(vals) == 2, "CII_RIGID_ROW_INVALID")
        try:
            value = float(vals[0])
            second = float(vals[1])
        except ValueError:
            raise NativeMassError("CII_RIGID_VALUE_INVALID") from None
        require(math.isfinite(value) and math.isfinite(second) and value >= 0,
                "CII_RIGID_VALUE_INVALID")
        weights.append(value)
    return slots, weights


def verify_emitted_native_masses(cii_text, owners, model, scale=10):
    """Independently parse actual emitted CII bytes; reconcile all owners.

    RIGID ownership must be unique, the ELEMENTS -> RIGID pointer must agree,
    and the actual row must equal accepted kg * 10 within 6-digit formatting.
    Extra positive RIGID records or one-to-many ownership fail closed.
    """
    require(scale == 10, "CII_NATIVE_MASS_SCALE_UNSUPPORTED")
    slots, emitted = emitted_sections(cii_text)
    edges = model.rigid_edges
    require(len(edges) == len(emitted), "CII_GRAPH_RIGID_COUNT_DRIFT")
    used = set()
    claims = []
    for row in owners:
        matches = []
        for idx, edge in enumerate(edges):
            node = edge.to_node
            n = (node.source_node_number if node.source_node_number is not None
                 else node.node_number)
            if (edge.branch_name == row["branchName"] and str(n) == row["nodeNumber"]
                    and node.component_type == row["componentType"]
                    and node.component_ref_no == row["componentRefNo"]
                    and str(node.endpoint or "") == row["endpoint"]
                    and node.position == tuple(map(float, row["position"].split()))):
                matches.append(idx)
        require(len(matches) == 1, "CII_NATIVE_PHYSICAL_OWNER_AMBIGUOUS")
        index = matches[0]
        require(index not in used and index in slots,
                "CII_NATIVE_PHYSICAL_RIGID_POINTER_UNVERIFIED")
        used.add(index)
        # Native CII formatter emits 6 significant digits; compare to the
        # independently calculated expected rounded number.
        expected = float(format(row["kg"]*scale, ".6g"))
        require(math.isclose(emitted[index], expected, abs_tol=1e-6, rel_tol=1e-9),
                "CII_NATIVE_APPLIED_MASS_MISMATCH")
        require(math.isclose(edges[index].to_node.weight, row["kg"],
                             abs_tol=1e-8, rel_tol=1e-9),
                "CII_NATIVE_MODEL_MASS_MISMATCH")
        element, from_node, to_node = slots[index]
        claims.append({"occurrenceId": row["occurrenceId"],
                       "rigidRecordIndex": index, "nativeElementIndex": element,
                       "ciiFromNode": from_node, "ciiToNode": to_node,
                       "massKg": row["kg"], "emittedForceN": emitted[index],
                       "branchOccurrenceIndex": row["branchOccurrenceIndex"],
                       "engineNodeOrdinal": row["engineNodeOrdinal"]})
    require(len(used) == len(owners), "CII_NATIVE_CENSUS_INCOMPLETE")
    for i, edge in enumerate(edges):
        if i not in used:
            require(abs(emitted[i]) <= 1e-6,
                    "CII_NATIVE_UNCLAIMED_POSITIVE_RIGID")
    return {"schema": "XML229.NativeRigidConsumptionDiagnostic.v1",
            "sourcePhysicalCount": len(owners),
            "claimedNativeRigidCount": len(used),
            "outputRigidCount": len(emitted),
            "actualCiiSha256": hashlib.sha256(cii_text.encode("utf-8")).hexdigest(),
            "massesConsumedInNativeRigid": True,
            "claims": sorted(claims, key=lambda c: c["occurrenceId"]),
            "independentNativeChildLineageVerified": False,
            "nativeCiiReleaseAuthorized": False}
