# WIP-VIB-FIT-SOURCE-20260818 — FIT controlled source authority alignment

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
BRANCH: agent/vibration-fit-source-authority-20260818
BASE: main
BASE_HEAD: d9d14d13b089c968c989544ddbdf023063b43e67
CURRENT_STAGE: IMPLEMENT
CURRENT_BLOCKER: NONE
HIGHEST_RISK: changing FIT numerical behavior while correcting provenance, or re-promoting authority already governed by the existing FIT qualification specification
EXACT_NEXT_ACTION: align runtime provenance with the existing controlled EI T2.2 source basis while preserving every numerical formula, coefficient, applicability limit, tolerance and benchmark expected value
```

## Mission

Correct FIT runtime/source provenance drift. The repository's governed FIT engineering specification already states that EI AVIFF 2nd Edition T2.2 is the governing method source and that the retained CRF-4-1 workbook is migration/parity evidence only. Runtime `calculateFit()` still publishes the workbook as its primary `provenance.source` and exposes `FIT_REFERENCE_AUTHORITY = WORKBOOK_REFERENCE_ONLY` as the result authority string.

This slice aligns code metadata to the already-qualified specification. It does not create new screening authority and does not alter the numerical kernel.

## Existing governed source basis

`docs/vibration/FIT-Engineering-Method-Specification-v1.md` controls method revision `ei-aviff2-fit-screening-v1` and records:

```text
Governing method: Energy Institute AVIFF 2nd Edition / T2.2 Flow Induced Turbulence
Method repository: reallaksh19/Common
Method PDF blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
Worked-example PDF blob: 3e2517d0df527a051084fc02e69cb7afa31f8d47
Workbook role: migration/parity evidence only
Screening authority: AUTHORIZED_BOUNDED
designAuthority: false
```

`converters/vibration/fit/source-basis-evidence.js` independently records the same authority boundary and that official EI errata pages 61/68 are not applicable to FIT T2.2.

## Scope

- make controlled EI method source identity explicit in runtime FIT metadata;
- classify workbook reference explicitly as migration/parity corroboration;
- make `calculateFit()` / Engineering Calculation adapter publish method source first and workbook separately;
- align stale workbook-centric tests to the already-governed screening qualification;
- add regression proving numerical functions/constants were not edited by this slice.

## Exclusions

- no FIT equations or correlations;
- no coefficient/constants edits;
- no diameter/span/frequency applicability edits;
- no multiphase resolver changes;
- no benchmark expected values or tolerances;
- no screening/design authority promotion;
- no global vibration source-registry edit (PR635 currently owns that file);
- no workflow changes;
- no merge.

## Backup truth

Native `node utils/backup.js save ...` is `NOT_RUN / ENVIRONMENT_BLOCKED` in this connector-only environment. Pre-edit main blobs are recorded before mutation:

```text
converters/vibration/fit/method.js                              2965155fe1d4d9081b91d1ff1113d7fb50ddbfd8
converters/vibration/fit/source-basis-evidence.js               d3ca231b8b5228c55fdac5bc99ea208300a75727
converters/vibration/fit/calculate.js                           2a92e6efedefffe4ab66ab000f0c3e648c9e5e86
converters/vibration/fit/index.js                               f261bef8e0be3efaf74d3ff89c2342892be33632
converters/engineering-calculations/adapters/vibration-fit.js   eef88d59846a5c779d5f56b71b9502955ddf1b41
tests/vibration-fit-workbook-reference.test.mjs                 6e253a4e57ea601f6faf17c6013030d56c803f24
```
