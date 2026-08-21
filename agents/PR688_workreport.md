# PR688 — Facility Matrix Run Currentness — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #688
BRANCH: agent/vib-matrix-run-currentness-20260821
BASE: main
BASE_SHA_AT_START: 1d0e9245f9a6333ce43fb8085602ec112241a411
PR_BASE_AT_ALLOCATION: 1d0e9245f9a6333ce43fb8085602ec112241a411
PR_HEAD_AT_ALLOCATION: c066bf318c3e828534516271c8d870934dee1c86
PREDECESSOR_PR: 686 (MERGED)
PREDECESSOR_MERGE: 1d0e9245f9a6333ce43fb8085602ec112241a411
CURRENT_STAGE: DRAFT_PR_RECOVERY_MIGRATION
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

## Mission
Prevent Mechanical, SBC and AIV caches from an earlier facility run from appearing current in the live mechanism matrix after a later identical FIT rerun.

This is presentation/currentness only and consumes `VibrationFacilityRunBasis.v1` from merged PR686.

## Confirmed defect
Before this PR both the main facility register and advisory roadmap bridge passed raw secondary-mechanism caches into `buildVibrationMechanismMatrixRow()` through separate local `matrixContext()` functions.

A byte-identical rerun may preserve scenario hashes and scenario-set key while creating a new `runId`; old Mechanical/SBC/AIV caches could therefore be presented as current even though PR686 classifies them as foreign to the new run.

## New currentness projection
`VibrationFacilityMechanismCurrentnessProjection.v1` filters presentation input for `CURRENT_RESULT` using:

```text
same runId
+ same datasetId
+ deterministic scenarioSetKey from current OperatingScenario[]
+ same exact line/case OperatingScenario snapshot
```

AIV additionally requires a `CURRENT_RESULT / FACILITY_LINKED` session whose plan matches the same run/dataset/scenario-set key.

Stale/foreign entries are represented only as non-numerical metadata with `STALE_OR_FOREIGN_RUN_CUSTODY` and are omitted from current matrix input.

## Scenario-set anti-drift
The projector recomputes `vibrationFacilityScenarioSetKey(operatingScenarios)` and requires it to equal the claimed current run basis. A stale/tampered key produces `FACILITY_SCENARIO_SET_INVALID` and empty current secondary caches.

## STALE_RESULT preservation
If the entire facility result is already `STALE_RESULT`, retained stale Mechanical/SBC evidence remains visible for inspection and AIV is forced to stale result state. This PR does not destroy historical evidence.

## Shared matrix ingress
New `tabs/vibration-integrity-matrix-context.js` is used by both:

```text
tabs/vibration-integrity-view.js
tabs/vibration-integrity-roadmap-bridge.js
```

The duplicate raw local `matrixContext()` functions are removed.

## Permanent authority boundary

```text
purpose                    PRESENTATION_CURRENTNESS_FILTER_ONLY
engineeringAuthority       NONE
screeningAuthority         NOT_AUTHORIZED
designAuthority            false
numericalAuthority         NONE
aggregationAuthority       NONE
persistenceAuthority       NONE
determinesApplicability    false
determinesCompleteness     false
determinesGoverningResult  false
blocksExecution            false
blocksNavigation           false
blocksCalculation          false
blocksPersistence          false
```

The right rail remains advisory/linking only. No completeness, aggregation, numerical or design authority is added.

## Effective implementation/test paths

```text
converters/vibration/facility/mechanism-currentness.js
tabs/vibration-integrity-matrix-context.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity-roadmap-bridge.js
tests/vibration-facility-mechanism-currentness.test.mjs
```

Exact pre-edit Git-blob backups:

```text
.backups/connector-20260821-vib-matrix-run-currentness/tabs/vibration-integrity-view.js
.backups/connector-20260821-vib-matrix-run-currentness/tabs/vibration-integrity-roadmap-bridge.js
```

Backup source blobs:

```text
view             4f905f8241713935bd56a99745b89823423053f1
roadmap bridge   cb8ede4ad111914160968901d678b3ea058d6bf1
```

Backup commit: `fcd51b2875c08b84d0d52ee675a9a75ca09a05de`.

Native repository backup command remains `NOT_RUN / ENVIRONMENT_BLOCKED`; connector backups are exact Git-blob copies.

## Diff quality / line policy
Before allocation:

```text
main              1d0e9245f9a6333ce43fb8085602ec112241a411
branch relation   ahead 14 / behind 0
changed paths     10 intended before temporary allocation markers
view delta        +2 / -12
roadmap delta     +5 / -12
```

New physical files:

```text
mechanism-currentness.js                         151
vibration-integrity-matrix-context.js             46
vibration-facility-mechanism-currentness.test.mjs 211
```

All are below the repository `<300` physical-line policy.

## Falsifiers encoded
1. projection authority is non-authorizing and non-blocking;
2. exact current-run Mechanical/SBC caches remain visible;
3. identical rerun rejects previous-run Mechanical/SBC even with equal scenario hash;
4. same-run stale scenario snapshot is filtered;
5. claimed scenario-set key must equal deterministic OperatingScenario fingerprint;
6. AIV must match exact current facility run and scenario set;
7. whole-facility stale state preserves retained stale inspection;
8. main register and roadmap bridge must share the matrix-context builder and cannot reintroduce local raw matrix contexts.

## Validation truth
Executed:

```text
predecessor PR686 merge                         PASS / HOSTED
current-main grounding                          PASS / HOSTED SOURCE
changed-file reconciliation                     PASS / SOURCE_INSPECTION
exact Git-blob backups                          PASS / CONNECTOR TREE/BLOB
diff normalization                              PASS / SOURCE_INSPECTION
physical-line policy                            PASS / SOURCE_INSPECTION
open-PR coordination                            PASS / no exact current production overlap
```

Truthfully NOT_RUN:

```text
repository-native focused Node tests            NOT_RUN / ENVIRONMENT_BLOCKED
repository-native vibration regression suite    NOT_RUN / ENVIRONMENT_BLOCKED
served-browser Vibration Integrity journey      NOT_RUN / ENVIRONMENT_BLOCKED
hosted exact-head checks                        PENDING_POST_MIGRATION
independent numerical verification              NOT_APPLICABLE / no numerical change
```

Native Git transport was attempted and failed with `Could not resolve host: github.com`. No committed falsifier source is represented as executable PASS.

## PR allocation snapshot

```text
PR                #688
state             OPEN / DRAFT / UNMERGED
base              main@1d0e9245f9a6333ce43fb8085602ec112241a411
head              c066bf318c3e828534516271c8d870934dee1c86
changed files     12 temporary allocation state
GitHub mergeable  false on first allocation response; RECHECK REQUIRED
```

The temporary file count includes two allocation markers. The first mergeability response is not a final conflict determination.

## Exact next action
1. create `agents/status/PR688.yaml` and `agents/claims/PR688.yaml`;
2. retire three WIP recovery aliases and both allocation markers;
3. re-read exact PR head, file list, main relation, mergeability, reviews/threads, statuses and PR workflow runs;
4. update this workreport/status and PR body with final reconciled truth;
5. keep executable validation NOT_RUN unless genuinely executed;
6. do not merge without a new explicit Owner instruction.

## Appendix A — takeover questions
1. Why can an identical rerun require a different `runId` even when scenario hashes are unchanged?
2. Why must currentness be enforced before cache values reach the mechanism matrix?
3. Why is the scenario-set key recomputed from current OperatingScenario objects?
4. Why must Mechanical/SBC satisfy both run-level and scenario-level custody?
5. Why is AIV checked against its facility-linked plan rather than line/case labels alone?
6. Why is whole-facility stale inspection preserved?
7. Why must the main register and right rail share one matrix-context builder?
8. Which contract still owns completeness?
9. Why may this projector not determine a governing result?
10. Which executable checks remain required before release-quality confidence?
