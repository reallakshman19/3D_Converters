# Vibration Integrity — Line-Centric Multi-Mechanism Roadmap

Status: architecture roadmap / qualification plan  
Current implemented mechanism: **FIT — Flow-Induced Turbulence**  
Current FIT authority: **BENCHMARK_ONLY**  
Screening authority: **NOT_AUTHORIZED**  
Design authority: **false**

## 1. Purpose

The vibration product must be organized around a **line / operating-case assessment** with shared engineering basis and independent mechanism assessments.

The complete retained EI AVIFF worked-example report demonstrates that FIT is one mechanism inside a broader line-screening register. The product architecture therefore must not make FIT-specific hydraulics or support/span logic the top-level workflow for every vibration mechanism.

The target product model is:

```text
Line / operating case
  -> shared identity
  -> pipe / material basis
  -> process / stream basis
  -> shared derived context
  -> mechanism applicability
  -> mechanism-specific assessment(s)
  -> mechanism result(s)
  -> implemented governing result
  -> evidence / traceability
```

FIT remains the first implemented and benchmark-qualified mechanism. This roadmap does **not** authorize other mechanisms and does not promote FIT to screening/design authority.

## 2. Controlled source basis

Primary source context:

- `reallaksh19/Common`
- pinned commit `fb549185b9b27edc2379734240320a85c5bef9f6`
- source DOCX `Energy-Institute-AVIFF---Worked-Examples.doc.docx`
- source DOCX Git blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`
- retained Markdown transcription on `main`:
  `docs/Energy-Institute-AVIFF---Worked-Examples.md`

Existing controlled FIT qualification basis remains:

- `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`
- benchmark set `FIT-EI-WORKED-EXAMPLES-V1`
- retained workbook reference remains migration/reference evidence only
- FIT numerical authority remains `WORKBOOK_REFERENCE_ONLY` / `BENCHMARK_ONLY`

The full worked-example transcription is a source/evidence artifact. It is not itself permission to implement or qualify a mechanism without method reconciliation and independent validation.

## 3. What the full example set changes

The prior FIT-centric UI sequence:

```text
Line identity -> Pipe -> Process -> Hydraulic energy -> Support/span -> FIT result
```

is retained only **inside the FIT mechanism**.

The facility product should instead use:

```text
Shared line basis -> Mechanism matrix -> Mechanism detail -> Evidence
```

Why:

- AIV requires valve/noise/pressure data that FIT does not.
- Deadleg pulsation uses branch geometry and can contain multiple child branch records.
- Mechanical excitation can contain multiple equipment records per line.
- Valve transients use valve/transient-specific force and closure inputs.
- Thermowells contain their own geometry, material, frequency and stress assessment.
- SBC contains one or more small-bore connection records.
- Several EI mechanism sections exist with no populated retained worked-example rows.

One flat FIT-shaped row is therefore not an acceptable canonical domain model for the future product.

## 4. EI example coverage matrix

The retained worked-example document contains the following populated mechanism evidence.

| Mechanism | EI report section | Populated worked-example records | Current software state | Qualification implication |
|---|---|---|---|---|
| Flow-induced turbulence (FIT) | EI AVIFF T2.2 | 1-9, 12 | `BENCHMARK_ONLY` implementation exists | continue FIT qualification only |
| Mechanical excitation | EI AVIFF T2.3 | 3, 4, 5, 7 | `NOT_IMPLEMENTED` | source/method extraction required |
| Reciprocating / PD pulsation | EI AVIFF T2.4 | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Rotating-stall pulsation | EI AVIFF T2.5 | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Deadleg pulsation | EI worked-example deadleg section | 4, 7, 8 | `NOT_IMPLEMENTED` | candidate future qualification track |
| Corrugated-pipe pulsation | EI Subsea AVIFF E4.3 | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Slug flow | EI specialist section | none retained | `NOT_IMPLEMENTED` | specialist basis required |
| AIV / high-frequency acoustic excitation | EI AVIFF T2.7 | 5, 6, 8 | `NOT_IMPLEMENTED` | candidate future qualification track |
| Valve transients | EI AVIFF T2.8 | 7, 8, 12 | `NOT_IMPLEMENTED` | candidate future qualification track |
| Cavitation / flashing | EI AVIFF T2.9 | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Thermowells | ASME PTC 19.3 TW-2016 | 3 | `NOT_IMPLEMENTED` | separate standards/method qualification |
| Small-bore connections | EI AVIFF Guidelines | 4 | `NOT_IMPLEMENTED` | candidate future qualification track |

Important interpretation rule:

> A blank mechanism field in the EI line listing is **not automatically `NOT_APPLICABLE`**.

Blank may mean not assessed, no item identified, no retained example data, or not applicable. Software must preserve those states separately.

## 5. Canonical product model

Target domain shape:

```text
FacilityVibrationAssessment
  facilityId
  sourceIdentity
  lines[]

LineAssessment
  lineAssessmentId
  line
  caseId
  canonicalId
  identity
  pipeBasis
  processBasis
  sharedDerivedContext
  sourceTrace
  mechanisms

mechanisms
  fit
  mechanicalExcitation[]
  reciprocatingPulsation[]
  rotatingStall[]
  deadlegPulsation[]
  corrugationPulsation[]
  slugFlow[]
  aiv[]
  valveTransients[]
  cavitationFlashing[]
  thermowells[]
  smallBoreConnections[]
```

The array cardinality is intentional. The EI examples prove that a line can contain zero, one or multiple child assessment items for a mechanism.

### 5.1 Shared basis

Shared basis should contain only values that are genuinely line/case context:

- record / line / case identity
- P&ID reference
- line description
- pipe size/schedule/OD/WT/ID
- material / cladding / rating
- phase
- mass flow
- temperature
- density
- pressure
- viscosity
- speed of sound
- gamma
- molecular weight
- source/provenance

Shared derived context may include quantities produced by central engineering services and consumed by more than one mechanism. It must identify its consumers and calculation source.

### 5.2 Mechanism-specific ownership

Mechanism-specific values stay inside the mechanism that owns them.

Examples:

- FIT: velocity, rho-v-squared, stiffness/support category, span, FIT correlation, FIT LOF.
- AIV: valve mass flow, pressure ratio, trim, PWL, AIV LOF.
- Deadleg: branch/throat/deadleg geometry and advanced deadleg results.
- Valve transients: transient type, closure time, upstream length, forces/pressure response.
- Thermowell: thermowell geometry, Reynolds/Strouhal/Scruton, resonance and stress checks.
- SBC: fitting/location/geometry modifiers and SBC LOF.

UI code must never recompute these mechanism equations.

## 6. User experience target

### 6.1 Primary navigation

Target navigation:

```text
Lines | Mechanisms | Source Data | Evidence
```

`Lines` is the default engineering workspace.

### 6.2 Facility line register

The main register mirrors the EI line-listing concept:

```text
Line | Case | Shared status |
FIT | Mechanical | Recip/PD | Rotating stall | Deadlegs | Corrugations |
Slug | AIV | Transients | Cav/Flash | Thermowells | SBC |
Implemented governing | Qualification | Review
```

Current implementation rule:

- FIT may show a benchmark result.
- Every other mechanism remains visibly not implemented / unevaluated.
- The UI must not infer `PASS`, `SAFE`, `N/A`, or zero for an unimplemented mechanism.
- `Implemented governing` means governing only among mechanisms that have actually executed.
- A future full-facility governing result must not exist until the required mechanism scope is explicitly defined and qualified.

### 6.3 Line detail

Target line-detail layout:

1. Identity
2. Shared pipe basis
3. Shared process basis
4. Shared derived context
5. Mechanism assessments
6. Qualification / evidence
7. Source trace
8. Diagnostics

Selecting a mechanism opens that mechanism's specialist detail without changing the shared line identity.

### 6.4 Mechanisms view

A later `Mechanisms` view provides cross-facility registers:

- all FIT assessments
- all mechanical-excitation items
- all deadlegs
- all AIV items
- all valve transient items
- all thermowells
- all SBCs
- future mechanism families as qualified

This allows engineering questions such as:

- "Show every deadleg requiring review."
- "Show every valve-transient item with LOF >= threshold."
- "Show all thermowell assessment items and their pass/fail evidence."

No cross-mechanism universal score is planned.

## 7. State model

Keep these state dimensions separate.

### 7.1 Input authority

Examples:

- `COMPLETE_XLSX_UNTOUCHED`
- `LIMITED_ELEMENTS_ONLY`
- `UNVERIFIED_ELEMENTS_CSV`
- `LOCAL_EDITED_ELEMENTS`

### 7.2 Mechanism implementation

Per mechanism:

- `NOT_IMPLEMENTED`
- `IMPLEMENTED_BENCHMARK_ONLY`
- future `IMPLEMENTED_QUALIFICATION_PENDING`
- future authorized states only after Owner/engineering approval

### 7.3 Applicability / readiness

Per line/mechanism:

- `NOT_EVALUATED`
- `APPLICABILITY_UNKNOWN`
- `NOT_APPLICABLE`
- `APPLICABLE_INCOMPLETE`
- `READY`
- `CALCULATED`
- `FAILED`
- `REVIEW_REQUIRED`

`NOT_IMPLEMENTED` is not an applicability state.

### 7.4 Result currency

Per executable mechanism:

- `UNRUN`
- `READY`
- `RUNNING`
- `CURRENT_RESULT`
- `STALE_RESULT`
- `INVALID_INPUT`

Presentation-only filter/sort/tab changes do not stale results.

## 8. Traceability target

Required trace graph:

```text
facility run
  -> line assessment
  -> mechanism assessment item
  -> mechanism calculation result
  -> equation / correlation / rule identifier
  -> normalized engineering input
  -> working input cell
  -> original input cell
  -> source record
  -> controlled source identity
```

Every mechanism added later must integrate into the same evidence graph instead of inventing a parallel audit model.

## 9. Roadmap stages

### Stage 0 — Authority freeze

Status: **ACTIVE**

Preserve:

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false
```

No non-FIT mechanism may display a calculated result until its production calculation path exists.

Exit gate: permanent tests prove unimplemented mechanisms cannot manufacture results or authority.

### Stage 1 — Shared line / mechanism presentation contract

Status: **CURRENT PR442 STAGE**

Deliver:

- source-aligned mechanism catalogue;
- line-centric mechanism matrix in the facility register;
- FIT projected into the FIT column only;
- all other mechanism columns fail closed as not implemented;
- full roadmap document;
- focused static/model regression in release gate.

No numerical behavior changes.

Exit gate:

- mechanism catalogue matches retained EI report structure;
- only FIT may project current output;
- full-screening governing result remains false/unestablished;
- FIT release gate includes the new regression.

### Stage 2 — Canonical original / working engineering state

Build the implementation contract previously identified in Appendix A:

- stable row/item IDs;
- original vs working value/unit/source;
- cell edit state;
- unit-aware editing through central unit layer;
- explicit revert;
- execution snapshot/hash;
- stale-result state.

Do this at the shared line/mechanism input layer, not as FIT-only UI state.

Exit gate: deterministic execution snapshot and exact revert semantics.

### Stage 3 — Shared engineering-basis projection

Make the engineer-facing joined line/case projection the primary editor.

Raw topology/operating/enrichment tables remain secondary `Source Data` views and remain the import/storage contracts.

Exit gate:

- one authoritative working state;
- no duplicate editable store;
- exact source navigation from projected field to raw source row/cell.

### Stage 4 — FIT mechanism extraction

Refactor presentation boundaries so FIT is explicitly one mechanism module consuming shared basis.

Do **not** rewrite or duplicate the numerical FIT kernel.

Expose backend-provided:

- hydraulic intermediates;
- support/stiffness classification;
- correlation IDs;
- standard/refined/governing FIT result;
- equation IDs;
- qualification evidence.

Exit gate: current five controlled EI FIT examples and independent hand benchmarks remain unchanged.

### Stage 5 — Generic mechanism qualification framework

Before adding the second mechanism, generalize:

- mechanism item identity;
- applicability/readiness result;
- calculation/evidence envelope;
- benchmark comparison envelope;
- source/evidence trace;
- run snapshot;
- stale/current result semantics.

The abstraction must have FIT as a real production consumer in the same change.

Exit gate: no speculative unused framework.

### Stage 6 — Mechanical excitation track

Source evidence exists for records 3, 4, 5 and 7.

Required before implementation:

- extract equations/rules and item semantics from adopted EI source;
- reconcile worked examples;
- establish independent examples;
- define equipment item cardinality and governing rule;
- verify unit invariance;
- add production mechanism module only after method basis is controlled.

Authority starts as benchmark-only.

### Stage 7 — Deadleg pulsation track

Source evidence exists for records 4, 7 and 8, including one example with advanced results.

Required:

- branch geometry contract;
- standard and advanced paths;
- explicit handling of `NaN` / unavailable advanced results;
- branch-to-mainline identity/evidence;
- independent hand checks;
- boundary tests.

### Stage 8 — AIV track

Source evidence exists for records 5, 6 and 8.

Required:

- valve/noise source contract;
- PWL evidence;
- low-noise trim semantics;
- pressure/flow input resolution;
- independent hand checks;
- qualification separate from FIT.

### Stage 9 — Valve-transient track

Source evidence exists for records 7, 8 and 12.

Required:

- transient mechanism taxonomy;
- valve/pump context;
- closure/opening force semantics;
- pressure-rise semantics;
- opening vs closing LOF;
- unknown/not-a-valve source handling;
- independent hand checks.

### Stage 10 — Thermowell and SBC tracks

Treat these as child-item mechanisms, not extra columns on the shared input row.

Thermowell:

- ASME PTC 19.3 TW source basis;
- geometry/material/process mapping;
- frequency and stress evidence;
- explicit pass/fail semantics independent of generic LOF.

SBC:

- fitting/location/length/valve attributes;
- mainline LOF dependency;
- geometry/location/modifier evidence;
- child-item identity and source trace.

### Stage 11 — Mechanisms with no retained populated example rows

Do not implement from empty headings.

Includes:

- reciprocating / PD pulsation;
- rotating-stall pulsation;
- corrugated-pipe pulsation;
- slug flow;
- cavitation / flashing.

Each requires an adopted method source plus independent qualification evidence before production calculation code.

### Stage 12 — Screening-authority review

Promotion is a separate engineering-governance event.

Minimum prerequisites:

- adopted project/EI basis for the intended screening scope;
- mechanism-specific independent validation;
- domain/boundary coverage;
- unit invariance;
- source trace and run snapshot;
- current-head release/browser validation;
- explicit vibration-engineer approval;
- explicit Owner authority transition;
- defined scope for mechanisms included/excluded.

No design authority is implied by screening promotion.

## 10. Coding rules for mechanism implementation

Every future mechanism change must obey:

1. One numerical path only.
2. UI never becomes solver authority.
3. No silent engineering defaults.
4. No blank-to-zero conversion.
5. `NOT_IMPLEMENTED` never becomes `NOT_APPLICABLE`.
6. Mechanism child items have stable IDs.
7. Source ambiguity fails closed.
8. Expected benchmark outputs are not generated from production code.
9. Independent evidence is required before qualification claims.
10. New abstractions must have a real production consumer in the same PR.
11. No universal vibration/risk/confidence score.
12. Authority changes require an explicit durable decision and focused validation.

## 11. Immediate PR442 implementation slice

This roadmap authorizes only the following architecture update in PR442:

- add a source-aligned mechanism catalogue;
- change the facility result presentation from FIT-only columns to a line-centric mechanism matrix;
- populate only the FIT assessment from existing register data;
- render non-FIT mechanisms as unevaluated/not implemented;
- label the current governing result as **Implemented governing** rather than full screening governing;
- add focused regression tests;
- keep the existing FIT input/edit/run path unchanged.

The current FIT benchmark loader, editable tables, topology provenance rules, central engineering execution path and benchmark authority remain unchanged.

## 12. Definition of done for the architecture stage

This stage is complete when:

- the UI no longer implies FIT is the whole vibration product;
- the facility register mirrors the retained EI mechanism structure;
- only FIT can display a current calculated mechanism value;
- non-FIT cells cannot imply zero, safe, pass or not-applicable;
- the governing result is explicitly limited to implemented mechanisms;
- the roadmap records source evidence and qualification gaps;
- focused tests pass;
- full release/browser validation remains explicitly PASS or NOT_RUN;
- FIT remains `BENCHMARK_ONLY` / `NOT_AUTHORIZED`.
