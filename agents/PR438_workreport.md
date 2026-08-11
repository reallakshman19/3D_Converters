# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish the controlled roadmap and source-qualified implementation path for the FIV/FIT vibration vertical under issue #429. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current implementation HEAD before this report update | `0a77e898effa1b3385aea3db33566162d6fbdcda` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 6 — FIT workbook source extraction tooling |
| Last completed stage | Stage 5 — prior reconciliation + handover |
| Engineering status | FIT terminology/API safeguard IMPLEMENTED; source extractor IMPLEMENTED; numerical FIT remains BLOCKED. |
| Validation status | Stage 6 patch/scope inspection PASS; runtime extractor tests and real-workbook extraction NOT_RUN in this environment. |
| Current blocker | Exact licensed FIT equations/tables/applicability have not yet been extracted, reconciled to the governing method, and independently qualified. |
| Exact next action | In a normal checkout run the Stage 6 tests and extractor against the pinned `d7d4c1...` workbook; then write the controlled FIT Engineering Method Specification before numerical kernel code. |

### Handover in 60 Seconds

**What is now true:** the public API ID remains `VIB.FIV.FLOW_TURBULENCE`, visible as **Flow-Induced Turbulence (FIT) Screening**, and remains `BLOCKED` under issue #429. A deterministic workbook source extractor now exists at `scripts/extract-fit-workbook-source.mjs`. It computes SHA-256 and Git blob SHA-1, inventories sheets/visibility/used ranges/defined names/cells/formulas/number formats/merged ranges, records VBA-project presence, and can hard-fail when an expected Git blob does not match.

**Source evidence:** the retained CRF-4-1 paths `Extended calc2/AIV FIV/FIT.xlsm` and `Enhanced stress report/extended calc/KS-PR-CAL-0086 Vibration Assessment - Flow Induced Turbulence Calculation.xlsm` are exact binary duplicates: Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e`, 493,650 bytes. The migrated `aiv-fiv.js` is not authority; it returns zero placeholders and declares `PENDING_SOURCE_EXTRACTION`.

**What remains unfinished:** actual extraction of the retained binary in a normal checkout; engineering interpretation of extracted formulas/tables; exact licensed-method cross-check; independent benchmark cases; FIT validation/applicability/calculation/assessment modules; central API activation; table-first facility workflow.

**What must not be assumed:** extractor output equals engineering qualification; workbook parity equals method correctness; cached spreadsheet values are benchmarks; runtime tests passed; screening/design authority exists.

**Highest-risk remaining item:** encoding empirical equations or thresholds before exact source/native-unit/applicability authority is controlled.

## Mission and Engineering Intent

FIT is the reference vertical for later AIV, FIP, SBC, cavitation/flashing, surge/momentum, and slug/time-history. This PR intentionally advances source qualification before numerical implementation so the first kernel does not inherit opaque workbook assumptions.

### Current scope

- Detailed API-first/table-first roadmap.
- Stable public calculation ID with FIT terminology.
- Fail-closed issue #429 gate.
- Deterministic retained-workbook extraction tooling using existing `xlsx` dependency.
- Controlled FIT source register.
- Focused deterministic/hash regression.
- No empirical FIT equations in this stage.

### Explicit non-goals

- No FIT LOF/correlation/threshold implementation yet.
- No calculator unblocking or authority promotion.
- No AIV/FIP/SBC equations.
- No 3D viewer/canvas.
- No workflow-file changes.
- No hidden natural-frequency/damping defaults.
- No universal cross-mechanism score.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIV/FIT roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable FIT terminology / public ID | P0 | IMPLEMENTED | 4 | catalogue + regression |
| Prior reconciliation | P0 | VALIDATED | 5 | prior four-file scope |
| Controlled FIT source register | P0 | IMPLEMENTED | 6 | `docs/vibration/FIT-source-register.md` |
| Workbook extraction CLI | P0 | IMPLEMENTED | 6 | `scripts/extract-fit-workbook-source.mjs` |
| Operator npm command | P0 | IMPLEMENTED | 6 | `extract:fit-source` |
| Extractor/hash regression | P0 | IMPLEMENTED | 6 | `tests/fit-workbook-source-extractor.test.mjs` |
| Stage 6 runtime validation | P0 | BLOCKED | 6 | no normal checkout / installed `xlsx` runtime here |
| Real retained-workbook extraction | P0 | BLOCKED | 6 | binary source not available to local execution runtime |
| FIT Engineering Method Specification | P0 | BLOCKED | Forward | requires real extraction + licensed source review |
| Qualified FIT numerical kernel | P0 | BLOCKED | Forward | method spec + independent benchmarks required |
| Table exchange/workspace | P1 | DEFERRED | Forward | after qualified mechanism path |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | No 3D/canvas; vibration product is table-first. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API contract. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority remain separate. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | FIT stays blocked until method + independent qualification. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Extract and hash-pin retained workbook before numerical transcription. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false authority. | Mitigated: no equations in Stage 6 |
| RISK-002 | Risk | High | DONE | Public calculation-ID break. | Regression pinned |
| RISK-003 | Risk | High | ACCEPTED | Plain 3D EDIT CSV may omit later authority data. | Deferred |
| RISK-004 | Risk | High | ACCEPTED | Hidden dynamic defaults could contaminate mechanisms. | Roadmap invariant |
| RISK-005 | Risk | High | ACCEPTED | Different filenames can be identical source content. | Hash-pinned register/extractor |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed FIT equations/tables/errata/native units/applicability. | Extraction is prerequisite |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. | Later |

## Stage Roadmap and Execution Log

### Stage 1 — report + research baseline — COMPLETE
Roadmap and architecture/product boundaries recorded.

### Stage 2 — PR allocation/report synchronization — COMPLETE
Draft PR #438 established.

### Stage 3 — pre-code scope verification — COMPLETE
Docs-only baseline reconciled. **PASS.**

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Visible FIT name added while frozen ID, issue #429 and fail-closed execution remain unchanged. Patch inspection **PASS**; runtime Node test **NOT_RUN**.

### Stage 5 — prior reconciliation — COMPLETE
Prior four-file scope reconciled. **PASS.**

### Stage 6 — FIT workbook source extraction tooling — PARTIAL

**Implementation performed**

- Added `scripts/extract-fit-workbook-source.mjs` (163 lines; functions remain bounded).
- Added deterministic source hashes: SHA-256 plus canonical Git blob SHA-1 (`blob <size>\0<bytes>`).
- Added workbook inventory for sheet order/visibility/range/merged cells, defined names, cell values/types/formulas/array ranges/number formats, formula counts, and VBA-project presence flag.
- Added `--expected-git-blob` fail-closed verification and `--formulas-only` review mode.
- Added `extract:fit-source` npm command using the already-present `xlsx@^0.18.5` dependency; no dependency upgrade/change.
- Added synthetic `.xlsm` regression covering determinism, formulas, defined names, formulas-only behavior, exact Git-blob acceptance, malformed expected hash, and source mismatch failure.
- Added controlled source register pinning the duplicate workbook paths and rejecting the zero-output migrated JS as numerical authority.

**Actual behavior / edge cases**

- Output contains no timestamp or absolute input path, so the same workbook bytes/options yield deterministic JSON.
- Expected Git blob is optional for generic inspection but, when supplied, mismatch is a hard failure.
- Raw VBA bytes are not emitted; only presence is reported.
- Source extraction remains evidence gathering, not method qualification.

**Validation performed**

- Source register facts checked against CRF-4-1 frozen commit: **PASS**.
- Extractor patch review: **PASS**.
- Extractor test patch review: **PASS** after correcting fixture non-empty cell count from 10 to 11.
- Package patch review: **PASS**; one script entry only, no dependency change.
- PR changed-file reconciliation: **PASS** — exactly eight explained paths listed below.
- `node --test tests/fit-workbook-source-extractor.test.mjs`: **NOT_RUN** in this environment because the repository dependency tree is not locally available.
- `node --test tests/engineering-calculation-core.test.mjs`: **NOT_RUN** for the same checkout limitation.
- Real `d7d4c1...` FIT workbook extraction: **NOT_RUN** because the private binary is not available to the local execution runtime.

**Stage decision: PARTIAL.** Source capability is implemented and scope-reconciled; runtime execution evidence and real-workbook extraction remain required before Stage 6 is complete.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 6 | Living PR state/handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed roadmap | Yes | reconciled |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 4 | FIT-explicit blocked catalogue name | Yes | patch PASS; runtime NOT_RUN |
| `tests/engineering-calculation-core.test.mjs` | 4 | 4 | stable ID/blocked regression | No | patch PASS; runtime NOT_RUN |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | controlled source inventory | Yes | source facts PASS |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | deterministic workbook extraction | Yes | patch PASS; runtime NOT_RUN |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | extractor/hash regression | No | patch PASS; runtime NOT_RUN |
| `package.json` | 6 | 6 | operator extractor command | No | patch PASS |

## Engineering Invariants

- **INV-001:** public ID remains `VIB.FIV.FLOW_TURBULENCE`.
- **INV-002:** calculator remains fail closed until qualification.
- **INV-003:** UI/reporting owns no engineering equations/thresholds/defaults.
- **INV-004:** vibration product remains table-only.
- **INV-005:** extractor output is evidence, not engineering authority.
- **INV-006:** qualification binds exact source content hashes, not filenames.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Evidence |
|---|---|---|
| Stage 6 source/patch inspection | PASS | exact extractor/test/package/register patches inspected |
| Stage 6 changed-file reconciliation | PASS | exactly eight explained PR paths |
| Extractor Node test | NOT_RUN | local dependency tree unavailable |
| Existing engineering core Node test | NOT_RUN | local checkout/dependency tree unavailable |
| Real retained FIT extraction | NOT_RUN | private workbook unavailable to local runtime |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Retained FIT workbook identity | PASS | duplicate CRF paths share `d7d4c1...`, 493,650 bytes |
| Migrated JS numerical authority | REJECTED | explicitly `PENDING_SOURCE_EXTRACTION`, zero placeholders |
| FIT numerical correctness | NOT_RUN | no numerical implementation |
| FIT applicability/assessment correctness | NOT_RUN | method specification not yet produced |
| Screening/design authority | NOT_RUN | issue #429 remains open |

### Explicitly Not Validated

Any EI/AVIFF equation, coefficient, table, criterion, licensed-source interpretation, workbook cached-value parity, or numerical FIT output.

## Recommended Forward Sequence

1. Run `npm run extract:fit-source -- /path/to/FIT.xlsm --expected-git-blob d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e --out /tmp/FIT-source-inventory.json` in a normal checkout.
2. Run `node --test tests/fit-workbook-source-extractor.test.mjs tests/engineering-calculation-core.test.mjs`.
3. Review extracted cells/formulas/defined names with a vibration engineer and exact licensed method/project source.
4. Create `docs/vibration/FIT-Engineering-Method-Specification-v1.md` with durable `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*` references.
5. Independently review native units, empirical masters, tables and benchmark cases.
6. Only then implement the pure FIT domain vertical: validate → resolve → applicability → calculate → assess.
7. Qualify independently and activate the central API only after explicit authority approval.
8. Follow with table exchange/workspace and later mechanisms.

## Process Notes / Lessons Learned

- Module existence is not qualification: the legacy JS explicitly demonstrates a source-extraction placeholder.
- Two differently named workbook files are the same source when their Git blob is identical; content identity must govern qualification.
- Deterministic extraction is a useful engineering control, but it cannot replace independent method review.

## Next-Agent Handover

- **Current stopping point:** Stage 6 implementation committed and scope-reconciled; runtime/real-workbook validation remains open.
- **PR / branch / implementation HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / `0a77e898effa1b3385aea3db33566162d6fbdcda` before this report-only update.
- **Last completed stage:** Stage 5.
- **Current active stage:** Stage 6, PARTIAL.
- **Start here:** run the extractor tests and the extractor against the exact `d7d4c1...` workbook in a normal checkout.
- **Do not redo:** broad research, FIT/FIV naming, public API identity, or 3D planning.
- **Do not assume:** extractor test passed, workbook behavior is qualified, or screening authority exists.
- **Files currently involved:** the eight ledger paths above.
- **Known failing checks:** none known; runtime checks are NOT_RUN rather than PASS.
- **Open QST-*:** QST-001; QST-002 deferred.
- **Highest-risk remaining item:** unqualified empirical method implementation.
- **Exact next recommended action:** execute Stage 6 tooling on the exact pinned workbook, then build and independently review the method specification before numerical code.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, `docs/APIEngineeringCalcContracts.md`, issue #429, Common CodingRules, CRF-4-1 FIT workbook/source paths.
