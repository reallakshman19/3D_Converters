# PR #615 Work Report — Current Recovery Authority

## Recovery header

```text
WORK_INTENT       IMPLEMENT
REPOSITORY_STATE  EXISTING_PR
MUTATION_AUTHORITY WRITE_ALLOWED by current Owner instruction
CRITICALITY       ENGINEERING_CRITICAL
EXECUTION_MODE    MANUAL
BASE_BRANCH       main
BRANCH            agent/vibration-eit-roadmap-20260818
PR                #615
MERGE_AUTHORITY   OWNER_ONLY / NOT_GRANTED
PR_STATE          DRAFT / UNMERGED
```

Detailed stage evidence is retained in:

```text
agents/PR615_stage2_source_identity.md
agents/PR615_stage3_mechanism_reduction.md
agents/PR615_stage4_fit_frequency_custody.md
```

## Handover in 60 seconds

PR615 now implements this governed stack:

```text
EnergyInstituteEit.v5 compatibility import
  -> VibrationIntegrityProject.v1 (.vibproj)
  -> EngineeringMethodSource.v1
  -> VibrationRoadmapProjection.v1 / right-side navigator
  -> MechanismNumericResult.v1
  -> MechanismLineResult.v1
  -> EiMainLineAggregation.v2

FIT facility data
  -> FitFacilityEngineeringBasis.v2
  -> FitFacilityNaturalFrequencyCustody.v1
  -> FIT request only when supplied fn is custodied
```

Authority remains deliberately separated:

```text
EIT import            compatibility/history only
.vibproj              persistence only
source registry       source identity only
roadmap               navigation/presentation only
frequency custody     provenance custody only
mechanism reducers    reduction custody only
EI main-line result   governed screening aggregate only
```

No project/UI/source/custody layer creates design/code authority.

## Stage 1 — multi-module EIT / project / roadmap

Implemented:

- generic `EnergyInstituteEit.v5` import for `fit/fip/mex/aiv/sbc/thw/tra/caf`;
- declaration/result/detail presence retained independently;
- populated legacy module data retained even if module token is absent;
- malformed/unknown compatibility payloads retained visibly;
- imported numerical values remain `HISTORICAL_REVIEW_REQUIRED`;
- `VibrationIntegrityProject.v1` / `.vibproj` is persistence-only;
- project load is transactional;
- persisted current-result authority is rejected in V1;
- right-side Phase × Scope × Specialty roadmap;
- Import `.eit`, Open `.vibproj`, Save `.vibproj`, line selection;
- roadmap clicks reuse existing calculation routing;
- missing module is never converted to NOT_APPLICABLE by the UI.

Historical Stage-1 reconstructed gate:

```text
PASS 25/25 on corresponding pre-Stage2 surface
```

## Stage 2 — typed engineering source custody

Added `EngineeringMethodSource.v1` with separate:

```text
technicalModule
sectionId
flowchartId
equationId
tableId
figureId
printedPage
pdfPage
```

Current repository T2 subsection labels remain `RECONCILIATION_REQUIRED`; dotted section IDs are not silently treated as hyphenated flowchart IDs.

Thermowell EI T4 vs current ASME PTC 19.3 identity remains explicit `CONFLICTED` evidence.

Roadmap source state is visible but cannot change applicability, LOF, completeness, screening or design authority.

Stage-2 focused execution:

```text
PASS 10/10
```

## Stage 3 — mechanism-level result reduction

Corrected pre-existing direct child-LOF aggregation.

Permanent invariant:

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
one mechanism -> at most one EI main-line contributor
```

Added:

```text
MechanismNumericResult.v1
MechanismLineResult.v1
VibrationMechanismReducerRegistry.v1
```

Current reducer policy:

```text
ONE  -> IDENTITY_SINGLE_ASSESSMENT_UNIT / STRUCTURAL_IDENTITY_ONLY
ZERO -> INCOMPLETE
MANY -> INCOMPLETE until mechanism-specific method rule is qualified
```

There is no universal child-level max reducer.

`EiMainLineAggregation` is now:

```text
EiMainLineAggregation.v2
EiMainLineAggregationPolicy.v2
revision = EI-AVIFF2-MAINLINE-2026-08-18
aggregationRule = MAX_APPLICABLE_QUALIFIED_MECHANISM_LINE_LOF
```

Policy identity includes reducer-registry custody. Caller-supplied line results/reducers are rejected.

Primary Stage-3 falsifier:

```text
AIV pairs [0.21, 0.63, 0.47]
without qualified pair->line reducer
-> MechanismLineResult INCOMPLETE
-> EI main-line INCOMPLETE
-> eiMainLineLof = null
```

Stage-3 reconstructed focused evidence:

```text
result/reducer cases      PASS 8/8
aggregation harness       PASS 4/4
```

## Stage 4 — FIT natural-frequency custody

### Re-grounded M5 scope

Do not duplicate already-landed M5 work:

- #582 explicit wall/span/support/process/scenario basis;
- #584 nominal geometry catalogue custody;
- #586 blocked geometry-consistency authority;
- #588 blocked STANDARD/NORMAL -> ACTUAL process conversion authority.

The remaining concrete request-boundary gap was natural-frequency provenance.

### Defect

Pre-Stage4 facility planning could pass an optional `NATURAL_FREQUENCY` to FIT with only:

```text
finite value
non-empty unit
```

although the enrichment model already exposes source/revision/record/status/reviewer metadata.

### Correction

Added:

```text
FitFacilityNaturalFrequencyCustody.v1
```

States:

```text
NOT_PROVIDED
CUSTODIED
INCOMPLETE
```

A supplied frequency is request-eligible only with:

```text
value finite and >0
unit non-empty
source non-empty
sourceRevision non-empty
recordId non-empty
status non-empty
```

`reviewer` is optional and retained when present.

No source-method taxonomy is inferred. Stage 4 does not label a frequency MEASURED/FEA/ANALYTICAL/VENDOR unless the source data itself contains such identity.

Case-specific evidence has precedence. An incomplete case row fails closed and cannot fall back to a complete global row.

No frequency row remains valid for the standard FIT request.

### Production wiring

`FitFacilityEngineeringBasis` revision-bumped:

```text
v1 -> v2
```

It now owns frequency readiness and trace.

`fit-plan-item.js` no longer has an independent frequency resolver. Request construction consumes only:

```text
engineeringBasis.frequency.resolved
```

Uncustodied frequency therefore cannot reach `request.inputs.naturalFrequency`.

The existing blocker CSV already exposes Source Revision / Record ID / Status / Reviewer, so no new tabular schema is required.

### Stage-4 validation

Exact custody module / controlled dependency execution:

```text
node --check fit-frequency-custody.js PASS
custody cases                         PASS 8/8
```

Controlled plan-item integration harness:

```text
node --check fit-engineering-basis.js PASS
node --check fit-plan-item.js         PASS
no fn standard request                PASS
incomplete fn blocks                  PASS
case fn passed unchanged              PASS
bad case shadows global               PASS
TOTAL                                 PASS 4/4
```

Protected numerical blobs verified unchanged:

```text
fit/method.js
2965155fe1d4d9081b91d1ff1113d7fb50ddbfd8

fit/applicability.js
1bb9e1627948af74a00b964ea9048a77adc2c871

fit/calculate.js
2a92e6efedefffe4ab66ab000f0c3e648c9e5e86
```

Therefore equations, coefficients and `1 < fn <= 3 Hz` remain untouched.

Stage-4 relevant JS/test files remain below 300 physical lines by GitHub line-300 probes.

## Backup custody

Historical Stage-1 shared-tab backup:

```text
.backups/1_tabs_engineering_calculations_tab_js.bak
```

Stage-3 exact connector-source backups:

```text
.backups/connector-20260818-pr615-stage3/converters/vibration/ei-mainline-aggregation.js
.backups/connector-20260818-pr615-stage3/tests/vibration-ei-mainline-aggregation.test.mjs
```

Stage-4 exact connector-source backups:

```text
.backups/connector-20260818-pr615-stage4/converters/vibration/facility/fit-engineering-basis.js
.backups/connector-20260818-pr615-stage4/converters/vibration/facility/fit-plan-item.js
```

Native backup CLI is not claimed for connector-only stages.

## Coordination

Active neighboring ownership remains:

- #479 FIT top-level workspace;
- #506 shared Engineering Calculations tab + AIV workspace/runtime;
- #508 mechanism-matrix/SBC view paths;
- #571 coverage/identification;
- #539/#540 FIT adapter/family/console authority presentation.

Stage 4 found no exact active claim for `fit-engineering-basis.js`, `fit-plan-item.js`, or natural-frequency custody.

The historical Stage-1 shared-tab overlap with #506 remains acknowledged; no further PR615 edit to that shared tab is allowed without reconciliation.

## Permanent negative assurance

PR615 does not authorize:

```text
new engineering equations or coefficients
automatic T1 applicability
unqualified multi-item reducers
benchmark oracle/tolerance changes
persisted current-result promotion
roadmap/project authority promotion
natural-frequency source-method inference
STANDARD/NORMAL process actualization inference
DN/schedule geometry inference
generic multi-module EIT export authority
design/code authority
Product Freeze
workflow changes
```

## Validation truth still NOT_RUN

```text
repository-native current-head focused Stage-4 test NOT_RUN
existing complete M5 engineering-basis suite          NOT_RUN
repository-native M4/matrix current-head suite        NOT_RUN
full Vibration/FIT/AIV/SBC release suites             NOT_RUN
served browser acceptance                             NOT_RUN
independent engineering review                        NOT_RUN
```

No missing hosted status/workflow is treated as PASS.

## Final Stage-4 live reconciliation

At the Stage-4 pre-reconciliation head:

```text
PR HEAD  da5e25f8bdb3516104bbdcd67245a86ac3bbff44
MAIN     eef94949961970171d1366f5b6a9d421b3cc0d9f
RELATION ahead 47 / behind 8 / diverged
REVIEWS  0
THREADS  0
STATUSES 0 returned -> NOT PASS
WORKFLOWS 0 PR-triggered runs returned -> NOT PASS
```

The eight behind commits are non-overlapping with the vibration stack. They consist of XML->CII Preview/config work plus browser-timing harness/evidence files. No FIT facility, vibration source, project, roadmap, mechanism result/reducer, or EI aggregation file overlaps that drift.

Classification:

```text
NON_OVERLAPPING_BASE_DRIFT
NO_REBASE_AT_HANDOVER
```

Do not merge on this unreconciled base. Rebase/reconcile the eight commits immediately before an eventual merge qualification, then rerun repository-native validation in a complete checkout.

## Current risks / debt

- branch is behind eight non-overlapping `main` commits and requires merge-time reconciliation;
- AIV/deadleg multi-item reducer semantics remain unresolved and must not be guessed;
- mechanism workspaces still do not consume project context because of active claims;
- generic multi-module `.eit` export remains deferred pending AIV round-trip ownership reconciliation;
- facility UI should eventually expose frequency provenance state more visibly, but UI ownership must be reconciled first.

## EXACT_NEXT_ACTION

Keep PR615 draft/unmerged. Re-ground current live gaps and active claims before another implementation slice. Do not invent a multi-item reducer or a natural-frequency source-method classification. Before any merge attempt: reconcile current `main`, run the repository-native Stage-4/M5 and M4/vibration qualification suites in a complete checkout, then perform independent engineering review.
