# PR #615 Work Report — Current Recovery Authority

## Recovery header

```text
WORK_INTENT        IMPLEMENT
REPOSITORY_STATE   EXISTING_PR
CRITICALITY        ENGINEERING_CRITICAL
EXECUTION_MODE     MANUAL / CONNECTOR-FIRST
BASE_BRANCH        main
BRANCH             agent/vibration-eit-roadmap-20260818
PR                 #615
PR_STATE           DRAFT / UNMERGED
MERGE_AUTHORITY    OWNER_ONLY / NOT_GRANTED
```

Detailed stage records:

```text
agents/PR615_stage2_source_identity.md
agents/PR615_stage3_mechanism_reduction.md
agents/PR615_stage4_fit_frequency_custody.md
agents/PR615_stage5_measurement_custody.md
```

## Current governed stack

```text
EnergyInstituteEit.v5 compatibility import
  -> VibrationIntegrityProject.v1 (.vibproj)
  -> EngineeringMethodSource.v1
  -> non-binding VibrationRoadmapProjection.v1
  -> MechanismNumericResult.v1
  -> MechanismLineResult.v1
  -> EiMainLineAggregation.v2

FIT facility data
  -> FitFacilityEngineeringBasis.v2
  -> FitFacilityNaturalFrequencyCustody.v1
  -> FIT request only when supplied fn is custodied

Field evidence
  -> VibrationMeasurementSession.v1
  -> VibrationSignalProduct.v1
  -> VibrationMeasurementEvidencePackage.v1
```

Authority remains separated:

```text
project / .vibproj       persistence only
roadmap                   navigation only
source registry           source identity only
measurement session       field evidence only
signal product            derived evidence only
frequency custody         provenance only
mechanism reducer         reduction custody only
EI main-line result       governed screening aggregate only
```

No persistence, UI, source, measurement, or custody layer creates design/code/root-cause authority.

## Stage 1 — EIT / project / roadmap

Implemented generic multi-module `.eit` compatibility import, deterministic persistence-only `.vibproj`, transactional project loading, non-binding Phase × Scope × Specialty roadmap, and project Open/Save/import controls.

Persisted current-result authority remains rejected in V1.

Historical reconstructed gate:

```text
PASS 25/25 on corresponding pre-Stage2 surface
```

## Stage 2 — typed engineering source identity

Added `EngineeringMethodSource.v1` with separate technical-module, section, flowchart, equation/table/figure and page locators.

Repository T2 subsection labels remain `RECONCILIATION_REQUIRED`; thermowell EI T4 vs current ASME PTC identity remains explicit `CONFLICTED` evidence.

Focused gate:

```text
PASS 10/10
```

## Stage 3 — mechanism-level reduction

Permanent invariant:

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
one mechanism -> at most one EI main-line contributor
```

Reducer policy:

```text
ONE  -> structural identity only
ZERO -> INCOMPLETE
MANY -> INCOMPLETE until a mechanism-specific rule is qualified
```

No universal child max reducer exists.

`EiMainLineAggregation.v2` consumes qualified mechanism-line results only.

Focused evidence:

```text
result/reducer cases  PASS 8/8
aggregation harness   PASS 4/4
```

## Stage 4 — FIT natural-frequency provenance custody

Re-grounding established that #582/#584/#586/#588 already own the landed M5 wall/span/support/process/scenario/geometry/process-actualization boundaries, so they were not duplicated.

Stage 4 added `FitFacilityNaturalFrequencyCustody.v1`.

A supplied frequency is request eligible only when it has finite positive value, unit, source, source revision, record ID and status. Reviewer is optional. Case-specific evidence has precedence and incomplete case evidence cannot fall back to global evidence.

Absence of natural frequency remains valid for standard FIT.

Protected numerical modules remain unchanged:

```text
fit/method.js         2965155fe1d4d9081b91d1ff1113d7fb50ddbfd8
fit/applicability.js  1bb9e1627948af74a00b964ea9048a77adc2c871
fit/calculate.js      2a92e6efedefffe4ab66ab000f0c3e648c9e5e86
```

Focused evidence:

```text
frequency custody             PASS 8/8
plan-item integration         PASS 4/4
```

## Stage 5 — field measurement evidence custody

### Re-grounded scope

Open neighboring drafts still own the mechanism workspaces:

```text
#479 FIT workspace
#506 AIV workspace/shared Engineering Calculations tab
#508 SBC facility/workspace
#571 mechanism coverage/identification
```

No open PR claimed `MeasurementSession` or the new measurement contract path. Stage 5 is therefore new-file only.

### Source architecture retained

Repository research defines:

```text
MeasurementSession
  -> OperatingCaseSnapshot
  -> InstrumentConfiguration
  -> Channel
       -> Sensor
       -> Location / orientation
       -> Calibration
       -> RawTimeSeries
  -> SignalProduct
```

and requires immutable raw data plus `processingRecipeId`/version for derived signal products.

### New contracts

```text
VibrationMeasurementSession.v1
VibrationSignalProduct.v1
VibrationMeasurementEvidencePackage.v1
```

Permanent invariants:

```text
MEASUREMENT_EVIDENCE != SCREENING_RESULT
MEASUREMENT_EVIDENCE != ROOT_CAUSE_CONCLUSION
RAW_DATA_REFERENCE = IMMUTABLE + SHA256_PINNED
DERIVED_PRODUCT -> EXACT SESSION + CHANNELS + RAW_HASH_SET + PROCESSING_RECIPE/VERSION
```

`VibrationMeasurementSession.v1` requires exact line/case and operating-case snapshot identity/hash, instrument-configuration provenance, unique channels, explicit quantity/unit, sensor identity, physical subject/location, orientation/reference frame, calibration valid at acquisition, positive sample rate/duration, immutable raw artifact hash and non-authorizing evidence authority.

`VibrationSignalProduct.v1` supports the evidence-type vocabulary:

```text
OVERALL RMS PEAK PEAK_TO_PEAK FFT PSD ORDER_SPECTRUM
PHASE COHERENCE ODS MODAL_RESULT
```

This is a type registry only. Stage 5 contains no FFT/PSD/filter/integration/order/coherence/ODS/modal mathematics.

Each signal product requires exact session/channel references, exact raw-data hash set, processing recipe ID/version/provenance and hash-pinned output artifact.

`VibrationMeasurementEvidencePackage.v1` enforces session/product uniqueness and referential integrity. A product cannot reference an unknown channel or a raw hash set different from its referenced channels.

### Stage-5 validation

Exact committed blob parity:

```text
contracts.js  Git blob 2497300cae02f0df13155e200c9d2358a62e4d86
local hash               2497300cae02f0df13155e200c9d2358a62e4d86

test.mjs      Git blob d0da28b82fa281ed6a220bb2450b83c8934a69a4
local hash               d0da28b82fa281ed6a220bb2450b83c8934a69a4
```

Executed on those exact bytes:

```text
node --check contracts.js                         PASS
node --check vibration-measurement-contract.test  PASS
node --test vibration-measurement-contract.test   PASS 10/10
```

Falsifiers cover missing scenario snapshot hash, invalid calibration, mutable/unhashed raw evidence, missing processing recipe version, unknown channel, raw-hash mismatch, authority promotion and duplicate identities.

Physical line counts:

```text
contracts.js  270
focused test  228
```

Both satisfy the repository `<300` line guard.

### Stage-5 authority boundary

```text
engineering calculation authority = NONE
screening authority               = NOT_AUTHORIZED
design authority                  = false
root-cause authority              = false
signal-processing qualification   = NOT_ESTABLISHED
```

## Coordination / negative assurance

PR615 still does not authorize:

```text
new engineering equations or coefficients
automatic T1 applicability
unqualified multi-item reducers
measurement-to-LOF substitution
signal-processing algorithms
automatic RCA conclusion
natural-frequency source-method inference
DN/schedule geometry inference
STANDARD/NORMAL process actualization inference
persisted current-result promotion
generic multi-module EIT export authority
design/code authority
Product Freeze
workflow changes
```

The historical Stage-1 shared-tab overlap with #506 remains acknowledged; no further PR615 edit to that shared tab is allowed without reconciliation.

## Validation truth still NOT_RUN

```text
repository-native complete-checkout Stage-5 suite   NOT_RUN
existing full M5 suite                              NOT_RUN
repository-native M4/matrix suite                   NOT_RUN
full Vibration/FIT/AIV/SBC release suites           NOT_RUN
served browser acceptance                           NOT_RUN
independent engineering review                      NOT_RUN
```

The focused Stage-5 test was executed on exact committed bytes in an isolated reconstructed surface; that is not represented as a complete-checkout release gate.

## Stage-5 pre-recovery reconciliation

```text
MAIN      eef94949961970171d1366f5b6a9d421b3cc0d9f
PR HEAD   ca5313a0953b0158c08a4c103fa9caa6727736a5
RELATION  ahead 54 / behind 8 / diverged
```

The eight behind commits remain non-overlapping XML->CII Preview/config/browser-timing work. No vibration measurement/project/source/roadmap/FIT-facility/mechanism-result path overlaps that drift.

Do not merge on the unreconciled base. Reconcile current `main` immediately before merge qualification, then rerun repository-native validation and independent engineering review.

## Current risks / debt

- mechanism-workspace project-context propagation remains blocked by #479/#506/#508;
- coverage integration remains separately owned by #571;
- AIV/deadleg MANY reduction remains intentionally unresolved;
- Stage-5 measurement contracts are not yet persisted in `.vibproj` and have no UI/import adapters;
- no signal-processing method has been qualified;
- generic multi-module `.eit` export remains deferred.

## EXACT_NEXT_ACTION

Keep PR615 draft/unmerged. Re-ground current project-schema ownership and, if still unblocked, add a narrow persistence-only bridge so validated `VibrationMeasurementEvidencePackage.v1` can be stored/reloaded in `.vibproj` without creating current engineering, screening, design, or RCA authority. Do not implement signal-processing math or measurement-to-screening promotion in that bridge.
