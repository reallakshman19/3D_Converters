# PR682 — Runtime Scenario Guard Integration — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: DRAFT_READY_FOR_FINAL_RECONCILIATION
MAIN_HEAD_LAST_CHECKED: 5dd7e1d239c64e57c4cc0e07b51a0c63af7fb845
MERGE_BASE: 5dd7e1d239c64e57c4cc0e07b51a0c63af7fb845
IMPLEMENTATION_BASIS_HEAD: 37030eeda506ac441d824d65ea37cc7a29af1bb4
PREDECESSOR_PR: 680 (MERGED)
PREDECESSOR_MERGE: 5dd7e1d239c64e57c4cc0e07b51a0c63af7fb845
MERGE_AUTHORITY: OWNER_GRANTED_2026_08_20

## Mission
Route current facility-owned vibration execution through exact `OperatingScenario.v1` snapshot custody before numerical execution.

This slice covers FIT, Mechanical T2.3 and SBC Type-3 facility paths. AIV remains a separate successor because its standalone workspace does not yet own a governed `VibrationIntegrityDataset` handoff; no dataset/scenario identity is fabricated.

## Implemented runtime chain

```text
OperatingScenario.v1
-> VibrationScenarioExecutionBinding.v1
-> pre-execution identity + snapshot assertion
-> mechanism calculation
-> VibrationScenarioExecutionBasis.v1 retained with result/evidence
```

## Core behavior
- common lower-level scenario guard shared by `VibrationAssessmentUnit.v1` and facility paths;
- FIT plan items carry scenario bindings; all READY FIT items are validated against current scenarios before `calculateEngineeringBatch()`;
- Mechanical T2.3 UI captures the current facility scenario and calls a guarded facility wrapper;
- SBC matrix projection no longer executes Type-3 calculations during rendering/coverage construction;
- SBC master-assisted and legacy explicit-intermediate evaluation buttons both execute through the same facility scenario guard;
- changed scenario snapshot with unchanged logical line/case identity fails before the mechanism callback;
- design authority, screening authority and numerical method authority are unchanged.

## Exact implementation diff
Normalized implementation commit `37030eeda506ac441d824d65ea37cc7a29af1bb4` contains 14 production/test paths:

- `converters/vibration/facility/fit-execute.js`
- `converters/vibration/facility/fit-plan.js`
- `converters/vibration/facility/fit-workflow.js`
- `converters/vibration/mechanical/facility.js`
- `converters/vibration/mechanisms/assessment-unit.js`
- `converters/vibration/mechanisms/index.js`
- `converters/vibration/mechanisms/sbc.js`
- `converters/vibration/mechanisms/scenario-execution.js`
- `converters/vibration/sbc/facility.js`
- `tabs/vibration-integrity-mechanical-controller.js`
- `tabs/vibration-integrity-sbc-scenario-execution.js`
- `tabs/vibration-integrity-sbc-type3-controller.js`
- `tabs/vibration-integrity-sbc-type3-state.js`
- `tests/vibration-runtime-scenario-guard.test.mjs`

No backup files were carried into the normalized successor.

## Validation ledger
- PR680 merged/current-main grounding: PASS / HOSTED SOURCE
- normalized branch ancestry at implementation basis: PASS / 1 ahead, 0 behind
- exact implementation changed-path reconciliation: PASS / 14 intended paths
- stale snapshot common callback falsifier: ENCODED / NOT_RUN
- exact snapshot callback count=1 falsifier: ENCODED / NOT_RUN
- FIT stale scenario pre-batch rejection: ENCODED / NOT_RUN
- Mechanical stale scenario rejection: ENCODED / NOT_RUN
- SBC stale scenario callback rejection: ENCODED / NOT_RUN
- legacy SBC explicit route stale rejection: ENCODED / NOT_RUN
- SBC matrix calculation-import negative assurance: ENCODED / NOT_RUN
- repository-native Node execution: NOT_RUN / connector-only runtime
- browser/Product Freeze: NOT_RUN / not required for this orchestration-only slice
- independent numerical verification: N/A / no equation, coefficient, LOF threshold or engineering master change

No source/static evidence is promoted to repository-native execution PASS.

## Authority boundary
This PR changes scenario custody/orchestration only. It does not grant execution authority, determine applicability/completeness, change mechanism equations, change source/master qualification, actualize process data, or grant design authority.

## Known successor
AIV facility handoff: bind the standalone AIV screening request to the governed facility scenario set before `calculateEngineering()` without synthesizing a dataset identity from AIV tables.

## Appendix A — takeover qualification
1. Why must a same `scenarioId` with a changed `scenarioSnapshotHash` fail before a kernel callback?
2. Why is `line + caseId` equality insufficient without `datasetId`, identity hash and snapshot hash custody?
3. Why must the SBC matrix use inspection of precomputed evidence rather than executing Type-3 calculation during projection?

Expected expert answer: scenario logical identity is stable across revision while snapshot custody captures the exact engineering state; line/case labels alone cannot prove dataset/revision identity; and UI/coverage projection must never become numerical authority or cause solver side effects.
