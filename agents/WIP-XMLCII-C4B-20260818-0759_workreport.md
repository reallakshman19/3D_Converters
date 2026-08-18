# WIP XMLCII C4b Work Report — supportConfigJson revision-boundary routing

## Current state

```text
WIP = WIP-XMLCII-C4B-20260818-0759
BRANCH = agent/xml-cii-c4b-config-routing-20260818-0759
BASE_MAIN = e93cf16b9670a9876135a659b4f26506857b2c36
WORK_INTENT = IMPLEMENT
REPOSITORY_STATE = NEW_PR_REQUIRED
MUTATION_AUTHORITY = WRITE_ALLOWED_AFTER_BACKUP_GATE
CRITICALITY = ENGINEERING_CRITICAL
PR_RECOVERY_STATE = RECOVERABLE
TAKEOVER_AUTHORITY = NOT_APPLICABLE_NEW_STAGE
APPENDIX_A = 96/100; min 19/20
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_NEW_STAGE
```

## Handover in 60 Seconds

C4 dependency revisions are merged on main, but four active UI save surfaces can still mutate `supportConfigJson` by direct object spread instead of `updateWorkflowState()`. That bypass can leave `supportConfigRevision` / `branchLineMapRevision` stale, making broader C5 invalidation unsafe. Route these saves through the existing state boundary only; do not change support/GAP semantics, writer/runtime, formulas, units, or result authority.

Confirmed active bypasses:

1. `xml-cii-adapted-config.js` — Save Config.
2. `xml-cii-adapted-weight-match-v2.js` — shared Weight Match `onSaveConfig`.
3. `xml-cii-adapted-bend-radius-toggle.js` — Bend Radius config toggle persistence.
4. `xml-cii-adapted-support-type-mapper.js` — shared restraint-type mapping table `onSaveConfig`.

## Live ground truth

- main: `e93cf16b9670a9876135a659b4f26506857b2c36` (#608 merged performance stack).
- #605/#589 Node-140/support-gap work: no exact-file overlap; semantic coordination only.
- #598/#599 salvage performance drafts: no exact-file overlap with the four C4b targets.
- contaminated bootstrap PR #610 was closed without C4b production edits.
- `agents/MASTER_INDEX.md` was not found on main.

Coordination classification: `SAFE` for exact-file custody; `COORDINATION_REQUIRED` semantically only to preserve support/GAP behavior.

## Mission / acceptance

Route every confirmed active `supportConfigJson` save surface through `updateWorkflowState()` so dependency revisions and cached master config are advanced by the existing centralized rules.

Acceptance:

- Save Config changes general config => exactly one `supportConfigRevision` advancement through the boundary.
- Branch→Line config changes, where applicable, remain independently tracked by existing `branchLineMapRevision` rules.
- Weight/master-row-only authority remains excluded from general support-config signature as already defined by C4.
- identical semantic config save does not invent revision changes.
- active save surfaces no longer assign `supportConfigJson` directly.
- persistence remains after state-boundary commit and uses the synchronized next master context.
- Mode A shared refs continue to receive the routed revision state; no runtime-owner switch.

## Authority / invariants

Protected:

- `converters/scripts/inputxml_to_cii2019.py` immutable core behavior;
- support/GAP classification and resolution semantics;
- CII writer/runtime ownership;
- units, formulas, topology, result publication;
- no workers, no persistent revision metadata, no workflow files.

Only state-transition custody changes.

## Diagnosis / falsifier

Hypothesis: direct UI config-save assignments are the remaining C4 custody gap; replacing them with the existing `updateWorkflowState()` transition makes the already-qualified revision ledger authoritative without changing engineering content.

Falsifier: routed saves alter config bytes/engineering semantics, cause duplicate revision bumps, master-only changes bump general support config, Mode A loses shared config propagation, or any active direct save surface remains.

## Appendix A — implementation qualification

A1 Production Trace — 19/20: traced active Save Config/Weight Match/Bend Radius/Support Mapper callbacks to direct state replacement and traced `updateWorkflowState()` to parse-once config synchronization plus `advanceDependencyRevisionState()`.

A2 Failure Isolation — 19/20: isolated stale revision custody to bypasses, not to `supportConfigSignature()` or revision arithmetic. Existing master Apply path already uses the boundary.

A3 Authority / Invariant — 20/20: general support config excludes master rows/field maps and Branch→Line map; Branch→Line has its own signature/revision; support/GAP and writer authority remain untouched.

A4 Independent Validation — 19/20: add source-boundary regression for all active save surfaces plus direct dependency-revision behavior checks; retain browser execution as NOT_RUN unless actually executed.

A5 Minimal Patch — 19/20: import/use `updateWorkflowState()` in the four active bypass modules, persist from returned state, avoid unrelated refactor; add one focused regression file.

Total 96/100; minimum 19/20. Implementation authorized after mandatory native pre-edit backups.

## Planned changed-file ledger

Existing — backup required before edit:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-config.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-bend-radius-toggle.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-support-type-mapper.js`

New:

- `tests/xml-cii-standalone-config-revision-routing.test.mjs`
- WIP/PR report, status and claim records.

## Validation ledger

```text
pre-edit backup gate                         NOT_RUN
modified-module syntax                       NOT_RUN
focused C4b routing regression               NOT_RUN
existing C4 dependency revision suite        NOT_RUN
browser active-save lifecycle                NOT_RUN
changed-file reconciliation                  NOT_RUN
reviews/checks                               NOT_RUN
```

No NOT_RUN item is represented as PASS.

## EXACT_NEXT_ACTION

Execute the repository-native `node utils/backup.js save ...` operation against exact main bytes for all four existing target files. Only after successful backup evidence, apply the surgical boundary-routing patch and focused regression.
