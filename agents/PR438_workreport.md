# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish the controlled roadmap, source qualification, and production-consumed non-empirical FIT foundation under issue #429. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD | `33733a234ef6c9bfacbd5b18f3a91586f0d15bfc` before this report-only synchronization commit |
| Stage 8 implementation HEAD | `e993a7292547793dcb045ded416b770c3ab023dd` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 8 — COMPLETE: FIT physical preflight through central API/Console |
| Last completed stage | Stage 8 |
| Engineering status | FIT source tooling, universal physical context, and real Validate/Resolve preflight are IMPLEMENTED; empirical FIT method and screening authority remain BLOCKED. |
| Validation status | Stage 8 focused API/preflight fixture PASS 5/5; committed Console preflight regression PASS 5/5 in minimal branch-module fixture; syntax checks PASS; full repository regression and real workbook extraction remain NOT_RUN. |
| Current blocker | Exact licensed FIT equations/tables/applicability/assessment remain unextracted in this runtime and independently unqualified. |
| Exact next action | Obtain/run the exact pinned workbook extraction in a normal checkout, reconcile it to the licensed governing method, then write `FIT-Engineering-Method-Specification-v1.md` before empirical `calculateFit()` / `assessFit()`. |

### Handover in 60 Seconds

**What is now true:** `VIB.FIV.FLOW_TURBULENCE` remains the stable public ID and remains `BLOCKED` under issue #429. The existing Engineering Calculation Console/API can now perform a **physical preflight only** for FIT: required physical fields are unit-normalized by the central unit layer, universal geometry/hydraulic quantities are derived by `converters/vibration/fit/physical-context.js`, and the Basis view shows those results with `PHYSICAL_CONTEXT_ONLY` authority.

**Production behavior:** FIT accepts `outsideDiameter`, `wallThickness`, `massFlow`, `density`, and optional `maximumUnsupportedSpan` for Validate/Resolve. There are no engineering defaults. Validate/Resolve work for this explicit preflight; Calculate remains disabled in the Console and hard-blocked in the engine; Add-current-to-batch is disabled for FIT. Other blocked calculators remain fully blocked and did not inherit preflight behavior.

**What remains unfinished:** exact retained-workbook extraction; licensed-source reconciliation; `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*`; empirical FIT kernel; independent benchmark/qualification dossier; bounded screening activation; table exchange and table-first vibration workspace.

**What must not be assumed:** preflight success means the FIT method is applicable; mean velocity is a FIT screening result; workbook parity equals method authority; issue #429 is closed; any pass/fail or LOF exists.

**Highest-risk remaining item:** coding or activating empirical FIT behavior before exact method/native-unit/table/applicability authority is controlled.

**Exact next action:** execute `extract:fit-source` against Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` in a normal checkout and use the extracted evidence plus licensed source to create the controlled method specification.

## Mission and Engineering Intent

The first FIT vertical defines the permanent engineering/API pattern for later AIV, FIP, SBC, cavitation/flashing, surge/momentum and slug/time-history work. The product remains table-first; no 3D viewer or canvas is part of the vibration application.

Stage 8 was intentionally delivered as one coherent operator-visible batch rather than additional unused scaffolding. It closes the Stage 7 production-consumer gap while preserving the qualification gate.

### Governing principles

1. Share infrastructure and identical physical data; never share empirical authority by default.
2. Validation, physical resolution, applicability, empirical calculation, assessment, qualification and authority remain separate.
3. No silent engineering defaults or fallback masters.
4. Central units own generic unit normalization; empirical native units remain method-specific future scope.
5. FIT preflight is explicitly non-authoritative for applicability/screening.
6. `calculateEngineering()` remains the future single production execution path; no UI formula implementation.
7. No screening or design authority until independently qualified.

### Explicit non-goals respected

- no FIT LOF/correlation/threshold equation;
- no `FIT-APP-*` method-applicability rule;
- no natural-frequency or damping default;
- no pressure/temperature/viscosity/support-stiffness assumption;
- no new calculator ID;
- no AIV/FIP/SBC numerical behavior;
- no 3D/canvas;
- no workflow-file changes.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIV/FIT roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable FIT terminology / public ID | P0 | DONE | 4 | blocked catalogue + regression |
| Controlled FIT source register | P0 | DONE | 6 | `docs/vibration/FIT-source-register.md` |
| Workbook extraction CLI | P0 | IMPLEMENTED | 6 | `scripts/extract-fit-workbook-source.mjs` |
| Real retained-workbook extraction | P0 | BLOCKED | 6 | exact private binary inaccessible to local execution runtime |
| FIT physical validator/resolver | P0 | VALIDATED | 7 | Stage 7 Node regression PASS 6/6 |
| FIT central preflight definition | P0 | VALIDATED | 8 | real blocked definition consumes Stage 7 module |
| FIT unit-aware Validate/Resolve | P0 | VALIDATED | 8 | focused Stage 8 API fixture PASS 5/5 |
| FIT Console preflight UX | P0 | VALIDATED | 8 | committed Console regression PASS 5/5 in minimal fixture |
| FIT Calculate/Batch authority protection | P0 | VALIDATED | 8 | blocked calculate + disabled current-batch controls |
| FIT Engineering Method Specification | P0 | BLOCKED | Forward | requires extraction + licensed source review |
| Qualified empirical FIT kernel | P0 | BLOCKED | Forward | controlled method spec + independent benchmarks required |
| Central screening activation | P0 | BLOCKED | Forward | explicit qualification/authority decision required |
| Table exchange/workspace | P1 | DEFERRED | Forward | after qualified FIT execution path |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Vibration product is table-first; no 3D/canvas. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API/engine authority. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority stay separate. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | FIT stays blocked until exact method + independent qualification. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Hash-pin/extract retained workbook before empirical transcription. | Yes |
| DEC-007 | Decision | P0 | ACCEPTED | Universal physical preprocessing may precede empirical extraction only with explicit non-authority labeling. | Yes |
| DEC-008 | Decision | P0 | ACCEPTED | Blocked FIT may expose Validate/Resolve physical preflight while Calculate/Batch remain non-authorized. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false authority. | Mitigated by continued block |
| RISK-005 | Risk | High | ACCEPTED | Different workbook filenames may be identical source content. | Hash-pinned source register |
| RISK-006 | Risk | High | DONE | Preprocessing could be mistaken for method authority. | Explicit `PHYSICAL_CONTEXT_ONLY`, NOT_EVALUATED applicability, UI warnings |
| RISK-007 | Risk | High | DONE | Preflight controls could accidentally enable calculation/batch. | Calculate + add-current-batch remain disabled; focused regression PASS |
| ISS-008 | Defect | High | DONE | Stage 8 full-file Console-model rewrite transiently omitted a closing brace in `parseEngineeringBatchEditor()`. | Found by source review; fixed in `e993a729...`; syntax checks PASS |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed FIT equations/tables/errata/native units/applicability. | External prerequisite remains |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. | Later cross-repo stage |

## Stage Roadmap and Execution Log

### Stage 1 — research/report baseline — COMPLETE
Roadmap and product/authority boundaries recorded.

### Stage 2 — PR allocation/report synchronization — COMPLETE
Draft PR #438 established under one-assignment/one-PR CodingRules.

### Stage 3 — pre-code scope verification — COMPLETE
Docs-only baseline reconciled. **PASS.**

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Visible name moved to Flow-Induced Turbulence (FIT); stable ID and blocked/no-output behavior retained.

### Stage 5 — initial reconciliation — COMPLETE
Initial production-safe scope reconciled.

### Stage 6 — FIT workbook source extraction tooling — PARTIAL
Deterministic XLSM/XLSX inventory/hash tooling, source register and tests implemented. Exact retained-workbook execution remains **NOT_RUN** because the binary is unavailable to this runtime.

### Stage 7 — FIT physical input validation + hydraulic resolution — COMPLETE
`FIT-PHYS-001..004` implemented with strict no-default physical validation and immutable `PHYSICAL_CONTEXT_ONLY` evidence. Focused Node regression: **PASS 6/6**.

### Stage 8 — FIT production preflight through central API/Console — COMPLETE

#### Current production capability

The real blocked FIT definition now declares these preflight fields:

| Field | Required | Quantity | Canonical unit | Default |
|---|---|---|---|---|
| `outsideDiameter` | yes | length | m | none |
| `wallThickness` | yes | length | m | none |
| `massFlow` | yes | mass_flow | kg/s | none |
| `density` | yes | density | kg/m3 | none |
| `maximumUnsupportedSpan` | no | length | m | none |

The existing generic input resolver performs unit normalization and per-value provenance. FIT then calls `resolveFitPhysicalContext()` on canonical values.

Successful resolution returns additive non-authoritative detail:

```text
preflight.status    = PHYSICAL_PREFLIGHT_ONLY
preflight.authority = PHYSICAL_CONTEXT_ONLY
applicability       = NOT_EVALUATED
```

Derived quantities remain:

```text
FIT-PHYS-001  inside diameter
FIT-PHYS-002  internal flow area
FIT-PHYS-003  volumetric flow
FIT-PHYS-004  mean velocity
```

No LOF, pass/fail, method applicability, screening result or design conclusion is returned.

#### Console behavior

- FIT form is visible although the method remains BLOCKED.
- Validate: enabled.
- Resolve: enabled.
- Calculate: disabled.
- Basis: displays resolved input JSON plus a dedicated Physical preflight table and non-authority statement.
- Batch / Add current request: disabled for FIT.
- Batch / Run Batch: remains available so manually entered requests for other authorized calculators are not disabled globally.
- AIV and every other blocked non-preflight definition retain original fully blocked form behavior.

#### Generic platform change

`input-resolution.js` only adds preservation of optional calculator-provided `preflight` detail from the already-existing `validateInput` hook. No execution-state logic, unit factors, registry logic, result envelope, qualification state or batch calculation behavior changed.

#### Unexpected finding and correction

During source review, `tabs/engineering-calculation-console-model.js` was found with a transient missing closing brace in the `parseEngineeringBatchEditor()` error return after the Stage 8 rewrite. This was recorded as **ISS-008**, corrected before closure, and the copied branch module then passed `node --check`.

#### Validation performed

**Source/patch inspection — PASS**

Inspected the committed patches for:

- `pending-definitions.js` — FIT-only preflight override; stable block retained;
- `input-resolution.js` — two additive `preflight` lines only;
- Console model — two pure capability predicates; original batch parser restored;
- Console sections/view — preflight rendering and authority-bound controls;
- focused API and UI regressions.

**Compatibility search — PASS**

Repository code search found no additional direct `renderBatch()` caller beyond `engineering-calculation-console-view.js`, so passing `definition` into `renderBatch()` is bounded to the Console rendering module.

**Syntax validation — PASS**

A minimal local fixture built from the current branch modules passed `node --check` for:

```text
contracts.js
qualification.js
units.js
physical-context.js
input-resolution.js
pending-definitions.js
engineering-calculation-console-model.js
engineering-calculation-console-sections.js
engineering-calculation-console-view.js
```

**Focused API/preflight execution — PASS**

Command:

```text
cd /mnt/data/fitstage8
node --test tests/stage8-preflight.test.mjs
```

Result:

```text
tests 5
pass 5
fail 0
```

Covered:

1. FIT preflight enabled while direct definition calculation remains `ENGINEERING_METHOD_BLOCKED`;
2. central input validation/resolution produces `PHYSICAL_CONTEXT_ONLY` detail;
3. SI / US-customary equivalent input produces equivalent mean velocity;
4. impossible pipe geometry fails before method applicability;
5. Console enables Validate/Resolve only, displays non-authority basis, disables Calculate and Add-current-to-batch, and leaves AIV fully blocked.

**Committed Console regression execution — PASS in minimal branch-module fixture**

Command:

```text
cd /mnt/data/fitstage8
node --test tests/engineering-calculation-console-fit-preflight.test.mjs
```

Result:

```text
tests 5
pass 5
fail 0
```

The test content corresponds to the committed Stage 8 Console regression and exercises the current branch pending definition/model/view behavior in the minimal fixture.

**Not run**

- full-repository `node --test tests/engineering-calculation-core.test.mjs` — no full repository checkout/dependency tree in this execution environment;
- full-repository committed Console test from the actual checkout — minimal branch-module fixture used instead;
- Stage 6 extractor test against installed full repository dependencies;
- extraction of the exact retained private FIT workbook.

**Stage decision: COMPLETE.** Stage 8 production capability and focused validation are complete with the full-checkout limitations explicitly retained. Empirical FIT work remains blocked.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 8 | Living PR state/handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed API-first/table-first roadmap | Yes | reconciled |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | Controlled FIT source identity | Yes | source facts PASS |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | Deterministic workbook source extraction | Yes | patch PASS; real workbook NOT_RUN |
| `package.json` | 6 | 6 | `extract:fit-source` command | No | patch PASS |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | Extractor/hash regression | No | full-checkout runtime NOT_RUN |
| `converters/vibration/fit/physical-context.js` | 7 | 8 | Universal FIT physical validation/derivation; Stage 8 production-consumed | Yes | Stage 7 PASS + Stage 8 fixture PASS |
| `tests/vibration-fit-physical-context.test.mjs` | 7 | 7 | Physical-context regression | No | PASS 6/6 |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 8 | FIT terminology, blocked authority, and physical preflight definition | Yes | patch + Stage 8 fixture PASS |
| `converters/engineering-calculations/input-resolution.js` | 8 | 8 | Preserve additive calculator preflight detail | Yes | minimal fixture PASS |
| `tabs/engineering-calculation-console-model.js` | 8 | 8 | Separate preflight resolvability from execution | No | syntax + UI test PASS; ISS-008 fixed |
| `tabs/engineering-calculation-console-sections.js` | 8 | 8 | Preflight form/basis and batch authority rendering | No | UI test PASS |
| `tabs/engineering-calculation-console-view.js` | 8 | 8 | Enable Validate/Resolve while Calculate stays disabled | No | UI test + compatibility search PASS |
| `tests/engineering-calculation-core.test.mjs` | 4 | 8 | Stable ID/block + FIT central preflight/unit invariance regression | No | patch PASS; full repository runtime NOT_RUN |
| `tests/engineering-calculation-console-fit-preflight.test.mjs` | 8 | 8 | Console preflight/authority regression | No | minimal fixture PASS 5/5 |

Full PR changed-file reconciliation after Stage 8: **15 paths, all present in this ledger; no unexplained file.**

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD / scope | Evidence |
|---|---|---|---|
| Stage 7 physical-context regression | PASS | Stage 7 content | 6/6 |
| Stage 8 production patch inspection | PASS | through `e993a729...` | bounded additive changes |
| Stage 8 module syntax checks | PASS | minimal current-branch fixture | 9 modules checked |
| Stage 8 API/preflight focused test | PASS | minimal current-branch fixture | 5/5 |
| Stage 8 committed Console regression | PASS | minimal current-branch fixture | 5/5 |
| `renderBatch()` caller compatibility search | PASS | repository search | only Console view caller found |
| Full PR changed-file reconciliation | PASS | 15 paths | all explained |
| Full repository core Node regression | NOT_RUN | n/a | full checkout unavailable |
| Stage 6 extractor Node regression | NOT_RUN | n/a | full dependency checkout unavailable |
| Exact retained workbook extraction | NOT_RUN | n/a | binary inaccessible to local runtime |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Retained FIT workbook identity | PASS | duplicate CRF paths share `d7d4c1...`, 493,650 bytes |
| Migrated JS numerical authority | REJECTED | explicit `PENDING_SOURCE_EXTRACTION`, zero placeholders |
| Universal geometry/hydraulic preprocessing | PASS | Stage 7 + Stage 8 focused tests |
| Central unit normalization for FIT preflight | PASS | mm→m, kg/h→kg/s, SI/US equivalence |
| Invalid physical geometry fail-closed | PASS | wall leaves no positive ID → `INPUT_INVALID` |
| FIT method applicability | NOT_RUN | explicitly `NOT_EVALUATED` |
| FIT empirical numerical correctness | NOT_RUN | empirical method not implemented |
| FIT LOF/assessment thresholds | NOT_RUN | method specification unavailable |
| Screening/design authority | NOT_RUN | issue #429 remains open; method remains BLOCKED |

### Explicitly Not Validated / Not Authorized

Any EI/AVIFF empirical equation, coefficient, lookup table, applicability criterion, LOF semantics, action threshold, workbook cached-value benchmark, screening authority, or design authority.

## Known / Deferred Work and Recommended Forward Sequence

1. **Execute exact source extraction.** Use `npm run extract:fit-source -- /path/to/FIT.xlsm --expected-git-blob d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e --out /tmp/FIT-source-inventory.json` in a normal checkout. This is the prerequisite to close QST-001 without guessing workbook behavior.
2. **Run full repository regressions.** Execute the committed extractor, physical-context, central-core, and Console preflight tests in the actual checkout. This closes the current validation-environment limitation before readiness.
3. **Create `docs/vibration/FIT-Engineering-Method-Specification-v1.md`.** Reconcile workbook evidence to the exact licensed governing method/project procedure; assign reviewed `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*` references.
4. **Qualify method/native units/masters.** Establish exact correlation-native units, empirical tables/constants, independent reference cases, boundary tolerances, unit-equivalence benchmarks and no-fallback master behavior.
5. **Implement the empirical domain vertical as one coherent batch.** `evaluateFitApplicability()` → `calculateFit()` → `assessFit()` using Stage 7/8 physical resolution only where definitions match the controlled specification.
6. **Independent qualification dossier.** Reference calculations, boundaries, unit invariance, determinism, missing-master failures and independent vibration-engineering review.
7. **Activate the stable public ID only after explicit authority approval.** Console/Sandbox/batch then use the same registered production kernel.
8. **Then build the table import/workspace.** Certified upstream table exchange, process-case join, line/facility screening, Result → Why → Evidence.
9. **Then add AIV → FIP → SBC → cavitation/flashing → surge → slug**, each with its own method/authority gate.

## Process Notes / Lessons Learned

- A blocked calculator can expose useful physical preflight without weakening calculation authority when preflight and execution are modeled separately.
- New domain helpers need a real production consumer; Stage 8 intentionally consumed Stage 7 through the existing central API/Console rather than adding more speculative modules.
- UI enablement must follow separate capability predicates: resolvable does not mean executable.
- A full-file rewrite can introduce unrelated syntax damage; immediate source inspection caught ISS-008 before validation/closure.
- Source content hash, not filename, governs retained workbook identity.

## Next-Agent Handover

- **Current stopping point:** Stage 8 complete; real FIT physical preflight is available through central Validate/Resolve, while empirical execution remains blocked.
- **PR / branch / report-closure HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / `33733a234ef6c9bfacbd5b18f3a91586f0d15bfc` before this synchronization commit.
- **Stage 8 implementation HEAD:** `e993a7292547793dcb045ded416b770c3ab023dd`.
- **Last completed stage:** Stage 8.
- **Current active stage:** none; external method/source gate is next.
- **Start here:** obtain the exact pinned `d7d4c1...` workbook in a normal checkout and run `extract:fit-source`; then write the method specification from extracted evidence + licensed source.
- **Do not redo:** broad research, FIT/FIV naming, public API identity, no-3D/no-canvas decision, source register/extractor, FIT-PHYS derivations, or preflight Console integration.
- **Do not assume:** preflight is applicability, mean velocity is FIT screening, empirical method exists, full repository tests passed, or screening authority exists.
- **Files currently involved:** the 15 ledger paths above.
- **Known failing checks:** none known; full-checkout checks are NOT_RUN rather than PASS.
- **Validation still required:** exact retained-workbook extraction plus full repository Node regressions.
- **Open QST-*:** QST-001; QST-002 deferred.
- **Important deferred IMP-*:** machine-oriented certified 3D EDIT table exchange after qualified FIT path.
- **Highest-risk remaining item:** unqualified empirical method implementation/activation.
- **Exact next recommended action:** close QST-001 with exact source extraction and method specification; do not code LOF/thresholds before that evidence exists.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, `converters/vibration/fit/physical-context.js`, `converters/engineering-calculations/pending-definitions.js`, `docs/APIEngineeringCalcContracts.md`, issue #429, Common CodingRules.
