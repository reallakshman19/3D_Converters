# WIP-mechanical-t23-stage4 — recovery-first handoff

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_PR_ALLOCATION
PR_RECOVERY_STATE: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/mechanical-t23-facility-stage4
PARENT: agent/ei-appendix-b-stage3@db64392374c198434c3a8a142fa33ab080160a0c
CURRENT_MAIN_LAST_CHECKED: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCIES: PR #507 master registry + PR #509 Appendix-B/T2.3 candidate masters
COORDINATION: SAFE — no other open Mechanical/T2.3 facility PR found
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: allocate draft PR on top of agent/ei-appendix-b-stage3, convert this report to agents/PR<NUMBER>_workreport.md, then perform exact-head hosted-status reconciliation
```

## Mission / Delivered Capability

Stage 4 turns EI AVIFF T2.3 Mechanical Excitation from a `NOT_IMPLEMENTED` facility slot into a usable, non-authorizing master-backed candidate mechanism.

```text
facility line/case/canonical row
  -> explicit T2.3 applicability decision
  -> explicit connected/adjacent equipment source selection
  -> PR #509 evaluateEiAviffMechanicalBaselineCandidate()
  -> maximum baseline LOF + governing source
  -> immutable candidate-master provenance
  -> exact-scope cached result
  -> mechanism matrix candidate tier
```

Authority remains separated:

```text
FIT        = IMPLEMENTED_SCREENING / SCREENING / AUTHORIZED_BOUNDED
Mechanical = IMPLEMENTED_CANDIDATE_MASTER / CANDIDATE_MASTER / NOT_AUTHORIZED
SBC        = IMPLEMENTED_CANDIDATE_USER_INPUT / CANDIDATE_USER_INPUT / NOT_AUTHORIZED
```

`screeningGoverning` accepts FIT screening only. `candidateGoverning` may compare Mechanical and SBC candidates. `fullScreeningGoverningEstablished` remains false.

## Applicability states

Mechanical facility applicability is explicit rather than inferred:

```text
no decision / no sources
  -> APPLICABILITY_UNKNOWN

explicit “no connected or adjacent T2.3 source”
  -> NOT_APPLICABLE

sources selected but not evaluated / invalid cached result
  -> APPLICABLE_INCOMPLETE

valid exact-scope cached master result
  -> CALCULATED_CANDIDATE
```

The UI exposes a dedicated `Mechanical T2.3` workspace and a per-facility NOT APPLICABLE control.

## T2.3 numerical custody

Stage 4 does not duplicate T2.3 numerical values. `converters/vibration/mechanical/facility.js` calls the Stage-3 evaluator directly:

```text
evaluateEiAviffMechanicalBaselineCandidate(sourceKeys)
```

Independent EI worked-example oracle retained from PR #509:

```text
D2.4
centrifugal compressor                         LOF 0.2
electric motor / alternator >= 15 kW          LOF 0.4
governing Mechanical T2.3 LOF                 0.4
```

Dedicated Stage-4 regression calls the real Stage-3 evaluator and expects 0.4.

Dynamic-study reductions are deliberately not consumed in Stage 4. The shared-support row is not a numeric baseline; direct use fails with:

```text
MECHANICAL_T23_SHARED_SUPPORT_REQUIRES_ADJACENT_LOF
```

until an explicit adjacent-line LOF model exists.

## Scope / asynchronous result integrity

Deterministic facility scope:

```text
MECHANICAL-FACILITY/<encoded line>/<encoded case or ->/<encoded canonical ID>
```

Cached candidates must carry that exact scope. A mismatch returns `FACILITY_SCOPE_MISMATCH` and cannot create a governing candidate.

The UI controller uses a per-scope evaluation token. Any source/applicability change invalidates both the cached result and pending token so an older asynchronous result cannot commit over newer inputs.

## Protected invariants

- no T2.3 baseline value reimplementation/modification;
- no CANDIDATE master activation;
- no screening/design/master-data authority promotion;
- no Mechanical value can become `screeningGoverning`;
- FIT screening lifecycle is unchanged;
- shared-support transfer is not converted into a fixed baseline;
- no TM-09/dynamic-study reduction is applied;
- wrong-scope cached candidate fails closed;
- stale facility state excludes Mechanical from current candidate governing;
- explicit NOT APPLICABLE is distinct from missing applicability data.

## Appendix A — Implementation Takeover Qualification

```text
A1 Production trace             20/20
A2 Failure isolation            20/20
A3 Authority / invariant        20/20
A4 Independent validation       19/20
A5 Minimal patch                19/20
TOTAL                            98/100
IMPLEMENTATION_AUTHORITY        GRANTED_FOR_THIS_BOUNDED_STAGE
```

## Backup / rollback evidence

Repository backup CLI:

```text
node utils/backup.js save ... = NOT_RUN
reason = connector-only runtime
```

Exact pre-edit Git blobs for modified existing files:

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

All other Stage-4 implementation/test artifacts are new files.

## Changed-File Ledger

```text
agents/WIP-mechanical-t23-stage4_workreport.md
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

Parent comparison before report sync:

```text
base   = agent/ei-appendix-b-stage3@db64392374c198434c3a8a142fa33ab080160a0c
head   = Stage-4 branch before report-sync commit
ahead  = 23
behind = 0
files  = 16
```

No FIT/AIV/SBC numerical kernel, EI master values, workflow, release manifest or export file is in the Stage-4 diff.

## Focused regressions committed

- master-backed lifecycle enum acceptance;
- Mechanical catalogue/facility matrix lifecycle;
- D2.4 real Stage-3 evaluator result = 0.4;
- exact deterministic scope encoding;
- wrong-scope cached result rejection;
- duplicate input de-duplication;
- empty/unknown source failure;
- shared-support transfer hard stop;
- unknown vs explicit NOT APPLICABLE distinction;
- candidate tier vs screening tier separation;
- SBC vs Mechanical candidate governing comparison;
- stale-result exclusion/retention semantics;
- UI source selection, NOT APPLICABLE, edit and candidate markers;
- asynchronous input invalidation architecture;
- new JavaScript modules <300 physical lines;
- no local screening/design/master activation or dynamic-study reduction implementation.

## Validation Ledger

| Check | Status | Observation | Oracle / limitation |
|---|---|---|---|
| current main / #509 parent grounding | PASS | live GitHub recheck | #509 remains `db643923...`; main unchanged |
| active Mechanical/T2.3 overlap | PASS | open PR search | no competing facility implementation |
| Stage-3 evaluator reuse | PASS | Stage-4 source imports real #509 evaluator | no duplicate T2.3 table |
| D2.4 expected governing LOF | PASS | pinned EI worked-example source inspection | independent value 0.4 |
| exact-scope fail-closed architecture | PASS | source inspection + committed regressions | deterministic scope |
| authority-tier separation | PASS | source inspection + committed regressions | screening filter unchanged |
| new JS <300 physical lines | PASS | GitHub line-300 probes returned EOF for all 4 new JS modules | repo policy |
| source/applicability async invalidation | PASS | controller source inspection | per-scope token invalidation |
| backup CLI | NOT_RUN | connector-only runtime | repo policy limitation |
| focused repository-native Node tests | NOT_RUN | exact checkout/runtime unavailable | committed tests present |
| full repository-native suite | NOT_RUN | exact checkout/runtime unavailable | not claimed |
| browser acceptance | NOT_RUN | browser execution unavailable | UI source regressions only |
| hosted workflow/status | NOT_RUN | PR not yet allocated | exact-head check after allocation |
| controlled EI PDF reconciliation | inherited NOT_RUN | Stage 4 does not promote #509 masters | authority remains candidate |

## Highest Risk

The highest risk is semantic promotion by presentation: a valid T2.3 baseline can look authoritative even though its master is candidate-only. The contract, matrix and UI therefore all identify Mechanical as `CANDIDATE_MASTER`, preserve `screeningAuthority=NOT_AUTHORIZED`, and keep it out of `screeningGoverning`.

## Next-Agent Handover

After PR allocation, replace this WIP report with `agents/PR<NUMBER>_workreport.md`, verify exact parent/head/diff/workflows/status contexts, and leave the PR draft/unmerged. Do not activate the Stage-3 master, apply dynamic-study reductions, implement shared-support transfer without explicit adjacent-line LOF, or promote Mechanical to screening in this stage.
