# PR664 — Assessment evidence currentness receipts Work Report

## Current recovery state

- PR: #664
- TITLE: `feat(vibration): add assessment evidence currentness receipts`
- BRANCH: `agent/vibration-assessment-evidence-20260819`
- BASE / MERGE BASE: `main@12f9601b7fe9441f7cf7750da5892c09e5ebab7a`
- ENGINEERING_BASIS_HEAD: `e659bfd35ead074ce5319ded0dca6251806e521c`
- CRITICALITY: ENGINEERING_CRITICAL
- PR_STATE: OPEN_DRAFT
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

## Handover in 60 seconds

Phase 4A delivers:

```text
VibrationAssessmentEvidenceReceipt.v1
  -> VibrationAssessmentEvidenceLedger.v1
  + current method/input/source basis
  -> VibrationAssessmentEvidenceCurrentness.v1
  -> VibrationAssessmentEvidenceLedgerCurrentness.v1
```

A receipt preserves result evidence and basis fingerprints; loading/revalidating it can never create a current engineering result.

Receipt scope/data includes exact assessment item + line/case/canonical scope, method/revision/qualification revision, method-definition hash, engineering-input hash, source-basis hash, calculation time, JSON-safe result payload and bounded authority-at-calculation metadata.

Receipt creation requires `CURRENT_RESULT` at calculation time. The mechanism-item factory accepts only `VibrationMechanismAssessmentItem.v1` with a current non-null result.

Receipt authority is always:

```text
authority                       ASSESSMENT_RESULT_EVIDENCE_ONLY
createsCurrentEngineeringResult false
screeningAuthority              NOT_AUTHORIZED
designAuthority                 false
rootCauseAuthority              false
codeCompliance                  false
safetyAuthority                 false
```

Currentness states:

```text
BASIS_UNAVAILABLE
EVIDENCE_CURRENT
STALE_EVIDENCE
```

`EVIDENCE_CURRENT` is freshness only, never `CURRENT_RESULT` authority. Exact parity covers method ID/revision, qualification revision, method-definition hash, engineering-input hash and source-basis hash. Explicit stale reasons identify each mismatch dimension. Missing current basis fails closed to `BASIS_UNAVAILABLE`.

No `VibrationIntegrityProject.v2` schema is declared here; this seam is intended to be consumed by it later.

## Product/test paths

- `converters/vibration/project/assessment-evidence.js`
- `converters/vibration/project/assessment-currentness.js`
- `tests/vibration-assessment-evidence.test.mjs`
- `tests/vibration-assessment-currentness.test.mjs`

All are new files; existing-file backup is `NOT_APPLICABLE`.

## Validation truth

```text
live repository/source grounding             PASS / SOURCE_INSPECTION
ownership/coordination                       PASS
actual mechanism-item schema constant        PASS / SOURCE_INSPECTION
source syntax                                PASS / LOCAL_EXECUTION
physical-line policy                         PASS: 184 / 101 / 103 / 90
focused behavior                             PASS 14/14
exact product/test Git blob identity         PASS
receipt forged-authority rejection           PASS
unsupported authority snapshot rejection     PASS
stale-item receipt rejection                 PASS
JSON-safe result payload                     PASS
exact-basis evidence-current                 PASS
basis-unavailable fail-closed                PASS
method/input/source staleness reasons        PASS
ledger history/currentness counts            PASS
repository-native focused tests              NOT_RUN / ENVIRONMENT_BLOCKED
browser acceptance                           NOT_APPLICABLE / no UI
independent numerical verification            NOT_APPLICABLE / no numerical change
```

Exact validated blobs:

```text
assessment-evidence.js                 1985c63f7f279d224787678278b7eb269d8a5b4e
assessment-currentness.js              0ee935a26d0efdf71add21e2a2c01546966ed3ff
vibration-assessment-evidence.test     7390083a08187be94ba51a4489549e9a121eadc2
vibration-assessment-currentness.test  5ce1b039814f7ca54a8b223697ab184db059f39e
```

The 14/14 run used these exact product/test bytes with a narrow local stub only for the pre-existing mechanism-item schema constant; the actual repo constant was separately inspected and matches.

## Coordination / continuation

- No open PR found for Project v2, assessment-evidence receipts or project-currentness persistence before allocation.
- PR661/PR662 are independent verification evidence foundations.
- PR649 work-item currentness does not own this project receipt/currentness domain.

Do not prematurely declare Project v2 or verification persistence while these foundation contracts are unmerged. Once stable, Project v2 can persist `assessmentEvidence[]` and revalidate every receipt on load without self-promotion.

## EXACT_NEXT_ACTION

Refresh exact PR head/main relation, changed-file ledger, mergeability, reviews, review threads, statuses and PR-triggered workflow runs. Synchronize final recovery truth and stop at Owner gate. Do not merge.
