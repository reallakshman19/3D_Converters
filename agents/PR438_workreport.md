# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and table-only Vibration Integrity product without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR / branch | #438 / `agent/fiv-fit-roadmap-foundation` |
| Base | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR state | OPEN / DRAFT / mergeable at last check. |
| Current stage | **Stage 26 — IN_PROGRESS: non-numerical tabular import/readiness preflight** |
| Last stage | **Stage 25 — COMPLETE FOR IMPLEMENTATION / STATIC SOURCE REVIEW PASS / COMMITTED UI TEST NOT_RUN** |
| Engineering state | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; engineering authority `NONE`; screening/design NOT AUTHORIZED. |
| Product boundary | Table data from Advanced_Analysis 3D EDIT only; no 3D/canvas/viewer in vibration. |
| Current blockers | Full repo regression, real XLSX branch test, complete licensed/adopted T2.2 review, independent vibration-engineer approval, external Actions billing/spending gate. |

## Handover in 60 Seconds

The branch now includes a visible **Vibration Integrity** Engineering tab on top of the full table-first backend:

```text
3D EDIT export
 -> exchange
 -> dataset
 -> FIT readiness plan
 -> central benchmark calculation
 -> facility result/register
 -> workspace model
 -> visible table UI / CSV export
```

The tab imports XLSX/limited Elements CSV, operating cases and enrichment CSV; downloads strict templates; runs only `runVibrationFacilityFitBenchmarkFromTables()`; builds `VibrationWorkspaceModel.v1`; and exports the existing register. It does not call `calculateFit()` or central calculation functions directly.

Stage 26 adds a **Check readiness** path that parses/assembles/plans without executing any numerical FIT request. Operators should be able to see import integrity, assessment-point count, READY/NOT_READY rows, missing/invalid inputs and source identity before choosing Run FIT benchmark.

## Non-Negotiable Invariants

1. Central Engineering Calculation API is the only numerical FIT execution path.
2. FIT remains benchmark-only until issue #429 qualification closes.
3. Preflight/readiness never executes a calculator.
4. Missing/failed/not-ready states never become zero, pass or safe.
5. No hidden engineering defaults, nearest-size guesses or UI equations.
6. `Canonical ID`, Line and Operating Case identity remain explicit.
7. Evidence, completeness, qualification and review-candidate state remain separate.
8. No universal vibration/facility score or hidden LOF ranking.
9. Vibration is table-only; no 3D/canvas/viewer.
10. UI consumes public vibration APIs and preserves provenance/integrity status.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| FIT roadmap/source/kernel | IMPLEMENTED / focused validated | workbook + EI D2/D4 + hand cases |
| Central adapter/Console | IMPLEMENTED | benchmark gate |
| Evidence/candidate metadata | IMPLEMENTED | non-authorizing |
| Exchange/dataset/facility workflow | IMPLEMENTED | Stages 15–22 |
| CSV templates/register export | FOCUSED PASS | Stage 23 |
| Workspace read model | FOCUSED PASS 6/6 | Stage 24 |
| Visible Vibration Integrity tab | IMPLEMENTED | Stage 25 static source review |
| Non-numerical readiness preflight | IN_PROGRESS | Stage 26 |
| Full repository regression | NOT_RUN / BLOCKED | external environment |
| Method/project authority review | BLOCKED | governing source + reviewer |
| Screening authority | BLOCKED | #429 |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Stable FIT public ID retained. |
| DEC-012 | Decision | ACCEPTED | EI worked examples qualify exercised slices only. |
| DEC-017 | Decision | ACCEPTED | Multiphase ambiguity fails closed unless resolved explicitly. |
| DEC-018 | Decision | ACCEPTED | Evidence coverage cannot grant engineering authority. |
| DEC-021 | Decision | ACCEPTED | Table-only Advanced_Analysis integration. |
| DEC-022 | Decision | ACCEPTED | Five-sheet XLSX is complete current exchange; CSV is limited Elements-only. |
| DEC-023 | Decision | ACCEPTED | Canonical ID / Line / Case identities remain explicit. |
| DEC-024 | Decision | ACCEPTED | Process values require value/unit/source. |
| DEC-028 | Decision | ACCEPTED | READY requests go unchanged to central batch execution. |
| DEC-030 | Decision | ACCEPTED | Register/workspace are read projections. |
| DEC-037 | Decision | ACCEPTED | CSV templates are header-only by default; examples are DO_NOT_USE. |
| DEC-038 | Decision | ACCEPTED | Workspace model is calculation-free and rejects LOF ranking/authority mutation. |
| DEC-039 | Decision | ACCEPTED | Visible tab contains no engineering kernel; public orchestration only. |
| DEC-040 | Decision | ACCEPTED | Readiness preflight must stop at parsed tables -> dataset -> plan and never execute central batch. |
| RISK-001 | Risk | MITIGATED | Unqualified empirical method remains benchmark gated. |
| RISK-024 | Risk | MITIGATED | Missing/failed rows remain explicit and blank numerically. |
| RISK-032 | Risk | MITIGATED | UI explicitly labels limited CSV and complete XLSX provenance distinction. |
| RISK-033 | Risk | OPEN | Operators may run calculations before noticing missing assessment data; preflight addresses this explicitly. |
| DEBT-001 | Debt | DEFERRED | Shared/exchange CSV tokenizer consolidation after real XLSX suite is runnable. |
| QST-001 | Question | BLOCKED | Full licensed/adopted T2.2/project review. |
| QST-003 | Question | FAIL_CLOSED | Manual OD family gap remains unresolved. |
| ISS-009 | Defect | SOFTWARE_RESOLVED / AUTHORITY_OPEN | `1 < fn <= 3 Hz` enforced. |
| ISS-010 | Defect | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Deterministic span support category. |
| ISS-011 | External CI | ROOT_CAUSE_CONFIRMED | Actions cannot allocate runner due billing/spending condition. |

## Stage History

### Stages 1–14 — FIT benchmark engineering vertical

Roadmap, source extraction, workbook reference kernel, central adapter, EI Appendix D D2/D4 examples, hand benchmarks, multiphase ambiguity handling, evidence coverage and non-authorizing candidate metadata. Focused EI/domain tests reached 12/12 PASS; screening remains blocked.

### Stages 15–23 — table data and facility workflow

Implemented exchange, dataset, plan, central execution, register, parsed/tabular workflows, strict process/enrichment CSV inputs, safe templates and register export. Current complete source is five-sheet XLSX; current CSV stays limited Elements-only.

Stage 23 focused dependency-free checks PASS for serializer/templates/register export.

### Stage 24 — `VibrationWorkspaceModel.v1` — COMPLETE / FOCUSED PASS 6/6

Calculation-free read model with deterministic non-numerical presentation sort/filter, exact detail joins, summary dimensions and authority/ranking rejection. Split into small consumed `query.js`, `detail.js` and `model.js` modules. Focused isolated execution PASS 6/6.

### Stage 25 — visible `Vibration Integrity` tab — COMPLETE FOR IMPLEMENTATION

Delivered:

```text
core/engineering-tabs-extension.js
tabs/vibration-integrity-tab.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity.css
tests/vibration-integrity-tab-static.test.mjs
docs/vibration/VibrationIntegrityTab-v1.md
```

Visible capability:

```text
Engineering -> Vibration Integrity
3D EDIT XLSX / limited CSV input
Operating-case CSV
Vibration-enrichment CSV
safe template downloads
Run FIT benchmark
facility summary + filters + table
selected row Summary / Inputs / Case / Evidence / Source / Diagnostics
register CSV export
```

Authority/product behavior:

- permanent `BENCHMARK ONLY / NOT SCREENING / DESIGN AUTHORITY` banner;
- no qualification-mode selector;
- no direct `calculateFit()` / `calculateEngineering()` / `calculateEngineeringBatch()` call in tab controller;
- no canvas/3D viewer/model renderer;
- no pass/safe/facility score/risk score;
- incomplete numerical cells remain blank-state markers;
- limited CSV warning names the missing provenance sheets;
- header does not call limited input “certified”;
- async file reads guard against tab teardown.

Validation status:

```text
source-level API/authority inspection         PASS
navigation registration inspection           PASS
provenance wording review                    PASS
teardown/file-read review                     PASS
committed static/view test                    NOT_RUN
browser integration                           NOT_RUN
full repository                               NOT_RUN
```

### Stage 26 — `VibrationFacilityFitPreflight.v1` — IN_PROGRESS

#### Objective

Provide a non-numerical readiness workflow and visible UI preview before benchmark execution.

Planned public flow:

```text
parse topology table
parse operating-case CSV
parse enrichment CSV
assemble VibrationIntegrityDataset.v1
build VibrationFacilityFitPlan.v1
STOP — no central calculation
```

Planned output:

```text
schema = VibrationFacilityFitPreflight.v1
authority = PREFLIGHT_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
qualificationMode = benchmark
imports
dataset
plan
rows[]
counts
warnings
```

Preflight rows preserve:

```text
Canonical ID
Line
Operating Case
READY / NOT_READY
missing[]
invalid[]
reasons[]
requestPrepared (boolean only)
sourceTrace
```

The preflight table must not display LOF because none has been calculated.

#### UI integration

Add **Check readiness** beside Run FIT benchmark. Before numerical execution the tab can show:

```text
Topology integrity
Assessment points
Plan rows
Ready
Not ready
Missing/invalid fields by row
```

Running FIT remains a separate explicit action.

#### Planned files

```text
converters/vibration/facility/fit-workflow-tabular.js
converters/vibration/facility/index.js
tabs/vibration-integrity-tab.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity.css
tests/vibration-facility-fit-preflight.test.mjs
tests/vibration-integrity-tab-static.test.mjs
docs/vibration/FIT-Facility-Preflight-v1.md
agents/PR438_workreport.md
```

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| EI D2/D4 | PASS |
| Stage 23 CSV/export fixture | PASS |
| Stage 24 workspace fixture | PASS 6/6 |
| Stage 25 source/static inspection | PASS |
| Stage 25 committed test/browser | NOT_RUN |
| Stage 26 preflight | NOT_RUN |
| Real XLSX branch test | NOT_RUN |
| Full repository | NOT_RUN |
| GitHub Actions | BLOCKED_EXTERNAL |
| Screening authority | NOT_AUTHORIZED |

## Changed-File / Scope Guard

All current paths remain inside the FIT/table-vibration assignment. No workflow files, 3D/canvas/viewer files or numerical AIV/SBC/cavitation/surge/slug implementation are in scope.

## Next-Agent Handover

- Current stage: Stage 26.
- Refactor table parsing in `fit-workflow-tabular.js` into a reusable parse/preflight path rather than duplicating parsers.
- Preflight stops before `executeVibrationFacilityFitPlan()` / central batch.
- UI must visibly distinguish Check readiness from Run benchmark.
- Readiness table has no LOF columns.
- Keep XLSX vs limited CSV integrity status visible.
- Close Stage 26 with focused no-execution tests, then reconcile PR and refresh stale PR body/title.
