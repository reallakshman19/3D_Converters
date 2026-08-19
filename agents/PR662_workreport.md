# PR662 — Visual inspection evidence kernel Work Report

## Current recovery state — read first

- PR: #662
- TITLE: `feat(vibration): add visual inspection evidence kernel`
- BRANCH: `agent/vibration-visual-inspection-20260819`
- BASE / MERGE BASE: `main@12f9601b7fe9441f7cf7750da5892c09e5ebab7a`
- ENGINEERING_BASIS_HEAD: `3e49cc78cdc468075dd85b18b60fb6e36be6feb3`
- CRITICALITY: ENGINEERING_CRITICAL
- PR_STATE: OPEN_DRAFT
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

## Handover in 60 seconds

Phase 7B delivers a governed visual field-observation evidence kernel:

```text
VibrationVisualInspectionRecord.v1
  -> VibrationVisualInspectionEvidencePackage.v1
  -> VibrationVisualInspectionStatus.v1
  -> VibrationProjectVisualInspectionProjection.v1
```

It is independent of PR661 measurement verification and intentionally does not add persistence/UI.

This is **not** an EI AVIFF T5/T6 checklist transcription. All visual evidence/status authorities explicitly carry:

```text
eiChecklistCoverage = NOT_CLAIMED_NON_EXHAUSTIVE_CAPTURE
```

Controlled-source EI checklist semantics remain a later qualification task.

## Evidence model

Exact scope requires line ID, case ID, operating-case snapshot ID and canonical `sha256:` snapshot hash. Both stored records and requested evaluation scopes use that same hash contract.

Subjects: `PIPE_OR_COMPONENT`, `SUPPORT_OR_RESTRAINT`, `SMALL_BORE_CONNECTION`, `TUBING`, `INTRUSIVE_ELEMENT`, `OTHER`.

Generic observation codes cover support/restraint condition, fastener looseness, fretting/wear, weld/attachment surface condition, SBC/tubing relative motion, rubbing/contact, insulation/cladding damage, leakage/staining, and OTHER.

Observation states are `OBSERVED`, `NOT_OBSERVED`, `NOT_INSPECTED`, `UNRESOLVED`. Observed/unresolved conditions require a note. Optional photo/report refs are immutable and hash-pinned. Inspector and source provenance are retained.

## Workflow projection

```text
NO_VISUAL_EVIDENCE
UNRESOLVED_VISUAL_OBSERVATIONS
VISUAL_EVIDENCE_INCOMPLETE
OBSERVED_CONDITIONS_REQUIRE_REVIEW
VISUAL_EVIDENCE_RECORDED
```

Fail-closed precedence is `UNRESOLVED > NOT_INSPECTED > OBSERVED > RECORDED_ONLY`.

`OBSERVED` is a review trigger only, not mechanism-cause or screening failure. `NOT_OBSERVED` is inspection-specific evidence only, not safety acceptance or future-absence proof. Malformed requested snapshot hashes fail explicitly instead of appearing as a valid scope with no evidence.

## Project projection

`evaluateProjectVibrationVisualInspection(project, evidence)` validates existing `VibrationIntegrityProject.v1`, rejects unknown project lines, groups records by exact scope and returns per-scope review states/counts. It does not mutate the project, persist visual lifecycle state, or alter project schema.

## Authority boundary

```text
eiChecklistCoverage                NOT_CLAIMED_NON_EXHAUSTIVE_CAPTURE
determinesApplicability            false
determinesAssessmentCompleteness   false
screeningAuthority                 NOT_AUTHORIZED
designAuthority                    false
rootCauseAuthority                 false
codeCompliance                     false
safetyAuthority                    false
```

No EI numerical method, threshold, mechanism reducer, governing LOF, main-line aggregation, T1 applicability logic, signal processing, project schema, workflow file, runtime/writer/canvas path, or existing production file changes.

## Re-grounding

Initial base was `93a682a3...`. Main advanced by unrelated HP-only PR660 qualification to `12f9601b7fe9441f7cf7750da5892c09e5ebab7a`. The visual product/test tree was replayed byte-for-byte onto that base before PR allocation.

## Product/test paths

Production:
- `converters/vibration/visual-inspection/contracts.js`
- `converters/vibration/visual-inspection/evaluate.js`
- `converters/vibration/project/visual-inspection.js`

Tests:
- `tests/vibration-visual-inspection.test.mjs`
- `tests/vibration-project-visual-inspection.test.mjs`

All are new files; existing-file backup is `NOT_APPLICABLE`.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| live repository/source grounding | PASS | SOURCE_INSPECTION |
| coordination | PASS | PR661 independent measurement verification |
| #660 main drift / re-ground | PASS | HP-only / byte-preserving replay |
| project fixture compatibility | PASS | SOURCE_INSPECTION against current project schema |
| source syntax | PASS | LOCAL_EXECUTION exact bytes |
| physical-line policy | PASS | 223 / 85 / 64 / 110 / 59 |
| focused visual behavior | PASS 13/13 | LOCAL_EXECUTION controlled reconstruction |
| exact product/test blob identity | PASS | hashes below |
| malformed requested scope hash | PASS | fail-closed regression |
| wrong-scope evidence exclusion | PASS | focused regression |
| immutable/hash-pinned artifact custody | PASS | focused regression |
| authority-promotion negative assurance | PASS | tests + source inspection |
| project non-mutation/non-persistence | PASS | focused regression |
| repository-native focused tests | NOT_RUN | ENVIRONMENT_BLOCKED; no checkout |
| browser acceptance | NOT_APPLICABLE | no UI/runtime surface |
| independent numerical verification | NOT_APPLICABLE | no numerical method/threshold |

Exact validated blobs:

```text
contracts.js                     70bd8fb744a2575ea7430729a3ea1ab802d61558
evaluate.js                      606c6401b934da9b0964db4ac3ce1dac1b0da5d3
project/visual-inspection.js     66daefad206cda389f33f593bde55b34f0a7e600
visual inspection test           79b167869954520c75b659dc0905b57402961236
project visual inspection test   fa4cde518cadfb4041d13223ae5d2440f38899b6
```

The 13/13 execution used those exact product/test bytes with a narrow local reconstruction for the existing project validator. The actual current project validator was separately inspected and the committed fixture satisfies its contract. This is supporting evidence, not repository-native suite PASS.

## Decisions

- DEC-VV-006 visual evidence remains separate from waveform/signal evidence.
- DEC-VV-007 generic observation codes do not claim complete EI T5/T6 checklist authority.
- DEC-VV-008 observed condition is evidence/review trigger, not root cause or screening failure.
- DEC-VV-009 not-observed is inspection-specific evidence only, not safety acceptance.
- DEC-VV-010 persistence/UI/integration with PR661 belongs Phase 7C after both evidence models exist.
- DEC-VV-011 requested evaluation scope must meet the same canonical snapshot hash contract as stored evidence.

## Logical continuation

Phase 7C requires both PR661 and PR662 evidence models. Do not duplicate or stack them into a third unmerged branch. Once their integration basis is stable, Phase 7C can add persistent lifecycle state and a line/case Verify workspace; Phase 7D then adds diagnosis, corrective action and post-modification confirmation.

## EXACT_NEXT_ACTION

Refresh exact PR662 head/main relation, changed-file ledger, mergeability, reviews, review threads, combined commit statuses and PR-triggered workflow runs. Synchronize report/status/PR body to that exact truth and stop at Owner gate. Do not merge.
