# PR649 Work Report — benchmark-only Deadleg / transient workbench

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: READ_ONLY
PR_HEAD_OBSERVED: 6512797b18ccb72508219f964bf1aeba343dc749
REPORT_BASIS_HEAD: 6512797b18ccb72508219f964bf1aeba343dc749
MAIN_HEAD_LAST_CHECKED: 6c3109935eb2d30652eab441080464777091b1bb
MERGE_BASE: 6c3109935eb2d30652eab441080464777091b1bb
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT_96_OF_100
GROUNDING_EPOCH: GE-002
CURRENT_STAGE: COMPLETE_OWNER_MERGE_GATE
CURRENT_BLOCKER: OWNER_MERGE_AUTHORITY_REQUIRED
HIGHEST_RISK: OPEN_PR651_SHARED_ENGINEERING_WORKSPACE_CACHE_CUSTODY
EXACT_NEXT_ACTION: OWNER_MERGE_GATE_OR_INDEPENDENT_T24_T25_SOURCE_EVIDENCE_FOLLOW_ON
```

## Mission / outcome

PR649 adds a dedicated Vibration Integrity `Pulsation & transients` work-item workspace for two already-landed bounded kernels only:

```text
DEADLEG_STANDARD          -> DEADLEG_BRANCH
T28_DRY_GAS_RAPID_OPENING -> TRANSIENT_EVENT_PATH
```

Each work item requires an exact scope, explicit project values, and an evidence reference for every value. Evaluation is revision-bound; any later scope/value/evidence edit retains the prior result only as `STALE_RESULT`.

Permanent authority remains:

```text
calculationState          BENCHMARK_ONLY
engineeringAuthority      NONE
screeningAuthority        NOT_AUTHORIZED
designAuthority           false
governingEligible         false
EI main-line contribution false
```

No numerical kernel, mechanism-matrix, EI aggregation, master-data, or workflow file is changed.

## Existing-kernel trace

```text
converters/vibration/deadleg/method.js
  calculateDeadlegStandard()

converters/vibration/transients/dry-gas-opening.js
  calculateDryGasRapidOpening()
```

The workbench exposes the dry-gas T2.8 gas constant as an explicit entered/evidenced field instead of relying on the kernel optional default.

## Source-gated continuations

Visible but non-executable:

```text
T2.4 Recip/PD              SOURCE RECONCILIATION REQUIRED
T2.5 Rotating stall        SOURCE RECONCILIATION REQUIRED
T2.6 advanced deadleg      BLOCKED SOURCE
T2.8 liquid/multiphase     SEPARATE PR471 CANDIDATE
```

No T2.4/T2.5 numerical rule is copied from secondary synthesis.

## UI/cache custody

Shared Vibration release key:

```text
20260819-vib-pulsation-transient-workbench-1
```

Propagated startup -> Engineering workspace -> Vibration shell -> new controller/view/model. Existing SBC, Type-3 and AIV descendants retain their independent cache identities.

### Main drift reconciliation — GE-002

`main` advanced from `989b24f...` to `6c310993...` when PR650 (KD320 four-record evidence intake) merged. The only shared production file was:

```text
tabs/engineering-workspace-tab.js
```

The edits were authority-independent and non-overlapping:

```text
PR649 / Vibration: Calculations loader -> 20260819-vib-pulsation-transient-workbench-1
PR650 / HP:        KD320 Evidence Intake loader -> 20260819-kd320-csv-intake-2
```

A non-destructive reconciliation merge commit `6512797b...` has both PR649 history and current main as parents and preserves both loader identities. Final compare against current main is `ahead 32 / behind 0 / 19 changed files`.

A temporary reconciliation helper file was created in an intermediate commit and removed from the reconciled tree; it is not present in the PR diff or final tree.

Open PR651 also touches the KD320 loader in the same shared file. Current classification is `COORDINATION_REQUIRED / AUTHORITY_INDEPENDENT`; if PR651 merges before PR649, PR649 must re-ground again and preserve PR651's HP loader identity.

## Regression source

Focused tests pin:

- exact delegation parity with the existing Deadleg and dry-gas kernels;
- `DEADLEG_BRANCH` / `TRANSIENT_EVENT_PATH` assessment-unit identity;
- complete project-evidence requirement;
- invalid-input fail-closed behavior;
- no hidden missing-value substitution;
- current -> stale -> current lifecycle;
- permanent non-governing/non-screening authority;
- source-gated T2.4/T2.5/advanced/T2.8-liquid presentation;
- mechanism-matrix non-import;
- startup browser cache custody, including preserved SBC/Type-3/AIV identities.

Committed regression source is not represented as executed PASS.

## Qualification gate

Repository-specific Appendix A completed before production mutation:

```text
A1 Production Trace              20/20
A2 Current Failure Isolation     19/20
A3 Authority / Invariant         20/20
A4 Independent Validation        18/20
A5 Next-Commit / Minimal Patch   19/20
TOTAL                            96/100
DISPOSITION                      QUALIFIED_FOR_BOUNDED_BENCHMARK_ONLY_WORK_ITEM_INTEGRATION
```

## Validation truth

```text
live current-main reconciliation        PASS / GITHUB_COMPARE / 0 behind
changed-file reconciliation             PASS / 19 intended paths
kernel field reconciliation             PASS / GITHUB_SOURCE_INSPECTION
kernel/matrix/aggregation isolation     PASS / GITHUB_COMPARE
shared HP/Vibration loader preservation PASS / GITHUB_SOURCE_INSPECTION
workflow files                          0 changed
controlled EI PDF execution             NOT_RUN / ENVIRONMENT_BLOCKED
repository-native Node execution        NOT_RUN / ENVIRONMENT_BLOCKED
served browser acceptance               NOT_RUN / ENVIRONMENT_BLOCKED
independent engineering review          NOT_RUN
```

Hosted statuses, workflow runs, reviews and review threads must be checked on the final recovery-only head; absence remains `NOT_RUN`, never PASS.

## Coordination / authority

- #429 and #450 remain programme/source parents.
- PR471 owns liquid/multiphase T2.8 source-candidate reconciliation and is excluded here.
- PR650 is merged and preserved by GE-002 reconciliation.
- PR651 is an open HP cache-custody neighbor and must be preserved if it lands first.
- Merge authority remains `OWNER_ONLY / NOT_GRANTED`.

## Exact continuation

PR649 is implementation-complete and frozen at the owner merge gate. Independent T2.4/T2.5 controlled-source evidence work may continue separately without changing PR649 numerical or authority semantics.