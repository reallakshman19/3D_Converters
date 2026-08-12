# AIV Release Plan v2 — AUTO

## Release sequence

```text
BLOCKED -> BENCHMARK_ONLY -> SCREENING
```

Human evidence is not a release prerequisite. Missing engineering inputs are explicit, visible and user-configurable through `AivAssumptionProfile.v1`.

Current authority:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

## Current implementation state

```text
stages 1–10                IMPLEMENTED for controlled benchmark path
D.2.3 full product path    PASS — 22 / 22 checks
result/detail/export       COMPLETE
exact-head release test    NEXT
```

Validation record:

```text
docs/vibration/validation/AIV-D2.3-Product-Path-Validation-v1.json
blob 6d3cd2f7d71ab47d2825d802628f18c0782ffdc7
validated code commit 64485a51ffe78102ba3b966d43ba68e13f511130
```

## BENCHMARK_ONLY target

```text
calculationState      = IMPLEMENTED
qualificationState    = BENCHMARK_ONLY
engineeringAuthority  = REFERENCE_ONLY
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

`AivReleasePlan.v2` requires four machine/configuration artifacts:

```text
1. AivQualificationParityManifest.v1
2. AivAssumptionProfileValidation.v1
3. AivBenchmarkKernelQualification.v2 — PASS / complete 10-stage product path
4. AivReleaseValidationReceipt.v1 — exact-head node/browser execution PASS
```

No engineer/reviewer artifact is required.

## Completed benchmark acceptance

```text
Relief raw PWL           164.6851759525391 dB
Recycle raw PWL          159.36481554007995 dB
Recycle effective PWL    129.36481554007995 dB
Attenuation                0.3116883116883117 dB
First-point PWL          164.3734876408508 dB
log10(N)                   9.902567870507482
N                          7.990388037921443E9
FLM1 selected              1.2133
FLM1 recalculated          1.2109758194311824
FLM2                       0.2009306328510857
Lf                         0.31287602368755874
Assessment LOF             0.29
Configured line LOF        1.48
```

All 22 declared validation checks pass. The FLM1 displayed-input variance is explicit and within configurable tolerance `0.0024`.

`A`, `S`, `B`, and line-scope `LOF=1.48` remain visible assumptions because the worked example does not expose enough information to derive them generically.

## Result/export behavior — complete

For the unchanged controlled EI D.2.3 benchmark, the workspace shows validated Source, Assessment, T2-6 and Line/Case detail and exports `AivValidatedBenchmarkExportPackage.v1` with the active assumption profile and validation record.

Validation identity fails closed:

```text
change table input       -> NOT_APPLICABLE_MODIFIED_INPUTS
change benchmark assumption -> validation not applicable
reload controlled benchmark -> restores validated default identity
```

## Exact-head release validation — next

Required commands on the exact candidate head:

```text
npm run verify:aiv-input-model
npm run run:aiv-d23-product-path-validation
```

Required browser sequence:

```text
Load EI D.2.3
confirm validated Source / Assessment / Line results
edit table -> committed validation disappears
reload benchmark
edit assumption -> committed validation disappears
reload benchmark
export validation package
```

Record successful execution as `AivReleaseValidationReceipt.v1` with the exact candidate SHA and actual execution/log identity.

A GitHub Actions job with `runner_id=0` or zero steps is `NOT_RUN`, not release evidence.

## AUTO stop conditions

```text
INVALID_ASSUMPTION_PROFILE
MACHINE_BENCHMARK_PARITY_FAILURE
PRODUCT_PATH_BENCHMARK_PARITY_FAILURE
EXACT_HEAD_VALIDATION_FAILURE
```

There is no human-review stop condition.

## SCREENING — later

SCREENING begins only after BENCHMARK_ONLY is released. Machine qualification must cover project source/process ranges, pressure bases, sonic and trim behavior, source mapping, multi-source combination, geometry/material ranges, line/case behavior, single/batch parity, assumptions/export trace and exact-head validation.

```text
qualificationState  = SCREENING
screeningAuthority  = AUTHORIZED_WITHIN_APPLICABILITY
designAuthority     = false
```

SCREENING remains distinct from design authority.

## Permanent boundary

```text
Advanced_Analysis:
AUTHOR -> EDIT -> VALIDATE -> CERTIFY -> EXPORT

3D_Converters / AIV:
IMPORT -> VERIFY -> JOIN -> ASSESS -> EXPLAIN
```

No geometry authoring, pixel-derived distance, 3D click-to-calculate flow, or geometry writeback is introduced by release.
