# WIP-VIB-OPERATING-SCENARIO-M5-20260820 — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: f19a050f8c542ce07e72d1c00af86142de92257f
REPORT_BASIS_HEAD: f19a050f8c542ce07e72d1c00af86142de92257f
MAIN_HEAD_LAST_CHECKED: f19a050f8c542ce07e72d1c00af86142de92257f
MERGE_BASE: f19a050f8c542ce07e72d1c00af86142de92257f
REPORT_SYNC: CURRENT
GROUNDING_EPOCH: GE-001
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: a scenario helper could accidentally synthesize a Franken-case by choosing independent maxima across operating cases
EXACT_NEXT_ACTION: implement a pure OperatingScenario.v1 identity/provenance contract over one existing normalized operating-case row and falsify cross-case synthesis

## Mission

Implement the next M5 family foundation required by issue #429 invariant VIB-INV-006:

> Separate a coherent `OperatingScenario` from independent design limits. Do not create Franken-cases by combining unrelated maxima.

Existing `VibrationIntegrityDataset.v1` already retains line-scoped operating-case rows with `caseId`, `line`, source metadata and process quantities. The missing capability is a governed scenario identity/provenance/snapshot contract that proves one assessment uses one coherent case row.

## Scope

Planned production/test files:
- NEW `converters/vibration/dataset/operating-scenario.js`
- MODIFIED `converters/vibration/dataset/index.js` — export only
- NEW `tests/vibration-operating-scenario.test.mjs`
- this WIP report/status/claim; migrate to PR records after allocation

No Project-v2 files, mechanism calculators, UI, source/master, process actualization, geometry-tolerance, coverage/completeness, workflow, or numerical method files are in scope.

## Required Contract

`OperatingScenario.v1` shall:
- bind exactly one normalized dataset operating-case row;
- retain exact `line` + `caseId` identity;
- retain source/sourceRevision/recordId provenance without inventing missing values;
- preserve exact process quantities and units;
- compute a deterministic semantic hash over the scenario snapshot;
- expose provenance completeness separately from scenario existence;
- declare `crossScenarioMixingAllowed=false` and `independentMaximaSynthesisAllowed=false`;
- never convert STANDARD/NORMAL/ACTUAL basis or infer missing pressure reference;
- carry no screening/design/numerical authority.

Selection API shall select one exact `line + caseId` scenario or fail. It shall not select maxima across cases.

## Coordination

- PR665 Project v2: SAFE / NO EXACT FILE OVERLAP; do not modify `converters/vibration/project/*`.
- PR653/655/#545: SAFE / unrelated source-qualification neighbors.
- PR675: merged source-campaign infrastructure; unrelated.
- #586 geometry consistency and #588 process actualization remain separate authority blockers; this WIP does not solve them.

## Authority Boundary

```text
purpose = OPERATING_SCENARIO_IDENTITY_AND_PROVENANCE_ONLY
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
numericalAuthority = NONE
processActualizationAuthority = NONE
crossScenarioMixingAllowed = false
independentMaximaSynthesisAllowed = false
```

## Validation Plan

Falsifiers:
1. two cases on one line produce two distinct scenario IDs/hashes;
2. exact selector returns only the chosen case quantities;
3. pressure max from case A + flow max from case B is never synthesized by any API;
4. missing `sourceRevision`/`recordId` remains explicit provenance INCOMPLETE, not invented;
5. input mutation after scenario creation cannot alter frozen scenario;
6. semantic hash is deterministic and changes when an engineering input changes;
7. foreign dataset/schema fails closed.

## Merge Authority

OWNER_ONLY / NOT_GRANTED. Prior PR675 merge authorization does not transfer.
