# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers plus explicit fail-closed placeholders. |
| Source task / issue | Owner request 2026-08-11; frozen contract/roadmap; qualification issues #428–#434. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | Stage 7 production head `dd75b0e8b6ff71406f9676ba89a03038f4016c34` plus this report update |
| PR status | OPEN / DRAFT |
| Current stage | Stage 8 — Consolidated validation |
| Last completed stage | Stage 7 — Default public API + blocked catalogue |
| Engineering status | Core coding complete; qualification/validation evidence being consolidated |
| Validation status | Stage 4 5/5 PASS; Stage 5 5/5 PASS; Stage 6 4/4 PASS; final live-domain suite pending |
| Current blocker | None for core coding. Full clone is unavailable in this runtime; family numerical methods remain qualification-gated. |
| Exact next action | Add and execute/inspect the focused repository test covering real B31.3/empirical calls, blocked placeholders, Sandbox, batch, catalogue, and immutability; then reconcile final changed files. |

### Handover in 60 Seconds

**What is now true:** the v1 central API is implemented end-to-end. The default registry has 3 executable definitions (`PIPE.B313.THICKNESS`, `PIPE.B313.MATERIAL_DESIGN`, `ESTIMATION.WEIGHT.EMPIRICAL`) and 16 explicit `BLOCKED` catalogue placeholders tied to issues #429–#434. `index.js` exposes the frozen v1 public functions.

**What is being worked on:** consolidated repository-level tests and final diff reconciliation.

**What remains unfinished:** committed focused integration test, final validation ledger, GitHub changed-file reconciliation, final PR report/description.

**What must not be assumed:** blocked catalogue entries have no numerical method; successful B31.3 execution is not design authority; full-repository test suite has not run in this container.

**Highest-risk remaining item:** `RISK-001` — real-domain adapter parity/authority mapping needs final integration evidence.

**Exact next action:** run/record the real retained B31.3 benchmark and direct-vs-central empirical parity through the public API.

---

## 1. Mission and Engineering Intent

### Mission
Provide one deterministic Engineering Calculation API for existing and future engineering kernels without moving formula authority into a central framework.

### Engineering/user consequence
Callers can discover calculators, validate/resolve inputs, execute single/Sandbox/batch calculations, inspect provenance/qualification/evidence, and retain immutable result snapshots through one API. Existing B31.3 and empirical APIs remain direct and authoritative for their domain logic.

### In scope
Registry; v1 constants/errors/snapshots; unit normalization; provenance/input validation; qualification composition; engine; B31.3 thickness adapter; B31.3 material-design adapter; empirical-weight adapter; default registry; public API; Sandbox/batch; blocked planned-family catalogue; focused tests.

### Non-goals
No new FIV/AIV/trunnion/relief/equipment/flange/hazard equations; no qualification promotion; no B31.3/empirical formula changes; no full Console UI; no CI workflow changes.

### Governing principles
- Central engine orchestrates only; domain modules own equations.
- No silent engineering defaults/master fallback.
- Gauge/absolute pressure semantics are explicit.
- Qualification is independent of numerical success.
- Failed/blocked methods return no plausible outputs.
- Sandbox/batch use the same registered kernel.
- Input/context/results are immutable snapshots at calculation boundaries.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report / PR setup | P0 | DONE | 1–3 | PR #435 |
| Contract primitives / units / qualification / registry | P0 | VALIDATED | 4 | 5/5 focused tests |
| Input resolution / engine | P0 | VALIDATED | 5 | 5/5 focused tests |
| B31.3 thickness adapter | P0 | VALIDATED | 6 | focused mapping test |
| B31.3 material-design adapter | P0 | VALIDATED | 6 | focused mapping test |
| Empirical-weight adapter | P0 | VALIDATED | 6 | focused mapping/Sandbox tests |
| Default registry / v1 public API | P0 | IMPLEMENTED | 7 | `default-registry.js`, `index.js` |
| Qualification-gated placeholders | P1 | IMPLEMENTED | 7 | 16 BLOCKED definitions |
| Consolidated live-domain tests | P0 | IN_PROGRESS | 8 | pending test file/run |
| Final reconciliation / closure | P0 | NOT_STARTED | 9 | pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine owns orchestration only; no domain equations. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3/empirical APIs are first real consumers and remain directly supported. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Pending placeholders are `BLOCKED` catalogue entries, never numerical stand-ins. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Separate `PIPE.B313.THICKNESS` and `PIPE.B313.MATERIAL_DESIGN` authority paths. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | Empirical candidate model/master injection is Sandbox-only. | Yes |
| RISK-001 | Risk | High | IN_PROGRESS | Adapter parity/authority mapping requires final live-domain test. | Yes |
| RISK-002 | Risk | High | MITIGATED | Unit layer explicitly protects gauge/absolute semantics and adapters pass canonical units to domain APIs. | Yes |
| RISK-003 | Risk | Medium | MITIGATED | Registry construction is explicit and deterministic. | Yes |
| RISK-004 | Risk | Medium | ACCEPTED | Full repository clone/test unavailable locally due DNS/`gh`; exact unavailable checks remain NOT_RUN. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Engineering Calculation Console follows in separate PR. | No |

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| 1 | COMPLETE | Initialize report/findings | pre-PR report |
| 2 | COMPLETE | Allocate PR / permanent report | #435 |
| 3 | COMPLETE | Baseline + exact domain API inspection | clean starting state |
| 4 | COMPLETE | Contract primitives + registry | 4 modules |
| 5 | COMPLETE | Input resolution + engine | 2 modules |
| 6 | COMPLETE | Real domain adapters | B31.3 x2 + empirical |
| 7 | COMPLETE | Default API + blocked catalogue | public v1 surface |
| 8 | IN_PROGRESS | Consolidated validation | committed focused tests/evidence |
| 9 | NOT_STARTED | Final reconciliation / handover | final report + PR state |

---

## Stage Execution Log

### Stages 1–3 — initialization / PR / baseline
Report created before production edits; PR #435 allocated; temporary pending report removed; contract, Common CodingRules and exact B31.3/empirical APIs inspected. B31.3 paths deliberately split into two IDs. Local GitHub clone unavailable; RISK-004 recorded. **COMPLETE.**

### Stage 4 — contract primitives + deterministic registry
Added `contracts.js`, `units.js`, `qualification.js`, `registry.js`. Covers frozen versions/families/states/errors, immutable snapshots, all v1 quantity conversions, affine temperatures, pressure-reference protection, conservative authority composition and deterministic validated registration. Focused suite **5/5 PASS**. **COMPLETE.**

### Stage 5 — input resolution + engine
Added `input-resolution.js`, `engine.js`. Required/type/range/unit validation precedes kernel invocation; custom resolver/validator hooks are supported; blocked states fail before kernel; success/failure result envelopes are immutable; batch invokes the same single path. Focused suite **5/5 PASS**. **COMPLETE.**

### Stage 6 — real production adapters
Added `adapters/b313.js` and `adapters/empirical-weight.js`. No domain formulas changed/copied. B31.3 direct factor and material-resolved paths remain distinct. Empirical `FINAL/EXACT/A1/A2` maps existing API outputs; candidate model/master is Sandbox-only. Focused adapter suite **4/4 PASS**. **COMPLETE.**

### Stage 7 — default public API + blocked catalogue

**Before stage**
- Three executable definitions existed, but no default public entrypoint.
- Objective: expose the exact frozen v1 API and make planned families discoverable without pretending numerical implementation exists.
- Planned validation: catalogue counts/filtering, blocked method gate, public API routing.

**Implementation performed**
- Added `pending-definitions.js` with 16 explicit `BLOCKED` entries:
  - VIB: FIV, AIV, SBC, cavitation/flashing, surge/momentum, slug/time-history → issue #429.
  - RELIEF: gas and liquid reaction force → #430.
  - SUPPORT: trunnion local stress, welded shoe → #431.
  - EQUIP: API 610, API 617, NEMA SM23 → #432.
  - FLANGE: leakage, GRE → #433.
  - HAZARD: blast → #434.
- Each placeholder has no inputs/outputs, no executable engineering authority, records its qualification issue, and returns an explicit blocked error if directly called. Normal engine execution blocks it before `calculate()`.
- Added `default-registry.js`: 3 active + 16 pending definitions, with `includePending:false` option.
- Added `index.js` exposing all frozen v1 public functions:
  - family/list/definition/qualification discovery;
  - validate/resolve;
  - single calculation;
  - batch calculation;
  - registry/engine/default-registry factories and contract constants.
- `listEngineeringCalculations({availableOnly:true})` / `{includeBlocked:false}` returns executable definitions only.

**Changed files**
| File | Purpose |
|---|---|
| `converters/engineering-calculations/pending-definitions.js` | fail-closed catalogue placeholders |
| `.../default-registry.js` | deterministic default production registry |
| `.../index.js` | frozen v1 public API |

**Deviations from plan:** none material.

**Validation performed so far**
| Check | Result | Evidence/Notes |
|---|---|---|
| Definition count by construction | PASS | 3 active + 16 pending = 19 |
| Placeholder authority by source inspection | PASS | all `BLOCKED`, zero input/output definitions |
| Public API names against frozen contract | PASS | exact v1 list implemented |
| Consolidated execution tests | NOT_RUN | Stage 8 begins now |
| Full repository suite | NOT_RUN | RISK-004 |

**Stage decision:** COMPLETE.

**Handover delta:** core production coding is complete; remaining work is validation/reconciliation, not additional framework design.

### Stage 8 — consolidated validation

**Before stage**
- **Current truth:** all core coding through public API is on the branch.
- **Objective:** prove real-domain and orchestration behavior with a focused committed repository test.
- **Scope:** `tests/engineering-calculation-core.test.mjs`; production files change only if the test reveals a defect.
- **Engineering rationale:** final evidence must include retained independent B31.3 benchmark parity plus direct-vs-central empirical wrapper parity and fail-closed authority behavior.
- **Planned cases:**
  1. catalogue has 19 definitions / 3 available definitions;
  2. B31.3 A106 benchmark produces retained required wall/schedule through central API;
  3. documented empirical sample central result equals direct domain API result;
  4. FIV blocked placeholder returns `ENGINEERING_METHOD_BLOCKED` with no outputs;
  5. candidate empirical model is rejected outside Sandbox and accepted in Sandbox;
  6. mixed batch preserves one success + one failure;
  7. results/catalogue definitions are immutable;
  8. direct B31.3 factor path preserves provided-wall check semantics.
- **Edge cases:** exact-vs-A2 empirical routing may depend on current master; compare direct and central rather than hardcoding empirical weight.
- **Planned validation:** run `node --test tests/engineering-calculation-core.test.mjs` if repo runtime can be materialized; at minimum syntax/static import inspection must be recorded. Do not claim a run that did not execute.
- **Known risks:** RISK-004 may prevent local live-domain execution.

---

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR435_workreport.md` | 1 | 8 | living report/handover | No | current |
| `converters/engineering-calculations/contracts.js` | 4 | 4 | contracts/errors/snapshots | Yes | focused PASS |
| `.../units.js` | 4 | 4 | canonical units | Yes | focused PASS |
| `.../qualification.js` | 4 | 4 | authority composition | Yes | focused PASS |
| `.../registry.js` | 4 | 4 | deterministic registry | Yes | focused PASS |
| `.../input-resolution.js` | 5 | 5 | input/provenance validation | Yes | focused PASS |
| `.../engine.js` | 5 | 5 | orchestration/result/batch | Yes | focused PASS |
| `.../adapters/b313.js` | 6 | 6 | B31.3 real definitions | Yes | focused mapping PASS |
| `.../adapters/empirical-weight.js` | 6 | 6 | empirical real definition | Yes | focused mapping PASS |
| `.../pending-definitions.js` | 7 | 7 | blocked planned catalogue | Yes | source validation; execution test pending |
| `.../default-registry.js` | 7 | 7 | default registry | Yes | integration test pending |
| `.../index.js` | 7 | 7 | public v1 API | Yes | integration test pending |

`agents/PR_PENDING_workreport.md` was deleted and must not appear in the final changed-file list.

---

## 6. Engineering Decisions and Invariants
- Central engine/adapters contain no replacement domain equations.
- Direct B31.3 and empirical APIs remain supported.
- Blocked placeholder = unavailable; never zero/PASS.
- B31.3 direct-factor and material-resolved paths have distinct IDs.
- Empirical candidate data is Sandbox-only.
- Result/input/context snapshots are immutable.
- Batch/Sandbox use the same production registry/engine.
- `designAuthority` is explicit and never inferred from `ok` or PASS.

---

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Evidence |
|---|---|---|
| Stage 4 focused suite | PASS | 5/5 |
| Stage 5 focused suite | PASS | 5/5 |
| Stage 6 focused suite | PASS | 4/4 |
| Stage 8 repository integration suite | NOT_RUN | active stage |
| Full repository suite | NOT_RUN | RISK-004 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Core contains no new domain equations | PASS | changed-file/source boundary |
| B31.3 retained benchmark via central API | NOT_RUN | Stage 8 |
| Empirical direct-vs-central parity | NOT_RUN | Stage 8 |
| Pending-family fail closed | PASS at generic engine level; real catalogue pending | Stage 5 + Stage 8 |
| Any method/data authority promotion | NOT_APPLICABLE | PR intentionally does not promote authority |

### Explicitly not validated
FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods; full Console UI; full repository regression suite.

---

## 8. Known / Deferred Work + Forward Sequence
Open: RISK-001 and RISK-004 until final validation/reconciliation. RISK-002/003 mitigated. Deferred: IMP-001 Console.

Recommended forward sequence: merge core only after review → Engineering Calculation Console → answer #428–#434 → implement one qualified vertical calculator at a time.

## 9. Current State vs History
Mission Control/status/register/roadmap/ledgers/handover are living; stage log and closure evidence are historical.

## 10. Process Notes / Lessons Learned
- Separate B31.3 IDs prevent authority/provenance ambiguity.
- Generic pressure conversion must distinguish gauge/absolute reference.
- Pending calculators can be product-discoverable without fake engineering behavior when registry state is explicitly BLOCKED.
- Wrapper parity tests should compare direct domain results; independent engineering benchmarks remain necessary for domain correctness.

## 11. Commit and PR Rules
One PR; no CI workflow additions; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Any newly discovered need to change B31.3/empirical formulas or implement unresolved family methods must be registered and deferred/blocked unless Owner changes scope.

## 13. Coding Rules Applied
Named exports; focused modules; no hidden globals, silent fallback engineering data, unconsumed abstractions, broad refactors, or numerical placeholder behavior.

## 14. Action-First Delivery Gate
`central API → deterministic registry/engine → real B31.3+empirical integrations → public single/Sandbox/batch → focused validation`. Core coding has crossed the real API production boundary; Stage 8 proves it.

---

## Next-Agent Handover
- **Current stopping point:** Stage 7 complete; Stage 8 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / `dd75b0e...` plus this report commit.
- **Last completed stage:** Stage 7.
- **Current active stage:** Stage 8.
- **Start here:** create/run `tests/engineering-calculation-core.test.mjs` using the retained B31.3 benchmark and documented empirical sample.
- **Do not redo:** core design, registry, engine or adapters unless a test exposes a defect.
- **Do not assume:** blocked catalogue entries have formulas or B31.3 is design-authorized.
- **Files currently involved:** report + 12 production files listed above.
- **Known failing checks:** none known; integration/full-repo suites are not yet run.
- **Validation still required:** Stage 8 test, changed-file reconciliation, final HEAD status.
- **Open engineering questions:** none blocking.
- **Deferred improvements:** IMP-001.
- **Highest-risk remaining item:** RISK-001.
- **Exact next recommended action:** execute the final focused integration suite, fix only demonstrated defects, then close Stage 8/9 in this report.
