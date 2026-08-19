# WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819 — executable selected-case workflow action

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: STANDARD_PRESENTATION_NAVIGATION
REPOSITORY: reallaksh19/3D_Converters
BASE_BRANCH: main
BASE_SHA: b9ffa16180a1fea017505f8e39775fb9f87523ac
BRANCH: agent/vibration-right-rail-case-action-20260819
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_FOLLOW_ON
```

## Mission

Make the merged #658 right-rail `Case next action` executable without changing the governed source of the next action or remounting/losing the selected Vibration Integrity facility row.

Target flow:

```text
VibrationLineCaseAssessmentStatus.v1.nextActionCode
-> navigation-only action-to-workspace route
-> right-rail Open case task button
-> outer engineering console forwards request to the already-mounted FIT product host
-> Vibration Integrity workspace validates request and switches existing workspaceTab
```

## Authority / invariants

Navigation must not determine applicability, completeness, next-action engineering semantics, screening authority, engineering disposition, case identity, persistence, numerical values, or result currentness.

No Project-v2, AIV PF-02, FIT production-freeze adapter, numerical master/method, workflow file, runtime/writer/canvas ownership, or engineering result change is in scope.

The route must fail closed for unsupported action codes and unsupported workspace IDs.

## Coordination

- #658 merged and is the selected-case status/right-rail source.
- #667 merged and is the right-rail action-first predecessor.
- #665 remains open Project-v2; no persistence path will be touched.
- #517 remains open AIV PF-02; no AIV calculator/readiness path will be touched.
- #539/#540 remain open FIT production-freeze authority work; no FIT adapter/family authority path will be touched.
- stale merged claims on right-panel paths are historical coordination metadata, not live PR blockers.

Coordination classification: `SAFE_WITH_STALE_MERGED_CLAIM_RECONCILIATION`.

## Intended paths

```text
tabs/vibration-roadmap-workspace-routing.js               NEW
tabs/vibration-roadmap-panel.js                           EDIT
tabs/vibration-integrity-tab.js                           EDIT
tabs/engineering-calculations-tab.js                      EDIT
tests/vibration-roadmap-case-action-routing.test.mjs      NEW
.backups/connector-20260819-vib-right-rail-case-action/   NEW rollback copies
agents/WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819_*           RECOVERY
```

## Validation plan

- pure action-code -> workspace routing regression;
- unsupported action/workspace fail closed;
- selected governed case renders actionable button;
- right-panel action is forwarded before calculation routing and does not call definition reset/remount;
- mounted Vibration Integrity workspace accepts only governed navigation requests and uses existing `workspaceTab` path;
- syntax/source-size checks;
- repository-native/browser execution remains NOT_RUN if environment unavailable.

## Exact next action

Create status/claim records and exact pre-edit Git-blob backups for every existing file before mutation, then implement the pure navigation route and event bridge.
