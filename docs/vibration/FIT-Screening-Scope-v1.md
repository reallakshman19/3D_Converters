# FIT Bounded Screening Scope v1

Status: **PROPOSED PRODUCTION BOUNDARY — SCREENING NOT AUTHORIZED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Mechanism: Flow-Induced Turbulence (FIT)  
Method revision: `ei-aviff2-fit-reference-v2`

## 1. Purpose

This document freezes the candidate scope that may be considered for a future `BENCHMARK_ONLY -> SCREENING` authority transition. It does not itself authorize screening and does not change any FIT equation, coefficient, correlation, threshold or execution mode.

Current authority remains:

```text
calculationState       = IMPLEMENTED
qualificationState     = BENCHMARK_ONLY
engineeringAuthority   = NONE
screeningAuthority     = NOT_AUTHORIZED
designAuthority        = false
```

A later authority PR may enable only the subset below after all qualification gates are independently closed.

## 2. Candidate mechanism boundary

The candidate production scope is main-line **Flow-Induced Turbulence** according to the controlled EI AVIFF T2.2 reference implementation only.

Explicitly outside this scope:

- acoustic-induced vibration;
- small-bore connection vibration;
- dead-leg pulsation;
- mechanical excitation;
- cavitation/flashing;
- surge/momentum loading;
- slug/time-history loading;
- vortex-induced vibration;
- detailed fatigue/design acceptance;
- modal/FEA response and nonlinear contact/friction assessment.

No FIT result in this scope is design authority.

## 3. Candidate phase/input scope

Candidate phase paths:

```text
LIQUID
GAS
MULTIPHASE / AGGREGATE_EFFECTIVE
MULTIPHASE / COMPONENT_DERIVED
```

Multiphase resolution remains fail-closed:

```text
one unambiguous input shape -> inferred mode
both input shapes + explicit mode -> explicit mode
both input shapes + no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
```

All dimensional inputs must resolve through the central Engineering Calculation units layer. Missing, incompatible or ambiguous engineering quantities remain `NOT_READY`/calculation errors; no screening release may introduce hidden defaults.

## 4. Candidate diameter envelope

The proposed screening envelope is intentionally discontinuous until QST-003 is resolved by controlled source evidence:

```text
60 mm <= Dext <= 219.1 mm      candidate when all other branch gates pass
219.1 mm < Dext < 273 mm       EXCLUDED / SCREENING_UNSUPPORTED
273 mm <= Dext <= 762 mm       candidate when all other branch gates pass
```

For the excluded gap, the required production disposition is fail-closed. No interpolation, nearest-family selection, nominal-size inference or workbook selector may be used.

Outside `60..762 mm` is also outside this bounded screening scope.

## 5. Standard-correlation scope

The implementation contains these six standard correlation families:

```text
STIFF
MEDIUM_STIFF
MEDIUM_SMALL
MEDIUM_LARGE
FLEXIBLE_SMALL
FLEXIBLE_LARGE
```

A family is eligible for the future screening activation only when its exact candidate revision has:

1. controlled equation/source trace;
2. independent non-self-referential numerical evidence;
3. below/at/above applicable span and diameter boundaries;
4. unit-invariance coverage for accepted input forms;
5. exact-head release regression PASS;
6. independent vibration-engineer approval.

The existence of a production formula or retained-workbook parity alone is not sufficient.

## 6. Advanced/refined scope

The only candidate advanced families are:

```text
FLEXIBLE_SMALL
FLEXIBLE_LARGE
```

Advanced calculation remains conditional on all current rules:

```text
standard LOF >= 1
actual natural frequency supplied
1 Hz < fn <= 3 Hz
```

Exactly `1 Hz` is excluded and exactly `3 Hz` is included. `fn > 3 Hz` does not use the advanced correlation.

A valid standard calculation with no qualified advanced path remains a further-engineering-assessment result; it must not be silently converted into an acceptance.

## 7. Physical/data integrity exclusions

The future screening route must remain fail-closed for at least:

- non-positive OD, wall thickness, density or unsupported span;
- `OD <= 2*WT` or other invalid pipe geometry;
- inconsistent authoritative ID versus OD/WT where the accepted contract requires consistency;
- unknown/incompatible units;
- non-empty dimensional value with a required missing unit;
- ambiguous mass-flow/velocity or alternative process representations not covered by an explicit resolution rule;
- unresolved multiphase representation;
- missing/duplicate/ambiguous canonical identity joins;
- stale result after execution-relevant edit;
- stale or uncertified topology authority represented as complete exchange;
- source/method revision outside the qualified release package.

## 8. Topology/data authority

The production candidate remains table-first.

A complete upstream XLSX is the five-sheet exchange:

```text
Elements
Connections
Source Mapping
Catalogue Evidence
Export Metadata
```

An untouched qualified complete XLSX may execute through the preserved complete-exchange path. The first local topology mutation irreversibly downgrades the working copy for that session to Elements-only limited exchange until an explicit source reload.

Generic Elements CSV never gains certified complete-exchange authority from header compatibility alone.

## 9. Result semantics

The screening candidate may expose method-defined LOF/reference bands only. It must not introduce:

```text
safe = true
pass = true
designAcceptable = true
universal vibration/risk/confidence score
```

`LOF >= 1` and cases where a valid refined path is unavailable remain explicit further-engineering-assessment outcomes.

## 10. Mandatory gates before activation

A dedicated authority transition is prohibited until all of these are recorded against one exact candidate SHA:

1. controlled EI/project source traceability complete for every included method item;
2. QST-003 either source-resolved or retained as the explicit scope exclusion above;
3. every included standard and advanced family has independent non-self-referential evidence;
4. all diameter/span/frequency/LOF boundaries are independently exercised;
5. accepted engineering quantity families pass SI/US unit invariance through the central API;
6. DOCX/PDF/JSON/workbook discrepancies inside the candidate scope are dispositioned;
7. working-state/source-to-result/reproducibility qualification is complete;
8. `npm run verify:vibration-fit-release` passes from a clean full checkout;
9. real-browser five-sheet XLSX/CSV/edit/revert/stale/export acceptance passes;
10. an identified independent vibration engineer approves this exact bounded scope and exclusions;
11. the Owner explicitly approves the separate authority PR.

## 11. Authority transition rule

This document is a scope freeze only. The implementation must continue to reject screening execution until a later, intentionally small governance change updates the registered FIT qualification/authority state.

Design authority remains separately controlled and is not implied by a future screening approval.
