# FIV / FIT API-First Vibration Integrity Roadmap

## 1. Purpose and roadmap status

This roadmap defines the controlled engineering and software delivery path for the Vibration Integrity family in `3D_Converters`, using the frozen public FIT calculator ID:

```text
VIB.FIV.FLOW_TURBULENCE
```

The mechanism behind that ID is **Flow-Induced Turbulence (FIT)**. FIT remains separate from flow-induced pulsation/deadleg excitation (FIP), acoustic-induced vibration (AIV), mechanical excitation, reciprocating/positive-displacement pulsation, rotating stall, surge/momentum, cavitation/flashing, small-bore connection (SBC) response, intrusive-element/thermowell vortex shedding, slug/transient specialist work, and detailed dynamic analysis.

This document is now a **living programme roadmap**, not a historical description of the first FIT PR.

Roadmap control snapshot:

```text
roadmapStatus          = ACTIVE_PROGRAMME_ROADMAP
statusDate             = 2026-08-16
3D_Converters main     = 042025bfe3f9c60ba11d8c653f98af78ac587a64
EI data reference repo = reallaksh19/Advanced_Analysis
EI data reference pin  = 16d1e58f728e72b04b761c02dce682aa189779f2
currentAuthoritySource = production calculation definitions + qualification records
```

The roadmap is governed by issue #429, issue #450, the current mechanism-specific qualification issues/records, `docs/APIEngineeringCalcRoadmap.md`, `docs/APIEngineeringCalcContracts.md`, and controlled Energy Institute source evidence.

Whenever repository state advances, this section must be updated or explicitly marked historical. Mutable statements such as “current PR” must not remain indefinitely embedded in the roadmap.

---

## 2. Product boundary

### 2.1 FIT remains table-first

FIT shall not depend on:

- 3D geometry rendering;
- visual pipe length measured from pixels;
- click-on-geometry calculation;
- a UI-side engineering solver;
- a second copy of FIT equations in a workspace or report.

`Advanced_Analysis` remains the upstream owner of model/topology authoring and controlled engineering-data projection.

### 2.2 AIV canvas exception is explicit and non-numerical

The original blanket “no canvas” rule is no longer valid for the whole vibration family. AIV now has a governed 2D network/canvas programme.

For any AIV network canvas:

```text
SVG/pixel coordinates = presentation only
explicit engineering lengths/topology = engineering input authority
registered AIV kernel = numerical authority
```

A visual/network surface may author or explain connectivity when explicitly qualified, but it must never infer physical distance, acoustic quantities, LOF, or design authority from drawing geometry.

### 2.3 Responsibility boundary

```text
Advanced_Analysis / engineering-data sources
    model/topology, controlled EI reference data, source identities
                    │
                    │ versioned/pinned exchange
                    ▼
3D_Converters / Vibration Integrity
    mechanism identification
    input resolution
    mechanism calculations
    EI main-line completeness/aggregation
    operating scenarios
    findings/actions/evidence
    qualification and authority presentation
```

---

## 3. Present repository status — 2026-08-16

The original roadmap text that described FIT as a blocked placeholder is obsolete.

### 3.1 FIT — implemented, bounded screening method

Current `main` contains the registered adapter:

```text
calculationId          = VIB.FIV.FLOW_TURBULENCE
methodRevision         = ei-aviff2-fit-screening-v1
calculationState       = IMPLEMENTED
qualificationState     = SCREENING
designAuthority        = false
codeCompliance         = false
screening mode         = bounded / fail-closed
```

Current bounded applicability retains the unresolved diameter family gap:

```text
219.1 mm < Dext < 273 mm  -> excluded / fail closed
```

The current adapter also preserves the advanced FIT requirement that the qualified refined path is conditional and does not make natural frequency a universal FIT input.

Open draft PRs #539 and #540 are **not current-main authority**. They propose production-lifecycle/authority-presentation hardening around the already qualified bounded FIT method. Until merged, they are candidate delivery state only.

### 3.2 AIV — screening authority exists on main

Current `main` contains:

```text
calculationId          = VIB.AIV.ACOUSTIC
methodRevision         = ei-aviff2-aiv-auto-screening-v1
calculationState       = IMPLEMENTED
qualificationState     = SCREENING
screeningResultScope   = ASSESSMENT
designAuthority        = false
line/case summary      = non-authoritative for screening
```

AIV production-freeze and unified-network-canvas programmes remain active under issues such as #513 and #526. Those programmes may improve runtime/product evidence without silently changing the numerical authority boundary.

### 3.3 SBC — candidate-only, source conflict still blocks curve authority

SBC Type-3 work is not screening-authorized.

Current programme boundary includes:

```text
engineeringAuthority    = NONE
screeningAuthority      = NOT_AUTHORIZED
designAuthority         = false
T3-1..T3-4 curve state  = BLOCKED_SOURCE_DATA_CONFLICT
runtime curve authority = false
```

Draft PR #546 is a production-freeze/source-reconciliation work item, not a screening promotion. D7 remains validation evidence; it must not be used to tune or reconstruct quarantined curves.

### 3.4 T2.9 cavitation/flashing — source reconciliation and candidate method work

Issue #545 controls the T2.9 path. Current work remains source/method reconciliation first. No production screening authority is implied by candidate `FL` data or by secondary synthesis material.

### 3.5 Shared master-data programme

Issue #450 remains the governing programme for controlled vibration master recovery, anti-drift governance, and remaining mechanism qualification.

The current `Advanced_Analysis` EI-data reference set at commit:

```text
16d1e58f728e72b04b761c02dce682aa189779f2
```

contains useful structured references including:

```text
EI_AVIFF_Guidelines_2nd_Edition_Examples.md
EI_AVIFF_Complete_Master_Register.md
P0_SBC_Master_Data.md
P1_Valve_Transient_and_Cavitation.md
P1_Thermowell_Assessment.md
P2_Pulsation_and_Specialist_Mechanisms.md
Appendix_B_Defaults_and_Fluid_Properties.md
```

These are controlled/pinned structured evidence inputs for reconciliation and benchmarking. A structured transcription is **not automatically production master authority** merely because it is version-controlled.

---

## 4. Permanent engineering invariants

### INV-FIT-001 — preserve the public FIT calculation ID

```text
VIB.FIV.FLOW_TURBULENCE
```

remains stable until a separately approved contract migration exists.

### INV-VIB-002 — validation, applicability, calculation, assessment, qualification, and authority remain separate

```text
Validation        -> is the payload structurally/numerically valid?
Applicability     -> is the method valid for this physical case?
Calculation       -> what does the method calculate?
Assessment        -> what does the method-defined result require?
Qualification     -> what evidence has the implementation passed?
Authority         -> what organizational use is permitted?
```

No layer may infer a stronger downstream state merely because the previous layer passed.

### INV-VIB-003 — no silent engineering defaults

Missing engineering data must not be silently invented.

A source-defined conservative rule is allowed only when represented as:

```text
value
provenance = METHOD_MANDATED_CONSERVATIVE_ASSUMPTION
methodRevision
sourceLocator
reason
```

This distinction is important because EI contains conservative fallback rules in some workflows. Those are not generic software defaults.

### INV-FIT-004 — natural frequency and damping are not universal FIT inputs

Natural frequency is required only for the qualified branch that explicitly uses it. Damping is not a universal FIT input.

### INV-VIB-005 — no unqualified cross-mechanism aggregation

The previous rule “never combine cross-mechanism LOF” was too broad.

Do **not** create an invented universal score such as:

```text
max(FIT_LOF, AIV_LOF, SBC_LOF, THERMOWELL_LOF, arbitraryIndex)
    = UNIVERSAL_VIBRATION_RISK
```

However, where the pinned adopted EI workflow explicitly defines a main-line aggregate, the exact method-defined aggregate shall be implemented as its own result:

```text
eiMainLineLof = max(applicable qualified EI main-line excitation-mechanism LOFs)
```

Subject to all of the following:

- only EI main-line mechanisms belonging to the adopted aggregation set participate;
- raw mechanism results remain separately visible;
- SBC and thermowell/intrusive-element results are not inserted into the main-line max merely because they also use the term LOF;
- foreign/project-specific indices are excluded unless a separately qualified method explicitly includes them;
- the aggregation result has its own method/revision/evidence identity;
- completeness is checked before the aggregate is presented as a complete EI main-line assessment.

### INV-VIB-006 — below-threshold mechanism result is not overall vibration acceptance

The following three states are different:

```text
FIT LOF below FIT criterion
!= EI main-line screening complete
!= vibration integrity acceptable / verified
```

Example:

```text
FIT                  = BELOW_REFERENCE_THRESHOLD
Mechanical           = NOT_ASSESSED_REQUIRED
FIP                  = NOT_ASSESSED_REQUIRED
EI main-line status  = INCOMPLETE
engineering action   = CONTINUATION_REQUIRED
```

### INV-VIB-007 — same production kernel everywhere

Direct API, single execution, batch, facility workflow, UI projection, scenario analysis, and reports must consume the same registered mechanism kernel/result contract.

### INV-VIB-008 — source, errata, licence and revision are explicit

Each qualified method/master set shall retain, where applicable:

```text
source repository / controlled artifact
commit / blob / content hash
edition / revision
printed page / PDF page / table / figure / equation locator
errataSetId
errataApplied[]
licenseScope / sourceAccessClass
methodRevision
masterRevision / contentHash
```

A full PDF being present in a repository is not itself evidence that its contents may be redistributed or promoted to public master data.

### INV-VIB-009 — benchmark expected values never come from the runtime under test

Production output shall never be copied into a benchmark as the expected oracle.

### INV-VIB-010 — project data outranks optional assumptions

Where method semantics allow multiple sources:

```text
EXPLICIT PROJECT / USER
    > accepted governed master
    > visible accepted assumption / method-mandated conservative assumption
```

Conflicts that cannot be resolved by a qualified precedence rule fail closed.

---

## 5. EI workflow architecture — family level

The family roadmap must represent the EI workflow, not merely a list of independent calculators.

### 5.1 Stage A — mechanism identification / qualitative coverage

Create first-class records:

```text
MechanismIdentification
RequiredAssessmentSet
MechanismCoverage
AssessmentCompleteness
```

Mechanisms identified as applicable/required must either have an assessment result or an explicit disposition such as:

```text
NOT_APPLICABLE
NOT_READY
UNSUPPORTED_METHOD
SPECIALIST_ASSESSMENT_REQUIRED
PROJECT_EVIDENCE_REQUIRED
```

A green result from one mechanism cannot erase an unassessed required mechanism.

### 5.2 Stage B — EI main-line quantitative mechanisms

The adopted EI family map shall explicitly include the complete T2 set relevant to the project scope:

```text
T2.2  Flow-Induced Turbulence
T2.3  Mechanical excitation
T2.4  Reciprocating / positive-displacement pulsation
T2.5  Rotating stall
T2.6  Flow-Induced Pulsation / deadleg excitation
T2.7  High-frequency acoustic excitation / AIV
T2.8  Surge / momentum changes
T2.9  Cavitation / flashing
```

Do not describe the programme as complete while omitting T2.3, T2.4, T2.5, or other required main-line mechanisms.

### 5.3 Stage C — EI main-line aggregate and completeness

Conceptual contract:

```text
EiMainLineAssessment.v1
  lineId
  operatingScenarioId
  requiredMechanisms[]
  mechanismResults[]
  missingRequiredMechanisms[]
  complete
  governingMechanismId
  mainLineLof
  referenceBand
  requiredActions[]
  evidence
```

Rules:

1. `mainLineLof` is calculated only from the qualified EI main-line mechanism set defined by the adopted method.
2. If a required mechanism is missing, the overall state is `INCOMPLETE` unless the method itself mandates a conservative substitute.
3. A method-mandated conservative substitute is recorded explicitly; it is not a hidden default.
4. Raw mechanism LOFs remain visible under the aggregate.

### 5.4 Stage D — small-bore connection assessment

SBC consumes the appropriate main-line excitation context using the exact T3 semantics. It remains a separate structural susceptibility/response assessment and must not be mixed into the main-line max.

### 5.5 Stage E — intrusive elements / thermowells

TM-04/T4 remains separately assessed and separately reported.

### 5.6 Stage F — mandatory continuation

Numerical screening may require continuation into:

```text
visual survey / walkdown
basic or specialist measurement
predictive/detailed analysis
corrective action
SBC assessment
field verification
```

The software must retain those obligations even when the numeric LOF is low.

---

## 6. Canonical assessment units — do not iterate every mechanism over the same geometry object

The old conceptual expansion:

```text
Line x segment/location x operating case x mechanism
```

is too generic. Mechanisms have different physical assessment units.

Introduce:

```text
AssessmentUnitType
```

Minimum set:

```text
LINE_SECTION
HOMOGENEOUS_PIPE_SECTION
DEADLEG_BRANCH
SOURCE_TO_ASSESSMENT_RELATIONSHIP
SMALL_BORE_CONNECTION
VALVE_EVENT_PATH
INTRUSIVE_ELEMENT
MACHINERY_AFFECTED_LINE
SPECIALIST_SYSTEM
```

Examples:

| Mechanism | Primary assessment unit |
|---|---|
| FIT | line/homogeneous section with maximum effective support span |
| Mechanical | machinery-affected main line / source context |
| FIP T2.6 | deadleg branch relative to flowing main line |
| AIV T2.7 | acoustic source -> welded/discontinuity assessment relationship |
| Surge T2.8 | valve event + affected upstream/downstream path |
| Cavitation T2.9 | valve/restriction process state |
| SBC T3 | physical small-bore connection |
| Thermowell T4 | intrusive element |

Facility planning must ask each mechanism adapter to enumerate its own applicable assessment units from the common dataset.

---

## 7. Operating scenarios — coherent states only

Separate a coherent operating scenario from unrelated design maxima.

Recommended objects:

```text
OperatingScenario
DesignLimitSet
EventScenario
```

`OperatingScenario` examples:

```text
TURNDOWN
NORMAL
RATED
MAXIMUM_CONTINUOUS
RECYCLE
RELIEF
STARTUP
SHUTDOWN
UPSET
ALTERNATE_MODE
```

`EventScenario` examples:

```text
PSV_LIFT
FAST_VALVE_CLOSURE
BLOWDOWN
TRIP
```

Do not construct a synthetic “DESIGN” scenario by combining independent maximum flow, maximum density, maximum pressure, and minimum temperature unless those quantities are physically simultaneous and source-qualified.

Intermittent recycle, bypass and relief scenarios must be represented when credible; the EI worked examples explicitly demonstrate why normal PFD stream cases alone are insufficient.

---

## 8. Input semantics requiring micro-level hardening

### 8.1 FIT span/support input

Replace vague “verified unsupported span” terminology with an engineering-specific field set:

```text
maximumSpanBetweenEffectiveSupports
spanDeterminationMethod
supportAId
supportBId
supportAEffectiveness
supportBEffectiveness
spanSource
spanReviewStatus
```

Support classification is **derived** from qualified support/span rules. It should not become an arbitrary user-entered categorical truth when the underlying span/support evidence is available.

### 8.2 Pipe geometry

Do not equate:

```text
NPS/DN == outside diameter
schedule == wall thickness
```

Required resolution rules:

- NPS/DN + schedule may resolve OD/wall only through a controlled catalogue revision;
- direct OD/wall values retain their own provenance;
- wall-thickness basis is explicit: `NOMINAL`, `MIN_SPEC`, `AS_BUILT`, `MEASURED`, `CURRENT_ASSESSED`, or other qualified project basis;
- when ID is supplied together with OD and wall, enforce consistency or a method-defined authoritative representation;
- impossible `OD <= 2*wall` geometry fails closed.

### 8.3 Process properties

FIT uses actual operating-state fluid quantities where required by the method.

Each property should preserve a basis such as:

```text
ACTUAL_OPERATING
STANDARD
NORMAL
BASE_CONDITION
SIMULATION_RESULT
PROJECT_ASSUMPTION
```

Any conversion from standard/normal data to actual operating conditions must be explicit, qualified, and evidenced. Standard volumetric flow shall not silently enter a correlation that requires actual velocity/density.

### 8.4 Pressure and temperature basis

Mechanisms using pressure/temperature shall preserve explicit basis/location semantics. Gauge/absolute pressure or upstream/downstream sampling location may never be guessed.

---

## 9. Result and action semantics

### 9.1 Preserve mechanism outputs

Each result retains:

```text
methodId
methodRevision
assessmentUnit
operatingScenario
applicability
resolvedInputs
intermediates
rawOutputs
referenceBand
requiredActions[]
qualification
authority
provenance
evidence
warnings/diagnostics
```

### 9.2 Do not reduce EI bands to ACCEPTABLE / REVIEW / ACTION

The EI action bands carry different mandatory/recommended continuation requirements.

Use a structure such as:

```text
referenceBand
requiredActions[]
  actionId
  technicalModule
  obligation = SHALL | SHOULD | MAY | PROJECT_RULE
  reason
  completionState
```

Avoid `ACCEPTABLE` as a terminal engineering state unless the adopted method or project procedure explicitly defines it.

### 9.3 Findings are driven by required actions, not only high numbers

A Finding may be created because:

- a high numerical screening result requires action;
- an EI band requires SBC assessment or visual survey;
- mechanism coverage is incomplete;
- a source/master conflict blocks completion;
- specialist assessment is required;
- field verification remains outstanding.

### 9.4 Scenario predictions are not field verification

A modification scenario that reduces a calculated LOF shall be reported as, for example:

```text
PREDICTED_BELOW_REFERENCE_THRESHOLD
```

not `ACCEPTABLE` or `VERIFIED` until the required as-built/field verification is complete.

---

## 10. Benchmark and qualification standard

### VIB-BENCH-001 — minimum two independent engineering benchmark families

Every executable vibration mechanism shall have:

1. **At least two independent engineering benchmark families.**
2. At least one benchmark traceable to a controlled published/adopted method example where such an example exists.
3. At least one additional independent oracle: a second published example, independent hand calculation, or separately reviewed project/reference calculation.
4. Every materially different equation branch, rule branch, decision boundary, and applicability boundary covered even when this requires more than two benchmark families.
5. Unit-invariance, single/batch parity, import/export parity, UI projection, and stale/currentness checks in addition to the engineering benchmarks; these do **not** count as independent engineering benchmark families.
6. No expected value produced by the runtime under test.

### 10.1 Benchmark evidence classes

```text
B1  PUBLISHED_METHOD_EXAMPLE
B2  INDEPENDENT_ENGINEERING_VECTOR
B3  BRANCH_BOUNDARY_REGRESSION
B4  PRODUCT_PARITY_AND_INTEGRATION
```

Only B1/B2 families count toward the minimum independent engineering-oracle requirement.

### 10.2 Pinned EI worked-example source

The current structured worked-example reference is pinned at:

```text
repository = reallaksh19/Advanced_Analysis
commit     = 16d1e58f728e72b04b761c02dce682aa189779f2
path       = docs/EI data/EI_AVIFF_Guidelines_2nd_Edition_Examples.md
blob       = c050cd90802c27241c510c6f0ac43bfaf7a89e9d
```

The benchmark registry shall also retain the corresponding governing controlled EI source binary identity used for source authority.

### 10.3 FIT benchmark floor

FIT shall retain both EI worked-example families:

```text
FIT-EI-D2  Gas compression quantitative example
FIT-EI-D4  Separation-system modification quantitative example
```

D2 contains multiple gas/recycle/relief cases spanning low to high FIT LOF values. D4 adds materially different support/phase/system behaviour, including the high-LOF produced-water case.

All distinct published vectors remain permanent regression oracles; the “two-family” rule is a minimum, not permission to discard other EI examples.

### 10.4 SBC benchmark floor

Because EI provides all four connection types, SBC shall use:

```text
SBC-EI-D5  Type 1
SBC-EI-D6  Type 2
SBC-EI-D7  Type 3
SBC-EI-D8  Type 4
```

Do not reduce SBC qualification to only two examples.

D7 is an oracle for the exact worked-example result path. It shall never be used to generate, tune, fit, or reconstruct T3 curve master data.

### 10.5 Surge / momentum benchmark floor

Use distinct event families where method branches differ, including the D2 event context and the D4 FCV1002 liquid fast-closure example where applicable to the implemented scope.

### 10.6 Thermowell and single-example mechanisms

Where only one published EI worked example exists, create at least one independent hand/reviewed vector with a materially different branch or governing ratio. Add exact below/at/above boundary vectors separately.

### 10.7 Benchmark object

Recommended machine-readable record:

```text
VibrationBenchmark.v1
  benchmarkId
  benchmarkFamilyId
  mechanismId
  oracleClass
  source
  inputs
  expectedIntermediates
  expectedOutputs
  tolerancePolicy
  branchCoverage[]
  applicabilityCoverage[]
  reviewer
  status
```

Expected values belong in controlled benchmark data, not duplicated as anonymous literals across test files.

---

## 11. Master/source governance

### 11.1 Required chain

```text
controlled governing source
        -> source extraction/reconciliation
        -> pinned structured transcription/candidate master
        -> independent engineering review
        -> qualified active master
        -> production resolver
```

### 11.2 Anti-drift

A change to any of the following must change identity or fail validation:

```text
source bytes
source locator
master value
unit
key
curve point
interpolation policy
applicability boundary
method revision
```

### 11.3 Curve rules

For digitized EI curves:

- source figure and axis semantics are pinned;
- independent digitization/review is required;
- interpolation policy is explicit;
- extrapolation is forbidden unless the adopted method explicitly permits it;
- worked examples validate the recovered curve but do not create the curve.

### 11.4 Appendix-B/default data

Optional property/default libraries shall not silently overwrite explicit project values. The UI/result evidence must show when an assumption or default participates.

---

## 12. Engineering Calculation API and mechanism architecture

Each numerical vertical follows the same responsibility split:

```text
validateInput()
resolveInput()
evaluateApplicability()
calculate()
assess()
```

Mechanism-specific adapters register into the existing Engineering Calculation platform.

Generic platform owns:

- calculation ID/discovery;
- external contract;
- unit/provenance infrastructure;
- execution orchestration;
- immutable result envelope;
- batch execution;
- generic qualification presentation.

Mechanism domain owns:

- physical input meaning;
- applicability;
- equations/rules/curves;
- mechanism intermediates;
- raw result semantics;
- method-defined assessment/actions;
- method trace.

UI code owns none of the engineering equations or decision thresholds.

---

## 13. Facility execution and completeness

Facility planning becomes:

```text
Facility
 -> OperatingScenario
 -> MechanismIdentification
 -> RequiredAssessmentSet
 -> mechanism-specific AssessmentUnits
 -> mechanism calculations
 -> MechanismCoverage
 -> EiMainLineAssessment where applicable
 -> SBC/Thermowell/specialist continuation
 -> Findings / required actions
```

The facility register should distinguish:

```text
DATA_INCOMPLETE
MECHANISM_COVERAGE_INCOMPLETE
CALCULATION_BLOCKED
SCREENING_RESULT_AVAILABLE
CONTINUATION_REQUIRED
FIELD_VERIFICATION_REQUIRED
COMPLETE_FOR_DECLARED_SCOPE
```

Do not use “no red results” as the definition of completeness.

---

## 14. Sensitivity and scenario analysis

Sensitivity is orchestration over the same kernel.

Every sensitivity point must independently re-run:

```text
validation
resolution
applicability
calculation
assessment
```

Never interpolate across an excluded method gap, including the current FIT diameter gap.

A sweep crossing an applicability boundary shall show explicit `NOT_APPLICABLE` / `EXCLUDED` points rather than drawing a continuous engineering trend through them.

---

## 15. Findings, mitigation, measurement and closeout

Suggested lifecycle:

```text
Finding
 -> required EI/project action
 -> engineering review
 -> mitigation option / scenario
 -> recalculation
 -> approved implementation
 -> visual/measurement/predictive verification as required
 -> closeout
```

Measurements/RCA may remain later-product scope, but the current screening result must already be able to carry a non-closable continuation obligation such as:

```text
VISUAL_SURVEY_REQUIRED
MEASUREMENT_REQUIRED
SPECIALIST_ANALYSIS_REQUIRED
SBC_ASSESSMENT_REQUIRED
FIELD_VERIFICATION_REQUIRED
```

A calculator finishing successfully does not satisfy those obligations.

---

## 16. Micro-level technical execution plan

The following is the current dependency-ordered plan. Each item is deliberately small enough to review and falsify independently.

### M0 — roadmap/status control

**Scope**

- keep this roadmap tied to a dated repository SHA;
- remove historical “current PR” claims;
- add current-authority references and active work-item references.

**Exit**

```text
roadmap reflects current main
no historical blocked-FIT statement presented as current truth
```

### M1 — mechanism identification and coverage contract

**Add/define**

```text
MechanismIdentification.v1
RequiredAssessmentSet.v1
MechanismCoverage.v1
AssessmentCompleteness.v1
```

**Tests**

- required mechanism cannot disappear because another mechanism is below threshold;
- `NOT_APPLICABLE` differs from `NOT_ASSESSED`;
- incomplete required set cannot become overall complete.

**Dependency**: M0.

### M2 — assessment-unit contract

**Add/define** `AssessmentUnitType` and mechanism enumerators.

**Tests**

- FIT enumerates line/homogeneous sections;
- FIP enumerates deadlegs;
- AIV enumerates source-to-assessment relationships;
- SBC enumerates physical connections;
- T2.8/T2.9 enumerate event/device contexts;
- no mechanism is forced through a generic segment loop.

**Dependency**: M1.

### M3 — EI main-line aggregation/completeness contract

**Add/define** `EiMainLineAssessment.v1`.

**Rules to test**

```text
mainLineLof = max(qualified applicable EI main-line mechanism LOFs)
SBC excluded from main-line max
Thermowell excluded from main-line max
missing required mechanism -> INCOMPLETE
method-mandated conservative rule -> explicit provenance
```

**Dependency**: M1, mechanism output schemas.

### M4 — FIT input micro-hardening

**Harden**

- maximum span between effective supports;
- support evidence/effectiveness;
- actual-vs-standard property basis;
- OD/wall/ID consistency;
- catalogue-based NPS/schedule resolution;
- wall-thickness basis;
- operating-scenario identity.

**Tests**

- ineffective intermediate support does not shorten span;
- conflicting ID versus OD/wall fails closed;
- standard-flow value cannot silently act as actual-flow value;
- design-limit Franken-case is rejected or explicitly classified;
- current diameter gap remains fail closed.

**Dependency**: current FIT method stays numerically frozen unless a separately qualified method correction is required.

### M5 — common benchmark registry

**Add** `VibrationBenchmark.v1` storage/loader and evidence schema.

**Populate first**

```text
FIT EI D2 family
FIT EI D4 family
SBC D5-D8 expected-value records
AIV qualified benchmark records
```

**Tests**

- expected values cannot import production constants;
- benchmark source SHA/blob/revision drift fails;
- family IDs distinguish independent engineering oracles from unit/API parity tests.

**Dependency**: none on product UI.

### M6 — FIT product/release closure

Coordinate current FIT draft work (#539/#540 or successors) without changing the frozen numerical method unless separately qualified.

**Required evidence**

- exact-head FIT release suite;
- official served-browser production-freeze evidence;
- real table/XLSX workflow where required;
- bounded screening/design=false wording;
- D2 + D4 family coverage retained.

**Exit**

Product lifecycle/authority presentation is truthful and current; no inference of design/code authority.

### M7 — AIV production-freeze closure

Continue #513/#526 programmes under existing assessment-level screening authority.

**Protect**

- Assessment remains screening-authoritative;
- line/case summaries remain trace only;
- canvas pixels never define distance;
- registered kernel remains numerical authority;
- source grouping and stale-async rules remain fail closed.

### M8 — Mechanical T2.3 and FIP T2.6 coverage integration

Before claiming EI main-line completeness, integrate the qualified/bounded T2.3 and T2.6 results into mechanism coverage using their own assessment units.

**Tests**

- D2 mechanical example branch;
- D2 deadleg branches including 0.29 and 1.0 outcomes where source-qualified;
- missing machinery/deadleg evidence does not become zero;
- main-line aggregate uses their qualified LOFs only when the corresponding mechanism is required/applicable.

### M9 — SBC Type 1-4 qualification and production path

Use all D5-D8 worked examples.

**Order**

1. reconcile non-curve T3 rules/tables;
2. keep T3 curves quarantined while conflict exists;
3. reproduce D5/D6/D8 non-conflicted paths where source data permit;
4. reproduce D7 with exact manual/project curve evidence while curves remain quarantined;
5. only activate governed curves after independent source reconciliation/digitization passes;
6. preserve main-line LOF provenance feeding SBC.

**Hard stop**: never tune T3 curves to D7.

### M10 — T2.8 surge/momentum completion

Use separate event scenarios and source-defined valve-event semantics.

**Benchmarks**

- D2 applicable event branch(es);
- D4 FCV1002 fast-closure path;
- boundary/closure-time cases;
- pressure-basis and force-unit invariance.

### M11 — T2.9 cavitation/flashing candidate vertical

Execute issue #545 sequence:

```text
controlled source reconciliation
 -> FL candidate resolution
 -> exact pressure/Pv/device semantics
 -> pure candidate kernel
 -> central candidate adapter
 -> product evidence
 -> separate screening-authority review
```

Unknown valve/device, missing vapour pressure, or unknown pressure basis remains fail closed.

### M12 — Thermowell T4 screening

Reconcile T4-1 and geometry/natural-frequency rules.

**Minimum engineering benchmark families**

- EI D2 thermowell example;
- independent materially different geometry/wall/frequency-ratio vector.

Add exact ratio boundary tests separately.

### M13 — T2.4 reciprocating/PD and T2.5 rotating-stall rules

Encode source flowcharts as explicit rule graphs.

Project/OEM machine data remains project evidence, not a universal EI master.

Unknown stall behaviour or missing OEM study data must follow the source-defined conservative/escalation path, visibly.

### M14 — facility EI-completeness and action workspace

Only after M1-M3 and sufficient mechanism coverage:

- display required-versus-assessed mechanisms;
- display EI main-line aggregate only when its completeness rule is satisfied;
- show SBC/T4 separately;
- display method-required actions and continuation obligations;
- create Findings from required actions/incompleteness, not only high LOF;
- provide Result -> Why -> Evidence.

### M15 — specialist mechanisms and later dynamics

Slug, corrugation, advanced deadleg, nonlinear/time-history, and other specialist routes remain source/method-specific programmes. They do not inherit authority from FIT/AIV or from the EI main-line aggregate.

---

## 17. Planned near-term action order

The practical next sequence from the current repository state is:

```text
1. Merge/review this roadmap correction.
2. Freeze common mechanism-identification + completeness contracts.
3. Freeze assessment-unit vocabulary.
4. Add benchmark registry and migrate existing qualified example oracles.
5. Close FIT product/release evidence without altering the qualified method.
6. Continue AIV production freeze independently.
7. Integrate qualified Mechanical/FIP outputs into EI coverage.
8. Implement EI main-line aggregation only after completeness semantics exist.
9. Resolve SBC source conflict and qualify D5-D8 paths.
10. Complete T2.8, T2.9 and T4 controlled verticals.
11. Add T2.4/T2.5 rules and project-evidence interfaces.
12. Activate facility-level EI completeness/actions after the required mechanism set is genuinely covered.
```

This ordering prevents the facility UI from becoming a false “overall vibration assessment” before the underlying EI mechanism coverage exists.

---

## 18. Recommended delivery/PR discipline

Do not return to the old sequential numbering that assumes the programme is still at “PR 1”.

Use small capability slices such as:

```text
VIB-COVERAGE-*     mechanism identification/completeness
VIB-UNIT-*         assessment-unit contracts
VIB-BENCH-*        benchmark governance and oracle migration
FIT-PF-*           FIT product/release closure
AIV-PF-*           AIV production freeze
SBC-PF-*           SBC production/source freeze
T28-*              surge/momentum
T29-*              cavitation/flashing
T4-*               thermowell
VIB-FACILITY-*     facility aggregation/action workflow
```

Each engineering-critical slice must state:

```text
source/oracle identity
method/authority before
authority after
changed files
independent benchmarks
boundary tests
product/browser status
NOT_RUN items
known exclusions
exact next action
```

No qualification pass grants merge authority automatically.

---

## 19. Principal risks and open questions

### RISK-001 — incomplete EI workflow presented as complete vibration screening

Mitigation: first-class `RequiredAssessmentSet`, `MechanismCoverage`, and `AssessmentCompleteness`.

### RISK-002 — invented universal vibration score

Mitigation: mechanism results remain distinct; only a method-defined EI main-line aggregate is allowed, with its own evidence and membership rules.

### RISK-003 — source/master transcription treated as authority

Mitigation: controlled source -> reconciliation -> independent review -> active master.

### RISK-004 — operating-case incoherence

Mitigation: coherent `OperatingScenario`/`EventScenario`; separate `DesignLimitSet`.

### RISK-005 — support/span simplification

Mitigation: effective-support evidence and maximum span between effective supports become first-class.

### RISK-006 — result band misrepresented as acceptance

Mitigation: store reference band plus method-required actions/continuation obligations; avoid terminal `ACCEPTABLE` wording unless explicitly source/project defined.

### RISK-007 — benchmark self-calibration

Mitigation: VIB-BENCH-001; expected values remain independent and source-pinned.

### RISK-008 — licence/errata drift

Mitigation: source access class, errata set, exact edition/artifact identity in method/master records.

### QST-001 — exact project-adopted EI source/errata set

Maintain one explicit adopted source record for each mechanism revision.

### QST-002 — exact EI main-line mechanism membership for each supported project profile

Freeze this in the aggregate method definition; do not infer membership from whichever calculators happen to exist in the UI.

### QST-003 — FIT unresolved diameter family

Remain excluded/fail-closed until a source-backed qualified resolution is approved.

### QST-004 — independent engineering-review governance

Numerical worked-example reproduction and engineering authority approval are separate concepts. If the Owner elects a waiver or alternative approval route, record it explicitly as a governance decision/deviation rather than redefining “independent verification”.

---

## 20. Definition of success

The vibration programme succeeds when an engineer can answer, for a facility/line/scenario:

```text
Which vibration mechanisms were required and why?
Which were assessed, not applicable, unsupported, or still incomplete?
What physical assessment unit did each mechanism use?
What exact inputs and source bases were consumed?
Which method/master/source/errata revisions ran?
What were the raw mechanism-specific results?
What EI main-line LOF was calculated, if the method-defined aggregate was complete?
Which mechanism governed that aggregate?
What SBC/Thermowell results remain separate?
What actions does the adopted method require?
What continuation/verification remains open?
Which benchmark families qualify this branch?
What software/kernel revision produced the result?
What engineering authority does the result actually carry?
```

The permanent rule is:

> **Share infrastructure and physical data where definitions are identical; share empirical engineering authority only where the pinned adopted method explicitly defines the relationship.**
