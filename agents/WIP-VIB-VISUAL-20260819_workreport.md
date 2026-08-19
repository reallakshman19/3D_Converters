# WIP-VIB-VISUAL-20260819 — Visual inspection evidence Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/vibration-visual-inspection-20260819`
- BASE: `main@93a682a378f0326365daa69712c22d8259b95196`
- EXECUTION_MODE: MANUAL
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- COORDINATION: SAFE

## Mission

Phase 7B: create a governed visual-inspection evidence model and project-level projection for piping/tubing vibration field observations, independent of PR661's signal measurement verification kernel.

This is **not** a transcription of EI T5/T6 and must not claim exhaustive EI visual-assessment coverage because controlled-source checklist semantics are not qualified in the repo. It is a general field-observation evidence contract that can later be mapped into an EI-qualified visual workflow.

Target production path:

```text
VibrationVisualInspectionRecord.v1
  -> VibrationVisualInspectionEvidencePackage.v1
  -> VibrationVisualInspectionStatus.v1
  -> VibrationProjectVisualInspectionProjection.v1
```

## Acceptance

1. Exact line/case/operating-case snapshot scope is mandatory.
2. Observation subject is explicit (support/restraint, pipe/component, SBC, tubing, intrusive element, other).
3. Observation codes are bounded generic field conditions, not EI acceptance rules.
4. Observation state remains direct evidence: OBSERVED / NOT_OBSERVED / NOT_INSPECTED / UNRESOLVED.
5. Photo/report artifact references are optional but, when supplied, hash-pinned and immutable-reference shaped.
6. OBSERVED or UNRESOLVED conditions create engineer-review workflow state only; they do not establish failure/root cause/screening/design/code/safety conclusions.
7. Project projection rejects unknown project lines and reports evidence/review counts without persisting state.
8. Existing project schema and all numerical mechanisms remain unchanged.

## Authority decisions

- DEC-VV-006: visual evidence is separate from waveform/signal measurement evidence.
- DEC-VV-007: observation categories are generic capture vocabulary and do not claim complete EI T5/T6 checklist authority.
- DEC-VV-008: `OBSERVED` means a condition was seen, not that a mechanism caused it or that a line fails screening.
- DEC-VV-009: `NOT_OBSERVED` is evidence for the recorded inspection only, not proof of future absence or line safety.
- DEC-VV-010: persistence/UI/integration with PR661 verification requirements is deferred to Phase 7C after both evidence models exist.

## Planned new files

- `converters/vibration/visual-inspection/contracts.js`
- `converters/vibration/visual-inspection/evaluate.js`
- `converters/vibration/project/visual-inspection.js`
- `tests/vibration-visual-inspection.test.mjs`
- `tests/vibration-project-visual-inspection.test.mjs`

No existing production file is planned to change; backup is NOT_APPLICABLE unless scope changes.

## Validation state

- live main/source grounding: PASS / SOURCE_INSPECTION
- open overlap: SAFE; PR661 is independent measurement verification work
- production: NOT_WRITTEN
- focused tests: NOT_RUN
- repository-native suite: NOT_RUN / environment lacks checkout
- browser: NOT_APPLICABLE for this no-UI slice

## EXACT_NEXT_ACTION

Implement generic visual evidence contracts + project projection + focused fail-closed tests, validate exact bytes, reconcile main, allocate separate draft PR, migrate custody, stop owner gate.
