# WIP hp-kd-review-compact — Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/hp-kd-review-compact`
- BASE: `main@95ee50ff78d81465f3e4968f62767d866f8b9da8`
- PREDECESSOR: PR651 merged at the base SHA.
- BACKUP: `backup/hp-kd-review-compact-pre-edit-20260819`
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_SUCCESSOR
- COORDINATION: PR649 also touches `tabs/engineering-workspace-tab.js`; its intended Calculations-loader cache hunk is independent from this PR's HP Piping Class loader hunk.

## Mission

Make the existing `USER_CALCULATED_KD3` product workflow faster and less evidence-dominated without changing engineering equations, project schema, qualification authority, or evidence custody requirements.

Primary KD Review becomes the engineering table:

`Cycle | state pair | location | CORE Salt | user Salt | external Seq | external N | applied n | Ui=n/N | status`

Repeated calculation-basis custody moves into one collapsed audit section per product. Productivity actions:

- add every uncovered governed cycle in one action;
- copy only first-row `calculationBasis` to remaining cycle rows when one external calculation legitimately covers all cycles.

The copy action never copies cycle identity, state pair, location, Salt, Seq, N or derived usage.

## Protected invariants

- production route remains `USER_CALCULATED_KD3`;
- native KD320 arithmetic remains absent;
- `nativeCoreKd3Qualified=false`;
- Code compliance/design authority remain false;
- existing pressure-cycle Salt, external Seq/N and Miner damage kernels are unchanged;
- `hp-piping-class-project/v2` schema is unchanged;
- Q1/Q2 evidence intake and controlled-source ledgers are unchanged;
- no new evidence screen or workflow file.

## Validation ledger

| Check | Status | Observation | Oracle/limit |
|---|---|---|---|
| Live base | PASS | GitHub | `95ee50ff...` |
| Productivity helper | PASS 3/3 | LOCAL_EXECUTION | implementation-coupled |
| Helper negative assurance | PASS | LOCAL_EXECUTION | basis copy leaves cycle/location/Seq/N unchanged |
| Compact UI contract | PASS | SOURCE_INSPECTION | no browser execution |
| Main drift | PASS | GitHub | still `95ee50ff...` before PR allocation |
| Full repository tests | NOT_RUN | ENVIRONMENT_BLOCKED | github.com DNS unavailable locally |
| Workbench module execution | NOT_RUN | ENVIRONMENT_BLOCKED | no full checkout/module graph |
| Browser | NOT_RUN | NOT_OBSERVED | no browser PASS claimed |
| Hosted CI | NOT_RUN | NOT_OBSERVED | pending PR |

## Diff review

The intended mission is bounded to KD Review/productivity, but the current workbench edit is `+88/-351` because the first implementation compressed formatting in unchanged surrounding functions. This is unnecessary diff churn, not a claimed product change.

Classification: `RISK-001 / MERGE_BLOCKED_PENDING_DIFF_NORMALIZATION_OR_INDEPENDENT_REVIEW`.

A draft PR is acceptable for product review and handover, but this successor should not merge in this state. Before merge, either normalize the workbench diff back to surgical hunks or independently prove unchanged Design/Static/Cycles/Envelope behavior with repository-native regression execution.

## EXACT_NEXT_ACTION

Open the draft product PR, allocate PR-numbered recovery artifacts, then leave it unmerged with the diff-normalization item explicit.
