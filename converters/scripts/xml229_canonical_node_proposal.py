"""Independent native counterpart of JS pre-Final canonical node NUMBER PROPOSAL.

Read-only; source graph and actual reviewed Final XML are its only inputs.
Never rewrites node IDs, alters kg, or authorizes actual native CII output.
"""
from decimal import Decimal, InvalidOperation
import re

SCHEMA = "XML229.PreFinalCanonicalNodeNumberProposal.v1"


def _local(e):
    return e.tag.rsplit("}", 1)[-1]


def _children(parent, name):
    return [e for e in parent if _local(e) == name]


def _field(node, name):
    found = next((e for e in node if _local(e) == name), None)
    return (found.text or "").strip() if found is not None else ""


def _position(raw):
    parts = raw.split()
    if len(parts) != 3:
        return None
    try:
        values = tuple(Decimal(part) for part in parts)
    except InvalidOperation:
        return None
    return values if all(n.is_finite() for n in values) else None


def _native_id(raw, fail):
    if not re.fullmatch(r"[0-9]+", raw):
        fail(False, "NATIVE_CANONICAL_PROPOSAL_FINAL_ID_INVALID")
    value = int(raw)
    fail(0 < value <= 2147483647,
         "NATIVE_CANONICAL_PROPOSAL_FINAL_ID_INVALID")
    return value


def expected_proposal(original_xml, final_xml, retained, source_sha, fail):
    original = [ _children(b, "Node") for b in original_xml.iter()
                if _local(b) == "Branch" ]
    final = [ _children(b, "Node") for b in final_xml.iter()
             if _local(b) == "Branch" ]
    fail(isinstance(retained, list) and len(original) == len(final) ==
         len(retained), "NATIVE_CANONICAL_PROPOSAL_BRANCH_CENSUS")
    native_ids = {}
    runs, total = [], 0
    for bi, before in enumerate(original):
        after, source_ordinals = final[bi], retained[bi]
        fail(isinstance(source_ordinals, list) and
             len(after) == len(source_ordinals),
             "NATIVE_CANONICAL_PROPOSAL_RETAINED_CENSUS")
        last = -1
        for ni, n in enumerate(after):
            oi = source_ordinals[ni]
            fail(type(oi) is int and last < oi < len(before),
                 "NATIVE_CANONICAL_PROPOSAL_SOURCE_ORDINAL")
            last = oi
            fail(_field(n, "Position") == _field(before[oi], "Position"),
                 "NATIVE_CANONICAL_PROPOSAL_ORIGINAL_POSITION_DRIFT")
            node_id = _native_id(_field(n, "NodeNumber"), fail)
            native_ids.setdefault(node_id, []).append(
                f"[{bi},{oi}]")
            total += 1

        def emit(start, end):
            if end - start < 2:
                return
            ords = source_ordinals[start:end]
            ids = [_native_id(_field(n, "NodeNumber"), fail)
                   for n in after[start:end]]
            if len(set(ids)) == 1:
                return
            authored = list(dict.fromkeys(
                v for v in (int(_field(before[oi], "NodeNumber"))
                            for oi in ords)
                if v > 0
            ))
            reason = ("DISTINCT_AUTHORED_POSITIVE_IDS" if len(authored) > 1
                      else "CONSECUTIVE_ORIGINAL_COINCIDENT_NODE_ALIASES")
            candidate = (None if len(authored) > 1
                         else authored[0] if authored else ids[0])
            runs.append({
                "branchOccurrenceIndex": bi,
                "sourceNodeOrdinals": ords,
                "currentFinalNodeNumbers": ids,
                "proposedCanonicalNodeNumber": candidate,
                "reason": reason,
            })

        start = 0
        for i in range(1, len(after) + 1):
            continued = False
            if i < len(after):
                a, b = source_ordinals[i - 1:i + 1]
                point_a = _position(_field(before[a], "Position"))
                point_b = _position(_field(before[b], "Position"))
                continued = b == a + 1 and point_a is not None and point_a == point_b
            if not continued:
                emit(start, i)
                start = i
    unsupported = remapped = 0
    groups = []
    for group in runs:
        chosen = group["proposedCanonicalNodeNumber"]
        members = {f'[{group["branchOccurrenceIndex"]},{oi}]'
                   for oi in group["sourceNodeOrdinals"]}
        collision = chosen is not None and any(
            pair not in members for pair in native_ids.get(chosen, []))
        reason = ("CANONICAL_ID_OWNED_OUTSIDE_CONNECTED_VERTEX" if collision
                  else group["reason"])
        proposed = None if collision else chosen
        if proposed is None:
            unsupported += 1
        else:
            remapped += sum(n != proposed for n in group["currentFinalNodeNumbers"])
        groups.append({**group, "proposedCanonicalNodeNumber": proposed,
                       "reason": reason, "requiresReviewedNativeGraphChange": True})
    return {
        "schema": SCHEMA,
        "sourceXmlSha256": source_sha,
        "originalBranchCount": len(original),
        "originalNodeCount": sum(map(len, original)),
        "retainedFinalNodeOccurrences": total,
        "groups": groups,
        "summary": {
            "connectedCoincidentGroupsRequiringReview": len(groups),
            "locallyProposableGroups": len(groups) - unsupported,
            "needsEngineeringIdentityDecision": unsupported,
            "proposedNativeNodeRelabels": remapped,
            "sourcePositionsChanged": 0,
            "finalGeometryModified": False,
            "acceptedKgModified": False,
            "nativeReleaseAuthorized": False,
        },
    }


def verify_proposal(original, reviewed, retained, receipt, source_sha, require):
    require(isinstance(receipt, dict) and receipt.get("schema") == SCHEMA,
            "NATIVE_CANONICAL_PROPOSAL_SCHEMA_INVALID")
    expected = expected_proposal(original, reviewed, retained, source_sha, require)
    require(receipt == expected, "NATIVE_CANONICAL_PROPOSAL_PARITY_DRIFT")
    return expected
