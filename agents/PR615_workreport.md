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
REPORT_BASIS_HEAD  aa1790592757d6b6bd2fc02faf0d144038e451ad
REPORT_BASIS_MAIN  eef94949961970171d1366f5b6a9d421b3cc0d9f
```

Detailed stage records:

```text
agents/PR615_stage2_source_identity.md
agents/PR615_stage3_mechanism_reduction.md
agents/PR615_stage4_fit_frequency_custody.md
agents/PR615_stage5_measurement_custody.md
agents/PR615_stage6_measurement_persistence.md
```

## Handover in 60 Seconds

PR615 now owns this governed stack:

```text
EnergyInstituteEit.v5 compatibility import
  -> VibrationIntegrityProject.v1 (.vibproj)
       -> validated VibrationMeasurementEvidencePackage.v1 persistence
  -> EngineeringMethodSource.v1
  -> non-binding VibrationRoadmapProjection.v1
  -> MechanismNumericResult.v1
  -> MechanismLineResult.v1
  -> EiMainLineAggregation.v2

FIT facility data
  -> FitFacilityEngineeringBasis.v2
  -> FitFacilityNaturalFrequencyCustody.v1

Field evidence
  -> VibrationMeasurementSession.v1
  -> VibrationSignalProduct.v1
  -> VibrationMeasurementEvidencePackage.v1
```

Authority is deliberately separated:

```text
.eit import / .vibproj        compatibility + persistence only
roadmap                       navigation only
source registry               source identity only
measurement session/product   evidence only
frequency custody             provenance only
mechanism reducer             reduction custody only
EI main-line aggregate        governed screening aggregate only
```

No persistence/UI/source/measurement/custody layer creates design, code, or root-cause authority.

## Stage summaries

### Stage 1 — EIT / project / roadmap

Generic multi-module `.eit` compatibility import; deterministic `.vibproj`; transactional load; non-binding Phase × Scope × Specialty right roadmap; import/open/save/line selection. Imported values remain historical/review-required. Persisted current-result authority is rejected.

Historical reconstructed evidence: `25/25 PASS` on the corresponding Stage-1 surface.

### Stage 2 — method/source identity

`EngineeringMethodSource.v1`; distinct technical-module/section/flowchart/equation/table/figure/page locators. Ambiguous T2 labels remain reconciliation-required. Thermowell EI-T4 vs current ASME identity remains explicit conflict evidence.

Focused evidence: `10/10 PASS`.

### Stage 3 — mechanism reduction

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
one mechanism -> at most one EI main-line contributor
```

`ONE -> structural identity`, `ZERO -> INCOMPLETE`, `MANY -> INCOMPLETE` until a mechanism-specific reducer is qualified. No universal child max reducer. `EiMainLineAggregation.v2` consumes mechanism-line results only.

Focused evidence: reducer/result `8/8 PASS`; aggregation harness `4/4 PASS`.

### Stage 4 — FIT natural-frequency custody

Reused landed #582/#584/#586/#588 M5 basis work rather than duplicating it. Added `FitFacilityNaturalFrequencyCustody.v1`. A supplied frequency requires finite positive value, unit, source, source revision, record ID and status. Case-specific incomplete evidence cannot fall back to global. Absence remains valid for standard FIT.

Protected FIT numerical blobs remain unchanged. Focused evidence: `8/8 + 4/4 PASS`.

### Stage 5 — field measurement evidence custody

Added:

```text
VibrationMeasurementSession.v1
VibrationSignalProduct.v1
VibrationMeasurementEvidencePackage.v1
```

Raw acquisition references are immutable/hash-pinned. Derived evidence binds exact session/channel/raw hashes plus processing recipe/version. Package validation rejects dangling references, raw-hash mismatch, duplicate IDs and screening/design/RCA promotion. No signal-processing math exists in this stage.

Exact Stage-5 contract/test blob evidence retained in `agents/PR615_stage5_measurement_custody.md`. Focused exact-byte execution: `10/10 PASS`.

### Stage 6 — measurement evidence persistence

Added `converters/vibration/project/measurement.js` and project persistence validation.

New `.vibproj` behavior:

```text
validated measurementEvidence package -> save/open preserved
measurement session lineId -> must exist in project
legacy non-empty measurements[] -> rejected
measurement/root-cause authority promotion -> rejected
old V1 project without measurementEvidence -> still loadable
source project -> not mutated by attachment
persisted currentResults -> still rejected
```

New EIT-derived projects start with an empty validated measurement package and explicitly record that measurement evidence is not current engineering authority and has no RCA authority.

Focused controlled reconstruction:

```text
Stage-6 persistence cases        PASS 7/7
Stage-1 authority/current guards PASS 2/2
```

Committed implementation blobs:

```text
project/schema.js                    ed123f469ed5b83a138aa37e2bcd236d282ea0ef
project/measurement.js               df3d70f18eb50026800546b8ec9c87e29d3fded3
project/from-eit.js                  ef0b4e4fe26a0363d9e96e083250c62db3e3c10c
Stage-6 focused test                 3fd60902ea42f4d23cfd14da0508ec61371ffae2
```

The Stage-6 execution used a controlled reconstructed dependency surface with the exact Stage-5 measurement-contract blob; repository-native complete-checkout execution remains `NOT_RUN`.

## Coordination

Known neighboring active ownership remains:

```text
#479 FIT workspace
#506 shared Engineering Calculations tab + AIV runtime
#508 SBC facility/workspace
#571 mechanism coverage/identification
#539/#540 FIT adapter/family/console presentation
```

PR615 will not further edit the shared Engineering Calculations tab without reconciliation with #506.

`converters/vibration/project/**` and `converters/vibration/measurement/**` are PR615-owned. Stage 6 touches no mechanism workspace.

## Permanent negative assurance

PR615 does not authorize:

```text
new engineering equations or coefficients
automatic T1 applicability
unqualified multi-item reducers
measurement-to-LOF or measurement-to-screening substitution
signal-processing algorithms
automatic RCA conclusions
persisted measurement evidence as current engineering authority
natural-frequency source-method inference
DN/schedule geometry inference
STANDARD/NORMAL process actualization inference
persisted current-result promotion
generic multi-module .eit export authority
design/code authority
Product Freeze
workflow changes
```

## Validation truth still NOT_RUN

```text
repository-native Stage-6 project/measurement test
complete project/EIT test suite
existing full M5 suite
repository-native M4/matrix suite
full Vibration/FIT/AIV/SBC release suites
served browser acceptance
independent engineering review
```

No absent hosted status/workflow is treated as PASS.

## Current risks / debt

- branch remains behind unrelated main commits and must be reconciled before merge qualification;
- mechanism-workspace project-context propagation remains blocked by #479/#506/#508;
- coverage integration remains owned by #571;
- AIV/deadleg MANY reduction remains unresolved and must not be guessed;
- Stage-6 persistence has no measurement import UI or signal-processing runtime;
- generic multi-module `.eit` export remains deferred.

## EXACT_NEXT_ACTION

Keep PR615 draft/unmerged. Re-ground final live main/head/reviews/checks after recovery commits. The next implementation stage must be selected from live unblocked gaps. Do not add signal-processing math, measurement-to-screening promotion, or unqualified multi-item reducers. Before any merge attempt: reconcile current main, run repository-native qualification in a complete checkout, then perform independent engineering review.
