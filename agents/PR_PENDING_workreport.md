# PR_PENDING — AIV Dedicated SVG Canvas Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver the dedicated AIV SVG relationship workspace from issue #449 without changing AIV screening/design authority or introducing a second engineering-data authority. |
| Source task / issue | `reallaksh19/3D_Converters#449` — AIV dedicated SVG canvas |
| PR number | PENDING |
| Branch | `agent/aiv-svg-canvas` |
| Base commit | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current HEAD | Will be updated after this report commit. |
| PR status | NOT_CREATED |
| Current stage | Stage 1 — Report initialization + technical findings |
| Last completed stage | None |
| Engineering status | INVESTIGATING |
| Validation status | NOT_RUN |
| Current blocker | None. Production implementation is intentionally gated until PR allocation/report synchronization is complete. |
| Exact next action | Create draft PR from `agent/aiv-svg-canvas`, rename this report to `agents/PR<NUMBER>_workreport.md`, synchronize Mission Control, then verify the changed-file state before production edits. |

## Handover in 60 Seconds

**What is now true:** issue #449 defines a presentation-only SVG workspace layered over the existing AIV tables, assumption resolution, readiness, and registered screening calculation path. Current AIV screening authority remains assessment-only; line/case summary remains non-authoritative and `designAuthority=false`.

**What is being worked on:** PR setup and staged implementation of a production-consumed canvas projection/layout/UI path.

**What remains unfinished:** all production code, integration, interaction, relationship editing, result overlays, export augmentation, accessibility, and performance validation.

**What must not be assumed:** SVG geometry is not physical geometry; rendered connector length must never become engineering distance; UI must not calculate AIV equations or dB combinations.

**Highest-risk remaining item:** accidentally creating a second state/authority path in the canvas controller instead of consuming the existing table-backed AIV workspace state.

**Exact next action:** allocate the draft PR, synchronize this report, verify branch changed files, then implement the first production slice with a real UI consumer.

## Mission and Engineering Intent

The operator needs a dedicated 2D AIV workspace for navigating and editing Source→Assessment relationships and explaining screening results. The engineering consequence of the work is improved traceability and operability without weakening the existing authority boundary established by #441 / PR #446.

### Governing principles

- `TABLES = engineering source of truth`.
- `SVG CANVAS = visual navigation / relationship editing / result explanation`.
- Canvas layout owns presentation coordinates only.
- Physical distance comes only from the relationship record or visible assumption resolution.
- Screening is invoked only through registered `calculateEngineering` for `VIB.AIV.ACOUSTIC`.
- Result overlays consume the existing result contracts; UI code does not implement equations.
- Assessment screening results and line/case summaries remain explicitly separate scopes.
- Canonical IDs + operating case are the identity basis; tags, DOM IDs, and screen positions are not engineering identity.

### Scope

- dedicated SVG AIV workspace integrated into the existing AIV qualification UI;
- projection contract and deterministic presentation layout;
- selection synchronization with existing table-backed state;
- presentation-only drag/pan/zoom;
- visual Source→Assessment relationship creation/deletion backed by the existing relationship table;
- assumption/readiness/result overlays;
- case/line filtering, simultaneous-source explanation, trace/export integration;
- focused regression, accessibility and representative performance validation.

### Explicit non-goals

- no 3D viewer or CAD authoring;
- no free-form piping geometry editing or geometry writeback;
- no pixel-derived distance/diameter/thickness/attenuation;
- no numerical AIV implementation in UI/SVG modules;
- no hidden engineering assumptions;
- no authority promotion beyond current assessment SCREENING.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Work report + PR allocation | P0 | IN_PROGRESS | 1–2 | This report |
| Repository-state verification | P0 | NOT_STARTED | 3 | Pending |
| Projection + deterministic layout with real UI consumer | P0 | NOT_STARTED | 4 | Pending |
| Dedicated SVG navigation workspace | P0 | NOT_STARTED | 5 | Pending |
| Bidirectional table/canvas selection | P0 | NOT_STARTED | 6 | Pending |
| Relationship authoring/deletion | P0 | NOT_STARTED | 7 | Pending |
| Assumption/readiness visualization | P0 | NOT_STARTED | 8 | Pending |
| Screening overlays + result-scope separation | P0 | NOT_STARTED | 9 | Pending |
| Multi-source/case/line UX | P1 | NOT_STARTED | 10 | Pending |
| Canvas-aware export / trace | P1 | NOT_STARTED | 11 | Pending |
| Accessibility/performance/release hardening | P0 | NOT_STARTED | 12 | Pending |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Canvas will consume the existing AIV table/controller state; it will not own a parallel engineering store. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Projection/layout modules may expose explicit table-backed distance for display but never derive distance from SVG coordinates. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | New abstractions must have a real production consumer in this PR; projection/layout will be wired into the live AIV workspace as they are introduced. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Existing `calculateEngineering` remains the only screening execution path; canvas/UI consumes returned result objects. | Yes |
| RISK-001 | Risk | High | IN_PROGRESS | Canvas controller could become a hidden second engineering authority if it duplicates table values or calculation state. | Yes |
| RISK-002 | Risk | High | IN_PROGRESS | All-case rendering can visually retain non-applicable connectors; result overlays must consume kernel contribution lists rather than rendered arrows. | Yes |
| RISK-003 | Risk | Medium | IN_PROGRESS | Existing `vibration-aiv-qualification-tab.js` is already large; integration must avoid further monolithic growth and respect module/function size rules. | Yes |
| QST-001 | Question | P1 | INVESTIGATING | Determine the narrowest stable selection model that synchronizes Sources, Assessments and relationship rows without DOM identity. | Yes |
| QST-002 | Question | P1 | INVESTIGATING | Determine exact result object fields from the current screening implementation for source/contribution/assessment overlays. | Yes |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

**Current truth:** AIV tables, assumption resolution, readiness and screening execution already live in `tabs/vibration-aiv-qualification-tab.js`. `AivSourceCsv.v2` keys sources by Source Canonical ID + Operating Case. `AivSourceAssessmentCsv.v1` rejects duplicate Source Canonical ID + Assessment Canonical ID + Operating Case tuples. Existing assumption resolution fills blank cells only and records visible provenance.

**Objective:** establish durable implementation invariants and staged scope before production edits.

**Expected scope/files:** `agents/PR_PENDING_workreport.md` only.

**Engineering rationale:** the coding protocol requires durable handover and explicit authority decisions before production work begins.

**Planned validation:** confirm report existence on the working branch and allocate a draft PR.

**Known risks:** none beyond incomplete repository inspection; all production claims remain unvalidated.

### Stage 2 — PR allocation + report synchronization

Create a draft PR, rename report to `agents/PR<NUMBER>_workreport.md`, update PR number/current HEAD/status.

### Stage 3 — Changed-file / repository-state verification

Verify base/head and changed-file list before production edits; inspect current AIV view/controller/model/result contracts and existing tests relevant to the first slice.

### Stage 4 — Projection + deterministic layout + live consumer

Introduce `AivCanvasProjection.v1` and presentation-only layout helpers, immediately consumed by the live AIV workspace. Add focused tests for identity, case separation, explicit distance pass-through, deterministic ordering, and layout non-authority.

### Stage 5 — Dedicated SVG navigation workspace

Add focused canvas view/controller/icon modules with pan/zoom/select/presentation drag. No geometry editing or engineering-value mutation.

### Stage 6 — Bidirectional table/canvas selection

Centralize selection identity and synchronize canvas objects with Sources/Assessments/Source→Assessment rows.

### Stage 7 — Relationship authoring/deletion

Create/delete relationship table records through existing input-model mutation boundaries; never infer distance from connector geometry; prove no cascade deletion.

### Stage 8 — Assumption/readiness visualization

Project assumption and readiness metadata to badges/drilldown without hidden defaults.

### Stage 9 — Screening overlays + result scopes

Consume registered screening result objects and keep Assessment vs `LINE_CASE_SUMMARY` scopes visually and contractually distinct.

### Stage 10 — Multi-source / case / line UX

Simultaneous-source explanation, case/line filters, current/all-case rendering, deterministic filtered selection behavior.

### Stage 11 — Canvas-aware export / trace

Add optional presentation layout/projection metadata while preserving engineering export interpretability without layout.

### Stage 12 — Accessibility / performance / release hardening

Keyboard/focus/non-color status acceptance, representative 100/300/500 fixture, full focused command and existing AIV release regressions.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living engineering work report required by CodingRules.md | No | NOT_RUN |

## Engineering Decisions and Invariants

### INV-001 — Table authority

**Must remain true:** canvas presentation cannot become the source of engineering values.

**Enforcement:** canvas projection consumes existing records/results; layout schema accepts presentation coordinates only.

**Validation:** targeted mutation/non-authority tests planned for Stage 4–5.

**PR changes invariant?** No.

### INV-002 — Explicit physical distance

**Must remain true:** relationship physical distance comes from table/assumption data, never SVG pixels/path length.

**Enforcement:** no geometry-to-distance API will exist in canvas modules; tests will mutate layout while asserting projected engineering/result values remain unchanged.

**Validation:** planned Stage 4–5.

**PR changes invariant?** No.

### INV-003 — Calculation authority

**Must remain true:** `calculateEngineering` / central AIV kernel remains numerical authority.

**Enforcement:** canvas modules consume screening result contracts only; boundary tests will prohibit kernel/equation imports from SVG/UI modules.

**Validation:** planned Stage 9/12.

**PR changes invariant?** No.

### INV-004 — Result scope

**Must remain true:** assessment LOF is authoritative screening scope; line/case summary is traceability-only and visibly non-authoritative.

**Enforcement:** projection/rendering maintains explicit `ASSESSMENT` vs `LINE_CASE_SUMMARY` scope labels.

**Validation:** D.2.3 scope regression planned Stage 9.

**PR changes invariant?** No.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Report initialization | NOT_RUN | base `c8aa2786e…` | Pending GitHub write confirmation |
| Focused AIV canvas tests | NOT_RUN | — | Not implemented |
| Existing AIV screening release | NOT_RUN | — | Must be rerun after production changes |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Canvas cannot alter engineering distance/results | NOT_RUN | Planned focused regression |
| Canonical/case identity preserved | NOT_RUN | Planned focused regression |
| UI contains no AIV equations | NOT_RUN | Planned import/static boundary regression |
| Assessment/line scope separation | NOT_RUN | Planned D.2.3 regression |

### Explicitly Not Validated

- No production canvas behavior exists yet.
- No browser interaction has been validated.
- No performance or accessibility claims are made.
- No new export behavior exists.

## Known / Deferred Work and Forward Sequence

No work is deferred yet. The recommended sequence is the Stage Roadmap above because each stage adds an operator-visible capability while preserving testable authority boundaries.

## Stage Execution Log

### Stage 1 — initialization

**Implementation performed:** inspected issue #449, current AIV source/relationship schemas, assumption resolution, current AIV workspace controller and CodingRules.md; created this report before production edits.

**Changed files and reasons:** this report only.

**Deviations from plan:** none.

**Validation performed:** source inspection only; production validation NOT_RUN.

**New findings:** current controller is the appropriate engineering-state owner; new canvas state should be limited to selection/filter/layout presentation state.

**Remaining risks:** RISK-001 through RISK-003.

**Stage decision:** COMPLETE once this file is confirmed committed on the branch.

**Handover delta:** PR allocation is the next required protocol step.

## Process Notes / Lessons Learned

- Existing AIV table/controller state already provides the correct authority boundary; introducing a new canvas-side engineering model would be unnecessary and dangerous.
- The repository’s coding protocol requires a production consumer for every new abstraction, so projection/layout cannot land as unused schema-only infrastructure.

## Next-Agent Handover

**Current stopping point:** report initialized before production changes; draft PR not yet allocated.

**PR / branch / HEAD:** PR PENDING / `agent/aiv-svg-canvas` / base `c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` plus this report commit once created.

**Last completed stage:** Stage 1.

**Current active stage:** Stage 2 — PR allocation + report synchronization.

**Start here:** create draft PR for this branch, rename this report to the allocated PR number, update Mission Control, then inspect actual changed-file state.

**Do not redo:** issue #449 architecture review; basic source/relationship/assumption identity inspection.

**Do not assume:** any canvas production behavior or validation exists.

**Files currently involved:** `agents/PR_PENDING_workreport.md` only.

**Known failing checks:** none executed.

**Validation still required:** all production validation.

**Open QST-* items:** QST-001, QST-002.

**Important deferred IMP-* items:** none.

**Highest-risk remaining item:** RISK-001 — parallel engineering authority/state in canvas code.

**Exact next recommended action:** allocate the draft PR and synchronize this report before production implementation.

**Required reading:** issue #449; PR #446 authority summary; pinned CodingRules.md; `tabs/vibration-aiv-qualification-tab.js`; AIV CSV/assumption/result contracts.
