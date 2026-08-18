# PR611 Work Report — C4b supportConfigJson revision-boundary routing

## Current state

```text
PR = 611
BRANCH = agent/xml-cii-c4b-config-routing-20260818-0759
BASE_MAIN = e93cf16b9670a9876135a659b4f26506857b2c36
WORK_INTENT = IMPLEMENT
CRITICALITY = ENGINEERING_CRITICAL
PR_RECOVERY_STATE = RECOVERABLE
APPENDIX_A = 96/100; minimum 19/20
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_THIS NEW-STAGE PR
```

## Handover in 60 Seconds

C4 dependency revisions were already merged in #608, but four active XML→CII Standalone UI save surfaces bypassed `updateWorkflowState()` and directly replaced `supportConfigJson`. That made revision-based downstream invalidation incomplete.

PR611 routes only those state transitions through the existing boundary:

1. Config → Save Config.
2. Weight Match V2 → shared `onSaveConfig`.
3. Bend Radius Publication → toggle persistence.
4. Support Type Mapper → shared restraint-code table `onSaveConfig`.

No support/GAP interpretation, converter core, CII writer/runtime, formula, unit, topology, or result publication behavior is changed.

## Ground truth / coordination

- base main: `e93cf16b9670a9876135a659b4f26506857b2c36` (#608).
- exact-file overlap with #605/#589 Node-140/support-gap work: NONE.
- exact-file overlap with #598/#599 salvage performance drafts: NONE.
- semantic coordination with support-gap work: required only as a negative assurance; PR611 does not touch those semantics.
- contaminated bootstrap #610: CLOSED UNMERGED, no C4b production edit from this work.

## Root cause

`updateWorkflowState()` is the C4 state-transition authority: when `supportConfigJson` is patched it parses the config once, synchronizes master-context config, and calls `advanceDependencyRevisionState()`. The four active callbacks above instead assigned `stateRef.current = { ...stateRef.current, supportConfigJson: ... }`, so `supportConfigRevision` and/or `branchLineMapRevision` could remain stale after a real save.

## Implementation

For each active save surface:

- import `updateWorkflowState` from `xml-cii-adapted-state.js`;
- construct exactly the same config JSON and master-context intent as before;
- set `stateRef.current = updateWorkflowState(current, patch)`;
- persist `stateRef.current.masterContext`, i.e. the synchronized state returned by the boundary;
- retain existing render/callback behavior.

Weight Match additionally stops mutating the existing master-context object before the state replacement; the effective saved config remains the same.

## Authority / invariants

Protected and unchanged:

- `converters/scripts/inputxml_to_cii2019.py`;
- support/GAP classification, positional matching and closure;
- CII writer/runtime ownership;
- engineering formulas and units;
- source topology / branch semantics;
- master-domain signature exclusions established by C4;
- no worker or persisted-cache admission;
- no workflow-file changes.

## Native pre-edit backup evidence

Exact main source blobs were reconstructed and verified before any edit:

```text
config.js                  de88aae8e69cf191bac77cfd6a2de6894b2d673f
weight-match-v2.js         a21ed51a6992b61934c39e73cdea71989e5131c8
bend-radius-toggle.js      4a956131c4047895c370b44baa61c8a55b4d9ffb
support-type-mapper.js     c10c4bfae05638cb82bf13821608bfd79defe0bf
utils/backup.js            cd0c755457bb623b0487200a7d0b7217d8b3478e
```

Repository-native commands executed successfully:

```text
node utils/backup.js save tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-config.js "C4b pre-edit backup: route Save Config through dependency revision boundary"
node utils/backup.js save tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js "C4b pre-edit backup: route Weight Match save through dependency revision boundary"
node utils/backup.js save tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-bend-radius-toggle.js "C4b pre-edit backup: route Bend Radius save through dependency revision boundary"
node utils/backup.js save tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-support-type-mapper.js "C4b pre-edit backup: route Support Mapper save through dependency revision boundary"
```

Native backup IDs were #1–#4 in the recovery workspace; the corresponding byte-identical `.bak` artifacts are committed in this PR.

## Changed-file ledger

Production:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-config.js` — 3 additions / 2 deletions.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js` — 5 additions / 6 deletions.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-bend-radius-toggle.js` — 4 additions / 5 deletions.
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-support-type-mapper.js` — 4 additions / 5 deletions.

Regression:

- `tests/xml-cii-standalone-config-revision-routing.test.mjs` — new, 121 lines.

Evidence / governance:

- four `.backups/*.bak` files;
- `agents/PR611_workreport.md`;
- `agents/status/PR611.yaml`;
- `agents/claims/PR611.yaml`.

WIP records are temporary bootstrap history and should be removed after PR-numbered records are committed.

## Validation ledger

```text
pre-edit exact source blob verification       PASS (4/4 source blobs + native backup utility blob)
repository-native backup execution            PASS (4/4)
node --check modified modules                 PASS (4/4)
focused C4b routing/revision regression        PASS (5/5)
remote production blob parity                 PASS (4/4; matches locally tested blobs)
pre-PR changed-file reconciliation            PASS (12 expected paths, behind_by=0)
existing full C4 test file standalone run      NOT_RUN
browser active-save lifecycle                  NOT_RUN
broader release/private-repo qualification     NOT_RUN
PR reviews/checks                               PENDING FINAL INSPECTION
```

Focused regression proves:

- all four active C4b modules use `updateWorkflowState()` and do not direct-spread assign `supportConfigJson`;
- general config change advances `supportConfigRevision` exactly once while branch revision stays fixed;
- semantic no-op does not advance revisions;
- Branch→Line map change advances only `branchLineMapRevision`;
- master-row/field-map-only changes remain excluded from general support revision.

No NOT_RUN item is represented as PASS.

## Appendix A — repository-specific qualification

A1 Production Trace — 19/20. Traced active save callbacks → raw direct state replacement → C4 boundary → config parse/synchronization → dependency advancement.

A2 Failure Isolation — 19/20. Failure is transition custody bypass, not signature/revision arithmetic. Existing master Apply already uses `updateWorkflowState()`.

A3 Authority / Invariant — 20/20. General support signature excludes independent masters and Branch→Line map; no support/GAP or writer authority touched.

A4 Independent Validation — 19/20. Static active-surface routing assertions plus independent revision-domain behavior tests; browser explicitly NOT_RUN.

A5 Minimal Patch — 19/20. Four surgical callback changes plus one focused test; no worker/cache/workflow/core changes.

Total: 96/100; minimum 19/20.

## Risk register

- RISK-C4B-01: a hidden active save surface outside the four traced modules could still bypass the boundary. Mitigation: repository search and phase-panel grounding were performed; any future surface must use the state boundary and should be added to the target regression list.
- RISK-C4B-02: Mode A shared refs must preserve returned revisions when forwarding the state. Existing `commitSharedState()` copies non-protected dependency fields; no Mode A code changed here. Browser lifecycle remains NOT_RUN.
- RISK-C4B-03: persistent revision metadata is intentionally not introduced; revisions remain runtime state only.

## EXACT_NEXT_ACTION

Finish PR611 repository-side inspection: remove WIP bootstrap records after PR-numbered records exist, reconcile final changed-file list, inspect reviews/checks/head mergeability, and leave the qualified PR unmerged pending explicit owner merge authorization. After merge, broader C5 invalidation may safely rely on C4 revisions for these active config-save surfaces.
