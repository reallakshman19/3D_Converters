# WIP-AIV-FACILITY-SCENARIO-HANDOFF-20260820 — AIV Facility Scenario Handoff

HANDOVER_READINESS: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: IMPLEMENTATION
MAIN_HEAD_LAST_CHECKED: 1f8f12daf3846780341ad34ab56f9dc0bde05593
PREDECESSOR_PR: 682 (MERGED)

## Mission
Bind facility-owned current `OperatingScenario.v1` evidence into AIV execution before `calculateEngineering()` without synthesizing dataset identity from AIV tables.

## Intended architecture

```text
current Vibration Integrity facility run
-> explicit VibrationFacilityScenarioHandoff.v1 event
-> Engineering Calculations parent state
-> explicit AIV workspace option/state
-> relationship-scoped sourceLine/case + assessmentLine/case resolution
-> exact scenario execution bases
-> calculateEngineering()
-> AIV screening session retains linked scenario evidence
-> facility matrix accepts only linked/current scenario evidence
```

## Authority boundary
- handoff/scenario contracts: custody only;
- no new screening/design/numerical authority;
- no AIV equation/coefficient/master change;
- standalone AIV qualification remains supported but must not silently become facility evidence;
- no hidden scenario singleton.

## Known overlap
- PR506 remains open/non-mergeable historical candidate; merged PR517 explicitly classifies it as salvage evidence only.
- current main is implementation authority.

## Validation plan
- relationship pair mapping across source/assessment lines and case;
- missing source/assessment scenario fail-closed;
- mixed dataset rejection;
- standalone session excluded from facility projection;
- linked session accepted only when assessment scenario snapshot matches the current facility row;
- changed facility snapshot invalidates prior linked AIV evidence;
- registered AIV calculation callback not reached when linked scenario custody fails.

Repository-native and browser execution remain NOT_RUN until actually executed.
