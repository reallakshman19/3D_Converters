# PR442 — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add loadable EI FIT benchmark cases and editable table inputs to the existing table-first FIT workspace while preserving topology provenance and benchmark-only authority. |
| Source task | Owner: add **Load BENCHMARK**, show input/output for validation, make input tables editable, and load CSV into those editable tables. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| Current HEAD | Stage 5 opening after core model commits |
| PR status | OPEN / DRAFT |
| Current stage | **Stage 5 — REAL WORKSPACE INTEGRATION** |
| Last completed stage | Stage 4 — core production behavior |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no numerical method or authority change. |
| Validation status | Pre-code reconciliation PASS; Stage 4 source/contract coverage implemented; runtime test execution pending. |
| Current blocker | None for implementation; full browser/repo execution unavailable in this agent runtime. |
| Exact next action | Integrate working-table state into controller/view/CSS, then focused UI/static regressions. |

## Handover in 60 Seconds

**Now true:** PR #442 started report-only. Stage 4 added two production-consumed pure modules and two focused tests. The editable table model owns exact topology/operating/enrichment headers, strict CSV load/serialize, immutable cell/row changes and parsed-exchange-to-topology rows. The benchmark module exposes all five controlled EI D2/D4 cases and builds project-shaped working tables from those exact benchmark inputs.

**Being worked on:** visible benchmark selector/button, editable table renderer, file-to-table behavior, topology provenance downgrade, benchmark modified-state, and target-vs-actual display.

**Unfinished:** controller/view/CSS integration, docs/release-gate updates, executable browser/full-repo tests.

**Must not be assumed:** edited XLSX remains certified; edited benchmark remains an official benchmark parity case; benchmark parity equals screening/design acceptance.

**Highest risk:** UI mutation must change execution input/provenance exactly once and must invalidate stale calculated results/parity.

**Exact next action:** Stage 5 controller integration using the existing facility workflow only.

## Mission and Engineering Intent

### Scope

- Select/load five controlled EI cases.
- Show topology Elements, operating-case and enrichment working tables.
- Edit cells; add/delete rows.
- CSV imports populate those tables; readiness/run serializes table state through existing parsers/workflow.
- Unedited five-sheet XLSX can retain complete exchange input; first topology edit switches to explicit local Elements-only CSV override.
- Untouched benchmark displays published target vs actual; any edit marks benchmark modified and disables official parity claim.

### Non-goals

No FIT equations/correlations/applicability/LOF changes; no screening/design authority; no AIV work; no 3D/canvas; no local re-certification.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Source/import/benchmark inspection | P0 | DONE | 1 | source review |
| PR allocation/report sync | P0 | DONE | 2 | PR #442 |
| Pre-code changed-file verification | P0 | DONE | 3 | report-only diff |
| Editable table model | P0 | IMPLEMENTED | 4 | `vibration-integrity-input-model.js` |
| Controlled benchmark table cases | P0 | IMPLEMENTED | 4 | `vibration-integrity-benchmarks.js` |
| Stage 4 focused tests | P0 | IMPLEMENTED | 4 | two new test files |
| UI/controller integration | P0 | IN_PROGRESS | 5 | current stage |
| Docs/release gate/final validation | P0 | NOT_STARTED | 6 | — |
| Real browser/XLSX execution | P1 | NOT_STARTED | 6 | normal checkout required |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| IMP-001 | Improvement | P0 | IN_PROGRESS | CSV inputs become visible/editable table state. | YES |
| IMP-002 | Improvement | P0 | IN_PROGRESS | Official EI cases become loadable and comparable to actual output. | YES |
| RISK-001 | Risk | HIGH | MITIGATING | Edited certified XLSX must not retain certification. | YES |
| RISK-002 | Risk | HIGH | MITIGATING | Edited benchmark must not retain official parity. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | First topology mutation uses `CSV_ELEMENTS_ONLY` local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment editors round-trip through existing v1 CSV contracts. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Benchmark parity only while all loaded benchmark working tables remain untouched. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five existing EI D2/D4 cases; invent no numerical demo case. | YES |
| DEC-005 | Decision | P0 | ACCEPTED | Modified benchmark retains published target only as original-case reference; parity status becomes not applicable. | YES |

## Stage Roadmap and Execution Log

### Stage 1 — Findings
Decision: **COMPLETE**. Current UI hides raw loaded tables; strict CSV utility and five EI cases already exist. Source review PASS.

### Stage 2 — PR allocation
Decision: **COMPLETE**. Draft PR #442 allocated and report renamed.

### Stage 3 — Changed-file verification
Decision: **COMPLETE**. Pre-production diff exactly `agents/PR442_workreport.md`. PASS.

### Stage 4 — Core production behavior
Decision: **COMPLETE** for implementation; runtime validation remains Stage 6.

Implementation performed:
- added `tabs/vibration-integrity-input-model.js`;
- exact v1 headers are imported from production contracts, not copied;
- strict CSV load and existing serializer round trip table rows;
- parsed exchange Elements can populate the topology editor;
- cell edit/add/delete returns frozen new state and sets `dirty=true`;
- added `tabs/vibration-integrity-benchmarks.js` with five EI D2/D4 cases, controlled source identity, target values and table-row builder;
- benchmark topology is explicitly local/limited, not certified;
- benchmark process/geometry values map to the same operating/enrichment contracts used by the facility planner;
- added `tests/vibration-integrity-input-model.test.mjs`;
- added `tests/vibration-fit-ui-benchmarks.test.mjs`, including direct comparison against `fit-ei-worked-examples-v1.json` and production CSV parser compatibility.

Changed files at Stage 4 end:
```text
agents/PR442_workreport.md
tabs/vibration-integrity-benchmarks.js
tabs/vibration-integrity-input-model.js
tests/vibration-fit-ui-benchmarks.test.mjs
tests/vibration-integrity-input-model.test.mjs
```

Validation performed: source/contract inspection PASS; executable tests NOT_RUN in this environment yet.

New findings: none requiring scope change.

### Stage 5 — Real workspace integration

**Current truth:** core model exists but operator cannot yet use it from the visible tab.

**Objective:** make the intended capability usable through the existing FIT workspace.

**Expected files:**
- `tabs/vibration-integrity-tab.js`;
- `tabs/vibration-integrity-view.js`;
- `tabs/vibration-integrity.css`;
- optional small `tabs/vibration-integrity-input-view.js` to keep modules below normal size limits.

**Planned behavior:**
1. benchmark selector + **Load BENCHMARK**;
2. three working-table editors with add/delete and text cell editing;
3. CSV load populates working rows;
4. XLSX load populates topology Elements for inspection; unedited run uses XLSX;
5. first topology edit switches tableInput to serialized Elements CSV, marks local override and enables limited-exchange acceptance visibly;
6. readiness/run always use current serialized operating/enrichment rows;
7. any benchmark table edit invalidates official parity state and stale results;
8. benchmark panel shows source, target, actual and relative delta only for untouched case;
9. no direct numerical kernel calls from UI.

**Edge cases:** table edits during stale result display, blank added rows, imported malformed CSV, edited XLSX, external file load after benchmark, benchmark reload after edits.

**Planned validation:** updated static UI regression + pure parity helper test + source scan for direct calculation/canvas/safe-score behavior.

Status: IN_PROGRESS.

### Stage 6 — Validation/docs/closure
Status: NOT_STARTED.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR442_workreport.md` | 2 | 5 | Living report | YES | pre-code reconciliation PASS |
| `tabs/vibration-integrity-input-model.js` | 4 | 4 | Editable table state / CSV round trip | YES | focused test implemented |
| `tabs/vibration-integrity-benchmarks.js` | 4 | 4 | Controlled EI benchmark table cases | YES | source-parity test implemented |
| `tests/vibration-integrity-input-model.test.mjs` | 4 | 4 | Table state regression | NO | NOT_RUN |
| `tests/vibration-fit-ui-benchmarks.test.mjs` | 4 | 4 | EI source/table mapping regression | YES | NOT_RUN |

## Engineering Decisions and Invariants

**INV-001 — one numerical path.** UI prepares table data only; execution remains facility workflow → central Engineering Calculation API. No UI `calculateFit()`.

**INV-002 — edited topology is not certified.** Any topology edit causes execution from serialized Elements CSV local override, never the original certified XLSX.

**INV-003 — benchmark parity exact-case-only.** Any table mutation after benchmark load marks the benchmark modified and invalidates stale parity/results.

**INV-004 — authority unchanged.** FIT remains `BENCHMARK_ONLY`; benchmark parity wording is validation evidence, never safe/pass screening.

**INV-005 — uploaded CSV is visible input.** CSV is parsed into rows before execution; current working rows are serialized back through existing parsers.

## Validation and Evidence Ledger

### Software Validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Pre-code reconciliation | PASS | `5ffecf9...` | report only |
| Stage 4 source/contract review | PASS | current | exact production headers/parsers consumed |
| Stage 4 tests | NOT_RUN | — | committed |
| UI/controller tests | NOT_RUN | — | Stage 5/6 |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | normal checkout required |

### Engineering Validation
| Property | Status | Evidence |
|---|---|---|
| EI benchmark source mapping | PASS | test binds UI cases to controlled benchmark JSON |
| FIT numerical method | NOT_APPLICABLE | unchanged |
| Edited topology certification | NOT_APPLICABLE | explicitly downgraded |
| Screening/design authority | NOT_APPLICABLE | unchanged/not authorized |

### Explicitly Not Validated
- Real browser editing against genuine five-sheet XLSX.
- Full current-head release suite.

## Known / Deferred Work and Recommended Forward Sequence
1. Complete visible Stage 5 capability.
2. Close Stage 6 tests/docs and reconcile PR.
3. Execute full release gate + real browser XLSX/CSV interaction in normal checkout.
4. Keep AIV implementation isolated under #441.

## Next-Agent Handover

Current stopping point: Stage 5 open after core helpers/tests implemented.

PR/branch: #442 / `agent/fit-editable-benchmark-inputs`.

Start here: controller state must use the new helpers; avoid a second CSV/editor implementation.

Do not redo: benchmark catalogue and raw-table model.

Do not assume: dirty topology can use original XLSX; modified benchmark can show parity PASS.

Files currently involved: five listed in Stage 4 ledger; Stage 5 UI files next.

Known failing checks: none known; committed tests remain NOT_RUN.

Validation still required: Stage 4 tests, Stage 5 UI tests, full release gate/browser.

Highest-risk item: stale result/provenance/parity after edit.

Exact next action: implement table-input selection/mutation in `tabs/vibration-integrity-tab.js` and a dedicated renderer if needed.
