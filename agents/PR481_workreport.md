# PR481 — T2.9 Valve Recovery Factors

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

PR_HEAD_OBSERVED: adef1a8cdc0f0e9d6f300a2f472df2e8cfaf23e9
REPORT_BASIS_HEAD: adef1a8cdc0f0e9d6f300a2f472df2e8cfaf23e9
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR481-001
CURRENT_STAGE: Stage 2 — PR allocation / workbook source investigation
CURRENT_BLOCKER: NONE
HIGHEST_RISK: copying an FL lookup from a project workbook without preserving applicability/source semantics or silently treating it as an active engineering master
EXACT_NEXT_ACTION: decode `reallaksh19/CRF-4-1@68dc8e1fa2ef67073c59b3afc56f1bf40953d535/Extended calc2/FIV.xlsx` and locate T2.9 cavitation/flashing valve pressure-recovery-factor FL evidence by exact sheet/cell/formula semantics before implementing any candidate values.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #481
Branch: `agent/vibration-t29-valve-recovery-factors`
Source issue: #450
Repository: `reallaksh19/3D_Converters`
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE` — live open-PR searches found no active T2.9/FL/cavitation-flashing recovery PR; #471 explicitly excludes T2.9.

## Grounding Epoch GE-PR481-001

```text
live main: 36748e381012bb52ba720cc288101948115721bb
PR allocation head: adef1a8cdc0f0e9d6f300a2f472df2e8cfaf23e9
merge base: 36748e381012bb52ba720cc288101948115721bb
initial PR diff: report only
source issue: #450
predecessor: #471 T2.8, scope-frozen and independent
open T2.9/FL overlap: none found
coordination result: SAFE
```

## Mission

Recover the EI AVIFF T2.9 valve pressure-recovery-factor `FL` lookup and its applicability semantics from pinned project workbook evidence, validate it independently where possible, and publish only a governed candidate/reference artifact. Do not grant active-master, screening, design, or engineering authority.

Target master from issue #450:
```text
docs/Masters/Vibration/ei-aviff-t29-valve-recovery-factors.csv
```

Minimum expected semantic fields:
```text
valveType
FL
applicability
sourceLocator
```

Unknown valve type must remain fail-closed (`NOT_READY`) unless the governing source explicitly defines another rule.

## Source Plan

Primary immediate transcription/reference search:
```text
repository = reallaksh19/CRF-4-1
commit     = 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
root       = Extended calc2
```

Exact workbook inventory under that root was inspected from the pinned Git tree. Direct vibration workbooks are AIV/FIT/SBC plus:
```text
Extended calc2/FIV.xlsx
blob = bc0aedbefac54c1a2e5d643e76c047cb890bf14d
size = 154500
```
The remaining workbooks under the requested root are structural, external-pressure, flange, relief, slug, trunnion, or welded-shoe calculations and are not T2.9 candidates by workbook identity. `FIV.xlsx` is therefore the first cell-level extraction target; no FL value is accepted until its sheet/cell semantics prove T2.9 identity.

Independent project-workbook corroboration may later use the pinned sibling source outside the requested root:
```text
Enhanced stress report/extended calc/KS-PR-CAL-0089 Vibration Assessment - Cavitation & Flashing Calculation V and V.xlsx
blob = 8c6c3e9771675d9463ed15361ff0f6035dab8c87
size = 903076
```
This may corroborate but does not become controlled EI authority.

Controlled EI authority remains:
```text
repository = reallaksh19/Common
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
```

## Scope

IN:
- inspect all Excel workbooks under the pinned `Extended calc2` tree for T2.9/FL/cavitation/flashing evidence;
- recover exact source literals/lookup rows/formulas with Git/blob/sheet/cell provenance;
- create a candidate FL artifact only when workbook evidence is unambiguous;
- preserve applicability and fail-closed unknown-key behavior;
- add focused independent/replay validation and provenance receipts;
- keep report continuously synchronized.

OUT:
- T2.8 changes;
- T4 thermowell recovery;
- T3/SBC tables or curves;
- active production resolver/calculator consumption unless separately approved in this mission;
- workflow changes;
- #452 v1/Markdown path;
- authority promotion;
- merge.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterValuesPublished = false
publicationState      = CANDIDATE at maximum without separate promotion evidence/review
```

## Engineering Decisions / Risks

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | #470 DocumentEvidence remains canonical controlled-source architecture. |
| DEC-002 | Decision | ACCEPTED | Workbook-derived T2.9 values are candidate/reference evidence until controlled-source reconciliation. |
| DEC-003 | Decision | ACCEPTED | Unknown valve type must fail closed unless source explicitly defines a fallback. |
| DEC-004 | Decision | ACCEPTED | T2.9 FL lookup and cavitation/flashing decision logic are separate engineering artifacts. |
| RISK-001 | Risk | ACTIVE | Hidden workbook lookup columns may be adjacent to unrelated tables; source-cell semantics must be proven before copying. |
| RISK-002 | Risk | ACTIVE | T2.9 decision logic and FL lookup must not be conflated. |
| RISK-003 | Risk | ACTIVE | Controlled PDF execution may remain environment-blocked; public/project copies cannot substitute as controlled authority. |

## Validation Contract

Every material check records:
```text
STATUS      = PASS | FAIL | NOT_RUN | NOT_APPLICABLE
OBSERVATION = LOCAL_EXECUTION | REMOTE_EXECUTION | SOURCE_INSPECTION | ARTIFACT_INSPECTION | USER_SUPPLIED | INFERRED | NOT_OBSERVED
ORACLE      = NONE | IMPLEMENTATION_COUPLED | INDEPENDENT_REPRODUCTION | ANALYTICAL | AUTHORITATIVE_REFERENCE | CROSS_SOLVER | EXPERIMENTAL
```

Current validation:
- live `main`/branch grounding: PASS / REMOTE_EXECUTION / NONE;
- open-PR overlap for T2.9: PASS / REMOTE_EXECUTION / NONE;
- exact requested workbook inventory: PASS / SOURCE_INSPECTION / NONE;
- workbook T2.9 cell/formula extraction: IN_PROGRESS;
- controlled EI reconciliation: NOT_RUN;
- candidate publication: NOT_RUN;
- engineering authority: NOT_APPLICABLE / remains frozen.

## Appendix A — Implementation Takeover Qualification

`APPENDIX_A_STATUS: CURRENT`

For any incoming agent before engineering-sensitive mutation:
- A1 Production Trace: locate the exact T2.9 lookup evidence and trace it to any candidate row.
- A2 Failure Isolation: prove a candidate FL value comes from T2.9 semantics rather than an adjacent unrelated table.
- A3 Authority/Invariant: distinguish project-workbook transcription from controlled EI authority and preserve fail-closed unknown-key behavior.
- A4 Independent Validation: independently reproduce at least one lookup/criterion without importing the production candidate as the expected oracle.
- A5 Minimal Patch: identify the smallest candidate/provenance/test file set and protected authority fields.

Threshold: total >=92/100 and every challenge >=17/20.

## Stage Roadmap

1. Report initialization — COMPLETE.
2. Allocate draft PR and migrate report to `agents/PR481_workreport.md` — IN_PROGRESS.
3. Inventory/inspect every pinned `Extended calc2` workbook for T2.9/FL evidence — inventory COMPLETE; cell-level FIV extraction IN_PROGRESS.
4. Recover exact lookup/applicability source and create candidate/provenance artifacts if unambiguous.
5. Independent/cached-value qualification and boundary tests.
6. Controlled-source reconciliation when exact DocumentEvidence source becomes reachable.
7. Handover; no merge without explicit Owner authorization.
