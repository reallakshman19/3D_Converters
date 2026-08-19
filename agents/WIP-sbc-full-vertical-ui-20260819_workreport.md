# WIP — SBC full-vertical engineering workspace

## Live grounding

- Repository: `reallaksh19/3D_Converters`
- Branch: `agent/sbc-full-vertical-ui-20260819`
- Base: `main@0a16ce60d515f38151911e673860c24d341c035e`
- Primary issue: #563
- Family gate: #429
- Type-3 evidence/freeze: #514 / draft PR #546
- Master/source programme: #450
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY / NOT_GRANTED_FOR_THIS_PR

## Mission

Create one connection-centric SBC workspace that truthfully presents the governed Type 1–4 vertical while preserving every existing qualification and authority boundary.

This slice may improve UI structure, readiness visibility, scope identity, blocker/evidence presentation, and routing into the existing Type-3 candidate workflow. It must not implement unqualified Type 1/2/4 equations, activate quarantined Type-3 curves, accept FIT-only main-line authority, or promote screening/design authority.

## Current defect / falsifier

Current `main` contains a mature `SBC Type-3 · facility candidate assessment` panel inside **User Engineering Data**, while the merged governed SBC manifest is a four-branch `TYPE_1..TYPE_4` capability with lifecycle `RESERVED` and `executionAllowed=false` for every type. This can make the live product appear Type-3-complete while Types 1/2/4 and the common method gates remain hidden.

First falsifier for this slice:

```text
open Vibration Integrity -> User Engineering Data
=> Type-3 candidate UI is visible
=> no equally visible Type 1/2/4 vertical/readiness context
```

## Appendix A — implementation qualification

### A1 — production trace — 19/20

Current machine truth was traced through:

- `converters/vibration/sbc/vertical-manifest.js`
- `converters/vibration/sbc/type-input-contracts.js`
- `converters/vibration/sbc/type-classification-contract.js`
- `tabs/vibration-integrity-sbc-type3-view.js`
- `tabs/vibration-integrity-user-data-shell.js`
- `tabs/vibration-integrity-ui-contract.js`

The manifest owns Type 1–4 lifecycle, benchmark/blocker and main-line requirements. The existing Type-3 panel is candidate-only and must not become the apparent full SBC vertical.

### A2 — engineering/source boundary — 19/20

The UI will consume existing governed metadata; it will not recreate classification or numerical logic. Automatic type classification remains forbidden. Type 1/2/4 execution remains disabled. Type 3 retains `BLOCKED_SOURCE_DATA_CONFLICT` for T3 curves and candidate-only authority.

### A3 — authority invariants — 20/20

Permanent invariants for this slice:

```text
SBC lifecycle                 RESERVED
SBC public ID                 VIB.SBC.SMALL_BORE
AssessmentUnitType            SBC_CONNECTION
FIT-only main-line input      NOT ACCEPTED
Type 1/2/4 numerical execute  FORBIDDEN
Type 3 candidate              NOT SCREENING AUTHORITY
T3 curve activation           false
designAuthority               false
```

### A4 — validation / falsification — 18/20

Add focused deterministic tests proving:

- Type 1–4 appear in governed order;
- selection is explicit and never automatic;
- benchmark/source/blocker status is visible;
- FIT-only main-line is shown as unacceptable;
- Type-3 curve quarantine is visible;
- Type 1/2/4 execution controls are absent/disabled;
- Type-3 candidate panel appears only for explicit Type 3 selection;
- no screening/design authority wording is introduced.

Repository-native and real-browser execution remain required for final PASS. Connector/source inspection must not be relabelled as execution.

### A5 — minimal patch — 18/20

Preferred boundary:

- NEW `tabs/vibration-integrity-sbc-workspace-model.js`
- NEW `tabs/vibration-integrity-sbc-workspace-view.js`
- EDIT `tabs/vibration-integrity-user-data-shell.js`
- EDIT `tabs/vibration-integrity-ui-contract.js`
- EDIT `tabs/vibration-integrity-sbc-type3-controller.js` only to route the facility action to the new SBC workspace
- ADD focused SBC workspace tests
- edit CSS only if existing classes are insufficient

No numerical SBC kernel/master/source changes. No workflow files. No family aggregation changes.

**TOTAL: 94/100 — QUALIFIED_FOR_BOUNDED_SBC_FULL_VERTICAL_UI_SLICE**

## Overlap classification

- PR #546: `SAFE` for proposed production UI files; it owns Type-3 source/freeze evidence/scripts and must remain authoritative for curve quarantine.
- Historical Type-3 PRs/branches (#508/#520/#521/#522/#524/#527/#529): `SALVAGE/EVIDENCE ONLY`; current `main` is source of truth.
- AIV repair stack: merged/closed, no SBC path claim.

## Backup custody

Native repository backup command is unavailable in this connector runtime: `NOT_RUN / ENVIRONMENT_BLOCKED`.

Exact pre-edit Git blobs recorded before production mutation:

```text
tabs/vibration-integrity-user-data-shell.js       2c922cbb7c884b2ef5d8bdb14f7b3abf22263f39
tabs/vibration-integrity-ui-contract.js           71cbe0f6610b566c187f9a3de3af373b898eb44e
tabs/vibration-integrity-sbc-type3-controller.js  f2ab3936f0ba436698d06081792b8cdf0d422ec1
```

Immutable Git blobs are rollback evidence only and are not represented as native backup PASS.

## Validation truth

- Live GitHub source/state grounding: PASS / CONNECTOR_SOURCE
- Appendix A qualification: PASS / EVIDENCE_REVIEW
- Native backup CLI: NOT_RUN / ENVIRONMENT_BLOCKED
- Repository-native tests: NOT_RUN
- Browser acceptance: NOT_RUN

## Exact next action

Implement a pure Type 1–4 workspace projection from governed SBC contracts, then render it as a dedicated `SBC connections` workspace tab and route explicit Type-3 selection to the existing candidate panel without changing Type-3 numerics or authority.
