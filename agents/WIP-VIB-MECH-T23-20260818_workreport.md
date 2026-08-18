# WIP-VIB-MECH-T23-20260818 — EI T2.3 Mechanical screening qualification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: owner-directed focused vibration-integrity implementation; autonomous continuation 2026-08-18
PR_OR_WIP: WIP-VIB-MECH-T23-20260818
BRANCH: agent/vibration-mechanical-t23-screening-qualification-20260818
BASE: main
BASE_HEAD: 765d15e87def22291792ddb533df9ea532fb3f67
CURRENT_STAGE: IMPLEMENT
CURRENT_BLOCKER: NONE
HIGHEST_RISK: accidental authority expansion beyond the nine direct EI T2.3 Table T2-3 baseline machinery cases
EXACT_NEXT_ACTION: route facility evaluation to the controlled direct-baseline method, promote the mechanism assessment/UI only for that scope, resolve source binding, and update focused regressions
```

## Mission

Promote the existing Mechanical Excitation T2.3 **direct baseline** evaluator from candidate-only to bounded screening authority without redesigning the calculation or broadening applicability.

## Engineering grounding

EI AVIFF 2nd Edition T2.3.1 defines three excitation extents: directly attached machinery, nearby machinery through supporting structure, and pipework sharing supports with another high-vibration line. T2.3.2 Table T2-3 assigns fixed baseline LOF values for nine machinery classes. It separately states that pipework adjacent to other pipework with LOF >= 0.5 takes the adjacent pipework LOF, and that reciprocating/PD or diesel/gas-engine cases may reduce to 0.4 only after a detailed structural dynamic analysis establishes no frequency coincidence.

Current repository direct-baseline values match Table T2-3 exactly. The shared-support transfer branch and post-dynamic-analysis reduction are intentionally excluded from this qualification slice.

Controlled source identity used by the new method record:

```text
repository  reallaksh19/Common
commit      aef163a5def3bfe04ca0ba860da05728a27daf42
path        EI - AVIFF Guidelines 2nd Edition.pdf
blob        9d3eccc56429411e17c07a579bdebbd13cb0bdc5
locator     T2.3 / Table T2-3 / printed page 54
```

## Current implementation

- Added `converters/vibration/mechanical/t23-method.js` under 300 lines.
- Added an independently transcribed nine-row authoritative-reference test.
- Direct method output is explicitly `DIRECT_TABLE_T2_3_BASELINE_ONLY` screening authority.
- Shared-support transfer remains `NOT_AUTHORIZED`.
- Detailed-dynamic-analysis reduction to 0.4 remains `NOT_AUTHORIZED`.

## Existing-file rollback evidence

Native `node utils/backup.js save ...` cannot run in this connector-only environment and remains `NOT_RUN / ENVIRONMENT_BLOCKED`. Exact pre-edit base blobs are recorded before mutation:

```text
converters/vibration/mechanical/facility.js                 578d943a2435339e53c1d2e7083b74690c0116c3
converters/vibration/mechanisms/mechanical.js               74339c2598dea9ed42b79f4f3aac885aaa8182bb
converters/vibration/source/registry.js                     b093f2af8d8be0a5f41318349955936dfd32a244
tabs/vibration-integrity-mechanical-view.js                 e2ab173d6279dcca0a876dd8f2a487b0e0bc30ce
tests/vibration-mechanical-t23-facility-stage4.test.mjs     87cdd9f78b637f64dcb44b14188c16467c6de0c8
tests/vibration-method-source.test.mjs                      a8205eb20eccefa12f1650d0d5920982f8a1f987
```

These Git blobs are rollback evidence, not a claim that the required backup command executed.

## Scope

- controlled source/method custody for EI T2.3 Table T2-3 direct baselines;
- exact-value parity between production logic and controlled method table;
- bounded screening authority for direct machinery-source selections only;
- preserve exact facility scope and current/stale result behavior;
- preserve fail-closed shared-support handling;
- preserve no-design-authority.

## Explicit exclusions

- shared-support adjacent-line transfer calculation;
- reduced 0.4 LOF after TM-09/detailed dynamic analysis;
- automatic T1 applicability identification;
- generic EI main-line aggregation changes;
- AIV/FIT/SBC changes;
- design authority;
- workflow files;
- merge.

## Validation plan

- authoritative-reference parity for all nine T2.3 table rows;
- worked-example control: centrifugal compressor + >=15 kW motor governs at 0.4;
- multi-source max selection;
- empty/unknown selection fail-closed;
- shared-support remains blocked;
- exact facility scope mismatch rejected;
- screening assessment contract exposes authority only for direct-baseline path;
- source binding resolved to EI T2.3 / printed page 54 / Table T2-3.

Repository-native execution remains NOT_RUN until executable checkout/hosted CI is available. Source inspection is not a substitute for runtime execution.
