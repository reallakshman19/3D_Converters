# PR481 — T2.9 Valve Recovery Factors

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

PR_HEAD_OBSERVED: 57a71a74d5a793c06a5ef5e3ce14533db990cd42
REPORT_BASIS_HEAD: 57a71a74d5a793c06a5ef5e3ce14533db990cd42
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR481-002
CURRENT_STAGE: Stage 4 — four-row T2.9 FL candidate implementation — IN_PROGRESS
CURRENT_BLOCKER: exact controlled-EI DocumentEvidence reconciliation remains unavailable
HIGHEST_RISK: presenting secondary-publication FL rows as controlled-source-qualified values
EXACT_NEXT_ACTION: commit the four-row T2.9 candidate CSV, provenance receipt, and focused regression exactly as prevalidated; then rerun validation on the exact Git blobs and keep publication/authority fail-closed.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #481
Branch: `agent/vibration-t29-valve-recovery-factors`
Source issue: #450
Repository: `reallaksh19/3D_Converters`
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE` — no active T2.9/FL recovery overlap found; #471 explicitly excludes T2.9.

## Grounding Epoch GE-PR481-002

```text
verified date: 2026-08-14
live main: 36748e381012bb52ba720cc288101948115721bb
pre-implementation PR head: 57a71a74d5a793c06a5ef5e3ce14533db990cd42
merge base: 36748e381012bb52ba720cc288101948115721bb
changed files entering Stage 4: report only
source issue: #450
predecessor: #471 T2.8, scope-frozen and independent
coordination result: SAFE
```

## Handover in 60 Seconds

### Current truth
- #470 remains the canonical controlled-source DocumentEvidence architecture.
- #471 is scope-frozen T2.8 work and is not modified here.
- Every workbook under the Owner-specified `CRF-4-1@68dc8e1.../Extended calc2` tree was inventoried.
- The only direct FIV workbook in that tree, `Extended calc2/FIV.xlsx`, was decoded at ZIP/XML level and is T2.8 valve-transient content, not T2.9.
- `FIV.xlsx` shared strings contain T2.8 Appendices A/B/C and no cavitation/flashing or pressure-recovery-factor label.
- `FIV.xlsx` `sheet5.xml` was reconstructed with exact uncompressed length/CRC and is titled `APP C - Liquid or Multiphase Valve Opening`.
- A sibling pinned workbook explicitly named `KS-PR-CAL-0089 Vibration Assessment - Cavitation & Flashing Calculation V and V.xlsx` was also decoded. Its workbook contains only `Coversheet` and `Checklist`; its 54 shared strings are verification/checklist metadata, not a numerical FL table.
- Therefore no honest workbook-cell source exists in the inspected Git workbooks for the complete four-row T2.9 table.
- Multiple independent copies of EI AVIFF 2nd edition section T2.9.2, printed page 69, reproduce the same four typical FL rows exactly:
  - Ball = 0.60
  - Butterfly = 0.62
  - Globe = 0.90
  - Gate = 0.60
- The same EI section states the valve pressure-drop term `delta = FL^2 * (P1 - 0.96 * Pv)`.
- A public transcription of a project vibration assessment independently shows the T2.9 input `Globe` with `FL=0.900` and `delta=11050579.742` for `P1=13789500 Pa`, `Pv=152926 Pa`, matching the EI equation.
- These rows may be committed only as a secondary-source `CANDIDATE`; exact controlled-Git reconciliation is still required before final qualification/publication.

## Mission

Recover `EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1`, preserve the source/applicability semantics, validate it independently, and keep controlled-source, qualification, publication, and authority states separate.

Target candidate:
```text
docs/Masters/Vibration/ei-aviff-t29-valve-recovery-factors.candidate.csv
```

Minimum semantics:
```text
valveType
FL
applicability
sourceLocator
```

Unknown valve type is fail-closed `NOT_READY`; no nearest/generic fallback.

## Source Investigation

### Owner-requested workbook root
```text
repository = reallaksh19/CRF-4-1
commit     = 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
root       = Extended calc2
```

Exact root inventory included AIV/FIT/SBC/FIV plus relief, slug, pressure, flange, trunnion, structural-support and welded-shoe workbooks. No workbook except FIV had a plausible T2.9 vibration identity.

### FIV workbook — target ruled out by actual content
```text
path = Extended calc2/FIV.xlsx
blob = bc0aedbefac54c1a2e5d643e76c047cb890bf14d
size = 154500
sharedStrings count = 179
sharedStrings CRC32 = fe58bb23
sheet5 uncompressed bytes = 136883
sheet5 CRC32 = df699df1
sheet5 title = APP C - Liquid or Multiphase Valve Opening
finding = T2.8 valve transient workbook; no T2.9/FL table label
```

### Explicit cavitation/flashing sibling workbook — verification shell, not numerical source
```text
path = Enhanced stress report/extended calc/KS-PR-CAL-0089 Vibration Assessment - Cavitation & Flashing Calculation V and V.xlsx
blob = 8c6c3e9771675d9463ed15361ff0f6035dab8c87
size = 903076
workbook sheets = Coversheet | Checklist
sharedStrings count = 54
sharedStrings CRC32 = 89e74d7b
finding = Worley verification/checklist shell; no numerical FL table in workbook cells
```

### Independent EI secondary corroboration
```text
publication = Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework, 2nd edition
section = T2.9.2
printed page = 69
role = navigation/reconciliation only until controlled Git object executes
copies checked = 4
rows = Ball 0.60 | Butterfly 0.62 | Globe 0.90 | Gate 0.60
valve delta equation = FL^2 * (P1 - 0.96 * Pv)
```

Controlled EI identity remains:
```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
controlled execution = BLOCKED_ENVIRONMENT
```

## Scope

IN:
- four-row T2.9 `FL` candidate table;
- exact source/applicability metadata and negative workbook findings;
- fail-closed unknown valve lookup behavior;
- focused regression and independent equation replay;
- controlled-source reconciliation later when reachable.

OUT:
- T2.8 changes;
- T4/T3/SBC/curve work;
- production calculator/resolver integration;
- full T2.9 cavitation/flashing decision-logic implementation;
- workflow/dependency changes;
- authority promotion;
- merge.

## Engineering Decisions / Risks

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | #470 remains canonical controlled-source architecture. |
| DEC-002 | Decision | SUPERSEDED | Do not describe the four FL rows as workbook-derived: requested workbook audit did not contain the table. |
| DEC-003 | Decision | ACCEPTED | Unknown valve type fails closed `NOT_READY`; nearest/generic fallback forbidden. |
| DEC-004 | Decision | ACCEPTED | FL lookup and cavitation/flashing decision logic remain separate engineering artifacts. |
| DEC-005 | Decision | ACCEPTED | The four EI rows may be stored only as a secondary-source candidate pending exact controlled-source reconciliation. |
| RISK-001 | Risk | RESOLVED | FIV hidden-table misclassification was eliminated by actual ZIP/XML source inspection. |
| RISK-002 | Risk | ACTIVE | Secondary/publication copies must not be promoted to controlled authority. |
| RISK-003 | Risk | ACTIVE | A project worked-result transcription corroborates Globe 0.900 but cannot establish all table rows. |

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterValuesPublished = false
publicationState      = CANDIDATE at maximum
qualificationStatus   = NOT_QUALIFIED until controlled-source reconciliation
```

## Validation Contract / Ledger

| Check | STATUS | OBSERVATION | ORACLE | Basis / limitation |
|---|---|---|---|---|
| live main / PR grounding | PASS | REMOTE_EXECUTION | NONE | `main@36748e38...` |
| requested workbook inventory | PASS | SOURCE_INSPECTION | NONE | exact pinned Git tree |
| FIV ZIP/shared-string/sheet identity | PASS | SOURCE_INSPECTION | NONE | CRC/size validated; T2.9 ruled out |
| cavitation sibling workbook identity | PASS | SOURCE_INSPECTION | NONE | workbook.xml + sharedStrings; verification shell |
| independent EI FL table corroboration | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | 4 independent secondary copies; not controlled Git object |
| planned candidate regression | PASS 5/5 | LOCAL_EXECUTION | AUTHORITATIVE_REFERENCE + IMPLEMENTATION_COUPLED | prevalidated exact intended file contents |
| controlled DocumentEvidence reconciliation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | provider/PDF unavailable |
| active-master publication | NOT_RUN | NOT_APPLICABLE | AUTHORITATIVE_REFERENCE | outside current authority |

Prevalidated regression coverage:
1. exact four-row FL table;
2. unknown valve types fail `NOT_READY`;
3. Globe `FL=0.9` reproduces independent `delta=11050579.7424 Pa` example;
4. negative workbook findings retained without invented cells;
5. candidate/publication/authority freeze.

## Changed-File Ledger

Current Git diff before Stage 4 engineering commit:
- `agents/PR481_workreport.md` only.

Planned Stage 4 files:
- `docs/Masters/Vibration/ei-aviff-t29-valve-recovery-factors.candidate.csv`
- `ValidationRecords/VibrationMasters/ei-aviff-t29-valve-recovery-candidate-v1.json`
- `tests/vibration-t29-workbook-candidate.test.mjs`

## Appendix A — Implementation Takeover Qualification

`APPENDIX_A_STATUS: CURRENT`

A1 Production/source trace: target rows trace to EI T2.9.2 page 69; workbook investigations are explicit negative evidence.
A2 Failure isolation: FIV and the named cavitation workbook were decoded and proven not to contain the complete target table.
A3 Authority/invariant: candidate only; controlled source remains higher authority; unknown valve fail-closed.
A4 Independent validation: published EI row set and Globe delta equation are independent expected values; test does not import candidate constants as oracle.
A5 Minimal patch: CSV + provenance + focused test only; no runtime/decision-logic integration.

Qualification disposition: `CURRENT / WRITE_ALLOWED` for the bounded Stage 4 candidate commit.

## Stage Roadmap

1. Report initialization — COMPLETE.
2. PR allocation/report migration — COMPLETE.
3. Requested workbook investigation — COMPLETE; target table not present.
4. Secondary-source four-row candidate + provenance + focused test — IN_PROGRESS.
5. Exact-Git validation and handover — NEXT.
6. Controlled-source reconciliation — BLOCKED_ENVIRONMENT until #470 provider/source becomes reachable.
7. Separate follow-on: full T2.9 decision logic/integration only after master reconciliation and explicit scope.

No merge is authorized.
