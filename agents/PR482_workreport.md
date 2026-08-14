# PR482 — T4 Thermowell Wall Modifier

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: e133a2bf71a1b9aa2d1af97b7ee4424a32c85b68
REPORT_BASIS_HEAD: e133a2bf71a1b9aa2d1af97b7ee4424a32c85b68
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR482-001
CURRENT_STAGE: Stage 2 — PR allocation / candidate preparation
CURRENT_BLOCKER: controlled EI DocumentEvidence execution unavailable
HIGHEST_RISK: losing schedule-band applicability semantics or promoting secondary-source values to active authority
EXACT_NEXT_ACTION: commit Table T4-1 exactly as four categorical schedule bands with both plain and 4-way-gusset FM values, provenance, and focused boundary/worked-example tests.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
PR: #482
Branch: `agent/vibration-t4-wall-modifier`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
PR state: `DRAFT / OPEN / UNMERGED / MERGE NOT AUTHORIZED`
Coordination: `SAFE` — no open thermowell/T4 wall-modifier PR found.

## Mission

Recover EI AVIFF Table T4-1 as a governed candidate for parent-pipe wall-thickness modifier `FM`, preserving no-gusset and 4-way welded-gusset values and exact categorical schedule-band applicability. Controlled-source reconciliation remains required before final qualification/publication.

Candidate target:
```text
docs/Masters/Vibration/ei-aviff-t4-wall-modifier.candidate.csv
```

Independent T4.2.2 / printed-page-87 copies reproduce:
```text
SCHEDULE_160_OR_GREATER        FM=0.96  FM_4WAY=0.98
SCHEDULE_80_TO_LT_160          FM=0.93  FM_4WAY=0.96
SCHEDULE_40_TO_LT_80           FM=0.85  FM_4WAY=0.93
LESS_THAN_SCHEDULE_40          FM=0.42  FM_4WAY=0.85
```

The source describes 4-way welded gusset plates at 90-degree intervals around the connection. These are categorical bands; no interpolation/nearest/default schedule is permitted.

## Source state

Controlled EI:
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

Independent secondary EI copies reproduce all four rows consistently. The worked thermowell example separately states a parent pipe wall less than Schedule 40 and selects `FM=0.42` without 4-way gussets. GitHub search located no thermowell-named workbook in the pinned CRF repository, so workbook-cell provenance is not invented.

## Scope

IN:
- exact four categorical bands;
- plain and 4-way-gusset FM values;
- stable row identities/source locator;
- unknown band => `NOT_READY`;
- independent worked-example replay;
- provenance/authority receipt;
- focused exact-copy tests.

OUT:
- numeric schedule interpolation or nearest-band fallback;
- thermowell geometry taxonomy/natural-frequency equations;
- production resolver/calculator integration;
- ASME PTC 19.3 TW data;
- T2.9/T3/SBC/chart work;
- workflows/dependencies;
- authority promotion;
- merge.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterValuesPublished = false
publicationState      = CANDIDATE at maximum
qualificationStatus   = NOT_QUALIFIED until controlled-source reconciliation
```

## Validation Contract

Material checks use STATUS / OBSERVATION / ORACLE. Secondary EI copies are `AUTHORITATIVE_REFERENCE` corroboration only, not the controlled Git object.

## Appendix A

`APPENDIX_A_STATUS: CURRENT`

A1 trace each Table T4-1 categorical row; A2 prove no interpolation/nearest schedule; A3 preserve candidate/authority separation; A4 replay all rows plus the `< Sch 40 => 0.42` worked example independently; A5 minimal patch = CSV + provenance + focused test.

## Roadmap

1. Report initialization — COMPLETE.
2. Draft PR allocation/report migration — IN_PROGRESS.
3. Candidate/provenance implementation.
4. Boundary/worked-example validation.
5. Exact-Git handover; controlled reconciliation remains separate.

No merge is authorized.
