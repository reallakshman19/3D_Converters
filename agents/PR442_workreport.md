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
| Current stage | **Stage 6 — VALIDATION / DOCS / CLOSURE** |
| Last completed stage | Stage 5 — real workspace integration / authority hardening |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no numerical method or authority promotion. |
| Validation status | Source/contract review PASS; focused tests committed; runtime/full release execution still pending. |
| Current blocker | Full private-repo/browser execution is unavailable in this agent runtime. |
| Exact next action | Complete source/static validation, reconcile all changed files, check PR/workflow state, and close report with PASS/NOT_RUN evidence. |

## Handover in 60 Seconds

**Now true:** PR #442 implements the requested product capability. Users can select any of five controlled EI D2/D4 cases, click **Load BENCHMARK**, inspect/edit topology/operating/enrichment tables, import CSV into those tables, add/delete/edit rows, run readiness, and run the normal FIT benchmark workflow. Untouched benchmark results show target-vs-actual parity; any edit clears stale results and changes parity to not applicable.

**Provenance now true:** unedited complete XLSX can remain the execution input; first topology edit becomes `*.edited-elements.csv`. Generic Elements CSV now reports `sourceSystem=UNVERIFIED_ELEMENTS_CSV`, `completeExchange=false`, `LIMITED_ELEMENTS_ONLY`, null authority hashes and an explicit warning.

**Unfinished:** executable current-head regression and real-browser XLSX/CSV interaction cannot be performed in this runtime. PR stays draft unless owner directs otherwise.

**Must not be assumed:** local CSV is certified 3D EDIT output; modified benchmark is still an official parity case; parity is screening/design acceptance.

**Highest remaining risk:** browser/runtime behavior has not been exercised on a real checkout even though source-level authority boundaries and tests are in place.

**Exact next action:** final diff/release-manifest/CI reconciliation, then handoff.

## Mission / Engineering Intent

### Implemented scope
- Five controlled EI worked examples selectable and loadable.
- Three editable raw-contract working tables: Elements, operating cases, enrichment.
- CSV import populates editable rows; current rows are the workflow input.
- Add/delete/cell edit controls.
- Unedited complete XLSX preserves complete exchange for execution.
- First topology edit switches to local Elements-only CSV and visibly downgrades provenance.
- Published target/actual LOF + reference-band comparison for untouched benchmark cases.
- Any benchmark/table mutation clears stale result/preflight and suppresses official parity claim.
- FIT execution remains the existing facility workflow → central Engineering Calculation API.

### Non-goals
No FIT equation/correlation/applicability/LOF changes; no screening/design authority; no AIV work; no 3D/canvas/model editing; no local re-certification.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Source/import/benchmark inspection | P0 | DONE | 1 | source review |
| PR allocation/report sync | P0 | DONE | 2 | PR #442 |
| Pre-code changed-file verification | P0 | DONE | 3 | report-only diff |
| Editable table model | P0 | IMPLEMENTED | 4 | production module |
| Controlled EI benchmark cases | P0 | IMPLEMENTED | 4 | source-bound module |
| Visible editor/controller integration | P0 | IMPLEMENTED | 5 | real workspace path |
| CSV provenance hardening | P0 | IMPLEMENTED | 5 | ISS-001 fix |
| Focused/static/runtime tests | P0 | IMPLEMENTED | 4-6 | new tests committed |
| FIT release-gate update | P0 | IMPLEMENTED | 6 | 30 controlled tests |
| Workspace documentation | P0 | IMPLEMENTED | 6 | doc updated |
| Executable full release gate | P0 | NOT_STARTED | 6 | runtime limitation |
| Real browser/XLSX interaction | P1 | NOT_STARTED | 6 | runtime limitation |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| IMP-001 | Improvement | P0 | IMPLEMENTED | CSV input is visible/editable working table state. | YES |
| IMP-002 | Improvement | P0 | IMPLEMENTED | Controlled EI cases load and expose target/actual validation. | YES |
| ISS-001 | Defect | HIGH | IMPLEMENTED | Generic Elements CSV no longer claims certified `Advanced_Analysis.3D_EDIT` provenance from header shape. | YES |
| RISK-001 | Risk | HIGH | MITIGATED | Dirty certified XLSX executes as explicit `.edited-elements.csv`. | YES |
| RISK-002 | Risk | HIGH | MITIGATED | Any benchmark table mutation invalidates parity/stale result state. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | First topology mutation executes serialized `CSV_ELEMENTS_ONLY` local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment editors round-trip through existing v1 CSV contracts. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Benchmark parity only while all loaded benchmark tables remain untouched. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five controlled EI D2/D4 cases; no invented numerical demo. | YES |
| DEC-005 | Decision | P0 | ACCEPTED | Modified benchmark target stays original-case reference; parity becomes not applicable. | YES |
| DEC-006 | Decision | P0 | ACCEPTED | Header-compatible Elements CSV is explicitly unverified; complete XLSX is the richer declared upstream-authority path. | YES |

### ISS-001 closure evidence

Root cause: `parseVibrationTableExchangeCsv()` previously set `sourceSystem='Advanced_Analysis.3D_EDIT'` for any exact Elements header.

Resolution:
```text
sourceSystem = UNVERIFIED_ELEMENTS_CSV
completeExchange = false
integrityStatus = LIMITED_ELEMENTS_ONLY
authority hashes = null
warning = UNVERIFIED_ELEMENTS_CSV_SOURCE
```

A dedicated regression now pins this behavior. Complete workbook parsing remains separate and unchanged.

## Stage Roadmap / Execution Log

### Stage 1 — Findings
Decision: **COMPLETE**. Existing UI hid raw table content; strict CSV utility and five controlled EI cases already existed.

### Stage 2 — PR allocation
Decision: **COMPLETE**. Draft PR #442 allocated; pending report renamed/deleted.

### Stage 3 — Changed-file verification
Decision: **COMPLETE**. Pre-production diff exactly `agents/PR442_workreport.md`.

### Stage 4 — Core production behavior
Decision: **COMPLETE**.

Implemented:
- `tabs/vibration-integrity-input-model.js`: exact production headers, strict CSV load/serialize, immutable editable row state.
- `tabs/vibration-integrity-benchmarks.js`: all five controlled EI cases mapped to project-shaped working tables.
- tests bind case IDs/source commit/blob/inputs/targets to `fit-ei-worked-examples-v1.json` and production parsers.

### Stage 5 — Real workspace integration / authority hardening
Decision: **COMPLETE**.

Implemented:
- `tabs/vibration-integrity-input-view.js`: benchmark picker, Load BENCHMARK, target/actual panel, three editable tables, add/delete controls, import/readiness/run controls.
- `tabs/vibration-integrity-input-runtime.js`: file parsing, untouched-XLSX execution, dirty-XLSX local CSV selection, benchmark table setup.
- `tabs/vibration-integrity-tab.js`: state/events; any mutation clears stale results; numerical workflow remains lazy-loaded on Run.
- `tabs/vibration-integrity-view.js` composes input and output surfaces.
- CSS for table editors/benchmark panel.
- ISS-001 source-provenance fix in `parse-csv.js`.
- Dirty XLSX working filename becomes `*.edited-elements.csv`.

Deviations: controller initially exceeded the normal module-size guideline and was split with the production-consumed input-runtime module.

### Stage 6 — Validation / docs / closure

**Current truth:** implementation is feature-complete; 17 paths are currently changed.

**Objective:** prove scope/authority/static contracts, update release gate/docs, and record executable limitations without false PASS claims.

**Planned validation:**
- changed-file reconciliation;
- source scan: no direct calculation/canvas/universal-score behavior;
- benchmark catalogue parity source review;
- Elements CSV provenance source review;
- controller module-size/source review;
- PR mergeability/workflow allocation;
- runtime tests / full release gate: NOT_RUN if environment still unavailable.

Status: IN_PROGRESS.

## Changed-File Ledger

| File | Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---|---|---|
| `agents/PR442_workreport.md` | 1-6 | living report | YES | reconciliation pending final |
| `converters/vibration/exchange/parse-csv.js` | 5 | unverified Elements CSV provenance | YES | dedicated test committed |
| `docs/vibration/VibrationIntegrityTab-v1.md` | 6 | product/authority behavior | YES | source review |
| `scripts/verify-vibration-fit-release.mjs` | 6 | include new regressions | NO | self-contract updated |
| `tabs/vibration-integrity-benchmarks.js` | 4 | controlled EI cases | YES | source-parity test committed |
| `tabs/vibration-integrity-input-model.js` | 4 | editable table state | YES | focused test committed |
| `tabs/vibration-integrity-input-runtime.js` | 5 | input/file execution boundary | YES | runtime test committed |
| `tabs/vibration-integrity-input-view.js` | 5 | visible editor/benchmark UI | YES | static test committed |
| `tabs/vibration-integrity-tab.js` | 5 | controller integration | YES | static test committed |
| `tabs/vibration-integrity-view.js` | 5 | compose input/output UI | NO | existing/static tests |
| `tabs/vibration-integrity.css` | 5 | editor/benchmark styling | NO | browser NOT_RUN |
| `tests/vibration-elements-csv-provenance.test.mjs` | 5 | source-authority regression | YES | NOT_RUN |
| `tests/vibration-fit-release-gate.test.mjs` | 6 | pin 30-file release manifest | NO | NOT_RUN |
| `tests/vibration-fit-ui-benchmarks.test.mjs` | 4 | controlled EI mapping/parser regression | YES | NOT_RUN |
| `tests/vibration-integrity-editable-input-static.test.mjs` | 6 | visible behavior/authority regression | YES | NOT_RUN |
| `tests/vibration-integrity-input-model.test.mjs` | 4 | table-state regression | NO | NOT_RUN |
| `tests/vibration-integrity-input-runtime.test.mjs` | 6 | XLSX→edited CSV boundary regression | YES | NOT_RUN |

## Engineering Invariants

- **INV-001 one numerical path:** UI prepares table data only; execution remains existing facility workflow → central Engineering Calculation API.
- **INV-002 edited topology is not certified:** any topology mutation executes local Elements-only CSV.
- **INV-003 benchmark parity exact-case-only:** any mutation clears stale results and makes official parity not applicable.
- **INV-004 authority unchanged:** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.
- **INV-005 uploaded CSV is visible input:** current table rows, not hidden original CSV bytes, are execution input.
- **INV-006 source identity follows evidence:** CSV header compatibility never establishes certified 3D EDIT provenance.

## Validation / Evidence Ledger

### Software Validation
| Validation | Status | Evidence |
|---|---|---|
| Source/import architecture review | PASS | Stage 1 |
| Pre-code changed-file reconciliation | PASS | report only |
| Stage 4 source/contract review | PASS | exact production headers/parsers reused |
| Stage 5 authority source review | PASS | ISS-001 + dirty-XLSX behavior implemented |
| Focused test files | NOT_RUN | committed; current environment lacks full checkout |
| `npm run verify:vibration-fit-release` | NOT_RUN | requires normal checkout/dependencies |
| Real XLSX/browser interaction | NOT_RUN | environment limitation |

### Engineering Validation
| Property | Status | Evidence |
|---|---|---|
| EI benchmark mapping/targets | PASS | controlled JSON source identity and direct test mapping |
| FIT numerical method | NOT_APPLICABLE | unchanged |
| Edited topology certification | NOT_APPLICABLE | intentionally downgraded |
| Screening/design authority | NOT_APPLICABLE | unchanged/not authorized |

## Known / Deferred Work / Forward Sequence

1. Finish Stage 6 reconciliation and keep PR draft pending executable evidence unless owner directs merge.
2. Run `npm run verify:vibration-fit-release` and real browser XLSX/CSV interactions in a normal checkout.
3. Keep AIV implementation isolated under issue #441.
4. Scenario persistence/version history remains deferred; CSV is the explicit user interchange.

## Next-Agent Handover

Current stopping point: Stage 6 validation/closure.

PR / branch: #442 / `agent/fit-editable-benchmark-inputs`.

Start here: final changed-file/source/PR checks; do not add more product scope.

Do not redo: benchmark catalogue, editable table model, UI integration, provenance fix.

Do not assume: current-head runtime suite has passed; it has not been executed here.

Known failing checks: none known; executable checks NOT_RUN.

Highest-risk remaining item: real-browser/runtime validation against actual XLSX/CSV files.

Exact next action: final source reconciliation + PR status/workflow inspection, then handoff.
