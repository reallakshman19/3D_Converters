# WIP-VIB-M14-ACTION-VERIFICATION-20260821 — Action Verification Custody

HANDOVER_READINESS: READY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: READY_FOR_PR_ALLOCATION
PREDECESSOR_PR: 695 (MERGED)
PREDECESSOR_MERGE: 55eade922b061830db70b45a22e8f328ef005e02
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission
Bridge the existing vibration measurement/verification subsystem to the exact M13 required-action occurrence without duplicating measurement, verification, screening, completeness, root-cause, or design authority.

## Existing contracts reused
- `VibrationMeasurementEvidencePackage.v1` remains field-evidence custody.
- `VibrationVerificationRequirement.v1` remains verification requirement authority.
- `VibrationMeasurementDisposition.v1` remains engineer verification-disposition authority.
- `evaluateVibrationVerification()` remains verification-state authority.
- `VibrationActionCompletionLedger.v1` remains the only action-completion mutation path.

## New contract
`VibrationActionVerificationAttachment.v1` binds:

```text
actionId + mechanismId
+ VibrationActionOccurrence.v1
+ exact verification requirement scope
+ existing VibrationVerificationStatus.v1
+ matched session raw-data hashes
+ matched signal-product artifact/input hashes
+ optional exact M13 completion record
```

The verification scope is derived from the action occurrence without inference:

```text
action scenario line                -> verification lineId
action scenario caseId              -> verification caseId
action scenario scenarioId          -> operatingCaseSnapshotId
action scenario scenarioSnapshotHash -> operatingCaseSnapshotHash
```

`OperatingScenario.v1` already uses canonical `sha256:<64 lowercase hex>`, so no hash coercion is introduced.

## Evidence identity hardening
The attachment snapshots matched measurement evidence and computes a deterministic SHA-256 `evidenceFingerprint`. `attachmentId` commits to that fingerprint. Post-creation raw/product hash changes therefore invalidate the attachment even when the replacement hash remains syntactically valid.

## Authority boundary

```text
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
numericalAuthority = NONE
aggregationAuthority = NONE
persistenceAuthority = NONE
completionAuthority = NONE
verificationAuthority = DELEGATED_TO_EXISTING_VERIFICATION_CONTRACT
determinesApplicability = false
determinesAssessmentCompleteness = false
determinesCompletion = false
determinesGoverningResult = false
rootCauseAuthority = false
codeCompliance = false
safetyAuthority = false
```

An attachment can report existing verification states such as `AWAITING_ENGINEER_DISPOSITION` or `VERIFICATION_EVIDENCE_ACCEPTED`; it cannot complete/reopen an action.

## Falsifiers encoded
1. attachment has no screening/completion/root-cause/design authority;
2. requirement scope is derived exactly from the action occurrence;
3. accepted verification retains exact raw/product hashes and completion-record custody;
4. measurement may be attached before disposition without promoting acceptance;
5. wrong scenario snapshot requirement is rejected;
6. wrong-scope measurement cannot support an accepted disposition;
7. prior-run completion record cannot attach to a later identical run occurrence;
8. JSON round trip preserves the attachment;
9. evidence-hash tampering invalidates the deterministic evidence fingerprint.

## Effective paths

```text
converters/vibration/facility/action-verification.js   298 lines
tests/vibration-facility-action-verification.test.mjs 266 lines
```

No existing production file is edited; no pre-edit backup is required.

## Validation truth

```text
PASS     predecessor PR695 merged / branch grounded on main@55eade92  HOSTED SOURCE
PASS     existing measurement/verification contract audit             SOURCE INSPECTION
PASS     exact changed-path scope                                     2 implementation/test + 3 recovery
PASS     physical-line policy                                         298 / 266
PASS     open-PR coordination                                         no overlapping action-verification PR
NOT_RUN  repository-native focused Node test                           ENVIRONMENT_BLOCKED: Could not resolve host github.com
NOT_RUN  repository-native vibration regression suite                  ENVIRONMENT_BLOCKED
NOT_RUN  served-browser verification journey                           NOT_APPLICABLE_THIS_FOUNDATION_SLICE
N/A      independent numerical verification                            no equation/value change
```

No source inspection or authored falsifier is represented as repository-native execution PASS.

## Next
Allocate the draft PR, migrate WIP recovery to the assigned PR number, reconcile exact head/files/mergeability/reviews/checks. The successor M14 slice may integrate typed attachments with the Activity authoring workflow and project measurement evidence without changing verification authority.
