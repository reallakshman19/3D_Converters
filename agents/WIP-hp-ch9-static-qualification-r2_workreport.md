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
CURRENT_STAGE: STATIC QUALIFICATION CANDIDATE GATE IMPLEMENTED
LAST_COMPLETED_STAGE: GOVERNED BASIS + SELECTED RECORD CUSTODY + CLASS-E NUMERICAL PARITY + QUALIFICATION-PACKAGE COMPOSITION
CURRENT_BLOCKER: genuine licensed independently checked B31.3 allowable/tolerance evidence and numerical Class-E oracle are not supplied
HIGHEST_RISK: treating synthetic test evidence or EVIDENCE_COMPLETE_NOT_AUTHORIZED as Code/design authority
EXACT_NEXT_ACTION: allocate the draft PR, then supply a genuine independently checked candidate JSON from controlled engineering evidence and run `npm run qualify:hp-chapter-ix-static -- <candidate.json>` plus native `npm run verify:hp-chapter-ix` when a complete checkout is available. Do not promote authority or add fatigue/components/CAESAR in this PR.
```

## Mission

Deliver usable software support for assembling and validating a Chapter IX straight-pipe static qualification candidate without inventing licensed Code values or promoting design authority.

In scope:
- actual governed basis resolution through the merged `RESOLVE_BASIS` path;
- independently checked B31.3 method/allowable source custody;
- independently checked product, dimension and manufacturing-tolerance custody;
- selected-record prepared/checker custody;
- numerical Class-E straight-pipe benchmark evidence;
- deterministic comparison to the calculation under test;
- existing qualification-package composition;
- JSON template, CLI, tests and package registration.

Out of scope:
- authority promotion;
- fatigue/KD-3;
- components/B31J/FEA;
- CAESAR parity;
- UI redesign;
- workflow changes.

## Live Grounding

Current `main` remains:

```text
dd57f67760e0ab0ae04ecc1e895e6b7ea94110ce
feat(hp): centralize Chapter IX R1 CORE, governed masters, and reference pipeline (#523)
```

No open PR matching Chapter IX/HP was found before branch creation.

Current compare:

```text
branch: agent/hp-ch9-static-qualification-r2
status: ahead
ahead: 11
behind: 0
merge base: dd57f67760e0ab0ae04ecc1e895e6b7ea94110ce
changed paths before PR allocation: 6
workflow files changed: 0
```

Repository instructions loaded:
- root `AGENTS.md` blob `df16880dd82ce20d0f74b8966bb56a10859fa496`;
- `.agents/AGENTS.md` blob `c0456ed67a258ca809ec7c35c2ceacefd228d905`.

## Architecture / Key Gap Closed

Merged `qualification-package.js` checks the controlled B31.3 method source plus independent benchmark evidence, but by itself does not prove that the actual allowable/product/dimension/tolerance masters used by the calculation resolve with independently checked custody.

This stage adds a higher-level candidate gate:

```text
controlled evidence candidate
  -> RESOLVE_BASIS
       must be RESOLVED_NOT_AUTHORIZED
  -> selected master-row custody check
       allowable / product / dimension / tolerance
  -> governed STRAIGHT_PRESSURE_FROM_BASIS execution
  -> compare to independently supplied Class-E oracle
  -> b313-ch9-qualification-package/v1
  -> EVIDENCE_COMPLETE_NOT_AUTHORIZED
```

This prevents a split-brain state where a benchmark is marked complete while the actual calculation basis remains unqualified.

## New Usable Capability

### Evaluator

`converters/b313-chapter-ix/static-qualification-candidate.js`

Current exact branch blob:

```text
3f3bcbc831621e878d1fc08bb9fdd62204cd4314
```

Version:

```text
b313-ch9-static-qualification-candidate/v1
```

Possible states:

```text
INVALID_CANDIDATE
BASIS_EVIDENCE_PENDING
BENCHMARK_EVIDENCE_PENDING
CALCULATION_BLOCKED
BENCHMARK_MISMATCH
QUALIFICATION_PACKAGE_PENDING
EVIDENCE_COMPLETE_NOT_AUTHORIZED
```

Every state keeps:

```text
canPromoteCalculationAuthority = false
```

### Basis evidence gate

The actual merged `resolveChapterIxBasis` path must return:

```text
RESOLVED_NOT_AUTHORIZED
```

Then only the selected evidence rows are checked for row-level independent custody:

```text
preparedBy
checkedBy
checkedAt
preparedBy != checkedBy
```

Unused unrelated records in a larger master library do not create false qualification blockers.

### Class-E benchmark gate

Required benchmark contract:
- exact method ID;
- `oracleClass=CLASS_E_CODE_LICENSED`;
- `independent=true`;
- `status=INDEPENDENTLY_CHECKED`;
- distinct producer/reviewer;
- benchmark source bound to the controlled `B313_CHAPTER_IX` method source;
- explicit pressure/allowance inputs;
- independent expected values for the complete static chain:
  - pressure design thickness;
  - required minimum thickness;
  - required nominal thickness;
  - minimum as-manufactured thickness;
  - effective net wall;
  - pressure rating;
  - static pass/fail.

R1 qualification tolerance policy:

```text
type = RELATIVE
value <= 1e-4
```

The ceiling is intentionally no looser than the existing repository benchmark convention. A looser candidate is rejected; the code does not weaken tolerance to obtain parity.

### CLI

`scripts/verify-b313-ch9-static-qualification-candidate.mjs`

Exact branch blob:

```text
4329cfc0990b723b8392ff4a78563a1f07fa176f
```

Command:

```text
npm run qualify:hp-chapter-ix-static -- <candidate.json>
```

Exit codes:
- 0 only for `EVIDENCE_COMPLETE_NOT_AUTHORIZED`;
- 2 for valid pending/mismatch states;
- 1 for invalid/read failure.

### Authoring template

`engineering/hp-class-standardization/qualification/static-qualification-candidate.template.json`

Exact branch blob:

```text
027af6440b865f8053ce1d304bd85ec921787913
```

The template contains only `REPLACE_*` placeholders / null evidence values. It explicitly prohibits deriving the Class-E oracle from the implementation under test.

## Existing-File Change / Backup Custody

`package.json` was changed surgically only to:
- register the new focused test in `verify:hp-chapter-ix`;
- add `qualify:hp-chapter-ix-static`.

Pre-edit exact Git blob retained as backup custody:

```text
8ba249bd48c136b7968b86a3feeaf6bcbe705954
```

Current branch package blob:

```text
8079f96203c7eeffae4dfbc0a30aefb79f00c6df
```

Repository backup CLI is NOT_RUN / ENVIRONMENT_BLOCKED because there is no native private checkout; immutable Git history is recovery custody.

## Current Evidence Truth

The existing pinned High-Pr 2024 evidence remains insufficient. PR523 established:

```text
B313_SOURCE_INDEPENDENT_CHECK_MISSING
B313_ALLOWABLE_CUSTODY_MISSING
MANUFACTURING_TOLERANCE_CUSTODY_MISSING
HP-CODE-24-P01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-P01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
HP-CODE-24-F01:CLASS_E_NUMERICAL_ORACLE_MISSING
HP-CODE-24-F01:CLASS_E_PRODUCER_CHECKER_CUSTODY_MISSING
```

This PR does not invent the missing evidence. `ACTIVE`, `APPROVED`, `QUALIFIED`, synthetic test records, or software-regression outputs do not grant calculation authority.

## Validation Ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| current main / branch grounding | PASS | live GitHub compare | repository state |
| open HP/Chapter-IX overlap | PASS | no matching open PR | GitHub state |
| candidate evaluator syntax | PASS | local Node execution | language/runtime |
| candidate CLI syntax | PASS | local Node execution | language/runtime |
| focused candidate behavior | PASS | 8/8 local tests | contract + frozen software fixture |
| selected-row custody fail-closed | PASS | focused execution | contract |
| unrelated unused row ignored | PASS | focused execution | contract |
| loose relative tolerance rejected | PASS | focused execution | R1 policy 1e-4 ceiling |
| numerical mismatch rejected | PASS | focused execution | supplied expected oracle |
| producer/reviewer collision rejected | PASS | focused execution | custody contract |
| exact production evaluator blob | PASS | local execution + Git blob identity | implementation contract |
| full private-repo `npm run verify:hp-chapter-ix` | NOT_RUN | complete checkout unavailable; runtime cannot resolve github.com | mixed |
| actual licensed candidate qualification | NOT_RUN | genuine controlled candidate not supplied | independent engineering evidence |
| Code/design authority | NOT_ESTABLISHED | intentionally outside scope | owner/engineering authority |

Important validation precision:
- the exact current production evaluator blob `3f3bcbc...` was executed locally;
- the focused local test logic passed 8/8;
- do **not** classify the full GitHub/private-repository suite as PASS;
- no expected engineering value was changed to make a test pass.

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace — PASS 20/20

Controlled evidence -> actual basis resolver -> selected row custody -> governed pressure pipeline -> independent Class-E comparator -> existing qualification gate. Authority remains capped throughout.

### A2 Failure Isolation — PASS 20/20

The blocker is evidence custody/oracle completeness, not the pressure kernel. The candidate gate isolates source, row-custody, benchmark-contract, calculation and numerical-parity failures separately.

### A3 Authority / Invariant — PASS 20/20

The existing qualification gate and new candidate evaluator both keep `canPromoteCalculationAuthority=false`. Complete evidence ends at `EVIDENCE_COMPLETE_NOT_AUTHORIZED` only.

### A4 Independent Validation — PASS 20/20

Frozen software arithmetic is independently reproducible, including `13.49*(1-0.125)=11.80375 mm`. The Class-E oracle remains an input contract and is never generated from production output.

### A5 Next-Commit / Minimal Patch — PASS 20/20

No pressure formula, registry authority, fatigue/component path, UI, or workflow is changed. The patch is limited to qualification tooling/template/tests/package registration.

TOTAL: 100/100.

## Changed-File Ledger Before PR Allocation

```text
agents/WIP-hp-ch9-static-qualification-r2_workreport.md
converters/b313-chapter-ix/static-qualification-candidate.js
engineering/hp-class-standardization/qualification/static-qualification-candidate.template.json
package.json
scripts/verify-b313-ch9-static-qualification-candidate.mjs
tests/b313-chapter-ix-static-qualification-candidate.test.mjs
```

New JS/MJS line counts from live compare:

```text
static-qualification-candidate.js                271
verify-b313-ch9-static-qualification-candidate.mjs 32
b313-chapter-ix-static-qualification-candidate.test.mjs 165
```

All new JS/MJS files are under 300 lines. No `.github/workflows/*` change exists.

## Protected Invariants

- `designAuthority=false`;
- `codeCompliance=false` until separately qualified and authorized;
- no source/status-label promotion;
- no Section II-D-only allowable authority;
- distinct source verifier/checker custody;
- distinct selected master-record preparer/checker custody;
- distinct benchmark producer/reviewer custody;
- independent Class-E expected values are retained evidence inputs, never generated from the calculation under test;
- no tolerance inference or tolerance weakening;
- no fatigue, component, B31J, FEA or CAESAR claims;
- no workflow modification;
- no merge without explicit owner authorization.
