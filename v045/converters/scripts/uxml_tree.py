"""The engine's input as an in-memory tree built from a UXML document, with no PSI116 file in between.

Step 7 of the UXML plan (Owner 14 and 19 Nov 2026): "UXML->PSI116->CII may be changed to UXML->CII if required";
"Yes, way A": today's CAESAR II engine reads UXML and keeps all its rules.

The engine reads its input XML in 7 places once the XML is prepared (the model, tee descriptions, insulation density,
hydro pressure and three DTXR reads). Each takes an ElementTree and asks for child tags by name on the header, Pipe,
Branch, Node and Restraint elements. tree_from_uxml(doc) builds that same tree from the UXML document's own values:
  - each Branch from a pipeline's values, in fieldOrder (a dotted key such as Temperature.Temperature1 is the child
    Temperature1 of the Temperature element);
  - each Node from a component's values, in fieldOrder, with its Restraint elements where they stood;
  - the header, the Pipe wrappers and their own tags (FullName, Ref) from the custody text UXML keeps before each
    pipeline, the one place UXML keeps them (they carry no engineering value).
The value text is UXML's, which is the file's text as written, so XML entities are decoded here.
uid_of(element) gives the UXML uid a Branch, Node or Restraint came from (no attribute is added, so the engine sees
the same tags), so a CII value can name its UXML source.

doc: the UXML v2 document as plain data (JSON.parse of the kernel document: schemaVersion uxml-topology-v2).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

SCHEMA = "uxml-topology-v2"
_UIDS: dict[int, str] = {}
_ENTITY = re.compile(r"&(#x[0-9A-Fa-f]+|#[0-9]+|amp|lt|gt|quot|apos);")
_NAMED = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'"}


class UxmlTreeRefusal(ValueError):
    pass


def _decode(text: str) -> str:
    def one(m: re.Match) -> str:
        k = m.group(1)
        if k.startswith("#x"):
            return chr(int(k[2:], 16))
        if k.startswith("#"):
            return chr(int(k[1:]))
        return _NAMED[k]
    return _ENTITY.sub(one, text)


def uid_of(element: ET.Element) -> str:
    """The UXML uid an element of tree_from_uxml came from ('' for a header element)."""
    return _UIDS.get(id(element), "")


SLOT = "UxmlBranchSlot"


def _skeleton(doc: dict[str, Any]) -> tuple[ET.Element, list[ET.Element]]:
    """The file's frame from each pipeline's custody text before it (header, Pipe wrappers and their own tags), with
    one empty slot element where each Branch stood. Returns (root, slots in pipeline order)."""
    custody = doc.get("custody") or {}
    parser = ET.XMLPullParser(events=("start",))
    for pipeline in doc.get("pipelines") or []:
        block = custody.get(pipeline.get("uid"))
        if not isinstance(block, dict) or "before" not in block:
            raise UxmlTreeRefusal(f"UXML_TREE_HEADER: pipeline {pipeline.get('uid')} has no custody text before it")
        parser.feed(block["before"])
        parser.feed(f"<{SLOT}/>")
    root, slots = None, []
    for _, element in parser.read_events():
        if root is None:
            root = element
        if element.tag.split("}")[-1] == SLOT:
            slots.append(element)
    if root is None or len(slots) != len(doc.get("pipelines") or []):
        raise UxmlTreeRefusal("UXML_TREE_HEADER: the custody text does not frame every pipeline")
    return root, slots


def _add_values(parent: ET.Element, entity: dict[str, Any], q, *, skip: set[str] = frozenset()) -> dict[str, ET.Element]:
    values = entity.get("values") or {}
    order = entity.get("fieldOrder") or list(values)
    missing = [k for k in values if k not in order]
    if missing:
        raise UxmlTreeRefusal(f"UXML_TREE_FIELD_ORDER: {entity.get('uid')} has values not in fieldOrder: {missing}")
    groups: dict[str, ET.Element] = {}
    placed: dict[str, ET.Element] = {}
    for key in order:
        if key in skip or key not in values:
            continue
        text = _decode(str(values[key].get("text") if values[key].get("text") is not None else values[key].get("v", "")))
        head, _, leaf = key.partition(".")
        if leaf:
            group = groups.get(head)
            if group is None:
                group = groups[head] = ET.SubElement(parent, q(head))
            ET.SubElement(group, q(leaf)).text = text
        else:
            child = placed[key] = ET.SubElement(parent, q(key))
            child.text = text
    return placed


def custody_text(doc: dict[str, Any]) -> str:
    """The text UXML keeps between the values (before each pipeline), in order: where a comment such as the TopoFix
    transfer protection note lives."""
    custody = doc.get("custody") or {}
    return "".join(str((custody.get(p.get("uid")) or {}).get("before", "")) for p in doc.get("pipelines") or [])


def values_by_uid(tree: ET.ElementTree) -> dict[str, dict[str, str]]:
    """{uid: {field: text}} for every Branch, Node and Restraint of a tree_from_uxml tree; a nested value is
    'Temperature.Temperature1' (UXML's key), an element the engine added under one is 'Restraint+<n>.<field>'."""
    out: dict[str, dict[str, str]] = {}
    for element in tree.getroot().iter():
        uid = _UIDS.get(id(element))
        if not uid:
            continue
        fields = out.setdefault(uid, {})
        added = 0
        for child in element:
            tag = child.tag.split("}")[-1]
            if tag in ("Node", "Restraint") and _UIDS.get(id(child)):
                continue
            if len(child):
                prefix = tag
                if not _UIDS.get(id(child)) and tag == "Restraint":
                    added += 1
                    prefix = f"Restraint+{added}"
                for leaf in child:
                    fields[f"{prefix}.{leaf.tag.split('}')[-1]}"] = (leaf.text or "").strip()
            else:
                fields[tag] = (child.text or "").strip()
    return out


def changes(before: dict[str, dict[str, str]], after: dict[str, dict[str, str]], rule: str) -> list[dict[str, str]]:
    """What a prepare step changed, by UXML uid: one row per value added, changed or removed."""
    rows = []
    for uid, now in after.items():
        was = before.get(uid, {})
        for field in sorted(set(was) | set(now)):
            if was.get(field) != now.get(field):
                rows.append({"uid": uid, "field": field, "before": was.get(field), "after": now.get(field), "rule": rule})
    return rows


def tree_from_uxml(doc: dict[str, Any]) -> ET.ElementTree:
    if doc.get("schemaVersion") != SCHEMA:
        raise UxmlTreeRefusal(f"UXML_TREE_SCHEMA: expected {SCHEMA}, got {doc.get('schemaVersion')!r}")
    # PR 439 review N1: one Python process serves every Run in a browser tab (Pyodide); ids of freed elements are
    # reused, so the uids of an earlier tree must not stay behind for this one.
    _UIDS.clear()
    root, slots = _skeleton(doc)
    namespace = root.tag[1:].split("}")[0] if root.tag.startswith("{") else ""
    q = (lambda name: f"{{{namespace}}}{name}") if namespace else (lambda name: name)
    parents = {child: parent for parent in root.iter() for child in parent}
    for pipeline, slot in zip(doc["pipelines"], slots):
        branch = ET.Element(q("Branch"))
        _UIDS[id(branch)] = pipeline.get("uid", "")
        _add_values(branch, pipeline, q)
        for comp in pipeline.get("components") or []:
            node = ET.SubElement(branch, q("Node"))
            _UIDS[id(node)] = comp.get("uid", "")
            _add_values(node, comp, q)
            for restraint in comp.get("restraints") or []:
                element = ET.SubElement(node, q("Restraint"))
                _UIDS[id(element)] = restraint.get("uid", "")
                _add_values(element, restraint, q)
        parent = parents[slot]
        parent[list(parent).index(slot)] = branch
    return ET.ElementTree(root)


_JOINED = re.compile(r"^NodeNumber (-?\d+) renamed to (-?\d+):")


def _number(text: str) -> int | None:
    try:
        value = float(text)
    except ValueError:
        return None
    return int(value) if value.is_integer() else None


def node_map(tree: ET.ElementTree, cii_numbers: set[int], joined: list[str]) -> dict[str, Any]:
    """E4b step 2 (Owner 21 Nov 2026, "Yes, as suggested"): which UXML node ids made each CII node number, for the
    sidecar. A node's number is its NodeNumber after the engine's prepare steps (the split valve/flange renumbering
    changes the tree in place), then the engine's joins of unconnected island nodes (`joined`, its own log lines
    "NodeNumber <old> renamed to <new>: ..."). A CII node number can come from several ids (a branch's first node on its
    parent's node); every id is listed once, in `nodes` or in `notInCii` (unnumbered, or not written to the CII)."""
    renamed: dict[int, int] = {}
    for entry in joined:
        m = _JOINED.match(entry)
        if not m:
            raise UxmlTreeRefusal(f"UXML_NODE_MAP_JOIN: {entry!r}")
        renamed[int(m.group(1))] = int(m.group(2))

    def final(n: int) -> int:
        seen = set()
        while n in renamed and n not in seen:
            seen.add(n)
            n = renamed[n]
        return n

    by_number: dict[int, list[str]] = {}
    outside: list[dict[str, str]] = []
    for element in tree.getroot().iter():
        uid = _UIDS.get(id(element))
        if not uid or element.tag.split("}")[-1] != "Node":
            continue
        text = next(((c.text or "").strip() for c in element if c.tag.split("}")[-1] == "NodeNumber"), "")
        number = _number(text)
        if number is not None and number > 0 and final(number) in cii_numbers:
            by_number.setdefault(final(number), []).append(uid)
        else:
            outside.append({"id": uid, "nodeNumber": text})
    return {"schema": "uxml-cii-node-map/v1", "nodes": [{"cii": n, "ids": by_number.get(n, [])} for n in sorted(cii_numbers)],
            "notInCii": outside}
