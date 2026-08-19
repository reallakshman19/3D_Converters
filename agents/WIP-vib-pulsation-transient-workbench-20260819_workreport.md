# WIP — Vibration pulsation / transient work-item workspace

## Recovery header

```text
repository              reallaksh19/3D_Converters
work id                 WIP-vib-pulsation-transient-workbench-20260819
branch                  agent/vib-pulsation-transient-workbench-20260819
base                    main@989b24f361ad287a0c0f25f267a118338bf2ed7a
work intent             IMPLEMENT
criticality             ENGINEERING_CRITICAL
execution authorization OWNER_DIRECTED_CONTINUATION
merge authority         OWNER_ONLY / NOT_GRANTED_FOR_THIS_NEW_WORK
primary programme       #429 / #450
neighbor                 #471 T2.8 liquid/multiphase source candidate
HANDOVER_READINESS       READY
PR_RECOVERY_STATE        RECOVERABLE
TAKEOVER_AUTHORITY       WRITE_ALLOWED
REPORT_BASIS_HEAD        989b24f361ad287a0c0f25f267a118338bf2ed7a
MAIN_HEAD_LAST_CHECKED   989b24f361ad287a0c0f25f267a118338bf2ed7a
REPORT_SYNC              CURRENT
APPENDIX_A_STATUS        CURRENT
GROUNDING_EPOCH          GE-001
CURRENT_STAGE            IMPLEMENT_WORK_ITEM_MODEL
CURRENT_BLOCKER          none for bounded benchmark-only workbench
HIGHEST_RISK             accidentally presenting benchmark-only T2.6/T2.8 as screening/governing authority
EXACT_NEXT_ACTION        implement work-item model using existing production kernels only
```

## Handover in 60 seconds

Current Vibration Integrity matrix has dedicated production handlers for FIT, Mechanical, AIV and SBC. Standard Deadleg T2.6 and dry-gas rapid-opening T2.8 already exist as bounded `BENCHMARK_ONLY` production kernels, but the product has no mechanism-correct work-item UI for them. Directly attaching them to the main-line row would violate #429 assessment-unit semantics: Deadleg is `DEADLEG_BRANCH`; transient assessment is `TRANSIENT_EVENT_PATH`.

This WIP adds a dedicated work-item workspace that accepts explicit project values + source references, evaluates the existing kernels, preserves currentness, and always reports non-governing benchmark-only authority. It does not implement new equations or source data.

Excluded: T2.8 liquid/multiphase closure (#471), advanced deadleg, T2.9, T4, T2.4/T2.5 numerical decision rules, EI main-line governing contribution, screening/design authority, workflow files.

## Grounding epoch GE-001

Observed live:

```text
main                     989b24f361ad287a0c0f25f267a118338bf2ed7a
main protected           false
agents/MASTER_INDEX.md   absent
open T2.8 neighbor       PR471 / liquid-multiphase candidate / source reconciliation required
open deadleg PR          none found
```

Programme #429 requires mechanism-specific AssessmentUnitType and prohibits incomplete family coverage from appearing complete. Programme #450 explicitly records bounded benchmark-only standard Deadleg T2.6 and dry-gas T2.8 implementations as merged baseline.

## Production trace

```text
DEADLEG_BRANCH work item
 -> explicit project input/evidence
 -> converters/vibration/deadleg/method.js::calculateDeadlegStandard
 -> benchmark-only result presentation

TRANSIENT_EVENT_PATH work item
 -> explicit project input/evidence
 -> converters/vibration/transients/dry-gas-opening.js::calculateDryGasRapidOpening
 -> benchmark-only result presentation
```

No result from this workbench is eligible for `screeningGoverning`, EI main-line aggregation, design approval, or code compliance.

## Appendix A — implementation authorization

### A1 Production Trace — 20/20

Existing production kernels and their validation consumers were inspected. Both kernels explicitly return `qualificationState='BENCHMARK_ONLY'` and `engineeringAuthority='NONE'`. Current matrix lacks mechanism-specific handlers for Deadleg/T2.8. The new path ends at a dedicated work-item presentation and does not enter governing aggregation.

### A2 Current Failure Isolation — 19/20

First wrong boundary is product integration, not physics: usable bounded kernels exist, but users cannot create mechanism-correct work items, author complete inputs/evidence, execute them, or inspect current/stale results. Prediction: dedicated work-item custody can expose those exact kernels without numerical changes. Falsifier: if usable product integration requires a new coefficient/equation/source branch, stop that mechanism and record the source gate.

### A3 Authority / Invariant — 20/20

```text
T2.6 standard calculationState      BENCHMARK_ONLY
T2.8 dry-gas calculationState       BENCHMARK_ONLY
engineeringAuthority                NONE
screeningAuthority                  NOT_AUTHORIZED
designAuthority                     false
governingEligible                   false
EI main-line contribution           false
assessment units                     DEADLEG_BRANCH / TRANSIENT_EVENT_PATH
liquid/multiphase T2.8              EXCLUDED / PR471
advanced deadleg                    BLOCKED_SOURCE
```

Input mutation must invalidate the corresponding current result. No project source reference may become master/source authority.

### A4 Independent Validation — 18/20

Focused tests will independently verify the adapter/work-item state against direct invocation of the already-existing production kernels using hand-authored explicit vectors; validate missing/invalid inputs, source-reference completeness, stale invalidation, assessment-unit identity, duplicate work-item rejection, and authority invariants. Existing EI worked-example validation is retained as historical benchmark evidence. Repository-native execution may remain environment-blocked and will not be represented as PASS.

### A5 Next-Commit / Minimal Patch — 19/20

Add one generic work-item model supporting exactly two existing-kernel modes, a focused view, shell/UI contract wiring, cache custody and tests. Do not modify either numerical kernel. Do not add liquid closure, advanced deadleg, T2.4/T2.5 equations, matrix governing integration or workflow files.

**TOTAL = 96/100 — QUALIFIED_FOR_BOUNDED_BENCHMARK_ONLY_WORK_ITEM_INTEGRATION**

## Phase plan

1. Work-item model: explicit fields/evidence/currentness; direct existing-kernel execution.
2. Workspace UI: Deadleg and dry-gas transient work items, readiness/result/authority.
3. Shell + navigation + cache custody.
4. Focused regressions and final source/diff reconciliation.
5. Allocate draft PR and migrate recovery records.
6. Follow-on: T2.4/T2.5 controlled decision-evidence work; no numerical rule activation without controlled-source reconciliation.

## Validation ledger

```text
live repository grounding           PASS / GITHUB_SOURCE
Appendix A                          PASS 96/100 / EVIDENCE_REVIEW
controlled EI PDF exact execution   NOT_RUN / ENVIRONMENT_BLOCKED
repository-native Node tests        NOT_RUN
served browser                      NOT_RUN
independent engineering review      NOT_RUN
```
