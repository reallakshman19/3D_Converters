# PR446 Work Report

## Mission Control

```text
Mission               Complete AIV AUTO release through assessment-level SCREENING
Issue                  #441
PR                     #446
Branch                 agent/aiv-kernel-contract-scaffold
Mode                   AUTO
Human evidence         NOT REQUIRED
Central kernel         10-stage calculateAiv
D.2.3 product path     PASS — 22 / 22 checks
Stage 19               COMPLETE — BENCHMARK_ONLY exact-source local validation PASS
Stage 20               COMPLETE — SCREENING 8 / 8 machine groups PASS
Current authority      IMPLEMENTED / SCREENING
Screening scope        ASSESSMENT
Line summary authority NON-AUTHORITATIVE
Design authority       false
Repository Actions     NOT_RUN — hosted jobs still receive no runner/steps due budget
```

## Current product authority

```text
calculationState      = IMPLEMENTED
qualificationState    = SCREENING
engineeringAuthority  = SCREENING
productionEquationAuthorized = true
screeningAuthority    = AUTHORIZED
screeningResultScope  = ASSESSMENT
designAuthority       = false
```

The configured line/case summary does not carry screening authority.

## Central kernel

Created:

```text
converters/vibration/aiv/aiv-calculator.js
```

The complete method path is:

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

The D.2.3 validation wrapper now delegates to this calculator. Same-kernel batch execution is provided by:

```text
converters/vibration/aiv/aiv-batch.js
```

Screening exports are produced by:

```text
converters/vibration/aiv/aiv-screening-export.js
AivScreeningExportPackage.v1
```

## D.2.3 benchmark result

Machine-readable parity:

```text
docs/vibration/validation/AIV-D2.3-Product-Path-Validation-v1.json
status PASS
22 / 22 checks
```

Representative numerical chain:

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
FLM1 variance              0.0023241805688176687 <= 0.0024
FLM2                       0.2009306328510857
N after FLM1               9.694737806410088E9
N after FLM2               1.9479698027673252E9
Lf                         0.31287602368755874
Assessment LOF             0.29
Configured line LOF        1.48
```

Scope invariant:

```text
0.29 -> ASSESSMENT screening candidate/result
1.48 -> LINE_CASE_SUMMARY configured reference only
```

## Stage 19 — BENCHMARK_ONLY

Normal networked `git clone` is unavailable in the execution container because GitHub DNS is unavailable. The local validation therefore reconstructed the required AIV source bundle from GitHub connector contents and verified every executed/scanned repository file against its exact Git blob SHA-1 before execution.

Post-registration candidate head validated:

```text
32a0c4962d74940b9cded8709eb2b83a68c006ad
```

Evidence:

```text
docs/vibration/validation/AIV-BENCHMARK-ONLY-ReleaseValidationRecord-v1.json
docs/vibration/validation/AIV-BENCHMARK-ONLY-ReleaseValidationReceipt-v1.json
```

Four groups passed:

```text
AIV_FOCUSED_NODE_TESTS              PASS
AIV_CONTROLLED_BENCHMARK_PARITY     PASS
AIV_BROWSER_WORKSPACE_SMOKE         PASS
AIV_MODULE_BOUNDARY_CHECK           PASS
```

The AIV placeholder was removed from pending definitions and a dedicated Engineering Calculation adapter was registered.

## Stage 20 — SCREENING

Screening candidate exact head validated:

```text
613e1ec48335db3794e5208b0c3435d387683b04
```

Evidence:

```text
docs/vibration/validation/AIV-SCREENING-ReleaseValidationRecord-v1.json
docs/vibration/validation/AIV-SCREENING-ReleaseValidationReceipt-v1.json
```

All eight required groups passed locally:

```text
AIV_FOCUSED_NODE_TESTS                  PASS
AIV_CONTROLLED_BENCHMARK_PARITY         PASS
AIV_BROWSER_WORKSPACE_SMOKE             PASS
AIV_MODULE_BOUNDARY_CHECK               PASS
AIV_REAL_PRODUCT_PATH_PARITY            PASS
AIV_SINGLE_BATCH_PARITY                 PASS
AIV_PROJECT_INPUT_BROWSER_FLOW          PASS
AIV_EXPORT_PROVENANCE                   PASS
```

Latest rerun summary remained PASS with:

```text
benchmark checks         22 / 22
screening scope          ASSESSMENT
line summary authority   false
blank-project assumptions 56
same-kernel batch        true
designAuthority          false
```

Local Stage-20 summary log SHA-256:

```text
5e4bd1dea51df13b7444d8147f71498fc238cb200fe9739458dcc8fe55eef76f
```

## Project-input defect found and fixed

The blank-project screening qualification found that optional Branch Wall Thickness could receive an assumed unit without a value. The strict parser correctly rejected the orphan unit.

Fix:

```text
assessment.branchWallThicknessUnit default
'mm' -> ''
```

Optional value/unit now stay blank together. The complete eight-group suite passed after the fix.

## Screening authority transition

After the screening receipt was generated, a separate code change updated the Engineering Calculation adapter to:

```text
calculationState = IMPLEMENTED
qualificationState = SCREENING
requiredQualificationMode = screening
```

The adapter permits explicit `benchmark` and `screening` execution modes. Screening results declare:

```text
resultScope = ASSESSMENT_SCREENING
screeningAuthority = AUTHORIZED
lineCaseSummaryAuthoritativeForScreening = false
designAuthority = false
```

## Operator workspace

The workspace now provides:

```text
Load/import working inputs
Visible/editable assumption profile
Check AIV readiness
Run AIV screening
Source results
Assessment screening results
Non-authoritative line/case summary
Export screening result with provenance/assumption trace
```

UI screening execution routes through `calculateEngineering({ calculationId: 'VIB.AIV.ACOUSTIC', ... })`; equations are not duplicated in UI code.

Explicit SONIC is now accepted by readiness because the SFF=6 branch is machine-qualified. `UNRESOLVED` sonic state remains fail-closed.

## Regression coverage

Added:

```text
tests/vibration-aiv-screening-release.test.mjs
npm run verify:aiv-screening-release
```

Coverage locks:
- AIV is active `SCREENING`, not pending;
- D.2.3 assessment result remains 0.29;
- line 1.48 is non-authoritative for screening;
- same-kernel single/batch parity;
- blank project assumption resolution;
- explicit override precedence;
- export provenance;
- SONIC readiness / unresolved fail-closed behavior;
- UI routes through Engineering Calculation API.

## AUTO stage state

```text
16B.1 COMPLETE
16B.2 COMPLETE
16B.3 COMPLETE
17     COMPLETE / PASS
18     COMPLETE
19     COMPLETE
20     COMPLETE
```

There is no remaining AUTO release stage in this program.

## CI status

GitHub Actions is still infrastructure-blocked. Hosted jobs report zero steps / runner_id=0 with the platform annotation:

```text
The job was not started because an Actions budget is preventing further use.
```

Treat GitHub Actions as `NOT_RUN`; do not reinterpret it as a code test failure or PASS.

## Remaining boundaries

```text
screeningAuthority = AUTHORIZED for ASSESSMENT results only
designAuthority = false
line/case configured result = non-authoritative for screening
no geometry writeback
no pixel-derived distance
no hidden assumptions
```
