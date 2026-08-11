# FIT Qualification Dossier v1

Status: **EI WORKED-EXAMPLE QUALIFICATION IN PROGRESS — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Mechanism: Flow-Induced Turbulence (FIT)  
Qualification issue: #429  
Method specification: `docs/vibration/FIT-Engineering-Method-Specification-v1.md`  
Reference implementation revision: `ei-aviff2-fit-reference-v2`

## 1. Authority decision

The implementation remains:

```text
calculationState     = IMPLEMENTED
qualificationState   = BENCHMARK_ONLY
benchmarkAuthority   = WORKBOOK_REFERENCE_ONLY + EI_WORKED_EXAMPLE_BENCHMARK
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = NOT_AUTHORIZED
```

This dossier does **not** approve `SCREENING`.

The evidence set is now stronger than workbook parity alone: retained-workbook extraction, independent hand-derived software cases, and independent EI Appendix D worked examples are all controlled. Remaining method-domain review, full-checkout regression and independent engineering approval are still required.

## 2. Controlled evidence sources

### 2.1 Retained FIT workbook

```text
Repository: reallaksh19/CRF-4-1
Commit:     68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Path:       Extended calc2/AIV FIV/FIT.xlsm
Git blob:   d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
Size:       493650 bytes
Worksheet:  Flow Induced Turbulence / sheet13.xml
```

The duplicate KS-PR-CAL-0086 path is the same blob and is not independent corroboration.

### 2.2 EI worked examples supplied by the owner

```text
Repository: reallaksh19/Common
Commit:     aef163a5def3bfe04ca0ba860da05728a27daf42
Path:       EI - AVIFF Guidelines 2nd Edition_Examples.pdf
Git blob:   3e2517d0df527a051084fc02e69cb7afa31f8d47
Size:       3757439 bytes
Relevant:   Appendix D Examples D2 and D4
```

Only the minimum benchmark inputs, published results and source references required for qualification are retained in:

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`

The licensed PDF itself is not copied into this repository by this PR.

### 2.3 Publication metadata

The Energy Institute public catalogue was rechecked on 2026-08-11 and identifies the process-pipework guidance as 2nd Edition, January 2008, ISBN 9780852934630. It also identifies errata affecting pages 61 and 68 and states those changes are incorporated in the current PDF.

This confirms publication metadata. It does not substitute for identified engineering review of the adopted licensed source/project basis.

## 3. Evidence hierarchy

| Evidence | Role | Current status |
|---|---|---|
| Retained workbook source hash/formulas | migration provenance and parity | CONTROLLED |
| Retained cached cases | migration comparison only | CONTROLLED WITH KNOWN DEFECTS |
| Independent hand-derived cases | software arithmetic/transcription | IMPLEMENTED |
| EI Appendix D worked examples | independent method/example benchmark | IMPLEMENTED; execution validation pending Stage 11 closure |
| Full adopted EI/project method review | engineering authority | BLOCKED / reviewer required |
| Full repository regression | release/software authority | NOT_RUN / Actions billing gate |

No single evidence source is allowed to silently promote engineering authority.

## 4. EI worked-example qualification set

Dataset:

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`

Regression:

`tests/vibration-fit-ei-worked-examples.test.mjs`

Published values are rounded; the dataset therefore declares an explicit numerical tolerance instead of asserting false source precision.

### 4.1 Example D2 — gas compression FIT

Controlled cases cover published gas lines with:

- medium-stiff support classification;
- gas dynamic-viscosity factor;
- `rho * v^2` excitation;
- standard `Fv`;
- standard LOF;
- reference LOF bands below 0.3, 0.3–0.5 and 0.5–1.0.

Representative benchmark IDs:

```text
EI-D2-FIT-RECYCLE-SUCTION-6IN
EI-D2-FIT-RELIEF-UPSTREAM-4IN
EI-D2-FIT-RELIEF-DOWNSTREAM-6IN
```

### 4.2 Example D4 — separation system FIT

Controlled cases cover:

```text
EI-D4-FIT-SEPARATOR-INLET-20IN
  multiphase
  effective density + effective velocity
  508 mm OD
  stiff
  published LOF approximately 0.26

EI-D4-FIT-PRODUCED-WATER-10IN
  liquid
  273 mm OD
  flexible-large
  published LOF approximately 3.15
```

D4 is especially important because it independently exercises the aggregate-effective multiphase workflow and proves that 273 mm belongs to the large medium/flexible correlation family for this reference method.

## 5. Stage 11 engineering corrections

### ISS-012 — exactly 1 Hz advanced boundary

**Finding:** earlier reference code accepted exactly 1 Hz.

**EI evidence:** controlled method boundary is:

```text
1 Hz < fn <= 3 Hz
```

**Resolution:** code now excludes exactly 1 Hz and includes exactly 3 Hz.

**Software status:** `FIXED_PENDING_STAGE11_REGRESSION`.

### ISS-013 — 273 mm large-family lower boundary

**Finding:** earlier reference code used 273.05 mm as the large-family minimum.

**EI evidence:** Appendix D Example D4 evaluates a 273 mm flexible line using the large flexible correlation.

**Resolution:** large-family minimum changed to 273 mm.

**Software status:** `FIXED_PENDING_STAGE11_REGRESSION`.

### IMP-014 — multiphase effective input path

**Finding:** EI D4 uses effective density/effective velocity, while earlier domain validation always required component gas/liquid mass/density inputs.

**Resolution:** deterministic dual resolution now exists:

```text
AGGREGATE_EFFECTIVE
COMPONENT_DERIVED
```

Aggregate effective inputs are explicit and provenance-visible; component-derived resolution remains supported. No phase property is silently guessed.

### IMP-015 — neutral EI LOF bands

The reference result now records:

```text
LOF_LT_0_3
LOF_0_3_TO_LT_0_5
LOF_0_5_TO_LT_1
LOF_GE_1
```

These are benchmark/workflow metadata only. They do not create a production `pass` boolean and are not described as probability-of-failure bands.

## 6. Remaining source questions

### ISS-009 — retained cached 4 Hz advanced calculation

The EI boundary confirms 4 Hz is outside the advanced reference range. Code does not reproduce the cached 4 Hz behavior.

Software disposition: `RESOLVED`.

The cached inconsistency remains documented as evidence that workbook cache/UI state is not engineering authority.

### ISS-010 — hidden selector versus span-derived support

Code derives support class from controlled span equations and does not trust hidden workbook selector state.

Software disposition: `RESOLVED`.

### QST-003 — manual medium/flexible diameter gap

After correcting the large-family start to 273 mm, the unresolved region is:

```text
219.1 mm < Dext < 273 mm
```

It remains fail-closed. Stage 11 does not interpolate or invent a nominal-size mapping.

## 7. Independent hand-derived benchmark status

`Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json` remains the independent software-oracle set.

The previous exactly-1-Hz case was corrected to reflect the EI-exclusive lower boundary:

```text
fn = 1.0 Hz
advancedEligible = false
```

The 2 Hz and 3 Hz advanced cases remain positive qualification cases. The 4 Hz case remains a negative applicability case.

## 8. CI/release status

GitHub Actions run `31517707062` failed twice before runner allocation. GitHub annotation identified an account payment/spending-limit condition.

```text
runner_id = 0
steps = []
```

Therefore the failed workflow provides no evidence of a FIT or topology code defect. Actions remain externally blocked until the account condition is corrected.

A full authenticated checkout regression also remains required before PR readiness.

## 9. Promotion checklist

| Gate | Status |
|---|---|
| Retained source identity/formula extraction | PASS |
| Deterministic reference implementation | PASS at prior Stage 9 revision |
| Retained reference parity | PASS |
| Independent hand-derived benchmark set | IMPLEMENTED; full checkout NOT_RUN |
| EI D2/D4 benchmark dataset | IMPLEMENTED |
| EI D2/D4 focused regression | STAGE 11 PENDING |
| 1 Hz exclusive advanced boundary | FIXED; regression pending |
| 3 Hz inclusive advanced boundary | IMPLEMENTED; regression pending |
| 273 mm large-family boundary | FIXED; regression pending |
| Aggregate-effective multiphase path | IMPLEMENTED; regression pending |
| Neutral EI LOF reference bands | IMPLEMENTED; regression pending |
| Remaining manual-diameter gap | FAIL_CLOSED |
| SI/US equivalent full case | IMPLEMENTED; full checkout NOT_RUN |
| Missing-data/fail-closed behavior | IMPLEMENTED |
| Full repository regression | NOT_RUN |
| GitHub Actions | BLOCKED — account billing/spending |
| Adopted EI/project method review beyond worked-example coverage | NOT_RUN / reviewer required |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

## 10. Qualification conclusion

Stage 11 materially improves the evidence basis because EI worked examples now independently challenge the implementation and have already exposed two source-boundary defects plus a missing multiphase input mode.

That is exactly why FIT must remain `BENCHMARK_ONLY` while qualification is active.

If the EI worked-example regression and full software regression close cleanly, the remaining authority gate becomes narrower: identify and document the adopted EI/project method limits not covered by the worked examples, resolve/exclude QST-003, and obtain independent vibration-engineering approval under issue #429.
