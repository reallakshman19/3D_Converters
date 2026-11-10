"""Synthetic physical-basis derivation for S2-R3 NONRELEASE tests.

Input: invented XML geometry and an independent invented master table.
No Owner XML, ledger or preassigned statuses/weights are read here.
"""
import math
from xml229_native_final_mass_binding import (
    branches, nodes, txt, s1_rlt10_length_suggestion,
)
from rigid_s2_r3_geometry import (
    product_merge_alias, held_source_mapping, verify_held_source_mapping,
    require, GeometryWitnessError,
)

SYNTH_MASTERS = (
    {"id": "LAB-F50", "TypeDesc": "Weldneck Flange",
     "DN": 50, "Rating": 900, "length": 109, "RF/RTJ KG": 15},
    {"id": "LAB-F80", "TypeDesc": "Weldneck Flange",
     "DN": 80, "Rating": 900, "length": 109, "RF/RTJ KG": 17},
    {"id": "LAB-F100", "TypeDesc": "Weldneck Flange",
     "DN": 100, "Rating": 900, "length": 121, "RF/RTJ KG": 29},
    {"id": "LAB-V150", "TypeDesc": "Synthetic Gate Valve",
     "DN": 150, "Rating": 900, "length": 200, "RF/RTJ KG": 365},
)


def position(n):
    result = tuple(float(x) for x in txt(n, "Position").split())
    require(len(result) == 3 and all(math.isfinite(x) for x in result),
            "S2R3_NONFINITE_SOURCE_GEOMETRY")
    return result


def number(n):
    return int(txt(n, "NodeNumber"))


def ref(n):
    return txt(n, "ComponentRefNo").lstrip("=")


def reference(rows, typ, dn, rating):
    hits = [r for r in rows
            if r.get("TypeDesc") == typ and
            float(r.get("DN", -1)) == dn and
            float(r.get("Rating", -1)) == rating]
    if len(hits) != 1:
        return None
    try:
        length, kg = float(hits[0]["length"]), float(hits[0]["RF/RTJ KG"])
    except (TypeError, ValueError, KeyError):
        return None
    if not all(math.isfinite(v) and v > 0 for v in (length, kg)):
        return None
    return {"kg": kg, "lengthMm": length, "rowId": hits[0]["id"]}


def derive_synthetic_basis(raw, rows=SYNTH_MASTERS):
    """Derive custody from original positions, types, refs and master rows."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring(raw)
    result = {"owners": [], "suggestions": [], "held": [],
              "rawBranches": branches(root)}
    for bi, branch in enumerate(result["rawBranches"]):
        ns = nodes(branch)
        kind = [txt(n, "ComponentType") for n in ns]
        label = txt(branch, "Branchname")
        dn = int(float(txt(ns[-1], "BoreMm")))
        rating = int(float(txt(ns[-1], "Rating")))
        if kind[0] == "BRAN" and kind[-1] == "RIGID":
            require(len(kind) == 3 and kind[1] == "VALV",
                    "S2R3_VALVE_TYPE_DRIFT")
            master = reference(rows, "Synthetic Gate Valve", dn, rating)
            if master is not None:
                result["held"].append({
                    "sourceId": label + "|" + ref(ns[1]),
                    "branch": label, "firstPositionMm": position(ns[0]),
                    "lastPositionMm": position(ns[1]),
                    "knownMassKg": master["kg"], "kind": "VALV",
                    "rowId": master["rowId"]})
            continue
        if "PCOM" in kind:
            require(kind == ["VALV", "PCOM", "PCOM", "FLAN", "RIGID"] and
                    ref(ns[1]) == ref(ns[2]) and
                    ref(ns[3]) == ref(ns[4]), "S2R3_PCOM_PAIR_TOPOLOGY")
            length = math.dist(position(ns[0]), position(ns[3]))
            flange_length = math.dist(position(ns[3]), position(ns[4]))
            master = reference(rows, "Weldneck Flange", dn, rating)
            owner = (master if master is not None and
                     math.isclose(flange_length, master["lengthMm"],
                                  abs_tol=.01) else None)
            if owner is not None:
                result["owners"].append({
                    "branch": label, "branchIndex": bi, "toIndex": 4,
                    "nodePair": [number(ns[3]), number(ns[4])],
                    "fromPositionMm": position(ns[3]),
                    "toPositionMm": position(ns[4]),
                    "lengthMm": flange_length, "weightKg": owner["kg"],
                    "ownerSourceId": label + "|" + ref(ns[4])})
            suggestion = s1_rlt10_length_suggestion(length, dn, rating, rows)
            result["suggestions"].append({
                "branch": label, "nodePair": [number(ns[0]), number(ns[3])],
                "fromPositionMm": position(ns[0]),
                "toPositionMm": position(ns[3]),
                "status": suggestion["status"],
                "weightKg": suggestion["weightKg"],
                "referenceRow": suggestion["referenceRow"],
                "lengthMm": length})
            continue
        for ni, (a, z) in enumerate(zip(ns, ns[1:])):
            if (txt(a, "ComponentType") != "FLAN" or
                    txt(z, "ComponentType") not in ("FLAN", "RIGID") or
                    ref(a) != ref(z)):
                continue
            length = math.dist(position(a), position(z))
            master = reference(rows, "Weldneck Flange", dn, rating)
            if master is None or not math.isclose(
                    length, master["lengthMm"], abs_tol=.01):
                continue
            # REDU -> FLAN -> FLAN -> RIGID with a short alias is not
            # unique source ownership. Match only by actual position.
            collapsed = (ni > 0 and txt(ns[ni-1], "ComponentType") == "REDU"
                         and ni+2 < len(ns) and
                         math.dist(position(z),position(ns[ni+2])) < 4)
            if collapsed:
                result["held"].append({
                    "sourceId": label + "|" + ref(a), "branch": label,
                    "firstPositionMm": position(a),
                    "lastPositionMm": position(z),
                    "knownMassKg": master["kg"], "kind": "FLAN",
                    "rowId": master["rowId"]})
            else:
                result["owners"].append({
                    "branch": label, "branchIndex": bi, "toIndex": ni+1,
                    "nodePair": [number(a), number(z)],
                    "fromPositionMm": position(a),
                    "toPositionMm": position(z),
                    "lengthMm": length, "weightKg": master["kg"],
                    "ownerSourceId": label + "|" + ref(z)})
    require(len(result["suggestions"]) == 1, "S2R3_PAIR_CENSUS")
    return result


def locate_rigid_status(edge, derived):
    """Link the PRODUCT edge to source geometry rather than branch constants."""
    for source in derived["owners"]:
        if source["branch"] != edge.branch_name:
            continue
        if (math.dist(source["fromPositionMm"],edge.from_node.position) <= .01
                and math.dist(source["toPositionMm"],edge.to_node.position) <= .01):
            return "OWNED",source["weightKg"],source["ownerSourceId"]
        try:
            matched,_ = product_merge_alias([source],edge)
        except GeometryWitnessError:
            continue
        if matched is source:
            return "OWNED",source["weightKg"],source["ownerSourceId"]
    for source in derived["suggestions"]:
        if (source["branch"] == edge.branch_name and
                math.dist(source["fromPositionMm"],edge.from_node.position) <= .01
                and math.dist(source["toPositionMm"],edge.to_node.position) <= .01):
            return source["status"],source["weightKg"],None
    return "REVIEW",None,None


def annotate_synthetic_product(model, cii, derived, binder):
    """All statuses, owners and HELD annotations depend on source and bytes."""
    slots,weights=binder.emitted_sections(cii)
    elements=binder._cii_elements(cii)
    require(len(elements)==len(model.edges), "S2R3_CII_ELEMENT_CENSUS")
    side={}
    for ix,edge in enumerate(model.edges):
        if ix not in model.edge_to_rigid_index:
            continue
        pointer=model.edge_to_rigid_index[ix]
        require(elements[ix][2]==pointer and slots[pointer-1][0]==ix,
                "S2R3_CII_POINTER_WITNESS")
        status,kg,owner=locate_rigid_status(edge,derived)
        force=weights[pointer-1]
        require((math.isclose(force,10*kg,abs_tol=1e-6)
                 if kg is not None else force==0.0),
                "S2R3_NATIVE_FORCE_SOURCE_DRIFT")
        side[str(pointer)]={"pointer":pointer,"elementIndex":ix,
           "status":status,"weightKg":kg,"actualForceN":force,
           "nodePair":[edge.from_node.node_number,edge.to_node.node_number],
           "ownerSourceId":owner,"heldSources":[]}
    require(len(side)==len(weights),"S2R3_RIGID_POINTER_CENSUS")
    # Source-derived OWNED mass is never lost if the parser cannot produce
    # the 3.0..3.4mm alias. A missing owner becomes HELD on an unresolved
    # position-matched pointer, with its original master kg and source ID.
    emitted_owned = {p["ownerSourceId"] for p in side.values()
                     if p["status"] == "OWNED"}
    missing_owners = [dict(sourceId=o["ownerSourceId"], branch=o["branch"],
                           firstPositionMm=o["fromPositionMm"],
                           lastPositionMm=o["toPositionMm"],
                           knownMassKg=o["weightKg"], kind="FLAN")
                      for o in derived["owners"]
                      if o["ownerSourceId"] not in emitted_owned]
    held_locations = [*derived["held"], *missing_owners]
    anchored=held_source_mapping(held_locations,model,side)
    for pointer,items in anchored.items():
        side[pointer]["heldSources"].extend(items)
        if side[pointer]["status"]=="REVIEW" and any(
                x["kind"]=="FLAN" for x in held_locations
                if any(y["sourceId"]==x["sourceId"] for y in items)):
            side[pointer]["status"]="HELD"
    verify_held_source_mapping(held_locations,model,side)
    return side
