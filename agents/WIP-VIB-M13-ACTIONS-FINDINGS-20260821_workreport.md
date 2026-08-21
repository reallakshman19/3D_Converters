# WIP-VIB-M13-ACTIONS-FINDINGS-20260821 — Required Actions / Findings

HANDOVER_READINESS: READY_FOR_PR
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: PR_ALLOCATION_READY
MAIN_HEAD_LAST_CHECKED: d8f109b2a1587d1d79dbe40b8787b7115e6fd5f0
PREDECESSOR_PR: 688 (MERGED)
MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR

## Mission
Implement the first M13 slice from issue #429 / VIB-INV-007: retain source/result-backed continuation obligations as first-class machine-readable required actions and derive findings from unresolved required actions rather than from numerical severity alone.

## Implemented contract
`VibrationFacilityActionLifecycle.v1` projects:

```text
currentActions[]
retainedStaleActions[]
findings[]
sourceConflicts[]
```

Required action shape includes the issue-429 fields:

```text
actionId
module
obligation
reason
completionState
```

plus mechanism/scope/result-state/source custody.

## First authorized producer
Only the existing FIT result continuation is admitted:

```text
continuationRequired === true
AND
screeningCandidateStatus === QUALIFIED_BOUNDED_SCREENING_FURTHER_ASSESSMENT_REQUIRED
```

It becomes:

```text
module          FIT
actionKey       FURTHER_ASSESSMENT
obligation      SHALL
completionState OPEN
```

The obligation is marked `CARRIED_FROM_SOURCE_RESULT_ONLY` and source scope `FIT-SCREENING-CANDIDATE-V1`.

A boolean/status mismatch fails closed as `FIT_CONTINUATION_STATUS_CONFLICT`; neither action nor finding is created.

## Finding rule
A finding is created only from a CURRENT_RESULT action where:

```text
obligation == SHALL
completionState == OPEN
```

Numerical LOF magnitude alone never creates an action or finding. STALE_RESULT retains historical actions for inspection but creates no current finding.

## Product integration
- live facility register now renders `Required actions / findings` from the canonical row lifecycle rather than directly checking `row.continuationRequired`;
- `FitRunEvidencePackage.v1` now includes the canonical facility `actionLifecycle`;
- no right-rail authority or blocking semantics were changed.

## Authority boundary

```text
engineeringAuthority      NONE
screeningAuthority        NOT_AUTHORIZED
designAuthority           false
numericalAuthority        NONE
aggregationAuthority      NONE
persistenceAuthority      NONE
determinesApplicability   false
determinesCompleteness    false
determinesGoverningResult false
blocksExecution           false
blocksNavigation          false
blocksCalculation         false
blocksPersistence         false
```

## Effective implementation/test paths

```text
converters/vibration/facility/action-lifecycle.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity-run-evidence.js
tests/vibration-facility-action-lifecycle.test.mjs
tests/vibration-integrity-run-evidence.test.mjs
```

Exact pre-edit Git-blob backups exist for the two edited product files and edited regression under `.backups/connector-20260821-vib-m13-actions-findings/`. An unused mechanisms backup was removed after scope narrowed.

## Falsifiers encoded
1. lifecycle is non-authorizing/non-blocking;
2. explicit FIT continuation creates one SHALL/OPEN action and one finding;
3. numerical magnitude alone creates no action/finding;
4. bare boolean without exact source status fails closed;
5. exact status without boolean fails closed;
6. stale action is retained but cannot create a current finding;
7. duplicate action identity is rejected;
8. live register and run evidence use the canonical lifecycle.

## Validation truth

```text
PASS     main/predecessor grounding                       HOSTED SOURCE
PASS     exact Git-blob backups                           CONNECTOR TREE/BLOB
PASS     open-PR coordination                             no overlapping M13 PR found
PASS     reconstructed contract syntax                    LOCAL EXECUTION
PASS     reconstructed core falsifiers                    5/5 LOCAL EXECUTION
PASS     diff normalization                               SOURCE INSPECTION
NOT_RUN  repository-native focused Node tests             ENVIRONMENT_BLOCKED
NOT_RUN  repository-native vibration regressions          ENVIRONMENT_BLOCKED
NOT_RUN  served-browser Vibration Integrity journey       ENVIRONMENT_BLOCKED
N/A      independent numerical verification               no numerical change
```

The reconstructed execution is supporting implementation evidence only; it is not repository-native qualification.

## Next after this first M13 slice
1. source-backed required actions from AIV/SBC/Mechanical as their methods expose explicit obligations;
2. controlled completion-state mutation with provenance and audit history;
3. finding closure/reopen semantics driven by action completion/currentness;
4. then M14 measurement/verification can satisfy/verify actions without replacing engineering authority.

## Appendix A — takeover questions
1. Why can a high LOF not create an action by itself?
2. Why are both FIT continuation boolean and exact candidate status required?
3. Why is the lifecycle authority NONE while the carried action says SHALL?
4. Why does a stale required action not create a current finding?
5. Why are monitoring/redesign/specialist actions absent in this slice?
6. Which contract still owns assessment completeness?
7. Why is completion mutation deferred?
8. How should M14 measurement evidence later relate to an action without becoming screening authority?
