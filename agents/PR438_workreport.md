# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only facility vibration pipeline without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 19 | `e4a2da92bb5bc1dec03fb7517167a9dec4aa48d6` |
| PR status | OPEN / DRAFT / mergeable; 52 changed paths at last reconciliation |
| Current stage | Stage 19 — IN_PROGRESS: table-first facility FIT register projection |
| Last completed stage | Stage 18 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR EXECUTION VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Facility result is orchestration-only. |
| Validation status | EI/domain focused PASS; parser fixture PASS; later exact committed regressions NOT_RUN because this runtime lacks a complete checkout/raw GitHub access. |
| Current blocker | Full repository regression, actual `xlsx@0.18.5` parser test, full licensed T2.2 page review and independent vibration-engineer approval. |
| Exact next action | Build a pure facility register projection from `VibrationFacilityFitResult.v1` for table UI/API consumption: status, completeness, reference bands/evidence; no authority reinterpretation. |

### Handover in 60 Seconds

**End-to-end table-first path now implemented:**

```text
Advanced_Analysis 3D EDIT
  -> VibrationTableExchange.v1
  -> VibrationIntegrityDataset.v1
  -> VibrationFacilityFitPlan.v1
  -> calculateEngineeringBatch()
  -> VibrationFacilityFitResult.v1
```

No 3D viewer/canvas/geometry runtime exists in vibration.

**Stage 18 executor:** batches only READY requests through the centralized Engineering Calculation engine. NOT_READY plan items never enter the central batch and become `NOT_ASSESSED_DATA_INCOMPLETE` with no numerical LOF properties. Central calculation failures become `CALCULATION_FAILED`, also with no synthetic LOF. Successful rows retain central immutable result, qualification, evidence coverage and screening-candidate metadata.

**Authority invariants:**

```text
FIT qualification = BENCHMARK_ONLY
facility authority = ORCHESTRATION_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
```

**Current PR scope:** 52 paths at last reconciliation, including FIT method/evidence, exchange, dataset, facility plan/execution, docs and regressions.

## Governing Principles

1. Central Engineering Calculation API is the only FIT numerical execution path.
2. Table pipeline layers never duplicate empirical equations.
3. NOT_READY / NOT_ASSESSED is never represented as LOF zero.
4. CALCULATION_FAILED is never represented as low risk.
5. Facility projections may summarize central results but must retain identity/evidence references and never upgrade authority.
6. UI-facing tables should distinguish data completeness, central calculation status, reference LOF band and qualification state.
7. No universal vibration score; later mechanisms remain independent columns/results.
8. No 3D/canvas/viewer integration.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT kernel / central benchmark path | P0 | VALIDATED | 1–12 | retained + EI/hand evidence |
| Evidence/candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing metadata |
| Table exchange parser | P0 | IMPLEMENTED | 15 | XLSX/CSV contract |
| Vibration integrity dataset | P0 | IMPLEMENTED | 16 | strict data assembly |
| Facility FIT plan | P0 | IMPLEMENTED | 17 | READY/NOT_READY central requests |
| Facility central benchmark executor | P0 | IMPLEMENTED | 18 | same central batch kernel |
| Facility FIT register projection | P0 | IN_PROGRESS | 19 | current stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full method authority review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-021 | Decision | P0 | ACCEPTED | Integration is table-only; Advanced_Analysis owns model editing. |
| DEC-024 | Decision | P0 | ACCEPTED | Explicit value/unit/source only; no defaults. |
| DEC-026 | Decision | P0 | ACCEPTED | Explicit FIT assessment marker required. |
| DEC-028 | Decision | P0 | ACCEPTED | Facility READY requests execute unchanged through central batch API. |
| DEC-029 | Decision | P0 | ACCEPTED | Facility rows preserve central result/evidence separately from convenience fields. |
| DEC-030 | Decision | P0 | ACCEPTED | Facility register is a read projection, not an engineering authority or result kernel. |
| RISK-024 | Risk | Critical | ACCEPTED | NOT_ASSESSED must never look safe. |
| RISK-025 | Risk | High | ACCEPTED | Facility execution must not diverge from Console/single kernel. |
| RISK-026 | Risk | High | ACCEPTED | Table projection could hide benchmark-only status or source completeness. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions billing/spending prevents runner allocation. |

## Stage Log

### Stages 1–17

FIT source/kernel/evidence, table exchange, dataset assembly and request planning implemented. FIT remains benchmark-only. The plan uses explicit FIT assessment points and no geometry/process defaults.

### Stage 18 — `VibrationFacilityFitResult.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/facility/fit-execute.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-execute.test.mjs
docs/vibration/FIT-Facility-Result-v1.md
```

Execution contract:

```text
READY -> calculateEngineeringBatch() using request unchanged
NOT_READY -> NOT_ASSESSED_DATA_INCOMPLETE, centralResult=null
central failure -> CALCULATION_FAILED
central success -> CALCULATED_BENCHMARK + central result/evidence
```

Plan/request guards reject non-FIT IDs, non-benchmark qualification mode, and executable requests attached to non-READY rows.

Facility result contains counts for total/plannedReady/calculated/calculationFailed/notAssessed and a separate central batch summary.

`complete=true` means orchestration/data completeness only; it is not a safety/engineering conclusion.

Validation:

```text
source-level central-kernel review        PASS
committed executor regression             NOT_RUN
full repository                           NOT_RUN
```

### Stage 19 — Facility FIT register projection — IN_PROGRESS

#### Objective

Create a pure read model for table UI/API consumption from `VibrationFacilityFitResult.v1` without changing any result semantics.

#### Planned row fields

```text
canonicalId
line
caseId
status
completenessStatus
standardLof
refinedLof
governingReferenceLof
referenceBand
assessmentStatus
qualificationState
engineeringAuthority
screeningAuthorized
evidenceStrength
screeningCandidateStatus
sourceStatus
```

Absent numerical values remain `null` in the read projection only and must be accompanied by non-calculated status; source result remains authoritative.

#### Planned facility summary

```text
totalRows
calculatedRows
notAssessedRows
failedRows
referenceBandCounts
candidateForEngineeringReviewCount
benchmarkOnlyCount
```

No “safe count,” no universal score and no facility PASS/FAIL.

#### Planned files

```text
converters/vibration/facility/fit-register.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-register.test.mjs
docs/vibration/FIT-Facility-Register-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- CALCULATED row projects benchmark/evidence values correctly;
- NOT_ASSESSED projects null numerical values plus `DATA_INCOMPLETE` completeness;
- CALCULATION_FAILED projects null numerical values plus `CALCULATION_FAILED` completeness;
- benchmark-only qualification remains visible;
- evidence strength is taken from central qualification coverage, not recomputed;
- candidate count uses central screeningCandidate metadata, not LOF heuristic;
- no pass/fail/universal score field exists;
- deterministic row order preserved.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 exchange fixture | PASS |
| Stage 16 dataset regression | NOT_RUN |
| Stage 17 plan regression | NOT_RUN |
| Stage 18 executor regression | NOT_RUN |
| Stage 19 register regression | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 19.
- Build a pure read projection only; do not call calculation APIs.
- Keep benchmark-only/evidence status visible on every calculated row.
- Null is acceptable only as display/read-model absence paired with non-calculated status; never reinterpret null as zero.
- Do not create facility pass/fail or a generic vibration score.
- Preserve row ordering and central result linkage.
- Highest risk: a polished table hiding incomplete or unqualified engineering state.
