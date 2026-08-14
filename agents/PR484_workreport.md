# PR484 — SBC T3 Non-Curve Master Recovery

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: 55583e7a4bde8c42f84fe32086d18ecc292dc24e
REPORT_BASIS_HEAD: 55583e7a4bde8c42f84fe32086d18ecc292dc24e
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR484-002
CURRENT_STAGE: Stage 4 — five-family non-curve candidate implementation — IN_PROGRESS
CURRENT_BLOCKER: CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
HIGHEST_RISK: mixing secondary-source EI values with the older project/JIP workbook or accidentally importing T3 chart data into the non-curve master set
EXACT_NEXT_ACTION: commit the five prevalidated candidate CSVs, one provenance receipt, and one focused 7-test regression exactly as gated; then validate the exact Git blobs and freeze PR #484.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #484
Branch: `agent/vibration-t3-sbc-tables`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / MERGEABLE / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE`

## Handover in 60 Seconds

### Current truth
- #470 remains the canonical controlled-source DocumentEvidence architecture.
- #452 remains historical/superseded; its page hints and Markdown are not source authority.
- Independent EI AVIFF 2nd-edition copies reproduce the full non-curve T3 source data needed for this PR:
  - Flowchart T3-3 / Appendix C: five geometry-score dimensions;
  - Flowchart T3-9 / C.1.10: location + parent-schedule scores and location rules;
  - Table T3-1: fitting span factors;
  - Table T3-2: minimum first spans to deck/structural steelwork;
  - Table T3-3: minimum spans between two main lines.
- Figures T3-1…T3-4 are excluded and no curve point is present in the candidate set.
- Owner-directed project workbook remains pinned as `CRF-4-1/.../SBC.xls`, blob `69c02f...`, but it is not used as EI authority. Prior project-workbook inspection showed MTD/JIP lineage; EI Appendix A explicitly documents SBC changes from MTD including added SBC types, expanded fitting types, and changed location methodology.
- Candidate package is prevalidated locally: 7/7 PASS.
- The D.5 source example independently reproduces `LOFGEOM=0.66` from scores `0.9, 0.7, 0.5, 0.5, 0.7`.
- D.6 location independently reproduces `LOFLOC=0.8` from Bend `0.9` and Schedule 40 `0.7`.
- D.7 first-span rule and D.8 between-main-lines rule independently reproduce the source `0.7` / `0.2` dispositions.
- Controlled-Git reconciliation remains NOT_RUN/BLOCKED_ENVIRONMENT.

## Candidate families

```text
EI_AVIFF.T3.SBC.GEOMETRY_SCORES.v1
EI_AVIFF.T3.SBC.LOCATION_SCORES.v1
EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1
EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1
EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1
```

Planned candidate files:
```text
docs/Masters/Vibration/ei-aviff-t3-sbc-geometry-scores.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-location-scores.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-fitting-span-factors.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-first-span-limits.candidate.csv
docs/Masters/Vibration/ei-aviff-t3-sbc-between-main-lines-limits.candidate.csv
ValidationRecords/VibrationMasters/ei-aviff-t3-sbc-non-curve-candidate-v1.json
tests/vibration-t3-sbc-non-curve-candidate.test.mjs
```

## Source recovery

### Controlled EI identity
```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
execution  = BLOCKED_ENVIRONMENT
```

### Secondary EI locators
```text
geometry scoring     = Flowchart T3-3 printed page 74 + Appendix C.1.1-C.1.4/C.1.9
location scoring     = Flowchart T3-9 printed page 80 + Appendix C.1.10
fitting span factors = Table T3-1 printed page 81
first span limits    = Table T3-2 printed page 81
between-main limits  = Table T3-3 printed page 82
```

### Geometry rule set
`LOFGEOM` is the arithmetic mean of five source scores:
1. fitting type;
2. branch length;
3. valve/flange mass category with separate rule for rating below vs at/above ANSI 900;
4. parent pipe schedule;
5. minimum SBC diameter.

Fitting scores range from Short Contoured Body `0.4` to Set-on/Set-in/Set-thru `1.3`. Branch-length scores are `<=200:0.1`, `>200..400:0.3`, `>400..600:0.7`, `>600:0.9`. Below ANSI 900: flange only `0.2`, one/integral DBB `0.5`, two+ `0.9`; at/above ANSI 900: flange only `0.5`, one+ `0.9`. Schedule scores are `10S .9 / 20 .8 / 40 .7 / 80 .5 / 160 .3 / >160 .3`; if between listed schedules, use the lower standard schedule. Minimum diameter scores are `0.5in .9 / 0.75 .8 / 1 .7 / 1.5 .6 / 2 .5`.

### Location rule set
Location Score A:
```text
Valve 0.9       within +/-10D
Reducer 0.9     within +/-10D
Bend 0.9        within +/-10D
Tee 0.9         within +/-10D
Mid span 0.7    when none of the others apply
Partial support 0.6 within +/-2D
Fixed support 0.1   within +/-2D
```
Parent-schedule Score B is the same `10S/.9 ... >160/.3` matrix. Fixed support overrides other location candidates when applicable; otherwise use the highest applicable other score; otherwise Mid Span. If main-line LOF is unknown, it defaults to 1.0 for the SBC assessment and `LOFLOC=1`; if known and `>=1`, `LOFLOC=1`; otherwise `LOFLOC=mean(A,B)`.

### Table T3-1 fitting span factors
```text
Short Contoured Body 1.00
Contoured Body / Forged Reducing Tee / Welded Tee 0.85
Weldolet / fully-back-welded Threadolet / fully-back-welded Screwed 0.70
Threadolet / Screwed / Sockolet 0.65
partially-back-welded Threadolet / Screwed 0.60
Set-on / Set-in / Set-thru 0.55
```

### Table T3-2 first-span limits (inches -> m)
```text
0.25 0.7 | 0.375 0.8 | 0.5 0.8 | 0.75 0.9
1.0 1.1 | 1.25 1.2 | 1.5 1.3 | 2.0 1.4
```

### Table T3-3 between-main-lines limits (inches -> m)
```text
0.25 1.0 | 0.375 1.1 | 0.5 1.1 | 0.75 1.3
1.0 1.6 | 1.25 1.7 | 1.5 1.8 | 2.0 2.0
```

### Span semantics retained, curves excluded
- maximum-span curve use: divide actual span by fitting factor before Figure T3-1…T3-4;
- minimum-span table use: multiply actual span by fitting factor before Table T3-2/T3-3;
- below minimum => geometric component `0.7`; at/above minimum => `0.2`;
- no figure point or interpolation data is in this PR.

## Project workbook disposition

```text
repository = reallaksh19/CRF-4-1
commit     = 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
path       = Extended calc2/AIV FIV/SBC.xls
blob       = 69c02f600f84647ececdbf08e1f86fc8dc3fc723
size       = 91648
status     = NOT_USED_AS_EI_SOURCE
```

Reason: project workbook identity and observed MTD/JIP lineage do not establish EI 2nd-edition authority. The EI edition itself records material changes from MTD to the SBC method. No workbook cell is being promoted into these candidates.

## Scope / negative assurance

IN: five non-curve candidate families, provenance, rule semantics, source-example validation.

OUT: all T3 curves/points, production SBC calculation, #452 normalization, workflow/dependency changes, T2.8/T2.9/T4 changes, authority promotion, merge.

## Authority Freeze

```text
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
masterValuesPublished = false
publicationState      = CANDIDATE
qualificationStatus   = NOT_QUALIFIED
qualificationBlocker  = CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
```

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE | Basis / limitation |
|---|---|---|---|---|
| live main / PR / overlap grounding | PASS | REMOTE_EXECUTION | NONE | current main unchanged; no overlap |
| EI geometry-score recovery | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | multiple secondary EI copies |
| EI location-rule recovery | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | T3-9 + C.1.10 |
| T3-1/T3-2/T3-3 row recovery | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | multiple secondary EI copies |
| project SBC.xls authority classification | PASS | SOURCE_INSPECTION + INHERITED_INSPECTION | NONE | not used as EI source |
| planned candidate regression | PASS 7/7 | LOCAL_EXECUTION | AUTHORITATIVE_REFERENCE + IMPLEMENTATION_COUPLED | prevalidated exact intended bytes |
| controlled DocumentEvidence reconciliation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | provider/PDF unavailable |
| active publication / authority | NOT_APPLICABLE | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | outside current scope |

Initial prevalidation produced one floating-representation mismatch for source `0.66` (`0.6599999999999999`); the assertion was corrected to an explicit `1e-12` numerical tolerance. No source value, expected result, or engineering tolerance was weakened or fitted.

## Appendix A — Implementation Takeover Qualification

`APPENDIX_A_STATUS: CURRENT / WRITE_ALLOWED` for the bounded seven-file candidate commit.

A1: every family is traced to T3-3/T3-9/T3-1/T3-2/T3-3 source regions.
A2: project workbook is explicitly isolated from EI source authority.
A3: candidates remain non-published/no-authority and curves remain excluded.
A4: D.5/D.6/D.7/D.8 independent source examples validate representative aggregation/location/minimum-span behavior.
A5: minimal patch is five CSVs + one provenance receipt + one focused test; no runtime integration.

## Roadmap

1. Report/PR allocation — COMPLETE.
2. Project-workbook classification + independent EI source recovery — COMPLETE.
3. Five-family candidate design + prevalidation — COMPLETE / PASS 7/7.
4. Candidate/provenance/test Git commit — IN_PROGRESS.
5. Exact-Git validation + handover — NEXT.
6. Controlled-source reconciliation — BLOCKED_ENVIRONMENT.
7. Separate later PR for Figures T3-1…T3-4 digitization.

No merge is authorized.
