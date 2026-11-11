#!/usr/bin/env python3
"""Conservative, fail-closed native CII(2019) short-element merger.

Only merges an unowned straight-run element with a like-for-like, unowned
adjacent element.  It never deletes total physical length, mass ownership,
auxiliary records, or source XML.  Audits more generally than it transforms.
This is a draft engineering prototype, NOT engineering release approval.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import tempfile

import cii_syntax_check_2019 as syntax

HEADER = re.compile(r"^#\$\s+([A-Z0-9_&]+)\s*$")
FIXED = 13
THRESHOLD_MM = 6.0
# These sections can encode point/element ownership.  Until all their reverse
# references are understood, ANY payload prevents a physical transformation.
AUX_OWNER_SECTIONS = (
    "AUX_DATA", "NODENAME", "BEND", "RIGID", "EXPJT", "RESTRANT",
    "DISPLMNT", "FORCMNT", "UNIFORM", "WIND", "OFFSETS",
    "ALLOWBLS", "SIF&TEES", "REDUCERS", "FLANGES", "EQUIPMNT",
)


class UnsafeModel(ValueError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_output_paths(input_path: Path, output_path: Path, report_path: Path, *,
                       source_xml: Path | None = None,
                       native_final_packet: Path | None = None) -> None:
    """Reject every source/output, report/output and summary/source collision."""
    protected = {p.resolve() for p in (input_path, source_xml, native_final_packet) if p is not None}
    destination = [output_path.resolve(), report_path.resolve(),
                   report_path.with_suffix(".txt").resolve()]
    if len(set(destination)) != 3 or any(p in protected for p in destination):
        raise UnsafeModel("CII_SHORT_PATH_COLLISION: use distinct output, report and source paths")


def fields(row: str, count: int) -> list[str]:
    # CII 2019 fixed FORTRAN width (same as the repository syntax checker).
    return [row[2 + i * FIXED:2 + (i + 1) * FIXED].strip() for i in range(count)]


def formatted(tokens: list[str]) -> str:
    if any(len(x) > FIXED for x in tokens):
        raise UnsafeModel("FIXED_FIELD_OVERFLOW")
    return "  " + "".join(f"{x:>{FIXED}}" for x in tokens)


def identifier(token: str) -> int:
    x = float(token)
    if not math.isfinite(x) or abs(x - round(x)) > 1e-8 or x <= 0:
        raise UnsafeModel(f"AMBIGUOUS_NODE_ID:{token}")
    return int(round(x))


def number(token: str) -> float:
    x = float(token)
    if not math.isfinite(x):
        raise ValueError("nonfinite")
    return x


def vecnorm(v: tuple[float, float, float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def difference(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return vecnorm(tuple(x - y for x, y in zip(a, b)))


@dataclass
class Element:
    old_id: int
    lines: list[str]
    a: int
    b: int
    delta: tuple[float, float, float]
    length: float
    material: str

    @property
    def line_label(self) -> str:
        return self.lines[10]


def sections_of(text: str) -> tuple[list[str], dict[str, list[str]]]:
    order: list[str] = []
    section: dict[str, list[str]] = {}
    current: str | None = None
    for row in text.splitlines():
        match = HEADER.fullmatch(row.strip())
        if match:
            current = match.group(1)
            if current in section:
                raise UnsafeModel(f"DUPLICATE_SECTION:{current}")
            section[current] = []
            order.append(current)
        elif current is None:
            if row.strip():
                raise UnsafeModel("PREAMBLE_NOT_SUPPORTED")
        else:
            section[current].append(row)
    return order, section


def unit_basis(s: dict[str, list[str]]) -> tuple[bool, str]:
    units = s.get("UNITS")
    if not units or len(units) != 28:
        return False, "UNITS_MISSING_OR_INCOMPLETE"
    # Both the published length unit label and the numeric conversion basis
    # must agree with the converter's known SI(mm) writer, not just an XML flag.
    try:
        scale = number(units[0].split()[0])
        names = [line.strip().lower() for line in units]
        if not (abs(scale - 25.4) < 0.0001 and names[4] == "si (mm)"
                and names[6] == "mm." and names[-1] == "mm."):
            return False, "UNVERIFIED_CII_LENGTH_UNIT"
    except (IndexError, ValueError):
        return False, "UNVERIFIED_CII_LENGTH_UNIT"
    return True, "CII UNITS numeric scale 25.4, SI (mm), length label mm.; emitted DX/DY/DZ in mm"


def parse(text: str) -> tuple[list[str], dict[str, list[str]], list[Element]]:
    order, s = sections_of(text)
    control = s.get("CONTROL", [])
    raw = s.get("ELEMENTS", [])
    if len(control) < 4:
        raise UnsafeModel("CONTROL_INCOMPLETE")
    count = int(fields(control[0], 6)[0])
    if count < 0 or len(raw) != count * 15:
        raise UnsafeModel("ELEMENT_BLOCK_COUNT_MISMATCH")
    misc = s.get("MISCEL_1")
    if misc is None:
        raise UnsafeModel("MISCEL_MISSING")
    n_mat = (count + 5) // 6
    if len(misc) != n_mat + 4:
        raise UnsafeModel("MISCEL_MATERIAL_ARRAY_UNRECOGNIZED")
    material = []
    for i in range(n_mat):
        row_n = min(6, count - 6 * i)
        tokens = fields(misc[i], row_n)
        if any(not t for t in tokens):
            raise UnsafeModel("MISCEL_MATERIAL_MISSING")
        material.extend(tokens)
    elements = []
    for i in range(count):
        block = raw[i*15:(i+1)*15]
        v = fields(block[0], 6)
        try:
            a, b = identifier(v[0]), identifier(v[1])
            delta = tuple(number(t) for t in v[2:5])
            if any(not math.isfinite(number(t)) for t in v[5:]):
                raise ValueError("nonfinite")
        except (IndexError, ValueError, OverflowError) as exc:
            raise UnsafeModel(f"BAD_ELEMENT_GEOMETRY:{i+1}:{exc}") from exc
        elements.append(Element(i+1, block, a, b, delta, vecnorm(delta), material[i]))
    return order, s, elements


def graph(elements: list[Element]) -> dict:
    nodes: set[int] = set()
    adjacency: dict[int, list[tuple[int, tuple[float, float, float]]]] = defaultdict(list)
    degree: Counter[int] = Counter()
    pairs = Counter(tuple(sorted((e.a,e.b))) for e in elements)
    if any(count > 1 for count in pairs.values()):
        raise UnsafeModel("AMBIGUOUS_DUPLICATE_ELEMENT_ENDPOINTS")
    for e in elements:
        if e.a == e.b:
            raise UnsafeModel(f"SELF_LOOP:{e.old_id}")
        nodes.update((e.a, e.b))
        degree[e.a] += 1
        degree[e.b] += 1
        adjacency[e.a].append((e.b, e.delta))
        adjacency[e.b].append((e.a, tuple(-x for x in e.delta)))
    coordinates: dict[int, tuple[float, float, float]] = {}
    components: list[list[int]] = []
    for start in sorted(nodes):
        if start in coordinates:
            continue
        coordinates[start] = (0.0, 0.0, 0.0)
        component = []
        queue = deque([start])
        while queue:
            a = queue.popleft()
            component.append(a)
            for b, d in adjacency[a]:
                proposed = tuple(coordinates[a][j] + d[j] for j in range(3))
                if b in coordinates:
                    if difference(coordinates[b], proposed) > 1e-4:
                        raise UnsafeModel(f"CONFLICTING_NODE_GEOMETRY:{b}")
                else:
                    coordinates[b] = proposed
                    queue.append(b)
        components.append(sorted(component))
    return {"node_count": len(nodes), "component_count": len(components),
            "components": components, "terminal_nodes": sorted(k for k,v in degree.items() if v == 1),
            "degrees": dict(degree), "coordinates": coordinates}


def references(s: dict[str, list[str]], existing_nodes: set[int]) -> dict:
    # Known COORDS node ownership; any unknown absolute COORDS record is invalid.
    coords = s.get("COORDS", [])
    referenced: set[int] = set()
    if not coords:
        raise UnsafeModel("COORDS_MISSING")
    try:
        n = int(fields(coords[0], 1)[0])
        if n != len(coords)-1:
            raise ValueError("COORDS count")
        for line in coords[1:]:
            v = fields(line, 4)
            node = identifier(v[0])
            for token in v[1:]:
                number(token)
            if node in referenced or node not in existing_nodes:
                raise ValueError(f"COORDS unresolved or duplicate: {node}")
            referenced.add(node)
    except (ValueError, IndexError) as exc:
        raise UnsafeModel(f"INVALID_COORDS:{exc}") from exc
    aux = {n: len([x for x in s.get(n, []) if x.strip()]) for n in AUX_OWNER_SECTIONS}
    return {"absolute_coord_nodes": sorted(referenced), "owner_sections_with_payload":
            {k:v for k,v in aux.items() if v}}


def bare_element(e: Element) -> bool:
    # Negative node reference records (-1, -1) are normal sentinels, not owners.
    try:
        pointer_rows = [fields(e.lines[12], 6), fields(e.lines[13], 6), fields(e.lines[14], 3)]
        node_refs = [int(t) for t in fields(e.lines[11], 2)]
        # Row 10 may be an element name. Never remove named components.
        name = e.lines[9].strip().split()
        return (all(int(t) == 0 for row in pointer_rows for t in row)
                and node_refs == [-1, -1] and name == ["0"])
    except (ValueError, IndexError):
        return False


def compatible(a: Element, b: Element) -> bool:
    # All engineering case fields, insulation, size, mass and line identity
    # must agree.  MISCEL material entries are element-indexed and compared.
    return (a.material == b.material and a.lines[1:15] == b.lines[1:15]
            and fields(a.lines[0], 6)[5] == fields(b.lines[0], 6)[5])


def collinear(a: tuple[float,float,float], b: tuple[float,float,float]) -> bool:
    la, lb = vecnorm(a), vecnorm(b)
    if la <= 1e-8 or lb <= 1e-8:
        return False
    cosine = sum(x*y for x,y in zip(a,b)) / (la*lb)
    # Strict: no geometry turn and no reversed/backtracking segments.
    return cosine >= 1.0 - 1e-10


def classify(elements: list[Element], g: dict, refs: dict, units_ok: bool,
             *, mass_packet: bool) -> list[dict]:
    degree = g["degrees"]
    by_node: dict[int, list[Element]] = defaultdict(list)
    for e in elements:
        by_node[e.a].append(e)
        by_node[e.b].append(e)
    rows = []
    for e in elements:
        # Strict inclusive comparison against exactly the emitted CII vector.
        # Never admit a physically larger-than-6-mm value via epsilon.
        if e.length > THRESHOLD_MM:
            continue
        item = {"old_element_id": e.old_id, "branch_lineage": e.line_label.strip(),
                "from_node": e.a, "to_node": e.b, "length_mm": e.length,
                "unit_basis": "verified mm" if units_ok else "UNKNOWN",
                "classification": "UNRESOLVED", "disposition": "BLOCKED_UNRESOLVED",
                "reason": "", "merge_with_old_element_id": None}
        def blocked(reason: str, protected: bool=False):
            item["classification"] = "PROTECTED" if protected else "UNRESOLVED"
            item["disposition"] = "PROTECTED" if protected else "BLOCKED_UNRESOLVED"
            item["reason"] = reason
        if not units_ok:
            blocked("UNVERIFIED_LENGTH_UNITS")
        elif e.length <= 1e-8:
            blocked("DEGENERATE_ZERO_LENGTH_REQUIRES_OWNER_PROOF")
        elif mass_packet:
            blocked("FINAL_MASS_PACKET_REQUIRES_INDEPENDENT_MAPPING", True)
        elif refs["owner_sections_with_payload"]:
            blocked("UNSUPPORTED_AUXILIARY_OWNER_RECORDS", True)
        elif not bare_element(e):
            blocked("COMPONENT_NAME_POINTER_OR_NODE_REFERENCE", True)
        elif any(degree[n] > 2 for n in (e.a,e.b)):
            blocked("BRANCH_OR_TEE_JUNCTION", True)
        elif e.a in refs["absolute_coord_nodes"] or e.b in refs["absolute_coord_nodes"]:
            blocked("ABSOLUTE_COORDINATE_ANCHOR", True)
        else:
            choices = []
            for mid, out in ((e.b, True),(e.a, False)):
                if degree[mid] != 2:
                    continue
                candidate = next((x for x in by_node[mid] if x.old_id != e.old_id), None)
                if not candidate or not bare_element(candidate) or not compatible(e, candidate):
                    continue
                if any(degree[n] > 2 for n in (candidate.a,candidate.b)):
                    continue
                if mid in refs["absolute_coord_nodes"]:
                    continue
                # Orient both edges in the same path direction.
                d1 = e.delta if out else candidate.delta
                d2 = candidate.delta if out else e.delta
                if out and candidate.a != mid:
                    d2 = tuple(-x for x in d2)
                if not out and candidate.b != mid:
                    d1 = tuple(-x for x in d1)
                if collinear(d1, d2):
                    choices.append((candidate.old_id, mid))
            if not choices:
                blocked("NO_UNOWNED_COLLINEAR_SAME_PROPERTY_NEIGHBOR")
            else:
                partner_id, mid = min(choices)
                item.update(classification="ELIGIBLE", disposition="NOT_APPLIED",
                            reason="LIKE_FOR_LIKE_STRAIGHT_RUN_COALESCENCE",
                            merge_with_old_element_id=partner_id,
                            removed_internal_node=mid)
        rows.append(item)
    return rows


def merge_pair(short: Element, long: Element, middle: int) -> Element:
    if middle not in (short.a, short.b) or middle not in (long.a, long.b):
        raise UnsafeModel("MERGE_NOT_ADJACENT")
    short_other = short.a if short.b == middle else short.b
    if long.a == middle:
        na, nb = short_other, long.b
        short_to_middle = short.delta if short.b == middle else tuple(-v for v in short.delta)
        direction = tuple(short_to_middle[i] + long.delta[i] for i in range(3))
    else:
        na, nb = long.a, short_other
        middle_to_short = short.delta if short.a == middle else tuple(-v for v in short.delta)
        direction = tuple(long.delta[i] + middle_to_short[i] for i in range(3))
    if na == nb:
        raise UnsafeModel("MERGE_WOULD_CREATE_SELF_LOOP")
    tokens = fields(long.lines[0],6)
    tokens[:5] = [f"{na}.00000", f"{nb}.00000"] + [f"{d:.6f}" for d in direction]
    new_lines = list(long.lines)
    new_lines[0] = formatted(tokens)
    return Element(long.old_id,new_lines,na,nb,direction,vecnorm(direction),long.material)


def render(order: list[str], s: dict[str,list[str]], original: list[Element],
           retained: list[Element]) -> str:
    blocks = dict(s)
    blocks["ELEMENTS"] = [row for e in retained for row in e.lines]
    control = list(s["CONTROL"])
    row = fields(control[0],6)
    row[0] = str(len(retained))
    control[0] = formatted(row)
    blocks["CONTROL"] = control
    misc = list(s["MISCEL_1"])
    old_mat_rows = (len(original)+5)//6
    new_mats = [e.material for e in retained]
    mat_rows = [formatted(new_mats[i:i+6]) for i in range(0,len(new_mats),6)]
    blocks["MISCEL_1"] = mat_rows + misc[old_mat_rows:]
    return "\n".join(row for key in order for row in ["#$ "+key, *blocks[key]])+"\n"


def syntax_report(text: str, path: Path) -> dict:
    try:
        opt = syntax.RuleOptions(allow_missing_nodename=True,
                                 allow_zero_line_no=True, allow_missing_coords=True)
        report = syntax.validate_cii_text(text, path, opt)
        spec = report.get("specSectionRules")
        return {"ok": bool(report.get("ok")) and (spec is None or spec.get("ok") is True),
                "errors": report.get("errors",[]), "specSectionRules": spec}
    except Exception as exc:
        return {"ok":False,"errors":[{"code":"VALIDATOR_EXCEPTION", "message":str(exc)}]}


def process(input_path: Path, output_path: Path, report_path: Path, *, mode: str,
            source_xml: Path|None=None, native_final_packet: Path|None=None) -> tuple[int,dict]:
    check_output_paths(input_path, output_path, report_path,
                       source_xml=source_xml, native_final_packet=native_final_packet)
    # A prior run's output must never masquerade as a successful result after
    # this run returns HOLD/FAIL. Only an explicitly requested output is removed;
    # input/source/report path aliases were rejected above.
    if output_path.is_file() or output_path.is_symlink():
        output_path.unlink()
    elif output_path.exists():
        raise UnsafeModel("CII_SHORT_OUTPUT_IS_NOT_A_FILE")
    original = input_path.read_bytes()
    input_sha = digest(original)
    source_sha = digest(source_xml.read_bytes()) if source_xml else None
    report = {"schema":"CII2019.ShortElementSimplificationAudit.v1", "mode":mode,
              "input_cii_sha256":input_sha,"source_xml_sha256":source_sha,
              "input_elements":None,"output_elements":None,"short_elements_le_6mm":None,
              "candidates":[],"element_mapping":{},"node_mapping":{},
              "topology":{},"reference_integrity":{},"engineering_properties":{},
              "concentrated_mass_reconciliation":{},"syntax":{},
              "output_cii_sha256":None, "candidate_published":False,
              "proposed_elements":None, "proposed_output_cii_sha256":None,
              "status":"NOT_RUN", "validated_scopes":[],
              "limitations":["Independent CAESAR II solver equivalence NOT_RUN",
                             "Real-source lineage beyond input/source SHA NOT_RUN"]}
    output_bytes = original
    try:
        text = original.decode("utf-8")
        pre_syntax = syntax_report(text,input_path)
        report["syntax"]["before"] = pre_syntax
        if not pre_syntax["ok"]:
            raise UnsafeModel("INPUT_SYNTAX_FAIL")
        order, s, elements = parse(text)
        report["input_elements"] = len(elements)
        units_ok, unit_desc = unit_basis(s)
        report["unit_basis"] = unit_desc
        try:
            before = graph(elements)
            refs = references(s, set(before["coordinates"]))
        except UnsafeModel as exc:
            report["reference_integrity"]["before"] = {"status":"FAIL","reason":str(exc)}
            raise
        report["topology"]["before"] = {k:before[k] for k in ("node_count","component_count","terminal_nodes","components")}
        report["reference_integrity"]["before"] = refs
        rows = classify(elements,before,refs,units_ok,mass_packet=bool(native_final_packet))
        report["candidates"] = rows
        report["short_elements_le_6mm"] = len(rows)
        retained: dict[int,Element] = {e.old_id:e for e in elements}
        merged = {}
        used = set()
        if mode == "simplify":
            for row in rows:
                if row["classification"] != "ELIGIBLE":
                    continue
                a, b = row["old_element_id"], row["merge_with_old_element_id"]
                if a in used or b in used or a not in retained or b not in retained:
                    row.update(classification="UNRESOLVED", disposition="BLOCKED_UNRESOLVED",
                               reason="CHAIN_OR_OVERLAPPING_MERGE_REQUIRES_NEW_AUDIT")
                    continue
                candidate = retained[a]
                partner = retained[b]
                new = merge_pair(candidate,partner,row["removed_internal_node"])
                if abs(new.length - candidate.length - partner.length) > 2e-5:
                    row.update(classification="UNRESOLVED", disposition="BLOCKED_UNRESOLVED",
                               reason="MERGED_VECTOR_LENGTH_MISMATCH")
                    continue
                retained[b] = new
                del retained[a]
                used.update((a,b))
                merged[a] = b
                row["disposition"] = "MERGED_SAFE"
                row["reason"] = "COLLINEAR_SAME_PROPERTY_LENGTH_CONSERVED"
            output_elements = [retained[k] for k in sorted(retained)]
            if merged:
                proposed = render(order,s,elements,output_elements)
                new_order,new_sections,new_elements = parse(proposed)
                post_syntax = syntax_report(proposed,output_path)
                report["syntax"]["after"] = post_syntax
                if not post_syntax["ok"]:
                    raise UnsafeModel("OUTPUT_SYNTAX_FAIL")
                after = graph(new_elements)
                after_refs = references(new_sections,set(after["coordinates"]))
                if before["component_count"] != after["component_count"] or before["terminal_nodes"] != after["terminal_nodes"]:
                    raise UnsafeModel("GRAPH_COMPONENT_OR_TERMINAL_CHANGE")
                # Count equality alone can hide component swaps. Compare every
                # original component's projection onto the retained nodes.
                retained_nodes = set(after["coordinates"])
                projected = sorted(tuple(sorted(set(component) & retained_nodes))
                                   for component in before["components"])
                actual_components = sorted(tuple(component) for component in after["components"])
                if projected != actual_components:
                    raise UnsafeModel("GRAPH_COMPONENT_MEMBERSHIP_CHANGE")
                if sorted(set(before["coordinates"]) - set(after["coordinates"])) != sorted(
                        x["removed_internal_node"] for x in rows if x["disposition"] == "MERGED_SAFE"):
                    raise UnsafeModel("UNACCOUNTED_NODE_REMOVAL")
                if any(difference(before["coordinates"][n],after["coordinates"][n])>1e-4 for n in after["coordinates"]):
                    # Graph coordinate origins are seeded from sorted node IDs per component.
                    raise UnsafeModel("RETAINED_NODE_COORDINATE_CHANGE")
                if refs != after_refs:
                    raise UnsafeModel("AUXILIARY_REFERENCE_CHANGE")
                if any(new_sections[k]!=s[k] for k in s if k not in ("ELEMENTS","CONTROL","MISCEL_1")):
                    raise UnsafeModel("NON_TARGET_SECTION_CHANGE")
                # No engineering row changes beyond first geom row, and material
                # follows source index.  Concentrated owners have no supported
                # transformation: prohibit all ownership sections above.
                before_map = {e.old_id:e for e in elements}
                for eid,updated in zip((k for k in sorted(retained)),output_elements):
                    previous=before_map[eid]
                    if previous.lines[1:] != updated.lines[1:] or previous.material != updated.material:
                        raise UnsafeModel("ENGINEERING_PROPERTY_CHANGE")
                output_bytes = proposed.encode("utf-8")
                report["topology"]["after"] = {k:after[k] for k in ("node_count","component_count","terminal_nodes","components")}
                report["reference_integrity"]["after"] = after_refs
                report["validated_scopes"] += ["graph components and terminals", "retained node coordinates",
                                              "CII section and element property preservation", "material array remapping"]
            else:
                report["syntax"]["after"] = pre_syntax
        else:
            report["syntax"]["after"] = pre_syntax
        final_elements = [retained[k] for k in sorted(retained)]
        id_map = {e.old_id:i+1 for i,e in enumerate(final_elements)}
        report["element_mapping"] = {str(e.old_id):{"new_element_id":id_map[merged.get(e.old_id,e.old_id)],
            "role":"merged_short" if e.old_id in merged else ("absorbed_short" if e.old_id in merged.values() else "unchanged")}
            for e in elements}
        removed_nodes = {r["removed_internal_node"]:r for r in rows if r["disposition"]=="MERGED_SAFE"}
        report["node_mapping"] = {str(n):({"status":"removed_internal_coordinate","represented_by_element":
            id_map[merged[removed_nodes[n]["old_element_id"]]],"no_coordinate_alias":True}
            if n in removed_nodes else {"status":"unchanged","new_node_id":n}) for n in before["coordinates"]}
        report["output_elements"] = len(final_elements)
        report["topology"].setdefault("after",report["topology"]["before"])
        report["reference_integrity"].setdefault("after",refs)
        report["engineering_properties"]={"status":"PASS" if merged else "NO_OP",
             "detail":"All non-geometry element rows and MISCEL material entries preserved; strict identical adjacent row comparison"}
        report["concentrated_mass_reconciliation"]={"status":"HOLD" if native_final_packet else "PASS_SCOPED",
            "detail":"No mass-bearing CII records transformed; Final packet prevents merges"}
        report["validated_scopes"] += ["input syntax", "unit and emitted geometry audit",
                                        "pre/post emitted connectivity", "zero-owned short edge classification"]
        if not units_ok:
            report["status"] = "HOLD"
        elif native_final_packet and rows:
            report["status"] = "HOLD"
        elif any(r["disposition"]=="BLOCKED_UNRESOLVED" for r in rows):
            report["status"] = "HOLD"
        else:
            report["status"] = "PASS_SCOPED"
        if mode == "audit":
            report["status"] = "HOLD" if rows else report["status"]
        if report["status"] == "PASS_SCOPED":
            # Publish only a fully validated scoped result. The filesystem
            # rename prevents consumers observing a partially written CII.
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="wb", dir=output_path.parent,
                prefix=f".{output_path.name}.", suffix=".tmp", delete=False
            ) as stream:
                stream.write(output_bytes)
                staged_path = Path(stream.name)
            try:
                staged_path.replace(output_path)
            finally:
                staged_path.unlink(missing_ok=True)
            report["output_cii_sha256"] = digest(output_bytes)
            report["candidate_published"] = True
            code = 0
        else:
            # All transformations on HOLD are *unpublished proposals*, not
            # physical deletions. Keep them auditable without declaring that
            # a removed element or revised graph exists in an output file.
            report["proposed_elements"] = len(final_elements)
            report["proposed_output_cii_sha256"] = digest(output_bytes) if merged else None
            report["engineering_properties"]["status"] = "HOLD"
            report["engineering_properties"]["detail"] = (
                "Unpublished proposal only; no released after-artifact property proof"
            )
            report["concentrated_mass_reconciliation"]["status"] = "HOLD"
            report["concentrated_mass_reconciliation"]["detail"] = (
                "No CII output published; independent Final-mass reconciliation NOT_RUN"
            )
            report["proposed_element_mapping"] = report["element_mapping"]
            report["proposed_node_mapping"] = report["node_mapping"]
            report["element_mapping"] = {
                str(e.old_id): {"new_element_id": e.old_id, "role": "unchanged_unpublished"}
                for e in elements
            }
            report["node_mapping"] = {
                str(n): {"status": "unchanged_unpublished", "new_node_id": n}
                for n in before["coordinates"]
            }
            if merged:
                report["topology"]["proposed"] = report["topology"].pop("after")
                report["reference_integrity"]["proposed"] = report["reference_integrity"].pop("after")
                report["syntax"]["proposed"] = report["syntax"].pop("after")
            report["topology"]["after"] = {"status": "NOT_RUN", "reason": "OUTPUT_WITHHELD"}
            report["reference_integrity"]["after"] = {"status": "NOT_RUN", "reason": "OUTPUT_WITHHELD"}
            report["syntax"]["after"] = {"status": "NOT_RUN", "reason": "OUTPUT_WITHHELD"}
            for item in rows:
                if item["disposition"] == "MERGED_SAFE":
                    item["proposed_reason"] = item["reason"]
                    item.update(classification="UNRESOLVED", disposition="BLOCKED_UNRESOLVED",
                                reason="WHOLE_MODEL_HOLD_NO_PHYSICAL_REMOVAL")
            report["output_elements"] = None
            code = 2
    except (ValueError,UnicodeError,IndexError,OverflowError) as exc:
        report["status"] = "FAIL"
        report["failure"] = str(exc)
        report["output_cii_sha256"] = None
        report["output_elements"] = None
        report["candidate_published"] = False
        code = 2
    # This also cleans up a prior candidate if failure occurred before the
    # publication gate. Never suppress errors in source/output path validation.
    if code != 0:
        output_path.unlink(missing_ok=True)
    try:
        report_path.parent.mkdir(parents=True,exist_ok=True)
        report_path.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    except OSError:
        output_path.unlink(missing_ok=True)
        raise
    summary = [f"CII short-element {mode}: {report['status']}",
               f"Input: {report['input_cii_sha256']}",
               f"Output: {report['output_cii_sha256'] or 'WITHHELD'}",
               f"Element count: {report['input_elements']} -> {report['output_elements']}",
               f"Emitted candidates <= 6 mm: {report['short_elements_le_6mm']}"]
    for item in report['candidates']:
        summary.append(f"Element {item['old_element_id']} ({item['from_node']} -> {item['to_node']}, "
                       f"{item['length_mm']:.6f} mm): {item['disposition']} -- {item['reason']}")
    if report.get('failure'):
        summary.append("FAIL: "+report['failure'])
    try:
        report_path.with_suffix('.txt').write_text("\n".join(summary)+"\n", encoding="utf-8")
    except OSError:
        output_path.unlink(missing_ok=True)
        raise
    return code, report


def validate_existing(input_path: Path, candidate_path: Path, report_path: Path, *,
                      source_xml: Path | None = None,
                      native_final_packet: Path | None = None) -> tuple[int,dict]:
    """Reproduce the transformation and compare exact candidate bytes/hash."""
    check_output_paths(input_path, candidate_path, report_path,
                       source_xml=source_xml, native_final_packet=native_final_packet)
    with tempfile.TemporaryDirectory(prefix="cii-short-validation-") as temp:
        expected = Path(temp) / "expected.cii"
        rc, report = process(input_path, expected, report_path, mode="simplify",
                             source_xml=source_xml,native_final_packet=native_final_packet)
        try:
            actual = candidate_path.read_bytes()
        except OSError as exc:
            report["validation"] = {"status":"FAIL","reason":f"CANDIDATE_UNAVAILABLE:{exc}"}
            report["status"] = "FAIL"
            rc = 2
        else:
            actual_sha = digest(actual)
            expected_sha = report.get("output_cii_sha256")
            match = expected_sha is not None and actual_sha == expected_sha and expected.is_file() \
                and actual == expected.read_bytes()
            report["validation"] = {"candidate_sha256": actual_sha, "expected_sha256": expected_sha,
                                    "exact_reproduction": match,
                                    "status": "PASS_SCOPED" if match and rc==0 else "FAIL"}
            if not match:
                report["status"] = "FAIL"
                report["failure"] = "CANDIDATE_DIFFERS_FROM_VERIFIED_REPRODUCTION"
                rc=2
        report_path.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n", encoding="utf-8")
        return rc,report


def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--report",type=Path,default=Path("short-element-simplification-report.json"))
    ap.add_argument("--mode",choices=("audit","simplify","validate"),default="audit")
    ap.add_argument("--source-xml",type=Path)
    ap.add_argument("--native-final-packet",type=Path)
    args=ap.parse_args()
    if args.input.resolve()==args.output.resolve():
        ap.error("Input and output must differ; source CII is immutable")
    if args.mode == "validate":
        code,report=validate_existing(args.input,args.output,args.report,
                    source_xml=args.source_xml,native_final_packet=args.native_final_packet)
    else:
        code,report=process(args.input,args.output,args.report,mode=args.mode,
                    source_xml=args.source_xml,native_final_packet=args.native_final_packet)
    print(f"{report['status']}: input={report['input_elements']} output={report['output_elements']} "
          f"short={report['short_elements_le_6mm']} "
          f"merged={[r['old_element_id'] for r in report['candidates'] if r['disposition']=='MERGED_SAFE']}")
    print(f"Audit: {args.report}; candidate: {args.output if report['output_cii_sha256'] else 'WITHHELD'}")
    return code


if __name__=="__main__":
    sys.exit(main())
