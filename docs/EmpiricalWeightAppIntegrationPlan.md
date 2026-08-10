# Empirical Weight Basis — Application Integration Plan

**Status:** DESIGN / POST-X003 ENHANCEMENT — NOT YET RUNTIME AUTHORITY  
**Repository:** `reallaksh19/3D_Converters`  
**Governing model specification:** `docs/EmpericalWeightconceptNote.md` at commit `8901a226518a2745add933e8adba28e5626086db`  
**Verified governing blob:** `e04b1d4287b1f7db06a5ae033ce6c81de2de3b5b`  
**Date:** 10 August 2026

---

## 1. Purpose

Use the empirical valve/fitting weight basis in the application **only as a traceable candidate-generation engine** feeding Weight Match.

It shall not become a hidden source of accepted mass.

The authority chain remains:

```text
source/master facts
    ↓
empirical candidate(s) + provenance/confidence
    ↓
Weight Match operator decision = RigidMatch1
    ↓
Finalise-and-Run operator decision = Rigidmatch2
    ↓
physical-component mass allocation/conservation
    ↓
kg→N conversion
    ↓
CII RIGID record
```

No empirical prediction may directly write `rigidWeightMatch1`, `rigidWeightFinal`, `<Weight>`, or a CII rigid force.

---

## 2. Governing model contract

Implementation shall decode and use the machine-readable payload from the governing specification rather than retyping equations from prose.

At load time the decoder shall prove at minimum:

```text
specification commit = 8901a226518a2745add933e8adba28e5626086db
specification blob   = e04b1d4287b1f7db06a5ae033ce6c81de2de3b5b
A1 model count       = 270
required matrices    = present
required constants   = present
required metrics     = present
```

A decoder/model validation failure disables empirical candidates and produces a diagnostic. It must not fall back to an unsourced formula.

---

## 3. Predictor routing

The runtime routing shall follow the specification exactly:

```text
EXACT
  ↓ unavailable
A2_MATRIX
  ↓ unavailable
A1_SIZE_BAND
  ↓ unavailable / outside validated range
EXTRAPOLATED   [only when explicitly enabled]
```

### EXACT

Use the exact median master cell for the requested family/type/size/rating when available.

### A2_MATRIX

Use the specification's exact size × rating matrix construction, median cell aggregation, collaborative rating-ratio algorithm, cross-ratio rectangle algorithm, interpolation/extrapolation rules, trimming, distance weighting, and family-specific geometric stacking.

### A1_SIZE_BAND

Use the exact one of 270 registered size-band equations selected by the governing band-routing rules. Preserve the declared model type (`LOG1`, `LOG2`, `RAW1`, `RAW2`) and full-precision coefficients.

### EXTRAPOLATED

Only available when a caller/UI setting explicitly permits extrapolation. Always classify as `LOW` confidence and surface the extrapolation basis to the reviewer.

---

## 4. Canonical predictor input

Introduce an immutable input contract equivalent to:

```json
{
  "schema": "empirical-weight-observation/v1",
  "physicalComponentGroupId": "...",
  "family": "RF_RTJ | BW",
  "typeDesc": "...",
  "nominalSize": {
    "ns": null,
    "dnMm": 100,
    "source": "preview|xml|master|staged"
  },
  "rating": "150",
  "componentType": "VALV",
  "componentRefNo": "=...",
  "dtxr": "...",
  "sourceId": "..."
}
```

Rules:

1. Use the same `WPC1` physical-component identity established by X003.
2. Preserve the original family/type/size/rating inputs and their provenance.
3. Do not substitute a hidden default size, rating, family, or valve type.
4. Missing predictors use only the specification's declared missing-predictor renormalization rules.
5. If the model cannot make a governed prediction, return `UNAVAILABLE`; do not invent a value.

---

## 5. Canonical predictor output

Return a structured candidate, not a bare number:

```json
{
  "schema": "empirical-weight-candidate/v1",
  "physicalComponentGroupId": "...",
  "weightKg": 75.0,
  "route": "EXACT | A2_MATRIX | A1_SIZE_BAND | EXTRAPOLATED",
  "confidence": "EXACT | HIGH | MEDIUM | EQUATION | LOW",
  "family": "RF_RTJ",
  "typeDesc": "...",
  "size": "...",
  "rating": "150",
  "modelId": "...",
  "sizeBand": "...",
  "modelType": "LOG1",
  "predictorsUsed": [],
  "predictorsMissing": [],
  "normalizedStackWeights": {},
  "extrapolated": false,
  "specCommit": "8901a226518a2745add933e8adba28e5626086db",
  "specBlob": "e04b1d4287b1f7db06a5ae033ce6c81de2de3b5b",
  "payloadDigest": "..."
}
```

Every displayed empirical number must therefore answer: **which model, which inputs, which route, which confidence, and which specification produced it?**

---

## 6. Weight Match integration

The existing candidate ranking UI is the correct integration point.

Add empirical candidates alongside master/exact/semantic candidates with visibly distinct method labels, for example:

```text
75 kg · Exact master
78 kg · A2 matrix · HIGH
81 kg · A1 size-band · EQUATION
95 kg · Extrapolated · LOW
```

Recommended ranking rules:

1. exact governed master match remains highest;
2. `EXACT` empirical route is equivalent to its exact master-cell provenance, not a separate duplicate candidate;
3. `A2_MATRIX` HIGH/MEDIUM candidates rank below exact matches;
4. `A1_SIZE_BAND` candidates rank below qualified A2 candidates;
5. `EXTRAPOLATED` candidates are never auto-preferred unless the Owner later explicitly authorizes that policy;
6. existing semantic/type/rating evidence may help select among candidates, but must not change a predicted weight silently.

`Use All Suggestions` may populate editable UI fields, but the values become `RigidMatch1` only through the existing explicit Weight Match save/finalize action.

---

## 7. Final-review boundary

The empirical predictor has **no direct role** in `Rigidmatch2` authority.

Final review shall display, for each `WPC1` physical component:

```text
source XML mass
RigidMatch1 accepted mass
current empirical/master candidate provenance
prior Rigidmatch2, if any
editable Final mass
```

The reviewer explicitly accepts or skips Final review under the X003 lifecycle. A predictor refresh must never overwrite a previously accepted Final value.

---

## 8. Evidence requirements

Extend Weight Match evidence so each accepted Match1 decision may retain the candidate that led to it:

```text
physicalComponentGroupId
acceptedKg
candidateSource = empirical/master/manual
route
confidence
modelId / sizeBand / modelType
input family/type/size/rating
predictors used/missing
normalized stack weights
extrapolation flag
spec commit/blob/payload digest
```

`<RigidMatch1>` records the accepted decision plus candidate provenance.
`<Rigidmatch2>` records only the explicit Final disposition and accepted Final mass; it must not regenerate predictor results later.

---

## 9. Runtime module boundary

Recommended new modules:

```text
converters/xml-cii2019-core/empirical-weight-model-decoder.js
converters/xml-cii2019-core/empirical-weight-predictor.js
converters/xml-cii2019-core/empirical-weight-candidate-adapter.js
```

Responsibilities:

### `empirical-weight-model-decoder.js`

- decode gzip+Base64 payload;
- validate schema/model count/constants/matrices;
- expose immutable model registry;
- expose specification/model digest.

### `empirical-weight-predictor.js`

- implement EXACT → A2 → A1 → EXTRAPOLATED routing;
- use only decoded model data and declared algorithms;
- return the canonical candidate contract;
- no UI, XML mutation, persistence, or kg→N conversion.

### `empirical-weight-candidate-adapter.js`

- translate Preview/DTXR/Weight Match component facts into predictor input;
- attach `WPC1` identity;
- convert predictor output into existing ranked-candidate UI shape;
- retain full provenance behind the displayed chip.

This ownership boundary prevents the predictor from becoming another parallel weight authority.

---

## 10. Qualification

Before enabling empirical candidates in production, retain deterministic tests for:

1. decoder payload digest and exactly 270 A1 models;
2. RF/RTJ exact matrix cell;
3. BW exact matrix cell;
4. A2 collaborative ratio case;
5. A2 cross-ratio rectangle case;
6. A2 interpolation case;
7. A1 routing into each model family (`LOG1`, `LOG2`, `RAW1`, `RAW2`);
8. missing-predictor renormalization;
9. extrapolation blocked by default;
10. extrapolation allowed → `LOW` confidence;
11. no matching model → `UNAVAILABLE`;
12. two different `WPC1` components never share accepted state;
13. predictor refresh does not mutate Match1/Final;
14. accepted Match1 evidence retains exact predictor provenance;
15. Final override still supersedes Match1 and source XML;
16. split-child mass conservation remains unchanged after empirical integration.

Re-run the governing GLRD qualification after candidate integration. The empirical model must improve suggestion coverage without changing already-qualified authority, conservation, coordinate, OD, or packaging mechanics.

---

## 11. Implementation sequencing

Do not implement the empirical predictor on the historical X003 defect baseline.

Required sequence:

```text
1. finish X003 authority closure
2. execute local X003/X004/X005/X006 aggregate on exact checkout
3. reconcile the closure branch with current main, including commit 8901a226...
4. verify docs/EmpericalWeightconceptNote.md blob e04b1d42...
5. implement decoder + pure predictor
6. qualify predictor independently against canonical master data
7. integrate as Weight Match candidate source only
8. re-run XML→CII local qualification
9. include empirical-candidate behavior in X007 browser proof if it is part of the release candidate
```

Until those steps are complete:

```text
EMPIRICAL_WEIGHT_SPECIFICATION = GOVERNING_MODEL_SOURCE
EMPIRICAL_APP_INTEGRATION       = DESIGN_ONLY
EMPIRICAL_PREDICTION            = NOT_ACCEPTED_WEIGHT_AUTHORITY
```
