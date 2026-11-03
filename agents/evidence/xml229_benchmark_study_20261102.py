"""Read literal benchmark records without importing converter implementation."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
PIN = "5c39dd7bdbb7f2f63a686823b72bdb81909d52af"
PATHS = [
    "Benchmarks/EF-05-PRO.TEST.xml",
    "Benchmarks/EF-05-PRO.TEST_enriched-3.xml",
    "Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml",
    "Benchmarks/XML-CII-2019/revamped/PL-BM1.xml",
    "Benchmarks/ASIM-1836_managed_stage-2.zip",
    "Benchmarks/INPUT XML to CII 2019/BM_CII/BM_CII_INPUT.XML",
    "Benchmarks/INPUT XML to CII 2019/BM_CII/BM_CII[Benchmark].CII",
    "Benchmarks/XML-CII-2019/sideload/bm_3branches_20nodes.input.xml",
    "Benchmarks/XML-CII-2019/sideload/bm_3branches_20nodes.source-like.json",
]


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True,
                          capture_output=True).stdout


def local(tag):
    return tag.rsplit("}", 1)[-1]


def fields(element):
    return {local(c.tag): (c.text or "").strip() for c in element if not len(c)}


def inventory():
    rows = []
    for name in PATHS:
        data = (ROOT / name).read_bytes()
        pinned = git("show", PIN + ":" + name)
        exact = data == pinned
        crlf_only = not exact and data.replace(b"\r\n", b"\n") == pinned
        if not exact and not crlf_only:
            raise ValueError("Unqualified benchmark content difference: " + name)
        rows.append({"path": name, "bytes": len(data),
                     "sha256": hashlib.sha256(data).hexdigest(),
                     "pinnedSha256": hashlib.sha256(pinned).hexdigest(),
                     "gitBlob": git("rev-parse", PIN + ":" + name).decode().strip(),
                     "byteIdentity": "PASS" if exact else "FAIL",
                     "difference": "NONE" if exact else "WORKTREE_CRLF_VS_GIT_LF"})
    return rows


def census(name):
    root = ET.parse(ROOT / name).getroot()
    out = {"path": name, "branches": 0, "nodes": 0, "minusOne": 0,
           "minusTwo": 0, "sameBranchCoincidentGroups": 0,
           "sameBranchMixedPositiveNegativeGroups": 0,
           "multiRestraintNodes": 0, "maxRestraints": 0}
    for branch in root.iter():
        if local(branch.tag) != "Branch":
            continue
        out["branches"] += 1
        groups = defaultdict(list)
        for node in branch:
            if local(node.tag) != "Node":
                continue
            f = fields(node)
            out["nodes"] += 1
            out["minusOne"] += f.get("NodeNumber") == "-1"
            out["minusTwo"] += f.get("NodeNumber") == "-2"
            groups[f.get("Position", "")].append(f.get("NodeNumber", ""))
            count = sum(local(c.tag) == "Restraint" for c in node)
            out["multiRestraintNodes"] += count > 1
            out["maxRestraints"] = max(out["maxRestraints"], count)
        for position, numbers in groups.items():
            if position and len(numbers) > 1:
                out["sameBranchCoincidentGroups"] += 1
                out["sameBranchMixedPositiveNegativeGroups"] += (
                    any(n.startswith("-") for n in numbers)
                    and any(n.isdigit() and int(n) > 0 for n in numbers))
    return out


def ef_examples():
    examples = {}
    root = ET.parse(ROOT / PATHS[1]).getroot()
    for branch in root.iter():
        if local(branch.tag) != "Branch":
            continue
        for node in branch:
            f = fields(node)
            if f.get("ComponentRefNo") not in (
                    "=1006649732/119349", "=1006649732/119355"):
                continue
            examples[f["NodeNumber"]] = {
                "branch": fields(branch).get("Branchname"), "node": f,
                "restraints": [fields(c) for c in node if local(c.tag) == "Restraint"]}
    for number, types, gaps in [("90", ["+Y", "GUI"], ["0", "6"]),
                                ("160", ["+Y", "GUI", "LIM"], ["0", "20", "20"])]:
        assert [r["Type"] for r in examples[number]["restraints"]] == types
        assert [r["Gap"] for r in examples[number]["restraints"]] == gaps
    return examples


def bm_cii():
    lines = (ROOT / PATHS[6]).read_text().splitlines()
    start = next(i for i, s in enumerate(lines) if s.startswith("#$ RESTRANT")) + 1
    end = next(i for i in range(start, len(lines)) if lines[i].startswith("#$"))
    section = lines[start:end]
    assert len(section) == 192
    native = defaultdict(list)
    for block in range(0, len(section), 24):
        for slot in range(6):
            values = section[block + slot * 4].split()
            direction = section[block + slot * 4 + 1].split()
            assert len(values) == 6 and len(direction) == 3
            if float(values[0]):
                native[str(int(float(values[0])))].append({
                    "slot": slot + 1, "type": int(float(values[1])),
                    "stiffness": values[2], "gap": values[3],
                    "friction": values[4], "direction": direction})
    input_types = defaultdict(list)
    for restraint in ET.parse(ROOT / PATHS[5]).getroot().iter():
        if local(restraint.tag) == "RESTRAINT" and float(restraint.get("NODE", "0")) > 0:
            number = str(int(float(restraint.get("NODE"))))
            input_types[number].append(int(float(restraint.get("TYPE"))))
    assert [r["type"] for r in native["35"]] == [14, 2, 4]
    assert [r["type"] for r in native["255"]] == [14, 8]
    assert input_types["35"] == [17, 1, 3] and input_types["255"] == [17, 7]
    return {"auxBlocks": 8, "slotsPerBlock": 6, "linesPerSlot": 4,
            "native": {k: native[k] for k in ["35", "205", "255"]},
            "inputXmlTypes": {k: input_types[k] for k in ["35", "205", "255"]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Choose a new output path; existing evidence is preserved")
    manifests = inventory()
    result = {"schema": "XML229.BenchmarkStudyEvidence.v1",
              "purpose": "Literal fixture examination; no converter acceptance",
              "observedAt": datetime.now(timezone.utc).isoformat(), "candidate": PIN,
              "localHead": git("rev-parse", "HEAD").decode().strip(),
              "inventoryFiles": sum(p.is_file() for p in (ROOT / "Benchmarks").rglob("*")),
              "manifest": manifests, "census": [census(p) for p in PATHS[:4]],
              "efEnrichedExamples": ef_examples(), "bmCii": bm_cii(),
              "validation": {"literalObservations": "PASS", "byteIdentity": {
                  "PASS": sum(r["byteIdentity"] == "PASS" for r in manifests),
                  "FAIL": sum(r["byteIdentity"] == "FAIL" for r in manifests)},
                  "oracle": "Independent of converter execution; fixture acceptance history unqualified",
                  "engineeringAcceptance": "NOT_RUN"}}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(args.output.read_text(encoding="utf-8")) == result
    print(json.dumps({"artifact": str(args.output.resolve()), "validation": result["validation"],
                      "sha256": hashlib.sha256(args.output.read_bytes()).hexdigest()}))


if __name__ == "__main__":
    main()
