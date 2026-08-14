# PR482 — T4 Thermowell Wall Modifier

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: dfb0f812baa32f264e74837dd90e12520ded8ad8
REPORT_BASIS_HEAD: dfb0f812baa32f264e74837dd90e12520ded8ad8
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR482-002
CURRENT_STAGE: Stage 3 — Table T4-1 candidate implementation — IN_PROGRESS
CURRENT_BLOCKER: CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
HIGHEST_RISK: losing categorical schedule-band semantics or promoting secondary-source values to active authority
EXACT_NEXT_ACTION: commit the prevalidated candidate CSV, provenance receipt, and focused test; then rerun 5/5 against exact Git blobs and freeze scope.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #482
Branch: `agent/vibration-t4-wall-modifier`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE`

## Handover in 60 Seconds

- Table T4-1 is independently reproduced in multiple EI 2nd-edition copies at T4.2.2, printed page 87.
- Exact rows:
  - `SCHEDULE_160_OR_GREATER`: FM 0.96 / 4-way gusset 0.98
  - `SCHEDULE_80_TO_LT_160`: FM 0.93 / 0.96
  - `SCHEDULE_40_TO_LT_80`: FM 0.85 / 0.93
  - `LESS_THAN_SCHEDULE_40`: FM 0.42 / 0.85
- 4-way welded gussets are described at 90-degree intervals around the connection.
- Bands are categorical. No interpolation, nearest-band, or implicit `STD` mapping is allowed.
- Independent thermowell worked example: actual wall 9.5 mm < Schedule 40 wall 11.1 mm, so `LESS_THAN_SCHEDULE_40` and `FM=0.42` without gussets.
- No thermowell-named workbook was located in the pinned CRF repository; no workbook cell provenance is claimed.
- Candidate package is prevalidated locally 5/5 and remains non-published / no authority.

## Mission / candidate

```text
masterId = EI_AVIFF.T4.WALL_MODIFIER.v1
candidate = docs/Masters/Vibration/ei-aviff-t4-wall-modifier.candidate.csv
```

Controlled source:
```text
repository = reallaksh19/Common
commit     = fb549185b9b27edc2379734240320a85c5bef9f6
path       = EI - AVIFF Guidelines 2nd Edition.pdf
blob       = 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size       = 10348594
section    = T4.2.2
printed page = 87
execution  = BLOCKED_ENVIRONMENT
```

## Scope

IN: exact four categorical bands, both FM columns, provenance, fail-closed unknown band, worked-example replay, focused tests.

OUT: numeric schedule interpolation; thermowell geometry/natural-frequency equations; production resolver integration; ASME PTC 19.3 TW; T2.9/T3/SBC/charts; workflows; authority promotion; merge.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterValuesPublished = false
publicationState      = CANDIDATE
qualificationStatus   = NOT_QUALIFIED
qualificationBlocker  = CONTROLLED_SOURCE_RECONCILIATION_REQUIRED
```

## Validation Ledger

| Check | STATUS | OBSERVATION | ORACLE | Limitation |
|---|---|---|---|---|
| live main / overlap | PASS | REMOTE_EXECUTION | NONE | current main unchanged |
| T4-1 row corroboration | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | secondary copies, not controlled Git object |
| worked-example FM 0.42 | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | secondary copy |
| planned candidate regression | PASS 5/5 | LOCAL_EXECUTION | AUTHORITATIVE_REFERENCE + IMPLEMENTATION_COUPLED | intended bytes prevalidated |
| controlled reconciliation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | provider/PDF unavailable |

Prevalidated tests cover exact rows, explicit gusset-column selection, unknown band `NOT_READY`, `< Sch40 => FM 0.42` worked example, and authority/publication freeze.

## Planned changed files

- `docs/Masters/Vibration/ei-aviff-t4-wall-modifier.candidate.csv`
- `ValidationRecords/VibrationMasters/ei-aviff-t4-wall-modifier-candidate-v1.json`
- `tests/vibration-t4-wall-modifier-candidate.test.mjs`
- this report

## Appendix A

`APPENDIX_A_STATUS: CURRENT / WRITE_ALLOWED` for the bounded three-file candidate commit. The authoritative oracle is the published Table T4-1 row set; tests must not derive expected values from the candidate.

## Roadmap

1. Report/PR allocation — COMPLETE.
2. Independent source recovery — COMPLETE.
3. Candidate/provenance/test commit — IN_PROGRESS.
4. Exact-Git validation + handover — NEXT.
5. Controlled-source reconciliation — BLOCKED_ENVIRONMENT.

No merge is authorized.
