# PR442 — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add loadable EI FIT benchmark cases and editable table inputs to the existing table-first FIT workspace while preserving topology provenance and benchmark-only authority. |
| Source task | Owner: add **Load BENCHMARK**, show input/output for validation, make input tables editable, and load CSV into those editable tables. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| Current HEAD | pre-production Stage 4 opening |
| PR status | OPEN / DRAFT |
| Current stage | **Stage 4 — CORE PRODUCTION BEHAVIOR** |
| Last completed stage | Stage 3 — changed-file verification |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no numerical method/authority changes. |
| Validation status | Stage 1 source review PASS; Stage 3 pre-code reconciliation PASS. |
| Current blocker | None. |
| Exact next action | Implement production-consumed benchmark/table model, then focused pure tests before UI integration. |

## Handover in 60 Seconds

**Now true:** PR #442 is allocated from merged FIT main. Pre-code GitHub diff is exactly `agents/PR442_workreport.md`. Existing workspace loads files but does not expose their table cells for editing. Five controlled EI D2/D4 FIT benchmark cases exist.

**Being worked on:** a benchmark/table model that supplies all five EI cases, editable raw table rows, exact CSV v1 round-trip, topology provenance downgrade on edit, and benchmark modified-state invalidation.

**Unfinished:** UI/controller/CSS integration, tests/docs/release-gate update, real browser/XLSX execution.

**Must not be assumed:** edited XLSX remains certified; edited benchmark inputs remain an official parity case; benchmark parity is engineering acceptance.

**Highest risk:** preserving stronger provenance or benchmark claims after user mutation.

**Exact next action:** implement Stage 4 modules and tests, then record the exact changed files/results before Stage 5.

## Mission and Engineering Intent

### Scope

1. Select/load all five controlled EI D2/D4 FIT cases.
2. Populate the same working tables used for project topology, operating cases and enrichment.
3. Edit cells; add/delete rows.
4. CSV import populates those tables; serialization feeds existing parsers/workflow.
5. Unedited five-sheet XLSX can run as complete exchange; first topology edit converts execution to an explicit local Elements-only override.
6. Untouched benchmark shows published target vs actual parity; any table edit marks benchmark modified and disables parity claim.
7. Focused tests, table UI, CSS and docs.

### Non-goals

- No FIT equations/correlations/applicability/LOF changes.
- No `BENCHMARK_ONLY -> SCREENING` promotion.
- No AIV work (tracked separately in #441).
- No 3D/canvas/model editing or local topology re-certification.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Inspect FIT workspace/import path | P0 | DONE | 1 | current source inspection |
| Inspect strict CSV contracts/serializer | P0 | DONE | 1 | `tabular/csv.js`, operating/enrichment modules |
| Inspect EI benchmark dataset | P0 | DONE | 1 | five cases in controlled JSON |
| Allocate PR / report sync | P0 | DONE | 2 | PR #442 |
| Pre-code changed-file verification | P0 | DONE | 3 | exactly `agents/PR442_workreport.md` |
| Benchmark/table model | P0 | IN_PROGRESS | 4 | current stage |
| UI integration | P0 | NOT_STARTED | 5 | — |
| Tests/docs/release-gate update | P0 | NOT_STARTED | 6 | — |
| Real browser/XLSX execution | P1 | NOT_STARTED | 6 | normal checkout required |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| IMP-001 | Improvement | P0 | ACCEPTED | CSV inputs become visible/editable working table state. | YES |
| IMP-002 | Improvement | P0 | ACCEPTED | Official EI cases become loadable and visibly comparable to actual output. | YES |
| RISK-001 | Risk | HIGH | ACTIVE | Edited certified XLSX could falsely retain certification. | YES |
| RISK-002 | Risk | HIGH | ACTIVE | Edited benchmark data could falsely retain official parity. | YES |
| DEC-001 | Decision | P0 | ACCEPTED | First topology mutation switches execution to `CSV_ELEMENTS_ONLY` local override. | YES |
| DEC-002 | Decision | P0 | ACCEPTED | Operating/enrichment editors round-trip through existing v1 CSV contracts. | YES |
| DEC-003 | Decision | P0 | ACCEPTED | Official parity may be claimed only while benchmark working tables are untouched. | YES |
| DEC-004 | Decision | P0 | ACCEPTED | Use all five existing EI D2/D4 cases; no invented numerical demo case. | YES |
| DEC-005 | Decision | P0 | ACCEPTED | For modified benchmark inputs, keep published target visible only as original-case reference and label parity `NOT_APPLICABLE_MODIFIED_INPUTS`. | YES |

## Stage Roadmap and Stage Execution Log

### Stage 1 — Report initialization + technical findings

Decision: **COMPLETE**.

Findings:
- current UI uploads raw files and runs them; it does not show editable source tables;
- shared strict CSV parser/serializer exists;
- five EI cases contain exact inputs and published standard LOF/reference band;
- facility workflow already supports explicitly accepted limited Elements CSV;
- certified XLSX authority cannot survive local topology mutation.

Validation: source inspection **PASS**.

### Stage 2 — PR allocation + report synchronization

Decision: **COMPLETE**.

- Draft PR #442 created from exact base `243042f...`.
- `PR_PENDING` renamed to `agents/PR442_workreport.md` and deleted.

Validation: GitHub PR metadata **PASS**.

### Stage 3 — Changed-file / repository-state verification

Decision: **COMPLETE**.

GitHub changed-file list before production code:

```text
agents/PR442_workreport.md
```

No unrelated or production file existed in the diff. Validation: **PASS**.

### Stage 4 — Core production behavior

**Current truth:** no production files changed yet.

**Objective:** create immediately consumed pure helpers for editable table state and controlled benchmark table cases.

**Expected scope/files:**
- `tabs/vibration-integrity-input-model.js` or equivalent;
- `tabs/vibration-integrity-benchmarks.js` or equivalent;
- focused pure tests.

**Engineering rationale:** keep mutation/provenance/parity state explicit and separate from numerical execution.

**Planned implementation:**
- expose exact topology/operating/enrichment headers;
- parse strict CSV into editable rows and serialize exact rows back to CSV;
- build rows from a parsed XLSX exchange without claiming edit certification;
- mutate/add/delete rows immutably;
- mark topology dirty independently;
- load five benchmark cases with source ID/target/tolerance and raw table rows;
- produce local benchmark topology/operating/enrichment rows using existing method inputs only.

**Expected behavior:** same edited row state is what readiness/run later consumes.

**Edge cases:** malformed headers, column count mismatch, blank rows, quote/newline cells, duplicate benchmark IDs, topology edit after certified XLSX, benchmark mutation.

**Planned validation:** source JSON parity + CSV round trip + mutation/provenance state tests.

**Known risks:** RISK-001, RISK-002.

Status: IN_PROGRESS.

### Stage 5 — Real workspace integration

Status: NOT_STARTED.

Planned UI: benchmark selector + Load BENCHMARK; three editable tables; add/delete rows; file load populates table; local-topology warning; readiness/run consume working rows; published target/actual panel.

### Stage 6 — Validation/docs/closure

Status: NOT_STARTED.

Planned: static/controller tests, docs update, add focused test to FIT release gate if appropriate, changed-file reconciliation.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR442_workreport.md` | 2 | 4 | Living report / authority decisions / validation | YES | pre-code reconciliation PASS |

## Engineering Decisions and Invariants

**INV-001 — one numerical path.** Editors and benchmark loader prepare table data only. Execution remains existing facility workflow → central Engineering Calculation API. UI must not call `calculateFit()`.

**INV-002 — edited topology is not certified.** Any topology row/cell/add/delete mutation switches the execution input from original XLSX to local `CSV_ELEMENTS_ONLY` and surfaces that downgrade.

**INV-003 — benchmark parity is exact-case-only.** Any working-table mutation after benchmark load sets `modified=true`; parity PASS/FAIL becomes unavailable until the benchmark is reloaded.

**INV-004 — authority unchanged.** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.

**INV-005 — CSV is visible input, not hidden transport.** Uploaded operating/enrichment/Elements CSV is parsed into working rows first; readiness/run serializes those rows back through the existing parser contract.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Existing source/import architecture review | PASS | pre-code | source inspection |
| Pre-code PR changed-file reconciliation | PASS | `5ffecf9...` | one report file |
| Core benchmark/editor tests | NOT_RUN | — | Stage 4 |
| UI/controller/static tests | NOT_RUN | — | Stage 5/6 |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | normal checkout required |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Controlled EI benchmark targets | PASS | existing benchmark JSON |
| FIT numerical method | NOT_APPLICABLE | no numerical change |
| Edited topology certification | NOT_APPLICABLE | intentionally downgraded |
| Screening/design authority | NOT_APPLICABLE | unchanged/not authorized |

### Explicitly Not Validated

- Real browser editing against a genuine five-sheet XLSX in this environment.
- Full current-head release suite until a normal checkout can run it.

## Known / Deferred Work and Recommended Forward Sequence

1. Finish core model and UI in PR #442.
2. Execute full FIT release gate + browser XLSX/CSV interaction in a normal checkout.
3. Keep AIV implementation isolated under issue #441.
4. Scenario persistence/version history remains deferred; CSV is the explicit interchange.

## Next-Agent Handover

Current stopping point: Stage 4 opened; no production code yet.

PR / branch: #442 / `agent/fit-editable-benchmark-inputs`.

Start here: implement the core benchmark/table helpers described above and tests before editing the workspace controller.

Do not redo: source/CSV/benchmark inspection, PR allocation, pre-code reconciliation.

Do not assume: local topology edit preserves certification or benchmark edit preserves published parity.

Files currently involved: report only.

Known failing checks: none; production tests not run.

Validation still required: Stage 4 pure tests, Stage 5 UI tests, Stage 6 release gate/browser.

Highest-risk item: provenance/parity downgrade on edit.

Exact next recommended action: implement `vibration-integrity-input-model` and controlled benchmark case builder with immediate test coverage.

Required reading: `tabs/vibration-integrity-tab.js`, `tabs/vibration-integrity-view.js`, `converters/vibration/tabular/csv.js`, `converters/vibration/exchange/schema.js`, `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`, CodingRules pinned source.
