# WIP 3 — SBC Type-3 Production Freeze PF-003

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-003-candidate-currentness
BASE_MAIN: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
GROUNDING_EPOCH: 2026-08-15T14:53Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: ok, proceed next phase
OWNER_PROGRESSION_COMMENT: #514 comment 5302780129
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-003 per-scope candidate currentness + stale-async commit protection
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Progression Boundary

PF-001 / PR #520 and PF-002 / PR #521 remain OPEN / DRAFT / BLOCKED / NOT_FROZEN because official served-app browser evidence remains NOT_RUN. The Owner progression direction permits this next isolated slice only; it does not convert either prior slice to PASS/FROZEN and does not grant merge authority.

PF-003 is independent of both unmerged SBC branches. It contains no Type-3 calculation arithmetic, no master-assisted derivation, no final LOF, and no imports from #520/#521.

## Live Grounding

```text
main                  e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
main advance          731655e2... -> e97effb0... via merged AIV PF-01 #519
advance overlap       NONE with PF-003 SBC paths
PR #520 / PF-001      OPEN / DRAFT / BLOCKED / NOT_FROZEN
PR #521 / PF-002      OPEN / DRAFT / BLOCKED / NOT_FROZEN
PR #508               OPEN / DRAFT / salvage evidence only
competing SBC PF-003  none found
AIV / #513            OUT OF SCOPE
```

## PF-003 Hypothesis

Current production has exact SBC facility scope identity but no reusable SBC Type-3 candidate-currentness contract that independently proves:

- a cached candidate can only be consumed by its exact facility scope;
- a physical engineering-input edit invalidates the prior candidate immediately;
- a manual D/F/G project-evidence edit invalidates the prior candidate immediately;
- an async evaluation started on an older engineering revision cannot commit afterward;
- facility A and B remain isolated;
- presentation/navigation changes do not invalidate engineering state.

A pure SBC-specific immutable state helper can close those repository-level seams without depending on unmerged PF-001/PF-002 calculation work or touching shared UI/workflow contracts.

### Falsifier

Stop if current `main` already has an equivalent SBC currentness contract, if correct behavior requires editing the shared #511/#512 workflow/activity contract, or if the slice cannot distinguish engineering edits from presentation-only changes without inventing new shared workflow vocabulary.

## Recovery / Salvage Decision

Current merged Mechanical controller provides a useful current-production pattern: per-scope pending evaluation tokens are invalidated on engineering edits and only the matching token may commit.

Old #508 `tabs/vibration-integrity-sbc-master-assisted-controller.js` is `REIMPLEMENT_FROM_CONCEPT`, not `SALVAGE_EXACT`. Its `evaluateMasterAssisted()` commits the result after `await` without a scope revision/current-operation guard, so an older evaluation can overwrite newer engineering input.

PF-003 will use deterministic sequence tokens and explicit engineering revisions. No random/time token and no stale promise commit are allowed.

## Protected Invariants

```text
scope identity is exact
engineering edits increment scope revision
manual D/F/G evidence edits increment scope revision
current candidate is invalidated synchronously on engineering edit
presentation/navigation changes do not increment engineering revision
start evaluation binds {scopeId, revision, token}
completion commits only when scopeId + revision + token are still current
stale completion is rejected/discarded
wrong-scope candidate is rejected
scope A mutation does not invalidate scope B
no calculation result may become Screening authority here
```

## Planned Files

New files only:

```text
tabs/vibration-integrity-sbc-candidate-currentness.js
tests/vibration-sbc-type3-candidate-currentness.test.mjs
```

No existing production file edit is planned, so no pre-edit backup is required unless scope changes. If an existing file becomes necessary, stop before mutation and record the exact pre-edit Git blob / repository backup evidence.

## Validation Plan

Target frozen regressions:

```text
SBC-PF-07 wrong facility-scope cached result rejected
SBC-PF-08 physical-input edit invalidates prior SBC candidate
SBC-PF-09 D/F/G evidence edit invalidates prior SBC candidate
SBC-PF-10 async stale result cannot overwrite newer input
```

Additional currentness regressions:

- A/B facility isolation;
- new evaluation supersedes older evaluation on same revision;
- stale/error completion cannot clear or replace newer pending/current state;
- presentation/navigation mutation leaves engineering revision/current candidate unchanged;
- deterministic operation tokens, no wall-clock/randomness;
- candidate read returns current only when exact scope/revision/currentness match;
- no Screening-authority or engineering-calculation semantics added.

Browser/UI integration remains a later focused slice. Official served-app Chromium is not claimed PASS by this pure-state work.
