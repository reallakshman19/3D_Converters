"""Audit existing CII owners before publication; never transfer component mass."""
from collections import defaultdict
import math
import xml.etree.ElementTree as ET


def _text(element, name):
    return next((child.text or "" for child in element
                 if child.tag.split("}")[-1] == name), "").strip()


def _identity(branch, number, reference, endpoint, component, position):
    return (branch, number, reference.strip(), endpoint, component.upper(), position)


def audit_rigid_weight_owners(xml_path, model, applied=()):
    """Return unresolved positive Rigid=2 weights using the existing to-node owner.

    applied: rows from apply_flange_weight_rules; their weights are owned by the flange element they name.
    """
    moved = {(row["branch"], row["nodeNumber"]) for row in applied}
    added = defaultdict(float)
    for row in applied:
        added[(row["branch"], row["flangeNode"])] += row["addedKg"]
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
            if (name, number) in moved:
                continue
            if key in source_keys:
                raise ValueError(f"CII_WEIGHT_OWNER_AMBIGUOUS: duplicate source component {name}::{number}")
            source_keys.add(key)
            values = owners.get(key, [])
            if len(values) != 1 or values[0] != weight + added.get((name, number), 0.0):
                unresolved.append({"branch": name, "nodeNumber": number, "weight": weight,
                                   "reference": _text(node, "ComponentRefNo"), "ownerCount": len(values)})
    return unresolved


def require_rigid_weight_owners(xml_path, model, applied=()):
    unresolved = audit_rigid_weight_owners(xml_path, model, applied)
    if unresolved:
        details = "; ".join(f"{row['branch']}::{row['nodeNumber']} ({row['weight']} kg)"
                            for row in unresolved)
        raise ValueError(f"CII_WEIGHT_OWNER_UNRESOLVED: {len(unresolved)} weighted components "
                         f"lack one matching CII owner. CII withheld; enriched XML retained. {details}")


# Owner rule, 17 Nov 2026 (BM2): two flange weight patterns get a CII owner instead of a refusal.
# 1. Blind flange: a weighted RIGID just after a flange end 2 with the blind (FBLI) between them, within
#    BLIND_GAP_MM, and no element of its own in the CII: its weight is added to that flange's rigid element.
# 2. Flange weight on both ends: end 1 repeats end 2's weight (same flange). It is written once, on the
#    flange's element; when that element is not rigid in the CII (end 2 not Rigid=2) it becomes rigid.
# Anything else stays refused by require_rigid_weight_owners.
BLIND_GAP_MM = 5.0


def _xml_branch_nodes(xml_path):
    branches = {}
    for branch in ET.parse(xml_path).getroot().iter():
        if branch.tag.split("}")[-1] != "Branch":
            continue
        rows = []
        for node in branch:
            if node.tag.split("}")[-1] != "Node":
                continue
            number, endpoint = _text(node, "NodeNumber"), _text(node, "Endpoint")
            rows.append({"number": int(number) if number.lstrip("-").isdigit() else None,
                         "type": _text(node, "ComponentType").upper(), "ref": _text(node, "ComponentRefNo"),
                         "endpoint": int(endpoint) if endpoint else None, "rigid": _text(node, "Rigid"),
                         "weight": float(_text(node, "Weight") or "0"),
                         "position": tuple(map(float, _text(node, "Position").split()))})
        branches.setdefault(_text(branch, "Branchname"), []).append(rows)
    return branches


def _key(branch, row):
    return _identity(branch, row["number"], row["ref"], row["endpoint"], row["type"], row["position"])


def _source_number(node):
    return node.source_node_number if node.source_node_number is not None else node.node_number


def _flange_rule(branch, rows, i, owners, model):
    """(rule, edge index, extra kg, make rigid) for the unresolved weighted node rows[i], or None."""
    row = rows[i]
    if row["type"] == "RIGID" and row["endpoint"] == 2:
        j, blind = i - 1, False
        while j >= 0 and rows[j]["type"] == "FBLI":
            blind = blind or math.dist(rows[j]["position"], row["position"]) <= BLIND_GAP_MM
            j -= 1
        flange = rows[j] if j >= 0 else None
        if (blind and flange and flange["type"] == "FLAN" and flange["endpoint"] == 2 and flange["rigid"] == "2"
                and math.dist(flange["position"], row["position"]) <= BLIND_GAP_MM):
            own = owners.get(_key(branch, flange), [])
            if len(own) == 1 and model.edges[own[0]].to_node.weight == flange["weight"]:
                return ("blind-flange-weight-on-flange", own[0], row["weight"], False)
    if row["type"] == "FLAN" and row["endpoint"] == 1:
        ends = [r for r in rows if r["type"] == "FLAN" and r["ref"] == row["ref"] and r["endpoint"] == 2
                and r["weight"] == row["weight"]]
        if len(ends) != 1:
            return None
        end = ends[0]
        own = owners.get(_key(branch, end), [])
        if len(own) == 1 and model.edges[own[0]].to_node.weight == end["weight"]:
            return ("flange-weight-once", own[0], 0.0, False)
        rigid = set(model.edge_to_rigid_index)
        edges = [k for k, e in enumerate(model.edges) if k not in rigid and e.branch_name == branch
                 and _source_number(e.to_node) == end["number"] and e.to_node.component_type.upper() == "FLAN"
                 and e.to_node.endpoint == 2 and e.to_node.weight == end["weight"]
                 and e.to_node.component_ref_no.strip() == end["ref"].strip()]
        if not own and len(edges) == 1:
            return ("flange-weight-once-on-flange-element", edges[0], 0.0, True)
    return None


def apply_flange_weight_rules(xml_path, model, build_rigid_indices):
    """Apply the Owner's 17 Nov flange weight rule to unresolved weights; returns (model, applied rows)."""
    unresolved = audit_rigid_weight_owners(xml_path, model)
    if not unresolved:
        return model, []
    from dataclasses import replace
    owners = defaultdict(list)
    for k in model.edge_to_rigid_index:
        node = model.edges[k].to_node
        owners[_identity(model.edges[k].branch_name, _source_number(node), node.component_ref_no,
                         node.endpoint, node.component_type, node.position)].append(k)
    branches = _xml_branch_nodes(xml_path)
    applied, extra, make_rigid = [], defaultdict(float), set()
    for item in unresolved:
        for rows in branches.get(item["branch"], []):
            hits = [i for i, r in enumerate(rows) if r["number"] == item["nodeNumber"] and r["rigid"] == "2"
                    and r["weight"] == item["weight"]]
            found = _flange_rule(item["branch"], rows, hits[0], owners, model) if len(hits) == 1 else None
            if found:
                rule, k, kg, rigid = found
                extra[k] += kg
                if rigid:
                    make_rigid.add(k)
                to = model.edges[k].to_node
                applied.append({**item, "rule": rule, "flangeNode": _source_number(to), "addedKg": kg,
                                "ciiElement": [model.edges[k].from_node.node_number, to.node_number]})
                break
    if not applied:
        return model, []
    nodes = {}
    for k in set(extra) | make_rigid:
        old = model.edges[k].to_node
        new = nodes.get(id(old), old)
        nodes[id(old)] = replace(new, weight=new.weight + extra.get(k, 0.0), rigid=2 if k in make_rigid else new.rigid)
    swap = lambda n: nodes.get(id(n), n)
    edges = [e if id(e.from_node) not in nodes and id(e.to_node) not in nodes
             else replace(e, from_node=swap(e.from_node), to_node=swap(e.to_node)) for e in model.edges]
    by_id = {id(old): new for old, new in zip(model.edges, edges)}
    rigid_edges, rigid_index = build_rigid_indices(edges)
    model = replace(model, edges=edges, rigid_edges=rigid_edges, edge_to_rigid_index=rigid_index,
                    bend_edges=[by_id.get(id(e), e) for e in model.bend_edges],
                    sif_edges=[by_id.get(id(e), e) for e in model.sif_edges],
                    reducer_edges=[by_id.get(id(e), e) for e in model.reducer_edges])
    return model, applied
