# PR510 — Mechanical T2.3 Facility Candidate Workflow

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
PR: #510
BRANCH: agent/mechanical-t23-facility-stage4
BASE: agent/ei-appendix-b-stage3
BASE_SHA: db64392374c198434c3a8a142fa33ab080160a0c
ENGINEERING_HEAD_VALIDATED: 5065ce67c4346fa132cdd3d49f307d68e54c404e
CURRENT_MAIN_LAST_CHECKED: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCIES: PR #507 master registry + PR #509 Appendix-B/T2.3 candidate masters
COORDINATION: SAFE — no competing Mechanical/T2.3 facility PR found
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: leave PR draft/unmerged; next qualified agent must recheck live head/base before any further mutation
```

## Delivered Capability

Stage 4 turns EI AVIFF T2.3 Mechanical Excitation from `NOT_IMPLEMENTED` into a usable, non-authorizing facility candidate:

```text
facility row
  -> explicit applicability
  -> explicit connected/adjacent equipment sources
  -> PR #509 T2.3 candidate evaluator
  -> maximum baseline LOF + governing source
  -> master provenance
  -> exact-scope cached result
  -> candidate governing tier
```

Authority remains:

```text
FIT        = IMPLEMENTED_SCREENING / SCREENING / AUTHORIZED_BOUNDED
Mechanical = IMPLEMENTED_CANDIDATE_MASTER / CANDIDATE_MASTER / NOT_AUTHORIZED
SBC        = IMPLEMENTED_CANDIDATE_USER_INPUT / CANDIDATE_USER_INPUT / NOT_AUTHORIZED
```

Mechanical/SBC can compete only in `candidateGoverning`; FIT remains the only current `screeningGoverning`. `fullScreeningGoverningEstablished=false`.

## Applicability Contract

```text
no decision / no sources                -> APPLICABILITY_UNKNOWN
explicit no connected/adjacent source   -> NOT_APPLICABLE
sources chosen, evaluation absent/bad   -> APPLICABLE_INCOMPLETE
valid exact-scope candidate              -> CALCULATED_CANDIDATE
```

Empty selection is never silently treated as NOT APPLICABLE.

## T2.3 Numerical Custody

Stage 4 does not duplicate the T2.3 master table. The facility bridge calls:

```text
evaluateEiAviffMechanicalBaselineCandidate(sourceKeys)
```

from PR #509.

Independent EI D2.4 constraint:

```text
centrifugal compressor                    0.2
electric motor / alternator >=15 kW      0.4
governing Mechanical T2.3 LOF            0.4
```

A permanent Stage-4 regression calls the actual Stage-3 evaluator and requires `0.4`.

No TM-09/dynamic-study reduced LOF is applied. The shared-support transfer rule is not a fixed number and direct use fails:

```text
MECHANICAL_T23_SHARED_SUPPORT_REQUIRES_ADJACENT_LOF
```

until adjacent-line LOF is modeled explicitly.

## Scope and Async Integrity

Scope ID:

```text
MECHANICAL-FACILITY/<encoded line>/<encoded case or ->/<encoded canonical ID>
```

Wrong-scope cached candidates return `FACILITY_SCOPE_MISMATCH` and cannot govern.

The UI controller uses per-scope evaluation tokens. Any source/applicability edit invalidates both cached and pending results, so an older asynchronous result cannot overwrite newer input.

## Protected Invariants

- no T2.3 baseline duplication or modification;
- no CANDIDATE master activation;
- no screening/design/master-data promotion;
- Mechanical excluded from `screeningGoverning`;
- FIT screening lifecycle unchanged;
- no shared-support fixed LOF invention;
- no TM-09/dynamic-study reduction;
- wrong-scope candidate fails closed;
- stale Mechanical excluded from current candidate governing;
- explicit NOT APPLICABLE remains distinct from unknown applicability.

## Appendix A

```text
A1 Production trace             20/20
A2 Failure isolation            20/20
A3 Authority / invariant        20/20
A4 Independent validation       19/20
A5 Minimal patch                19/20
TOTAL                            98/100
IMPLEMENTATION_AUTHORITY        GRANTED_FOR_THIS_BOUNDED_STAGE
```

## Backup / Rollback Evidence

Repository backup CLI:

```text
node utils/backup.js save ... = NOT_RUN
reason = connector-only runtime
```

Pre-edit blobs:

```text
converters/vibration/mechanisms/contracts.js
  4748b1470ac704349a212faa7c1b95eac82af4e0
converters/vibration/mechanisms/index.js
  972adc0741aa4b5f358cdcb0380319a63e19e093
tabs/vibration-integrity-mechanisms.js
  c3f79911c2fb9f183d296ee0a674fc199bbd0285
tabs/vibration-integrity-user-data-shell.js
  ebd5880cf2a567701704d08eaac5fae1fc04e274
tabs/vibration-integrity-view.js
  7101c2d2f6eb7d03dc056c16ba8757e6fa2e416d
tests/vibration-mechanism-contract.test.mjs
  32f6cf5c95199648e1d6374c7e3924f2d05efa89
tests/vibration-integrity-mechanism-matrix.test.mjs
  3f7a16b1653d6208d9889d4ce1b0621e6b33f4a0
```

## Changed-File Ledger

Exact parent-to-engineering-head comparison (`db643923...` -> `5065ce67...`):

```text
26 commits ahead
0 behind
16 changed files
```

Files:

```text
agents/PR510_workreport.md
converters/vibration/mechanical/facility.js
converters/vibration/mechanisms/contracts.js
converters/vibration/mechanisms/index.js
converters/vibration/mechanisms/mechanical.js
tabs/vibration-integrity-mechanical-controller.js
tabs/vibration-integrity-mechanical-view.js
tabs/vibration-integrity-mechanisms.js
tabs/vibration-integrity-user-data-shell.js
tabs/vibration-integrity-view.js
tests/vibration-integrity-mechanism-matrix.test.mjs
tests/vibration-mechanical-t23-applicability-stage4.test.mjs
tests/vibration-mechanical-t23-facility-stage4.test.mjs
tests/vibration-mechanical-t23-module-boundaries-stage4.test.mjs
tests/vibration-mechanical-t23-ui-stage4.test.mjs
tests/vibration-mechanism-contract.test.mjs
```

No FIT/AIV/SBC numerical kernel, EI master value, workflow, release manifest or export file is in scope.

## Regression Inventory

- `IMPLEMENTED_CANDIDATE_MASTER` contract acceptance;
- Mechanical catalogue/matrix lifecycle;
- D2.4 real evaluator result = 0.4;
- deterministic scope encoding and mismatch rejection;
- duplicate/empty/unknown source handling;
- shared-support hard stop;
- unknown vs explicit NOT APPLICABLE;
- screening vs candidate governing separation;
- Mechanical vs SBC candidate governing;
- stale result exclusion/retention;
- UI input, NOT APPLICABLE, calculated edit and candidate markers;
- async invalidation architecture;
- new JS <300 lines;
- no local authority activation or dynamic-study reduction implementation.

## Validation Ledger

| Check | Status | Observation | Oracle / limitation |
|---|---|---|---|
| main / #509 parent grounding | PASS | live GitHub | #509 `db643923...`; main `0b03855...` |
| PR #510 structure | PASS | live GitHub | open, draft, mergeable |
| parent comparison | PASS | GitHub compare | 26 ahead / 0 behind / 16 files at `5065ce67...` |
| active Mechanical overlap | PASS | PR search | none found |
| Stage-3 evaluator reuse | PASS | source inspection | no second T2.3 table |
| D2.4 expected LOF | PASS | pinned source inspection | independent 0.4 oracle |
| exact-scope architecture | PASS | source inspection | deterministic/fail-closed |
| authority-tier separation | PASS | source inspection | screening filter unchanged |
| new JS <300 lines | PASS | line-300 GitHub probes returned EOF | repo policy |
| async invalidation | PASS | controller inspection | per-scope tokens invalidated on edits |
| backup CLI | NOT_RUN | connector-only runtime | repo policy limitation |
| focused repository-native Node tests | NOT_RUN | no exact checkout/runtime | tests committed |
| complete repository-native suite | NOT_RUN | no exact checkout/runtime | not claimed |
| browser acceptance | NOT_RUN | browser execution unavailable | source-level UI regressions only |
| hosted workflow runs @ `5065ce67...` | NOT_RUN | GitHub returned `[]` | no run observed |
| hosted status contexts @ `5065ce67...` | NOT_RUN | GitHub returned `[]` | no status observed |
| controlled EI PDF reconciliation | inherited NOT_RUN | #509 remains candidate | no authority promotion |

## Highest Risk

Presentation can make a valid T2.3 baseline appear authoritative. The contract, matrix and UI therefore consistently label Mechanical `CANDIDATE_MASTER`, preserve `screeningAuthority=NOT_AUTHORIZED`, and exclude it from screening governing.

## Next-Agent Handover

Recheck live PR/base/head before mutation. Leave PR draft/unmerged unless the Owner separately authorizes merge. Do not activate #509 masters, consume dynamic-study reductions, implement shared-support transfer without explicit adjacent-line LOF, or promote Mechanical to screening in this stage.
