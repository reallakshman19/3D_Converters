# FIT Qualification Dossier v1

Status: **EI WORKED-EXAMPLE QUALIFICATION PASS — SCREENING AUTHORITY NOT APPROVED**

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

The evidence set now includes retained-workbook extraction/parity, independent hand-derived software cases, and independent EI Appendix D worked-example cases. The EI worked-example regression is **PASS 8/8** in the Stage 11 branch-module fixture. Full repository regression, remaining method-domain review and independent engineering approval are still required.

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

Minimum qualification facts are pinned in:

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`

The licensed PDF itself is not copied into this PR.

### 2.3 Publication metadata

The Energy Institute public catalogue was rechecked on 2026-08-11 and identifies the process-pipework guidance as 2nd Edition, January 2008, ISBN 9780852934630, with errata affecting pages 61 and 68 incorporated in the current PDF.

This confirms publication metadata; it does not replace engineering review of the adopted EI/project basis.

## 3. Evidence hierarchy

| Evidence | Role | Current status |
|---|---|---|
| Retained workbook source hash/formulas | migration provenance | CONTROLLED |
| Retained cached cases | migration comparison | CONTROLLED WITH KNOWN CACHE DEFECTS |
| Independent hand-derived cases | software arithmetic/transcription | IMPLEMENTED; pure-domain regression retained |
| EI Appendix D worked examples | independent method/example benchmark | **PASS 8/8** |
| Full adopted EI/project method review | engineering authority | NOT COMPLETE |
| Full repository regression | release/software authority | NOT_RUN / Actions billing gate |

No single evidence source silently promotes engineering authority.

## 4. EI worked-example qualification

Dataset:

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`

Regression:

`tests/vibration-fit-ei-worked-examples.test.mjs`

Validation result:

```text
PASS 8/8
Stage 11 branch-module fixture
```

The printed EI values are rounded, so the benchmark dataset declares a 1.5% relative comparison tolerance instead of implying unavailable source precision.

### 4.1 D2 gas compression

The regression reproduces published medium-stiff gas cases, gas viscosity factor, excitation term, `Fv`, LOF and reference band. Representative numerical results from the implementation versus the printed examples include:

```text
6 in recycle suction:
  Fv  18016.64 vs 18022
  LOF 0.27669 vs 0.276

4 in relief upstream:
  Fv  33433.74 vs 33433
  LOF 0.33926 vs 0.338

6 in relief downstream:
  Fv  18016.64 vs 18022
  LOF 0.88041 vs 0.881
```

### 4.2 D4 separation system

```text
20 in separator inlet:
  support STIFF
  rhoV2 11762.64 vs 11763
  Fv 45174.61 vs 45175
  LOF 0.26038 vs 0.26

10 in produced water:
  OD 273 mm
  support FLEXIBLE_LARGE
  rhoV2 8309.08 vs 8309
  Fv 2636.17 vs 2636
  LOF 3.15195 vs 3.15
```

D4 independently validates the aggregate-effective multiphase path and the 273 mm large flexible family boundary.

## 5. Stage 11 engineering corrections

### ISS-012 — exactly 1 Hz advanced boundary

Earlier reference code accepted exactly 1 Hz. Controlled EI evidence requires:

```text
1 Hz < fn <= 3 Hz
```

Resolution: exactly 1 Hz is now excluded and exactly 3 Hz remains included.

Status: **SOFTWARE_RESOLVED / EI REGRESSION PASS**.

### ISS-013 — 273 mm large-family lower boundary

Earlier code started the large medium/flexible family at 273.05 mm. EI D4 uses 273 mm with the flexible-large correlation.

Resolution: large-family minimum is now 273 mm.

Status: **SOFTWARE_RESOLVED / EI REGRESSION PASS**.

### IMP-014 — multiphase effective input path

The method can now resolve multiphase input in two explicit modes:

```text
AGGREGATE_EFFECTIVE
COMPONENT_DERIVED
```

The Stage 11 regression verifies the aggregate and component routes converge for the same D4 physical case. Resolution mode and density source are provenance-visible.

Status: **IMPLEMENTED / REGRESSION PASS**.

### IMP-015 — neutral EI LOF bands

Reference results now preserve:

```text
LOF_LT_0_3
LOF_0_3_TO_LT_0_5
LOF_0_5_TO_LT_1
LOF_GE_1
```

No production `pass` boolean is introduced.

Status: **IMPLEMENTED / EI D2-D4 REGRESSION PASS**.

## 6. Remaining source questions

### ISS-009 — retained cached 4 Hz advanced calculation

The controlled EI boundary confirms 4 Hz is outside the advanced reference range. Code rejects cached 4 Hz advanced behavior.

Status: **SOFTWARE_RESOLVED**. The retained inconsistency remains documented as evidence that workbook UI/cache state is not authority.

### ISS-010 — hidden support selector mismatch

Support classification is deterministic from the controlled span equations; hidden stale selector state is ignored.

Status: **SOFTWARE_RESOLVED**.

### QST-003 — manual medium/flexible diameter gap

After the 273 mm correction, the unresolved region is:

```text
219.1 mm < Dext < 273 mm
```

It remains fail-closed. No interpolation or implicit nominal-size mapping is authorized.

Status: **OPEN / FAIL_CLOSED**.

## 7. Regression preservation

After the Stage 11 corrections, an additional focused regression preserved prior reference behavior:

```text
retained workbook parity cases: 2
standard Fv families:           6
hand threshold cases:           4
support-boundary case:          1
result:                          PASS
```

The hand-derived exactly-1-Hz case was intentionally changed to `advancedEligible = false`; 2 Hz and 3 Hz remain positive advanced cases and 4 Hz remains negative.

## 8. CI/release status

GitHub Actions run `31517707062` failed twice before runner allocation. GitHub identified an account payment/spending-limit condition:

```text
runner_id = 0
steps = []
```

No test step executed, so this is not evidence of a FIT or topology defect. Actions remain externally blocked.

Full central API/Console/default-registry regression from a complete authenticated checkout remains `NOT_RUN` and is required before PR readiness.

## 9. Promotion checklist

| Gate | Status |
|---|---|
| Retained source identity/formula extraction | PASS |
| Retained reference parity | PASS |
| Six standard correlation families | PASS |
| Independent hand-derived benchmark evidence | PASS in focused regression; full checkout NOT_RUN |
| EI D2/D4 worked examples | **PASS 8/8** |
| Advanced lower/upper frequency boundary | **PASS** |
| 273 mm large-family boundary | **PASS** |
| Aggregate/component multiphase equivalence | **PASS** |
| Neutral EI reference bands | **PASS** |
| Remaining manual-diameter gap | FAIL_CLOSED / OPEN |
| SI/US central-engine equivalence | IMPLEMENTED; full checkout NOT_RUN |
| Missing-data/fail-closed behavior | IMPLEMENTED |
| Full repository regression | NOT_RUN |
| GitHub Actions | BLOCKED — account billing/spending |
| Method/applicability review outside worked-example coverage | NOT COMPLETE |
| Adopted project procedure/revision review | NOT COMPLETE |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

## 10. Qualification conclusion

Stage 11 is a meaningful qualification advance. Independent EI worked examples challenged the reference kernel, exposed two boundary defects and an input-model gap, and now pass after source-backed corrections.

The remaining engineering-authority work is narrower but still material: review method applicability and any equation/table regions not exercised by the D2/D4 examples, resolve or explicitly exclude QST-003, verify the adopted project basis/errata, execute the full repository regression, and obtain identified independent vibration-engineering approval.

Until those gates close, `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`.
