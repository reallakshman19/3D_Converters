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

Production-gate work covers retained-workbook parity, independent hand cases, published EI D2/D4 examples, explicit multiphase resolution, bounded future scope, case-specific benchmark tolerances, governed manual data blockers, central SI/US qualification vectors, working-state provenance, dual topology anti-bypass fingerprints, separate audit/engineering hashes and governed run-evidence export.

Still mandatory: exact-head release execution, real-browser/file acceptance, direct page-level adopted-method/errata/project review and independent vibration-engineer approval.

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

The earlier `aef163a5def3bfe04ca0ba860da05728a27daf42` state is historical parent provenance only. Live source metadata use `fb549185...`. Source precedence and PDF/DOCX differences are recorded in `FIT-EI-Worked-Example-Traceability-v1.md`.

## 3. Published EI qualification and tolerances

Controlled dataset:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
```

Published LOF targets:

```text
D2 6 in suction       0.276
D2 4 in relief up     0.338
D2 6 in relief down   0.881
D4 20 in separator    0.26
D4 10 in water        3.15
```

The former blanket `1.5%` tolerance is removed. Controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

Each case stores absolute tolerances for `rho*v^2`, viscosity factor, `Fv` and LOF based on independent equation-register recalculation plus source displayed precision; tolerances are not tuned to production output.

| Case | Absolute LOF tolerance |
|---|---:|
| D2 recycle suction 6 in | 0.0012 |
| D2 relief upstream 4 in | 0.0018 |
| D2 relief downstream 6 in | 0.0011 |
| D4 separator inlet 20 in | 0.0054 |
| D4 produced water 10 in | 0.0070 |

## 4. Independent branch qualification

Independent dataset:

```text
Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json
```

Production Gate 1 closes the former independent-evidence holes with:

```text
FIT-HAND-LIQ-MEDIUM-SMALL-008
FIT-HAND-FLEX-LARGE-LOF-120-FN2-009
```

The evidence registry records standard `MEDIUM_SMALL` and advanced `FLEXIBLE_LARGE` with `INDEPENDENT_HAND_BENCHMARK + RETAINED_WORKBOOK_PARITY`. This grants no authority; `screeningQualified=false` and `engineeringAuthority=NONE` remain unchanged.

## 5. Resolved method/input issues

Advanced frequency boundary:

```text
1 Hz < fn <= 3 Hz
```

Exactly 1 Hz is excluded; exactly 3 Hz is included. Cached 4 Hz advanced behavior is rejected.

Large-family lower boundary: EI D4 supports `273 mm` as `FLEXIBLE_LARGE` where stiffness is flexible.

Multiphase resolution remains explicit/fail-closed:

```text
aggregate only -> AGGREGATE_EFFECTIVE / INFERRED
components only -> COMPONENT_DERIVED / INFERRED
both + no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + aggregate mode -> AGGREGATE_EFFECTIVE / EXPLICIT
both + component mode -> COMPONENT_DERIVED / EXPLICIT
```

No production `pass` boolean is introduced.

## 6. Bounded future screening scope

Controlled by `docs/vibration/FIT-Screening-Scope-v1.md`:

```text
60 mm <= Dext <= 219.1 mm      candidate after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate after all gates
```

QST-003 is resolved for the first bounded target by explicit exclusion, not interpolation, nearest-family selection or user-entered family selection.

## 7. Bounded central API unit qualification

Controlled regression:

```text
tests/vibration-fit-central-api-qualification.test.mjs
```

Literal independently prepared SI/US pairs cover:

- STIFF liquid;
- MEDIUM_STIFF gas, including `Pa*s <-> cP`;
- MEDIUM_SMALL liquid;
- MEDIUM_LARGE component-derived multiphase;
- FLEXIBLE_SMALL advanced, including `Hz <-> rpm`;
- FLEXIBLE_LARGE advanced, including `Hz <-> rpm`;
- aggregate-effective multiphase;
- unsupported unit fail-closed behavior.

The test does not construct the US side by calling the unit converter under test.

## 8. Governed manual data blockers

Owner instruction requires unresolved **data** blockers to be user-enterable in a separate table. The governed contract is:

```text
VibrationFitDataBlockerCsv.v1
```

Workspace tabs:

```text
Engineering Basis
Source Data
Data Blockers
```

The Data Blockers tab displays current readiness missing/invalid fields by line/case and provides an editable blocker table plus CSV template/import.

Statuses:

```text
ACTIVE    participates in benchmark input preparation
HOLD      audit-only; may retain a pending blank value/unit
RESOLVED  audit-only; may retain a historical/pending record
```

An ACTIVE row requires explicit value, source and unit when dimensional. Blank pending numeric HOLD rows remain `null`; they cannot become synthetic zero.

Manual inputs are strictly **fill-only**. Existing source data win, including alternative flow representation custody:

```text
existing source/manual value + conflicting ACTIVE manual value
    -> FIT_DATA_BLOCKER_SOURCE_COLLISION
    -> fail closed
```

A manual velocity cannot supersede source mass flow, or vice versa. Component-derived multiphase inputs can be supplied explicitly using gas/liquid mass-flow and density fields.

Method/domain decisions are not data blockers. `SUPPORT_SIZE_FAMILY`, correlation identity, authority state and similar choices are unsupported manual fields. QST-003 therefore remains non-overridable.

Controlled regression:

```text
tests/vibration-fit-data-blockers.test.mjs
```

covers ACTIVE/HOLD semantics, blank-pending safety, complete component multiphase input, source collision, alternate-flow collision and attempted method-gap bypass.

## 9. Working-state and complete-XLSX authority

The workspace keeps original/working rows with stable row IDs and supports cell, row and whole-table revert. Revert restores values; it does not silently restore complete-exchange authority after topology mutation.

Preserved certified XLSX bytes may execute only while:

```text
input format                 XLSX
originalCertifiedExchange    true
authorityDowngraded          false
Elements projection hash     present and matches
complete XLSX file hash      present and matches
```

Required SHA-256 identities:

```text
FitTopologyElementsProjection.v1
  -> canonical visible Elements projection

FitSourceFileSha256.v1
  -> complete XLSX byte stream
```

The first detects visible working substitution; the second detects hidden/non-Elements sheet or byte-stream substitution. Missing or mismatched identities fail closed. First normal topology edit downgrades the session to Elements-only limited exchange until explicit source reload.

## 10. Reproducibility identities and evidence

### Audit identity

```text
FitRunSnapshot.v1
snapshotHash
```

Includes working tables, Data Blockers, row IDs, source descriptors, complete-XLSX hash where applicable, Elements hash, limited-exchange state and benchmark identity/modification state.

### Engineering identity

```text
FitEngineeringInputIdentity.v1
engineeringInputHash
```

Derived from sorted central request scope, calculation ID, method revision and normalized `resolvedInputs`. Source metadata can change the audit hash without changing engineering identity; a consumed engineering-input change changes engineering identity.

### Export package

```text
FitRunEvidencePackage.v1
```

The export re-verifies both canonical payloads and SHA-256 hashes before serialization and retains source descriptors, blocker source descriptor and exact benchmark workflow envelope.

Authority remains:

```text
engineeringAuthority = NONE
screeningAuthorized  = false
designAuthority      = false
purpose              = REPRODUCIBILITY_EVIDENCE_ONLY
```

## 11. Remaining source/authority questions

Still open and not convertible into manual calculation inputs:

- exact governing T2.2 page/table/equation adoption mapping;
- applicable official errata review;
- project-basis adoption confirmation;
- D2 span and D4 revised DOCX scenario differences as explicit limitations;
- independent vibration-engineer approval of the bounded scope and manual-data policy.

The controlled source object identities are known, but repository transcription alone is not treated as direct page-level engineering approval.

## 12. Current release state

The controlled FIT/VIB manifest contains **47 distinct test files**, including:

```text
tests/vibration-fit-central-api-qualification.test.mjs
tests/vibration-fit-data-blockers.test.mjs
tests/vibration-integrity-run-evidence.test.mjs
```

Current execution truth:

```text
native FIT/VIB release suite   NOT_RUN / ENVIRONMENT_BLOCKED
real-browser acceptance        NOT_RUN
independent engineer approval  NOT_RUN
```

The connector runtime cannot substitute static inspection for execution. Hosted AIV jobs that allocate no test steps are `NOT_RUN`, not PASS.

## 13. Promotion checklist

| Gate | Status |
|---|---|
| Source object identity | PASS by controlled repository/blob inspection |
| Live Common pin reconciliation | PASS |
| Source precedence/discrepancy record | PASS; scenario differences retained as limitations |
| Published-value tolerance reconciliation | PASS by independent arithmetic policy |
| Independent MEDIUM_SMALL | IMPLEMENTED / runtime NOT_RUN |
| Independent advanced FLEXIBLE_LARGE | IMPLEMENTED / runtime NOT_RUN |
| Central bounded SI/US matrix | IMPLEMENTED / runtime NOT_RUN |
| Data Blockers contract + separate tab | IMPLEMENTED / runtime NOT_RUN |
| Pending blank blocker safety | IMPLEMENTED / runtime NOT_RUN |
| Source/alternate-flow collision protection | IMPLEMENTED / runtime NOT_RUN |
| QST-003 manual bypass prevention | IMPLEMENTED / runtime NOT_RUN |
| QST-003 bounded disposition | EXCLUDED / FAIL_CLOSED |
| Cell/row/table revert | IMPLEMENTED / runtime NOT_RUN |
| Elements projection anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Complete XLSX byte-stream anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Audit vs engineering hash separation | IMPLEMENTED / runtime NOT_RUN |
| Reproducibility evidence export | IMPLEMENTED / runtime NOT_RUN |
| 47-file exact-head release regression | NOT_RUN / ENVIRONMENT_BLOCKED |
| Real-browser XLSX/CSV/Data Blockers acceptance | NOT_RUN |
| Page-level EI/project/errata review | NOT COMPLETE |
| Independent vibration-engineer approval | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |
