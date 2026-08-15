# FIT EI Worked-Example Traceability v1

Status: **SOURCE + BENCHMARK-TOLERANCE RECONCILIATION — SCREENING AUTHORITY NOT APPROVED**

Calculation ID: `VIB.FIV.FLOW_TURBULENCE`

## 1. Purpose

This record binds FIT qualification examples to controlled EI evidence, records the observed PDF/DOCX scenario differences, and defines the benchmark-reconciliation tolerance policy. It is a qualification traceability artifact, not a screening/design authority grant.

## 2. Controlled source identities

| Role | Repository / commit | Source | Git blob | Authority use |
|---|---|---|---|---|
| Governing method | `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6` | `EI - AVIFF Guidelines 2nd Edition.pdf` | `9d3eccc56429411e17c07a579bdebbd13cb0bdc5` | Governing T2.2 method/applicability source |
| Published worked examples | `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6` | `EI - AVIFF Guidelines 2nd Edition_Examples.pdf` | `3e2517d0df527a051084fc02e69cb7afa31f8d47` | Published D2/D4 benchmark values |
| Owner qualification anchor | `reallaksh19/Common@7bfead910f6bca91b10748ead009e40f20c82219` | `Energy-Institute-AVIFF---Worked-Examples.doc.docx` | `ceee15ed5f7f320045d5f3979024e2e8664613f2` | Controlled worked-example benchmark qualification source |
| Retained workbook | `reallaksh19/CRF-4-1@68dc8e1fa2ef67073c59b3afc56f1bf40953d535` | `Extended calc2/AIV FIV/FIT.xlsm` | `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` | Migration/parity evidence only |

The Owner has directed that successful reproduction of the controlled worked examples is sufficient engineering qualification evidence for FIT; a separate independent vibration-engineer sign-off is not required.

## 3. Source precedence

When values differ:

1. governing EI method PDF controls equations/applicability;
2. EI worked-example PDF controls the published D2/D4 benchmark vector;
3. the Owner-pinned DOCX is the controlled worked-example qualification anchor and preserves richer/revised scenario evidence;
4. controlled JSON is the executable transcription of the adopted benchmark vector;
5. retained workbook is migration/parity evidence only.

No lower-ranked source silently replaces a higher-ranked method or benchmark value.

## 4. Controlled benchmark mapping

| Benchmark | DOCX observation | Controlled PDF/JSON benchmark | Reconciliation |
|---|---|---|---|
| `EI-D2-FIT-RECYCLE-SUCTION-6IN` | span 7 m, FIT 0.28 | span 6.4 m, LOF 0.276 | geometry/process corroborated; span difference retained |
| `EI-D2-FIT-RELIEF-UPSTREAM-4IN` | span 6 m, rhoV2 80379 Pa, FIT 0.34 | span 5.2 m, rhoV2 80203 Pa, LOF 0.338 | span/rhoV2 differences retained |
| `EI-D2-FIT-RELIEF-DOWNSTREAM-6IN` | span 7 m, rhoV2 158823 Pa, FIT 0.88 | span 6.4 m, rhoV2 158823 Pa, LOF 0.881 | span difference retained |
| `EI-D4-FIT-SEPARATOR-INLET-20IN` | density 136, velocity 9.0 m/s, span 9 m, FIT 0.26 | density 136, velocity 9.3 m/s, span 5 m, LOF 0.26 | revised/project scenario difference retained |
| `EI-D4-FIT-PRODUCED-WATER-10IN` | revised density 1000, velocity 3.0 m/s, span 19 m, FIT 3.12 | density 988, velocity 2.9 m/s, span 18 m, LOF 3.15 | revised/project scenario difference retained |

Disposition:

```text
D2_D4_SOURCE_DIFFERENCES = EXPLICITLY_DISPOSITIONED
published PDF/JSON        = benchmark comparison vector
Owner DOCX                = qualification anchor + richer/revised scenario evidence
retained workbook         = migration/parity evidence only
```

The differences do not invalidate the controlled five-case benchmark vector and are not averaged or silently normalized.

## 5. Published-value tolerance reconciliation

Controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

The former blanket `1.5%` relative tolerance is removed. Controlled absolute LOF tolerances are:

| Case | Published LOF | Absolute LOF tolerance |
|---|---:|---:|
| D2 recycle suction 6 in | 0.276 | 0.0012 |
| D2 relief upstream 4 in | 0.338 | 0.0018 |
| D2 relief downstream 6 in | 0.881 | 0.0011 |
| D4 separator inlet 20 in | 0.26 | 0.0054 |
| D4 produced water 10 in | 3.15 | 0.0070 |

Tolerances are derived from equation-register recalculation of the published input vector plus source display precision. They may not be relaxed merely to make a production implementation pass.

## 6. Source-basis and errata disposition

Detailed record:

```text
docs/vibration/FIT-Source-Basis-Evidence-v1.md
```

Current disposition:

```text
product method                         = EI 2nd Edition T2.2 FIT reference
current official errata applicability = REVIEWED_NOT_APPLICABLE_TO_FIT_T2_2
external project/client adoption       = PROJECT_SPECIFIC_CONFIRMATION_REQUIRED
direct T2.2 page/table/equation audit  = NOT_COMPLETE
```

The two official EI corrections currently identified for pages 61 and 68 belong to T2-5 and T2-8 paths, not the T2.2 FIT chain. This does not substitute for direct page-level T2.2 equation/table locator reconciliation against the controlled PDF.

## 7. Owner benchmark-qualification rule

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

This rule does not waive the exact release suite, browser/real-file acceptance, direct source locator trace, QST-003 fail-closed exclusion, or Owner authorization of the future screening-authority PR.

## 8. Remaining gates

Before screening activation:

1. complete direct governing T2.2 page/table/equation locator mapping;
2. execute the exact coordinated release suite on one frozen candidate SHA;
3. execute real-browser/real-file acceptance;
4. reproduce the controlled worked examples on that same frozen SHA;
5. retain QST-003 (`219.1 < Dext < 273 mm`) as fail-closed unless separately resolved;
6. obtain explicit Owner authorization for a separate `BENCHMARK_ONLY -> SCREENING` governance PR.

## 9. Authority conclusion

FIT remains:

```text
qualificationState   = BENCHMARK_ONLY
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

The D2/D4 source-difference and errata dispositions do not themselves grant screening/design authority.
