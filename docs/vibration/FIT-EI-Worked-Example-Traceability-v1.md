# FIT EI Worked-Example Traceability v1

Status: **SOURCE + BENCHMARK-TOLERANCE RECONCILIATION — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`

## 1. Purpose

This record binds the FIT qualification examples to controlled EI evidence, records the observed PDF/DOCX scenario differences, and defines the benchmark-reconciliation tolerance policy. It is a qualification traceability artifact, not a screening/design authority grant.

## 2. Controlled source identities

| Role | Repository / commit | Source | Git blob | Authority use |
|---|---|---|---|---|
| Governing method | `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6` | `EI - AVIFF Guidelines 2nd Edition.pdf` | `9d3eccc56429411e17c07a579bdebbd13cb0bdc5` | Governing T2.2 method/applicability source |
| Published worked examples | `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6` | `EI - AVIFF Guidelines 2nd Edition_Examples.pdf` | `3e2517d0df527a051084fc02e69cb7afa31f8d47` | Published D2/D4 benchmark values |
| Owner qualification anchor | `reallaksh19/Common@7bfead910f6bca91b10748ead009e40f20c82219` | `Energy-Institute-AVIFF---Worked-Examples.doc.docx` | `ceee15ed5f7f320045d5f3979024e2e8664613f2` | Controlled worked-example benchmark qualification source |
| Retained workbook | `reallaksh19/CRF-4-1@68dc8e1fa2ef67073c59b3afc56f1bf40953d535` | `Extended calc2/AIV FIV/FIT.xlsm` | `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` | Migration/parity evidence only |

The DOCX at `Common@7bfead910...` is the same controlled blob previously tracked in the qualification evidence set. The Owner has directed that successful reproduction of the controlled worked examples is sufficient engineering qualification evidence for FIT; a separate independent vibration-engineer sign-off is not required.

## 3. Source precedence

When values differ:

1. governing EI method PDF controls equations/applicability;
2. EI worked-example PDF controls the published D2/D4 benchmark vector;
3. the Owner-pinned DOCX is the controlled worked-example qualification anchor and preserves richer/revised scenario evidence;
4. controlled JSON is the executable transcription of the adopted benchmark vector;
5. retained workbook is migration/parity evidence only.

The benchmark is not allowed to silently replace a higher-ranked method value with a lower-ranked source value. Known source differences remain explicit.

## 4. Controlled benchmark mapping

| Benchmark | DOCX observation | Controlled PDF/JSON benchmark | Reconciliation |
|---|---|---|---|
| `EI-D2-FIT-RECYCLE-SUCTION-6IN` | span 7 m, FIT 0.28 | span 6.4 m, LOF 0.276 | geometry/process corroborated; span difference retained |
| `EI-D2-FIT-RELIEF-UPSTREAM-4IN` | span 6 m, rhoV2 80379 Pa, FIT 0.34 | span 5.2 m, rhoV2 80203 Pa, LOF 0.338 | span/rhoV2 differences retained |
| `EI-D2-FIT-RELIEF-DOWNSTREAM-6IN` | span 7 m, rhoV2 158823 Pa, FIT 0.88 | span 6.4 m, rhoV2 158823 Pa, LOF 0.881 | span difference retained |
| `EI-D4-FIT-SEPARATOR-INLET-20IN` | density 136, velocity 9.0 m/s, span 9 m, FIT 0.26 | density 136, velocity 9.3 m/s, span 5 m, LOF 0.26 | revised/project scenario difference retained |
| `EI-D4-FIT-PRODUCED-WATER-10IN` | revised density 1000, velocity 3.0 m/s, span 19 m, FIT 3.12 | density 988, velocity 2.9 m/s, span 18 m, LOF 3.15 | revised/project scenario difference retained |

These differences do not invalidate the five benchmark vectors; they show that the DOCX contains project/revised observations in addition to the published-example vector. The executable benchmark therefore retains the published vector while the exact Owner-pinned DOCX remains the qualification anchor.

## 5. Published-value tolerance reconciliation

Controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

The former blanket `1.5%` relative tolerance is removed. The controlled absolute LOF tolerances are:

| Case | Published LOF | Absolute LOF tolerance |
|---|---:|---:|
| D2 recycle suction 6 in | 0.276 | 0.0012 |
| D2 relief upstream 4 in | 0.338 | 0.0018 |
| D2 relief downstream 6 in | 0.881 | 0.0011 |
| D4 separator inlet 20 in | 0.26 | 0.0054 |
| D4 produced water 10 in | 3.15 | 0.0070 |

Tolerances are derived from equation-register recalculation of the published input vector plus source display precision. They may not be relaxed merely to make a production implementation pass.

## 6. Owner benchmark-qualification rule

For this FIT screening candidate:

```text
controlled worked-example reproduction PASS
    -> engineering benchmark qualification satisfied
    -> separate independent vibration-engineer review NOT REQUIRED
```

Qualification anchor:

```text
Common@7bfead910f6bca91b10748ead009e40f20c82219
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

This rule does not waive the exact release suite, browser/real-file acceptance, source traceability, QST-003 fail-closed exclusion, or Owner authorization of the future screening-authority PR.

## 7. Remaining source gates

Before screening activation:

1. retain page/table/equation traceability for adopted T2.2 items;
2. disposition applicable official errata/project basis;
3. retain the D2/D4 source differences above as explicit evidence limitations;
4. retain the case-specific tolerance policy unless new controlled source evidence justifies a reviewed revision;
5. retain QST-003 (`219.1 < Dext < 273 mm`) as a fail-closed production exclusion unless separately source-resolved.

A separate independent vibration-engineer approval is not part of this list.

## 8. Authority conclusion

The worked-example qualification source is now explicitly pinned to the Owner-specified Common commit and blob. FIT still remains `BENCHMARK_ONLY`, `screeningAuthority=NOT_AUTHORIZED`, and `designAuthority=false` until the remaining technical/release gates pass and the Owner authorizes the separate authority transition.
