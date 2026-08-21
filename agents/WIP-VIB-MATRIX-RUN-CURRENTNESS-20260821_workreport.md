# WIP-VIB-MATRIX-RUN-CURRENTNESS-20260821 — Facility Matrix Run Currentness

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: READY_FOR_PR_ALLOCATION
MAIN_HEAD_LAST_CHECKED: 1d0e9245f9a6333ce43fb8085602ec112241a411
PREDECESSOR_PR: 686 (MERGED)
PREDECESSOR_MERGE: 1d0e9245f9a6333ce43fb8085602ec112241a411
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission

Prevent Mechanical, SBC and AIV caches from an earlier facility run from appearing current in the live mechanism matrix after a later identical FIT rerun.

This is a presentation/currentness successor to PR686. It consumes the merged `VibrationFacilityRunBasis.v1`; it does not redefine facility run identity.

## Confirmed defect

Before this slice both the main facility register and the advisory roadmap bridge created local raw matrix contexts:

```text
mechanicalCandidateResultsByScope -> raw UI cache
sbcCandidateResultsByScope        -> raw UI cache
AIV                               -> global current session fallback
```

The mechanism builders correctly understood `CURRENT_RESULT` versus `STALE_RESULT`, but they had no current facility `runId` filter at this presentation ingress.

Therefore this sequence was possible:

```text
FIT-RUN-1
  scenario snapshot X
  scenario-set key Y
  Mechanical/SBC/AIV result cached

byte-identical rerun

FIT-RUN-2
  scenario snapshot X
  scenario-set key Y

raw old cache -> mechanism matrix -> could appear CURRENT
```

PR686 already proved that those old results are foreign to FIT-RUN-2. This successor makes the on-screen projection obey the same custody.

## New currentness projection

`converters/vibration/facility/mechanism-currentness.js`

Schema:

```text
VibrationFacilityMechanismCurrentnessProjection.v1
```

For `CURRENT_RESULT`, a Mechanical/SBC candidate reaches the matrix only when:

```text
candidate.facilityRunBasis.runId         == current runId
candidate.facilityRunBasis.datasetId     == current datasetId
candidate.facilityRunBasis.scenarioSetKey== current deterministic scenarioSetKey
candidate.scenarioExecutionBasis         == current line/case OperatingScenario snapshot
```

AIV reaches the matrix only when:

```text
session.resultState                  == CURRENT_RESULT
session.executionContext             == FACILITY_LINKED
plan.facilityRunId                   == current runId
plan.datasetId                       == current datasetId
plan.scenarioSetKey                  == current deterministic scenarioSetKey
```

Stale/foreign cache entries are omitted from current matrix input and retained only as non-numerical projection metadata:

```text
reason = STALE_OR_FOREIGN_RUN_CUSTODY
```

## Scenario-set anti-drift

The projector does not trust `workflow.result.scenarioSetKey` as an independent string.

It recomputes:

```text
vibrationFacilityScenarioSetKey(operatingScenarios)
```

and requires exact equality with the claimed run basis. A tampered/stale claimed key therefore returns:

```text
FACILITY_SCENARIO_SET_INVALID
```

with empty current secondary-mechanism caches.

## STALE_RESULT behavior deliberately preserved

When the whole facility result is already `STALE_RESULT`, existing retained-stale inspection remains available:

- Mechanical/SBC cached evidence remains visible for review;
- AIV is explicitly passed with `aivResultState = STALE_RESULT`;
- no `VibrationFacilityMechanismCurrentnessProjection.v1` is claimed for that state.

This avoids converting a currentness correction into destructive history removal.

## Shared presentation ingress

New:

```text
tabs/vibration-integrity-matrix-context.js
```

Both production consumers now use it:

```text
tabs/vibration-integrity-view.js
tabs/vibration-integrity-roadmap-bridge.js
```

The duplicate local `function matrixContext()` implementations were removed. This prevents the advisory right rail and the main register from drifting into different cache-currentness rules.

The roadmap/right-rail authority remains unchanged and advisory only.

## Permanent authority boundary

`VibrationFacilityMechanismCurrentnessProjection.v1` declares:

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

No result value is recalculated or transformed by the projector. It only decides whether cached evidence is eligible to be presented as current for the current facility run.

## Changed implementation/test paths

```text
converters/vibration/facility/mechanism-currentness.js
tabs/vibration-integrity-matrix-context.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity-roadmap-bridge.js
tests/vibration-facility-mechanism-currentness.test.mjs
```

Exact connector-side pre-edit Git-blob backups:

```text
.backups/connector-20260821-vib-matrix-run-currentness/tabs/vibration-integrity-view.js
  source blob 4f905f8241713935bd56a99745b89823423053f1

.backups/connector-20260821-vib-matrix-run-currentness/tabs/vibration-integrity-roadmap-bridge.js
  source blob cb8ede4ad111914160968901d678b3ea058d6bf1
```

Backup commit:

```text
fcd51b2875c08b84d0d52ee675a9a75ca09a05de
```

Native `node utils/backup.js save` is `NOT_RUN / ENVIRONMENT_BLOCKED`; the connector backup is an exact Git-blob copy and is not misrepresented as native backup execution.

## Diff quality / line policy

Pre-PR reconciliation against `main@1d0e9245...`:

```text
branch relation     ahead 12 / behind 0
changed paths       10
unexplained paths   0
```

Existing-file semantic deltas:

```text
tabs/vibration-integrity-view.js             +2 / -12
tabs/vibration-integrity-roadmap-bridge.js   +5 / -12
```

New physical files:

```text
mechanism-currentness.js                     151 lines
vibration-integrity-matrix-context.js         46 lines
vibration-facility-mechanism-currentness.test.mjs 211 lines
```

All are below the repository `<300` physical-line policy.

## Falsifiers encoded

`tests/vibration-facility-mechanism-currentness.test.mjs` covers:

1. projection has no engineering/screening/completeness/governing/blocking authority;
2. exact current-run Mechanical/SBC caches remain visible;
3. byte-identical rerun rejects previous-run Mechanical/SBC by `runId`;
4. same-run candidate with stale OperatingScenario snapshot is filtered;
5. claimed scenario-set key must equal deterministic OperatingScenario fingerprint;
6. AIV must match current facility `runId + datasetId + scenarioSetKey`;
7. whole-facility `STALE_RESULT` retains stale inspection rather than claiming currentness;
8. main register and roadmap bridge must both use the shared matrix-context builder and may not reintroduce local raw `matrixContext()` functions.

## Validation truth

Executed:

```text
predecessor PR686 merge                         PASS / HOSTED
current-main grounding                          PASS / main@1d0e9245f9a6333ce43fb8085602ec112241a411
exact changed-file reconciliation               PASS / 10 intended, 0 unexplained
main relation                                   PASS / ahead 12, behind 0
exact Git-blob pre-edit backups                 PASS / connector tree/blob operation
diff normalization                              PASS / SOURCE_INSPECTION
physical-line policy                            PASS / SOURCE_INSPECTION
open-PR coordination                            PASS / no exact current production overlap found
```

Truthfully NOT_RUN:

```text
repository-native focused Node test             NOT_RUN / ENVIRONMENT_BLOCKED
repository-native vibration regression suite    NOT_RUN / ENVIRONMENT_BLOCKED
served-browser Vibration Integrity journey       NOT_RUN / ENVIRONMENT_BLOCKED
hosted PR status/workflow checks                 NOT_RUN / PR not allocated yet
independent numerical verification               NOT_APPLICABLE / no numerical change
```

Native Git transport was attempted and failed with:

```text
Could not resolve host: github.com
```

No source inspection or committed test source is represented as executable PASS.

## Coordination

PR686 is merged and is the direct foundation.

Open PR657 owns T1 identification presentation files (`vibration-integrity-identification-*`) and does not overlap this exact production surface.

This slice does not modify mechanism kernels, coverage/completeness contracts, EI aggregation, Project v2, source/master records, AIV calculation code, FIT calculation code, or the right-rail authority contract.

## Exact next action

1. Allocate one draft PR from this branch to current `main`.
2. Migrate WIP report/status/claim to the assigned PR number and retire WIP aliases.
3. Reconcile exact final PR head, file list, main drift, mergeability, reviews/threads, commit statuses and PR-triggered workflow runs.
4. Keep all native/browser checks `NOT_RUN` unless genuinely executed.
5. Do not merge without a new explicit Owner merge instruction.

## Appendix A — takeover questions

1. Why are equal `scenarioSnapshotHash` and `scenarioSetKey` insufficient after an identical facility rerun?
2. Why does the presentation layer need `runId` custody even though the mechanism equations are unchanged?
3. Why is the deterministic scenario-set key recomputed from `OperatingScenario[]` instead of trusting the workflow string?
4. Why must Mechanical/SBC currentness check both facility run basis and line/case scenario basis?
5. Why can AIV currentness use its existing facility-linked scenario plan rather than a new AIV-specific run object?
6. Why is `STALE_RESULT` retained inspection preserved instead of filtering all stale caches away?
7. Why is the shared matrix-context builder important for the advisory roadmap/right rail?
8. Which contract still owns required-mechanism completeness?
9. Why is this projector explicitly forbidden from determining a governing result?
10. Which executable validation remains required before a release-quality claim?
