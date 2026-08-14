# WIP-FIT443-REPRO — FIT Reproducibility Evidence Export

## Recovery header

- Source task: #443
- Repository: `reallaksh19/3D_Converters`
- Branch: `agent/fit-reproducibility-evidence`
- Base/main at grounding: `36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Mutation authority: WRITE_ALLOWED inside bounded scope
- Coordination: SAFE
- Authority invariant: FIT remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`.

## Handover in 60 seconds

Current main already has original/working input state, unit-aware edits, a deterministic SHA-256 `FitRunSnapshot.v1`, stale-result protection, backend result evidence, and CSV register export. The concrete #443 gap targeted here is that the reproducibility snapshot/result evidence is visible but not downloadable as one governed package.

This WIP will add a deterministic FIT reproducibility-evidence JSON export that binds the current run snapshot to the current central-workflow result and source/benchmark identity. It must reject stale/non-current results and must not recompute FIT quantities in UI code.

## Active hypothesis / falsifier

**Hypothesis:** the existing `runSnapshot` plus `envelope.workflow` contains enough stable production evidence to build a lossless reproducibility package without changing the FIT kernel/API.

**Falsifier:** if a required engineering quantity must be recomputed or inferred in the UI/export layer, stop and record the missing backend evidence instead of duplicating engineering logic.

## Intended changed-file boundary

Expected new files:
- `tabs/vibration-integrity-run-evidence.js`
- `tests/vibration-integrity-run-evidence.test.mjs`

Expected existing files only if required after mandatory backup:
- `tabs/vibration-integrity-tab.js`
- `tabs/vibration-integrity-input-view.js`
- `scripts/verify-vibration-fit-release.mjs`
- `tests/vibration-fit-release-gate.test.mjs`

No FIT equation/correlation/master, central unit semantics, topology authority, workflow ownership, or numerical authority change is in scope.

## Coordination check

Open work reviewed at grounding:
- #471: T2.8 valve-closure candidate under #450 — separate mechanism/data paths.
- #474: AIV canvas CI — separate AIV/workflow scope.
- #476: repository policy/docs — no production overlap.
- No active FIT implementation PR found.

Classification: `SAFE`.

## Validation ledger

- Grounding/source inspection: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Focused implementation tests: NOT_RUN
- `npm run verify:vibration-fit-release`: NOT_RUN
- Real-browser download acceptance: NOT_RUN
- Independent engineering review: NOT_RUN

## EXACT_NEXT_ACTION

Inspect the current FIT workflow/result contracts, define the minimal export schema and fail-closed current-result guard, then implement the pure export builder before wiring any UI action.
