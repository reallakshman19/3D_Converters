# Vibration Integrity Tab v1

## Purpose

The **FIT Vibration Integrity workspace** is the table-only product surface for the FIT benchmark workflow. It is reached through the existing calculation family:

```text
Engineering Calculations
  -> Calculations
     -> Vibration & Dynamic Screening (6)
        -> Flow-Induced Vibration Screening
           -> Open FIT workspace
```

There is no standalone Vibration Integrity navigation item and no additional Engineering Vibrations subtab.

The workspace contains no FIT equations, constants, applicability decisions or engineering-authority logic. Numerical execution remains in the central Engineering Calculation API.

## Permanent product boundary

```text
Advanced_Analysis 3D EDIT
        |
        | certified table export only
        v
FIT Vibration Integrity
        |
        +--> editable working tables
        +--> readiness
        +--> benchmark execution
        +--> evidence / register
```

No 3D viewer, canvas, geometry renderer, model picker or embedded Advanced_Analysis runtime is part of the vibration product.

## Engineering authority

The workspace always displays:

```text
BENCHMARK ONLY
NOT SCREENING / DESIGN AUTHORITY
```

There is no qualification-mode selector and no `Pass`, `Safe`, universal vibration score, risk score or confidence score.

## Load BENCHMARK

The workspace exposes a **Load BENCHMARK** action backed by the controlled EI worked-example set:

```text
FIT-EI-WORKED-EXAMPLES-V1
Energy Institute / AVIFF 2nd Edition
Appendix D D2 / D4
```

Available cases are the same five cases controlled in:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
```

The UI case catalogue is regression-bound to that source file; it does not invent separate demonstration values.

Loading a benchmark populates the same three working tables used for project data:

```text
Topology · Elements working table
Operating cases
Vibration enrichment
```

The user can inspect every input before running the normal benchmark workflow.

### Published target versus actual

For an untouched controlled case the benchmark card shows:

- EI source/example location;
- published standard LOF;
- published reference band;
- published support category/stiffness where available;
- calculated standard LOF;
- calculated reference band;
- relative LOF delta;
- benchmark parity status.

The controlled relative tolerance remains the tolerance in the benchmark evidence dataset.

Benchmark parity is **validation evidence only**. It is not FIT screening/design acceptance.

### Modified benchmark behavior

The first edit to any loaded benchmark working table marks that benchmark as modified and clears stale readiness/results.

The original published target remains visible only as a reference to the original EI case. The UI then reports:

```text
Not applicable · inputs modified
```

It must not display an official benchmark parity PASS/FAIL for changed inputs. Reload **Load BENCHMARK** to restore the exact controlled case.

## Editable working tables

All visible FIT input data is represented in editable raw-contract tables before readiness/execution.

### Topology · Elements

Columns are exactly the `TopologyEditTableHumanExport.v1` Elements columns.

The table supports:

- cell editing;
- add row;
- delete row;
- Elements CSV import;
- Elements view populated from a complete five-sheet XLSX.

### Operating cases

Columns are exactly `VibrationOperatingCaseCsv.v1`.

CSV import first populates the visible table. The current table cells—not hidden original upload bytes—are serialized through the existing strict parser contract for readiness/execution.

### Vibration enrichment

Columns are exactly `VibrationEnrichmentCsv.v1`.

The same rule applies: CSV import populates editable rows and the current rows become the execution input.

The workspace does not infer missing units, geometry, process quantities or enrichment values.

## Topology provenance and editing

### Unedited certified XLSX

A valid complete five-sheet XLSX is parsed to display its Elements rows, but while the Elements working table remains unmodified the numerical workflow still consumes the original XLSX exchange. This preserves the richer declared exchange evidence:

```text
Elements
Connections
Source Mapping
Catalogue Evidence
Export Metadata
```

### First topology edit

The first topology cell edit, row addition or row deletion intentionally breaks the link to certified topology authority for execution.

The workflow switches to a serialized local Elements-only working file named like:

```text
plant-certified.edited-elements.csv
```

The UI automatically treats this as limited input and displays a warning that Connections, Source Mapping, Catalogue Evidence and Export Metadata are not claimed for the edited working copy.

The vibration product does **not** re-certify edited topology.

### Generic Elements CSV

A header-compatible Elements CSV is parsed with:

```text
sourceSystem = UNVERIFIED_ELEMENTS_CSV
completeExchange = false
integrityStatus = LIMITED_ELEMENTS_ONLY
```

Header compatibility alone does not establish that the CSV was produced by certified Advanced_Analysis 3D EDIT. Authority hashes remain null and an explicit unverified-source warning is retained.

## Import behavior

Accepted topology inputs:

```text
.xlsx  -> complete five-sheet exchange expected
.csv   -> Elements-only limited/unverified exchange
```

The user may also load:

```text
VibrationOperatingCaseCsv.v1
VibrationEnrichmentCsv.v1
```

Both CSVs become editable working tables immediately after load.

Header-only template downloads remain available.

## Readiness versus execution

The workflow remains deliberately separated:

```text
Check readiness
Run FIT benchmark
```

### Check readiness

`buildVibrationFacilityFitPreflightFromTables()` consumes the **current working tables**, assembles the dataset/plan and stops before numerical execution.

Visible readiness fields remain:

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

No LOF fields are shown in readiness.

### Run FIT benchmark

The numerical benchmark workflow is dynamically imported only after the explicit **Run FIT benchmark** action.

The controller calls `runVibrationFacilityFitBenchmarkFromTables()` with the current working table data. That workflow delegates numerical execution to the central Engineering Calculation API.

The FIT UI never calls:

```text
calculateFit()
calculateEngineering()
calculateEngineeringBatch()
```

directly.

## Mutation semantics

Any working-table mutation:

1. marks that table dirty;
2. clears stale readiness/result/workspace state;
3. marks an active benchmark modified;
4. for topology mutation, enables limited-exchange behavior and uses local Elements CSV on the next run.

This prevents results from remaining visible against inputs that no longer produced them.

## Facility register

The existing facility register remains unchanged in engineering semantics. It displays benchmark/reference outputs such as:

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

Non-calculated rows retain blank numerical cells; zero is never substituted.

## Structured detail

Selecting a result row retains the existing structured views:

```text
Summary
Inputs
Case
Evidence
Source
Diagnostics
```

Evidence dimensions remain separate; the UI does not collapse them into a confidence/risk score.

## Register export

`VibrationFacilityFitRegister.v1` can still be exported through `serializeVibrationFacilityFitRegisterCsv()`.

## Validation / release gate

The one-command release gate remains:

```bash
npm run verify:vibration-fit-release
```

It includes the editable-table, UI benchmark mapping, topology-provenance and working-input runtime regressions in addition to the existing FIT engineering/workflow/UI tests.

## Non-goals

- no new Engineering navigation item;
- no 3D/canvas/model editing;
- no FIT equation or method-authority change;
- no screening/design promotion;
- no UI-side calculation;
- no local topology re-certification;
- no universal score or safe/pass claim;
- no hidden engineering defaults;
- no AIV implementation in this workspace change.
