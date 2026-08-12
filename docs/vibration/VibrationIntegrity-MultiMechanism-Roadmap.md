# Vibration Integrity — Line-Centric Multi-Mechanism Roadmap

Status: living architecture / qualification roadmap  
Current implemented numerical mechanism: **FIT — Flow-Induced Turbulence**  
Current FIT authority: **BENCHMARK_ONLY**  
Engineering authority: **NONE**  
Screening authority: **NOT_AUTHORIZED**  
Design authority: **false**

## 1. Product model

The vibration product is organized around a **line / operating-case assessment** with a shared engineering basis and independent mechanism assessments.

```text
Facility
  -> line / operating case
      -> source-controlled identity
      -> shared pipe / process basis
      -> shared derived context
      -> mechanism assessment item(s)
      -> mechanism result / evidence
  -> implemented governing result
  -> traceability / qualification evidence
```

FIT is one mechanism inside this model. FIT hydraulics/support/correlation logic must not become the universal top-level workflow for other vibration mechanisms.

## 2. Controlled source basis

Primary retained source:

- repository `reallaksh19/Common`
- commit `fb549185b9b27edc2379734240320a85c5bef9f6`
- `Energy-Institute-AVIFF---Worked-Examples.doc.docx`
- DOCX Git blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`
- retained transcription `docs/Energy-Institute-AVIFF---Worked-Examples.md`

Controlled FIT benchmark basis:

- `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`
- set `FIT-EI-WORKED-EXAMPLES-V1`
- retained workbook reference remains migration/reference evidence only
- numerical authority remains benchmark/reference only

The complete worked-example set is source/evidence. It is not permission to implement or qualify another mechanism without method reconciliation and independent validation.

## 3. EI mechanism coverage

| Mechanism | Retained populated example evidence | Current software state | Qualification implication |
|---|---|---|---|
| Flow-induced turbulence (FIT) | records 1–9, 12 | `IMPLEMENTED / BENCHMARK_ONLY` | continue controlled FIT qualification |
| Mechanical excitation | 3, 4, 5, 7 | `NOT_IMPLEMENTED` | adopted method + independent examples required |
| Reciprocating / PD pulsation | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Rotating-stall pulsation | none retained | `NOT_IMPLEMENTED` | no retained example qualification evidence |
| Deadleg pulsation | 4, 7, 8 | `NOT_IMPLEMENTED` | candidate separate qualification track |
| Corrugated-pipe pulsation | none retained | `NOT_IMPLEMENTED` | adopted basis required |
| Slug flow | none retained | `NOT_IMPLEMENTED` | specialist basis required |
| AIV / high-frequency acoustic excitation | 5, 6, 8 | `NOT_IMPLEMENTED` | candidate separate qualification track |
| Valve transients | 7, 8, 12 | `NOT_IMPLEMENTED` | candidate separate qualification track |
| Cavitation / flashing | none retained | `NOT_IMPLEMENTED` | adopted basis required |
| Thermowells | 3 | `NOT_IMPLEMENTED` | separate ASME PTC 19.3 TW qualification |
| Small-bore connections | 4 | `NOT_IMPLEMENTED` | candidate separate qualification track |

Blank EI cells are never automatically interpreted as `NOT_APPLICABLE`.

## 4. Canonical domain target

```text
FacilityVibrationAssessment
  sourceIdentity
  lines[]

LineAssessment
  lineAssessmentId
  line
  caseId
  canonicalId
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

Array cardinality is intentional because several mechanisms can contain zero, one or many child items per line.

## 5. Current working-state architecture

The authoritative editable state remains the three import/storage contracts:

```text
Topology Elements
Operating cases
Vibration enrichment
```

Stage 2 added `FitWorkingInputState.v1` behavior:

- stable source/local row IDs;
- original and working row values;
- cell/table revert;
- central unit conversion for known quantity pairs;
- topology authority downgrade latch;
- deterministic `FitRunSnapshot.v1` SHA-256 working/evidence snapshot;
- explicit `CURRENT_RESULT` / `STALE_RESULT` behavior.

Value equality after a topology revert does not restore complete-XLSX authority. Source reload is required.

## 6. Engineering-basis projection

Stage 3 adds `VibrationEngineeringBasisProjection.v1` as the primary joined line/case editor.

It is a **pure projection**, not a second data store.

Production-aligned join:

```text
Topology canonical ID
  -> topology line
  -> global FIT_ASSESSMENT_POINT=true
  -> all operating cases on topology line
```

Natural frequency:

```text
case-specific
  else global
  else missing
```

Primary view currently exposes:

**Identity — source controlled**
- Line
- Case
- Canonical ID

**Shared process basis — editable through backing pointers**
- phase
- mass flow
- density
- pressure / reference
- temperature
- dynamic viscosity
- velocity

**FIT basis · current mechanism — editable through enrichment backing pointers**
- OD
- WT
- ID
- maximum unsupported span
- natural frequency

Each projected field resolves to exact backing `kind + stable row ID + row/column` evidence. Source links navigate to the raw backing cell. Raw tables remain under **Source Data** for import, row add/delete and explicit source maintenance.

## 7. User experience target

Primary navigation target:

```text
Lines | Mechanisms | Source Data | Evidence
```

Current workspace progression:

```text
Source / working state
  -> Engineering basis
  -> FIT readiness / run
  -> facility mechanism matrix
  -> selected line/mechanism detail
  -> Source Data / evidence
```

Facility result matrix:

```text
Line | Case | Shared status |
FIT | Mechanical | Recip/PD | Rotating stall | Deadlegs | Corrugations |
Slug | AIV | Transients | Cav/Flash | Thermowells | SBC |
Implemented governing | Qualification | Review
```

Only FIT may currently display a calculated value. Non-FIT cells remain not implemented/unevaluated and cannot imply zero, safe, pass or N/A.

## 8. State dimensions

### Input authority

Examples:

- `COMPLETE_XLSX_UNTOUCHED`
- `LIMITED_ELEMENTS_ONLY`
- `UNVERIFIED_ELEMENTS_CSV`
- `LOCAL_EDITED_ELEMENTS`

### Mechanism implementation

- `NOT_IMPLEMENTED`
- `IMPLEMENTED_BENCHMARK_ONLY`
- future qualification-pending / authorized states only after explicit governance

### Applicability / readiness

- `NOT_EVALUATED`
- `APPLICABILITY_UNKNOWN`
- `NOT_APPLICABLE`
- `APPLICABLE_INCOMPLETE`
- `READY`
- `CALCULATED`
- `FAILED`
- `REVIEW_REQUIRED`

`NOT_IMPLEMENTED` is not an applicability result.

### Result currency

- `UNRUN`
- `READY`
- `RUNNING`
- `CURRENT_RESULT`
- `STALE_RESULT`
- `INVALID_INPUT`

Presentation-only filter/sort/tab changes do not stale engineering results.

## 9. Traceability target

```text
facility run
  -> line assessment
  -> mechanism assessment item
  -> mechanism result
  -> equation / correlation / rule ID
  -> normalized engineering input
  -> working input cell
  -> original input cell
  -> source record
  -> controlled source identity
```

Every mechanism must use this common evidence graph.

## 10. Roadmap stages

### Stage 0 — Authority freeze

Status: **ACTIVE / PERMANENT UNTIL EXPLICIT GOVERNANCE CHANGE**

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false
```

### Stage 1 — Shared line / mechanism presentation contract

Status: **IMPLEMENTED / FULL BROWSER GATE PENDING**

Delivered:

- source-aligned 12-mechanism catalogue;
- line-centric facility mechanism matrix;
- FIT-only output projection;
- non-FIT fail-closed behavior;
- `Implemented governing` limited to executed mechanisms.

### Stage 2 — Canonical original / working engineering state

Status: **IMPLEMENTED / FULL BROWSER GATE PENDING**

Delivered:

- stable row IDs;
- original/working values;
- exact revert;
- central unit-aware edits;
- source-authority latch;
- run snapshot/hash;
- stale/current result contract.

### Stage 3 — Shared engineering-basis projection

Status: **IMPLEMENTED / FULL BROWSER GATE PENDING**

Delivered:

- primary joined line/case editor;
- production-equivalent topology/assessment/case joins;
- exact backing-cell pointers;
- deterministic source navigation;
- raw Source Data retained as the single backing state;
- identity source-controlled/read-only until atomic identity edits are explicitly designed.

Permanent regression:

```text
tests/vibration-integrity-engineering-basis.test.mjs
```

### Stage 4 — FIT mechanism extraction

Status: **NEXT**

Goal: make FIT explicitly one mechanism module consuming the shared Engineering basis without rewriting or duplicating the numerical FIT kernel.

Deliver:

- FIT-specific detail/presentation boundary;
- Calculation tab/panel sourced only from backend result evidence;
- stable standard/advanced correlation IDs;
- backend-provided hydraulic intermediates;
- support/stiffness classification evidence;
- standard/refined/governing FIT result;
- equation IDs and qualification evidence;
- source-to-working-to-normalized trace.

Exit gate:

- all five controlled EI cases unchanged;
- independent hand benchmarks unchanged;
- no UI recomputation;
- calculation evidence is inspectable and reproducible.

### Stage 5 — Generic mechanism qualification framework

Generalize mechanism item identity, applicability/readiness, calculation/evidence envelope, benchmark comparison, source trace and snapshot semantics. FIT must be a production consumer in the same change; no speculative unused framework.

### Stage 6 — Mechanical excitation

Use retained records 3, 4, 5 and 7 only after adopted rules/equations, equipment-item cardinality, governing semantics, independent examples and unit invariance are controlled. Starts benchmark-only.

### Stage 7 — Deadleg pulsation

Use retained records 4, 7 and 8. Control branch geometry, standard/advanced paths, unavailable advanced results, branch-mainline trace, independent checks and boundaries.

### Stage 8 — AIV

Use retained records 5, 6 and 8. Control valve/noise source contract, PWL, low-noise trim, pressure/flow resolution and independent qualification separately from FIT.

### Stage 9 — Valve transients

Use retained records 7, 8 and 12. Control mechanism taxonomy, valve/pump context, closure/opening forces, pressure rise, opening/closing LOF and ambiguity handling.

### Stage 10 — Thermowell / SBC

Treat both as child-item mechanisms. Thermowell requires ASME PTC 19.3 TW qualification. SBC requires mainline dependency plus fitting/location/geometry evidence.

### Stage 11 — Mechanisms with no retained populated examples

Do not implement from empty headings:

- reciprocating / PD pulsation;
- rotating stall;
- corrugated-pipe pulsation;
- slug flow;
- cavitation / flashing.

Each needs an adopted method source plus independent qualification evidence.

### Stage 12 — Screening-authority review

Separate engineering-governance event requiring:

- adopted screening scope;
- mechanism-specific independent validation;
- boundary/domain coverage;
- unit invariance;
- source/run trace;
- exact-head release/browser validation;
- independent vibration-engineer approval;
- explicit Owner authority transition;
- explicit included/excluded mechanisms.

No design authority is implied by screening promotion.

## 11. Coding / authority rules

1. One numerical path only.
2. UI never becomes solver authority.
3. One authoritative editable state; projections do not duplicate it.
4. No silent engineering defaults.
5. No blank-to-zero conversion.
6. `NOT_IMPLEMENTED` never becomes `NOT_APPLICABLE`.
7. Source and mechanism child items have stable IDs.
8. Source ambiguity fails closed.
9. Expected benchmark outputs are independent of production code.
10. New abstractions require a real production consumer in the same PR.
11. No universal vibration/risk/confidence score.
12. Authority changes require explicit durable decision and focused validation.
13. Exact value revert does not restore lost topology source authority.
14. Stale results are evidence only; current export/parity require `CURRENT_RESULT`.
15. FIT-specific geometry remains identified as mechanism-specific until legitimately shared by another qualified mechanism.
16. Cross-table identity editing requires an explicit atomic contract; the joined view must not partially mutate identity.

## 12. Current release gate

Controlled command:

```bash
npm run verify:vibration-fit-release
```

After Stage 3, the manifest contains **34 controlled test files**.

Focused Stage-3 validation is PASS; full exact-head release execution and real-browser validation remain required before closure/merge.
