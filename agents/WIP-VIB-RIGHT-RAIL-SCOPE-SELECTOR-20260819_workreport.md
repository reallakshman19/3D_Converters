# WIP-VIB-RIGHT-RAIL-SCOPE-SELECTOR-20260819

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: STANDARD_PRESENTATION_NAVIGATION
REPOSITORY: reallaksh19/3D_Converters
BASE_BRANCH: main
BASE_SHA: 2f34c3904b6a4d70c577461e1ae3191f1bf4f713
BRANCH: agent/vibration-right-rail-scope-selector-20260819
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_FOLLOW_ON
```

## Mission

Let the existing right-side Vibration Assessment rail switch among exact assessment scopes that already exist in the current Vibration Integrity register.

Target scope identity:

```text
rowKey + line + caseId + canonicalId
```

This is navigation over existing current-workspace rows only. It does not create or persist operating-case identity.

## Planned flow

```text
current workspace rows
-> navigation-only scope-choice projection
-> selected-assessment card selector in right rail
-> vibration-roadmap-controller
-> click existing data-vi-row control by exact rowKey
-> existing selected-row workflow/status publication
```

## Authority / invariants

- Project-v1 has governed lines but no governed case-subject collection.
- Do not add a persisted project case model while PR665 owns Project-v2 persistence files.
- Scope choices cannot determine applicability, completeness, next action, screening, governing result, design/code/safety, disposition, RCA, or persistence.
- Unsupported/non-visible row keys fail closed.
- The existing facility register row remains the source of scope identity.

## Coordination

- PR668 merged predecessor: executable case action.
- PR667/#658 merged roadmap/status predecessors.
- PR665 open Project-v2: no edits to schema/serialize/from-eit/load-currentness/tests.
- PR649 open shared UI/cache custody: no edits to vibration-integrity-tab.js, user-data shell, engineering-calculations-tab.js, engineering-workspace-tab.js, or cache chain.

## Intended paths

```text
tabs/vibration-integrity-roadmap-bridge.js        EDIT
tabs/vibration-roadmap-panel.js                   EDIT
tabs/vibration-roadmap-controller.js              EDIT
tests/vibration-roadmap-scope-selector.test.mjs   NEW
.backups/connector-20260819-vib-right-rail-scope-selector/   rollback copies
agents/WIP-VIB-RIGHT-RAIL-SCOPE-SELECTOR-20260819_*           recovery
```

## Validation plan

- exact existing register rows become immutable navigation choices;
- duplicate row keys fail closed or are deduplicated without inventing identity;
- selected row is marked exactly;
- right-rail selector renders line/case/canonical labels;
- controller clicks only an existing matching data-vi-row control;
- missing row button does not mutate anything;
- authority remains navigation-only;
- exact committed-byte focused execution where possible;
- broader repository/browser checks remain NOT_RUN if environment unavailable.

## Exact next action

Create status/claim records, then save exact pre-edit rollback copies before editing the three existing roadmap files.
