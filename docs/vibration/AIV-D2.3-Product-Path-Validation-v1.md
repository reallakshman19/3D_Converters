# AIV D.2.3 Product-Path Validation v1

## Validation identity

```text
method                  VIB.AIV.ACOUSTIC
benchmark               EI-D2.3-AIV
validated code commit   64485a51ffe78102ba3b966d43ba68e13f511130
execution               local controlled Node arithmetic cross-check
result                   PASS
checks                   22 / 22 PASS
repository Actions       NOT_RUN (budget / zero-step jobs)
release target           BENCHMARK_ONLY
human evidence required  false
```

Machine-readable receipt: `docs/vibration/validation/AIV-D2.3-Product-Path-Validation-v1.json`.

The validation uses the same controlled D.2.3 Source / Assessment / Source→Assessment working-table values used by the AIV UI benchmark loader. Stages 1–7 use the production-shaped candidate. Stages 8–10 are executed by `scripts/aiv-auto-product-path.mjs` using the controlled qualification math helpers.

## Scope rule

```text
first weldolet assessment LOF = 0.29   -> ASSESSMENT
relief-line report LOF        = 1.48   -> LINE_CASE_SUMMARY
```

The line value is a visible configurable assumption (`benchmark.workedExampleReliefLineLof`). It is not derived from the first-discontinuity LOF because the worked example does not expose enough line aggregation detail to reconstruct that derivation.

## Step-by-step validation

| # | Stage / check | Expected | Actual | Tolerance | Result |
|---:|---|---:|---:|---:|---|
| 01 | Relief raw source PWL, dB | 164.7 | 164.6851759525 | 0.05 | PASS |
| 02 | Recycle raw source PWL, dB | 159.4 | 159.3648155401 | 0.05 | PASS |
| 03 | Recycle effective PWL after 30 dB trim | 129.36 | 129.3648155401 | 0.05 | PASS |
| 04 | Relief attenuation to first discontinuity, dB | 0.312 | 0.3116883117 | 0.001 | PASS |
| 05 | Relief point PWL, dB | 164.4 | 164.3734876409 | 0.05 | PASS |
| 06 | Configured published A | 0.93989 | 0.93989 | 1e-9 | PASS |
| 07 | Configured published S | 68.229 | 68.229 | 1e-9 | PASS |
| 08 | Configured published B | 152.207 | 152.207 | 1e-9 | PASS |
| 09 | Errata log10(N) | 9.9026 | 9.9025678705 | 0.0001 | PASS |
| 10 | N | 7.99E9 | 7.9903880379E9 | 1.0E7 | PASS |
| 11 | Dext/dext | 2.791 | 2.7910447761 | 0.001 | PASS |
| 12 | Selected published FLM1 | 1.2133 | 1.2133 | 1e-9 | PASS |
| 13 | Recalculated FLM1 vs published | 1.2133 | 1.2109758194 | 0.0024 | PASS |
| 14 | FLM2 | 0.2009 | 0.2009306329 | 0.0001 | PASS |
| 15 | N after FLM1 | 9.70E9 | 9.6947378064E9 | 1.0E7 | PASS |
| 16 | N after FLM2 | 1.95E9 | 1.9479698028E9 | 5.0E6 | PASS |
| 17 | Lf | 0.31 | 0.3128760237 | 0.01 | PASS |
| 18 | First-discontinuity LOF | 0.29 | 0.29 | 0.01 | PASS |
| 19 | Assessment and line result scopes remain distinct | true | true | exact | PASS |
| 20 | Configured relief-line LOF | 1.48 | 1.48 | exact | PASS |
| 21 | Complete stage count | 10 | 10 | exact | PASS |
| 22 | Universal operating classification emitted | false | false | exact | PASS |

## Numerical chain

```text
Mass flow
53482 kg/h -> 14.8561111111 kg/s

Relief source
98 barg + 1 bar reference -> 99 bara
0 barg + 1 bar reference  -> 1 bara
raw source PWL             -> 164.6851759525 dB

First discontinuity
Ldis = 0.8 m
Dint = 154 mm
attenuation                -> 0.3116883117 dB
point PWL                  -> 164.3734876409 dB

Configured published intermediates
A = 0.93989
S = 68.229
B = 152.207

Errata chain
log10(N)                   -> 9.9025678705
N                          -> 7.9903880379E9
Dext/dext                  -> 2.7910447761
FLM1 selected              -> 1.2133
FLM1 recalculated          -> 1.2109758194
N after FLM1               -> 9.6947378064E9
FLM2                       -> 0.2009306329
N after FLM2               -> 1.9479698028E9
Lf                         -> 0.3128760237
assessment LOF             -> 0.29

Separate line/case scope
configured relief-line LOF -> 1.48
```

## Validated result/export behavior

The unchanged controlled benchmark now exposes validated `AivSourceResult.v1`, `AivAssessmentResult.v1`, T2-6 detail and `AivLineCaseSummary.v1`, and can export `AivValidatedBenchmarkExportPackage.v1`.

The validation identity fails closed:

```text
edit table cell             -> committed validation not applicable
edit benchmark assumption   -> committed validation not applicable
reload EI D.2.3              -> restores controlled inputs/default assumptions
```

## AUTO stage result

```text
16B.1  stages 1–7 candidate                         COMPLETE
16B.2  assumption/configuration model               COMPLETE
16B.3  stages 8–10 benchmark implementation         COMPLETE
17     D.2.3 product-path parity                    COMPLETE / PASS
18     benchmark result detail + assumptions/export COMPLETE
19     exact-head BENCHMARK_ONLY validation         NEXT
20     SCREENING qualification                      later
```

## Authority after validation

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

Stage 19 requires an actual exact-head Node/browser execution and a passing `AivReleaseValidationReceipt.v1`. The current GitHub Actions budget condition produces zero-step jobs, so it remains `NOT_RUN` rather than being treated as release evidence.
