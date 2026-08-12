# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only facility vibration pipeline without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR status | OPEN / DRAFT / mergeable at last check |
| Current stage | Stage 18 — IN_PROGRESS: facility FIT benchmark execution through centralized Engineering Calculation batch API |
| Last completed stage | Stage 17 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR EXECUTION VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Facility planner/executor are orchestration only. |
| Validation status | EI/domain focused PASS; Stage 15 parser fixture PASS; Stage 16/17 exact committed Node regressions NOT_RUN in this runtime because no full checkout/raw GitHub DNS. |
| Current blocker | Full repository regression, actual `xlsx@0.18.5` parser regression, full licensed T2.2 page review, independent vibration-engineer approval. |
| Exact next action | Execute only READY `VibrationFacilityFitPlan.v1` requests through `calculateEngineeringBatch()`, retain NOT_READY rows without numerical substitution, return table-oriented facility result with central qualification/evidence unchanged. |

### Handover in 60 Seconds

**FIT state:** stable public ID `VIB.FIV.FLOW_TURBULENCE`; benchmark-only; retained workbook + EI Appendix D D2/D4 reference parity; strict/screening execution blocked centrally.

**Table pipeline:**

```text
Advanced_Analysis 3D EDIT
  -> VibrationTableExchange.v1
  -> VibrationIntegrityDataset.v1
  -> VibrationFacilityFitPlan.v1
  -> Stage 18 central benchmark execution
```

No 3D viewer, canvas, geometry renderer or embedded upstream runtime exists in the vibration product.

**Stage 17 behavior:** only global `FIT_ASSESSMENT_POINT=true` elements enter the plan. READY requires explicit `OUTSIDE_DIAMETER`, `WALL_THICKNESS`, `MAX_UNSUPPORTED_SPAN` enrichment plus phase/density and mass-flow-or-velocity operating data; GAS also requires viscosity. No NPS/schedule lookup/default exists. Multiphase facility planning v1 is aggregate-effective only.

Generated READY requests use the central public ID and `qualificationMode='benchmark'`. If velocity and mass flow are both present, velocity is deliberately selected, mass flow is omitted from the generated request, and that selection is recorded in source trace. Case-specific natural frequency overrides global frequency with explicit provenance.

NOT_READY rows contain missing/invalid evidence and `request=null`.

## Governing Principles

1. Central Engineering Calculation API owns execution; facility code contains no FIT equations.
2. READY means data-complete request only, not engineering acceptance.
3. NOT_READY is not zero LOF and must remain non-numerical.
4. Central benchmark qualification/evidence/result objects are preserved verbatim in facility results.
5. No screening-mode mutation or design-authority mutation is permitted.
6. Batch execution must use the same central kernel as single/Console execution.
7. Table result identity is `(canonicalId, line, caseId)`.
8. No 3D/canvas/viewer dependency.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT kernel / central benchmark path | P0 | VALIDATED | 1–12 | source + EI/hand cases |
| Evidence/candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing evidence |
| Table exchange parser | P0 | IMPLEMENTED | 15 | XLSX/CSV contract |
| Vibration integrity dataset | P0 | IMPLEMENTED | 16 | strict data assembly |
| Facility FIT request plan | P0 | IMPLEMENTED | 17 | READY/NOT_READY plan |
| Facility FIT benchmark executor | P0 | IN_PROGRESS | 18 | current stage |
| Facility table result model | P0 | IN_PROGRESS | 18 | same stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full method authority review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; integration is table-only. |
| DEC-023 | Decision | P0 | ACCEPTED | Canonical ID is element identity; Line is process-case join identity. |
| DEC-024 | Decision | P0 | ACCEPTED | Explicit value/unit/source only; no defaults. |
| DEC-026 | Decision | P0 | ACCEPTED | FIT assessment locations require explicit enrichment marker. |
| DEC-027 | Decision | P0 | ACCEPTED | Incomplete plan rows remain NOT_READY and never emit requests. |
| DEC-028 | Decision | P0 | ACCEPTED | Facility execution batches READY requests through central `calculateEngineeringBatch()` unchanged. |
| DEC-029 | Decision | P0 | ACCEPTED | Facility result rows preserve planner identity/source trace and central result/qualification/evidence separately. |
| RISK-023 | Risk | Critical | ACCEPTED | Hidden geometry/process inference could fabricate executable requests. |
| RISK-024 | Risk | Critical | ACCEPTED | Treating NOT_READY as zero/low risk would create false facility safety signal. |
| RISK-025 | Risk | High | ACCEPTED | Reimplementing batch/kernel behavior in facility layer could diverge from Console/API. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner blocked by account billing/spending. |

## Stage Log

### Stages 1–16

FIT source/kernel, EI/hand qualification evidence, table exchange parser and deterministic integrity dataset implemented. FIT remains benchmark-only. Stage 15 parser fixture passed; Stage 16 exact committed regression remains NOT_RUN because the execution runtime cannot materialize the branch checkout.

### Stage 17 — `VibrationFacilityFitPlan.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/facility/fit-plan.js
converters/vibration/facility/index.js
converters/vibration/index.js
tests/vibration-facility-fit-plan.test.mjs
docs/vibration/FIT-Facility-Plan-v1.md
```

Key behavior:

```text
FIT_ASSESSMENT_POINT=true required
READY -> central benchmark request emitted
NOT_READY -> request=null
no OD/wall derivation from DN/schedule
GAS -> viscosity required
MULTIPHASE -> AGGREGATE_EFFECTIVE only in v1
velocity present -> VELOCITY_OVERRIDE selected and massFlow omitted
case-specific naturalFrequency -> selected over global with provenance
screeningAuthorized=false
engineeringAuthority=NONE
```

Validation:

```text
source-level architecture review           PASS
committed exact Node regression            NOT_RUN
full repository                            NOT_RUN
```

### Stage 18 — Facility FIT benchmark execution — IN_PROGRESS

#### Objective

Execute a `VibrationFacilityFitPlan.v1` without introducing a second calculation path.

#### Execution rule

```text
READY plan items
  -> take item.request unchanged
  -> calculateEngineeringBatch({ requests })
  -> map batch results back by READY-item order

NOT_READY plan items
  -> no central request
  -> preserve as NOT_ASSESSED / DATA_INCOMPLETE row
```

#### Planned facility result schema

```text
VibrationFacilityFitResult.v1
authority = ORCHESTRATION_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
calculationId = VIB.FIV.FLOW_TURBULENCE
qualificationMode = benchmark
rows[]
counts
```

READY/central-success row:

```text
status = CALCULATED_BENCHMARK
canonicalId
line
caseId
standardLof
refinedLof
governingReferenceLof
referenceBand
assessmentStatus
qualification
qualificationCoverage
screeningCandidate
centralResult
sourceTrace
```

READY/central-failure row:

```text
status = CALCULATION_FAILED
errors = centralResult.errors
centralResult
```

Planner NOT_READY row:

```text
status = NOT_ASSESSED_DATA_INCOMPLETE
missing[]
invalid[]
centralResult = null
```

No row may expose a synthetic LOF of zero.

#### Planned files

```text
converters/vibration/facility/fit-execute.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-execute.test.mjs
docs/vibration/FIT-Facility-Result-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- READY request passes unchanged into injected/central batch request;
- result ordering maps exactly to plan READY ordering while final rows retain plan order;
- central successful benchmark outputs/evidence copied without reinterpretation;
- central failure remains CALCULATION_FAILED;
- NOT_READY remains non-numerical and never enters batch;
- empty READY set does not call batch executor unnecessarily;
- central strict/screening mutation is rejected by plan/schema guard;
- executor rejects a plan containing READY request with calculation ID/mode inconsistent with FIT benchmark contract;
- facility authority remains orchestration-only.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 exchange fixture | PASS |
| Stage 16 dataset regression | NOT_RUN |
| Stage 17 plan regression | NOT_RUN |
| Stage 18 executor regression | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 18.
- Use central batch API; do not import/call `calculateFit()` directly in executor.
- Do not alter READY request inputs/units/options.
- Validate plan request ID and benchmark mode before executing.
- NOT_READY rows never enter batch and never receive numeric defaults.
- Preserve central evidence/qualification objects.
- Highest risk: facility table showing a numerical “safe” result for missing or failed data.
