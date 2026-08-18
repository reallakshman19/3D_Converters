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
CURRENT_STAGE: VALIDATE_RECONCILE
CURRENT_BLOCKER: REPOSITORY_NATIVE_EXECUTION_UNAVAILABLE
HIGHEST_RISK: accidental authority expansion beyond the nine direct EI T2.3 Table T2-3 baseline machinery cases
EXACT_NEXT_ACTION: allocate draft PR after exact base/diff reconciliation; preserve shared-support, dynamic-reduction and generic EI-mainline benchmark gates
```

## Mission

Promote Mechanical Excitation T2.3 **direct Table T2-3 baseline** evaluation from candidate-only to bounded screening authority without redesigning the method or broadening applicability.

## Engineering grounding

EI AVIFF 2nd Edition T2.3.1 defines three excitation extents: directly attached machinery, nearby machinery through supporting structure, and pipework sharing supports with another high-vibration line. T2.3.2 Table T2-3 assigns fixed baseline LOF values for nine machinery classes. It separately states that pipework adjacent to other pipework with LOF >= 0.5 takes the adjacent pipework LOF, and that reciprocating/PD or diesel/gas-engine cases may reduce to 0.4 only after a detailed structural dynamic analysis establishes no frequency coincidence.

The repository’s nine direct baseline values match Table T2-3 exactly. Shared-support transfer and post-dynamic-analysis reduction remain intentionally excluded.

Controlled source identity:

```text
repository  reallaksh19/Common
commit      aef163a5def3bfe04ca0ba860da05728a27daf42
path        EI - AVIFF Guidelines 2nd Edition.pdf
blob        9d3eccc56429411e17c07a579bdebbd13cb0bdc5
locator     T2.3 / Table T2-3 / printed page 54 / PDF page 62
```

## Implemented behavior

- Added `converters/vibration/mechanical/t23-method.js` as the controlled runtime direct-baseline method.
- Nine direct machinery classes are screening-qualified and deterministic; multiple selected classes use the greatest applicable Table T2-3 baseline LOF.
- Facility result is `MechanicalFacilityScreeningResult.v1 / CALCULATED_SCREENING`.
- Authority is bounded to `DIRECT_TABLE_T2_3_BASELINE_ONLY`.
- `dynamicReductionAuthorized=false` and `sharedSupportTransferAuthorized=false` are explicit result authority facts.
- Mechanical mechanism contract is `IMPLEMENTED_SCREENING / SCREENING / AUTHORIZED / designAuthority=false` for this direct baseline path.
- Matrix projection marks the result `CALCULATED_SCREENING`; current/stale screening governing behavior is updated accordingly.
- Source registry resolves Mechanical to controlled `T2.3 / Table T2-3 / printed page 54`; other unresolved mechanism bindings remain unchanged.
- Facility UI labels the direct path screening-qualified and explicitly describes the excluded branches.

## Existing-file rollback evidence

Native `node utils/backup.js save ...` cannot run in this connector-only environment and remains `NOT_RUN / ENVIRONMENT_BLOCKED`. Exact pre-edit base blobs were recorded before mutation:

```text
converters/vibration/mechanical/facility.js                 578d943a2435339e53c1d2e7083b74690c0116c3
converters/vibration/mechanisms/mechanical.js               74339c2598dea9ed42b79f4f3aac885aaa8182bb
converters/vibration/source/registry.js                     b093f2af8d8be0a5f41318349955936dfd32a244
tabs/vibration-integrity-mechanical-view.js                 e2ab173d6279dcca0a876dd8f2a487b0e0bc30ce
tabs/vibration-integrity-mechanisms.js                      e705b75f4b08eefa8cafa1bb928aff9229b58ab7
tests/vibration-mechanical-t23-facility-stage4.test.mjs     87cdd9f78b637f64dcb44b14188c16467c6de0c8
tests/vibration-integrity-mechanism-matrix.test.mjs         daca77c02e678ceacf05f2aa156782646fc17f5a
tests/vibration-method-source.test.mjs                      a8205eb20eccefa12f1650d0d5920982f8a1f987
```

These Git blobs are rollback evidence, not a backup-command PASS.

## Coordination

PR626 owns the broader capability-source-of-truth refactor and also touches `tabs/vibration-integrity-mechanisms.js`. This PR changes only the Mechanical projection in that file. When PR626 is rebased/reconciled, its resolver must retain Mechanical `SCREENING` after this qualification; no AIV behavior from PR626 is duplicated here.

## Important remaining gate

The generic `EI_MAIN_LINE_AGGREGATION` path has a separate benchmark-registry eligibility gate. Mechanical remains pending in that registry because it is not yet a registered central Engineering Calculation capability with B1/B2 frozen custody. This PR does **not** change that policy. Therefore:

```text
Mechanical direct facility screening       AUTHORIZED
Mechanical matrix screening tier           AUTHORIZED
Mechanical shared-support transfer          NOT AUTHORIZED
Mechanical TM-09 reduced 0.4 branch         NOT AUTHORIZED
Generic EI main-line contributor status     STILL GATED / NOT PROMOTED BY THIS PR
Design authority                            false
```

This separation is intentional and fail-closed.

## Validation truth

```text
EI T2.3 table/extent grounding                    PASS / SOURCE_INSPECTION
nine direct baseline values vs EI Table T2-3     PASS / SOURCE_INSPECTION
controlled method source identity                 PASS / SOURCE_INSPECTION
shared-support exclusion                           PASS / SOURCE_INSPECTION
post-dynamic-analysis reduction exclusion         PASS / SOURCE_INSPECTION
exact facility scope rejection                    PASS / SOURCE_INSPECTION
matrix screening/candidate tier separation        PASS / SOURCE_INSPECTION
reconstructed exact-method node --check           PASS
reconstructed focused method execution            PASS / 0.4 max + shared-support rejection
repository-native Mechanical tests                NOT_RUN
repository-native matrix/source tests             NOT_RUN
browser Mechanical workspace journey              NOT_RUN
```

The reconstructed execution is supporting evidence only and is not represented as repository-native PASS.

## Explicit exclusions

- shared-support adjacent-line transfer calculation;
- reduced 0.4 LOF after TM-09/detailed dynamic analysis;
- automatic T1 applicability identification;
- generic EI main-line aggregation policy/benchmark-registry promotion;
- AIV/FIT/SBC numerical changes;
- design authority;
- workflow files;
- merge.
