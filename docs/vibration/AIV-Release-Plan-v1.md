# AIV Release Plan v2 — AUTO

## Release sequence

```text
BLOCKED
  -> BENCHMARK_ONLY
  -> SCREENING
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
stages 1–7   IMPLEMENTED
stages 8–10  IMPLEMENTED in controlled AUTO benchmark adapter
D.2.3 full product path PASS — 22 / 22 checks
Stage 18     NEXT — result detail / assumptions / export
Stage 19     exact-head BENCHMARK_ONLY validation after Stage 18
```

Validation record:

```text
docs/vibration/validation/AIV-D2.3-Product-Path-Validation-v1.json
blob 6d3cd2f7d71ab47d2825d802628f18c0782ffdc7
validated code commit 64485a51ffe78102ba3b966d43ba68e13f511130
```

## Release 1 — BENCHMARK_ONLY

Purpose: run the controlled benchmark through the real AIV input/result workflow and expose calculation detail without granting project screening authority.

Target boundary:

```text
calculationState      = IMPLEMENTED
qualificationState    = BENCHMARK_ONLY
engineeringAuthority  = REFERENCE_ONLY
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

Required release evidence in `AivReleasePlan.v2`:

```text
1. AivQualificationParityManifest.v1
2. AivAssumptionProfileValidation.v1
3. AivBenchmarkKernelQualification.v2
4. AivReleaseValidationReceipt.v1
```

The benchmark-kernel qualification requires complete 10-stage product-path parity. That product-path receipt now exists and passes.

Remaining BENCHMARK_ONLY work:

1. Stage 18: display/export calculated Source / Assessment / Line results plus assumptions and validation metadata.
2. Run the exact candidate head through the focused Node suite and browser operator flow on a real controlled checkout/runner.
3. Produce `AivReleaseValidationReceipt.v1` with actual execution metadata.
4. Evaluate all four `AivReleasePlan.v2` gates.
5. Apply BENCHMARK_ONLY in a separate explicit transition change only when those machine gates pass.

A GitHub Actions job with no assigned runner and zero steps is `NOT_RUN`, not a release PASS.

## D.2.3 benchmark acceptance already achieved

```text
relief raw PWL         164.6851759525391 dB
recycle raw PWL        159.36481554007995 dB
recycle effective PWL  129.36481554007995 dB
attenuation              0.3116883116883117 dB
first-point PWL        164.3734876408508 dB
log10(N)                 9.902567870507482
N                        7.990388037921443E9
FLM1 selected            1.2133
FLM1 recalculated        1.2109758194311824
FLM2                     0.2009306328510857
Lf                       0.31287602368755874
assessment LOF           0.29
configured line LOF      1.48
```

All declared validation tolerances pass. The FLM1 displayed-input variance is explicitly accepted by the configurable benchmark tolerance `0.0024`; it is not hidden.

`A`, `S`, `B`, and the line-scope `LOF=1.48` remain visible assumptions because the worked example does not expose enough information to derive them generically. User changes are permitted and traceable.

## Release 2 — SCREENING

SCREENING begins only after BENCHMARK_ONLY is released and operated through the real product path.

Machine qualification must cover at minimum:

```text
project source/process ranges
pressure basis conversions
sonic/non-sonic behavior
trim behavior
source-to-assessment mapping
multi-source combination
assessment geometry/material ranges
line/case behavior
single/batch parity
assumption/export trace
exact-head node/browser validation
```

Target boundary:

```text
qualificationState  = SCREENING
screeningAuthority  = AUTHORIZED_WITHIN_APPLICABILITY
designAuthority     = false
```

SCREENING must remain distinct from design authority.

## AUTO stop conditions

```text
INVALID_ASSUMPTION_PROFILE
MACHINE_BENCHMARK_PARITY_FAILURE
PRODUCT_PATH_BENCHMARK_PARITY_FAILURE
EXACT_HEAD_VALIDATION_FAILURE
```

There is no human-review stop condition.

## Permanent product boundary

```text
Advanced_Analysis:
AUTHOR -> EDIT -> VALIDATE -> CERTIFY -> EXPORT

3D_Converters / AIV:
IMPORT -> VERIFY -> JOIN -> ASSESS -> EXPLAIN
```

No geometry authoring, pixel-derived distance, 3D click-to-calculate flow, or geometry writeback is introduced by release.
