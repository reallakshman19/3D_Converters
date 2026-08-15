# PR530 — Chapter IX Static Qualification R2 Work Report

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
PR: 530
BRANCH: agent/hp-ch9-static-qualification-r2
BASE_MAIN: f25f721dc35c30b2f7a911f31c26ccdf8a53c6ac
BASE_RECONCILIATION_COMMIT: 5b4ac89969f12886bf9dc3175b767625fc5dad32
SOURCE_TASK: owner follow-on from merged PR523
CURRENT_STAGE: STATIC QUALIFICATION CANDIDATE GATE IMPLEMENTED
CURRENT_BLOCKER: genuine licensed independently checked B31.3 allowable/tolerance evidence and numerical Class-E oracle are not supplied
HIGHEST_RISK: treating synthetic test evidence or EVIDENCE_COMPLETE_NOT_AUTHORIZED as Code/design authority
EXACT_NEXT_ACTION: obtain a genuine independently checked candidate JSON from controlled engineering evidence, run `npm run qualify:hp-chapter-ix-static -- <candidate.json>`, then run native `npm run verify:hp-chapter-ix` when a complete checkout is available. Do not promote authority or add fatigue/components/CAESAR in PR530.
```

## 1. Mission

Deliver usable software support for assembling and validating a Chapter IX straight-pipe static qualification candidate without inventing licensed Code values or promoting design authority.

In scope:
- actual governed basis resolution through merged `RESOLVE_BASIS`;
- controlled B31.3 method/allowable source custody;
- product, dimension and manufacturing-tolerance source custody;
- selected master-record preparer/checker custody;
- numerical Class-E straight-pipe benchmark evidence;
- deterministic comparison with the governed pressure calculation;
- composition through existing `b313-ch9-qualification-package/v1`;
- JSON authoring template, CLI, tests and package registration.

Explicitly out of scope:
- design/Code authority promotion;
- fatigue/KD-3;
- components/B31J/FEA;
- CAESAR parity;
- UI redesign;
- workflow changes.

## 2. Live Repository Grounding

PR530 is based on current main:

```text
f25f721dc35c30b2f7a911f31c26ccdf8a53c6ac
feat(sbc): deliver Type-3 production-freeze implementation through PF-006
```

The SBC merge landed after this HP branch was initially created. It changed only SBC/vibration/UI paths and had no exact-file overlap with the HP qualification slice.

Reconciliation was performed with a true two-parent merge:

```text
5b4ac89969f12886bf9dc3175b767625fc5dad32
```

The merged tree uses current SBC main as base and overlays the exact HP branch blobs. Post-reconciliation compare:

```text
status: ahead
behind: 0
merge base: f25f721dc35c30b2f7a911f31c26ccdf8a53c6ac
workflow files changed: 0
```

No open PR matching Chapter IX/HP was found before implementation.

Repository instructions:
- root `AGENTS.md` blob `df16880dd82ce20d0f74b8966bb56a10859fa496`;
- `.agents/AGENTS.md` blob `c0456ed67a258ca809ec7c35c2ceacefd228d905`.

## 3. Architecture Gap Closed

Merged `qualification-package.js` validates a controlled B31.3 method source and independent benchmark, but does not independently prove that the actual allowable/product/dimension/tolerance records consumed by the calculation resolve with checked custody.

PR530 adds a higher-level executable gate:

```text
controlled evidence candidate
  -> actual RESOLVE_BASIS
       must reach RESOLVED_NOT_AUTHORIZED
  -> selected master-row custody
       allowable / product / dimension / tolerance
  -> actual STRAIGHT_PRESSURE_FROM_BASIS
  -> independent Class-E numerical comparison
  -> existing qualification package
  -> EVIDENCE_COMPLETE_NOT_AUTHORIZED
```

This prevents a `qualified benchmark / unqualified calculation basis` split-brain state.

## 4. Candidate Evaluator

File:
`converters/b313-chapter-ix/static-qualification-candidate.js`

Current implementation blob carried through reconciliation:

```text
3f3bcbc831621e878d1fc08bb9fdd62204cd4314
```

Version:

```text
b313-ch9-static-qualification-candidate/v1
```

States:

```text
INVALID_CANDIDATE
BASIS_EVIDENCE_PENDING
BENCHMARK_EVIDENCE_PENDING
CALCULATION_BLOCKED
BENCHMARK_MISMATCH
QUALIFICATION_PACKAGE_PENDING
EVIDENCE_COMPLETE_NOT_AUTHORIZED
```

Every state preserves:

```text
canPromoteCalculationAuthority = false
```

## 5. Governed Basis Evidence Gate

The actual merged `resolveChapterIxBasis` path must return:

```text
RESOLVED_NOT_AUTHORIZED
```

This means the selected allowable, dimension and tolerance source contracts are already checked by their production resolvers.

PR530 then requires independent row custody for the records actually selected by the basis:

```text
preparedBy
checkedBy
checkedAt
preparedBy != checkedBy
```

Selected rows are determined from resolved product/dimension/tolerance identity and allowable source locator(s). Unrelated unused rows in a larger master library do not create false blockers.

## 6. Class-E Numerical Gate

A benchmark candidate must provide:
- exact method ID;
- `oracleClass=CLASS_E_CODE_LICENSED`;
- `independent=true`;
- `status=INDEPENDENTLY_CHECKED`;
- distinct `producedBy` and `reviewedBy`;
- source bound to the controlled `B313_CHAPTER_IX` method source;
- explicit design pressure and internal/external allowances;
- independently supplied expected values for:
  - pressure design thickness;
  - required minimum thickness;
  - required nominal thickness;
  - minimum as-manufactured thickness;
  - effective net wall;
  - pressure rating;
  - static pass/fail.

The calculation is executed from the governed basis and compared to those supplied expected values.

A mismatch returns:

```text
BENCHMARK_MISMATCH
CLASS_E_NUMERICAL_MISMATCH
```

Expected values are never regenerated from production output.

## 7. R1 Tolerance Policy

PR530 accepts only:

```text
type = RELATIVE
value <= 1e-4
```

`1e-4` is no looser than the existing repository benchmark convention. A looser value is rejected as:

```text
BENCHMARK_TOLERANCE_EXCEEDS_R1_CEILING
```

This is a qualification QA ceiling, not a new ASME design tolerance.

## 8. CLI / Template

CLI:

```text
npm run qualify:hp-chapter-ix-static -- <candidate.json>
```

Implementation:
`scripts/verify-b313-ch9-static-qualification-candidate.mjs`

Blob:

```text
4329cfc0990b723b8392ff4a78563a1f07fa176f
```

Exit semantics:
- 0 only for `EVIDENCE_COMPLETE_NOT_AUTHORIZED`;
- 2 for valid pending/mismatch states;
- 1 for invalid/read failure.

Authoring template:

```text
engineering/hp-class-standardization/qualification/static-qualification-candidate.template.json
```

Blob:

```text
027af6440b865f8053ce1d304bd85ec921787913
```

The template contains placeholders/nulls only. It explicitly instructs engineers not to derive Class-E expected values from the implementation under test.

## 9. package.json / Backup Custody

Only two HP registrations were added:
- new focused test in `verify:hp-chapter-ix`;
- `qualify:hp-chapter-ix-static` command.

Pre-edit exact package blob:

```text
8ba249bd48c136b7968b86a3feeaf6bcbe705954
```

PR branch package blob carried through current-main reconciliation:

```text
8079f96203c7eeffae4dfbc0a30aefb79f00c6df
```

Native repository backup CLI remains `NOT_RUN / ENVIRONMENT_BLOCKED`; immutable Git history is rollback custody.

## 10. Current External Evidence Boundary

The pinned High-Pr evidence inherited from PR523 remains insufficient:

```text
B313_SOURCE_INDEPENDENT_CHECK_MISSING
B313_ALLOWABLE_CUSTODY_MISSING
MANUFACTURING_TOLERANCE_CUSTODY_MISSING
HP-CODE-24-P01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-P01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
HP-CODE-24-F01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-F01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
```

PR530 does not manufacture or reinterpret those missing licensed values. Existing `ACTIVE`, `APPROVED`, `QUALIFIED` labels do not grant calculation authority.

## 11. Validation Ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| main / PR base grounding | PASS | live GitHub | repository state |
| post-SBC base reconciliation | PASS | two-parent merge + compare | Git tree |
| open HP/Chapter-IX overlap | PASS | no matching open PR before allocation | GitHub state |
| candidate evaluator syntax | PASS | local Node execution | runtime |
| CLI syntax | PASS | local Node execution | runtime |
| focused candidate behavior | PASS | 8/8 local tests | contract + frozen fixture |
| selected source fail-closed | PASS | execution | production resolver contract |
| selected record custody fail-closed | PASS | execution | custody contract |
| unused unrelated record ignored | PASS | execution | selected-basis contract |
| tolerance >1e-4 rejected | PASS | execution | R1 qualification policy |
| numerical mismatch rejected | PASS | execution | supplied oracle |
| producer/reviewer collision rejected | PASS | execution | custody contract |
| exact current evaluator blob | PASS | local execution + Git blob identity | implementation contract |
| complete private-repo `npm run verify:hp-chapter-ix` | NOT_RUN | private native checkout unavailable; runtime DNS cannot resolve github.com | mixed |
| genuine licensed static candidate | NOT_RUN | controlled candidate not supplied | independent engineering evidence |
| Code/design authority | NOT_ESTABLISHED | outside scope | owner/engineering authority |

Validation precision:
- exact current production evaluator blob was executed locally;
- focused local test logic passed 8/8;
- do not convert full-repository NOT_RUN to PASS;
- no expected engineering value or tolerance was weakened to obtain green status.

## 12. Appendix A — Takeover Qualification

### A1 Production Trace — PASS 20/20
Controlled candidate -> actual basis resolver -> selected row custody -> governed pressure calculation -> independent Class-E comparator -> qualification package.

### A2 Failure Isolation — PASS 20/20
Current blocker is evidence custody/oracle completeness, not the pressure kernel.

### A3 Authority / Invariant — PASS 20/20
Both existing qualification package and new candidate evaluator end at `EVIDENCE_COMPLETE_NOT_AUTHORIZED`; authority promotion remains false.

### A4 Independent Validation — PASS 20/20
Frozen arithmetic remains independently reproducible. Class-E expected results are an externally supplied evidence input, never production-generated.

### A5 Minimal Patch Boundary — PASS 20/20
No pressure formula, central calculation authority, fatigue/component path, UI, or workflow change is included.

TOTAL: 100/100.

## 13. Changed-File Ledger Target

After retiring the WIP report, the intended PR diff is:

```text
agents/PR530_workreport.md
converters/b313-chapter-ix/static-qualification-candidate.js
engineering/hp-class-standardization/qualification/static-qualification-candidate.template.json
package.json
scripts/verify-b313-ch9-static-qualification-candidate.mjs
tests/b313-chapter-ix-static-qualification-candidate.test.mjs
```

No `.github/workflows/*` file belongs in PR530.

## 14. Protected Invariants

- `designAuthority=false`;
- no Code-compliance promotion;
- no source/status label promotion;
- no Section II-D-only allowable authority;
- distinct source verifier/checker;
- distinct selected master-record preparer/checker;
- distinct benchmark producer/reviewer;
- independent Class-E expected values are evidence inputs, not generated by the calculation under test;
- no tolerance inference or weakening;
- no fatigue/components/B31J/FEA/CAESAR claims;
- no workflow modifications;
- no merge without explicit owner authorization.
