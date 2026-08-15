# WIP-hp-ch9-r1 — Chapter IX CORE Static Slice Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: NOT_APPLICABLE

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner instruction 2026-08-15 — follow Engineering PR Delivery; start qualified implementation from revised HP recommendation
PR_OR_WIP: WIP-hp-ch9-r1
BRANCH: agent/hp-ch9-core-static-r1

PR_HEAD_OBSERVED: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
REPORT_BASIS_HEAD: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
MAIN_HEAD_LAST_CHECKED: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
MERGE_BASE: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-001
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: PLAN / PRE-IMPLEMENTATION
LAST_COMPLETED_STAGE: BASELINE + COORDINATION CHECK
CURRENT_BLOCKER: NONE
HIGHEST_RISK: accidental promotion of unverified Code/master authority
LAST_DURABLE_CHECKPOINT: initial WIP report on exact current main

EXACT_NEXT_ACTION: implement the smallest central Chapter IX straight-pipe static adapter using the merged bounded formula path, expose explicit BENCHMARK_ONLY/non-design-authority qualification, and add independent frozen regression/guard tests without importing Advanced_Analysis production-looking masters.
```

## 2. Handover in 60 Seconds

### What is now true
- Live `main` was re-grounded at `e97effb06ff9bfcad5ea87381abaa9f2665c1bdd` before mutation.
- Current repo instructions and the pinned Common Engineering PR Delivery skill were read.
- Work is `ENGINEERING_CRITICAL` because it affects Code calculation authority and central engineering execution.
- Open-PR review found no active HP/Chapter-IX overlap; coordination is `SAFE`.
- Historical PR439 confirms the HP browser workspace exists but is not in the central calculation registry and controlled material/product rows remained intentionally incomplete.
- Advanced_Analysis `docs/High Pr` is specification/seed evidence only for this slice; its production-looking `APPROVED/QUALIFIED` records are not imported or promoted.

### What is currently being worked on
A bounded R1 CORE slice: central API execution of the already-merged Chapter IX straight-pipe pressure/static formulas, with frozen regression evidence and explicit non-authoritative qualification.

### What remains unfinished
- production code and focused tests;
- local reconstructed execution of new pure module/tests;
- central-registry source reconciliation;
- draft PR allocation and report migration;
- CI status inspection.

### What has been proven
- existing central registry currently has no Chapter IX adapter;
- existing HP app formula path is bounded straight-pipe pressure/static logic;
- historical NPS 4 regression values exist but are software-regression values, not licensed Code qualification.

### What has NOT been proven / NOT_RUN
- licensed B31.3-2024 formula reconciliation;
- licensed VIII-3 KD fatigue route;
- production master authority;
- CAESAR parity;
- browser E2E;
- current branch CI.

### What must not be assumed
- Advanced_Analysis `APPROVED`, `QUALIFIED`, `ACTIVE`, or component `PREQUALIFIED` labels confer authority in 3D_Converters;
- seeded fatigue curves/envelopes are correct;
- software regression equals Code qualification;
- a default wall tolerance or material allowable may be invented.

### Highest-risk remaining item
`RISK-001`: central API must not make the new calculation appear design-authoritative before licensed method/master verification.

### Exact next action
Implement production adapter + focused regression/guard tests only.

## 3. Repository Ground Truth

```text
verified_at: 2026-08-15T19:09+04:00 session window
main: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
branch: agent/hp-ch9-core-static-r1
PR: not allocated
merge base: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
open HP/Chapter-IX PR overlap: none observed
agents/MASTER_INDEX.md on main: absent
repo policies: AGENTS.md + .agents/AGENTS.md read
```

## 4. Mission / Scope / Acceptance

Mission: move the existing bounded Chapter IX straight-pipe static calculation from an iframe-only application into the central Engineering Calculation Platform without promoting unverified engineering authority.

Approved scope:
- add a Chapter IX central adapter for straight-pipe static pressure design/rating only;
- reuse the existing merged mathematical formulation, not a new Code interpretation;
- explicitly report `BENCHMARK_ONLY`, `designAuthority=false`, and Code verification blocker reasons;
- add frozen NPS 4 software-regression values plus guard cases;
- register the adapter centrally;
- preserve all ordinary B31.3 behavior.

Explicit non-goals:
- no fatigue-curve/KD-3 automation;
- no Advanced_Analysis master import;
- no component/B31J/FEA qualification;
- no CAESAR mapping;
- no UI redesign;
- no workflow changes;
- no merge.

Acceptance:
1. central API lists and executes bounded Chapter IX static calculations;
2. NPS 4 frozen regression reproduces expected wall/rating values within fixed numerical tolerance;
3. invalid effective wall/tolerance/domain inputs fail closed;
4. result qualification cannot be interpreted as design authority;
5. no existing B31.3 definition is weakened or reinterpreted.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Chapter IX static kernel/adapter | NOT_STARTED | NOT_STARTED | NOT_RUN | planned under `converters/engineering-calculations/adapters/` | implement |
| central registry | NOT_STARTED | NOT_STARTED | NOT_RUN | `default-registry.js` | register |
| focused tests | NOT_STARTED | N/A | NOT_RUN | `tests/` | add |
| HP browser app | EXISTING | EXISTING | historical only | `engineering/hp-class-standardization/` | unchanged |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| IMP-001 | implementation | HIGH | P0 | OPEN | expose bounded Chapter IX static calculation through central API | current registry source | yes |
| RISK-001 | authority | CRITICAL | P0 | OPEN | new API could be mistaken for Code/design authority | repo qualification model | yes |
| RISK-002 | provenance | CRITICAL | P0 | OPEN | Advanced_Analysis seeded masters contain unverified/placeholder-looking authority records | source inspection | no import |
| DEC-001 | scope | HIGH | P0 | ACCEPTED | R1 slice is static straight pipe only; fatigue/components deferred | owner revised recommendation | yes |
| DEC-002 | validation | CRITICAL | P0 | ACCEPTED | frozen regression proves software behavior only; licensed Code qualification remains separate | attached audit + skill rules | yes |
| QST-001 | authority | HIGH | P1 | OPEN | exact licensed method manifest/source pairing still requires independent verification before authority promotion | not yet available | later |

## 7. Current Technical Diagnosis

```text
Observed symptom: Chapter IX HP calculation remains outside the central engineering-calculation registry.
Current hypothesis: a small adapter can expose the already-merged bounded static formulation without changing engineering mechanics.
Supporting evidence: existing HP app contains pure straight-pipe pressure wall/rating functions; central registry has no Chapter IX adapter.
Alternative hypotheses: first central integration might require a separate domain kernel rather than adapter-local functions.
Already ruled out: modifying ordinary PIPE.B313.THICKNESS to accept Chapter IX; it explicitly belongs to a different method boundary.
Falsifier: if central-engine contracts cannot represent the bounded result without misleading authority or duplicated mechanics, stop and extract a dedicated pure domain kernel first.
Next isolating experiment: implement a minimal adapter definition and run focused regression/guard tests against frozen expected values.
```

## 8. Authority and Invariants

Authority chain for this PR:
`owner scope -> current repository source -> frozen independent software-regression constants -> new adapter -> central result contract`.

Protected invariants:
- no Code-compliance/design-authority claim;
- no guessed/default material/tolerance values;
- no fatigue/KD-3/component authority;
- ordinary B31.3 adapter unchanged;
- SI canonical units: mm and MPa;
- invalid geometry/effective wall fails closed;
- regression expected values are fixed and must not be regenerated from production output.

## 9. Current Validation

```text
ID: VAL-001
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
Command/evidence: live GitHub inspection of default registry and HP source
Expected: no Chapter IX central adapter
Actual: no Chapter IX central adapter present
Limitations: source-state finding only
Origin: PREEXISTING
```

```text
ID: VAL-002
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: ANALYTICAL
Tested HEAD: pending
Command/evidence: focused Chapter IX regression suite
Expected: NPS4 static regression exact within fixed tolerance
Actual: NOT_RUN
Limitations: implementation not yet written
Origin: INTRODUCED_BY_PR
```

## 10. Changed-File Ledger

| File | Intended? | First stage | Latest stage | Purpose | Sensitive? | Validation |
|---|---:|---|---|---|---:|---|
| `agents/WIP-hp-ch9-r1_workreport.md` | yes | baseline | baseline | recovery authority | no | source inspection |

Actual branch file count: 1. Ledger count: 1. Unexplained files: 0.

## 11. Review / CI State

PR not yet allocated. Branch CI NOT_RUN. No review threads.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: absent on current main
STATUS_RECORD: WIP report only
CLAIM_RECORD: WIP report only
LAST_OVERLAP_CHECK: live open PR search before branch creation
FILE_OVERLAP: none observed for HP/Chapter-IX paths
AUTHORITY_OVERLAP: none observed
DEPENDENCY_OVERLAP: central registry is shared infrastructure; no active PR observed targeting Chapter IX registration
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: current main + this WIP report
Exact file/function/component: central engineering calculation adapter layer
Current value/path under investigation: absence of Chapter IX definitions from default-registry.js
Do not redo: Advanced_Analysis schema design review
Do not change: ordinary B31.3 mechanics, fatigue routes, component qualification, workflows
Validation still required: focused module execution, registry integration, current-head CI status
Highest-risk remaining item: authority promotion ambiguity
Exact next action: implement bounded static adapter and regression tests
```

## 14. Takeover / Custody Chain

`GE-001`: fresh current-main grounding; no takeover.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

```text
PR_HEAD: WIP on e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
MAIN_HEAD: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
GROUNDING_EPOCH: GE-001
Generated from OPEN ISS/RISK/QST: RISK-001, RISK-002, QST-001
PARTIAL implementation: none yet
NOT_RUN validation: focused regression, registry integration, CI
Next intended stage: central static adapter
APPENDIX_A_STATUS: CURRENT
```

A1 Production Trace (20): trace `calculateEngineering()` from registry lookup through input resolution to adapter output, and identify the exact point where Chapter IX should enter without modifying ordinary B31.3 semantics.

A2 Current Failure Isolation (20): prove on current main that the HP calculator is not an active central definition and identify the minimal files required to change that fact.

A3 Authority / Invariant (20): show how `qualification.method`, `qualification.data`, `effective`, `designAuthority`, definition `authority`, and `codeCompliance` must be set so software regression cannot be mistaken for design authority.

A4 Independent Validation (20): independently reproduce the frozen NPS 4 pressure wall/minimum manufactured wall/pressure rating values and define fixed tolerances without reading production output.

A5 Next-Commit / Minimal Patch (20): specify the smallest implementation/test/registry patch that exposes the static calculation while leaving fatigue, UI, masters, workflows, and ordinary B31.3 untouched.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- GE-001 baseline and coordination completed.
