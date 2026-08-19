# WIP hp-kd-bulk-input — Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/hp-kd-bulk-input`
- BASE: `main@767ccd16ff6f1f8cb286551c57b0043f88885c9b`
- PREDECESSOR: PR656 merged by squash at the base SHA.
- BACKUP: `backup/hp-kd-bulk-input-pre-edit-20260819`
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_SUCCESSOR
- COORDINATION: PR649 also edits `tabs/engineering-workspace-tab.js`; PR649 changes only the Calculations loader while this work changes only the HP Piping Class loader.

## Mission

Add bulk external Seq/N engineering input directly inside the existing HP Piping Class KD Review without adding another evidence screen or changing the project schema, numerical kernels, qualification state, or design authority.

Bulk contract:

```text
cycle_id,location_id,user_salt_mpa,seq_mpa,permissible_cycles
```

CSV and TSV are accepted. Bulk mode requires the complete governed cycle set and fails closed on malformed rows, duplicate/unknown/missing cycle IDs, blank locations, negative/non-finite stress, or invalid permissible life.

## Product architecture

The existing `hp-piping-class-workbench-tab.js` is intentionally unchanged. A new wrapper `hp-piping-class-kd-bulk-workbench-tab.js` renders the existing workbench and injects one collapsed bulk editor into each KD product card.

A valid table is mapped to the existing bound inputs for location / user Salt / Seq / N and then executes the existing Calculate action. This preserves the existing controller, governed master-runtime custody, row-level audit basis, pressure-cycle mechanics and Miner bookkeeping.

The wrapper does not instantiate a second controller and does not write qualification authority.

## Protected invariants

- calculation route remains `USER_CALCULATED_KD3`;
- native KD320 arithmetic remains absent/blocked;
- `nativeCoreKd3Qualified=false`;
- Code compliance/design authority remain false;
- `hp-piping-class-project/v2` schema unchanged;
- existing pressure-cycle, Salt, Seq/N validation and cumulative-damage kernels unchanged;
- Q1/Q2 evidence intake unchanged;
- no workflow files.

## Validation ledger

| Check | Status | Observation |
|---|---|---|
| Bulk parser/apply | PASS 6/6 | LOCAL_EXECUTION / IMPLEMENTATION_COUPLED |
| Bulk UI source contract | PASS 3/3 | LOCAL_EXECUTION / SOURCE_CONTRACT |
| Combined focused harness | PASS 9/9 | LOCAL_EXECUTION |
| New JS size | PASS | parser 167 lines; wrapper 228 lines on GitHub compare |
| Base workbench preservation | PASS | `tabs/hp-piping-class-workbench-tab.js` unchanged |
| Branch diff | PASS | 5 product/test files before recovery artifacts; +5 / -0 commits from exact base |
| Full repository suite | NOT_RUN / ENVIRONMENT_BLOCKED | local github.com DNS unavailable |
| Served browser | NOT_RUN | no browser acceptance claimed |
| Hosted CI | NOT_RUN | pending PR allocation |

## Fail-closed notes

- Validation occurs before any bulk working-value write.
- Existing external rows are checked for duplicate/unknown cycle IDs before automatic governed-row completion.
- Missing governed rows may be created only after the pasted table itself is valid.
- Audit/calculation-basis fields are never imported or overwritten by the bulk table.
- After applying working values, the existing calculation may still block if audit basis or another existing required input is incomplete; no default basis is invented.

## EXACT_NEXT_ACTION

Create a draft successor PR, allocate PR-numbered recovery artifacts, reconcile exact changed files/diffs against live main and PR649, refresh statuses/workflows/reviews, and leave unmerged until explicit owner authorization for that PR.
