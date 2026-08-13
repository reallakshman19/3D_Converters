# PR451 — AIV Dedicated SVG Canvas Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver issue #449's dedicated AIV SVG relationship workspace without changing AIV screening/design authority or introducing a second engineering-data authority. |
| Source task / issue | `reallaksh19/3D_Converters#449` |
| PR number | `#451` |
| Branch | `agent/aiv-svg-canvas` |
| Base commit | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current HEAD | `2de80ee034ee3166be89738ae6c31c539f7fb81e` before report rename synchronization |
| PR status | DRAFT / OPEN |
| Current stage | Stage 2 — PR allocation + report synchronization |
| Last completed stage | Stage 1 — Report initialization + technical findings |
| Engineering status | ACCEPTED architecture / implementation NOT_STARTED |
| Validation status | NOT_RUN |
| Current blocker | None |
| Exact next action | Remove `agents/PR_PENDING_workreport.md`, verify PR changed-file state, then implement Stage 4 projection/layout with an immediate live AIV workspace consumer. |

## Handover in 60 Seconds

**What is now true:** issue #449 is assigned to draft PR #451. Existing AIV tables, assumption resolution, readiness, and registered `calculateEngineering` execution remain the engineering-state path. The canvas is constrained to presentation/navigation/relationship control and result explanation.

**What is being worked on:** protocol synchronization followed by the first production slice: canvas projection + deterministic presentation layout + live workspace consumption.

**What remains unfinished:** all production canvas code, SVG interaction, table synchronization, relationship editing, overlays, filtering, export augmentation, accessibility and performance validation.

**What must not be assumed:** SVG geometry is physical geometry; connector length must never become engineering distance; UI must not calculate AIV equations or combined dB values.

**Highest-risk remaining item:** duplicating engineering data/state in canvas code instead of projecting the existing table-backed controller state.

**Exact next action:** complete Stage 2/3 protocol checks, then implement Stage 4.

## Mission and Engineering Intent

The operator needs a dedicated 2D AIV workspace for navigating and editing Source→Assessment relationships and explaining screening outcomes. This PR improves operability and traceability while preserving the authority established by #441 / PR #446.

### Governing principles

- `TABLES = engineering source of truth`.
- `SVG CANVAS = visual navigation / relationship editing / result explanation`.
- Canvas layout owns presentation coordinates only.
- Physical distance comes only from Source→Assessment data or visible assumption resolution.
- `VIB.AIV.ACOUSTIC` screening runs only through registered `calculateEngineering`.
- SVG/UI modules consume result contracts and do not implement AIV equations.
- Assessment screening result remains authoritative scope; Line/Case summary remains `NON-AUTHORITATIVE FOR SCREENING`.
- Canonical IDs + operating case are identity; tags, DOM IDs, and screen position are not.

### Scope

- production-integrated AIV canvas projection and deterministic presentation layout;
- dedicated SVG workspace with pan/zoom/select/presentation-only drag;
- bidirectional canvas/table selection;
- Source→Assessment creation/deletion through existing table mutation boundaries;
- assumption/readiness/result overlays;
- simultaneous-source, case and line UX;
- canvas-aware trace/export while preserving engineering export independence from layout;
- focused authority, D.2.3, accessibility and representative performance validation.

### Explicit non-goals

- no CAD/3D geometry authoring or geometry writeback;
- no pixel-derived distance/pipe length/diameter/thickness/attenuation;
- no numerical AIV implementation in UI code;
- no hidden engineering assumptions;
- no screening/design authority promotion.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Work report + PR allocation | P0 | IN_PROGRESS | 1–2 | PR #451 + report |
| Repository-state verification | P0 | NOT_STARTED | 3 | Pending |
| Projection + deterministic layout + live consumer | P0 | NOT_STARTED | 4 | Pending |
| Dedicated SVG navigation workspace | P0 | NOT_STARTED | 5 | Pending |
| Bidirectional table/canvas selection | P0 | NOT_STARTED | 6 | Pending |
| Relationship authoring/deletion | P0 | NOT_STARTED | 7 | Pending |
| Assumption/readiness visualization | P0 | NOT_STARTED | 8 | Pending |
| Screening overlays + result-scope separation | P0 | NOT_STARTED | 9 | Pending |
| Multi-source/case/line UX | P1 | NOT_STARTED | 10 | Pending |
| Canvas-aware export/trace | P1 | NOT_STARTED | 11 | Pending |
| Accessibility/performance/release hardening | P0 | NOT_STARTED | 12 | Pending |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Canvas consumes the existing AIV controller/table state; no parallel engineering store. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Projection may pass through explicit relationship distance for display but layout geometry can never derive it. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Every new abstraction gets a real production consumer in this PR, matching CodingRules.md. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | `calculateEngineering` remains the only screening execution path; result overlays consume returned domain results. | Yes |
| RISK-001 | Risk | High | IN_PROGRESS | Canvas could become a hidden second engineering authority if values/state are duplicated. | Yes |
| RISK-002 | Risk | High | IN_PROGRESS | All-case visible connectors must not be interpreted as kernel contributors. | Yes |
| RISK-003 | Risk | Medium | IN_PROGRESS | Existing qualification controller is large; new behavior must be split into focused modules/functions. | Yes |
| QST-001 | Question | P1 | INVESTIGATING | Final selection identity shape for Sources/Assessments/Relationships without DOM identity. | Yes |
| QST-002 | Question | P1 | INVESTIGATING | Exact current domain-result fields to project for source/contribution/assessment overlays. | Yes |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings — COMPLETE

**Current truth / findings:**

- `tabs/vibration-aiv-qualification-tab.js` already owns working tables, assumption resolution, readiness envelope, screening result, selection row key, and all engineering-invalidating table mutations.
- `AivSourceCsv.v2` rejects duplicate `(Source Canonical ID, Operating Case)` source rows.
- `AivSourceAssessmentCsv.v1` rejects duplicate `(Source Canonical ID, Assessment Canonical ID, Operating Case)` relationships.
- `AivAssumptionProfile.v1` fills blank cells only and records assumption provenance; explicit input therefore already has precedence.
- PR #446 establishes assessment-only SCREENING authority, central-kernel single/batch parity, and non-authoritative line/case summaries.

**Implementation performed:** created the living report before production changes.

**Validation:** source/contract inspection only; production tests NOT_RUN.

**Stage decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization — IN_PROGRESS

**Current truth:** draft PR #451 exists from branch `agent/aiv-svg-canvas` at initial report commit `2de80ee…`.

**Objective:** rename/synchronize the report to the allocated PR number before production implementation.

**Expected scope/files:** `agents/PR451_workreport.md`, removal of `agents/PR_PENDING_workreport.md`.

**Planned validation:** verify final PR changed-file list contains only the allocated report before Stage 4 production edits.

**Known risks:** none.

### Stage 3 — Changed-file / repository-state verification

Verify base/head and changed-file list; inspect current AIV view/controller/input model/result contracts/tests needed by Stage 4. Record any unexpected pre-existing branch content before implementation.

### Stage 4 — Projection + deterministic layout + live production consumer

Add focused `converters/vibration/aiv/aiv-canvas-projection.js` and presentation layout contract/helper, with immediate consumption from the live AIV qualification workspace. Add tests for canonical/case identity, explicit distance pass-through, deterministic ordering, and presentation-only layout mutation.

### Stage 5 — Dedicated SVG navigation workspace

Add focused view/controller/icon modules with pan, zoom, select, presentation-only drag and accessible labels. No geometry editing mode.

### Stage 6 — Bidirectional table/canvas selection

Synchronize Source, Assessment and relationship selection through canonical/case/row identity; no DOM/tag/nearest-position engineering identity.

### Stage 7 — Relationship authoring/deletion

Create/delete `AivSourceAssessmentCsv.v1` rows through existing input-model mutation boundaries; selected case preserved; physical distance remains blank/assumed until explicit engineering input exists; no cascade delete.

### Stage 8 — Assumption/readiness visualization

Project assumption/readiness metadata to visible badges and exact editable fields. No hidden defaults.

### Stage 9 — Screening overlays + result scopes

Project registered screening results only. Display source PWL, relationship contribution, combined point PWL and Assessment LOF while keeping Line/Case summary explicitly non-authoritative.

### Stage 10 — Multi-source / case / line UX

Simultaneous-source explanation, current/all-case and line filters, deterministic filtered selection behavior.

### Stage 11 — Canvas-aware export / trace

Add optional layout/projection metadata and SVG snapshot without making engineering result interpretation depend on layout.

### Stage 12 — Accessibility / performance / release hardening

Keyboard/focus/non-color status acceptance, 100/300/500 representative fixture, focused `verify:aiv-canvas` command, existing AIV release regressions, changed-file ledger reconciliation.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 2 | Initial living work report; being replaced by allocated path | No | Pending removal |
| `agents/PR451_workreport.md` | 2 | 2 | Allocated living engineering work report | No | GitHub write confirmation |

## Engineering Decisions and Invariants

### INV-001 — Table authority

**Must remain true:** canvas presentation cannot become source of engineering values.

**Enforcement:** projection consumes existing controller records/results; layout schema accepts presentation coordinates only.

**Validation:** Stage 4/5 focused mutation tests.

**PR changes invariant?** No.

### INV-002 — Explicit physical distance

**Must remain true:** Source→Assessment physical distance comes from table/assumption data, never SVG path length.

**Enforcement:** no canvas geometry-to-distance API; tests mutate coordinates without changing projected engineering values or screening outputs.

**Validation:** Stage 4/5.

**PR changes invariant?** No.

### INV-003 — Calculation authority

**Must remain true:** registered `calculateEngineering` / central AIV kernel is numerical authority.

**Enforcement:** canvas UI consumes result contracts only; import/static boundary test forbids numerical helper imports.

**Validation:** Stage 9/12.

**PR changes invariant?** No.

### INV-004 — Result scope

**Must remain true:** assessment LOF is screening result; line/case result is traceability-only and visibly labeled.

**Enforcement:** separate projected result scopes and dedicated labels.

**Validation:** Stage 9 D.2.3 scope regression.

**PR changes invariant?** No.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Work-report initialization | PASS | `2de80ee…` | GitHub commit created before production changes |
| PR allocation | PASS | `2de80ee…` | Draft PR #451 |
| Changed-file verification | NOT_RUN | — | Stage 3 pending |
| Focused AIV canvas tests | NOT_RUN | — | Not implemented |
| Existing AIV screening release | NOT_RUN | — | Must rerun after production changes |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Canvas cannot alter engineering distance/results | NOT_RUN | Planned focused regression |
| Canonical/case identity preserved | NOT_RUN | Planned focused regression |
| UI contains no AIV equations | NOT_RUN | Planned import/static regression |
| Assessment/line result scopes remain separated | NOT_RUN | Planned D.2.3 regression |

### Explicitly Not Validated

- No production canvas code exists yet.
- No browser interaction, accessibility or performance claim is made.
- No export behavior has changed.

## Known / Deferred Work and Recommended Forward Sequence

No implementation item is deferred at this point. Follow Stages 3→12 in order so each abstraction has a real production consumer and each new operator capability is validated before the next authority-sensitive layer is added.

## Stage Execution Log

### Stage 1 — Report initialization + technical findings

**Implementation performed:** inspected issue #449, CodingRules.md, current source/relationship schemas, assumption resolution, PR #446 authority summary and current AIV workspace controller; created `agents/PR_PENDING_workreport.md` before production edits.

**Changed files:** work report only.

**Deviations:** none.

**Validation:** report commit PASS; production checks NOT_RUN.

**New findings:** the existing AIV controller is the correct engineering-state owner; canvas-specific mutable state should be limited to layout/viewport/filter/selection presentation concerns.

**Remaining risks:** RISK-001 through RISK-003.

**Stage decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization

**Implementation performed so far:** created draft PR #451; created allocated report path.

**Changed files:** report paths only.

**Validation:** PR allocation PASS; pending-path removal and changed-file verification remain.

**Stage decision:** PARTIAL until pending report is removed and Stage 3 verifies the branch diff.

## Process Notes / Lessons Learned

- Existing AIV table/controller state already establishes the authority boundary needed by the canvas; a canvas-side engineering store would be speculative and unsafe.
- CodingRules.md's production-consumer requirement means projection/layout modules will be integrated into the live AIV workspace in the same implementation stage rather than landed as unused schema infrastructure.

## Next-Agent Handover

**Current stopping point:** draft PR #451 allocated; report synchronization in progress; no production code changed.

**PR / branch / HEAD:** #451 / `agent/aiv-svg-canvas` / `2de80ee…` before allocated-report commit.

**Last completed stage:** Stage 1.

**Current active stage:** Stage 2.

**Start here:** remove `agents/PR_PENDING_workreport.md`, fetch PR changed filenames, verify only `agents/PR451_workreport.md` remains, update this report, then start Stage 4.

**Do not redo:** architecture/authority review and basic AIV identity/assumption inspection.

**Do not assume:** any canvas capability or validation exists.

**Files currently involved:** report paths only.

**Known failing checks:** none executed.

**Validation still required:** all production validation.

**Open QST-*:** QST-001, QST-002.

**Important deferred IMP-*:** none.

**Highest-risk remaining item:** RISK-001 — parallel canvas engineering authority.

**Exact next recommended action:** finish report rename and branch-state verification.

**Required reading:** issue #449; PR #446; pinned CodingRules.md; `tabs/vibration-aiv-qualification-tab.js`; AIV CSV, assumption and result contracts.
