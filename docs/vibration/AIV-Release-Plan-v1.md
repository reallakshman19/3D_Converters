# AIV Release Plan v2 — AUTO Machine Gates

## Purpose

This document defines how `VIB.AIV.ACOUSTIC` moves from the current blocked workspace into releasable product states.

```text
BLOCKED
  ↓
BENCHMARK_ONLY
  ↓
SCREENING
```

Direct `BLOCKED → SCREENING` remains forbidden.

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

## AUTO policy

Human evidence is not required for implementation, qualification, or release.

```text
humanEvidenceRequired = false
missing engineering data = visible user-configurable assumptions
explicit user table value = higher priority than assumption
```

AUTO stops only for invalid configuration or machine validation failure.

## Current implementation

Stages 1–7 are already implemented in the internal production-shaped candidate:

```text
VALIDATE_INPUT
RESOLVE_INPUT
EVALUATE_APPLICABILITY
CALCULATE_SOURCE_PWL
APPLY_SOURCE_MODIFIERS
CALCULATE_POINT_ATTENUATION
COMBINE_SIMULTANEOUS_SOURCES
```

Stages 8–10 are now configuration-ready from `AivAssumptionProfile.v1`:

```text
CALCULATE_DISCONTINUITY_RESULT
AGGREGATE_LINE_CASE_RESULT
ASSESS_RESULT
```

`AivDiscontinuityStage8EvidenceGate.v2` and `AivPostDiscontinuityEvidenceGate.v2` validate the configured benchmark assumptions. They do not request human review artifacts.

Default configuration makes all three stages ready for candidate implementation.

## Automatic stage progression

`AivAutoStagePlan.v1` controls upcoming work:

```text
16B.1 stages 1–7 candidate                         COMPLETE
16B.2 assumptions + stages 8–10 configuration      COMPLETE
16B.3 implement stages 8–10                        NEXT
17     complete D.2.3 product-path parity           BLOCKED_BY_PREVIOUS_STAGE
18     result detail / assumption trace / export    BLOCKED_BY_PREVIOUS_STAGE
19     exact-head validation + BENCHMARK_ONLY       BLOCKED_BY_PREVIOUS_STAGE
20     SCREENING machine qualification              FUTURE
```

Default next action:

```text
IMPLEMENT_STAGES_8_TO_10
```

## Release 1 — BENCHMARK_ONLY

### Product intent

Run the real AIV product path for controlled benchmark execution:

```text
Load EI D.2.3
→ resolve missing values from visible assumptions
→ check readiness
→ Run benchmark
→ Source Results
→ Assessment Results
→ Line/Case Summary
→ reference vs calculated comparison
→ assumptions / calculation detail / provenance / export
```

Project screening remains unavailable.

### Release boundary

```text
qualificationState = BENCHMARK_ONLY
engineeringAuthority = REFERENCE_ONLY
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
executionBoundary = CONTROLLED_BENCHMARK_EXECUTION_ONLY
```

### Required evidence

`AivReleasePlan.v2` requires four SHA-bound artifacts:

1. `AivQualificationParityManifest.v1` — isolated qualification machine parity.
2. `AivAssumptionProfileValidation.v1` — visible/editable assumption profile is valid.
3. `AivBenchmarkKernelQualification.v2` — all 10 product stages pass through the real benchmark path.
4. `AivReleaseValidationReceipt.v1` — exact-head node/browser validation actually executed and passed.

There is no independent-engineer or human-review release gate.

### BENCHMARK_ONLY acceptance criteria

```text
controlled source identities                    exact / traceable
hidden engineering defaults                     0
untracked assumed cells                         0
UI-side AIV equations                           0
source/assessment/result-scope ambiguity        0
D.2.3 machine parity                            PASS
sonic SFF=6 parity                              PASS
multi-source parity                             PASS
stages 1–7 candidate-vs-qualification parity    PASS
stages 8–10 configured benchmark path           PASS
complete 10-stage real product-path parity      PASS
assumption profile validation                   PASS
exact-head focused tests                        PASS
browser operator-flow validation                PASS
```

FLM1 is an explicit configuration choice:

```text
PUBLISHED     1.2133
RECALCULATED  1.2109758194311824
```

The selected branch and tolerance are exported with the result.

A GitHub Actions job with `runner_id=0` and zero executed steps is `NOT_RUN`, never PASS.

## Stage 8 boundary

Stage 8 uses explicit benchmark configuration:

```text
stage8Model = CONFIGURED_D23_INTERMEDIATES
A = 0.93989
S = 68.229
B = 152.207
FLM1 mode/value/tolerance = configurable
FLM2 = configurable
loss factor = configurable
D.2.3 assessment LOF reference = configurable
```

This permits complete benchmark-path implementation without claiming that every generic T2-6 screening rule has been reconstructed.

No configured parameter may be hidden from the UI or result trace.

## Stages 9–10 boundary

The product keeps separate result scopes:

```text
D.2.3 first-discontinuity LOF 0.29 = ASSESSMENT benchmark
worked-example relief-line LOF 1.48 = LINE_CASE_SUMMARY benchmark
```

They are not interchangeable.

Stage 10 mode is initially:

```text
BENCHMARK_COMPARE_ONLY
```

It reports calculated/reference/delta/tolerance and must not emit generic `SAFE`, `PASS`, design approval, or universal screening classification.

## Release 2 — SCREENING

SCREENING is a separate machine-qualification program after BENCHMARK_ONLY proves the real product path.

Required evidence remains machine/configuration based:

```text
AivProductKernelQualificationReceipt.v1
AivProductPathBenchmarkParityReceipt.v1
AivLineAggregationQualificationReceipt.v1
AivSingleBatchParityReceipt.v1
AivScreeningDomainCoverageReceipt.v1
AivAssumptionProfileValidation.v1
AivReleaseValidationReceipt.v1
```

Minimum requirements:

- same numerical kernel for benchmark, single-case, and batch execution;
- applicability/domain coverage is machine-tested;
- missing values continue to use explicit configurable assumptions;
- source combination, sonic state, trim, pressure basis, material/geometry and distance behavior are exercised in tests;
- result scopes stay distinct;
- exact-head automated + browser validation executes and passes;
- `designAuthority=false`.

## Release artifacts are evidence, not toggles

Every machine release artifact must bind to exact bytes by SHA-256 where applicable. Bare claims such as:

```text
parity=true
ciPassed=true
```

are not sufficient release evidence.

The release planner evaluates readiness; it does not silently mutate the calculation registry.

## Missing-data behavior

No missing engineering value silently becomes zero or a hidden default.

Instead:

```text
blank input
→ resolve from AivAssumptionProfile.v1
→ record table/row/column/profilePath/assumedValue
→ show it in UI
→ include it in result/export provenance
```

If the assumption profile itself is invalid, AUTO stops with `INVALID_ASSUMPTION_PROFILE`.

## Immediate AUTO implementation sequence

```text
1. Release-readiness contract                                  DONE
2. Candidate stages 1–7                                       DONE
3. Visible configurable assumption profile                     DONE
4. Stage 8 benchmark configuration gate                        DONE
5. Stages 9–10 scope/configuration gate                        DONE
6. AUTO stage planner                                          DONE
7. Implement candidate stages 8–10                             NEXT
8. Drive EI D.2.3 through complete product result contracts    AUTO NEXT
9. Produce AivProductPathBenchmarkParityReceipt.v1             AUTO NEXT
10. AivBenchmarkKernelQualification.v2 PASS                    AUTO NEXT
11. Wire result detail / assumptions / export                  AUTO NEXT
12. Execute exact-head node + browser validation               AUTO NEXT
13. Apply BENCHMARK_ONLY authority transition                  when four release gates PASS
14. Run separate SCREENING qualification program               after BENCHMARK_ONLY
```

## Permanent boundary

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

No geometry authoring, pixel-derived distance, 3D click-to-calculate workflow, or geometry writeback is introduced by release.
