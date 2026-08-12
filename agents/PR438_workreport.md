# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and a table-only facility vibration workflow without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR state | OPEN / DRAFT / mergeable at last GitHub check. |
| Current stage | Stage 24 — IN_PROGRESS: table-workspace read model/API. |
| Last completed stage | Stage 23 — COMPLETE FOR IMPLEMENTATION / FOCUSED VALIDATION PASS. |
| Engineering state | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; engineering authority `NONE`; screening/design NOT AUTHORIZED. |
| Product boundary | Vibration consumes table exports from Advanced_Analysis 3D EDIT only. No 3D viewer, canvas, geometry rendering or embedded model runtime. |
| Main blockers | Full repository regression; real `xlsx@0.18.5` regression; complete licensed/adopted T2.2/project review; independent vibration-engineer approval; GitHub Actions billing/spending gate. |

## Handover in 60 Seconds

The controlled backend path now exists end-to-end:

```text
Advanced_Analysis 3D EDIT table export
  -> VibrationTableExchange.v1
  -> VibrationIntegrityDataset.v1
  -> VibrationFacilityFitPlan.v1
  -> calculateEngineeringBatch()
  -> VibrationFacilityFitResult.v1
  -> VibrationFacilityFitRegister.v1
  -> deterministic CSV export
```

`runVibrationFacilityFitBenchmark()` composes parsed exchange -> dataset -> plan -> central execution -> register and returns every intermediate artifact. `runVibrationFacilityFitBenchmarkFromTables()` additionally parses topology/process/enrichment table inputs. None of these APIs can promote FIT beyond benchmark mode.

Stage 23 added safe header-only templates, optional unmistakable sample rows, deterministic CSV serialization and facility-register CSV export. A dependency-free exact-source fixture passed the Stage 23 serializer/template/register-export checks. This is a focused PASS, not a full-repository PASS.

Stage 24 now adds a pure workspace/read model over existing artifacts. It must not calculate, infer engineering data, add authority, or depend on 3D/canvas. It should support facility summary, deterministic filtering/sorting, row detail, inputs/cases/evidence/source views and explicit completeness/qualification states.

## Mission / Engineering Intent

1. Keep the stable public calculation ID `VIB.FIV.FLOW_TURBULENCE` while using FIT as canonical terminology.
2. Preserve separation of validation, resolution, applicability, calculation, assessment, evidence, qualification and engineering authority.
3. Use the central Engineering Calculation API as the only numerical execution path.
4. Fail closed on missing, ambiguous or unsupported engineering data; never substitute zero/default/nearest-size authority.
5. Preserve table identities and provenance from 3D EDIT; `Canonical ID` is element identity and Line is the v1 operating-case join identity.
6. Make non-calculated states visible as `NOT_READY`, `NOT_ASSESSED_DATA_INCOMPLETE` or `CALCULATION_FAILED`; never display them as LOF=0 or safe.
7. Keep evidence coverage and candidate-for-review status separate from screening authority.
8. Do not create a universal vibration score, facility score or generic pass/fail.
9. Keep vibration product table-only: no viewer, canvas, 3D heatmap or geometry interaction.

## Mission Status

| Work item | Priority | Status | Stage / evidence |
|---|---:|---|---|
| FIT/FIV roadmap | P0 | DONE | Stage 1; `docs/FIVroadmap.md` |
| Source inventory/extractor | P0 | IMPLEMENTED | Stages 6–9 |
| FIT benchmark kernel | P0 | FOCUSED_VALIDATED | Stages 9–12; workbook + EI + hand cases |
| Central benchmark adapter/Console | P0 | IMPLEMENTED | benchmark mode only |
| EI Appendix D D2/D4 qualification points | P0 | PASS | source-backed example parity |
| Evidence coverage / candidate metadata | P0 | IMPLEMENTED | Stages 13–14; non-authorizing |
| Table exchange | P0 | IMPLEMENTED | Stage 15 |
| Vibration integrity dataset | P0 | IMPLEMENTED | Stage 16 |
| Facility plan / central execution / register | P0 | IMPLEMENTED | Stages 17–19 |
| Parsed-data / tabular workflows | P0 | IMPLEMENTED | Stages 20–22 |
| Strict process/enrichment CSV inputs | P0 | FOCUSED_VALIDATED | Stage 21 |
| Templates + register CSV export | P0 | FOCUSED_VALIDATED | Stage 23 |
| Workspace read model | P0 | IN_PROGRESS | Stage 24 |
| Full repository regression | P0 | BLOCKED | no checkout; Actions external gate |
| Full method/project authority review | P0 | BLOCKED | licensed/adopted source + reviewer |
| Screening authority | P0 | BLOCKED | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public FIT ID retained. |
| DEC-012 | Decision | P0 | ACCEPTED | EI worked examples qualify only exercised points/slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase aggregate/component data require explicit or unambiguous resolution. |
| DEC-018 | Decision | P0 | ACCEPTED | Evidence coverage never grants engineering authority. |
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; vibration integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Current five-sheet XLSX is complete exchange; current CSV is Elements-only limited input. |
| DEC-023 | Decision | P0 | ACCEPTED | Canonical ID is element join authority; Line is v1 process-case identity. |
| DEC-024 | Decision | P0 | ACCEPTED | Process quantities require explicit value/unit/source. |
| DEC-028 | Decision | P0 | ACCEPTED | Facility READY requests execute unchanged through central batch API. |
| DEC-030 | Decision | P0 | ACCEPTED | Facility register is read projection only. |
| DEC-032 | Decision | P0 | ACCEPTED | Operating-case CSV exact v1 header; no aliases. |
| DEC-033 | Decision | P0 | ACCEPTED | Enrichment scalar type is explicit NUMBER/STRING/BOOLEAN. |
| DEC-036 | Decision | P0 | ACCEPTED | Templates/export reuse shared deterministic CSV serializer. |
| DEC-037 | Decision | P0 | ACCEPTED | Templates are header-only by default; examples require explicit opt-in and carry `SAMPLE_*_DO_NOT_USE`. |
| DEC-038 | Decision | P0 | ACCEPTED | Workspace is a pure table/read model over existing workflow artifacts; no calculation or authority. |
| RISK-001 | Risk | Critical | MITIGATED | Unqualified empirical method remains benchmark-gated. |
| RISK-020 | Risk | High | ACCEPTED | Upstream human XLSX export hash declared but not cryptographically reverified downstream in v1. |
| RISK-021 | Risk | High | ACCEPTED | Elements CSV omits provenance sheets and stays explicitly incomplete. |
| RISK-024 | Risk | Critical | MITIGATED | Missing/failed facility rows never appear as safe/zero. |
| RISK-031 | Risk | High | OPEN | Workspace filtering/sorting could hide incomplete rows or imply authority if statuses/evidence are collapsed. |
| DEBT-001 | Debt | P1 | DEFERRED | Consolidate exchange private CSV tokenizer with shared tokenizer after real XLSX/exchange suite is runnable. |
| QST-001 | Question | P0 | BLOCKED | Complete licensed/adopted T2.2/project coverage requires direct source review. |
| QST-003 | Question | P0 | FAIL_CLOSED | Manual medium/flexible OD family gap stays fail-closed. |
| QST-004 | Question | P1 | OPEN | Future machine package: multi-CSV+manifest vs dedicated machine XLSX/JSON. |
| ISS-009 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Advanced range corrected to `1 < fn <= 3 Hz`; authority review remains. |
| ISS-010 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Deterministic span support classification replaces stale selector; authority review remains. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner allocation blocked by account billing/spending condition. |

## Stage Protocol / History

### Stages 1–14 — FIT engineering benchmark vertical

Implemented roadmap, source extraction, physical context, retained-workbook reference equations, central benchmark-only adapter, EI D2/D4 examples, independent hand benchmarks, multiphase ambiguity hardening, machine-readable evidence coverage and non-authorizing screening-candidate metadata.

Source-backed corrections include:

```text
advanced natural frequency: 1 Hz < fn <= 3 Hz
EI D4 273 mm case resolves FLEXIBLE_LARGE
D4 aggregate-effective multiphase path supported
```

Focused EI/domain regression reached 12/12 PASS. Screening remained blocked.

### Stage 15 — `VibrationTableExchange.v1`

Ingests current `TopologyEditTableHumanExport.v1` five-sheet XLSX. Current Elements-only CSV remains explicit `LIMITED_ELEMENTS_ONLY`. Header/metadata/reference integrity fails closed. No downstream claim of cryptographic re-verification of the upstream semantic hash.

Focused SheetJS-compatible fixture: PASS. Actual repository `xlsx@0.18.5` test: NOT_RUN.

### Stage 16 — `VibrationIntegrityDataset.v1`

Combines parsed exchange + operating cases + Canonical-ID enrichment with deterministic ordering and strict orphan/duplicate/mismatch rejection. `authority=DATA_ASSEMBLY_ONLY`, `screeningAuthorized=false`.

### Stage 17 — `VibrationFacilityFitPlan.v1`

Only explicit `FIT_ASSESSMENT_POINT=true` elements enter planning. OD/wall/span/process evidence must be explicit. No NPS/schedule lookup. READY emits a benchmark central request; NOT_READY emits no request.

### Stage 18 — `VibrationFacilityFitResult.v1`

READY items execute only through `calculateEngineeringBatch()`. NOT_READY never enters the numerical engine. Central failure/evidence/qualification is preserved.

### Stage 19 — `VibrationFacilityFitRegister.v1`

Pure table read projection. Keeps completeness, benchmark qualification, evidence strengths and candidate-review state separate. No pass/safe/risk score.

### Stage 20 — `VibrationFacilityFitWorkflow.v1`

One-call composition of dataset -> plan -> central execution -> register. Returns all intermediate artifacts. Authority-option injection rejected.

### Stage 21 — strict process/enrichment table input

Dependency-free strict CSV tokenizer plus exact operating-case and enrichment contracts. Focused local parser smoke PASS. Exchange private tokenizer consolidation deferred as DEBT-001.

### Stage 22 — tabular workflow façade

Accepts parsed exchange / XLSX / limited Elements CSV plus process/enrichment CSV and delegates to Stage 20. Limited topology CSV still requires explicit opt-in. XLSX runtime path implemented but NOT_RUN with real dependency here.

### Stage 23 — CSV templates + register export — COMPLETE / FOCUSED PASS

Delivered:

```text
converters/vibration/tabular/csv.js
converters/vibration/tabular/templates.js
converters/vibration/tabular/index.js
converters/vibration/facility/fit-register-export.js
converters/vibration/facility/index.js
tests/vibration-csv-export.test.mjs
docs/vibration/VibrationCsvTemplatesAndRegisterExport-v1.md
```

Behavior:

- deterministic CRLF CSV serializer;
- correct comma/quote/CR/LF escaping;
- finite number and scalar-only enforcement;
- templates are header-only by default;
- optional examples are explicitly `SAMPLE_*_DO_NOT_USE` / `SAMPLE_ONLY_NOT_PROJECT_DATA`;
- register CSV preserves benchmark/evidence/authority columns;
- incomplete/failed numerical cells are blank, never zero;
- no pass/safe/riskScore/facilityScore fields.

Focused dependency-free exact-source fixture executed locally on 2026-08-12:

```text
CSV serialize/parse round trip                  PASS
header-only templates                           PASS
sample-only opt-in templates                    PASS
facility register CSV / blank incomplete LOF    PASS
forbidden score/authority labels                PASS
```

The committed Stage 23 test file exists as `tests/vibration-csv-export.test.mjs`; full branch execution remains NOT_RUN.

### Stage 24 — `VibrationWorkspaceModel.v1` — IN_PROGRESS

#### Objective

Create the table-only workspace/read model consumed by a future UI without adding UI-specific engineering logic.

Planned input:

```text
VibrationFacilityFitWorkflow.v1
or
VibrationFacilityFitRegister.v1 + optional dataset/plan/result artifacts
```

Planned output:

```text
schema: VibrationWorkspaceModel.v1
authority: READ_MODEL_ONLY
screeningAuthorized: false
summary
rows
filters
selection/detail
warnings
```

Planned row capabilities:

- deterministic sort by Line / Case / Canonical ID;
- filter by line, case, status/completeness, reference band, qualification, evidence strength and candidate-review state;
- preserve null numerical cells for non-calculated rows;
- expose explicit benchmark-only/evidence/completeness state;
- never compute a new LOF, pass/fail, universal risk score or hidden ranking.

Planned detail model for a selected row:

```text
Summary
Inputs
Operating Case
Evidence / Qualification
Source Trace
Errors / Missing / Invalid
```

The detail model may reference dataset/plan/result records but must not mutate them and must not infer missing data.

Planned files:

```text
converters/vibration/workspace/model.js
converters/vibration/workspace/index.js
converters/vibration/index.js
tests/vibration-workspace-model.test.mjs
docs/vibration/VibrationWorkspaceModel-v1.md
agents/PR438_workreport.md
```

## Changed-File Ledger / Reconciliation

At Stage 23 reconciliation GitHub reports 71 changed paths in the assignment. Categories:

```text
2 benchmark datasets
1 living work report
5 central engineering API/registry/unit files + FIT adapter
FIT domain modules
vibration exchange/dataset/facility/tabular public APIs
vibration engineering/product documentation
focused vibration/core tests
package source-extraction script declaration
existing Engineering Calculation Console benchmark gating
```

No `.github/workflows/*`, no 3D/canvas/viewer files, no AIV/SBC/cavitation/surge/slug numerical implementation and no unrelated product family have been added.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused qualification | PASS |
| EI D2/D4 example parity | PASS |
| Stage 15 SheetJS-compatible exchange fixture | PASS |
| Stage 21 strict CSV/process/enrichment focused smoke | PASS |
| Stage 23 CSV/template/register-export focused fixture | PASS |
| Stage 16–22 full committed regressions | NOT_RUN |
| Actual `xlsx@0.18.5` exchange regression | NOT_RUN |
| Full repository regression | NOT_RUN |
| GitHub Actions | BLOCKED_EXTERNAL — runner not allocated due billing/spending condition |
| Full licensed/adopted method review | NOT_RUN / BLOCKED |
| Independent vibration-engineer approval | NOT_RUN / BLOCKED |
| Screening authority | NOT_AUTHORIZED |

## Known / Deferred Work

- DEBT-001: consolidate duplicate exchange CSV tokenizer only after actual exchange/XLSX regression can run.
- Full licensed EI T2.2/project procedure reconciliation and applicable errata review.
- Resolve/approve the manual OD family gap rather than guessing/interpolating.
- Full checkout/regression and CI once runner/checkout is available.
- No mechanism expansion (AIV/FIP/SBC/etc.) until FIT boundaries and reusable table workflow are stable.

## Next-Agent Handover

- PR/branch: #438 / `agent/fiv-fit-roadmap-foundation`.
- Current stage: Stage 24.
- Implement a pure workspace/read model, not DOM/UI rendering first.
- Preserve the register row as source of table truth; do not calculate or rank in the workspace model.
- Filters/sorts may change presentation order/visibility only; they must never alter evidence or authority.
- A selected-row detail may join existing dataset/plan/result records using exact Line / Case / Canonical ID identity only.
- No 3D/canvas/viewer.
- No pass/safe/universal score.
- Update this report before and after Stage 24, then reconcile the PR and refresh the stale PR description.
