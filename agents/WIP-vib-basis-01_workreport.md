# WIP — VIB-BASIS-01

## Mission

Implement #581: bind production FIT facility request readiness to explicit geometry/support/process/scenario engineering-basis custody without changing FIT numerical methods or authority.

## Live base

```text
repository = reallaksh19/3D_Converters
base/main  = 2e4ffa0fa19e22aaa949434dc42244c7546636e0
branch     = agent/vib-basis-581-fit-facility-custody
issue      = #581
Appendix A = comment 5313176365
score      = 98/100 / QUALIFIED_FOR_VIB_ENGINEERING_BASIS_M5
```

## Recovery state

```text
TAKEOVER_AUTHORITY = IMPLEMENTATION_BOUNDED_TO_#581
OVERLAP             = SAFE for intended facility basis paths at branch creation
MERGE_AUTHORITY     = OWNER_ONLY
```

## Current production trace

```text
operating-cases.js           00a4ff38a229ed5310fed49500c1d6d399f57328
fit-data-blockers.js         6d2cefbeb86ca67b89c166cc26e0c52269b114cf
fit-plan-contract.js         e8551949183167bad854afc581b3ace1291f90d7
fit-plan-context.js          6d5f5fbae9b10e423fbbc24cae700aab2dd3a53d
fit-plan-process.js          2edf8eac67b844e409fd4da562d5764611aa6a55
fit-plan-item.js             096321c15b6d150aef0589f486691808b0accb77
fit-plan.js                  d0fa181f7e516525711f4c96fcd9a353559a77d1
vibration-fit.js adapter     eef88d59846a5c779d5f56b71b9502955ddf1b41
```

## Frozen invariants

- NPS/DN is not OD; schedule is not wall thickness.
- `wallBasis = NOMINAL | MIN_SPEC | AS_BUILT | MEASURED_CURRENT`.
- facility span authority is `maximumSpanBetweenEffectiveSupports`, not legacy numeric `MAX_UNSUPPORTED_SPAN` alone.
- support/span determination evidence is explicit; no topology/render inference.
- process basis is explicit `ACTUAL | STANDARD | NORMAL`; this slice accepts ACTUAL only for FIT facility execution and performs no conversion.
- coherent scenario evidence is exact canonicalId/case bound and explicit.
- FIT equations/correlations/applicability/benchmarks remain byte-untouched.
- no Product Freeze, screening/design/code authority, workflow, #546 technical, or T2.9 numerical/source changes.

## Primary falsifier

A numerically complete LIQUID FIT facility point using legacy `MAX_UNSUPPORTED_SPAN` and density/mass flow must become `NOT_READY` until explicit wall basis, effective-support span/method/confirmation, ACTUAL density basis, and exact-case coherent-scenario evidence are supplied.

## Intended implementation

```text
NEW  converters/vibration/facility/fit-engineering-basis.js
NEW  tests/vibration-facility-fit-engineering-basis.test.mjs
EDIT converters/vibration/facility/fit-plan-contract.js
EDIT converters/vibration/facility/fit-plan-item.js
EDIT converters/vibration/tabular/fit-data-blockers.js
EDIT tests/vibration-facility-fit-plan.test.mjs only as required to migrate existing authoritative fixture semantics
```

Existing-file edits require exact source backup under `.backups/connector-20260817-vib-basis-581/` before mutation.

## Validation state

```text
PASS     live base pinned
PASS     Appendix A before production mutation
PASS     active overlap search found no open PR matching FIT facility operating/basis paths
NOT_RUN  focused repository test — implementation not yet present
NOT_RUN  native full suite
NOT_RUN  browser
```

## Highest risk

Accidentally treating metadata presence as permission to infer engineering facts. The implementation must only validate explicit evidence; it must not derive supports, convert standard/normal properties, synthesize scenarios, or change FIT numerics.

## EXACT_NEXT_ACTION

Commit the focused protective test before production edits, then preserve exact backups and implement the smallest basis resolver + planner integration required by #581.
