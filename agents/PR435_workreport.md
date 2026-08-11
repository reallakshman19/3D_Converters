# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight integrations plus explicit fail-closed future-family placeholders. |
| Source task / issue | Owner request 2026-08-11; frozen `docs/APIEngineeringCalcContracts.md`; roadmap; qualification issues #428–#434. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | integration-test head `9de95388bcd32b7fafa32cca7904a49152305110` plus this report update |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 8 — Consolidated validation / defect correction |
| Last completed stage | Stage 7 — Default public API + blocked catalogue |
| Engineering status | Core runtime complete; one catalogue-coverage defect identified during validation |
| Validation status | Stage 4 5/5 PASS; Stage 5 5/5 PASS; Stage 6 4/4 PASS; committed live-domain suite NOT_RUN locally; GitHub commit statuses empty |
| Current blocker | `ISS-001`: blocked catalogue omits the #428 PIPE methods. |
| Exact next action | Add #428 PIPE placeholders, update test expectations, then reconcile all changed files and close Stage 8/9. |

### Handover in 60 Seconds

**What is now true:** registry, units, qualification, input resolution, engine, B31.3 x2, empirical weight, Sandbox/batch, public v1 API and blocked catalogue are implemented. A focused repository integration test is committed. GitHub reports PR #435 mergeable with no commit statuses.

**What is being worked on:** `ISS-001` found during final catalogue reconciliation: #428 exists as a qualification gate, but its unimplemented PIPE methods are not yet discoverable as blocked placeholders.

**What remains unfinished:** add 3 #428 placeholders, update catalogue count tests, final changed-file reconciliation, final report/PR description.

**What must not be assumed:** the committed live-domain test executed in this container; it did not. FIV/AIV/trunnion/etc. placeholders contain no numerical implementation. B31.3 method authority is not being promoted.

**Highest-risk remaining item:** `ISS-001` until fixed; then `RISK-001` remains limited by unavailable live-domain execution evidence.

**Exact next action:** patch only `pending-definitions.js` and the catalogue assertion in `tests/engineering-calculation-core.test.mjs`.

---

## 1. Mission and Engineering Intent

### Mission
Provide one deterministic, API-first engineering calculation platform while keeping engineering formula authority inside domain modules.

### Engineering/user consequence
Existing B31.3 and empirical-weight capabilities can now be discovered, validated, resolved, executed singly/in Sandbox/in batch, and returned with immutable provenance/qualification/evidence through one central API. Future methods appear as explicit unavailable catalogue entries until qualified.

### Scope
Central v1 contract runtime, registry, units, provenance/input validation, qualification composition, engine, two B31.3 adapters, empirical adapter, default registry, public API, batch/Sandbox, qualification-gated catalogue, focused tests.

### Non-goals
No new vibration/support/relief/equipment/flange/hazard/other PIPE equations; no authority promotion; no changes to current B31.3 or empirical formulas; no full Console UI; no CI workflows.

### Governing principles
- Central engine orchestrates only.
- No silent engineering data fallback.
- Engineering defaults are declared and surfaced in resolved provenance.
- Units and gauge/absolute pressure reference are explicit.
- Failed/blocked methods return no plausible outputs.
- Sandbox and batch use the same production definition/kernel.
- Results and registered definitions are immutable snapshots.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Report / PR / baseline | P0 | DONE | 1–3 | #435 |
| Contract primitives / units / qualification / registry | P0 | VALIDATED | 4 | 5/5 focused |
| Input resolution / engine | P0 | VALIDATED | 5 | 5/5 focused |
| B31.3 direct/material adapters | P0 | VALIDATED | 6 | mapping tests |
| Empirical adapter / Sandbox gate | P0 | VALIDATED | 6 | mapping tests |
| Default public API | P0 | IMPLEMENTED | 7 | central `index.js` |
| Blocked catalogue | P1 | PARTIAL | 7–8 | ISS-001: #428 missing |
| Focused repository integration test | P0 | IMPLEMENTED | 8 | committed; execution NOT_RUN locally |
| Final reconciliation | P0 | NOT_STARTED | 9 | pending ISS-001 fix |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | Defect | Medium/P0 | IN_PROGRESS | Pending catalogue covers #429–#434 but omits unimplemented #428 PIPE methods. Add external-pressure, branch-reinforcement and shell/local-loading blocked entries. | Yes |
| DEC-001 | Decision | P0 | ACCEPTED | Central engine owns orchestration only; domain APIs own formulas. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3/empirical APIs remain direct and are first central consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Placeholder means `BLOCKED`/unavailable, never numerical. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | `PIPE.B313.THICKNESS` and `PIPE.B313.MATERIAL_DESIGN` remain separate authority paths. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | Candidate empirical model/master injection is Sandbox-only. | Yes |
| RISK-001 | Risk | High | ACCEPTED | Live-domain adapter parity test is committed but cannot execute in current container; earlier stubbed mapping tests pass. | Yes |
| RISK-002 | Risk | High | MITIGATED | Gauge/absolute semantics protected by unit layer; canonical units passed to domain APIs. | Yes |
| RISK-003 | Risk | Medium | MITIGATED | Default/explicit registry construction deterministic. | Yes |
| RISK-004 | Risk | Medium | ACCEPTED | Container has no repo checkout, `gh`, or GitHub DNS clone access; full suite remains NOT_RUN. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Engineering Calculation Console follows in a separate PR. | No |

### ISS-001 detail
- **Stage discovered:** 8, final family/issue reconciliation.
- **Affected:** `pending-definitions.js`, catalogue test/report.
- **Observed:** all unimplemented families except PIPE #428 were represented.
- **Consequence:** Console/API discovery would not expose external pressure/branch/local-loading as qualification-blocked planned calculations.
- **Root cause:** Stage 7 catalogue was built around new MiscCalc families and overlooked the remaining PIPE qualification candidates.
- **Resolution:** add three zero-input/output `BLOCKED` definitions tied to issue #428; engine continues to reject before kernel.
- **Validation:** default total becomes 22 = 3 executable + 19 blocked; available remains 3; #428 entry must return `ENGINEERING_METHOD_BLOCKED` with no outputs.

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| 1 | COMPLETE | Report initialization | living report |
| 2 | COMPLETE | PR allocation/report rename | #435 |
| 3 | COMPLETE | Baseline/current API verification | exact domain boundaries |
| 4 | COMPLETE | Contract primitives/registry | common core |
| 5 | COMPLETE | Input resolution/engine | orchestration |
| 6 | COMPLETE | Real adapters | B31.3 x2 + empirical |
| 7 | COMPLETE with Stage-8 correction | Default API/catalogue | public surface |
| 8 | IN_PROGRESS | Consolidated tests/corrections | test + ISS-001 fix |
| 9 | NOT_STARTED | Reconciliation/closure state | final report/diff |

---

## Stage Execution Log

### Stages 1–3
Report initialized before production edits, PR #435 allocated, pending report removed, exact B31.3/empirical APIs inspected, B31.3 authority paths split deliberately. **COMPLETE.**

### Stage 4
Added `contracts.js`, `units.js`, `qualification.js`, `registry.js`. Focused tests **5/5 PASS**. **COMPLETE.**

### Stage 5
Added `input-resolution.js`, `engine.js`; validation precedes kernel, blocked methods fail before kernel, results immutable, batch reuses single path. Focused tests **5/5 PASS**. **COMPLETE.**

### Stage 6
Added thin B31.3 and empirical adapters; no domain formulas changed/copied; screening/benchmark authority preserved; candidate empirical data Sandbox-only. Focused tests **4/4 PASS**. **COMPLETE.**

### Stage 7
Added default registry/public v1 API and 16 `BLOCKED` placeholders for #429–#434. Source/API inspection PASS. Stage 8 found missing #428 coverage (`ISS-001`). **COMPLETE WITH CORRECTION REQUIRED.**

### Stage 8 — Consolidated validation

**Before:** core coding complete. Planned committed tests: catalogue, retained B31.3 benchmark, direct-vs-central empirical parity, B31 provided wall, Sandbox gate, real blocked placeholder, independent validate/resolve, mixed batch.

**Implementation/evidence so far**
- Added `tests/engineering-calculation-core.test.mjs` with 8 focused tests covering the planned cases.
- Inspected current B31.3 applicability: default pressure mode is internal; edition defaults to 2024; retained benchmark request is within implemented scope.
- GitHub PR head `9de95388...` is mergeable and has **no commit status entries**.
- Exact PR changed-file list contains only the work report, 11 production central modules, and the focused test; no domain formula or workflow file changed.
- Local execution of the committed integration suite is **NOT_RUN** because the runtime cannot materialize a repository checkout. Earlier self-contained Stage 4–6 suites remain executed evidence.
- Final issue-to-catalogue reconciliation found `ISS-001`.

**Before ISS-001 correction**
- **Objective:** complete qualification-gate catalogue coverage without numerical logic.
- **Scope:** `pending-definitions.js` and catalogue expectations in test.
- **Rationale:** every planned method represented by #428–#434 should be discoverable and explicitly blocked.
- **Planned entries:** `PIPE.EXTERNAL_PRESSURE.CHECK`, `PIPE.BRANCH.REINFORCEMENT`, `PIPE.SHELL.LOCAL_LOADING`, all tied to #428.
- **Expected behavior:** catalogue total 22; available total 3; new PIPE entries cannot execute and return no outputs.
- **Risk:** none to formulas because placeholders are blocked before kernel invocation.

---

## 5. Changed-File Ledger

| File | Stage | Purpose | Validation |
|---|---:|---|---|
| `agents/PR435_workreport.md` | 1–9 | living report/handover | current |
| `converters/engineering-calculations/contracts.js` | 4 | v1 constants/errors/snapshots | focused PASS |
| `.../units.js` | 4 | unit normalization/reference guard | focused PASS |
| `.../qualification.js` | 4 | authority composition | focused PASS |
| `.../registry.js` | 4 | deterministic registry | focused PASS |
| `.../input-resolution.js` | 5 | canonical input/provenance validation | focused PASS |
| `.../engine.js` | 5 | orchestration/result/batch | focused PASS |
| `.../adapters/b313.js` | 6 | real B31.3 definitions | focused mapping PASS |
| `.../adapters/empirical-weight.js` | 6 | real empirical definition | focused mapping PASS |
| `.../pending-definitions.js` | 7–8 | blocked planned-method catalogue | ISS-001 correction active |
| `.../default-registry.js` | 7 | default definition set | source inspected |
| `.../index.js` | 7 | frozen v1 public API | source inspected |
| `tests/engineering-calculation-core.test.mjs` | 8 | final focused integration cases | committed; local run NOT_RUN |

Final GitHub changed-file count before ISS-001 correction: **13**, exactly matching this ledger. `agents/PR_PENDING_workreport.md` is absent.

---

## 6. Engineering Decisions and Invariants
- Central engine/adapters contain no replacement engineering equations.
- Existing domain APIs remain directly callable.
- Blocked placeholder has no engineering outputs/PASS state.
- B31.3 direct-factor/material-resolved paths remain distinct.
- Empirical candidate data is Sandbox-only.
- Inputs/context/results are immutable snapshots.
- Batch/Sandbox reuse the same production definitions.
- `designAuthority` is explicit, conservative, and never inferred from numerical success.

---

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Evidence |
|---|---|---|
| Stage 4 focused suite | PASS | 5/5 |
| Stage 5 focused suite | PASS | 5/5 |
| Stage 6 focused suite | PASS | 4/4 |
| Final test file committed | PASS | `tests/engineering-calculation-core.test.mjs` |
| Final live-domain test execution | NOT_RUN | no local checkout / GitHub execution status |
| GitHub commit statuses | NOT_RUN / none | status list empty at `9de95388...` |
| Full repository regression suite | NOT_RUN | RISK-004 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| No domain formula changes | PASS | changed-file reconciliation |
| B31.3 benchmark central test authored | PASS | retained benchmark assertion committed |
| B31.3 benchmark central test executed | NOT_RUN | environment limitation |
| Empirical direct-vs-central parity test authored | PASS | committed |
| Empirical parity executed live | NOT_RUN | environment limitation |
| Pending method fail-closed | PASS | Stage 5 executed generic case; real catalogue source gate |
| Authority promotion | NOT_APPLICABLE | none performed |

### Explicitly not validated
Numerical FIV/AIV/SBC/cavitation/surge/slug/relief/trunnion/shoe/equipment/flange/blast/external-pressure/branch/local-loading methods; full Console UI; full repo regression.

---

## 8. Known / Deferred Work + Forward Sequence
Open current-PR defect: ISS-001 only. Accepted validation limitation: RISK-004. After PR: implement Engineering Calculation Console; resolve family qualification issues; implement one qualified vertical calculator per issue/method.

## 9. Current State vs History
Mission Control/status/register/roadmap/ledger/validation/handover are living. Stage history and resolved closure evidence remain historical.

## 10. Process Notes / Lessons Learned
- Qualification issues and catalogue entries need explicit reconciliation; family grouping alone can hide omitted planned methods.
- Wrapper parity and independent engineering qualification are different evidence classes.
- An unavailable calculator is safer as a visible `BLOCKED` definition than as a zero/placeholder formula.
- Environment-limited tests remain `NOT_RUN`.

## 11. Commit and PR Rules
One PR; no CI workflow additions; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
No finding has required domain formula changes. ISS-001 is metadata/catalogue scope and can be corrected without changing engineering authority.

## 13. Coding Rules Applied
Named exports, focused modules, no silent engineering fallback, no hidden singleton authority, no numerical placeholders, no broad refactor, no workflow changes.

## 14. Action-First Delivery Gate
Real central API → registry/engine → B31.3/empirical production integrations → single/Sandbox/batch → blocked future catalogue → focused tests. Core capability exists; final work is validation/reconciliation.

---

## Next-Agent Handover
- **Stopping point:** Stage 8, before ISS-001 code correction.
- **PR/branch/head:** #435 / `agent/engineering-calc-core` / `9de95388...` plus this report commit.
- **Last completed:** Stage 7.
- **Active:** Stage 8.
- **Start here:** add the three #428 PIPE blocked definitions and update test count/assertion.
- **Do not redo:** core engine/adapters.
- **Do not assume:** committed live-domain suite ran; it did not.
- **Known failing checks:** none executed; ISS-001 is a source-coverage defect, not a test failure.
- **Validation still required:** final file reconciliation and report closure; live integration remains NOT_RUN unless environment changes.
- **Open engineering questions:** none.
- **Deferred:** IMP-001 Console.
- **Highest-risk item:** ISS-001 until fixed, then RISK-004 evidence limitation.
- **Exact next action:** patch pending catalogue/test only, reconcile GitHub 13-file list, update PR description and final report.
