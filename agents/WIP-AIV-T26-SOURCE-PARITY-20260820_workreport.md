# WIP AIV T2.6 source parity — recovery report

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `WIP: WIP-AIV-T26-SOURCE-PARITY-20260820`
- `BRANCH: agent/aiv-t26-source-parity-20260820`
- `BASE_MAIN: a2dc24c27c791355044ae64939647a7c78804aca`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `MUTATION_AUTHORITY: WRITE_ALLOWED_AFTER_APPENDIX_A`
- `MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED`

## Mission

Replace the current configured-D.2.3 Stage-8 AIV discontinuity calculation with a source-reconciled EI T2.6 evaluator using actual assessment geometry/material/connection inputs, while preserving assessment-only screening scope, non-authoritative line/case reduction, and `designAuthority=false`.

Governing source correction is merged in `reallaksh19/Advanced_Analysis` PR #1289 as `ca53d589b79fc34f5a5616c0ce7de00e06c13df4`.

## Live diagnosis

Current main path:

`vibration-aiv adapter -> calculateAiv -> aiv-kernel-candidate stages 1..7 -> calculateDiscontinuity -> line aggregation`.

Current Stage 8 in `aiv-calculator.js`:

- requires `benchmark.stage8Model=CONFIGURED_D23_INTERMEDIATES`;
- consumes configured/published A, S and B rather than calculating them from the assessment;
- lets benchmark `flm1Mode` select the runtime FLM1;
- has no `D/d >= 10 -> 0.5` branch;
- always applies Weldolet FLM2 logic;
- has no Duplex FLM3 branch;
- does not clamp Lf before publication.

`aiv-readiness.js` also does not currently prove all Stage-8 executable quantity units that the calculator will consume.

## Coordination / takeover

PR #506 is open, draft, 104 commits behind main, 33 files wide, and its explicit non-goal is “no new EI equations.” It overlaps the AIV calculator/readiness domain but is not a safe vehicle for this source-equation change.

Disposition for this mission: `SUPERSEDE_FOR_THIS_SCOPE`. Preserve useful hardening concepts; do not replay #506 product blobs. A follow-up PR will explicitly state that boundary.

Merged PR #517 is predecessor evidence only; its ACTIVE claim record on main is stale historical coordination metadata after merge.

## Protected invariants

- screening result scope remains `ASSESSMENT`;
- line/case summary remains non-authoritative for screening;
- `designAuthority=false`;
- no SVG/pixel distance authority;
- no T2.5 multi-source semantic change in this slice;
- no source threshold/tolerance weakening;
- D.2.3 published FLM1 `1.2133` vs direct recalculation `1.210975819...` remains visible as an oracle variance, not a production input override;
- no workflow files.

## Appendix A — implementation takeover qualification

### A1 Production trace — 20/20

Current production trace opened and verified: adapter `converters/engineering-calculations/adapters/vibration-aiv.js` calls `calculateAiv`; stages 1..7 come from `aiv-kernel-candidate.js`; Stage 8 is local `calculateDiscontinuity`; Stage 9 is `aiv-line-aggregation.js`; work-pack machine truth is `engineering/workpacks/VIB-AIV.json`.

### A2 Current failure isolation — 20/20

First wrong numerical boundary is Stage 8. Prediction/falsifier: changing only benchmark A/S/B can currently alter or gate screening even when physical assessment geometry is unchanged; after the patch, screening Stage 8 must be invariant to benchmark A/S/B and derive a/s/B from actual `mainOutsideDiameter`, `mainWallThickness`, point PWL and branch geometry.

### A3 Authority / invariant — 20/20

The patch may change Stage-8 numerical implementation and method revision but must not broaden screening result scope or grant line/design authority. A source-corroborated equation is qualification evidence; it does not by itself authorize new result scopes.

### A4 Independent validation — 20/20

Independent source oracle from merged PR #1289: D.2.3 actual geometry/PWL reproduces approximately `a=0.9398945`, `s=68.229114`, `B=152.206736`, `N≈7.9918e9`; calculated FLM1 from displayed dimensions is `1.210975819...`; `D/d>=10 -> 0.5`; Weldolet FLM2 and Duplex FLM3 formulas are source-corroborated; final D.2.3 LOF remains `0.29`.

### A5 Minimal patch — 20/20

Add one pure T2.6 module; integrate it into calculator/readiness; make benchmark intermediates oracle-only for screening; bump AIV method revision/work-pack custody; add focused source-parity regression. Do not change T2.5 source grouping, canvas/runtime ownership, line aggregation, or authority scope.

`APPENDIX_A_TOTAL = 100/100` — implementation authority qualified.

## Planned files

Production/current-truth:
- `converters/vibration/aiv/aiv-t26.js` (new)
- `converters/vibration/aiv/aiv-calculator.js`
- `converters/vibration/aiv/aiv-readiness.js`
- `converters/vibration/aiv/aiv-assumption-profile.js`
- `converters/engineering-calculations/adapters/vibration-aiv.js`
- `engineering/workpacks/VIB-AIV.json`
- `engineering/workpacks/probes/vib-aiv.mjs`

Tests:
- `tests/vibration-aiv-t26-source-parity.test.mjs` (new)
- `tests/vibration-aiv-auto-product-path.test.mjs`
- `tests/vibration-aiv-assumption-profile.test.mjs`

Existing files require pre-edit rollback copies. Native `node utils/backup.js` is expected `NOT_RUN / ENVIRONMENT_BLOCKED` in connector-only execution; exact Git blob rollback references will be committed instead and not mislabeled as native-backup PASS.

## Validation plan

1. exact-source syntax for changed/new JS;
2. focused pure T2.6 regression with independent numeric oracle;
3. focused assumption validation regression;
4. source-inspection integration checks for calculator/readiness/work-pack;
5. repository-native AIV release/work-pack suite if executable; otherwise `NOT_RUN`;
6. browser Product Freeze remains separately classified.

## Exact next action

Create status/claim, pin pre-edit blob IDs, then implement `aiv-t26.js` and integrate it without widening scope.
