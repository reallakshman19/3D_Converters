# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only facility vibration workflow without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR status | OPEN / DRAFT / mergeable at last check |
| Current stage | Stage 20 — IN_PROGRESS: single API-first facility FIT benchmark workflow composition |
| Last completed stage | Stage 19 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR EXECUTION VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. All facility layers are data/orchestration/read-model only. |
| Validation status | EI/domain focused PASS; table parser fixture PASS; exact later committed regressions NOT_RUN because no full checkout/raw GitHub DNS. |
| Current blocker | Full repository regression, real `xlsx@0.18.5` parser regression, full licensed T2.2 page review, independent vibration-engineer approval. |
| Exact next action | Add one workflow API that composes already-separated stages and returns dataset, plan, result and register without swallowing intermediate evidence/errors or changing authority. |

### Handover in 60 Seconds

Implemented table-first layers:

```text
VibrationTableExchange.v1
VibrationIntegrityDataset.v1
VibrationFacilityFitPlan.v1
VibrationFacilityFitResult.v1
VibrationFacilityFitRegister.v1
```

The numerical path remains:

```text
READY facility request
  -> calculateEngineeringBatch()
  -> VIB.FIV.FLOW_TURBULENCE central adapter
  -> same FIT domain kernel as Console/single execution
```

`NOT_READY` never enters the central engine. Central failures never become zero LOF. The register has no pass/fail/universal risk score.

Stage 19 register exposes explicit completeness, benchmark qualification, central evidence strengths and candidate-review metadata. It preserves row order and never re-ranks by LOF.

## Governing Principles

1. Workflow composition may connect stages but must not merge their authority semantics.
2. Every intermediate artifact remains available for audit/evidence.
3. One high-level API must use the same lower-level APIs; no duplicate transformation/calculation logic.
4. Benchmark mode is fixed; screening mode remains unavailable.
5. No universal facility pass/fail or vibration score.
6. No 3D/canvas/viewer integration.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT kernel / central benchmark path | P0 | VALIDATED | 1–12 | retained + EI/hand evidence |
| Evidence/candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing metadata |
| Table exchange parser | P0 | IMPLEMENTED | 15 | XLSX/CSV contract |
| Vibration integrity dataset | P0 | IMPLEMENTED | 16 | strict data assembly |
| Facility FIT plan | P0 | IMPLEMENTED | 17 | READY/NOT_READY requests |
| Facility FIT benchmark executor | P0 | IMPLEMENTED | 18 | central batch API |
| Facility FIT register | P0 | IMPLEMENTED | 19 | table read model |
| Facility FIT workflow API | P0 | IN_PROGRESS | 20 | current stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full method authority review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-021 | Decision | P0 | ACCEPTED | Table-only integration; Advanced_Analysis owns model editing. |
| DEC-028 | Decision | P0 | ACCEPTED | Facility calculations use central batch API unchanged. |
| DEC-030 | Decision | P0 | ACCEPTED | Facility register is read projection only. |
| DEC-031 | Decision | P0 | ACCEPTED | High-level workflow returns all intermediate artifacts rather than hiding evidence stages. |
| RISK-024 | Risk | Critical | ACCEPTED | Missing/failed rows must never appear safe. |
| RISK-026 | Risk | High | ACCEPTED | Read projection must keep benchmark/incomplete state visible. |
| RISK-027 | Risk | High | ACCEPTED | Convenience workflow could otherwise become a parallel hidden business-logic path. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | GitHub Actions billing/spending blocks runner allocation. |

## Stage Log

### Stages 1–18

FIT source/kernel/evidence plus table exchange, dataset, facility plan and central benchmark execution implemented. No screening authority.

### Stage 19 — `VibrationFacilityFitRegister.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/facility/fit-register.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-register.test.mjs
docs/vibration/FIT-Facility-Register-v1.md
```

Register rows expose:

```text
identity/status/completeness
standard/refined/governing reference LOF
reference band
benchmark qualification/source authority
phase/correlation/advanced evidence strength
candidate-for-engineering-review metadata
missing/invalid/error codes
high-signal source labels
```

Non-calculated rows use `null` only as read-model absence paired with `DATA_INCOMPLETE` or `CALCULATION_FAILED`; no numerical default exists.

Summary contains counts and reference-band distribution, but no passCount/safeCount/riskScore/universal score.

Validation:

```text
source-level projection review       PASS
committed register regression        NOT_RUN
full repository                      NOT_RUN
```

### Stage 20 — `VibrationFacilityFitWorkflow.v1` — IN_PROGRESS

#### Objective

Expose one API for table-first consumers while preserving all stage artifacts:

```text
runVibrationFacilityFitBenchmark({ exchange, operatingCases, enrichment }, options)
```

#### Required composition

```text
assembleVibrationIntegrityDataset()
buildVibrationFacilityFitPlan()
executeVibrationFacilityFitPlan()
buildVibrationFacilityFitRegister()
```

No transformation/calculation logic may be duplicated in the workflow function.

#### Result

```text
schema = VibrationFacilityFitWorkflow.v1
authority = WORKFLOW_ORCHESTRATION_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
qualificationMode = benchmark

dataset
plan
result
register
summary = register.summary
warnings grouped by stage
```

#### Options

Only orchestration/data-ingestion options are allowed in v1:

```text
allowLimitedExchange = false by default
```

No qualificationMode option is accepted; benchmark mode is fixed by the FIT plan.

#### Planned files

```text
converters/vibration/facility/fit-workflow.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-workflow.test.mjs
docs/vibration/FIT-Facility-Workflow-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- workflow intermediate artifacts match direct lower-level calls;
- complete dataset produces calculated register row through real central engine;
- missing span produces NOT_ASSESSED row without central numeric result;
- limited exchange rejected by default and accepted only by explicit option;
- workflow has no qualificationMode override;
- screening/design authority remains false;
- warnings remain grouped by originating stage.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 parser fixture | PASS |
| Stage 16–19 exact committed regressions | NOT_RUN |
| Stage 20 workflow regression | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 20.
- Compose existing public functions only; no duplicate input resolution or FIT equations.
- Return all intermediates for auditability.
- Do not add qualificationMode option; benchmark is fixed.
- Preserve limited-exchange opt-in semantics from dataset assembly.
- No UI code in this stage.
- Highest risk: high-level convenience API obscuring incomplete data or evidence boundaries.
