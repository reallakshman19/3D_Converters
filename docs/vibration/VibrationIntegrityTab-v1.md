# Vibration Integrity Tab v1

## Purpose

The Vibration Integrity workspace is the table-first engineering surface for the vibration family. The current executable numerical mechanism is FIT (Flow-Induced Turbulence), but the facility register is line-centric and exposes the broader EI mechanism structure.

Navigation remains through the existing Engineering Calculations vibration entry. No standalone vibration navigation item, 3D viewer, canvas, model editor or embedded Advanced_Analysis runtime is introduced.

Numerical execution remains in the central Engineering Calculation API. UI modules do not own FIT equations, correlations, applicability rules or engineering authority.

## Engineering authority

The workspace always states:

```text
BENCHMARK ONLY
NOT SCREENING / DESIGN AUTHORITY
```

Current authority:

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false

all non-FIT mechanisms    = NOT_IMPLEMENTED
```

## Line-centric facility model

The primary result register is organized as:

```text
Line | Case | Shared status |
FIT | Mechanical | Recip/PD | Rotating stall | Deadlegs | Corrugations |
Slug | AIV | Transients | Cav/Flash | Thermowells | SBC |
Implemented governing | Qualification | Review
```

Only FIT can currently display a calculated result. Empty non-FIT mechanism cells mean **not evaluated / not implemented**, never zero, pass, safe or not applicable.

`Implemented governing` means governing only among mechanisms that actually executed. It is not a complete vibration-screening result.

The longer-term architecture is controlled by:

```text
docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md
```

## Load BENCHMARK

The workspace exposes **Load BENCHMARK** backed by:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
FIT-EI-WORKED-EXAMPLES-V1
```

Five controlled EI D2/D4 FIT cases load into the same working tables used for project data:

```text
Topology · Elements working table
Operating cases
Vibration enrichment
```

Published target values remain validation evidence only.

## Canonical original / working state

Each working table now retains explicit source and working state.

### Stable row identity

Source rows receive deterministic IDs such as:

```text
operating:source:0001
enrichment:source:0003
```

Rows added locally receive stable local IDs such as:

```text
topology:local:0001
```

Deleting a source row removes it from the visible working table but retains the record internally so a table revert can restore it.

### Cell state

For each visible cell the model retains:

```text
rowId
originalValue
workingValue
edited
```

The UI exposes original values as cell context and shows revert controls only where an original value exists.

### Revert behavior

**Cell revert** restores the source value. For a known engineering value/unit pair, reverting either member restores the pair atomically.

**Table revert**:

- restores original source values;
- restores deleted source rows;
- removes added local rows;
- clears engineering dirty state when the working engineering values again match the original state.

Topology authority is separate from engineering dirty state. Once a certified XLSX topology is edited, reverting values does **not** restore complete-exchange authority. Explicit source reload is required.

## Unit-aware editing

Known value/unit pairs use the central engineering unit layer:

```text
converters/engineering-calculations/units.js
```

Operating-case pairs include:

- mass flow;
- density;
- pressure;
- temperature;
- dynamic viscosity;
- velocity.

Known enrichment quantities include current FIT/shared geometry properties such as OD, WT, ID, maximum unsupported span and natural frequency.

A unit-only change converts the paired numeric working value so the physical quantity is preserved.

Unknown numeric enrichment properties are not guessed. Changing an existing unit to another unit without a known quantity mapping fails closed with:

```text
VIBRATION_INPUT_UNIT_CONTEXT_UNRESOLVED
```

## Topology provenance

### Untouched certified XLSX

A complete five-sheet XLSX may be displayed as editable Elements rows while execution continues to consume the original complete XLSX **until the first topology mutation**.

### First topology mutation

The first topology cell edit, row add or row delete latches:

```text
authorityDowngraded = true
sourceKind = LOCAL_ELEMENTS_OVERRIDE
```

Execution then uses:

```text
CSV_ELEMENTS_ONLY
*.edited-elements.csv
```

Populated topology rows show:

```text
Source Status = LOCAL_EDITED_UNVERIFIED
```

Connections, Source Mapping, Catalogue Evidence and Export Metadata are not claimed for that local override.

### Revert after topology mutation

Revert may restore the engineering values exactly, but the source-authority latch remains:

```text
dirty = false
authorityDowngraded = true
```

Execution remains Elements-only until the complete XLSX is explicitly reloaded.

### Generic Elements CSV

Header-compatible Elements CSV remains unverified:

```text
sourceSystem = UNVERIFIED_ELEMENTS_CSV
completeExchange = false
integrityStatus = LIMITED_ELEMENTS_ONLY
```

## Readiness and execution

The two user actions remain separate:

```text
Check readiness
Run FIT benchmark
```

Readiness consumes current working tables and stops before numerical calculation.

Run dynamically imports the existing facility FIT workflow and delegates calculation through the central Engineering Calculation API. The UI still never calls `calculateFit()`, `calculateEngineering()` or `calculateEngineeringBatch()` directly.

## Result currency

The workspace tracks explicit result currency:

```text
UNRUN
RUNNING
CURRENT_RESULT
STALE_RESULT
INVALID_INPUT
```

Engineering input edits and execution-option changes make a previous result:

```text
STALE_RESULT
```

The previous register/result remains visible for inspection, but:

- benchmark parity cannot report PASS;
- register export is disabled;
- the UI displays `STALE RESULT · rerun required`;
- a successful rerun is required to return to `CURRENT_RESULT`.

Filter, sort, row selection and detail-tab navigation are presentation-only and do not stale a result.

## Run snapshot

Immediately before FIT execution the controller captures:

```text
FitRunSnapshot.v1
  workingInputSchema = FitWorkingInputState.v1
  snapshotHash       = SHA-256
```

The canonical snapshot contains the exact working table rows and stable row IDs, source/authority state, limited-exchange choice and active benchmark identity/modified state.

The snapshot hash is displayed with the current result and is retained with stale results for reproducibility evidence.

This is currently a working-state/evidence snapshot. A later shared engineering-basis stage will separate normalized engineering-input hashing from broader provenance/evidence hashing.

## Benchmark comparison semantics

For an untouched benchmark with a `CURRENT_RESULT`, the UI may show published target versus actual FIT parity.

After any engineering modification:

```text
Not applicable · inputs modified
```

If values are exactly reverted, the benchmark can return to unmodified working state, but any previous result is still stale until rerun.

If the result itself is stale:

```text
Stale result · rerun required
```

No official parity PASS is shown from stale output.

## Source tables remain execution contracts

Current import/storage contracts remain:

```text
TopologyEditTableHumanExport.Elements
VibrationOperatingCaseCsv.v1
VibrationEnrichmentCsv.v1
```

These raw tables remain the authoritative current execution input for PR442. The next roadmap stage will add a joined engineer-facing line/case projection without creating a second editable authority store.

## Validation / release gate

The release command remains:

```bash
npm run verify:vibration-fit-release
```

The controlled manifest now includes dedicated regressions for:

- working original/working row state;
- stable row IDs;
- revert semantics;
- run snapshots;
- topology authority latching;
- stale/current result semantics;
- line-centric mechanism matrix;
- existing FIT engineering/workflow/benchmark/provenance behavior.

## Non-goals

- no new numerical mechanism;
- no FIT equation/correlation/applicability change;
- no screening/design authority promotion;
- no UI-side engineering calculation;
- no silent unit inference;
- no automatic topology re-certification;
- no universal vibration/risk/confidence score;
- no second editable source of truth;
- no AIV/deadleg/transient/thermowell/SBC solver in this stage.
