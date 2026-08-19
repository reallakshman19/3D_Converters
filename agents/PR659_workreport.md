# PR659 — Bulk USER_CALCULATED_KD3 Cycle Input Work Report

## Recovery header

- PR: #659
- TITLE: `feat(hp): add bulk USER_CALCULATED_KD3 cycle input`
- BRANCH: `agent/hp-kd-bulk-input`
- BASE: `main@767ccd16ff6f1f8cb286551c57b0043f88885c9b`
- PREDECESSOR: PR656 merged by squash at the base SHA.
- CRITICALITY: ENGINEERING_CRITICAL
- PR_STATE: OPEN_DRAFT
- BACKUP: `backup/hp-kd-bulk-input-pre-edit-20260819`
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_PR659

## Handover in 60 seconds

PR659 adds one collapsed bulk editor inside the existing KD Review for `USER_CALCULATED_KD3`.

Accepted table:

```text
cycle_id,location_id,user_salt_mpa,seq_mpa,permissible_cycles
```

CSV or TSV. The complete governed cycle set is required.

The bulk editor validates before writing working values. It rejects malformed, duplicate, unknown or missing cycles; blank locations; invalid stress; and invalid N. Audit/calculation-basis fields are not part of the bulk contract and are never overwritten.

The existing HP workbench is not edited. `hp-piping-class-kd-bulk-workbench-tab.js` wraps it, injects the collapsed editor, maps valid bulk values to the existing row bindings, and invokes the existing Calculate action. This preserves the current controller and governed master-runtime custody.

## Authority boundary

```text
calculationMode            USER_CALCULATED_KD3
nativeCoreKd3Qualified     false
codeCompliance             false
canUseForDesignAuthority   false
```

No numerical kernel, project schema, Q1/Q2 evidence contract, fatigue curve/master table or workflow file is changed.

## Validation

| Check | Result |
|---|---|
| Bulk parser/apply | PASS 6/6 — LOCAL_EXECUTION / IMPLEMENTATION_COUPLED |
| Bulk UI/source contract | PASS 4/4 — LOCAL_EXECUTION |
| Focused total | PASS 10/10 — LOCAL_EXECUTION |
| Explicit-context edge | PASS — source contract + local syntax |
| New JS size policy | PASS — parser 167 lines; wrapper 240 lines on GitHub compare |
| Original HP workbench preservation | PASS — no diff for `tabs/hp-piping-class-workbench-tab.js` |
| HP workspace integration | PASS — one loader-line change only before PR allocation |
| Full repository-native tests | NOT_RUN / ENVIRONMENT_BLOCKED |
| Served browser acceptance | NOT_RUN |
| Hosted CI | NOT_RUN_PENDING_FINAL_REFRESH |

No unexecuted check is represented as PASS.

## Coordination

PR649 also touches `tabs/engineering-workspace-tab.js`. PR649 changes only the Calculations loader cache identity. PR659 changes only the HP Piping Class loader to the bulk wrapper. The hunks are independent; whichever branch re-grounds second must preserve both.

## Product files

- `tabs/hp-piping-class-kd-bulk-input.js`
- `tabs/hp-piping-class-kd-bulk-workbench-tab.js`
- `tabs/engineering-workspace-tab.js`
- `tests/hp-piping-class-kd-bulk-input.test.mjs`
- `tests/hp-piping-class-kd-bulk-ui.test.mjs`

Recovery artifacts are the PR659 and WIP workreport/status/claim files.

## EXACT_NEXT_ACTION

Refresh PR659 head, changed files, main drift, PR649 coordination, mergeability, reviews/threads, commit statuses and workflow runs. Keep draft/unmerged until explicit owner authorization for PR659.
