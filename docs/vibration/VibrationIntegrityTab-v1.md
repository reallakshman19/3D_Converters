# Vibration Integrity Tab v1

## Purpose

The **Vibration Integrity** engineering tab is the first visible table-only product surface for the FIT benchmark workflow.

It consumes the public vibration APIs already implemented in this PR. It does not contain FIT equations, method constants, unit conversions, applicability logic or engineering-authority decisions.

## Navigation

```text
Engineering
  Engineering Calculations
  Vibration Integrity
  B31.3 Material Factors
  Empirical Weight Tuning
```

The tab is registered through `core/engineering-tabs-extension.js` and lazy-loads `tabs/vibration-integrity-tab.js`.

## Product boundary

The vibration product contains no 3D viewer or canvas.

```text
Advanced_Analysis 3D EDIT
        |
        | table export only
        v
Vibration Integrity
```

The phrase “3D EDIT” in the import control identifies the upstream source product; no model renderer or geometry interaction is embedded downstream.

## Authority banner

The tab always displays:

```text
BENCHMARK ONLY
NOT SCREENING / DESIGN AUTHORITY
```

There is no qualification-mode selector. The controller calls `runVibrationFacilityFitBenchmarkFromTables()`, whose public workflow fixes FIT execution to benchmark authority.

## Imports

### 3D EDIT table export

Accepted:

```text
.xlsx  -> complete five-sheet exchange expected
.csv   -> Elements-only limited exchange
```

XLSX is preferred because the current five-sheet export preserves Connections, Source Mapping, Catalogue Evidence and Export Metadata.

When CSV is selected the tab displays a limited-provenance warning. Execution still requires the explicit **Allow limited Elements-only CSV** opt-in.

### Operating cases

Strict `VibrationOperatingCaseCsv.v1` input. The tab offers a header-only template download.

### Vibration enrichment

Strict `VibrationEnrichmentCsv.v1` input. The tab offers a header-only template download.

The tab does not infer missing tables, units, geometry values or process values.

## Run path

The UI calls only public orchestration/read APIs:

```text
runVibrationFacilityFitBenchmarkFromTables()
buildVibrationWorkspaceModel()
serializeVibrationFacilityFitRegisterCsv()
```

The controller does not call `calculateFit()`, `calculateEngineering()` or `calculateEngineeringBatch()` directly.

Numerical execution remains inside the central workflow/Engineering Calculation API.

## Facility table

Columns:

```text
Line
Case
Canonical ID
Completeness
Standard LOF
Refined LOF
Governing reference LOF
Reference band
Qualification
Phase evidence
Correlation evidence
Review candidate
```

A row that was not calculated retains blank numerical cells and an explicit completeness state. The table never substitutes zero.

The tab intentionally has no `Pass`, `Safe`, `Risk Score`, `Facility Score` or `Vibration Score` field.

## Summary

The visible summary keeps independent dimensions:

```text
Rows
Visible
Calculated benchmark
Data incomplete
Calculation failed
Review candidates
```

These counts are workflow/read-model facts, not engineering risk aggregation.

## Filters and sort

Presentation controls are provided for:

```text
Line
Completeness
Reference band
Review candidate
Sort field
Sort direction
```

The underlying workspace model permits only non-numerical presentation sorts. Governing LOF ranking is not a v1 workspace feature.

## Row detail

Selecting a row exposes:

```text
Summary
Inputs
Case
Evidence
Source
Diagnostics
```

The data comes from `VibrationWorkspaceModel.v1` exact joins. The UI does not create or amend detail evidence.

## Register export

The tab can export the existing `VibrationFacilityFitRegister.v1` through `serializeVibrationFacilityFitRegisterCsv()`.

The exported CSV preserves benchmark/evidence/authority fields and blank non-calculated numerical cells.

## Styling

`tabs/vibration-integrity.css` uses a neutral/dark table workspace presentation. Benchmark limitation is highlighted, but calculated rows are not colored as “safe” or “pass.”

## Non-goals

- no 3D or canvas;
- no geometry rendering;
- no direct engineering calculation in UI;
- no method qualification promotion;
- no pass/safe claim;
- no universal risk score;
- no hidden engineering defaults;
- no issue #429 closure.
