# PR446 Work Report

## Mission Control

```text
Mission               Prepare AIV product-kernel candidate and AUTO release path
Issue                  #441
PR                     #446
Branch                 agent/aiv-kernel-contract-scaffold
Base                   90d504f74f872f232378836f72c2544297dea8c8
Mode                   AUTO
Human evidence         NOT REQUIRED
Candidate stages 1–7   IMPLEMENTED
Stages 8–10 config     READY from visible user assumptions
Current AUTO stage     16B.3
Exact next action      IMPLEMENT_STAGES_8_TO_10
Repository CI          NOT_RUN: Actions budget still creates zero-step jobs
Engineering authority  BLOCKED / NONE / NOT_AUTHORIZED
Release target         BENCHMARK_ONLY first; SCREENING later; designAuthority=false
```

## Authority invariant

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

No current PR module applies the BENCHMARK_ONLY transition yet.

## AUTO missing-data policy

```text
blank engineering cell
  -> resolve from AivAssumptionProfile.v1
  -> record table/row/column/value/profilePath
  -> show assumption in UI
  -> user may edit it
explicit table value always wins
```

AUTO stop conditions:

```text
INVALID_ASSUMPTION_PROFILE
MACHINE_BENCHMARK_PARITY_FAILURE
PRODUCT_PATH_BENCHMARK_PARITY_FAILURE
EXACT_HEAD_VALIDATION_FAILURE
```

There is no human-review stop condition.

## Candidate stages 1–7

```text
VALIDATE_INPUT
RESOLVE_INPUT
EVALUATE_APPLICABILITY
CALCULATE_SOURCE_PWL
APPLY_SOURCE_MODIFIERS
CALCULATE_POINT_ATTENUATION
COMBINE_SIMULTANEOUS_SOURCES
```

Previously executed isolated candidate tests: 6/6 PASS.

Representative values:

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

## Configurable assumption profile

Added:

```text
converters/vibration/aiv/aiv-assumption-profile.js
AivAssumptionProfile.v1
AivAssumptionResolution.v1
```

Visible assumptions cover source/process values, assessment geometry/material, source→assessment distance/applicability, identity/provenance and stages 8–10 benchmark parameters.

Deterministic IDs/record IDs are generated when missing. Trim assumptions are conditional: reduction/vendor provenance is only injected when trim mode is `MANUFACTURER_REDUCTION`.

## Stage 8 configuration

```text
AivDiscontinuityStage8EvidenceGate.v2
humanEvidenceRequired = false
```

Default benchmark configuration:

```text
stage8Model = CONFIGURED_D23_INTERMEDIATES
A = 0.93989
S = 68.229
B = 152.207
FLM1 mode = PUBLISHED | RECALCULATED
FLM1 published = 1.2133
FLM1 recalculated = 1.2109758194311824
FLM2 = 0.2009
loss factor = 0.31
D.2.3 assessment LOF reference = 0.29
```

The user can edit every value in the AIV UI.

## Stages 9–10 configuration

```text
AivPostDiscontinuityEvidenceGate.v2
humanEvidenceRequired = false
```

Pinned scope behavior:

```text
D.2.3 first-discontinuity LOF 0.29 = ASSESSMENT reference
worked-example relief-line LOF 1.48 = LINE_CASE_SUMMARY reference
valuesAreNotInterchangeable = true
lineAggregationMode = SEPARATE_RESULT_SCOPES
assessmentMode = BENCHMARK_COMPARE_ONLY
```

No generic SAFE/PASS/design classification is introduced.

## AUTO stage planner

```text
converters/vibration/aiv/aiv-auto-stage-plan.js
AivAutoStagePlan.v1
mode = AUTO
```

Current plan:

```text
16B.1 stages 1–7 candidate                         COMPLETE
16B.2 assumptions + stages 8–10 config             COMPLETE
16B.3 implement stages 8–10                        NEXT
17     complete D.2.3 product-path parity           BLOCKED_BY_PREVIOUS_STAGE
18     result detail / assumption trace / export    BLOCKED_BY_PREVIOUS_STAGE
19     exact-head validation + BENCHMARK_ONLY       BLOCKED_BY_PREVIOUS_STAGE
20     SCREENING machine qualification              FUTURE
```

## Benchmark kernel qualification

```text
AivBenchmarkKernelQualification.v2
humanEvidenceRequired = false
```

It consumes:

```text
stages 1–7 machine parity
valid assumption profile
complete AivProductPathBenchmarkParityReceipt.v1
```

Only complete 10-stage real product-path parity can make it PASS.

## BENCHMARK_ONLY release

```text
AivReleasePlan.v2
BLOCKED -> BENCHMARK_ONLY -> SCREENING
```

Four SHA-bound gates only:

```text
1. AivQualificationParityManifest.v1
2. AivAssumptionProfileValidation.v1
3. AivBenchmarkKernelQualification.v2
4. AivReleaseValidationReceipt.v1
```

No engineer/reviewer artifact is required.

## UI

The workspace now exposes:

```text
missing-data assumption editor
assumed-cell trace
FLM1 branch selection
stages 8–10 benchmark parameters
AUTO upcoming-stage table
next AUTO action
machine release readiness
```

No numerical AIV equations are in UI code.

## Focused tests

`verify:aiv-input-model` now targets the AUTO release path and includes:

```text
assumption-profile tests
stage-8 assumption gate tests
stages-9/10 assumption gate tests
benchmark-kernel qualification tests
AUTO stage-plan tests
release-plan tests
```

Legacy human-promotion tests are not part of the release-focused command.

New AUTO-path changes have not yet received full repository CI execution because the Actions budget still prevents jobs from starting. Do not treat zero-step jobs as PASS.

## Exact next AUTO sequence

```text
1. Implement stage 8 from configured benchmark parameters.
2. Implement stage 9 with strict ASSESSMENT vs LINE_CASE_SUMMARY separation.
3. Implement stage 10 in BENCHMARK_COMPARE_ONLY mode.
4. Drive EI D.2.3 through AivSourceResult.v1 / AivAssessmentResult.v1 / AivLineCaseSummary.v1.
5. Produce AivProductPathBenchmarkParityReceipt.v1.
6. Make AivBenchmarkKernelQualification.v2 PASS.
7. Wire assumption-aware result detail/export.
8. Execute exact-head node + browser validation.
9. Apply BENCHMARK_ONLY transition when all four release gates PASS.
10. Start separate SCREENING machine-qualification program.
```
