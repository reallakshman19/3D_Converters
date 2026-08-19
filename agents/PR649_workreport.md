# PR649 Work Report — benchmark-only Deadleg / transient workbench

## Identity

```text
PR                    #649
branch                agent/vib-pulsation-transient-workbench-20260819
base                  main@989b24f361ad287a0c0f25f267a118338bf2ed7a
criticality           ENGINEERING_CRITICAL
state                 OPEN / DRAFT
merge authority       OWNER_ONLY / NOT_GRANTED
Appendix A            96/100
```

## Outcome

Adds a dedicated Vibration Integrity `Pulsation & transients` work-item workspace for two existing bounded kernels only:

```text
DEADLEG_STANDARD          -> DEADLEG_BRANCH
T28_DRY_GAS_RAPID_OPENING -> TRANSIENT_EVENT_PATH
```

Each work item requires an exact scope, explicit values, and an evidence reference for every value. Evaluation is revision-bound; later edits retain the old result only as `STALE_RESULT`.

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
calculateDeadlegStandard()
calculateDryGasRapidOpening()
```

Both existing kernels were source-inspected after implementation to confirm exact input/output field names and retained `BENCHMARK_ONLY / engineeringAuthority=NONE` behavior.

## Source-gated continuations

Visible but non-executable:

```text
T2.4 Recip/PD              SOURCE RECONCILIATION REQUIRED
T2.5 Rotating stall        SOURCE RECONCILIATION REQUIRED
T2.6 advanced deadleg      BLOCKED SOURCE
T2.8 liquid/multiphase     SEPARATE PR471 CANDIDATE
```

## UI/cache custody

Shared Vibration release key:

```text
20260819-vib-pulsation-transient-workbench-1
```

Propagated startup -> Engineering workspace -> Vibration shell -> new controller/view/model. Existing SBC, Type-3, AIV and HP child identities remain distinct.

## Regression source

Focused tests pin exact kernel delegation, assessment units, evidence completeness, invalid-input fail-closed behavior, current/stale lifecycle, authority isolation, matrix non-import, and cache custody.

## Validation truth

```text
base compare before PR allocation     PASS / 20 ahead / 0 behind / 19 files
main drift                            none
new model/controller/view             260 / 81 / 110 physical lines
kernel field reconciliation           PASS / GITHUB_SOURCE_INSPECTION
kernel/matrix/aggregation isolation   PASS / GITHUB_COMPARE
controlled EI PDF execution           NOT_RUN / ENVIRONMENT_BLOCKED
repository-native Node execution      NOT_RUN / ENVIRONMENT_BLOCKED
served browser acceptance             NOT_RUN / ENVIRONMENT_BLOCKED
independent engineering review        NOT_RUN
hosted exact-head statuses/runs       pending final recovery-head check
```

Committed test source is not represented as runtime PASS.

## Coordination

- #429 / #450 remain programme/source parents.
- PR471 owns liquid/multiphase T2.8 source-candidate reconciliation; PR649 does not modify it.
- No merge authority is granted.

## Exact next action

Finalize hosted exact-head truth, then continue T2.4/T2.5 source-qualified decision-evidence work on a stacked branch without introducing numerical rules from secondary synthesis.