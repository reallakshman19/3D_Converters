# PR471 — T2.8 Valve-Closure Qualification Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED

PR_HEAD_OBSERVED: 4dbbf5cc2c1ff6da3246e459e306a3762095ca7a
REPORT_BASIS_HEAD: 4dbbf5cc2c1ff6da3246e459e306a3762095ca7a
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR471-003
LAST_DURABLE_CHECKPOINT: 2026-08-14
CURRENT_STAGE: T2.8 scope frozen; final controlled-source reconciliation blocked
CURRENT_BLOCKER: CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
HIGHEST_RISK: promoting a calculation-qualified secondary-source transcription without exact controlled-Git reconciliation
EXACT_NEXT_ACTION: when the exact controlled PDF/provider is reachable, run the merged #470 DocumentEvidence T2.8 discovery/extraction and reconcile this candidate; otherwise make no further engineering mutation in PR #471.
```

Work intent: `VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #471
Branch: `agent/vibration-controlled-source-execution`
Source issue: #450
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Current coordination classification: `SAFE`

## Grounding Epoch GE-PR471-003

Verified from live GitHub after policy #478 landed:

```text
verified date: 2026-08-14
live main: 36748e381012bb52ba720cc288101948115721bb
new-main change: AGENTS.md AUTO MODE policy only
pre-rebase PR head: 963eb56cced9a864a3a2bb76a0e4c07d9ea5556c
rebased content head: 4dbbf5cc2c1ff6da3246e459e306a3762095ca7a
merge base after rebase: 36748e381012bb52ba720cc288101948115721bb
engineering/test blobs changed by rebase: none
changed files: exactly 5
scope decision: FROZEN_TO_T2.8
follow-on work: separate T2.9 PR
```

Applicable instructions loaded:
- root `AGENTS.md`, including #478 AUTO MODE policy;
- `.agents/AGENTS.md`;
- `Common/skills/engineering-pr-delivery/SKILL.md`;
- pinned CodingRules applicable to the assignment.

## Handover in 60 Seconds

### Current truth
- #470 remains the canonical controlled-source DocumentEvidence consumer.
- #452 remains closed/superseded historical evidence only.
- PR #471 is rebased onto `main@36748e381012bb52ba720cc288101948115721bb` without changing any T2.8 engineering/test blob.
- The five T2.8 valve coefficient rows, source semantics, and 9/9 calculation qualification remain unchanged.
- Final qualification remains blocked only by exact controlled-Git source reconciliation.
- PR #471 is now scope-frozen; T2.9/T4/T3 work must occur in separate PRs.

### Exact T2.8 artifacts

```text
candidate CSV blob        be7f6d488addf98d6ede181fc522177b4e4e1f5c
provenance receipt blob   8e62c502ce42897b45b27559977de4b8b8e01bb7
qualification review blob 3c5d1ae6bcabd507d1da8a660555986d856b0ff8
test blob                 5ccd88913348d605bd88e0e3fc146a7f2f00a3b7
```

### T2.8 status

```text
independentSourceCorroboration = PASS
calculationQualificationStatus = PASS
controlledSourceReconciliation = BLOCKED_ENVIRONMENT
qualificationStatus            = NOT_QUALIFIED
qualificationBlocker           = CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
publicationState               = CANDIDATE
masterValuesPublished          = false
engineeringAuthority           = NONE
screeningAuthority             = NOT_AUTHORIZED
designAuthority                = false
```

## Mission / Scope / Acceptance

Mission: recover and calculation-qualify `EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1` while keeping the controlled-source, publication, and engineering-authority gates separate.

Completed:
1. exact five workbook coefficient rows copied;
2. equation and source applicability semantics preserved;
3. independent EI publication corroboration completed;
4. focused calculation qualification PASS 9/9;
5. candidate remains fail-closed pending controlled-source reconciliation;
6. no production resolver/calculator consumption;
7. no authority promotion.

Explicit non-goals / frozen scope:
- no T2.9, T4, T3, SBC, chart digitization, or unrelated rule recovery in this PR;
- no #452 v1/Markdown path;
- no active-master publication;
- no calculator/resolver integration;
- no screening/design authority promotion;
- no workflow changes;
- no merge without explicit Owner authorization.

## Authority Trace / Invariants

```text
controlled EI source
-> DocumentEvidence evidence receipt
-> reviewed semantic reconciliation
-> qualification decision
-> optional active master publication
-> separate screening/design authority review
```

Current branch stops at a calculation-qualified candidate. The controlled-source gate is NOT_RUN/BLOCKED_ENVIRONMENT and cannot be replaced by workbook/public-copy agreement.

Invariants:
- five coefficient pairs unchanged;
- `phi=-(A/t)-B` unchanged;
- valid through `Tclose<=30 s` only;
- unknown type/time assumption remains explicit evidence;
- `Lup>100 m` and `Fmax<1 kN` dispositions unchanged;
- candidate remains non-published;
- authority remains frozen.

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE | Basis / limitation |
|---|---|---|---|---|
| Workbook coefficient extraction | PASS | SOURCE_INSPECTION | NONE | pinned CRF workbook transcription |
| Cached workbook replay | PASS | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | parity only |
| Independent EI semantic corroboration | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | secondary copies, not controlled Git object |
| T2.8 calculation qualification | PASS 9/9 | LOCAL_EXECUTION | AUTHORITATIVE_REFERENCE + IMPLEMENTATION_COUPLED | exact unchanged candidate/test blobs |
| Policy-only rebase equivalence | PASS | ARTIFACT_INSPECTION | NONE | all four engineering/test blobs unchanged |
| Controlled DocumentEvidence reconciliation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | provider/PDF unavailable |
| Active-master publication | NOT_RUN | NOT_APPLICABLE | AUTHORITATIVE_REFERENCE | outside current authority |
| Screening/design authority | NOT_RUN | NOT_APPLICABLE | AUTHORITATIVE_REFERENCE | separate governance event |

Negative assurance:
- changed by latest rebase: ancestry/policy baseline only;
- unchanged: all T2.8 data, test, provenance, qualification content;
- not introduced: T2.9/T4/T3 data, runtime consumption, workflow changes, authority changes.

## Changed-File Ledger

| File | Purpose | Engineering-sensitive | Blob at report basis |
|---|---|---:|---|
| `docs/Masters/Vibration/ei-aviff-t28-valve-closure-characteristics.candidate.csv` | five-row candidate | yes | `be7f6d488addf98d6ede181fc522177b4e4e1f5c` |
| `ValidationRecords/VibrationMasters/ei-aviff-t28-valve-closure-workbook-candidate-v1.json` | provenance/semantics | yes | `8e62c502ce42897b45b27559977de4b8b8e01bb7` |
| `ValidationRecords/VibrationMasters/ei-aviff-t28-qualification-review-v1.json` | qualification split | yes | `3c5d1ae6bcabd507d1da8a660555986d856b0ff8` |
| `tests/vibration-t28-workbook-candidate.test.mjs` | focused qualification regression | yes | `5ccd88913348d605bd88e0e3fc146a7f2f00a3b7` |
| `agents/PR471_workreport.md` | recovery/handover | yes | report metadata commit follows content basis |

## Appendix A — Implementation Takeover Qualification

`APPENDIX_A_STATUS: CURRENT`

Any future engineering-sensitive mutation in #471 requires re-grounding and the repository-specific takeover gate. Since the scope is frozen, the only legitimate future technical mutation is a narrow controlled-source reconciliation/promotion-review update after a real #470 receipt exists.

## Next-Agent Handover

Current stopping point: T2.8 calculation qualification complete; PR scope frozen; controlled provenance gate blocked.
Do not redo: workbook extraction, coefficient recovery, source-note correction, or 9/9 qualification.
Do not add: T2.9, T4, T3, SBC, charts, or runtime integration.
Start only if source is reachable: execute #470 DocumentEvidence against the exact controlled EI PDF and reconcile.
Handover readiness: `READY`.
