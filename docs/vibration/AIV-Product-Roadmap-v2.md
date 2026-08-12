# AIV Product Roadmap v3 — AUTO Benchmark Progression

## Purpose

This roadmap defines the automatic implementation and release sequence for `VIB.AIV.ACOUSTIC` from the controlled Energy Institute worked examples.

Current authority remains:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

The implementation workflow is now **AUTO**. Human evidence/reviewer artifacts are not prerequisites for implementation, qualification, or BENCHMARK_ONLY release.

## AUTO policy

```text
missing engineering input
  → use visible AivAssumptionProfile.v1 value
  → record the assumed cell/path/value
  → user may edit assumption in UI
  → explicit table value always overrides assumption
  → continue machine qualification
```

AUTO stops only for:

```text
INVALID_ASSUMPTION_PROFILE
MACHINE_BENCHMARK_PARITY_FAILURE
PRODUCT_PATH_BENCHMARK_PARITY_FAILURE
EXACT_HEAD_VALIDATION_FAILURE
```

No `HUMAN_REVIEW_REQUIRED` stop exists.

## Controlled example basis

Readable worked-example source:

```text
3D_Converters
commit 8f243592d73ccf4790d9e308a311003ce7d8f5bb
docs/Energy-Institute-AVIFF---Worked-Examples.md
blob 9f22d92eba8bdf3b67adc25a4c77a7f7d7211da8
```

Derived from the pinned Common DOCX at commit `fb549185b9b27edc2379734240320a85c5bef9f6`, blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`.

Corroborating binary example source:

```text
EI examples.pdf
blob 1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec
```

Main EI T2.7 guidance and errata remain source traceability. If a generic method input/rule is not completely available, AUTO does not invent a hidden value: it exposes the missing value as a configurable assumption and qualifies the configured path against benchmarks.

## Product result scopes

The result model stays separated:

```text
SOURCE
  rawSourcePwlDb
  sonicFlowFactorDb
  trimReductionDb
  effectiveSourcePwlDb

ASSESSMENT
  source contributions at point
  combinedPointPwlDb
  configured T2-6 benchmark chain
  assessment LOF

LINE_CASE_SUMMARY
  line/case aggregation
  line-level benchmark comparison
```

D.2.3 first-discontinuity `LOF=0.29` and worked-example relief-line `LOF=1.48` are different result objects and are never interchangeable.

## Input ownership

```text
AivSourceCsv.v2
  key = Source Canonical ID + Operating Case

AivAssessmentCsv.v1
  key = Assessment Canonical ID

AivSourceAssessmentCsv.v1
  key = Source + Assessment + Operating Case
```

Topology is identity/connectivity evidence only. AIV physical distance is a table input or visible assumption; it is never derived from SVG/pixels/presentation geometry.

## Configurable assumption profile

`AivAssumptionProfile.v1` is the AUTO missing-data policy.

### Source defaults

Includes user-editable:

```text
source device type/state/phase
mass flow + unit
P1/P2 + units + pressure basis
reference pressure
upstream temperature
molecular weight
trim state/reduction
sonic state
```

### Assessment defaults

Includes user-editable:

```text
assessment type
main OD / ID / wall
branch OD / wall
material
duplex state
```

### Relationship defaults

Includes user-editable:

```text
physical distance + unit
simultaneous-source group
applicability disposition
```

### Identity/provenance defaults

AUTO creates deterministic IDs when rows/cells are missing:

```text
source ID prefix
assessment ID prefix
relationship record prefix
case ID prefix
assumption provenance source/revision
```

### Stages 8–10 benchmark configuration

The UI exposes:

```text
stage8Model = CONFIGURED_D23_INTERMEDIATES
A = 0.93989
S = 68.229
B = 152.207
FLM1 mode = PUBLISHED | RECALCULATED
FLM1 published = 1.2133
FLM1 recalculated = 1.2109758194311824
FLM1 tolerance
FLM2 = 0.2009
loss factor Lf = 0.31
LOF comparison tolerance
D.2.3 assessment LOF reference = 0.29
worked-example line LOF reference = 1.48
line aggregation mode = SEPARATE_RESULT_SCOPES
assessment mode = BENCHMARK_COMPARE_ONLY
```

These values are explicit benchmark parameters, not hidden generic screening equations.

## Operator workflow

```text
Load controlled EI benchmark or project topology/data
        ↓
AUTO fill missing cells from visible assumptions
        ↓
Edit Sources / Assessments / Source→Assessment as needed
        ↓
Check readiness
        ↓
AUTO machine qualification
        ↓
Run BENCHMARK_ONLY product path when complete
        ↓
Source Results
        ↓
Assessment Results
        ↓
Line / Case Summary
        ↓
Assumption + calculation detail + provenance + export
```

Explicit user table values always override assumptions.

## Machine benchmark basis

### D.2.3 source/path values

```text
Relief raw source PWL       164.6851759525391 dB
Recycle raw source PWL      159.36481554007995 dB
Recycle effective PWL       129.36481554007995 dB
Relief attenuation            0.3116883116883117 dB
Relief point PWL             164.3734876408508 dB
log10(N)                       9.902567870507482
N                              7.990388037921443E9
```

FLM1 branches remain explicit configuration choices:

```text
PUBLISHED     1.2133
RECALCULATED  1.2109758194311824
```

Both known D.2.3 chains lead to benchmark final `LOF=0.29` within the configured comparison tolerance.

### Independent vectors

```text
sonic SFF=6:
  156.72433464037815 dB + 6 dB = 162.72433464037815 dB

160 + 160 dB = 163.0102999566398 dB
160 + 150 dB = 160.41392685158226 dB
```

These are machine qualification vectors. No named human acceptance is required.

## AUTO stage plan

Implemented in:

```text
converters/vibration/aiv/aiv-auto-stage-plan.js
AivAutoStagePlan.v1
mode = AUTO
```

Current sequence:

| Stage | AUTO work | Current status |
|---|---|---|
| 1–16A | source/trace/UI/result-shell/benchmark foundation | COMPLETE |
| 16B.1 | product-shaped stages 1–7 candidate | COMPLETE |
| 16B.2 | assumption profile + stage 8–10 configuration | COMPLETE |
| **16B.3** | **implement stages 8–10 from configured benchmark assumptions** | **NEXT** |
| 17 | run complete D.2.3 through Source/Assessment/Line product path; produce parity receipt | BLOCKED_BY_PREVIOUS_STAGE |
| 18 | wire benchmark result detail, assumption trace and export | BLOCKED_BY_PREVIOUS_STAGE |
| 19 | exact-head validation + BENCHMARK_ONLY transition | BLOCKED_BY_PREVIOUS_STAGE |
| 20 | SCREENING machine-qualification program | FUTURE |

Default `AivAutoStagePlan.v1` therefore returns:

```text
nextStageId = 16B.3
nextAction  = IMPLEMENT_STAGES_8_TO_10
```

## Stage 16B.3 implementation rule

Stages 8–10 may now be implemented without any human gate.

```text
8 CALCULATE_DISCONTINUITY_RESULT
  use configured D.2.3 benchmark parameters
  expose every parameter in assumption trace
  compare against assessment benchmark

9 AGGREGATE_LINE_CASE_RESULT
  preserve ASSESSMENT vs LINE_CASE_SUMMARY scope separation
  never infer line LOF from one first-discontinuity LOF

10 ASSESS_RESULT
  BENCHMARK_COMPARE_ONLY
  report calculated/reference/delta/tolerance
  do not emit universal safe/pass/design classification
```

Generic SCREENING rules outside the benchmark envelope are deferred to Stage 20 and will also be machine-qualified with explicit assumptions/configuration where source data is incomplete.

## BENCHMARK_ONLY release gates

`AivReleasePlan.v2` requires four SHA-bound machine/configuration artifacts:

```text
1. AivQualificationParityManifest.v1
2. AivAssumptionProfileValidation.v1
3. AivBenchmarkKernelQualification.v2 — complete 10-stage product-path PASS
4. AivReleaseValidationReceipt.v1 — exact-head node/browser PASS
```

There is no independent-engineer/reviewer release gate.

Allowed release progression remains:

```text
BLOCKED
  ↓
BENCHMARK_ONLY
  ↓
SCREENING
```

Direct `BLOCKED → SCREENING` remains forbidden because BENCHMARK_ONLY is the product-path proving phase, not because a human signature is required.

## Stage 17 acceptance

The same real product path used for BENCHMARK_ONLY must reproduce the controlled examples through the frozen result contracts:

```text
AivSourceResult.v1
AivAssessmentResult.v1
AivLineCaseSummary.v1
AivResultSet.v1
```

Required parity receipt:

```text
AivProductPathBenchmarkParityReceipt.v1
status = PASS
completeKernelStageCount = 10
resultContractsValidated = true
sourceAssessmentLineScopesValidated = true
```

## Stage 18 UI/export target

For each result show:

```text
INPUTS
ASSUMPTIONS USED
SOURCE PWL
PATH / ATTENUATION
DISCONTINUITY BENCHMARK CHAIN
RESULT SCOPE
BENCHMARK REFERENCE
DELTA / TOLERANCE
PROVENANCE
```

Assumptions must be exported with results. The UI never contains numerical AIV equations.

## Stage 19 release target

When product-path parity passes, run exact-head validation:

```text
focused node tests
controlled benchmark parity
browser workspace benchmark smoke
module-boundary checks
```

A job with no runner/steps is `NOT_RUN`, never PASS.

After a valid exact-head PASS, AUTO marks the BENCHMARK_ONLY transition `READY`.

## Stage 20 — SCREENING

SCREENING is a separate later machine-qualification program after BENCHMARK_ONLY. It must qualify the intended applicability domain, single/batch parity, aggregation behavior, assumption policy and product-path results.

```text
designAuthority = false
```

remains permanent for this release roadmap.

## Release quality targets

```text
hidden engineering defaults         0
untracked assumed cells             0
UI-side AIV equations               0
source/assessment scope ambiguity   0
accepted identity ambiguity         0
D.2.3 benchmark parity              100% within configured tolerance
sonic benchmark parity              100%
multi-source benchmark parity       100%
complete 10-stage product path      PASS
exact-head validation               PASS
```

## Permanent product boundary

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

No 3D viewer, free-form topology canvas, geometry authoring runtime, click-on-model calculation flow, or geometry writeback belongs in the AIV product.
