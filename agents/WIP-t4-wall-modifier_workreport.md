# WIP-t4-wall-modifier — T4 Thermowell Wall Modifier

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: 36748e381012bb52ba720cc288101948115721bb
REPORT_BASIS_HEAD: 36748e381012bb52ba720cc288101948115721bb
MAIN_HEAD_LAST_CHECKED: 36748e381012bb52ba720cc288101948115721bb
MERGE_BASE: 36748e381012bb52ba720cc288101948115721bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-T4-001
CURRENT_STAGE: Stage 1 — report initialization
CURRENT_BLOCKER: controlled EI DocumentEvidence execution unavailable
HIGHEST_RISK: losing the distinction between schedule-band applicability and actual wall thickness, or silently treating candidate values as active authority
EXACT_NEXT_ACTION: allocate a draft PR, then recover Table T4-1 exactly as four schedule bands with both plain and 4-way-gusset FM values and validate boundary semantics independently.
```

Work intent: `IMPLEMENT / VALIDATE / HANDOVER`
Criticality: `ENGINEERING_CRITICAL`
Branch: `agent/vibration-t4-wall-modifier`
Source issue: #450
Base: `main@36748e381012bb52ba720cc288101948115721bb`
Coordination: `SAFE` — no open thermowell/T4 wall-modifier PR found.

## Mission

Recover EI AVIFF Table T4-1 as a governed candidate for the parent-pipe wall-thickness modifier `FM`, preserving both the no-gusset and 4-way welded-gusset values and exact schedule-band applicability. Keep final qualification/publication/authority blocked until controlled-source reconciliation.

Target candidate:
```text
docs/Masters/Vibration/ei-aviff-t4-wall-modifier.candidate.csv
```

Independently reproduced T4-1 rows, section T4.2.2 / printed page 87:
```text
Schedule 160 or greater          FM=0.96  FM_4way=0.98
Schedule 80 to < Schedule 160   FM=0.93  FM_4way=0.96
Schedule 40 to < Schedule 80    FM=0.85  FM_4way=0.93
Less than Schedule 40           FM=0.42  FM_4way=0.85
```

Source semantics: 4-way welded gusset plates are at 90-degree intervals around the connection. The master is a schedule-band lookup; any later resolver must compare actual parent-pipe wall thickness against the applicable schedule thickness without inventing a nearest/default band.

## Source / evidence state

Controlled EI identity:
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

Independent secondary EI copies reproduce Table T4-1 consistently. GitHub code search found no thermowell-named workbook in the pinned CRF repository; therefore no workbook-cell provenance will be invented.

## Scope

IN:
- exact four schedule bands;
- plain and 4-way-gusset FM values;
- stable band identities / source locator;
- fail-closed boundary resolver tests using explicit schedule ranks only for the test oracle;
- provenance and independent worked-example corroboration (`less than Schedule 40 => FM 0.42` without gussets).

OUT:
- thermowell geometry taxonomy/equations;
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

## Validation contract

Every material check records STATUS / OBSERVATION / ORACLE. Secondary public copies are `AUTHORITATIVE_REFERENCE` corroboration only, never the controlled Git object.

## Appendix A

`APPENDIX_A_STATUS: CURRENT`

A1 trace Table T4-1 rows and schedule inequalities; A2 prove band boundaries are not nearest-value interpolation; A3 preserve candidate/authority separation; A4 independently replay the worked example and all four bands; A5 minimal patch = CSV + provenance + focused test.

## Roadmap

1. Report initialization — IN_PROGRESS.
2. Draft PR allocation/report migration.
3. Candidate/provenance implementation.
4. Boundary + worked-example validation.
5. Exact-Git handover; controlled reconciliation remains separate.

No merge is authorized.
