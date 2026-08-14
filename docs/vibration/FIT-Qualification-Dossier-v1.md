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

The production-gate work now covers retained-workbook parity, independent hand-derived cases, published EI D2/D4 examples, explicit multiphase resolution, bounded future screening scope, case-specific published-value tolerances, working-state provenance, dual topology anti-bypass fingerprints, separate audit/engineering hashes, and governed run-evidence export. Exact-head release execution, real-browser acceptance, page-level adopted-method/errata review and independent vibration-engineer approval remain mandatory.

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

The earlier `aef163a5def3bfe04ca0ba860da05728a27daf42` state is historical parent provenance only. Live method, dossier, benchmark and UI source metadata use `fb549185...`. Source precedence and PDF/DOCX differences are recorded in `FIT-EI-Worked-Example-Traceability-v1.md`.

## 3. Published EI qualification and tolerances

Controlled benchmark dataset:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
```

Published numerical targets:

```text
D2 6 in suction       LOF 0.276
D2 4 in relief up     LOF 0.338
D2 6 in relief down   LOF 0.881
D4 20 in separator    LOF 0.26
D4 10 in water        LOF 3.15
```

The former blanket `1.5%` tolerance is removed. Controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

Each case stores absolute tolerances for `rho*v^2`, viscosity factor, `Fv` and LOF. They are derived from independent equation-register recalculation of the published input vector plus half the least displayed output increment; they are not tuned to production output.

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

Production Gate 1 closes the two former evidence holes with:

```text
FIT-HAND-LIQ-MEDIUM-SMALL-008
FIT-HAND-FLEX-LARGE-LOF-120-FN2-009
```

The evidence registry now classifies standard `MEDIUM_SMALL` and advanced `FLEXIBLE_LARGE` with `INDEPENDENT_HAND_BENCHMARK + RETAINED_WORKBOOK_PARITY`. This is provenance evidence only; `screeningQualified=false` and `engineeringAuthority=NONE` remain unchanged.

## 5. Resolved method/input issues

Advanced frequency boundary:

```text
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is excluded; exactly 3 Hz is included. Cached 4 Hz behavior is rejected.

Large-family boundary: EI D4 confirms `273 mm` as `FLEXIBLE_LARGE` where stiffness is flexible.

Multiphase resolution remains explicit/fail-closed:

```text
aggregate only -> AGGREGATE_EFFECTIVE / INFERRED
components only -> COMPONENT_DERIVED / INFERRED
both + no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + aggregate mode -> AGGREGATE_EFFECTIVE / EXPLICIT
both + component mode -> COMPONENT_DERIVED / EXPLICIT
```

Neutral reference bands remain benchmark/workflow semantics only; no production `pass` boolean is introduced.

## 6. Bounded future screening scope

Controlled by `docs/vibration/FIT-Screening-Scope-v1.md`:

```text
60 mm <= Dext <= 219.1 mm      candidate after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate after all gates
```

QST-003 is therefore resolved for the first production target by explicit exclusion, not by interpolation or nominal-size inference.

## 7. Working-state and complete-XLSX authority

The workspace keeps original and working rows with stable row IDs and supports cell, row and whole-table revert. Revert restores values; it does not silently restore complete-exchange authority after a topology mutation.

Preserved certified XLSX bytes may execute only while all of these remain true:

```text
input format                 XLSX
originalCertifiedExchange    true
authorityDowngraded          false
Elements projection hash     present and matches
complete XLSX file hash      present and matches
```

Two SHA-256 identities are required:

```text
FitTopologyElementsProjection.v1
  -> canonical visible Elements projection

FitSourceFileSha256.v1
  -> complete XLSX byte stream
```

The first detects working/visible projection substitution. The second detects hidden/non-Elements sheet or other XLSX byte-stream substitution even if Elements is unchanged. Missing or mismatched fingerprints fail closed. The first normal topology edit downgrades the session to Elements-only limited exchange until explicit source reload.

## 8. Reproducibility identities and evidence

### Audit identity

```text
FitRunSnapshot.v1
snapshotHash
```

Includes working tables, row IDs, source descriptors, complete-XLSX hash where applicable, Elements projection hash, limited-exchange state and benchmark identity/modification state.

### Engineering identity

```text
FitEngineeringInputIdentity.v1
engineeringInputHash
```

Derived from sorted central request scope, calculation ID, method revision and normalized `resolvedInputs`. Source filename changes do not change this hash; normalized engineering-input changes do.

### Export package

```text
FitRunEvidencePackage.v1
```

The export re-verifies both canonical payloads and both SHA-256 hashes before serialization and carries the source descriptors plus exact benchmark workflow envelope. Authority remains:

```text
engineeringAuthority = NONE
screeningAuthorized  = false
designAuthority      = false
purpose              = REPRODUCIBILITY_EVIDENCE_ONLY
```

## 9. Remaining source/authority questions

- Exact page/table/equation adoption and official errata applicability are not fully independently reviewed.
- D2 span differences and D4 revised DOCX scenario values remain explicit provenance differences; the published-example PDF retains benchmark precedence.
- The historical `FIT-Issue429-Engineering-Review-Package.md` contains older qualification/source-pin snapshots and is not the live source-authority record for PR499.
- Full unit/boundary/release/browser evidence must be executed on one exact candidate SHA.

## 10. Current release state

The controlled FIT/VIB manifest now contains **45** test files after adding the dual-hash run-evidence regression.

For the current PR499 candidate:

```text
native FIT/VIB release suite   NOT_RUN / ENVIRONMENT_BLOCKED
real-browser acceptance        NOT_RUN
independent engineer approval  NOT_RUN
```

Hosted status/workflow state must be checked again on the final exact head. A workflow that allocates no runner or executes no steps remains `NOT_RUN`, not PASS.

## 11. Promotion checklist

| Gate | Status |
|---|---|
| Source object identity | PASS by controlled repository/blob inspection |
| Live Common pin reconciliation | PASS |
| Source precedence/discrepancy record | PASS; documented scenario differences remain limitations |
| Published-value tolerance reconciliation | PASS by independent arithmetic policy |
| Independent MEDIUM_SMALL | IMPLEMENTED / runtime NOT_RUN |
| Independent advanced FLEXIBLE_LARGE | IMPLEMENTED / runtime NOT_RUN |
| QST-003 | EXCLUDED / FAIL_CLOSED |
| Cell/row/table revert | IMPLEMENTED / runtime NOT_RUN |
| Elements projection anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Complete XLSX byte-stream anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Audit vs engineering hash separation | IMPLEMENTED / runtime NOT_RUN |
| Reproducibility evidence export | IMPLEMENTED / runtime NOT_RUN |
| 45-file exact-head release regression | NOT_RUN |
| Real-browser XLSX/CSV acceptance | NOT_RUN |
| Page-level EI/project/errata review | NOT COMPLETE |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

## 12. Qualification conclusion

The remaining blockers are now dominated by exact-head executable validation, real-browser/real-file acceptance, page-level adopted-method/errata review, and independent vibration-engineer approval rather than missing UI or evidence plumbing.

Until those gates close on one controlled candidate and a separate owner-authorized authority PR is approved, `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`.
