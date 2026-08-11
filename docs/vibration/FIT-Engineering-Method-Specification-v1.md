# FIT Engineering Method & API Qualification Specification v1

Status: **BENCHMARK REFERENCE — NOT QUALIFIED FOR SCREENING OR DESIGN**

Calculation family: Vibration & Dynamic Screening  
Stable public calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Canonical mechanism: **Flow-Induced Turbulence (FIT)**  
Qualification issue: #429  
Engineering method revision: `ei-aviff2-fit-reference-v2`

## 1. Purpose and authority

This specification controls the deterministic FIT reference implementation used for migration, qualification and benchmark comparison. It combines the retained CRF-4-1 workbook formula chain with independent Energy Institute second-edition worked examples supplied by the owner.

It does **not** grant production screening or design authority. Execution remains `BENCHMARK_ONLY`; strict/screening execution must fail closed until issue #429 is independently approved.

| Label | Meaning |
|---|---|
| `WORKBOOK_REFERENCE_ONLY` | retained-workbook migration provenance |
| `EI_WORKED_EXAMPLE_BENCHMARK` | independent EI example evidence |
| `BENCHMARK_ONLY` | executable for qualification/comparison only |
| `SCREENING` | not authorized |
| `DESIGN` | not authorized |

## 2. Controlled sources

### 2.1 Retained workbook

```text
Repository: reallaksh19/CRF-4-1
Commit:     68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Path:       Extended calc2/AIV FIV/FIT.xlsm
Git blob:   d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
Size:       493650 bytes
Sheet:      Flow Induced Turbulence
Worksheet:  xl/worksheets/sheet13.xml
Extraction: 114139 XML bytes / 155 formula cells
```

The duplicate KS-PR-CAL-0086 path is the same blob and therefore not an independent source.

### 2.2 EI worked examples

```text
Repository: reallaksh19/Common
Commit:     aef163a5def3bfe04ca0ba860da05728a27daf42
Path:       EI - AVIFF Guidelines 2nd Edition_Examples.pdf
Git blob:   3e2517d0df527a051084fc02e69cb7afa31f8d47
Size:       3757439 bytes
Edition:    2nd Edition, January 2008
Relevant:   Appendix D Examples D2 and D4
```

Only minimum benchmark facts needed for qualification are stored in `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`.

## 3. Method boundary

### FIT-APP-001 — mechanism

Scope is main-line **Flow-Induced Turbulence** only. Do not reuse this empirical authority for FIP/dead-leg pulsation, AIV, SBC, cavitation/flashing, surge, slug/time-history, mechanical excitation or VIV.

### FIT-APP-002 — outside-diameter envelope

```text
60 mm <= Dext <= 762 mm
```

The upper limit is controlled source material; the lower boundary follows the controlled correlation families and remains subject to final engineering review.

### FIT-APP-003 — medium/flexible diameter families

```text
SMALL: Dext <= 219.1 mm
LARGE: Dext >= 273 mm
```

EI D4 independently confirms the 273 mm flexible-large case.

The unresolved manual region:

```text
219.1 mm < Dext < 273 mm
```

fails closed. No interpolation, nearest-size choice or hidden nominal-size assumption is allowed.

### FIT-APP-004 — advanced reference calculation

All conditions are required:

```text
support = FLEXIBLE_SMALL or FLEXIBLE_LARGE
standard LOF >= 1
actual natural frequency supplied
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is excluded; exactly 3 Hz is included. Cached 4 Hz workbook behavior is not reproduced.

### FIT-APP-005 — phases

```text
LIQUID
GAS
MULTIPHASE
```

The FIT method consumes resolved density/velocity. Mass flow is a resolver input, not a hidden method requirement when authoritative velocity is supplied.

### FIT-APP-006 — multiphase resolution contract

Supported modes:

```text
AGGREGATE_EFFECTIVE
COMPONENT_DERIVED
```

`AGGREGATE_EFFECTIVE` uses effective density plus effective velocity, or effective density plus aggregate mass flow to derive velocity.

`COMPONENT_DERIVED` uses gas and liquid aggregate mass-flow/density pairs to derive component volumetric flows, total velocity and mixture density. An explicit velocity override may be used with component-derived density.

Mode selection rules:

```text
only aggregate data shape present   -> AGGREGATE_EFFECTIVE / INFERRED
only component data shape present   -> COMPONENT_DERIVED / INFERRED
both shapes + no mode               -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + explicit aggregate mode      -> AGGREGATE_EFFECTIVE / EXPLICIT
both + explicit component mode      -> COMPONENT_DERIVED / EXPLICIT
invalid explicit mode               -> FIT_INPUT_INVALID
explicit mode missing required data -> fail closed on required fields
```

This rule prevents merged HMB/table datasets from silently choosing one process interpretation.

## 4. Canonical domain inputs

External quantities are normalized to canonical SI by the central Engineering Calculation unit resolver before the empirical correlation executes.

| Field | Required | Unit | Meaning |
|---|---:|---|---|
| `phase` | yes | enum | `LIQUID`, `GAS`, `MULTIPHASE` |
| `multiphaseResolutionMode` | conditional | enum | explicit mode when both multiphase data shapes coexist |
| `outsideDiameterM` | yes | m | external pipe diameter |
| `wallThicknessM` | yes | m | wall thickness used by D/T correlation |
| `insideDiameterM` | optional | m | authoritative ID; otherwise OD - 2T |
| `maximumUnsupportedSpanM` | yes | m | maximum effective unsupported span |
| `massFlowKgS` | conditional | kg/s | single-phase or aggregate mass flow if velocity not supplied |
| `densityKgM3` | conditional | kg/m3 | single-phase density or effective multiphase density |
| `gasDynamicViscosityPaS` | gas | Pa.s | gas dynamic viscosity |
| `gasMassFlowKgS` | component multiphase | kg/s | gas mass flow |
| `gasDensityKgM3` | component multiphase | kg/m3 | gas density |
| `liquidMassFlowKgS` | component multiphase | kg/s | aggregate liquid mass flow |
| `liquidDensityKgM3` | component multiphase | kg/m3 | aggregate liquid density |
| `fluidVelocityMS` | optional | m/s | authoritative/effective velocity override |
| `naturalFrequencyHz` | advanced only | Hz | actual main-line natural frequency |

No engineering input has a default.

## 5. Native empirical unit basis

```text
Dext : mm
T    : mm
Lspan: m
mu   : Pa.s
rho  : kg/m3
V    : m/s
fn   : Hz
Fv   : Pa
LOF  : dimensionless
```

Do not rewrite empirical coefficients into another unit basis without a separately qualified revision.

## 6. Equation register

### FIT-EQ-001 — internal flow area

```text
A = pi * Dint^2 / 4
```

### FIT-EQ-002 — volumetric flow

```text
Q = m_dot / rho
```

Component multiphase:

```text
Qtotal = Qgas + Qliquid
```

### FIT-EQ-003 — velocity

```text
V = Q / A
```

An authoritative/effective velocity may be supplied directly. Provenance identifies caller override versus derived velocity.

### FIT-EQ-004 — single-phase / aggregate-effective excitation

```text
rhoV2 = rho * V^2
```

### FIT-EQ-005 — component-derived multiphase density

```text
rho_effective = (m_dot_g + m_dot_l) / (Qg + Ql)
```

### FIT-EQ-006 — component-derived multiphase excitation

```text
rhoV2 = rho_effective * V^2
```

### FIT-EQ-007 — gas fluid-viscosity factor

```text
FVF = sqrt(mu_gas / 0.001 Pa.s)
```

Liquid/multiphase use `FVF = 1`.

### FIT-EQ-008..010 — span/stiffness boundaries

With `D = Dext_mm`:

```text
L_stiff        = -0.000012346 D^2 + 0.020000 D + 2.0563
L_medium_stiff = -0.000011886 D^2 + 0.025262 D + 3.3601
L_medium       = -0.000015968 D^2 + 0.033583 D + 4.429
```

```text
Lspan <= L_stiff                   -> STIFF
L_stiff < Lspan <= L_medium_stiff  -> MEDIUM_STIFF
L_medium_stiff < Lspan <= L_medium -> MEDIUM
Lspan > L_medium                   -> FLEXIBLE
```

### FIT-EQ-011 — standard correlation families

With `D = Dext_mm`:

```text
STIFF:
  a = 446187 + 646D + 0.000917D^3
  b = 0.1ln(D) - 1.3739

MEDIUM_STIFF:
  a = 283921 + 370D
  b = 0.1106ln(D) - 1.501

MEDIUM_LARGE:
  a = 150412 + 209D
  b = 0.0815ln(D) - 1.3269

MEDIUM_SMALL:
  a = 13.1 - 0.00475D + 0.0000141D^2
  b = -0.132 + 0.000228D - 0.000000372D^2

FLEXIBLE_LARGE:
  a = 41.21D + 49397
  b = 0.0815ln(D) - 1.3842

FLEXIBLE_SMALL:
  a = 0.0000132D^2 - 0.00442D + 12.22
  b = 0.000284D - 0.000000462D^2 - 0.164
```

### FIT-EQ-012 — standard Fv

Power-form families:

```text
Fv = a * (D/T)^b
```

Small medium/flexible exponential families:

```text
Fv = exp(a * (D/T)^b)
```

### FIT-EQ-013 — standard LOF

```text
LIQUID:     LOF = rhoV2 / Fv
GAS:        LOF = rhoV2 * FVF / Fv
MULTIPHASE: LOF = rhoV2 / Fv
```

### FIT-EQ-014 — advanced Flexible-Small

```text
a = (0.000013175D^2 - 0.0044213D + 12.217) * (0.0529ln(fn) + 1)
b = (-0.0000004622D^2 + 0.0002835D - 0.164) * (-0.1407ln(fn) + 1)
Fv_advanced = exp(a * (D/T)^b)
```

### FIT-EQ-015 — advanced Flexible-Large

```text
a = (41.21D + 49397) * fn^(0.0001665D + 0.84615)
b = 0.0815ln(D) - 1.3842 + 0.0191(fn - 1)
Fv_advanced = a * (D/T)^b
```

### FIT-EQ-016 — refined LOF

```text
LOF_refined = demand / Fv_advanced
```

## 7. Constants and reference bands

```text
FIT-CONST-001: mu_ref = 0.001 Pa.s
FIT-CONST-002: reference LOF threshold = 1
```

Neutral EI reference bands:

```text
LOF < 0.3         -> LOF_LT_0_3
0.3 <= LOF < 0.5 -> LOF_0_3_TO_LT_0_5
0.5 <= LOF < 1   -> LOF_0_5_TO_LT_1
LOF >= 1          -> LOF_GE_1
```

These are benchmark/workflow bands, not probabilities and not production pass/fail authority.

## 8. Assessment register

Benchmark assessments never contain a production `pass` boolean.

```text
standard LOF < 1:
  REFERENCE_BELOW_THRESHOLD

valid advanced path and refined LOF < 1:
  REFERENCE_BELOW_THRESHOLD_AFTER_ADVANCED

standard/refined LOF >= 1 or no valid advanced path:
  REFERENCE_FURTHER_ENGINEERING_ASSESSMENT_REQUIRED
```

`referenceBand` is based on the LOF actually used by the assessment.

## 9. Source/API dispositions

### ISS-009 / ISS-012 — frequency boundary

Resolved in software: `1 < fn <= 3`. Retained cached 4 Hz advanced behavior is rejected.

### ISS-010 — support selector mismatch

Resolved in software: support is derived from span equations; stale hidden selector state is not authority.

### ISS-013 — 273 mm boundary

Resolved in software and EI D4 regression: `Dext >= 273 mm` enters the large medium/flexible family.

### ISS-016 — mixed multiphase input ambiguity

Resolved in software: when aggregate and component multiphase data coexist, an explicit `multiphaseResolutionMode` is mandatory. Without it, validation returns `FIT_MULTIPHASE_INPUT_AMBIGUOUS`.

### QST-003 — remaining diameter gap

`219.1 < Dext < 273 mm` remains fail-closed pending an authoritative mapping/exclusion decision.

## 10. Benchmark register

- Retained workbook parity: migration/source-transcription evidence.
- `fit-independent-hand-benchmarks-v1.json`: independent software arithmetic evidence.
- `fit-ei-worked-examples-v1.json`: independent EI D2/D4 example evidence.

Current focused EI regression after Stage 12 hardening:

```text
12 tests / 12 PASS
```

The five published EI D2/D4 numerical cases are unchanged by the resolution-contract hardening.

## 11. API/result evidence requirements

Results keep these concepts separate:

```text
applicability
hydraulics
excitation
support
standard correlation
advanced eligibility/result
assessment/referenceBand
qualification
provenance
evidence
```

For multiphase results, evidence contains:

```text
inputResolution.multiphaseResolutionMode
inputResolution.selection = INFERRED | EXPLICIT
inputResolution.alternateModeDataPresent
```

When both data shapes are supplied with an explicit mode, `alternateModeDataPresent = true` records that non-selected engineering data were present but intentionally not used.

Minimum authority remains:

```text
qualificationState   = BENCHMARK_ONLY
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
qualificationIssue   = 429
```

## 12. Gate for future SCREENING authority

Promotion is not permitted until:

1. EI worked-example regression remains PASS;
2. independent hand benchmark regression passes in the complete checkout;
3. full central API/Console/batch regression passes;
4. mixed multiphase ambiguity/explicit-mode cases pass through the central API;
5. every applicable method/application item is independently reviewed against the adopted EI/project basis and errata;
6. QST-003 is authoritatively resolved or explicitly excluded from screening scope;
7. missing-data, units, phase, threshold and support-boundary cases pass;
8. an identified vibration engineer records approval and limitations under issue #429.

Until then, FIT remains `BENCHMARK_ONLY`.
