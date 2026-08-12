# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and table-only Vibration Integrity product without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR | #438 — `agent/fiv-fit-roadmap-foundation` -> `main` |
| Base | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR state | OPEN / DRAFT / mergeable at last check. |
| Current stage | **Stage 25 — IN_PROGRESS: visible Vibration Integrity table workspace tab** |
| Last stage | **Stage 24 — COMPLETE / FOCUSED PASS 6/6** |
| Engineering state | `VIB.FIV.FLOW_TURBULENCE` = `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; screening/design NOT AUTHORIZED. |
| Product boundary | Advanced_Analysis owns 3D/model editing. Vibration consumes table exports only. No 3D, canvas, geometry renderer, model heatmap or embedded model runtime. |
| Validation boundary | Focused source/fixture tests have passed; complete branch/full repo and real XLSX tests remain NOT_RUN. |

## Handover in 60 Seconds

Implemented backend:

```text
3D EDIT table export
 -> VibrationTableExchange.v1
 -> VibrationIntegrityDataset.v1
 -> VibrationFacilityFitPlan.v1
 -> central calculateEngineeringBatch()
 -> VibrationFacilityFitResult.v1
 -> VibrationFacilityFitRegister.v1
 -> VibrationWorkspaceModel.v1
```

Tabular imports, safe CSV templates, deterministic register export and one-call benchmark workflows exist. The new Stage 24 read model is calculation-free and supports explicit facility filtering/sorting/detail while rejecting score-like filtering/LOF ranking and authority mutation.

Stage 25 adds the first visible product consumer in the existing Engineering navigation: **Vibration Integrity**. The tab must import the existing table contracts, run only the benchmark workflow, build the Stage 24 read model and render facility table + detail panels. No numerical FIT logic belongs in the tab.

## Engineering / Product Invariants

1. Central Engineering Calculation API is the only FIT numerical execution path.
2. FIT remains benchmark-only until issue #429 qualification gates close.
3. Missing/failed/not-ready rows are never rendered as LOF 0, safe or pass.
4. No silent process, geometry, support, damping or method defaults.
5. `Canonical ID` is element identity; Line + Operating Case are explicit table identities.
6. Evidence strength, completeness, candidate-for-review and qualification remain separate dimensions.
7. No universal vibration/facility score and no hidden severity ranking.
8. Vibration product is table-only; no 3D/canvas/viewer.
9. UI may orchestrate public vibration APIs only; it may not reproduce FIT equations or authority logic.
10. The Actions billing/spending problem must not be worked around with unrelated workflow changes.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| FIT roadmap/source/kernel | IMPLEMENTED / focused validated | workbook + EI D2/D4 + hand cases |
| Central FIT adapter/Console | IMPLEMENTED | benchmark-only execution |
| Evidence coverage/candidate gate | IMPLEMENTED | non-authorizing |
| Table exchange/dataset | IMPLEMENTED | Stages 15–16 |
| Facility plan/execution/register | IMPLEMENTED | Stages 17–19 |
| Parsed/tabular workflows | IMPLEMENTED | Stages 20–22 |
| CSV templates/register export | FOCUSED PASS | Stage 23 fixture |
| Workspace read model | FOCUSED PASS 6/6 | Stage 24 fixture |
| Visible Vibration Integrity tab | IN_PROGRESS | Stage 25 |
| Full repo regression | BLOCKED / NOT_RUN | no checkout; external Actions gate |
| Licensed/adopted method review | BLOCKED | direct source + independent reviewer |
| Screening authority | BLOCKED | issue #429 |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Stable public ID retained; FIT canonical terminology. |
| DEC-012 | Decision | ACCEPTED | EI worked examples qualify only exercised slices. |
| DEC-017 | Decision | ACCEPTED | Mixed multiphase data require explicit/unambiguous resolution. |
| DEC-018 | Decision | ACCEPTED | Evidence coverage cannot grant authority. |
| DEC-021 | Decision | ACCEPTED | Vibration integration is table-only from Advanced_Analysis 3D EDIT. |
| DEC-022 | Decision | ACCEPTED | Five-sheet XLSX is current complete exchange; CSV is Elements-only limited input. |
| DEC-023 | Decision | ACCEPTED | Canonical ID / Line identities are explicit join authority in v1. |
| DEC-024 | Decision | ACCEPTED | Process quantities require explicit value/unit/source. |
| DEC-028 | Decision | ACCEPTED | READY facility requests run unchanged through central batch API. |
| DEC-030 | Decision | ACCEPTED | Facility register is a read projection only. |
| DEC-037 | Decision | ACCEPTED | CSV templates are header-only by default; examples are explicit DO_NOT_USE. |
| DEC-038 | Decision | ACCEPTED | Workspace model is calculation-free read model and rejects authority mutation/LOF ranking. |
| DEC-039 | Decision | ACCEPTED | Visible tab consumes public workflow/workspace APIs; no UI-side engineering kernel. |
| RISK-001 | Risk | MITIGATED | Unqualified empirical method remains benchmark gated. |
| RISK-024 | Risk | MITIGATED | Missing/failed rows remain explicit, never safe/zero. |
| RISK-031 | Risk | MITIGATED | Workspace filters/sorts are presentation-only and non-numerical. |
| RISK-032 | Risk | OPEN | UI import affordances could imply certified provenance for limited CSV; XLSX/CSV integrity status must remain visible. |
| DEBT-001 | Debt | DEFERRED | Exchange private CSV tokenizer consolidation waits for runnable real-XLSX suite. |
| QST-001 | Question | BLOCKED | Complete licensed/adopted T2.2/project review. |
| QST-003 | Question | FAIL_CLOSED | Manual OD family gap remains unresolved by authority. |
| ISS-009 | Defect | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Advanced range is `1 < fn <= 3 Hz`. |
| ISS-010 | Defect | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Span-derived support classification replaces inconsistent selector. |
| ISS-011 | External CI | ROOT_CAUSE_CONFIRMED | GitHub Actions runner blocked by billing/spending condition. |

## Stage Log

### Stages 1–14 — FIT benchmark engineering vertical

Roadmap, source extraction, retained-workbook equations, central adapter, EI D2/D4 examples, hand benchmarks, ambiguity hardening, evidence coverage and non-authorizing screening-candidate metadata. Focused EI/domain suite reached 12/12 PASS. Screening remains blocked.

### Stages 15–23 — table data and facility workflow

Implemented:

```text
VibrationTableExchange.v1
VibrationIntegrityDataset.v1
VibrationFacilityFitPlan.v1
VibrationFacilityFitResult.v1
VibrationFacilityFitRegister.v1
VibrationFacilityFitWorkflow.v1
VibrationFacilityFitTabularWorkflow.v1
strict operating-case/enrichment CSV v1
safe CSV templates + register export
```

Current complete upstream exchange is the existing five-sheet 3D EDIT XLSX. Current CSV is explicitly limited Elements-only and requires opt-in where completeness is required.

Focused Stage 23 dependency-free checks:

```text
serializer round trip / quoting                 PASS
header-only templates                           PASS
explicit sample-only templates                  PASS
register export / blank incomplete LOF cells    PASS
no pass/safe/risk-score labels                  PASS
```

### Stage 24 — `VibrationWorkspaceModel.v1` — COMPLETE / FOCUSED PASS

Production files:

```text
converters/vibration/workspace/query.js
converters/vibration/workspace/detail.js
converters/vibration/workspace/model.js
converters/vibration/workspace/index.js
converters/vibration/index.js
tests/vibration-workspace-model.test.mjs
docs/vibration/VibrationWorkspaceModel-v1.md
```

Behavior:

- accepts only `VibrationFacilityFitWorkflow.v1` with benchmark/none-authority state;
- source workflow/register contracts validated without loading calculation engine;
- deterministic Line / Case / Canonical ID presentation ordering;
- exact filters for completeness/status/reference band/qualification/evidence/candidate review;
- only non-numerical presentation sort fields; LOF ranking sort rejected;
- selected detail joins exact Line + Case + Canonical ID to dataset/plan/result;
- detail sections: Summary, Inputs, Operating Case, Enrichment, Evidence/Qualification, Source Trace, Diagnostics;
- unknown selection stays null with explicit warning; no nearest/first fallback;
- output is deep-frozen, `READ_MODEL_ONLY`, `screeningAuthorized=false`.

Focused isolated execution on 2026-08-12:

```text
deterministic rows / summary             PASS
filters preserve authority/evidence       PASS
exact selected-row detail join            PASS
unknown selection fail-explicit           PASS
authority + score/ranking rejection       PASS
presentation sort                         PASS
TOTAL                                      6/6 PASS
```

### Stage 25 — visible Vibration Integrity tab — IN_PROGRESS

#### Objective

Add a real table-only product surface to the existing Engineering navigation and consume the production APIs delivered in Stages 15–24.

#### Planned surface

Navigation:

```text
Engineering
  Engineering Calculations
  Vibration Integrity
  B31.3 Material Factors
  Empirical Weight Tuning
```

Import area:

```text
3D EDIT export: XLSX preferred; Elements CSV visibly limited
Operating cases: strict CSV v1
Vibration enrichment: strict CSV v1
Download operating-case template
Download enrichment template
Run FIT benchmark
```

Workspace:

```text
summary counts
filter controls
facility table
selected-row detail
  Summary
  Inputs
  Case
  Evidence
  Source
  Diagnostics
export register CSV
```

#### UI authority rules

- tab always displays `BENCHMARK ONLY / NOT SCREENING AUTHORITY`;
- no qualification-mode selector in this product tab;
- workflow invocation fixes benchmark authority through the public API;
- limited Elements CSV warning/integrity state visible;
- no pass/safe label or traffic-light claim;
- table numerical blanks remain blank for incomplete/failed rows;
- no UI-side calculation or unit conversion;
- no 3D/canvas/viewer.

#### Planned files

```text
core/engineering-tabs-extension.js
tabs/vibration-integrity-tab.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity.css
tests/vibration-integrity-tab-static.test.mjs
docs/vibration/VibrationIntegrityTab-v1.md
agents/PR438_workreport.md
```

## Changed-File Reconciliation

Before Stage 25 production work, all changed paths remain inside the FIT/table-vibration assignment. No `.github/workflows/*`, no 3D/canvas/viewer files and no numerical AIV/SBC/cavitation/surge/slug implementation are included.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| EI D2/D4 examples | PASS |
| Stage 15 SheetJS-compatible exchange fixture | PASS |
| Stage 21 parser smoke | PASS |
| Stage 23 CSV/export fixture | PASS |
| Stage 24 workspace fixture | PASS 6/6 |
| Stage 16–22 committed full tests | NOT_RUN |
| Real `xlsx@0.18.5` branch test | NOT_RUN |
| Stage 25 visible tab tests | NOT_RUN |
| Full repository | NOT_RUN |
| GitHub Actions | BLOCKED_EXTERNAL |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 25.
- Inspect existing Engineering tab shell/styles before writing UI.
- UI must call `runVibrationFacilityFitBenchmarkFromTables()` and `buildVibrationWorkspaceModel()`; no direct FIT math.
- Prefer XLSX, visibly label Elements-only CSV as limited provenance.
- Keep import state and table/detail state explicit; no inferred defaults.
- Use existing app tab registration and dedicated stylesheet.
- No 3D/canvas/viewer and no universal risk score.
- Close Stage 25 with static/runtime validation and refresh the PR description afterward.
