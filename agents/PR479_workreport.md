# PR479 — FIT Reproducibility Evidence Export

## Recovery header

- Source task: #443
- PR / branch: `#479` / `agent/fit-reproducibility-evidence`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: CONTINUE
- Coordination: SAFE
- Authority invariant: FIT remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`.

## Handover in 60 seconds

Current main already has original/working input state, unit-aware editing, SHA-256 `FitRunSnapshot.v1`, stale-result protection, central-workflow result evidence, and CSV register export. The remaining #443 slice targeted by this PR is a user-downloadable reproducibility package that binds the exact working snapshot to the exact current FIT result/evidence.

No FIT engineering quantity may be recalculated by the exporter. Stale or failed results must be non-exportable as current evidence.

## Scope / acceptance

Deliver:
1. pure `FitRunEvidencePackage.v1` builder/serializer;
2. explicit current-result guard;
3. current snapshot + benchmark/source + central result/evidence binding;
4. UI download action beside the existing register export;
5. focused permanent regression and FIT release-manifest inclusion;
6. no numerical, unit, topology-authority, or screening-authority change.

## Ground truth / coordination

At grounding, open work was:
- #471 T2.8 candidate — separate mechanism/master paths;
- #474 AIV CI — separate AIV paths;
- #476 policy/docs — no production overlap;
- no active FIT implementation PR.

Classification: `SAFE`.

## Active hypothesis / falsifier

**Hypothesis:** `state.runSnapshot` plus `state.envelope.workflow` already contains the authoritative execution evidence needed for a reproducibility package.

**Falsifier:** if any required output must be recomputed or guessed in the UI/export layer, stop and expose the missing backend evidence instead.

## Intended changed-file ledger

New:
- `tabs/vibration-integrity-run-evidence.js`
- `tests/vibration-integrity-run-evidence.test.mjs`

Existing only after mandatory backup:
- `tabs/vibration-integrity-tab.js`
- `tabs/vibration-integrity-input-view.js`
- `scripts/verify-vibration-fit-release.mjs`
- `tests/vibration-fit-release-gate.test.mjs`

## Validation ledger

- Repository grounding: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Focused unit tests: NOT_RUN
- FIT release command: NOT_RUN
- Browser download acceptance: NOT_RUN
- Independent engineering review: NOT_RUN

## Negative assurance

Must remain unchanged:
- FIT equations/correlations/thresholds;
- central unit conversion;
- `BENCHMARK_ONLY` authority;
- topology downgrade semantics;
- current-vs-stale result semantics;
- backend ownership of calculated quantities.

## EXACT_NEXT_ACTION

Inspect the current facility workflow/result object and implement the pure evidence-package builder with a strict `CURRENT_RESULT` + `FitRunSnapshot.v1` guard before any UI wiring.
