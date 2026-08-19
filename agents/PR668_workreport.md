# PR668 — Executable right-rail case action

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTED_AWAITING_NATIVE_BROWSER_QUALIFICATION
WORK_INTENT: IMPLEMENT
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: STANDARD_PRESENTATION_NAVIGATION
REPOSITORY: reallaksh19/3D_Converters
PR: 668
BRANCH: agent/vibration-right-rail-case-action-20260819
BASE_BRANCH: main
BASE_SHA_AT_ALLOCATION: b9ffa16180a1fea017505f8e39775fb9f87523ac
REPORT_BASIS_HEAD: 164df6429f6e67955147e1095b8e4312160afd08
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_PR668
```

## Handover in 60 seconds

PR668 makes the merged #658 right-rail `Case next action` executable without changing the governed source or engineering meaning of the next action.

```text
VibrationLineCaseAssessmentStatus.v1.nextActionCode
-> navigation-only route
-> right-rail Open case task
-> existing vibration-roadmap-controller
-> existing data-vi-workspace-tab button.click()
-> existing Vibration Integrity workspace handler
```

Identification actions route to the existing `identification` workspace. Assessment-gap/review actions route to the existing `screening` workspace. Unsupported action codes fail closed and remain non-clickable.

## Authority boundary

`VIBRATION_WORKSPACE_NAVIGATION_AUTHORITY`:

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

Navigation cannot create or change applicability, completeness, case identity, persistence, numerical results, screening authority, engineering disposition, verification, design/code/safety/root-cause authority, or the source `nextActionCode`.

## Product behavior

The selected-assessment card renders `Open case task` only when the governed `nextActionCode` resolves to an existing central workspace. The roadmap controller validates that the button's `data-vibration-workspace-id` matches the route derived from the action code, then clicks the existing matching `data-vi-workspace-tab` control. It does not remount FIT or invoke Engineering Calculation definition routing.

## Coordination correction

An initial implementation touched `tabs/engineering-calculations-tab.js` and `tabs/vibration-integrity-tab.js`. Live claim inspection then showed open PR649 owns those exact files and shared UI/cache custody. Both edits were removed and the files restored byte-for-byte to current-main blobs:

```text
engineering-calculations-tab.js  f767f4b55dd1cbd86f5d1d54135f0f457d8b7352
vibration-integrity-tab.js        db71386f048fbc7b4891eacf9709a071825eda1f
```

Their unused backup copies were deleted. Neither path appears in PR668's effective diff. PR615's roadmap-controller claim is stale because PR615 is closed/merged. PR665, PR517 and PR539 remain active semantic neighbors with no exact-file overlap in the final scope.

## Changed-file ledger

All 12 hosted paths are explained:

```text
PRODUCT / TEST
  tabs/vibration-roadmap-workspace-routing.js
  tabs/vibration-roadmap-panel.js
  tabs/vibration-roadmap-controller.js
  tests/vibration-roadmap-case-action-routing.test.mjs

ROLLBACK EVIDENCE
  .backups/connector-20260819-vib-right-rail-case-action/tabs/vibration-roadmap-panel.js
  .backups/connector-20260819-vib-right-rail-case-action/tabs/vibration-roadmap-controller.js

PR RECOVERY AUTHORITY
  agents/PR668_workreport.md
  agents/status/PR668.yaml
  agents/claims/PR668.yaml

RELEASED WIP HISTORY
  agents/WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819_workreport.md
  agents/status/WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819.yaml
  agents/claims/WIP-VIB-RIGHT-RAIL-CASE-ACTION-20260819.yaml
```

Native `node utils/backup.js` remains `NOT_RUN / ENVIRONMENT_BLOCKED`; connector/Git-blob copies are rollback evidence, not a native backup PASS.

## Exact focused validation

Exact branch bytes were reconstructed locally and Git blob identities matched GitHub:

```text
workflow   e6f21bba96ca9eef5fb369f6a5fe0c35ccdf27e6
route      f2ed7234b9d332bf5a44e9b988a5c364a2ebb83f
panel      7e855d95897e12c665f75bfd404bf89fdc543e41
controller 6842ed5284cf9a1e5d3f21b5648ac6f0a42947a3
test       7d23327d09e189e7cb3bc1047fe9716bddb7c4ea
```

Executed:

```text
focused case-action routing test   PASS 6/6 / LOCAL_EXECUTION
panel syntax                       PASS / LOCAL_EXECUTION
controller syntax                  PASS / LOCAL_EXECUTION
exact Git blob identity            PASS / ARTIFACT_INSPECTION
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

## Hosted reconciliation basis

At `164df6429f6e67955147e1095b8e4312160afd08`:

```text
main                         b9ffa16180a1fea017505f8e39775fb9f87523ac
relation                     ahead 28 / behind 0
changed paths                12 intended / 0 unexplained
PR                           open / draft / mergeable
comments                     0
reviews                      0
review threads               0
commit status entries        0 -> NOT_RUN
PR-triggered workflow runs   0 -> NOT_RUN
```

Subsequent commits after this basis are recovery-report/status synchronization only unless product/test blob identity changes.

## Exact next action

Keep PR668 draft open. If further technical work occurs, re-ground and revalidate affected blobs. Do not merge without a new explicit owner authorization for PR668.
