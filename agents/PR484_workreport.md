# PR484 — SBC T3 Non-Curve Master Recovery

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: 2d0d4286f1bb47287b4578db36016e1b1496fcd8
REPORT_BASIS_HEAD: 2d0d4286f1bb47287b4578db36016e1b1496fcd8
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR484-001
CURRENT_STAGE: Stage 2 — PR allocation / exact source investigation
CURRENT_BLOCKER: controlled EI DocumentEvidence execution unavailable
HIGHEST_RISK: confusing project/JIP SBC workbook rules with EI AVIFF T3 source tables, or mixing chart-derived values into non-curve masters
EXACT_NEXT_ACTION: inspect the pinned `Extended calc2/AIV FIV/SBC.xls` workbook cell-by-cell and independently recover EI T3 non-curve table/rule semantics; accept rows only when source identity and table/rule meaning are unambiguous.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #484
Branch: `agent/vibration-t3-sbc-tables`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE` — no open SBC T3 table/rule recovery PR found.

## Mission

Recover the five non-curve EI AVIFF T3 Small Bore Connection master families as governed candidates, preserving table/rule semantics and source provenance without importing chart points or reviving #452 Markdown normalization.

Target families:
```text
EI_AVIFF.T3.SBC.GEOMETRY_SCORES.v1
EI_AVIFF.T3.SBC.LOCATION_SCORES.v1
EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1
EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1
EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1
```

Target candidate paths:
```text
docs/Masters/Vibration/ei-aviff-t3-sbc-geometry-scores.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-location-scores.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-fitting-span-factors.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-first-span-limits.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-between-main-lines-limits.candidate.csv
```

Figures T3-1…T3-4 and any curve digitization are explicitly OUT of this PR.

## Grounding Epoch GE-PR484-001

```text
live main: 36748e381012bb52ba720cc288101948115721bb
PR allocation head: 2d0d4286f1bb47287b4578db36016e1b1496fcd8
merge base: 36748e381012bb52ba720cc288101948115721bb
initial PR diff: report only
source issue: #450
predecessors: #481 T2.9 and #482 T4 are separate draft/unmerged workstreams
open SBC T3 overlap: none found
coordination result: SAFE
```

## Source plan

Owner-directed pinned workbook:
```text
repository = reallaksh19/CRF-4-1
commit     = 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
path       = Extended calc2/AIV FIV/SBC.xls
blob       = 69c02f600f84647ececdbf08e1f86fc8dc3fc723
size       = 91648
```

Known caution: the same blob appears elsewhere under an `UNCHECKED` Small Bore Vibration Calculation name and prior binary-string inspection indicated Joint Industry/MTD SBC content. Therefore workbook values are not assumed to be EI T3 values; exact cell semantics must be proven.

Controlled EI identity:
```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
execution  = BLOCKED_ENVIRONMENT
```

Independent EI copies may be used for navigation/reconciliation only until exact controlled-Git execution is available.

## Scope

IN:
- exact workbook cell/formula audit of pinned SBC.xls;
- EI geometry score rule recovery;
- EI location score rule recovery;
- fitting span-factor table;
- first-span limit table;
- between-main-lines span-limit table;
- candidate provenance and focused independent tests;
- fail-closed unknown categories/ranges;
- separation between table/rule values and later chart curves.

OUT:
- Figures T3-1…T3-4 digitization;
- arbitrary curve fitting/interpolation;
- production SBC calculator integration;
- #452 `/v1`/Markdown path;
- T2.8/T2.9/T4 changes;
- workflows/dependencies;
- authority promotion;
- merge.

## Authority Freeze

```text
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
masterValuesPublished = false
publicationState      = CANDIDATE at maximum
qualificationStatus   = NOT_QUALIFIED until controlled-source reconciliation
```

## Engineering decisions / risks

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | #470 DocumentEvidence remains canonical controlled-source architecture. |
| DEC-002 | Decision | ACCEPTED | #452 page hints/Markdown are historical only and are not source evidence. |
| DEC-003 | Decision | ACCEPTED | T3 curves are excluded; non-curve tables/rules must not contain chart-derived points. |
| DEC-004 | Decision | ACCEPTED | Project/JIP workbook content must be classified before use; filename similarity is insufficient. |
| RISK-001 | Risk | ACTIVE | SBC.xls may implement a different/JIP methodology and could contaminate EI T3 recovery if copied blindly. |
| RISK-002 | Risk | ACTIVE | Geometry/location scoring may be rule text rather than simple numeric tables; preserve rule semantics explicitly. |
| RISK-003 | Risk | ACTIVE | Span tables may depend on fitting/configuration labels whose taxonomy must be copied exactly, not normalized speculatively. |

## Validation contract

Every material check records STATUS / OBSERVATION / ORACLE. Implementation-coupled workbook replay and independent EI authoritative-reference validation remain separate.

## Appendix A

`APPENDIX_A_STATUS: CURRENT`

A1 trace each candidate family to exact source region/table/rule; A2 isolate workbook methodology versus EI methodology; A3 preserve candidate/control/authority boundaries; A4 independently reproduce representative rows and rule branches; A5 minimal patch keeps the five non-curve families separate from T3 curves/runtime integration.

## Roadmap

1. Report initialization — COMPLETE.
2. Draft PR allocation/report migration — IN_PROGRESS.
3. Exact pinned SBC.xls audit and EI source navigation.
4. Recover five non-curve candidate families with provenance.
5. Independent row/rule/boundary validation.
6. Exact-Git handover; controlled reconciliation remains separate.
7. Separate later PR for T3-1…T3-4 chart digitization.

No merge is authorized.
