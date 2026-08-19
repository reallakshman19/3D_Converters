# PR658 — Exact line/case workflow status + right-rail integration

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTED_AWAITING_NATIVE_BROWSER_QUALIFICATION
TAKEOVER_AUTHORITY: IMPLEMENTATION_QUALIFIED
REPOSITORY: reallaksh19/3D_Converters
PR: 658
BRANCH: agent/vibration-line-case-status-20260819
BASE_AT_REPLAY: 2c65a77368fbc8db61d77209b36871d985ff4b55
PRE_TAKEOVER_HEAD: b8488028541665ca888f7f6030bb26f51d59c44b
REPLAY_COMMIT: 839d5bb310f694b869b7bf59a75b26ed81fcbea3
PRODUCT_TEST_BASIS_HEAD: bcdf9160f8a2e3cd6f940c9e2e887af8e70950b6
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
```

## Handover in 60 seconds

PR658 now provides the governed exact selected-facility workflow source consumed by the merged #667 right rail:

```text
selected register row
  line + caseId + canonicalId
-> existing exact-scope T1 resolver
-> existing mechanism matrix
-> existing AssessmentCompleteness.v1
-> VibrationLineCaseAssessmentStatus.v1
-> transient VibrationIntegrityRoadmapAssessmentContext.v1
-> existing bubbling VIBRATION_ROADMAP_STATE_EVENT
-> right-panel Selected assessment card
```

The case card shows exact scope, line/case workflow state, case next action, EI completeness state and screening-evidence currentness. It does not create case identity, applicability, completeness or engineering authority.

Project `lineId` and the facility register `line` remain separate identities. No mapping between them is asserted because neither current Project v1 nor open Project-v2 PR665 establishes that governed mapping or a project case-subject collection.

## Re-ground / salvage

Original PR658 was 8 commits behind current main after merged verification/evidence foundations and #667. Drift did not touch the original five PR658 product/test paths.

The previously validated blobs were replayed byte-for-byte onto current main instead of merging stale history:

```text
tabs/vibration-integrity-assessment-status.js                dac55dfe7143369000ab6cbe196a8a4c84a329be
tabs/vibration-integrity-assessment-status-view.js           bf9b9b8179cd940db5d9a4c140b2e8ec10d3fae8
tabs/vibration-integrity-view.js                             4f905f8241713935bd56a99745b89823423053f1
tests/vibration-integrity-assessment-status.test.mjs         c4f19c330fd1913e45af8b5ff00542530170e1fd
tests/vibration-integrity-assessment-status-view.test.mjs    340c4704b58cd6c11f42cc815feee4e478e1fea1
```

Replay outcome: `CONTINUE_BYTE_PRESERVING_REPLAY`.

## Governed status source

`VibrationLineCaseAssessmentStatus.v1` remains:

```text
purpose                       LINE_CASE_WORKFLOW_STATUS_PROJECTION_ONLY
identificationStateSource     EXISTING_SCOPE_IDENTIFICATION_RESOLVER
completenessStateSource       AssessmentCompleteness.v1
determinesApplicability       false
determinesCompleteness        false
createsIdentificationEvidence false
numericalAuthority            NONE
engineeringAuthority          NONE
screeningAuthority            NOT_AUTHORIZED
designAuthority               false
safetyAuthority               false
codeCompliance                false
```

States remain:

```text
IDENTIFICATION_STATUS_UNAVAILABLE
IDENTIFICATION_MISSING
IDENTIFICATION_INCOMPLETE
IDENTIFICATION_INVALID
IDENTIFICATION_COVERAGE_INCOMPLETE
IDENTIFICATION_UNRESOLVED
REQUIRED_ASSESSMENT_INCOMPLETE
ASSESSMENT_INCOMPLETE
ASSESSMENT_COMPLETE
NOT_APPLICABLE
```

`ASSESSMENT_COMPLETE` means consumed `AssessmentCompleteness.v1 == COMPLETE` only. It is not safe/pass/design/code acceptance. `NOT_APPLICABLE` is consumed, not inferred.

## New transient right-rail context

`tabs/vibration-integrity-roadmap-bridge.js`

```text
schema                   VibrationIntegrityRoadmapAssessmentContext.v1
purpose                  SELECTED_REGISTER_SCOPE_WORKFLOW_CONTEXT_ONLY
statusSource             VibrationLineCaseAssessmentStatus.v1
determinesApplicability  false
determinesCompleteness   false
createsCaseIdentity      false
persistenceAuthority     NONE
engineeringAuthority     NONE
screeningAuthority       NOT_AUTHORIZED
designAuthority          false
```

Bridge blob:

```text
edcc600949538b10721582d4c135e5759a1c686f
```

The bridge re-resolves exact-scope T1 evidence, builds the existing mechanism matrix and consumes #658 status. It does not persist the selected case.

## Existing event seam

`tabs/vibration-integrity-tab.js` publishes `selectedAssessment` through the existing `VIBRATION_ROADMAP_STATE_EVENT` using `bubbles: true`. Teardown publishes `selectedAssessment = null`.

Edited tab blob:

```text
db71386f048fbc7b4891eacf9709a071825eda1f
```

No second router/event family was added.

## Right-panel fail-closed behavior

`tabs/vibration-roadmap-panel.js` now renders the selected-assessment card only when both envelopes are governed:

```text
selected context schema + authority purpose
status schema + authority purpose
determinesApplicability=false
determinesCompleteness=false
createsCaseIdentity=false
persistenceAuthority=NONE
```

A schema-shaped event without these authority envelopes is ignored. The card explicitly says:

```text
Exact register scope · project mapping not asserted · workflow projection only
```

Current panel blob:

```text
71eabe230f1800314bd90bdc96121bf9aa43862a
```

CSS blob:

```text
af3fbcf5806edd2ba8c86d56ed1b240facf51b55
```

Pre-edit rollback copies are under `.backups/connector-20260819-vib-linecase-roadmap/`. Native `node utils/backup.js` remains `NOT_RUN / ENVIRONMENT_BLOCKED`.

## Focused regression

`tests/vibration-roadmap-linecase-context.test.mjs` current blob:

```text
14ff67723fd6ccd4de7f4a46424cd7ef1bf18452
```

It covers:
1. no selected row => no exact assessment context;
2. exact line/case/canonical state + next-action rendering;
3. no context => no invented case card;
4. missing authority envelope => fail closed/no card;
5. existing bubbling roadmap event seam and clear-on-destroy;
6. bridge remains non-applicability/non-completeness/non-case-identity/non-persistence authority.

## Coordination

```text
PR667  MERGED right-rail predecessor; consume current main only; its on-main MERGE_AUTHORIZED_PENDING claim is stale post-merge metadata
PR665  OPEN Project-v2 persistence/currentness; no exact file overlap; no project-case identity source; no dependency here
PR657  OPEN stale presentation neighbor; not consumed as authority
```

No AIV/FIT equation, coefficient, tolerance, unit, method/master, production-freeze authority, governing LOF, project persistence/currentness or workflow file is changed.

## Validation truth

Inherited exact-byte supporting evidence:

```text
status contract narrow reconstruction    PASS 9/9 / LOCAL_EXECUTION / unchanged exact blobs
```

Current product/test source/artifact evidence:

```text
main drift + overlap classification                    PASS / SOURCE_INSPECTION
byte-preserving replay                                  PASS / ARTIFACT_INSPECTION
bridge consumes governed #658 status                    PASS / SOURCE_INSPECTION
no applicability/completeness/case identity creation    PASS / SOURCE_INSPECTION
existing roadmap event seam reused                      PASS / SOURCE_INSPECTION
clear selected context on teardown                      PASS / SOURCE_INSPECTION
right rail requires governed authority envelopes        PASS / SOURCE_INSPECTION
right rail labels project mapping as not asserted       PASS / SOURCE_INSPECTION
new JS source-size policy                               PASS / ARTIFACT_INSPECTION
```

Still truthfully NOT_RUN:

```text
new line/case right-rail regression                     NOT_RUN / ENVIRONMENT_BLOCKED
repository-native focused/regression suites             NOT_RUN / ENVIRONMENT_BLOCKED
served browser selected-row -> right-rail journey       NOT_RUN / ENVIRONMENT_BLOCKED
native backup CLI                                       NOT_RUN / ENVIRONMENT_BLOCKED
independent numerical verification                      NOT_APPLICABLE / no numerical change
```

A local `git ls-remote` attempt could not resolve `github.com`; connector/Git-blob copies are rollback evidence only.

## Intended changed paths

```text
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-integrity-tab.js
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-roadmap-panel.css
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-roadmap-panel.js
agents/PR658_workreport.md
agents/claims/PR658.yaml
agents/status/PR658.yaml
tabs/vibration-integrity-assessment-status-view.js
tabs/vibration-integrity-assessment-status.js
tabs/vibration-integrity-roadmap-bridge.js
tabs/vibration-integrity-tab.js
tabs/vibration-integrity-view.js
tabs/vibration-roadmap-panel.css
tabs/vibration-roadmap-panel.js
tests/vibration-integrity-assessment-status-view.test.mjs
tests/vibration-integrity-assessment-status.test.mjs
tests/vibration-roadmap-linecase-context.test.mjs
```

## Takeover qualification

```text
A1 production trace          20/20
A2 failure isolation         20/20
A3 authority/invariants      20/20
A4 independent validation    17/20
A5 minimal patch             20/20
TOTAL                        97/100
RESULT                       IMPLEMENTATION TAKEOVER QUALIFIED
```

A4 is deliberately limited because current-head repository-native and browser execution are unavailable.

## Exact next action

Refresh live `main`, PR head/mergeability, compare, reviews/comments/threads, commit statuses and PR-triggered workflow runs. Keep #658 draft/open. Do not merge without a separate explicit owner authorization for PR658.
