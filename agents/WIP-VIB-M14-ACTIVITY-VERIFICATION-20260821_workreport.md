# WIP-VIB-M14-ACTIVITY-VERIFICATION-20260821 — Activity Verification Authoring

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: DRAFT_PR_ALLOCATION_READY
BASE: main
BASE_SHA_AT_START: ad71a42af34afef565ea4645de83d0613996a106
CURRENT_MAIN_AT_RECONCILIATION: ad71a42af34afef565ea4645de83d0613996a106
REPORT_BASIS_HEAD: 6cf56823f015effe280e518e0b7cab9de050d7de
PREDECESSOR_PR: 697 (MERGED)
PREDECESSOR_MERGE: ad71a42af34afef565ea4645de83d0613996a106
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

## Mission
Integrate merged M14 `VibrationActionVerificationAttachment.v1` into the Activity workspace using governed `VibrationIntegrityProject.v1.measurementEvidence` without creating another measurement store, verification method, or action-completion path.

## Product flow

```text
VibrationIntegrityProject.v1.measurementEvidence
  -> VibrationProjectEvidenceHandoff.v1
  -> exact current M13 VibrationActionOccurrence.v1
  -> exact scenario-scope sessions/products
  -> explicit VibrationVerificationRequirement.v1
  -> optional VibrationMeasurementDisposition.v1
  -> existing evaluateVibrationVerification()
  -> VibrationActionVerificationAttachment.v1
  -> project-scoped append-only session ledger
```

Activity renders verification before explicit M13 completion. `VERIFICATION_EVIDENCE_ACCEPTED` never completes or reopens the action.

## Authority boundary

Project handoff, authoring, ledger, Activity view and audit bridge all retain:

```text
engineeringAuthority             NONE
screeningAuthority               NOT_AUTHORIZED
designAuthority                  false
numericalAuthority               NONE
persistenceAuthority             NONE
completionAuthority              NONE
determinesApplicability          false
determinesAssessmentCompleteness false
determinesCompletion             false
determinesGoverningResult        false
rootCauseAuthority               false
```

Existing verification contracts remain verification authority. M13 completion ledger remains the sole completion mutation path. No mechanism equation, coefficient, master, applicability, EI aggregation, code/design authority, RCA authority or right-rail authority is changed.

## Fail-closed custody implemented

1. Evidence is selectable only when all four scope fields equal the current action occurrence: line, case, operating-case snapshot ID and snapshot hash. There is no line/case-only fallback.
2. Project measurement evidence is handed into the FIT workspace explicitly from the existing project/roadmap controller channel; no global singleton or duplicate persistence store is introduced.
3. `evidenceRevisionKey` covers the complete validated measurement package, including acquisition/calibration/provenance metadata as well as hashes.
4. An open editor binds exact occurrence ID, action ID, run ID, project ID and evidence revision. Rerun, project replacement or evidence revision invalidates submit.
5. The session ledger is project-scoped. Identical facility occurrences and identical attachment identities in P1/P2 remain isolated; P1 history cannot appear in P2.
6. Verification authoring is recorded in the existing observational Activity audit log with engineering authority NONE.

## Defects found and fixed during this slice

```text
F1 project workspace had no measurementEvidence handoff
   -> explicit VibrationProjectEvidenceHandoff.v1
F2 initial revision key tracked hashes but not all provenance
   -> stable revision over complete validated measurement package
F3 editor did not bind project identity
   -> exact projectId stale guard
F4 verification actions did not enter Activity journal
   -> existing audit contract adapter + four observational event types
F5 ledger/history keyed only by action occurrence
   -> projectId added to record identity, duplicate key and history filter
F6 controller reached physical-line boundary after hardening
   -> compacted to 298 lines
```

## Effective production/test paths

New:

```text
converters/vibration/facility/action-verification-ledger.js       117
 tabs/vibration-integrity-action-verification-audit.js             15
 tabs/vibration-integrity-action-verification-controller.js        298
 tabs/vibration-integrity-action-verification-view.js               85
 tabs/vibration-project-evidence-handoff.js                         96
 tests/vibration-integrity-action-verification-authoring.test.mjs  209
 tests/vibration-project-evidence-handoff.test.mjs                  70
```

Existing semantic deltas:

```text
tabs/engineering-calculations-tab.js      +40 / -2
tabs/vibration-integrity-tab.js            +28 / -5
tabs/vibration-integrity-activity-view.js   +2 / -0
tabs/vibration-integrity-audit-log.js       +2 / -0
```

Exact pre-edit Git-blob backups exist under:
`/.backups/connector-20260821-vib-m14-activity-verification/` for all four modified existing files.

`tabs/vibration-integrity-user-data-shell.js` is not modified and is not part of the effective claim.

## Falsifiers encoded

- authority cannot promote screening/completeness/completion/design;
- wrong scenario snapshot gives zero selectable evidence;
- measurement requirement may exist before disposition;
- accepted disposition cannot auto-complete the action;
- acceptance without required product reference fails closed;
- evidence revision changes stale the editor;
- project identity changes stale the editor;
- identical-scenario rerun changes stale the editor;
- P1 history is invisible in P2 even for identical occurrence/evidence;
- equivalent attachments may exist once per project without cross-project duplicate collision;
- Activity renders verification before explicit completion;
- authoring controller has no completion-record mutation path;
- calibration/provenance drift changes the handoff revision.

## Coordination

PR #697 is merged predecessor and supplies the M14 attachment/evaluator custody contract.

PR #479 is an open legacy FIT reproducibility draft with one exact path overlap: `tabs/vibration-integrity-tab.js`. It is 154 commits behind current main and diverged. Current main already contains the run-evidence surface described by #479. This successor preserves that current-main code and adds only the M14 handoff/state/event seam. Classification: `STALE_COORDINATION_NEIGHBOR / LEGACY_OVERLAP`; no #479 authority is absorbed.

PR #665 is the open Project-v2 persistence neighbor. It has no exact changed-path overlap and is not absorbed; this slice remains session-only/non-persistent for verification attachments.

## Validation truth

```text
PASS     predecessor PR697 merged / main grounding          HOSTED SOURCE
PASS     project/measurement/verification contract audit     SOURCE INSPECTION
PASS     exact scenario-scope and authority review           SOURCE INSPECTION
PASS     exact pre-edit Git-blob backups                      CONNECTOR TREE/BLOB
PASS     semantic diff bounded on existing files              +40/-2 +28/-5 +2 +2
PASS     new-file line policy                                 117/15/298/85/96/209/70
PASS     main relation at report basis                        ahead 27 / behind 0
PASS     open-PR coordination                                 #479 explicitly classified; #665 non-overlap
NOT_RUN  repository-native focused Node tests                 ENVIRONMENT_BLOCKED: git DNS failure
NOT_RUN  repository-native vibration regressions              ENVIRONMENT_BLOCKED
NOT_RUN  served-browser Activity verification journey         ENVIRONMENT_BLOCKED
PENDING  exact-head commit statuses / PR workflow runs        reconcile after PR allocation
N/A      independent numerical verification                   no equation/value change
```

No authored falsifier is represented as repository-native execution PASS.

## Appendix A — takeover questions
1. Why must project evidence match the action occurrence snapshot ID and hash rather than line/case only?
2. Which existing contract owns verification state and why is no second evaluator allowed?
3. Why can accepted verification not complete an M13 action?
4. What exact fields stale an open verification editor?
5. Why does the evidence revision cover calibration/acquisition/provenance as well as artifact hashes?
6. Why is the verification ledger project-scoped even though `attachmentId` does not contain projectId?
7. What is the authority difference between the verification ledger and M13 completion ledger?
8. Why is PR #479 a stale coordination neighbor rather than a dependency?
9. Which validations remain NOT_RUN and why?
10. What would Project v2 persistence need to add later without promoting current engineering authority?

## Exact next action
Allocate the draft PR, migrate WIP recovery records to the PR number, delete WIP aliases, then perform exact-head mergeability/review/status/workflow reconciliation. Do not merge without explicit Owner authorization for that PR.
