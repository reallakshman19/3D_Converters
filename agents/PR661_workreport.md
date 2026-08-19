# PR661 — Field measurement verification kernel Work Report

## Current recovery state — read first

- PR: #661
- TITLE: `feat(vibration): add field measurement verification kernel`
- BRANCH: `agent/vibration-verification-kernel-20260819`
- BASE / MERGE BASE: `main@93a682a378f0326365daa69712c22d8259b95196`
- ENGINEERING_BASIS_HEAD: `32fbcf4efbad98a8b029fd480ccd4c38c9fbe24c`
- LAST_FULL_PR_STATE_OBSERVED_HEAD: `4ae939c0a4bee913005f76227095468ee9bf8b82`
- CRITICALITY: ENGINEERING_CRITICAL
- PR_STATE: OPEN_DRAFT_HANDOVER_READY
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

Later commits after `ENGINEERING_BASIS_HEAD` are recovery/custody metadata only. Product/test blobs are frozen below.

## Handover in 60 seconds

Phase 7A now has a usable exact-scope field-measurement verification kernel over the already-governed measurement evidence package:

```text
VibrationVerificationRequirement.v1
  + VibrationMeasurementEvidencePackage.v1
  + optional VibrationMeasurementDisposition.v1
  -> VibrationVerificationStatus.v1
  -> VibrationProjectVerificationProjection.v1
```

It does **not** persist verification state or add UI. It does not alter existing measurement custody, EI numerical methods, mechanism applicability, `AssessmentCompleteness.v1`, screening authority, root-cause authority, design/code/safety authority, signal-processing math, runtime/writer/canvas paths, or workflow files.

## Live grounding / drift

Initial WIP base was #656 main `767ccd16...`. During validation main advanced to:

```text
93a682a378f0326365daa69712c22d8259b95196
feat(hp): add bulk USER_CALCULATED_KD3 cycle input (#659)
```

#659 is HP-only. Work stopped at the re-ground gate and the current verification tree was replayed byte-for-byte onto #659 main before PR allocation.

PR615 is the merged measurement/project-custody predecessor; its stale ACTIVE claim on main is historical. PR657/PR658 are independent T1/status presentation work and are not dependencies.

## Production behavior

### VibrationVerificationRequirement.v1

Binds exact `lineId + caseId + operatingCaseSnapshotId + operatingCaseSnapshotHash + mechanismId` and explicit required governed signal-product types.

Current types are deliberately bounded to:

```text
BASIC_MEASUREMENT
SPECIALIST_MEASUREMENT
```

No numerical threshold or speculative BASIC/SPECIALIST signal-product taxonomy is invented.

### VibrationMeasurementDisposition.v1

Engineer outcomes:

```text
EVIDENCE_ACCEPTED_FOR_REQUIREMENT
EVIDENCE_INSUFFICIENT
SPECIALIST_REVIEW_REQUIRED
CORRECTIVE_ACTION_REQUIRED
```

Requires exact requirement/mechanism/scope identity, explicit session/product evidence refs, reviewer ID, review timestamp and reason.

`EVIDENCE_ACCEPTED_FOR_REQUIREMENT` means evidence acceptance for the verification requirement only. It is not screening PASS, safe/pass, design/code/safety acceptance, root-cause conclusion, or assessment completeness.

### VibrationVerificationStatus.v1

Fail-closed states:

```text
EVIDENCE_REQUIRED
EVIDENCE_INCOMPLETE
AWAITING_ENGINEER_DISPOSITION
VERIFICATION_EVIDENCE_ACCEPTED
EVIDENCE_INSUFFICIENT
SPECIALIST_REVIEW_REQUIRED
CORRECTIVE_ACTION_REQUIRED
```

Only exact line/case/snapshot evidence is eligible. Complete evidence still waits for engineer review. Accepted disposition is forbidden unless both the exact-scope package and the disposition's own cited product IDs cover every required product type. Unknown or wrong-scope cited evidence fails closed.

### VibrationProjectVerificationProjection.v1

`evaluateProjectVibrationVerification(project, input)`:

- consumes existing validated `project.measurementEvidence`;
- verifies requirement line IDs exist;
- rejects duplicate requirement/disposition IDs;
- rejects orphan dispositions;
- accepts at most one current disposition per requirement;
- uses the existing governed empty measurement package when evidence is absent;
- returns per-requirement results + `countsByState`;
- does not mutate the project;
- does not persist lifecycle state or change `VibrationIntegrityProject.v1`.

## Authority boundary

All new requirement/disposition/status/project-projection authorities retain:

```text
determinesApplicability          false
determinesAssessmentCompleteness false
screeningAuthority               NOT_AUTHORIZED
designAuthority                  false
rootCauseAuthority               false
codeCompliance                   false
safetyAuthority                  false
```

Existing measurement evidence remains `FIELD_MEASUREMENT_EVIDENCE_ONLY` / `DERIVED_SIGNAL_EVIDENCE_ONLY`.

## Engineering/product paths

Production:

- `converters/vibration/verification/contracts.js`
- `converters/vibration/verification/evaluate.js`
- `converters/vibration/project/verification.js`

Tests:

- `tests/vibration-verification-fixtures.mjs`
- `tests/vibration-verification-contract.test.mjs`
- `tests/vibration-project-verification.test.mjs`

All are new files, so existing-file backup is `NOT_APPLICABLE` for Phase 7A.

Recovery paths are the PR661 and released WIP report/status/claim records only.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| live repository/source grounding | PASS | SOURCE_INSPECTION |
| PR615 live reconciliation | PASS | merged predecessor |
| coordination | PASS | no open verification/disposition owner |
| #659 drift + re-ground | PASS | HP-only / byte-preserving replay |
| source syntax | PASS | LOCAL_EXECUTION exact new bytes |
| physical-line policy | PASS | 187 / 160 / 108 / 138 / 117 / 84 |
| focused behavior | PASS 16/16 | LOCAL_EXECUTION controlled reconstruction |
| exact implementation/test blob identity | PASS | all six executed blobs match branch |
| wrong-scope evidence exclusion | PASS | focused regression |
| accepted-disposition cited-product coverage | PASS | focused regression |
| authority-promotion negative assurance | PASS | tests + source inspection |
| project non-mutation/non-persistence | PASS | focused regression |
| repository-native focused tests | NOT_RUN | ENVIRONMENT_BLOCKED; no checkout |
| existing measurement/project regressions | NOT_RUN | ENVIRONMENT_BLOCKED |
| browser acceptance | NOT_APPLICABLE | no UI/runtime surface |
| independent numerical verification | NOT_APPLICABLE | no numerical method/threshold |

Exact validated product/test blobs:

```text
contracts.js                         e4fcf3433dc323a867e6d0ea441575ebe5668035
evaluate.js                          9c56e8464887fd5ebb69377483287c6dbee7cbb7
project/verification.js              9bface41f9b66f948c2e15fec0aca30c515adebf
vibration-verification-fixtures.mjs  d54a118c7cb37ac3583388aabe34eed883eed957
verification contract test           03b650ffd22557a736d1070584e52b8cd0440c24
project verification test            016b5867f4a62c07d547fadc93779d8889711505
```

The 16/16 run used those exact new bytes with narrow local reconstructions for pre-existing dependency modules. The committed fixtures were corrected before PR allocation to satisfy the actual merged measurement/project contract shape. This is supporting evidence, not repository-native suite PASS.

## Corrected validation history

1. Initial test fixtures were too minimal for the real merged measurement validator. They were replaced with full calibrated/raw-hash/processing/project-authority fixtures before PR allocation, then 16/16 was rerun.
2. Exact-byte audit found a whitespace-only evaluator mismatch. Branch validation was withheld until the branch evaluator was normalized to blob `9c56e846...` and 16/16 was rerun.

## Last full PR-state reconciliation

Observed at head `4ae939c0a4bee913005f76227095468ee9bf8b82`:

```text
base / merge base           93a682a378f0326365daa69712c22d8259b95196
ahead / behind              5 / 0
changed files               12 intended / 0 unexplained
mergeable                   true
state / draft               open / true
reviews                     0
review threads              0
commit status entries       0 -> NOT_RUN
PR-triggered workflow runs  0 -> NOT_RUN
```

Any later head movement from this report/status synchronization is recovery-only. Before merge, refresh live head/main relation and hosted checks again.

## Decisions / invariants

- DEC-VV-001 measurement evidence remains evidence-only.
- DEC-VV-002 engineer disposition is requirement-level verification only, never screening/RCA/design/code/safety/completeness authority.
- DEC-VV-003 T5/T6 visual evidence is separate Phase 7B, not a signal-product shim.
- DEC-VV-004 verification persistence remains out of V1 and belongs later Phase 7C/project-v2 direction.
- DEC-VV-005 no invented EI measurement threshold or product taxonomy.

## Deliberate exclusions / continuation

```text
7B visual inspection evidence contract
-> 7C verification persistence + line/case Verify workspace
-> 7D diagnosis / corrective action / post-modification confirmation
```

No automatic requirement generation from screening results, RCA conclusion, corrective-action closure, or post-mod confirmation is implemented here.

## Appendix A

`NOT_REQUIRED_NEW_WORK_FROM_LIVE_MAIN`. This is not takeover of an existing engineering-critical implementation PR.

## EXACT_NEXT_ACTION

Stop at Owner gate. Do not merge. If Owner later authorizes merge/review progression, first re-ground current main and PR661 head, rerun repository-native focused + existing measurement/project regressions in an available checkout, refresh hosted status/workflow/review truth, and preserve all authority boundaries above.
