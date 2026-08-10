# Engineering Masters UI

## Navigation

The standalone FormatConverters shell is extended with an `Engineering` group containing:

- `B31.3 Material Factors`
- `Empirical Weight Tuning`

The extension is installed by `core/app.js` after the normal standalone runtime initializes. It deliberately avoids changing the frozen core tab registry.

## B31.3 Material Factors

The tab is a governed working-copy editor for the material identity and `S`, `E`, `W`, and `Y` master exposed by `converters/b313-material-factors`.

Features:

- family/material coverage dashboard;
- material identity viewer;
- editable S/E/W/Y candidate records;
- candidate validation;
- local draft save, JSON import, and JSON export;
- API-backed candidate calculation preview using explicit factor overrides.

Candidate edits never replace the active resolver. Publishing controlled engineering factors remains a reviewed repository/master-generation action.

## Empirical Weight Tuning

The tab exposes the existing empirical model as a candidate working copy:

- Approach 1 size-band coefficients;
- Approach 2 constants;
- per-target/per-family stack weights `[A1 prior, collaborative ratio, cross-ratio matrix]`;
- structural validation;
- local draft save and JSON import/export;
- side-by-side active/candidate Approach 2 preview.

`createEmpiricalWeightEstimator({ model: candidate })` is used for previews, so candidate edits do not mutate the default exported estimator.

## Triggers

Users can open either Engineering tab from the left navigation. Other modules can deep-link by dispatching:

```js
window.dispatchEvent(new CustomEvent('app:switch-tab', {
  detail: {
    tabId: 'b313-material-factors',
    context: { materialId: 'LTCS-A333-6', temperatureC: -46 }
  }
}));
```

or:

```js
window.dispatchEvent(new CustomEvent('app:switch-tab', {
  detail: {
    tabId: 'empirical-weight-tuning',
    context: { typeDesc: 'Flanged Gate Valve', target: 'RF/RTJ KG', rating: 300, ns: 4 }
  }
}));
```

The engineering extension persists the selected Engineering tab using the app's existing active-tab storage key.

## Governance

The UI separates four states conceptually:

1. active/published model or factor master;
2. editable candidate working copy;
3. locally saved draft;
4. repository publication after validation/review.

This first implementation intentionally does not let a cell edit or draft save activate production engineering data.
