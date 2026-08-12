# PR442 — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add a loadable EI FIT benchmark case and editable table inputs to the existing table-first FIT workspace, preserving certified-topology and benchmark-only authority boundaries. |
| Source task | Owner request: add **Load BENCHMARK** so users can inspect benchmark input/output; make input tables editable; CSV loads into the tables and remains editable. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| Current HEAD | report synchronization |
| PR status | OPEN / DRAFT |
| Current stage | **Stage 2 — PR ALLOCATION + REPORT SYNC** |
| Last completed stage | Stage 1 — findings |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no equations/applicability/authority changes. |
| Validation status | Source architecture review PASS; production code not started. |
| Current blocker | None. |
| Exact next action | Delete `PR_PENDING`, verify PR diff is report-only, then implement benchmark/table production helpers. |

## Handover in 60 Seconds

**Now true:** PR #442 owns this assignment. Current FIT workspace can upload files but does not expose their raw table content for editing. Five official EI D2/D4 FIT cases already exist as controlled benchmark evidence.

**Being worked on:** benchmark picker + **Load BENCHMARK**, editable topology/operating/enrichment tables, CSV-to-table import, normal workflow execution from edited tables, and published-target versus actual benchmark parity.

**Unfinished:** production helpers, UI/CSS, tests/docs, real browser/XLSX validation.

**Must not be assumed:** edited certified XLSX remains certified; edited EI benchmark inputs still qualify for published benchmark parity; benchmark parity equals screening/design acceptance.

**Highest risk:** local edits retaining stronger provenance/benchmark claims than the modified working data supports.

**Exact next action:** Stage 3 changed-file verification, then Stage 4 core model.

## Mission and Engineering Intent

### Scope

1. All five controlled EI D2/D4 FIT cases available for selection.
2. **Load BENCHMARK** fills the same working tables used for project input.
3. Editable working tables for topology Elements, operating cases and enrichment.
4. CSV imports populate those tables; row/cell edits are executed through existing CSV/parser/workflow contracts.
5. Unedited five-sheet XLSX may retain complete exchange authority; the first topology edit switches execution to a visibly limited local Elements-only override.
6. Untouched benchmark case may show published target vs actual parity; any edit marks it modified and disables official parity claim.
7. Add/delete rows and visible source/provenance state.
8. Focused regression, CSS and workspace documentation.

### Non-goals

- No FIT equation/correlation/LOF/applicability changes.
- No screening/design authority promotion.
- No AIV or other mechanism implementation.
- No 3D/canvas/model editing.
- No local re-certification of modified upstream topology.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Current FIT workspace/import inspection | P0 | DONE | 1 | tab/view/source inspection |
| CSV contract/serializer inspection | P0 | DONE | 1 | `tabular/csv.js`, operating/enrichment schemas |
| EI benchmark source inspection | P0 | DONE | 1 | five cases in controlled benchmark JSON |
| PR allocation/report sync | P0 | IN_PROGRESS | 2 | PR #442 |
| Pre-code changed-file verification | P0 | NOT_STARTED | 3 | — |
| Benchmark/table model | P0 | NOT_STARTED | 4 | — |
| UI integration | P0 | NOT_STARTED | 5 | — |
| Tests/docs/release-gate update | P0 | NOT_STARTED | 6 | — |
| Real browser/XLSX execution | P1 | NOT_STARTED | 6 | normal checkout required |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| IMP-001 | Improvement | P0 | ACCEPTED | CSV input must become visible/editable working table state. | YES |
| IMP-002 | Improvement | P0 | ACCEPTED | Official EI cases must be loadable and visibly comparable to actual output. | YES |
| RISK-001 | Risk | HIGH | ACTIVE | Editing certified XLSX could falsely imply edited topology remains certified. | YES |
| RISK-002 | Risk | HIGH | ACTIVE | Editing benchmark data could falsely retain official parity. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | First topology edit downgrades execution input to `CSV_ELEMENTS_ONLY` local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment editors serialize back through existing v1 CSV contracts. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Benchmark parity only for untouched controlled case inputs. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five existing EI D2/D4 cases; invent no new numerical demo data. | YES |

## Stage Roadmap and Execution Log

### Stage 1 — Report initialization + technical findings

**Decision: COMPLETE.**

Findings:
- current UI executes uploaded raw files rather than showing editable raw tables;
- shared strict CSV parser/serializer already exists;
- five EI cases already contain exact inputs, published standard LOF and reference band;
- facility workflow can execute a one-row local Elements CSV when limited input is explicitly accepted;
- certified XLSX must not retain certification after local topology edits.

Validation: source inspection **PASS**.

### Stage 2 — PR allocation + report synchronization

**Current truth:** draft PR #442 exists from exact merged FIT main baseline.

Objective: rename report and remove `PR_PENDING` before implementation.

Expected files: report rename only.

Validation: list PR changed files after pending deletion.

Status: IN_PROGRESS.

### Stage 3 — Changed-file verification

Objective: prove pre-code PR diff is exactly `agents/PR442_workreport.md`.

Status: NOT_STARTED.

### Stage 4 — Core production behavior

Expected production-consumed modules:
- benchmark case/table builder tied to controlled EI IDs;
- editable raw-table model/parser/serializer helpers.

Expected behavior:
- exact v1 headers/order;
- row add/delete/cell mutation;
- CSV load into rows;
- serialization back to existing workflow inputs;
- topology edit downgrade;
- benchmark modified-state invalidation.

Planned validation: pure tests including source JSON parity and round-trip CSV.

Status: NOT_STARTED.

### Stage 5 — Real workspace integration

Expected files: FIT tab controller/view/CSS plus small renderer if required by module-size rules.

Expected behavior: picker, Load BENCHMARK, editable tables, file load, provenance warning, readiness/run from edits, benchmark target/actual display.

Status: NOT_STARTED.

### Stage 6 — Validation/docs/closure

Expected: UI/static tests, docs update, FIT release-gate manifest update if new focused test must become permanent.

Status: NOT_STARTED.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR442_workreport.md` | 2 | 2 | Required living report | YES | pending reconciliation |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | Temporary pre-PR report; must be deleted | YES | pending deletion |

## Engineering Decisions and Invariants

**INV-001 — one numerical path.** Editors/benchmark loader prepare table input only; execution remains existing facility workflow → central Engineering Calculation API. No direct `calculateFit()` in UI.

**INV-002 — edited topology is not certified.** First topology mutation changes execution to limited local Elements CSV and visibly warns the operator.

**INV-003 — benchmark parity is exact-case-only.** Any table mutation after benchmark load marks the case modified; target stays informational but parity PASS/FAIL claim is disabled.

**INV-004 — authority unchanged.** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Source/import architecture review | PASS | pre-code | inspected current main |
| Pre-code PR changed-file reconciliation | NOT_RUN | — | Stage 3 |
| Core benchmark/editor tests | NOT_RUN | — | Stage 4 |
| UI/controller/static tests | NOT_RUN | — | Stage 5/6 |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | normal checkout required |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Benchmark source values | PASS | controlled EI D2/D4 benchmark JSON |
| FIT method | NOT_APPLICABLE | no numerical method change allowed |
| Edited topology certification | NOT_APPLICABLE | intentional authority downgrade |
| Screening/design authority | NOT_APPLICABLE | remains not authorized |

### Explicitly Not Validated

- Real-browser edit behavior against a genuine five-sheet XLSX in this environment.
- Full current-head release suite until a normal checkout can execute it.

## Known / Deferred Work and Recommended Forward Sequence

1. Complete editable/benchmark UX in this PR.
2. Run full FIT release gate + real XLSX browser path in normal checkout.
3. Keep AIV implementation isolated under #441.
4. Scenario save/version history is deferred; CSV remains the explicit user interchange.

## Next-Agent Handover

Current stopping point: Stage 2.

PR / branch: #442 / `agent/fit-editable-benchmark-inputs`.

Start here: delete pending report, verify report-only diff, then Stage 4.

Do not redo: current source/CSV/benchmark inspection.

Do not assume: local edit preserves XLSX certification or official benchmark parity.

Files currently involved: report rename only.

Known failing checks: none; runtime not run.

Validation still required: all Stage 4-6 tests and full release gate.

Highest-risk item: provenance/benchmark-state downgrade on edits.

Exact next action: Stage 3 changed-file verification.

Required reading: `tabs/vibration-integrity-tab.js`, `tabs/vibration-integrity-view.js`, `converters/vibration/tabular/csv.js`, `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`, CodingRules pinned source.
