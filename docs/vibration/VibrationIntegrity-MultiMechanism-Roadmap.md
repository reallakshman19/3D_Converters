# Vibration Integrity — Line-Centric Multi-Mechanism Roadmap

Status: architecture / implementation / qualification roadmap  
Current implemented mechanism: **FIT — Flow-Induced Turbulence**  
Current FIT authority: **BENCHMARK_ONLY**  
Screening authority: **NOT_AUTHORIZED**  
Design authority: **false**

## 1. Product architecture

The vibration product is organized around a **line / operating-case assessment** with a shared engineering basis and independent mechanism assessments.

```text
Line / operating case
  -> shared identity
  -> pipe / material basis
  -> process / stream basis
  -> shared derived context
  -> mechanism applicability
  -> mechanism-specific assessment item(s)
  -> mechanism result(s)
  -> implemented governing result
  -> evidence / traceability
```

FIT-specific hydraulics, structural context and correlations belong inside the FIT mechanism. They are not the universal workflow for every vibration mechanism.

## 2. Controlled source basis

Full worked-example source:

```text
reallaksh19/Common
commit fb549185b9b27edc2379734240320a85c5bef9f6
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Retained transcription:

```text
docs/Energy-Institute-AVIFF---Worked-Examples.md
```

Controlled FIT benchmark basis:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
FIT-EI-WORKED-EXAMPLES-V1
```

The full example set is source/evidence context. It does not authorize a mechanism without method reconciliation and independent qualification.

## 3. EI example coverage matrix

| Mechanism | Source section | Populated retained examples | Software state | Qualification implication |
|---|---|---|---|---|
| Flow-induced turbulence (FIT) | EI AVIFF T2.2 | 1-9, 12 | `BENCHMARK_ONLY` | continue FIT qualification |
| Mechanical excitation | EI AVIFF T2.3 | 3, 4, 5, 7 | `NOT_IMPLEMENTED` | method extraction + independent evidence |
| Reciprocating / PD pulsation | EI AVIFF T2.4 | none | `NOT_IMPLEMENTED` | no retained worked-example evidence |
| Rotating-stall pulsation | EI AVIFF T2.5 | none | `NOT_IMPLEMENTED` | no retained worked-example evidence |
| Deadleg pulsation | EI deadleg section | 4, 7, 8 | `NOT_IMPLEMENTED` | candidate qualification track |
| Corrugated-pipe pulsation | EI Subsea E4.3 | none | `NOT_IMPLEMENTED` | no retained worked-example evidence |
| Slug flow | EI specialist section | none | `NOT_IMPLEMENTED` | specialist basis required |
| AIV / high-frequency acoustic excitation | EI AVIFF T2.7 | 5, 6, 8 | `NOT_IMPLEMENTED` | candidate qualification track |
| Valve transients | EI AVIFF T2.8 | 7, 8, 12 | `NOT_IMPLEMENTED` | candidate qualification track |
| Cavitation / flashing | EI AVIFF T2.9 | none | `NOT_IMPLEMENTED` | no retained worked-example evidence |
| Thermowells | ASME PTC 19.3 TW-2016 | 3 | `NOT_IMPLEMENTED` | separate standards qualification |
| Small-bore connections | EI AVIFF | 4 | `NOT_IMPLEMENTED` | candidate qualification track |

A blank EI line-listing mechanism field is **not automatically `NOT_APPLICABLE`**. Blank, not assessed, not implemented, unknown applicability and genuinely not applicable are separate software states.

## 4. Canonical domain target

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

Array cardinality is intentional: several EI mechanisms can contain zero, one or multiple child assessment items on one line.

## 5. Shared engineering basis

Shared line/case context includes only genuinely shared source data:

- line / record / case identity;
- P&ID and description;
- nominal bore / schedule / OD / WT / ID;
- material / cladding / rating;
- phase;
- mass flow;
- temperature;
- density;
- pressure and pressure reference;
- viscosity;
- speed of sound;
- gamma;
- molecular weight;
- source / revision / record identity.

Derived quantities are shared only when central engineering services produce them and their consumers are explicit.

Mechanism-owned examples:

- FIT: velocity, rho-v-squared, span/support category, FIT correlation and LOF;
- AIV: valve/noise/pressure inputs, PWL and AIV LOF;
- Deadleg: branch/throat/deadleg geometry and advanced paths;
- Valve transients: transient type, closure time, force/pressure response;
- Thermowell: thermowell geometry, frequency and stress checks;
- SBC: fitting/location/geometry modifiers and SBC result.

UI code never recomputes mechanism equations.

## 6. User experience target

Primary navigation target:

```text
Lines | Mechanisms | Source Data | Evidence
```

The default `Lines` register is line-centric:

```text
Line | Case | Shared status |
FIT | Mechanical | Recip/PD | Rotating stall | Deadlegs | Corrugations |
Slug | AIV | Transients | Cav/Flash | Thermowells | SBC |
Implemented governing | Qualification | Review
```

Current rules:

- FIT may show a benchmark result.
- Every non-FIT mechanism remains unevaluated / not implemented.
- Unimplemented cells never imply `0`, `PASS`, `SAFE` or `N/A`.
- `Implemented governing` governs only among mechanisms that actually executed.
- A full vibration-screening governing result remains unestablished.

Target line detail:

1. Identity
2. Shared pipe basis
3. Shared process basis
4. Shared derived context
5. Mechanism assessments
6. Qualification / evidence
7. Source trace
8. Diagnostics

A later `Mechanisms` view provides cross-facility registers per mechanism without creating a universal score.

## 7. State contracts

### 7.1 Input authority

Examples:

- `COMPLETE_XLSX_UNTOUCHED`
- `LIMITED_ELEMENTS_ONLY`
- `UNVERIFIED_ELEMENTS_CSV`
- `LOCAL_EDITED_ELEMENTS`

The first certified-topology mutation permanently downgrades complete-exchange authority for that loaded source. Reverting values does **not** restore certification; explicit reload is required.

### 7.2 Working engineering state

Current Stage-2 contract:

```text
FitWorkingInputState.v1
```

Each source row has a stable row ID. Each cell retains original and working values. Added rows receive stable local IDs. Deleted source rows remain recoverable in the working record model until full table revert.

Required edit semantics:

- value edit changes working value only;
- unit-only edit converts the paired numeric value through the central engineering unit layer when quantity semantics are known;
- unknown numeric-unit semantics fail closed rather than guessing;
- cell revert restores an engineering value/unit pair atomically when paired;
- table revert removes added rows, restores deleted rows and restores original engineering values;
- topology authority downgrade remains latched after revert.

### 7.3 Result currency

Per executable mechanism:

- `UNRUN`
- `READY`
- `RUNNING`
- `CURRENT_RESULT`
- `STALE_RESULT`
- `INVALID_INPUT`

Engineering input edits and execution-option changes make the prior result `STALE_RESULT`. The prior result stays inspectable but cannot be exported or claimed as current. Filter/sort/detail-tab presentation changes do not stale results.

### 7.4 Mechanism state

Implementation and applicability are separate dimensions.

Implementation examples:

- `NOT_IMPLEMENTED`
- `IMPLEMENTED_BENCHMARK_ONLY`
- future qualification/authorized states only after engineering governance.

Applicability/readiness examples:

- `NOT_EVALUATED`
- `APPLICABILITY_UNKNOWN`
- `NOT_APPLICABLE`
- `APPLICABLE_INCOMPLETE`
- `READY`
- `CALCULATED`
- `FAILED`
- `REVIEW_REQUIRED`

## 8. Reproducibility / traceability

Current run-snapshot contract:

```text
FitRunSnapshot.v1
  -> FitWorkingInputState.v1
  -> SHA-256 snapshotHash
  -> exact canonical working-table rows / stable row IDs
  -> source identity / authority state
  -> limited-exchange decision
  -> benchmark identity / modified state
```

The snapshot is captured immediately before FIT execution and displayed with the result. Future stages will separate engineering-input hashing from broader evidence/provenance hashing as normalized line/mechanism requests replace raw table execution contracts.

Target trace graph:

```text
facility run
  -> line assessment
  -> mechanism assessment item
  -> calculation result
  -> equation / correlation / rule ID
  -> normalized engineering input
  -> working input cell
  -> original input cell
  -> source record
  -> controlled source identity
```

## 9. Roadmap stages

### Stage 0 — Authority freeze

Status: **ACTIVE**

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false
```

### Stage 1 — Shared line / mechanism presentation contract

Status: **IMPLEMENTED / VALIDATION PARTIAL**

Delivered in PR442:

- source-aligned mechanism catalogue;
- line-centric facility mechanism matrix;
- FIT projected into FIT only;
- all other mechanisms fail closed;
- `Implemented governing` boundary;
- focused regression in release gate.

Remaining gate: full release/browser execution.

### Stage 2 — Canonical original / working engineering state

Status: **CURRENT PR442 STAGE — IMPLEMENTED / VALIDATION PARTIAL**

Delivered:

- stable source/local row IDs;
- original vs working cell state;
- immutable edits;
- cell and table revert;
- deleted-row recovery through table revert;
- central unit conversion for known value/unit pairs;
- fail-closed unknown numeric unit semantics;
- topology authority latch independent of value dirty state;
- `FitWorkingInputState.v1` / `FitRunSnapshot.v1`;
- deterministic SHA-256 run snapshot;
- explicit `CURRENT_RESULT` / `STALE_RESULT` / `INVALID_INPUT` UI behavior;
- stale results remain inspectable but cannot export or claim benchmark parity.

Exit gate still required:

- full current-head release gate;
- real browser editing/revert/unit-change exercise;
- exact snapshot correspondence to consumed execution data in browser.

### Stage 3 — Shared engineering-basis projection

Make the joined line/case projection the primary editor. Raw topology/operating/enrichment tables remain secondary `Source Data` views and continue as import/storage contracts.

Exit gate:

- one authoritative working state;
- no duplicate editable store;
- exact navigation from projected field to raw source row/cell.

### Stage 4 — FIT mechanism extraction

Refactor presentation boundaries so FIT is explicitly one mechanism module consuming shared basis. Do not rewrite or duplicate the numerical FIT kernel.

Expose backend-provided hydraulic intermediates, support/stiffness classification, correlation IDs, standard/refined/governing FIT result, equation IDs and qualification evidence.

### Stage 5 — Generic mechanism qualification framework

Before adding a second numerical mechanism, generalize mechanism item identity, applicability/readiness, calculation/evidence envelope, benchmark comparison, trace, run snapshot and stale/current semantics. FIT must be the real production consumer in the same change.

### Stage 6 — Mechanical excitation track

Use retained records 3, 4, 5 and 7 only after adopted equations/rules, item cardinality, governing semantics, independent examples and unit invariance are controlled. Authority starts benchmark-only.

### Stage 7 — Deadleg pulsation track

Use retained records 4, 7 and 8. Control branch geometry, standard/advanced paths, unavailable advanced results, branch-to-mainline identity, independent checks and boundary tests.

### Stage 8 — AIV track

Use retained records 5, 6 and 8. Control valve/noise source contract, PWL, low-noise trim, pressure/flow resolution, independent checks and qualification separately from FIT.

### Stage 9 — Valve-transient track

Use retained records 7, 8 and 12. Control taxonomy, valve/pump context, closure/opening force and pressure-rise semantics, opening/closing LOF and source ambiguity.

### Stage 10 — Thermowell and SBC tracks

Treat both as child-item mechanisms. Thermowell requires ASME PTC 19.3 TW method qualification; SBC requires mainline dependency plus fitting/location/geometry evidence.

### Stage 11 — Mechanisms with no retained populated examples

Do not implement from empty headings: reciprocating/PD, rotating stall, corrugated-pipe pulsation, slug flow, cavitation/flashing. Each requires adopted source plus independent qualification evidence.

### Stage 12 — Screening-authority review

Promotion is a separate engineering-governance event requiring adopted screening scope, mechanism-specific independent validation, boundary/domain coverage, unit invariance, source/run trace, exact-head release/browser validation, vibration-engineer approval and explicit Owner authority transition.

## 10. Coding / authority rules

1. One numerical path only.
2. UI never becomes solver authority.
3. No silent engineering defaults.
4. No blank-to-zero conversion.
5. `NOT_IMPLEMENTED` never becomes `NOT_APPLICABLE`.
6. Mechanism child items and working rows have stable IDs.
7. Source ambiguity fails closed.
8. Expected benchmark outputs are not generated from production code.
9. Independent evidence is required before qualification claims.
10. New abstractions require a real production consumer in the same PR.
11. No universal vibration/risk/confidence score.
12. Authority changes require explicit durable decision and focused validation.
13. Exact value revert does not silently restore source authority that was lost on edit.
14. Stale results remain evidence only; export/current parity require `CURRENT_RESULT`.

## 11. Next implementation stage

After Stage-2 executable/browser validation, proceed to **Stage 3 — shared engineering-basis projection**. Do not begin a second numerical mechanism before the shared projection and generic qualification contracts have production consumers.
