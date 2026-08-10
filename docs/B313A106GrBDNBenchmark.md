# ASME B31.3 API — ASTM A106 Grade B DN Thickness Benchmark

## Purpose

This document records the user-supplied DN-series engineering benchmark used to verify `t`, `tm`, P/S, and manufacturing-tolerance handling in the reusable B31.3 thickness API.

This is a **user-supplied engineering benchmark**, not an embedded ASME material-property table. The API still requires the caller to supply `S`, `E`, `W`, and `Y` from the project's controlled engineering source.

## Input basis

| Parameter | Value |
|---|---:|
| Material label | CS — ASTM A106 Grade B |
| Temperature | 0 °C |
| Design pressure P | 51.10 barg = 5.11 MPa |
| Allowable stress S | 20,000 psi = 20 ksi = 137.895 MPa |
| E | 1.00 |
| W | 1.00 |
| Y | 0.40 |
| Corrosion/allowance C | 6.00 mm |
| Negative mill tolerance To | 12.50% |

The source table labelled the `S = 20000` unit as `psig`. For this benchmark it is interpreted as **allowable stress in psi**, i.e. 20 ksi. Allowable stress is not a gauge-pressure quantity.

## Calculation definitions

Pressure-design thickness:

```text
t = P*D / (2*(S*E*W + P*Y))
```

Required minimum thickness after allowances:

```text
tm = t + C
```

Required nominal/ordered wall after a 12.5% negative manufacturing tolerance:

```text
Trequired = tm / (1 - 0.125)
```

Pressure-to-allowable-stress ratio:

```text
P/S = 5.11 / 137.8951458633672
    = 0.03705714199
    ≈ 0.0371
```

`tm` and `Trequired` are intentionally separate outputs. `tm` is the minimum required wall after allowances; `Trequired` is the nominal/ordered wall needed so its minimum as-manufactured wall is not less than `tm`.

## Recorded DN results

| DN | D mm | t mm | tm = t + C mm | Required nominal wall mm |
|---:|---:|---:|---:|---:|
| 15 | 21.30 | 0.3889 | 6.3889 | 7.3016 |
| 20 | 26.70 | 0.4875 | 6.4875 | 7.4143 |
| 25 | 33.40 | 0.6098 | 6.6098 | 7.5541 |
| 40 | 48.30 | 0.8819 | 6.8819 | 7.8650 |
| 50 | 60.30 | 1.1010 | 7.1010 | 8.1154 |
| 80 | 88.90 | 1.6231 | 7.6231 | 8.7121 |
| 100 | 114.30 | 2.0869 | 8.0869 | 9.2422 |
| 150 | 168.30 | 3.0728 | 9.0728 | 10.3689 |
| 200 | 219.10 | 4.0003 | 10.0003 | 11.4289 |
| 250 | 273.00 | 4.9844 | 10.9844 | 12.5536 |
| 300 | 323.80 | 5.9119 | 11.9119 | 13.6136 |
| 350 | 355.60 | 6.4925 | 12.4925 | 14.2772 |

All rows have the same normalized `P/S = 0.03705714199` because P and S are constant in this benchmark.

## Machine-readable benchmark

The exact full-precision values are frozen in:

```text
Benchmarks/B313Thickness/a106-grb-dn-thickness-benchmark.json
```

The production regression is:

```text
tests/b313-a106-dn-benchmark.test.mjs
```

The independent arithmetic oracle is:

```text
tools/b313-a106-dn-reference.py
```

The production test verifies for every DN:

```text
API tMm == frozen t
API tmMm == frozen tm
API requiredNominalThicknessMm == frozen required nominal wall
API P/S == frozen P/S
tmMm == tMm + C
requiredNominalThicknessMm == tmMm / (1 - To)
```

The Python oracle independently recalculates the same quantities without importing or executing the production JavaScript.

## API notation

`calculateB313Thickness()` exposes both descriptive names and engineering aliases:

```js
{
  pressureDesignThicknessMm, // same value as tMm
  tMm,
  requiredMinimumThicknessMm, // same value as tmMm
  tmMm,
  requiredNominalThicknessMm,
  applicability: {
    pressureAllowableStressRatio, // P/S
    pressureEffectiveStressRatio, // P/(S*E)
    pressureStressRatio           // compatibility alias for P/(S*E)
  }
}
```

## Qualification boundary

These benchmark results validate arithmetic, unit normalization, notation, and manufacturing-tolerance treatment for the supplied inputs. They do not independently establish that the supplied `S`, `E`, `W`, `Y`, corrosion allowance, or design pressure are appropriate for a particular project. Final design authority remains subject to the controlled B31.3-2024 and applicable product/material specification review recorded in `docs/B313ThicknessValidation.md`.
