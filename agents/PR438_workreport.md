# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only vibration data pipeline without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR status | OPEN / DRAFT / mergeable at last check |
| Current stage | Stage 17 — IN_PROGRESS: facility FIT readiness/request planning from `VibrationIntegrityDataset.v1` |
| Last completed stage | Stage 16 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR EXECUTION VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Dataset/planning layers carry no method authority. |
| Validation status | EI/domain focused PASS; coverage/candidate smoke PASS; Stage 15 exchange fixture PASS; Stage 16 exact committed Node test NOT_RUN because this execution container cannot resolve GitHub raw hosts / lacks a complete checkout. |
| Current blocker | Full repository regression, actual `xlsx@0.18.5` exchange regression, full licensed T2.2 page review and independent vibration-engineer approval remain open. |
| Exact next action | Build deterministic FIT readiness items from dataset line/case/element evidence, create central Engineering Calculation requests only when required data exist, keep incomplete rows as `NOT_READY` instead of inventing defaults, and do not execute screening mode. |

### Handover in 60 Seconds

**FIT state:** `VIB.FIV.FLOW_TURBULENCE` is a source-traceable benchmark-only implementation reconciled to retained workbook references and EI Appendix D D2/D4 examples. Strict/screening central execution is blocked.

**Evidence state:** successful FIT results carry `FIT-REFERENCE-COVERAGE-V1` and `FIT-SCREENING-CANDIDATE-V1`. Neither grants authority.

**Table boundary:** Advanced_Analysis owns 3D EDIT; vibration consumes table data only. No 3D viewer, canvas, geometry rendering or spatial heatmap.

**Stage 15 delivered:** `VibrationTableExchange.v1` parses the current five-sheet 3D EDIT XLSX and explicitly downgrades current Elements-only CSV to `LIMITED_ELEMENTS_ONLY`.

**Stage 16 delivered:** `VibrationIntegrityDataset.v1` combines parsed exchange + line operating cases + Canonical-ID enrichment with strict identity/provenance joins and no engineering defaults. Dataset assembly is deliberately independent of the XLSX parser dependency by importing the lightweight exchange-shape assertion directly.

**Stage 16 files:**

```text
converters/vibration/dataset/schema.js
converters/vibration/dataset/assemble.js
converters/vibration/dataset/index.js
converters/vibration/index.js
tests/vibration-integrity-dataset.test.mjs
docs/vibration/VibrationIntegrityDataset-v1.md
```

**Stage 16 validation limitation:** attempted execution of the exact committed test through a temporary checkout failed before Node because this runtime cannot resolve `raw.githubusercontent.com`. Therefore the committed Stage 16 test is `NOT_RUN`, not PASS. Source-level review remains clean.

**Highest current engineering risk:** a facility planner silently chooses geometry/process data or invents missing FIT inputs simply to make every row calculable.

## Governing Principles

1. No 3D/canvas/viewer integration in vibration.
2. `Canonical ID` from 3D EDIT is downstream element identity.
3. Line is operating-case join identity in dataset v1.
4. Operating cases and enrichment retain explicit source provenance and units; no silent defaults.
5. Dataset assembly does not normalize units or run mechanism calculations.
6. FIT request planning may select only explicit data and must report missing fields fail-closed.
7. Central Engineering Calculation API remains the execution authority; facility code must not duplicate FIT equations.
8. Benchmark planning/execution does not imply screening authority.
9. Limited CSV requires explicit opt-in and remains incomplete.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT kernel / central benchmark path | P0 | VALIDATED | 1–12 | source + EI/hand cases |
| Evidence/candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing runtime metadata |
| Table exchange parser | P0 | IMPLEMENTED | 15 | XLSX/CSV parser |
| Vibration integrity dataset | P0 | IMPLEMENTED | 16 | strict data assembly |
| Facility FIT readiness/request plan | P0 | IN_PROGRESS | 17 | current stage |
| Facility benchmark execution | P0 | NOT_STARTED | Forward | after plan |
| Table-first facility result model | P1 | NOT_STARTED | Forward | after execution |
| Full repo regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full method authority review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Five-sheet XLSX is complete current exchange; CSV is limited Elements-only. |
| DEC-023 | Decision | P0 | ACCEPTED | `Canonical ID` is element identity; Line is process-case join identity. |
| DEC-024 | Decision | P0 | ACCEPTED | Process quantities require explicit `{value, unit}` and provenance; no defaults. |
| DEC-025 | Decision | P0 | ACCEPTED | Dataset assembly remains independent of spreadsheet parser/runtime. |
| DEC-026 | Decision | P0 | ACCEPTED | FIT facility planning uses explicit assessment-point enrichment; no implicit “all elements are FIT points.” |
| DEC-027 | Decision | P0 | ACCEPTED | Request planning creates central API requests only for READY rows; incomplete rows remain NOT_READY. |
| RISK-020 | Risk | High | ACCEPTED | XLSX upstream export hash declared but not cryptographically reverified in v1. |
| RISK-021 | Risk | High | ACCEPTED | CSV drops provenance sheets. |
| RISK-022 | Risk | High | ACCEPTED | Wrong process/enrichment join could apply valid data to wrong element. |
| RISK-023 | Risk | Critical | ACCEPTED | Automatically deriving missing pipe OD/wall/span from NPS/schedule without qualified catalogue resolution would create hidden engineering authority. |
| QST-004 | Question | P1 | OPEN | Future multi-CSV+manifest machine exchange. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner blocked by account billing/spending. |

## Stage Log

### Stages 1–14

FIT source/kernel/central benchmark path, independent hand/EI examples, multiphase hardening, evidence coverage and review-candidate metadata implemented. FIT remains benchmark-only.

### Stage 15 — `VibrationTableExchange.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Current upstream five-sheet XLSX contract is parsed with exact headers/metadata/reference integrity. Current CSV is Elements-only and explicitly incomplete. Parser smoke with a SheetJS-compatible fixture passed; exact real-package test remains NOT_RUN.

### Stage 16 — `VibrationIntegrityDataset.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

#### Implementation performed

- strict operating-case records keyed by `(line, caseId)`;
- explicit engineering quantities `{value, unit}`; pressure may carry `reference`;
- strict enrichment keyed by upstream `Canonical ID` with optional case scope;
- orphan line/element/case joins fail closed;
- duplicate enrichment and duplicate operating cases fail closed;
- deterministic line/case/enrichment ordering;
- elements without line and lines without cases remain explicit warnings;
- complete exchange required by default; limited exchange requires `allowLimitedExchange=true`;
- result always carries `DATA_ASSEMBLY_ONLY`, `engineeringAuthority=NONE`, `screeningAuthorized=false`;
- dataset assembly imports `assertVibrationTableExchangeShape` from the lightweight exchange schema module, not the XLSX parser entrypoint.

#### Validation performed

```text
source-level dependency review                         PASS
attempt exact committed Node regression               NOT_RUN
reason: raw.githubusercontent.com DNS unavailable      recorded
full repository                                       NOT_RUN
```

Stage decision: **PARTIAL** for execution validation; implementation complete.

### Stage 17 — Facility FIT readiness/request planning — IN_PROGRESS

#### Objective

Turn the assembled table dataset into explicit per-element/per-operating-case FIT readiness records and, only when complete, central Engineering Calculation requests.

This stage does **not** calculate FIT itself.

#### Assessment-point rule

A piping element enters the FIT plan only when enrichment contains:

```text
FIT_ASSESSMENT_POINT = true
```

for that `canonicalId` (global, not case-specific in v1).

This prevents the planner from assuming every exported fitting/component is an independent main-line FIT assessment location.

#### Required geometry enrichment for a READY point

```text
OUTSIDE_DIAMETER      numeric + unit
WALL_THICKNESS        numeric + unit
MAX_UNSUPPORTED_SPAN  numeric + unit
```

Optional:

```text
INSIDE_DIAMETER       numeric + unit
NATURAL_FREQUENCY     numeric + unit, may be case-specific
```

No NPS/schedule-to-wall lookup is performed in this stage.

#### Operating-case requirements

All phases require:

```text
phase
density
```

and one of:

```text
massFlow
velocity
```

GAS additionally requires:

```text
dynamicViscosity
```

MULTIPHASE v1 facility planning supports only the aggregate-effective input shape from operating cases:

```text
multiphaseResolutionMode = AGGREGATE_EFFECTIVE
```

Component-derived multiphase planning is deferred until the operating-case schema has controlled component mass/density fields.

#### Request output

READY item:

```text
status = READY
calculationId = VIB.FIV.FLOW_TURBULENCE
canonicalId
line
caseId
request:
  calculationId
  inputs
  inputUnits
  options.qualificationMode = benchmark
sourceTrace
```

NOT_READY item:

```text
status = NOT_READY
canonicalId
line
caseId
missing[]
reasons[]
```

No request object is emitted for NOT_READY items.

#### Planned files

```text
converters/vibration/facility/fit-plan.js
converters/vibration/facility/index.js
converters/vibration/index.js
tests/vibration-facility-fit-plan.test.mjs
docs/vibration/FIT-Facility-Plan-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- only explicit `FIT_ASSESSMENT_POINT=true` elements enter plan;
- READY gas/liquid/aggregate-multiphase requests preserve units and source trace;
- missing span/OD/wall/process fields produce NOT_READY with no request;
- GAS missing viscosity is NOT_READY;
- aggregate MULTIPHASE request explicitly sets resolution mode;
- case-specific natural frequency overrides global natural-frequency enrichment with recorded selection provenance;
- duplicate enrichment is already prevented by dataset assembly;
- no NPS/schedule lookup/default is performed;
- requests use central public ID and benchmark mode only;
- planner result itself has no screening authority.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 exchange fixture | PASS |
| Stage 15 real xlsx package | NOT_RUN |
| Stage 16 committed dataset test | NOT_RUN |
| Stage 17 plan tests | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 17.
- Implement a pure request planner; do not import `calculateFit` or duplicate equations.
- Use dataset quantities as `{value, unit}`; do not convert them in planner.
- Use explicit `FIT_ASSESSMENT_POINT=true` to select locations.
- Do not derive OD/wall from DN/schedule in this stage.
- No request for incomplete data; return NOT_READY with missing evidence.
- Multiphase facility planning v1 is aggregate-effective only.
- Central API execution remains benchmark-only.
- Highest risk: hidden geometry/process inference creating apparently complete but unauthoritative requests.
