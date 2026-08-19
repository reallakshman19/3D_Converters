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

PR646 added a truthful Type 1–4 SBC workspace but currently exposes only `scopeId` + explicit type selection as editable full-vertical state. Required structural fields are displayed as strings; users cannot author/retain a governed `SBC_CONNECTION` input object for Types 1, 2 or 4. Type 3 still has its older bespoke candidate panel.

This work adds a project-input authoring model and UI that maps exactly onto the existing `SbcTypeInputContract.v1` paths, validates through `validateSbcTypeInputStructure()`, attaches existing `SBC-UNIT-*` semantic/provenance records, and remains non-numerical / non-authoritative.

Do not implement equations, B1 expected values, B2 expected values, T3 curves, hidden defaults, automatic type classification, main-line authority promotion, lifecycle promotion, or design/screening authority.

## Grounding epoch GE-001

Observed 2026-08-19:

```text
main                    0a16ce60d515f38151911e673860c24d341c035e
parent PR               #646 OPEN DRAFT mergeable=true
parent head             706b692581326803a091fe6418c0a2bdf1d627f0
parent base             main@0a16ce60d515f38151911e673860c24d341c035e
parent hosted statuses  0 -> NOT_RUN
parent PR workflow runs 0 -> NOT_RUN
parent reviews/threads  0 / 0
```

Repository `agents/MASTER_INDEX.md` is absent on current main. Coordination therefore uses live open PRs plus per-PR claims.

Relevant live SBC work:

- PR646: parent workspace/UI/cache claim; this WIP is a stacked FOLLOW_ON and may edit parent workspace integration files.
- PR546: Type-3 production-freeze/source reconciliation; no planned exact-file overlap and its curve/source authority is excluded.
- PR480/483: older source/master framework drafts; no planned exact-file overlap; no numerical master publication in this WIP.

Overlap classification: `COORDINATION_REQUIRED_WITH_PARENT_PR646` by dependency, `SAFE` against PR546 exact files/authority because Type-3 source/master paths are excluded.

## Current defect / falsifier

Current PR646 workspace can display the required fields for all four types, but only state fields are:

```text
sbcWorkspaceType
sbcWorkspaceScopeId
```

Falsifier:

```text
open SBC connections -> select TYPE_1 / TYPE_2 / TYPE_4
=> required field paths are visible
=> there is no editable structured connection object
=> no per-field provenance/semantic guidance is bound to entered values
=> validateSbcTypeInputStructure() is not driven from UI-authored full-vertical data
```

## Approved implementation boundary

Preferred files:

```text
NEW  tabs/vibration-integrity-sbc-connection-model.js
NEW  tabs/vibration-integrity-sbc-connection-view.js
EDIT tabs/vibration-integrity-sbc-workspace-model.js
EDIT tabs/vibration-integrity-sbc-workspace-view.js
EDIT tabs/vibration-integrity-user-data-shell.js
ADD  tests/vibration-sbc-connection-authoring.test.mjs
ADD/EDIT cache-chain regression only where changed live UI modules require it
```

No SBC numerical kernel/master/source document/workflow changes.

## Appendix A — implementation authorization

### A1 Production Trace — 19/20

Trace is:

```text
UI state
-> proposed project-input SbcConnectionAuthoring record
-> existing getSbcTypeInputContract(type)
-> existing SBC_INPUT_SEMANTIC_TRACE_RECORDS
-> existing validateSbcTypeInputStructure(type, input)
-> workspace completeness/readiness projection
```

Numerical execution remains downstream and blocked. The authoring UI cannot become calculation authority.

### A2 Current Failure Isolation — 19/20

The first wrong boundary is presentation/project-input authoring: PR646 exposes contract paths but has no generic Type 1–4 editor or structured retained object. This is not a kernel/source defect. Type-3 bespoke candidate state must remain isolated from the new generic record.

Prediction: adding a pure authoring model + UI and calling the existing structural validator will make Type 1/2/4 structurally editable without changing any `executionAllowed`, lifecycle or numerical result.

Falsifier: if implementation requires an equation, curve/table value, automatic Type inference, or lifecycle change, stop; scope is invalid.

### A3 Authority / Invariant — 20/20

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
```

Changing a project input must invalidate only incompatible SBC authoring/readiness presentation; it must not mutate Type-3 source/master authority.

### A4 Independent Validation — 18/20

Focused tests will use hand-authored Type 1/2/4 structural vectors independent of UI HTML to verify:

- exact contract-path mapping;
- missing/invalid structural evidence fails closed;
- FIT-only main-line evidence is rejected;
- Type topology contradictions are surfaced;
- no default fills missing engineering fields;
- semantic provenance resolves from existing `SBC-UNIT-*` records;
- rendering shows completeness/errors and never enables numerical execution.

These are contract/regression checks, not B1/B2 engineering qualification. B1/B2 remain separate gates.

### A5 Next-Commit / Minimal Patch — 19/20

Implement one generic authoring record keyed by exact SBC scope, with nested-path update helpers and a form projection derived from the selected type contract. Integrate it into the existing PR646 workspace instead of creating four calculators or four divergent state models. Preserve Type-3 bespoke candidate UI below the generic evidence panel.

**TOTAL = 95/100 — QUALIFIED_FOR_BOUNDED_SBC_CONNECTION_AUTHORING**

## Phase plan

1. `PHASE-AUTHORING-MODEL`: generic scope/type structural evidence model + validation projection.
2. `PHASE-AUTHORING-UI`: editable Type 1–4 fields, semantic/provenance guidance, completeness banner; Type 3 candidate remains separate.
3. `PHASE-REGRESSION-CACHE`: focused tests + live module cache identity propagation if required.
4. `PHASE-QUALIFICATION-READINESS`: inspect D5/D6/D8/B2 evidence. Numerical implementation proceeds only if source/benchmark gates are genuinely satisfied; otherwise record hard stop without inventing data.
5. reconcile, allocate stacked draft PR, migrate WIP recovery files.

## Validation ledger

```text
live main/PR/source grounding        PASS / SOURCE_INSPECTION
Appendix A                           PASS 95/100 / EVIDENCE_REVIEW
native backup CLI                    NOT_RUN / ENVIRONMENT_BLOCKED
repository-native tests              NOT_RUN
served browser                       NOT_RUN
independent SBC engineering review   NOT_RUN
```

## Exact next action

Implement `tabs/vibration-integrity-sbc-connection-model.js` using only existing input contracts, classification contracts, and input semantic trace records; then checkpoint before UI integration.
