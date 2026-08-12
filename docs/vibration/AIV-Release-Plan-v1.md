# AIV Release Plan v1

## Purpose

This document defines how `VIB.AIV.ACOUSTIC` moves from the current blocked qualification workspace into releasable product states.

The release path is intentionally staged:

```text
BLOCKED
  ↓
BENCHMARK_ONLY
  ↓
SCREENING
```

Direct `BLOCKED → SCREENING` promotion is forbidden.

`PROJECT_APPROVED`, `VERIFIED`, `PRODUCTION_AUTHORIZED`, and `designAuthority=true` are outside this release plan.

## Current state

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

The solved EI D.2.3 and independent analytical vectors are qualification evidence. They do not themselves change this state.

## Release 1 — BENCHMARK_ONLY

### Product intent

Release the real AIV product calculation path only for controlled benchmark execution and engineering qualification review.

The operator workflow becomes:

```text
Load EI D.2.3
→ inspect/edit controlled working tables
→ check readiness
→ Run benchmark
→ Source Results
→ Assessment Results
→ Line/Case Summary where qualified
→ Published vs calculated comparison
→ calculation detail / provenance
```

Project screening remains unavailable.

### Release boundary

```text
qualificationState     = BENCHMARK_ONLY
screeningAuthority     = NOT_AUTHORIZED
designAuthority        = false
execution boundary     = CONTROLLED_BENCHMARK_EXECUTION_ONLY
```

The first authority transition may authorize the production-shaped numerical implementation for benchmark execution, but it must not imply screening/design acceptance.

### Required evidence

`AivReleasePlan.v1` requires four independently bound artifacts before it can report `ELIGIBLE_FOR_REVIEWED_AUTHORITY_TRANSITION`:

1. **Qualification machine parity** — `AivQualificationParityManifest.v1` with `MACHINE_PARITY_PASS`.
2. **Qualification prerequisites** — `AivQualificationPromotionReadiness.v1` with all six prerequisite human/evidence gates satisfied.
3. **Independent vibration engineer recommendation** — `AivIndependentVibrationEngineerPromotionReviewVerification.v1` recommending `BENCHMARK_ONLY`.
4. **Exact-head release validation** — `AivReleaseValidationReceipt.v1` for the exact candidate SHA with actual executed tests/browser validation.

The release planner never performs the transition. A separate reviewed code change must move the Engineering Calculation definition from BLOCKED to BENCHMARK_ONLY.

### BENCHMARK_ONLY acceptance criteria

```text
controlled source identities             exact / hash-bound
critical trace gaps                      0
unexplained numerical constants          0
silent engineering defaults              0
UI-side AIV equations                     0
source/assessment/result-scope ambiguity  0
D.2.3 machine parity                      PASS
sonic SFF=6 machine parity                PASS
multi-source machine parity               PASS
FLM1 discrepancy                          human disposition recorded
worked-example result scopes              human reconciliation recorded
T2.7 trace set                            human reconciliation complete
independent benchmark vectors             human accepted
retained workbook evidence                reconciled/excluded by human review
independent vibration engineer            recommends BENCHMARK_ONLY
exact-head focused tests                  PASS
browser operator-flow validation          PASS
```

A GitHub Actions job with `runner_id=0` and zero steps is `NOT_RUN`, not a release PASS.

## Release 2 — SCREENING

SCREENING is a separate release program after BENCHMARK_ONLY has operated through the real product path.

### Product intent

Allow project AIV screening only within explicitly qualified applicability and evidence boundaries.

```text
project Sources / Assessments / Source→Assessment
→ readiness
→ screening execution
→ Source Results
→ Assessment Results
→ Line/Case Summary
→ traceable export
```

### Required evidence

The release planner reserves the following required artifacts:

```text
AivProductKernelQualificationReceipt.v1
AivProductPathBenchmarkParityReceipt.v1
AivLineAggregationQualificationReceipt.v1
AivSingleBatchParityReceipt.v1
AivScreeningDomainCoverageReceipt.v1
AivScreeningEngineeringReviewVerification.v1
AivReleaseValidationReceipt.v1
```

The minimum engineering content is:

- central production-shaped kernel implemented using the frozen stage order;
- D.2.3 parity through the same real product path used by project data;
- line/case aggregation rules independently reconciled, including the distinction between D.2.3 first-discontinuity `LOF=0.29` and worked-example line-level results such as `LOF=1.48`;
- single and batch execution call the same numerical kernel and produce identical results for identical cases;
- source combination, sonic state, trim, pressure basis, applicability, material/geometry and distance evidence fail closed;
- screening domain coverage and exclusions are source-controlled;
- independent vibration engineer explicitly approves SCREENING scope;
- exact-head automated + browser release validation executes and passes.

### SCREENING boundary

```text
qualificationState  = SCREENING
designAuthority     = false
```

Every result/export must continue to state that AIV screening is not design authority.

## Stage order carried into release

The product kernel contract is frozen as:

```text
VALIDATE_INPUT
RESOLVE_INPUT
EVALUATE_APPLICABILITY
CALCULATE_SOURCE_PWL
APPLY_SOURCE_MODIFIERS
CALCULATE_POINT_ATTENUATION
COMBINE_SIMULTANEOUS_SOURCES
CALCULATE_DISCONTINUITY_RESULT
AGGREGATE_LINE_CASE_RESULT
ASSESS_RESULT
```

The current Stage 16B scaffold keeps all stages `CONTRACT_ONLY` and hard-blocks execution until a reviewed authority transition occurs.

## Release artifacts are evidence, not toggles

A release artifact must be bound by SHA-256 to the exact file bytes. Bare booleans such as:

```text
humanReview=true
parity=true
ciPassed=true
```

are not acceptable release evidence.

The release planner evaluates artifact identity and state. It does not mutate the calculation registry, enable UI execution, or infer an engineer signature.

## Rollback rule

Any release candidate or released mode must fail closed to the lower authority state when method evidence, applicability, required provenance, or exact version identity is missing.

No numerical fallback may silently convert missing evidence into zero, PASS, SAFE, or NOT_APPLICABLE.

## Immediate implementation sequence

From the current codebase:

```text
1. Freeze release-readiness contract                     DONE in PR #446
2. Complete Stage 16B product kernel implementation      NEXT, execution still gated
3. Drive EI D.2.3 through real result contracts          NEXT
4. Produce product-path parity receipt                   after kernel
5. Complete named human qualification artifacts          required for Release 1
6. Produce exact-head release validation receipt          required for Release 1
7. Independent engineer BENCHMARK_ONLY recommendation    required for Release 1
8. Separate authority-transition PR                      Release 1
9. Operate/qualify BENCHMARK_ONLY path                   before SCREENING
10. Separate SCREENING qualification/release program      Release 2
```

## Permanent boundary

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

No geometry authoring, pixel-derived distance, 3D click-to-calculate workflow, or geometry writeback is introduced by release.
