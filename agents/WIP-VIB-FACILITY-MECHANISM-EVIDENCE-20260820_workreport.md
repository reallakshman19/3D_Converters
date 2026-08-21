# WIP-VIB-FACILITY-MECHANISM-EVIDENCE-20260820 — Facility Mechanism Evidence Envelope

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: READY_FOR_PR_ALLOCATION
BRANCH: agent/vib-facility-mechanism-evidence-20260820
BASE_SHA_AT_START: db5f9e250edfa6fa01097b02ff71b1737ea78436
MAIN_HEAD_LAST_CHECKED: cd02030d7d28438ddda8e11ac92acb319cd06cd9
IMPLEMENTATION_HEAD_BEFORE_RECOVERY_SYNC: 8b6e1c705aa182589cf44bfc39cdd0ba51efbfbd
PREDECESSOR_PR: 684 (MERGED)
PREDECESSOR_MERGE: db5f9e250edfa6fa01097b02ff71b1737ea78436
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission

Add a non-authorizing facility mechanism-evidence envelope layered on the existing FIT run snapshot/evidence so current Mechanical, SBC, and facility-linked AIV evidence can be proven to belong to the same facility run and scenario-set snapshot.

The slice deliberately does **not** rename or replace `FitRunSnapshot.v1` or `FitRunEvidencePackage.v1`. FIT reproducibility evidence remains the existing package; this change adds sibling facility mechanism custody under that export.

## Runtime/evidence chain

```text
CURRENT facility run
  FitRunSnapshot.v1
    runId
  VibrationFacilityFitWorkflow.v1
    datasetId
    OperatingScenario.v1[]
    result.scenarioSetKey
        |
        +-> VibrationFacilityRunBasis.v1
        |     runId + datasetId + scenarioSetKey
        |
        +-> Mechanical facility result
        |     exact scenarioExecutionBasis
        |     exact facilityRunBasis
        |
        +-> SBC Type-3 facility result
        |     exact scenarioExecutionBasis
        |     exact facilityRunBasis
        |
        +-> AIV linked session
              facilityRunId + datasetId + scenarioSetKey
                    |
                    v
VibrationFacilityMechanismEvidence.v1
  currentEvidence[]
  excludedEvidence[] = STALE_OR_FOREIGN
```

## Permanent authority boundary

`VibrationFacilityRunBasis.v1` and `VibrationFacilityMechanismEvidence.v1` are custody/reproducibility contracts only.

```text
engineeringAuthority      NONE
screeningAuthority        NOT_AUTHORIZED
designAuthority           false
numericalAuthority        NONE
aggregationAuthority      NONE
persistenceAuthority      NONE
determinesApplicability   false
determinesCompleteness    false
blocksExecution           false
blocksNavigation          false
blocksCalculation         false
blocksPersistence         false
```

These contracts do not replace `AssessmentCompleteness.v1`, EI main-line aggregation, mechanism applicability, source/master qualification, or any numerical method.

The existing Mechanical/SBC facility execution guards still require current scenario/run custody as an execution-integrity precondition. The new evidence envelope itself is not a product gate.

## Engineering/currentness findings

### ISS-001 — identical rerun can reuse scenario hashes

A rerun with byte-identical engineering inputs can preserve both `scenarioSnapshotHash` and `scenarioSetKey` while creating a new facility `runId`. Scenario equality alone therefore cannot prove that a cached secondary-mechanism result belongs to the latest facility run.

Resolution:

```text
VibrationFacilityRunBasis.v1 = runId + datasetId + scenarioSetKey
```

Mechanical and SBC facility results retain that basis at evaluation time. AIV already carries `facilityRunId` through the merged #684 execution plan. The evidence envelope requires exact run-basis identity before admitting a numerical result as current facility evidence.

### ISS-002 — FIT result success must not own secondary-mechanism scenario validity

A FIT row can be `NOT_ASSESSED_DATA_INCOMPLETE` while the line/case still has a valid `OperatingScenario.v1` usable by another mechanism. Requiring `row.scenarioExecutionBasis` would incorrectly couple Mechanical/SBC validity to FIT calculation success.

Resolution: the evidence envelope resolves the current scenario directly from `workflow.operatingScenarios` when the FIT register row has no execution basis. A focused falsifier proves a FIT-incomplete row can admit same-run Mechanical evidence.

### ISS-003 — row basis and linked AIV session must themselves be current

Resolution:
- a register row carrying an execution basis that disagrees with the workflow OperatingScenario now fails closed;
- linked AIV evidence requires `resultState === CURRENT_RESULT` in addition to run/scenario-set custody;
- standalone AIV remains explicitly excluded from facility evidence.

## Current changed-file ledger

Production/contracts:

```text
converters/vibration/facility/run-basis.js
converters/vibration/facility/mechanism-evidence.js
tabs/vibration-integrity-mechanical-controller.js
tabs/vibration-integrity-run-evidence.js
tabs/vibration-integrity-sbc-scenario-execution.js
tabs/vibration-integrity-sbc-type3-controller.js
```

Tests:

```text
tests/vibration-facility-mechanism-evidence.test.mjs
tests/vibration-integrity-run-evidence.test.mjs
tests/vibration-runtime-scenario-guard.test.mjs
```

Connector-side pre-edit backups:

```text
.backups/connector-20260820-vib-facility-mechanism-evidence/tabs/vibration-integrity-mechanical-controller.js
.backups/connector-20260820-vib-facility-mechanism-evidence/tabs/vibration-integrity-run-evidence.js
.backups/connector-20260820-vib-facility-mechanism-evidence/tabs/vibration-integrity-sbc-scenario-execution.js
.backups/connector-20260820-vib-facility-mechanism-evidence/tabs/vibration-integrity-sbc-type3-controller.js
.backups/connector-20260820-vib-facility-mechanism-evidence/tests/vibration-integrity-run-evidence.test.mjs
.backups/connector-20260820-vib-facility-mechanism-evidence/tests/vibration-runtime-scenario-guard.test.mjs
```

Recovery:

```text
agents/WIP-VIB-FACILITY-MECHANISM-EVIDENCE-20260820_workreport.md
agents/status/WIP-VIB-FACILITY-MECHANISM-EVIDENCE-20260820.yaml
agents/claims/WIP-VIB-FACILITY-MECHANISM-EVIDENCE-20260820.yaml
```

Total effective paths before PR allocation: 18.

## Diff-quality reconciliation

A connector whole-file write initially created formatting churn. That churn was removed before PR allocation.

Current semantic deltas against `main` for modified production files are bounded:

```text
tabs/vibration-integrity-mechanical-controller.js      +22 / -4
tabs/vibration-integrity-run-evidence.js               +17 / -0
tabs/vibration-integrity-sbc-scenario-execution.js     +21 / -5
tabs/vibration-integrity-sbc-type3-controller.js       +10 / -7
```

The new physical files remain below the repository 300-line policy:

```text
run-basis.js                              83 lines
mechanism-evidence.js                    224 lines
vibration-facility-mechanism-evidence.test.mjs 275 lines
```

The modified SBC controller was explicitly reduced below 300 physical lines after the first verbose wiring draft.

## Falsifiers encoded

`tests/vibration-facility-mechanism-evidence.test.mjs` covers:

- envelope has no applicability/completeness/governing/blocking authority;
- exact Mechanical SCREENING evidence admitted;
- exact SBC CANDIDATE evidence admitted without authority promotion;
- stale scenario snapshot excluded without retaining numerical value;
- identical rerun with same scenario hashes but different runId excludes old Mechanical/SBC;
- standalone AIV excluded;
- non-current linked AIV excluded;
- exact current facility-linked AIV admitted at assessment scope only;
- identical rerun excludes old AIV by facilityRunId;
- source-line-only scenario-set drift excluded while runId is held constant;
- FIT-incomplete row can still admit same-run Mechanical evidence from current OperatingScenario;
- stale register-row scenario basis fails closed;
- foreign scenario-set register row fails closed.

`tests/vibration-runtime-scenario-guard.test.mjs` additionally proves the SBC callback receives the originating facility run basis while retaining the existing stale-snapshot pre-callback guard.

`tests/vibration-integrity-run-evidence.test.mjs` asserts the existing FIT evidence export now contains the sibling non-authorizing mechanism envelope.

## Validation truth

Executed supporting validation:

```text
current main/source grounding                         PASS / SOURCE_INSPECTION
predecessor #684 merged                              PASS / HOSTED SOURCE
main drift classification                            PASS / PR685 HP-only, no exact vibration-file overlap
diff normalization                                   PASS / SOURCE_INSPECTION
physical-line policy                                 PASS / SOURCE_INSPECTION
reconstructed run-basis syntax                       PASS / LOCAL_EXECUTION exact source bytes
reconstructed mechanism-evidence syntax              PASS / LOCAL_EXECUTION exact source bytes
reconstructed custody falsifiers                     PASS / LOCAL_EXECUTION with faithful dependency stubs
```

The reconstructed execution proves current/stale/run/scenario-set behavior of the exact new custody modules. It is supporting implementation evidence only.

Truthfully NOT_RUN:

```text
repository-native focused Node tests                 NOT_RUN / ENVIRONMENT_BLOCKED
repository-native vibration regression suite         NOT_RUN / ENVIRONMENT_BLOCKED
served-browser Vibration Integrity acceptance         NOT_RUN / ENVIRONMENT_BLOCKED
hosted PR checks                                     NOT_RUN until PR exists / no inference
independent numerical verification                    NOT_APPLICABLE / no equation or coefficient change
```

Native clone remains unavailable in this runtime because direct GitHub DNS resolution fails. The `.backups/connector-*` files are exact connector-side pre-edit copies and are not represented as native `utils/backup.js` execution.

## Main drift / coordination

Current `main` advanced after branch creation to:

```text
cd02030d7d28438ddda8e11ac92acb319cd06cd9
PR #685 · HP product-matrix full-app browser qualification
```

That commit is HP-only and has no exact overlap with this slice. Current relation before recovery sync is `ahead 33 / behind 1`; the branch is intentionally not force-rewritten in the connector runtime merely to absorb an unrelated merge.

Open vibration PRs inspected for coordination include #540, #665, #657, #655, #653, #649, #571, #546 and #508. No exact changed-file collision was found with the current production/test paths of this slice. Their engineering/source/persistence authorities remain independent.

## Exact next action

1. Allocate one draft PR from `agent/vib-facility-mechanism-evidence-20260820` to `main`.
2. Migrate this WIP report/status/claim to `PR<NUMBER>` recovery authority and retire WIP aliases.
3. Reconcile exact PR changed files, mergeability, reviews/threads, status contexts and PR-triggered workflow runs.
4. Keep repository-native/browser execution `NOT_RUN` until genuinely executed.
5. Do not merge without explicit Owner authorization.

## Appendix A — takeover questions

1. Why is `scenarioSnapshotHash` insufficient to distinguish two identical facility reruns?
2. Why must `runId` be retained on Mechanical/SBC evidence rather than inferred at export time?
3. Why may a FIT-incomplete row still have a valid Mechanical/SBC OperatingScenario?
4. Why does the evidence envelope use the workflow OperatingScenario as currentness authority instead of trusting an existing row basis blindly?
5. Why must standalone AIV remain excluded even when its numerical calculation is successful?
6. Why is SBC retained as `CANDIDATE` while Mechanical direct T2.3 may retain its existing SCREENING authority?
7. Why must excluded stale/foreign evidence not retain a numerical value in the current-evidence projection?
8. Which separate contract still determines required-mechanism completeness, and why must this envelope not duplicate it?
9. What exact three identities establish facility custody in this slice?
10. What validation remains NOT_RUN before a release-quality claim can be made?
