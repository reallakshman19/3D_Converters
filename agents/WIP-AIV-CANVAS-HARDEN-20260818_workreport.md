# WIP-AIV-CANVAS-HARDEN-20260818 — Recovery Workreport

## Recovery header
- Repository: `reallaksh19/3D_Converters`
- Base branch: `main`
- Basis head: `b2aaa2ebea54bf568f340c62b2bb767d2ce061ae`
- Working branch: `agent/vibration-aiv-canvas-hardening-20260818`
- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: AUTO
- AUTO_STATE: RUNNING
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_THIS_REPAIR_SET
- Source family gate: issue #429; AIV authority gate remains issue #441.

## Handover in 60 seconds
Mission: repair confirmed AIV unified-canvas engineering/UI defects without changing the numerical kernel or promoting AIV line/design authority. Phase 1 is correctness-first: disconnected/orphaned Sources must remain explicit readiness blockers; Quick RV branch deletion must have a guarded atomic inverse; branch targets must be valid routing nodes. Phase 2 will harden selection/error/focus/disclosure/placement. Phase 3 will align canvas export/stale/completeness semantics with the post-#641 evidence contract.

Current diagnosis:
1. `generateAivInputTablesFromFlareNetwork()` skips `DISCONNECTED` source→assessment pairs, so an orphaned Source can disappear from readiness while other rows remain screenable.
2. Quick RV add is atomic but delete is two-step; selecting the just-created RV then Delete fails because its connected segment exists.
3. Quick RV target options include non-routing nodes.
4. Numerical AIV kernel, Stage-9 rule, inventory authority and `designAuthority=false` are protected invariants.

## Phase 1 planned files
Production:
- `converters/vibration/aiv/aiv-flare-network-table-generator.js`
- `tabs/vibration-aiv-unified-canvas-workflow.js`
- `tabs/vibration-aiv-unified-canvas-editor-controller.js`
- `tabs/vibration-aiv-unified-canvas-author.js` only if required for reusable atomic deletion primitive.
Tests:
- `tests/vibration-aiv-unified-canvas-user-workflow.test.mjs`
- `tests/vibration-aiv-unified-canvas-editor-author.test.mjs`
- focused readiness/network regression(s) as needed.
Recovery metadata under this WIP identity.

## Authority / invariants
- No AIV equations/constants/benchmark expected values change.
- No Stage-9 aggregation rule change.
- AIV assessment screening authority remains bounded as already merged.
- AIV line/case screening authority remains NOT_AUTHORIZED.
- Generic EI main-line contribution remains blocked.
- SVG pixels remain non-authoritative for physical distance.
- `designAuthority=false`.

## Prediction / falsifier
Prediction: after deleting a branch segment but leaving its Source, generated evidence will retain an explicit unresolved/disconnected relationship and readiness will fail closed; atomic branch deletion will remove exactly one eligible leaf Source plus its one branch segment and reject non-leaf/ambiguous deletion.
Falsifier: any broken/orphaned active Source can still vanish from readiness, or branch deletion can cascade through shared/header segments.

## Validation ledger
- Live main grounding: PASS / SOURCE_INSPECTION / GitHub authoritative mutable state.
- Native backup command: NOT_RUN / ENVIRONMENT_BLOCKED; pre-edit Git blob SHAs will be recorded before each existing-file edit.
- Repository-native tests: NOT_RUN pending executable environment.
- Exact-source Node reconstruction: planned where practical.

## Coordination
Current open PR inventory contains multiple unrelated workstreams. Prior AIV implementation stack is merged/superseded. No live AIV canvas repair claim has yet been identified on current main; re-check before PR allocation and before each phase.

## EXACT_NEXT_ACTION
Implement Phase 1 fail-closed disconnected relationship generation + guarded atomic Quick-RV branch deletion, add focused regressions, reconcile exact changed paths, then allocate a draft PR before continuing to Phase 2.
