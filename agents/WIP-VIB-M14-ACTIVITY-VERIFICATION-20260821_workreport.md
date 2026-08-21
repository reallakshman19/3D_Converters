# WIP-VIB-M14-ACTIVITY-VERIFICATION-20260821 — Activity Verification Authoring

HANDOVER_READINESS: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: SOURCE_AUDIT_AND_IMPLEMENTATION
BASE: main
BASE_SHA_AT_START: ad71a42af34afef565ea4645de83d0613996a106
PREDECESSOR_PR: 697 (MERGED)
PREDECESSOR_MERGE: ad71a42af34afef565ea4645de83d0613996a106
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission
Integrate the merged M14 `VibrationActionVerificationAttachment.v1` into the Activity workspace using governed `VibrationIntegrityProject.v1.measurementEvidence` only. The product must never match evidence by line/case alone, never create a second verification engine, and never auto-complete an M13 action.

## Product boundary

```text
VibrationIntegrityProject.v1
  -> explicit project-evidence handoff
  -> Activity current action occurrence
  -> exact scenario-scope matching sessions/products
  -> explicit verification requirement
  -> optional engineer disposition
  -> existing evaluateVibrationVerification()
  -> VibrationActionVerificationAttachment.v1
  -> append-only session ledger
```

## Authority constraints
- project handoff: evidence transport only;
- Activity authoring: caller/engineer attestation only;
- verification state: existing verification subsystem;
- action completion: M13 completion ledger only;
- no screening, completeness, governing, root-cause, code, safety or design authority.

## Critical compatibility finding
Project measurement evidence uses explicit `operatingCaseSnapshotId/hash`; facility M14 attachments require exact equality with the current action occurrence scenario ID/hash. There is no fallback to line/case matching and no inferred mapping between unrelated snapshot domains.

## Planned paths
New:
- `tabs/vibration-project-evidence-handoff.js`
- `converters/vibration/facility/action-verification-ledger.js`
- `tabs/vibration-integrity-action-verification-controller.js`
- `tabs/vibration-integrity-action-verification-view.js`
- focused tests

Existing integration candidates:
- `tabs/engineering-calculations-tab.js`
- `tabs/vibration-integrity-tab.js`
- `tabs/vibration-integrity-user-data-shell.js`
- `tabs/vibration-integrity-activity-view.js`
- `tabs/vibration-integrity-audit-log.js`

## Validation truth
Repository-native tests and served-browser authoring remain NOT_RUN until actually executed.
