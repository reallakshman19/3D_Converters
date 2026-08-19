# PR647 Work Report — SBC connection structural/evidence authoring

## Identity

```text
PR                    #647
branch                agent/sbc-connection-evidence-20260819
stack base            PR646 / agent/sbc-full-vertical-ui-20260819
base SHA              706b692581326803a091fe6418c0a2bdf1d627f0
implementation head   5b49894d4a48c460b361c6d66af46902a83b5063
criticality           ENGINEERING_CRITICAL
state                 OPEN / DRAFT
execution mode        AUTO
merge authority       OWNER_ONLY / NOT_GRANTED
```

Primary issue #563; family gate #429; Type-3 source/freeze neighbor #514 / PR546.

## Mission and outcome

PR646 made the SBC vertical truthful as Type 1–4, but the full-vertical UI could only edit an exact scope + declared Type. PR647 adds governed project-input authoring for Type 1, Type 2 and Type 4 while retaining every current qualification boundary.

Implemented trace:

```text
SBC workspace
-> exact connection/facility scope
-> explicit Type 1 / 2 / 4 selection
-> VibrationSbcConnectionAuthoringStore.v1
-> exact SbcTypeInputContract.v1 paths
-> explicit project value + project evidence reference
-> existing SBC-UNIT-* reference semantic trace
-> existing validateSbcTypeInputStructure()
-> structural/project-evidence readiness presentation
```

This chain ends before any numerical SBC execution.

## Appendix A authorization

Completed before implementation:

```text
A1 Production Trace              19/20
A2 Current Failure Isolation     19/20
A3 Authority / Invariant         20/20
A4 Independent Validation        18/20
A5 Next-Commit / Minimal Patch   19/20
TOTAL                            95/100
DISPOSITION                      QUALIFIED_FOR_BOUNDED_SBC_CONNECTION_AUTHORING
```

## New authoring model

`tabs/vibration-integrity-sbc-connection-model.js` (296 physical lines) adds:

- `VibrationSbcConnectionAuthoringStore.v1` keyed by exact SBC scope;
- `VibrationSbcConnectionAuthoringRecord.v1` with explicit values and evidence refs;
- no hidden engineering defaults;
- explicit syntax only for text/enums/booleans/positive physical values/lists;
- type retargeting that preserves common required evidence and discards hidden old Type-specific fields;
- nested structural input built only from explicit valid values;
- governed `validateSbcTypeInputStructure()` as structural rules authority;
- existing `SBC-UNIT-*` reference semantics attached by exact field path;
- separate project-evidence completeness;
- permanent authority: `engineeringAuthority=NONE`, `screeningAuthority=NOT_AUTHORIZED`, `designAuthority=false`, `numericalExecutionAllowed=false`.

## UI behavior

`tabs/vibration-integrity-sbc-connection-view.js` (104 physical lines) renders:

- Type 1/2/4 required contract fields as project inputs;
- source-native unit / reference semantic trace where available;
- explicit project evidence reference per field;
- field state and exact gaps/contradictions;
- structural status separate from project-evidence status;
- disabled numerical execution.

Important UI authority boundary:

```text
TYPE_3 -> NO SECOND INPUT AUTHORITY
```

Type 3 continues to use the existing candidate panel and PR546 remains authoritative for its source/freeze reconciliation.

A source review corrected two presentation hazards before handoff:

1. `STRUCTURE_COMPLETE_PROJECT_EVIDENCE_INCOMPLETE` now remains warning-styled instead of being treated as complete by substring matching.
2. the semantic column is labelled `Reference semantic trace`, not `Controlled semantic reference`, because current `SBC-UNIT-*` rows are reference-only / PDF-review-pending.

## Shell / audit integration

The Vibration shell now initializes only the new authoring store, routes Type 1/2/4 value/evidence changes into it, and emits:

```text
SBC_CONNECTION_AUTHORING_CHANGED
  VALUE_CHANGED
  EVIDENCE_REF_CHANGED
```

These project-input edits do not mutate Type-3 numerical/currentness state and do not promote FIT or SBC governing authority.

## Cache custody

New UI identity:

```text
20260819-sbc-connection-authoring-1
```

Propagated through:

```text
index.html
-> main-rhbg-fitguard.js
-> core/app.js
-> core/engineering-tabs-extension.js
-> tabs/engineering-workspace-tab.js
-> tabs/engineering-calculations-tab.js
-> tabs/vibration-integrity-tab.js
-> tabs/vibration-integrity-user-data-shell.js
-> SBC workspace / connection view / connection model
```

Unchanged Type-3 calculation/currentness descendants remain on:

```text
20260815-sbc-pf05-cache-1
```

AIV retains `20260816-aiv-canvas-release-1`.

## Regression source

Added `tests/vibration-sbc-connection-authoring.test.mjs` and updated SBC cache tests to pin:

- complete Type-1 structural + project evidence still not numerically qualified;
- structural completeness is not project-evidence completeness;
- FIT-only main-line source fails closed;
- Type-2 same-main-line topology and contradictory parent-line failure;
- Type-4 distinct-main-line bridge structure;
- invalid numeric syntax is not injected into structural input;
- missing engineering fields remain missing;
- `SBC-UNIT-*` traces remain reference-only / non-numerical;
- Type-3 generic UI has no editable duplicate fields;
- numerical execution remains disabled;
- cache identity is current from startup through the new connection modules;
- Type-3 PF-05/AIV/Mechanical custody remains separate.

These regression files are committed source. Repository-native execution did not run in this connector environment.

## Numerical qualification readiness — hard stop

Current governed benchmark registry remains:

```text
benchmarkExecutionAllowed                  false
productionExpectedValueGenerationForbidden true

TYPE_1 B1  SOURCE_AND_EXPECTED_VALUES_NOT_FROZEN / expectedValuesPresent=false
TYPE_1 B2  MISSING_INDEPENDENT_ENGINEERING_EVIDENCE / expectedValuesPresent=false
TYPE_2 B1  SOURCE_AND_EXPECTED_VALUES_NOT_FROZEN / expectedValuesPresent=false
TYPE_2 B2  MISSING_INDEPENDENT_ENGINEERING_EVIDENCE / expectedValuesPresent=false
TYPE_4 B1  SOURCE_AND_EXPECTED_VALUES_NOT_FROZEN / expectedValuesPresent=false
TYPE_4 B2  MISSING_INDEPENDENT_ENGINEERING_EVIDENCE / expectedValuesPresent=false
```

The method/source records also retain:

```text
controlled PDF page review           NOT_RUN / ENVIRONMENT_BLOCKED
Flowchart T3-1 reconciliation        NOT_ESTABLISHED
numerical unit policy                NOT_FROZEN
independent engineering review       NOT_ESTABLISHED
SBC-EQ/TBL/CONST/ASS rows            UNPOPULATED
```

Therefore auto mode correctly stops before Type 1/2/4 numerical kernels. D5/D6/D8 transcriptions are not used to invent equations or expected values.

Blocker:

```text
NUMERICAL_QUALIFICATION_BLOCKED_BY_CONTROLLED_SOURCE_AND_B2_EVIDENCE
```

## Changed-file reconciliation at implementation head

Compared to exact PR646 base `706b692581326803a091fe6418c0a2bdf1d627f0`:

```text
ahead / behind          22 / 0
changed files           17 (including 3 WIP recovery files)
workflow files          0
SBC numerical kernels  0
SBC master/curve data  0
benchmark expected data 0
EI aggregation files   0
```

Product/test delta is limited to connection authoring, parent cache-custody edges and focused regressions.

## Existing-file rollback custody

Native repository backup CLI was unavailable. Pre-edit stacked-branch blobs:

```text
tabs/vibration-integrity-sbc-workspace-view.js          713710fa071711120246c28e63f0417658dc3599
tabs/vibration-integrity-user-data-shell.js             73b66e452241ce40cce712b1542f69f771a8db0c
index.html                                              388668902abad55e8d38d3798d30887fddd620f2
main-rhbg-fitguard.js                                   9df44514b214053e0f1a924b3c16dcc37b738aa8
core/app.js                                             b63b35490866bc9403a850a9f7abeaa0021066b5
core/engineering-tabs-extension.js                      01d789e8103989058215d08496ff68a5574f3896
tabs/engineering-workspace-tab.js                       4c94760f8147cc9f40620a195cd804eae96bac8a
tabs/engineering-calculations-tab.js                    ee43b6631c91f3ecf86c4f06d35e9c7f43a03db9
tabs/vibration-integrity-tab.js                         59555e0daf68bfcca540c8f734101cdc91f28d39
tests/vibration-sbc-full-workspace-cache-chain.test.mjs 718be9846919c068197204841c93610608a5d080
tests/vibration-sbc-type3-runtime-cache-chain.test.mjs  6da19827f0d3b4e06f9a8b7da17063124c364dff
```

Immutable Git blobs are rollback evidence only, not native backup PASS.

## Validation truth

```text
live main/PR/source grounding           PASS / GITHUB_SOURCE
Appendix A                              PASS 95/100 / EVIDENCE_REVIEW
stack compare / scope isolation         PASS / GITHUB_COMPARE + DIFF_INSPECTION
new module size gate                    PASS / 296 + 104 physical lines
native backup CLI                       NOT_RUN / ENVIRONMENT_BLOCKED
native git remote probe                 NOT_RUN / ENVIRONMENT_BLOCKED / DNS github.com
repository-native Node tests            NOT_RUN / ENVIRONMENT_BLOCKED
served browser acceptance               NOT_RUN / ENVIRONMENT_BLOCKED
independent SBC engineering review      NOT_RUN
hosted final-head status/runs/reviews   TO_BE_RECONCILED_AFTER_RECOVERY_METADATA
```

No source inspection or committed-but-unexecuted tests are represented as runtime/browser PASS.

## Coordination / handoff

- PR647 is stacked on PR646 and must reconcile after PR646 moves/lands.
- PR546 retains Type-3 source/freeze authority; this PR does not touch its paths or candidate-input custody.
- No workflow change.
- No merge authority.

## Exact next action

Reconcile final PR647 metadata/head, inspect hosted statuses/runs/reviews, and wait for the missing controlled-source/B1/B2 engineering evidence before any Type 1/2/4 numerical implementation.
