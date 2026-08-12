# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and table-only Vibration Integrity product without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR / branch | #438 / `agent/fiv-fit-roadmap-foundation` |
| Base | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR state | OPEN / DRAFT / mergeable at last check. |
| Current stage | **Stage 27 — IN_PROGRESS: structured engineering detail UX** |
| Last stage | **Stage 26 — COMPLETE FOR IMPLEMENTATION / SOURCE-BOUNDARY PASS / COMMITTED TESTS NOT_RUN AT CURRENT HEAD** |
| Engineering state | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; screening/design NOT AUTHORIZED. |
| Product boundary | Vibration consumes table exports from Advanced_Analysis 3D EDIT only. No 3D viewer, canvas, geometry rendering, spatial heatmap or embedded model runtime. |

## Handover in 60 Seconds

The branch now contains an end-to-end table-first FIT benchmark product:

```text
3D EDIT table export
 -> VibrationTableExchange.v1
 -> VibrationIntegrityDataset.v1
 -> VibrationFacilityFitPlan.v1
 -> optional VibrationFacilityFitPreflight.v1 (STOP: no calculation)
 -> calculateEngineeringBatch() only on explicit Run
 -> VibrationFacilityFitResult.v1
 -> VibrationFacilityFitRegister.v1
 -> VibrationWorkspaceModel.v1
 -> visible Vibration Integrity table UI / CSV export
```

The UI exposes **Check readiness** and **Run FIT benchmark** as distinct actions. Readiness parses/assembles/plans only; it has no LOF columns and does not import the benchmark execution workflow. The benchmark module is dynamically loaded only after the explicit Run action.

Stage 27 improves the selected-row engineering review experience. The current detail tabs are correct but JSON-heavy. Convert them to structured human-readable views while preserving the exact same workspace data and authority boundary.

## Mission / Engineering Intent

1. Keep stable public ID `VIB.FIV.FLOW_TURBULENCE`; use FIT as canonical terminology.
2. Central Engineering Calculation API is the only numerical FIT execution path.
3. FIT stays benchmark-only until issue #429 qualification gates close.
4. Readiness/preflight must never execute numerical FIT.
5. No hidden engineering defaults, nearest-size inference, unit guessing or project procedure assumptions.
6. Missing/not-ready/failed rows remain explicit; no zero/pass/safe substitution.
7. Evidence strength, completeness, qualification and review-candidate state remain independent dimensions.
8. No universal vibration/facility/risk score and no hidden LOF severity ranking.
9. Canonical ID / Line / Operating Case identity and source provenance remain explicit.
10. No 3D/canvas/viewer integration in vibration.
11. UI may render existing artifacts but must not reproduce equations or authority logic.

## Mission Status

| Work item | Priority | Status | Evidence |
|---|---:|---|---|
| FIT roadmap/source/kernel | P0 | IMPLEMENTED / focused validated | retained workbook + EI D2/D4 + hand cases |
| Central FIT adapter/Console | P0 | IMPLEMENTED | benchmark gate |
| Qualification evidence/candidate metadata | P0 | IMPLEMENTED | non-authorizing |
| Table exchange/dataset | P0 | IMPLEMENTED | Stages 15–16 |
| Facility plan/execution/register | P0 | IMPLEMENTED | Stages 17–19 |
| Parsed/tabular workflows | P0 | IMPLEMENTED | Stages 20–22 |
| CSV templates/register export | P0 | FOCUSED PASS | Stage 23 |
| Workspace read model | P0 | FOCUSED PASS 6/6 | Stage 24 |
| Visible Vibration Integrity tab | P0 | IMPLEMENTED / source-reviewed | Stage 25 |
| Non-numerical readiness preflight | P0 | IMPLEMENTED / source-boundary PASS | Stage 26 |
| Structured detail UX | P1 | IN_PROGRESS | Stage 27 |
| Full current-head regression | P0 | NOT_RUN | latest UI/preflight delta needs rerun |
| Full method/project authority review | P0 | BLOCKED | governing source + independent engineer |
| Screening authority | P0 | BLOCKED | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public FIT ID retained. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exercised points/slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase data require explicit/unambiguous resolution. |
| DEC-018 | Decision | P0 | ACCEPTED | Evidence coverage cannot grant engineering authority. |
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Five-sheet XLSX is current complete exchange; CSV is Elements-only limited input. |
| DEC-023 | Decision | P0 | ACCEPTED | Canonical ID / Line / Case are explicit v1 identities. |
| DEC-024 | Decision | P0 | ACCEPTED | Process quantities require explicit value/unit/source. |
| DEC-028 | Decision | P0 | ACCEPTED | READY requests execute unchanged through central batch API. |
| DEC-030 | Decision | P0 | ACCEPTED | Register/workspace are read projections only. |
| DEC-037 | Decision | P0 | ACCEPTED | Templates are header-only by default; sample rows are `DO_NOT_USE`. |
| DEC-038 | Decision | P0 | ACCEPTED | Workspace is calculation-free; numerical LOF ranking sort is rejected. |
| DEC-039 | Decision | P0 | ACCEPTED | Visible tab calls orchestration/read APIs only. |
| DEC-040 | Decision | P0 | ACCEPTED | Preflight stops at dataset + plan; no numerical execution. |
| DEC-041 | Decision | P0 | ACCEPTED | Benchmark execution module is lazy-loaded only on explicit Run action. |
| DEC-042 | Decision | P1 | ACCEPTED | Detail UX renders exact data structurally; it does not reinterpret or summarize engineering authority into a score. |
| RISK-001 | Risk | Critical | MITIGATED | Unqualified empirical method remains benchmark gated. |
| RISK-020 | Risk | High | ACCEPTED | Upstream XLSX semantic hash is declared but not reverified downstream in v1. |
| RISK-024 | Risk | Critical | MITIGATED | Incomplete/failed rows remain explicit and numerically blank. |
| RISK-032 | Risk | High | MITIGATED | UI visibly distinguishes complete XLSX and limited Elements CSV. |
| RISK-033 | Risk | High | MITIGATED | Readiness preview exposes missing/invalid fields before Run. |
| RISK-034 | Risk | Medium | OPEN | Raw JSON detail can obscure engineering provenance/evidence relationships; Stage 27 improves reviewability. |
| DEBT-001 | Debt | P1 | DEFERRED | Consolidate exchange private CSV tokenizer after real XLSX suite can run. |
| QST-001 | Question | P0 | BLOCKED | Complete licensed/adopted T2.2/project review. |
| QST-003 | Question | P0 | FAIL_CLOSED | Manual OD family gap remains unresolved by authority. |
| ISS-009 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Advanced range corrected to `1 < fn <= 3 Hz`. |
| ISS-010 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Deterministic span support category replaces inconsistent selector. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | GitHub Actions runner allocation blocked by billing/spending condition. |

## Stage History

### Stages 1–14 — FIT engineering benchmark vertical

Roadmap, controlled source inventory/extractor, physical context, workbook-reference kernel, central adapter, EI Appendix D D2/D4 source-backed examples, independent hand benchmarks, multiphase ambiguity hardening, evidence coverage and non-authorizing screening-candidate metadata. Focused EI/domain execution reached 12/12 PASS. Screening remains blocked.

### Stages 15–23 — table exchange and facility workflow

Implemented `VibrationTableExchange.v1`, `VibrationIntegrityDataset.v1`, facility plan/execution/register, parsed and tabular workflow façades, strict process/enrichment CSV contracts, deterministic templates and register export. Current complete upstream exchange is five-sheet XLSX; current CSV is explicitly Elements-only/limited.

Stage 23 dependency-free serializer/template/register-export fixture: PASS.

### Stage 24 — `VibrationWorkspaceModel.v1` — COMPLETE / FOCUSED PASS 6/6

Calculation-free read model with deterministic presentation filters/sorts, exact selected-row joins, summary dimensions, authority mutation rejection and no LOF sorting. Split into small consumed `query.js`, `detail.js`, `model.js`. Focused isolated execution PASS 6/6.

### Stage 25 — visible `Vibration Integrity` tab — COMPLETE FOR IMPLEMENTATION

Engineering navigation now includes `Vibration Integrity`. The tab provides table imports, safe templates, benchmark run, facility table/filtering, detail tabs and register export. It shows a permanent `BENCHMARK ONLY / NOT SCREENING / DESIGN AUTHORITY` banner, has no qualification selector, contains no direct engineering calculation call, and has no canvas/3D path.

Source-level controller/view/navigation review: PASS. Committed browser/static test: current-head NOT_RUN.

### Stage 26 — `VibrationFacilityFitPreflight.v1` — COMPLETE FOR IMPLEMENTATION

Delivered:

```text
converters/vibration/facility/fit-preflight.js
converters/vibration/facility/fit-tables.js
converters/vibration/facility/fit-preflight-tabular.js
converters/vibration/facility/fit-workflow-tabular.js (execution-only refactor)
converters/vibration/facility/index.js
tabs/vibration-integrity-tab.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity.css
tests/vibration-facility-fit-preflight.test.mjs
tests/vibration-integrity-tab-static.test.mjs
docs/vibration/FIT-Facility-Preflight-v1.md
```

Preflight core:

```text
exchange + operating cases + enrichment
 -> assembleVibrationIntegrityDataset()
 -> buildVibrationFacilityFitPlan()
 -> STOP
```

Result:

```text
schema = VibrationFacilityFitPreflight.v1
authority = PREFLIGHT_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
qualificationMode = benchmark
rows = READY / NOT_READY + missing/invalid/reasons/requestPrepared/sourceTrace
```

Authority/load separation:

- `fit-preflight.js` does not import `fit-execute`, `fit-workflow`, `calculateFit`, `calculateEngineering` or batch execution;
- shared table parsing lives in `fit-tables.js`;
- tabular readiness lives in `fit-preflight-tabular.js`;
- full benchmark orchestration remains in `fit-workflow-tabular.js`;
- visible tab statically loads preflight, but dynamically imports full benchmark workflow only after explicit Run.

Visible readiness panel:

```text
Topology integrity
Assessment points
Plan rows
Ready
Not ready
Line | Case | Canonical ID | Readiness | Missing | Invalid | Reasons | Request
```

The panel explicitly states no FIT calculation is executed and contains no LOF/reference-result columns.

Validation:

```text
source boundary / dependency inspection            PASS
preflight authority/options review                 PASS
visible no-LOF readiness contract review           PASS
lazy benchmark import review                       PASS
committed preflight test                           NOT_RUN at current head
committed updated UI static test                   NOT_RUN at current head
full current-head repository                       NOT_RUN
```

## Validation Ledger / Reconciliation

### Prior full-checkout evidence

The current PR description records a prior complete-checkout validation point with:

```text
focused FIT/vibration/engineering suite: 67 / 67 PASS
full npm test:                            235 / 235 PASS
```

It also records `npm run build` failing on `UNBOUND_IDENTIFIER insertText`, reproduced on clean `main`, and GitHub Actions blocked before runner allocation by billing/spending.

Those results are retained as **prior validation evidence**. They do not validate the later Stage 24–26 workspace/UI/preflight delta and have not been independently rerun in the current execution runtime.

### Current-head status

| Check | Status |
|---|---|
| EI/domain qualification evidence | PASS from prior focused execution |
| EI D2/D4 example parity | PASS from prior focused execution |
| Stage 23 dependency-free export fixture | PASS |
| Stage 24 workspace isolated fixture | PASS 6/6 |
| Stage 25 source/static inspection | PASS |
| Stage 26 source/dependency inspection | PASS |
| Stage 25–26 committed tests at current head | NOT_RUN |
| Full current-head `npm test` | NOT_RUN |
| Real current-head XLSX path | NOT_RUN |
| Build audit | PRIOR BASELINE FAILURE documented; current head not rerun |
| GitHub Actions | BLOCKED_EXTERNAL |
| Screening/design authority | NOT_AUTHORIZED |

## Changed-File Ledger / Scope

After Stage 26, GitHub reports **88 changed paths**. All are explained by the assignment: benchmark datasets, FIT engineering API/domain work, table exchange/dataset/facility/tabular/workspace product modules, docs, focused tests, Console benchmark gating, Engineering navigation and the Vibration Integrity tab.

No `.github/workflows/*`, no vibration 3D/canvas/viewer code, and no numerical AIV/SBC/cavitation/surge/slug implementation are included.

## Stage 27 — structured engineering detail UX — IN_PROGRESS

### Objective

Replace raw JSON-heavy selected-row rendering with structured review tables while preserving exactly the existing `VibrationWorkspaceModel.v1` content.

Planned detail views:

```text
Summary
  identity / completeness / LOF reference values / qualification
Inputs
  field | value | unit | source context
Case
  operating-case provenance + quantity value/unit table
  enrichment property/value/unit/source/status/reviewer table
Evidence
  qualification state / design authority
  phase/correlation/advanced evidence strength
  evidence IDs and screening-candidate metadata
Source
  assessment-point / operating-case / geometry source trace
Diagnostics
  missing / invalid / error codes / central errors
```

Rules:

- render only data already present in workspace detail;
- no new calculation, inference or engineering summary score;
- keep benchmark/reference wording explicit;
- null stays visibly unavailable;
- no pass/safe semantics;
- HTML escape all imported/source data;
- move detail rendering into a dedicated small view module if needed to keep module-size discipline.

Planned files:

```text
tabs/vibration-integrity-detail-view.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity.css
tests/vibration-integrity-detail-view.test.mjs
docs/vibration/VibrationIntegrityTab-v1.md
agents/PR438_workreport.md
```

## Known / Deferred Work

- rerun current-head full repository and real XLSX tests in normal checkout;
- rerun build audit and keep baseline/PR delta separate;
- complete licensed/adopted EI/project method review and independent engineer approval;
- resolve manual OD family gap by authority, not interpolation;
- DEBT-001 exchange CSV tokenizer consolidation after real exchange suite is available;
- AIV/FIP/SBC/cavitation/surge/slug remain future independent qualification tracks.

## Forward Sequence

1. Stage 27 structured detail UX.
2. Reconcile PR title/body and changed-file ledger.
3. Current-head full checkout test + browser/XLSX validation when environment allows.
4. Engineering review package for issue #429.
5. Only after authority approval consider bounded `SCREENING` promotion.

## Next-Agent Handover

- Current stage: Stage 27.
- Do not touch numerical FIT logic.
- Use only `workspace.detail` data; no re-resolution.
- Prefer tables/definition lists over raw JSON for engineering review.
- Keep evidence strength and qualification distinct.
- Keep imported values escaped and null/missing explicit.
- No 3D/canvas/viewer, no risk score, no pass/safe.
