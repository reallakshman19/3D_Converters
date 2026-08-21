# PR700 — M15 Evidence-Linked RCA Authoring — Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: #700
BRANCH: agent/vib-m15-rca-authoring-20260821
BASE: main
BASE_SHA_AT_START: 7aabe404c6f58db1b78756de9412ab93e867b5fe
PREDECESSOR_PR: 699 (MERGED)
PREDECESSOR_MERGE: 7aabe404c6f58db1b78756de9412ab93e867b5fe
CURRENT_MAIN_LAST_RECONCILED: da5dade3d19caba8ae2bd8015aeeae16ae28777a
REPORT_SOURCE_BASIS_HEAD: 8d6f11f5790c5c6708c1bacf05ae25e4e42bf8b1
HOSTED_RECONCILIATION_BASIS_HEAD: 311919af77f0d0dfdda9a9dfca4be060faddc19b
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

`REPORT_SOURCE_BASIS_HEAD` is the final source-implementation basis before recovery-only commits. `HOSTED_RECONCILIATION_BASIS_HEAD` is the recovery-clean head checked for GitHub state; later report/status bookkeeping commits may move the branch without changing production/test semantics.

## Mission
Implement the first M15 root-cause-analysis product slice after merged M14 measurement/verification authoring. RCA consumes exact project/action/verification custody, captures explicit hypotheses and evidence FOR/AGAINST, and permits only explicit engineer-attested conclusions. The platform cannot autonomously infer or confirm root cause and RCA cannot alter screening, applicability, AssessmentCompleteness, action completion, design, code or safety authority.

During independent source audit of the M15 prerequisite chain, an inherited M14 integrity gap was found and repaired in this PR because M15 uses accepted verification as a prerequisite for `CONFIRMED_ROOT_CAUSE`.

## Product flow

```text
current project + exact current action occurrence
  -> exact project-scoped M14 verification record V2
  -> semantically validated verification status/disposition + status fingerprint
  -> RCA hypothesis
  -> explicit evidence FOR / AGAINST
  -> optional explicit engineer conclusion
  -> append-only project-scoped hypothesis revisions
  -> Activity presentation + observational audit
```

## Authority contract

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

`CONFIRMED_ROOT_CAUSE` requires explicit engineer ID/reason plus at least one supporting M14 record whose semantically validated verification state is `VERIFICATION_EVIDENCE_ACCEPTED`. `CONTRIBUTING_FACTOR` requires explicit supporting evidence. `NOT_SUPPORTED` requires explicit evidence against. An evidence-linked hypothesis may remain open without a conclusion.

There is no probability score, universal RCA index, automatic mechanism ranking, automatic root-cause conclusion, action completion, or design recommendation in this PR.

## M14 prerequisite integrity audit — finding and repair

Merged M14 `VibrationActionVerificationAttachment.v1` bound its exact measurement hash snapshot through `evidenceFingerprint`, but attachment identity did not bind the complete verification status/disposition semantics. That becomes material when M15 consumes accepted verification as a root-cause prerequisite.

Current code therefore creates `VibrationActionVerificationAttachment.v2`. V2 adds `verificationStatusFingerprint` and binds it into `attachmentId` together with `evidenceFingerprint`.

`action-verification-integrity.js` independently enforces:

```text
status schema / requirement / mechanism / requirementType / exact scenario scope
exact verification-status authority
status evidence summary == attached evidence snapshot
canonical engineer disposition contract
exact disposition requirement/mechanism/scope
all disposition evidence references belong to attachment evidence
accepted disposition has no missing required product type
accepted disposition explicitly references products covering every required type
status.state == state implied by evidence + disposition outcome
no unsupported/non-canonical status fields
```

The RCA evidence snapshot records both `evidenceFingerprint` and `verificationStatusFingerprint`; the hypothesis fingerprint commits both. The RCA editor revision key includes each verification record ID plus its verification-status fingerprint.

### Integrity boundary
The SHA-256 values provide deterministic semantic self-consistency/tamper-detection custody. They are **not** identity authentication or digital signatures.

```text
reviewerIdentityAuthentication = NOT_AVAILABLE_USER_DECLARED
engineerIdentityAuthentication = NOT_AVAILABLE_USER_DECLARED
digitalSignature               = false
signerAuthenticity              = NOT_AVAILABLE
```

No statement in PR700 may upgrade these limitations.

## Evidence/currentness custody
- M15 sees M14 verification records only for exact `projectId + occurrenceId`.
- Current M15 admissible records are V2 attachments parsed through the strengthened M14 assertion path.
- Each RCA evidence snapshot records direction, attachment ID, requirement ID, verification state, evidence fingerprint and verification-status fingerprint.
- The same verification record cannot be both FOR and AGAINST.
- RCA editor is pinned to `occurrenceId + actionId + runId + projectId + exact verification revision key`.
- New/replaced verification custody after editor open stales the RCA editor.
- Project switches hide foreign M14 and RCA history.
- Hypothesis SHA-256 fingerprint commits project, occurrence, hypothesis ID, mechanism, statement, evidence and explicit engineer conclusion.
- Post-creation uncoordinated hypothesis/evidence/conclusion drift invalidates the fingerprint.

## Append-only RCA evolution
The RCA ledger uses immutable per-hypothesis revisions:

```text
hypothesisRevision = 1, 2, 3, ...
```

Global record sequence and per-hypothesis revision are deterministic and contiguous. Reusing the hypothesis ID appends a revision. An identical no-change revision is rejected. Previous evidence and conclusions are never overwritten.

## Inherited M14 Activity defect fixed
PR699's success-audit path read nonexistent `attachment.evidenceSnapshot`; the actual field is `attachment.evidence`. A successful verification append could therefore be followed by a misleading audit failure. PR700 uses:

```text
attachment.evidence.sessions.length
attachment.evidence.products.length
```

and a structural falsifier forbids `attachment.evidenceSnapshot` in that controller.

## Activity workspace

```text
Measurement / verification evidence
Root-cause investigation
Explicit required-action completion
Activity journal
```

This ordering expresses dependency, not authority. RCA conclusions never complete an M13 action.

RCA Activity events remain observational only:

```text
RCA_EDITOR_OPENED
RCA_EDITOR_CANCELLED
RCA_HYPOTHESIS_RECORDED
RCA_RECORD_FAILED
```

## Effective production/test source

```text
converters/vibration/facility/action-verification.js             ~278
converters/vibration/facility/action-verification-integrity.js    159
converters/vibration/rca/contracts.js                              258
converters/vibration/rca/ledger.js                                 121
tabs/vibration-integrity-rca-audit.js                               15
tabs/vibration-integrity-rca-controller.js                         239
tabs/vibration-integrity-rca-view.js                                82
tests/vibration-integrity-rca-authoring.test.mjs                   274
```

Existing shared UI deltas remain narrow:

```text
tabs/vibration-integrity-action-verification-controller.js  +5 / -5, 298 total
tabs/vibration-integrity-activity-view.js                     +3 / -1
tabs/vibration-integrity-audit-log.js                         +1 / -0
```

Exact pre-edit Git-blob backups are retained under `.backups/connector-20260821-vib-m15-rca-authoring/`, including the pre-hardening M14 action-verification file.

## Falsifiers encoded
1. M15 cannot autonomously create engineering, screening, design, completion or inferred-root-cause authority.
2. RCA is unavailable without exact project-scoped M14 verification evidence.
3. M15 verification source record is V2 and has canonical status fingerprint custody.
4. A simple accepted-state flip is rejected as semantic state/disposition inconsistency.
5. A coherent disposition+state rewrite with the old fingerprint is rejected by status fingerprint custody.
6. Evidence-linked hypothesis may remain OPEN without claiming root cause.
7. `CONFIRMED_ROOT_CAUSE` fails without accepted supporting verification.
8. Explicit engineer confirmation with accepted evidence does not complete the action.
9. Open hypothesis can later receive an immutable engineer-conclusion revision.
10. The same M14 record cannot be evidence both FOR and AGAINST.
11. M14 verification revision change stales an open RCA editor.
12. Project identity prevents cross-project verification/RCA leakage.
13. Hypothesis fingerprint rejects post-creation custody drift.
14. RCA evidence requires canonical verification-status fingerprints and binds them into hypothesis identity.
15. Activity ordering is Verification -> RCA -> Completion.
16. M14 success audit uses actual `attachment.evidence` and not `evidenceSnapshot`.

Authored falsifier source is not runtime PASS until executed in a native checkout.

## Coordination
- PR699: merged M14 Activity/verification foundation.
- PR698: merged HP-only commit `da5dade3...`; branch is one behind solely for this unrelated HP commit at hosted reconciliation. No vibration-path overlap was found.
- PR665: related `VibrationIntegrityProject.v2` persistence; zero exact path overlap, not absorbed.
- PR506: older AIV hardening surfaced by text search; no M15 RCA ownership overlap.
- No second open RCA implementation PR was found.

Do not manufacture a connector-only merge commit that could accidentally resolve the unrelated HP parent by dropping its tree changes. Rebase/replay in a real Git checkout if behind-zero ancestry becomes a release requirement.

## Validation truth

```text
PASS     predecessor PR699 merged / M15 source grounding          HOSTED SOURCE
PASS     M15 RCA authority audit                                   SOURCE INSPECTION
PASS     inherited M14 status-integrity audit and repair            SOURCE INSPECTION
PASS     exact pre-edit Git-blob backups                            CONNECTOR TREE/BLOB
PASS     physical line policy                                       ~278/159/258/121/15/239/82/274; shared 298
PASS     open-PR coordination                                       #665 zero overlap; #698 HP-only
PASS     hosted mergeability @311919af                              true
PASS     reviews / review threads / comments @311919af              0 / 0 / 0
NOT_RUN  hosted commit status contexts @311919af                    0 returned
NOT_RUN  hosted PR-triggered workflow runs @311919af                0 returned
NOT_RUN  repository-native focused Node tests                       ENVIRONMENT_BLOCKED: git ls-remote -> Could not resolve host github.com
NOT_RUN  repository-native vibration regression suite               ENVIRONMENT_BLOCKED
NOT_RUN  served-browser RCA journey                                 ENVIRONMENT_BLOCKED
NOT_RUN  reviewer/engineer identity authentication                  NOT_IMPLEMENTED / OUT_OF_SCOPE
N/A      independent numerical verification                         no equation/value change
```

No authored test is represented as an executed PASS.

## Appendix A — takeover questions
1. Why can the platform never synthesize `CONFIRMED_ROOT_CAUSE`?
2. What exact project/action/M14 identity is admissible as RCA evidence?
3. Why did M15 require strengthening M14 verification-status custody?
4. What does `verificationStatusFingerprint` bind, and what does it **not** authenticate?
5. Why is `VibrationActionVerificationAttachment.v2` used instead of silently redefining v1?
6. Why are FOR and AGAINST separate evidence directions?
7. Why does confirmed root cause require accepted supporting verification while an open hypothesis does not?
8. Which exact identities/revisions stale an open RCA editor?
9. Why are same-ID hypothesis updates append-only revisions rather than mutation?
10. What does `hypothesisFingerprint` protect, and why is it not a digital signature?
11. Why can an RCA conclusion not complete an M13 required action?
12. What inherited M14 Activity audit defect was fixed?
13. Which executable validations remain NOT_RUN and why?

## Exact next action
Keep PR700 draft and unmerged. A future merge attempt must first replay/rebase onto current main in a real Git-capable environment, execute the focused/native vibration tests, perform the served-browser RCA journey, and obtain new explicit owner merge authorization for PR700.
