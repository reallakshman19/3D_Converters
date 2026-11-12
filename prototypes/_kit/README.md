# TopoFix prototype kit (v1, 12 Nov 2026)

Copy these two folders to the root of the repo your card lives in (XCU or 3D_Converters):

```
shared/topofix-formats/   Map file + Change set v1: schemas, validate.mjs, examples, BENCHMARKS.json
prototypes/_kit/          core.mjs, node.mjs, cii14.mjs, xmlspan.mjs (runtime), new-card.mjs, card-check.mjs, tests/
prototypes/_template/     the folder every card starts from
prototypes/p00-demo/      a finished demo card that passes card-check (delete it in real repos)
```

## Start a card (3 commands)
```
node prototypes/_kit/new-card.mjs p02-cii-edit-kernel "CII edit kernel" --prefix KERNEL
#   paste your card into prototypes/p02-cii-edit-kernel/CARD.md, then build
cd prototypes/p02-cii-edit-kernel && node --test
node ../_kit/card-check.mjs .            # before every push; add --final before asking for review
```

## What the kit gives you
| file | use |
|---|---|
| `kit/core.mjs` | `refuse(code, where, detail)`, `require(ok, code, ...)`, `attempt(fn)` all-or-nothing result, `RefusalList`, `sha256Hex`, `requireSha256`, `timeMedian(fn, 3)`, `lineEnding` |
| `kit/node.mjs` | `readBenchmark('C-TRC', args)` (checks size + sha256), `parseArgs`, `repoRoots`, `readBytes`, `writeResult(rows)`, `finish(result)` (exit 0/1), `usage(text)` (exit 2) |
| `kit/cii14.mjs` | CAESAR II **v14-only** reader: `readCii14(bytes)` gives sections, CONTROL counts, elements (FROM/TO, DX/DY/DZ, DIAMETER, WALL, INSUL, T1, P1, 15 aux pointers), rigids (weight/type) and node names, each with exact byte offsets; `fieldDiff(a,b)` for re-checks; `rigidOf`. 17 `CII_*` refusals. Tested on S1/S2/S3/T/TEXPECTED (16 tests, 3 planted bugs caught). Reads T.CII (2.87 MB) in ~120 ms. |
| `kit/xmlspan.mjs` | Byte-offset XML scanner for **PSI116 and InputXML** (the same for CII v11 and v14 work). `scanXml(bytes)` gives every element, attribute value and leaf text with exact byte offsets; `text`, `child`, `attr`; `psi116Index` (step-10 numbering: branchOrdinal over all Branch, nodeOrdinal over direct Node) and `locatePsi116(doc, index, ref, 'Node/Weight')`; `inputXmlIndex`; `replaceSpans`; `xmlDiff` re-check (refuses `XML_MARKUP_CHANGED` / `XML_STRUCTURE_CHANGED`). Refuses DOCTYPE, other encodings, bad UTF-8 and unknown entities. 20 tests: 9 public files match Python ElementTree exactly; 4 planted bugs caught; C-PSI (643 KB) in ~50 ms. |
| `kit/BENCHMARKS.json` | the 25 pinned public files: id, repo, path, bytes, sha256, counts (only X-S1, X-S2, X-S3C, X-T, X-TEXP are v14) |
| `card-check.mjs` | C1 layout · C2 kit unchanged · C3 every CARD test id has a test titled with it · C4 every engine refusal code documented and tested · C5 no imports outside the folder, no packages, no network · C6 vendored files hashed · C7 fixtures in manifest with hashes · C8 no Owner-only inputs · C9 (--final) bench passed and REPORT filled |

Benchmarks are read from repo checkouts: `--root XCU=<path> --root 3DC=<path>` or env `TOPOFIX_ROOT_XCU`, `TOPOFIX_ROOT_3DC`; default is the repo the card lives in.

Kit files inside a card are copies: never edit them (card-check C2). If the kit changes, make a new card copy or ask the Oracle.

## How to change a CII or XML file surgically (every edit lane)
1. Never parse-and-rewrite a file. Locate the value's byte span with `cii14.mjs` or `xmlspan.mjs`, replace only those bytes.
2. Edits travel as a Change set (target ref, field, exact old token, new value, base sha256). One tested applier writes; agents never slice strings themselves.
3. Address by structure (element / rigid pointer / branchOrdinal+nodeOrdinal), check the ref's names and the old token, then resolve to bytes. A stale file or a different old token is refused.
4. Write the new value in the same form as the old token (CII: same 13-character field and style; XML: escaped, surrounding whitespace kept).
5. Re-read and diff: `fieldDiff` (CII) or `xmlDiff` (XML) must list exactly the planned values; anything else changed is a refusal.
6. Value edits never add or remove records; structure changes are a separate, recipe-based operation.
7. In XML, edit the value where it is defined (the owner), not where it is displayed; an inherited value is refused.

## Kit self-tests
```
cd prototypes/_kit && TOPOFIX_ROOT_XCU=<XCU checkout> TOPOFIX_ROOT_3DC=<3D_Converters checkout> node --test   # 36 tests: CII v14 reader + XML scanner
```
