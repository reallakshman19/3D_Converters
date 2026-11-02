"""Executable *design model* of a source-attested XML229 ownership ledger.

NOT imported by the production converter. NOT an independently certified CII
parser. The source/topology facts supplied by this model's tests are synthetic;
the production migration must extract them from the exact original XML/JSON.
The intended proof is safety under declared, verified evidence and refusal when
the original inputs do not determine an owner.
"""
from __future__ import annotations

from collections import Counter
from hashlib import sha256
import json
import math
import re


class ContractHold(ValueError):
    """The proposed contract would not authorize engineering output."""


def require(ok, code):
    if not ok:
        raise ContractHold(code)


def digest(value):
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                             ensure_ascii=False, allow_nan=False).encode("utf-8")).hexdigest()


def _key(row):
    return (row["branch"], row["ordinal"])


def _spec(s):
    # Source semantic kind, never a CII type inferred from Preview text.
    code = {"REST": 14, "GUIDE": 8, "LINESTOP": 9}.get(s.get("kind"))
    require(code is not None, "SUPPORT_KIND_UNVERIFIED")
    gap = s.get("gapMm")
    require(type(gap) in (int, float) and math.isfinite(gap) and gap >= 0,
            "SUPPORT_GAP_UNVERIFIED")
    return code, round(float(gap), 8)


def verify(original_json, original_xml, config, ledger, enriched_xml, cii, final):
    """Re-derive owners from *independent* synthetic source/topology facts.

    Source and XML are independent arguments; no ledger-supplied certificate is
    taken as an ownership fact. The native implementation still requires exact
    byte-source provenance and a real independent parsed-CII field oracle.
    """
    source_sha = digest(original_json)
    xml_sha = digest(original_xml)
    cfg_sha = digest(config)
    require(ledger.get("sourceSha256") == source_sha and
            ledger.get("xmlSha256") == xml_sha and
            ledger.get("configSha256") == cfg_sha, "SOURCE_BASIS_DRIFT")
    require(final.get("sourceSha256") == source_sha and
            final.get("xmlSha256") == xml_sha and
            final.get("configSha256") == cfg_sha, "FINAL_BASIS_DRIFT")

    supports = original_json["supports"]
    routes = original_json["routes"]
    original_nodes = original_xml["nodes"]
    incidence = original_xml["routePortIncidence"]
    known = [_key(x) for x in original_nodes]
    require(len(known) == len(set(known)), "ORIGINAL_XML_OCCURRENCE_DUPLICATED")
    indexed = {_key(x): x for x in original_nodes}
    require(len({x["id"] for x in supports}) == len(supports),
            "SOURCE_SUPPORT_OCCURRENCE_DUPLICATED")
    rows = ledger.get("owners")
    require(isinstance(rows, list) and
            len(rows) == len(supports) and
            len({x.get("sourceId") for x in rows}) == len(rows), "LEDGER_MEMBER_CENSUS_INVALID")
    owner_by_id = {x["sourceId"]: tuple(x["owner"]) for x in rows}
    require(set(owner_by_id) == {x["id"] for x in supports},
            "LEDGER_MEMBER_CENSUS_INVALID")

    expected = Counter()
    for s in supports:
        sid = s["id"]
        kind, gap = _spec(s)
        branch = s["branch"]
        declared = s.get("carrier")
        port = s.get("port")
        ps = s.get("ps")
        pos = s.get("position")
        witnesses = []
        if declared is not None:
            require(isinstance(declared, str) and
                    re.fullmatch(r"=\d+/\d+", declared) is not None,
                    "CARRIER_GRAMMAR_UNVERIFIED")
            route = [r for r in routes if r["branch"] == branch and r["ref"] == declared]
            require(len(route) == 1, "CARRIER_ROUTE_NOT_UNIQUE_IN_BRANCH")
            if port is not None:
                links = [t for t in incidence if
                         t["branch"] == branch and
                         t["routeRef"] == declared and t["port"] == port]
                require(len(links) == 1, "CARRIER_PORT_INCIDENCE_NOT_UNIQUE")
                witnesses.append(tuple(links[0]["node"]))
        elif port is not None:
            require(False, "CARRIER_PORT_WITHOUT_ROUTE")

        if ps:
            ps_hits = [_key(node) for node in original_nodes
                       if node["branch"] == branch and node.get("ps") == ps]
            # Not all PS tags prove identity; only a unique original-source PS.
            if len(ps_hits) == 1:
                witnesses.append(ps_hits[0])

        # Original-author-only proof, not a previously JSON-replayed restraint.
        authored = [_key(node) for node in original_nodes
                    if node["branch"] == branch and
                    [kind, gap] in node.get("originalAuthored", [])]
        if len(authored) == 1:
            witnesses.append(authored[0])

        require(bool(witnesses), "OWNER_EVIDENCE_REQUIRED")
        require(len(set(witnesses)) == 1, "OWNER_PROOFS_CONTRADICT")
        owner = witnesses[0]
        require(owner in indexed, "XML_OWNER_OCCURRENCE_MISSING")
        require(owner_by_id[sid] == owner, "LEDGER_OWNER_NOT_SOURCE_PROVEN")
        if pos is not None:
            coords = indexed[owner]["position"]
            require(len(coords) == len(pos) == 3 and
                    all(type(v) in (float, int) and math.isfinite(v)
                        for v in coords + pos), "OWNER_POSITION_INVALID")
            require(math.dist(coords, pos) <= config["toleranceMm"],
                    "OWNER_SOURCE_POSITION_CONFLICT")
        expected[(owner[0], owner[1], kind, gap)] += 1

    enriched_nodes = enriched_xml["nodes"]
    enriched_keys = [_key(n) for n in enriched_nodes]
    require(enriched_keys == known, "ENRICHED_GEOMETRY_OR_ORDER_DRIFT")
    for before, after in zip(original_nodes, enriched_nodes):
        require(before["position"] == after["position"] and
                before["sourceNumber"] == after["sourceNumber"],
                "ENRICHED_GEOMETRY_OR_ORDER_DRIFT")
        # This model forbids altering unrelated mastered fields; real approved
        # transformations require their *separate* field-specific oracles.
        require(before.get("unrelatedFields") == after.get("unrelatedFields"),
                "ENRICHED_UNRELATED_FIELD_DRIFT")
    enriched_restraints = Counter()
    translated = Counter()
    for node in enriched_nodes:
        for r in node.get("restraints", []):
            code, gap = _spec(r)
            enriched_restraints[(*_key(node), code, gap)] += 1
            translated[(node["nodeNumber"], code, gap)] += 1
    require(enriched_restraints == expected, "ENRICHED_RESTRAINT_CENSUS_DRIFT")
    require(cii.get("consumedEnrichedSha256") == digest(enriched_xml),
            "CII_CONSUMED_ENRICHED_BYTES_DRIFT")
    cii_restraints = Counter((r["nodeNumber"], r["code"], float(r["gapMm"]))
                              for r in cii["restraints"])
    require(cii_restraints == translated, "EMITTED_CII_RESTRAINT_DRIFT")

    # Source-approved masses are an independent ledger and must not be inferred
    # from support ownership or string searches in the emitted CII.
    approved = Counter((m["nodeNumber"], round(float(m["kg"]) * 10, 8))
                       for m in final["masses"])
    actual = Counter((m["nodeNumber"], round(float(m["weightN"]), 8))
                     for m in cii["rigids"])
    require(approved == actual, "EMITTED_CII_FINAL_MASS_DRIFT")
    return {"verifiedSupports": len(supports), "xmlOccurrences": len(original_nodes),
            "verifiedCiiRestraintSlots": sum(translated.values()),
            "verifiedMassOwners": sum(approved.values())}
