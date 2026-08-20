# PR684 — AIV Facility Scenario Handoff — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
CURRENT_STAGE: DRAFT_READY_FOR_REVIEW
MAIN_HEAD_LAST_CHECKED: 1f8f12daf3846780341ad34ab56f9dc0bde05593
MERGE_BASE: 1f8f12daf3846780341ad34ab56f9dc0bde05593
IMPLEMENTATION_BASIS_HEAD: 08d82ef15fbff4508c5e36e24d755b2efd68ed18
PREDECESSOR_PR: 682 (MERGED)
MERGE_AUTHORITY: NOT_GRANTED_FOR_PR684

## Mission
Bind facility-owned current `OperatingScenario.v1` evidence into AIV execution before `calculateEngineering()` without synthesizing dataset identity from AIV tables.

## Implemented architecture

```text
current Vibration Integrity facility run
-> OperatingScenario.v1[]
-> VibrationFacilityScenarioHandoff.v1
   datasetId
   facilityRunId
   scenarioSetKey = exact identity/snapshot fingerprint of all scenarios
-> Engineering Calculations parent state
-> explicit AIV workspace option/state
-> AIV readiness READY relationship
   sourceLine + caseId
   assessmentLine + caseId
-> AivFacilityScenarioExecutionPlan.v1
   source scenario execution basis
   assessment scenario execution basis
   facility scenario-set key
-> executeAivWithFacilityScenarioCustody()
-> only after custody succeeds: calculateEngineering()
-> AIV screening session = FACILITY_LINKED or STANDALONE
-> facility matrix accepts only FACILITY_LINKED evidence current to the exact facility scenario set
```

## Engineering/runtime invariants

1. AIV source and assessment scenarios must resolve from one governed facility dataset.
2. A linked AIV run with a missing/non-current facility handoff fails before the registered calculation callback.
3. `sourceLine + caseId` and `assessmentLine + caseId` are both bound; case-label equality alone is insufficient.
4. A facility scenario-set key fingerprints all scenario dataset IDs, line/case scopes, scenario IDs, identity hashes and snapshot hashes.
5. Source-line-only scenario drift invalidates prior AIV facility evidence even when the selected assessment-line snapshot is unchanged.
6. Standalone AIV remains executable in the AIV workbench but cannot satisfy facility Vibration Integrity coverage.
7. AIV remains assessment-scope screening only and cannot govern the facility line.
8. No hidden global facility-scenario singleton is introduced; the parent passes the handoff explicitly.

## Production changes

- `converters/vibration/facility/scenario-handoff.js`
  - adds governed facility handoff contract and deterministic full scenario-set key.
- `converters/vibration/aiv/aiv-facility-scenario-plan.js`
  - maps each READY AIV relationship to exact source + assessment scenario bases.
- `converters/vibration/aiv/aiv-facility-execution.js`
  - callback-level pre-calculation guard; failed custody => callback unreachable.
- `converters/vibration/facility/fit-execute.js`
  - retains facility scenario-set key in the facility result.
- `converters/vibration/facility/fit-register.js`
  - projects scenario execution basis + scenario-set key into workspace rows.
- `tabs/vibration-integrity-roadmap-bridge.js`
  - publishes only CURRENT facility scenario handoff context.
- `tabs/engineering-calculations-tab.js`
  - retains and explicitly passes facility handoff state to AIV.
- `tabs/vibration-aiv-state.js`
  - distinguishes standalone vs facility-link intent.
- `tabs/vibration-aiv-qualification-tab.js`
  - shows STANDALONE AIV / FACILITY LINKED / FACILITY LINK BLOCKED state.
- `tabs/vibration-aiv-execution.js`
  - invokes registered AIV calculation only after linked custody succeeds.
- `tabs/vibration-aiv-screening-session.js`
  - records `FACILITY_LINKED` vs `STANDALONE` and retains the linked plan.
- `tabs/vibration-integrity-mechanisms.js`
  - rejects standalone/stale AIV from facility coverage; exact linked assessment only.

## Test changes

- new `tests/vibration-aiv-facility-scenario-handoff.test.mjs`
  - same-dataset handoff and deterministic scenario-set key;
  - mixed-dataset rejection;
  - source + assessment scenario mapping;
  - missing-source callback count = 0;
  - non-current-link callback count = 0;
  - exact linked callback count = 1;
  - standalone callback count = 1 with no facility plan;
  - assessment-line drift rejection;
  - source-line-only drift rejection with unchanged assessment snapshot;
  - linked vs standalone session classification.
- updated `tests/vibration-integrity-mechanism-matrix.test.mjs`
  - direct AIV fixtures now obey facility custody;
  - standalone AIV excluded;
  - assessment snapshot drift excluded;
  - source-only scenario-set drift excluded.
- updated `tests/vibration-facility-fit-execute.test.mjs`
  - aligns legacy fixtures with PR682 scenario-binding requirements;
  - asserts facility scenario-set key and retained scenario basis.

## Validation truth

- current-main grounding: PASS / HOSTED SOURCE
- predecessor PR682 state: PASS / MERGED
- branch ancestry before PR metadata migration: PASS / 27 ahead, 0 behind
- intended effective diff before PR metadata migration: PASS / 15 production-test + 3 recovery
- overlap: SAFE / PR506 is stale salvage-only per merged PR517
- source/assessment relationship custody falsifiers: ENCODED / NOT_RUN
- callback-unreachable-on-custody-failure falsifiers: ENCODED / NOT_RUN
- standalone/facility separation falsifiers: ENCODED / NOT_RUN
- assessment and source-only scenario drift falsifiers: ENCODED / NOT_RUN
- repository-native Node tests: NOT_RUN / no native checkout in connector runtime
- attempted container GitHub network access: ENVIRONMENT_BLOCKED / DNS resolution unavailable
- browser/Product Freeze: NOT_RUN
- hosted PR checks: NOT_RUN at PR allocation; must inspect exact head
- independent numerical verification: N/A / no AIV equation, coefficient, threshold or master-data change

No encoded/static evidence is promoted to repository-native execution PASS.

## Authority boundary

This PR changes runtime custody/orchestration only. It does not:
- change AIV T2.6/T2.7 equations or coefficients;
- change any EI/ASME source or governed master value;
- grant AIV line/case aggregation authority;
- create applicability or completeness authority;
- perform process actualization;
- grant design authority.

`designAuthority=false` and AIV `screeningResultScope=ASSESSMENT` remain permanent boundaries.

## Known validation debt

- Native Node suite is still required on an exact checkout.
- Real-browser navigation/reload should verify the visible facility-link state and module-cache path.
- No browser PASS is inferred from source changes.

## Appendix A — takeover qualification

1. Why must AIV bind both source-line and assessment-line OperatingScenarios rather than only the assessment line?
2. Why is an assessment snapshot comparison insufficient to detect source-only engineering drift?
3. Why may a standalone successful AIV result remain valid in its workbench but be rejected as facility coverage evidence?
4. What exactly must happen before the registered AIV calculation callback can execute in FACILITY_LINKED mode?
5. Which authority flags remain unchanged by the handoff and why?

Expected expert answer: AIV is relationship-scoped, so both ends and the full coherent facility scenario set are engineering custody; source-only changes can alter the acoustic source while leaving the assessment-line scenario unchanged; standalone calculation lacks facility scenario provenance; linked custody must resolve/validate the exact handoff and relationship scenario bases before callback; and custody never confers numerical, screening-aggregation, applicability/completeness, or design authority.
