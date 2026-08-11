# Engineering Calculation Core — PR #435 Work Report

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Implement the centralized Engineering Calculation Platform core against `engineering-calculation-contract/v1`, with real B31.3 and empirical-weight consumers and fail-closed placeholders only where family methods remain unqualified. |
| Source task / issue | Owner request 2026-08-11; `docs/APIEngineeringCalcContracts.md`; `docs/APIEngineeringCalcRoadmap.md`; family qualification issues #428–#434 remain separate gates. |
| PR number | #435 |
| Branch | `agent/engineering-calc-core` |
| Base commit | `7a05c78413592dade410595775a9b0f7dd104bf0` |
| Current HEAD | Stage 3 report update commit follows report-rename cleanup head `bfb7930fa65bf59d8cc732bb8f164d6fa905a574` |
| PR status | OPEN / DRAFT |
| Current stage | Stage 4 — Contract primitives + deterministic registry |
| Last completed stage | Stage 3 — Changed-file / repository-state verification |
| Engineering status | Contract frozen; production implementation now authorized to begin |
| Validation status | Baseline/API inspection PASS; production tests NOT_RUN |
| Current blocker | None for central core. Family kernels #428–#434 remain qualification-gated. |
| Exact next action | Implement v1 constants/errors/snapshot helpers, unit normalization, qualification composition, and deterministic registry; then update this report before Stage 5. |

### Handover in 60 Seconds

**What is now true:** PR #435 is allocated and the temporary `PR_PENDING` file has been deleted. Before production edits, the branch was reconciled to one changed file: this report. Exact current B31.3 and empirical-weight APIs/tests were inspected.

**What is being worked on:** Stage 4 central contract primitives and registry.

**What remains unfinished:** engine, real B31.3 adapters, empirical adapter, default public API, batch/Sandbox, optional fail-closed family placeholders, focused tests, final reconciliation.

**What must not be assumed:** #428–#434 authorize numerical FIV/AIV/trunnion/etc. methods. They do not. A placeholder may only be explicitly unavailable.

**Highest-risk remaining item:** `RISK-001` — central orchestration could reinterpret domain outputs or manufacture authority.

**Exact next action:** implement the deterministic registry and shared contract helpers without adding any domain equation.

---

## 1. Mission and Engineering Intent

### Mission
Build the reusable central Engineering Calculation API required by the frozen v1 contract so current/future engineering calculators share one registry, request/result contract, provenance/qualification model, Sandbox/batch route, and discovery surface without duplicating equations.

### Engineering / user consequence
A caller should be able to invoke existing B31.3 or empirical weight through one stable API and receive an immutable, explainable result containing inputs, provenance, authority, outputs, warnings/errors, and evidence metadata. Future families plug into this boundary only after their qualification gates are answered.

### In scope
- deterministic registry;
- v1 constants/errors/snapshot helpers;
- quantity-aware unit normalization;
- structural/physical/applicability resolution hooks;
- provenance + qualification composition;
- immutable result envelope;
- B31.3 thickness adapter;
- B31.3 material-design adapter;
- empirical-weight adapter;
- default registry/public API;
- same-kernel Sandbox/batch;
- explicit unavailable family descriptors only if consumed by the default registry;
- focused parity/failure/contract tests.

### Non-goals
- no new FIV/AIV/trunnion/relief/equipment/flange/hazard numerical kernels;
- no authority promotion;
- no B31.3 formula changes;
- no empirical algorithm changes;
- no CI workflow changes;
- no full Engineering Calculation Console UI.

### Governing principles
1. Engine orchestrates; domain modules own formulas.
2. Existing direct APIs remain supported/reused.
3. No silent engineering defaults/master fallback.
4. Qualification is independent from numerical success.
5. `ok:false` has no plausible authoritative outputs.
6. Sandbox/batch use the same definition/kernel.
7. Results are immutable; calculation does not mutate caller input/context.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report initialized | P0 | DONE | 1 | `e298b3c...` |
| PR allocation + permanent report | P0 | DONE | 2 | PR #435 |
| Changed-file/API baseline verification | P0 | DONE | 3 | pending path removed; domain API/test inspection |
| Registry + contract primitives | P0 | IN_PROGRESS | 4 | Stage 4 started |
| Engine + immutable result orchestration | P0 | NOT_STARTED | 5 | Pending |
| B31.3 thickness adapter | P0 | NOT_STARTED | 6 | Pending |
| B31.3 material-design adapter | P0 | NOT_STARTED | 6 | Pending |
| Empirical-weight adapter | P0 | NOT_STARTED | 6 | Pending |
| Default API + batch/Sandbox | P0 | NOT_STARTED | 7 | Pending |
| Qualification-pending catalogue placeholders | P1 | NOT_STARTED | 7 | Conditional; unavailable only |
| Focused validation | P0 | NOT_STARTED | 8 | Pending |
| Final reconciliation / closure | P0 | NOT_STARTED | 9 | Pending |

---

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Central engine contains orchestration only; formulas remain in domain APIs. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Existing B31.3 and empirical-weight APIs are first real registry consumers. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Qualification-gated placeholders may only fail closed; no numerical placeholder outputs. | Conditional |
| DEC-004 | Decision | P0 | ACCEPTED | Register two explicit B31.3 definitions: `PIPE.B313.THICKNESS` and `PIPE.B313.MATERIAL_DESIGN`; do not hide different authority paths behind one ID. | Yes |
| RISK-001 | Risk | High | ACCEPTED | Central result mapping could reinterpret domain outputs/authority. Thin adapters + parity tests required. | Yes |
| RISK-002 | Risk | High | ACCEPTED | Generic unit conversion can corrupt gauge/absolute or unit-native empirical semantics. Use declared conversion + adapter boundaries. | Yes |
| RISK-003 | Risk | Medium | ACCEPTED | Hidden registry mutation could make construction nondeterministic. Use explicit factory/default registry construction. | Yes |
| QST-001 | Question | P1 | DONE | B31.3 central identity split resolved by DEC-004. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Full Engineering Calculation Console UI follows as a separate PR. | No |
| DEBT-001 | Debt | P2 | ACCEPTED | Unavailable family metadata may exist only if consumed and visibly qualification-pending. | Conditional |
| RISK-004 | Risk | Medium | ACCEPTED | Local runtime cannot clone GitHub (DNS unavailable; `gh` absent), so validation must use connector-authored files plus locally materialized focused modules and GitHub status evidence; do not claim unavailable full-repo runs. | Yes |

### RISK-001 closure requirement
Direct domain calls and central calls must match retained engineering outputs. Central metadata may add provenance/qualification but must not alter numerical results or infer design authority from `ok`/PASS.

---

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + findings | pending report | `e298b3c...` |
| 2 | COMPLETE | PR allocation + report synchronization | PR #435 permanent report | report commits |
| 3 | COMPLETE | Changed-file/API verification | report-only baseline + exact API/test inventory | `bfb7930...` + report update |
| 4 | IN_PROGRESS | Contract primitives + deterministic registry | contracts, units, qualification, registry | pending |
| 5 | NOT_STARTED | Central engine | canonical orchestration/result freeze | pending |
| 6 | NOT_STARTED | Real adapters | two B31.3 + empirical definitions | pending |
| 7 | NOT_STARTED | Default API + batch/Sandbox + optional unavailable catalogue | complete public surface | pending |
| 8 | NOT_STARTED | Focused tests/validation | contract/parity/failure/batch/immutability evidence | pending |
| 9 | NOT_STARTED | Reconciliation + closure state | final report + GitHub file reconciliation | pending |

---

## Stage Execution Log

### Stage 1 — Report initialization + technical findings
- Contract/roadmap were already merged; no central runtime existed.
- Living report created before production edits.
- `main` verified at `7a05c78413592dade410595775a9b0f7dd104bf0`.
- Common CodingRules and v1 contract inspected.
- Production untouched.
- **Decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization
- Draft PR #435 created.
- Permanent report `agents/PR435_workreport.md` created.
- Temporary pending report subsequently removed.
- **Decision:** COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Before stage**
- Production untouched; two report paths temporarily existed.
- Objective: reconcile to one report and inspect exact domain APIs/tests before coding.
- Planned validation: changed-file baseline + B31.3/empirical export/test inspection.

**Implementation / inspection performed**
- Deleted `agents/PR_PENDING_workreport.md`; branch baseline reduced to permanent report only.
- Inspected `converters/b313-material-factors/index.js`: existing `resolveB313DesignFactors()` and `calculateB313MaterialDesign()` already compose material factors, thickness, and optional commercial wall selection.
- Inspected `converters/b313-thickness/b313-straight-pipe.js`: direct thickness API owns unit normalization, applicability, equation trace, tolerances, and optional provided-wall assessment.
- Inspected `converters/empirical-weight/empirical-weight-estimator.js`: estimator already owns exact, A1, A2, final fallback, model/master injection, and failure semantics.
- Inspected empirical model validation metrics and current `tests/b313-material-factors.test.mjs` test conventions.
- `package.json` has no test script; focused `.mjs` tests are invoked directly.
- Local `git clone` cannot run because container DNS cannot resolve GitHub; `gh` is not installed. Recorded RISK-004 rather than claiming full-repo execution.

**Changed files**
- report rename/cleanup only; no production file changed during Stage 3.

**Deviations**
- Temporary report was first emptied then deleted due connector operation sequence; final branch has no pending report path.

**Validation performed**
| Check | Result | Evidence / Notes |
|---|---|---|
| Base/main SHA | PASS | `7a05c784...` |
| Permanent report / PR | PASS | #435 |
| Pending report removed | PASS | delete commit `bfb7930...` |
| Exact B31.3 API inspection | PASS | current branch source |
| Exact empirical API inspection | PASS | current branch source |
| Full local repo clone/test | NOT_RUN | DNS unavailable; `gh` absent |

**Issues/decisions discovered**
- QST-001 resolved as DEC-004: two separate B31.3 definitions.
- RISK-004 recorded for local validation environment.

**Stage decision:** COMPLETE.

**Handover delta:** production coding is now authorized; Stage 4 starts with generic contract/registry modules only.

### Stage 4 — Contract primitives + deterministic registry

**Before stage**
- **Current truth:** no production code yet; exact domain boundaries verified.
- **Objective:** implement reusable contract constants, error/snapshot helpers, unit conversion, qualification composition, and deterministic registry.
- **Expected scope/files:** `converters/engineering-calculations/contracts.js`, `units.js`, `qualification.js`, `registry.js`.
- **Engineering rationale:** these are common platform responsibilities explicitly frozen by v1 and do not own domain formulas.
- **Planned implementation:** stable contract/family/state constants; deep snapshot/freeze; quantity conversion; deterministic definition validation/registration/listing.
- **Expected behavior:** duplicate/invalid definitions fail during registration; valid definitions are immutable; no hidden import-order registry mutation.
- **Edge cases:** affine temperature conversion; gauge/absolute semantics must not be silently interchanged; duplicate field keys; blocked/retired qualification.
- **Planned validation:** `node --check`; focused local registry/unit tests using self-contained fake definitions; later integration tests on branch.
- **Known risks:** over-generalizing units or qualification semantics beyond v1.

---

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR435_workreport.md` | 2 | 4 | Living PR state/handover | No | Current |

`agents/PR_PENDING_workreport.md` was temporary Stage 1/2 state and is deleted; it must not appear in final GitHub changed files.

---

## 6. Engineering Decisions and Invariants

### DEC-001 — Orchestration is not engineering authority
No central domain equations or output reinterpretation. Validate with source review/parity tests.

### DEC-002 — Existing APIs remain first-class
Direct B31.3/empirical APIs remain supported; central definitions reuse them.

### DEC-003 — Placeholder means unavailable
Any pending family descriptor returns stable blocked/not-qualified failure, no plausible outputs or PASS.

### DEC-004 — Separate B31.3 authority paths
`PIPE.B313.THICKNESS` = direct caller-factor path. `PIPE.B313.MATERIAL_DESIGN` = governed material-factor resolution + optional wall selection. Both reuse existing domain APIs.

### Additional invariants
- immutable result snapshots;
- batch invokes single engine per item;
- Sandbox invokes same definition/kernel;
- caller input/context are not mutated;
- `designAuthority` is explicit, never inferred from numerical success.

---

## 7. Validation and Evidence Ledger

### Software Validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Contract inspection | PASS | base | v1 contract |
| Common CodingRules inspection | PASS | external | Common repo |
| PR/report baseline | PASS | `bfb7930...` | #435 + pending report deleted |
| Domain API inspection | PASS | `bfb7930...` | B31.3 + empirical current sources |
| Production syntax/tests | NOT_RUN | N/A | Stage 4 just starting |

### Engineering Validation
| Property | Status | Evidence |
|---|---|---|
| Central engine has no domain formulas | NOT_RUN | Await implementation |
| B31.3 direct-vs-central parity | NOT_RUN | Await Stage 6/8 |
| Empirical direct-vs-central parity | NOT_RUN | Await Stage 6/8 |
| Qualification fail-closed | NOT_RUN | Await implementation |

### Explicitly Not Validated
FIV/AIV/trunnion/relief/equipment/flange/hazard numerical methods; authority promotion; full Console UI.

---

## 8. Known / Deferred Work + Forward Sequence
Open risks: RISK-001/002/003/004. QST-001 closed by DEC-004. Deferred UI: IMP-001.

Forward sequence after this PR: Console → resolve #428–#434 → selected vertical family kernels.

## 9. Current State vs History
Mission Control/register/roadmap/ledgers/handover are living. Stage log/closure evidence are append-only.

## 10. Process Notes / Lessons Learned
- First central PR must execute real existing domain APIs; framework-only registration is not acceptable.
- The B31.3 direct-factor path and material-resolved path have different authority/provenance and should not share one ambiguous calculation definition.
- Local infrastructure limitations must be recorded as NOT_RUN, not converted to PASS.

## 11. Commit and PR Rules
One PR; report before meaningful commits; no CI workflow additions; no merge without Owner instruction.

## 12. Unexpected Findings / Stop Conditions
Any required domain formula or unresolved family-method change is registered and deferred/blocked rather than silently broadened.

## 13. Coding Rules Applied
Named exports; focused modules; no hidden globals/fallback data/unused abstractions/broad refactor/speculative behavior; explicit authority boundaries.

## 14. Action-First Delivery Gate
```text
central public API
→ deterministic registry/engine
→ real B31.3 + empirical adapters
→ single/Sandbox/batch
→ focused parity/failure tests
```

---

## Next-Agent Handover
- **Current stopping point:** Stage 3 complete; Stage 4 active.
- **PR / branch / HEAD:** #435 / `agent/engineering-calc-core` / Stage 3 cleanup head `bfb7930...` plus this report update.
- **Last completed stage:** Stage 3.
- **Current active stage:** Stage 4.
- **Start here:** create the four Stage 4 common modules; do not touch domain formulas.
- **Do not redo:** contract/API baseline inspection.
- **Do not assume:** family issues authorize numerical kernels.
- **Files currently involved:** report only before Stage 4 production files are created.
- **Known failing checks:** none; full repo tests NOT_RUN due environment.
- **Validation still required:** all core/adapter/integration validation.
- **Open engineering questions:** none blocking.
- **Deferred improvements:** IMP-001.
- **Highest-risk remaining item:** RISK-001.
- **Exact next recommended action:** implement/validate deterministic registry and common v1 primitives.
- **Required reading:** v1 contract + this report; current domain sources only when Stage 6 starts.
