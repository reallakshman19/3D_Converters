# PR446 Work Report

## Mission Control

```text
Mission               Prepare AIV product-kernel candidate and controlled release path
Issue                  #441
PR                     #446
Branch                 agent/aiv-kernel-contract-scaffold
Base                   90d504f74f872f232378836f72c2544297dea8c8
Predecessor            PR #444 merged as 90d504f74f872f232378836f72c2544297dea8c8
Current stage          Stage 16B candidate stages 1–7 + release-readiness architecture
Source implementation IMPLEMENTED for stages 1–7; stages 8–10 BLOCKED
Focused execution      kernel candidate 6/6 PASS; release-plan 5/5 PASS; release-validation 6/6 PASS
Repository CI          NOT_RUN: Actions budget creates runner_id=0 / zero-step jobs
Engineering authority BLOCKED / NONE / NOT_AUTHORIZED
Release target         BENCHMARK_ONLY first; SCREENING only as a second release program
Exact next action      Reconcile/implement T2-6 discontinuity stage 8, then line aggregation/assessment stages 9–10; do not register or release yet
```

## Pre-work cleanup requested by user

```text
#442  merged to main (squash) 5855c541b48436717b8e33df8821ecd231ec11d4
#444  merged to main (squash) 90d504f74f872f232378836f72c2544297dea8c8
#311  closed as already-integrated/superseded stale stack
```

PR #311 was not force-merged because current `main` already contains its Agent E foundation and newer shared FBX/topology revisions.

## Current authority invariant

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

No module in this PR mutates those values. No AIV Run/Calculate UI or Engineering Calculation registration exists.

## Frozen kernel contract

```text
converters/vibration/aiv/aiv-kernel-contract.js
AivKernelContract.v1
```

Frozen order:

```text
1  VALIDATE_INPUT
2  RESOLVE_INPUT
3  EVALUATE_APPLICABILITY
4  CALCULATE_SOURCE_PWL
5  APPLY_SOURCE_MODIFIERS
6  CALCULATE_POINT_ATTENUATION
7  COMBINE_SIMULTANEOUS_SOURCES
8  CALCULATE_DISCONTINUITY_RESULT
9  AGGREGATE_LINE_CASE_RESULT
10 ASSESS_RESULT
```

The public contract remains `CONTRACT_ONLY`; `assertAivKernelExecutionAuthorized()` always throws `AIV_KERNEL_EXECUTION_NOT_AUTHORIZED`.

## Production-shaped candidate — stages 1–7

```text
converters/vibration/aiv/aiv-kernel-candidate.js
AivKernelCandidate.v1
```

Candidate authority:

```text
implementationState          = CANDIDATE_NOT_AUTHORIZED
registeredInEngineeringApi   = false
uiExecutionAuthorized        = false
benchmarkExecutionAuthorized = false
screeningExecutionAuthorized = false
productionEquationAuthorized = false
screeningAuthority           = NOT_AUTHORIZED
designAuthority              = false
```

Implemented candidate stages:

```text
VALIDATE_INPUT
RESOLVE_INPUT
EVALUATE_APPLICABILITY
CALCULATE_SOURCE_PWL
APPLY_SOURCE_MODIFIERS
CALCULATE_POINT_ATTENUATION
COMBINE_SIMULTANEOUS_SOURCES
```

Blocked candidate stages:

```text
CALCULATE_DISCONTINUITY_RESULT
AGGREGATE_LINE_CASE_RESULT
ASSESS_RESULT
```

### Input/trace behavior

The candidate consumes the existing split AIV source/assessment/relationship records.

It fails closed on:

```text
missing Source Canonical ID / Operating Case
unsupported units
P1abs <= P2abs
GAUGE pressure without explicit reference pressure + source + revision
UNRESOLVED sonic state
UNRESOLVED trim state
manufacturer trim without positive reduction + provenance
non-APPLICABLE relationship
source/case/assessment identity mismatch
missing physical distance + distance provenance
missing/invalid main inside diameter
```

No sonic-state detection is implemented. Explicit `SONIC` maps to the controlled SFF=6 candidate branch; `NON_SONIC` maps to SFF=0; `UNRESOLVED` fails.

Physical AIV distance remains relationship-owned engineering evidence and is never derived from topology pixels/geometry.

### Candidate numerical parity executed

Focused isolated candidate regression:

```text
Relief raw source PWL       164.6851759525391 dB
Recycle raw source PWL      159.36481554007995 dB
Recycle effective PWL       129.36481554007995 dB
Relief attenuation            0.3116883116883117 dB
Relief first-point PWL       164.3734876408508 dB
Explicit sonic vector       162.72433464037815 dB
160 + 160 dB                163.0102999566398 dB
160 + 150 dB                160.41392685158226 dB
```

```text
tests/vibration-aiv-kernel-candidate.test.mjs
6 pass / 0 fail
```

The test also asserts the candidate is absent from `converters/vibration/aiv/index.js`.

## Candidate-vs-qualification parity manifest

```text
scripts/build-aiv-kernel-candidate-parity.mjs
AivKernelCandidateParity.v1
```

The builder compares the independently implemented candidate stages 1–7 against the isolated qualification solves for eight checks:

```text
RELIEF_RAW_SOURCE_PWL
RECYCLE_RAW_SOURCE_PWL
RECYCLE_EFFECTIVE_SOURCE_PWL
RELIEF_ATTENUATION
RELIEF_POINT_PWL
SONIC_SFF6_PWL
MULTI_SOURCE_EQUAL
MULTI_SOURCE_ASYMMETRIC
```

It retains controlled Markdown/PDF source identities and blocked authority. It does not claim T2-6/LOF, aggregation, screening or design parity.

Package command:

```bash
npm run build:aiv-kernel-candidate-parity
```

The candidate module regression was executed in isolation. The full candidate-parity builder remains subject to the focused repository/exact-head release run because the repository checkout/CI runner is not available in this environment.

## Benchmark comparison contract

```text
converters/vibration/aiv/aiv-benchmark-comparison.js
AivBenchmarkComparison.v1
```

Statuses:

```text
PASS
FAIL
REVIEW_REQUIRED
NOT_APPLICABLE_INPUTS_MODIFIED
```

The D.2.3 FLM1 variance is `REVIEW_REQUIRED`, not silently normalized.

## Release plan

```text
docs/vibration/AIV-Release-Plan-v1.md
converters/vibration/aiv/aiv-release-plan.js
AivReleasePlan.v1
```

Allowed progression only:

```text
BLOCKED
  ↓
BENCHMARK_ONLY
  ↓
SCREENING
```

Direct `BLOCKED → SCREENING` is forbidden. `PROJECT_APPROVED`, `VERIFIED`, `PRODUCTION_AUTHORIZED`, and `designAuthority=true` are outside this release program.

### Release 1 — BENCHMARK_ONLY

Required SHA-bound evidence:

```text
AivQualificationParityManifest.v1
AivQualificationPromotionReadiness.v1
AivIndependentVibrationEngineerPromotionReviewVerification.v1
AivReleaseValidationReceipt.v1
```

Only all valid may produce `ELIGIBLE_FOR_REVIEWED_AUTHORITY_TRANSITION`. The planner itself applies no transition.

Release boundary remains controlled benchmark execution only; screening/design stay unauthorized.

### Release 2 — SCREENING

Reserved evidence:

```text
AivProductKernelQualificationReceipt.v1
AivProductPathBenchmarkParityReceipt.v1
AivLineAggregationQualificationReceipt.v1
AivSingleBatchParityReceipt.v1
AivScreeningDomainCoverageReceipt.v1
AivScreeningEngineeringReviewVerification.v1
AivReleaseValidationReceipt.v1
```

SCREENING cannot be reviewed while current phase is BLOCKED.

## Exact-head release validation

```text
converters/vibration/aiv/aiv-release-validation.js
docs/vibration/AIV-Release-Validation-v1.md
AivReleaseValidationRecord.v1
AivReleaseValidationReceipt.v1
```

Allowed sources:

```text
LOCAL_CONTROLLED_CHECKOUT
CI_RUNNER
```

A CI receipt requires a positive runner id and nonblank runner name. `runner_id=0`, zero steps, or `actualExecution=false` is rejected as NOT_RUN.

BENCHMARK_ONLY requires:

```text
AIV_FOCUSED_NODE_TESTS
AIV_CONTROLLED_BENCHMARK_PARITY
AIV_BROWSER_WORKSPACE_SMOKE
AIV_MODULE_BOUNDARY_CHECK
```

SCREENING adds real-product-path parity, single/batch parity, project-input browser flow and export/provenance validation.

Every group needs PASS, exit code 0, executed command and SHA-256 output/log evidence.

## Focused execution in this session

```text
kernel contract / comparison isolated harness   PASS
release-plan tests                              5 pass / 0 fail
release-validation tests                        6 pass / 0 fail
kernel candidate stages 1–7 tests               6 pass / 0 fail
```

The focused repository command includes all new regressions:

```bash
npm run verify:aiv-input-model
```

This does not replace exact-head repository/browser release validation.

## Repository CI limitation

Current GitHub AIV workflow jobs still present as:

```text
runner_id = 0
steps     = []
```

with the Actions-budget no-start annotation. This remains `NOT_RUN`, never PASS.

## Human gates still required for Release 1

```text
AivT27Reconciliation.v1
AivD23Flm1Reconciliation.v1
AivWorkedExampleResultScopeReview.v1
AivIndependentBenchmarkReview.v1
AivWorkbookReconciliation.v1
AivIndependentVibrationEngineerPromotionReview.v1
```

The candidate arithmetic does not self-complete any of these human records.

## Durable docs

```text
docs/vibration/AIV-Kernel-Contract-Scaffold-v1.md
docs/vibration/AIV-Kernel-Candidate-Stages1-7-v1.md
docs/vibration/AIV-Release-Plan-v1.md
docs/vibration/AIV-Release-Validation-v1.md
```

## Exact next implementation

```text
1. Keep current authority BLOCKED.
2. Complete controlled/human reconciliation needed to implement T2-6 stage 8 without guessing A/S/B/FLM1 authority.
3. Implement candidate stage 8 only after that evidence is usable; preserve published-vs-recalculated FLM1 disposition explicitly.
4. Implement stages 9–10 after line/case result-scope aggregation is reconciled.
5. Drive EI D.2.3 through the complete candidate result path.
6. Run candidate parity + focused node + browser workspace validation against one exact candidate head.
7. Complete independent vibration-engineer BENCHMARK_ONLY review.
8. Only then create a separate reviewed authority-transition PR.
9. SCREENING is a later release program; design authority remains false.
```
