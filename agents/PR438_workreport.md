# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish the controlled roadmap and source-qualified implementation path for the FIV/FIT vibration vertical under issue #429. |
| Source task / issue | Owner requests on 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Pre-stage HEAD | `25c862cf64fd831f7b80f501377c2cf82437e0a3` |
| PR status | OPEN / DRAFT / mergeable before Stage 6 |
| Current stage | Stage 6 — FIT workbook source extraction tooling |
| Last completed stage | Stage 5 — reconciliation + handover |
| Engineering status | FIT terminology/API safeguard implemented; numerical FIT remains BLOCKED; source extraction now IN_PROGRESS. |
| Validation status | Prior patch/reconciliation PASS; exact Node runtime tests remain NOT_RUN in this environment. |
| Current blocker | Exact licensed FIT equations/tables/applicability have not yet been extracted and independently qualified. |
| Exact next action | Add a deterministic FIT workbook extractor, controlled source register, and focused regression without changing calculation authority. |

### Handover in 60 Seconds

**What is now true:** `VIB.FIV.FLOW_TURBULENCE` is still the frozen API ID and remains `BLOCKED` under issue #429. Its visible name is `Flow-Induced Turbulence (FIT) Screening`. The retained CRF-4-1 workbook exists twice under different paths but is byte-identical at Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e`, size 493,650 bytes. The migrated `aiv-fiv.js` is not a numerical source: it returns zeroes and marks `PENDING_SOURCE_EXTRACTION`.

**What is being worked on:** a deterministic command-line extraction tool that inventories workbook sheets, defined names, cells, formulas, and file hashes so a vibration engineer can build the controlled FIT Method Specification from the retained workbook without treating opaque spreadsheet behavior as authority.

**What remains unfinished:** running the extractor against the actual retained workbook in a normal checkout; engineering interpretation of extracted formulas/tables; exact licensed method cross-check; independent benchmark cases; numerical FIT kernel; API activation; table-first workspace.

**What must not be assumed:** workbook parity equals engineering qualification; the retained workbook is itself design authority; zero-output migrated JS is usable; FIT equations may be inferred from marketing/public summaries; runtime tests have passed.

**Highest-risk remaining item:** encoding an empirical correlation before exact equation/table/native-unit/applicability authority is controlled.

**Exact next action:** implement and review Stage 6 files, then run the extractor and tests in a normal checkout.

## Mission and Engineering Intent

The first FIT vertical defines the permanent pattern for AIV, FIP, SBC, cavitation/flashing, surge/momentum, and slug/time-history. The current owner direction extends this same assignment into source extraction and implementation preparation while retaining one PR per Common CodingRules.

### Current scope

- Keep `docs/FIVroadmap.md` and the table-only product boundary.
- Preserve public API ID `VIB.FIV.FLOW_TURBULENCE`.
- Keep issue #429 / `BLOCKED` authority unchanged.
- Add deterministic engineering-source extraction tooling for the retained FIT workbook.
- Add a controlled FIT source register.
- Add focused tests for deterministic workbook inventory and hash verification.
- Do **not** implement empirical FIT equations until extracted method content is independently reviewed.

### Explicit non-goals

- No FIT LOF/threshold/correlation implementation in Stage 6.
- No authority promotion or calculator unblocking.
- No AIV/FIP/SBC equations.
- No 3D viewer/canvas.
- No `.github/workflows/*` changes.
- No hidden natural-frequency/damping defaults.
- No universal vibration risk score.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Detailed FIV/FIT roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable FIT terminology / public ID safeguard | P0 | IMPLEMENTED | 4 | catalogue + regression |
| Prior changed-file reconciliation | P0 | VALIDATED | 5 | four explained files |
| FIT source inventory | P0 | IN_PROGRESS | 6 | CRF-4-1 workbook/source paths verified |
| Deterministic workbook extractor | P0 | IN_PROGRESS | 6 | planned `scripts/extract-fit-workbook-source.mjs` |
| Extractor regression | P0 | IN_PROGRESS | 6 | planned `tests/fit-workbook-source-extractor.test.mjs` |
| Controlled source register | P0 | IN_PROGRESS | 6 | planned `docs/vibration/FIT-source-register.md` |
| Exact FIT Method Specification | P0 | BLOCKED | Forward | requires extractor output + licensed source review |
| Qualified FIT numerical kernel | P0 | BLOCKED | Forward | method specification + independent benchmarks required |
| Table exchange / workspace | P1 | DEFERRED | Forward | after qualified mechanism path |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | No 3D/canvas in vibration product; table-only downstream workflow. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve existing external Engineering Calculation v1 contract. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority remain separate. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | FIT stays blocked until exact method + independent qualification. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Before numerical code, extract retained workbook formulas/metadata deterministically with file/hash evidence. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical equation implementation could create false authority. | Mitigated: no equations in Stage 6 |
| RISK-002 | Risk | High | DONE | Public calculation-ID break risk. | Regression pinned |
| RISK-003 | Risk | High | ACCEPTED | Plain 3D EDIT CSV may omit authority data needed later. | Deferred exchange work |
| RISK-004 | Risk | High | ACCEPTED | Hidden shared dynamic defaults could contaminate mechanisms. | Roadmap invariant |
| RISK-005 | Risk | High | ACCEPTED | Workbook filenames can be misleading duplicates; qualification must bind content identity, not path name. | Source register + hash verification |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed FIT revision/equations/tables/errata/redistribution constraints. | Stage 6 begins evidence extraction |
| QST-002 | Question | P1 | DEFERRED | Final 3D EDIT exchange format. | Later cross-repo work |

## Stage Roadmap and Execution Log

### Stage 1 — Report initialization + technical findings — COMPLETE
Roadmap, architecture boundary, source research, and PR branch initialized.

### Stage 2 — PR allocation + report synchronization — COMPLETE
Draft PR #438 allocated and living report synchronized.

### Stage 3 — Changed-file baseline — COMPLETE
Pre-production diff contained only report + roadmap. **PASS.**

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Visible name changed to `Flow-Induced Turbulence (FIT) Screening`; public ID, issue #429, `BLOCKED` authority and no-output behavior retained. Patch inspection **PASS**; runtime test **NOT_RUN**.

### Stage 5 — Reconciliation + handover — COMPLETE
Changed files reconciled and PR kept draft. **PASS.**

### Stage 6 — FIT workbook source extraction tooling — IN PROGRESS

**Current truth**

- `Extended calc2/AIV FIV/FIT.xlsm` exists at CRF-4-1 commit `68dc8e1fa2ef67073c59b3afc56f1bf40953d535`, blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e`, size 493,650 bytes.
- `Enhanced stress report/extended calc/KS-PR-CAL-0086 Vibration Assessment - Flow Induced Turbulence Calculation.xlsm` has the same blob and size: exact binary duplicate.
- `misc calc update/viewer/calc/formulas/aiv-fiv.js` is explicitly pending source extraction and returns `{lof:0,fmax:0,flim:0}`; it is not engineering authority.
- `xlsx@^0.18.5` is already a production dependency in this repository, so extraction tooling does not require a new package.

**Objective**

Provide an operator-usable, deterministic source extraction command that turns a supplied `.xlsm/.xlsx` into a machine-readable workbook inventory with source SHA-256, Git blob SHA-1, sheet/cell/formula metadata, defined names, and VBA-presence flag. The tool must verify an expected Git blob when supplied and fail closed on mismatch.

**Expected scope/files**

- `scripts/extract-fit-workbook-source.mjs`
- `tests/fit-workbook-source-extractor.test.mjs`
- `docs/vibration/FIT-source-register.md`
- `package.json` command entry
- this work report

**Engineering rationale**

The retained workbook is migration/source evidence only. Deterministic extraction is the next real capability needed to write an exact method specification; it is safer than manually transcribing formulas or coding from the zero-output migrated placeholder.

**Expected behavior**

```text
node scripts/extract-fit-workbook-source.mjs <FIT.xlsm> --out <inventory.json> --expected-git-blob d7d4...
```

produces deterministic JSON and exits non-zero when the expected source blob does not match.

**Edge cases**

- empty/hidden sheets;
- formula cells with cached values;
- defined names;
- array formula ranges;
- dates/errors/booleans serialized safely;
- macro workbook with no raw VBA content emitted;
- hash mismatch hard failure;
- unsupported/missing input path hard failure.

**Planned validation**

- focused `node --test tests/fit-workbook-source-extractor.test.mjs` in a normal checkout;
- existing `node --test tests/engineering-calculation-core.test.mjs` remains required;
- patch inspection and changed-file reconciliation in this environment;
- actual retained-workbook extraction remains `NOT_RUN` here unless the binary can be made available to the runtime.

**Known risks**

The extractor proves source identity and exposes workbook content; it does **not** prove engineering correctness, licensed method alignment, or screening authority.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 6 | Living PR state/handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed API-first/table-first roadmap | Yes | prior reconciliation PASS |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 4 | FIT-explicit blocked catalogue name | Yes | patch PASS; runtime NOT_RUN |
| `tests/engineering-calculation-core.test.mjs` | 4 | 4 | Stable ID/blocked-authority regression | No | patch PASS; runtime NOT_RUN |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | Deterministic workbook source extraction | Yes | planned |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | Extractor/hash regression | No | planned |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | Controlled retained-source inventory | Yes | planned |
| `package.json` | 6 | 6 | Operator command for extractor | No | planned |

## Engineering Invariants

- **INV-001:** public calculation ID remains `VIB.FIV.FLOW_TURBULENCE`.
- **INV-002:** FIT calculator remains fail closed until qualification.
- **INV-003:** UI/reporting owns no equations/thresholds/defaults.
- **INV-004:** vibration product remains table-only; no 3D/canvas.
- **INV-005:** source extraction output is evidence, not method authority.
- **INV-006:** source qualification binds exact content hashes, not filenames.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Prior source/patch inspection | PASS | `6677564f` | expected terminology/test changes only |
| Prior changed-file reconciliation | PASS | report closure | four expected files |
| Existing engineering core Node test | NOT_RUN | `6677564f` | no normal checkout available here |
| Stage 6 extractor test | NOT_RUN | — | implementation not yet committed |
| Actual retained FIT workbook extraction | NOT_RUN | — | binary source not available to local runtime |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Retained FIT workbook identity | PASS | two CRF paths share blob `d7d4c1...`, size 493,650 |
| Migrated JS numerical authority | REJECTED | source explicitly says `PENDING_SOURCE_EXTRACTION` and returns zeroes |
| FIT numerical correctness | NOT_RUN | no numerical implementation |
| FIT applicability/assessment correctness | NOT_RUN | no method specification yet |
| Screening/design authority | NOT_RUN | issue #429 remains open |

### Explicitly Not Validated

Any EI/AVIFF equation, coefficient, table, criterion, licensed-source interpretation, workbook calculated-value parity, or numerical FIT output.

## Known / Deferred Work and Recommended Forward Sequence

1. Complete Stage 6 extraction tool and run it against the exact `d7d4c1...` workbook.
2. Build `FIT-Engineering-Method-Specification-v1.md` from extracted workbook evidence plus exact licensed method/project source; assign `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*` IDs.
3. Independently review/transcribe method masters and native units.
4. Implement pure FIT domain vertical: validate → resolve → applicability → calculate → assess.
5. Qualify with independent hand/reference cases, boundaries, SI/US equivalence, missing-data/master failure, and determinism.
6. Activate central API only after explicit qualification/authority approval.
7. Add versioned 3D EDIT table import and table-first line/facility workflow.
8. Add AIV → FIP → SBC → cavitation/flashing → surge → slug separately.

## Process Notes / Lessons Learned

- Human/migrated spreadsheet code may exist while exact source equations remain unextracted; module presence is not qualification.
- Two different workbook paths can be the same Git blob. Source qualification should therefore bind content identity first and filenames second.
- A deterministic extractor is useful engineering evidence but must not be promoted into numerical authority.

## Next-Agent Handover

- **Current stopping point:** Stage 6 opened; no Stage 6 implementation files committed yet.
- **PR / branch / pre-stage HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / `25c862cf64fd831f7b80f501377c2cf82437e0a3`.
- **Last completed stage:** Stage 5.
- **Current active stage:** Stage 6 — FIT workbook source extraction tooling.
- **Start here:** implement `scripts/extract-fit-workbook-source.mjs` using existing `xlsx` dependency, then focused test and source register.
- **Do not redo:** broad research, terminology/API ID decision, or 3D planning.
- **Do not assume:** workbook formulas are qualified; JS zeroes are a benchmark; extraction equals engineering approval.
- **Known failing checks:** none known; relevant runtime tests are currently NOT_RUN.
- **Validation still required:** extractor test, engineering core test, actual retained workbook extraction in normal checkout.
- **Open QST-*:** QST-001; QST-002 deferred.
- **Highest-risk remaining item:** unauthorized/inexact empirical method implementation.
- **Exact next recommended action:** commit extractor + tests + source register, inspect patches, then run against the retained `d7d4c1...` workbook when available.
- **Required reading:** `docs/FIVroadmap.md`, `docs/Vibration deep-research-report (2).md`, `docs/APIEngineeringCalcContracts.md`, issue #429, Common CodingRules, CRF-4-1 retained FIT workbook/source paths.
