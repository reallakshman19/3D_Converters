#!/usr/bin/env python3
"""B1 NEXT-08A: READ-ONLY original XLSX source/key-admissibility investigation.

No arbitrary 385-row reduction or Owner source authority is conferred here.
Use existing A0 parser's source SHA, original ZIP/sheet census and independent
non-mutating cell/grid inspection. Do not rewrite B1 or any original workbook.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys
import zipfile
from xml.etree import ElementTree as ET

MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OFFICE_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PACKAGE_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
ROOT = Path(__file__).resolve().parents[2]
A0 = runpy.run_path(str(ROOT / "scripts/xml-cii-gcpw-a0-master-source-census.py"))
BOOKS = {
    "ImportedRawLineListLL": {
        "path": "docs/Masters/ImportedRawLineListLL.xlsx",
        "sha256": "a73d86cfb8a69ed0aad7e4656dd7a8d62075ffe1c3bf1bae0959601afbfdadbc",
        "physicalRows": 802,
    },
    "LineDump": {
        "path": "docs/Masters/LineDump.xlsx",
        "sha256": "60d30737680e6b6f2d23bc3f9aeafb794b326cb3087d79f6d8e9902b64758fb5",
        "physicalRows": 206,
    },
}
OTHER = {
    "pipingClass": {
        "path": "docs/Masters/Piping_class_master.json",
        "sha256": "74997209ffbbf4c5e1eacc9948ec89a5e2f59ad87cc3dd7cfca6d24166d7fab1",
        "count": 10699,
    },
    "materialMap": {
        "path": "docs/Masters/PCF_MAT_MAP.TXT",
        "sha256": "84b2e94488e5bceb135557a9272b0a75a87d9a53c46783865373b18f7c4dda29",
        "count": 383,
    },
    "weight": {
        "path": "docs/Masters/wtValveweights.json",
        "sha256": "c6dc8cb1347d7250666979eb64a7e2a9e56dce216aeecaf4dc38b165137b6ada",
        "count": 1595,
    },
}
KEY_WORDS = re.compile(
    r"reference|ref\b|line\b|line.?number|name\b|service|owner|zone|area|"
    r"pipe.*spec|class\b|key\b|id\b", re.I
)


def fingerprint(path: Path) -> dict:
    data = path.read_bytes()
    if not data:
        raise ValueError(f"EMPTY_SOURCE_FILE:{path}")
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def workbook_grids(path: Path) -> list[dict]:
    """Decode every XML row with physical Excel coordinate; no data alterations."""
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError("XLSX_BAD_CRC")
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relroot = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {
            x.attrib["Id"]: x.attrib["Target"]
            for x in relroot.findall(f"{PACKAGE_REL}Relationship")
        }
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = [
                "".join(t.text or "" for t in si.iter(f"{MAIN}t"))
                for si in strings.findall(f"{MAIN}si")
            ]
        sheets = workbook.find(f"{MAIN}sheets")
        if sheets is None:
            raise ValueError("XLSX_MISSING_SHEETS")
        result = []
        for sheet in sheets:
            relid = sheet.attrib.get(f"{OFFICE_REL}id")
            if relid not in targets:
                raise ValueError("XLSX_DANGLING_SHEET_RELATION")
            raw_target = targets[relid]
            member = raw_target.lstrip("/") if raw_target.startswith("/") else "xl/" + raw_target
            member = re.sub(r"(?:^|/)\.(/|$)", "/", member)
            if member not in archive.namelist():
                raise ValueError("XLSX_MISSING_SHEET_PART:" + member)
            node = ET.fromstring(archive.read(member))
            data = node.find(f"{MAIN}sheetData")
            rows = []
            for item in [] if data is None else data.findall(f"{MAIN}row"):
                cells = {}
                for cell in item.findall(f"{MAIN}c"):
                    cref = cell.attrib.get("r", "")
                    col = re.match(r"^[A-Z]+", cref)
                    if col is None:
                        continue
                    valnode = cell.find(f"{MAIN}v")
                    inline = cell.find(f"{MAIN}is")
                    if cell.attrib.get("t") == "s" and valnode is not None:
                        index = int(valnode.text)
                        if not 0 <= index < len(shared):
                            raise ValueError("XLSX_SHARED_STRING_OUT_OF_RANGE")
                        value = shared[index].strip()
                    elif valnode is not None and valnode.text:
                        value = valnode.text.strip()
                    elif inline is not None:
                        value = "".join(t.text or "" for t in inline.iter(f"{MAIN}t")).strip()
                    elif cell.find(f"{MAIN}f") is not None:
                        value = "<FORMULA_WITHOUT_CACHED_VALUE>"
                    else:
                        value = ""
                    if value:
                        cells[col.group()] = value
                if cells:
                    rows.append({"excelRow": int(item.attrib["r"]), "cells": cells})
            result.append({
                "sheetName": sheet.attrib.get("name", ""),
                "worksheetPart": member,
                "rows": rows,
            })
        return result


def analyze_rows(rows: list[dict], sheet_name: str) -> dict:
    """Header-based candidates only; NEVER asserts an approved logical key."""
    first = rows[0]["cells"] if rows else {}
    cols = sorted({col for row in rows for col in row["cells"]},
                  key=lambda key: (len(key), key))
    candidates = []
    for col in cols:
        label = first.get(col, "")
        if not KEY_WORDS.search(label):
            continue
        values = [row["cells"].get(col, "") for row in rows[1:]]
        present = [v for v in values if v]
        distinct = len(set(present))
        candidates.append({
            "physicalColumn": col, "literalHeaderCandidate": label[:120],
            "nonemptyBelowFirstRow": len(present),
            "distinctExactValues": distinct,
            "collisionCount": len(present)-distinct,
            "emptyRowsBelowFirst": len(values)-len(present),
            "exact385Coincidence": distinct == 385,
            "ownerApproved": False,
        })
    pairs = []
    for i, left in enumerate(candidates[:12]):
        for right in candidates[i+1:12]:
            lc, rc = left["physicalColumn"], right["physicalColumn"]
            combos = [(r["cells"].get(lc,""),r["cells"].get(rc,""))
                      for r in rows[1:]]
            combinations = [t for t in combos if all(t)]
            distinct = len(set(combinations))
            pairs.append({
                "physicalColumns": [lc,rc], "completeRows": len(combinations),
                "distinctExactPairs": distinct,
                "pairCollisionCount": len(combinations)-distinct,
                "exact385Coincidence": distinct == 385,
                "ownerApproved": False,
            })
    return {
        "sheet": sheet_name,
        "populatedPhysicalRows": len(rows),
        "firstPopulatedExcelRow": rows[0]["excelRow"] if rows else None,
        "lastPopulatedExcelRow": rows[-1]["excelRow"] if rows else None,
        "rowsBelowUnverifiedFirstHeader": max(0,len(rows)-1),
        "physicalColumnCount": len(cols),
        "headerCandidates": {k:first[k][:120] for k in cols if k in first},
        "keyCandidateColumns": candidates,
        "keyCandidatePairs": pairs,
        "anyExact385Candidate": (
            any(x["exact385Coincidence"] for x in candidates) or
            any(x["exact385Coincidence"] for x in pairs)
        ),
        "approvedLogicalLineList385": "NOT_ATTESTED",
        "authorizedDatasetSha256": None,
        "authorizedSheet": None,
        "authorizedKeyFields": None,
        "authorizedOwnerZoneSelection": None,
    }


def self_test():
    sample = [
        {"excelRow": 1, "cells": {"A":"Reference", "B":"Pipe specification"}},
        {"excelRow": 2, "cells": {"A":"A", "B":"PC01"}},
        {"excelRow": 3, "cells": {"A":"A", "B":"PC02"}},
        {"excelRow": 4, "cells": {"A":"A", "B":"PC02"}},
    ]
    result = analyze_rows(sample, "synthetic")
    assert result["populatedPhysicalRows"] == 4
    assert result["keyCandidateColumns"][0]["distinctExactValues"] == 1
    assert result["keyCandidatePairs"][0]["distinctExactPairs"] == 2
    assert result["approvedLogicalLineList385"] == "NOT_ATTESTED"
    assert result["authorizedDatasetSha256"] is None
    assert not result["anyExact385Candidate"]
    print("NEXT08A_PROBE_NEGATIVE_PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--self-test", action="store_true")
    options = parser.parse_args()
    if options.self_test:
        self_test()
        return 0
    books, observed = [], {}
    for name, src in BOOKS.items():
        path = ROOT / src["path"]
        fp = fingerprint(path)
        if fp["sha256"] != src["sha256"]:
            raise ValueError(f"WORKBOOK_SHA_MISMATCH:{name}")
        grids = workbook_grids(path)
        prior = A0["xlsx_sheets"](path)
        if len(grids) != len(prior):
            raise ValueError("A0_INDEPENDENT_SHEET_COUNT_MISMATCH")
        sheets = []
        for sheet, control in zip(grids, prior):
            report = analyze_rows(sheet["rows"], sheet["sheetName"])
            if report["populatedPhysicalRows"] != control["populatedRowCount"]:
                raise ValueError("A0_INDEPENDENT_ROW_COUNT_MISMATCH")
            sheets.append(report)
        total = sum(s["populatedPhysicalRows"] for s in sheets)
        if total != src["physicalRows"]:
            raise ValueError(f"WORKBOOK_PHYSICAL_ROWS_CHANGED:{name}:{total}")
        books.append({"candidate":name,"sourcePath":src["path"],**fp,
                      "sheets":sheets,"approved385":False})
    for label, src in OTHER.items():
        data = ROOT.joinpath(src["path"]).read_bytes()
        if hashlib.sha256(data).hexdigest()!=src["sha256"]:
            raise ValueError("OTHER_MASTER_SOURCE_CHANGED:" + label)
        if label=="materialMap":
            text = data.decode("utf-8-sig").splitlines()
            nonempty = [x for x in text if x.strip()]
            if nonempty[0].strip()!="2019":
                raise ValueError("MATERIAL_VERSION_INVALID")
            count = len(nonempty)-1
        else:
            count = len(json.loads(data))
        if count!=src["count"]:
            raise ValueError("OTHER_MASTER_COUNT_CHANGED:"+label)
        observed[label]={"sourceSha256":src["sha256"],"rows":count}
    report={
        "schema":"LFJ.NEXT08A.B1OriginalLineListCandidates.v1",
        "status":"B1_ORIGINAL_385_LOGICAL_LINE_LIST_NOT_ATTESTED",
        "qualification":"SOURCE_ONLY; NOT_REAL_PHYSICAL_PREVIEW; NOT_OWNER_MAPPING_APPROVAL",
        "sourceCandidateCount":len(books),
        "targetLogicalLineCountClaim":385,
        "logicalLineCountMeasured":None,
        "lineListSourceCandidates":books,
        "otherOriginalMasterControls":observed,
        "ownerDecisionNeeded":[
            "authoritative original Line List SHA and exact worksheet",
            "approved logical row rule and candidate key columns",
            "approved 385 logical lines (not generated by trimming or deduplication)",
            "owner-zone-selected applicability and revision/digest contract",
            "exclusive B1 Preview producer writer before implementation",
        ],
    }
    encoded=json.dumps(report,indent=2,sort_keys=True,ensure_ascii=False)+"\n"
    if options.out is not None:
        options.out.parent.mkdir(parents=True,exist_ok=True)
        options.out.write_text(encoded,encoding="utf8")
    print("NEXT08A_B1_SOURCE_CANDIDATES "+json.dumps({
        "sourceCandidates":[{"name":x["candidate"],"sha256":x["sha256"],
          "sheets":[{"name":s["sheet"],"physicalRows":s["populatedPhysicalRows"],
            "headerKeyCandidateColumns":len(s["keyCandidateColumns"]),
            "has385NumericalCandidate":s["anyExact385Candidate"]}
            for s in x["sheets"]]} for x in books],
        "masterControls":{k:v["rows"] for k,v in observed.items()},
        "approvedLogicalLineList385":"NOT_ATTESTED",
        "receipt":str(options.out) if options.out else None,
    },sort_keys=True))
    return 0


if __name__=="__main__":
    try:
        sys.exit(main())
    except (ValueError,OSError,KeyError,ET.ParseError,zipfile.BadZipFile) as error:
        print("NEXT08A_SOURCE_CANDIDATE_REJECTED "+str(error),file=sys.stderr)
        sys.exit(1)
