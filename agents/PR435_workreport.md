# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed placeholders only where family methods remain unqualified. |
| Source task / issue | Owner request 2026-08-11; `docs/APIEngineeringCalcContracts.md`; `docs/APIEngineeringCalcRoadmap.md`; family qualification issues #428–#434 remain separate gates. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | report synchronization in progress; update after pending-file removal |
| PR status | OPEN / DRAFT |
| Current stage | Stage 3 — Changed-file / repository-state verification |
| Last completed stage | Stage 2 — PR allocation + report synchronization |
| Engineering status | Contract frozen; production core not yet changed |
| Validation status | Contract/CodingRules inspection PASS; production tests NOT_RUN |
| Current blocker | None for central core. Family kernels #428–#434 remain qualification-gated. |
| Exact next action | Remove `PR_PENDING` report, reconcile the branch to one report file, inspect current domain API shapes/tests, then record Stage 3 before production implementation. |

### Handover in 60 Seconds

**What is now true:** PR #435 exists from `agent/engineering-calc-core` to `main`. `engineering-calculation-contract/v1` is the frozen authority. No production file has been changed yet.

**What is being worked on:** changed-file baseline verification and report filename synchronization.

**What remains unfinished:** registry, engine, unit/validation/provenance/qualification helpers, B31.3 adapter, empirical-weight adapter, default registry/public API, batch/Sandbox, focused tests, final reconciliation.

**What must not be assumed:** #428–#434 authorize numerical FIV/AIV/trunnion/etc. methods. They do not. A placeholder may only be explicitly unavailable and may never emit plausible zeros or PASS/FAIL.

**Highest-risk remaining item:** `RISK-001` — a central wrapper could accidentally reinterpret domain outputs or manufacture authority.

**Exact next action:** finish Stage 3 repository/API verification, then implement registry/contract primitives.

---

## 1. Mission and Engineering Intent

### Mission
Build the reusable central Engineering Calculation API required by the frozen v1 contract so current and future engineering calculators share one deterministic registry, request/result contract, provenance/qualification model, Sandbox/batch route, and discovery surface without duplicating equations.

### Engineering / user consequence
A caller should be able to invoke existing B31.3 or empirical weight through one stable central API and receive an immutable, explainable result containing inputs, provenance, authority, outputs, warnings/errors, and evidence metadata. Future families plug into the same orchestration boundary only after their method-specific qualification gates are answered.

### In scope
- deterministic registry;
- orchestration engine;
- v1 constants/error/result helpers;
- quantity-aware unit normalization required by registered calculators;
- structural/physical/applicability hooks;
- provenance and qualification composition;
- immutable result snapshots;
- B31.3 production adapter;
- empirical-weight production adapter;
- default registry/public API;
- same-kernel Sandbox and batch execution;
- focused parity/failure/contract tests;
- explicit unavailable family descriptors only if they have a real production consumer and fail closed.

### Non-goals
- no new FIV/AIV/trunnion/relief/equipment/flange/hazard numerical kernels;
- no method/data qualification promotion;
- no changes to B31.3 formulas or empirical-weight algorithms;
- no GitHub Actions changes;
- no full Engineering Calculation Console UI in this PR.

### Governing principles
1. Engine orchestrates; domain modules own formulas.
2. Existing direct APIs remain supported and are reused.
3. No silent engineering defaults/master fallback.
4. Qualification is independent from numerical success.
5. Failed calculations expose no plausible authoritative outputs.
6. Sandbox/batch use the same production definition/kernel.
7. Result/context/input snapshots are not mutated by calculation.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report initialized | P0 | DONE | 1 | Original `PR_PENDING` report |
| PR allocation + report synchronization | P0 | DONE | 2 | PR #435 + this file |
| Changed-file/API baseline verification | P0 | IN_PROGRESS | 3 | Pending reconciliation |
| Registry + contract primitives | P0 | NOT_STARTED | 4 | Pending |
| Engine + immutable result orchestration | P0 | NOT_STARTED | 5 | Pending |
| B31.3 production adapter | P0 | NOT_STARTED | 6 | Pending |
| Empirical-weight production adapter | P0 | NOT_STARTED | 6 | Pending |
| Default API + batch/Sandbox | P0 | NOT_STARTED | 7 | Pending |
| Qualification-pending catalogue placeholders | P1 | NOT_STARTED | 7 | Conditional; explicit unavailable only |
| Focused validation | P0 | NOT_STARTED | 8 | Pending |
| Final reconciliation / closure state | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine contains orchestration only; formulas remain in domain APIs. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3 and empirical-weight APIs are the first real registry consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Qualification-gated placeholders may only fail closed; no numerical placeholder outputs. | Conditional |
| RISK-001 | Risk | High | ACCEPTED | Central result mapping could reinterpret domain outputs/authority. Use thin adapters + parity tests. | Yes |
| RISK-002 | Risk | High | ACCEPTED | Generic unit conversion can corrupt gauge/absolute and unit-native empirical semantics. Use declared conversions and adapter-specific boundaries. | Yes |
| RISK-003 | Risk | Medium | ACCEPTED | Hidden registry mutation can make construction nondeterministic. Use explicit construction/default registry factory. | Yes |
| QST-001 | Question | P1 | INVESTIGATING | B31.3 central definition should preserve `PIPE.B313.THICKNESS` identity while optionally composing material factors/wall selection without creating a second formula. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Full Engineering Calculation Console UI should follow as separate PR. | No |
| DEBT-001 | Debt | P2 | ACCEPTED | Unavailable family metadata may exist only if consumed by the default catalogue/API and clearly qualification-pending. | Conditional |

### RISK-001 closure requirement
Direct domain calls and central calls must match engineering outputs for retained reference cases. Central orchestration may add metadata/provenance but must not change the numerical kernel result or infer design authority from `ok`/PASS.

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + technical findings | `agents/PR_PENDING_workreport.md` | `e298b3c...` |
| 2 | COMPLETE | PR allocation + report synchronization | PR #435 + `agents/PR435_workreport.md` | synchronization commits |
| 3 | IN_PROGRESS | Changed-file / repository-state verification | Clean report-only baseline + current domain API/test inventory | pending |
| 4 | NOT_STARTED | Contract primitives + deterministic registry | constants/errors/units/qualification/registry | pending |
| 5 | NOT_STARTED | Central engine | canonical resolve/validate/calculate/result-freeze path | pending |
| 6 | NOT_STARTED | Real production adapters | B31.3 + empirical-weight definitions | pending |
| 7 | NOT_STARTED | Public default API + batch/Sandbox | complete v1 public surface | pending |
| 8 | NOT_STARTED | Focused tests/validation | contract/parity/failure/batch/immutability evidence | pending |
| 9 | NOT_STARTED | Reconciliation + closure state | final report and GitHub file reconciliation | pending |

---

## Stage Execution Log

### Stage 1 — Report initialization + technical findings

**Before stage:** v1 contract and roadmap were merged; no central runtime existed.  
**Objective:** establish technical truth and implementation stages before production edits.  
**Scope:** contract, coding rules, existing domain API boundaries, report only.  
**Engineering rationale:** first central PR must have real production consumers and must not become speculative infrastructure.  
**Planned validation:** confirm `main` SHA; inspect contract and Common CodingRules.

**After stage:**
- Initialized living report before production edits.
- Confirmed `main` at `7a05c78413592dade410595775a9b0f7dd104bf0`.
- Inspected `engineering-calculation-contract/v1` and Common CodingRules.
- Recorded DEC/RISK/QST/IMP/DEBT items.
- Production code remained untouched.
- **Decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization

**Before stage:** branch contained only `agents/PR_PENDING_workreport.md`; no PR number.  
**Objective:** allocate PR and move the living report to its permanent filename.  
**Scope:** GitHub PR metadata + report filename/content only.  
**Engineering rationale:** handover must remain durable before implementation begins.  
**Planned validation:** verify PR number/head/base and ensure no production file enters the diff.

**After stage:**
- Draft PR #435 created from `agent/engineering-calc-core` to `main`.
- Permanent report created as `agents/PR435_workreport.md`.
- Old pending report removal is the first action of Stage 3 reconciliation.
- **Decision:** COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Before stage**
- **Current truth:** no production changes; two report paths temporarily exist during rename.
- **Objective:** remove pending report and inspect exact current B31.3/empirical APIs, test conventions, and module layout before designing implementation files.
- **Expected scope/files:** report rename reconciliation; read-only inspection of `converters/b313-*`, `converters/empirical-weight/`, existing tests/package conventions.
- **Engineering rationale:** adapters must map real current APIs, not remembered signatures.
- **Planned implementation:** no production edits until this stage is recorded complete.
- **Expected behavior:** branch returns to exactly one changed report file.
- **Edge cases:** B31.3 material-design wrapper may have different qualification semantics than thickness-only; empirical exact lookup/A1/A2 final estimates must remain distinguishable.
- **Planned validation:** GitHub changed-file comparison; inspect exact exports and test runner patterns.
- **Known risks:** stale assumptions from earlier PRs.

---

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR435_workreport.md` | 2 | 3 | Living PR state/handover | No | Permanent report path |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | Temporary pre-PR report | No | Must be removed during Stage 3 |

---

## 6. Engineering Decisions and Invariants

### DEC-001 — Orchestration is not engineering authority
**Must remain true:** central engine contains no domain equations and does not reinterpret calculator outputs.  
**Enforcement:** calculator definitions call domain APIs; engine only performs common orchestration.  
**Validation:** source inspection + direct-vs-central parity.

### DEC-002 — Existing APIs remain first-class
Direct B31.3 and empirical-weight APIs stay supported. Central execution reuses them.

### DEC-003 — Placeholder means unavailable
Pending family definitions, if registered, return stable `ENGINEERING_METHOD_NOT_QUALIFIED`/`ENGINEERING_METHOD_BLOCKED` errors, no plausible outputs, no PASS.

### Additional invariants
- Results are immutable snapshots.
- Batch invokes the same single-execution path for each item.
- Sandbox invokes the same definition/kernel.
- Input/context objects are not mutated.
- `designAuthority` is explicit and never inferred from numerical success.

---

## 7. Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Contract inspection | PASS | base `7a05c784...` | `docs/APIEngineeringCalcContracts.md` |
| Common CodingRules inspection | PASS | `Common/main` | `CodingRules.md` |
| PR allocation | PASS | `e298b3c...` | PR #435 created |
| Branch changed-file baseline | NOT_RUN | current | Stage 3 pending |
| Production tests | NOT_RUN | N/A | No production changes yet |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Central engine contains no domain formulas | NOT_RUN | Await implementation |
| B31.3 direct-vs-central parity | NOT_RUN | Await implementation |
| Empirical direct-vs-central parity | NOT_RUN | Await implementation |
| Qualification fail-closed behavior | NOT_RUN | Await implementation |

### Explicitly Not Validated
- FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods.
- Any promotion of engineering authority.
- Full Console UI.

---

## 8. Known / Deferred Work + Forward Sequence

Open risks: RISK-001/002/003. Open question: QST-001. Deferred UI: IMP-001.

Recommended sequence after this PR: Engineering Calculation Console → resolve #428–#434 → implement selected vertical family calculators one at a time.

---

## 9. Current State vs History

Mission Control, status/register/roadmap/ledgers/handover are living sections. Stage Execution Log and closure evidence are historical.

---

## 10. Process Notes / Lessons Learned

- A framework-only central registry violates the v1 freeze; B31.3 and empirical weight must execute through it in this PR.
- Legacy/qualification-pending placeholders may advertise unavailability only; they cannot become pseudo-engineering kernels.

---

## 11. Commit and PR Rules

One PR; report updated before meaningful commits; no CI workflow additions; no merge without Owner instruction.

---

## 12. Unexpected Findings / Stop Conditions

Any finding requiring B31.3 equation changes, empirical algorithm changes, or unresolved family engineering-method changes is registered and deferred/blocked rather than silently broadened.

---

## 13. Coding Rules Applied

Named exports; focused modules; no hidden globals/silent fallback data/unused abstractions/broad refactor/speculative production behavior; authority boundaries explicit.

---

## 14. Action-First Delivery Gate

```text
central public API
→ deterministic registry/engine
→ real B31.3 + empirical-weight adapters
→ executable single/Sandbox/batch
→ focused parity/failure tests
```

Framework-only metadata is not completion.

---

## Next-Agent Handover

- **Current stopping point:** Stage 2 complete; Stage 3 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / report synchronization commits in progress.
- **Last completed stage:** Stage 2.
- **Current active stage:** Stage 3.
- **Start here:** remove `agents/PR_PENDING_workreport.md`, compare PR changed files, then inspect exact B31.3/empirical exports and current test conventions.
- **Do not redo:** contract/CodingRules baseline inspection or PR allocation.
- **Do not assume:** #428–#434 authorize family kernels.
- **Files currently involved:** two report paths only until rename cleanup.
- **Known failing checks:** None known.
- **Validation still required:** all production validation.
- **Open engineering questions:** QST-001.
- **Deferred improvements:** IMP-001.
- **Highest-risk remaining item:** RISK-001.
- **Exact next recommended action:** complete Stage 3 verification before any production edit.
- **Required reading:** `docs/APIEngineeringCalcContracts.md`, `docs/APIEngineeringCalcRoadmap.md`, current `converters/b313-*`, `converters/empirical-weight/`, this report.
