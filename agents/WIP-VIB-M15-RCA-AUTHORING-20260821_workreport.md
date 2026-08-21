# WIP-VIB-M15-RCA-AUTHORING-20260821 — M15 RCA Authoring

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: READY_FOR_PR_ALLOCATION
BASE: main
BASE_SHA_AT_START: 7aabe404c6f58db1b78756de9412ab93e867b5fe
PREDECESSOR_PR: 699 (MERGED)
PREDECESSOR_MERGE: 7aabe404c6f58db1b78756de9412ab93e867b5fe
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

## Mission
Implement the first M15 root-cause-analysis product slice after merged M14 measurement/verification authoring. RCA consumes exact project/action/verification custody, captures explicit hypotheses and evidence for/against, and permits only explicit engineer-attested conclusions. The platform cannot autonomously infer/confirm root cause and RCA cannot alter screening, applicability, AssessmentCompleteness, action completion, design, code or safety authority.

## Product flow

```text
current project + exact current action occurrence
  -> exact project-scoped M14 verification records
  -> RCA hypothesis
  -> explicit evidence FOR / AGAINST
  -> optional explicit engineer conclusion
  -> append-only project-scoped hypothesis revisions
  -> Activity presentation + observational audit
```

## Engineering/authority contract

```text
engineeringAuthority        NONE
screeningAuthority          NOT_AUTHORIZED
designAuthority             false
numericalAuthority          NONE
completionAuthority         NONE
rootCauseAuthority          EXPLICIT_ENGINEER_ATTESTATION_ONLY
platformRootCauseInference  false
autoConfirmAllowed          false
determinesApplicability     false
determinesAssessmentCompleteness false
determinesCompletion        false
determinesGoverningResult   false
codeCompliance              false
safetyAuthority             false
```

`CONFIRMED_ROOT_CAUSE` requires explicit engineer identity/reason plus at least one supporting M14 record already in `VERIFICATION_EVIDENCE_ACCEPTED`. `CONTRIBUTING_FACTOR` requires explicit supporting evidence. `NOT_SUPPORTED` requires explicit evidence against. An open hypothesis may remain without conclusion.

## Evidence/currentness custody
- M15 only sees M14 verification records with exact `projectId + occurrenceId`.
- Evidence references are immutable M14 ledger record IDs and snapshot attachment ID/requirement/status/evidence fingerprint.
- The same record cannot be FOR and AGAINST.
- RCA editor is pinned to `occurrenceId + actionId + runId + projectId + exact verification-record revision key`.
- Adding/revising M14 verification evidence after editor open makes the RCA editor stale.
- Project switches hide foreign verification and RCA history.
- Hypothesis fingerprint commits project, occurrence, hypothesis ID, mechanism, statement, evidence and explicit conclusion.
- Post-creation custody drift invalidates the hypothesis fingerprint.

## Append-only RCA history
Initial one-record-per-hypothesis semantics were rejected during falsification because an open hypothesis could never later receive evidence/conclusion. The final ledger uses immutable per-hypothesis revisions:

```text
hypothesisRevision = 1, 2, 3...
```

Global record sequence and per-hypothesis revision are deterministic and contiguous. An identical no-change revision is rejected. No record is overwritten.

## Inherited M14 defect found/fixed
Merged PR699 appended verification correctly but its Activity success audit read nonexistent `attachment.evidenceSnapshot`; the actual M14 contract field is `attachment.evidence`. That could throw after append and falsely record failure. This successor changes only the audit read to:

```text
attachment.evidence.sessions.length
attachment.evidence.products.length
```

A structural regression rejects `attachment.evidenceSnapshot` in the controller.

## Activity workspace
Final intended order:

```text
Measurement / verification evidence
Root-cause investigation
Explicit required-action completion
Activity journal
```

RCA audit events are observational only:
`RCA_EDITOR_OPENED`, `RCA_EDITOR_CANCELLED`, `RCA_HYPOTHESIS_RECORDED`, `RCA_RECORD_FAILED`.

## Effective production/test files

```text
converters/vibration/rca/contracts.js                    254
converters/vibration/rca/ledger.js                       121
tabs/vibration-integrity-rca-audit.js                     15
tabs/vibration-integrity-rca-controller.js               236
tabs/vibration-integrity-rca-view.js                      82
tests/vibration-integrity-rca-authoring.test.mjs         222
```

Existing semantic deltas:

```text
tabs/vibration-integrity-action-verification-controller.js  +5 / -5
tabs/vibration-integrity-activity-view.js                     +3 / -1
tabs/vibration-integrity-audit-log.js                         +1 / -0
```

Exact pre-edit backups exist under `.backups/connector-20260821-vib-m15-rca-authoring/` for all three edited existing files.

## Falsifiers encoded
1. no autonomous RCA/screening/design/completion authority;
2. no RCA authoring without exact project-scoped verification evidence;
3. hypothesis may remain OPEN without claiming root cause;
4. CONFIRMED_ROOT_CAUSE fails without accepted supporting verification;
5. explicit engineer confirmation succeeds with accepted supporting verification but does not complete action;
6. open hypothesis can receive an immutable later conclusion revision;
7. same verification record cannot be FOR and AGAINST;
8. verification ledger change stales open RCA editor;
9. project identity prevents cross-project verification/RCA leakage;
10. hypothesis fingerprint rejects post-creation custody drift;
11. Activity renders Verification -> RCA -> Completion;
12. M14 success audit uses actual `attachment.evidence` contract field.

## Coordination
Open PR #665 (Project v2 evidence persistence) is related but has zero exact path overlap. No open RCA implementation PR was found. PR #479 no longer overlaps this successor because M15 deliberately avoids `tabs/vibration-integrity-tab.js`.

## Validation truth

```text
PASS     predecessor PR699 merged / current-main grounding    HOSTED SOURCE
PASS     roadmap M15/RCA authority audit                       SOURCE INSPECTION
PASS     exact changed-path scope                              13 intended / 0 unexplained
PASS     exact pre-edit Git-blob backups                       CONNECTOR TREE/BLOB
PASS     physical-line policy                                  254/121/15/236/82/222; shared controller 298
PASS     open-PR coordination                                  #665 related / zero exact overlap
NOT_RUN  repository-native focused Node test                   ENVIRONMENT_BLOCKED: git DNS could not resolve github.com
NOT_RUN  repository-native vibration regression suite          ENVIRONMENT_BLOCKED
NOT_RUN  served-browser RCA journey                            ENVIRONMENT_BLOCKED
PENDING  exact-head statuses / PR-triggered workflow runs      post-PR reconciliation
N/A      independent numerical verification                    no equation/value change
```

No authored test is represented as repository-native execution PASS.

## Appendix A — takeover questions
1. Why can the platform never synthesize `CONFIRMED_ROOT_CAUSE`?
2. What exact M14 identity is admissible as RCA evidence?
3. Why are FOR and AGAINST separate evidence directions?
4. Why does confirmed root cause require accepted supporting verification but an open hypothesis does not?
5. Which fields stale an open RCA editor?
6. Why are same-ID hypothesis updates represented as append-only revisions rather than mutation?
7. What does `hypothesisFingerprint` protect?
8. Why can an RCA conclusion not complete an M13 required action?
9. What inherited M14 audit defect was fixed and why was it dangerous?
10. Which executable validations remain NOT_RUN?

## Next
Allocate a draft successor PR against `main`, migrate WIP recovery to PR-numbered workreport/status/claim, reconcile exact head, and keep unmerged until new owner authorization.
