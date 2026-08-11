# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed pending-family placeholders only where useful. |
| Source task / issue | Owner request 2026-08-11; frozen contract/roadmap; qualification issues #428–#434. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | Stage 5 production head `57e973b9b7a1a3a4c19d93345e9380db6416d362` plus this report update |
| PR status | OPEN / DRAFT |
| Current stage | Stage 6 — Real production adapters |
| Last completed stage | Stage 5 — Central engine |
| Engineering status | Registry + engine implemented; real domain adapters pending |
| Validation status | Stage 4: 5/5 PASS; Stage 5: 5/5 PASS; full repo NOT_RUN |
| Current blocker | None for B31.3/empirical adapters; family methods #428–#434 remain blocked by qualification. |
| Exact next action | Add two B31.3 definitions and empirical-weight definition using existing domain APIs; validate output/failure mapping and authority without changing formulas. |

### Handover in 60 Seconds

**Now true:** v1 common primitives, input resolution, deterministic registry, engine, immutable result envelopes and batch path exist on #435. Invalid/blocked requests fail before kernel invocation.

**Working on:** real adapters for `PIPE.B313.THICKNESS`, `PIPE.B313.MATERIAL_DESIGN`, and `ESTIMATION.WEIGHT.EMPIRICAL`.

**Unfinished:** adapters, default registry/public exports, pending-family catalogue, final focused integration tests/reconciliation.

**Do not assume:** central success implies design authority; current B31.3 method still requires engineering code-text review and empirical weight remains empirical/benchmark-qualified.

**Highest risk:** `RISK-001` — adapter mapping could alter or overstate domain results.

**Next action:** implement thin adapters that mechanically map current domain outputs and retain raw domain evidence.

---

## 1. Mission and Engineering Intent

Central platform owns orchestration only. Domain modules keep formula authority. Existing B31.3 and empirical APIs remain directly callable and become the first real central consumers. Failed calculations expose no plausible authoritative outputs; Sandbox/batch reuse the same definition/kernel; result authority is explicit and conservative.

**In scope:** registry, units, qualification, input resolution, engine, B31.3 x2, empirical adapter, default registry/API, batch/Sandbox, explicit blocked catalogue, focused tests.  
**Out of scope:** new vibration/support/relief/equipment/flange/hazard formulas, authority promotion, Console UI, CI workflows.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Report / PR setup | P0 | DONE | 1–3 | #435 |
| Contract primitives / registry | P0 | VALIDATED | 4 | 5/5 focused tests |
| Input resolution / engine | P0 | VALIDATED | 5 | 5/5 focused tests |
| B31.3 thickness adapter | P0 | IN_PROGRESS | 6 | Pending |
| B31.3 material-design adapter | P0 | IN_PROGRESS | 6 | Pending |
| Empirical-weight adapter | P0 | IN_PROGRESS | 6 | Pending |
| Default API / Sandbox / batch | P0 | NOT_STARTED | 7 | Pending |
| Blocked family catalogue | P1 | NOT_STARTED | 7 | Conditional but planned |
| Integration/parity tests | P0 | NOT_STARTED | 8 | Pending |
| Final reconciliation | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Engine owns orchestration only; no domain equations. |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3/empirical APIs are first real consumers. |
| DEC-003 | Decision | P0 | ACCEPTED | Pending placeholders are unavailable failures, never numerical stand-ins. |
| DEC-004 | Decision | P0 | ACCEPTED | Separate B31.3 thickness and material-design IDs. |
| RISK-001 | Risk | High | OPEN | Adapter/engine could reinterpret outputs/authority; parity tests required. |
| RISK-002 | Risk | High | OPEN | Unit semantics, especially gauge/absolute and empirical native units. |
| RISK-003 | Risk | Medium | MITIGATED | Explicit deterministic registry implemented. |
| RISK-004 | Risk | Medium | OPEN | Full repo clone/test unavailable in container; do not claim it. |
| IMP-001 | Improvement | P1 | DEFERRED | Full Engineering Calculation Console. |

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Output |
|---|---|---|---|
| 1 | COMPLETE | Initialize report | living report |
| 2 | COMPLETE | Allocate PR | #435 |
| 3 | COMPLETE | Verify baseline/APIs | clean report baseline + exact domain inspection |
| 4 | COMPLETE | Common primitives/registry | 4 core modules |
| 5 | COMPLETE | Input resolution/engine | 2 engine modules |
| 6 | IN_PROGRESS | Real adapters | B31.3 x2 + empirical |
| 7 | NOT_STARTED | Default API + blocked catalogue | v1 public surface |
| 8 | NOT_STARTED | Focused integration validation | parity/failure/batch/Sandbox tests |
| 9 | NOT_STARTED | Final reconciliation | final report/diff |

---

## Stage Execution Log

### Stages 1–3
Report created before production code; PR #435 allocated; pending report removed; exact B31.3/empirical APIs/test patterns inspected; B31.3 paths split by DEC-004. Local GitHub clone unavailable due DNS/`gh`; full repo remains NOT_RUN. **COMPLETE.**

### Stage 4 — Contract primitives + registry
Added `contracts.js`, `units.js`, `qualification.js`, `registry.js`. Registration validates IDs/families/fields/units/duplicates and stores immutable definitions. Unit conversion covers frozen v1 quantities, affine temperature and gauge/absolute protection. Effective qualification is limited by weaker method/data authority. `node --check` PASS; focused suite 5/5 PASS. **COMPLETE.**

### Stage 5 — Central engine

**Before:** common primitives validated; objective was lookup → resolve → canonical units → validate → method gate → kernel → immutable envelope, with batch reuse and no formulas.

**Implementation performed:**
- Added `input-resolution.js` for declared fields, canonical units, ranges, provenance, engineering-default marking and custom resolver/validator hooks.
- Added `engine.js` for contract/version lookup, non-executable method gating, kernel invocation, failure/success envelope assembly, evidence suppression option, immutable results and batch execution through the same single path.
- Failed validation/blocked method paths do not invoke the kernel and do not contain `outputs`.
- Kernel exceptions become machine-readable `CALCULATION_FAILED`-family errors; engine does not synthesize assessment.

**Validation performed:**
| Check | Result | Evidence |
|---|---|---|
| Stage 5 module syntax | PASS | local exact files |
| canonical in→mm execution | PASS | engine focused test |
| result/input immutability | PASS | engine focused test |
| missing input blocks kernel | PASS | engine focused test |
| blocked method blocks kernel | PASS | engine focused test |
| batch reuses single engine | PASS | engine focused test |
| unsupported request contract | PASS | engine focused test |
| focused Stage 5 suite | PASS | 5/5 |
| full repo suite | NOT_RUN | RISK-004 |

**Stage decision:** COMPLETE.

### Stage 6 — Real production adapters

**Before stage**
- **Current truth:** central engine is functional but has no real domain definitions yet.
- **Objective:** register current B31.3 and empirical APIs without duplicating formulas.
- **Scope:** adapter modules only; current domain modules read-only.
- **Planned implementation:**
  - `PIPE.B313.THICKNESS`: direct caller factors; optional provided-wall assessment.
  - `PIPE.B313.MATERIAL_DESIGN`: existing material factor resolver + optional wall selection.
  - `ESTIMATION.WEIGHT.EMPIRICAL`: exact/A1/A2/final modes using existing estimator; explicit candidate model/master injection in Sandbox options.
- **Authority:** B31.3 method remains `IMPLEMENTED`/not design authority pending controlled review; empirical remains `BENCHMARK_ONLY`/non-design-authority.
- **Validation:** adapter syntax, stubbed mapping tests locally, then final branch-level exact source checks; direct domain parity where execution can be materialized.
- **Risks:** RISK-001/002.

---

## 5. Changed-File Ledger

| File | Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---|---|---|
| `agents/PR435_workreport.md` | 1–6 | living state/handover | No | current |
| `converters/engineering-calculations/contracts.js` | 4 | v1 constants/errors/snapshots | Yes | PASS |
| `.../units.js` | 4 | canonical units | Yes | PASS |
| `.../qualification.js` | 4 | authority composition | Yes | PASS |
| `.../registry.js` | 4 | deterministic registry | Yes | PASS |
| `.../input-resolution.js` | 5 | canonical input/provenance validation | Yes | PASS |
| `.../engine.js` | 5 | orchestration/result/batch | Yes | PASS |

Temporary `agents/PR_PENDING_workreport.md` is deleted and must not appear in final diff.

---

## 6. Engineering Decisions and Invariants
Engine has no domain equations; adapters call direct APIs; blocked placeholders never return numbers; B31.3 authority paths have separate IDs; results/input/context immutable; batch and Sandbox reuse production kernels; design authority is never inferred from numerical success.

---

## 7. Validation and Evidence Ledger

### Software
| Validation | Status | Evidence |
|---|---|---|
| Stage 4 focused suite | PASS | 5/5 |
| Stage 5 focused suite | PASS | 5/5 |
| Adapter tests | NOT_RUN | Stage 6 active |
| Full repository suite | NOT_RUN | RISK-004 |

### Engineering
| Property | Status | Evidence |
|---|---|---|
| Core contains no domain formulas | PASS | source scope |
| B31.3 parity | NOT_RUN | Stage 6/8 |
| Empirical parity | NOT_RUN | Stage 6/8 |
| Pending-method fail closed | PASS at engine level | blocked fake-definition test; real catalogue pending |

### Explicitly not validated
FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods; engineering-authority promotion; Console UI.

---

## 8. Known / Deferred Work + Forward Sequence
Open risks: RISK-001/002/004. Deferred: IMP-001 Console. After core: Console → answer #428–#434 → one qualified vertical calculator at a time.

## 9. Current State vs History
Mission Control/status/register/roadmap/ledgers/handover are living; stage history is append-only.

## 10. Process Notes / Lessons Learned
- Separate B31.3 IDs preserve distinct provenance/authority.
- Pressure conversion must guard gauge/absolute semantics.
- Engine tests prove orchestration without needing domain formula dependencies.
- Environment-limited full-repo checks remain NOT_RUN.

## 11. Commit and PR Rules
One PR; report updated around stages; no CI workflow changes; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Any need to change domain equations or unqualified family methods must be registered and deferred/blocked.

## 13. Coding Rules Applied
Named exports; focused modules; no hidden globals, silent fallback engineering data, unused abstractions or broad refactors.

## 14. Action-First Delivery Gate
`central API → registry/engine → real B31.3+empirical adapters → single/Sandbox/batch → focused parity/failure tests`.

---

## Next-Agent Handover
- **Stopping point:** Stage 5 complete; Stage 6 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / `57e973b...` plus report update.
- **Start here:** implement thin adapter definitions; do not alter domain modules.
- **Do not redo:** core primitives/engine.
- **Do not assume:** successful B31.3/empirical output is design authority.
- **Known failing checks:** none; full repo NOT_RUN.
- **Validation required:** adapters, direct parity, default API, real pending catalogue, final diff.
- **Highest risk:** RISK-001.
- **Next action:** add `adapters/b313.js` and `adapters/empirical-weight.js`.
