# PR451 — AIV Dedicated SVG Canvas Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver issue #449's dedicated AIV SVG relationship workspace without changing AIV screening/design authority or introducing a second engineering-data authority. |
| Source task / issue | `reallaksh19/3D_Converters#449` |
| PR number | `#451` |
| Branch | `agent/aiv-svg-canvas` |
| Base commit | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Last validated implementation HEAD | `eb6238d46daca2e0c6e934181079730654b0b353` |
| PR status | DRAFT / OPEN / mergeable |
| Current stage | Stage 6 — Bidirectional table/canvas selection |
| Last completed stage | Stage 5 — SVG interaction controller |
| Engineering status | Stages 4–5 VALIDATED; Stage 6 IN_PROGRESS |
| Validation status | `verify:aiv-canvas` 17/17 PASS on exact Stage-5 content; Stage-5 PR ledger/blob verification PASS |
| Current blocker | None. `ISS-001` and `ISS-002` remain explicitly recorded pre-existing validation/size debt. |
| Exact next action | Add canonical selection keys to projection/table markup, synchronize canvas↔table selection in the existing presentation controller, preserve zoom while revealing table-selected canvas objects, extend focused tests, then exact-head verify before Stage 7. |

## Handover in 60 Seconds

**Now true:** the live AIV workspace has a dedicated SVG with a read-only projection, deterministic presentation layout, pan/zoom controls, background pan, node drag, canvas-local selection, keyboard Enter/Space selection, and presentation state persistence across outer workspace rerenders. Drag/pan/zoom do not touch AIV tables, results, assumptions or distance.

**Active work:** connect Source, Assessment and Source→Assessment selection between the canvas and the authoritative editable tables using canonical/case identity rather than DOM IDs, tags or screen position.

**Not yet done:** relationship creation/deletion, assumption/readiness drilldown, full result contribution detail, filters/multi-source UX, canvas-aware export, browser/accessibility/performance/release hardening.

**Do not assume:** SVG geometry is physical geometry; rendered arrows are calculation contributors; Line/Case LOF is an Assessment LOF; the broad module-boundary test is a clean base oracle.

**Highest current risk:** table selection implemented by row position only could become stale after row deletion/reordering. Stage 6 therefore uses canonical selection keys and treats row index only as presentation metadata.

## Mission and Engineering Intent

The SVG is an explanatory/controller surface over the existing AIV engineering model. Tables and the registered Engineering Calculation API remain authority. The canvas may own presentation layout, viewport and selection state only.

### Permanent invariants

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = visual navigation / relationship editing / result explanation`.
3. Physical distance is explicit relationship/assumption data, never SVG length.
4. Numerical screening remains `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` → central AIV kernel.
5. Assessment screening scope remains separate from `LINE_CASE_SUMMARY` traceability scope.
6. Canonical IDs + Operating Case are engineering identity; tags, DOM IDs, pixels and nearest-position matching are forbidden as authority.
7. Canvas UI contains no AIV equations or local dB-combination formula.

### Explicit non-goals

No CAD/3D authoring, geometry writeback, pixel-derived engineering values, hidden defaults, design-authority promotion, unrelated dependencies or workflow changes.

## Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Work report + PR allocation | P0 | DONE | 1–2 | PR #451 + allocated report |
| Repository-state verification | P0 | DONE | 3 | report-only branch verified before production edits |
| Projection + deterministic layout + live consumer | P0 | VALIDATED | 4 | `2a41528d…`, 12/12 focused PASS, exact blobs/ledger PASS |
| Pan/zoom/select/presentation drag | P0 | VALIDATED | 5 | `eb6238d4…`, 17/17 focused PASS, exact blobs/ledger PASS |
| Bidirectional table/canvas selection | P0 | IN_PROGRESS | 6 | protocol below |
| Relationship authoring/deletion | P0 | NOT_STARTED | 7 | pending |
| Assumption/readiness visualization | P0 | NOT_STARTED | 8 | projection metadata exists; drilldown pending |
| Full screening overlays/result detail | P0 | PARTIAL | 4/9 | basic summaries/scope label exist; detailed contribution UI pending |
| Multi-source/case/line UX | P1 | NOT_STARTED | 10 | pending |
| Canvas-aware export/trace | P1 | NOT_STARTED | 11 | pending |
| Accessibility/performance/release hardening | P0 | NOT_STARTED | 12 | pending |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Canvas consumes existing AIV controller/table state; no parallel engineering store. |
| DEC-002 | Decision | P0 | VALIDATED | Explicit table-backed distance passes through projection unchanged; layout/controller expose no distance mutation. |
| DEC-003 | Decision | P0 | VALIDATED | Projection/layout abstractions have a real live production consumer. |
| DEC-004 | Decision | P0 | ACCEPTED | Registered `calculateEngineering` remains the only screening execution path. |
| DEC-005 | Decision | P0 | VALIDATED | Blank engineering identities are omitted rather than synthesized. |
| DEC-006 | Decision | P1 | ACCEPTED | Canvas is integrated adjacent to the synchronized editable tables. |
| DEC-007 | Decision | P0 | VALIDATED_STAGE5 | Mutable pan/zoom/drag/selection state is owned by one mounted interaction-controller instance, not a module singleton or engineering state store. |
| DEC-008 | Decision | P0 | ACCEPTED_STAGE6 | Table/canvas synchronization will use a canonical `selectionKey`; row index is secondary presentation metadata only. |
| RISK-001 | Risk | High | MITIGATED | Projection/layout are read-only with respect to engineering state. |
| RISK-002 | Risk | High | MITIGATED | Kernel contribution comes only from result contribution objects, never rendered-arrow presence. |
| RISK-004 | Risk | High | MITIGATED_STAGE5 | Interaction runtime has no engineering mutation/calculation path; presentation helpers/tests PASS. |
| RISK-005 | Risk | High | IN_PROGRESS | Row-index-only selection could target the wrong record after deletion/reorder; canonical selection keys are the Stage-6 mitigation. |
| ISS-001 | Base validation debt | Medium | OPEN / CLASSIFIED | Broad boundary test forbids `calculateEngineering` in a set containing the qualification controller while screening-release explicitly requires that registered API route. Do not claim broad boundary PASS until reconciled. |
| ISS-002 | Base size debt | Medium | OPEN / CLASSIFIED | `vibration-aiv-qualification-tab.js` is 362 lines on base/Stage-4; Stage 5 added only the minimal lifecycle hook and did not hide the pre-existing `<300` failure. |

## Stage Roadmap and Execution Log

### Stage 1 — Report initialization + technical findings — COMPLETE

Created work report before production changes; inspected AIV identity, assumption and authority contracts. **Validation: PASS. Decision: COMPLETE.**

### Stage 2 — PR allocation/report synchronization — COMPLETE

Created draft PR #451 and allocated report path. **Validation: PASS. Decision: COMPLETE.**

### Stage 3 — Repository/changed-file verification — COMPLETE

Verified report-only branch before production edits; inspected current controller/view/input/result/tests; recorded `ISS-001`. **Validation: PASS. Decision: COMPLETE.**

### Stage 4 — Projection/layout/live SVG foundation — COMPLETE

**Implemented:** `AivCanvasProjection.v1`, `AivCanvasLayout.v1`, deterministic conceptual lanes, live dedicated SVG, explicit distance labels, basic result summaries, persistent `NON-AUTHORITATIVE FOR SCREENING` Line/Case warning, and `verify:aiv-canvas`.

**Key edge cases validated:** same source across cases stays distinct; duplicate tags do not collide; blank IDs are omitted; explicit distance/provenance pass through; NOT_APPLICABLE arrow cannot invent a contribution; multi-case Assessment results remain scoped; moving layout does not mutate projection.

**Evidence:** exact Stage-4 head `2a41528d56feaeb01e8d30d42837c6ced287b549`; 12/12 focused PASS; nine-file PR ledger and critical blob SHAs matched validated content. **Decision: COMPLETE.**

### Stage 5 — SVG interaction controller — COMPLETE

**Pre-stage constraint:** existing qualification controller was already 362 lines (`ISS-002`), so all interaction behavior was isolated in a focused module and only a lifecycle hook was added to the existing controller.

**Implemented:**

- `tabs/vibration-aiv-canvas-controller.js` as explicit mounted presentation-state boundary;
- bounded zoom (`0.4`–`2.5`) by wheel and `Zoom in` / `Zoom out` / `Reset view` buttons;
- background pan;
- node presentation drag using `moveAivCanvasLayoutNode`;
- relationship line/label-coordinate redraw from presentation positions only; label content is not recalculated;
- canvas-local node/relationship selection with `aria-selected` and visible selected/focus styling;
- Enter/Space keyboard selection;
- presentation layout/viewport reconciliation across outer workspace rerenders, dropping stale nodes and deterministically accepting fresh nodes;
- minimal qualification-controller integration: one import, controller construction, `sync()` after render, `destroy()` on teardown;
- new `tests/vibration-aiv-canvas-interaction.test.mjs`; focused command extended.

**Validation performed on exact Stage-5 content:**

```text
node --check vibration-aiv-canvas-controller.js                 PASS
node --check vibration-aiv-canvas-view.js                       PASS
node --check vibration-aiv-qualification-tab.js                 PASS
npm run verify:aiv-canvas                                      PASS — 17/17
new canvas controller physical lines                            263 (<300)
base qualification controller reconstructed Git blob            5c348ebc… matches repository blob
Stage-5 qualification diff                                      only import/create/sync/destroy lifecycle hook
```

Focused regressions prove pan/zoom helpers mutate viewport presentation state only, reconciliation preserves moved positions while dropping stale nodes, the controller contains no table mutation/calculation/distance/result-equation path, the lifecycle hook does not add `canvasLayout` engineering state, and the SVG exposes keyboard-selectable objects/zoom controls.

**Exact GitHub verification:**

```text
PR head                                                      eb6238d46daca2e0c6e934181079730654b0b353 PASS
PR changed-file count/list                                   12 exact expected files PASS
canvas controller blob                                       29c2592db2a90f120728d2b827572f93f0b4defc PASS
canvas view blob                                             77494e6c85ebab1a73332a3f25e8039157c14d6a PASS
qualification controller blob                                e2182c6f0d99326ef31f1008649b1592152f9216 PASS
interaction test blob                                        e37b7b9ef6668e0fe4cb4ca79cd16efee68f6e25 PASS
package/verify command blob                                  b68a153838078dd9036a45fb435f3eaf586cd6a3 PASS
```

**Remaining limitation:** no browser automation was available in this environment; browser acceptance remains explicitly NOT_RUN. **Stage decision: COMPLETE.**

### Stage 6 — Bidirectional table/canvas selection — IN_PROGRESS

**Current truth:** canvas-local selection works and persists, but authoritative input table rows do not yet carry a stable canvas-selection identity. Using row index alone would be unsafe after deletion/reorder.

**Objective:** selecting a Source/Assessment/relationship on the canvas reveals/highlights the matching editable table row; selecting a table row highlights/reveals the corresponding canvas object while preserving current zoom when possible.

**Expected scope:**

- `converters/vibration/aiv/aiv-canvas-projection.js` — add deterministic relationship `selectionKey`; nodes reuse canonical `nodeKey` as selection key.
- `tabs/vibration-aiv-input-view.js` — add canonical selection-key metadata to Source/Assessment/relationship `<tr>` elements; no engineering data copy/store.
- `tabs/vibration-aiv-canvas-view.js` — add table-kind/selection-key metadata to Source, Assessment and relationship objects; Path/Boundary remain canvas-only.
- `tabs/vibration-aiv-canvas-controller.js` — synchronize selected classes/ARIA between canvas/table, reveal the table row on canvas selection, and center/reveal canvas object on table selection without changing zoom.
- focused projection/view/interaction tests; `verify:aiv-canvas` remains the stage command.
- this report.

**Selection-key contract:**

```text
SOURCE       SOURCE:<Source Canonical ID>:<Operating Case>
ASSESSMENT   ASSESSMENT:<Assessment Canonical ID>
RELATIONSHIP REL:<Source Canonical ID>:<Assessment Canonical ID>:<Operating Case>
```

These are UI synchronization keys built from canonical engineering identity; they are not a replacement engineering ID. Blank/incomplete identity produces no canvas synchronization key.

**Planned behavior:**

1. Canvas Source selection → matching Sources row highlighted/revealed.
2. Canvas Assessment selection → matching Assessments row highlighted/revealed.
3. Canvas relationship selection → matching Source→Assessment row highlighted/revealed.
4. Table row selection → matching canvas object highlighted and viewport translated to reveal/center it while preserving `layout.viewport.zoom`.
5. Path/Boundary selection remains canvas-local because no authoritative table row exists.
6. No selection operation triggers readiness invalidation, screening recalculation, table mutation or relationship creation.

**Edge cases / tests:**

- duplicate displayed tags must still map correctly by canonical selection key;
- same source under multiple cases must select the correct case row;
- row deletion/reorder must not retarget stale selection by old row index;
- editing canonical identity may invalidate selection deterministically rather than guessing a replacement;
- table delete/add controls must not cause a transient wrong selection;
- blank editable rows remain table-operable but have no invented canvas identity;
- relationship selection uses canonical tuple even when readiness provides a different rowKey;
- selected object filtered/removed on rerender clears/re-resolves visually without creating data.

**Planned validation:** `node --check` for changed modules; `npm run verify:aiv-canvas`; static no-equation/no-engineering-mutation checks; exact-head blob/PR-ledger verification.

### Stage 7 — Relationship authoring/deletion — NOT_STARTED

Use the stable Stage-6 selection identity and existing table mutation safeguards to create/delete exactly one `AivSourceAssessmentCsv.v1` row; no connector-length distance and no cascade deletion.

### Stage 8 — Assumption/readiness visualization — NOT_STARTED

Visible assumption/readiness badges and exact field drilldown; no hidden assumptions.

### Stage 9 — Full screening overlays/result detail — NOT_STARTED

Kernel-backed source/contribution/combined point PWL/Assessment LOF detail and D.2.3 scope acceptance; no UI equations.

### Stage 10 — Multi-source/case/line UX — NOT_STARTED

Simultaneous-source explanation plus current/all-case and line filters with explicit case identity.

### Stage 11 — Canvas-aware export/trace — NOT_STARTED

Optional layout/projection metadata/SVG snapshot while numerical export remains independently interpretable.

### Stage 12 — Accessibility/performance/release hardening — NOT_STARTED

Keyboard/focus/non-color acceptance, 100/300/500 fixture, full AIV release reruns, changed-file ledger reconciliation, and deliberate disposition of `ISS-001`/`ISS-002` without weakening safeguards.

## Changed-File Ledger

| File | First stage | Latest stage | Purpose | Validation |
|---|---:|---:|---|---|
| `agents/PR451_workreport.md` | 2 | 6 | living engineering report | current |
| `converters/vibration/aiv/aiv-canvas-projection.js` | 4 | 6 | read-only projection; Stage-6 selection key planned | Stage-4 PASS; Stage-6 pending |
| `converters/vibration/aiv/aiv-canvas-layout-contract.js` | 4 | 5 | presentation layout contract/helpers | PASS |
| `tabs/vibration-aiv-canvas-view.js` | 4 | 6 | SVG + interaction metadata; Stage-6 sync metadata planned | Stage-5 PASS; Stage-6 pending |
| `tabs/vibration-aiv-canvas-controller.js` | 5 | 6 | UI-owned interaction/selection runtime | Stage-5 PASS; Stage-6 pending |
| `tabs/vibration-aiv-input-view.js` | 4 | 6 | authoritative editable table consumer/selection metadata | Stage-4 PASS; Stage-6 pending |
| `tabs/vibration-aiv-qualification-tab.js` | 5 | 5 | minimal canvas-controller lifecycle hook | exact diff verified; no further Stage-6 changes planned |
| `tests/vibration-aiv-canvas-projection.test.mjs` | 4 | 6 | projection/identity regressions | PASS; extension pending |
| `tests/vibration-aiv-canvas-layout.test.mjs` | 4 | 5 | layout/non-authority regressions | PASS |
| `tests/vibration-aiv-canvas-view.test.mjs` | 4 | 6 | visible integration/scope regressions | PASS; extension pending |
| `tests/vibration-aiv-canvas-interaction.test.mjs` | 5 | 6 | interaction/synchronization regressions | 17-test suite PASS; extension pending |
| `package.json` | 4 | 5 | focused `verify:aiv-canvas` command | PASS |

No `.github/workflows/*`, dependency versions or unrelated generated data are changed.

## Validation and Evidence Ledger

### Software validation

| Check | Status | Evidence |
|---|---|---|
| Stage-4 focused suite | PASS | 12/12 exact-content |
| Stage-4 exact-head ledger/blobs | PASS | `2a41528d…` |
| Stage-5 focused suite | PASS | 17/17 exact-content |
| Stage-5 exact-head ledger/blobs | PASS | `eb6238d4…` |
| Browser interaction acceptance | NOT_RUN | no browser harness available in current environment |
| Existing full AIV screening release | NOT_RUN | required in later release gate |
| Broad module-boundary suite | NOT_RUN / BASE ORACLE DEBT | `ISS-001`, `ISS-002` |

### Engineering validation

| Property | Status |
|---|---|
| Layout cannot alter projected engineering values | PASS |
| Canonical/case identity preserved | PASS |
| Explicit distance remains table pass-through | PASS |
| NOT_APPLICABLE arrow cannot invent contribution | PASS |
| Canvas foundation/interaction contains no numerical AIV implementation | PASS |
| Assessment vs Line/Case scope separation | PASS_FOUNDATION |
| Pan/zoom/drag presentation-only | PASS_FOCUSED |
| Table↔canvas canonical synchronization | NOT_RUN — Stage 6 active |

## Known / Deferred Work and Forward Sequence

- `ISS-001`: reconcile contradictory base boundary oracle during hardening; do not weaken UI/kernel separation.
- `ISS-002`: existing 362-line controller debt; Stage 5 intentionally added only minimal lifecycle wiring. Structural cleanup only when directly required or in hardening.
- Forward dependency: Stage 6 stable selection → Stage 7 safe relationship mutation → Stage 8 traceability → Stage 9 detailed results → Stages 10–12 UX/export/hardening.

## Process Notes / Lessons Learned

- Presentation runtime state can persist across outer rerenders without being added to engineering state.
- Relationship connector redraw and relationship engineering distance must remain completely separate operations.
- Canonical selection keys are safer than row indexes for synchronization because table structure can change.
- Base validation debt must be classified explicitly rather than hidden by weakening new tests.

## Next-Agent Handover

**Stopping point:** Stage 5 exact-head validated; Stage 6 protocol complete; no Stage-6 production changes yet.

**PR / branch / implementation HEAD:** #451 / `agent/aiv-svg-canvas` / `eb6238d46daca2e0c6e934181079730654b0b353` before this report-only Stage-6 planning commit.

**Start here:** implement canonical selection keys in projection/table/SVG metadata, extend existing canvas controller for bidirectional highlighting/reveal, and add focused tests. Do not modify engineering tables/results on selection.

**Do not redo:** Stage-4/5 implementation or exact-head verification.

**Known focused failures:** none. Base debt: `ISS-001`, `ISS-002`.

**Highest-risk remaining item:** `RISK-005` stale row-index retargeting; canonical selection keys are mandatory.

**Exact next recommended action:** implement Stage 6, run `verify:aiv-canvas`, exact-head verify, update this report before relationship editing.
