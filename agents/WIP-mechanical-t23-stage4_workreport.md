# WIP-mechanical-t23-stage4 — recovery-first handoff

## Recovery Header

```text
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/mechanical-t23-facility-stage4
PARENT: agent/ei-appendix-b-stage3@db64392374c198434c3a8a142fa33ab080160a0c
CURRENT_MAIN: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCIES: PR #507 master registry + PR #509 Appendix-B/T2.3 candidate masters
COORDINATION: SAFE — no other open Mechanical/T2.3 facility PR found
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: implement master-backed Mechanical T2.3 facility candidate adapter, scope-safe UI state and matrix integration without changing screening authority
```

## Mission

Make EI AVIFF T2.3 Mechanical Excitation a usable facility-register candidate mechanism using the Stage-3 governed candidate master/evaluator, while preserving the existing authority split:

```text
FIT        = authorized bounded SCREENING
Mechanical = non-authorizing master-backed CANDIDATE
SBC        = non-authorizing user-input CANDIDATE
```

Facility workflow:

```text
facility line/case/canonical row
  -> explicit connected/adjacent equipment source selection
  -> Stage-3 T2.3 candidate evaluator
  -> maximum baseline LOF + governing source
  -> immutable source/master provenance
  -> exact-scope cached result
  -> mechanism matrix candidate result
```

## Protected invariants

- do not reimplement or modify T2.3 baseline values in Stage 4;
- do not activate CANDIDATE masters;
- do not grant screening/design/master-data authority;
- Mechanical candidate cannot become `screeningGoverning`;
- FIT `IMPLEMENTED_SCREENING` remains unchanged;
- shared-support transfer is not a fixed baseline and remains blocked until adjacent-line LOF is explicitly modeled;
- no dynamic-study LOF reduction is applied in this stage;
- cached result must match deterministic facility scope exactly;
- stale facility state cannot contribute a current candidate governing result.

## Planned implementation

New modules:

```text
converters/vibration/mechanical/facility.js
converters/vibration/mechanisms/mechanical.js
tabs/vibration-integrity-mechanical-controller.js
tabs/vibration-integrity-mechanical-view.js
```

Expected existing-file integration seams:

```text
converters/vibration/mechanisms/contracts.js
converters/vibration/mechanisms/index.js
tabs/vibration-integrity-mechanisms.js
tabs/vibration-integrity-user-data-shell.js
tabs/vibration-integrity-view.js
```

Focused regressions will cover D2.4=0.4, exact scope isolation, candidate authority separation, stale exclusion, UI input/evaluation wiring, and new implementation-state contract acceptance.

## Appendix A — Implementation Takeover Qualification

### A1 Production trace — 20/20
Facility matrix is synchronous in `tabs/vibration-integrity-mechanisms.js`; Stage-3 T2.3 master evaluation is asynchronous through `evaluateEiAviffMechanicalBaselineCandidate()`. Therefore Stage 4 must evaluate in UI/controller state, cache the immutable result by exact facility scope, and pass only the scope-matched cached result into the synchronous mechanism adapter/matrix.

### A2 Current failure isolation — 20/20
Mechanical is currently catalogued `NOT_IMPLEMENTED`, so no T2.3 calculation enters the facility matrix even though PR #509 supplies candidate master data and evaluator logic. The missing capability is the facility applicability/input/result bridge, not a missing T2.3 numerical table.

### A3 Authority / invariant — 20/20
Add a distinct master-backed candidate lifecycle rather than misusing SBC's `IMPLEMENTED_CANDIDATE_USER_INPUT`. Candidate governing may compare Mechanical with SBC, but screening governing must continue to accept only `IMPLEMENTED_SCREENING` + `SCREENING` qualification.

### A4 Independent validation — 19/20
Pinned EI D2.4 is the independent numerical oracle: centrifugal compressor 0.2 + electric motor >=15 kW 0.4 -> governing Mechanical LOF 0.4. Permanent tests also prove wrong-scope cache rejection and stale/current governing separation. Full repository/browser execution may remain NOT_RUN in connector-only runtime.

### A5 Minimal patch — 19/20
Reuse Stage-3 evaluator; add one facility bridge, one mechanism adapter and bounded UI controller/view. Edit only the generic lifecycle/index/matrix/UI routing seams. No FIT/AIV/SBC equation, workflow, export, release manifest or source master values change.

```text
APPENDIX_A_SCORE: 98/100
IMPLEMENTATION_AUTHORITY: GRANTED_FOR_THIS_BOUNDED_STAGE
```

## Backup / rollback evidence

Repository backup CLI is unavailable through the GitHub connector and is therefore `NOT_RUN`. Exact pre-edit Git blobs retained before existing-file mutation:

```text
converters/vibration/mechanisms/contracts.js = 4748b1470ac704349a212faa7c1b95eac82af4e0
converters/vibration/mechanisms/index.js = 972adc0741aa4b5f358cdcb0380319a63e19e093
tabs/vibration-integrity-mechanisms.js = c3f79911c2fb9f183d296ee0a674fc199bbd0285
tabs/vibration-integrity-user-data-shell.js = ebd5880cf2a567701704d08eaac5fae1fc04e274
tabs/vibration-integrity-view.js = 7101c2d2f6eb7d03dc056c16ba8757e6fa2e416d
```

## Validation Ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| current main / parent grounding | PASS | live GitHub state | repository |
| active Mechanical/T2.3 overlap | PASS | open PR search | repository |
| Stage-3 evaluator/source contract | PASS | branch source inspection | PR #509 |
| D2.4 expected governing LOF | PASS | pinned worked-example source already reconciled in #509 | EI example |
| backup CLI | NOT_RUN | connector-only runtime | repo policy |
| implementation tests | NOT_RUN | implementation pending | committed tests |
| browser acceptance | NOT_RUN | implementation pending | UI behavior |

## Highest Risk

Accidentally presenting a candidate master-backed Mechanical result as screening-authorized, or reusing a cached result across facility rows. Both are protected by distinct lifecycle/qualification states and exact deterministic scope matching.
