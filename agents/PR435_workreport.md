# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers plus explicit fail-closed pending-family placeholders. |
| Source task / issue | Owner request 2026-08-11; frozen contract/roadmap; qualification issues #428–#434. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | Stage 6 production head `528bed7d6e24c732367a005c4d39448ad8f27133` plus this report update |
| PR status | OPEN / DRAFT |
| Current stage | Stage 7 — Default public API + blocked catalogue |
| Last completed stage | Stage 6 — Real production adapters |
| Engineering status | Core engine + 3 real definitions implemented; default public surface pending |
| Validation status | Stage 4 5/5 PASS; Stage 5 5/5 PASS; Stage 6 4/4 PASS; full repo NOT_RUN |
| Current blocker | None for core. Numerical family methods #428–#434 remain qualification-gated. |
| Exact next action | Add default registry, frozen public API exports, and explicit blocked definitions for planned families; then run the combined focused suite. |

### Handover in 60 Seconds

**Now true:** central registry/engine are implemented. `PIPE.B313.THICKNESS`, `PIPE.B313.MATERIAL_DESIGN`, and `ESTIMATION.WEIGHT.EMPIRICAL` are thin production adapters over existing domain APIs. Domain formula files remain unchanged.

**Working on:** default registry/public API and blocked catalogue entries for unresolved families.

**Unfinished:** public `index.js`, default registry, blocked definitions, consolidated branch tests, changed-file reconciliation/report closure.

**Do not assume:** a blocked catalogue item has any numerical implementation; the engine must stop it before `calculate()`.

**Highest risk:** RISK-001, adapter parity/authority mapping; final integration evidence still required.

**Next action:** build the default v1 surface and test real + blocked registration paths.

---

## 1. Mission and Engineering Intent
Central platform owns orchestration only. Existing B31.3 and empirical APIs remain formula authority/direct APIs. The platform adds deterministic registration, canonical inputs/units, provenance, qualification, immutable results, Sandbox/batch and discovery. Pending family entries are discoverable only as blocked/unavailable placeholders with qualification issue references.

**Out of scope:** new FIV/AIV/trunnion/relief/equipment/flange/hazard equations, authority promotion, full Console UI, CI changes.

---

## 2. Mission Status

| Work Item | Status | Evidence |
|---|---|---|
| Report/PR/baseline | DONE | #435, Stage 1–3 |
| Contract primitives/registry | VALIDATED | Stage 4, 5/5 |
| Input resolution/engine | VALIDATED | Stage 5, 5/5 |
| B31.3 thickness adapter | VALIDATED | Stage 6 mapping test |
| B31.3 material-design adapter | VALIDATED | Stage 6 mapping test |
| Empirical-weight adapter | VALIDATED | Stage 6 mapping tests |
| Default registry/public API | IN_PROGRESS | Stage 7 |
| Pending-family blocked catalogue | IN_PROGRESS | Stage 7 |
| Consolidated integration/parity validation | NOT_STARTED | Stage 8 |
| Final reconciliation | NOT_STARTED | Stage 9 |

---

## 3. Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Engine owns orchestration only; no domain equations. |
| DEC-002 | Decision | ACCEPTED | Existing B31.3/empirical APIs are first real consumers. |
| DEC-003 | Decision | ACCEPTED | Pending placeholders are blocked/unavailable; never numerical stand-ins. |
| DEC-004 | Decision | ACCEPTED | Separate `PIPE.B313.THICKNESS` and `PIPE.B313.MATERIAL_DESIGN`. |
| DEC-005 | Decision | ACCEPTED | Empirical candidate model/master injection is allowed only in Sandbox mode. |
| RISK-001 | Risk | OPEN | Adapter/engine parity and authority mapping require final integration validation. |
| RISK-002 | Risk | OPEN | Unit semantics, especially pressure reference and native empirical assumptions. |
| RISK-003 | Risk | MITIGATED | Registry construction explicit/deterministic. |
| RISK-004 | Risk | OPEN | Full repository clone/test unavailable in container; must remain NOT_RUN unless independently available. |
| IMP-001 | Improvement | DEFERRED | Full Engineering Calculation Console UI follows core. |

---

## 4. Stage Roadmap

| Stage | Status | Output |
|---|---|---|
| 1–3 | COMPLETE | report, PR, clean baseline/API inspection |
| 4 | COMPLETE | contracts/units/qualification/registry |
| 5 | COMPLETE | input resolution + engine |
| 6 | COMPLETE | B31.3 x2 + empirical adapters |
| 7 | IN_PROGRESS | default public API + blocked catalogue |
| 8 | NOT_STARTED | consolidated tests/parity/failure/Sandbox/batch |
| 9 | NOT_STARTED | final diff/report closure |

---

## Stage Execution Log

### Stages 1–3
Report created before production edits; PR #435 allocated; pending report removed; exact domain APIs inspected; local GitHub clone unavailable due DNS/`gh`. **COMPLETE.**

### Stage 4
Added `contracts.js`, `units.js`, `qualification.js`, `registry.js`. Focused tests: **5/5 PASS**. **COMPLETE.**

### Stage 5
Added `input-resolution.js`, `engine.js`. Validation blocks kernels; results immutable; batch reuses single path; unsupported/blocked requests fail closed. Focused tests: **5/5 PASS**. **COMPLETE.**

### Stage 6 — Real production adapters

**Before:** engine functional but no real domain definitions. Objective: reuse current domain APIs without formula duplication.

**Implementation performed**
- Added `adapters/b313.js` with two explicit definitions:
  - `PIPE.B313.THICKNESS`: canonical pressure/length/stress inputs → existing thickness/provided-wall API; no formula recreation.
  - `PIPE.B313.MATERIAL_DESIGN`: canonical material/temp/pressure inputs → existing material-factor/thickness/wall pipeline.
- B31.3 method authority remains `IMPLEMENTED`; direct caller-factor data is `DRAFT`; material data preserves actual factor source status; central design authority remains false while method review is incomplete.
- Added `adapters/empirical-weight.js`:
  - `ESTIMATION.WEIGHT.EMPIRICAL` supports `FINAL`, `EXACT`, `A1`, `A2` via existing estimator functions.
  - Normal model is `BENCHMARK_ONLY`; candidate model/master is `DRAFT` and accepted only under `executionMode:'sandbox'`.
  - A2 predictions/configured/effective weights/support metadata are passed through rather than recomputed.

**Changed files**
| File | Purpose |
|---|---|
| `converters/engineering-calculations/adapters/b313.js` | B31.3 direct/material adapters |
| `.../adapters/empirical-weight.js` | empirical estimator adapter |

**Validation performed**
| Check | Result | Notes |
|---|---|---|
| adapter syntax | PASS | exact local authored files |
| B31.3 barg→MPa mapping / domain output preservation | PASS | focused adapter test |
| B31.3 material SCREENING authority preservation | PASS | focused adapter test |
| empirical A2 result preservation | PASS | focused adapter test |
| candidate empirical data outside Sandbox | PASS | rejected fail-closed |
| Stage 6 focused suite | PASS | 4/4 |
| full repository suite | NOT_RUN | RISK-004 |

**Stage decision:** COMPLETE.

### Stage 7 — Default public API + blocked catalogue

**Before stage**
- Three real definitions exist but no default central entrypoint yet.
- Objective: finish frozen v1 public functions and make planned families discoverable without pretending they are implemented.
- Scope: `pending-definitions.js`, `default-registry.js`, `index.js`.
- Planned behavior: default registry contains 3 real calculators plus explicit BLOCKED/CONCEPT descriptors for planned family calculators; engine rejects blocked entries before their placeholder function can execute.
- Planned validation: list/family/definition/qualification functions; blocked call; real call through default engine using locally materialized dependencies where possible; batch/Sandbox public routing.

---

## 5. Changed-File Ledger

| File | Stage | Purpose | Validation |
|---|---:|---|---|
| `agents/PR435_workreport.md` | 1–7 | living state/handover | current |
| `converters/engineering-calculations/contracts.js` | 4 | v1 constants/errors/snapshots | PASS |
| `.../units.js` | 4 | canonical units | PASS |
| `.../qualification.js` | 4 | authority composition | PASS |
| `.../registry.js` | 4 | deterministic registry | PASS |
| `.../input-resolution.js` | 5 | input/provenance validation | PASS |
| `.../engine.js` | 5 | orchestration/result/batch | PASS |
| `.../adapters/b313.js` | 6 | B31.3 real definitions | 2 focused cases PASS |
| `.../adapters/empirical-weight.js` | 6 | empirical real definition | 2 focused cases PASS |

Temporary `agents/PR_PENDING_workreport.md` is deleted and is a final-diff blocker if it reappears.

---

## 6. Engineering Decisions and Invariants
No domain equations in engine/adapters; direct APIs remain supported; blocked placeholder never executes; separate B31.3 IDs preserve authority; candidate empirical data Sandbox-only; inputs/context/results immutable; batch/Sandbox use same production definitions; design authority never inferred from numeric success.

---

## 7. Validation and Evidence Ledger

### Software
- Stage 4: **5/5 PASS**
- Stage 5: **5/5 PASS**
- Stage 6: **4/4 PASS**
- Full repo: **NOT_RUN** (RISK-004)

### Engineering
- Core contains no domain formulas: **PASS by source boundary**
- Adapter mapping behavior: **PASS focused/stubbed**
- Exact live-domain parity on full branch: **NOT_RUN yet**
- Pending-method fail closed: **PASS engine fake-definition; real catalogue Stage 7 pending**

### Explicitly not validated
FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods; engineering-authority promotion; full Console UI.

---

## 8. Known / Deferred Work + Forward Sequence
Open: RISK-001/002/004. Deferred: IMP-001 Console. Sequence after core: Console → answer #428–#434 → one qualified vertical family calculator at a time.

## 9. Current State vs History
Mission Control/status/register/roadmap/ledgers/handover are living; Stage Execution Log is historical.

## 10. Process Notes / Lessons Learned
- Thin adapters can preserve current numerical authority while centralizing execution semantics.
- B31.3 material data status must be carried through; central API must not upgrade screening rows.
- Candidate empirical model data needs an explicit Sandbox-only gate.

## 11. Commit and PR Rules
One PR; no CI workflow additions; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Any need for new domain equations or qualification promotion is out of this PR and must be separately dispositioned.

## 13. Coding Rules Applied
Named exports; focused modules (<300 lines); no silent engineering fallbacks, hidden singleton mutation, unused speculative abstractions or domain formula duplication.

## 14. Action-First Delivery Gate
`central API → registry/engine → real B31.3+empirical adapters → public single/Sandbox/batch → focused final validation`.

---

## Next-Agent Handover
- **Stopping point:** Stage 6 complete; Stage 7 active.
- **PR/branch/head:** #435 / `agent/engineering-calc-core` / `528bed7...` plus report update.
- **Start here:** add blocked catalogue, default registry, public `index.js`.
- **Do not redo:** engine/adapters.
- **Do not assume:** blocked catalogue items have formulas.
- **Known failing checks:** none; full repo NOT_RUN.
- **Validation required:** public API, real blocked entries, consolidated suite, final changed-file reconciliation.
- **Highest risk:** RISK-001.
- **Next action:** implement Stage 7 then immediately run Stage 8 focused validation.
