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
| Current pre-Stage-6 parent | `fb9e85cc738a145e6ff25cc7d59f34e451dfc4b5` |
| PR status | DRAFT / OPEN |
| Current stage | Stage 6 — Bidirectional table/canvas selection |
| Last completed stage | Stage 5 — SVG interaction controller |
| Engineering status | Stage 6 IMPLEMENTED in prepared tree; publish/exact-head verification pending |
| Validation status | Focused Stage-6 content suite 21/21 PASS before publish; exact GitHub head verification pending |
| Current blocker | None. `ISS-001` and `ISS-002` remain explicitly classified base debt. |
| Exact next action | Publish the Stage-6 production/tests/report tree, verify exact PR head/blobs/file ledger, then close Stage 6 and begin Stage 7 only after refreshing this report. |

## Handover in 60 Seconds

**What is now true:** Stages 4–5 are exact-head validated. Stage 6 adds canonical UI synchronization keys, table-row metadata, canvas/table selected-state mirroring, table-row reveal from canvas selection, and canvas centering from table selection while preserving zoom.

**What is being worked on:** publish and exact-head verification of Stage 6.

**What remains unfinished:** relationship creation/deletion, assumption/readiness drilldown, full source/contribution/assessment result detail, case/line filtering and simultaneous-source UX, canvas-aware export, accessibility/performance/release hardening.

**What must not be assumed:** selection keys replace engineering identity; row index is authoritative; SVG geometry is physical geometry; visible arrows are kernel contributions; Line/Case LOF is Assessment screening LOF.

**Highest-risk remaining item:** Stage 7 relationship mutation must reuse existing table mutation safeguards and must never derive Physical Distance from connector geometry.

**Exact next action:** commit Stage 6 atomically, verify exact blobs/PR ledger, then update this report with Stage-6 closure and Stage-7 pre-implementation protocol.

## Mission and Engineering Intent

The canvas is a presentation/controller surface over the existing AIV engineering model. Tables and the registered Engineering Calculation API remain engineering authority. Canvas-owned mutable state is limited to presentation layout, viewport and selection.

### Permanent invariants

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = visual navigation / relationship editing / result explanation`.
3. Physical distance is explicit Source→Assessment table/assumption data, never SVG length.
4. Numerical screening remains `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` → central AIV kernel.
5. Assessment screening scope remains separate from `LINE_CASE_SUMMARY` traceability scope.
6. Canonical IDs + Operating Case are engineering identity; tags, DOM IDs, pixels and nearest-position matching are forbidden as authority.
7. Canvas/UI contains no AIV equations or local dB-combination formula.
8. Selection is presentation state only and cannot mutate or invalidate engineering data.

### Explicit non-goals

No CAD/3D authoring, geometry writeback, pixel-derived engineering values, hidden defaults, design-authority promotion, unrelated dependencies, workflow changes or speculative abstractions.

## Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Work report + PR allocation | P0 | DONE | 1–2 | PR #451 + allocated report |
| Repository-state verification | P0 | DONE | 3 | report-only branch verified before production edits |
| Projection + deterministic layout + live consumer | P0 | VALIDATED | 4 | `2a41528d…`, 12/12 PASS, exact blobs/ledger PASS |
| Pan/zoom/select/presentation drag | P0 | VALIDATED | 5 | `eb6238d4…`, 17/17 PASS, exact blobs/ledger PASS |
| Bidirectional table/canvas selection | P0 | IMPLEMENTED | 6 | prepared Stage-6 tree; 21/21 focused PASS; publish verification pending |
| Relationship authoring/deletion | P0 | NOT_STARTED | 7 | protocol below after Stage-6 closure |
| Assumption/readiness visualization | P0 | NOT_STARTED | 8 | projection metadata exists; drilldown pending |
| Full screening overlays/result detail | P0 | PARTIAL | 4/9 | basic summaries/scope label exist; detailed contribution UI pending |
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
| DEC-006 | Decision | P1 | ACCEPTED | Canvas is integrated adjacent to authoritative editable tables. | Yes |
| DEC-007 | Decision | P0 | VALIDATED_STAGE5 | Mutable pan/zoom/drag/selection state is owned by one mounted interaction-controller instance. | Yes |
| DEC-008 | Decision | P0 | VALIDATED_LOCAL_STAGE6 | UI synchronization key uses canonical identity tuple; row index remains secondary presentation metadata only. | Yes |
| DEC-009 | Decision | P0 | ACCEPTED_STAGE7 | Relationship creation/deletion must call existing table mutation boundaries; no direct engineering-record shadow store in canvas controller. | Yes |
| RISK-001 | Risk | High | MITIGATED | Projection/layout are read-only with respect to engineering state. | Yes |
| RISK-002 | Risk | High | MITIGATED | Kernel contribution comes only from result contribution objects, never rendered-arrow presence. | Yes |
| RISK-004 | Risk | High | MITIGATED_STAGE5 | Pan/zoom/drag runtime has no engineering mutation/calculation path. | Yes |
| RISK-005 | Risk | High | MITIGATED_LOCAL_STAGE6 | Canonical selection keys remove row-index-only retargeting risk. | Yes |
| RISK-006 | Risk | High | ACCEPTED_STAGE7 | Relationship authoring could accidentally create duplicates/cascade deletes or infer distance from geometry; Stage 7 must test all three explicitly. | Yes |
| ISS-001 | Base validation debt | Medium | OPEN / CLASSIFIED | Broad boundary test forbids `calculateEngineering` in a source set containing qualification controller while screening-release requires the registered API path. | Yes |
| ISS-002 | Base size debt | Medium | OPEN / CLASSIFIED | `vibration-aiv-qualification-tab.js` exceeds the normal 300-line target on base; canvas logic remains split into focused modules. | Yes |

## Stage Roadmap and Execution Log

### Stage 1 — Report initialization + technical findings — COMPLETE

Created work report before production changes; inspected current AIV identity, assumption and authority contracts. **Validation: PASS. Stage decision: COMPLETE.**

### Stage 2 — PR allocation/report synchronization — COMPLETE

Created draft PR #451, allocated `agents/PR451_workreport.md`, removed pending report. **Validation: PASS. Stage decision: COMPLETE.**

### Stage 3 — Repository/changed-file verification — COMPLETE

Verified report-only branch before production edits; inspected live controller/view/input/result/test surfaces; recorded base debt. **Validation: PASS. Stage decision: COMPLETE.**

### Stage 4 — Projection/layout/live SVG foundation — COMPLETE

Implemented `AivCanvasProjection.v1`, `AivCanvasLayout.v1`, deterministic conceptual lanes, live dedicated SVG, explicit distance labels, basic result summaries, and persistent Line/Case non-authoritative warning.

Key validations: same source across cases remains distinct; duplicate tags do not collide; blank IDs are omitted; explicit distance/provenance pass through; NOT_APPLICABLE arrow cannot invent a contribution; layout movement does not mutate projection. **Evidence: `2a41528d…`, 12/12 PASS, exact blobs/ledger PASS. Stage decision: COMPLETE.**

### Stage 5 — SVG interaction controller — COMPLETE

Implemented focused mounted presentation controller with bounded zoom, background pan, node presentation drag, relationship redraw from presentation positions, canvas-local selection, Enter/Space selection, and presentation state reconciliation across outer rerenders. Qualification controller gained only minimal lifecycle integration.

Validation: controller below 300 lines; no engineering mutation/calculation/distance/result-equation path; `verify:aiv-canvas` 17/17 PASS; exact Stage-5 head/blobs/ledger verified at `eb6238d46daca2e0c6e934181079730654b0b353`. Browser acceptance NOT_RUN in current environment. **Stage decision: COMPLETE.**

### Stage 6 — Bidirectional table/canvas selection — IMPLEMENTED / PUBLISH VERIFICATION PENDING

#### Current truth before implementation

Canvas selection existed only inside SVG. Editable table rows did not expose stable canvas-selection identity; row-index-only mapping would be unsafe after deletion/reorder.

#### Objective

Synchronize Source, Assessment and Source→Assessment selection between canvas and tables using canonical/case identity while keeping selection presentation-only.

#### Implementation performed

- Added `tabs/vibration-aiv-canvas-selection.js` as a focused selection/reveal helper module.
- Added canonical UI selection metadata to authoritative table rows:

```text
SOURCE       SOURCE:<Source Canonical ID>:<Operating Case>
ASSESSMENT   ASSESSMENT:<Assessment Canonical ID>
RELATIONSHIP REL:<Source Canonical ID>:<Assessment Canonical ID>:<Operating Case>
```

- Added relationship `selectionKey` to `AivCanvasProjection.v1`; readiness `rowKey` remains trace metadata and does not replace the canonical synchronization tuple.
- Added matching selection/table-kind metadata to Source/Assessment/relationship SVG objects; Path/Boundary remain canvas-only.
- Extended mounted canvas controller so:
  - canvas selection highlights/reveals the matching table row;
  - table-row selection highlights/reveals the matching canvas object;
  - table-driven reveal centers the selected object by presentation layout coordinates while preserving current zoom;
  - selection survives ordinary outer rerenders when the canonical key still exists;
  - removed/changed identity clears visual matching rather than guessing a replacement.
- Table add/delete controls are excluded from transient row-selection handling.
- No Stage-6 code calls table mutation helpers, readiness invalidation, screening execution, relationship creation or numerical AIV code.
- Added `tests/vibration-aiv-canvas-selection.test.mjs`; focused command includes it.

#### Edge cases covered

- same Source Canonical ID under two operating cases selects the exact case;
- duplicate display tags do not participate in selection identity;
- blank/incomplete identity rows receive no invented synchronization key;
- relationship synchronization uses canonical source+assessment+case even if readiness row key differs;
- table-driven centering preserves zoom;
- selected object removal/rekeying cannot retarget by old row index;
- Path/Boundary selection remains canvas-local.

#### Validation performed before publish

```text
npm run verify:aiv-canvas                                      PASS — 21/21
selection helper physical lines                                77 (<300)
canvas controller physical lines                               <300
canvas projection physical lines                               <300
canvas view physical lines                                     <300
input view physical lines                                      <300
selection helper engineering-mutation/calculation imports      NONE
case-qualified selection regression                            PASS
relationship canonical selection-key regression                PASS
table-driven centering preserves zoom                          PASS
```

**Deviations from plan:** none material. Selection was split into its own module rather than further enlarging the interaction controller, consistent with issue #449's proposed module split and CodingRules.md.

**Remaining validation:** exact GitHub head/blob/file-ledger verification after this implementation commit.

**Stage decision:** PARTIAL until exact-head verification is recorded.

### Stage 7 — Relationship authoring/deletion — NEXT / NOT_STARTED

This stage must not begin until Stage 6 is exact-head verified and this report is refreshed.

#### Objective

Allow the operator to create/delete Source→Assessment relationship records visually while keeping all engineering values table-owned.

#### Expected scope

- `tabs/vibration-aiv-canvas-controller.js` or a new focused relationship helper if needed — RELATIONSHIPS interaction orchestration only.
- `tabs/vibration-aiv-input-model.js` — add narrowly scoped record creation helper only if existing mutation functions cannot safely create a prefilled row.
- `tabs/vibration-aiv-qualification-tab.js` — expose the existing authoritative table mutation boundary to the canvas controller through a minimal callback; no duplicated store.
- `tabs/vibration-aiv-canvas-view.js` — mode/action affordances and pending source visual state.
- focused relationship-edit tests and `verify:aiv-canvas` expansion.
- this report.

#### Required behavior

1. RELATIONSHIPS mode: select Source then Assessment → create exactly one relationship table row.
2. New row fields:
   - Source Canonical ID = selected source;
   - Assessment Canonical ID = selected assessment;
   - Operating Case = selected source/current case;
   - Applicability = explicit product rule (`UNRESOLVED` unless existing UI contract authorizes `APPLICABLE`);
   - Physical Distance = blank;
   - Physical Distance Unit = blank;
   - Distance Source / Revision = blank;
   - Simultaneous Group = blank.
3. Exact duplicate source+assessment+case must be prevented or rejected deterministically using the existing relationship identity rule.
4. Connector geometry must never populate Physical Distance.
5. Visual relationship delete removes only the selected relationship row using the same safeguards as table delete; Source and Assessment rows remain.
6. Shared Source/Assessment records referenced by other cases/relationships must remain intact.
7. Any engineering table mutation follows the existing invalidation flow; canvas controller must not independently decide screening dependency scope.

#### Planned validation

- exactly-one-row creation;
- duplicate exact relationship handling;
- physical distance remains blank and invariant under SVG geometry;
- selected operating case preserved;
- delete-only-relationship/no-cascade fixtures with shared source and shared assessment;
- existing table editor mutation/invalidation semantics reused;
- no AIV equations or numerical kernel imports in canvas/UI modules;
- `npm run verify:aiv-canvas` exact-content PASS;
- exact-head blobs/ledger after publish.

#### Known risks

`RISK-006` is the governing Stage-7 risk. If the existing table mutation API cannot support prefilled safe creation without broad controller changes, record a new `QST-*`/`IMP-*` and split a focused production-consumed helper rather than adding an authority-changing shim.

### Stage 8 — Assumption/readiness visualization — NOT_STARTED

Visible assumption/readiness badges and exact editable-field drilldown; no hidden assumptions.

### Stage 9 — Full screening overlays/result detail — NOT_STARTED

Kernel-backed source PWL, relationship contribution, combined point PWL and Assessment LOF detail; D.2.3 scope acceptance; no UI equations.

### Stage 10 — Multi-source/case/line UX — NOT_STARTED

Simultaneous-source contribution explanation and current/all-case + line filters with explicit case identity.

### Stage 11 — Canvas-aware export/trace — NOT_STARTED

Optional layout/projection/SVG snapshot while numerical screening export remains independently interpretable without layout.

### Stage 12 — Accessibility/performance/release hardening — NOT_STARTED

Keyboard/focus/non-color acceptance, 100/300/500 fixture, full AIV release reruns, final changed-file reconciliation, and explicit disposition of `ISS-001`/`ISS-002` without weakening safeguards.

## Changed-File Ledger

| File | First stage | Latest stage | Purpose | Validation |
|---|---:|---:|---|---|
| `agents/PR451_workreport.md` | 2 | 6 | living engineering report | current |
| `converters/vibration/aiv/aiv-canvas-projection.js` | 4 | 6 | read-only projection + relationship canonical selection key | 21/21 local; exact-head pending |
| `converters/vibration/aiv/aiv-canvas-layout-contract.js` | 4 | 5 | presentation layout contract/helpers | PASS |
| `tabs/vibration-aiv-canvas-view.js` | 4 | 6 | SVG + canonical selection/table metadata | 21/21 local; exact-head pending |
| `tabs/vibration-aiv-canvas-controller.js` | 5 | 6 | UI-owned interaction + sync orchestration | 21/21 local; exact-head pending |
| `tabs/vibration-aiv-canvas-selection.js` | 6 | 6 | canonical selection/highlight/reveal helpers | 21/21 local; exact-head pending |
| `tabs/vibration-aiv-input-view.js` | 4 | 6 | authoritative editable table + canonical selection metadata | 21/21 local; exact-head pending |
| `tabs/vibration-aiv-qualification-tab.js` | 5 | 5 | minimal canvas-controller lifecycle hook | Stage-5 exact verified |
| `tests/vibration-aiv-canvas-projection.test.mjs` | 4 | 4 | projection/authority regressions | PASS |
| `tests/vibration-aiv-canvas-layout.test.mjs` | 4 | 4 | layout/non-authority regressions | PASS |
| `tests/vibration-aiv-canvas-view.test.mjs` | 4 | 4 | visible integration/scope regressions | PASS |
| `tests/vibration-aiv-canvas-interaction.test.mjs` | 5 | 5 | interaction regressions | PASS |
| `tests/vibration-aiv-canvas-selection.test.mjs` | 6 | 6 | canonical table↔canvas synchronization regressions | local PASS; exact-head pending |
| `package.json` | 4 | 6 | focused `verify:aiv-canvas` command | 21/21 local; exact-head pending |

No `.github/workflows/*`, dependency versions or unrelated generated data are changed.

## Engineering Decisions and Invariants

| Invariant | Enforcement | Validation | Changed by PR? |
|---|---|---|---|
| Canvas layout cannot become engineering distance | projection/layout/controller separation | focused layout + static tests | No |
| Canvas cannot calculate AIV results | no kernel imports/equations in UI modules | focused static tests | No |
| Selection cannot mutate engineering data | dedicated selection helper/controller only | focused static + behavior tests | Adds explicit enforcement |
| Canonical/case identity governs synchronization | selection-key contract | same-source multi-case tests | Adds explicit UI synchronization |
| Line/Case summary remains non-authoritative | separate result contract + persistent UI warning | Stage-4 scope tests | No |

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD/content | Evidence |
|---|---|---|---|
| Stage-4 focused suite | PASS | `2a41528d…` | 12/12 |
| Stage-4 exact-head ledger/blobs | PASS | `2a41528d…` | exact GitHub verification |
| Stage-5 focused suite | PASS | `eb6238d4…` | 17/17 |
| Stage-5 exact-head ledger/blobs | PASS | `eb6238d4…` | exact GitHub verification |
| Stage-6 focused suite | PASS | prepared tree | 21/21 before publish |
| Stage-6 exact-head ledger/blobs | NOT_RUN | pending implementation commit | required next |
| Browser interaction acceptance | NOT_RUN | current environment | no browser harness available |
| Full AIV screening release | NOT_RUN | later release gate | required Stage 12 |
| Broad module-boundary suite | NOT_RUN / BASE ORACLE DEBT | base debt | `ISS-001`, `ISS-002` |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Layout cannot alter projected engineering values | PASS | Stage-4 regressions |
| Canonical/case identity preserved | PASS | projection + Stage-6 case-specific selection tests |
| Explicit distance remains table pass-through | PASS | projection/layout tests |
| NOT_APPLICABLE arrow cannot invent contribution | PASS | projection test |
| Canvas contains no numerical AIV implementation | PASS | static source tests |
| Assessment vs Line/Case scope separation | PASS_FOUNDATION | Stage-4 view tests |
| Pan/zoom/drag presentation-only | PASS | Stage-5 tests |
| Table↔canvas canonical synchronization | PASS_LOCAL / EXACT_HEAD_PENDING | Stage-6 21/21 suite |

### Explicitly Not Validated

- real-browser pointer/scroll behavior;
- large-project interaction performance;
- relationship authoring/deletion;
- full AIV screening release on PR head;
- full accessibility acceptance.

## Known / Deferred Work and Forward Sequence

Open defects/risks:

- `ISS-001` broad boundary-oracle inconsistency — reconcile during hardening without weakening UI/kernel separation.
- `ISS-002` pre-existing qualification-controller size debt — avoid adding canvas behavior there; structural cleanup only when directly required.
- `RISK-006` Stage-7 relationship mutation authority/cascade risk — must close before moving to assumption/result stages.

Recommended forward sequence:

1. Exact-head verify Stage 6 because safe relationship mutation depends on stable selection identity.
2. Stage 7 relationship authoring/deletion because later assumption/result UX needs stable relationship records.
3. Stage 8 assumption/readiness drilldown because unresolved distance/readiness must be visible before richer result presentation.
4. Stage 9 detailed result overlays from central result contracts.
5. Stage 10 multi-source/case/line UX.
6. Stage 11 canvas-aware export/trace.
7. Stage 12 accessibility/performance/full release and debt disposition.

## Process Notes / Lessons Learned

- Presentation runtime state can persist across outer rerenders without entering engineering state.
- Relationship connector redraw and relationship physical distance must remain completely separate operations.
- Canonical selection keys are safer than row indexes because table structure can change.
- A canonical synchronization key is a UI lookup key, not a new engineering identity authority.
- Base validation debt must be recorded rather than hidden by weakening new tests.

## Next-Agent Handover

**Current stopping point:** Stage 6 implementation/test/report tree prepared; publish and exact-head verification still required.

**PR / branch:** #451 / `agent/aiv-svg-canvas`.

**Parent before Stage-6 implementation:** `fb9e85cc738a145e6ff25cc7d59f34e451dfc4b5`.

**Start here:** publish Stage-6 tree, verify PR head + changed-file ledger + critical blobs + focused command content, then change Stage-6 decision to COMPLETE and activate Stage 7 protocol.

**Do not redo:** Stages 4–5 or Stage-6 implementation design unless exact-head verification finds a mismatch.

**Do not assume:** prepared blobs are committed until branch ref advances and exact GitHub fetch confirms them.

**Files currently involved:** projection, canvas view/controller/selection, input view, selection test, package, work report.

**Known failing checks:** none in focused Stage-6 suite. Base debt remains `ISS-001`, `ISS-002`.

**Validation still required:** Stage-6 exact-head GitHub verification; browser/full-release gates later.

**Open QST items:** none currently.

**Important deferred IMP items:** controller structural cleanup only if directly required by later stages/hardening.

**Highest-risk remaining item:** Stage-7 relationship mutation must not infer distance or cascade-delete Source/Assessment records.

**Exact next recommended action:** commit Stage 6 atomically, exact-head verify, refresh report, then implement relationship authoring/deletion.

**Required reading:** issue #449, PR #446 authority boundary, `CodingRules.md`, this report, `source-assessment-csv.js`, `vibration-aiv-input-model.js`, canvas controller/selection modules.
