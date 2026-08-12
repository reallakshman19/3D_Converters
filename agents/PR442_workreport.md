# PR442 — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add loadable EI FIT benchmark cases and editable table inputs to the existing table-first FIT workspace while preserving topology provenance and benchmark-only authority. |
| Source task | Owner: add **Load BENCHMARK**, show input/output for validation, make input tables editable, and load CSV into those editable tables. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| PR status | OPEN / DRAFT |
| Current stage | **Stage 5 — REAL WORKSPACE INTEGRATION / AUTHORITY HARDENING** |
| Last completed stage | Stage 4 — core production behavior |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no numerical method or authority promotion. |
| Validation status | Pre-code reconciliation PASS; Stage 4 source/contract review PASS; runtime suite pending. |
| Current blocker | None for implementation; full browser/repository execution unavailable here. |
| Exact next action | Fix ISS-001 CSV provenance + edited-XLSX filename, then complete UI/static/runtime tests and Stage 6 docs/release-gate update. |

## Handover in 60 Seconds

**Now true:** PR #442 has loadable EI benchmark/table helpers and visible editable topology/operating/enrichment table UI wired to the existing FIT facility workflow. The controller was split so file/input runtime is separate from orchestration and no numerical path exists in UI.

**Being worked on:** authority hardening discovered during Stage 5: generic Elements CSV currently reports `sourceSystem='Advanced_Analysis.3D_EDIT'` solely from header shape. That is invalid for local edited CSV and benchmark CSV. Edited certified XLSX also needs an explicit `.edited-elements.csv` working identity.

**Unfinished:** ISS-001 fix/tests, static/runtime UI tests, release-gate manifest update, docs, final PR reconciliation, real browser/XLSX execution.

**Must not be assumed:** any Elements CSV is certified 3D EDIT output; edited XLSX remains certified; modified benchmark remains official parity evidence; benchmark parity is screening acceptance.

**Highest risk:** provenance/benchmark claims surviving local mutation.

**Exact next action:** change the generic Elements CSV parser to an explicit unverified source identity and pin it in exchange tests.

## Mission / Engineering Intent

### Scope
- Load/select all five controlled EI D2/D4 FIT cases.
- Show/edit topology Elements, operating cases and enrichment tables.
- Add/delete rows and edit cells.
- CSV imports populate visible rows; readiness/run serialize current rows through existing parsers/workflow.
- Unedited five-sheet XLSX can execute as complete exchange; first topology edit becomes local Elements-only override.
- Untouched benchmark shows target vs actual parity; any edit makes parity not applicable until reload.

### Non-goals
No FIT equation/correlation/applicability/LOF changes; no screening/design authority; no AIV work; no 3D/canvas/model editing; no local re-certification.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Source/import/benchmark inspection | P0 | DONE | 1 | source review |
| PR allocation/report sync | P0 | DONE | 2 | PR #442 |
| Pre-code changed-file verification | P0 | DONE | 3 | report-only diff |
| Editable table model | P0 | IMPLEMENTED | 4 | `vibration-integrity-input-model.js` |
| Controlled EI benchmark cases | P0 | IMPLEMENTED | 4 | `vibration-integrity-benchmarks.js` |
| Visible editor/controller integration | P0 | IMPLEMENTED | 5 | input view/runtime/tab/view/CSS |
| CSV provenance hardening | P0 | IN_PROGRESS | 5 | ISS-001 |
| Focused/static/runtime tests | P0 | IN_PROGRESS | 5-6 | tests partly committed |
| Docs/release-gate update | P0 | NOT_STARTED | 6 | — |
| Real browser/XLSX execution | P1 | NOT_STARTED | 6 | normal checkout required |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| IMP-001 | Improvement | P0 | IMPLEMENTED | CSV input becomes visible/editable working table state. | YES |
| IMP-002 | Improvement | P0 | IMPLEMENTED | Five EI cases load into the same working tables and expose target/actual validation. | YES |
| ISS-001 | Defect | HIGH | IN_PROGRESS | Elements CSV parser claims `Advanced_Analysis.3D_EDIT` source from header shape alone; local edited/benchmark CSV would overstate provenance. | YES |
| RISK-001 | Risk | HIGH | MITIGATING | Edited certified XLSX must not retain certification or XLSX-looking working identity. | YES |
| RISK-002 | Risk | HIGH | MITIGATING | Edited benchmark must not retain official parity. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | First topology mutation executes serialized `CSV_ELEMENTS_ONLY` local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment editors round-trip through existing v1 CSV contracts. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Benchmark parity only while all loaded benchmark tables remain untouched. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five controlled EI D2/D4 cases; no invented numerical demo. | YES |
| DEC-005 | Decision | P0 | ACCEPTED | Modified benchmark target stays original-case reference; parity becomes `NOT_APPLICABLE_MODIFIED_INPUTS`. | YES |
| DEC-006 | Decision | P0 | ACCEPTED | Header-compatible Elements CSV source identity must be explicitly unverified; only complete XLSX carries declared upstream 3D EDIT source authority. | YES |

### ISS-001 detail

Affected: `converters/vibration/exchange/parse-csv.js`, local edited topology, benchmark topology.

Consequence: a user-created or locally edited CSV could appear to have upstream 3D EDIT source provenance despite lacking Connections / Source Mapping / Catalogue Evidence / Export Metadata.

Root cause: CSV parser historically set `sourceSystem: 'Advanced_Analysis.3D_EDIT'` for any exact Elements header.

Resolution in this PR: use an explicit unverified CSV source system + warning; keep `completeExchange=false`, null authority hashes and `LIMITED_ELEMENTS_ONLY`; ensure complete XLSX path remains unchanged.

Required validation: CSV exchange regression; benchmark production parser regression; source review.

## Stage Roadmap / Execution Log

### Stage 1 — Findings
Decision: **COMPLETE**. Existing UI hid raw tables; strict CSV utility and five controlled EI cases already existed. Source review PASS.

### Stage 2 — PR allocation
Decision: **COMPLETE**. Draft PR #442 allocated; pending report renamed/deleted.

### Stage 3 — Changed-file verification
Decision: **COMPLETE**. Pre-production diff exactly `agents/PR442_workreport.md`. PASS.

### Stage 4 — Core production behavior
Decision: **COMPLETE** for implementation; runtime validation deferred to Stage 6.

Implemented:
- `tabs/vibration-integrity-input-model.js`: exact contract headers, strict CSV parse/serialize, frozen table state, cell/add/delete edits, parsed-exchange Elements projection.
- `tabs/vibration-integrity-benchmarks.js`: five controlled EI D2/D4 cases, exact source identity/targets, project-shaped working tables.
- focused tests bind UI cases to `fit-ei-worked-examples-v1.json` and existing production parsers.

### Stage 5 — Real workspace integration / authority hardening

Current behavior implemented:
1. benchmark selector + **Load BENCHMARK**;
2. three visible editable raw-contract tables;
3. CSV loads into editable rows;
4. XLSX loads editable Elements view; unedited run uses original XLSX;
5. first topology edit switches execution to serialized limited CSV and auto-enables limited input;
6. any table edit clears stale readiness/results and marks loaded benchmark modified;
7. benchmark panel shows source/target/actual/delta; modified input disables parity claim;
8. benchmark workflow remains lazy-loaded only on explicit Run action;
9. controller contains no direct engineering kernel calls;
10. controller was split with `vibration-integrity-input-runtime.js` to stay near repository module-size limits.

Unexpected finding: ISS-001. Resolve before stage closure.

Stage decision: **IN_PROGRESS**.

### Stage 6 — Validation / docs / closure
Status: NOT_STARTED.

Planned:
- update static UI state/tests for editable tables and parity behavior;
- add runtime topology downgrade tests;
- update `vibration-table-exchange.test.mjs` for unverified CSV source;
- add new tests to `verify:vibration-fit-release` manifest and self-contract count;
- update `VibrationIntegrityTab-v1.md`;
- reconcile exact changed files and statuses.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR442_workreport.md` | 2 | 5 | living report | YES | reconciliation PASS pre-code |
| `tabs/vibration-integrity-input-model.js` | 4 | 4 | editable raw table model | YES | focused test committed |
| `tabs/vibration-integrity-benchmarks.js` | 4 | 4 | controlled EI table cases | YES | source-parity test committed |
| `tests/vibration-integrity-input-model.test.mjs` | 4 | 4 | table model regression | NO | NOT_RUN |
| `tests/vibration-fit-ui-benchmarks.test.mjs` | 4 | 4 | EI mapping/parser regression | YES | NOT_RUN |
| `tabs/vibration-integrity-input-view.js` | 5 | 5 | benchmark/editor visible UI | YES | static test pending |
| `tabs/vibration-integrity-input-runtime.js` | 5 | 5 | file parsing/execution input selection | YES | runtime test pending |
| `tabs/vibration-integrity-tab.js` | 5 | 5 | controller/event integration | YES | static/runtime tests pending |
| `tabs/vibration-integrity-view.js` | 5 | 5 | compose editor + existing output view | NO | static test pending |
| `tabs/vibration-integrity.css` | 5 | 5 | editor/benchmark presentation | NO | browser NOT_RUN |

## Engineering Decisions / Invariants

- **INV-001 one numerical path:** UI only prepares table data; execution remains existing facility workflow → central Engineering Calculation API.
- **INV-002 edited topology is not certified:** any topology mutation executes a local Elements CSV working override.
- **INV-003 benchmark parity exact-case-only:** any mutation clears stale result and changes parity to not-applicable.
- **INV-004 authority unchanged:** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.
- **INV-005 uploaded CSV is visible input:** current table rows, not original upload bytes, are execution input after load.
- **INV-006 source identity follows evidence:** CSV header compatibility never establishes certified 3D EDIT provenance.

## Validation / Evidence Ledger

### Software Validation
| Validation | Status | Evidence |
|---|---|---|
| Stage 1 source/import review | PASS | current-main source inspection |
| Pre-code changed-file reconciliation | PASS | report only |
| Stage 4 source/contract review | PASS | production headers/parsers reused |
| Stage 4 focused tests | NOT_RUN | committed |
| Stage 5 UI/static tests | NOT_RUN | pending updates |
| Stage 5 runtime topology downgrade | NOT_RUN | pending test |
| `npm run verify:vibration-fit-release` | NOT_RUN | normal checkout required |
| Real XLSX/browser interaction | NOT_RUN | environment limitation |

### Engineering Validation
| Property | Status | Evidence |
|---|---|---|
| EI benchmark mapping/targets | PASS | controlled JSON/source IDs |
| FIT numerical method | NOT_APPLICABLE | unchanged |
| Edited topology certification | NOT_APPLICABLE | deliberately removed/downgraded |
| Screening/design authority | NOT_APPLICABLE | unchanged/not authorized |

## Known / Deferred Work / Forward Sequence

1. Resolve ISS-001 and dirty-XLSX working filename.
2. Complete Stage 6 tests/docs/release manifest.
3. Run full FIT release gate + real browser XLSX/CSV interaction in normal checkout.
4. Keep AIV implementation isolated under #441.
5. Scenario persistence/version history remains deferred; CSV is the explicit user interchange.

## Next-Agent Handover

Current stopping point: Stage 5 UI is implemented; provenance hardening is active.

PR / branch: #442 / `agent/fit-editable-benchmark-inputs`.

Start here: fix `parse-csv.js` source identity/warning and `vibration-integrity-input-runtime.js` dirty XLSX working filename, then tests.

Do not redo: benchmark catalogue, table model, input view/controller split.

Do not assume: any CSV is certified 3D EDIT output; dirty XLSX can execute original XLSX; modified benchmark can report official parity.

Known failing checks: none executed; committed/new tests mostly NOT_RUN.

Validation still required: exchange provenance test, input-runtime test, updated static UI test, full release gate/browser.

Highest-risk item: provenance overstatement after editable topology mutation.

Exact next action: implement ISS-001 and pin it before closing Stage 5.
