# WIP — SBC connection structural/evidence authoring

## Recovery header

```text
repository             reallaksh19/3D_Converters
work id                WIP-sbc-connection-evidence-20260819
branch                 agent/sbc-connection-evidence-20260819
base / parent          PR646 head 706b692581326803a091fe6418c0a2bdf1d627f0
live main checked      0a16ce60d515f38151911e673860c24d341c035e
work intent            IMPLEMENT
criticality            ENGINEERING_CRITICAL
mutation authority     BOUNDED_SBC_CONNECTION_AUTHORING
execution mode         AUTO
AUTO_STATE             RUNNING
SCOPE_AUTHORITY         LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION       AUTO
merge authority        OWNER_ONLY / NOT_GRANTED
primary issue          #563
family gate            #429
Type-3 source neighbor #514 / PR546
```

## Handover in 60 seconds

PR646 added a truthful Type 1–4 SBC workspace, but only scope + explicit Type were editable for the full vertical. This follow-on adds a governed project-input authoring record for Types 1, 2 and 4, maps exactly to existing `SbcTypeInputContract.v1` field paths, binds values to explicit project evidence references and existing `SBC-UNIT-*` semantic traces, and validates through `validateSbcTypeInputStructure()`.

Type 3 deliberately keeps the existing candidate-input path. The generic editor must not create a second Type-3 engineering-input authority while #546 continues source reconciliation.

Do not implement equations, B1/B2 expected values, T3 curves, hidden defaults, automatic Type inference, lifecycle promotion, screening/design authority, or main-line authority promotion.

## Grounding epoch GE-001

```text
main                    0a16ce60d515f38151911e673860c24d341c035e
parent PR               #646 OPEN DRAFT mergeable=true
parent head             706b692581326803a091fe6418c0a2bdf1d627f0
parent hosted statuses  0 -> NOT_RUN
parent PR workflow runs 0 -> NOT_RUN
parent reviews/threads  0 / 0
```

`agents/MASTER_INDEX.md` is absent on current main. Live SBC coordination:

- PR646: HARD_DEPENDENCY / coordinated shared workspace + cache files.
- PR546: SAFE for this slice; Type-3 source/master/candidate input custody excluded.
- PR480/483: older source/master framework drafts; no numerical master publication here.

## Current diagnosis and falsifier

Parent workspace displayed required paths but could not author a structured `SBC_CONNECTION` record for Type 1/2/4, retain it by exact scope, attach project evidence references, or drive the existing structural validator.

Falsifier for this bounded slice: if making Type 1/2/4 editable requires equations, table/curve values, automatic Type inference, lifecycle changes or benchmark expected values, stop. None are required for the current implementation.

## Appendix A — implementation authorization

```text
A1 Production Trace              19/20
A2 Current Failure Isolation     19/20
A3 Authority / Invariant         20/20
A4 Independent Validation        18/20
A5 Next-Commit / Minimal Patch   19/20
TOTAL                            95/100
DISPOSITION                      QUALIFIED_FOR_BOUNDED_SBC_CONNECTION_AUTHORING
```

## Phase A — authoring model — COMPLETE

Commit:

```text
0099d18bf49d2559975f6b05cb22a9f5abfd1412
```

Added `tabs/vibration-integrity-sbc-connection-model.js`:

- immutable store keyed by exact SBC scope;
- exact contract-path values + project evidence references;
- explicit parsing for text, enum, boolean, positive number/integer and explicit lists;
- no inferred/default values;
- Type retarget keeps common required fields and drops hidden old Type-specific fields;
- existing `SBC-UNIT-*` semantic trace attached by field path;
- nested structural input is built only from explicit valid values;
- governed `validateSbcTypeInputStructure()` remains the structural rules authority;
- project-evidence completeness remains separate from method qualification;
- every projection retains `qualificationEstablished=false` and `numericalExecutionAllowed=false`.

## Phase B — authoring view module — IMPLEMENTED / INTEGRATION NEXT

Commit:

```text
50d4878f412f82b09f51c662be810789d1a98b34
```

Added `tabs/vibration-integrity-sbc-connection-view.js`:

- editable Type 1/2/4 contract fields;
- controlled semantic reference + native unit display;
- explicit project evidence reference per field;
- structural/evidence status and exact gaps/contradictions;
- disabled numerical execution control;
- Type-3 panel explicitly says `NO SECOND INPUT AUTHORITY` and routes users to the existing candidate panel instead of duplicating its physical inputs.

## Protected engineering boundary

```text
SBC lifecycle                      RESERVED
project-authored connection data   PROJECT INPUT ONLY
controlled source authority        false
engineering authority              NONE
screening authority                NOT_AUTHORIZED
design authority                   false
automatic classification           false
numerical execution                false
FIT-only main-line source           rejected
Type-3 curves                       BLOCKED_SOURCE_DATA_CONFLICT
Type-3 candidate input custody      EXISTING PATH ONLY
```

## Existing-file rollback custody before Phase B integration

Native repository backup CLI is unavailable. Exact Git blobs on the stacked branch before edits:

```text
tabs/vibration-integrity-sbc-workspace-view.js        713710fa071711120246c28e63f0417658dc3599
tabs/vibration-integrity-user-data-shell.js           73b66e452241ce40cce712b1542f69f771a8db0c
index.html                                            388668902abad55e8d38d3798d30887fddd620f2
main-rhbg-fitguard.js                                 9df44514b214053e0f1a924b3c16dcc37b738aa8
core/app.js                                           b63b35490866bc9403a850a9f7abeaa0021066b5
core/engineering-tabs-extension.js                    01d789e8103989058215d08496ff68a5574f3896
tabs/engineering-workspace-tab.js                     4c94760f8147cc9f40620a195cd804eae96bac8a
tabs/engineering-calculations-tab.js                  ee43b6631c91f3ecf86c4f06d35e9c7f43a03db9
tabs/vibration-integrity-tab.js                       59555e0daf68bfcca540c8f734101cdc91f28d39
tests/vibration-sbc-full-workspace-cache-chain.test.mjs 718be9846919c068197204841c93610608a5d080
tests/vibration-sbc-type3-runtime-cache-chain.test.mjs   6da19827f0d3b4e06f9a8b7da17063124c364dff
```

These immutable Git blobs are rollback evidence only, not native backup PASS.

## Cache custody plan

Changed live authoring UI will use:

```text
20260819-sbc-connection-authoring-1
```

Propagate this new UI identity from startup through `vibration-integrity-user-data-shell.js`, and use it for the SBC workspace/connection UI modules. Unchanged Type-3 numerical/currentness descendants must retain `20260815-sbc-pf05-cache-1`; AIV remains on its existing release identity.

## Validation ledger

```text
live main/PR/source grounding        PASS / SOURCE_INSPECTION
Appendix A                           PASS 95/100 / EVIDENCE_REVIEW
authoring model source               IMPLEMENTED
connection view source               IMPLEMENTED
native backup CLI                    NOT_RUN / ENVIRONMENT_BLOCKED
native git remote probe              NOT_RUN / ENVIRONMENT_BLOCKED / DNS github.com
repository-native tests              NOT_RUN
served browser                       NOT_RUN
independent SBC engineering review   NOT_RUN
```

## Phase 4 qualification reality already grounded

Current controlled method/PDF/benchmark artifacts remain insufficient for Type 1/2/4 numerics:

```text
controlled PDF page review           NOT_RUN / ENVIRONMENT_BLOCKED
Flowchart T3-1 reconciliation        NOT_ESTABLISHED
numerical unit policy                NOT_FROZEN
independent engineering review       NOT_ESTABLISHED
B1 expected values Type1/2/4         NOT_FROZEN / ABSENT
B2 Type1/2/4                         MISSING_INDEPENDENT_ENGINEERING_EVIDENCE
SBC-EQ / TBL / CONST / ASS traces    UNPOPULATED
```

Therefore this WIP may improve structural/evidence readiness but may not create Type 1/2/4 numerical kernels or expected benchmark values from repository transcriptions.

## Exact next action

Wire the new authoring panel/store into the PR646 shell/workspace, propagate `20260819-sbc-connection-authoring-1` through the changed live browser module chain, then add focused authoring/cache regressions.
