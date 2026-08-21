# PR700 — M15 Evidence-Linked RCA Authoring — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #700
BRANCH: agent/vib-m15-rca-authoring-20260821
BASE: main
BASE_SHA_AT_START: 7aabe404c6f58db1b78756de9412ab93e867b5fe
PR_ALLOCATION_HEAD: 38e55eafd2357b6aafa2b2e991f29a398048e17f
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

## Engineering / authority contract

```text
engineeringAuthority                NONE
screeningAuthority                  NOT_AUTHORIZED
designAuthority                     false
numericalAuthority                  NONE
completionAuthority                 NONE
rootCauseAuthority                  EXPLICIT_ENGINEER_ATTESTATION_ONLY
platformRootCauseInference          false
autoConfirmAllowed                  false
determinesApplicability             false
determinesAssessmentCompleteness    false
determinesCompletion                false
determinesGoverningResult           false
codeCompliance                      false
safetyAuthority                     false
```

`CONFIRMED_ROOT_CAUSE` requires explicit engineer identity/reason plus at least one supporting M14 record already in `VERIFICATION_EVIDENCE_ACCEPTED`. `CONTRIBUTING_FACTOR` requires explicit supporting evidence. `NOT_SUPPORTED` requires explicit evidence against. An evidence-linked hypothesis may remain open without a conclusion.

There is no probability score, universal RCA index, automatic mechanism ranking, automatic root-cause conclusion, action completion, or design recommendation in this PR.

## Evidence/currentness custody
- M15 sees M14 verification records only for exact `projectId + occurrenceId`.
- Evidence references are immutable M14 verification-ledger record IDs.
- Each RCA evidence snapshot records direction, attachment ID, requirement ID, verification state, and M14 evidence fingerprint.
- The same verification record cannot be both FOR and AGAINST.
- RCA editor is pinned to `occurrenceId + actionId + runId + projectId + exact verification-record revision key`.
- New M14 verification records after editor open stale the RCA editor.
- Project switches hide foreign M14 and RCA history.
- Hypothesis SHA-256 fingerprint commits project, occurrence, hypothesis ID, mechanism, statement, evidence and explicit engineer conclusion.
- Post-creation hypothesis/evidence/conclusion drift invalidates the fingerprint.

## Append-only RCA evolution
A one-record-per-hypothesis implementation was rejected during falsification because an open hypothesis could never later receive new evidence or an engineer conclusion. The final ledger uses immutable per-hypothesis revisions:

```text
hypothesisRevision = 1, 2, 3, ...
```

Global record sequence and per-hypothesis revision are deterministic and contiguous. Reusing the hypothesis ID appends a revision. An identical no-change revision is rejected. Previous evidence and conclusions are never overwritten.

## Inherited M14 defect found and fixed
Merged PR699 correctly appended verification, but its success audit read nonexistent:

```text
attachment.evidenceSnapshot
```

The actual M14 attachment contract is:

```text
attachment.evidence
```

The old path could therefore append a verification record successfully and then throw during Activity audit, misleading the operator with a failure event. PR700 changes the audit read to:

```text
attachment.evidence.sessions.length
attachment.evidence.products.length
```

A focused structural falsifier forbids `attachment.evidenceSnapshot` in that controller.

## Activity workspace
Intended presentation order:

```text
Measurement / verification evidence
Root-cause investigation
Explicit required-action completion
Activity journal
```

This ordering expresses dependency, not authority. RCA acceptance never completes an M13 action.

RCA Activity events remain observational only:

```text
RCA_EDITOR_OPENED
RCA_EDITOR_CANCELLED
RCA_HYPOTHESIS_RECORDED
RCA_RECORD_FAILED
```

## Effective implementation / test paths

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
tabs/vibration-integrity-action-verification-controller.js  +5 / -5  (still 298 lines)
tabs/vibration-integrity-activity-view.js                     +3 / -1
tabs/vibration-integrity-audit-log.js                         +1 / -0
```

Exact pre-edit blobs for all three edited existing files are retained under:

```text
.backups/connector-20260821-vib-m15-rca-authoring/
```

## Falsifiers encoded
1. M15 cannot autonomously create engineering, screening, design, completion or inferred-root-cause authority.
2. RCA is unavailable without exact project-scoped M14 verification evidence.
3. Evidence-linked hypothesis may remain OPEN without claiming root cause.
4. `CONFIRMED_ROOT_CAUSE` fails without accepted supporting verification.
5. Explicit engineer confirmation with accepted evidence does not complete the action.
6. Open hypothesis can later receive an immutable engineer-conclusion revision.
7. The same M14 record cannot be evidence both FOR and AGAINST.
8. M14 verification change stales an open RCA editor.
9. Project identity prevents cross-project verification/RCA leakage.
10. Hypothesis fingerprint rejects post-creation custody drift.
11. Activity ordering is Verification -> RCA -> Completion.
12. M14 success audit uses actual `attachment.evidence` and not `evidenceSnapshot`.

## Coordination
Open PR #665 (`VibrationIntegrityProject.v2`) is related future persistence work but has zero exact path overlap with PR700. PR700 does not absorb Project-v2 persistence/currentness authority. No open RCA implementation PR was found.

Legacy PR #479 no longer overlaps this successor because PR700 intentionally does not edit `tabs/vibration-integrity-tab.js`.

## Validation truth at allocation

```text
PASS     predecessor PR699 merged / current-main grounding     HOSTED SOURCE
PASS     roadmap M15/RCA authority audit                        SOURCE INSPECTION
PASS     exact implementation line policy                       254/121/15/236/82/222; shared 298
PASS     exact pre-edit Git-blob backups                        CONNECTOR TREE/BLOB
PASS     open-PR coordination                                   #665 related / zero exact overlap
PASS     pre-allocation relation                                ahead 21 / behind 0
NOT_RUN  repository-native focused Node test                    ENVIRONMENT_BLOCKED: git DNS could not resolve github.com
NOT_RUN  repository-native vibration regression suite           ENVIRONMENT_BLOCKED
NOT_RUN  served-browser RCA journey                             ENVIRONMENT_BLOCKED
PENDING  exact-head hosted status/workflow/review reconciliation post-recovery migration
N/A      independent numerical verification                     no equation/value change
```

Authored test source is not represented as repository-native execution PASS.

## Appendix A — takeover questions
1. Why can the platform never synthesize `CONFIRMED_ROOT_CAUSE`?
2. What exact M14 identity is admissible as RCA evidence?
3. Why are FOR and AGAINST separate evidence directions?
4. Why does confirmed root cause require accepted supporting verification while an open hypothesis does not?
5. Which exact identities stale an open RCA editor?
6. Why are same-ID hypothesis updates append-only revisions rather than mutation?
7. What does `hypothesisFingerprint` protect?
8. Why can an RCA conclusion not complete an M13 required action?
9. What inherited M14 audit defect was fixed and why could it mislead the operator?
10. Which executable validations remain NOT_RUN and why?

## Next
Finish PR-numbered recovery migration and exact-head reconciliation. Keep PR700 draft and unmerged until new explicit owner merge authorization.
