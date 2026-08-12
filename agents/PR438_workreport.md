# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and a table-only facility vibration workflow, without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 23 | `f0a287188dbede995abcdb83086841d545179cef` plus subsequent Stage 21/22 commits on the same branch |
| PR status | OPEN / DRAFT / mergeable; 67 changed paths / 154 commits at reconciliation before this report update |
| Current stage | Stage 23 — IN_PROGRESS: deterministic CSV templates and facility-register export |
| Last completed stage | Stage 22 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR FULL-BRANCH VALIDATION |
| Engineering status | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; screening/design authority NOT AUTHORIZED. |
| Validation status | EI/domain focused suite PASS; Stage 15 SheetJS-compatible exchange fixture PASS; Stage 21 dependency-free strict CSV/process/enrichment smoke PASS; exact full branch/repository suite NOT_RUN. |
| Current blockers | Full repository regression; real `xlsx@0.18.5` exchange test; complete licensed EI T2.2/project-procedure review; identified vibration-engineer approval; GitHub Actions billing/spending condition. |
| Exact next action | Add deterministic template serializers for the two v1 CSV input contracts and a non-authoritative facility-register CSV export, then reconcile and refresh the stale PR body. |

### Handover in 60 Seconds

The table-first FIT backend is now end-to-end:

```text
Advanced_Analysis 3D EDIT
  -> VibrationTableExchange.v1
  -> VibrationIntegrityDataset.v1
  -> VibrationFacilityFitPlan.v1
  -> calculateEngineeringBatch()
  -> VibrationFacilityFitResult.v1
  -> VibrationFacilityFitRegister.v1
```

A high-level `runVibrationFacilityFitBenchmark()` composes those stages and returns all intermediates. A second façade, `runVibrationFacilityFitBenchmarkFromTables()`, accepts a parsed topology exchange / XLSX / current Elements-only CSV plus the two strict process/enrichment CSV contracts.

No 3D viewer, canvas, geometry rendering, heatmap or embedded Advanced_Analysis runtime is in the vibration product.

Current FIT authority remains:

```text
calculationState     = IMPLEMENTED
qualificationState   = BENCHMARK_ONLY
engineeringAuthority = NONE
screeningAuthorized  = false
designAuthority      = false
qualificationIssue   = #429
```

EI Appendix D D2/D4 worked examples are benchmark evidence, not full-domain screening authority. Runtime evidence coverage and screening-candidate metadata are explicitly non-authorizing.

## Engineering / Architecture Invariants

1. Validation, data resolution, applicability, calculation, assessment, evidence coverage, qualification and engineering authority remain separate.
2. Central Engineering Calculation API is the only numerical FIT execution path.
3. No silent engineering defaults or nearest-size/catalogue guesses.
4. `Canonical ID` from 3D EDIT is the downstream element identity; line is the v1 operating-case join identity.
5. NOT_READY / NOT_ASSESSED / CALCULATION_FAILED are never represented as LOF zero or “safe.”
6. Evidence coverage or candidate-for-review status never grants screening authority.
7. Operating/enrichment import contracts use exact headers; no silent header aliases.
8. No universal vibration score or facility pass/fail.
9. Table-only product boundary: no 3D/canvas/viewer.
10. No `.github/workflows/*` workaround for the external Actions billing/spending condition.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Detailed FIT/FIV roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| FIT source extraction / method specification | P0 | IMPLEMENTED | 6–9 | retained source + spec |
| FIT benchmark kernel + central adapter | P0 | VALIDATED focused | 9–12 | workbook/EI/hand cases |
| Runtime evidence / review-candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing metadata |
| Table exchange parser | P0 | IMPLEMENTED | 15 | five-sheet XLSX + limited CSV contract |
| Vibration integrity dataset | P0 | IMPLEMENTED | 16 | strict line/canonical joins |
| Facility FIT request plan | P0 | IMPLEMENTED | 17 | READY / NOT_READY |
| Facility central benchmark execution | P0 | IMPLEMENTED | 18 | same central batch kernel |
| Facility register read model | P0 | IMPLEMENTED | 19 | table-first projection |
| One-call parsed-data workflow | P0 | IMPLEMENTED | 20 | all intermediates returned |
| Strict operating/enrichment CSV contracts | P0 | VALIDATED focused | 21 | dependency-free smoke PASS |
| One-call tabular/file workflow | P0 | IMPLEMENTED | 22 | parsed exchange/XLSX/limited CSV + CSV tables |
| CSV templates / register export | P0 | IN_PROGRESS | 23 | current stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full licensed method/project review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public ID `VIB.FIV.FLOW_TURBULENCE`; FIT canonical terminology. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exact exercised method slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase data require explicit/unambiguous resolution mode. |
| DEC-018 | Decision | P0 | ACCEPTED | Evidence coverage is independent of authority. |
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; vibration integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Existing five-sheet XLSX is current complete exchange; current CSV is Elements-only limited input. |
| DEC-023 | Decision | P0 | ACCEPTED | Canonical ID is element join authority; Line is operating-case join identity in v1. |
| DEC-024 | Decision | P0 | ACCEPTED | Process values require explicit value/unit/source; no defaults. |
| DEC-028 | Decision | P0 | ACCEPTED | Facility READY requests execute unchanged through central batch API. |
| DEC-030 | Decision | P0 | ACCEPTED | Facility register is a read projection only. |
| DEC-032 | Decision | P0 | ACCEPTED | Operating-case CSV uses exact v1 header and value/unit pairs. |
| DEC-033 | Decision | P0 | ACCEPTED | Enrichment CSV uses explicit NUMBER/STRING/BOOLEAN scalar type. |
| DEC-035 | Decision | P0 | ACCEPTED | Tabular façade parses then delegates; no duplicate downstream logic. |
| DEC-036 | Decision | P0 | ACCEPTED | Templates/export use the same shared CSV serializer to avoid quoting drift. |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical method could create false authority; mitigated by benchmark gate. |
| RISK-020 | Risk | High | ACCEPTED | Human XLSX upstream export hash is declared but not cryptographically reverified downstream in v1. |
| RISK-021 | Risk | High | ACCEPTED | Elements CSV drops provenance sheets; incomplete status required. |
| RISK-024 | Risk | Critical | ACCEPTED | Missing/failed facility rows must never appear safe. |
| RISK-028 | Risk | High | ACCEPTED | Header aliases can mis-map process data. |
| RISK-029 | Risk | High | ACCEPTED | Scalar type guessing can corrupt enrichment meaning. |
| DEBT-001 | Debt | P1 | DEFERRED | Exchange parser private CSV tokenizer not yet consolidated with Stage 21 shared parser; wait for real exchange/xlsx suite. |
| QST-001 | Question | P0 | BLOCKED | Complete licensed/adopted T2.2/project coverage still requires direct source review. |
| QST-003 | Question | P0 | FAIL_CLOSED | Manual medium/flexible OD gap remains fail-closed. |
| QST-004 | Question | P1 | OPEN | Future multi-CSV + manifest machine exchange. |
| ISS-009 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Advanced frequency corrected to `1 < fn <= 3 Hz`; licensed review still required. |
| ISS-010 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Stale workbook support selector ignored; deterministic span classification used. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner cannot start due account billing/spending condition. |

## Stage Roadmap / Execution Log

### Stages 1–14 — FIT engineering vertical

Implemented source inventory/extractor, physical context, exact retained-workbook reference equations, central benchmark-only adapter, EI Appendix D D2/D4 benchmark set, independent hand benchmarks, multiphase ambiguity hardening, machine-readable evidence coverage and non-authorizing candidate-for-engineering-review metadata.

Key source-backed corrections:

```text
advanced natural frequency: 1 Hz < fn <= 3 Hz
large flexible family includes EI D4 273 mm case
D4 aggregate-effective multiphase path supported
```

Focused EI/domain regression reached PASS 12/12. Screening remains blocked.

### Stage 15 — `VibrationTableExchange.v1`

Implemented exact ingestion for current `TopologyEditTableHumanExport.v1` five-sheet XLSX and explicit limited Elements-only CSV behavior. Sheet/header/metadata/reference integrity fails closed. Upstream export hash is preserved when declared but not claimed cryptographically reverified.

Validation:

```text
SheetJS-compatible fixture five-sheet parse       PASS
sheet-order invariance                            PASS
fixture byte parse                                PASS
quoted Elements CSV                               PASS
require-complete CSV rejection                    PASS
actual repo xlsx@0.18.5 test                      NOT_RUN
```

### Stage 16 — `VibrationIntegrityDataset.v1`

Combines parsed exchange + operating cases + Canonical-ID enrichment with deterministic ordering and strict orphan/duplicate/mismatch rejection. Authority is `DATA_ASSEMBLY_ONLY`, screening false. Dataset assembly is independent of the XLSX parser dependency.

Exact committed test: NOT_RUN in current runtime.

### Stage 17 — `VibrationFacilityFitPlan.v1`

Only explicit `FIT_ASSESSMENT_POINT=true` locations enter the plan. Required OD/wall/span and process evidence must be explicit. No NPS/schedule lookup. READY emits benchmark central request; NOT_READY emits no request. Velocity override and case-specific natural frequency selections are explicit in source trace.

Exact committed test: NOT_RUN.

### Stage 18 — `VibrationFacilityFitResult.v1`

READY items execute only through `calculateEngineeringBatch()`. NOT_READY never enters batch; central failures stay failures; no synthetic LOF. Central evidence/qualification is retained.

Exact committed test: NOT_RUN.

### Stage 19 — `VibrationFacilityFitRegister.v1`

Pure table read model. Keeps completeness, benchmark qualification, evidence strengths and candidate-review state visible. No pass/safe/riskScore/universal score. Non-calculated numerical cells are null only alongside explicit non-calculated state.

Exact committed test: NOT_RUN.

### Stage 20 — `VibrationFacilityFitWorkflow.v1`

One-call workflow composes dataset -> plan -> central execution -> register and returns every intermediate plus stage-separated warnings. Only `allowLimitedExchange` is accepted; authority-option injection is rejected.

Exact committed test: NOT_RUN.

### Stage 21 — `VibrationTabularInput v1` — COMPLETE

Added dependency-free strict CSV tokenizer plus exact operating-case and enrichment CSV parsers.

Validation executed locally:

```text
strict CSV quoted/BOM/malformed-quote smoke     PASS
operating-case quantity/value-unit smoke        PASS
enrichment NUMBER/STRING/BOOLEAN smoke          PASS
fixture column counts                           PASS
full committed tabular test                     NOT_RUN
```

Deviation: exchange private CSV tokenizer consolidation deferred as DEBT-001 to avoid broad unvalidated parser rewrite while real XLSX suite is unavailable.

### Stage 22 — `VibrationFacilityFitTabularWorkflow.v1` — COMPLETE FOR IMPLEMENTATION

Delivered:

```text
converters/vibration/facility/fit-workflow-tabular.js
tests/vibration-facility-fit-tabular-workflow.test.mjs
docs/vibration/FIT-Facility-Tabular-Workflow-v1.md
```

Supports topology formats:

```text
PARSED_EXCHANGE
XLSX
CSV_ELEMENTS_ONLY
```

Operating/enrichment CSV inputs are optional and parsed only through Stage 21 contracts. Missing tables become empty arrays—no defaults. Limited topology CSV remains rejected unless `allowLimitedExchange=true`. Unknown topology format and malformed CSV fail before engineering workflow. Underlying workflow still rejects `qualificationMode`/design-authority injection.

Validation:

```text
source-level composition review     PASS
XLSX path implementation review     PASS
committed tabular workflow test     NOT_RUN
full repository                     NOT_RUN
```

### Stage 23 — CSV templates + facility register export — IN_PROGRESS

#### Objective

Make the table-only workflow operational without users manually reproducing exact headers/quoting and make register results exportable without exporting the entire internal evidence object.

#### Planned implementation

Shared deterministic serializer:

```text
serializeVibrationCsvRows(rows)
```

Rules:

- comma delimiter;
- CRLF line endings;
- quote fields containing comma, quote, CR or LF;
- escape quotes as doubled quotes;
- `null`/`undefined` -> empty cell;
- finite numbers only;
- booleans -> `true` / `false`;
- objects/arrays rejected unless the caller serialized explicitly.

Template helpers:

```text
createVibrationOperatingCaseCsvTemplate()
createVibrationEnrichmentCsvTemplate()
```

Templates emit exact v1 header plus one commented-by-content example row using clearly non-authoritative sample values. Template generation does not create project data or defaults.

Facility register export:

```text
serializeVibrationFacilityFitRegisterCsv(register)
```

Planned columns:

```text
Line
Operating Case
Canonical ID
Status
Completeness
Standard LOF
Refined LOF
Governing Reference LOF
Reference Band
Assessment Status
Qualification
Benchmark Authority
Phase Evidence
Correlation Evidence
Advanced Evidence
Candidate For Engineering Review
Candidate Status
Continuation Required
Missing
Invalid
Error Codes
Assessment Point Source
Operating Case Source
```

No pass/safe/risk score column.

#### Planned files

```text
converters/vibration/tabular/csv.js
converters/vibration/tabular/templates.js
converters/vibration/tabular/index.js
converters/vibration/facility/fit-register-export.js
converters/vibration/facility/index.js
tests/vibration-csv-export.test.mjs
docs/vibration/VibrationCsvTemplatesAndRegisterExport-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- round-trip strict serializer/parser for commas/quotes/newlines/BOM-free output;
- non-finite/object scalar rejection;
- generated template headers exactly equal parser contracts;
- template examples parse successfully but remain sample-only;
- register CSV preserves row order and null/absent numerical values as blank, never zero;
- export has no pass/safe/riskScore fields;
- candidate/evidence/benchmark qualification remain explicit.

## Changed-File Reconciliation

At Stage 22 closure GitHub reports **67 changed paths**, all within the documented FIT/table workflow assignment. No `.github/workflows/*`, no 3D viewer/canvas files and no unrelated feature family were added.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused qualification | PASS |
| Stage 15 SheetJS-compatible exchange fixture | PASS |
| Stage 21 dependency-free CSV/process/enrichment smoke | PASS |
| Stage 16–20 committed regressions | NOT_RUN |
| Stage 22 committed tabular workflow regression | NOT_RUN |
| Stage 23 export regression | NOT_RUN |
| Full repository regression | NOT_RUN |
| GitHub Actions | BLOCKED_EXTERNAL |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- PR/branch: #438 / `agent/fiv-fit-roadmap-foundation`.
- Current stage: Stage 23.
- Start with shared serializer in `converters/vibration/tabular/csv.js`.
- Reuse exact v1 headers from parser modules; do not duplicate header strings in templates.
- Register export is a read/export projection only; do not recalculate evidence or LOF.
- Blank absent numerical fields; never emit zero for NOT_ASSESSED/failed rows.
- Do not add pass/fail or a universal score.
- Keep PR draft until full tests + method authority gates close.
- Highest risk: user-friendly exports accidentally implying project engineering defaults or screening approval.
