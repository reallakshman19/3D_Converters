# AIV Qualification Evidence v1

Status: **CONTROLLED WORKED-EXAMPLE EVIDENCE — PRODUCTION EQUATION NOT AUTHORIZED**

Method ID:

```text
VIB.AIV.ACOUSTIC
```

Authority remains:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

## Controlled source

```text
repository: reallaksh19/Common
commit: fb549185b9b27edc2379734240320a85c5bef9f6
file: Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob: ceee15ed5f7f320045d5f3979024e2e8664613f2
locator: Appendix D / D.2.3 High Frequency Acoustic Excitation (T2.7)
```

The source pin is encoded in `converters/vibration/aiv/aiv-qualification-evidence.js` and has `productionAuthority = false`.

## Benchmark evidence captured

### AIV-EI-D2-3-RELIEF-SOURCE

Published worked-example inputs captured:

```text
source type               RELIEF_VALVE
upstream pressure         98 barg
published absolute P1     9.9 MPa abs
downstream pressure       0 barg
published absolute P2     0.1 MPa abs
mass flow                 53,482 kg/h
published normalized flow 14.86 kg/s
upstream temperature      137 degC
published temperature     410 K
molecular weight          21.75 g/mol
sonic state               NON_SONIC
SFF                       0 dB
```

Published source PWL reference:

```text
164.7 dB
```

The stored source-PWL comparison tolerance is `±0.05 dB` solely because the published result is displayed to one decimal place. This is not a general AIV tolerance.

### AIV-EI-D2-3-RECYCLE-SOURCE

Published worked-example inputs captured:

```text
source type               CONTROL_VALVE
upstream pressure         87 barg
published absolute P1     8.8 MPa abs
downstream pressure       25 barg
published absolute P2     2.6 MPa abs
mass flow                 53,482 kg/h
upstream temperature      137 degC
molecular weight          21.75 g/mol
sonic state               NON_SONIC
SFF                       0 dB
manufacturer trim         approximately 30 dB reduction
```

Published source PWL reference:

```text
159.4 dB
```

The fixture does not convert the approximate trim statement into an exact production engineering default.

### AIV-EI-D2-3-RELIEF-DISCONTINUITY

Captured worked-example evidence for the evaluated bypass weldolet includes:

```text
assessment description        2-inch bypass weldolet
source-to-assessment distance 0.8 m
main pipe ID                  154 mm
main pipe OD                  168.3 mm
main wall thickness           7.11 mm
branch OD                     60.3 mm
source PWL                    164.7 dB
attenuation                   0.312 dB
assessment PWL                164.4 dB
A                             0.93989
S                             68.229
B                             152.207
log10(N)                      9.9026
N                             7.99e9
Dext/dext                     2.791
```

The fixture intentionally records:

```text
publishedFinal = null
qualificationGap = FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE
```

No final LOF is invented to make the fixture look complete.

## Trace states

Worked-example evidence currently has stable trace IDs for:

```text
AIV-SRC-EI-D2-3-PRESSURE
AIV-SRC-EI-D2-3-NONSONIC
AIV-SRC-EI-D2-3-TRIM
AIV-SRC-EI-D2-3-SOURCE-PWL
AIV-SRC-EI-D2-3-155DB
AIV-SRC-EI-D2-3-ATTENUATION
AIV-SRC-EI-D2-3-T2-6
```

`AIV-SRC-EI-D2-3-155DB` is explicitly classified as worked-example branch evidence only. It does not authorize a production threshold rule until the governing main-guidance location is frozen.

## Explicit qualification gaps

```text
AIV-SRC-GAP-SONIC-SFF6
  INDEPENDENT_BENCHMARK_REQUIRED

AIV-SRC-GAP-MULTI-SOURCE
  INDEPENDENT_BENCHMARK_REQUIRED

AIV-EQ-GAP-MAIN-GUIDANCE
  SOURCE_LOCATION_AND_ERRATA_FREEZE_REQUIRED

FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE
```

These gaps block numerical promotion.

## Production separation

The evidence module:

- contains no AIV calculation function;
- contains no logarithmic/power equation implementation;
- is not imported by the pending Engineering Calculation definition;
- is immutable/frozen;
- has `productionEquationAuthorized = false`.

The qualification UI may render its published values and trace states as evidence. That does not make the values production outputs.

## Next gate

Before a production AIV kernel is written, qualification still requires at least:

1. exact main EI T2.7 equation/page/flowchart/table locations;
2. all applicable official errata frozen against those locations;
3. exact source for sonic determination / `SFF = 6` branch;
4. exact source and rule for source-to-assessment attenuation/distance;
5. complete T2-6 final worked-example endpoint;
6. independent hand-derived sonic and multi-source cases;
7. branch/boundary tolerances justified from source precision and sensitivity;
8. independent vibration-engineer review.

Until those are complete, `VIB.AIV.ACOUSTIC` remains BLOCKED and no central numerical execution path is authorized.
