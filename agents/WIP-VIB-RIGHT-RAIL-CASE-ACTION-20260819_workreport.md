# WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819 — executable selected-case workflow action

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: STANDARD_PRESENTATION_NAVIGATION
REPOSITORY: reallaksh19/3D_Converters
BASE_BRANCH: main
BASE_SHA: b9ffa16180a1fea017505f8e39775fb9f87523ac
BRANCH: agent/vibration-right-rail-case-action-20260819
STATE: IMPLEMENTED_AWAITING_PR_ALLOCATION
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_FOLLOW_ON
```

## Handover in 60 seconds

This slice makes the merged #658 right-rail `Case next action` executable while keeping `VibrationLineCaseAssessmentStatus.v1.nextActionCode` as the sole source of the displayed next action.

Final route:

```text
governed selected assessment
-> nextActionCode
-> navigation-only action/workspace map
-> right-rail Open case task button
-> existing vibration-roadmap-controller click handler
-> existing visible data-vi-workspace-tab button.click()
-> existing Vibration Integrity workspace tab handler
```

No FIT product remount, no project/persistence mutation, no applicability/completeness calculation, and no new engineering authority are introduced.

## Product behavior

Supported identification actions open the existing `identification` workspace. Supported assessment-gap/review actions open the existing `screening` workspace. Unknown next-action codes stay visible but have no executable route.

`tabs/vibration-roadmap-workspace-routing.js` is navigation-only and declares:

```text
purpose                 RIGHT_RAIL_WORKSPACE_NAVIGATION_ONLY
nextActionSource        VibrationLineCaseAssessmentStatus.v1
determinesNextAction    false
determinesApplicability false
determinesCompleteness  false
createsCaseIdentity     false
persistenceAuthority    NONE
engineeringAuthority    NONE
screeningAuthority      NOT_AUTHORIZED
designAuthority         false
```

## Coordination correction

An initial route attempted to edit `tabs/engineering-calculations-tab.js` and `tabs/vibration-integrity-tab.js`. Live coordination then showed PR649 has an ACTIVE exclusive/coordinated claim over those exact shared UI/cache-custody paths.

Mutation stopped. Both files were restored byte-for-byte to current-main Git blobs:

```text
engineering-calculations-tab.js  f767f4b55dd1cbd86f5d1d54135f0f457d8b7352
vibration-integrity-tab.js        db71386f048fbc7b4891eacf9709a071825eda1f
```

The unused backups for those shared files were deleted. They are absent from the effective branch diff. Final routing lives entirely in the roadmap layer. PR615's apparent roadmap-controller claim is stale because PR615 is merged/closed.

## Final intended product/test paths

```text
tabs/vibration-roadmap-workspace-routing.js
tabs/vibration-roadmap-panel.js
tabs/vibration-roadmap-controller.js
tests/vibration-roadmap-case-action-routing.test.mjs
```

Rollback evidence:

```text
.backups/connector-20260819-vib-right-rail-case-action/tabs/vibration-roadmap-panel.js
.backups/connector-20260819-vib-right-rail-case-action/tabs/vibration-roadmap-controller.js
```

Native `node utils/backup.js` is `NOT_RUN / ENVIRONMENT_BLOCKED`; connector/Git-blob copies are rollback evidence only.

## Exact focused validation

Minimal local reconstruction used exact committed branch bytes. Git blob identities matched GitHub:

```text
workflow   e6f21bba96ca9eef5fb369f6a5fe0c35ccdf27e6
route      f2ed7234b9d332bf5a44e9b988a5c364a2ebb83f
panel      7e855d95897e12c665f75bfd404bf89fdc543e41
controller 6842ed5284cf9a1e5d3f21b5648ac6f0a42947a3
test       7d23327d09e189e7cb3bc1047fe9716bddb7c4ea
```

Executed evidence:

```text
focused case-action routing test   PASS 6/6 / LOCAL_EXECUTION / exact blobs
panel syntax                       PASS / LOCAL_EXECUTION
controller syntax                  PASS / LOCAL_EXECUTION
new JS line policy                 PASS: route 39; test 100
controller physical lines          283
panel physical lines               166
```

Still NOT_RUN:

```text
repository-native broader vibration regressions  NOT_RUN / ENVIRONMENT_BLOCKED
served browser case-action journey                NOT_RUN / ENVIRONMENT_BLOCKED
native backup CLI                                 NOT_RUN / ENVIRONMENT_BLOCKED
independent numerical verification                NOT_APPLICABLE / no numerical change
```

## Current reconciliation

```text
main       b9ffa16180a1fea017505f8e39775fb9f87523ac
relation   ahead 18 / behind 0
paths      9 intended / 0 unexplained
```

## Authority invariants

Do not change:
- `VibrationLineCaseAssessmentStatus.v1` next-action semantics;
- mechanism applicability or `AssessmentCompleteness.v1`;
- project case/line identity or persistence;
- AIV PF-02 / FIT production-freeze logic;
- numerical methods/masters/results;
- engineering disposition, verification, design/code/safety/root-cause authority;
- PR649 shared cache custody;
- workflow files.

## Exact next action

Open one draft PR for this navigation slice, migrate recovery custody to PR-numbered artifacts, reconcile hosted checks/reviews/changed paths, and leave merge authority owner-only.
