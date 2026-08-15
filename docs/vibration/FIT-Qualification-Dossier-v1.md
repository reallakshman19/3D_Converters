# FIT Qualification Dossier v1

Status: **PRODUCTION-GATE QUALIFICATION ACTIVE — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`  
Mechanism: Flow-Induced Turbulence (FIT)  
Qualification issue: #429  
Workspace/production issue: #443  
Method revision: `ei-aviff2-fit-reference-v2`

## 1. Authority

```text
calculationState       = IMPLEMENTED
qualificationState     = BENCHMARK_ONLY
engineeringAuthority   = NONE
screeningAuthority     = NOT_AUTHORIZED
designAuthority        = NOT_AUTHORIZED
```

This dossier does not authorize production screening. Any eventual bounded `BENCHMARK_ONLY -> SCREENING` change must be a separate Owner-authorized governance PR after all remaining gates pass on one exact candidate SHA.

## 2. Controlled source set

Method/project source set:

```text
Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI full guidance PDF blob     9d3eccc56429411e17c07a579bdebbd13cb0bdc5
EI examples PDF blob          3e2517d0df527a051084fc02e69cb7afa31f8d47
```

Owner-approved worked-example qualification anchor:

```text
Common@7bfead910f6bca91b10748ead009e40f20c82219
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Retained workbook evidence:

```text
reallaksh19/CRF-4-1@68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Extended calc2/AIV FIV/FIT.xlsm
blob d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
```

Source precedence:

```text
governing EI method PDF
  > published EI worked-example PDF
  > DOCX/project scenario evidence
  > controlled JSON transcription
  > retained workbook parity evidence
```

D2 span differences and D4 revised DOCX scenario differences remain explicit evidence and are not silently normalized.

## 3. Source-basis disposition

Durable source-basis record:

```text
docs/vibration/FIT-Source-Basis-Evidence-v1.md
converters/vibration/fit/source-basis-evidence.js
schema = FitSourceBasisEvidence.v1
```

### 3.1 Product method basis

```text
productMethodBasis = ADOPTED_EI_T2_2_REFERENCE
```

The product FIT reference method is Energy Institute 2nd Edition, Technical Module T2.2 — Flow Induced Turbulence.

### 3.2 Official errata

Current official EI corrections affect:

```text
page 61 -> Flowchart T2-5 feed correction
page 68 -> Flowchart T2-8 peak-force correction
```

Repository method custody assigns T2-5 to the AIV feed path and T2-8 to the valve-transient peak-force path. Neither correction modifies the T2.2 FIT calculation chain.

```text
officialErrata.status = REVIEWED_NOT_APPLICABLE_TO_FIT_T2_2
```

### 3.3 Project/client method adoption

```text
productReferenceMethod          = CONFIRMED
externalProjectOrClientAdoption = PROJECT_SPECIFIC_CONFIRMATION_REQUIRED
```

The application does not infer external project/client method adoption merely because the FIT reference method is available.

### 3.4 D2/D4 differences

```text
D2_D4_SOURCE_DIFFERENCES = EXPLICITLY_DISPOSITIONED
```

Published EI PDF/controlled JSON remains the benchmark comparison vector. The Owner-controlled DOCX is the qualification anchor and preserves richer/revised scenario evidence. The retained workbook remains migration/parity evidence only.

### 3.5 Remaining direct-source locator gate

```text
DIRECT_T2_2_PAGE_TABLE_EQUATION_MAPPING = NOT_COMPLETE
```

The full controlled PDF is pinned by commit/path/blob, but the governing T2.2 pages have not been directly rendered/read back in this connector runtime. Repository transcriptions and workbook formulas are not substituted for that locator audit.

## 4. Published and independent numerical evidence

Published example dataset:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
```

The former blanket 1.5% comparison was replaced by `FIT-EI-PUBLISHED-RECONCILIATION-V1`: case/field absolute tolerances based on equation-register recomputation plus displayed source precision.

Independent dataset:

```text
Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json
```

Former evidence holes are covered by:

```text
FIT-HAND-LIQ-MEDIUM-SMALL-008
FIT-HAND-FLEX-LARGE-LOF-120-FN2-009
```

Evidence strength remains provenance only; it grants no screening/design authority by itself.

## 5. Owner benchmark-qualification rule

Owner direction for this FIT production candidate:

```text
If the implementation reproduces the controlled worked examples,
a separate independent vibration-engineer review is not required.
```

The qualification source is the exact DOCX at `Common@7bfead910f6bca91b10748ead009e40f20c82219`, blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`.

The rule removes only the separate vibration-engineer sign-off gate. It does not waive:

- bounded scope and QST-003 exclusion;
- controlled-source traceability;
- independent numerical branch evidence;
- exact release regression;
- real-browser/real-file acceptance;
- reproducibility and anti-bypass controls;
- Owner authorization of the later screening-authority PR.

## 6. Candidate bounded scope

```text
60 mm <= Dext <= 219.1 mm      candidate after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate after all gates
```

QST-003 is excluded for the first production target. No interpolation, nearest-family choice or user-entered `SUPPORT_SIZE_FAMILY` may bypass it.

Candidate process paths:

```text
LIQUID
GAS
MULTIPHASE / AGGREGATE_EFFECTIVE
MULTIPHASE / COMPONENT_DERIVED
```

Advanced candidate path:

```text
FLEXIBLE_SMALL or FLEXIBLE_LARGE
standard LOF >= 1
1 Hz < fn <= 3 Hz
```

## 7. Central API bounded unit qualification

Controlled regression:

```text
tests/vibration-fit-central-api-qualification.test.mjs
```

Literal independently prepared SI/US pairs cover STIFF liquid, MEDIUM_STIFF gas, MEDIUM_SMALL liquid, MEDIUM_LARGE component multiphase, FLEXIBLE_SMALL/LARGE advanced, aggregate-effective multiphase and unsupported-unit fail-closed behavior.

## 8. Governed Data Blockers input

Owner-directed explicit missing-data contract:

```text
VibrationFitDataBlockerCsv.v1
```

Workspace tabs:

```text
Engineering Basis
Source Data
Data Blockers
```

`ACTIVE` may fill missing data. `HOLD` and `RESOLVED` are audit-only. Existing source values always win. Pending blank numeric HOLD rows remain null, never zero. Alternate flow-representation and source/manual collisions fail closed. Method/domain choices are not user-enterable blocker fields.

## 9. Operator-visible method basis

The Engineering Basis tab now visibly exposes:

```text
EI edition + T2.2 method
Official errata disposition
Product reference-method state
Project/client adoption state
Current BENCHMARK_ONLY authority
```

This prevents product method support from being mistaken for project adoption or screening/design authority.

## 10. Working-state and complete-XLSX authority

The workspace maintains original/working rows with cell, row and table revert.

Preserved complete XLSX execution requires:

```text
FitTopologyElementsProjection.v1 SHA-256
FitSourceFileSha256.v1 SHA-256
```

The first normal topology edit irreversibly downgrades complete-exchange authority until explicit source reload. Revert restores values but not that authority.

Readiness/run use captured immutable state. In-flight changes invalidate readiness or produce `STALE_RESULT`.

## 11. Reproducibility identity

```text
FitRunSnapshot.v1 / snapshotHash
FitEngineeringInputIdentity.v1 / engineeringInputHash
FitRunEvidencePackage.v1
```

Run evidence binds both identities, source descriptors and the central workflow result. Evidence authority remains bounded by the execution envelope and cannot self-authorize screening.

## 12. Controlled release gate

```text
npm run verify:vibration-fit-release
```

Current manifest contains **50 distinct controlled test files** and includes the merged #500/#501 shared-shell regressions. The Engineering Basis test also covers the new source-basis evidence/UI seam.

Execution truth:

```text
native exact 50-file suite          NOT_RUN / ENVIRONMENT_BLOCKED
real-browser acceptance             NOT_RUN
real five-sheet XLSX acceptance     NOT_RUN
```

Static/source construction is not runtime PASS. Hosted jobs or status contexts that do not execute tests are not treated as validation.

## 13. Remaining qualification blockers

Still open:

- direct governing T2.2 page/table/equation locator mapping;
- exact 50-file release execution on one frozen candidate SHA;
- real-browser/real-file acceptance;
- controlled worked-example product-path reproduction on that same frozen SHA.

Closed/dispositioned:

- official EI errata applicability — `PASS / NOT_APPLICABLE_TO_FIT_T2_2`;
- product FIT method basis — `PASS`;
- project/client adoption semantic boundary — `PASS`, with per-project confirmation required;
- retained D2/D4 source differences — `PASS / EXPLICITLY_DISPOSITIONED`;
- independent vibration-engineer recommendation — `NOT_APPLICABLE` under Owner benchmark rule.

## 14. Promotion checklist

| Gate | Status |
|---|---|
| Controlled source identity | PASS by repository/blob inspection |
| Owner qualification source identity | PASS by repository/blob inspection |
| Product EI T2.2 method basis | PASS |
| Official errata applicability | PASS / NOT_APPLICABLE_TO_FIT_T2_2 |
| Project/client adoption boundary | PASS / PROJECT_SPECIFIC_CONFIRMATION_REQUIRED |
| D2/D4 source-difference disposition | PASS |
| Direct T2.2 page/table/equation locator | NOT_RUN / NOT_COMPLETE |
| Published tolerance reconciliation | PASS by controlled policy construction |
| Independent MEDIUM_SMALL | IMPLEMENTED / runtime NOT_RUN |
| Independent advanced FLEXIBLE_LARGE | IMPLEMENTED / runtime NOT_RUN |
| Bounded SI/US matrix | IMPLEMENTED / runtime NOT_RUN |
| Data Blockers | IMPLEMENTED / runtime NOT_RUN |
| Cell/row/table revert | IMPLEMENTED / runtime NOT_RUN |
| Elements/full-XLSX anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Audit/engineering dual hash | IMPLEMENTED / runtime NOT_RUN |
| Run-evidence export | IMPLEMENTED / runtime NOT_RUN |
| Current-main #500/#501 reconciliation | PASS |
| Independent vibration-engineer review | NOT_APPLICABLE under Owner benchmark policy |
| Exact 50-file release regression | NOT_RUN / ENVIRONMENT_BLOCKED |
| Browser/XLSX/CSV/Data Blockers acceptance | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |

No `NOT_RUN` item may be converted to PASS from source inspection alone.
