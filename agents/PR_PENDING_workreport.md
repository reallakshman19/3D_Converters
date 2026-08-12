# PR_PENDING — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add a loadable EI FIT benchmark case and editable table inputs to the existing table-first FIT workspace, while preserving certified-topology and benchmark-only authority boundaries. |
| Source task | Owner request: add **Load BENCHMARK** so users can inspect benchmark input/output; make input tables editable; CSV loads into those tables and remains editable. |
| PR number | PENDING |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `main` after merged FIT release gate (`243042fba24915ae7b2734556cf2d28c1b5425b7`) |
| Current HEAD | report initialization |
| PR status | NOT_CREATED |
| Current stage | **Stage 1 — REPORT INITIALIZATION + TECHNICAL FINDINGS** |
| Last completed stage | None |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no equation/applicability/authority changes planned. |
| Validation status | Source inspection in progress; production code not started. |
| Current blocker | None. |
| Exact next action | Allocate draft PR, rename report, reconcile report-only diff, then implement the editable working-table model and EI benchmark loader. |

## Handover in 60 Seconds

### What is now true

- FIT is merged on `main` as a table-first `BENCHMARK_ONLY` product under `VIB.FIV.FLOW_TURBULENCE`.
- Current workspace accepts 3D EDIT XLSX/Elements CSV plus operating-case/enrichment CSV, but the loaded CSV content is not visibly editable in the workspace.
- Five controlled EI D2/D4 cases already exist in `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`.

### What is being worked on

- A benchmark picker + **Load BENCHMARK** action that fills the same working tables used for project data.
- Editable topology Elements / operating-case / enrichment working tables.
- CSV upload into those tables, followed by normal readiness/benchmark execution from the edited table state.
- Benchmark target-versus-actual parity display for untouched official cases.

### What remains unfinished

- PR allocation and report rename.
- Production modules/UI/CSS/tests/docs.
- Runtime/browser/XLSX validation in a normal checkout.

### What must not be assumed

- Editing a certified five-sheet XLSX must **not** preserve or claim its certification. Any edited topology becomes an explicit local Elements-only working override.
- Editing an EI benchmark case means the published target no longer validates the modified inputs.
- Benchmark parity is not screening/design acceptance.

### Highest-risk remaining item

Preventing editable topology or edited benchmark data from silently retaining stronger provenance/benchmark claims than the actual working data supports.

### Exact next action

Open the draft PR, rename this report to `agents/PR<NUMBER>_workreport.md`, verify the pre-code diff is report-only, then implement production-consumed table/benchmark helpers.

## Mission and Engineering Intent

### Mission

Make FIT validation inspectable and interactive: an operator can load an official EI benchmark, see all table inputs, edit them, run the same production benchmark workflow, and see the resulting output. Project CSV inputs should follow the same visible/editable table path.

### User / engineering consequence

- Benchmark validation becomes transparent rather than hidden in tests.
- Operators can inspect exactly what the workflow will consume before running it.
- CSV becomes an import convenience, not an opaque execution path.
- Provenance remains honest when an operator edits topology or benchmark inputs.

### Scope

1. Curated UI-safe benchmark case definitions sourced from the existing controlled EI benchmark dataset.
2. Editable working-table model for:
   - topology Elements;
   - operating cases;
   - vibration enrichment.
3. Load CSV into working tables and serialize edited rows back through existing production parsers/workflow.
4. For five-sheet XLSX: show Elements in the table; unedited execution may use the certified XLSX; the first topology edit switches execution to a visibly limited local Elements-only override.
5. Benchmark target panel showing published standard LOF/reference band and actual benchmark result.
6. Benchmark parity claim only while the loaded benchmark inputs remain untouched.
7. Row add/delete and cell editing for working tables.
8. Focused tests, CSS and workspace documentation.

### Governing engineering principles

- One numerical path: all execution still goes through the existing table workflow and central Engineering Calculation API.
- No UI-side FIT equations.
- No silent defaults.
- No 3D/canvas/model runtime.
- Certified upstream topology authority must not survive local edits.
- Published benchmark target is valid only for the exact controlled benchmark inputs.

### Explicit non-goals

- FIT screening/design authority promotion.
- New FIT correlations, coefficients or applicability logic.
- AIV or other vibration-mechanism implementation.
- Editing Advanced_Analysis geometry/model state.
- Re-certifying a modified XLSX inside the vibration product.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Inspect current FIT workspace/import path | P0 | DONE | 1 | `tabs/vibration-integrity-tab.js`, `vibration-integrity-view.js` |
| Inspect CSV contracts and serializer | P0 | DONE | 1 | tabular operating/enrichment/csv modules |
| Inspect EI benchmark dataset | P0 | DONE | 1 | five cases in `fit-ei-worked-examples-v1.json` |
| Define provenance boundary for topology edits | P0 | ACCEPTED | 1 | DEC-001 |
| Allocate PR / rename report | P0 | NOT_STARTED | 2 | — |
| Verify pre-code changed files | P0 | NOT_STARTED | 3 | — |
| Implement benchmark case loader | P0 | NOT_STARTED | 4 | — |
| Implement editable working tables | P0 | NOT_STARTED | 4 | — |
| Integrate UI / benchmark parity | P0 | NOT_STARTED | 5 | — |
| Focused tests/docs/CSS | P0 | NOT_STARTED | 6 | — |
| Full browser/XLSX execution | P1 | NOT_STARTED | 6 | Requires normal checkout/runtime |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| IMP-001 | Improvement | P0 | ACCEPTED | Loaded CSV data should be visible/editable before execution. | YES |
| IMP-002 | Improvement | P0 | ACCEPTED | Official EI cases should be loadable in-product with published target/actual parity. | YES |
| RISK-001 | Risk | HIGH | ACTIVE | Editing certified XLSX Elements could falsely imply the edited data remains certified. | YES |
| RISK-002 | Risk | HIGH | ACTIVE | Edited benchmark inputs could falsely retain an official benchmark PASS claim. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | Unedited XLSX may retain complete exchange; first topology edit switches execution to an explicit Elements-only local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment CSV imports populate editable raw-contract tables, then execution serializes those rows back through existing parsers. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Benchmark parity may be reported only for untouched controlled case inputs; any edit marks the case modified. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five existing EI D2/D4 benchmark cases rather than inventing a separate demo case. | YES |
| QST-001 | Question | P1 | ACCEPTED | Certified XLSX topology remains read-only authority; editing intentionally downgrades to local limited override rather than attempting re-certification. | YES |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

Current truth: existing workspace executes uploaded files directly; user cannot inspect/edit the raw input tables. Controlled benchmark data already exists.

Objective: define the production-safe interaction and authority boundary.

Expected scope/files: report only.

Engineering rationale: editing must be transparent without converting local UI state into certified geometry or engineering authority.

Planned validation: source review of current workflow, CSV contracts and benchmark dataset.

Known risks: RISK-001, RISK-002.

Status: IN_PROGRESS.

### Stage 2 — PR allocation + report synchronization

Objective: create one draft PR for the assignment, rename the report and make the PR the single handover unit.

Expected files: report rename only.

Status: NOT_STARTED.

### Stage 3 — Changed-file / repository-state verification

Objective: prove the branch is report-only before production implementation.

Expected files: exactly `agents/PR<NUMBER>_workreport.md`.

Status: NOT_STARTED.

### Stage 4 — Core production behavior: benchmark + editable table model

Expected files:

- one benchmark/table helper module under `tabs/` or `converters/vibration/` that is immediately consumed by the workspace;
- focused pure tests.

Expected behavior:

- five EI cases selectable;
- editable rows preserve exact v1 CSV headers/order;
- CSV import populates row state;
- serialization feeds existing parser/workflow contracts;
- topology edit downgrades authority visibly.

Status: NOT_STARTED.

### Stage 5 — Real UI integration

Expected files:

- `tabs/vibration-integrity-tab.js`;
- `tabs/vibration-integrity-view.js`;
- `tabs/vibration-integrity.css`;
- possibly a small dedicated input-table renderer to stay within module-size rules.

Expected behavior:

- Load BENCHMARK button + selector;
- visible editable tables;
- add/delete rows;
- file imports populate editors;
- benchmark target/actual parity;
- modified benchmark warning;
- normal readiness/run consumes edited tables.

Status: NOT_STARTED.

### Stage 6 — Validation, docs and closure

Expected files:

- focused UI/editor tests;
- update release-gate manifest if needed;
- `docs/vibration/VibrationIntegrityTab-v1.md`.

Status: NOT_STARTED.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Required living report before production work | YES | Source review |

## Engineering Decisions and Invariants

### INV-001 — one numerical execution path

What must remain true: editable tables and benchmark loader only prepare table input; calculations continue through the existing FIT facility workflow / central Engineering Calculation API.

Where enforced: workspace controller and tests prohibiting direct FIT calculation calls.

How validated: source/static regression plus workflow tests.

PR change: presentation/input preparation only.

### INV-002 — edited topology is not certified topology

What must remain true: once any topology cell/row is changed in the vibration workspace, the five-sheet XLSX certification claim is not used for that execution.

Where enforced: working-table state selects `CSV_ELEMENTS_ONLY` local override after topology mutation and surfaces a warning.

PR change: new explicit downgrade behavior.

### INV-003 — benchmark parity is exact-case evidence only

What must remain true: published EI target comparison is only authoritative for the untouched controlled case.

Where enforced: any editable-table mutation marks the benchmark modified; UI disables parity PASS claim.

PR change: new validation UX.

### INV-004 — benchmark-only engineering authority unchanged

What must remain true: no `safe/pass` engineering conclusion, no screening/design authority, no authority-state promotion.

Where enforced: existing FIT definition plus UI terminology/tests.

PR change: none.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Existing source/import architecture review | PASS | pre-code | inspected current main modules |
| Pre-code branch diff | NOT_RUN | — | Stage 3 |
| Benchmark/editor pure tests | NOT_RUN | — | Stage 4 |
| UI static/controller tests | NOT_RUN | — | Stage 5/6 |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | Stage 6 / normal checkout |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| EI benchmark target values | PASS | existing controlled `fit-ei-worked-examples-v1.json` |
| FIT numerical method | NOT_APPLICABLE | this PR must not change numerical method |
| Edited topology certification | NOT_APPLICABLE | intentionally downgraded to limited/unverified working input |
| Screening/design authority | NOT_APPLICABLE | remains not authorized |

### Explicitly Not Validated

- Browser interaction with real five-sheet XLSX in this execution environment.
- Full current-head repository regression until executable checkout is available.
- Any engineering authority beyond existing benchmark mode.

## Known / Deferred Work and Recommended Forward Sequence

1. Finish this editable-input/benchmark UX without numerical changes.
2. Run full FIT release gate in a normal checkout and exercise real XLSX + CSV browser interactions.
3. Keep AIV work isolated under issue #441.
4. Consider a future user-authored scenario save/export workflow only after editable working tables are proven; not part of this PR.

## Next-Agent Handover

Current stopping point: Stage 1 before PR allocation.

PR / branch / HEAD: PR pending; `agent/fit-editable-benchmark-inputs`.

Last completed stage: none.

Current active stage: Stage 1.

Start here: allocate draft PR, rename report, verify changed files, then implement working-table/benchmark helpers.

Do not redo: source inspection of current workspace, CSV contracts and EI benchmark dataset.

Do not assume: edited topology remains certified; edited benchmark remains official parity evidence.

Files currently involved: report only.

Known failing checks: none; runtime checks not yet run.

Validation still required: all production/UI tests and full release gate.

Open QST-* items: none requiring owner decision; QST-001 resolved by DEC-001.

Important deferred IMP-* items: scenario persistence/export beyond CSV editing is deferred.

Highest-risk remaining item: provenance downgrade on topology edit and benchmark parity invalidation on any edit.

Exact next recommended action: create the draft PR and rename this report before production changes.

Required reading:

- `docs/vibration/VibrationIntegrityTab-v1.md`
- `tabs/vibration-integrity-tab.js`
- `tabs/vibration-integrity-view.js`
- `converters/vibration/tabular/csv.js`
- `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`
- `reallaksh19/Common@43eccc.../CodingRules.md`
