# Vibration Integrity Tab v1

## Purpose

The **FIT Vibration Integrity workspace** is the first visible table-only product surface for the FIT benchmark workflow. It is reached from the existing **Vibration & Dynamic Screening** calculation family rather than through a standalone navigation item or a new Engineering subtab.

It consumes public vibration APIs. It does not contain FIT equations, method constants, unit conversions, applicability logic or engineering-authority decisions.

## Navigation

```text
Engineering
  Engineering Calculations
    Calculations
      Vibration & Dynamic Screening (6)
        Acoustic-Induced Vibration Screening          BLOCKED
        Cavitation / Flashing Screening               BLOCKED
        Flow-Induced Vibration Screening              BENCHMARK_ONLY -> FIT workspace
        Small-Bore Connection Vibration Screening     BLOCKED
        Slug Load / Time-History Assessment           BLOCKED
        Surge / Momentum Load Screening               BLOCKED
    B31.3 Material Factors
    Empirical Weight Tuning
    HP Piping Class
```

`core/engineering-tabs-extension.js` and `tabs/engineering-workspace-tab.js` retain the current-main Engineering workspace hierarchy. No new Vibrations subtab is added.

Inside `tabs/engineering-calculations-tab.js`, selecting the registered VIB family opens the family landing surface rendered by `tabs/engineering-calculation-vibration-family.js`. Selecting FIT uses the existing registered `VIB.FIV.FLOW_TURBULENCE` definition and dynamically mounts `tabs/vibration-integrity-tab.js` in the Console product host.

## Vibration family landing

The family landing is a mechanism selector backed directly by registered calculation definitions. Authority/status badges therefore come from each definition rather than UI hard-coding.

Current family:

```text
Vibration & Dynamic Screening
6 mechanisms
```

FIT is the only mechanism with an implemented benchmark/reference path. The other five mechanisms retain their registered `BLOCKED` state under issue #429.

The family landing contains:

- the mechanism name and stable calculation ID;
- registered qualification state;
- qualification issue reference;
- declared applicability/limitations;
- explicit `Design authority: NO`;
- **Open FIT workspace** only for `VIB.FIV.FLOW_TURBULENCE`;
- **View qualification basis** for blocked mechanisms.

The landing layer contains no `calculateFit()`, `calculateEngineering()` or `calculateEngineeringBatch()` call and no 3D/canvas behavior.

## Product boundary

The vibration product contains no 3D viewer or canvas.

```text
Advanced_Analysis 3D EDIT
        |
        | table export only
        v
Engineering Calculations / Vibration & Dynamic Screening
        |
        v
FIT Vibration Integrity workspace
```

The phrase “3D EDIT” identifies the upstream source product; no model renderer or geometry interaction is embedded downstream.

## Authority banner

The FIT workspace always displays:

```text
BENCHMARK ONLY
NOT SCREENING / DESIGN AUTHORITY
```

There is no qualification-mode selector in the table workspace.

## Imports

### 3D EDIT table export

Accepted:

```text
.xlsx  -> complete five-sheet exchange expected
.csv   -> Elements-only limited exchange
```

XLSX is preferred because the current five-sheet export preserves Connections, Source Mapping, Catalogue Evidence and Export Metadata.

When CSV is selected the workspace displays a limited-provenance warning. Readiness/benchmark work still requires the explicit **Allow limited Elements-only CSV** opt-in where a complete exchange would otherwise be required.

### Operating cases

Strict `VibrationOperatingCaseCsv.v1` input. The workspace offers a header-only template download.

### Vibration enrichment

Strict `VibrationEnrichmentCsv.v1` input. The workspace offers a header-only template download.

The workspace does not infer missing tables, units, geometry values or process values.

## Readiness versus numerical execution

The visible workflow deliberately separates:

```text
Check readiness
Run FIT benchmark
```

### Check readiness

`buildVibrationFacilityFitPreflightFromTables()` parses the same topology/process/enrichment tables, assembles `VibrationIntegrityDataset.v1`, builds `VibrationFacilityFitPlan.v1`, and stops.

It does not execute the central Engineering Calculation API.

Visible readiness columns:

```text
Line
Case
Canonical ID
Readiness
Missing
Invalid
Reasons
Request prepared
```

The readiness panel contains no LOF or reference-result columns.

### Run FIT benchmark

The full benchmark workflow is dynamically imported only after the operator explicitly selects **Run FIT benchmark**.

The controller then calls `runVibrationFacilityFitBenchmarkFromTables()`, which remains benchmark-only and delegates numerical execution to the central Engineering Calculation API.

The FIT workspace UI does not call `calculateFit()`, `calculateEngineering()` or `calculateEngineeringBatch()` directly.

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

The workspace intentionally has no `Pass`, `Safe`, `Risk Score`, `Facility Score` or `Vibration Score` field.

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

Presentation controls:

```text
Line
Completeness
Reference band
Review candidate
Sort field
Sort direction
```

The underlying workspace model permits only non-numerical presentation sorts. Governing LOF ranking is not a v1 workspace feature.

## Structured row detail

Selecting a row exposes:

```text
Summary
Inputs
Case
Evidence
Source
Diagnostics
```

The detail renderer is `tabs/vibration-integrity-detail-view.js`. It consumes only `VibrationWorkspaceModel.v1` detail data and does not calculate or resolve values.

### Summary

Keeps identity, reference-result values and qualification/evidence dimensions visibly separate.

### Inputs

Displays the prepared benchmark request as:

```text
Input | Value | Unit | Source context
```

No prepared request means no fabricated Inputs table.

### Case

Shows operating-case identity/provenance, process quantity value/unit/reference rows, and exact Canonical-ID enrichment rows:

```text
Property | Case scope | Value | Unit | Source | Revision | Status | Reviewer
```

### Evidence

Shows the actual qualification model and evidence coverage rather than a synthesized confidence score:

```text
Qualification
Phase / hydraulic-path evidence
Standard-correlation evidence
Advanced-correlation evidence
Reference-band evidence
Engineering-review candidate metadata
Calculation equation IDs / input resolution
```

The view explicitly retains:

```text
pointCoverageOnly
domainCoverageEstablished
screeningAuthorized
engineeringAuthority
```

so an EI-worked-example review candidate cannot appear to be authorized screening.

### Source

Displays assessment-point, operating-case and geometry/vibration source trace with revisions/record IDs/status/reviewer/selection where available.

### Diagnostics

Displays missing, invalid, error-code and central-error information. No error is converted to a numerical result.

All imported/source strings are HTML-escaped by the renderer.

## Register export

The workspace exports the existing `VibrationFacilityFitRegister.v1` through `serializeVibrationFacilityFitRegisterCsv()`.

The exported CSV preserves benchmark/evidence/authority fields and blank non-calculated numerical cells.

## Styling

The family landing uses `tabs/engineering-calculations.css`, preserving the existing Console visual language. `tabs/vibration-integrity.css` owns the table workspace presentation. Benchmark limitation is highlighted, but calculated rows are not colored as “safe” or “pass.” Structured detail uses tables rather than raw JSON-heavy panels.

## Non-goals

- no new Engineering Vibrations subtab;
- no standalone Vibration Integrity navigation item;
- no 3D or canvas;
- no geometry rendering;
- no direct engineering calculation in the family landing or FIT workspace UI;
- no method qualification promotion;
- no pass/safe claim;
- no universal risk/confidence score;
- no hidden engineering defaults;
- no issue #429 closure.
