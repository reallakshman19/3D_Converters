"""Shared NONRELEASE geometry witnesses. Contains no Owner XML or R9 data.

Both the public synthetic native-path test and the optional Owner-local R9
replay invoke these rules. They cannot authorize native CII release.
"""
import math


class GeometryWitnessError(AssertionError):
    pass


def require(value, code):
    if not value:
        raise GeometryWitnessError(code)


def product_merge_alias(source_elements, edge, *, tolerance_mm=0.01):
    """Only a parser-collapsed 3.0..3.4mm canonical edge may be aliased.

    Source projections are data inputs, not a whitelist of product node IDs.
    """
    candidates = []
    for source in source_elements:
        if source["branch"] != edge.branch_name:
            continue
        start_gap = math.dist(source["fromPositionMm"], edge.from_node.position)
        length_gap = (math.dist(edge.from_node.position, edge.to_node.position)
                      - source["lengthMm"])
        if start_gap <= tolerance_mm and 3.0 <= length_gap <= 3.4:
            candidates.append((source, length_gap))
    require(len(candidates) == 1, "S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED")
    return candidates[0]


def preferred_held_pointer(branch, start_position, end_position, model,
                           sidecar, *, tolerance_mm=0.01):
    """Prefer exact end->TO (tail); only then start->FROM (head).

    Reject arbitrary REVIEW pointers in the same branch. Deterministic tie:
    lowest pointer within a preference class.
    """
    matches = []
    for index, edge in enumerate(model.edges):
        if index not in model.edge_to_rigid_index or edge.branch_name != branch:
            continue
        pointer = model.edge_to_rigid_index[index]
        if sidecar[str(pointer)]["status"] not in ("REVIEW", "HELD"):
            continue
        tail = math.dist(end_position, edge.to_node.position)
        head = math.dist(start_position, edge.from_node.position)
        if tail <= tolerance_mm:
            matches.append((0, pointer))
        elif head <= tolerance_mm:
            matches.append((1, pointer))
    require(bool(matches), "S2R3_HELD_NO_POSITION_WITNESS")
    return min(matches)[1]


def held_source_mapping(source_locations, model, sidecar):
    """Compute a unique, geometry-validated HELD assignment from source facts.

    Input locations: iterable of sourceId, branch, firstPositionMm,
    lastPositionMm, knownMassKg. Unknown is never numerical zero.
    """
    assignment = {}
    ids = set()
    for source in source_locations:
        sid = source["sourceId"]
        kg = source["knownMassKg"]
        require(sid not in ids and isinstance(kg, (int, float)) and
                math.isfinite(kg) and kg > 0, "S2R3_HELD_SOURCE_INVALID")
        ids.add(sid)
        pointer = preferred_held_pointer(
            source["branch"], source["firstPositionMm"],
            source["lastPositionMm"], model, sidecar)
        assignment.setdefault(str(pointer), []).append(
            {"sourceId": sid, "kg": kg})
    return assignment


def verify_held_source_mapping(source_locations, model, sidecar):
    """Recompute each actual pointer; never accept a same-branch reassignment."""
    expected = held_source_mapping(source_locations, model, sidecar)
    for pointer, entry in sidecar.items():
        real = entry.get("heldSources", [])
        wanted = expected.get(str(pointer), [])
        require(sorted(real, key=lambda x: x["sourceId"]) ==
                sorted(wanted, key=lambda x: x["sourceId"]),
                "S2R3_HELD_POINTER_GEOMETRY_DRIFT")
    require(set(expected).issubset(sidecar), "S2R3_HELD_POINTER_MISSING")
    return True
