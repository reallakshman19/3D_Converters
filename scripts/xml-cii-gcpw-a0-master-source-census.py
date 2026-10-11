#!/usr/bin/env python3
"""Read-only GC-PW A0 four-master input census, not Preview engineering approval.

Only standard-library readers are used. Every result is bound to full file
content SHA-256. XLSX rows are reported per sheet, not inferred by filename,
file length, Excel display range or a desired expected count.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OFFICE_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PACKAGE_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
FILES = {
    "lineList": "docs/Masters/ImportedRawLineListLL.xlsx",
    "pipingClass": "docs/Masters/Piping_class_master.json",
    "materialMap": "docs/Masters/PCF_MAT_MAP.TXT",
    "weight": "docs/Masters/wtValveweights.json",
}
# The three unambiguous JSON/text source counts are contract census controls.
# XLSX logical-row and sheet selection must be reviewed separately, since the
# workbook may contain headers, blank formatted rows or alternate sheets.
EXPECTED = {"pipingClass": 10699, "materialMap": 383, "weight": 1595}


def source_info(path):
    data = path.read_bytes()
    if not data:
        raise ValueError(f"{path}: empty source")
    return {"path": path.as_posix(), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def xlsx_sheets(path):
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError(f"{path}: ZIP CRC error at {bad}")
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {node.attrib["Id"]: node.attrib["Target"]
                   for node in relationships.findall(f"{PACKAGE_REL}Relationship")}
        sheets = workbook.find(f"{MAIN}sheets")
        if sheets is None or not len(sheets):
            raise ValueError(f"{path}: workbook contains no sheets")
        results = []
        for tab in sheets:
            relation = tab.attrib.get(f"{OFFICE_REL}id")
            target = targets.get(relation, "")
            # XLSX paths are ZIP members and never read as filesystem paths.
            member = target.lstrip("/") if target.startswith("/") else "xl/" + target
            member = re.sub(r"(?:^|/)\.(/|$)", "/", member)
            if member not in archive.namelist():
                raise ValueError(f"{path}: missing sheet entry {member}")
            root = ET.fromstring(archive.read(member))
            grid = root.find(f"{MAIN}sheetData")
            populated = []
            for row in ([] if grid is None else grid.findall(f"{MAIN}row")):
                cells = row.findall(f"{MAIN}c")
                if any(cell.find(f"{MAIN}v") is not None
                       or cell.find(f"{MAIN}is") is not None
                       or cell.find(f"{MAIN}f") is not None for cell in cells):
                    populated.append(int(row.attrib["r"]))
            results.append({
                "name": tab.attrib.get("name", ""),
                "worksheet": member,
                "populatedRowCount": len(populated),
                "firstPopulatedRow": populated[0] if populated else None,
                "lastPopulatedRow": populated[-1] if populated else None,
                "rowsAfterFirstHeaderCandidate": max(0, len(populated) - 1),
            })
        return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    records = {key: source_info(root / rel) for key, rel in FILES.items()}
    for row in records.values():
        row["path"] = str(Path(row["path"]).relative_to(root))
    raw_piping = json.loads((root / FILES["pipingClass"]).read_text(encoding="utf-8"))
    raw_weight = json.loads((root / FILES["weight"]).read_text(encoding="utf-8"))
    if not isinstance(raw_piping, list) or not isinstance(raw_weight, list):
        raise ValueError("Source JSON masters must be top-level arrays")
    # The TXT first line is the version marker; blank lines are ignored, not
    # assumed to represent missing material rows.
    lines = (root / FILES["materialMap"]).read_text(encoding="utf-8-sig").splitlines()
    nonblank = [line for line in lines if line.strip()]
    if not nonblank or nonblank[0].strip() != "2019":
        raise ValueError("PCF_MAT_MAP.TXT does not start with expected version marker")
    material_rows = nonblank[1:]
    if not all(re.match(r"^\s*\d+\s+\S", row) for row in material_rows):
        raise ValueError("Material Map has a nonconforming data line")
    observations = {
        "pipingClass": len(raw_piping),
        "materialMap": len(material_rows),
        "weight": len(raw_weight),
    }
    for key, want in EXPECTED.items():
        if observations[key] != want:
            raise ValueError(f"{key} source census mismatch: observed {observations[key]}, expected {want}")
    sheets = xlsx_sheets(root / FILES["lineList"])
    if not sheets or not any(item["populatedRowCount"] > 1 for item in sheets):
        raise ValueError("Line List XLSX has no populated candidate data sheet")
    try:
        git_head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        git_head = "UNAVAILABLE"
    report = {
        "schema": "xml-cii.gcpw.a0-master-source-census.v1",
        "gitHead": git_head,
        "status": "SOURCE_CENSUS_ONLY_NOT_ENGINEERING_READY",
        "files": records,
        "observed": observations,
        "expectedUnambiguous": EXPECTED,
        "lineListSheets": sheets,
        "notProven": [
            "Line List authoritative mapped sheet and actual 385 logical rows",
            "Full selected Owner hierarchy and independent master mapping authority",
            "Actual four-master Preview UI execution time, memory and DOM responsiveness",
            "Completed physical FactRecord population and reviewed Weight/Final authority",
            "Genuine Owner ~30MiB positive and independent end-to-end CII",
        ],
    }
    formatted = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    print(formatted, end="")
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(formatted, encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, ET.ParseError, zipfile.BadZipFile) as error:
        print(f"A0_SOURCE_CENSUS_FAIL: {error}", file=sys.stderr)
        sys.exit(1)
