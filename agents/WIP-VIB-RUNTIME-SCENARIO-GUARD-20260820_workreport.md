# WIP-VIB-RUNTIME-SCENARIO-GUARD-20260820 — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
STACKED_BASE_PR: 680
STACKED_BASE_HEAD: 03ff53eebc7b4cafe03d06f1d7044c137aa13beb
MAIN_HEAD_LAST_CHECKED: 68511e14b594eab9e21d06da3ddfc0836e92295b
CURRENT_STAGE: SOURCE_TRACE_COMPLETE_IMPLEMENTATION_STARTING
CURRENT_BLOCKER: AIV standalone workspace has no governed VibrationIntegrityDataset/OperatingScenario handoff; do not fabricate one
HIGHEST_RISK: wiring only downstream result adapters would leave actual kernels unguarded and create false scenario-custody assurance
EXACT_NEXT_ACTION: implement reusable OperatingScenario snapshot execution binding, wire facility FIT/Mechanical/SBC actual call paths, and add explicit AIV facility-handoff seam without inventing dataset identity

## Mission
Continue PR680 by moving scenario custody to actual runtime calculation boundaries.

Target invariant:
```text
prepared scenario binding + current OperatingScenario
-> exact identity/snapshot assertion
-> only then mechanism kernel/callback
```

## Source-trace findings
- `tabs/vibration-integrity-mechanisms.js` is downstream result/coverage projection, not a safe kernel guard point.
- FIT actual execution is `fit-workflow.js -> fit-plan.js -> fit-execute.js -> calculateEngineeringBatch()` and already owns `VibrationIntegrityDataset.v1`.
- Mechanical actual product execution is `vibration-integrity-mechanical-controller.js -> evaluateMechanicalFacilityCandidate() -> evaluateMechanicalT23DirectBaseline()`.
- SBC actual candidate execution exists in `sbc/facility.js` and legacy `vibration-integrity-user-data-shell.js`; `mechanisms/sbc.js` can also evaluate during matrix projection when no precomputed candidate exists.
- AIV actual product execution is `vibration-aiv-execution.js -> calculateEngineering(request)`. Its standalone readiness tables do not prove a facility datasetId/line/case OperatingScenario.

## Architecture decision
DEC-RSG-001: scenario snapshot custody is an execution-integrity precondition independent of T1 requiredness. Do not fabricate `identificationId` for FIT, which currently executes before T1 identification is assembled. Add a lower-level scenario execution binding used by PR680 assessment units and by dataset-owned execution paths.

DEC-RSG-002: AIV must receive an explicit validated OperatingScenario handoff from the facility workflow before facility-scoped scenario guarding. The standalone AIV workspace must not synthesize dataset identity from AIV tables.

## Planned production scope
- NEW `converters/vibration/mechanisms/scenario-execution.js`
- MODIFIED stacked-base `converters/vibration/mechanisms/assessment-unit.js` to delegate scenario matching to the common binding
- FIT planning/execution/workflow files needed to bind READY plan items to exact scenarios and verify all bindings before batch execution
- Mechanical facility/controller files needed to use the current facility OperatingScenario before T2.3 execution
- SBC facility/integration files only where a real facility scenario is available; remove calculation side effects from matrix projection if required for one guarded execution path
- AIV handoff/session/execution only if a real OperatingScenario can be passed without fabricated identity
- focused tests; recovery/backup records

## Authority boundary
No mechanism equation, applicability criterion, LOF result, qualification state, source/master data, screening authority or design authority changes.

Scenario guard authority:
```text
purpose = RUNTIME_SCENARIO_CUSTODY_ONLY
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
numericalAuthority = NONE
executionAuthority = NONE
```

The guard may reject stale/mismatched data before a kernel; it never grants engineering permission to execute a method.

## Validation intent
- stale same-logical-scenario snapshot fails before callback/batch invocation;
- foreign scenario identity fails before callback;
- exact snapshot reaches kernel exactly once;
- FIT READY items carry exact scenario binding and batch is called only after all bindings pass;
- Mechanical/SBC facility runs use scenario from the governed facility dataset, not row labels alone;
- AIV standalone path never receives a fabricated OperatingScenario;
- no right-panel/UI guidance state becomes execution authority.

## Merge authority
OWNER_ONLY / NOT_GRANTED. PR680 is an unmerged stacked dependency.