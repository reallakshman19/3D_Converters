# PR446 Work Report

## Mission Control

```text
Mission               Prepare AIV product-kernel candidate and controlled release path
Issue                  #441
PR                     #446
Branch                 agent/aiv-kernel-contract-scaffold
Base                   90d504f74f872f232378836f72c2544297dea8c8
Current stage          Stage 16B candidate stages 1–7 + stage-8 evidence gate + release qualification
Candidate implementation stages 1–7 IMPLEMENTED; stages 8–10 BLOCKED
Focused execution      candidate 6/6 PASS; stage-8 gate 4/4 PASS; kernel qualification 4/4 PASS; release plan 6/6 PASS; release validation 6/6 PASS
Repository CI          NOT_RUN: Actions budget still creates runner_id=0 / zero-step jobs
Engineering authority BLOCKED / NONE / NOT_AUTHORIZED
Release target         BENCHMARK_ONLY first; SCREENING only as a second release program
Exact next action      Obtain real T2.7/T2-6 + FLM1 human verification, then implement stage 8 from reviewed evidence; no authority transition yet
```

## Current authority invariant

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

No module in this PR mutates these values. There is still no AIV Run/Calculate UI action and no candidate registration in the Engineering Calculation API.

## Kernel architecture

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

The public `AivKernelContract.v1` remains contract-only. `assertAivKernelExecutionAuthorized()` always fails closed.

## Internal candidate — stages 1–7

`converters/vibration/aiv/aiv-kernel-candidate.js` independently implements the production-shaped source/attenuation path while remaining unexported/unregistered.

Focused isolated parity:

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

`tests/vibration-aiv-kernel-candidate.test.mjs`: 6/6 PASS in isolated execution.

Candidate fail-closed behavior includes explicit gauge-reference provenance, explicit sonic state, trim provenance, supported units, P1abs>P2abs, relationship applicability/identity, physical engineering distance provenance and assessment inside diameter.

No sonic-state inference and no pixel/topology-derived physical distance are implemented.

## Candidate parity manifest

```text
scripts/build-aiv-kernel-candidate-parity.mjs
AivKernelCandidateParity.v1
```

Eight planned candidate-vs-qualification checks cover relief/recycle source PWL, effective PWL, attenuation, point PWL, sonic SFF=6 and both simultaneous-source vectors.

The builder/test are wired into the focused repository command. Full repository execution of this builder remains pending because the connected environment cannot clone GitHub and hosted Actions still do not start.

## Stage-8 evidence gate

```text
converters/vibration/aiv/aiv-stage8-evidence-gate.js
AivDiscontinuityStage8EvidenceGate.v1
```

Required SHA-bound verification artifacts:

```text
AivT27ReconciliationVerification.v1
AivD23Flm1ReconciliationVerification.v1
```

Gate states:

```text
BLOCKED_PENDING_T2_6_RECONCILIATION
BLOCKED_INVALID_EVIDENCE
READY_FOR_CANDIDATE_IMPLEMENTATION
```

`READY_FOR_CANDIDATE_IMPLEMENTATION` is implementation readiness only; it grants no numerical/product authority.

Published D.2.3 values `A=0.93989`, `S=68.229`, `B=152.207` remain benchmark expectations only and cannot become generic defaults. The gate explicitly forbids silently choosing published versus recalculated FLM1 and carries the reviewed FLM1 benchmark value/tolerance when human evidence is complete.

`tests/vibration-aiv-stage8-evidence-gate.test.mjs`: 4/4 PASS in isolated execution.

## Benchmark kernel qualification

```text
converters/vibration/aiv/aiv-benchmark-kernel-qualification.js
AivBenchmarkKernelQualification.v1
```

Progress states:

```text
NOT_READY
PARTIAL_STAGES_1_TO_7
READY_FOR_STAGES_8_TO_10_IMPLEMENTATION
INVALID_EVIDENCE
PASS
```

Semantics:

```text
stages 1–7 candidate parity only
  -> PARTIAL_STAGES_1_TO_7

+ reviewed stage-8 evidence gate
  -> READY_FOR_STAGES_8_TO_10_IMPLEMENTATION

+ complete AivProductPathBenchmarkParityReceipt.v1 for all 10 stages
  -> PASS
```

Only `PASS` satisfies the BENCHMARK_ONLY kernel release gate.

`tests/vibration-aiv-benchmark-kernel-qualification.test.mjs`: 4/4 PASS in isolated execution.

## Release plan

```text
AivReleasePlan.v1
BLOCKED -> BENCHMARK_ONLY -> SCREENING
```

Direct BLOCKED→SCREENING is forbidden. Design authority remains outside this release program.

### BENCHMARK_ONLY now requires five SHA-bound artifacts

```text
1. AivQualificationParityManifest.v1
2. AivBenchmarkKernelQualification.v1              PASS / all 10 product-path stages
3. AivQualificationPromotionReadiness.v1
4. AivIndependentVibrationEngineerPromotionReviewVerification.v1
5. AivReleaseValidationReceipt.v1
```

This deliberately prevents isolated script parity from being used as release authority.

Updated isolated release-plan regression: 6/6 PASS.

### SCREENING remains a second release program

Reserved evidence still includes full product-kernel qualification, real-path parity, line aggregation, single/batch parity, screening-domain coverage, independent screening review and exact-head screening validation.

`designAuthority=false` remains permanent for this release plan.

## Exact-head release validation

`AivReleaseValidationReceipt.v1` requires actual execution against the exact candidate SHA. `runner_id=0`, zero executed steps, NOT_RUN, missing commands, nonzero exit codes or missing SHA-256 log evidence cannot pass.

BENCHMARK_ONLY validation groups:

```text
AIV_FOCUSED_NODE_TESTS
AIV_CONTROLLED_BENCHMARK_PARITY
AIV_BROWSER_WORKSPACE_SMOKE
AIV_MODULE_BOUNDARY_CHECK
```

Release-validation contract tests remain 6/6 PASS in isolated execution.

## Human gates still required

```text
AivT27Reconciliation.v1
AivD23Flm1Reconciliation.v1
AivWorkedExampleResultScopeReview.v1
AivIndependentBenchmarkReview.v1
AivWorkbookReconciliation.v1
AivIndependentVibrationEngineerPromotionReview.v1
```

No machine calculation or synthetic test may self-complete these records.

## Repository CI limitation

Current GitHub AIV workflow jobs continue to receive no runner and no steps because the repository Actions budget prevents execution. This is infrastructure `NOT_RUN`, never a product/test PASS or a code-failure finding.

## Durable docs

```text
docs/vibration/AIV-Kernel-Contract-Scaffold-v1.md
docs/vibration/AIV-Kernel-Candidate-Stages1-7-v1.md
docs/vibration/AIV-Stage8-Evidence-Gate-v1.md
docs/vibration/AIV-Release-Plan-v1.md
docs/vibration/AIV-Release-Validation-v1.md
```

## Next legitimate implementation sequence

```text
1. Keep authority BLOCKED.
2. Obtain completed hash-bound T2.7/T2-6 and FLM1 human verification.
3. Stage-8 gate becomes READY_FOR_CANDIDATE_IMPLEMENTATION.
4. Implement stage 8 strictly from reviewed trace evidence; no guessed A/S/B chain and no silent FLM1 choice.
5. Complete worked-example line/result-scope reconciliation.
6. Implement stages 9–10 from the reviewed aggregation/assessment rules.
7. Drive EI D.2.3 through Source / Assessment / Line result contracts and produce AivProductPathBenchmarkParityReceipt.v1.
8. AivBenchmarkKernelQualification.v1 must reach PASS.
9. Run exact-head node + browser release validation.
10. Independent vibration engineer may recommend BENCHMARK_ONLY.
11. Only then create a separate reviewed authority-transition PR.
12. SCREENING is a later independent release program; design authority stays false.
```
