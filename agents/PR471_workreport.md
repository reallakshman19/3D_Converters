# PR471 — T2.8 Valve-Closure Qualification Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED

PR_HEAD_OBSERVED: b4ccd20a31421e3669cdfb5d2661ef9a05768ef7
REPORT_BASIS_HEAD: b4ccd20a31421e3669cdfb5d2661ef9a05768ef7
MAIN_HEAD_LAST_CHECKED: ab336832871daa9e7caddcc422fd0bac1c11bfb8
MERGE_BASE: ab336832871daa9e7caddcc422fd0bac1c11bfb8
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR471-002
LAST_DURABLE_CHECKPOINT: 2026-08-14
CURRENT_STAGE: Stage 7 complete; final controlled-source reconciliation blocked
CURRENT_BLOCKER: CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
HIGHEST_RISK: promoting a calculation-qualified secondary-source transcription without exact controlled-Git reconciliation
EXACT_NEXT_ACTION: npm run recover:vibration-stage5c-evidence -- discover --api http://127.0.0.1:8765 --out /tmp/pr471-t28-discovery.json
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #471
Branch: `agent/vibration-controlled-source-execution`
Source issue: #450
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Current coordination classification: `SAFE`

## Grounding Epoch GE-PR471-002

Verified from live GitHub after repository policy #477 landed:

```text
verified date: 2026-08-14
live main: ab336832871daa9e7caddcc422fd0bac1c11bfb8
new-main change: AGENTS.md policy only
pre-rebase PR head: e9c33f66d07734f438be95cb24a3261bfde3cfd8
rebased content head: b4ccd20a31421e3669cdfb5d2661ef9a05768ef7
merge base after rebase: ab336832871daa9e7caddcc422fd0bac1c11bfb8
base drift after rebase: ahead 1 / behind 0
changed files verified: 5
inline review threads: 0
commit status contexts on rebased content head: 0
agents/MASTER_INDEX.md: absent
agents/status/: absent
agents/claims/: absent
open-PR exact T2.8 / ValidationRecords/VibrationMasters collision: none found
coordination result: SAFE
```

New governing repository instructions loaded before the rebase:
- root `AGENTS.md` from `main@ab336832...`;
- `.agents/AGENTS.md`;
- `Common/skills/engineering-pr-delivery/SKILL.md`;
- repository-ground-truth, continuous-handover, multi-agent-coordination, engineering-validation, validation-common, authority-boundaries and closure-gate references.

## Handover in 60 Seconds

### Current truth
- PR #452 is closed/superseded historical evidence only.
- PR #470 is the canonical Stage 5C DocumentEvidence consumer.
- PR #471 was rebased onto current `main@ab336832871daa9e7caddcc422fd0bac1c11bfb8`; no engineering-content conflict occurred.
- The T2.8 workbook candidate is exact to pinned `CRF-4-1` workbook literals and remains a non-published candidate.
- Independent copies of the EI 2nd edition corroborate the five valve functions and source semantics.
- Calculation qualification is `PASS` on a 9-test matrix.
- Final qualification is still `NOT_QUALIFIED` only because the exact controlled Git PDF has not been reconciled through DocumentEvidence.
- No production calculator/resolver consumes the candidate.
- No authority has changed.

### Exact source artifacts
Pinned workbook transcription source:
```text
repository = reallaksh19/CRF-4-1
commit     = 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
path       = Extended calc2/FIV.xlsx
blob       = bc0aedbefac54c1a2e5d643e76c047cb890bf14d
size       = 154500
sheet      = xl/worksheets/sheet4.xml
appendix   = APPENDIX - B Liquid Multiphase Valve Closure
```

Required controlled source:
```text
repository = reallaksh19/Common
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
```

### T2.8 characteristic recovered
```text
phi = -(A / Tclose) - B

full bore ball    A=1.281  B=0.27
reduced bore ball A=1.268  B=0.362
Butterfly         A=2.877  B=0.275
Globe             A=2.266  B=0.32
Gate              A=3.41   B=0.315
```

Independent EI 2nd-edition corroboration also established:
- valve functions valid through `Tclose = 30 s` inclusive;
- unknown valve type and/or closing time => assume `Globe` and `Tclose = 1 s` per inch of pipe diameter;
- sudden closure criterion is strict `Tclose < 2*Lup/c`;
- `Lup > 100 m` => `LOF=1.0` and detailed pressure-surge analysis;
- `Fmax < 1 kN` => `LOF=0.0`.

### Current status split
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

Mission: recover and qualify `EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1` without reviving #452, without substituting secondary evidence for the controlled Git object, and without granting authority or active-master publication.

Acceptance for this PR stage:
1. exact workbook coefficients and equation preserved;
2. source validity/default/boundary semantics independently corroborated;
3. focused calculation qualification passes all defined boundaries;
4. final qualification fails closed until controlled source is reconciled;
5. candidate is not production-consumed;
6. no workflow or unrelated production changes;
7. report, PR and live Git state remain handover-ready.

Explicit non-goals:
- no #452 `/v1/search` -> `/v1/convert` or Markdown path;
- no active master publication;
- no calculator/resolver integration;
- no T2.9, T4 or T3 recovery in this PR;
- no SBC rules or T3 chart digitization;
- no screening/design authority promotion;
- no `.github/workflows/*` changes;
- no merge without explicit owner authorization.

## Authority Trace / Invariants

```text
controlled EI publication authority
-> controlled Git PDF blob 9d3eccc...
-> DocumentEvidence Stage 5C evidence receipt
-> reviewed T2.8 semantic reconciliation
-> qualified candidate-master decision
-> optional future production consumption
-> separate screening/design authority review
```

Current workbook/public-copy path stops before controlled-source authority:
```text
pinned CRF workbook transcription + independent publication corroboration
-> calculation-qualified CANDIDATE
-> CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
```

Invariants:
- exact five coefficient pairs unchanged;
- `phi=-(A/t)-B` unchanged;
- `Tclose<=30 s` is explicit validity, not extrapolation;
- unknown type/time assumption is explicit evidence, not hidden fallback;
- `Lup>100` and `Fmax<1` preserve their LOF dispositions;
- final `QUALIFIED` requires controlled Git reconciliation;
- candidate is not an active master;
- engineering/screening/design authority remains frozen.

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | #470 remains canonical; #452 historical only. |
| DEC-002 | Decision | ACCEPTED | Calculation qualification, final qualification, publication and authority are distinct gates. |
| DEC-003 | Decision | ACCEPTED | Independent EI copies corroborate but cannot replace the controlled Git object. |
| DEC-004 | Decision | ACCEPTED | EI default assumption is explicit evidence, not silent runtime fallback. |
| FIND-001 | Finding | CONFIRMED | Five workbook functions match independent EI 2nd-edition copies. |
| FIND-002 | Finding | CONFIRMED | Tclose functions are valid through 30 s. |
| FIND-003 | Finding | CONFIRMED | Unknown valve type/time => Globe + 1 s/in diameter. |
| FIND-004 | Finding | CONFIRMED | Lup>100 => LOF1/detailed surge; Fmax<1 => LOF0. |
| FIND-005 | Finding | CONFIRMED | Sudden closure uses strict `<`. |
| RISK-001 | Risk | BLOCKED | Exact controlled PDF is not executable in this runtime. |
| RISK-002 | Risk | MITIGATED | Workbook omitted publication notes; candidate contract was corrected. |
| QST-001 | Question | RESOLVED | New main policy changes delivery protocol only; no T2.8 engineering overlap. |

## Implementation / Artifact State

Current changed files and purpose:

| File | Purpose | Engineering-sensitive | Current blob at rebased content head |
|---|---|---:|---|
| `docs/Masters/Vibration/ei-aviff-t28-valve-closure-characteristics.candidate.csv` | five-row candidate + explicit 30 s validity | yes | `be7f6d488addf98d6ede181fc522177b4e4e1f5c` |
| `ValidationRecords/VibrationMasters/ei-aviff-t28-valve-closure-workbook-candidate-v1.json` | workbook provenance + independent EI semantics | yes | `8e62c502ce42897b45b27559977de4b8b8e01bb7` |
| `ValidationRecords/VibrationMasters/ei-aviff-t28-qualification-review-v1.json` | split calculation/final qualification status | yes | `3c5d1ae6bcabd507d1da8a660555986d856b0ff8` |
| `tests/vibration-t28-workbook-candidate.test.mjs` | qualification regression | yes | `5ccd88913348d605bd88e0e3fc146a7f2f00a3b7` |
| `agents/PR471_workreport.md` | recovery/handover record | yes | report metadata commit follows content head |

No package, dependency, production-calculator, runtime, writer, UI or workflow file is changed.

## Validation Ledger

Every material result is classified by STATUS / OBSERVATION / ORACLE.

| Check | STATUS | OBSERVATION | ORACLE | Basis / limitation |
|---|---|---|---|---|
| Workbook coefficient extraction | PASS | SOURCE_INSPECTION | NONE | exact pinned CRF blob/sheet/formula literals; transcription source, not governing EI authority |
| Three cached workbook phi replays | PASS | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | validates transcription parity only |
| Independent EI semantic corroboration | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | three independent copies of same EI 2nd-edition publication; not controlled Git object |
| Stage 7 qualification matrix | PASS 9/9 | LOCAL_EXECUTION | AUTHORITATIVE_REFERENCE + IMPLEMENTATION_COUPLED | exact current candidate/provenance/test blobs; covers all source boundaries listed below |
| Rebase content equivalence | PASS | ARTIFACT_INSPECTION | NONE | four engineering/test blobs unchanged; only ancestry + policy baseline changed |
| Current main/merge base | PASS | REMOTE_EXECUTION | NONE | `ab336832...`; ahead 1 / behind 0 before report sync commit |
| Inline review threads | PASS | REMOTE_EXECUTION | NONE | 0 open threads observed |
| Commit status contexts | NOT_RUN | REMOTE_EXECUTION | NONE | GitHub returns no status contexts for rebased content head; not converted to product PASS |
| Controlled DocumentEvidence reconciliation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | endpoint/PDF unavailable; final blocker |
| Active-master publication | NOT_RUN | NOT_APPLICABLE | AUTHORITATIVE_REFERENCE | deliberately outside current authority |
| Screening/design authority | NOT_RUN | NOT_APPLICABLE | AUTHORITATIVE_REFERENCE | separate governance event required |

Stage 7 qualification matrix:
```text
1. exact five source coefficient rows                         PASS
2. three cached workbook phi replays                         PASS
3. all five valves at inclusive t=30 s                       PASS
4. t>30 s outside-validity rejection                         PASS
5. unknown valve type default assumption                     PASS
6. unknown closing time default assumption                   PASS
7. Lup=100 / Lup>100 and Fmax=1 / Fmax<1 boundaries          PASS
8. strict Tclose < 2*Lup/c equality-neighbor test            PASS
9. fail-closed final qualification/publication/authority     PASS
TOTAL                                                        9/9 PASS
```

Negative assurance:
- changed: candidate semantic contract now includes source validity/default/boundary meaning;
- unchanged: five A/B pairs, formula, controlled-source requirement, publication state and authority;
- not introduced: production consumption, fallback code, workflow changes, chart/rule data, master publication.

## Stage History

- Stage 1-3: report/PR allocation and canonical #470 verification — COMPLETE.
- Stage 4: exact controlled-source execution — BLOCKED (`ECONNREFUSED 127.0.0.1:8765`; binary unavailable).
- Stage 4A: pinned CRF workbook recovery — COMPLETE.
- Stage 5: T2.8 candidate/provenance copy — COMPLETE.
- Stage 6: workbook parity validation — COMPLETE (3/3 at the then-current exact blobs).
- Stage 7: independent source corroboration + corrected qualification matrix — COMPLETE (9/9); final controlled-source gate remains open.
- Policy reconciliation/rebase: COMPLETE onto `main@ab336832...`; no T2.8 engineering conflict.

## Coordination / Review / CI

Coordination check after policy #477:
```text
FILE OVERLAP: none found for exact T2.8 candidate/receipt/test paths
AUTHORITY OVERLAP: none found in live open-PR inventory for this T2.8 master
WORKSTREAM DEPENDENCY: #470 is merged predecessor/canonical DocumentEvidence dependency
POLICY PR OVERLAP: policy-only; no engineering file conflict
CLASSIFICATION: SAFE
```

Review state: no inline review threads observed on #471.
CI/check state: no commit status contexts returned for the rebased content head. This is `NOT_RUN`, not PASS.

## Appendix A — Implementation Takeover Qualification

`APPENDIX_A_STATUS: CURRENT`

This challenge set is required for any incoming agent before further engineering-sensitive mutation. It is not a generic theory quiz and no model answers are stored here.

- **A1 Production Trace (20):** trace one T2.8 valve type from the candidate CSV through provenance receipt, qualification review, #470 controlled-source route, and the exact point where active-master authority is currently blocked. Identify exact paths/blobs.
- **A2 Current Failure Isolation (20):** reproduce why `calculationQualificationStatus=PASS` while `qualificationStatus=NOT_QUALIFIED`; identify the sole remaining blocker and a falsifier that would permit promotion review.
- **A3 Authority / Invariant (20):** demonstrate from current artifacts which source may grant controlled evidence authority and which sources are only transcription/corroboration. Predict the unsafe consequence of treating public copies as the controlled object.
- **A4 Independent Validation (20):** independently reproduce at least one coefficient calculation plus the 30 s, Lup/Fmax, and unknown-input boundary semantics without using production output as the oracle; record expected/actual and oracle class.
- **A5 Next-Commit / Minimal Patch (20):** after a real DocumentEvidence T2.8 receipt exists, specify the minimal changed-file set and exact status fields that may change if the controlled source matches, and list the authority/publication fields that must remain frozen absent separate approval.

Default takeover threshold: total >=92/100 and every challenge >=17/20. Unsafe/fabricated authority claims fail immediately.

## Remaining Work / Exact Continuation

Only one gate remains for final T2.8 qualification:
1. make the exact controlled source reachable through the merged #470 DocumentEvidence consumer;
2. run discovery:
```bash
npm run recover:vibration-stage5c-evidence -- discover \
  --api http://127.0.0.1:8765 \
  --out /tmp/pr471-t28-discovery.json
```
3. explicitly review/select the actual T2.8 page/locator/candidate;
4. run `/v2/tables/extract` through the merged CLI;
5. reconcile extracted source evidence against the already calculation-qualified candidate;
6. if and only if exact source reconciliation passes, perform a narrow final-status promotion review.

Do not change without separate authority:
```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterValuesPublished = false
publicationState      = CANDIDATE
```

## Next-Agent Handover

Current stopping point: T2.8 calculation qualification complete; final controlled provenance gate blocked.
Branch state at report basis: rebased cleanly onto `main@ab336832...`, no engineering-content drift.
Do not redo: workbook extraction, coefficient discovery, source-note correction, 9/9 calculation qualification, or #452 workflow.
Start here: execute merged #470 DocumentEvidence against the exact controlled PDF when reachable.
Highest risk: changing final qualification/publication/authority because secondary evidence agrees numerically.
Handover readiness: `READY`.
