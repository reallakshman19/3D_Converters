# FIT Qualification Dossier v1

Status: **PRODUCTION-GATE QUALIFICATION ACTIVE — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Mechanism: Flow-Induced Turbulence (FIT)  
Qualification issue: #429  
Workspace/production issue: #443  
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

The production-gate work now includes retained-workbook extraction/parity, independent hand-derived software cases, published EI Appendix D worked examples, explicit multiphase input resolution, bounded future screening scope, case-specific published-value tolerances, working-state provenance, an XLSX Elements-projection anti-bypass contract, and dual audit/engineering run identities. Exact-head release execution, browser acceptance, page-level method/errata review and independent vibration-engineer approval are still required.

## 2. Controlled evidence

### Retained workbook

```text
reallaksh19/CRF-4-1
commit 68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Extended calc2/AIV FIV/FIT.xlsm
blob d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
```

### Controlled EI source set

```text
reallaksh19/Common
controlled pin fb549185b9b27edc2379734240320a85c5bef9f6
```

Governing method PDF:

```text
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

Published worked-example PDF:

```text
EI - AVIFF Guidelines 2nd Edition_Examples.pdf
blob 3e2517d0df527a051084fc02e69cb7afa31f8d47
Appendix D Examples D2 and D4
```

Corroborating DOCX:

```text
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

The former pin `aef163a5def3bfe04ca0ba860da05728a27daf42` is retained only as the historical parent state from which the published-example PDF was first qualified. Live FIT qualification metadata uses `fb549185...`; the PDF blob is unchanged.

Source precedence and observed PDF/DOCX differences are recorded in `FIT-EI-Worked-Example-Traceability-v1.md`.

## 3. Published EI qualification

Dataset:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
```

Regression:

```text
tests/vibration-fit-ei-worked-examples.test.mjs
```

Published numerical points:

```text
D2 6 in suction       LOF target 0.276
D2 4 in relief up     LOF target 0.338
D2 6 in relief down   LOF target 0.881
D4 20 in separator    LOF target 0.26
D4 10 in water        LOF target 3.15
```

The previous blanket `1.5%` relative tolerance has been removed. Published-value comparison now uses controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

Each case stores absolute tolerances for `rho*v^2`, viscosity factor, `Fv` and standard LOF. The tolerances are derived from independent equation-register recalculation of the published input vector plus half the least displayed output increment; they are not tuned against production output.

Controlled standard-LOF tolerances:

| Case | Absolute LOF tolerance |
|---|---:|
| D2 recycle suction 6 in | 0.0012 |
| D2 relief upstream 4 in | 0.0018 |
| D2 relief downstream 6 in | 0.0011 |
| D4 separator inlet 20 in | 0.0054 |
| D4 produced water 10 in | 0.0070 |

## 4. Independent branch qualification

Independent benchmark dataset:

```text
Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json
```

Existing evidence includes liquid, gas and multiphase standard cases, reference-threshold cases, support boundaries, SI/US invariance and fail-closed cases.

Production Gate 1 adds independent coverage for the two former evidence holes:

```text
FIT-HAND-LIQ-MEDIUM-SMALL-008
FIT-HAND-FLEX-LARGE-LOF-120-FN2-009
```

The qualification evidence registry now classifies standard `MEDIUM_SMALL` and advanced `FLEXIBLE_LARGE` with `INDEPENDENT_HAND_BENCHMARK + RETAINED_WORKBOOK_PARITY`. Evidence strength remains provenance only and grants no authority.

## 5. Resolved method/input issues

### Advanced natural-frequency boundary

```text
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is excluded; exactly 3 Hz is included. Cached 4 Hz workbook behavior is rejected.

### 273 mm large-family lower boundary

EI D4 confirms the 273 mm flexible-large case.

### Multiphase resolution

```text
only aggregate shape -> AGGREGATE_EFFECTIVE / INFERRED
only component shape -> COMPONENT_DERIVED / INFERRED
both shapes, no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + aggregate mode -> AGGREGATE_EFFECTIVE / EXPLICIT
both + component mode -> COMPONENT_DERIVED / EXPLICIT
invalid mode -> FIT_INPUT_INVALID
```

When both shapes coexist with an explicit choice, `alternateModeDataPresent=true` remains visible in evidence.

### Neutral reference bands

```text
LOF_LT_0_3
LOF_0_3_TO_LT_0_5
LOF_0_5_TO_LT_1
LOF_GE_1
```

No production `pass` boolean is introduced.

## 6. Bounded future screening scope

Controlled scope freeze:

```text
docs/vibration/FIT-Screening-Scope-v1.md
```

Candidate diameter envelope:

```text
60 mm <= Dext <= 219.1 mm      candidate after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate after all gates
```

The QST-003 diameter gap is therefore resolved for the first production target by **explicit exclusion**, not by inventing an interpolation or nominal-size mapping. A later source-backed revision may separately reconsider the excluded interval.

## 7. Working-state and topology authority hardening

The FIT workspace maintains original and working rows with stable row identity and supports cell, row and table revert.

For complete certified XLSX input, preserved XLSX bytes may execute only while all of these remain true:

```text
input format                 XLSX
originalCertifiedExchange    true
authorityDowngraded          false
captured Elements hash       present
current Elements hash        == captured Elements hash
```

The captured hash uses SHA-256 over canonical `FitTopologyElementsProjection.v1`. A missing or mismatched fingerprint fails closed. The first normal topology mutation still irreversibly downgrades the session to Elements-only limited exchange until explicit source reload, even after exact value revert.

This closes the stale/hidden-source bypass class in which preserved XLSX bytes could otherwise be consumed after the visible working projection was replaced without matching downgrade metadata.

## 8. Reproducibility identities

Two identities are intentionally separate:

### Audit snapshot

```text
FitRunSnapshot.v1
snapshotHash
```

The audit identity includes working tables, row IDs, source names/kinds, file descriptors, topology projection fingerprint, limited-exchange state and benchmark identity/modification state.

### Engineering input identity

```text
FitEngineeringInputIdentity.v1
engineeringInputHash
```

The engineering identity is derived from sorted central FIT request scopes, calculation ID, method revision and normalized `resolvedInputs`. Source filenames do not affect this hash; a change to normalized engineering input does.

Run evidence export uses:

```text
FitRunEvidencePackage.v1
```

and cryptographically re-verifies both hashes against their canonical payloads before serialization. The package is explicitly `REPRODUCIBILITY_EVIDENCE_ONLY`, with `engineeringAuthority=NONE`, `screeningAuthorized=false`, and `designAuthority=false`.

## 9. Remaining source/authority questions

### Cached 4 Hz result

Software resolved: rejected by the EI frequency boundary. Retained cache inconsistency remains provenance evidence.

### Hidden workbook support selector

Software resolved: deterministic span-derived classification is used.

### QST-003 diameter gap

Resolved for bounded production scope by explicit exclusion. It remains unsupported rather than interpolated.

### Remaining adopted-method/project coverage

EI D2/D4 examples validate the slices they exercise, not the complete T2.2 applicability domain. Exact page/table/equation adoption, official errata applicability and project basis remain subject to independent review.

### PDF/DOCX project-scenario differences

D2 span differences and D4 revised line-list values remain visible in the traceability record. The published-example PDF retains benchmark precedence; no disagreement is silently normalized.

## 10. CI/release status

The latest historical hosted run recorded in the prior dossier failed before runner allocation because of an account billing/spending condition (`runner_id=0`, `steps=[]`). That run is not a software PASS or FAIL.

For the current PR499 candidate, exact-head native release execution and browser acceptance remain `NOT_RUN` until performed against the final candidate SHA in a complete qualification environment.

The controlled FIT/VIB release manifest now includes 44 test files, including dual-hash run-evidence qualification.

## 11. Promotion checklist

| Gate | Status |
|---|---|
| Source identity/extraction | PASS for controlled object identity |
| Controlled Common pin reconciliation | PASS for active benchmark/method/dossier metadata |
| Source precedence / discrepancy record | PASS; scenario differences remain documented limitations |
| Retained workbook parity | PASS in recorded focused evidence |
| Six standard correlation families | IMPLEMENTED; independent evidence registry strengthened |
| Independent `MEDIUM_SMALL` | IMPLEMENTED / exact-head runtime NOT_RUN |
| Independent advanced `FLEXIBLE_LARGE` | IMPLEMENTED / exact-head runtime NOT_RUN |
| EI D2/D4 published examples | IMPLEMENTED; exact-head runtime NOT_RUN |
| Published-value tolerance reconciliation | PASS by independent arithmetic/source-precision policy |
| 1 Hz / 3 Hz advanced boundary | IMPLEMENTED |
| 273 mm large-family boundary | IMPLEMENTED |
| Aggregate/component equivalence | IMPLEMENTED |
| Mixed multiphase ambiguity fail-closed | IMPLEMENTED |
| QST-003 | EXCLUDED / FAIL_CLOSED in bounded target scope |
| Working row revert | IMPLEMENTED / exact-head runtime NOT_RUN |
| XLSX projection anti-bypass | IMPLEMENTED / exact-head runtime NOT_RUN |
| Audit vs engineering hash separation | IMPLEMENTED / exact-head runtime NOT_RUN |
| Reproducibility evidence export | IMPLEMENTED / exact-head runtime NOT_RUN |
| Full repository regression | NOT_RUN |
| GitHub Actions exact-head execution | NOT_RUN |
| Real-browser XLSX/CSV acceptance | NOT_RUN |
| Remaining page-level EI/project/errata review | NOT COMPLETE |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

## 12. Qualification conclusion

The production-gate implementation has materially reduced the remaining FIT blockers without altering any empirical FIT equation or enabling screening. The remaining blockers are now dominated by exact-head execution evidence, browser/file acceptance, page-level adopted-method/errata review, and independent engineering approval.

Until those gates close in one controlled candidate, `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`.
