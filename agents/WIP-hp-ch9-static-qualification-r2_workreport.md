# WIP — Chapter IX Static Qualification R2

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
BRANCH: agent/hp-ch9-static-qualification-r2
BASE_MAIN: dd57f67760e0ab0ae04ecc1e895e6b7ea94110ce
SOURCE_TASK: owner follow-on from merged PR523
GROUNDING_EPOCH: 2026-08-15T21:57+04:00
CURRENT_STAGE: STATIC QUALIFICATION EVIDENCE CLOSURE
CURRENT_BLOCKER: licensed independently checked B31.3 allowable/tolerance custody and numerical Class-E evidence are absent
EXACT_NEXT_ACTION: implement a fail-closed qualification bundle builder and authoring templates that normalize independently checked controlled evidence into the existing b313-ch9-qualification-package/v1, then execute exact branch tests and keep authority false.
```

## Mission

Deliver usable software support for assembling and validating the next Chapter IX static qualification package without inventing licensed Code values or promoting design authority.

In scope:
- normalized controlled-source evidence input;
- independently checked B31.3 allowable-stress custody input;
- independently checked product/manufacturing-tolerance custody input;
- numerical Class-E straight-pipe benchmark input with retained intermediates/results;
- deterministic bundle assembly into the existing qualification package gate;
- CLI/templates/tests and durable evidence receipt;
- native/full-suite execution if a complete checkout can be obtained.

Out of scope:
- authority promotion;
- fatigue/KD-3;
- components/B31J/FEA;
- CAESAR parity;
- UI redesign;
- workflow changes.

## Live Grounding

`main@dd57f67760e0ab0ae04ecc1e895e6b7ea94110ce` is merged PR523. No open PR matching Chapter IX/HP was found before branch creation.

Repository instructions loaded:
- root `AGENTS.md` blob `df16880dd82ce20d0f74b8966bb56a10859fa496`;
- `.agents/AGENTS.md` blob `c0456ed67a258ca809ec7c35c2ceacefd228d905`.

Current relevant merged blobs:
- `qualification-package.js` = `05d968acc6e30762455f6d43e4aadbee3729cdf0`;
- `legacy-evidence-intake.js` = `d5d253678cfb796577df6195bc59d569957a10ae`;
- `package.json` = `8ba249bd48c136b7968b86a3feeaf6bcbe705954`.

Native clone attempt: NOT_RUN/ENVIRONMENT_BLOCKED for repository execution because the runtime cannot resolve `github.com`; connector-based source reconstruction remains an available validation path.

## Current Evidence Truth

PR523 established that current pinned 2024 evidence evaluates to `EVIDENCE_PENDING` because of:

```text
B313_SOURCE_INDEPENDENT_CHECK_MISSING
B313_ALLOWABLE_CUSTODY_MISSING
MANUFACTURING_TOLERANCE_CUSTODY_MISSING
HP-CODE-24-P01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-P01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
HP-CODE-24-F01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-F01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
```

Legacy `ACTIVE`, `APPROVED`, or `QUALIFIED` labels do not grant calculation authority.

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace — PASS 20/20

Pinned legacy evidence -> `legacy-evidence-intake.js` -> explicit custody/oracle gap codes -> future normalized qualification bundle -> `evaluateChapterIxQualificationPackage` -> `SOURCE_PENDING` / `BENCHMARK_PENDING` / `EVIDENCE_COMPLETE_NOT_AUTHORIZED`. Authority is capped at every current gate.

### A2 Failure Isolation — PASS 20/20

Current failure is not a pressure-kernel mismatch. It is missing independent B31.3 source/check custody, missing governed allowable/tolerance custody, and qualitative-only Class-E evidence shells.

### A3 Authority / Invariant — PASS 20/20

`evaluateChapterIxQualificationPackage` always returns `canPromoteCalculationAuthority=false`; complete evidence only reaches `EVIDENCE_COMPLETE_NOT_AUTHORIZED`. This invariant is protected.

### A4 Independent Validation — PASS 20/20

Frozen software arithmetic remains independently reproducible: `13.49*(1-0.125)=11.80375 mm`; no expected value is to be regenerated from production output in this stage.

### A5 Next-Commit / Minimal Patch — PASS 20/20

Add a small pure qualification-bundle assembler plus templates/CLI/tests. Do not modify the straight-pressure formula, authority flags, workflow files, or fatigue/component scope.

TOTAL: 100/100 — implementation continuation authorized.

## Validation Ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main/branch grounding | PASS | GitHub connector | repository state |
| open HP/Chapter-IX overlap search | PASS | no matching open PR | GitHub state |
| current authority invariant inspection | PASS | source inspection | contract |
| native full checkout | NOT_RUN | DNS/network unavailable in runtime | environment |
| new implementation tests | NOT_RUN | implementation not yet committed | mixed |

## Protected Invariants

- `designAuthority=false`;
- `codeCompliance=false` until separately qualified/authorized;
- no source/status label promotion;
- no Section II-D-only allowable authority;
- distinct source verification/check custody;
- distinct benchmark producer/reviewer custody;
- numerical Class-E expected values retained as evidence input, never produced from the calculation under test;
- no tolerance inference;
- no expected-value/tolerance weakening;
- no workflow modification;
- no merge without explicit owner authorization.
