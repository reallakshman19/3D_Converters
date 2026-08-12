# PR438 — FIT / FIV API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver a controlled API-first FIT benchmark vertical and table-only vibration product without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR / branch | #438 / `agent/fiv-fit-roadmap-foundation` |
| Base | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR state | OPEN / DRAFT / mergeable at latest check. |
| Current stage | **Stage 29 — IN_PROGRESS: Engineering Calculations hierarchy + Vibrations landing page** |
| Prior stage | **Stage 28 — PARTIAL: current-head hardening/source validation; full current-head checkout regression still NOT_RUN** |
| Engineering state | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; screening/design NOT AUTHORIZED. |
| Product boundary | Vibration consumes table exports from Advanced_Analysis 3D EDIT only. No 3D viewer, canvas, geometry rendering, heatmap or embedded model runtime. |

## Handover in 60 Seconds

Current engineering path:

```text
3D EDIT table export
 -> VibrationTableExchange.v1
 -> VibrationIntegrityDataset.v1
 -> VibrationFacilityFitPlan.v1
 -> optional VibrationFacilityFitPreflight.v1 (no calculation)
 -> central calculateEngineeringBatch() only after explicit Run
 -> VibrationFacilityFitResult.v1
 -> VibrationFacilityFitRegister.v1
 -> VibrationWorkspaceModel.v1
 -> visible FIT table workspace / CSV export
```

Owner has now explicitly changed the visible navigation scope. Required hierarchy is:

```text
Engineering Calculations
  1. Calculations
  2. B31.3 Material Factors
  3. Empirical Weight Tuning
  4. HP Piping Class
  5. Vibrations
       -> landing page
          -> FIT
             -> existing table-first FIT workspace
```

Current `main` already contains the four-item Engineering Calculations workspace shell and HP Piping Class integration. This PR branch predates that shell and still has older direct engineering tabs. Stage 29 therefore aligns to current-main architecture and adds Vibrations as item 5 instead of creating a competing navigation model.

## Mission / Engineering Intent

1. Stable public ID `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical terminology.
2. Central Engineering Calculation API is the only numerical FIT path.
3. FIT remains benchmark-only until #429 authority gates close.
4. Preflight/readiness never executes numerical FIT.
5. No hidden defaults, unit guessing, nearest-size inference or project-procedure assumptions.
6. Missing/not-ready/failed states remain explicit and numerically blank.
7. Qualification, evidence strength, completeness and engineering-review-candidate status remain separate.
8. No pass/safe/universal risk/confidence/facility score and no hidden LOF ranking.
9. Canonical ID / Line / Operating Case identity and provenance remain explicit.
10. No 3D/canvas/viewer in vibration.
11. UI renders existing artifacts only; it does not reproduce equations or authority logic.
12. Engineering navigation must reuse the current-main Engineering Calculations workspace architecture.
13. Vibrations is a landing page, not a direct numerical execution tab; FIT is entered from that landing page.
14. Existing deep links to the prior `vibration-integrity` route should be migrated/aliased to `Engineering Calculations > Vibrations > FIT` where practical.

## Mission Status

| Work item | Priority | Status | Evidence |
|---|---:|---|---|
| FIT roadmap/source/kernel | P0 | IMPLEMENTED / focused validated | workbook + EI D2/D4 + hand cases |
| Central adapter/Console | P0 | IMPLEMENTED | benchmark gate |
| Evidence/candidate metadata | P0 | IMPLEMENTED | non-authorizing |
| Exchange/dataset/facility workflow | P0 | IMPLEMENTED | Stages 15–22 |
| CSV templates/register export | P0 | FOCUSED PASS | Stage 23 |
| Workspace read model | P0 | FOCUSED PASS 6/6 | Stage 24 |
| Visible FIT table workspace | P0 | IMPLEMENTED / source-reviewed | Stages 25–27 |
| Readiness preflight | P0 | IMPLEMENTED / source-boundary PASS | Stage 26 |
| Engineering Calculations 5-item hierarchy | P0 | IN_PROGRESS | Stage 29 |
| Vibrations landing page -> FIT | P0 | IN_PROGRESS | Stage 29 |
| Full current-head regression | P0 | NOT_RUN | normal checkout unavailable in this runtime |
| Full method/project authority review | P0 | BLOCKED | licensed/adopted source + independent engineer |
| Screening authority | P0 | BLOCKED | issue #429 |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Stable public FIT ID retained. |
| DEC-012 | Decision | ACCEPTED | EI examples qualify exercised method points/slices only. |
| DEC-018 | Decision | ACCEPTED | Evidence coverage cannot grant engineering authority. |
| DEC-021 | Decision | ACCEPTED | Advanced_Analysis owns model editing; integration is table-only. |
| DEC-022 | Decision | ACCEPTED | Five-sheet XLSX is current complete exchange; CSV is Elements-only limited input. |
| DEC-023 | Decision | ACCEPTED | Canonical ID / Line / Case are explicit v1 identities. |
| DEC-024 | Decision | ACCEPTED | Process quantities require explicit value/unit/source. |
| DEC-028 | Decision | ACCEPTED | READY requests execute unchanged through central batch API. |
| DEC-030 | Decision | ACCEPTED | Register/workspace are read projections. |
| DEC-038 | Decision | ACCEPTED | Workspace is calculation-free; numerical LOF ranking sort rejected. |
| DEC-039 | Decision | ACCEPTED | Visible FIT tab contains no direct engineering kernel call. |
| DEC-040 | Decision | ACCEPTED | Preflight stops at dataset + plan. |
| DEC-041 | Decision | ACCEPTED | Full benchmark workflow lazy-loads only on explicit Run. |
| DEC-042 | Decision | ACCEPTED | Structured detail renders exact evidence/provenance without score synthesis. |
| DEC-043 | Decision | ACCEPTED | Adopt current-main `Engineering Calculations` workspace shell rather than old direct-tab navigation. |
| DEC-044 | Decision | ACCEPTED | `Vibrations` is Engineering Calculations item 5 and opens a landing page; `FIT` launches the existing FIT workspace. |
| RISK-001 | Risk | MITIGATED | Unqualified empirical method remains benchmark gated. |
| RISK-020 | Risk | ACCEPTED | Upstream XLSX semantic hash declared but not reverified downstream in v1. |
| RISK-024 | Risk | MITIGATED | Incomplete/failed rows stay explicit and blank numerically. |
| RISK-032 | Risk | MITIGATED | UI visibly distinguishes complete XLSX vs limited CSV. |
| RISK-033 | Risk | MITIGATED | Readiness exposes missing/invalid evidence before numerical Run. |
| RISK-035 | Risk | ACTIVE | Branch predates current-main Engineering workspace/HP integration; Stage 29 must avoid duplicating unrelated HP implementation or creating merge drift. |
| DEBT-001 | Debt | DEFERRED | Consolidate exchange private CSV tokenizer after real XLSX suite is runnable. |
| QST-001 | Question | BLOCKED | Complete licensed/adopted T2.2/project review. |
| QST-003 | Question | FAIL_CLOSED | Manual OD family gap remains unresolved by authority. |
| ISS-011 | External CI | ROOT_CAUSE_CONFIRMED | GitHub Actions runner blocked by billing/spending condition. |

## Stage History

### Stages 1–14 — FIT benchmark engineering vertical

Roadmap/source extraction, workbook reference kernel, central benchmark-only adapter, EI Appendix D D2/D4 examples, hand benchmarks, ambiguity hardening, evidence coverage and non-authorizing candidate metadata. Focused EI/domain suite reached 12/12 PASS. Screening remained blocked.

### Stages 15–23 — table workflow

Implemented exchange, dataset, plan, central execution, register, parsed/tabular workflow, strict process/enrichment CSV contracts, safe templates and register export. Current complete topology source is five-sheet XLSX; current CSV stays explicit Elements-only/limited.

Stage 23 dependency-free serializer/template/register-export fixture: PASS.

### Stage 24 — `VibrationWorkspaceModel.v1`

Calculation-free read model with deterministic non-numerical sort/filter, exact detail joins, summary dimensions and authority/ranking rejection. Focused isolated fixture PASS 6/6.

### Stages 25–27 — visible FIT workspace, readiness and structured detail

Implemented table imports/templates, separate Check readiness and Run FIT benchmark, facility register, filters, CSV export and structured identity/inputs/case/evidence/source/diagnostic detail. Benchmark execution is lazy-loaded only on explicit Run. No direct UI-side engineering calculation, 3D/canvas, pass/safe/score, or authority synthesis.

### Stage 28 — current-head validation/hardening — PARTIAL

Source/import boundary, HTML escaping, authority language and changed-file scope were reviewed. Prior full-checkout evidence remains valid for the earlier branch head, but newer workspace/UI changes still require current-head checkout regression.

## Validation Ledger

### Prior full-checkout evidence recorded in PR metadata

```text
focused FIT/vibration/engineering suite: 67 / 67 PASS
full npm test:                            235 / 235 PASS
```

PR metadata also records `npm run build` failing at `UNBOUND_IDENTIFIER insertText`, reproduced on clean `main`, and Actions failing before runner allocation due billing/spending.

These remain prior validation evidence only; later workspace/UI/navigation work is not covered by that earlier full-suite run.

### Current-head evidence before Stage 29 code

| Check | Status |
|---|---|
| EI/domain qualification | PASS from prior focused execution |
| Stage 23 export fixture | PASS |
| Stage 24 workspace fixture | PASS 6/6 |
| Stage 25–27 source/security review | PASS |
| Full current-head `npm test` | NOT_RUN |
| Current-head real XLSX path | NOT_RUN |
| Current-head browser navigation | NOT_RUN |
| GitHub Actions | BLOCKED_EXTERNAL |
| Screening/design authority | NOT_AUTHORIZED |

## Changed-File Ledger / Scope

Last reconciliation before Stage 29 reported 90 changed paths, all within the FIT/table-vibration assignment. Stage 29 may additionally touch only the Engineering workspace/navigation shell, Vibrations landing page, focused tests/docs and this report. It must not copy the unrelated HP implementation package from `main` into this PR.

No `.github/workflows/*`, no vibration 3D/canvas/viewer implementation, and no numerical AIV/SBC/cavitation/surge/slug kernels are allowed.

## Stage 29 — Engineering Calculations hierarchy + Vibrations landing page — IN_PROGRESS

### Owner-visible target

```text
Engineering Calculations
  Calculations
  B31.3 Material Factors
  Empirical Weight Tuning
  HP Piping Class
  Vibrations
    FIT
```

### Implementation plan

1. Replace this branch's old direct engineering-tab registry with the current-main Engineering Calculations workspace-shell pattern.
2. Add `Vibrations` as subtab item 5.
3. Add a new `Vibrations` landing page with a FIT entry.
4. FIT entry renders the existing `renderVibrationIntegrityTab` workspace inside the Vibrations subtab with a clear back-to-Vibrations control.
5. Do not create top-level `Vibration Integrity` navigation.
6. Preserve/migrate legacy `vibration-integrity` app-switch requests to the new hierarchy when practical.
7. Do not duplicate HP Piping Class production files already present on current `main`; Stage 29 references the current-main subtab contract only.
8. Add focused static tests for exact five-item ordering and landing-page routing.

### Validation targets

- exact five-item ordering and labels;
- top-level Engineering entry remains `Engineering Calculations`;
- no standalone `Vibration Integrity` nav entry;
- Vibrations landing page contains FIT;
- FIT child dynamically loads existing table-first workspace;
- no canvas/3D/direct engineering kernel in landing page;
- legacy `vibration-integrity` route maps to Vibrations/FIT;
- current-head full regression remains NOT_RUN unless a normal checkout becomes available.

## Known / Deferred Work

- complete current-head checkout/XLSX/browser validation;
- complete licensed/adopted EI/project method review and independent engineer approval;
- authority resolution for manual OD family gap;
- DEBT-001 exchange tokenizer consolidation after real XLSX suite available;
- AIV/FIP/SBC/cavitation/surge/slug remain separate future qualification tracks.

## Forward Sequence

1. Complete Stage 29 navigation/landing integration and focused source tests.
2. Reconcile changed files and PR metadata.
3. Keep PR draft until current-head regressions and engineering authority review are complete.
4. Prepare issue #429 engineering review package.
5. Only after explicit authority approval consider bounded `SCREENING` activation.

## Next-Agent Handover

- Current stage: Stage 29.
- User explicitly requires Vibrations as item 5 under Engineering Calculations, with a Vibrations landing page and FIT beneath it.
- Reuse current-main Engineering workspace architecture; do not create a parallel nav model.
- Preserve table-only/no-3D and benchmark-only authority boundaries.
- Do not add numerical method scope.
- Preserve prior-validation vs current-head-validation chronology exactly.