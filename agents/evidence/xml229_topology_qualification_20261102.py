"""Read-only native-reader and original-member evidence, Git-pinned to V6."""
import ast
from collections import Counter
import contextlib
import hashlib
import importlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PIN = "5c39dd7bdbb7f2f63a686823b72bdb81909d52af"
SCRATCH = ROOT / ".local-test-tmp/xml229-topology-qualification-20261102"
FIXTURE = ROOT / "Benchmarks/EF-05-PRO.TEST.xml"
ARCHIVE = ROOT / "Benchmarks/ASIM-1836_managed_stage-2.zip"
BRANCH = '/ASIM-1836-8"-P8810021-31441C4-PP/B4'


def blob(path):
    return subprocess.check_output(["git", "show", f"{PIN}:{path}"], cwd=ROOT)


def export_python():
    folder = "converters/scripts/"
    names = set(subprocess.check_output(["git", "ls-tree", "--name-only", f"{PIN}:{folder}"], cwd=ROOT, text=True).splitlines())
    pending, manifest = ["xml_to_cii2019.py"], {}
    dest = SCRATCH / "native-source"
    dest.mkdir(parents=True, exist_ok=True)
    while pending:
        name = pending.pop()
        if name in manifest:
            continue
        raw = blob(folder + name)
        (dest / name).write_bytes(raw)
        manifest[folder + name] = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
        for node in ast.walk(ast.parse(raw.decode("utf-8-sig"))):
            modules = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module] if isinstance(node, ast.ImportFrom) else []
            for module in modules:
                candidate = str(module).split(".")[0] + ".py"
                if candidate in names:
                    pending.append(candidate)
    return dest, manifest


def original_rows():
    rows = []
    for bi, branch in enumerate(ET.parse(FIXTURE).getroot().findall(".//{*}Branch")):
        for ni, node in enumerate(branch.findall("{*}Node")):
            row = {"branchOrdinal0": bi, "sourceNodeOrdinal0": ni, "branch": branch.findtext("{*}Branchname")}
            row.update({k: node.findtext("{*}" + k, "").strip() for k in ["NodeNumber", "NodeName", "Endpoint", "ComponentType", "ComponentRefNo", "Position"]})
            rows.append(row)
    return rows


def summarize(document):
    return [{"branch": b.branch_name, "nodes": [{"number": n.node_number, "name": n.node_name,
             "position": n.position, "restraintCount": len(n.restraint_specs)} for n in b.nodes]}
            for b in document.branches]


def graph_components(edges):
    neighbors = {}
    for edge in edges:
        a, b = edge.from_node.node_number, edge.to_node.node_number
        neighbors.setdefault(a, set()).add(b)
        neighbors.setdefault(b, set()).add(a)
    components, visited = [], set()
    for start in neighbors:
        if start in visited:
            continue
        todo, component = [start], []
        while todo:
            node = todo.pop()
            if node in visited:
                continue
            visited.add(node)
            component.append(node)
            todo.extend(neighbors[node] - visited)
        components.append(sorted(component))
    return components


def crossing_fixture():
    root = ET.Element("CleanXML")
    for name, points in [("CONTROL-A", [(10, 0, 0, 0), (20, 100, 0, 0), (30, 200, 0, 0)]),
                         ("CONTROL-B", [(40, 100, -100, 0), (50, 100, 0, 0), (60, 100, 100, 0)])]:
        branch = ET.SubElement(root, "Branch")
        ET.SubElement(branch, "Branchname").text = name
        for number, x, y, z in points:
            node = ET.SubElement(branch, "Node")
            for key, value in {"NodeNumber": number, "Endpoint": 0, "ComponentType": "TUBE", "Position": f"{x} {y} {z}"}.items():
                ET.SubElement(node, key).text = str(value)
    path = SCRATCH / "controlled-disconnected-crossing.xml"
    path.write_bytes(ET.tostring(root, encoding="utf-8"))
    return path


def native_cases(base):
    source = base._parse_xml_document(FIXTURE, preserve_finalized_geometry=True)
    edges = base._build_edges(source.branches)
    station = [e for e in edges if e.branch_name == BRANCH and e.from_node.node_number == 50 and e.to_node.node_number == 60]
    legacy = base._parse_xml_document(FIXTURE)
    legacy_station = [n for b in legacy.branches if b.branch_name == BRANCH for n in b.nodes if n.node_number in [50, 60]]
    crossing = base._parse_xml_document(crossing_fixture(), preserve_finalized_geometry=True)
    crossing_edges = base._build_edges(crossing.branches)
    components = graph_components(crossing_edges)
    return [
        {"id": "native-original-route-zero-span", "status": "PASS" if len(station) == 1 and base._distance_between_nodes(station[0].from_node, station[0].to_node) == 0 else "FAIL",
         "expectation": "Original positive-node branch order contains one zero-length 50->60 route edge.",
         "observed": [{"from": e.from_node.node_number, "to": e.to_node.node_number, "lengthMm": base._distance_between_nodes(e.from_node, e.to_node)} for e in station],
         "mode": "Direct original parser with preserve_finalized_geometry=True; no accepted Final packet supplied or runtime authority enabled."},
        {"id": "legacy-short-span-contraction", "status": "PASS" if [n.node_number for n in legacy_station] == [50] else "FAIL",
         "expectation": "Unmodified legacy cleanup contracts adjacent zero span into node50; this differs from governed preserved Final geometry.",
         "observed": [{"number": n.node_number, "position": n.position} for n in legacy_station]},
        {"id": "native-disconnected-interior-crossing", "status": "PASS" if components == [[10, 20, 30], [40, 50, 60]] else "FAIL",
         "expectation": [[10, 20, 30], [40, 50, 60]], "observedComponents": components, "observedEdges": [[e.from_node.node_number, e.to_node.node_number] for e in crossing_edges]},
    ]


def six_authored_members(base):
    root = ET.parse(crossing_fixture()).getroot()
    root.remove(root.findall("Branch")[1])
    ET.SubElement(root, "RestrainOpenEnds").text = "No"
    node = root.findall("Branch")[0].findall("Node")[1]
    for i, kind in enumerate(["+X", "+Y", "+Z", "-X", "-Y", "-Z"]):
        restraint = ET.SubElement(node, "Restraint")
        for key, value in {"Type": kind, "Stiffness": "1751270000000", "Gap": i, "Friction": "0.3"}.items():
            ET.SubElement(restraint, key).text = str(value)
    path = SCRATCH / "controlled-six-authored-members.xml"
    path.write_bytes(ET.tostring(root, encoding="utf-8"))
    document = base._parse_xml_document(path, preserve_finalized_geometry=True)
    model = base._build_conversion_model(document)
    lines = base._build_restraint_payload(model)
    (SCRATCH / "controlled-six-members-restrant-payload.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    slots = []
    for i in range(0, len(lines), 4):
        values = [float(v) for v in lines[i].split()]
        slots.append({"node": values[0], "type": values[1], "stiffness": values[2],
                      "gap": values[3], "friction": values[4], "direction": [float(v) for v in lines[i+1].split()]})
    expected_directions = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    passed = len(slots) == 6 and [s["type"] for s in slots] == [13, 14, 15, 16, 17, 18]
    passed = passed and [s["gap"] for s in slots] == [0, 1, 2, 3, 4, 5]
    passed = passed and all(s["node"] == 20 and s["stiffness"] == 1751270000000 and s["friction"] == 0.3 for s in slots)
    passed = passed and [s["direction"] for s in slots] == expected_directions
    return {"id": "native-six-authored-member-slots", "status": "PASS" if passed else "FAIL", "slots": slots,
            "expectation": "Six explicitly authored different directional restraints on node20 retain six types, source gaps, stiffness, friction and axis directions.",
            "scope": "Actual unchanged native RESTRANT auxiliary writer; no full accepted/Owner CII or JSON member-independence qualification."}


def archive_members():
    with zipfile.ZipFile(ARCHIVE) as archive:
        name = "ASIM-1836_managed_stage-2.json"
        raw = archive.read(name)
    selected, counts = [], Counter()
    def walk(value, path="$", branch=""):
        if isinstance(value, list):
            for i, item in enumerate(value):
                walk(item, f"{path}[{i}]", branch)
        elif isinstance(value, dict):
            attrs = value.get("attributes") or {}
            if str(value.get("type", "")).upper() == "BRANCH":
                branch = str(value.get("name") or attrs.get("NAME") or branch)
            member_name = str(attrs.get("NAME", ""))
            if re.search(r"PS-1416[89](?!\d)", member_name):
                counts[branch] += 1
                selected.append({"sourcePath": path, "branch": branch, "type": value.get("type"),
                                 "attributes": {k: attrs[k] for k in ["NAME", "DTXR", "SPRE", "MDSSUPPTYPE", "NODETYPE", "NODEGAP", "CMPSUPGAP", "POS", "POSI"] if k in attrs}})
            for key, item in value.items():
                walk(item, f"{path}.{key}", branch)
    walk(json.loads(raw))
    return {"archiveSha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "member": name,
            "memberSha256": hashlib.sha256(raw).hexdigest(), "selectedByBranch": counts, "members": selected,
            "bindingStatus": "NOT_QUALIFIED_TO_EF_XML: archived frame/branch differs; member classification evidence only."}


def main():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    assert FIXTURE.read_bytes() == blob("Benchmarks/EF-05-PRO.TEST.xml")
    assert ARCHIVE.read_bytes() == blob("Benchmarks/ASIM-1836_managed_stage-2.zip")
    source, modules = export_python()
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(source))
    stderr = io.StringIO()
    with contextlib.redirect_stderr(stderr):
        base = importlib.import_module("xml_to_cii2019")
        cases = native_cases(base)
        cases.append(six_authored_members(base))
    rows = original_rows()
    negatives = [r for r in rows if r["NodeNumber"] == "-1"]
    ids = {(r["branchOrdinal0"], r["sourceNodeOrdinal0"]) for r in rows}
    result = {"schema": "XML229.NativeOriginalTopologyQualification.v1", "candidate": PIN, "cases": cases,
              "sourceOccurrenceCensus": {"all": len(rows), "uniqueOrdinalKeys": len(ids), "minusOne": len(negatives),
                                        "minusOneDistinctXYZ": len({r["Position"] for r in negatives}),
                                        "nodeNumberKeyStatus": "INVALID: repeated placeholder is not an occurrence/vertex identity"},
              "oletSourceWitnesses": [r for r in rows if r["ComponentRefNo"] == "=1006649732/119347"],
              "archiveMembers": archive_members(), "moduleIdentity": modules,
              "fixtureSha256": hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),
              "limits": ["Original reader and base RESTRANT auxiliary writer only; no complete CII, accepted Final, private21 or engineering release.",
                         "No contracted_direction wrapper imported or installed; it is a distinct optional route."]}
    (SCRATCH / "native-result.json").write_bytes((json.dumps(result, indent=2) + "\n").encode("utf-8"))
    (SCRATCH / "native-stderr.txt").write_text(stderr.getvalue(), encoding="utf-8")
    print(json.dumps({"cases": [(c["id"], c["status"]) for c in cases], "census": result["sourceOccurrenceCensus"],
                      "archiveMembers": len(result["archiveMembers"]["members"]), "modules": len(modules)}))


if __name__ == "__main__":
    main()
