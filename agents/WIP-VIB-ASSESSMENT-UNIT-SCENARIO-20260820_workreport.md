# WIP-VIB-ASSESSMENT-UNIT-SCENARIO-20260820 — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MAIN_HEAD_LAST_CHECKED: 68511e14b594eab9e21d06da3ddfc0836e92295b
MERGE_BASE: 68511e14b594eab9e21d06da3ddfc0836e92295b
CURRENT_STAGE: IMPLEMENTATION
CURRENT_BLOCKER: NONE
HIGHEST_RISK: mechanism execution could consume a different operating-scenario snapshot than the one used to prepare the assessment unit
EXACT_NEXT_ACTION: add VibrationAssessmentUnit.v1 scenario custody and a pre-kernel mismatch guard

## Mission
Bind every executable vibration assessment unit to one validated `OperatingScenario.v1` using exact `scenarioId + snapshotHash`, without changing mechanism equations or engineering authority.

## Scope
New:
- `converters/vibration/mechanisms/assessment-unit.js`
- `tests/vibration-assessment-unit-scenario.test.mjs`

Modified:
- `converters/vibration/mechanisms/index.js` export only

Backup/recovery records only otherwise.

## Required invariants
- assessment unit scope line/case must equal the bound OperatingScenario line/case;
- executable scenario-bound units require an explicit caseId;
- logical unit identity may remain stable across revisions, but unit snapshot identity must move when scenario snapshot moves;
- any scenarioId or scenario snapshot mismatch must fail before a mechanism callback/kernel is invoked;
- no cross-scenario synthesis, process actualization, applicability, completeness, screening, design, or numerical authority is introduced;
- FIT/AIV/SBC/mechanical adapters are read-only in this bounded slice.

## Authority
```text
purpose = ASSESSMENT_UNIT_SCENARIO_CUSTODY_ONLY
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
numericalAuthority = NONE
executionAuthority = NONE
```

## Coordination
- PR678 merged predecessor: OperatingScenario.v1 source of truth.
- PR665 Project v2: no exact overlap.
- mechanism source/qualification PRs: no exact overlap.
- existing mechanism adapters remain read-only.

## Validation plan
1. exact requirement + exact scenario produces one frozen assessment unit;
2. unit identity is stable across a revised snapshot of the same logical scenario;
3. unit snapshot hash changes when scenario snapshot changes;
4. line/case mismatch fails;
5. missing caseId fails for executable unit creation;
6. duplicate/missing scenario bindings in a unit set fail;
7. execution guard rejects stale/mismatched scenario before callback invocation;
8. exact matching scenario allows callback invocation;
9. tampered unit custody/hash fails.

## Merge Authority
OWNER_ONLY / NOT_GRANTED. The authorization used for PR678 does not transfer.