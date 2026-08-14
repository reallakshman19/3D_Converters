# Continuous Handover Protocol

## 1. Governing invariant

The repository must survive the active agent's disappearance.

At every durable checkpoint:

```text
repository + PR + current work report + live GitHub
```

must be sufficient for a qualified incoming agent to determine:

1. current repository and PR truth;
2. mission, scope, acceptance criteria, and explicit non-goals;
3. what is implemented, partial, blocked, deferred, or unstarted;
4. what is proven, inferred, user-supplied, or not observed;
5. engineering/software authority and invariants;
6. active findings, risks, decisions, questions, and debt;
7. current validation and the HEAD/oracle to which it applies;
8. active review feedback and multi-agent overlaps;
9. exact continuation location and exact next safe action;
10. whether the PR should be continued, quarantined, salvaged, or superseded.

## 2. Durable checkpoint discipline

"At all times" means at every durable checkpoint. Bytes that were never persisted cannot be recovered.

For meaningful work:

```text
update intent/hypothesis in report
-> perform one coherent implementation or investigation unit
-> characterize result
-> update report
-> commit/push durable state
-> continue
```

Do not accumulate large unreported implementation spans.

Update the report after every meaningful state transition, including:

- before and after a stage;
- production-code commits;
- important validation results;
- new or changed `ISS-*`, `RISK-*`, `DEC-*`, `QST-*`, `DEBT-*`;
- hypothesis changes;
- authority/scope changes;
- material review feedback;
- rebase/base drift;
- changed-file scope changes;
- blocker changes;
- before stopping, handover, ready-for-review, or closure.

## 3. Recovery header

Every active report maintains:

```text
HANDOVER_READINESS: READY | DEGRADED | NOT_READY
PR_RECOVERY_STATE: HEALTHY | RECOVERABLE | DEGRADED | TAKEOVER_REQUIRED | QUARANTINED | SALVAGE_ONLY | SUPERSEDE_RECOMMENDED | SUPERSEDED | TERMINAL
TAKEOVER_AUTHORITY: READ_ONLY | QUALIFICATION_PENDING | WRITE_ALLOWED | RESTRICTED | REVOKED

PR_HEAD_OBSERVED:
REPORT_BASIS_HEAD:
MAIN_HEAD_LAST_CHECKED:
MERGE_BASE:
REPORT_SYNC: CURRENT | STALE
APPENDIX_A_STATUS: CURRENT | STALE | NOT_REQUIRED
GROUNDING_EPOCH:
LAST_DURABLE_CHECKPOINT:
CURRENT_STAGE:
CURRENT_BLOCKER:
HIGHEST_RISK:
EXACT_NEXT_ACTION:
```

Never use an ambiguous single `HEAD`.

## 4. Grounding epochs

A grounding epoch records the exact live state independently observed at takeover or material reconciliation.

Example:

```text
GROUNDING_EPOCH: GE-008
verified_at:
PR_HEAD:
MAIN_HEAD:
MERGE_BASE:
changed_files_verified:
reviews_verified:
checks_verified:
claims_verified:
```

If PR HEAD or material repository state changes, the previous epoch becomes historical.

## 5. Takeover chain

Takeovers are append-only custody events:

```text
TKO-001 -> TKO-002 -> TKO-003
```

Each records incoming PR HEAD, grounding epoch, qualification status, inherited items, contradictions/superseded assumptions, and takeover decision.

Agent identity is not the durable work identity. PR/WIP ID, branch, mission, and HEAD are.

## 6. Freshness rules

- `REPORT_BASIS_HEAD` is the latest implementation/content HEAD whose state the report describes. It need not equal the commit containing the report because that would create an impossible self-reference.
- `REPORT_SYNC=CURRENT` only when live PR HEAD equals `REPORT_BASIS_HEAD`, or every later commit contains only allowed recovery metadata (`workreport`, `status`, `claim`, master-index synchronization) and no production/test/authority change.
- Any production, test, benchmark, configuration, authority, or scope-changing commit after `REPORT_BASIS_HEAD` makes the report `STALE` until reconciled.
- Validation remains historical PASS if the applicable implementation HEAD moves; current applicability must be re-established.
- Decisions may carry forward unless superseded.
- Observations require freshness checks.
- Hypotheses must be re-evaluated.
- Mutable GitHub state is always fetched live on takeover.
- Appendix A becomes `STALE` when the unresolved implementation problem materially changes.

## 7. Handover readiness

`HANDOVER_READINESS=READY` requires at minimum:

- current live repository/PR grounding;
- synchronized report;
- mission/scope/acceptance current;
- current implementation and partial work identified;
- active findings/risks current;
- authority/invariants current;
- validation state and NOT_RUN items explicit;
- changed-file ledger reconciled;
- review/overlap state known;
- exact continuation state and next action;
- current Appendix A while technical implementation remains.

If any mandatory item is stale, use `DEGRADED` or `NOT_READY` and explain why.
