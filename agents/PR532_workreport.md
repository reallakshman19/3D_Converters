# PR532 — Canonical USER_CALCULATED_KD3 Product Integration Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY_WITH_VALIDATION_BLOCKER
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
PR: 532
BRANCH: agent/hp-user-calculated-kd3-integration
STACKED_BASE_PR: 531
STACKED_BASE_BRANCH: agent/hp-ch9-fatigue-foundation-r3
STACKED_BASE_SHA: dce37cc2b1814d4a487e6ca05adb4b67d67cf182
NATIVE_KD320: NOT_QUALIFIED / BLOCKED
CURRENT_PRODUCT_MODE: USER_CALCULATED_KD3
CODE_COMPLIANCE: FALSE / NOT_ESTABLISHED
DESIGN_AUTHORITY: FALSE / NOT_ESTABLISHED
```

## Mission

Integrate the PR531 `USER_CALCULATED_KD3` contract into the central calculation registry and the HP piping-class product path without implementing or implying native KD320 authority.

The governing authority split is preserved:

```text
Salt = CORE straight-pipe pressure-cycle calculation
       + optional user Salt QA cross-check
Seq  = EXTERNAL / USER SUPPLIED
N    = EXTERNAL / USER SUPPLIED
n    = GOVERNED TRANSIENT SPECTRUM
Ui   = CORE DERIVED n/N
U    = CORE DERIVED Miner sum
```

No native KD320 mean-stress formula is implemented in this PR.

## Central Calculation API

Registered calculation:

```text
PIPE.B313.CH9.FATIGUE_USER_CALCULATED
```

Adapter:

```text
converters/engineering-calculations/adapters/b313-chapter-ix-user-calculated-fatigue.js
```

The adapter calls the canonical domain evaluator from PR531:

```text
evaluateChapterIxUserCalculatedFatigueSpectrum(...)
```

It exposes:

- calculation state;
- independent-check state;
- cumulative usage and unity state;
- per-cycle CORE Salt;
- optional user-Salt QA state;
- external Seq/N;
- zero-damage state;
- Ui;
- per-cycle authority/provenance.

Authority remains explicitly false:

```text
engineeringAuthority = EXTERNAL_KD3_REVIEW_ONLY
codeCompliance = false
canUseForDesignAuthority = false
```

## Canonical Product UI

Product module:

```text
engineering/hp-class-standardization/user-calculated-fatigue-product.js
```

It replaces the visible legacy KD-3 matrix while retaining the hidden compatibility DOM needed by the existing package/workflow shell.

Visible table:

```text
Wall
Cycle
PA
PB
DeltaP
CORE Salt
User Salt
Salt QA
User Seq
User N
n
Ui=n/N
Review state
Per-cycle provenance
```

Per-cycle provenance:

```text
code
edition
methodRef
calculationRef
calculatedBy
checkedBy
checkedAt
```

Native option remains visible but disabled:

```text
CORE KD-3 — Not Qualified
```

The PR531 `fatigue-authority-guard.js` continues to block legacy automatic Seq and automatic fatigue-curve N paths.

## Salt QA

User Salt remains optional.

When supplied, it is compared against CORE Salt using the existing repository QA relative tolerance:

```text
1e-4
```

This is a repository QA comparison only and is not an ASME acceptance tolerance.

Mismatch is visible in the product as:

```text
MISMATCH
SALT MISMATCH
```

and the canonical evaluator fails closed as `USER_SALT_MISMATCH`.

## Zero-Damage Custody

The UI and package contract now explicitly support:

```text
CORE Salt = 0
Seq = 0
N = null / N/A
Ui = 0
```

Blank inputs are no longer used as the semantic representation of zero damage in the canonical surface.

## JSON / CSV Exchange

Module:

```text
converters/b313-chapter-ix/user-calculated-fatigue-exchange.js
```

JSON schema:

```text
b313-ch9-user-calculated-fatigue-exchange/v1
```

JSON includes:

- geometry;
- governed spectrum;
- state/transition identity;
- external rows;
- false native/design/Code authority flags.

CSV columns:

```text
cycleId
locationId
fromStateId
toStateId
userAlternatingStressIntensityMpa
equivalentAlternatingStressMpa
permissibleCycles
code
edition
methodRef
calculationRef
calculatedBy
checkedBy
checkedAt
associatedMeanStressMpa
beta
saPrimeMpa
```

JSON and CSV exports perform serialize -> parse round-trip verification before download.

CSV authoring template:

```text
engineering/hp-class-standardization/qualification/user-calculated-fatigue.template.csv
```

## Authority-Package Round Trip

The HP evidence package now carries:

```text
userCalculatedKd3Evidence[]
```

in addition to legacy compatibility row evidence.

For an `approved-record` document lifecycle, canonical rows require:

- finite Seq >= 0;
- N > 0 when Seq > 0;
- N null/N/A when Seq = 0 zero-damage custody is used;
- code / edition / method / calculation reference / calculator identity;
- checkedBy + checkedAt;
- checker distinct from calculator.

The UI evidence bridge preserves per-cycle User Salt, Seq, N and calculation-basis custody across package export/import.

Import fails closed if the canonical evidence set cannot be restored completely to the recalculated wall/cycle keys:

```text
canonical.expected !== canonical.restored
  -> USER_CALCULATED_KD3 package restore incomplete
```

## Tests Added

```text
tests/b313-chapter-ix-user-calculated-fatigue-product.test.mjs
tests/b313-chapter-ix-user-calculated-fatigue-package-roundtrip.test.mjs
```

Coverage includes:

- registry presence;
- central API execution;
- external Seq/N authority;
- Salt match/mismatch;
- cumulative U;
- zero damage;
- JSON round trip;
- CSV round trip;
- quoted CSV fields;
- JSON authority-promotion rejection;
- product UI canonical-binding source checks;
- package positive-damage round trip;
- package zero-damage round trip;
- positive Seq missing-N rejection;
- checker-independence rejection;
- partial canonical package restore fail-closed source check.

Consolidated command:

```text
npm run verify:hp-chapter-ix-fatigue
```

## Diff Reconciliation

Before PR creation, comparison against the exact #531 parent head showed:

```text
STATUS: ahead
AHEAD_BY: 18
BEHIND_BY: 0
```

The changed paths were confined to:

- central USER_CALCULATED_KD3 adapter/registry exports;
- exchange module;
- HP product UI and evidence bridge;
- authority-package canonical evidence support;
- CSV template;
- tests/package script.

No native KD320 implementation was added.

## Validation Truth

At PR creation head `f0fb0a5df45428568931bdbb0e757b6c6877c745`:

```text
SOURCE_LEVEL_RECONCILIATION: COMPLETE
LOCAL_NODE_TESTS: NOT_RUN
HOSTED_FATIGUE_TESTS: NOT_RUN
GITHUB_ACTIONS_RUNS_AT_CHECK: NONE
```

The environment available to this agent does not provide the repository checkout/`gh` execution path required to run the Node suite locally. Do not convert source inspection into a PASS claim.

If repository-wide hosted workflows again fail with `steps=[]` / `runner_id=0`, classify that as zero-step infrastructure blocking, not as a source-test or engineering-calculation failure.

## Remaining Scope Boundary

This PR intentionally does not deliver:

- native KD320 mean-stress arithmetic;
- native Code fatigue-curve authority;
- general VIII-3 multi-axial/non-pressure load-state fatigue;
- routed-system fatigue;
- local discontinuity FEA fatigue;
- Code/design-authority promotion.

Those require separate controlled qualification programmes.

## Current Disposition

```text
PR_STATE: DRAFT
STACKED_ON: PR531
NATIVE_CORE_KD320: BLOCKED
USER_CALCULATED_KD3_PRODUCT_PATH: IMPLEMENTED IN SOURCE
POST-INTEGRATION_EXECUTION_RECEIPT: NOT_ESTABLISHED
CODE_COMPLIANCE: FALSE
DESIGN_AUTHORITY: FALSE
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
```
