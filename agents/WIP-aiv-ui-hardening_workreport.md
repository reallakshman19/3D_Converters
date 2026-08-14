# WIP-aiv-ui-hardening — AIV UI Hardening Work Report

## Recovery Header

| Field | Current state |
|---|---|
| Repository | `reallaksh19/3D_Converters` |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL — UI can alter authoritative AIV tables/relationships and controls screening execution |
| Source task | Canonical issue `#453` plus owner-directed AIV UI review/update on 2026-08-14 |
| Working branch | `agent/aiv-ui-hardening` |
| Base | `main@ea50bf2f3f34f07af84d6c99e8433ca74128d5ac` |
| WIP identity | `WIP-aiv-ui-hardening` |
| PR | NOT_ALLOCATED |
| Mutation authority | WRITE_ALLOWED within bounded UI hardening scope; no AIV numerical/engineering authority changes |
| Coordination | SAFE — current open work observed is outside this AIV UI-hardening authority/files; historical AIV branches are merged/closed work |
| Current state | BOOTSTRAP / PLAN |
| Highest risk | UI changes accidentally alter table/result authority, screening inputs, physical-distance semantics, or result publication |
| EXACT_NEXT_ACTION | Allocate draft PR, rename this report to PR identity, then implement P0 workspace/state fixes with exact-source backups/evidence before editing existing files. |

## Handover in 60 Seconds

The owner asked to start updating the AIV UI after a critical review of current `main`. The review found four P0 product risks: the relationship canvas is hidden under Flare network authoring for imported/benchmark cases; full `innerHTML` rerenders lose disclosure/focus/scroll context after edits; the `SCREENING QUALIFIED` hero does not communicate the bounded calculation envelope; and assumption-driven readiness lacks an explicit operator review/acceptance step. P1 items are a canvas+selected-item split layout, single selected-detail rendering, blocker-oriented readiness summary, relationship delete safeguard, and accessibility/responsive cleanup.

Permanent engineering boundaries remain unchanged: tables own engineering data; SVG owns presentation only; physical distance is explicit engineering evidence and never derived from canvas geometry; registered `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` owns numerical execution; Assessment is screening-authoritative; Line/Case is non-authoritative trace; `designAuthority=false`.

No production file has been edited yet in this WIP. Repository policy requires backup before editing existing files. In this connector-only runtime the local `node utils/backup.js save ...` command is not executable; before each edited file, preserve exact pre-edit Git blob SHA/content in this report and keep the branch base as immutable recovery evidence. If a native checkout becomes available, run the repository backup command before any further edit.

## Live Ground Truth — Grounding Epoch 1

- `main` SHA: `ea50bf2f3f34f07af84d6c99e8433ca74128d5ac`.
- Canonical AIV acceptance issue: `#453`, still open; native release-suite/browser acceptance has historically remained NOT_RUN due runner/browser constraints.
- Relevant merged predecessors: #451 dedicated SVG workspace, #454 canvas DoD completion, #456 flare-network authoring, #469 `.eit` import/workbench simplification, #474 CI release-lane wiring.
- No `agents/MASTER_INDEX.md` exists on current main (404 during grounding).
- Historical `agent/aiv-*` branches exist, but no existing `agent/aiv-ui-hardening` PR/workstream existed before this WIP.

## Mission / Scope / Acceptance

### Mission
Make the current AIV screening UI operationally safe and efficient for engineering use without changing AIV equations, calculation authority, result contracts, input semantics, topology authority, or export engineering semantics.

### In scope
1. Lift the general AIV relationship/results canvas out of the Flare-network-only disclosure.
2. Preserve UI working context across table/assumption/readiness/result mutations.
3. Clarify the screening authority/envelope presentation without changing authority flags.
4. Add explicit review/acceptance UX for resolved assumptions before screening execution.
5. Improve desktop canvas/detail arrangement and avoid rendering hidden detail for every record.
6. Add blocker-oriented readiness summary while retaining detailed evidence table.
7. Add relationship deletion safeguard/undo-style behavior.
8. Complete bounded accessibility/responsive cleanup and focused regression coverage.

### Explicitly out of scope / hard stops
- No equations/correlations/thresholds/coefficient/master changes.
- No changes to `converters/vibration/aiv/aiv-calculator.js` numerical mechanics unless separately authorized.
- No change to `screeningResultScope=ASSESSMENT` or Line/Case non-authoritative semantics.
- No pixel/SVG-derived physical distance or topology engineering authority.
- No workflow edits without separate owner authorization.
- No merge without explicit owner authorization.

## Active Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | UX/architecture defect | P0 | OPEN | General AIV relationship canvas is nested under `Flare network authoring` and collapses for `.eit`/benchmark paths. |
| ISS-002 | UX/state defect | P0 | OPEN | Full rerender after edits loses disclosure/focus/scroll working context. |
| ISS-003 | Authority communication risk | P0 | OPEN | Hero/banner does not sufficiently state bounded screening envelope to operator. |
| ISS-004 | Execution-intent risk | P0 | OPEN | Resolved assumptions can make readiness pass without explicit operator acceptance of the exact assumption set. |
| IMP-001 | UX improvement | P1 | PLANNED | Canvas + selected-item desktop split. |
| IMP-002 | Performance | P1 | PLANNED | Render one selected detail rather than one hidden panel per node/relationship. |
| IMP-003 | Operability | P1 | PLANNED | Blocker-oriented readiness summary/actions. |
| IMP-004 | Data safety | P1 | PLANNED | Relationship deletion safeguard/undo. |
| IMP-005 | Accessibility | P2 | PLANNED | Complete tabs/keyboard/responsive canvas semantics. |
| RISK-001 | Engineering authority | P0 | ACTIVE | UI change must not mutate numerical/result/distance authority. |
| RISK-002 | Regression | P0 | ACTIVE | `.eit`, benchmark, flare-network and CSV/XLSX paths must remain equivalent at authoritative table/kernel boundary. |
| DEC-001 | Scope | P0 | ACCEPTED | Start with UI/controller/state changes only; Stage-8/FLM1 engineering generalization remains a separately scoped authority review. |

## Current Diagnosis / Falsifiers

### H1 — Canvas discoverability failure
Current `renderAivInputWorkspaceHtml` nests `renderAivCanvasWorkspaceHtml` in the Flare-network disclosure and opens it only when flare-network state is active/has nodes. Falsifier: imported `.eit` or loaded benchmark automatically opens/renders the canvas as a first-class panel without flare-network state. Current source does not.

### H2 — Working-context loss
Current root controller rerenders using `container.innerHTML = ...` after table and assumption mutations; disclosure state is DOM-local rather than application state. Falsifier: a change event preserves exact disclosure open state, selected item/detail tab, and focus/scroll. Current source has no state fields for those concerns.

### H3 — Assumption execution-intent gap
Readiness resolves missing values from `AivAssumptionProfile.v1` and screening enablement checks only readiness counts. Falsifier: screening requires an acceptance token/hash tied to the current resolved assumption set whenever assumptions are present. Current state has no such token.

## Authority / Invariants

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = visual navigation / relationship editing / result explanation`.
3. Physical AIV distance only from relationship evidence/visible assumptions; never SVG geometry.
4. Numerical execution only through registered Engineering Calculation API/central AIV kernel.
5. Assessment result is qualified screening scope.
6. Line/Case summary is permanently non-authoritative for screening.
7. Imported `.eit` AIV values are evidence until rerun.
8. `designAuthority=false`.
9. Any assumption acceptance mechanism is execution-intent/provenance UX only and must not silently upgrade engineering authority.

## Planned Changed-File Boundary

Expected existing files, subject to narrowing after implementation design:
- `tabs/vibration-aiv-state.js`
- `tabs/vibration-aiv-qualification-tab.js`
- `tabs/vibration-aiv-qualification-view.js`
- `tabs/vibration-aiv-input-view.js`
- `tabs/vibration-aiv-canvas-view.js`
- `tabs/vibration-aiv-canvas-controller.js`
- `tabs/vibration-aiv-readiness-view.js`
- `tabs/vibration-aiv-workbench.css`
- focused `tests/vibration-aiv-*.test.mjs`

Prefer new small UI-state/helper modules rather than expanding existing modules beyond repository limits.

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Current main source review | PASS | SOURCE_INSPECTION | NONE | Exact current AIV UI/controller/view files inspected. |
| Existing numerical authority unchanged | PASS baseline | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE (repo contracts) | No WIP production edits yet. |
| Native `verify:aiv-canvas-release` | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | No native checkout/runner in this runtime. |
| Real-browser acceptance | NOT_RUN | NOT_OBSERVED | NONE | Still required for final closure. |

## Changed-File Ledger

| File | Change | Status |
|---|---|---|
| `agents/WIP-aiv-ui-hardening_workreport.md` | New recovery-first work report | ADDED |

No production/UI file edited yet.

## Appendix A — Implementation Authorization / Takeover Questionnaire

Threshold for any incoming agent taking over production implementation: total >=92/100 and each >=17/20. Answers must be derived from live branch/PR source, not generic AIV/UI knowledge.

### A1 — Production Trace (20)
Trace `.eit` import and D.2.3 benchmark loading separately from user action through state mutation to authoritative tables, canvas projection, readiness, registered screening execution, and result rendering. Identify exactly where the current canvas visibility becomes coupled to flare-network state and name the minimum file boundary that can decouple presentation without changing input authority.

### A2 — Current Failure Isolation (20)
Using the current branch source, prove or disprove that editing one working-table cell or assumption can collapse its parent disclosure and lose focus/scroll. State the exact rerender path, which UI state is currently persisted versus DOM-local, and one focused regression that would falsify your diagnosis.

### A3 — Authority / Invariant (20)
For the proposed assumption-review gate, identify which data are engineering inputs, which object owns resolved assumptions, what event invalidates prior acceptance, and how you will prove that the new UX cannot change physical distance authority, calculation equations, Assessment-vs-Line result authority, or `designAuthority=false`.

### A4 — Independent Validation (20)
Design a validation matrix covering `.eit`, benchmark, flare-network and CSV/XLSX paths. Include at least one DOM/state test, one source/result authority negative-assurance test, and the exact browser behaviors still requiring real-browser execution. Do not use UI output as an oracle for AIV numerical correctness.

### A5 — Next-Commit / Minimal Patch (20)
From the live diff, propose the smallest next commit that fixes the highest-risk remaining defect. List exact files, state transition(s), expected behavior before/after, regression test, and rollback/falsifier. Reject broad refactors and any numerical-kernel edit not required by the reproduced UI defect.

## Exact Continuation State

`EXACT_NEXT_ACTION = Create draft PR from agent/aiv-ui-hardening -> main; replace WIP report with PR-numbered work report; then implement ISS-001/ISS-002 first using new/pure UI-state helpers and focused source regressions, keeping AIV kernel/result contracts untouched.`
