# PR635 — Mechanical T2.3 direct baseline screening qualification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE_PHASE
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
PR: 635
BRANCH: agent/vibration-mechanical-t23-screening-qualification-20260818
BASE: main
BASE_HEAD: 765d15e87def22291792ddb533df9ea532fb3f67
IMPLEMENTATION_BASIS_HEAD: ede48e6ca73556ea2c609ae45a81081dd5b283a8
RECONCILED_HEAD: 91eed87f50757d13b0210afd70be40b30fc1402a
BASE_RELATION: ahead 22 / behind 0
CHANGED_FILES: 16 / 16 explained / 0 unexplained
CURRENT_STAGE: HANDOVER
CURRENT_BLOCKER: REPOSITORY_NATIVE_EXECUTION_UNAVAILABLE
HIGHEST_RISK: preserve authority boundary to direct Table T2-3 baselines only and reconcile the Mechanical projection with PR626 before either overlapping PR is merged
EXACT_NEXT_ACTION: leave PR635 draft; preserve Mechanical SCREENING during PR626 reconciliation
```

## Qualified scope

Mechanical direct facility screening and matrix screening tier are authorized only for the nine direct EI AVIFF T2.3 Table T2-3 machinery baseline values. Multiple selected direct sources use the greatest applicable baseline.

## Explicitly not authorized

- shared-support adjacent-line LOF transfer;
- detailed-dynamic-analysis reduced 0.4 branch;
- automatic T1 applicability;
- generic EI main-line benchmark-registry promotion;
- design authority.

## Source custody

Controlled method record points to `reallaksh19/Common` commit `aef163a5def3bfe04ca0ba860da05728a27daf42`, `EI - AVIFF Guidelines 2nd Edition.pdf`, blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, T2.3 / Table T2-3 / printed page 54.

## Coordination

PR626 overlaps only on `tabs/vibration-integrity-mechanisms.js`. Its capability resolver must preserve this PR's Mechanical SCREENING outcome when reconciled. Do not merge one over the other without resolving that semantic overlap.

## Validation truth

```text
EI T2.3 source/table inspection                    PASS
nine-row direct baseline parity                    PASS
shared-support / dynamic-reduction exclusions      PASS
exact facility scope fail-closed                   PASS
matrix screening/candidate separation              PASS / SOURCE_INSPECTION
reconstructed exact-method node --check            PASS
reconstructed focused method execution             PASS
stack/file reconciliation                          PASS / 16 of 16 / behind 0
repository-native Mechanical/matrix/source tests   NOT_RUN
browser Mechanical journey                         NOT_RUN
current-head combined statuses                     0 returned -> NOT_RUN, not PASS
current-head PR workflow runs                      0 returned -> NOT_RUN, not PASS
current review threads                             0
```

Native backup execution remains `NOT_RUN / ENVIRONMENT_BLOCKED`; exact pre-edit blobs are retained in the predecessor WIP report. Draft only; no merge authority.
