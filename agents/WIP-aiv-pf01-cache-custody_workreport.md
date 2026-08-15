# WIP-aiv-pf01-cache-custody — PF-01 deployment/cache recovery

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MUTATION_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
BRANCH: agent/aiv-pf01-cache-custody-20260815
BASE_MAIN: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
GROUNDING_EPOCH: 2026-08-15T20:27+04:00
CURRENT_STAGE: IMPLEMENTED_SOURCE_VALIDATION
EXACT_NEXT_ACTION: open draft PR, rename this report to PR identity, then run exact deployed production workflow and confirm the browser module chain carries 20260815-aiv-pf01-cache-1 and the caseId exception is absent.
```

## Handover in 60 Seconds

Owner reproduced the original PF-01 exception **after PR #519 merged**:

```text
vibration-aiv-canvas-filter.js:33
TypeError: Cannot read properties of null (reading 'caseId')
```

The decisive evidence is the live module URL:

```text
vibration-aiv-qualification-tab.js?v=aiv-qualification-1
```

Current `main@e97effb...` already contains:

```text
createAivCanvasFilterState: input = input ?? {}
engineering-calculations-tab: aiv-qualification-2
```

Therefore the repeated browser failure is a stale runtime/deployment cache-custody defect, not a failure of the null guard.

## Root cause

The prior PF-01 merge changed a leaf module URL only. The production shell had unchanged cache identities upstream and bare imports downstream:

```text
index.html
 -> main-rhbg-fitguard.js?v=20260804-fbx-multifamily-release-1
 -> core/app.js?v=20260804-fbx-multifamily-release-1
 -> engineering-tabs-extension.js?v=engineering-1
 -> engineering-workspace-tab.js?v=engineering-workspace-1
 -> engineering-calculations-tab.js?v=engineering-console-2
 -> vibration-aiv-qualification-tab.js?v=aiv-qualification-2
 -> vibration-aiv-canvas-controller.js          [bare]
 -> vibration-aiv-canvas-filter.js              [bare]
```

A browser could therefore assemble a new/old mixed ES-module graph and continue executing the pre-fix filter.

## Implementation

One release key is carried through every cache-sensitive edge required to reach the corrected filter:

```text
20260815-aiv-pf01-cache-1
```

Chain:

```text
index.html
 -> main-rhbg-fitguard.js?v=20260815-aiv-pf01-cache-1
 -> core/app.js?v=20260815-aiv-pf01-cache-1
 -> engineering-tabs-extension.js?v=20260815-aiv-pf01-cache-1
 -> engineering-workspace-tab.js?v=20260815-aiv-pf01-cache-1
 -> engineering-calculations-tab.js?v=20260815-aiv-pf01-cache-1
 -> vibration-aiv-qualification-tab.js?v=20260815-aiv-pf01-cache-1
 -> vibration-aiv-canvas-controller.js?v=20260815-aiv-pf01-cache-1
 -> vibration-aiv-canvas-filter.js?v=20260815-aiv-pf01-cache-1
```

The filter implementation itself is unchanged from merged PF-01 and retains `input = input ?? {};`.

## Scope / negative assurance

No changes to:

- AIV equations, coefficients, tolerances or numerical oracles;
- readiness/calculator executable contract;
- simultaneous-source grouping;
- master data or provenance authority;
- physical-distance authority;
- Assessment screening authority;
- export semantics;
- workflow files.

Only module cache identity and one regression registration are changed.

## Coordination

```text
#517 PF-02 changed files: evidence/status only; no overlap
#518 PF-03 changes kernel + canvas integration benchmark; no exact-file overlap
```

Coordination classification: SAFE for exact files and authority scope.

## Backup / rollback custody

Repository backup CLI is NOT_RUN because the connector environment has no native private checkout. Exact pre-edit Git blobs on `main@e97effb...` are rollback custody:

```text
index.html                              888c13df7c61c32e0b1330424b571341d702d44f
main-rhbg-fitguard.js                   4def9d6e828ee0326fc40ea0f082f69e95a6bcf2
core/app.js                             b4a50be2f31fb10e20b66437c4ce4a1f0e2615d6
core/engineering-tabs-extension.js      f8bb1300e97e485b43ac2f708725bf6c517ca337
tabs/engineering-workspace-tab.js       dfe796364a92fc9f7eca174cc853e21959c79da3
tabs/engineering-calculations-tab.js    04b5f1340b0300dd582a4d659af3079c2c847251
tabs/vibration-aiv-qualification-tab.js 41e2432af389994fa259f7c7de4103710c34118d
tabs/vibration-aiv-canvas-controller.js 9c7af05425cdf763e668ae38c83ba3dde594990e
package.json                            a558ff66e06d43f735fc6ab8e4303a477e975ce6
```

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| owner post-merge live failure | PASS_REPRODUCED | USER_SUPPLIED | NONE |
| current main contains null guard | PASS | SOURCE_INSPECTION | NONE |
| live browser token differs from current main token | PASS | USER_SUPPLIED + SOURCE_INSPECTION | NONE |
| changed-file scope | PASS | Git compare: 9 one-line production/config changes + 1 test | NONE |
| cache-custody regression added | PASS_IMPLEMENTED | SOURCE_INSPECTION | IMPLEMENTATION_COUPLED |
| native `verify:aiv-canvas` | NOT_RUN | no native private checkout | MIXED |
| full production Chromium after deployment | NOT_RUN | requires merged/deployed exact head | PRODUCT |
| EI D.2.3 numerical oracle | NOT_APPLICABLE_TO_CACHE_CHANGE | numerical implementation unchanged | AUTHORITATIVE_REFERENCE |

## Acceptance after deployment

Browser Network / stack must show the release key, not the old token:

```text
20260815-aiv-pf01-cache-1
```

Then execute:

```text
Open AIV -> import/load EI example -> Check Readiness -> Run Screening
```

PASS requires zero `caseId` exception. Any remaining error must be captured as the next live defect; do not alter AIV numerical authority in this cache slice.
