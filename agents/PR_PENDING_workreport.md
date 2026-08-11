# Engineering Calculation Core — Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed placeholders only where family methods remain unqualified. |
| Source task / issue | Owner request 2026-08-11; governed by `docs/APIEngineeringCalcContracts.md` and `docs/APIEngineeringCalcRoadmap.md`; family qualification issues #428–#434 remain separate gates. |
| PR number | PENDING |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | pending this report commit |
| PR status | Not yet allocated |
| Current stage | Stage 2 — PR allocation + report synchronization |
| Last completed stage | Stage 1 — Report initialization + technical findings |
| Engineering status | Contract frozen; central runtime not yet implemented |
| Validation status | Contract/repository inspection only; production tests NOT_RUN |
| Current blocker | None for central core. Family kernels #428–#434 remain qualification-gated. |
| Exact next action | Create draft PR, rename this report to `agents/PR<NUMBER>_workreport.md`, then verify actual branch changed files before production coding. |

### Handover in 60 Seconds

**What is now true:** `engineering-calculation-contract/v1` is merged on `main` at base `7a05c784...`; a new branch exists for the central core. Existing B31.3 and empirical-weight APIs are the required first real consumers.

**What is currently being worked on:** PR allocation and report synchronization only. No production file has been changed yet.

**What remains unfinished:** registry, engine, units, validation/provenance/qualification helpers, default registry, B31.3 adapter, empirical-weight adapter, batch/Sandbox execution, focused tests, and optional explicit pending-family descriptors.

**What must not be assumed:** family issues #428–#434 do not authorize numerical FIV/AIV/trunnion/etc. kernels; placeholders must never emit plausible engineering outputs or PASS/FAIL.

**Highest-risk remaining item:** `RISK-001` — central orchestration could accidentally become an engineering authority or silently reinterpret domain API outputs.

**Exact next recommended action:** allocate the PR number, rename the report, verify the clean one-file diff, then implement the central registry/engine with existing domain APIs as real consumers.

---

## 1. Mission and Engineering Intent

### Mission

Build the reusable central Engineering Calculation API required by the frozen v1 contract so that current and future engineering calculators share one deterministic registry, request/result contract, provenance/qualification model, batch/Sandbox execution path, and UI-discovery surface without duplicating engineering equations.

### Engineering / user consequence

A caller should be able to invoke B31.3 or empirical weight through one stable API and receive an immutable, explainable result containing inputs, provenance, authority, outputs, warnings/errors, and evidence metadata. Future vibration/support/relief/etc. calculators should plug into that same orchestration boundary after their method-specific qualification issues are answered.

### Scope

- central calculation registry;
- orchestration engine;
- contract/version/error helpers;
- quantity-aware unit normalization required by current registered calculators;
- structural/physical/applicability validation hooks;
- canonical immutable result envelope;
- method/data/effective qualification composition;
- batch and Sandbox modes using the same kernels;
- default production registry;
- real `PIPE.B313.THICKNESS` / material-design adapter using existing B31.3 APIs;
- real `ESTIMATION.WEIGHT.EMPIRICAL` adapter using existing empirical-weight API;
- focused contract/integration tests;
- optional explicit metadata placeholders for qualification-gated families only if they are production-consumed as unavailable catalogue entries and fail closed.

### Governing principles

1. The engine orchestrates; domain modules own formulas.
2. Existing direct APIs remain supported and are reused, not copied.
3. No silent engineering defaults or master fallbacks.
4. Qualification is separate from numerical execution.
5. `ok:false` never returns plausible-looking authoritative outputs.
6. Sandbox and batch use the same registered definitions/kernels.
7. Results are immutable snapshots.
8. Context is read-only.

### Explicit non-goals

- implementing FIV, AIV, trunnion, relief, flange, equipment, blast, or other unresolved family kernels;
- promoting any method/data qualification level;
- changing B31.3 equations or empirical-weight algorithms;
- adding CI workflows;
- building the full Engineering Calculation Console UI in this PR unless needed only for a minimal real consumer (the central public API itself is the primary production consumer boundary for this core PR).

### Important constraints

- Contract authority: `docs/APIEngineeringCalcContracts.md` (`engineering-calculation-contract/v1`).
- Family qualification issues #428–#434 remain authoritative gates.
- Repository coding rules from `reallaksh19/Common/CodingRules.md` apply.
- No hidden singleton mutation by import order.
- Named exports; small focused modules where practical.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report / handover | P0 | DONE | 1 | This file |
| PR allocation + report rename | P0 | IN_PROGRESS | 2 | Pending |
| Changed-file baseline verification | P0 | NOT_STARTED | 3 | Pending |
| Registry + contract primitives | P0 | NOT_STARTED | 4 | Pending |
| Engine + immutable result orchestration | P0 | NOT_STARTED | 5 | Pending |
| B31.3 production adapter | P0 | NOT_STARTED | 6 | Pending |
| Empirical-weight production adapter | P0 | NOT_STARTED | 6 | Pending |
| Batch/Sandbox/default registry | P0 | NOT_STARTED | 7 | Pending |
| Qualification-gated placeholder catalogue | P1 | NOT_STARTED | 7 | Only if useful without violating no-unused-module rule |
| Focused validation | P0 | NOT_STARTED | 8 | Pending |
| Final file reconciliation / closure | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine contains orchestration only; formulas remain in domain APIs. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3 and empirical-weight APIs are the first real registry consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Qualification-gated families may only appear as explicit unavailable placeholders that fail closed; no numerical placeholder outputs. | Yes, optional |
| RISK-001 | Risk | High | ACCEPTED | Central result mapping could accidentally reinterpret domain outputs or authority. Mitigation: thin adapters + retained raw domain result/evidence. | Yes |
| RISK-002 | Risk | High | ACCEPTED | Global unit conversion could change domain semantics, especially gauge/absolute pressure and empirical native-unit constants. Mitigation: adapters declare canonical units and delegate method-specific conversions where necessary. | Yes |
| RISK-003 | Risk | Medium | ACCEPTED | Hidden default registry mutation could make registration order nondeterministic. Mitigation: explicit registry construction and frozen default registry. | Yes |
| QST-001 | Question | P1 | INVESTIGATING | Whether the B31.3 central ID should expose thickness-only or material-design+wall selection as one definition. Contract names `PIPE.B313.THICKNESS`; adapter should preserve optional material/wall behavior without changing formula authority. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Full Engineering Calculation Console UI should follow core API as a separate vertical PR per roadmap. | No |
| DEBT-001 | Debt | P2 | ACCEPTED | Placeholder family catalogue, if added, carries metadata only and must stay visibly unavailable until qualification issues close. | Yes, conditional |

### Significant item detail — RISK-001

- **Affected components:** central engine, adapters, result envelope.
- **Engineering consequence:** a central wrapper could falsely manufacture PASS/FAIL, design authority, or altered engineering outputs.
- **Chosen resolution:** adapters map domain results mechanically, retain raw domain result in evidence when requested, and qualification is composed from declared method state + resolved data authority rather than inferred from numeric success.
- **Validation required:** adapter parity tests comparing direct domain API outputs to central outputs; failed domain results must remain failed.

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + technical findings | `agents/PR_PENDING_workreport.md` | report init |
| 2 | IN_PROGRESS | PR allocation + report synchronization | Draft PR + renamed report | pending |
| 3 | NOT_STARTED | Changed-file / repository-state verification | Confirm report-only baseline and current domain API shapes | pending |
| 4 | NOT_STARTED | Contract primitives + deterministic registry | registry, contract constants, error/qualification helpers | pending |
| 5 | NOT_STARTED | Central engine | resolve/validate/calculate/result-freeze orchestration | pending |
| 6 | NOT_STARTED | Real production adapters | B31.3 + empirical-weight registered definitions | pending |
| 7 | NOT_STARTED | Default registry + batch/Sandbox + optional unavailable catalogue | public API complete | pending |
| 8 | NOT_STARTED | Focused tests / validation | contract, parity, failure, batch, immutability tests | pending |
| 9 | NOT_STARTED | Reconciliation + PR closure state | final report / changed-file reconciliation | pending |

---

## Stage Execution Log

### Stage 1 — Report initialization + technical findings

**Before stage**

- **Current truth:** contract/roadmap are merged; no central runtime exists.
- **Objective:** establish current technical truth and implementation stages before production edits.
- **Scope:** docs/contracts, current B31.3 and empirical public API boundaries, work-report protocol.
- **Engineering rationale:** central framework must be grounded in existing production consumers and frozen contract, not speculative abstractions.
- **Planned implementation:** report only.
- **Expected behavior:** no production behavior changes.
- **Edge cases:** unresolved family kernels must not be smuggled into this PR as fake calculations.
- **Planned validation:** confirm `main` SHA; inspect contract; inspect repository coding rules.
- **Known risks:** scope creep into family engineering methods.

**After stage**

- **Implementation performed:** initialized living report and staged implementation plan.
- **Changed files:** this report only.
- **Deviations:** none.
- **Validation:** contract v1 and Common CodingRules inspected; `main` confirmed at `7a05c784...` before branch creation.
- **Issues discovered:** RISK-001/002/003, QST-001, IMP-001, DEBT-001 recorded.
- **Stage decision:** COMPLETE.
- **Handover delta:** production remains untouched; next stage allocates PR and synchronizes report filename/metadata.

---

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living PR report / handover | No | Created before production edits |

---

## 6. Engineering Decisions and Invariants

### DEC-001 — Orchestration is not engineering authority

**Invariant:** the central engine must not contain or reproduce B31.3/FIV/trunnion/etc. equations.  
**Enforced in:** module boundaries; registered definitions call domain kernels.  
**Validation:** source inspection + adapter parity tests.  
**PR effect:** establishes this boundary in production.

### DEC-002 — Existing domain APIs remain first-class

**Invariant:** direct B31.3 and empirical-weight APIs remain supported and central calculation calls reuse them.  
**Validation:** direct-vs-central parity tests.

### DEC-003 — Placeholder means unavailable, never zero

**Invariant:** a qualification-pending calculator must return a stable failure such as `ENGINEERING_METHOD_NOT_QUALIFIED` / `ENGINEERING_METHOD_BLOCKED`, with no plausible output values and no PASS assessment.  
**Validation:** placeholder failure test if placeholders are registered.

### Additional invariants

- Result snapshots are deeply frozen or otherwise immutable at the public boundary.
- Batch executes single-engine path per item.
- Sandbox executes same definition/kernel and may only vary explicitly injected/candidate inputs/context/options.
- Calculation must not mutate caller input/context.
- `designAuthority` is explicit and never inferred from `ok` or PASS alone.

---

## 7. Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Contract inspection | PASS | base `7a05c784...` | `docs/APIEngineeringCalcContracts.md` reviewed |
| CodingRules inspection | PASS | external `Common/main` | `CodingRules.md` reviewed |
| Production syntax/tests | NOT_RUN | N/A | No production changes yet |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Central engine contains no domain formulas | NOT_RUN | Await implementation/source review |
| B31.3 direct-vs-central parity | NOT_RUN | Await implementation |
| Empirical direct-vs-central parity | NOT_RUN | Await implementation |
| Qualification fail-closed behavior | NOT_RUN | Await implementation |

### Explicitly Not Validated

- FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods.
- Any promotion of engineering authority.
- Full Console UI behavior.

---

## 8. Known Issues, Improvements, and Deferred Scope

- **Open defects:** none known before implementation.
- **Deferred improvements:** IMP-001 Engineering Calculation Console.
- **Open risks:** RISK-001/002/003.
- **Open questions:** QST-001.
- **Accepted debt:** DEBT-001 only if unavailable catalogue descriptors are useful in this PR.

### Recommended Forward Sequence

1. Complete central core with B31.3 + empirical weight real consumers.
2. Add the Engineering Calculation Console as the next PR, driven only by registry/catalogue metadata.
3. Resolve family qualification issue answers (#428–#434).
4. Implement one qualified vertical family calculator at a time, starting with the selected highest-value method.

---

## 9. Current State vs History

Living sections above must be rewritten as truth changes. Stage Execution Log and closure evidence are append-only.

---

## 10. Process Notes / Lessons Learned

- A framework-only registry would violate the frozen contract; real existing domain consumers are mandatory in the first implementation.
- Qualification-pending placeholders are acceptable only as explicit unavailability metadata/failures, not as numerical stand-ins.

---

## 11. Commit and PR Rules

- One PR for this assignment.
- Report updated before meaningful commits.
- No `.github/workflows/*` changes.
- No merge without explicit Owner instruction.

---

## 12. Unexpected Findings / Stop Conditions

Any finding that would require changing B31.3 equations, empirical-weight algorithms, or unresolved family engineering methods must be registered and either deferred or blocked rather than silently broadened.

---

## 13. Coding Rules Applied

Named exports, focused modules, no hidden globals, no silent fallback data, no unused abstractions, no broad refactor, no speculative production behavior, and authority boundaries remain explicit.

---

## 14. Action-First Delivery Gate

Required vertical path for this PR:

```text
central public API
→ deterministic registry/engine
→ real B31.3 + empirical-weight production adapters
→ executable single/Sandbox/batch calls
→ focused parity/failure tests
```

Framework-only metadata without real calculator execution is not completion.

---

## Next-Agent Handover

- **Current stopping point:** Stage 1 complete; Stage 2 pending PR allocation.
- **PR / branch / HEAD:** PR PENDING; `agent/engineering-calc-core`; base `7a05c784...`; report commit to be recorded after creation.
- **Last completed stage:** Stage 1.
- **Current active stage:** Stage 2.
- **Start here:** create draft PR from `agent/engineering-calc-core` to `main`, obtain PR number, rename this file and update Mission Control.
- **Do not redo:** contract/CodingRules baseline inspection.
- **Do not assume:** family issues authorize numerical kernels; they do not.
- **Files currently involved:** this report only.
- **Known failing checks:** None known.
- **Validation still required:** all production validation.
- **Open engineering questions:** QST-001.
- **Deferred improvements:** IMP-001.
- **Highest-risk remaining item:** RISK-001.
- **Exact next recommended action:** allocate PR and synchronize report, then verify baseline changed files.
- **Required reading:** `docs/APIEngineeringCalcContracts.md`, relevant sections of `docs/APIEngineeringCalcRoadmap.md`, existing `converters/b313-*`, `converters/empirical-weight/`, and this report.
