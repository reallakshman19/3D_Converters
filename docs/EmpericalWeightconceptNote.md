# Empirical Valve / Component Weight Estimation — Concept Note

**Status:** Technical concept finalized for Approach 1 and Approach 2  
**Date:** 2026-08-10  
**Source master:** `docs/Masters/wtValveweights.xlsx` / `docs/Masters/wtValveweights.json`  
**Pinned source commit:** `b168cced3f5aaaada15de290d14ce64928a9a7a3`

## 1. Purpose

This note documents two empirical methods for estimating valve and piping-component weight from the existing master data.

- **Approach 1 — Size-banded analytical equations:** a transparent equation-based estimator split by component, pressure rating, and contiguous nominal-size bands.
- **Approach 2 — Matrix-assisted stacked estimator:** a higher-accuracy catalog reconstruction method that retains Approach 1 as an analytical prior and adds two independent size × rating matrix estimates.

The methods are intentionally retained as separate deployment choices. Approach 1 is the simpler, auditable engineering equation set. Approach 2 is intended when the catalog matrix around the requested size/rating is sufficiently populated and higher average accuracy is required.

## 2. Source data and targets

The authoritative source used for the derivation is:

`https://github.com/reallaksh19/3D_Converters/blob/b168cced3f5aaaada15de290d14ce64928a9a7a3/docs/Masters/wtValveweights.xlsx`

Primary fields used:

- `TypeDesc` — component family.
- `NS` / `DN` — nominal size.
- `Rating` — pressure class/rating.
- `RF-F/F`, `RTJ F/F`, `BW-F/F` — available end-to-end / face-to-face dimensional information.
- `RF/RTJ KG` — RF/RTJ weight target.
- `BW KG` — butt-weld weight target.

Validation populations:

- RF/RTJ: **1,502 usable rows**.
- BW: **782 usable rows**.

The target metric requested for Approach 2 is **aggregate MAPE below 10%**.

## 3. Accuracy definitions

For an observed weight `W` and predicted weight `W_hat`:

```text
APE = abs(W_hat - W) / W
MAPE = mean(APE)
```

Additional reported diagnostics are:

- median APE;
- 90th percentile APE (`P90`);
- percentage of predictions within ±10%;
- percentage of predictions within ±15%.

The ±15% metric is retained because it was the original engineering acceptance measure used during the equation-development work.

---

# Approach 1 — Size-banded analytical equations

## 4. Rationale

A single equation for an entire `TypeDesc + Rating` combination was found to be too rigid. Small, medium, and large sizes can follow materially different mass-growth behavior because wall thickness, body construction, flange proportions, operator size, and standard dimensional series do not scale uniformly.

Approach 1 therefore splits each `TypeDesc + Rating` dataset into **1 to 3 contiguous nominal-size bands** and fits a separate equation in each band.

## 5. Band-selection rules

For each target (`RF/RTJ KG` and `BW KG`) and each `TypeDesc + Rating` group:

1. Sort the available observations by `NS`.
2. Test one-, two-, and three-band contiguous partitions.
3. Require at least:
   - **5 data rows per band**, and
   - **4 unique sizes per band**.
4. Fit the candidate equation families below.
5. Select the partition/equations that maximize held-out ±15% accuracy and then minimize absolute percentage error.
6. Apply a small complexity penalty so an additional band is accepted only when it provides a real validation benefit.

The final derivation selected:

- RF/RTJ groups: 20 one-band, 52 two-band, and 18 three-band groups.
- BW groups: 7 one-band, 26 two-band, and 11 three-band groups.

## 6. Equation forms

For each selected band, one of four equation forms is retained.

### LOG1

```text
W = exp(a + b ln(NS))
```

### LOG2

```text
W = exp(a + b ln(NS) + c ln(NS)^2)
```

### RAW1

```text
W = a + b NS
```

### RAW2

```text
W = a + b NS + c NS^2
```

The equation is valid only within its assigned size band. An equation from a small-size band must not be extrapolated through a band boundary.

## 7. Approach 1 validation

The size-band check holds out a nominal size from its selected band, refits the band without that size, and predicts the omitted size while keeping the selected breakpoints fixed.

| Target | MAPE | Median APE | P90 APE | Within ±10% | Within ±15% |
|---|---:|---:|---:|---:|---:|
| RF/RTJ KG | 10.99% | 6.35% | 22.57% | 67.91% | 84.09% |
| BW KG | 11.41% | 6.76% | 28.85% | 65.35% | 82.23% |

Approach 1 is therefore the preferred method when:

- a simple explicit equation is required;
- the estimator must work without a surrounding size × rating matrix;
- the requested point is inside a validated band;
- traceability and ease of implementation are more important than the last increment of average accuracy.

---

# Approach 2 — Matrix-assisted stacked estimator

## 8. Objective

Approach 2 is designed around the observation that the master behaves like a partially populated catalog matrix:

```text
                 Pressure Rating
NS          150   300   600   900   1500   2500
-------------------------------------------------
small        W     W     W     W      W      W
medium       W     W     W     W      W      W
large        W     W     W     W      W      W
```

Instead of relying on only one rating-specific curve, the matrix method uses information in both directions:

- how weight changes with **size at a given rating**; and
- how weight changes with **rating at a given size**.

Approach 2 retains the Approach 1 prediction as a prior but independently reconstructs the catalog cell using two matrix mechanisms.

## 9. Matrix estimator A — collaborative rating-ratio reconstruction

For a target catalog cell at size `s` and rating `r`, choose another rating `r0` for which the same size is available.

The weight relationship is written as:

```text
W(s,r) = W(s,r0) × M(r/r0, s)
```

where the rating multiplier is learned from other sizes:

```text
ln M(r/r0, s_i) = ln[ W(s_i,r) / W(s_i,r0) ]
```

The multiplier at the target size is interpolated from these observed log-ratios. Several available `r0` anchors are used and combined by a distance-weighted geometric mean. Ratings closer to the target rating receive greater weight.

For the validation of a target cell, the target `TypeDesc + NS + Rating` cell is removed before calculating its matrix estimate.

## 10. Matrix estimator B — local cross-ratio rectangles

Where the catalog contains a local rectangle around a target cell, a rank-one cross-ratio estimate can be formed from three other corners:

```text
W_hat(s,r)
    = W(s,r0) × W(s0,r) / W(s0,r0)
```

This can be interpreted as assuming that, over a local neighborhood, the size multiplier and rating multiplier are approximately separable.

Multiple valid rectangles are generated from nearby sizes `s0` and ratings `r0`. Their estimates are combined by a distance-weighted geometric mean. Close rectangles are favored over distant ones.

This estimator is useful because it does not require a polynomial shape and naturally uses the catalog's discrete structure.

## 11. Final Approach 2 stack

Let:

- `P_band` = Approach 1 size-banded prediction;
- `P_ratio` = collaborative rating-ratio matrix prediction;
- `P_cross` = cross-ratio rectangle matrix prediction.

The final Approach 2 estimate is a geometric stack:

```text
ln(P_A2)
    = w_band  × ln(P_band)
    + w_ratio × ln(P_ratio)
    + w_cross × ln(P_cross)
```

subject to:

```text
w_band >= 0
w_ratio >= 0
w_cross >= 0
w_band + w_ratio + w_cross = 1
```

If a matrix predictor is unavailable because the surrounding matrix is too sparse, its weight is redistributed to the available predictor(s). If neither matrix estimate can be formed, Approach 2 falls back to Approach 1.

## 12. Weight selection and leakage control

Stack weights are component-family-specific.

Weight selection uses five grouped meta-validation folds with a 0.10 simplex grid. The grouping key is:

```text
TypeDesc + NS + Rating
```

For every prediction used to score Approach 2:

- the target cell is excluded from the collaborative matrix calculation;
- the target cell is excluded from the cross-ratio calculation;
- the Approach 1 prior is its held-out size-band prediction;
- meta-stack weights for the test fold are selected from the other grouped cells.

This validation represents **isolated missing-cell reconstruction**. It is not a claim that an entirely missing size row or entirely missing rating column can be reconstructed to the same accuracy. When a whole region of the matrix is absent, Approach 1 is the required fallback.

## 13. Final Approach 2 accuracy

The finalized Approach 2 satisfies the requested aggregate MAPE target.

| Target | MAPE | Median APE | P90 APE | Within ±10% | Within ±15% |
|---|---:|---:|---:|---:|---:|
| RF/RTJ KG | **9.99%** | 6.19% | 18.23% | 69.84% | 84.75% |
| BW KG | **9.52%** | 6.27% | 20.48% | 66.11% | 82.23% |

### Improvement versus Approach 1

| Target | Approach 1 MAPE | Approach 2 MAPE | MAPE improvement | Approach 1 P90 | Approach 2 P90 |
|---|---:|---:|---:|---:|---:|
| RF/RTJ KG | 10.99% | **9.99%** | 1.00 points | 22.57% | **18.23%** |
| BW KG | 11.41% | **9.52%** | 1.89 points | 28.85% | **20.48%** |

The main benefit of Approach 2 is not only the reduction in mean error; the P90 error also drops materially, especially for BW.

## 14. Final stack weights

The tables below are the mean of the fold-optimal weights and are the recommended initial production weights. They should be regenerated automatically whenever the master is materially updated.

### RF/RTJ

| Component / family | Size-band prior | Collaborative matrix | Cross-ratio matrix |
|---|---:|---:|---:|
| Blind Flange | 0.12 | 0.04 | 0.84 |
| Flanged Ball Valve -Full Bore | 0.56 | 0.26 | 0.18 |
| Flanged Ball Valve -Short Pattern | 0.64 | 0.20 | 0.16 |
| Flanged Ball Valve-Reduced Bore | 0.66 | 0.06 | 0.28 |
| Flanged Control Valve | 0.20 | 0.64 | 0.16 |
| Flanged Gate Valve | 0.38 | 0.58 | 0.04 |
| Flanged Globe Valve | 0.44 | 0.06 | 0.50 |
| Flanged Swing check Valve | 0.38 | 0.62 | 0.00 |
| Flanged wafer Valve | 0.82 | 0.16 | 0.02 |
| Instrument-ESDV/UZV | 0.34 | 0.16 | 0.50 |
| Instrument-XCV | 0.18 | 0.14 | 0.68 |
| Lug type Valve | 0.82 | 0.12 | 0.06 |
| SPECTACLE BLIND | 0.82 | 0.00 | 0.18 |
| Triple Offset Flanged Butterfly valve | 0.90 | 0.02 | 0.08 |
| Wafer type Valve | 0.34 | 0.56 | 0.10 |
| Weldneck Flange | 0.50 | 0.22 | 0.28 |
| Weldneck Flange Series A | 0.92 | 0.08 | 0.00 |
| Weldneck Flange Series B | 0.10 | 0.64 | 0.26 |

### BW

| Component / family | Size-band prior | Collaborative matrix | Cross-ratio matrix |
|---|---:|---:|---:|
| Flanged Ball Valve -Short Pattern | 0.38 | 0.48 | 0.14 |
| Flanged Ball Valve-Reduced Bore | 0.46 | 0.24 | 0.30 |
| Flanged Control Valve | 0.36 | 0.40 | 0.24 |
| Flanged Gate Valve | 0.38 | 0.58 | 0.04 |
| Flanged Globe Valve | 0.24 | 0.68 | 0.08 |
| Flanged Swing check Valve | 0.46 | 0.54 | 0.00 |
| Instrument-ESDV/UZV | 0.32 | 0.16 | 0.52 |
| Instrument-XCV | 0.18 | 0.10 | 0.72 |

## 15. Important component-level limitation

The **<10% requirement is achieved at the aggregate target level**, not for every individual component family.

Families that still exceed 10% MAPE under Approach 2 include:

### RF/RTJ

- Blind Flange — approximately 18.8% MAPE, despite about 90.9% of rows being within ±15%; the mean is affected by a small number of large outliers.
- Flanged Ball Valve -Short Pattern — approximately 12.3% MAPE.
- Flanged Globe Valve — approximately 16.2% MAPE.
- Flanged wafer Valve — approximately 10.2% MAPE.
- Instrument-ESDV/UZV — approximately 11.2% MAPE.
- Instrument-XCV — approximately 15.4% MAPE.

### BW

- Flanged Ball Valve -Short Pattern — approximately 13.3% MAPE.
- Flanged Control Valve — approximately 13.5% MAPE.
- Instrument-ESDV/UZV — approximately 10.9% MAPE.
- Instrument-XCV — approximately 15.5% MAPE.

`Instrument-XCV` remains the clearest input-limited family. The master contains step changes that cannot be explained reliably by size and pressure rating alone. A discrete actuator/model/body-series field is expected to provide more improvement than adding mathematical complexity.

## 16. Deployment decision logic

Recommended production sequence:

```text
1. Exact master lookup
   if exact TypeDesc + NS + Rating (+ end type) exists:
       return master value

2. Approach 2
   if enough matrix support exists around the requested cell:
       calculate P_band
       calculate P_ratio
       calculate P_cross
       apply component stack weights
       return P_A2 with MATRIX_ASSISTED confidence flag

3. Approach 1 fallback
   if matrix support is insufficient but the NS is inside a validated size band:
       return size-band equation result
       flag EQUATION_BAND

4. Extrapolation
   if outside the validated band/matrix:
       return best available estimate only with LOW confidence
       explicitly mark as extrapolated
```

Exact master lookup is not included in the reported validation accuracy because it trivially returns the known source value and would overstate predictive performance.

## 17. Confidence flags

A practical implementation should return both a weight and a confidence status.

Suggested levels:

- **EXACT** — exact master cell exists.
- **HIGH** — Approach 2 with both matrix estimators supported by nearby cells.
- **MEDIUM** — Approach 2 with one matrix estimator plus Approach 1 prior.
- **EQUATION** — Approach 1 within a validated band.
- **LOW / EXTRAPOLATED** — outside validated size/rating support.

The output should also retain the model/weight source so estimates remain auditable.

## 18. Comparison of the two approaches

| Characteristic | Approach 1 — Size-banded equations | Approach 2 — Matrix-assisted stack |
|---|---|---|
| Primary structure | Component + rating + size band | Component size × rating matrix |
| Output form | Explicit equation | Weighted matrix reconstruction + equation prior |
| Interpretability | Very high | Medium |
| Implementation complexity | Low | Moderate |
| Requires surrounding catalog cells | No | Yes for full benefit |
| Works with sparse rating coverage | Better | Falls back to Approach 1 |
| RF/RTJ aggregate MAPE | 10.99% | **9.99%** |
| BW aggregate MAPE | 11.41% | **9.52%** |
| Best use | Standalone analytical estimator | Primary estimator for populated catalog regions |

## 19. Recommended implementation position

Both approaches should be retained.

**Approach 1 should remain the canonical analytical fallback** because it is transparent, compact, and can operate from only component/rating/size inputs.

**Approach 2 should be the preferred estimator inside well-populated catalog regions** because it reduces aggregate MAPE below 10% and improves tail error by using the relationships among neighboring ratings and sizes.

Approach 2 should not silently extrapolate through unsupported matrix regions. If matrix support is weak, the implementation must fall back to Approach 1 and expose the lower confidence.

## 20. Recalibration triggers

Re-fit both methods when any of the following occurs:

- material additions to `wtValveweights`;
- correction of source weights or dimensions;
- addition of new component families;
- addition of a new pressure class;
- addition of actuator/operator/body-series classification;
- substantial extension of the NS range.

On each regeneration, record:

- source commit SHA;
- row count;
- equation/band definitions;
- matrix stack weights;
- validation metrics by target and by `TypeDesc`;
- any families exceeding the selected error threshold.

## 21. Next engineering improvement

The most valuable next data enhancement is to add discrete construction information for the instrument/control families, especially:

- actuator/operator class;
- manufacturer/model or body series;
- body pattern;
- end-connection construction where not already explicit.

For the irregular families, these attributes are expected to improve prediction more than further polynomial or matrix complexity.

---

## Conclusion

Two production-grade empirical paths are retained:

1. **Approach 1:** size-banded analytical equations, with RF/RTJ MAPE 10.99% and BW MAPE 11.41%.
2. **Approach 2:** matrix-assisted stacked estimator, with RF/RTJ MAPE **9.99%** and BW MAPE **9.52%** under isolated-cell reconstruction validation.

Approach 2 therefore meets the requested **aggregate <10% MAPE** criterion for both targets, while Approach 1 remains the auditable fallback and extrapolation guardrail.
