# PR644 — AIV canvas evidence custody and result currency

## Recovery header
- PR: #644
- Branch: `agent/vibration-aiv-canvas-evidence-hardening-20260818`
- Base PR: #643 @ `afe72d5cc4859bf4d76e95c83563e86d4169b902`
- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: AUTO
- AUTO_STATE: PHASE_3_HANDOVER
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_THIS_REPAIR_SET

## Handover in 60 seconds
PR644 closes canvas evidence/currency gaps after PR642/PR643. One shared current-screening helper now feeds both normal and canvas export, so canvas export retains network path evidence, EIT custody, inventory attestations and input revision. Stale lineage disables/blocks canvas export. Canvas export carries the unified projection. Inspector numerical details fail closed when stale. Projection omissions are counted and warned without invented nodes. Welded-discontinuity inventory state is visible inside the canvas while line/case authority remains NOT_AUTHORIZED.

## Changed-file ledger
New:
- `tabs/vibration-aiv-screening-package-state.js`
- `tabs/vibration-aiv-canvas-projection-coverage.js`
- `tabs/vibration-aiv-canvas-evidence-view.js`
Modified:
- `tabs/vibration-aiv-execution.js`
- `tabs/vibration-aiv-canvas-export-controller.js`
- `tabs/vibration-aiv-unified-canvas-projection.js`
- `tabs/vibration-aiv-unified-canvas-inspector.js`
- `tabs/vibration-aiv-unified-canvas-view.js`
Tests:
- `tests/vibration-aiv-canvas-export.test.mjs`
- `tests/vibration-aiv-canvas-evidence-hardening.test.mjs`
Recovery: PR644/WIP workreport/status/claims.

## Pre-edit rollback blobs
Native backup: `NOT_RUN / ENVIRONMENT_BLOCKED`; blobs are rollback evidence only:
- execution `74acbf43b5f5f6c515c594efc460240590c625a2`
- canvas export controller `0bd5ccc054cdc5bb6d8d515a6cf1e6567d6c84b0`
- unified projection `72bc196779d263da572dac5ddf33bfa94fd35fa7`
- unified inspector `b058f2dd3e6ef0aaaa6a2bbe8f2d3d5586938176`
- unified view `513f545ab06230b9611e22ebf515329521ece595`
- canvas export test `ba5879d60b8a9103b8b41d496830d7430c2ce5a5`

## Authority invariants
No AIV equations/constants, Stage-9 rule, physical-distance authority, line/case authority, generic EI main-line governing aggregation or design authority changed. Canvas presentation remains non-authoritative; engineering authority remains the embedded screening package; AIV line/case remains `NOT_AUTHORIZED`; `designAuthority=false`.

## Validation ledger
- stack against PR643: PASS / source reconciliation — 13 files at allocation, 0 behind.
- full export custody/current-lineage contract: PASS / source inspection + updated regression artifacts.
- unified presentation projection: PASS / source inspection.
- stale inspector boundary: PASS / source inspection + focused regression artifact.
- omitted-input disclosure/no-placeholder boundary: PASS / source inspection + pure coverage regression artifact.
- inventory completeness/no-promotion presentation: PASS / source inspection + regression artifact.
- repository-native Node tests: NOT_RUN / executable checkout unavailable.
- browser create/edit/add/delete/export journey: NOT_RUN / Browser unavailable.
- native backup command: NOT_RUN / ENVIRONMENT_BLOCKED.

## Integration order
#642 correctness → #643 interaction → #644 evidence/currency. Keep all draft until owner grants merge authority and executable/browser gates are handled or explicitly waived by owner.

## EXACT_NEXT_ACTION
Refresh exact PR644 head/mergeability/hosted evidence, reconcile the full #642→#643→#644 stack against current main and open claims, and stop at the owner merge gate.
