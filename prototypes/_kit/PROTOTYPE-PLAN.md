# TopoFix lanes: standalone prototype plan (v1, 12 Nov 2026)

This plan is for coders who work alone, including coders running at low thinking effort. Each card says exactly what to build, where to build it, what goes in, what must come out, which tests must pass and which numbers to report. If something is unclear, stop and ask. Do not guess.

**How to brief a coder:** send Part 1 (the rules), Part 2 (the formats) and that coder's own card from Part 4. Nothing else is needed.

---

## Part 0. Where we are (12 Nov 2026)

| ID | Lane | What | State |
|---|---|---|---|
| P0.1 | L0 Shared formats | Map file and Change set v1: schemas, 13 rule codes, a validator and examples | **Done locally.** It is in `D:/CodeD/topofix-agents/p01-formats` (2 commits; `node validate.mjs --selftest` gives OK). It is not in any GitHub repo yet; see K1 in Part 3. |
| P3.1 | L3 XML edit | Step-10 batch weights: one re-run, every edit checked, failures split in half until found, Change set export | **Done and live.** It is in v0.55, deployed 12 Nov at 3D_Converters `main` a3feec30c (`v045/tabs/xml-cii-2019-standalone/xml-cii-source-weight-reextract.js` → `applySourceBackedWeightBatch`). |
| P3.2 | L3 XML edit | Converter records which XML node produced each RIGID | **Parked.** 3 review rounds failed; the 4 known issues are in `D:/CodeD/topofix-agents/p32-lineage/CARD.md`. This card stays inside the app, not standalone. |
| P2.1 | L2 CII edit | Batch RIGID weights from a Change set | **Part done.** Step-10 "Review Final weight" already has batch corrections (Preview, Apply nearest, Approve, Stage & Verify, Re-extract). It does **not** read or write a Change set yet. The standalone card is P2.1 below. |
| P1.1, P1.2, P1.3 | L1 Mapping | CII reader, XML↔CII matching, Map file export | Not started. Base: XCU `prototypes/ciifr-map` (XML only today). |
| P2.2, P2.3 | L2 CII edit | Property Transfer write, Name Transfer from a Map file | Not started. Base: XCU `tabs/cii-workspace/cii-fnr-vnext/ui/property-transfer/*` (read-only), `nodal-transfer.js` (writes names). |
| P3.3 | L3 XML edit | Reference CII → Change set proposals (read-only) | Not started. |
| P3.4 | L3 XML edit | More fields in step 10 (wall, then insulation, then process) | Not started. Inside the app, not standalone. |
| Code C (UXML) | L3 XML edit | Categorised InputXML edit | B8 merged (XCU #255). Leftovers XCU #256 still an open draft. #257-#260 merged 7-11 Nov. XCU `main` f36cd500. |
| L4 | Topology | TopoFix | Its own queue, unchanged. TopoFix `main` f4509b5a; #34 parked. |

**Standalone order (each card can start once its "Needs" are met):**

1. K1, K2 and K3, done by the Oracle first (K2 and K3 are built; K1 needs the Owner's word to push).
2. Then, at the same time:
   - **P0.2** Edit kernel
   - **P1.1** CII reader and CII↔CII map
3. **P2.1** Weights from a Change set. Needs P0.2.
4. **P1.3** Map file export. Needs P1.1.
5. **P3.3** Reference CII → proposals. Needs P1.3.
6. **P2.3** Name Transfer from a Map file. Needs P0.2 and P1.3.
7. **P1.2** XML↔CII matching. Needs P1.1.
8. **P2.2** Property Transfer write, one family. Needs P0.2 and P1.3.

At most 3 coders in parallel, and no two coders on the same folder.

---

## Part 1. Rules for every prototype (read first)

### 1.1 What "standalone" means
- Each prototype is one folder with its own engine, command line tool, test files, fixtures and (where asked) one HTML page.
- It runs with **plain Node 20+ and a browser**. Do not use npm packages, a build step or a framework.
- Write ES modules (`.mjs` for Node-only files, `.js` for files the page also loads).
- **No imports from outside your folder.** If you need existing code, copy the file into `vendor/`. Do not edit it there; wrap it instead. Record it in `VENDORED.md`, one line per file:
  `vendor/<file> | <repo> | <path> | <commit> | <sha256 of the copied file>`
- The engine is pure: bytes in, result out. No DOM and no network. The page and the command line tool are thin wrappers around the same engine.

### 1.2 Folder layout (use exactly this)
```
<repo>/prototypes/<id>-<short-name>/
  README.md          what it does, how to run it, in plain words (one page)
  CARD.md            a copy of your card
  engine/*.mjs       the logic
  cli.mjs            node cli.mjs <args>   (prints JSON; exit 0 = OK, 1 = refused, 2 = bad usage)
  index.html         only if your card asks for a page
  vendor/            copied code (see 1.1)
  VENDORED.md
  tests/*.test.mjs   node --test   (run inside the card folder)
  tests/fixtures/    small invented files, and manifest.json
  bench/run.mjs      node bench/run.mjs  → writes bench/RESULT.json
  REPORT.md          filled in at the end (template in 1.8)
```

### 1.3 Inputs and fixtures
- **Public benchmark files** are named in each card by repo, path, size and sha256 (Part 3).
- **Read them from a checkout.** Do not copy large files into your folder. The command line tool takes the paths as arguments. The bench script takes a `--repo-root` argument, defaulting to `../..`.
- Before using a benchmark file, check its sha256. If it differs, stop with the refusal code `INPUT_SHA256_MISMATCH` and report it. Do not "fix" the hash.
- **Small fixtures** that you invent go in `tests/fixtures/`. List each one in `tests/fixtures/manifest.json`: `{file, sha256, bytes, madeBy, purpose}`.
  - Invented means invented: no names, line numbers or values copied from Owner projects.
  - Cutting a few elements out of a **public** benchmark is allowed. Record the source file and sha256 in the manifest.
- **Never use** files from `__local_inputs/`, any staged JSON (`STF_*`), the Piping class master `.xlsx`, or anything the Owner sent outside a repo. Where a card needs Owner-only data, the Owner runs that one demo.

### 1.4 Refusals (fail closed)
- Every failure is a refusal with a short upper-case code, e.g. `KERNEL_OLD_TOKEN_MISMATCH`.
- An engine never writes partial output. On any refusal the output is `{ok:false, refusals:[{code, where, detail}]}` and **no output bytes at all**.
- List every code your card names in `README.md`, each with one line saying what it means.
- Each code needs at least one test that triggers it.

### 1.5 Tests
- Write them with `node --test`, run inside the card folder (Node 22 does not accept a folder argument); they must all pass with exit 0.
- Every test named in your card ("T1, T2, ...") must exist and carry that name in its title, e.g. `test('T3 refuses a stale base file', ...)`.
- **Mutation check:** for each card, break the code on purpose 3 times (the card lists which 3) and show the named test goes red. Write the 3 results in `REPORT.md`, then undo the breaks.
- Tests must not need the internet.

### 1.6 Benchmarks
- `node bench/run.mjs --repo-root <path>` runs every benchmark in your card and writes `bench/RESULT.json`, with one entry per row: `{bench, input, sha256, counts..., ms, pass}`.
- Measure time with `performance.now()` around the engine call only, as the median of 3 runs.
- Each card gives pass limits. When a card says "report", there is no limit yet; just write the number.

### 1.7 Git
- Branch: `proto/<id>-<yyyymmdd>`, from the repo's `main`.
- Commit often. Push only your branch and open a **DRAFT** PR titled `[PROTO <id>] <short name>`.
- Never merge. Never push to `main`. Never change files outside your folder. One exception: if your card names one extra file, you may change that one file.
- After each push, post a 5-line checkpoint comment on the PR: what was done, test count, bench pass/fail, what is next, blockers.

### 1.8 REPORT.md template
```
# <id> report
Branch / head commit:
Tests: <n> pass / <n> fail   (paste the summary line of node --test)
Mutation check: M1 <what broke> -> <test> red: yes/no; M2 ...; M3 ...
Bench: paste bench/RESULT.json rows as a table
Refusal codes added:
Anything that did not fit the card (and what you did instead):
Owner demo: the exact clicks or command lines the Owner runs, and what they should see
```

### 1.9 Stop rule
- You get at most **2 review rounds**. If a reviewer fails round 2, stop.
- If the card cannot be built without weakening a check, stop and report it. Do not weaken the check.

### 1.10 Changing CII or XML bytes (all edit cards)
- Never parse a file and write it back out. Find the value's byte span with the kit (`kit/cii14.mjs` for CII v14, `kit/xmlspan.mjs` for PSI116 and InputXML), and replace only those bytes.
- Address an edit by structure (element, rigid pointer, or branchOrdinal + nodeOrdinal), and check the ref's names and the exact old token before resolving it to bytes. A stale file or a different old token is refused.
- Write the new value in the same form as the old token: the same 13-character CII field and number style, or escaped XML text with the surrounding whitespace kept.
- After every edit, re-read and diff: `fieldDiff` (CII) or `xmlDiff` (XML) must list exactly the planned values. Anything else that changed is a refusal.
- Value edits never add or remove records. Structure changes are a separate operation with its own recipe.
- In XML, edit the value where it is defined, not where it is displayed. Refuse an inherited value.

### 1.11 Plain words
Write README and refusal messages so a piping engineer can read them: short sentences and real terms (node, element, rigid, weight, restraint). No internal jargon.

---

## Part 2. The two shared formats (summary of P0.1)

The full schemas and validator are in `shared/topofix-formats/` (after K1). Validate every Map file or Change set you write with:
```
node shared/topofix-formats/validate.mjs <file>      # prints OK, or one "Rn  message" line per problem
```

**Refs: how an item is named**

| kind | keys |
|---|---|
| `cii` (element) | `elementIndex` (0-based integer, the order in `#$ ELEMENTS`), `fromNode`, `toNode` |
| `cii-node` | `node` |
| `xml` (node) | `branchOrdinal`, `branchName`, `nodeOrdinal`, `nodeNumber`, `componentRefNo` |

**Map file** (`format:"topofix.map", version:1`)
- Header: `createdAt`, `source{kind,fileName,sha256}`, `target{kind,fileName,sha256}`, `method` (geometry-pair | node-number | name | manual).
- `pairs[]`: `pairId`, `source` (ref), `target` (ref), `status` (approved | candidate | rejected), `evidence{rule,detail}`. Approved pairs also carry `approvedBy` and `approvedAt`.

**Change set** (`format:"topofix.changeset", version:1`)
- Header: `createdAt`, `base{kind,fileName,sha256}`, optional `mapFile{sha256}`.
- `changes[]`:
  - `changeId`
  - `target` (ref)
  - `field`: for example `RIGID/WEIGHT`, `NODENAME/NAME`, `Node/Weight`
  - `unit` (optional)
  - `oldToken`: the exact text in the base file
  - `newValue`
  - `evidence{source: map|reference-cii|master|manual, pairId?, detail}`
  - `approval{approved, by, at, zeroConfirmed?, ownerApproved?}`
  - `span{start,end}` (optional, a hint only)

**Rule codes R1-R13 (the validator enforces them)**

| Code | Rule |
|---|---|
| R1 | Format and version are correct |
| R2 | Each sha256 is 64 hex characters |
| R3 | Ids are unique |
| R4 | Refs are well formed |
| R5 | Map pair kinds match the header |
| R6 | Change kinds match `base.kind` |
| R7 | No two changes share a target and field |
| R8 | Approved items have who and when |
| R9 | A new value of 0 needs `zeroConfirmed` |
| R10 | Approved pairs are 1:1 |
| R11 | Evidence from a map needs a `pairId` |
| R12 | An approved XML change needs `ownerApproved` |
| R13 | Each span matches `oldToken` and spans don't overlap |

**Field names used in v1.** Add a new one only when your card says so.

| field | file | where |
|---|---|---|
| `RIGID/WEIGHT` | CII | `#$ RIGID` card of the rigid that the element's rigid pointer names, field 1 |
| `NODENAME/NAME` | CII | `#$ NODENAME` entry of the element's FROM or TO node, per XCU `nodal-transfer.js` |
| `Node/Weight` | PSI116 XML | `<Weight>` of the node (step 10, already live) |

---

## Part 3. Kit the Oracle prepares before coders start

### K1. Put the formats into both repos (Oracle; pushing needs the Owner's word)
- Copy `D:/CodeD/topofix-agents/p01-formats/` (schema, examples, `validate.mjs`, README) to `shared/topofix-formats/` in **XCU** and in **3D_Converters**. Use a DRAFT PR in each.
- Check: `node shared/topofix-formats/validate.mjs --selftest` prints `selftest OK` in both repos.
- Add the field-names table from Part 2 to the README.

### K3. Prototype kit (built 12 Nov, local: `D:/CodeD/topofix-agents/proto-kit`)
- Every card starts with `node prototypes/_kit/new-card.mjs <pNN-name> "<title>" --prefix <CODE>`. That gives the Part 1.2 layout, the kit helpers (`refuse`, `attempt`, `readBenchmark`, `timeMedian`, `writeResult`) and `BENCHMARKS.json`.
- Before each push the coder runs `node ../_kit/card-check.mjs .`, and adds `--final` before asking for review. The runner and reviewer run the same command.
- It is copied into each repo together with K1, so the same Owner word covers both.

- `kit/xmlspan.mjs`: a byte-offset scanner for PSI116 and InputXML, with `psi116Index`, `locatePsi116`, `inputXmlIndex`, `replaceSpans` and the `xmlDiff` re-check. 20 tests; 9 public XML files match Python ElementTree exactly.

### K2. Benchmark list (pinned; every card points here)
Sizes are in bytes. The counts were read from the files on 12 Nov 2026. Use the sha256 to check each file before using it.

**XCU repo (`reallakshman19/XML_Compare_Utilities`, main f36cd500)**

**Version 14 only (Owner, 12 Nov).** The cards use only X-S1, X-S2, X-S3C, X-T and X-TEXP, plus test-made copies of them. The v11 files stay listed for one use: the `CII_VERSION_UNSUPPORTED` test. All 3D_Converters CII outputs (CII 2019) are v11.

| id | path | bytes | sha256 | CII ver | elements | RIGID rows | NODENAME rows |
|---|---|---|---|---|---|---|---|
| X-SRC | `Benchmark/CIICompare/BM_CII_SOURCE.CII` | 65045 | 705e999fcc45ede68902aecccd71c17366d1da8785d68196e5e6cb39f5e181a0 | 11 | 40 | 15 | 4 |
| X-T1 | `Benchmark/CIICompare/BM_CII_TARGET1.CII` | 64462 | aa84f8a70bbf7b41bfdbf69c664ca10b0f068cec5a40f670b8dff7581a237110 | 11 | 40 | 15 | 2 |
| X-T2 | `Benchmark/CIICompare/BM_CII_TARGET2.CII` | 64682 | bc8c14edcfecaa530886e7e04806237fa41e6830fb74ac6a1b210978d22760b3 | 11 | 40 | 15 | 6 |
| X-S3 | `Benchmark/CIICompare/SOURCE 3.CII` | 393008 | 2df8fe72fb8b8134925671dfdade3e7e72dd4075b40854cd480fe93546b097e3 | 11 | 219 | 20 | 186 |
| X-T31 | `Benchmark/CIICompare/TARGET 3-1.CII` | 400175 | eed76397b0bfe032d1d1aa1e6f81e113743664c1cc0394c27a9070defbbb4440 | 11 | 223 | 20 | 190 |
| X-S1 | `Benchmark/S1.CII` | 108330 | 9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b | 14 | 56 | 1 | 49 |
| X-S2 | `Benchmark/S2.CII` | 90961 | 7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd | 14 | 46 | 1 | 42 |
| X-S3C | `Benchmark/S3.CII` | 90942 | c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa | 14 | 45 | 1 | 40 |
| X-T | `Benchmark/T.CII` | 2866002 | abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060 | 14 | 1614 | 124 | 1265 |
| X-TEXP | `Benchmark/TEXPECTED-PARTIALLLYDONE.CII` | 2866022 | bb7c43ab883de3deeae6f73ec37538d977d395dacb9631e3501878d5459162c9 | 14 | 1614 | 124 | 1266 |
| X-F05 | `prototypes/ciifr-map/tests/fixtures/S1-F05.xml` | 882735 | 1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995 | (XML) | 56 PIPINGELEMENT | | |

What differs, section by section (rows differing / total). These counts are a sanity check for P1.1, not exact test answers:
- **X-SRC → X-T1:** CONTROL 1/4, ELEMENTS 76/600, NODENAME 4→2 rows, BEND 8/21, RIGID 12/15, RESTRANT 25/168, SIF&TEES 12/90, MISCEL_1 23→11, COORDS 1/2.
- **X-SRC → X-T2:** ELEMENTS 77/600, NODENAME 4→6, RIGID 12/15, RESTRANT 17/168. Other sections as for X-T1.
- **X-S3 → X-T31:** 219→223 elements (4 added), NODENAME 186→190, BEND 111→114, RESTRANT 3168→3240. RIGID is identical.

**3D_Converters repo (`reallakshman19/3D_Converters`, main a3feec30c)**

| id | path | bytes | sha256 | notes |
|---|---|---|---|---|
| C-BMX | `Benchmarks/INPUT XML to CII 2019/BM_CII/BM_CII_INPUT.XML` | 77451 | a27d1122228f7e5f8a4335100107f5accd0d12cd43e0aec4995f07ada27debd1 | InputXML, 40 PIPINGELEMENT |
| C-BMC | `Benchmarks/INPUT XML to CII 2019/BM_CII/BM_CII_INPUT_inputxml_to_cii2019_workflow.cii` | 65871 | cc1caa9f278de601cd3c7f502b97b76e99556ad717daad552f905521c38f9c6e | Same-run CII of C-BMX: v11, 40 elements, 15 RIGID rows. Byte-identical to `BM_CII[Benchmark].CII`. |
| C-7X | `Benchmarks/INPUT XML to CII 2019/7/AML-78-SYS_007_08-03-2024_INPUT.XML` | 201761 | a60e21af075e647e554f802d506f709e32eebb0b349f55cb5d65a22b2e908027 | InputXML, 108 PIPINGELEMENT |
| C-7C | `Benchmarks/INPUT XML to CII 2019/7/AML-78-SYS_007_08-03-2024_INPUT_inputxml_to_cii2019_workflow.cii` | 162038 | 9b8120cb32c481d40cd9f3e000ca8f35aba92ce56aac97a5bbaa353501f707b1 | Same-run CII of C-7X: v11, 108 elements, 27 RIGID rows |
| C-R1X | `Benchmarks/XML to CII 2019/Sample 1.1/RMS-BLOW-1.xml` | 137941 | 8f616417c382f89d451028c71fab5fb4e9bbc2addfe09246a3ee9549c1019261 | PSI116 XML: 6 branches, 260 nodes, 12 `<Rigid>2` |
| C-R1C | `Benchmarks/XML to CII 2019/Sample 1.1/RMS-BLOW-1.cii` | 245732 | 97908bbb6b55720262de3c35d998ee3f9d2b9da873cfffdd3dc44e26b80adb9f | CII of C-R1X: v11, 92 elements, 11 RIGID rows |
| C-R2X | `Benchmarks/XML to CII 2019/Sample 1.2/RMS-BLOW-2.xml` | 163490 | 6d2ddf66c7f5e06f20604979b2301bb4e3792cf60efb5fc3271446f7617df599 | PSI116: 8 branches, 311 nodes, 14 rigid |
| C-R2C | `Benchmarks/XML to CII 2019/Sample 1.2/RMS-BLOW-2.cii` | 279596 | d9b774db8a64fe9f627944bbcacf99b1f9cb720621c39d02bca360283b012174 | v11, 120 elements, 13 RIGID rows |
| C-TRX | `Benchmarks/XML to CII 2019/Sample 1.3/TEST-RMS.xml` | 403747 | bc0419e52a3bc2e5b835f08f236bf279f6ea7e405f59604a53299a627ad36b99 | PSI116: 14 branches, 777 nodes, 38 rigid |
| C-TRC | `Benchmarks/XML to CII 2019/Sample 1.3/TEST-RMS.cii` | 679947 | e35292155ae7f0e52966887c45392803fcc826e614883ae529c6ee84574ee28d | v11, 284 elements, 38 RIGID rows |
| C-GL | `Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml` | 627599 | 923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba | PSI116: 41 branches, 1166 nodes, 65 rigid. No CII in the repo. |
| C-BM2 | `Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml` | 629889 | 6bcc477860fdbe9a80159839bf476a8c1e6ce7a966587a25bc62498709843151 | PSI116: 31 branches, 1196 nodes, 54 rigid. Its CII needs the Owner's staged JSON, so **BM2 CII demos are run by the Owner**. |
| C-PSI | `Benchmarks/XML-CII-2019/revamped/GLRD-1000-PSI-02.xml` | 643002 | 164163380dccffb8f9d6bd7853eabd36eea89e508da2215443e81969144d4a45 | PSI116: 30 branches, 1224 nodes, 54 rigid |
| C-XSD | `Benchmarks/XML to CII 2019/PSI116.xsd` | 10738 | ce0f3f9047ecd60ecff8a7033a9f2cbf263b488a28687b6105aaf87442250501 | PSI116 schema |

The Oracle writes this table as `shared/topofix-formats/BENCHMARKS.json` (with K1), so each bench script can check hashes from one place.

**CII layout facts every CII card needs.** CII **version 14 only** (Owner, 12 Nov). The kit's `kit/cii14.mjs` (`readCii14`, `fieldDiff`, `rigidOf`) already reads all of this and is tested; use it instead of writing another reader. Checked on X-S1 and X-T and in the XCU code:
- Sections start with a line `#$ <NAME>`: VERSION, CONTROL, ELEMENTS, AUX_DATA, NODENAME, BEND, RIGID, EXPJT, RESTRANT, ..., UNITS, COORDS.
- The second line of `#$ VERSION` holds the CII version as its 2nd number. Our files have **11** and **14**; both must be read.
- The first number on the first `#$ CONTROL` line is **NUMELT**, the element count.
- `#$ ELEMENTS` has **15 lines per element**, for both versions. The FROM and TO nodes are the first two numbers of the element's first line.
- Numbers sit in **13-character fields that start at character 2**: field *i* covers characters `2+13*i` to `15+13*i`.
- A RIGID card's weight is characters 2-15 and its type is characters 15-28. This is the same as XCU `property-transfer/cii-index.js` `indexCiiV14`.
- Code to read for alignment (copy it into `vendor/` if you use it):
  - XCU `tabs/cii-workspace/cii-fnr-vnext/ui/physical.js` (`parseCii`, `scanLines`)
  - XCU `.../property-transfer/cii-index.js` (`indexCiiV14`)
  - 3D_Converters `v045/tabs/xml-cii-2019-standalone/xml-cii-final-rigid-inventory.js` (`splitFinalCiiSections`, `parseFinalCiiRigidInventory`)

---

## Part 4. Cards

Each card is self-contained. Send it to the coder together with Parts 1-3.

---

### P0.2 · CII edit kernel (L0, shared)

**Repo / folder:** XCU, `prototypes/p02-cii-edit-kernel/`
**Needs:** K1, K2

**Goal.** One small engine that applies an approved Change set to CII bytes. It changes exactly the named fields and nothing else, and refuses rather than guesses. Later apps copy this folder; they do not import it.

**Build:**
1. **Reading is done:** use `kit/cii14.mjs`. Do not write another reader.
   - `readCii14(bytes)` returns `{version:14, eol, lines, sectionOrder, sections, counts, elements[{index, from, to, pointers, fields, rows}], rigids[{pointer, element, weight, type}], nodeNames[{pointer, element, from, to}]}`. Every value carries `{start, end, raw, token, value}` byte offsets.
   - `fieldDiff(a, b)` lists every 13-character field that differs, and refuses `CII_STRUCTURE_CHANGED` when rows, sections or line endings differ. `rigidOf(cii, elementIndex)` gives an element's rigid record.
   - It refuses v11 (`CII_VERSION_UNSUPPORTED`), mixed line endings (`CII_MIXED_EOL`) and 15 other `CII_*` cases. Its 16 tests are in `prototypes/_kit/tests/cii14.test.mjs`.
2. `engine/locate.mjs`: `locate(cii, ref, field)` returns `{start, end, token}`. Fields supported in v1:
   - `RIGID/WEIGHT`: the weight field of the rigid that the element named by the `cii` ref points to.
   - `NODENAME/NAME`: the name entry of the node named by the `cii-node` ref. Follow the NODENAME layout in XCU `nodal-transfer.js`.
   - An element that is not found gives `KERNEL_TARGET_NOT_FOUND`.
   - A `cii` ref whose `fromNode`/`toNode` differ from the element at that `elementIndex` gives `KERNEL_REF_NODES_MISMATCH`.
   - An element with no rigid, asked for `RIGID/WEIGHT`, gives `KERNEL_NO_RIGID`.
   - Two refs that land on the same span give `KERNEL_SPAN_SHARED`.
3. `engine/format.mjs`: `formatCiiNumber(value, width=13)`.
   - Write the number the way the file already does: right-aligned in the 13-character field, in the same form as the old token (v14 uses `1.390000E+03`).
   - A value that does not fit gives `KERNEL_VALUE_DOES_NOT_FIT`.
   - Negative weight gives `KERNEL_NEGATIVE_WEIGHT`.
   - 0 is allowed only with `zeroConfirmed`; otherwise `KERNEL_ZERO_NOT_CONFIRMED`.
   - v14 files write numbers in exponent form, 13 characters wide (e.g. `1.390000E+03`, `9.500000E+02`). Write the new value in the same form as the old token of that field. Include a table test of at least 15 values against tokens in X-S1, X-S3C and X-T.
4. `engine/apply.mjs`: `applyChangeset(bytes, changeset)` returns `{ok, bytes?, applied:[{changeId, start, end, oldToken, newToken}], refusals:[]}`. Checks, in this order:
   1. Run the P0.1 validator logic on the Change set (vendor `validate.mjs`). Any rule failure gives `KERNEL_CHANGESET_INVALID` with the R-code in `detail`.
   2. `base.kind` must be `cii`; otherwise `KERNEL_BASE_KIND`.
   3. The sha256 of the bytes must equal `base.sha256`; otherwise `KERNEL_BASE_SHA256_MISMATCH` (this is the checksum lock).
   4. Each change must have `approval.approved === true`; otherwise `KERNEL_NOT_APPROVED`.
   5. Each change's `oldToken` must equal the trimmed text at its located span; otherwise `KERNEL_OLD_TOKEN_MISMATCH`.
   6. Build the new bytes by replacing only the spans, applied from the end of the file backwards so offsets stay valid.
   7. **Re-check:** `readCii(newBytes)` must give the same `numelt`, the same section list, the same line count and the same line endings. Every field other than the changed ones must be byte-identical. Any other difference gives `KERNEL_RECHECK_FAILED`.
   8. Any refusal means no output bytes at all.
5. Use the kit's `fieldDiff` for step 7 and in tests; do not write another one.
6. `cli.mjs`:
   - `node cli.mjs apply <base.cii> <changeset.json> <out.cii>`
   - `node cli.mjs diff <a.cii> <b.cii>`
   - `node cli.mjs read <file.cii>`, which prints counts only.

**Tests (all on public benchmarks or invented fixtures):**
- T1: `readCii14` on X-S1 gives numelt 56, 1 rigid and 49 node names; on X-T it gives numelt 1614 and 124 rigids. X-SRC (v11) is refused with `CII_VERSION_UNSUPPORTED`.
- T2: Applying an empty Change set (0 changes) to X-S1 gives bytes identical to the input.
- T3: A Change set whose `base.sha256` is one hex digit off gives `KERNEL_BASE_SHA256_MISMATCH`, and no bytes.
- T4: Changing 1 rigid weight on X-S1: `fieldDiff` shows exactly 1 field, and its new token equals `formatCiiNumber(newValue, oldToken)`.
- T5: Changing **every** rigid weight on X-T (124 changes, new value = old × 1.1, rounded to 3 decimals): `fieldDiff` shows exactly 124 fields, and the output still reads.
- T6: A wrong `oldToken` gives `KERNEL_OLD_TOKEN_MISMATCH`; the whole set is refused, including the good changes in it.
- T7: Unapproved gives `KERNEL_NOT_APPROVED`. Zero without confirmation gives `KERNEL_ZERO_NOT_CONFIRMED`. With `zeroConfirmed` it is applied.
- T8: A `cii` ref with swapped FROM/TO gives `KERNEL_REF_NODES_MISMATCH`.
- T9: Two changes whose elements share one rigid pointer give `KERNEL_SPAN_SHARED`.
- T10: CRLF and LF copies of one invented fixture give identical results, and line endings are kept.
- T11: A NODENAME change on X-S1 (rename one node) shows exactly the expected difference.
- T12: Each refusal code in the README has a test. Check this with a test that reads the README list.

**Mutation check:**
- M1: skip the sha256 check (T3 must go red).
- M2: replace the whole line instead of the span (T4 must go red).
- M3: drop the re-check (a test that feeds a deliberately bad span must go red).

The reader's own tests already cover reading, so the kernel's tests cover locate, format, apply and re-check.

**Benchmark:**
- B1: Apply 124 weight changes on X-T (2.87 MB). Pass if the median is **under 500 ms**.
- B2: Apply 1 weight change on X-S2. Report the time.
- B3: `readCii14` on X-TEXP. Report the time and numelt. Pass if it is under 2 s (the kit reads X-T in about 120 ms).

**Owner demo.**
1. `node cli.mjs apply` on X-T with an example Change set that changes 3 weights.
2. Open the output in CAESAR II. Only those 3 weights differ.

**Out of scope:** any field other than RIGID/WEIGHT and NODENAME/NAME; a UI; XML.

---

### P1.1 · CII reader and CII↔CII map (L1 Mapping)

**Repo / folder:** XCU, `prototypes/p11-cii-map/`
**Needs:** K2

**Goal.** Match the elements and nodes of two CII files by geometry, the way `prototypes/ciifr-map` already does for two XMLs. List the pairs and the differences, read-only.

**Build:**
1. `engine/cii-graph.mjs`: `readCiiGraph(bytes)` returns the **same graph shape** that `prototypes/ciifr-map/xml-graph.js` `buildXmlGraph` returns. Read that file first and copy the shape; do not invent a new one.
   - Node positions come from the ELEMENTS deltas (DX, DY, DZ, the 3rd to 5th numbers of the element's first line), walked from the `#$ COORDS` start points.
   - CII version 14 only: use `kit/cii14.mjs`.
   - It can reuse `vendor/` copies of `physical.js` and the P0.2 reader, if P0.2 is merged by then; otherwise write a small reader.
2. `engine/compare.mjs`: `compareCii(a, b, {anchors, toleranceMm=1})`. Reuse the Method C fit by copying `resolution-fit.js` and its imports into `vendor/` unchanged. It returns:
   - `pairs[]` (element pairs and node pairs, each with a `rule`: `same-number-same-position`, `same-position`, `nearest-within-tolerance`)
   - `unmatchedA[]`, `unmatchedB[]`
   - `fieldDiffs[]`: for each element pair, which named values differ (diameter, wall, insulation, T1, P1, rigid weight, restraint count, node name)
3. With no anchors, use automatic anchors: nodes with the same number and a position within tolerance, at least 3 of them, not all on one line. Fewer than 3 gives `MAP_ANCHORS_TOO_FEW`; then ask for manual anchors.
4. `cli.mjs`: `node cli.mjs compare <a.cii> <b.cii> [--anchors 10:10,20:20,30:30] [--tol 1]` prints JSON.
5. `index.html`: load two CII files and show the pair table and difference table. You may reuse the ciifr-map SVG overlay by copying it. Keep it simple.

**Tests:**
- T1: `readCiiGraph(X-S1)` gives 56 elements, and every element's TO position = FROM position + delta, within 1e-6 mm.
- T2: X-S1 against itself: 56/56 element pairs, 0 unmatched, 0 field differences.
- T3: X-S1 against X-S1M (a copy the test makes from X-S1: the rigid weight × 1.1, the T1 of elements 3 and 7 changed, and the FROM name of NODENAME entry 1 changed): 56/56 element pairs, and `fieldDiffs` lists exactly those 4 changes.
- T4: X-T against X-TEXP: 1614/1614 element pairs and 0 unmatched. Their geometry is identical; the differences are node names (TEXPECTED has 1 extra NODENAME entry and 53 changed rows), 1 restraint row and 7 allowable rows. Also: X-S1 against X-S1 with its last element removed from the graph in memory gives 55 pairs and 1 in `unmatchedA`.
- T5: X-S2 against itself: 46/46.
- T6: An invented 3-element fixture with all nodes on one straight line gives `MAP_ANCHORS_TOO_FEW` in automatic mode.
- T7: Moving one node by 0.5 mm in an invented fixture keeps the pair at tolerance 1. At tolerance 0.1 the pair is reported unmatched.
- T8: The graph from `readCiiGraph(X-S1)` and the graph from the existing ciifr-map XML reader on X-F05 (made from the same public S1 original) have the same node count and the same positions within 1 mm. This checks that the shapes really are the same.

**Mutation check:**
- M1: ignore DY (T1 red).
- M2: treat the tolerance as 0 (T7 red).
- M3: count unmatched as matched (T4 red).

**Benchmark:**
- B1: X-S1 vs X-S1M, under 300 ms.
- B2: X-S2 vs itself, under 300 ms.
- B3: X-T vs X-TEXP (2.87 MB each). Report the time, the pair count and the unmatched counts; pass if under 30 s.

**Owner demo.**
1. Open `index.html` and load X-T and X-TEXP. All 1614 elements are paired, and the differences table lists the node-name changes.
2. Load X-S1 and X-S1M (the test writes X-S1M to `tests/fixtures/`, listed in the manifest as cut from X-S1). The 4 planted changes are listed.

**Out of scope:** writing a Map file (that is P1.3); XML inputs (P1.2); any editing.

---

### P1.3 · Map file export (L1 Mapping)

**Repo / folder:** XCU, `prototypes/p11-cii-map/` (same folder; continue the P1.1 branch, or branch from it after P1.1 merges)
**Needs:** P1.1 merged, K1

**Goal.** Turn P1.1's pairs into a `topofix.map` v1 file that a person approves, pair by pair or all at once.

**Build:**
1. `engine/to-map.mjs`: `toMapFile(compareResult, {sourceFile, targetFile, method:'geometry-pair'})` returns a Map file.
   - Every pair starts with `status: candidate`.
   - `evidence.rule` = the P1.1 rule, and `evidence.detail` = the residual in mm.
   - Element pairs use `cii` refs; node pairs use `cii-node` refs.
2. `engine/approve.mjs`:
   - `approvePairs(map, pairIds|'all-exact', {by, at})` sets the status to `approved`. `'all-exact'` approves only pairs whose rule is `same-number-same-position`.
   - `rejectPairs(map, pairIds, ...)` sets the status to `rejected`.
   - Approving a pair that would break 1:1 (rule R10) gives `MAP_NOT_ONE_TO_ONE` and changes nothing.
3. The UI gets a checkbox per pair, plus "Approve all exact", "Approve selected" and "Export Map file". The export shows JSON in a text box with a Copy button; downloads also work when the page runs locally.
4. Every exported file passes `shared/topofix-formats/validate.mjs`.

**Tests:**
- T1: X-S1 vs X-S1M, then `toMapFile`, passes the validator, with 56 element pairs, all candidates.
- T2: `'all-exact'` on X-T vs X-TEXP: every approved pair has the rule `same-number-same-position`. The test asserts the count is above 0 and prints it.
- T3: Forcing a second approved pair onto the same target gives `MAP_NOT_ONE_TO_ONE`, and the file is unchanged.
- T4: A round trip (export, parse, export) gives identical JSON.
- T5: Each header `sha256` equals the sha256 of its input file.

**Mutation check:**
- M1: write the wrong sha256 (T5 red).
- M2: let `'all-exact'` approve nearest pairs (T2 red).
- M3: skip the 1:1 check (T3 red).

**Benchmark:**
- B1: Map file for X-T vs X-TEXP. Report the pair count and the time; it must be under 1 s after the compare.

**Owner demo.** X-T vs X-TEXP, then "Approve all exact", then Export. Then run the validator; it prints OK.

**Out of scope:** XML↔CII (P1.2); applying anything.

---

### P2.1 · RIGID weights from a Change set (L2 CII edit)

**Repo / folder:** XCU, `prototypes/p21-cii-weights/`
**Needs:** P0.2 merged (copy its `engine/` into `vendor/kernel/`)

**Goal.** Edit many rigid weights in a CII in one pass from a Change set, check every one afterwards, and export the result. This is the standalone form of step-10 "Review Final weight".

**Build:**
1. `engine/inventory.mjs`: `rigidInventory(bytes)` returns one row per element with a rigid:
   - `{elementIndex, fromNode, toNode, lengthMm, boreMm, rigidPointer, weightToken, weight, typeToken}`
   - `lengthMm` = the length of the element's delta vector.
   - `boreMm` = the element's diameter field.
2. `engine/propose.mjs`: `proposeFromTable(inventory, rows)`. `rows` come from a CSV with the header `fromNode,toNode,newWeight[,note]`. It returns a Change set where:
   - `evidence.source = manual`
   - `approval.approved = false`
   - each row is matched to exactly one element by FROM/TO.
   - No match gives `WEIGHTS_ROW_NOT_FOUND`; two matches give `WEIGHTS_ROW_AMBIGUOUS`.
3. `engine/approve.mjs`: `approveAll(changeset, {by, at, errorLimitPct})`. It approves only changes whose relative change exceeds `errorLimitPct` (default 20, like step 10). The others are left out and listed in `skippedWithinLimit[]`.
4. `engine/run.mjs`: `applyWeights(bytes, changeset)` calls the kernel `applyChangeset`, then checks every applied change by reading the weight back from the new bytes. Its report includes, per change: `{changeId, fromNode, toNode, old, new, readBack, ok}`.
5. `cli.mjs`:
   - `inventory <cii>`
   - `propose <cii> <rows.csv> <out.json>`
   - `approve <in.json> <out.json> --limit 20 --by <name>`
   - `apply <cii> <changeset.json> <out.cii>`
6. `index.html` shows these steps in order:
   1. load the CII
   2. inventory table (columns: Element, FROM, TO, Length, Bore, Weight)
   3. paste or upload the CSV
   4. proposals with "Approve all beyond ±[20]%"
   5. Apply
   6. per-row result
   7. export the revised CII and the Change set (Copy button)

**Tests:**
- T1: `rigidInventory(X-S1)` gives 1 row (element 55).
- T2: `rigidInventory(X-T)` gives 124 rows, and every `weightToken` equals the text at its span.
- T3: A 20-row CSV for X-T (invented new weights) gives a Change set that passes the validator.
- T4: With `errorLimitPct=20`, a row changing 10% is skipped and a row changing 30% is approved.
- T5: Applying 20 approved changes to X-T: the kernel diff shows exactly 20 fields, and all 20 read-backs are `ok`.
- T6: A row naming FROM/TO that does not exist gives `WEIGHTS_ROW_NOT_FOUND`.
- T7: A Change set exported from step 10 of 3D_Converters (P3.1 export: `base.kind:"xml"`) gives the kernel refusal `KERNEL_BASE_KIND`. XML Change sets belong to L3.
- T8: The P0.2 kernel copy in `vendor/` is byte-identical to P0.2's `engine/`. The test compares sha256 against `VENDORED.md`.

**Mutation check:**
- M1: approve inside the limit (T4 red).
- M2: skip the read-back (a test with a deliberately wrong read-back must go red).
- M3: match by FROM only (T6, or a new ambiguity test, red).

**Benchmark:**
- B1: 124 changes on X-T, inventory to apply, under 1 s.
- B2: 1 change on X-S2. Report the time.

**Owner demo.**
1. Load X-T, paste a 20-row CSV, approve beyond ±20%, then Apply.
2. 20 rows show `ok`, and the revised CII opens in CAESAR II.

**BM2 note:** step 10 writes CII 2019, which is **version 11**, so this v14-only kit refuses it. The Owner runs the demo on a v14 CII of their own, for example the BM2 CII re-saved by CAESAR II 14. Record the time and the counts.

**Out of scope:** nearest-weight suggestions from masters (they stay in step 10); XML edits.

---

### P3.3 · Reference CII → Change set proposals (L3, read-only)

**Repo / folder:** XCU, `prototypes/p33-reference-proposals/` (read-only; placed in XCU so it sits next to P1.x)
**Needs:** P1.3 merged

**Goal.** Take an old analysed CII (the "reference") and a new CII, plus an approved Map file between them. Propose the reference's rigid weights as changes for the new CII, as **proposals only**: nothing is approved and nothing is written.

**Build:**
1. `engine/propose.mjs`: `proposeFromReference(referenceBytes, targetBytes, mapFile, {fields:['RIGID/WEIGHT']})`.
   - Check that the map's `source.sha256` equals the reference file and `target.sha256` equals the target file; otherwise `PROPOSE_MAP_FILE_MISMATCH`.
   - For each **approved** element pair where both sides have a rigid and the weights differ: make one change.
     - `evidence.source = reference-cii`, with the `pairId`
     - `oldToken` = the target's token
     - `newValue` = the reference's weight
     - `approval.approved = false`
   - Pairs whose weights are equal go to `unchanged[]`.
   - Pairs where only one side has a rigid go to `notComparable[]` with a reason.
2. `cli.mjs`: `propose <reference.cii> <target.cii> <map.json> <out.json>`.
3. `index.html`: a table with columns Pair, FROM→TO, Target weight, Reference weight, Difference %, Reason. Plus "Export proposals".

**Tests:**
- T1: X-S1M (reference) and X-S1 (target), with the map from P1.3 using "Approve all exact": exactly 1 proposal, the rigid weight the test changed.
- T2: Every proposal has `approval.approved === false`, and the file passes the validator.
- T3: A map made for X-T/X-TEXP but given with X-S1/X-S1M gives `PROPOSE_MAP_FILE_MISMATCH`.
- T4: Candidate and rejected pairs never produce proposals.
- T5: Reference = target (X-T against itself) gives 0 proposals, with all 124 rigid pairs listed in `unchanged`.

**Mutation check:**
- M1: use candidate pairs too (T4 red).
- M2: skip the sha256 check (T3 red).
- M3: mark proposals approved (T2 red).

**Benchmark:**
- B1: X-T → X-TEXP with an approved map. Report the proposal count (0 expected: their weights are equal) and the time; pass if under 1 s.

**Owner demo.** X-S1M as the reference and X-S1 as the target: the one proposal matches the changed weight.

Later, the Owner runs it with an old analysed CII of theirs against the step-10 BM2 CII. Its proposals feed P2.1 (CII) or, after Owner approval, step 10 (XML).

**Out of scope:** applying; fields other than RIGID/WEIGHT.

---

### P2.3 · Name Transfer from a Map file (L2 CII edit)

**Repo / folder:** XCU, `prototypes/p23-name-transfer-map/`
**Needs:** P0.2 merged, P1.3 merged

**Goal.** Take node names from a SOURCE CII and write them into a TARGET CII. The pairs come from an approved Map file instead of a hand-made CSV. The writing is done by the P0.2 kernel.

**Build:**
1. `engine/plan.mjs`: `planNames(sourceBytes, targetBytes, mapFile)`. For each approved **node** pair (`cii-node`), the source has a name and the target name differs: make a change with:
   - `field: NODENAME/NAME`
   - `evidence.source = map`, with the `pairId`
   - `approval.approved = false`

   The current XCU `planNodalTransfer` is the reference for what counts as a name. Copy it into `vendor/` and wrap it; do not change it.
2. Names longer than the field allows give `NAMES_TOO_LONG`. A target node with no NODENAME entry gives `NAMES_TARGET_HAS_NO_ENTRY`. v1 does not add entries.
3. Approve (all or selected) and apply through the kernel, then read every name back.
4. `cli.mjs`: `plan`, `approve`, `apply`, the same pattern as P2.1.

**Tests:**
- T1: X-TEXP → X-T, with a map from P1.3: the plan lists exactly the paired nodes whose names differ (compute that directly). The one X-TEXP name with no X-T entry (element 1532) is listed under `NAMES_TARGET_HAS_NO_ENTRY` and is not written.
- T2: Applying the plan: the kernel diff shows only NODENAME fields, and every read-back is equal.
- T3: The old CSV path (XCU `nodal-transfer.js`) and the map path give the **same output bytes** for the same pairs. Build the CSV from the map in the test.
- T4: A name that is too long gives `NAMES_TOO_LONG`, and nothing is written.
- T5: A Map file for other files gives the sha256 refusal.

**Mutation check:**
- M1: allow names that are too long (T4 red).
- M2: write element fields too (T2 red).
- M3: skip the map sha256 check (T5 red).

**Benchmark:**
- B1: X-TEXP → X-T names through the map. Report the count and the time; pass if under 2 s.

**Owner demo.** X-TEXP names into X-T through the map, then open the result in CAESAR II. The names appear on the paired nodes.

**Out of scope:** adding new NODENAME entries; element properties.

---

### P1.2 · XML↔CII matching (L1 Mapping)

**Repo / folder:** XCU, `prototypes/p11-cii-map/` (continue after P1.3)
**Needs:** P1.1 merged

**Goal.** Pair a source XML with a CII:
- **exactly**, when both come from the same converter run;
- **by geometry** otherwise.

The output is the same Map file, with `source.kind: xml` and `target.kind: cii`.

**Build:**
1. Two kinds of XML input:
   - **InputXML** (the RichInputXML F05 profile; file X-F05, made from the same public S1 original as X-S1). Read it with the existing ciifr-map XML reader, copied into `vendor/`.
   - **PSI116** (C-R1X, C-R2X, C-TRX, C-GL, C-BM2, C-PSI). Read it with `kit/xmlspan.mjs` `psi116Index`, which uses step-10 numbering and matches Python ElementTree on all six files. Do not write another reader. **The CII side is deferred:** every public PSI116 benchmark has only a v11 CII or none. The XML input is the same for v11 and v14; when a v11 CII is the only reference, 3D_Converters converts v11↔v14 (Owner, 12 Nov). Start the CII side when a v14 CII of C-R1X is pinned.
2. Same-run mode: element *k* of the InputXML pairs with element *k* of the CII when FROM/TO and positions agree within 0.01 mm. Any disagreement stops the mode with `MATCH_SAME_RUN_BROKEN`, naming the element; then the user switches to geometry mode.
3. Geometry mode: for PSI116, pair XML nodes with CII nodes by position (the P1.1 fit), with the rule `same-position` or `nearest-within-tolerance`.
4. The PSI116 converter renumbers nodes, so node numbers are evidence only, never the rule.

**Tests:**
- T1: X-F05 ↔ X-S1 (same run): 56/56 pairs, 0 refusals.
- T2: X-F05 ↔ X-S2 (a different model) in same-run mode gives `MATCH_SAME_RUN_BROKEN` at the first element.
- T3: An invented copy of X-F05 with one element's delta changed by 5 mm gives `MATCH_SAME_RUN_BROKEN`, naming that element.
- T4: X-F05 ↔ X-S1 in geometry mode gives the same 56 pairs as same-run mode.
- T5: deferred with PSI116.
- T6: The exported Map file passes the validator, with `source.kind=xml` and `target.kind=cii`.

**Mutation check:**
- M1: same-run tolerance 1 km (T3 red).
- M2: drop branchOrdinal from refs (T6 red: R4).
- M3: pair by node number (T4 likely red; if not, add an invented case where numbers lie).

**Benchmark:**
- B1: X-F05 ↔ X-S1, under 2 s.
- B2: deferred with PSI116.

**Owner demo.**
1. X-F05 ↔ X-S1 shows 56/56.
2. The PSI116 demo is deferred until a v14 CII is pinned.

Later, the Owner runs BM2 XML ↔ the step-10 BM2 CII.

**Out of scope:** editing; P3.2 lineage (in-app).

---

### P2.2 · Property Transfer writes one family (L2 CII edit)

**Repo / folder:** XCU, `prototypes/p22-property-write/`
**Needs:** P0.2 merged, P1.3 merged. **Owner decision first: which family?** The default is PROCESS (temperature T1 and pressure P1 of each element), because it is one fixed field per element.

**Goal.** Copy one property family from a SOURCE CII into a new TARGET1 CII, for the element pairs an approved Map file names. The writing is done by the P0.2 kernel.

**Build:**
1. Add the family's fields to the kernel copy, e.g. `ELEMENT/T1` and `ELEMENT/P1`. Find their line and field numbers in the element's 15 lines.
   - Follow XCU `property-transfer/element.js` `ELEMENT_FAMILIES`, and write down where each field is in `README.md`.
   - Add a test that the positions match what `inspectElementPair` reads.
   - Send the kernel change back to P0.2 as a follow-up note; do not edit P0.2's folder.
2. `engine/plan.mjs`: `planFamily(source, target, mapFile, family)` makes changes only where the values differ, with `evidence.source = map` and `approval.approved = false`.
3. **Carry-forward:** in CII, a value may mean "same as the previous element". If the source value is a carry-forward marker and the target is not, or the other way round, give `PROPERTY_CARRY_FORWARD_MISMATCH` for that row. Never write through a carry-forward.
4. Approve, then apply, then read back, as in P2.1.

**Tests:**
- T1: X-S1 → X-S1M, PROCESS through the map: the plan lists exactly the 2 elements whose T1 the test changed.
- T2: Applying it: the kernel diff contains only the T1 and P1 fields of the planned elements.
- T3: The read-only XCU `inspectElementPair` on (SOURCE, revised TARGET1) reports PROCESS equal for every applied pair.
- T4: An invented carry-forward case gives `PROPERTY_CARRY_FORWARD_MISMATCH`.
- T5: A family the card does not list gives `PROPERTY_FAMILY_NOT_ENABLED`.

**Mutation check:**
- M1: write the wrong field number (T3 red).
- M2: ignore carry-forward (T4 red).
- M3: copy unapproved pairs (a new test red).

**Benchmark:**
- B1: X-T → X-T, PROCESS (0 changes expected). Report the time; pass if under 2 s.

**Owner demo.** X-S1M → a new TARGET1 copied from X-S1, PROCESS only. The Property Transfer compare shows 0 PROCESS differences for the paired elements, and CAESAR II opens the file.

**Out of scope:** restraints (a later card, because their 24-line layout needs its own design); any other family.

---

## Part 5. Cards that stay inside the apps (not standalone)

- **P3.2 lineage** is parked. Its 4 known issues are in `p32-lineage/CARD.md`. A restart needs the Owner's word.
- **P3.4 more fields in step 10** (wall, then insulation, then process). It reuses Code C's field and line rules. Write its card after P2.2, so the field list matches.
- **Step-10 import of P2.1 / P3.3 Change sets** (the "integration through formats"). Write it once P2.1 and P3.3 have passed their Owner demos.
- **XCU #256** (B8 leftovers, draft) finishes in its own lane.

---

## Part 6. How each card is checked (Oracle)

1. **Runner:** a separate agent at lower cost runs `node --test` and `node bench/run.mjs`, and redoes the 3 mutation checks.
2. **Reviewer:** a fresh agent (Opus) reads the diff against the card. It checks that each test really tests what its name says, that refusal codes are reachable, that nothing outside the folder changed, and that no private data was used.
3. **Verdict:**
   - PASS: the Owner runs the demo, and the Owner's "merge" merges it.
   - FAIL: one repair round. A second FAIL means the card is parked, or cut smaller with the Owner.
4. After each card, add a line to the story file. Update the Part 0 table when a card's state changes.
