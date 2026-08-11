# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed placeholders only where family methods remain unqualified. |
| Source task / issue | Owner request 2026-08-11; `docs/APIEngineeringCalcContracts.md`; `docs/APIEngineeringCalcRoadmap.md`; family qualification issues #428–#434 remain separate gates. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | report synchronization stage; permanent report exists, pending-path cleanup is next |
| PR status | OPEN / DRAFT |
| Current stage | Stage 3 — Changed-file / repository-state verification |
| Last completed stage | Stage 2 — PR allocation + report synchronization |
| Engineering status | Contract frozen; production core not yet changed |
| Validation status | Contract/CodingRules inspection PASS; production tests NOT_RUN |
| Current blocker | None for central core. Family kernels #428–#434 remain qualification-gated. |
| Exact next action | Remove `agents/PR_PENDING_workreport.md`, verify PR changed files, inspect exact current domain APIs/tests, then implement Stage 4. |

### Handover in 60 Seconds

**What is now true:** PR #435 exists from `agent/engineering-calc-core` to `main`; the permanent living report is `agents/PR435_workreport.md`; no production file has been changed.

**What is being worked on:** changed-file baseline verification and cleanup of the temporary pending report path.

**What remains unfinished:** registry, engine, units, validation/provenance/qualification helpers, B31.3 adapter, empirical-weight adapter, default registry/API, batch/Sandbox, tests, final reconciliation.

**What must not be assumed:** family issues #428–#434 authorize numerical methods. They do not. A placeholder may only be explicitly unavailable and may never emit plausible zeros or PASS/FAIL.

**Highest-risk remaining item:** `RISK-001` — central orchestration could accidentally reinterpret domain outputs or manufacture engineering authority.

**Exact next action:** remove the pending report, verify the clean baseline, then inspect exact production API signatures/test patterns.

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
| Work report initialized | P0 | DONE | 1 | `e298b3c...` |
| PR allocation + permanent report | P0 | DONE | 2 | PR #435; `agents/PR435_workreport.md` |
| Changed-file/API baseline verification | P0 | IN_PROGRESS | 3 | Pending-path cleanup and API inspection |
| Registry + contract primitives | P0 | NOT_STARTED | 4 | Pending |
| Engine + immutable result orchestration | P0 | NOT_STARTED | 5 | Pending |
| B31.3 production adapter | P0 | NOT_STARTED | 6 | Pending |
| Empirical-weight production adapter | P0 | NOT_STARTED | 6 | Pending |
| Default API + batch/Sandbox | P0 | NOT_STARTED | 7 | Pending |
| Qualification-pending catalogue placeholders | P1 | NOT_STARTED | 7 | Conditional; unavailable only |
| Focused validation | P0 | NOT_STARTED | 8 | Pending |
| Final reconciliation / closure state | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine contains orchestration only; formulas remain in domain APIs. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3 and empirical-weight APIs are first real registry consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Qualification-gated placeholders may only fail closed; no numerical placeholder outputs. | Conditional |
| RISK-001 | Risk | High | ACCEPTED | Central result mapping could reinterpret domain outputs/authority. Use thin adapters + parity tests. | Yes |
| RISK-002 | Risk | High | ACCEPTED | Generic unit conversion can corrupt gauge/absolute or unit-native empirical semantics. Use declared conversions/adapter boundaries. | Yes |
| RISK-003 | Risk | Medium | ACCEPTED | Hidden registry mutation can make construction nondeterministic. Use explicit registry construction/default factory. | Yes |
| QST-001 | Question | P1 | INVESTIGATING | Preserve `PIPE.B313.THICKNESS` identity while optionally composing material-factor/wall-selection functionality without duplicating formula authority. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Full Engineering Calculation Console UI follows as a separate PR. | No |
| DEBT-001 | Debt | P2 | ACCEPTED | Unavailable family metadata may exist only if consumed by catalogue/API and visibly qualification-pending. | Conditional |

### RISK-001 closure requirement
Direct domain calls and central calls must match engineering outputs for retained reference cases. Central orchestration may add metadata/provenance but must not change numerical results or infer design authority from `ok`/PASS.

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + technical findings | `agents/PR_PENDING_workreport.md` | `e298b3c...` |
| 2 | COMPLETE | PR allocation + report synchronization | PR #435 + permanent report | synchronization commits |
| 3 | IN_PROGRESS | Changed-file / repository-state verification | Clean report-only baseline + current API/test inventory | pending |
| 4 | NOT_STARTED | Contract primitives + deterministic registry | constants/errors/units/qualification/registry | pending |
| 5 | NOT_STARTED | Central engine | canonical resolve/validate/calculate/result-freeze | pending |
| 6 | NOT_STARTED | Real production adapters | B31.3 + empirical-weight definitions | pending |
| 7 | NOT_STARTED | Public default API + batch/Sandbox | complete v1 surface | pending |
| 8 | NOT_STARTED | Focused tests/validation | contract/parity/failure/batch/immutability evidence | pending |
| 9 | NOT_STARTED | Reconciliation + closure state | final report + GitHub file reconciliation | pending |

---

## Stage Execution Log

### Stage 1 — Report initialization + technical findings

**Before stage:** v1 contract/roadmap were merged; no central runtime existed.  
**Objective:** establish technical truth/stages before production edits.  
**Scope:** contract, coding rules, domain API boundaries, report only.  
**Rationale:** the first central PR must have real consumers and cannot be speculative infrastructure.  
**Validation plan:** confirm `main`; inspect contract/Common CodingRules.

**After stage:**
- Living report initialized before production edits.
- `main` confirmed at `7a05c78413592dade410595775a9b0f7dd104bf0`.
- Contract v1 and Common CodingRules inspected.
- DEC/RISK/QST/IMP/DEBT items recorded.
- Production untouched.
- **Stage decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization

**Before stage:** branch had only the pending report; PR number absent.  
**Objective:** allocate PR and establish permanent report path.  
**Scope:** PR metadata + report only.  
**Rationale:** handover must be durable before implementation.  
**Validation plan:** verify PR/head/base and production remains untouched.

**After stage:**
- Draft PR #435 created, base `main`, branch `agent/engineering-calc-core`.
- Permanent report `agents/PR435_workreport.md` created.
- Temporary pending report scheduled for removal as Stage 3's first reconciliation action.
- **Stage decision:** COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Before stage**
- **Current truth:** production untouched; permanent and pending report paths temporarily coexist.
- **Objective:** remove pending report and inspect exact current B31.3/empirical APIs, test conventions, and module layout.
- **Expected scope/files:** report rename cleanup; read-only inspection of `converters/b313-*`, `converters/empirical-weight/`, tests/package conventions.
- **Engineering rationale:** adapters must map current APIs, not remembered signatures.
- **Planned implementation:** no production edits until this stage completes.
- **Expected behavior:** branch returns to one report-only changed file before Stage 4.
- **Edge cases:** B31.3 material-design qualification differs from thickness-only; empirical exact/A1/A2/final estimates must remain distinguishable.
- **Planned validation:** GitHub changed-file comparison; exact export/test inspection.
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
Central engine contains no domain equations and does not reinterpret calculator outputs. Registered definitions call domain APIs. Validate with source inspection + direct-vs-central parity.

### DEC-002 — Existing APIs remain first-class
Direct B31.3 and empirical APIs remain supported. Central execution reuses them.

### DEC-003 — Placeholder means unavailable
Pending family definitions, if registered, return stable `ENGINEERING_METHOD_NOT_QUALIFIED`/`ENGINEERING_METHOD_BLOCKED`, no plausible outputs, no PASS.

### Additional invariants
- Results are immutable snapshots.
- Batch invokes the same single-execution path.
- Sandbox invokes the same definition/kernel.
- Caller input/context are not mutated.
- `designAuthority` is explicit and never inferred from success.

---

## 7. Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Contract inspection | PASS | base `7a05c784...` | `docs/APIEngineeringCalcContracts.md` |
| Common CodingRules inspection | PASS | `Common/main` | `CodingRules.md` |
| PR allocation | PASS | report-init head | PR #435 |
| Branch changed-file baseline | NOT_RUN | current | Stage 3 pending |
| Production tests | NOT_RUN | N/A | No production changes |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Central engine contains no domain formulas | NOT_RUN | Await implementation |
| B31.3 direct-vs-central parity | NOT_RUN | Await implementation |
| Empirical direct-vs-central parity | NOT_RUN | Await implementation |
| Qualification fail-closed behavior | NOT_RUN | Await implementation |

### Explicitly Not Validated
FIV/AIV/trunnion/relief/equipment/flange/hazard methods; any authority promotion; full Console UI.

---

## 8. Known / Deferred Work + Forward Sequence

Open risks: RISK-001/002/003. Open question: QST-001. Deferred UI: IMP-001.

Forward sequence after this PR: Engineering Calculation Console → resolve #428–#434 → implement selected qualified vertical family calculators.

---

## 9. Current State vs History
Living sections above are rewritten to latest truth; stage log/closure evidence are append-only.

## 10. Process Notes / Lessons Learned
- A framework-only registry violates v1; B31.3 and empirical must execute through it in this PR.
- Qualification-pending placeholders may advertise unavailability only; never pseudo-engineering outputs.

## 11. Commit and PR Rules
One PR; report before meaningful commits; no CI workflow additions; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Findings requiring changes to domain formulas or unresolved family methods are registered and deferred/blocked rather than silently broadened.

## 13. Coding Rules Applied
Named exports; focused modules; no hidden globals/silent fallback data/unused abstractions/broad refactor/speculative behavior; explicit authority boundaries.

## 14. Action-First Delivery Gate

```text
central public API
→ deterministic registry/engine
→ real B31.3 + empirical adapters
→ single/Sandbox/batch
→ focused parity/failure tests
```

Framework-only metadata is not completion.

---

## Next-Agent Handover

- **Current stopping point:** Stage 2 complete; Stage 3 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / report synchronization in progress.
- **Last completed stage:** Stage 2.
- **Current active stage:** Stage 3.
- **Start here:** remove `agents/PR_PENDING_workreport.md`, compare PR changed files, inspect exact B31.3/empirical exports/test conventions.
- **Do not redo:** contract/CodingRules baseline inspection or PR allocation.
- **Do not assume:** #428–#434 authorize family kernels.
- **Files currently involved:** two report paths until cleanup.
- **Known failing checks:** None known.
- **Validation still required:** all production validation.
- **Open engineering questions:** QST-001.
- **Deferred improvements:** IMP-001.
- **Highest-risk remaining item:** RISK-001.
- **Exact next recommended action:** complete Stage 3 verification before production edits.
- **Required reading:** v1 contract, roadmap, current B31.3/empirical APIs, this report.
