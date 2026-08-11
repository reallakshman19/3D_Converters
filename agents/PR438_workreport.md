# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish the controlled roadmap, source qualification, and production-consumed non-empirical FIT foundation under issue #429. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Pre-Stage-8 HEAD | `4b553318f77debb3467a0aa090d0875f63905ac5` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 8 — IN_PROGRESS: FIT preflight through the real Engineering Calculation API/Console |
| Last completed stage | Stage 7 — FIT physical input validation + hydraulic resolution |
| Engineering status | Source tooling and physical context IMPLEMENTED; empirical FIT method remains BLOCKED; Stage 8 integrates physical preflight into the real production path without changing screening authority. |
| Validation status | Stage 7 exact isolated Node regression PASS 6/6; Stage 8 validation pending. Stage 6 real-workbook extraction remains NOT_RUN. |
| Current blocker | Exact licensed FIT equations/tables/applicability/assessment remain unavailable to this runtime and independently unqualified. |
| Exact next action | Implement unit-aware FIT preflight as a real blocked-calculator Validate/Resolve capability; keep Calculate/Batch blocked and test end-to-end API + rendered Console state. |

### Handover in 60 Seconds

**What is now true:** `VIB.FIV.FLOW_TURBULENCE` is the stable public ID, visible as **Flow-Induced Turbulence (FIT) Screening**, and remains `BLOCKED` under issue #429. The retained FIT workbook is hash-pinned and an extractor exists. `converters/vibration/fit/physical-context.js` validates/derives only universal pipe hydraulics and is explicitly `PHYSICAL_CONTEXT_ONLY`.

**What is being worked on:** Stage 8 closes the CodingRules production-consumer gap. The blocked FIT definition will expose a bounded physical preflight contract through the existing centralized `validateEngineeringCalculationInput()` and `resolveEngineeringCalculationInputs()` APIs. The generic Console will permit Validate/Resolve for this explicit preflight while keeping Calculate and batch addition disabled.

**What remains unfinished:** real retained-workbook extraction; exact licensed-method reconciliation; `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*`; empirical kernel; independent qualification; production screening activation; table exchange/workspace.

**What must not be assumed:** valid physical preflight means the FIT method is applicable; derived velocity is a FIT result; workbook parity equals engineering authority; blocked calculation may be executed; screening/design authority exists.

**Highest-risk remaining item:** allowing preflight UX/API success to be misread as an authorized FIT screening result.

**Exact next action:** implement Stage 8, validate API unit invariance and UI button/authority behavior, reconcile changed files, then return to the licensed-method gate.

## Mission and Engineering Intent

The first FIT vertical must establish a trustworthy pattern for later AIV, FIP, SBC, cavitation/flashing, surge/momentum, and slug/time-history. The owner explicitly requested larger coherent batches rather than micro-batches. Stage 8 therefore delivers one complete operator-visible capability: physical FIT preflight through the existing Engineering Calculation API and Console.

### Stage 8 scope

- Add explicit FIT preflight input descriptors to the existing blocked definition.
- Use the platform unit resolver for length, mass-flow and density conversion.
- Consume `resolveFitPhysicalContext()` from the production definition for physical consistency and universal hydraulic derivations.
- Preserve calculator-specific preflight details in the generic resolution response.
- Allow the generic Console to show the FIT input form and enable **Validate** / **Resolve** for explicitly preflight-enabled blocked definitions.
- Keep **Calculate** disabled and existing central `calculateEngineering()` fail-closed behavior unchanged.
- Keep batch addition blocked because no numerical method is authorized.
- Add focused API and UI regressions in the same stage.

### Explicit non-goals

- No FIT LOF/correlation/threshold equation.
- No `FIT-APP-*` method applicability claim.
- No screening or design authority.
- No natural-frequency/damping/viscosity/pressure/temperature/support-stiffness default.
- No new calculator ID.
- No 3D/canvas.
- No workflow-file changes.
- No generic platform refactor beyond preserving calculator-specific preflight data returned by the existing validation hook.

## Engineering Invariants

1. Public calculation ID remains `VIB.FIV.FLOW_TURBULENCE`.
2. `calculateEngineering()` remains fail closed for FIT at `BLOCKED` state.
3. Validate/Resolve may expose non-authoritative physical preflight without upgrading method qualification.
4. Validation, physical resolution, applicability, empirical calculation, assessment, qualification, and authority remain separate.
5. No silent engineering defaults.
6. Natural frequency and damping are neither required nor supplied in Stage 8.
7. UI owns no equations or thresholds; it only renders definition/API state.
8. Vibration product remains table-first; no 3D viewer/canvas.
9. `FIT-PHYS-*` means universal preprocessing, not empirical `FIT-EQ-*` authority.
10. All physical unit normalization uses the existing central Engineering Calculation unit layer.
11. Batch/Sandbox calculation remains unavailable until the same future qualified kernel is activated centrally.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIV/FIT roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable FIT terminology / public ID | P0 | IMPLEMENTED | 4 | blocked catalogue + regression |
| Controlled FIT source register | P0 | IMPLEMENTED | 6 | `docs/vibration/FIT-source-register.md` |
| Workbook extraction CLI | P0 | IMPLEMENTED | 6 | `scripts/extract-fit-workbook-source.mjs` |
| Stage 6 real-workbook extraction | P0 | BLOCKED | 6 | binary inaccessible to local execution runtime |
| FIT physical validator/resolver | P0 | VALIDATED | 7 | exact isolated Node PASS 6/6 |
| FIT production preflight definition | P0 | IN_PROGRESS | 8 | planned blocked-definition integration |
| FIT unit-aware central Resolve | P0 | IN_PROGRESS | 8 | planned existing resolver consumption |
| FIT Console preflight UX | P0 | IN_PROGRESS | 8 | planned Validate/Resolve-only UI |
| Stage 8 API/UI regression | P0 | IN_PROGRESS | 8 | planned focused tests |
| FIT Engineering Method Specification | P0 | BLOCKED | Forward | requires exact source extraction + licensed review |
| Qualified empirical FIT kernel | P0 | BLOCKED | Forward | method spec + independent benchmarks required |
| Central screening activation | P0 | BLOCKED | Forward | explicit qualification/authority gate |
| Table exchange/workspace | P1 | DEFERRED | Forward | after qualified mechanism path |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve frozen public ID; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Table-only vibration product; no 3D/canvas. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API contract. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority remain separate. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | FIT stays blocked until exact method + independent qualification. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Hash-pin/extract retained workbook before empirical transcription. | Yes |
| DEC-007 | Decision | P0 | ACCEPTED | Universal physical preprocessing may precede empirical extraction only with explicit non-authority labeling. | Yes |
| DEC-008 | Decision | P0 | ACCEPTED | Stage 8 exposes physical preflight through existing Validate/Resolve APIs while leaving Calculate/Batch blocked. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false authority. | Mitigated: no empirical equations |
| RISK-005 | Risk | High | ACCEPTED | Different workbook filenames may be identical source content. | Mitigated by hash pin |
| RISK-006 | Risk | High | ACCEPTED | Preprocessing could be mistaken for method authority. | Mitigate with `PHYSICAL_CONTEXT_ONLY` + blocked state + UI warning |
| RISK-007 | Risk | High | IN_PROGRESS | Enabling blocked-calculator form actions could accidentally enable calculation/batch. | Stage 8 focused UI/API regression |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed FIT equations/tables/errata/native units/applicability. | External prerequisite |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. | Later |

## Stage Roadmap and Execution Log

### Stage 1 — research/report baseline — COMPLETE
Roadmap and architecture/product boundaries recorded.

### Stage 2 — PR allocation/report synchronization — COMPLETE
Draft PR #438 established under one-assignment/one-PR CodingRules.

### Stage 3 — pre-code scope verification — COMPLETE
Docs-only baseline reconciled. **PASS.**

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Stable public ID preserved; visible FIT terminology added; block preserved.

### Stage 5 — prior reconciliation — COMPLETE
Initial production-safe scope reconciled.

### Stage 6 — FIT workbook source extraction tooling — PARTIAL
Deterministic workbook inventory/hash tooling is implemented. Real retained-workbook extraction remains **NOT_RUN** in this runtime.

### Stage 7 — FIT physical input validation + hydraulic resolution — COMPLETE
Implemented `FIT-PHYS-001..004`, strict no-default validation and immutable `PHYSICAL_CONTEXT_ONLY` evidence. Exact isolated Node regression: **PASS 6/6**.

### Stage 8 — FIT production preflight vertical — IN_PROGRESS

**Current truth**

- Stage 7 physical code exists but is not yet consumed by the central Engineering Calculation definition/API/UI.
- Generic engine `validate()` and `resolve()` operate independently of calculation execution state.
- Generic Console currently disables input form, Validate and Resolve for every blocked definition.
- `calculate()` checks `BLOCKED` before resolution and therefore remains a strong fail-closed authority boundary.

**Objective**

Make FIT physical preflight usable through the real central API/Console without authorizing empirical screening.

**Expected scope/files**

- `agents/PR438_workreport.md`
- `converters/engineering-calculations/pending-definitions.js`
- `converters/engineering-calculations/input-resolution.js`
- `tabs/engineering-calculation-console-model.js`
- `tabs/engineering-calculation-console-sections.js`
- `tabs/engineering-calculation-console-view.js`
- `tests/engineering-calculation-core.test.mjs`
- `tests/engineering-calculation-console-fit-preflight.test.mjs`

**Planned implementation**

1. FIT blocked definition declares `outsideDiameter`, `wallThickness`, `massFlow`, `density`, optional `maximumUnsupportedSpan` with canonical SI quantities and no defaults.
2. Its existing validation hook maps canonical values into `resolveFitPhysicalContext()` and returns a `preflight` payload only when physical validation succeeds.
3. Generic input resolution preserves optional calculator-provided `preflight` evidence from the already-existing validation hook.
4. Console model recognizes explicit `ui.preflightEnabled` independently from executability.
5. Console renders the physical form and enables Validate/Resolve when preflight is enabled; Calculate remains tied only to executability.
6. Basis view exposes preflight authority and derived quantities.
7. Tests prove SI/US unit invariance, invalid geometry failure, visible preflight controls, disabled Calculate, and unchanged `ENGINEERING_METHOD_BLOCKED` execution.

**Expected behavior**

```text
FIT definition selected
  -> enter OD / wall / mass flow / density / optional span + units
  -> Validate: structural + physical validation only
  -> Resolve: canonical units + per-input provenance + FIT-PHYS derived context
  -> Calculate: disabled in UI and hard-blocked in API
  -> Batch add: still blocked
```

**Edge cases**

- missing required input;
- unsupported unit;
- wall >= radius;
- zero mass flow;
- optional span omitted;
- equivalent SI/US input;
- direct API caller attempts Calculate despite valid preflight;
- other blocked calculators must remain form-disabled unless explicitly opted into preflight.

**Planned validation**

- focused local Node test of Stage 8 API modules using a minimal exact module fixture;
- focused local Node test of pure Console rendering/model behavior;
- inspect committed patches;
- reconcile full PR changed-file list;
- existing full repository core regression remains required in a normal checkout if unavailable locally.

**Known risks**

- Preflight success could be misread as method applicability; UI text and returned authority must explicitly deny that inference.
- Generic input-resolution change must be additive only and must not change existing calculator execution semantics.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 8 | Living PR state/handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed roadmap | Yes | reconciled |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 8 | FIT blocked catalogue + Stage 8 preflight definition | Yes | Stage 8 pending |
| `tests/engineering-calculation-core.test.mjs` | 4 | 8 | central API/authority regression | No | Stage 8 pending |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | controlled source inventory | Yes | source facts PASS |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | deterministic workbook extraction | Yes | patch PASS; real workbook NOT_RUN |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | extractor/hash regression | No | runtime NOT_RUN |
| `package.json` | 6 | 6 | extractor command | No | patch PASS |
| `converters/vibration/fit/physical-context.js` | 7 | 8 | universal FIT physical validation/resolution consumed in Stage 8 | Yes | Stage 7 PASS; integration pending |
| `tests/vibration-fit-physical-context.test.mjs` | 7 | 7 | physical-context regression | No | PASS 6/6 |
| `converters/engineering-calculations/input-resolution.js` | 8 | 8 | preserve additive calculator preflight detail | Yes | pending |
| `tabs/engineering-calculation-console-model.js` | 8 | 8 | distinguish preflight ability from execution authority | No | pending |
| `tabs/engineering-calculation-console-sections.js` | 8 | 8 | render blocked FIT preflight form/basis | No | pending |
| `tabs/engineering-calculation-console-view.js` | 8 | 8 | Validate/Resolve enabled; Calculate remains disabled | No | pending |
| `tests/engineering-calculation-console-fit-preflight.test.mjs` | 8 | 8 | Console authority/visibility regression | No | pending |

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 7 physical-context Node regression | PASS | `22f007a...` content | 6/6 |
| Stage 6 real retained FIT extraction | NOT_RUN | n/a | binary inaccessible to execution runtime |
| Stage 8 central API regression | NOT_RUN | pending | stage not implemented |
| Stage 8 Console preflight regression | NOT_RUN | pending | stage not implemented |
| PR changed-file reconciliation | PASS | pre-Stage-8 | ten explained files before Stage 8 |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Retained FIT workbook identity | PASS | duplicate CRF paths share `d7d4c1...`, 493,650 bytes |
| Migrated JS numerical authority | REJECTED | explicit `PENDING_SOURCE_EXTRACTION`, zero placeholders |
| Universal geometry/hydraulic preprocessing | PASS | Stage 7 regression |
| Unit-aware central FIT preflight | NOT_RUN | Stage 8 pending |
| FIT empirical numerical correctness | NOT_RUN | empirical method not implemented |
| FIT applicability/assessment correctness | NOT_RUN | method specification unavailable |
| Screening/design authority | NOT_RUN | issue #429 open; calculator blocked |

### Explicitly Not Validated / Not Authorized

Any EI/AVIFF empirical equation, coefficient, lookup table, applicability criterion, LOF meaning, action threshold, workbook cached-value benchmark, screening authority, or design authority.

## Recommended Forward Sequence

1. Complete Stage 8 production preflight integration and focused validation.
2. In a normal checkout, run the workbook extractor against exact Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` plus full repository Stage 6/core tests.
3. Reconcile extracted formulas/cells/named ranges against the exact licensed governing method/project procedure.
4. Create `docs/vibration/FIT-Engineering-Method-Specification-v1.md` with reviewed `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*` references.
5. Define native-unit method execution, qualified master records, independent benchmarks, boundaries and tolerances.
6. Implement empirical `calculateFit()` and separate `assessFit()` from that specification.
7. Complete qualification dossier and explicitly approve bounded screening authority.
8. Activate the stable public calculator ID through the existing central engine, preserving the same production kernel for Console/Sandbox/batch.
9. Then implement table exchange/import and the table-first vibration workspace.

## Process Notes / Lessons Learned

- Module existence is not qualification; the legacy JS is explicitly a source-extraction placeholder.
- Source content hash, not filename, governs workbook identity.
- Universal physical relationships can precede empirical extraction only when isolated and denied screening authority.
- CodingRules require a real production consumer for new abstractions; Stage 8 therefore integrates the Stage 7 physical module into the existing central Validate/Resolve path instead of adding further unused scaffolding.

## Next-Agent Handover

- **Current stopping point:** Stage 8 opened before production changes.
- **PR / branch / pre-stage HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / `4b553318f77debb3467a0aa090d0875f63905ac5`.
- **Last completed stage:** Stage 7.
- **Current active stage:** Stage 8 — FIT production preflight vertical.
- **Start here:** `converters/engineering-calculations/pending-definitions.js`, then `input-resolution.js`, then Console model/sections/view, then focused API/UI tests.
- **Do not redo:** broad research, FIT/FIV naming, public API identity, table-only product decision, source register, extractor, or FIT-PHYS derivations.
- **Do not assume:** preflight is applicability, empirical FIT is implemented, or screening authority exists.
- **Known failing checks:** none known; Stage 6 runtime checks remain NOT_RUN.
- **Validation still required:** Stage 8 API/UI tests and final changed-file reconciliation; full repository tests in normal checkout where available.
- **Open QST-*:** QST-001; QST-002 deferred.
- **Important deferred IMP-*:** machine-oriented 3D EDIT table exchange after qualified FIT path.
- **Highest-risk remaining item:** accidental authority upgrade caused by preflight integration.
- **Exact next recommended action:** implement Stage 8 exactly as scoped and prove Calculate/Batch remain blocked.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, `converters/vibration/fit/physical-context.js`, `docs/APIEngineeringCalcContracts.md`, issue #429, Common CodingRules.
