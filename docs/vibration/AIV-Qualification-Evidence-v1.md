# AIV Qualification Evidence v1

Status: **CONTROLLED SOURCE LOCATIONS + WORKED-EXAMPLE EVIDENCE — PRODUCTION EQUATION NOT AUTHORIZED**

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

## 1. Controlled sources

### Main EI guidance

```text
repository: reallaksh19/Common
commit: aef163a5def3bfe04ca0ba860da05728a27daf42
file: EI - AVIFF Guidelines 2nd Edition.pdf
blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
locator: T2.7 High Frequency Acoustic Excitation, pages 59-62
edition: 2nd
published: January 2008
```

The official Energy Institute publication record identifies errata affecting pages 61 and 68 and states that the changes are incorporated into the main PDF. Page 61 is AIV-relevant because it contains Flowchart T2-6 / T2.7 material.

For this branch, that is encoded as a **location/errata gate only**:

```text
controlledContentExtractionState = PINNED_BLOB_CONTENT_RECONCILIATION_REQUIRED
productionAuthority              = false
```

No equation or coefficient is transcribed into production code merely from an external text rendering, memory, or workbook.

### EI worked examples

```text
repository: reallaksh19/Common
commit: fb549185b9b27edc2379734240320a85c5bef9f6
file: Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob: ceee15ed5f7f320045d5f3979024e2e8664613f2
locator: Appendix D / D.2.3 High Frequency Acoustic Excitation (T2.7)
```

Both source pins are encoded in `converters/vibration/aiv/aiv-qualification-evidence.js` with `productionAuthority = false`.

## 2. Main T2.7 trace locations frozen

The branch now records the following source locations without yet transcribing production equations:

```text
AIV-APP-T2-7-EXTENT-001
  T2.7.1, page 59
  excitation extent / downstream boundary / welded discontinuities / source classes

AIV-UNIT-T2-7-INPUTS-001
  T2.7.2, page 59
  native input symbols and units

AIV-EQ-SOURCE-PWL-001
  T2.7.3 / Flowchart T2-5, page 60
  source PWL equation location

AIV-CONST-SFF-001
  T2.7.3, page 60
  sonic-flow correction-factor branch location

AIV-ASS-155DB-001
  Flowchart T2-5, page 60
  155 dB branch location

AIV-EQ-ATTENUATION-001
  Flowchart T2-5, page 60
  source-to-discontinuity attenuation equation location

AIV-EQ-MULTI-SOURCE-001
  Flowchart T2-5, page 60
  multiple-source combination equation location

AIV-ASS-LOW-NOISE-TRIM-001
  Note 1 / T2.7.3, page 61
  low-noise-trim manufacturer-reduction rule location

AIV-EQ-T2-6-001
  Flowchart T2-6, page 61
  welded-discontinuity fatigue/LOF chain location
```

All except the page-61 T2-6 item remain:

```text
SOURCE_LOCATION_IDENTIFIED_CONTROLLED_EXTRACTION_REQUIRED
```

The page-61 item is stricter:

```text
ERRATA_PAGE_61_CONTROLLED_CONTENT_RECONCILIATION_REQUIRED
OFFICIAL_ERRATA_PAGE_61_APPLIES
```

This means the source map is becoming complete while the production numerical transcription remains deliberately blocked.

## 3. Benchmark evidence captured

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

Captured worked-example evidence includes:

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

## 4. Worked-example trace states

```text
AIV-SRC-EI-D2-3-PRESSURE
AIV-SRC-EI-D2-3-NONSONIC
AIV-SRC-EI-D2-3-TRIM
AIV-SRC-EI-D2-3-SOURCE-PWL
AIV-SRC-EI-D2-3-155DB
AIV-SRC-EI-D2-3-ATTENUATION
AIV-SRC-EI-D2-3-T2-6
```

`AIV-SRC-EI-D2-3-155DB` remains **worked-example branch evidence only**. Production threshold authority must come from the controlled main-guidance trace, not from example behavior alone.

## 5. Explicit qualification gaps

```text
AIV-SRC-GAP-SONIC-SFF6
  INDEPENDENT_BENCHMARK_REQUIRED

AIV-SRC-GAP-MULTI-SOURCE
  INDEPENDENT_BENCHMARK_REQUIRED

AIV-EQ-T2-6-001
  ERRATA_PAGE_61_CONTROLLED_CONTENT_RECONCILIATION_REQUIRED

FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE
```

These gaps block numerical promotion.

## 6. Production separation

The evidence module:

- contains no AIV calculation function;
- contains no logarithmic/power equation implementation;
- is not imported by the pending Engineering Calculation definition;
- is immutable/frozen;
- has `productionEquationAuthorized = false`.

The qualification UI renders published values and trace states from this same immutable evidence module. Those values remain reference evidence, not production calculator outputs.

## 7. Next gate

Before a production AIV kernel is written, qualification still requires at least:

1. controlled extraction/reconciliation of the pinned Common T2.7 pages 59-62;
2. explicit reconciliation of the page-61 official erratum with the controlled Common PDF;
3. complete equation/table/constant records with native units, branch predicates and rounding rules;
4. complete T2-6 final D.2.3 worked-example endpoint;
5. independent hand-derived sonic `SFF = 6` benchmark;
6. independent multiple-source benchmark;
7. justified branch/boundary tolerances;
8. retained-workbook extraction/reconciliation as migration evidence;
9. independent vibration-engineer review.

Until those are complete, `VIB.AIV.ACOUSTIC` remains BLOCKED and no central numerical execution path is authorized.
