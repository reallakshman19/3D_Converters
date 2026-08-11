# FIT Qualification Dossier v1

Status: **EI EXAMPLE + INPUT-RESOLUTION QUALIFICATION PASS — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Mechanism: Flow-Induced Turbulence (FIT)  
Qualification issue: #429  
Method specification: `docs/vibration/FIT-Engineering-Method-Specification-v1.md`  
Engineering method revision: `ei-aviff2-fit-reference-v2`

## 1. Authority decision

```text
calculationState     = IMPLEMENTED
qualificationState   = BENCHMARK_ONLY
benchmarkAuthority   = WORKBOOK_REFERENCE_ONLY + EI_WORKED_EXAMPLE_BENCHMARK
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = NOT_AUTHORIZED
```

This dossier does **not** approve `SCREENING`.

The current evidence set includes retained-workbook extraction/parity, independent hand-derived software cases, independent EI Appendix D worked examples, and explicit multiphase input-resolution qualification. Full repository regression, remaining adopted method/project review and independent engineering approval are still required.

## 2. Controlled evidence

### Retained workbook

```text
reallaksh19/CRF-4-1
commit 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Extended calc2/AIV FIV/FIT.xlsm
blob d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
```

### EI worked examples

```text
reallaksh19/Common
commit aef163a5def3bfe04ca0ba860da05728a27daf42
EI - AVIFF Guidelines 2nd Edition_Examples.pdf
blob 3e2517d0df527a051084fc02e69cb7afa31f8d47
Appendix D Examples D2 and D4
```

### Publication metadata

Energy Institute public metadata was rechecked on 2026-08-11: process-pipework guidance is 2nd Edition, January 2008, ISBN 9780852934630; errata affecting pages 61 and 68 are identified as incorporated in the current PDF.

## 3. EI worked-example qualification

Dataset:

`Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`

Regression:

`tests/vibration-fit-ei-worked-examples.test.mjs`

Stage 11 result:

```text
8/8 PASS
```

Stage 12 expanded result:

```text
12/12 PASS
```

The five published D2/D4 numerical cases remain unchanged after the Stage 12 input-resolution hardening.

Representative comparisons:

```text
D2 6 in suction       LOF 0.27669 vs published 0.276
D2 4 in relief up     LOF 0.33926 vs published 0.338
D2 6 in relief down   LOF 0.88041 vs published 0.881
D4 20 in separator    LOF 0.26038 vs published 0.26
D4 10 in water        LOF 3.15195 vs published 3.15
```

## 4. Stage 11 source corrections

### ISS-012 — exactly 1 Hz advanced boundary

Resolved and benchmarked:

```text
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is excluded; exactly 3 Hz is included.

### ISS-013 — 273 mm large-family lower boundary

Resolved and benchmarked. EI D4 confirms 273 mm can use the flexible-large family.

### IMP-014 — aggregate-effective multiphase

Implemented and benchmarked. `AGGREGATE_EFFECTIVE` and `COMPONENT_DERIVED` converge for the same D4 physical case.

### IMP-015 — neutral reference bands

Implemented and benchmarked:

```text
LOF_LT_0_3
LOF_0_3_TO_LT_0_5
LOF_0_5_TO_LT_1
LOF_GE_1
```

No production `pass` boolean is introduced.

## 5. Stage 12 input-resolution qualification

### ISS-016 — mixed multiphase data ambiguity

**Problem:** an imported process dataset can contain both effective/aggregate properties and gas/liquid component properties. Earlier logic automatically preferred aggregate inputs. That was deterministic software but a silent engineering interpretation.

**Resolution:** optional explicit input:

```text
multiphaseResolutionMode = AGGREGATE_EFFECTIVE | COMPONENT_DERIVED
```

Qualified rules:

```text
only aggregate shape -> AGGREGATE_EFFECTIVE / INFERRED
only component shape -> COMPONENT_DERIVED / INFERRED
both shapes, no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + aggregate mode -> AGGREGATE_EFFECTIVE / EXPLICIT
both + component mode -> COMPONENT_DERIVED / EXPLICIT
invalid mode -> FIT_INPUT_INVALID
```

When both data shapes coexist and an explicit mode is used, evidence records:

```text
selection = EXPLICIT
alternateModeDataPresent = true
```

so the unused engineering data are not silently invisible in the audit trail.

### Stage 12 focused result

The expanded EI/domain regression is:

```text
12 tests
12 PASS
0 FAIL
```

Coverage includes the five EI numerical cases, frequency and 273 mm boundaries, inferred aggregate/component equivalence, ambiguous mixed-data rejection, explicit aggregate selection, explicit component selection and invalid-mode rejection.

## 6. Preserved regression evidence

After the EI corrections, prior reference behavior also remained clean:

```text
2 retained workbook-reference cases PASS
6 standard Fv families PASS
4 hand threshold/advanced cases PASS
1 support-boundary set PASS
module syntax PASS
```

The independent hand case at exactly 1 Hz is now correctly a negative advanced-path case.

## 7. Remaining source/authority questions

### ISS-009 — cached 4 Hz advanced result

Software resolved: rejected by the EI frequency boundary. Retained cache inconsistency remains documented as provenance evidence.

### ISS-010 — hidden workbook support selector

Software resolved: deterministic span-derived classification is used.

### QST-003 — manual medium/flexible diameter gap

```text
219.1 mm < Dext < 273 mm
```

remains fail-closed. No interpolation or implicit nominal-size mapping is authorized.

### QST-001 — remaining adopted method/project coverage

EI D2/D4 examples validate the slices they exercise, not the entire T2.2 applicability domain or the project adoption/revision. Independent review is still required for authority promotion.

## 8. CI/release status

GitHub Actions run `31517707062` failed before runner allocation because of an account billing/spending condition:

```text
runner_id = 0
steps = []
```

No workflow test executed. The failure is external, not evidence of a FIT/topology defect.

Full central API/default-registry/Console/batch regression from a complete authenticated checkout remains `NOT_RUN`.

## 9. Promotion checklist

| Gate | Status |
|---|---|
| Source identity/extraction | PASS |
| Retained parity | PASS |
| Six standard correlation families | PASS |
| Independent hand benchmark evidence | PASS in focused regression; full checkout NOT_RUN |
| EI D2/D4 numerical cases | PASS |
| 1 Hz / 3 Hz advanced boundary | PASS |
| 273 mm large-family boundary | PASS |
| Aggregate/component equivalence | PASS |
| Mixed multiphase ambiguity fail-closed | PASS |
| Explicit aggregate/component mode selection | PASS |
| Input-resolution provenance | PASS |
| Reference LOF bands | PASS |
| Manual-diameter gap | OPEN / FAIL_CLOSED |
| SI/US central-engine equivalence | IMPLEMENTED; full checkout NOT_RUN |
| Full repository regression | NOT_RUN |
| GitHub Actions | BLOCKED — external account condition |
| Remaining adopted EI/project method review | NOT COMPLETE |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

## 10. Qualification conclusion

The reference implementation has now passed independent EI worked-example checks and no longer silently chooses between competing multiphase engineering data shapes.

The remaining authority work is not more formula coding by default. It is to identify the exact bounded method/application scope not exercised by D2/D4, resolve or explicitly exclude QST-003, execute the complete repository regression, confirm the adopted project basis/errata, and obtain independent vibration-engineering approval.

Until those gates close, `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`.
