# WIP-VIB-PROJECT-V2-20260819 — Project v2 persistence/currentness Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/vibration-project-v2-20260819`
- BASE: `main@5119947e0395cba04f717be793d0979d2a39b6ee`
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

## Handover in 60 seconds

Mission: implement `VibrationIntegrityProject.v2` as the durable evidence container that consumes the now-merged measurement verification (#661), visual evidence (#662), and assessment-evidence currentness (#664) foundations.

V2 must preserve the existing fail-closed rule that persisted data cannot become a current engineering result merely because a project file was loaded.

Target persistence:

```text
VibrationIntegrityProject.v2
  measurementEvidence
  assessmentEvidence (VibrationAssessmentEvidenceLedger.v1)
  verificationRequirements[]
  verificationDispositions[]
  visualInspectionEvidence (VibrationVisualInspectionEvidencePackage.v1)
  currentResults = [] only
```

Derived load state:

```text
persisted assessmentEvidence
  + caller-supplied current method/input/source basis
  -> assessment evidence currentness projection
  -> EVIDENCE_CURRENT | STALE_EVIDENCE | BASIS_UNAVAILABLE
```

`EVIDENCE_CURRENT` remains evidence freshness only. It must never create `CURRENT_RESULT`, screening/design/root-cause/code/safety authority, or alter `AssessmentCompleteness.v1`.

## Acceptance

1. `assertVibrationIntegrityProject` accepts governed V1 and V2, with stricter V2 evidence validation.
2. New projects/EIT imports use V2.
3. V1 project files migrate deterministically to V2 on parse/save without promoting imported/current results.
4. V2 persists validated assessment-evidence ledgers, verification requirements/dispositions, and visual evidence.
5. Dangling project-line references fail closed across all persisted evidence domains.
6. Verification dispositions must reference a persisted requirement and match its exact scope/mechanism.
7. `currentResults` remains required empty.
8. Project authority metadata explicitly denies persisted-evidence engineering promotion.
9. A load-currentness API re-evaluates receipt freshness against caller-supplied current basis and remains non-authorizing.
10. Existing measurement persistence remains compatible.

## Planned production paths

- `converters/vibration/project/schema.js` (existing; backup required)
- `converters/vibration/project/serialize.js` (existing; backup required)
- `converters/vibration/project/from-eit.js` (existing; backup required)
- `converters/vibration/project/load-currentness.js` (new)

Focused tests will be added/updated after the contract is implemented.

## Coordination

- PR661 MERGED: field measurement verification foundation.
- PR662 MERGED: visual inspection evidence foundation.
- PR664 MERGED: assessment evidence/currentness foundation.
- No open PR found owning `VibrationIntegrityProject.v2` or vibration project-currentness persistence.
- AIV/FIT production-freeze PRs remain separate protected numerical/adapter domains.

## Authority decisions

- DEC-VP2-001: persisted `currentResults` remains forbidden in V2.
- DEC-VP2-002: a fresh evidence receipt is not a current engineering result.
- DEC-VP2-003: verification disposition persistence grants only its existing requirement-level evidence-review authority.
- DEC-VP2-004: visual evidence persistence remains field-observation evidence only and does not claim exhaustive EI T5/T6 checklist coverage.
- DEC-VP2-005: V1 migration is additive and fail-closed; it never imports historical EIT results as current.

## Validation state

- live main grounding: PASS / SOURCE_INSPECTION
- repo/local instruction grounding: PASS / SOURCE_INSPECTION
- coordination: PASS / no open Project-v2 owner
- predecessor contracts: PASS / SOURCE_INSPECTION
- production implementation: NOT_WRITTEN
- repository-native tests: NOT_RUN / ENVIRONMENT_BLOCKED (no checkout)
- native backup CLI: NOT_RUN / ENVIRONMENT_BLOCKED; exact Git-blob backups will be retained before each existing-file edit

## EXACT_NEXT_ACTION

Create exact pre-edit Git-blob backups for schema/serialize/from-eit, implement V2 validation/migration/load-currentness with focused tests, validate exact bytes, reconcile live main, allocate a draft PR, migrate recovery custody, and stop at Owner gate. Do not merge.
