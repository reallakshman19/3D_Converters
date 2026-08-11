# FIT Engineering Method & API Qualification Specification v1

Status: **WORKBOOK_REFERENCE_ONLY — NOT QUALIFIED FOR SCREENING OR DESIGN**

Calculation family: Vibration & Dynamic Screening  
Stable public calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Canonical mechanism terminology: **Flow-Induced Turbulence (FIT)**  
Qualification issue: #429

## 1. Purpose

This specification controls the migration of the retained FIT workbook into deterministic code.

It is intentionally narrower than a generic vibration standard. It defines:

- the exact retained source artifact;
- the extracted workbook formula chain;
- physical and method applicability;
- native empirical units;
- source-cell mappings;
- reference-only calculation semantics;
- known source inconsistencies;
- qualification work still required before screening authority.

This document **does not certify** that the retained workbook is a correct or complete implementation of the Energy Institute method. It is a controlled transcription specification pending independent review against the licensed governing source and project procedure.

## 2. Source identity and authority

### 2.1 Retained source

| Property | Value |
|---|---|
| Repository | `reallaksh19/CRF-4-1` |
| Frozen commit | `68dc8e1fa2ef67073c59b3afc56f1bf40953d535` |
| Primary path | `Extended calc2/AIV FIV/FIT.xlsm` |
| Duplicate path | `Enhanced stress report/extended calc/KS-PR-CAL-0086 Vibration Assessment - Flow Induced Turbulence Calculation.xlsm` |
| Git blob | `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` |
| Size | 493,650 bytes |
| Primary calculation tab | `Flow Induced Turbulence` |
| Worksheet part | `xl/worksheets/sheet13.xml` |
| Extracted worksheet size | 114,139 bytes |
| Formula cells in worksheet | 155 |

The two workbook paths have the same Git blob and are therefore one source artifact, not independent corroboration.

### 2.2 Workbook-stated basis

The retained workbook states that its objective is main-line likelihood-of-failure assessment for vibration-induced fatigue associated with flow-induced turbulence.

The workbook cites:

- Energy Institute guidance for avoidance of vibration-induced fatigue in process pipework, 2nd Edition, January 2008, Technical Module T2.2; and
- project/WorleyParsons guidance identified in the workbook.

These citations establish workbook provenance only. Exact licensed-source parity, errata incorporation, project adoption and engineering approval remain independent qualification tasks.

### 2.3 Authority labels

| Label | Meaning |
|---|---|
| `WORKBOOK_REFERENCE_ONLY` | Exact retained-workbook migration/reference behavior; not qualified engineering authority |
| `BENCHMARK_ONLY` | May execute for migration, trace and comparison; not screening/design authority |
| `SCREENING` | **Not authorized by this specification** |
| `DESIGN` | **Not authorized by this specification** |

## 3. Method boundary

### FIT-APP-001 — mechanism

Scope is main-line **Flow-Induced Turbulence** only.

Do not use this kernel for:

- flow-induced pulsation / dead-leg pulsation;
- acoustic-induced vibration;
- small-bore connection vibration;
- cavitation/flashing;
- surge/momentum;
- slug/time-history;
- mechanical excitation;
- vortex-induced vibration.

### FIT-APP-002 — outside diameter

The workbook explicitly states a maximum external diameter of **762 mm / NPS 30**.

For the extracted support-category correlations, labels begin at approximately 60 mm. The reference implementation therefore uses a conservative migration boundary:

```text
60 mm <= Dext <= 762 mm
```

The 60 mm lower bound is a **reference-implementation boundary inferred from the extracted support-category labels**, not yet independently confirmed against the licensed method.

### FIT-APP-003 — support size families

The extracted workbook defines medium/flexible correlation families as:

```text
small family: approximately 60 mm through NPS 8 / OD 219.1 mm
large family: approximately NPS 10 / OD 273.05 mm through 762 mm
```

A manual diameter in:

```text
219.1 mm < Dext < 273.05 mm
```

fails closed in v1 because the retained workbook does not provide a deterministic family rule independent of its UI selector.

### FIT-APP-004 — advanced screening

The workbook methodology states that the advanced option applies when:

```text
support is flexible
AND standard LOF >= 1
AND actual natural frequency is known
AND 1 Hz <= fn <= 3 Hz
```

v1 enforces the 1–3 Hz band even though one cached workbook example evaluates an advanced formula at 4 Hz. See ISS-009.

### FIT-APP-005 — phases

Reference paths are defined for:

```text
LIQUID
GAS
MULTIPHASE
```

Required process inputs are phase-dependent.

## 4. Canonical API inputs

The domain API uses canonical SI quantities. Empirical correlations convert diameter and wall thickness to their extracted native **mm** basis internally.

| Field | Required | Canonical unit | Meaning |
|---|---:|---|---|
| `phase` | yes | enum | `LIQUID`, `GAS`, `MULTIPHASE` |
| `outsideDiameterM` | yes | m | main-line external diameter |
| `wallThicknessM` | yes | m | main-line wall thickness used by `D/T` correlation |
| `insideDiameterM` | no | m | authoritative bore/ID when available; otherwise derived as `Dext - 2T` |
| `maximumUnsupportedSpanM` | yes | m | maximum span between effective supports |
| `massFlowKgS` | single phase unless velocity supplied | kg/s | single-phase mass flow |
| `densityKgM3` | single phase | kg/m3 | single-phase density required for `rho*v^2` |
| `gasDynamicViscosityPaS` | gas | Pa.s | gas dynamic viscosity |
| `gasMassFlowKgS` | multiphase | kg/s | gas mass flow |
| `gasDensityKgM3` | multiphase | kg/m3 | gas density |
| `liquidMassFlowKgS` | multiphase | kg/s | liquid mass flow |
| `liquidDensityKgM3` | multiphase | kg/m3 | liquid density |
| `fluidVelocityMS` | no | m/s | explicit caller velocity override; otherwise derived |
| `naturalFrequencyHz` | conditional | Hz | actual main-line natural frequency for advanced screening |

No field has an engineering default.

### 4.1 Inside-diameter authority

The workbook may source OD, wall and ID independently from a pipe-dimension table. Because rounded table values do not always satisfy exact `ID = OD - 2T`, `insideDiameterM` is an explicit optional authoritative input.

When absent, code may derive ID from OD and wall and must record `DERIVED_FROM_OD_AND_WALL`.

### 4.2 Velocity override

The retained sheet contains at least one cached example where velocity is directly populated rather than calculated from the displayed mass-flow path.

The API therefore allows explicit `fluidVelocityMS`, but it must retain caller-override provenance. Density remains mandatory because the excitation term still requires `rho*v^2`. Multiphase component mass/density data also remain mandatory because mixture density must be resolved explicitly. There is no hidden velocity default.

## 5. Native empirical unit basis

The extracted correlation coefficients use:

```text
Dext : mm
T    : mm
Lspan: m
mu   : Pa.s
rho  : kg/m3
V    : m/s
fn   : Hz
```

The source term `rho * V^2` and `Fv` have pressure dimensions:

```text
kg / (m s^2) = Pa
```

LOF is dimensionless.

Do not analytically rewrite the empirical constants into another unit system without a separately benchmarked and reviewed revision.

## 6. Equation register

### FIT-EQ-001 — internal flow area

Workbook archetype: row 26 velocity expressions.

```text
A = pi * Dint^2 / 4
```

with `Dint` in metres.

### FIT-EQ-002 — component volumetric flow

Workbook cells: gas row 24; liquid row 25.

For each phase component:

```text
Q = m_dot / rho
```

The workbook displays mass flow in kg/hr and Q in m3/hr. The domain implementation uses kg/s and m3/s; the physical relationship is invariant.

### FIT-EQ-003 — fluid velocity

Workbook cells: `C26`, `K26`; the retained `G26` example is a direct populated velocity.

```text
V = Q / A
```

For multiphase:

```text
V = (Qg + Ql) / A
```

An explicit `fluidVelocityMS` overrides derivation with caller provenance.

### FIT-EQ-004 — single-phase excitation term

Workbook cells: `C27`, `G27`, `K27`.

```text
rhoV2 = rho * V^2
```

### FIT-EQ-005 — multiphase mixture density

Workbook cells: `C28`, `G28`, `K28`.

Equivalent canonical form:

```text
rho_mix = (m_dot_g + m_dot_l) / (Qg + Ql)
```

### FIT-EQ-006 — multiphase excitation term

```text
rhoV2 = rho_mix * V^2
```

### FIT-EQ-007 — gas fluid-viscosity factor

Workbook cells: `C29`, `G29`, `K29`.

```text
FVF = sqrt(mu_gas) / sqrt(0.001)
    = sqrt(mu_gas / 0.001 Pa.s)
```

For liquid and multiphase:

```text
FVF = 1
```

### FIT-EQ-008 — Stiff span upper boundary

Workbook cells: `U34`, `U37`, `U40`.

With `D = Dext_mm`:

```text
L_stiff = -0.000012346 D^2 + 0.020000 D + 2.0563
```

### FIT-EQ-009 — Medium-Stiff span upper boundary

Workbook cells: `U35`, `U38`, `U41`.

```text
L_medium_stiff = -0.000011886 D^2 + 0.025262 D + 3.3601
```

### FIT-EQ-010 — Medium/Flexible span boundary

Workbook cells: `U36`, `U39`, `U42`.

```text
L_medium = -0.000015968 D^2 + 0.033583 D + 4.429
```

Classification:

```text
Lspan <= L_stiff                       -> STIFF
L_stiff < Lspan <= L_medium_stiff      -> MEDIUM_STIFF
L_medium_stiff < Lspan <= L_medium     -> MEDIUM
Lspan > L_medium                       -> FLEXIBLE
```

### FIT-EQ-011 — standard correlation coefficients

Workbook source regions:

```text
STIFF          R52:R60
MEDIUM_STIFF   T52:T60
MEDIUM_LARGE   V52:V60
MEDIUM_SMALL   X52:X60
FLEXIBLE_LARGE Z52:Z60
FLEXIBLE_SMALL AB52:AB60
```

For `D = Dext_mm`:

#### STIFF

```text
a = 446187 + 646 D + 0.000917 D^3
b = 0.1 ln(D) - 1.3739
```

#### MEDIUM_STIFF

```text
a = 283921 + 370 D
b = 0.1106 ln(D) - 1.501
```

#### MEDIUM_LARGE

```text
a = 150412 + 209 D
b = 0.0815 ln(D) - 1.3269
```

#### MEDIUM_SMALL

```text
a = 13.1 - 0.00475 D + 0.0000141 D^2
b = -0.132 + 0.000228 D - 0.000000372 D^2
```

#### FLEXIBLE_LARGE

```text
a = 41.21 D + 49397
b = 0.0815 ln(D) - 1.3842
```

#### FLEXIBLE_SMALL

```text
a = 0.0000132 D^2 - 0.00442 D + 12.22
b = 0.000284 D - 0.000000462 D^2 - 0.164
```

### FIT-EQ-012 — standard Fv

Workbook rows `54`, `57`, `60` and main output row `34`.

For Stiff, Medium-Stiff, Medium-Large and Flexible-Large:

```text
Fv = a * (D/T)^b
```

For Medium-Small and Flexible-Small:

```text
Fv = exp( a * (D/T)^b )
```

### FIT-EQ-013 — standard LOF

Workbook main cells: `C35`, `G35`, `K35`.

Liquid:

```text
LOF_standard = rhoV2 / Fv
```

Gas:

```text
LOF_standard = rhoV2 * FVF / Fv
```

Multiphase:

```text
LOF_standard = rhoV2 / Fv
```

### FIT-EQ-014 — advanced Flexible-Small coefficients

Workbook examples: `Y35:Y43`.

```text
a = (0.000013175 D^2 - 0.0044213 D + 12.217)
    * (0.0529 ln(fn) + 1)

b = (-0.0000004622 D^2 + 0.0002835 D - 0.164)
    * (-0.1407 ln(fn) + 1)
```

### FIT-EQ-015 — advanced Flexible-Large coefficients

Workbook examples: `AB35:AB43`.

```text
a = (41.21 D + 49397)
    * fn^(0.0001665 D + 0.84615)

b = 0.0815 ln(D) - 1.3842 + 0.0191 (fn - 1)
```

### FIT-EQ-016 — advanced Fv and refined LOF

Flexible-Small:

```text
Fv_advanced = exp( a * (D/T)^b )
```

Flexible-Large:

```text
Fv_advanced = a * (D/T)^b
```

Then:

```text
LOF_refined = demand / Fv_advanced
```

where `demand` is the same phase-adjusted numerator used in standard LOF.

## 7. Constant register

### FIT-CONST-001 — gas viscosity reference

```text
mu_ref = 0.001 Pa.s
```

Source: workbook row 29 formulas.

### FIT-CONST-002 — reference LOF threshold

```text
LOF_reference = 1
```

Source evidence:

- workbook advanced-screening workflow text;
- workbook advanced formulas are conditionally entered at standard LOF `>= 1`.

This threshold is a **reference workflow threshold**, not production pass/fail authority until the governing method is independently qualified.

## 8. Assessment register

Assessment output must not contain a production `pass` boolean in benchmark-only mode.

### FIT-ASS-001 — below standard reference threshold

```text
LOF_standard < 1
-> REFERENCE_BELOW_THRESHOLD
```

### FIT-ASS-002 — advanced reference path

When FIT-APP-004 is satisfied:

```text
LOF_refined < 1
-> REFERENCE_BELOW_THRESHOLD_AFTER_ADVANCED

LOF_refined >= 1
-> REFERENCE_FURTHER_ENGINEERING_ASSESSMENT_REQUIRED
```

### FIT-ASS-003 — standard threshold reached without valid advanced path

```text
LOF_standard >= 1
AND advanced path unavailable/not applicable
-> REFERENCE_FURTHER_ENGINEERING_ASSESSMENT_REQUIRED
```

All statuses carry:

```text
authority = WORKBOOK_REFERENCE_ONLY
```

## 9. Known source inconsistencies

### ISS-009 — advanced-frequency applicability mismatch

Workbook methodology text restricts advanced screening to known natural frequencies between 1 and 3 Hz.

A cached example calculates advanced values at 4 Hz.

Resolution in v1:

- enforce the stated 1–3 Hz band;
- do not reproduce permissive 4 Hz cached behavior;
- keep method authority benchmark-only pending licensed-source review.

### ISS-010 — support selector versus span stiffness

One cached example has:

- span-based calculated stiffness = `MEDIUM_STIFF`; but
- the hidden selector used by the `Fv` formula points to a flexible correlation family.

Resolution in v1:

- derive support stiffness deterministically from FIT-EQ-008..010;
- derive the support correlation family from stiffness + diameter family;
- do not copy hidden/stale selector state;
- do not use that cached example as an independent benchmark.

### QST-003 — manual diameter gap

The workbook correlation labels split medium/flexible support families between approximately OD 219.1 mm and 273.05 mm.

Resolution in v1:

- fail closed for manual diameters inside that unresolved gap;
- require licensed-source/project-method review before expanding the boundary.

## 10. Reference cases

Cached workbook cases are migration evidence only.

### WB-REF-001 — gas / stiff

Extracted cached values include approximately:

```text
Dext             168.3 mm
T                21.9456 mm
Dint             124.3838 mm
span             4 m
rho_gas          5 kg/m3
mass flow        20,000 kg/hr
mu_gas           2.0e-5 Pa.s
velocity         91.4407896716 m/s
FVF              0.1414213562
Fv               96,734.9662171 Pa
standard LOF     0.06111973375
```

This case is suitable for source-transcription parity.

### WB-REF-003 — multiphase / medium-stiff

Extracted cached values include approximately:

```text
Dext             711.2 mm
T                12.7 mm
Dint             685.8 mm
span             15 m
rho_gas          18 kg/m3
rho_liquid       965.96 kg/m3
gas mass flow    53,482 kg/hr
liquid mass flow 828,796 kg/hr
velocity         2.8795425432 m/s
rhoV2            1,910.47608505 Pa
Fv               24,195.0510249 Pa
standard LOF     0.07896144063
```

This case is suitable for source-transcription parity.

The cached second example is intentionally **not** a qualification benchmark because of ISS-009 and ISS-010.

## 11. API/result requirements

The benchmark/reference domain result must expose separate structures for:

```text
applicability
hydraulics
excitation
support
standard correlation
advanced eligibility
advanced correlation/result
assessment
qualification
provenance
evidence
```

Minimum authority fields:

```text
qualification.method = BENCHMARK_ONLY
qualification.data = BENCHMARK_ONLY
qualification.designAuthority = false
authority = WORKBOOK_REFERENCE_ONLY
```

The stable central ID remains:

```text
VIB.FIV.FLOW_TURBULENCE
```

Central execution may be enabled only in explicit `benchmark` qualification mode while this specification remains unqualified. Strict/screening requests must fail closed.

## 12. Qualification plan

The reference vertical is not eligible for `SCREENING` until all of the following are complete:

1. independent licensed-source review of every FIT-APP / FIT-EQ / FIT-CONST / FIT-ASS item;
2. confirmation of exact edition, project procedure adoption and applicable errata;
3. resolution of ISS-009, ISS-010 and QST-003;
4. independent hand/reference cases not generated by this code;
5. low/nominal/high excitation cases;
6. threshold cases around reference LOF 1;
7. liquid, gas and supported multiphase cases;
8. support-category boundary cases;
9. SI/US equivalent full-case tests through the central API;
10. missing-data and missing-master fail-closed tests;
11. deterministic repeat/regression tests;
12. independent vibration-engineering review and recorded approval.

Until then:

```text
engineeringAuthority = NONE
benchmarkAuthority   = WORKBOOK_REFERENCE_ONLY
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = NOT_AUTHORIZED
```
