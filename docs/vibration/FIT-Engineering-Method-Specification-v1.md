# FIT Engineering Method & API Qualification Specification v1

Status: **BENCHMARK REFERENCE — NOT QUALIFIED FOR SCREENING OR DESIGN**

Calculation family: Vibration & Dynamic Screening  
Stable public calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Canonical mechanism: **Flow-Induced Turbulence (FIT)**  
Qualification issue: #429  
Reference implementation revision: `ei-aviff2-fit-reference-v2`

## 1. Purpose and authority

This specification controls the deterministic FIT reference implementation used for migration, qualification and benchmark comparison. It combines:

1. the retained CRF-4-1 FIT workbook and its extracted formula chain; and
2. independent Energy Institute second-edition worked examples supplied in `reallaksh19/Common`.

It does **not** grant production screening or design authority. Execution remains `BENCHMARK_ONLY`; strict/screening execution must fail closed until issue #429 is independently approved.

Authority labels:

| Label | Meaning |
|---|---|
| `WORKBOOK_REFERENCE_ONLY` | retained-workbook migration provenance |
| `EI_WORKED_EXAMPLE_BENCHMARK` | independent EI published example evidence |
| `BENCHMARK_ONLY` | executable for qualification/comparison only |
| `SCREENING` | not authorized by this specification |
| `DESIGN` | not authorized |

## 2. Controlled sources

### 2.1 Retained workbook

| Property | Value |
|---|---|
| Repository | `reallaksh19/CRF-4-1` |
| Commit | `68dc8e1fa2ef67073c59b3afc56f1bf40953d535` |
| Path | `Extended calc2/AIV FIV/FIT.xlsm` |
| Duplicate path | `Enhanced stress report/extended calc/KS-PR-CAL-0086 Vibration Assessment - Flow Induced Turbulence Calculation.xlsm` |
| Git blob | `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` |
| Size | 493,650 bytes |
| Calculation tab | `Flow Induced Turbulence` |
| Worksheet XML | `xl/worksheets/sheet13.xml` |
| Extracted XML | 114,139 bytes; 155 formula cells |

The two paths are the same Git blob and therefore one source artifact.

### 2.2 Energy Institute worked examples

| Property | Value |
|---|---|
| Repository | `reallaksh19/Common` |
| Commit | `aef163a5def3bfe04ca0ba860da05728a27daf42` |
| Path | `EI - AVIFF Guidelines 2nd Edition_Examples.pdf` |
| Git blob | `3e2517d0df527a051084fc02e69cb7afa31f8d47` |
| Size | 3,757,439 bytes |
| Edition | 2nd Edition, January 2008 |
| Relevant worked examples | Appendix D, Examples D2 and D4 |

The repository stores only the minimum benchmark inputs/printed outputs needed for qualification in `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`; it does not reproduce the licensed example document.

## 3. Method boundary

### FIT-APP-001 — mechanism

Scope is main-line **Flow-Induced Turbulence**. This kernel must not be reused as empirical authority for FIP/dead-leg pulsation, AIV, SBC, cavitation/flashing, surge, slug/time-history, mechanical excitation or VIV.

### FIT-APP-002 — outside-diameter envelope

Reference implementation boundary:

```text
60 mm <= Dext <= 762 mm
```

The upper limit is stated by the retained method material. The lower boundary follows the controlled correlation families and remains subject to final engineering review.

### FIT-APP-003 — medium/flexible diameter families

Controlled reference families:

```text
SMALL: Dext <= 219.1 mm
LARGE: Dext >= 273 mm
```

EI worked Example D4 explicitly evaluates a 273 mm flexible line with the large flexible correlation; therefore 273 mm is included in the large family.

The unresolved manual-diameter region remains:

```text
219.1 mm < Dext < 273 mm
```

and fails closed. No interpolation, nearest-size selection or hidden nominal-size assumption is authorized.

### FIT-APP-004 — advanced screening

Advanced reference calculation requires all of:

```text
support category is FLEXIBLE_SMALL or FLEXIBLE_LARGE
standard LOF >= 1
actual natural frequency is supplied
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is **not eligible**. Exactly 3 Hz is eligible. A retained cached workbook example at 4 Hz is rejected as inconsistent with the controlled EI method boundary.

### FIT-APP-005 — phases and process resolution

Reference phase values:

```text
LIQUID
GAS
MULTIPHASE
```

The method fundamentally consumes density and velocity. Mass-flow inputs are a deterministic resolver convenience, not a hidden method default.

Multiphase supports two explicit resolution modes:

- `AGGREGATE_EFFECTIVE`: authoritative effective density plus effective velocity, or effective density plus aggregate mass flow from which velocity is derived;
- `COMPONENT_DERIVED`: gas and liquid aggregate mass-flow/density pairs from which total volumetric flow, mixture density and velocity are derived.

If valid aggregate effective density plus velocity/mass-flow inputs are supplied, `AGGREGATE_EFFECTIVE` is selected explicitly and provenance reports that mode. Otherwise the component-derived route is required. No silent phase-property approximation is permitted.

## 4. Canonical domain inputs

All external quantities are normalized to canonical SI by the central Engineering Calculation unit resolver before the empirical method executes.

| Field | Required | Canonical unit | Meaning |
|---|---:|---|---|
| `phase` | yes | enum | `LIQUID`, `GAS`, `MULTIPHASE` |
| `outsideDiameterM` | yes | m | external pipe diameter |
| `wallThicknessM` | yes | m | wall thickness used in D/T correlations |
| `insideDiameterM` | optional | m | authoritative ID; otherwise derived OD - 2T |
| `maximumUnsupportedSpanM` | yes | m | maximum effective unsupported span |
| `massFlowKgS` | conditional | kg/s | single-phase or aggregate mass flow when velocity is not supplied |
| `densityKgM3` | conditional | kg/m3 | single-phase density or authoritative multiphase effective density |
| `gasDynamicViscosityPaS` | gas | Pa.s | gas dynamic viscosity |
| `gasMassFlowKgS` | component multiphase | kg/s | gas mass flow |
| `gasDensityKgM3` | component multiphase | kg/m3 | gas density |
| `liquidMassFlowKgS` | component multiphase | kg/s | aggregate liquid mass flow |
| `liquidDensityKgM3` | component multiphase | kg/m3 | aggregate liquid density |
| `fluidVelocityMS` | optional | m/s | authoritative/effective velocity override |
| `naturalFrequencyHz` | advanced only | Hz | actual main-line natural frequency |

No engineering input has a default.

## 5. Native empirical units

The empirical coefficients retain their controlled native basis:

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

Do not rewrite coefficient values into another unit basis without a separately benchmarked method revision.

## 6. Equation register

### FIT-EQ-001 — internal flow area

```text
A = pi * Dint^2 / 4
```

### FIT-EQ-002 — volumetric flow

```text
Q = m_dot / rho
```

For component-derived multiphase:

```text
Qtotal = Qgas + Qliquid
```

### FIT-EQ-003 — velocity

```text
V = Q / A
```

For `AGGREGATE_EFFECTIVE`, caller-supplied effective velocity may be used directly with provenance. If only aggregate mass flow and effective density are supplied, `Q = m_dot / rho_effective` and velocity is derived.

### FIT-EQ-004 — single-phase / aggregate-effective excitation

```text
rhoV2 = rho * V^2
```

### FIT-EQ-005 — component-derived multiphase effective density

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

For liquid and multiphase:

```text
FVF = 1
```

### FIT-EQ-008..010 — span/stiffness boundaries

With `D = Dext_mm`:

```text
L_stiff        = -0.000012346 D^2 + 0.020000 D + 2.0563
L_medium_stiff = -0.000011886 D^2 + 0.025262 D + 3.3601
L_medium       = -0.000015968 D^2 + 0.033583 D + 4.429
```

Classification:

```text
Lspan <= L_stiff                  -> STIFF
L_stiff < Lspan <= L_medium_stiff -> MEDIUM_STIFF
L_medium_stiff < Lspan <= L_medium -> MEDIUM
Lspan > L_medium                  -> FLEXIBLE
```

### FIT-EQ-011 — standard correlation coefficient families

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

Power-form families (`STIFF`, `MEDIUM_STIFF`, `MEDIUM_LARGE`, `FLEXIBLE_LARGE`):

```text
Fv = a * (D/T)^b
```

Exponential families (`MEDIUM_SMALL`, `FLEXIBLE_SMALL`):

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

where `demand` is the same phase-adjusted numerator used by FIT-EQ-013.

## 7. Constant and reference-band register

### FIT-CONST-001 — gas viscosity reference

```text
mu_ref = 0.001 Pa.s
```

### FIT-CONST-002 — advanced/reference threshold

```text
LOF_reference = 1
```

This threshold remains reference workflow information until bounded screening authority is approved.

### FIT-CONST-003 — EI reference LOF bands

Neutral benchmark bands retained from the EI worked-example workflow:

```text
LOF < 0.3        -> LOF_LT_0_3
0.3 <= LOF < 0.5 -> LOF_0_3_TO_LT_0_5
0.5 <= LOF < 1.0 -> LOF_0_5_TO_LT_1
LOF >= 1.0       -> LOF_GE_1
```

These are workflow/reference bands, not a universal probability scale and not a production `pass` boolean.

## 8. Assessment register

Benchmark assessment output must never expose a production `pass` boolean.

### FIT-ASS-001 — standard LOF below 1

```text
status = REFERENCE_BELOW_THRESHOLD
referenceBand = band(LOF_standard)
```

### FIT-ASS-002 — valid advanced reference path

```text
LOF_refined < 1  -> REFERENCE_BELOW_THRESHOLD_AFTER_ADVANCED
LOF_refined >= 1 -> REFERENCE_FURTHER_ENGINEERING_ASSESSMENT_REQUIRED
referenceBand = band(LOF_refined)
```

### FIT-ASS-003 — standard threshold reached without a valid advanced path

```text
LOF_standard >= 1
AND advanced path unavailable/not applicable
-> REFERENCE_FURTHER_ENGINEERING_ASSESSMENT_REQUIRED
```

All statuses retain reference-only authority.

## 9. Source inconsistency dispositions

### ISS-009 / ISS-012 — advanced-frequency boundary

Retained cache behavior includes an advanced calculation at 4 Hz and the earlier reference implementation treated exactly 1 Hz as eligible. The controlled EI boundary is:

```text
1 Hz < fn <= 3 Hz
```

Software disposition: **resolved** by enforcing the exclusive lower and inclusive upper boundary. Cached 4 Hz behavior is not reproduced.

### ISS-010 — hidden support selector mismatch

A retained cached example contains selector state inconsistent with its own span-derived stiffness.

Software disposition: **resolved** by deriving stiffness deterministically from FIT-EQ-008..010 and deriving correlation family from stiffness plus the controlled diameter family. Hidden selector state is not authority.

### ISS-013 — 273 mm large-family boundary

Earlier code began the large medium/flexible family at 273.05 mm. EI worked Example D4 uses 273 mm and evaluates a flexible large line.

Software disposition: **resolved** by including 273 mm in the large family.

### QST-003 — remaining manual-diameter gap

The region:

```text
219.1 mm < Dext < 273 mm
```

remains unresolved for manual medium/flexible inputs. It continues to fail closed pending an approved nominal-size mapping or governing-source rule.

## 10. Benchmark register

### 10.1 Retained-workbook parity

Retained gas and multiphase cases remain migration/source-transcription evidence only because cached workbook state contains known inconsistencies.

### 10.2 Independent hand-derived software cases

`Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json` validates equation transcription, threshold behavior, units, deterministic support classification and fail-closed cases without using cached workbook outputs as its oracle.

### 10.3 EI worked examples

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json` pins the supplied EI example source and checks printed Appendix D values with explicit rounding tolerance. Coverage includes:

- D2 gas compression: medium-stiff gas cases, viscosity factor, Fv and LOF;
- D4 separation: 508 mm stiff multiphase line using effective density/velocity;
- D4 produced water: 273 mm flexible-large line and LOF > 1;
- exact 1 Hz / 3 Hz advanced boundary behavior.

Worked examples validate the method slices they exercise. They do not by themselves prove the complete T2.2 applicability domain.

## 11. API/result requirements

A reference result keeps these concepts separate:

```text
applicability
hydraulics / resolutionMode
excitation / densitySource
support
standard correlation
advanced eligibility
advanced result
assessment / referenceBand
qualification
provenance
evidence
```

Minimum authority:

```text
qualificationState   = BENCHMARK_ONLY
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
qualificationIssue   = 429
```

Strict/screening execution must return `ENGINEERING_METHOD_NOT_QUALIFIED` with no outputs.

## 12. Qualification gate for future SCREENING authority

Promotion is not permitted until all applicable items are complete:

1. EI worked-example regression passes for controlled D2/D4 cases;
2. independent hand-derived benchmark regression passes;
3. full central API/Console/batch regression passes from a complete checkout;
4. every `FIT-APP-*`, `FIT-EQ-*`, `FIT-CONST-*`, and `FIT-ASS-*` item is reviewed against the licensed adopted EI/project basis and applicable errata;
5. QST-003 is either resolved with an authoritative nominal-size rule or explicitly excluded from screening applicability;
6. missing-data, unit-invariance, phase, threshold and support-boundary cases pass;
7. an identified vibration engineer records independent approval and limitations;
8. issue #429 records the resulting bounded authority decision.

Until then:

```text
calculationState     = IMPLEMENTED
qualificationState   = BENCHMARK_ONLY
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = NOT_AUTHORIZED
```
