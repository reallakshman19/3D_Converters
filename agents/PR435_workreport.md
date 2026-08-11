# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed pending-family placeholders only where useful. |
| Source task / issue | Owner request 2026-08-11; `docs/APIEngineeringCalcContracts.md`; `docs/APIEngineeringCalcRoadmap.md`; family qualification issues #428–#434. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | Stage 4 production head `bfdf3c89395ed7582e9d4ae74acee3158ca94c49` plus this report update |
| PR status | OPEN / DRAFT |
| Current stage | Stage 5 — Central engine |
| Last completed stage | Stage 4 — Contract primitives + deterministic registry |
| Engineering status | Core primitives implemented; engine/adapters pending |
| Validation status | Stage 4 syntax PASS; focused Stage 4 tests 5/5 PASS; full repo NOT_RUN |
| Current blocker | None for core; family numerical methods remain qualification-gated. |
| Exact next action | Implement input resolution/validation and engine orchestration, validate with self-contained fake definitions, then update report before adapters. |

### Handover in 60 Seconds

**Now true:** #435 has deterministic v1 contract constants, immutable snapshot helpers, unit normalization, qualification composition, and a deterministic definition registry. No domain equation was added.

**Working on:** canonical input resolution + engine orchestration/result envelope.

**Unfinished:** engine, B31.3 adapters, empirical adapter, default registry/public API, batch/Sandbox completion, pending-family catalogue, integration tests, final reconciliation.

**Do not assume:** #428–#434 authorize FIV/AIV/trunnion/etc. numerical methods. Placeholders must fail closed and return no plausible outputs.

**Highest risk:** `RISK-001` — engine/adapters could reinterpret engineering outputs or authority.

**Next action:** implement Stage 5 engine only; no domain formula edits.

---

## 1. Mission and Engineering Intent

### Mission
Provide one reusable central API for current/future engineering calculations without moving engineering equations into the platform layer.

### Engineering/user consequence
B31.3 and empirical-weight callers will gain one stable registry/engine/result contract with explicit inputs, provenance, qualification, errors, evidence, Sandbox/batch support and immutable snapshots. Future family kernels can plug in after qualification.

### In scope
Registry; contract/error/snapshot helpers; quantity unit normalization; input resolution/validation; qualification composition; immutable result envelope; two B31.3 definitions; empirical-weight definition; default registry/public API; batch/Sandbox; explicit unavailable family placeholders if consumed; focused tests.

### Non-goals
No new FIV/AIV/trunnion/relief/equipment/flange/hazard formulas; no qualification promotion; no B31.3 formula change; no empirical algorithm change; no CI workflow; no full Console UI.

### Governing principles
- Engine orchestrates; domain modules own equations.
- Direct domain APIs remain supported and are reused.
- No silent engineering defaults/master fallback.
- Qualification is independent of numerical success.
- Failed calculations expose no authoritative-looking outputs.
- Sandbox/batch use the same production definition/kernel.
- Caller inputs/context and retained results are immutable snapshots.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report / PR synchronization | P0 | DONE | 1–3 | #435 + permanent report |
| Contract constants / snapshots | P0 | VALIDATED | 4 | `contracts.js`; local test |
| Unit normalization | P0 | VALIDATED | 4 | `units.js`; local test |
| Qualification composition | P0 | VALIDATED | 4 | `qualification.js`; local test |
| Deterministic registry | P0 | VALIDATED | 4 | `registry.js`; local test |
| Input resolution / validation | P0 | IN_PROGRESS | 5 | Pending |
| Central engine / result envelope | P0 | IN_PROGRESS | 5 | Pending |
| B31.3 thickness adapter | P0 | NOT_STARTED | 6 | Pending |
| B31.3 material-design adapter | P0 | NOT_STARTED | 6 | Pending |
| Empirical-weight adapter | P0 | NOT_STARTED | 6 | Pending |
| Default API / batch / Sandbox | P0 | NOT_STARTED | 7 | Pending |
| Pending-family fail-closed catalogue | P1 | NOT_STARTED | 7 | Conditional |
| Integration validation | P0 | NOT_STARTED | 8 | Pending |
| Final reconciliation | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine owns orchestration only. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3/empirical APIs are first real consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Pending-family placeholders fail closed; never numerical stand-ins. | Conditional |
| DEC-004 | Decision | P0 | ACCEPTED | Separate `PIPE.B313.THICKNESS` and `PIPE.B313.MATERIAL_DESIGN`. | Yes |
| RISK-001 | Risk | High | ACCEPTED | Engine/adapters may reinterpret domain outputs/authority; parity tests required. | Yes |
| RISK-002 | Risk | High | ACCEPTED | Unit conversion may corrupt gauge/absolute or native empirical semantics; explicit unit/reference rules required. | Yes |
| RISK-003 | Risk | Medium | ACCEPTED | Hidden registry mutation/order; explicit construction required. | Yes |
| RISK-004 | Risk | Medium | ACCEPTED | Container cannot clone GitHub / `gh` absent; full-repo local test NOT_RUN unless dependencies can be materialized. | Yes |
| QST-001 | Question | P1 | DONE | B31.3 ID ambiguity resolved by DEC-004. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Engineering Calculation Console UI in follow-up PR. | No |
| DEBT-001 | Debt | P2 | ACCEPTED | Pending catalogue metadata allowed only when default API consumes it visibly as unavailable. | Conditional |

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit/Head |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization | pending report | `e298b3c...` |
| 2 | COMPLETE | PR allocation/report rename | #435 permanent report | report commits |
| 3 | COMPLETE | Baseline/API verification | report-only baseline + exact domain inspection | `bfb7930...` |
| 4 | COMPLETE | Contract primitives/registry | 4 common production modules | `bfdf3c8...` |
| 5 | IN_PROGRESS | Input resolution + engine | canonical orchestration/result envelope | pending |
| 6 | NOT_STARTED | Real adapters | B31.3 x2 + empirical | pending |
| 7 | NOT_STARTED | Default public API + placeholders | v1 API/single/batch/Sandbox | pending |
| 8 | NOT_STARTED | Focused integration tests | parity/failure/immutability/batch | pending |
| 9 | NOT_STARTED | Reconciliation/closure | final report/diff validation | pending |

---

## Stage Execution Log

### Stage 1 — Report initialization
Contract/CodingRules inspected; `main` verified at `7a05c784...`; report created before production edits. **COMPLETE.**

### Stage 2 — PR allocation
Draft PR #435 created; permanent report path established. **COMPLETE.**

### Stage 3 — Repository/API verification
Pending report deleted. Current B31.3 thickness/material-factor and empirical estimator APIs/tests inspected. Local GitHub clone unavailable due DNS and `gh` absent; RISK-004 recorded. DEC-004 split B31.3 authority paths into two central IDs. **COMPLETE.**

### Stage 4 — Contract primitives + deterministic registry

**Before stage**
- Objective: implement shared v1 constants/errors/snapshot helpers, unit conversion, qualification composition, deterministic registry.
- Scope: `contracts.js`, `units.js`, `qualification.js`, `registry.js`.
- Risks: over-generalized units; nondeterministic registry; authority inflation.
- Planned validation: syntax + self-contained fake-definition tests.

**Implementation performed**
- Added frozen contract/result/batch version constants and fixed family/state vocabularies.
- Added clone/deep-freeze immutable snapshot utilities and normalized machine-readable errors.
- Added quantity-aware conversions for all v1 quantity families, including affine temperature.
- Added explicit gauge/absolute pressure mismatch rejection (`psia`↔`barg`, etc.).
- Added qualification composition where effective authority is limited by the weaker method/data state.
- Added deterministic registry validation for contract version, ID, family, required definition fields, field keys/types/units, duplicate IDs and immutable registered definitions.

**Changed files**
| File | Change | Why |
|---|---|---|
| `converters/engineering-calculations/contracts.js` | Added | v1 constants/errors/immutable snapshots |
| `.../units.js` | Added | common canonical unit conversion |
| `.../qualification.js` | Added | method/data/effective authority composition |
| `.../registry.js` | Added | deterministic definition registry |

**Validation performed**
| Check | Result | Evidence/Notes |
|---|---|---|
| `node --check` four Stage 4 modules | PASS | locally authored exact content |
| deterministic registry/duplicate rejection | PASS | focused Node test |
| immutable registry snapshot | PASS | focused Node test |
| length/pressure/temperature conversion | PASS | focused Node test |
| absolute/gauge mismatch rejection | PASS | focused Node test |
| lower-authority qualification | PASS | focused Node test |
| focused Stage 4 suite | PASS | 5/5 tests |
| full repository test suite | NOT_RUN | DNS/`gh` environment limitation |

**Issues discovered:** none new.  
**Remaining risks:** RISK-001/002 continue into engine/adapters.  
**Stage decision:** COMPLETE.  
**Handover delta:** generic v1 primitives are production-ready for engine consumption; no domain formulas added.

### Stage 5 — Central engine

**Before stage**
- **Current truth:** registry/common primitives are implemented and focused-tested.
- **Objective:** implement declared-input resolution/validation and the central orchestration path.
- **Scope:** `converters/engineering-calculations/input-resolution.js`, `engine.js`.
- **Engineering rationale:** frozen v1 requires lookup → resolve → normalize → validate → invoke kernel → assemble immutable result; engine must not own formulas.
- **Planned implementation:** resolve declared inputs with caller/default provenance; canonicalize units; custom validation hooks; non-executable method gating; successful/failed immutable result envelopes; same-engine batch execution.
- **Expected behavior:** unsupported contract/unregistered/blocked/invalid inputs fail with stable errors and no outputs; successful fragments are mechanically enveloped.
- **Edge cases:** resolver failure; thrown kernel errors; custom applicability; includeEvidence=false; batch stopOnError; no mutation of input/context.
- **Planned validation:** syntax + fake-definition engine tests for success/failure/immutability/batch.
- **Known risks:** RISK-001 is highest; engine must not synthesize assessment or authority.

---

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR435_workreport.md` | 2 | 5 | Living state/handover | No | Current |
| `converters/engineering-calculations/contracts.js` | 4 | 4 | v1 contract/error/snapshot primitives | Yes | syntax + focused tests |
| `.../units.js` | 4 | 4 | canonical unit conversion | Yes | syntax + focused tests |
| `.../qualification.js` | 4 | 4 | qualification composition | Yes | focused tests |
| `.../registry.js` | 4 | 4 | deterministic registry | Yes | focused tests |

Temporary `agents/PR_PENDING_workreport.md` is deleted and must not appear in final diff.

---

## 6. Engineering Decisions and Invariants
- **DEC-001:** engine contains no domain equations.
- **DEC-002:** central definitions call direct domain APIs.
- **DEC-003:** placeholder = unavailable, not zero/PASS.
- **DEC-004:** B31.3 direct-factor and material-resolved paths have separate IDs.
- Results are immutable snapshots.
- Batch invokes single-engine execution for each item.
- Sandbox uses the same definition/kernel.
- Caller input/context are never mutated.
- `designAuthority` is explicit and never inferred from numerical success.

---

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 4 syntax | PASS | `bfdf3c8...` | exact local files |
| Stage 4 focused tests | PASS | `bfdf3c8...` | 5/5 |
| Engine syntax/tests | NOT_RUN | N/A | Stage 5 active |
| Full repo suite | NOT_RUN | N/A | RISK-004 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| No domain formulas in core primitives | PASS | source scope |
| B31.3 parity | NOT_RUN | Stage 6/8 |
| Empirical parity | NOT_RUN | Stage 6/8 |
| Fail-closed pending methods | NOT_RUN | Stage 7/8 |

### Explicitly not validated
FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods; any engineering-authority promotion; full Console UI.

---

## 8. Known / Deferred Work + Forward Sequence
Open: RISK-001/002/003/004. Deferred: IMP-001 Console. Next programme sequence: finish core → Console → resolve #428–#434 → qualified vertical family calculators.

## 9. Current State vs History
Mission Control/status/register/roadmap/ledgers/handover are living; stage execution/closure evidence are historical.

## 10. Process Notes / Lessons Learned
- Separate B31.3 IDs preserve authority/provenance clarity.
- Platform pressure conversion must explicitly guard gauge vs absolute semantics.
- Environment-limited validation remains NOT_RUN rather than inferred PASS.

## 11. Commit and PR Rules
One PR; report before meaningful stages; no CI workflow changes; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Any requirement to modify domain equations or unresolved family methods must be registered/deferred/blocked.

## 13. Coding Rules Applied
Named exports; focused modules; no hidden globals/silent fallback data/unused abstractions/broad refactors; authority boundaries explicit.

## 14. Action-First Delivery Gate
`central API → registry/engine → real B31.3+empirical adapters → single/Sandbox/batch → focused parity/failure tests`.

---

## Next-Agent Handover
- **Stopping point:** Stage 4 complete; Stage 5 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / `bfdf3c8...` plus this report update.
- **Last completed:** Stage 4.
- **Active:** Stage 5.
- **Start here:** implement `input-resolution.js` and `engine.js` against frozen v1.
- **Do not redo:** Stage 4 common primitives or domain API discovery.
- **Do not assume:** family qualification gates authorize kernels.
- **Files involved:** report + four common core modules; Stage 5 adds two files.
- **Known failing checks:** none; full suite NOT_RUN due environment.
- **Validation still required:** engine tests, adapters, parity, batch/Sandbox, final diff.
- **Open questions:** none blocking.
- **Deferred improvements:** IMP-001.
- **Highest-risk item:** RISK-001.
- **Exact next action:** push/validate Stage 5 engine without domain formulas.
