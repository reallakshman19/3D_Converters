# PR #615 Stage 4 — FIT Natural-Frequency Custody

## Grounding epoch

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by current Owner instruction `proceed`
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- LIVE_MAIN_SHA: `22b7b57fed3e78534da41342fc3240c8d27369c3`
- PR: #615
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- PRE_STAGE_HEAD: `8900bb955aba680c21eaeee553dd07aeddff71be`
- PR_STATE: OPEN / DRAFT / UNMERGED
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
- BASE_DRIFT: four non-overlapping XML->CII commits remain to reconcile before merge

## M5 reconciliation before mutation

The initially proposed FIT span/support/process/multiphase/frequency stack was re-grounded against current `main`.

Already merged and therefore not duplicated:

- #582: explicit FIT facility wall/span/support/process/scenario engineering basis;
- #584: exact nominal-geometry catalogue custody without DN/schedule inference;
- #586: geometry-consistency authority remains blocked with `tolerance=null`;
- #588: STANDARD/NORMAL -> ACTUAL process conversion remains blocked.

Current `fit-engineering-basis.js` already controls wall basis, effective-support span, support evidence, actual process basis, component multiphase density basis and exact-case scenario coherence.

## Stage-4 defect

`converters/vibration/facility/fit-plan-item.js` currently resolves optional `NATURAL_FREQUENCY` with only:

```text
finite numeric value
non-empty unit
case-specific row preferred over global row
```

If present, that row is copied directly to:

```text
request.inputs.naturalFrequency
request.inputUnits.naturalFrequency
```

The generic enrichment contract already carries provenance fields:

```text
source
sourceRevision
recordId
status
reviewer
```

but the current facility readiness path does not require provenance completeness before natural frequency can enter the FIT advanced-method request.

The numerical FIT method is not the failure layer. The method already requires an actual natural frequency for the optional advanced path and controls `1 < fn <= 3 Hz` eligibility.

## Protected invariant

```text
SUPPLIED_NATURAL_FREQUENCY != CUSTODIED_NATURAL_FREQUENCY
```

and:

```text
uncustodied fn must not enter request.inputs
```

Natural frequency remains optional. Absence of `NATURAL_FREQUENCY` does not block the standard FIT path.

## Intended custody contract

New pure module:

```text
converters/vibration/facility/fit-frequency-custody.js
FitFacilityNaturalFrequencyCustody.v1
```

States:

```text
NOT_PROVIDED
CUSTODIED
INCOMPLETE
```

Selection remains:

```text
CASE_SPECIFIC
GLOBAL
NOT_PRESENT
```

When a row is supplied, custody requires:

```text
value finite and > 0
unit non-empty
source non-empty
sourceRevision non-empty
recordId non-empty
status non-empty
```

`reviewer` is retained when present but is not invented as a mandatory review-policy gate.

The contract does not classify frequency as MEASURED / FEA / ANALYTICAL / VENDOR unless the source data itself says so. It controls provenance completeness only.

## Exact-scope rule

A case-specific `NATURAL_FREQUENCY` row has precedence.

If a case-specific row exists but is incomplete, the planner must fail closed. It may not fall back to a complete global row.

A global row is eligible only when no case-specific row exists.

## Planned production integration

1. Resolve frequency custody inside `FitFacilityEngineeringBasis`.
2. Merge frequency missing/invalid/reason state into facility readiness.
3. Expose frequency custody and trace as first-class basis data.
4. `fit-plan-item.js` consumes only `engineeringBasis.frequency.resolved`.
5. Preserve value/unit request shape for numerical compatibility.
6. Leave FIT method/applicability/calculate modules unchanged.

Because engineering-basis output semantics change, Stage 4 may revision-bump:

```text
FitFacilityEngineeringBasis.v1 -> v2
```

No calculation ID or numerical method revision changes.

## Primary falsifier

Given an otherwise READY FIT assessment point:

```text
NATURAL_FREQUENCY = 2 Hz
source = USER
sourceRevision = missing
recordId = missing
status = missing
```

required result:

```text
item.status = NOT_READY
item.request = null
engineeringBasis.frequency.state = INCOMPLETE
reason includes NATURAL_FREQUENCY_PROVENANCE_INCOMPLETE
```

The same assessment without any `NATURAL_FREQUENCY` row remains eligible for the standard FIT request.

## Focused acceptance tests

1. no fn -> READY standard request / no request frequency / `NOT_PROVIDED`;
2. supplied fn with incomplete provenance -> NOT_READY;
3. zero/negative/non-finite supplied fn -> NOT_READY;
4. complete case-specific fn -> CUSTODIED / request includes exact value+unit;
5. complete global fn -> used only when no case-specific row exists;
6. incomplete case-specific fn shadows complete global row and fails closed;
7. reviewer is optional but retained in trace;
8. no method/applicability/advanced-frequency boundary mutation.

## Coordination

Open-PR searches found no active claim for:

```text
converters/vibration/facility/fit-plan-item.js
converters/vibration/facility/fit-engineering-basis.js
natural-frequency custody
```

Known claims #479/#506/#508 remain on FIT/AIV/SBC workspace/shared-tab paths and will not be touched.

#539/#540 own FIT adapter/console/family authority presentation and will not be touched.

Classification:

```text
SAFE                  new fit-frequency-custody.js + focused test
COORDINATION_REQUIRED existing facility basis/plan-item edits, with no exact active claim found
```

## Protected numerical blobs

Must remain unchanged:

```text
converters/vibration/fit/method.js
  2965155fe1d4d9081b91d1ff1113d7fb50ddbfd8

converters/vibration/fit/applicability.js
  1bb9e1627948af74a00b964ea9048a77adc2c871

converters/vibration/fit/calculate.js
  2a92e6efedefffe4ab66ab000f0c3e648c9e5e86
```

Stage 4 must not change equations, correlation families, `1 < fn <= 3 Hz`, standard/refined LOF logic, benchmark values/tolerances, screening/design/code authority, Product Freeze, or workflows.

## Backup plan

Before production mutation preserve exact branch bytes for:

```text
converters/vibration/facility/fit-engineering-basis.js
  blob 688e86d273b8682ae620cd81fedd95353b500f22

converters/vibration/facility/fit-plan-item.js
  blob 685fc4a60b879e08cb73c84cfb166d1efa6bc9b8
```

Native backup CLI is not claimable in the connector-only environment. Exact connector-source custody will be recorded instead.

## Validation plan

- commit focused falsifier before production repair;
- `node --check` new/modified modules on reconstructed exact surface;
- execute focused frequency-custody cases locally;
- run existing M5 engineering-basis regression if its dependency surface can be reconstructed;
- verify protected numerical blobs unchanged;
- source-inspect no hidden frequency default, no global fallback through incomplete case evidence, and no source-class inference;
- keep repository-native/full/browser gates truthfully `NOT_RUN` if unavailable.

## Appendix A

`NOT_REQUIRED_FOR_CONTINUATION` — same active implementation agent and same PR. Stage 4 was nevertheless fully re-grounded because the intended M5 scope materially changed after discovering #582/#584/#586/#588 are already merged.

## EXACT_NEXT_ACTION

Preserve exact pre-edit facility files, commit the first-failing focused frequency-custody regression, then implement `FitFacilityNaturalFrequencyCustody.v1` and wire it through engineering-basis -> plan-item without touching FIT numerical modules. Leave PR615 draft/unmerged.
