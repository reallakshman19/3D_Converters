# PR665 — Project v2 evidence persistence Work Report

## Current recovery state — read first

- PR: #665
- TITLE: `feat(vibration): add Project v2 evidence persistence`
- BRANCH: `agent/vibration-project-v2-20260819`
- BASE / MERGE BASE: `main@e67b5790a8c6f63ff1fc33edd848facfdc90537a`
- ENGINEERING_BASIS_HEAD: `7a3644b9f27302362b6cbb382d7ce65fc6c88746`
- LAST_FULL_PR_STATE_OBSERVED_HEAD: `24c92b6ec03e087f654bc712c74979b733649d5e`
- CRITICALITY: ENGINEERING_CRITICAL
- PR_STATE: OPEN_DRAFT_HANDOVER_READY
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

Commits after `ENGINEERING_BASIS_HEAD` are recovery/custody metadata only. Product/test blobs are frozen below. `LAST_FULL_PR_STATE_OBSERVED_HEAD` is the exact head at which the full hosted-state reconciliation below was performed; this report update necessarily moves the branch afterward.

## Handover in 60 seconds

PR665 introduces `VibrationIntegrityProject.v2` as the durable evidence container for the now-merged measurement verification, visual evidence, and assessment-evidence/currentness foundations.

```text
V1 project
  -> governed migration
V2 project
  measurementEvidence
  assessmentEvidence
  verificationRequirements[]
  verificationDispositions[]
  visualInspectionEvidence
  currentResults = [] only
```

`currentResults` remains forbidden in persisted files. A project load can retain/revalidate evidence but cannot create a current engineering result.

Load currentness is separate:

```text
VibrationIntegrityProjectLoadCurrentness.v1
  assessment receipt + current basis
  -> EVIDENCE_CURRENT | STALE_EVIDENCE | BASIS_UNAVAILABLE
```

`EVIDENCE_CURRENT` means freshness only and never SCREENING/current-result/design/RCA/code/safety/completeness authority.

## Persisted evidence validation

### Assessment evidence

`assessmentEvidence` must validate as `VibrationAssessmentEvidenceLedger.v1`; every receipt line must exist in the project.

### Verification evidence/dispositions

Requirements/dispositions validate through #661 contracts. A persisted disposition must reference a persisted requirement, match exact mechanism and line/case/snapshot ID/hash, cite measurement session/product IDs that actually exist, and cite evidence whose owning session matches that same exact operating-case scope.

Disposition persistence is requirement-level evidence review only, never screening PASS.

### Visual evidence

`visualInspectionEvidence` validates through #662 and each record line must exist. `eiChecklistCoverage` remains `NOT_CLAIMED_NON_EXHAUSTIVE_CAPTURE`.

## V1 migration / runtime seam

`assertVibrationIntegrityProject()` accepts V1 and V2.

`upgradeVibrationIntegrityProjectToV2()` validates V1, adds governed empty lifecycle containers and V2 non-promotion authority, then validates V2.

`serializeVibrationIntegrityProject()` writes V2; `parseVibrationIntegrityProject()` accepts V1/V2 and returns frozen V2.

Historical EIT results remain `HISTORICAL_REVIEW_REQUIRED`.

No runtime/writer/canvas/workflow switch changed. Existing roadmap controller uses parser/serializer abstractions and roadmap builder uses `assertVibrationIntegrityProject()`, so no UI ownership change is required for the schema transition.

## Re-grounding

Implementation started from `5119947e...` after PR664. Main advanced by unrelated HP-only PR663 to:

```text
e67b5790a8c6f63ff1fc33edd848facfdc90537a
qual(hp): harden KD320 Q2 oracle semantic custody (#663)
```

The complete Project-v2 tree was replayed byte-for-byte onto that main before PR allocation.

## Product/test paths

Production:
- `converters/vibration/project/schema.js`
- `converters/vibration/project/serialize.js`
- `converters/vibration/project/from-eit.js`
- `converters/vibration/project/load-currentness.js`

Tests:
- `tests/vibration-project-v2.test.mjs`
- `tests/vibration-project-eit.test.mjs`

Existing-file rollback copies are retained under `.backups/connector-20260819-vib-project-v2/`.

Native backup CLI is `NOT_RUN / ENVIRONMENT_BLOCKED`; exact Git-blob copies are rollback evidence only.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| live repository/source grounding | PASS | SOURCE_INSPECTION |
| coordination | PASS | no open Project-v2 owner |
| #661/#662/#664 dependency compatibility | PASS | SOURCE_INSPECTION |
| #663 drift + re-ground | PASS | HP-only / byte-preserving |
| source syntax | PASS | LOCAL_EXECUTION exact bytes |
| focused Project-v2 behavior | PASS 8/8 | LOCAL_EXECUTION controlled reconstruction |
| exact product/test blob identity | PASS | hashes below |
| physical-line policy | PASS | 245 / 75 / 103 / 36 / 181 / 82 |
| V1 -> V2 migration | PASS | regression |
| current-result persistence forbidden | PASS | regression |
| matching receipt remains freshness-only | PASS | regression |
| stale/unavailable current basis | PASS | regression |
| exact-scope disposition binding | PASS | regression |
| unknown persisted evidence reference rejection | PASS | regression |
| visual evidence non-promotion | PASS | regression |
| dangling evidence line rejection | PASS | regression |
| measurement persistence compatibility | PASS | SOURCE_INSPECTION |
| roadmap/controller compatibility | PASS | SOURCE_INSPECTION |
| repository-native focused/regression tests | NOT_RUN | ENVIRONMENT_BLOCKED; no checkout |
| browser acceptance | NOT_RUN | ENVIRONMENT_BLOCKED |
| independent numerical verification | NOT_APPLICABLE | no numerical change |

Exact validated blobs:

```text
schema.js                         de858b025cbdee97a288d0010dba24fe18668a12
serialize.js                      13c8f12a9b45de7a28aa6f2466dd3b2b41cb10d8
from-eit.js                       0bb7b096292b39442659d1787bc2cd67bb98b097
load-currentness.js               2fbd883f603e8ae1520253d121d2540807a305e2
vibration-project-v2.test.mjs     ba5073f2ca9c59ec14ab9e273435819398d6e522
vibration-project-eit.test.mjs    89bd513ae47e2db3820a51dc142d4cb5ad8d376e
```

The 8/8 execution used exact Project-v2 changed/new bytes with narrow local reconstructions for pre-existing dependencies. Actual merged dependencies/runtime seams were separately inspected. This is supporting evidence, not repository-native suite PASS.

## Last full PR-state reconciliation

Observed at head `24c92b6ec03e087f654bc712c74979b733649d5e`:

```text
base / merge base           e67b5790a8c6f63ff1fc33edd848facfdc90537a
ahead / behind              9 / 0
changed files               16 intended / 0 unexplained
mergeable                   true
state / draft               open / true
reviews                     0
review threads              0
commit status entries       0 -> NOT_RUN
PR-triggered workflow runs  0 -> NOT_RUN
```

Changed-file classes at the observed head:

```text
4 exact rollback backups
6 PR/WIP recovery artifacts
4 production files
2 test files
```

No empty or unexecuted hosted check is represented as PASS.

## Authority invariants

```text
persisted currentResults                              forbidden
assessmentEvidenceIsCurrentEngineeringAuthority       false
verificationDispositionIsScreeningAuthority           false
visualInspectionEvidenceIsCurrentEngineeringAuthority false
screeningAuthorized                                   false
designAuthority                                       false
rootCauseAuthority                                    false
```

No AIV/FIT numerical/adapter authority, `AssessmentCompleteness.v1`, runtime/writer/canvas, or workflow file is changed.

## Logical continuation

Phase 7C persistent line/case Verify workspace should begin only from a stable Project-v2 main. It should consume V2 verification/visual/currentness state rather than duplicate storage or infer engineering authority.

## EXACT_NEXT_ACTION

Stop at Owner gate. Do not merge. If Owner later authorizes PR665 merge/review progression, first re-ground live main and exact PR head, rerun repository-native project/EIT/measurement/verification/visual regressions in an available checkout, refresh hosted status/workflow/review truth, and preserve all authority boundaries above.
