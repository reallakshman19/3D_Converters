"""Audit existing CII owners before publication; never transfer component mass."""
from collections import defaultdict
import math
import xml.etree.ElementTree as ET


def _text(element, name):
    return next((child.text or "" for child in element
                 if child.tag.split("}")[-1] == name), "").strip()


def _identity(branch, number, reference, endpoint, component, position):
    return (branch, number, reference.strip(), endpoint, component.upper(), position)


def audit_rigid_weight_owners(xml_path, model):
    """Return unresolved positive Rigid=2 weights using the existing to-node owner."""
    owners = defaultdict(list)
    for edge in model.rigid_edges:
        node = edge.to_node
        source_number = node.source_node_number if node.source_node_number is not None else node.node_number
        key = _identity(edge.branch_name, source_number, node.component_ref_no,
                        node.endpoint, node.component_type, node.position)
        owners[key].append(node.weight)
    unresolved = []
    source_keys = set()
    for branch in ET.parse(xml_path).getroot().iter():
        if branch.tag.split("}")[-1] != "Branch":
            continue
        name = _text(branch, "Branchname")
        for node in branch:
            if node.tag.split("}")[-1] != "Node" or _text(node, "Rigid") != "2":
                continue
            weight = float(_text(node, "Weight") or "0")
            if not math.isfinite(weight):
                raise ValueError(f"CII_WEIGHT_INVALID: {name}::{_text(node, 'NodeNumber')}")
            if weight <= 0:
                continue
            number = int(_text(node, "NodeNumber"))
            endpoint = int(_text(node, "Endpoint")) if _text(node, "Endpoint") else None
            key = _identity(name, number, _text(node, "ComponentRefNo"), endpoint,
                            _text(node, "ComponentType"), tuple(map(float, _text(node, "Position").split())))
            if key in source_keys:
                raise ValueError(f"CII_WEIGHT_OWNER_AMBIGUOUS: duplicate source component {name}::{number}")
            source_keys.add(key)
            values = owners.get(key, [])
            if len(values) != 1 or values[0] != weight:
                unresolved.append({"branch": name, "nodeNumber": number, "weight": weight,
                                   "reference": _text(node, "ComponentRefNo"), "ownerCount": len(values)})
    return unresolved


def require_rigid_weight_owners(xml_path, model, *, s1_test_only_witness=None):
    """Strict ordinary release guard; S1 positive suggestions are test-only.

    An unapproved PCOM connection can NEVER be released simply because the
    native CII writer accepts a numeric positive weight on its FLAN arrival.
    """
    unresolved = audit_rigid_weight_owners(xml_path, model)
    if unresolved:
        details = "; ".join(f"{row['branch']}::{row['nodeNumber']} ({row['weight']} kg)"
                            for row in unresolved)
        raise ValueError(f"CII_WEIGHT_OWNER_UNRESOLVED: {len(unresolved)} weighted components "
                         f"lack one matching CII owner. CII withheld; enriched XML retained. {details}")
    _s1_assert_pcom_release_hold(xml_path, model, s1_test_only_witness)


def _s1_assert_pcom_release_hold(xml_path, model, witness):
    """Only the isolated S1 renderer can inspect SUGGESTED numeric CII bytes.

    The ordinary runtime never passes a witness. Even an S1 witness has no
    release authority; it merely validates two separately owned test edges.
    """
    import hashlib
    from pathlib import Path
    root = ET.parse(xml_path).getroot()
    def nodes(branch):
        return [n for n in branch if n.tag.split("}")[-1] == "Node"]
    branches = [n for n in root.iter() if n.tag.split("}")[-1] == "Branch"]
    target = []
    for branch in branches:
        ns = nodes(branch)
        for i in range(len(ns)-3):
            if [_text(n, "ComponentType").upper() for n in ns[i:i+4]] == [
                    "PCOM", "PCOM", "FLAN", "RIGID"]:
                target.append((branch, i))
    if not target and witness is None:
        return
    if witness is None:
        raise ValueError("CII_S1_SUGGESTED_PCOM_RELEASE_BLOCKED")
    checks = witness.get("checkpoints")
    if (witness.get("schema") != "RigidS1.NonReleasePcomFlangeWitness.v1" or
            witness.get("nativeCiiReleaseAuthorized") is not False or
            not isinstance(checks, list) or not checks or
            len(checks) != len(target) or
            witness.get("boundTestInputSha256") !=
            hashlib.sha256(Path(xml_path).read_bytes()).hexdigest()):
        raise ValueError("CII_S1_TEST_WITNESS_INVALID")
    physical_ids = set()
    pcom_ids = set()
    checked_edges = set()
    edges = list(model.rigid_edges)
    for p in checks:
        if (p.get("status") != "SUGGESTED" or
                p.get("ownerApproved") is not False or
                p.get("weightKg") is None or
                p.get("flangeOwnerKg") != 15 or
                p.get("flangeForceN") != 150 or
                p.get("fixturePCOMMinus1Ordinals") != [1, 2] or
                not isinstance(p.get("referenceRow"), dict)):
            raise ValueError("CII_S1_UNAPPROVED_MASS_CLAIM")
        physical = (p["branch"], p["flangeRef"])
        pc = (p["branch"], p["pcomRef"])
        if physical in physical_ids or pc in pcom_ids or physical == pc:
            raise ValueError("CII_S1_DOUBLE_PHYSICAL_OWNER")
        physical_ids.add(physical)
        pcom_ids.add(pc)
        actual_branch = next((b for b in branches
            if _text(b, "Branchname") == p["branch"]), None)
        if actual_branch is None:
            raise ValueError("CII_S1_BRANCH_LINEAGE_MISSING")
        ns = nodes(actual_branch)
        matching = [(a, b, c, d, idx) for idx, (a, b, c, d)
            in enumerate(zip(ns, ns[1:], ns[2:], ns[3:]))
            if (_text(a, "ComponentType"), _text(b, "ComponentType"),
                _text(c, "ComponentType"), _text(d, "ComponentType")) ==
                ("PCOM", "PCOM", "FLAN", "RIGID")
            and _text(a, "NodeNumber") == "-1" and
                _text(b, "NodeNumber") == "-1" and
                _text(c, "NodeNumber") == p["flangeFrom"] and
                _text(d, "NodeNumber") == p["flangeTo"]]
        if len(matching) != 1:
            raise ValueError("CII_S1_PCOM_ORDINAL_WITNESS_MISSING")
        a, b, c, d, _ = matching[0]
        if (_text(a, "ComponentRefNo").lstrip("=") != p["pcomRef"] or
                _text(b, "ComponentRefNo").lstrip("=") != p["pcomRef"] or
                _text(c, "ComponentRefNo").lstrip("=") != p["flangeRef"] or
                _text(d, "ComponentRefNo").lstrip("=") != p["flangeRef"] or
                abs(float(_text(c, "Weight")) - p["weightKg"]) > 1e-8 or
                abs(float(_text(d, "Weight")) - 15) > 1e-8 or
                p["weightKg"] == 15):
            raise ValueError("CII_S1_CONNECTION_BORROWED_FLANGE_MASS")
        for fr, to, kg, kind in (
                (p["connectionFrom"], p["connectionTo"], p["weightKg"], "FLAN"),
                (p["flangeFrom"], p["flangeTo"], 15, "RIGID")):
            matching_edges = [e for e in edges
                if e.branch_name == p["branch"] and
                str(e.from_node.node_number) == str(fr) and
                str(e.to_node.node_number) == str(to) and
                e.to_node.component_type == kind and
                abs(e.to_node.weight - kg) <= 1e-8]
            key = (p["branch"], str(fr), str(to))
            if len(matching_edges) != 1 or key in checked_edges:
                raise ValueError("CII_S1_CONNECTION_FLANGE_EDGE_OWNER_AMBIGUOUS")
            checked_edges.add(key)
    if len(checked_edges) != 2 * len(checks):
        raise ValueError("CII_S1_ELEMENT_OWNER_CENSUS_DRIFT")
