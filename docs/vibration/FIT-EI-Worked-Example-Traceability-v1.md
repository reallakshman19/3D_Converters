# FIT EI Worked-Example Traceability v1

Status: **SOURCE RECONCILIATION — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Controlled Common pin: `fb549185b9b27edc2379734240320a85c5bef9f6`

## 1. Purpose

This record reconciles the five controlled FIT benchmark cases against the currently controlled EI evidence set and the retained worked-example DOCX/line-list transcription. It is a traceability artifact, not an authority grant.

## 2. Controlled source identities

| Role | Repository / commit | Source | Git blob | Authority use |
|---|---|---|---|---|
| Governing method | `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6` | `EI - AVIFF Guidelines 2nd Edition.pdf` | `9d3eccc56429411e17c07a579bdebbd13cb0bdc5` | Governing T2.2 method/applicability source |
| Published worked examples | same controlled pin | `EI - AVIFF Guidelines 2nd Edition_Examples.pdf` | `3e2517d0df527a051084fc02e69cb7afa31f8d47` | Governing published D2/D4 benchmark values |
| Worked-example DOCX / line list | same controlled pin | `Energy-Institute-AVIFF---Worked-Examples.doc.docx` | `ceee15ed5f7f320045d5f3979024e2e8664613f2` | Corroborating/richer line/case evidence only |
| Repository transcription of DOCX | `3D_Converters` current branch | `docs/Energy-Institute-AVIFF---Worked-Examples.md` | repository-controlled text | Review/navigation aid; not a substitute for source binary identity |
| Retained workbook | `reallaksh19/CRF-4-1@68dc8e1fa2ef67073c59b3afc56f1bf40953d535` | `Extended calc2/AIV FIV/FIT.xlsm` | `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` | Migration/parity evidence only |

The controlled Common pin is a direct descendant of the earlier `aef163a5...` source state. The FIT source metadata is being moved to the later project pin while retaining the exact governing worked-example PDF blob identity.

## 3. Source precedence

Use this order whenever values disagree:

1. adopted governing EI method PDF for equations/applicability;
2. EI worked-example PDF for the published D2/D4 benchmark vector;
3. DOCX/line-list evidence for corroboration and richer project context;
4. controlled JSON as a transcription of the adopted benchmark vector;
5. retained workbook as migration/parity evidence only.

A lower-ranked source may not silently override a higher-ranked source. Every execution-relevant disagreement remains visible until dispositioned.

## 4. Controlled benchmark mapping

### 4.1 D2 — recycle suction, 6 in gas

Benchmark: `EI-D2-FIT-RECYCLE-SUCTION-6IN`  
Published source locator: `Appendix D, Example D2, D.2.1 Steps 1-5`

DOCX/line-list mapping:

```text
Record ID             6
Line reference         Recycle line (compressor suction)
OD                     168.275 mm
WT                     7.112 mm
Mass flow              53482 kg/h
Density                 18 kg/m3
Dynamic viscosity       0.00002 Pa.s
Flow velocity           44.0 m/s
Energy rho*v^2          35294 Pa
Max span                7 m
Stiffness               medium-stiff
FIT                     0.28
```

Controlled JSON/PDF benchmark:

```text
OD                     168.3 mm
WT                     7.11 mm
ID                     154.1 mm
Mass flow              14.856111111111112 kg/s = 53482 kg/h
Density                 18 kg/m3
Dynamic viscosity       0.00002 Pa.s
Max unsupported span    6.4 m
Published rho*v^2       35294 Pa
Published standard LOF  0.276
```

Disposition:

- OD/WT differences are source rounding/transcription-scale differences and do not change identity of the case.
- mass flow, density, viscosity and `rho*v^2` corroborate the benchmark.
- DOCX span `7 m` differs from benchmark span `6.4 m`; benchmark execution retains the EI worked-example PDF/controlled JSON value pending page-level source review.
- DOCX FIT `0.28` is consistent with the more precise published benchmark `0.276` at displayed precision.

Reconciliation state: **PARTIAL — SPAN DIFFERENCE RETAINED**.

### 4.2 D2 — relief upstream, 4 in gas

Benchmark: `EI-D2-FIT-RELIEF-UPSTREAM-4IN`  
Published source locator: `Appendix D, Example D2, D.2.1 Steps 1-5`

DOCX/line-list mapping:

```text
Record ID             7
Line reference         Relief line (upstream of PSV)
OD                     114.3 mm
WT                     11.125 mm
Mass flow              53482 kg/h
Density                 62 kg/m3
Dynamic viscosity       0.00002 Pa.s
Flow velocity           36.0 m/s
Energy rho*v^2          80379 Pa
Max span                6 m
Stiffness               medium-stiff
FIT                     0.34
```

Controlled JSON/PDF benchmark:

```text
OD                     114.3 mm
WT                     11.1 mm
ID                     92.1 mm
Mass flow              14.856111111111112 kg/s = 53482 kg/h
Density                 62 kg/m3
Dynamic viscosity       0.00002 Pa.s
Max unsupported span    5.2 m
Published rho*v^2       80203 Pa
Published standard LOF  0.338
```

Disposition:

- geometry/process identity is corroborated.
- DOCX span `6 m` differs from benchmark `5.2 m`.
- DOCX `rho*v^2=80379` differs slightly from benchmark `80203`; retain both as separate source observations.
- DOCX FIT `0.34` is consistent with published `0.338` at displayed precision.

Reconciliation state: **PARTIAL — SPAN / RHO-V2 DIFFERENCES RETAINED**.

### 4.3 D2 — relief downstream, 6 in gas

Benchmark: `EI-D2-FIT-RELIEF-DOWNSTREAM-6IN`  
Published source locator: `Appendix D, Example D2, D.2.1 Steps 1-5`

DOCX/line-list mapping:

```text
Record ID             8
Line reference         Relief line (downstream of PSV)
OD                     168.275 mm
WT                     7.112 mm
Mass flow              53482 kg/h
Density                 4 kg/m3
Dynamic viscosity       0.00001 Pa.s
Flow velocity           199.0 m/s
Energy rho*v^2          158823 Pa
Max span                7 m
Stiffness               medium-stiff
FIT                     0.88
```

Controlled JSON/PDF benchmark:

```text
OD                     168.3 mm
WT                     7.11 mm
ID                     154.1 mm
Mass flow              14.856111111111112 kg/s = 53482 kg/h
Density                 4 kg/m3
Dynamic viscosity       0.00001 Pa.s
Max unsupported span    6.4 m
Published rho*v^2       158823 Pa
Published standard LOF  0.881
```

Disposition:

- process and energy evidence corroborate exactly at displayed precision.
- DOCX span `7 m` differs from benchmark `6.4 m`.
- FIT `0.88` is consistent with published `0.881` at displayed precision.

Reconciliation state: **PARTIAL — SPAN DIFFERENCE RETAINED**.

### 4.4 D4 — separator inlet, 20 in multiphase

Benchmark: `EI-D4-FIT-SEPARATOR-INLET-20IN`  
Published source locator: `Appendix D, Example D4, D.4.1 Steps 1-5`

DOCX/line-list mapping:

```text
Record ID             9
Line reference         Stream 1 / From production header
OD                     508 mm
WT                     9.525 mm
Phase                  multiphase
Density                 136 kg/m3
Flow velocity           9.0 m/s
Energy rho*v^2          11791 Pa
Max span                9 m
Stiffness               stiff
FIT                     0.26
```

Controlled JSON/PDF benchmark:

```text
OD                     508 mm
WT                     9.525 mm
Phase                  MULTIPHASE
Density                 136 kg/m3
Velocity                9.3 m/s
Max unsupported span    5 m
Published rho*v^2       11763 Pa
Published standard LOF  0.26
```

Disposition:

- case/geometry/FIT identity is corroborated.
- DOCX velocity `9.0 m/s`, energy `11791 Pa`, and span `9 m` do not reproduce the governing benchmark vector `9.3 m/s`, `11763 Pa`, `5 m`.
- the line-list values are therefore retained as a distinct revised/corroborating project record and are not substituted into the EI benchmark.

Reconciliation state: **OPEN SOURCE DIFFERENCE — BENCHMARK PDF PRECEDENCE**.

### 4.5 D4 — produced water, 10 in liquid

Benchmark: `EI-D4-FIT-PRODUCED-WATER-10IN`  
Published source locator: `Appendix D, Example D4, D.4.1 Steps 1-5`

DOCX/line-list mapping:

```text
Record ID             12
Line reference         Stream 4 / Produced water
OD                     273.05 mm
WT                     9.271 mm
Phase                  liquid
Density                 1000 kg/m3
Flow velocity           3.0 m/s
Energy rho*v^2          8237 Pa
Max span                19 m
Stiffness               flexible
FIT                     3.12
```

The same DOCX stream listing also contains an `original` produced-water stream with density `988 kg/m3`, demonstrating that the DOCX contains revised project scenarios rather than one immutable benchmark vector.

Controlled JSON/PDF benchmark:

```text
OD                     273 mm
WT                     9.271 mm
Density                 988 kg/m3
Velocity                2.9 m/s
Max unsupported span    18 m
Published rho*v^2       8309 Pa
Published standard LOF  3.15
Support category        FLEXIBLE_LARGE
```

Disposition:

- OD/WT and flexible-family identity are corroborated.
- density, velocity, energy, span and FIT differ between the revised DOCX line-list row and the governing benchmark vector.
- the benchmark continues to use the EI worked-example PDF/controlled JSON values; the revised DOCX row is retained as a separate provenance record.

Reconciliation state: **OPEN REVISED-SCENARIO DIFFERENCE — BENCHMARK PDF PRECEDENCE**.

## 5. Reconciliation summary

| Benchmark | Case identity | Major process values | Span | Published LOF | State |
|---|---|---|---|---|---|
| D2 recycle suction 6 in | corroborated | corroborated | DOCX 7 vs benchmark 6.4 | 0.28 vs 0.276 | PARTIAL |
| D2 relief upstream 4 in | corroborated | mostly corroborated | DOCX 6 vs benchmark 5.2 | 0.34 vs 0.338 | PARTIAL |
| D2 relief downstream 6 in | corroborated | corroborated | DOCX 7 vs benchmark 6.4 | 0.88 vs 0.881 | PARTIAL |
| D4 separator inlet 20 in | corroborated | revised/different | DOCX 9 vs benchmark 5 | 0.26 vs 0.26 | OPEN DIFFERENCE |
| D4 produced water 10 in | corroborated | revised/different | DOCX 19 vs benchmark 18 | 3.12 vs 3.15 | OPEN DIFFERENCE |

These differences do not invalidate the five benchmark vectors because the DOCX is not the governing published-example authority. They do prevent a claim that the DOCX, PDF and JSON are byte-for-byte or value-for-value equivalent.

## 6. Remaining source-review gates

Before production screening activation:

1. record exact printed/PDF pages for every adopted T2.2 equation/table/applicability item;
2. confirm applicable official errata and project adoption basis;
3. disposition whether the D2 span differences are merely richer line-list/project geometry versus the specific published calculation span;
4. disposition the D4 revised-scenario differences as project variants rather than benchmark replacements;
5. replace the current blanket benchmark tolerance with field/case tolerances justified from published precision and propagated source rounding;
6. retain QST-003 (`219.1 < Dext < 273 mm`) as a fail-closed production exclusion unless an authoritative source-backed rule is approved.

## 7. Authority conclusion

Source identity and source precedence are now explicit, but page-level adopted-method review and several DOCX/PDF differences remain open. FIT therefore remains `BENCHMARK_ONLY`, `screeningAuthority=NOT_AUTHORIZED`, and `designAuthority=false`.
