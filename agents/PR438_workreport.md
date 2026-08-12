# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only facility vibration workflow without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR status | OPEN / DRAFT / mergeable at last check |
| Current stage | Stage 21 — IN_PROGRESS: strict CSV contracts for operating cases and vibration enrichment |
| Last completed stage | Stage 20 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR EXECUTION VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Workflow is benchmark orchestration only. |
| Validation status | EI/domain focused PASS; parser fixture PASS; exact later committed regressions NOT_RUN due missing full checkout/raw GitHub access. |
| Current blocker | Full repository regression, real `xlsx@0.18.5` regression, full licensed T2.2 review and independent vibration-engineer approval. |
| Exact next action | Add shared strict vibration CSV parsing plus exact process-case/enrichment CSV contracts that produce dataset-compatible records with no header aliases, defaults or ambiguous value typing. |

### Handover in 60 Seconds

Backend table-first FIT workflow is implemented end-to-end:

```text
VibrationTableExchange.v1
  -> VibrationIntegrityDataset.v1
  -> VibrationFacilityFitPlan.v1
  -> central calculateEngineeringBatch()
  -> VibrationFacilityFitResult.v1
  -> VibrationFacilityFitRegister.v1
```

A one-call `runVibrationFacilityFitBenchmark()` composes those public APIs and returns all intermediate artifacts; benchmark mode is fixed and unsupported authority options are rejected.

Stage 21 addresses the remaining manual-object gap: operators should be able to load operating cases and engineering enrichment as tables/CSV without UI code inventing parsing semantics.

## Governing Principles

1. Table import is data parsing only; no engineering defaults or calculation.
2. CSV headers are versioned contracts; no silent aliases in v1.
3. Quantity value and unit must appear together when an operating-case quantity is supplied.
4. Enrichment value type must be explicit so `"1"`, `1`, `true` and `"true"` are not confused.
5. Shared quoted-field/BOM/newline parsing should be identical for exchange/process/enrichment CSVs.
6. Imported records feed the existing dataset assembler, which remains the join/authority gate.
7. No 3D/canvas/viewer integration.

## Mission Status

| Work Item | Priority | Status | Stage |
|---|---:|---|---:|
| FIT kernel / qualification evidence | P0 | VALIDATED/IMPLEMENTED | 1–14 |
| Table exchange | P0 | IMPLEMENTED | 15 |
| Dataset / facility plan / execution / register | P0 | IMPLEMENTED | 16–19 |
| One-call benchmark workflow | P0 | IMPLEMENTED | 20 |
| Shared strict CSV parser | P0 | IN_PROGRESS | 21 |
| Operating-case CSV contract | P0 | IN_PROGRESS | 21 |
| Enrichment CSV contract | P0 | IN_PROGRESS | 21 |
| Full repository regression | P0 | BLOCKED | Forward |
| Screening authority | P0 | BLOCKED | Forward |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-032 | Decision | P0 | ACCEPTED | Operating cases use an exact v1 CSV header and explicit value/unit pairs. |
| DEC-033 | Decision | P0 | ACCEPTED | Enrichment CSV includes explicit Value Type (`NUMBER`, `STRING`, `BOOLEAN`). |
| DEC-034 | Decision | P0 | ACCEPTED | One shared strict CSV parser serves vibration table inputs. |
| RISK-028 | Risk | High | ACCEPTED | Header aliasing can map process fields incorrectly; fail closed instead. |
| RISK-029 | Risk | High | ACCEPTED | Automatic scalar type guessing can turn IDs/flags/numbers into wrong engineering values. |
| RISK-030 | Risk | High | ACCEPTED | Value without unit can create implicit-unit assumptions in process data. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions billing/spending blocks runner allocation. |

## Stage Log

### Stages 1–19

FIT source/kernel/evidence and table-first exchange/dataset/plan/execution/register layers implemented. No screening authority.

### Stage 20 — `VibrationFacilityFitWorkflow.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/facility/fit-workflow.js
converters/vibration/facility/index.js
tests/vibration-facility-fit-workflow.test.mjs
docs/vibration/FIT-Facility-Workflow-v1.md
```

Workflow calls only:

```text
assembleVibrationIntegrityDataset()
buildVibrationFacilityFitPlan()
executeVibrationFacilityFitPlan()
buildVibrationFacilityFitRegister()
```

It returns dataset/plan/result/register/summary plus stage-separated warnings. Only `allowLimitedExchange` is accepted as an option; authority/qualification option injection is rejected.

Validation:

```text
source-level composition review     PASS
committed workflow regression       NOT_RUN
full repository                     NOT_RUN
```

### Stage 21 — Tabular process/enrichment input — IN_PROGRESS

#### Shared CSV parser

Create strict parser supporting:

```text
RFC-style quoted fields / escaped quotes
CRLF / LF / CR
UTF-8 BOM on first header cell
empty cells
trailing blank rows
```

Malformed unmatched quoting fails closed.

#### Operating-case CSV v1

Exact columns:

```text
Line
Operating Case
Label
Phase
Mass Flow
Mass Flow Unit
Density
Density Unit
Pressure
Pressure Unit
Pressure Reference
Temperature
Temperature Unit
Dynamic Viscosity
Dynamic Viscosity Unit
Velocity
Velocity Unit
Source
Source Revision
Record ID
```

Rules:

- Line, Operating Case and Source required;
- quantity value/unit are both blank or both populated;
- populated numeric values must be finite;
- Phase is preserved as text and later planner validates supported FIT phases;
- no unit conversion at import;
- no process defaults.

Output records match `VibrationIntegrityDataset.v1` operating-case input objects.

#### Enrichment CSV v1

Exact columns:

```text
Canonical ID
Line
Operating Case
Property
Value
Value Type
Unit
Source
Source Revision
Record ID
Status
Reviewer
```

Rules:

- Canonical ID, Property, Value Type, Source required;
- Value Type is exactly `NUMBER`, `STRING` or `BOOLEAN`;
- NUMBER requires finite numeric text;
- BOOLEAN accepts only case-insensitive `true` or `false`;
- STRING preserves text exactly;
- Unit is optional at parser level because boolean/string/dimensionless properties exist; later FIT planning requires units for its quantity properties;
- no case/line identity inference.

Output records match dataset enrichment input objects.

#### Refactor

Move the exchange CSV parser to the shared CSV tokenizer instead of maintaining duplicate quoted-field logic.

#### Planned files

```text
converters/vibration/tabular/csv.js
converters/vibration/tabular/operating-cases.js
converters/vibration/tabular/enrichment.js
converters/vibration/tabular/index.js
converters/vibration/exchange/parse.js
converters/vibration/index.js
tests/vibration-tabular-input.test.mjs
docs/vibration/VibrationTabularInput-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- quoted comma/escaped quote/BOM/CRLF parsing;
- malformed quote rejection;
- exact header enforcement;
- value/unit pair enforcement;
- finite numeric enforcement;
- explicit enrichment scalar typing;
- imported records accepted by dataset assembler;
- exchange Elements CSV behavior unchanged after parser refactor.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 parser fixture | PASS |
| Stage 16–20 exact committed regressions | NOT_RUN |
| Stage 21 tabular regression | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 21.
- Build shared CSV tokenizer first, then two exact schemas.
- Do not guess units or scalar types.
- Do not add header aliases.
- Refactor exchange CSV to shared tokenizer without changing its incomplete/provenance semantics.
- Highest risk: parsing convenience silently changing engineering meaning.
