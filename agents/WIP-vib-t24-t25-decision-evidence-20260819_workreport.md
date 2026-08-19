# WIP — T2.4 / T2.5 decision-evidence custody

## Recovery header

```text
repository              reallaksh19/3D_Converters
work id                 WIP-vib-t24-t25-decision-evidence-20260819
branch                  agent/vib-t24-t25-decision-evidence-20260819
base / parent           PR649 head b3d0b8ea937cd06d99b44033a15606827f311119
live main               989b24f361ad287a0c0f25f267a118338bf2ed7a
work intent             IMPLEMENT
criticality             ENGINEERING_CRITICAL
execution authorization OWNER_DIRECTED_CONTINUATION
merge authority         OWNER_ONLY / NOT_GRANTED
programme               #429 / #450
HANDOVER_READINESS      READY
PR_RECOVERY_STATE       RECOVERABLE
CURRENT_STAGE           DECISION_EVIDENCE_CONTRACT
CURRENT_BLOCKER         CONTROLLED_T24_T25_RULE_CONTENT_NOT_EXECUTED
HIGHEST_RISK            SECONDARY_SYNTHESIS_ACCIDENTALLY_PROMOTED_TO_EI_RULE_AUTHORITY
EXACT_NEXT_ACTION       implement non-numerical decision-evidence contract + UI
```

## Handover in 60 seconds

PR649 makes existing benchmark-only T2.6/T2.8 kernels usable through mechanism-correct work items. T2.4 Recip/PD and T2.5 rotating stall still have only pinned source-navigation records; controlled PDF decision content is not executable in this environment.

This WIP adds evidence custody only: exact mechanism identity, source locator, project/OEM evidence references, explicit applicability/review dispositions, completeness/currentness, and a visible hard block on numerical execution. It does not encode thresholds, equations, decision branches, LOF values, or automatic applicability.

One source-register metadata defect is in scope: T2.4 currently uses `mechanismId=reciprocatingPositiveDisplacement`, which is not a governed registry ID. The only governed family ID is `reciprocatingPulsation`; the old token appears nowhere else. Correcting that identifier is metadata reconciliation only.

## Grounding / source truth

```text
controlled source repo     reallaksh19/Common
controlled commit          fb549185b9b27edc2379734240320a85c5bef9f6
controlled PDF blob        9d3eccc56429411e17c07a579bdebbd13cb0bdc5
T2.4 locator               Flowchart T2-2 / section T2.4 / printed page 55 / NAVIGATION_ONLY
T2.5 locator               Flowchart T2-3 / section T2.5 / printed page 56 / NAVIGATION_ONLY
controlled content         NOT_RUN / ENVIRONMENT_BLOCKED
secondary synthesis        CORROBORATION_ONLY / NOT_AUTHORITY
```

No numerical content may be copied from Advanced_Analysis or inferred from source-navigation metadata.

## Appendix A — implementation authorization

### A1 Production Trace — 19/20

Trace is project evidence -> new T2.4/T2.5 evidence contract -> UI readiness/reviewer disposition. The chain stops before calculation, matrix governing aggregation, or screening authority. Source navigation comes only from the existing controlled-source register.

### A2 Current Failure Isolation — 19/20

The product currently labels T2.4/T2.5 as not implemented and has no structured place to capture OEM/project evidence needed for eventual qualification. The first safe missing boundary is evidence custody, not physics. Falsifier: if implementation requires a numerical predicate/threshold/LOF or a controlled-source statement not already present in the source register, stop.

### A3 Authority / Invariant — 20/20

```text
engineeringAuthority          NONE
screeningAuthority            NOT_AUTHORIZED
designAuthority               false
automaticApplicability        false
numericalExecution            false
EI main-line contribution     false
controlled source content     NOT_EXECUTED
secondary synthesis authority NONE
OEM map/data                   PROJECT EVIDENCE ONLY
```

Explicit NOT_APPLICABLE/READY_FOR_REVIEW dispositions require a project evidence reference; blank or contradictory evidence remains unresolved.

### A4 Independent Validation — 18/20

Focused contract tests will verify exact governed mechanism IDs, source locator identity, no numeric rule fields/functions, explicit evidence requirement, no automatic applicability, revision/currentness, and UI non-execution. Repository-native execution may remain unavailable and will remain NOT_RUN.

### A5 Minimal Patch — 19/20

Add one evidence model and one UI panel integrated into the existing PR649 Pulsation & Transients workspace. Correct only the T2.4 mechanismId metadata mismatch. Add focused tests/cache propagation. Do not modify kernels, matrix, aggregation, source locators, numerical values, workflow files, T2.9/T4, or PR471 liquid closure.

**TOTAL = 95/100 — QUALIFIED_FOR_NON_NUMERICAL_T24_T25_DECISION_EVIDENCE_CUSTODY**

## Phase plan

1. Correct T2.4 governed mechanism ID in source register; pin anti-drift test.
2. Add non-numerical T2.4/T2.5 evidence model.
3. Integrate evidence panel into Pulsation & Transients UI with explicit source/review blockers.
4. Advance shared Vibration cache custody, preserve kernel/SBC/Type3/AIV/HP child identities.
5. Reconcile source/diff, allocate stacked draft PR, migrate recovery records.

## Validation ledger

```text
live source grounding             PASS / GITHUB_SOURCE
Appendix A                        PASS 95/100 / EVIDENCE_REVIEW
controlled PDF execution          NOT_RUN / ENVIRONMENT_BLOCKED
repository-native tests           NOT_RUN
served browser                    NOT_RUN
independent engineering review    NOT_RUN
```
