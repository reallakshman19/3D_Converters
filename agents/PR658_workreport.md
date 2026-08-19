# PR658 — Exact line/case workflow status + right-rail integration

# CURRENT RECOVERY STATE — READ FIRST

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: IMPLEMENTED_AWAITING_NATIVE_BROWSER_QUALIFICATION
TAKEOVER_AUTHORITY: IMPLEMENTATION_QUALIFIED

EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

REPOSITORY: reallaksh19/3D_Converters
PR_OR_WIP: PR658
BRANCH: agent/vibration-line-case-status-20260819
BASE_BRANCH: main
BASE_AT_REPLAY: 2c65a77368fbc8db61d77209b36871d985ff4b55
PRE_TAKEOVER_HEAD: b8488028541665ca888f7f6030bb26f51d59c44b
REPLAY_COMMIT: 839d5bb310f694b869b7bf59a75b26ed81fcbea3
REPORT_BASIS_HEAD: 00554e0c48c2103eda0793424d7f2e0408aa92d7
GROUNDING_EPOCH: GE-003-2026-08-19

CURRENT_STAGE: RECONCILE
HIGHEST_RISK: selected facility scope being mistaken for project line identity or workflow status being mistaken for engineering acceptance
EXACT_NEXT_ACTION: refresh hosted PR/check/review state; run repository-native and browser qualification when available; do not merge without explicit owner authorization
```

## Handover in 60 seconds

PR658 now owns the exact selected-facility workflow-state path into the merged #667 right rail.

```text
selected Vibration Integrity register row
  line + caseId + canonicalId
-> existing exact-scope T1 identification resolver
-> existing mechanism matrix
-> existing AssessmentCompleteness.v1
-> VibrationLineCaseAssessmentStatus.v1
-> VibrationIntegrityRoadmapAssessmentContext.v1 (transient only)
-> existing VIBRATION_ROADMAP_STATE_EVENT
-> #667 right rail
```

The right rail can now show the selected assessment scope, the consumed line/case workflow state, and the case next action. It does not create case identity, applicability, completeness, numerical authority, project persistence, engineering disposition, or safety/design/code authority.

Project line selection and facility-register scope remain explicitly separate because no governed mapping currently proves that project `lineId` equals the register `line` key.

## Live grounding / takeover history

Original PR658 was built on `767ccd16...` and later became 8 commits behind `main`. Current main at takeover was:

```text
2c65a77368fbc8db61d77209b36871d985ff4b55
feat(vibration): make right roadmap action-first (#667)
```

The 8-commit drift did not modify the original PR658 product/test paths. The relevant new UI predecessor was merged PR667, which owns right-rail presentation only and explicitly excludes PR658's status authority domain.

The old branch head is preserved as provenance:

```text
b8488028541665ca888f7f6030bb26f51d59c44b
```

Rather than merge stale history, the previously validated five PR658 product/test blobs were replayed byte-for-byte onto current main in commit:

```text
839d5bb310f694b869b7bf59a75b26ed81fcbea3
```

Preserved blob identities:

```text
tabs/vibration-integrity-assessment-status.js          dac55dfe7143369000ab6cbe196a8a4c84a329be
tabs/vibration-integrity-assessment-status-view.js     bf9b9b8179cd940db5d9a4c140b2e8ec10d3fae8
tabs/vibration-integrity-view.js                       4f905f8241713935bd56a99745b89823423053f1
tests/vibration-integrity-assessment-status.test.mjs   c4f19c330fd1913e45af8b5ff00542530170e1fd
tests/vibration-integrity-assessment-status-view.test.mjs 340c4704b58cd6c11f42cc815feee4e478e1fea1
```

Outcome: `CONTINUE` via byte-preserving replay, not blind stale-branch merge.

## Existing line/case status authority retained

`VibrationLineCaseAssessmentStatus.v1` consumes existing sources only:

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

Workflow states remain:

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

`ASSESSMENT_COMPLETE` means only consumed `AssessmentCompleteness.v1 == COMPLETE`. It is not safe/pass/design/code acceptance. `NOT_APPLICABLE` is consumed and never inferred.

## New selected-assessment bridge

### `tabs/vibration-integrity-roadmap-bridge.js`

New schema:

```text
VibrationIntegrityRoadmapAssessmentContext.v1
```

Permanent authority:

```text
purpose                 SELECTED_REGISTER_SCOPE_WORKFLOW_CONTEXT_ONLY
statusSource            VibrationLineCaseAssessmentStatus.v1
determinesApplicability false
determinesCompleteness  false
createsCaseIdentity     false
persistenceAuthority    NONE
engineeringAuthority    NONE
screeningAuthority      NOT_AUTHORIZED
designAuthority         false
```

The bridge:
1. reads the already-selected register `rowKey`;
2. resolves exact-scope identification evidence using the existing resolver;
3. builds the existing mechanism matrix from current workspace state;
4. consumes the resulting `AssessmentCompleteness.v1` through `VibrationLineCaseAssessmentStatus.v1`;
5. emits only a transient presentation context.

Current bridge blob:

```text
edcc600949538b10721582d4c135e5759a1c686f
```

## Existing event seam reused

`tabs/vibration-integrity-tab.js` now publishes `selectedAssessment` through the already-existing `VIBRATION_ROADMAP_STATE_EVENT` with `bubbles: true`.

No second router or event family is added. The existing engineering-calculations parent owns the roadmap controller, so the child FIT workspace event reaches the current controller. Teardown publishes `selectedAssessment = null` before destruction.

Pre-edit backup:

```text
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-integrity-tab.js
source blob ba7a3b6bd2946ea0757df79d7bfa842332ecbbce
```

Current edited blob:

```text
db71386f048fbc7b4891eacf9709a071825eda1f
```

## Right-rail behavior

`tabs/vibration-roadmap-panel.js` keeps #667's generic workflow and adds a selected-assessment card above generic roadmap attention only when exact context is present.

The card shows:

```text
Selected assessment
<line> · <case>
<canonicalId>
<line/case workflow state>
Case next action
<human-readable action>
EI <completeness state> · Screening <evidence currentness>
Exact register scope · workflow projection only
```

It does not fabricate a case when no selected row exists.

Current panel blob:

```text
7a2424a445f62740370af52ffc5b172b0f373a31
```

Current panel CSS blob:

```text
af3fbcf5806edd2ba8c86d56ed1b240facf51b55
```

Pre-edit copies are retained under `.backups/connector-20260819-vib-linecase-roadmap/`.

## Case identity boundary

This PR does **not** add a project-level case picker and does not persist selected facility case.

Current Project v1 has governed project lines but no governed project case-subject collection. Open Project-v2 PR665 persists exact-scope evidence/currentness but also does not establish a project case-subject identity source or a governed mapping from project `lineId` to the facility register's `line` field.

Therefore:
- selected register scope is shown exactly as `line + caseId + canonicalId`;
- project line picker remains its existing independent project control;
- no equality or mapping between those identities is asserted;
- future integration must introduce/consume an explicit governed mapping before synchronizing them.

## Coordination

```text
PR667  MERGED predecessor; right-rail presentation foundation only; its main claim is stale post-merge metadata
PR665  OPEN Project-v2 persistence/currentness; no exact file overlap; no dependency and no persistence mutation here
PR658  sole current owner of VIBRATION_LINE_CASE_ASSESSMENT_STATUS_PROJECTION
```

Coordination state: `SAFE_WITH_EXPLICIT_IDENTITY_BOUNDARY`.

No AIV/FIT equation, master, tolerance, unit, numerical method, screening-governing calculation, or production-freeze path is touched.

## Validation ledger

### Inherited exact-byte evidence

The replayed status module/test blobs are byte-identical to the previously executed narrow reconstruction:

```text
status contract focused reconstruction   PASS 9/9 / LOCAL_EXECUTION / IMPLEMENTATION_COUPLED
```

This is provenance for unchanged blobs, not a current-head repository-native suite claim.

### Current-head source/artifact inspection

```text
main drift + product-file overlap classification       PASS / SOURCE_INSPECTION
byte-preserving replay identity                         PASS / ARTIFACT_INSPECTION
bridge consumes governed status                         PASS / SOURCE_INSPECTION
bridge determinesApplicability=false                    PASS / SOURCE_INSPECTION
bridge determinesCompleteness=false                     PASS / SOURCE_INSPECTION
bridge createsCaseIdentity=false                        PASS / SOURCE_INSPECTION
bridge persistenceAuthority=NONE                        PASS / SOURCE_INSPECTION
existing roadmap event seam reused                      PASS / SOURCE_INSPECTION
selected context cleared on product teardown            PASS / SOURCE_INSPECTION
right rail renders exact line/case/canonicalId only     PASS / SOURCE_INSPECTION
no selected context => no invented case card            PASS / SOURCE_INSPECTION
new JS line limits                                      PASS / ARTIFACT_INSPECTION
```

### Current-head execution truth

```text
repository-native focused PR658 tests                   NOT_RUN / ENVIRONMENT_BLOCKED
repository-native existing vibration regressions       NOT_RUN / ENVIRONMENT_BLOCKED
new line/case right-rail test                           NOT_RUN / ENVIRONMENT_BLOCKED
served browser selected-row -> right-rail journey       NOT_RUN / ENVIRONMENT_BLOCKED
native node utils/backup.js                             NOT_RUN / ENVIRONMENT_BLOCKED
independent numerical verification                      NOT_APPLICABLE / no numerical change
```

A local `git ls-remote` attempt failed because the execution environment could not resolve `github.com`; connector/Git-blob backups are rollback evidence, not native-backup PASS.

New focused test blob:

```text
ef2c47361ffb5bcf1ec38403420be9209f46ed1f
```

It protects:
- no selected row => no selected assessment context;
- exact line/case/canonical status rendering;
- no invented case card;
- existing roadmap event seam + bubbling + clear-on-destroy;
- projection-only/no-case-identity/no-persistence authority.

## Changed-file ledger at REPORT_BASIS_HEAD

Product/tests/backups currently expected before recovery files:

```text
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-integrity-tab.js
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-roadmap-panel.css
.backups/connector-20260819-vib-linecase-roadmap/tabs/vibration-roadmap-panel.js
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
agents/PR658_workreport.md
agents/status/PR658.yaml
agents/claims/PR658.yaml
```

No workflow file is changed.

# Appendix A — Implementation Takeover Qualification

## A1 — Production trace — 20/20

Repository trace established:

```text
selectedRowKey
-> selected workspace row
-> resolveVibrationIdentificationEvidenceForScope(exact line/case/canonicalId)
-> buildVibrationMechanismMatrixRow
-> AssessmentCompleteness.v1
-> buildVibrationLineCaseAssessmentStatus
-> VibrationIntegrityRoadmapAssessmentContext.v1
-> VIBRATION_ROADMAP_STATE_EVENT (bubbling)
-> createVibrationRoadmapController context merge
-> renderVibrationRoadmapPanel
```

Prediction: selecting a register row supplies one exact selected-assessment card; clearing/destroying the FIT product removes it.

## A2 — Current failure isolation — 20/20

Observed defect before this continuation: PR658 computed exact line/case workflow status only inside the facility register; the merged right panel had no producer carrying selected exact scope/status.

Falsifier: an existing current-main producer of selected line/case status into roadmap context. Repository search/inspection found only the roadmap consumer/event constant, not such a producer.

## A3 — Authority / invariant — 20/20

Protected boundary:
- AssessmentCompleteness remains sole completeness source;
- applicability is not inferred;
- status is projection only;
- no case identity is created;
- no project line/register line mapping is asserted;
- no screening/design/code/safety authority changes.

## A4 — Independent validation — 17/20

Independent numerical validation is not applicable because there is no numerical change. Existing exact status tests provide implementation-coupled regression evidence; new bridge/panel behavior has source-inspection evidence and a focused test authored, but repository-native/browser execution is currently unavailable. Score is limited accordingly.

## A5 — Minimal patch — 20/20

Patch boundary is limited to:
- replaying the existing five #658 product/test blobs;
- one new transient bridge;
- one existing product event publisher edit;
- one right-panel rendering edit + style;
- one focused regression;
- rollback/recovery artifacts.

No Project-v2, coverage/completeness producer, numerical method, AIV/FIT release, or workflow file changes.

```text
TOTAL: 97/100
MINIMUM: 17/20
RESULT: IMPLEMENTATION TAKEOVER QUALIFIED
```

## Exact continuation

Refresh live PR658 metadata, compare, review/comments/threads, statuses and PR-triggered workflows against the final recovery head. Update the PR body to describe the current-main replay and right-rail integration. Keep PR658 draft/open unless the owner separately authorizes a merge decision.
