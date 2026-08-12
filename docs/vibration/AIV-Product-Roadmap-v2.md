# AIV Product Roadmap v2 — AUTO Benchmark Release

## Current state

`VIB.AIV.ACOUSTIC` now follows an AUTO, benchmark-driven implementation path.

```text
humanEvidenceRequired = false
missing engineering data -> visible AivAssumptionProfile.v1 -> user editable
explicit table values override assumptions
```

Current authority remains:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

The current release target is **BENCHMARK_ONLY**. SCREENING is a later machine-qualification phase.

## Controlled benchmark basis

Readable worked-example source:

```text
3D_Converters
commit 8f243592d73ccf4790d9e308a311003ce7d8f5bb
docs/Energy-Institute-AVIFF---Worked-Examples.md
blob 9f22d92eba8bdf3b67adc25a4c77a7f7d7211da8
```

Corroborating worked-example PDF remains pinned in `reallaksh19/Common`.

## Product model

Three result scopes remain mandatory:

```text
SOURCE
  raw source PWL
  sonic SFF
  trim reduction
  effective source PWL

ASSESSMENT
  source contributions at point
  combined point PWL
  T2-6 chain
  assessment LOF

LINE_CASE_SUMMARY
  line/case result
  controlling context when derivable
```

D.2.3 first-discontinuity `LOF=0.29` and worked-example relief-line `LOF=1.48` are different result scopes.

## Split input ownership

```text
AivSourceCsv.v2
AivAssessmentCsv.v1
AivSourceAssessmentCsv.v1
```

Topology proves identity/connectivity only. AIV physical distance is an explicit relationship input or visible assumption; it is never derived from SVG pixels.

## Missing-data assumptions

`AivAssumptionProfile.v1` supplies visible, editable defaults for:

- source/process values;
- assessment geometry/material;
- source→assessment distance/applicability;
- deterministic identity/provenance where missing;
- stages 8–10 benchmark parameters.

Every assumed table cell is recorded. Explicit user input wins over the profile.

Default D.2.3-oriented benchmark assumptions include:

```text
A = 0.93989
S = 68.229
B = 152.207
FLM1 mode = PUBLISHED | RECALCULATED
FLM1 published = 1.2133
FLM1 recalculated = 1.2109758194311824
D.2.3 assessment LOF reference = 0.29
worked-example relief-line LOF reference = 1.48
lineAggregationMode = SEPARATE_RESULT_SCOPES
assessmentMode = BENCHMARK_COMPARE_ONLY
```

## Ten-stage AUTO kernel path

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

Stages 1–7 are implemented in the production-shaped candidate. Stages 8–10 are implemented in the controlled AUTO benchmark adapter using the already-controlled qualification math helpers.

Stage 8 calculates the errata fatigue-life chain from configured A/S/B and the selected FLM1 branch. Stage 9 keeps the line result separate when the worked example does not expose enough information to derive it from a single discontinuity. Stage 10 is benchmark-comparison-only and emits no universal operating/design classification.

## D.2.3 full product-path validation

Machine-readable validation record:

```text
docs/vibration/validation/AIV-D2.3-Product-Path-Validation-v1.json
blob 6d3cd2f7d71ab47d2825d802628f18c0782ffdc7
validated code commit 64485a51ffe78102ba3b966d43ba68e13f511130
```

Readable step-by-step record:

```text
docs/vibration/AIV-D2.3-Product-Path-Validation-v1.md
```

Validation result:

```text
AivProductPathBenchmarkParityReceipt.v1
status = PASS
22 checks
22 passed
0 failed
completeKernelStageCount = 10
resultContractsValidated = true
sourceAssessmentLineScopesValidated = true
```

Representative results:

```text
Relief raw PWL           164.6851759525391 dB
Recycle raw PWL          159.36481554007995 dB
Recycle effective PWL    129.36481554007995 dB
Attenuation                0.3116883116883117 dB
First-point PWL          164.3734876408508 dB
log10(N)                   9.902567870507482
N                          7.990388037921443E9
Dext/dext                  2.7910447761194033
FLM1 selected              1.2133
FLM1 recalculated          1.2109758194311824
FLM2                       0.2009306328510857
N after FLM1               9.694737806410088E9
N after FLM2               1.9479698027673252E9
Lf                         0.31287602368755874
Assessment LOF             0.29
Configured line LOF        1.48
```

The displayed-input FLM1 variance is `0.0023241805688176687`, within the configurable benchmark tolerance `0.0024`.

## AUTO stage plan

```text
16B.1 stages 1–7 candidate                         COMPLETE
16B.2 assumptions + stages 8–10 configuration      COMPLETE
16B.3 stages 8–10 implementation                   COMPLETE
17     D.2.3 Source/Assessment/Line validation      COMPLETE / PASS
18     benchmark result detail + assumptions/export NEXT
19     exact-head validation + BENCHMARK_ONLY       BLOCKED_BY_STAGE_18
20     SCREENING machine qualification              FUTURE
```

`AivAutoStagePlan.v1` drives the sequence. AUTO stops only on:

```text
INVALID_ASSUMPTION_PROFILE
MACHINE_BENCHMARK_PARITY_FAILURE
PRODUCT_PATH_BENCHMARK_PARITY_FAILURE
EXACT_HEAD_VALIDATION_FAILURE
```

## Stage 18 — next

Wire the validated calculated benchmark data into the operator workspace:

```text
Source Results
Assessment Results
Line / Case Summary
Calculation detail
Assumption trace
Validation receipt
Export package
```

The UI must remain equation-free; it displays kernel outputs and assumptions only.

## Stage 19 — BENCHMARK_ONLY release

`AivReleasePlan.v2` requires four machine/configuration artifacts:

```text
1. AivQualificationParityManifest.v1
2. AivAssumptionProfileValidation.v1
3. AivBenchmarkKernelQualification.v2 — PASS / 10-stage product path
4. AivReleaseValidationReceipt.v1 — exact-head node/browser execution PASS
```

No human reviewer artifact is required.

Repository Actions jobs that receive no runner/steps remain `NOT_RUN`; they are not release validation receipts.

When the four gates pass, a separate explicit transition may change the method to BENCHMARK_ONLY. That transition does not grant SCREENING or design authority.

## Stage 20 — SCREENING

SCREENING is a later independent machine-qualification program. It must cover project input domains, single/batch parity, line/case behavior, applicability boundaries, result/export behavior and exact-head validation.

`designAuthority=false` remains the product boundary.

## Permanent application boundary

```text
Advanced_Analysis:
AUTHOR -> EDIT -> VALIDATE -> CERTIFY -> EXPORT

3D_Converters / AIV:
IMPORT -> VERIFY -> JOIN -> ASSESS -> EXPLAIN
```

No 3D viewer, free-form topology authoring, pixel-derived AIV distance, click-on-model calculation workflow, or geometry writeback is introduced by AIV.
