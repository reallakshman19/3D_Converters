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

The DOCX blob is the same controlled worked-example blob previously tracked in the qualification source set.

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

D2 span differences and D4 revised DOCX scenario differences remain explicit limitations. Repository transcription is not treated as direct page-level engineering approval.

## 3. Published and independent numerical evidence

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

## 4. Owner benchmark-qualification rule

Owner direction for this FIT production candidate:

```text
If the implementation reproduces the controlled worked examples,
a separate independent vibration-engineer review is not required.
```

The qualification source is the exact DOCX at `Common@7bfead910f6bca91b10748ead009e40f20c82219`, blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`.

The rule removes only the separate vibration-engineer sign-off gate. It does not waive:

- the bounded scope and QST-003 exclusion;
- controlled-source traceability and discrepancy disposition;
- independent numerical branch evidence already included in the suite;
- exact release regression;
- real-browser/real-file acceptance;
- reproducibility and anti-bypass controls;
- Owner authorization of the later screening-authority PR.

## 5. Candidate bounded scope

```text
60 mm <= Dext <= 219.1 mm      candidate after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate after all gates
```

QST-003 is therefore excluded for the first production target. No interpolation, nearest-family choice or user-entered `SUPPORT_SIZE_FAMILY` may bypass it.

Candidate process paths:

```text
LIQUID
GAS
MULTIPHASE / AGGREGATE_EFFECTIVE
MULTIPHASE / COMPONENT_DERIVED
```

Advanced candidate path remains:

```text
FLEXIBLE_SMALL or FLEXIBLE_LARGE
standard LOF >= 1
1 Hz < fn <= 3 Hz
```

## 6. Central API bounded unit qualification

Controlled regression:

```text
tests/vibration-fit-central-api-qualification.test.mjs
```

Literal independently prepared SI/US pairs cover:

- STIFF liquid;
- MEDIUM_STIFF gas with `Pa*s <-> cP`;
- MEDIUM_SMALL liquid;
- MEDIUM_LARGE component-derived multiphase;
- FLEXIBLE_SMALL advanced with `Hz <-> rpm`;
- FLEXIBLE_LARGE advanced with `Hz <-> rpm`;
- aggregate-effective multiphase;
- unsupported engineering-unit fail-closed behavior.

The test does not generate the US side with the converter under test.

## 7. Governed Data Blockers user input

Per Owner instruction, unresolved **data-dependent** FIT blockers are available as explicit user inputs through:

```text
VibrationFitDataBlockerCsv.v1
```

Workspace input tabs:

```text
Engineering Basis
Source Data
Data Blockers
```

The Data Blockers tab displays current readiness missing/invalid fields by line/case and provides an editable table, CSV import and template export.

Statuses:

```text
ACTIVE    may fill a missing engineering datum
HOLD      audit-only; may retain a pending blank value/unit
RESOLVED  audit-only
```

An ACTIVE dimensional row requires explicit value, unit and source. Pending blank numeric HOLD rows remain `null`; they cannot become synthetic zero.

Manual inputs are fill-only. Existing source values win. Existing source mass flow also prevents a manual alternate velocity input, and vice versa. Collisions fail as `FIT_DATA_BLOCKER_SOURCE_COLLISION`.

Method/domain decisions are not data inputs. `SUPPORT_SIZE_FAMILY`, correlation identity, screening authority and design authority are unsupported blocker fields. QST-003 therefore remains non-overridable.

Controlled regression:

```text
tests/vibration-fit-data-blockers.test.mjs
```

covers pending blank safety, ACTIVE/HOLD behavior, component-derived multiphase, source collision, alternate-flow collision and attempted method-gap bypass.

## 8. Working-state and complete-XLSX authority

The workspace maintains original/working rows with cell, row and table revert.

Preserved complete XLSX execution requires both SHA-256 identities:

```text
FitTopologyElementsProjection.v1
  visible canonical Elements projection

FitSourceFileSha256.v1
  complete XLSX byte stream
```

The first detects visible working projection substitution; the second detects hidden/non-Elements workbook changes. Missing/mismatched fingerprints fail closed.

The first normal topology edit irreversibly downgrades complete-exchange authority until explicit source reload. Revert restores values but not that authority.

Readiness/run use captured immutable input state. In-flight change invalidates readiness or marks the resulting calculation `STALE_RESULT`.

## 9. Reproducibility identity

```text
FitRunSnapshot.v1
snapshotHash
  = source/audit/working-state identity

FitEngineeringInputIdentity.v1
engineeringInputHash
  = normalized consumed engineering-request identity
```

Data Blockers participate in the audit identity and stale detection. Consumed blocker values also affect the engineering identity through normalized central `resolvedInputs`.

`FitRunEvidencePackage.v1` re-verifies both canonical payloads/hashes and retains source descriptors, blocker source descriptor, benchmark identity and the exact benchmark workflow envelope.

Authority remains `REPRODUCIBILITY_EVIDENCE_ONLY`.

## 10. Controlled release gate

Command:

```text
npm run verify:vibration-fit-release
```

Current PR499 manifest contains **50 distinct test files** across engineering core, FIT engineering evidence, facility/tabular, workspace/UI and multi-mechanism validation groups.

The coordinated gate now also contains the three shared regressions introduced by merged #500/#501 because those changes modify the same Vibration Integrity shell used by FIT:

```text
tests/vibration-user-engineering-data.test.mjs
tests/vibration-sbc-type3-user-data.test.mjs
tests/vibration-sbc-type3-user-data-table-validation.test.mjs
```

Execution truth:

```text
native exact 50-file suite          NOT_RUN / ENVIRONMENT_BLOCKED
real-browser acceptance             NOT_RUN
real five-sheet XLSX acceptance     NOT_RUN
```

Static/source construction is not runtime PASS. Hosted jobs that allocate no executable steps remain NOT_RUN/INFRASTRUCTURE_BLOCKED, not FIT test failure or success.

## 11. Remaining source/qualification blockers

Still open and deliberately not converted to user-entered calculation data:

- direct governing T2.2 page/table/equation mapping;
- applicable official errata review;
- project-basis adoption confirmation;
- explicit disposition of D2/D4 source differences;
- exact 50-file release execution;
- real-browser/real-file acceptance.

A separate independent vibration-engineer recommendation is **not** a remaining gate when the controlled worked-example benchmark passes.

## 12. Promotion checklist

| Gate | Status |
|---|---|
| Controlled source identity | PASS by repository/blob inspection |
| Owner worked-example qualification source (`Common@7bfead910...`, blob `ceee15ed...`) | PASS by repository/blob inspection |
| Source precedence/discrepancy record | PASS; limitations retained |
| Published tolerance reconciliation | PASS by controlled policy construction |
| Independent MEDIUM_SMALL | IMPLEMENTED / runtime NOT_RUN |
| Independent advanced FLEXIBLE_LARGE | IMPLEMENTED / runtime NOT_RUN |
| Bounded SI/US matrix | IMPLEMENTED / runtime NOT_RUN |
| Data Blockers separate tab/contract | IMPLEMENTED / runtime NOT_RUN |
| Pending blank blocker safety | IMPLEMENTED / runtime NOT_RUN |
| Source/alternate-flow collision protection | IMPLEMENTED / runtime NOT_RUN |
| QST-003 manual bypass protection | IMPLEMENTED / runtime NOT_RUN |
| QST-003 disposition | EXCLUDED / FAIL_CLOSED |
| Cell/row/table revert | IMPLEMENTED / runtime NOT_RUN |
| Elements/full-XLSX anti-bypass | IMPLEMENTED / runtime NOT_RUN |
| Audit/engineering dual hash | IMPLEMENTED / runtime NOT_RUN |
| Run-evidence export | IMPLEMENTED / runtime NOT_RUN |
| Current-main #500/#501 shared shell reconciliation | PASS by GitHub ancestry/content reconciliation |
| Independent vibration-engineer review | NOT REQUIRED when controlled worked-example benchmark passes |
| Exact 50-file release regression | NOT_RUN / ENVIRONMENT_BLOCKED |
| Browser/XLSX/CSV/Data Blockers acceptance | NOT_RUN |
| Direct EI/errata/project review | NOT COMPLETE |
| Screening authority | NOT_AUTHORIZED |
| Design authority | NOT_AUTHORIZED |
