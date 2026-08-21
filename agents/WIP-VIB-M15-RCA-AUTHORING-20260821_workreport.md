# WIP-VIB-M15-RCA-AUTHORING-20260821 — M15 RCA Authoring

HANDOVER_READINESS: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: IMPLEMENTATION
BASE: main
BASE_SHA_AT_START: 7aabe404c6f58db1b78756de9412ab93e867b5fe
PREDECESSOR_PR: 699 (MERGED)
PREDECESSOR_MERGE: 7aabe404c6f58db1b78756de9412ab93e867b5fe
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

## Mission
Implement the first M15 root-cause-analysis product slice after merged M14 measurement/verification authoring. RCA must consume exact project/action/verification custody, capture hypotheses and evidence for/against, and permit only explicit engineer-attested conclusions. It must not autonomously infer or confirm root cause and must not alter screening, applicability, AssessmentCompleteness, action completion, design, code or safety authority.

## Target flow

```text
current project + current action occurrence
  -> exact project-scoped M14 verification records
  -> RCA hypothesis
  -> explicit evidence-for / evidence-against links
  -> optional explicit engineer conclusion
  -> append-only project-scoped RCA ledger
  -> Activity presentation/audit
```

## Authority constraints
- platformRootCauseInference = false;
- autoConfirmAllowed = false;
- engineer conclusion is caller attestation only;
- no numerical authority;
- no screening/design/completion/applicability/completeness/governing authority;
- RCA never mutates M13 completion or M14 verification ledgers.

## Planned paths
New:
- `converters/vibration/rca/contracts.js`
- `converters/vibration/rca/ledger.js`
- `tabs/vibration-integrity-rca-controller.js`
- `tabs/vibration-integrity-rca-view.js`
- `tabs/vibration-integrity-rca-audit.js`
- focused tests

Existing integration:
- `tabs/vibration-integrity-action-verification-controller.js`
- `tabs/vibration-integrity-activity-view.js`
- `tabs/vibration-integrity-audit-log.js`

Exact pre-edit backups are required and retained under `.backups/connector-20260821-vib-m15-rca-authoring/`.

## Validation truth
Repository-native Node tests and served-browser RCA journey are NOT_RUN until actually executed. No absence of hosted checks may be treated as PASS.
