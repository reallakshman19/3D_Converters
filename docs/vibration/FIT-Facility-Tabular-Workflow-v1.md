# FIT Facility Tabular Workflow v1

Status: **TABLE-INPUT BENCHMARK WORKFLOW — NO SCREENING OR DESIGN AUTHORITY**

## 1. Purpose

`VibrationFacilityFitTabularWorkflow.v1` is the file/table ingestion façade for the table-first FIT facility workflow.

It accepts:

- a 3D EDIT topology/table source;
- optional operating-case CSV;
- optional vibration-enrichment CSV;

and delegates immediately to the existing `VibrationFacilityFitWorkflow.v1`.

No dataset join, readiness rule, engineering calculation or read-model logic is duplicated here.

## 2. API

```js
runVibrationFacilityFitBenchmarkFromTables({
  topology: {
    format,
    data,
    sourceFileName,
  },
  operatingCaseCsv,
  enrichmentCsv,
}, {
  allowLimitedExchange: false,
})
```

## 3. Authority

Every returned object contains:

```text
authority = TABULAR_WORKFLOW_ORCHESTRATION_ONLY
engineeringAuthority = NONE
screeningAuthorized = false
qualificationMode = benchmark
```

The façade cannot change FIT qualification mode.

Unsupported options such as `qualificationMode` or `designAuthority` are rejected by the underlying workflow option contract.

## 4. Topology input formats

Supported `topology.format` values:

```text
PARSED_EXCHANGE
XLSX
CSV_ELEMENTS_ONLY
```

### PARSED_EXCHANGE

`topology.data` is an already parsed:

```text
VibrationTableExchange.v1
```

This is useful for callers that separately manage file parsing or cached exchange state.

### XLSX

`topology.data` is XLSX bytes accepted by:

```text
parseVibrationTableExchangeXlsx()
```

The existing five-sheet `TopologyEditTableHumanExport.v1` contract applies.

This path is implemented but cannot be executed in the current agent runtime because the complete repo `xlsx@0.18.5` dependency tree is unavailable there. It must be covered by the repository parser suite when normal checkout/CI is restored.

### CSV_ELEMENTS_ONLY

`topology.data` is the current 3D EDIT Elements-only CSV.

It parses as:

```text
integrityStatus = LIMITED_ELEMENTS_ONLY
completeExchange = false
```

The overall workflow rejects it by default.

The caller must explicitly opt in:

```js
{ allowLimitedExchange: true }
```

All limited-exchange warnings remain visible downstream.

## 5. Operating-case input

When `operatingCaseCsv` is present, it is parsed only through:

```text
parseVibrationOperatingCaseCsv()
```

When it is absent/null/empty string:

```text
operatingCases = []
```

No default process case is created.

## 6. Enrichment input

When `enrichmentCsv` is present, it is parsed only through:

```text
parseVibrationEnrichmentCsv()
```

When absent/null/empty string:

```text
enrichment = []
```

No default FIT assessment point or geometry enrichment is created.

## 7. Returned import metadata

The façade returns:

```text
imports.topologyFormat
imports.topologySourceFileName
imports.exchangeSchema
imports.exchangeIntegrityStatus
imports.operatingCaseCount
imports.enrichmentCount
```

These are ingestion facts only.

The complete underlying workflow is returned as:

```text
workflow
```

## 8. Error ordering

The façade fails as early as possible:

```text
unsupported topology format
  -> fail before parsing process tables

malformed topology table
  -> fail before dataset assembly

malformed operating/enrichment CSV
  -> fail before dataset assembly/calculation

invalid joins/data completeness
  -> dataset/planner stage

FIT applicability/calculation error
  -> central Engineering Calculation stage
```

This ordering keeps syntax/import defects separate from engineering applicability defects.

## 9. No default behavior

If topology is valid but no process/enrichment tables are supplied:

```text
exchange -> parsed
operating cases -> []
enrichment -> []
dataset -> valid topology dataset
plan -> zero FIT assessment points
result/register -> zero rows
warning -> NO_FIT_ASSESSMENT_POINTS
```

The system does not assume operating conditions or FIT locations merely because a topology file exists.

## 10. Intended UI use

A table-only workspace upload sequence can map directly to this façade:

```text
1. Upload 3D EDIT XLSX
2. Upload HMB operating-case CSV
3. Upload vibration-enrichment CSV
4. Run benchmark preflight/workflow
5. Display register + data-quality warnings
```

A UI may also keep the parsed exchange in memory and use `PARSED_EXCHANGE` after the first upload.

No 3D model viewer is needed.

## 11. Provenance and evidence

The tabular façade does not flatten provenance.

Detailed data remain available through:

```text
workflow.dataset
workflow.plan
workflow.result
workflow.register
```

This preserves the same RESULT -> WHY -> EVIDENCE workflow as the lower-level APIs.

## 12. Qualification boundary

Even a complete and successfully calculated tabular workflow remains:

```text
FIT = BENCHMARK_ONLY
screeningAuthorized = false
designAuthority = false
```

Promotion to production screening remains governed by issue #429, full method/project review, full regression and independent engineering approval.
