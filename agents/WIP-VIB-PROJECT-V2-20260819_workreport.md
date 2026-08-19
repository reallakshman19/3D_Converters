# WIP-VIB-PROJECT-V2-20260819 — Project v2 persistence/currentness Work Report

## Current recovery state — read first

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/vibration-project-v2-20260819`
- BASE / MERGE BASE: `main@e67b5790a8c6f63ff1fc33edd848facfdc90537a`
- ENGINEERING_BASIS_HEAD: `7a3644b9f27302362b6cbb382d7ce65fc6c88746`
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

## Handover in 60 seconds

Project v2 now provides the durable persistence/currentness foundation needed before Phase 7C Verify UI:

```text
VibrationIntegrityProject.v1
  -> deterministic migration
VibrationIntegrityProject.v2
  measurementEvidence
  assessmentEvidence: VibrationAssessmentEvidenceLedger.v1
  verificationRequirements[]
  verificationDispositions[]
  visualInspectionEvidence: VibrationVisualInspectionEvidencePackage.v1
  currentResults: [] only
```

Load-time currentness is derived separately:

```text
persisted assessmentEvidence
  + caller-supplied current method/input/source basis
  -> VibrationIntegrityProjectLoadCurrentness.v1
  -> EVIDENCE_CURRENT | STALE_EVIDENCE | BASIS_UNAVAILABLE
```

`EVIDENCE_CURRENT` is evidence freshness only. This branch never creates `CURRENT_RESULT`, screening/design/root-cause/code/safety authority, mechanism applicability, or `AssessmentCompleteness.v1` completion.

## Production behavior

### Project schema

`assertVibrationIntegrityProject()` accepts governed V1 and V2 files. V1 retains its historical contract; V2 adds validated evidence domains.

V2 authority requires all persisted evidence to remain non-authorizing:

```text
assessmentEvidenceIsCurrentEngineeringAuthority        false
verificationDispositionIsScreeningAuthority            false
visualInspectionEvidenceIsCurrentEngineeringAuthority  false
screeningAuthorized                                    false
designAuthority                                        false
rootCauseAuthority                                     false
```

`currentResults` remains required empty. Loading a project still requires registered calculations to be rerun for current engineering results.

### Assessment evidence persistence

`project.assessmentEvidence` must be `VibrationAssessmentEvidenceLedger.v1`. Every receipt is revalidated by the merged receipt contract and must reference a known project line through exact `receipt.scope.line`.

### Verification persistence

Persisted requirements/dispositions are revalidated by the merged verification contracts.

A disposition must:

- reference a persisted requirement;
- match that requirement's mechanism exactly;
- match exact line/case/operating-case snapshot ID/hash;
- cite measurement session/product IDs that actually exist in persisted `measurementEvidence`;
- cite evidence whose owning measurement session matches that same exact operating-case scope.

Persistence validation does not convert a disposition into screening PASS or assessment completeness.

### Visual evidence persistence

`project.visualInspectionEvidence` must be a governed `VibrationVisualInspectionEvidencePackage.v1`; each record must reference a known project line. Its existing `NOT_CLAIMED_NON_EXHAUSTIVE_CAPTURE` EI T5/T6 boundary is unchanged.

### V1 -> V2 migration

`upgradeVibrationIntegrityProjectToV2()` validates V1 first, then adds empty governed lifecycle containers where missing and the V2 non-promotion authority fields.

`serializeVibrationIntegrityProject()` always writes V2.

`parseVibrationIntegrityProject()` accepts governed V1/V2 input and returns frozen V2.

A V1 file cannot smuggle unqualified lifecycle data through migration: carried fields must satisfy the stricter V2 validation after upgrade.

### Load currentness

`parseVibrationIntegrityProjectWithCurrentness()` returns:

```text
{ project, currentness }
```

The currentness object calls the merged assessment-evidence currentness evaluator using caller-provided current basis and carries permanent projection-only authority.

## Re-grounding

Initial implementation base:

```text
5119947e0395cba04f717be793d0979d2a39b6ee  # PR664
```

During validation, main advanced by unrelated HP-only PR663:

```text
e67b5790a8c6f63ff1fc33edd848facfdc90537a
qual(hp): harden KD320 Q2 oracle semantic custody (#663)
```

PR663 changes only HP qualification/recovery files and does not overlap the vibration project persistence authority domain. The complete Project-v2 tree was replayed byte-for-byte onto `e67b5790...` before PR allocation. Post-replay relation was 1 ahead / 0 behind, 13 intended paths / 0 unexplained.

## Product/test paths

Production:

- `converters/vibration/project/schema.js`
- `converters/vibration/project/serialize.js`
- `converters/vibration/project/from-eit.js`
- `converters/vibration/project/load-currentness.js`

Tests:

- `tests/vibration-project-v2.test.mjs`
- `tests/vibration-project-eit.test.mjs`

Exact pre-edit backups:

- `.backups/connector-20260819-vib-project-v2/converters/vibration/project/schema.js`
- `.backups/connector-20260819-vib-project-v2/converters/vibration/project/serialize.js`
- `.backups/connector-20260819-vib-project-v2/converters/vibration/project/from-eit.js`
- `.backups/connector-20260819-vib-project-v2/tests/vibration-project-eit.test.mjs`

Native `node utils/backup.js save ...` remains `NOT_RUN / ENVIRONMENT_BLOCKED`; the Git-blob backups above are rollback evidence, not a claim the native command ran.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| live repository/source grounding | PASS | SOURCE_INSPECTION |
| repo instruction/protocol grounding | PASS | SOURCE_INSPECTION |
| coordination / Project-v2 ownership | PASS | no open Project-v2 owner |
| merged predecessor contract compatibility | PASS | SOURCE_INSPECTION #661/#662/#664 |
| #663 main drift classification/re-ground | PASS | HP-only / byte-preserving replay |
| exact production/test syntax | PASS | LOCAL_EXECUTION |
| focused Project-v2 behavior | PASS 8/8 | LOCAL_EXECUTION controlled reconstruction |
| exact product/test blob identity | PASS | hashes below |
| physical-line policy | PASS | 245 / 75 / 103 / 36 / 181 / 82 |
| V1 -> V2 deterministic migration | PASS | focused regression |
| persisted current-result rejection | PASS | focused regression |
| matching receipt remains freshness-only | PASS | focused regression |
| stale/unavailable receipt basis | PASS | focused regression |
| verification disposition exact-scope binding | PASS | focused regression |
| unknown persisted measurement evidence ref | PASS | focused regression |
| visual evidence non-promotion | PASS | focused regression |
| dangling persisted evidence line | PASS | focused regression |
| existing measurement-persistence compatibility | PASS | SOURCE_INSPECTION; legacy dangling-line message preserved |
| roadmap/controller structural compatibility | PASS | SOURCE_INSPECTION; both consume parser/assertion seams |
| repository-native focused/regression tests | NOT_RUN | ENVIRONMENT_BLOCKED; no checkout |
| browser acceptance | NOT_RUN | ENVIRONMENT_BLOCKED; persistence change has runtime import/save seam but no UI redesign |
| independent numerical verification | NOT_APPLICABLE | no numerical method/equation change |

Exact validated product/test blobs:

```text
schema.js                         de858b025cbdee97a288d0010dba24fe18668a12
serialize.js                      13c8f12a9b45de7a28aa6f2466dd3b2b41cb10d8
from-eit.js                       0bb7b096292b39442659d1787bc2cd67bb98b097
load-currentness.js               2fbd883f603e8ae1520253d121d2540807a305e2
vibration-project-v2.test.mjs     ba5073f2ca9c59ec14ab9e273435819398d6e522
vibration-project-eit.test.mjs    89bd513ae47e2db3820a51dc142d4cb5ad8d376e
```

The 8/8 execution used these exact Project-v2 production/test bytes with narrow local reconstructions for pre-existing dependencies. Actual merged dependency contracts and runtime seams were separately source-inspected. This is supporting evidence, not repository-native suite PASS.

## Decisions / protected invariants

- DEC-VP2-001 persisted `currentResults` remains forbidden.
- DEC-VP2-002 `EVIDENCE_CURRENT` never means current engineering result.
- DEC-VP2-003 persisted verification disposition remains requirement-level evidence review only.
- DEC-VP2-004 visual persistence remains non-exhaustive field evidence, not a complete EI T5/T6 checklist.
- DEC-VP2-005 V1 migration is additive/fail-closed and never promotes historical EIT results.
- DEC-VP2-006 disposition evidence references must exist in the same project and exact operating-case scope.
- DEC-VP2-007 no runtime/writer/canvas/workflow change is needed for the schema transition; current controller already consumes parser/serializer abstractions.

## Logical continuation

After this PR is stable, Phase 7C can consume V2 directly to provide a persistent line/case Verify workspace. It should render existing verification + visual evidence states and author governed requirements/dispositions through bounded mutation paths; it must not recreate measurement storage or infer screening/RCA/design authority.

## EXACT_NEXT_ACTION

Refresh live main, compare branch changed-file ledger, allocate a separate draft PR if still 0 behind and scope-clean, migrate recovery custody to PR identity, refresh reviews/status/workflows/mergeability, then stop at Owner gate. Do not merge.
