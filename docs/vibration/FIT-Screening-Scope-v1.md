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

A later authority PR may enable only the subset below after all controlled qualification gates are closed.

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

The proposed screening envelope is intentionally discontinuous:

```text
60 mm <= Dext <= 219.1 mm      candidate when all other branch gates pass
219.1 mm < Dext < 273 mm       EXCLUDED / SCREENING_UNSUPPORTED
273 mm <= Dext <= 762 mm       candidate when all other branch gates pass
```

For the excluded QST-003 gap, the required production disposition is fail-closed. No interpolation, nearest-family selection, nominal-size inference or workbook selector may be used. Outside `60..762 mm` is also outside this bounded screening scope.

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

A family is eligible for future screening only when its exact candidate revision has:

1. controlled equation/source trace;
2. independent non-self-referential numerical evidence;
3. below/at/above applicable span and diameter boundaries;
4. unit-invariance coverage for accepted input forms;
5. exact-head release regression PASS;
6. controlled EI worked-example benchmark qualification satisfied.

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

Exactly `1 Hz` is excluded and exactly `3 Hz` is included. `fn > 3 Hz` does not use the advanced correlation. A valid standard calculation with no qualified advanced path remains a further-engineering-assessment result; it must not be silently converted into an acceptance.

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

### 7.1 Explicit manual data blockers

A missing engineering **datum** may be supplied by the engineer through the separate `VibrationFitDataBlockerCsv.v1` table instead of through a hidden default.

The user-facing workspace presents this as a dedicated **Data Blockers** tab. Every manual row carries scope, field, value, unit where dimensional, source, revision/record metadata, status and optional reviewer/notes.

Status semantics are:

```text
ACTIVE    may fill a missing engineering datum
HOLD      audit-only; does not satisfy readiness
RESOLVED  audit-only; does not satisfy readiness
```

The table is strictly fill-only:

```text
manual ACTIVE value + existing source value
    -> collision
    -> fail closed
```

Source operating/enrichment data are never silently overwritten. Manual blocker data participate in the working-state snapshot, stale-result detection and reproducibility evidence.

### 7.2 Data blockers do not override method blockers

A correlation-family ambiguity, equation uncertainty, applicability boundary or authority decision is not a user-enterable datum.

Therefore the blocker table cannot supply `SUPPORT_SIZE_FAMILY`, correlation ID, screening authority, design authority or another value that would bypass a method/domain gate.

The QST-003 interval `219.1 < Dext < 273 mm` remains excluded even if a user attempts to provide a preferred family manually.

## 8. Topology/data authority

The production candidate remains table-first. A complete upstream XLSX is the five-sheet exchange:

```text
Elements
Connections
Source Mapping
Catalogue Evidence
Export Metadata
```

An untouched qualified complete XLSX may execute through the preserved complete-exchange path only while **both** controlled identities still match:

```text
FitTopologyElementsProjection.v1
  -> SHA-256 of canonical visible Elements projection

FitSourceFileSha256.v1
  -> SHA-256 of the complete XLSX byte stream
```

The Elements hash proves the engineer-visible working projection still matches the imported source. The full-file hash proves hidden/non-Elements sheets and other XLSX bytes are still the exact imported source. Missing or mismatched fingerprints fail closed.

The first normal topology mutation irreversibly downgrades the working copy for that session to Elements-only limited exchange until an explicit source reload. Cell, row and whole-table revert restore values but do **not** restore complete-exchange authority. Generic Elements CSV never gains certified complete-exchange authority from header compatibility alone.

## 9. Run identity and reproducibility

The production candidate keeps two distinct SHA-256 identities:

```text
FitRunSnapshot.v1
  snapshotHash
  = audit/source/working-state identity

FitEngineeringInputIdentity.v1
  engineeringInputHash
  = normalized central FIT request identity
```

The audit snapshot includes file/source descriptors, full XLSX hash where applicable, Elements projection hash, working rows/row IDs, data-blocker table/file, benchmark identity and authority-downgrade state. The engineering identity excludes source filenames and uses the normalized `resolvedInputs`, calculation ID, method revision and scope.

`FitRunEvidencePackage.v1` must re-verify both canonical payloads and both SHA-256 hashes before export. Evidence export is reproducibility evidence only; it cannot confer screening or design authority.

## 10. Result semantics

The screening candidate may expose method-defined LOF/reference bands only. It must not introduce:

```text
safe = true
pass = true
designAcceptable = true
universal vibration/risk/confidence score
```

`LOF >= 1` and cases where a valid refined path is unavailable remain explicit further-engineering-assessment outcomes.

## 11. Worked-example qualification rule

For this FIT candidate, controlled reproduction of the Owner-specified worked examples is sufficient engineering qualification evidence; a separate independent vibration-engineer review is not required.

Qualification anchor:

```text
reallaksh19/Common@7bfead910f6bca91b10748ead009e40f20c82219
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

This does not waive the bounded-scope exclusions, source traceability, release regression, browser/real-file acceptance, or Owner-controlled authority transition.

## 12. Mandatory gates before activation

A dedicated authority transition is prohibited until all of these are recorded against one exact candidate SHA:

1. controlled EI/project source traceability complete for every included method item;
2. QST-003 retained as the explicit scope exclusion above or separately source-resolved;
3. every included standard and advanced family has independent non-self-referential evidence;
4. all diameter/span/frequency/LOF boundaries are independently exercised;
5. accepted engineering quantity families and both multiphase representations pass SI/US unit invariance through the central API;
6. explicit data-blocker parse/fill-only/collision/status/component-multiphase/QST-003-bypass regressions pass;
7. DOCX/PDF/JSON/workbook discrepancies inside the candidate scope are dispositioned;
8. cell/row/table working-state revert and topology authority-latch regressions pass;
9. Elements-projection and complete-XLSX byte-stream anti-bypass regressions pass;
10. audit/engineering dual-hash, manual-data snapshot binding and run-evidence reproducibility regressions pass;
11. `npm run verify:vibration-fit-release` passes from a clean full checkout;
12. real-browser five-sheet XLSX/CSV/edit/revert/data-blocker/stale/export acceptance passes;
13. the Owner explicitly approves the separate authority PR.

No additional independent vibration-engineer sign-off is required once the controlled worked-example benchmark gate is satisfied.

## 13. Authority transition rule

This document is a scope freeze only. The implementation must continue to reject screening execution until a later, intentionally small governance change updates the registered FIT qualification/authority state.

Design authority remains separately controlled and is not implied by a future screening approval.
