# PR451 — AIV Dedicated SVG Canvas Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver issue #449's dedicated AIV SVG relationship workspace without changing AIV screening/design authority or introducing a second engineering-data authority. |
| Source task / issue | `reallaksh19/3D_Converters#449` |
| PR number | `#451` |
| Branch | `agent/aiv-svg-canvas` |
| Base commit | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Last validated implementation HEAD | `7a26a8e23d261d19672dd868cd3730eb8a67a8a6` |
| PR status | DRAFT / OPEN / mergeable |
| Current stage | Stage 7 — Relationship authoring/deletion |
| Last completed stage | Stage 6 — Bidirectional table/canvas selection |
| Engineering status | Stages 4–6 VALIDATED; Stage 7 IN_PROGRESS |
| Validation status | Stage-6 focused 21/21 PASS on exact published content; PR head/blob/14-file ledger verification PASS |
| Current blocker | None. `ISS-001` and `ISS-002` remain classified base debt. |
| Exact next action | Inspect existing table-mutation APIs and relationship contract, then implement RELATIONSHIPS mode through a narrow production callback so creation/deletion reuse authoritative table state and invalidation behavior. |

## Handover in 60 Seconds

**What is now true:** the live AIV workspace has a dedicated SVG projection/layout, pan/zoom/presentation drag, keyboard selection, and canonical bidirectional selection between Source/Assessment/relationship canvas objects and authoritative editable table rows. Selection keys are derived from canonical identity and operating case, not row position or tags.

**What is being worked on:** visual Source→Assessment relationship creation/deletion.

**What remains unfinished:** assumption/readiness drilldown, full contribution/result detail, simultaneous-source/case/line UX, canvas-aware export, accessibility/performance/full release hardening.

**What must not be assumed:** selection keys replace engineering identity; connector geometry carries physical distance; visible arrows are kernel contributors; deleting a relationship may delete Source/Assessment records.

**Highest-risk remaining item:** Stage 7 could accidentally bypass table safeguards, create duplicate relationship records, cascade deletion, or derive distance from SVG geometry.

**Exact next action:** add relationship mutation through the existing table model/controller boundary, preserve current case identity, leave distance blank, test duplicate/no-cascade behavior, then exact-head verify before Stage 8.

## Mission and Engineering Intent

The canvas is a presentation/controller surface over the existing AIV model. Tables and the registered Engineering Calculation API remain engineering authority. Canvas-owned mutable state is limited to layout, viewport, selection, and transient relationship-mode interaction state.

### Permanent invariants

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = visual navigation / relationship editing / result explanation`.
3. Physical distance is explicit Source→Assessment table/assumption data, never SVG length.
4. Numerical screening remains `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` → central AIV kernel.
5. Assessment screening scope remains separate from `LINE_CASE_SUMMARY` traceability scope.
6. Canonical IDs + Operating Case are engineering identity; tags, DOM IDs, pixels and nearest-position matching are forbidden as authority.
7. Canvas/UI contains no AIV equations or local dB-combination formula.
8. Selection is presentation state only.
9. Relationship mutation must flow through authoritative table mutation/invalidation behavior.
10. Relationship deletion must never cascade to Source or Assessment records.

### Explicit non-goals

No CAD/3D authoring, geometry writeback, pixel-derived engineering values, hidden defaults, design-authority promotion, unrelated dependencies/workflows, or speculative infrastructure.

## Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Work report + PR allocation | P0 | DONE | 1–2 | PR #451 + allocated report |
| Repository-state verification | P0 | DONE | 3 | report-only branch verified before production edits |
| Projection + deterministic layout + live consumer | P0 | VALIDATED | 4 | `2a41528d…`, 12/12, exact blobs/ledger |
| Pan/zoom/select/presentation drag | P0 | VALIDATED | 5 | `eb6238d4…`, 17/17, exact blobs/ledger |
| Bidirectional table/canvas selection | P0 | VALIDATED | 6 | `7a26a8e2…`, 21/21, exact blobs/14-file ledger |
| Relationship authoring/deletion | P0 | IN_PROGRESS | 7 | protocol below |
| Assumption/readiness visualization | P0 | NOT_STARTED | 8 | pending |
| Full screening overlays/result detail | P0 | PARTIAL | 4/9 | basic summaries/scope label exist |
| Multi-source/case/line UX | P1 | NOT_STARTED | 10 | pending |
| Canvas-aware export/trace | P1 | NOT_STARTED | 11 | pending |
| Accessibility/performance/release hardening | P0 | NOT_STARTED | 12 | pending |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Canvas consumes existing AIV controller/table state; no parallel engineering store. | Yes |
| DEC-002 | Decision | P0 | VALIDATED | Explicit table-backed distance passes through projection unchanged; layout/controller expose no distance mutation. | Yes |
| DEC-003 | Decision | P0 | VALIDATED | Projection/layout abstractions have a real live production consumer. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Registered `calculateEngineering` remains the only screening execution path. | Yes |
| DEC-005 | Decision | P0 | VALIDATED | Blank engineering identities are omitted rather than synthesized. | Yes |
| DEC-007 | Decision | P0 | VALIDATED | Mounted presentation controller owns pan/zoom/drag/selection state only. | Yes |
| DEC-008 | Decision | P0 | VALIDATED | Canonical UI synchronization key uses source/assessment/case identity; row index is secondary metadata only. | Yes |
| DEC-009 | Decision | P0 | ACCEPTED_STAGE7 | Relationship creation/deletion must call authoritative table mutation boundary; no relationship shadow store. | Yes |
| DEC-010 | Decision | P0 | ACCEPTED_STAGE7 | New visually authored relationship starts with explicit identity/case and blank distance/evidence; default applicability is `UNRESOLVED` unless an existing product rule explicitly authorizes otherwise. | Yes |
| RISK-001 | Risk | High | MITIGATED | Projection/layout remain read-only with respect to engineering state. | Yes |
| RISK-002 | Risk | High | MITIGATED | Kernel contribution comes only from result contribution objects, never rendered-arrow presence. | Yes |
| RISK-005 | Risk | High | MITIGATED_STAGE6 | Canonical selection keys remove row-index-only retargeting risk. | Yes |
| RISK-006 | Risk | High | IN_PROGRESS | Relationship authoring could create duplicates/cascade deletes/infer distance; Stage 7 must close all three. | Yes |
| ISS-001 | Base validation debt | Medium | OPEN / CLASSIFIED | Broad boundary oracle conflicts with required registered screening API path. | Yes |
| ISS-002 | Base size debt | Medium | OPEN / CLASSIFIED | Existing qualification controller exceeds normal 300-line target; canvas responsibilities stay split into focused modules. | Yes |

## Stage Roadmap and Execution Log

### Stage 1 — Report initialization + technical findings — COMPLETE
Created work report before production changes and inspected AIV identity/assumption/authority contracts. **PASS / COMPLETE.**

### Stage 2 — PR allocation/report synchronization — COMPLETE
Created draft PR #451 and allocated the living report. **PASS / COMPLETE.**

### Stage 3 — Repository/changed-file verification — COMPLETE
Verified report-only branch before production edits; inspected live integration/test surfaces; classified base debt. **PASS / COMPLETE.**

### Stage 4 — Projection/layout/live SVG foundation — COMPLETE
Implemented `AivCanvasProjection.v1`, presentation-only `AivCanvasLayout.v1`, deterministic conceptual layout, live dedicated SVG, explicit table distance labels, basic result summaries, and Line/Case non-authoritative warning. **12/12 PASS; exact head `2a41528d…`; COMPLETE.**

### Stage 5 — SVG interaction controller — COMPLETE
Implemented focused mounted presentation controller for bounded zoom, pan, presentation drag, relationship redraw, keyboard/canvas selection and layout reconciliation. Qualification controller received only lifecycle wiring. **17/17 PASS; exact head `eb6238d4…`; COMPLETE.**

### Stage 6 — Bidirectional table/canvas selection — COMPLETE

**Implementation:**

- added focused `vibration-aiv-canvas-selection.js`;
- canonical synchronization keys:

```text
SOURCE       SOURCE:<Source Canonical ID>:<Operating Case>
ASSESSMENT   ASSESSMENT:<Assessment Canonical ID>
RELATIONSHIP REL:<Source Canonical ID>:<Assessment Canonical ID>:<Operating Case>
```

- table rows and canvas Source/Assessment/relationship objects carry matching synchronization metadata;
- relationship projection carries canonical `selectionKey` independent of readiness `rowKey`;
- canvas selection highlights/reveals matching table row;
- table selection highlights/reveals/centers matching canvas object while preserving zoom;
- add/delete table controls do not transiently change selection;
- blank identities get no invented key;
- no selection path mutates tables, invalidates readiness, runs screening, or creates relationships.

**Focused validation:** `npm run verify:aiv-canvas` **21/21 PASS** on the exact content published to GitHub.

**Exact GitHub verification:**

```text
PR head                                    7a26a8e23d261d19672dd868cd3730eb8a67a8a6 PASS
PR changed files                           14 exact expected files PASS
selection helper blob                      2825d25a88db5be27f3b8b402b9e99d2cf732147 PASS
projection blob                            9330c6a4a629e898e8f7c5c95f03d9e7f6c31143 PASS
canvas controller blob                     3bbe1ccb32ca70b015321d98a128f74aab5058be PASS
input view blob                            4b3183918d2e4fddd07b59ca85c11e7c536d8636 PASS
canvas view blob                           75b6c37701186b9f43461143da5274bab48cd0df PASS
selection test blob                        9749e9cc74c7bbd37ca697adcb0d46a9a44da67e PASS
package focused-command blob               2254838ba037a8d00e19e1036b821686348f88e0 PASS
```

The published blobs match the content used by the 21/21 focused validation; no different exact-head test execution is claimed. Browser interaction remains **NOT_RUN**. **Stage decision: COMPLETE.**

### Stage 7 — Relationship authoring/deletion — IN_PROGRESS

#### Current truth

Stable canonical Source/Assessment/relationship selection exists. Existing table state is immutable and mutations flow through `vibration-aiv-input-model.js` into `applyTableMutation`, which marks benchmark edits, clears readiness/results/assumption resolution, and rerenders.

#### Objective

Support RELATIONSHIPS mode so selecting a Source then an Assessment creates exactly one authoritative `AivSourceAssessmentCsv.v1` table row; visual deletion removes only that row.

#### Expected scope/files

- inspect and, if required, extend `tabs/vibration-aiv-input-model.js` with a narrowly scoped pure prefilled-row helper consumed immediately by production;
- add focused `tabs/vibration-aiv-canvas-relationship.js` if orchestration would otherwise overgrow the interaction controller;
- minimally extend `tabs/vibration-aiv-canvas-controller.js` for RELATIONSHIPS mode/pending-source interaction and callbacks only;
- minimally extend `tabs/vibration-aiv-qualification-tab.js` to provide authoritative create/delete callbacks through `applyTableMutation`;
- `tabs/vibration-aiv-canvas-view.js` for mode control/pending state affordance;
- focused relationship-edit tests and `verify:aiv-canvas` expansion;
- this report.

#### Engineering rationale

Canvas relationship editing is valuable only if it changes the same table record the operator can inspect/edit/export. A separate canvas relationship store or direct engineering-data mutation would violate the issue boundary. Existing table invalidation must remain the dependency authority.

#### Planned implementation

1. Add RELATIONSHIPS mode control without introducing geometry-edit mode.
2. First selection must be a Source carrying canonical ID + operating case.
3. Second selection must be an Assessment canonical ID.
4. Construct one relationship row through the table model with:

```text
Source Canonical ID       selected source
Assessment Canonical ID   selected assessment
Operating Case            selected source case
Applicability             UNRESOLVED
Physical Distance         blank
Physical Distance Unit    blank
Distance Source           blank
Distance Source Revision  blank
Simultaneous Group        blank
```

5. Detect exact duplicate source+assessment+case before mutation and reject/no-op deterministically.
6. Call authoritative table mutation callback; let existing `applyTableMutation` invalidate readiness/results.
7. Select/focus the new relationship after rerender using the Stage-6 canonical relationship key.
8. Relationship Delete action resolves canonical tuple to the current relationship row and uses existing `deleteAivInputRow`; Source/Assessment tables are untouched.
9. Never read connector length, node coordinates, SVG bounding boxes or pixels when constructing engineering fields.

#### Expected behavior / edge cases

- same source/assessment may coexist under different operating cases;
- exact duplicate same tuple cannot be created twice;
- source or assessment deletion is never implied by relationship deletion;
- shared source/shared assessment references in other rows remain intact;
- blank physical distance is visibly unresolved/assumable by existing readiness/assumption flow;
- table edits/reorder after selection resolve by canonical key, not stale row index;
- Path/Boundary cannot be relationship endpoints;
- escaping/changing mode clears pending source without engineering mutation.

#### Planned validation

- exactly one relationship row created;
- correct selected source case preserved;
- physical distance/evidence remain blank regardless of SVG positions;
- duplicate exact tuple rejected deterministically;
- deletion removes only relationship row;
- shared Source/Assessment records and other-case relationships remain intact;
- existing `applyTableMutation` invalidation path is used;
- no AIV equations/kernel imports in UI/canvas relationship modules;
- new modules remain below 300 lines and functions normally below 40 logical lines;
- `npm run verify:aiv-canvas` PASS on exact content;
- exact GitHub head/blob/ledger verification after publish.

#### Known risks

`RISK-006` governs this stage. If existing table-model APIs are insufficient, add only a production-consumed pure helper; do not create a compatibility shim or parallel store.

### Stage 8 — Assumption/readiness visualization — NOT_STARTED
Visible assumption/readiness badges and exact editable-field drilldown; no hidden assumptions.

### Stage 9 — Full screening overlays/result detail — NOT_STARTED
Kernel-backed source PWL, relationship contribution, combined point PWL and Assessment LOF detail; no UI equations.

### Stage 10 — Multi-source/case/line UX — NOT_STARTED
Simultaneous-source explanation and current/all-case + line filters with explicit case identity.

### Stage 11 — Canvas-aware export/trace — NOT_STARTED
Optional layout/projection/SVG snapshot while numerical export remains independently interpretable.

### Stage 12 — Accessibility/performance/release hardening — NOT_STARTED
Keyboard/focus/non-color acceptance, 100/300/500 fixture, full AIV release reruns, final ledger reconciliation, explicit `ISS-001`/`ISS-002` disposition.

## Changed-File Ledger

| File | First stage | Latest stage | Purpose | Validation |
|---|---:|---:|---|---|
| `agents/PR451_workreport.md` | 2 | 7 | living engineering report | current |
| `converters/vibration/aiv/aiv-canvas-projection.js` | 4 | 6 | read-only projection + relationship synchronization key | Stage-6 exact PASS |
| `converters/vibration/aiv/aiv-canvas-layout-contract.js` | 4 | 5 | presentation layout contract/helpers | PASS |
| `tabs/vibration-aiv-canvas-view.js` | 4 | 6 | SVG + canonical selection metadata | Stage-6 exact PASS |
| `tabs/vibration-aiv-canvas-controller.js` | 5 | 6 | UI-owned interaction/synchronization runtime | Stage-6 exact PASS |
| `tabs/vibration-aiv-canvas-selection.js` | 6 | 6 | canonical selection/highlight/reveal helpers | Stage-6 exact PASS |
| `tabs/vibration-aiv-input-view.js` | 4 | 6 | authoritative editable table + selection metadata | Stage-6 exact PASS |
| `tabs/vibration-aiv-qualification-tab.js` | 5 | 5 | minimal canvas-controller lifecycle hook | Stage-5 exact PASS |
| `tabs/vibration-aiv-input-model.js` | — | 7 | relationship row helper only if required | Stage-7 pending |
| `tests/vibration-aiv-canvas-projection.test.mjs` | 4 | 4 | projection/authority regressions | PASS |
| `tests/vibration-aiv-canvas-layout.test.mjs` | 4 | 4 | layout/non-authority regressions | PASS |
| `tests/vibration-aiv-canvas-view.test.mjs` | 4 | 4 | visible integration/scope regressions | PASS |
| `tests/vibration-aiv-canvas-interaction.test.mjs` | 5 | 5 | interaction regressions | PASS |
| `tests/vibration-aiv-canvas-selection.test.mjs` | 6 | 6 | canonical synchronization regressions | Stage-6 exact PASS |
| `package.json` | 4 | 6 | focused `verify:aiv-canvas` command | 21/21 PASS |

No `.github/workflows/*`, dependency versions or unrelated generated data are changed.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Evidence |
|---|---|---|
| Stage-4 focused + exact-head | PASS | 12/12; `2a41528d…` |
| Stage-5 focused + exact-head | PASS | 17/17; `eb6238d4…` |
| Stage-6 focused + exact-head content/ledger | PASS | 21/21; `7a26a8e2…`; exact blobs/14 files |
| Browser interaction acceptance | NOT_RUN | no browser harness in current environment |
| Full AIV screening release | NOT_RUN | required Stage 12 |
| Broad module-boundary suite | NOT_RUN / BASE ORACLE DEBT | `ISS-001`, `ISS-002` |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Layout cannot alter engineering values | PASS | Stage-4 regressions |
| Canonical/case identity preserved | PASS | projection + selection tests |
| Explicit distance remains table pass-through | PASS | projection/layout tests |
| NOT_APPLICABLE arrow cannot invent contribution | PASS | projection test |
| Canvas contains no numerical AIV implementation | PASS | static focused tests |
| Assessment vs Line/Case scope separation | PASS_FOUNDATION | Stage-4 view tests |
| Pan/zoom/drag presentation-only | PASS | Stage-5 tests |
| Table↔canvas synchronization | PASS | Stage-6 21/21 + exact blobs |
| Relationship authoring/deletion authority | NOT_RUN | Stage 7 active |

### Explicitly Not Validated

- real-browser pointer/scroll interaction;
- relationship authoring/deletion;
- assumption/readiness drilldown;
- large-project performance;
- full accessibility acceptance;
- full AIV screening release on PR head.

## Known / Deferred Work and Forward Sequence

- `ISS-001`: reconcile boundary-oracle inconsistency during hardening without weakening UI/kernel separation.
- `ISS-002`: avoid adding canvas responsibilities to oversized qualification controller; split focused modules/callbacks.
- `RISK-006`: close relationship mutation authority/cascade/distance risks in Stage 7 before proceeding.

Recommended sequence: Stage 7 relationship editing → Stage 8 assumptions/readiness → Stage 9 detailed results → Stage 10 multi-source/case/line UX → Stage 11 export/trace → Stage 12 accessibility/performance/release.

## Process Notes / Lessons Learned

- Presentation runtime state can persist across outer rerenders without entering engineering state.
- Relationship connector redraw and physical distance must remain completely separate operations.
- Canonical selection keys are UI synchronization keys, not new engineering identity authority.
- Stable selection identity is a prerequisite for safe visual record mutation.
- Base validation debt must be recorded rather than hidden by weakening new tests.

## Next-Agent Handover

**Current stopping point:** Stage 6 exact-head validated; Stage 7 protocol active before production changes.

**PR / branch / validated implementation HEAD:** #451 / `agent/aiv-svg-canvas` / `7a26a8e23d261d19672dd868cd3730eb8a67a8a6`.

**Start here:** inspect `tabs/vibration-aiv-input-model.js`, `tabs/vibration-aiv-qualification-tab.js`, `converters/vibration/aiv/source-assessment-csv.js`, then implement relationship creation/deletion through authoritative table mutations.

**Do not redo:** Stages 4–6 or their exact-head verification.

**Do not assume:** connector geometry can populate distance; a canvas delete can remove source/assessment; row index can safely identify a relationship after reorder.

**Files currently involved:** input model/controller, canvas controller/view/selection, relationship-focused tests, work report.

**Known failing checks:** none in focused canvas suite; base debt `ISS-001`, `ISS-002` remains classified.

**Validation still required:** all Stage-7 mutation tests, exact-head verification, later browser/full-release gates.

**Open QST items:** none currently.

**Highest-risk remaining item:** `RISK-006` relationship mutation authority/cascade/distance integrity.

**Exact next recommended action:** implement Stage 7 with a production-consumed pure row helper/callback, run focused validation, publish atomically, exact-head verify, then refresh this report before Stage 8.

**Required reading:** issue #449, PR #446 authority boundary, `CodingRules.md`, this report, `source-assessment-csv.js`, `vibration-aiv-input-model.js`, `vibration-aiv-qualification-tab.js`, canvas controller/selection modules.
