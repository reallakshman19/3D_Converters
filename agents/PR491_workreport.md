# PR491 — AIV UI Hardening Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Harden the AIV screening workspace UX and execution safeguards without changing numerical or engineering authority. |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL — UI edits authoritative AIV tables/relationships and controls screening execution |
| Source task | Canonical issue `#453` + Owner-directed AIV UI review/update on 2026-08-14 |
| PR | `#491` DRAFT / OPEN |
| Branch | `agent/aiv-ui-hardening` |
| Base | `main@ea50bf2f3f34f07af84d6c99e8433ca74128d5ac` |
| Initial report commit | `5466ac3907b991f9250c329ad36c4518cd25341f` |
| Mutation authority | WRITE_ALLOWED within bounded UI hardening scope; no AIV numerical/engineering authority changes |
| Coordination | SAFE — no active open PR observed owning the same AIV UI/controller hardening files/authority; historical AIV branches are predecessor work |
| Current stage | PLAN → IMPLEMENT P0 |
| Highest risk | UI changes accidentally alter table/result authority, screening inputs, physical-distance semantics, or result publication |
| EXACT_NEXT_ACTION | Implement ISS-001/ISS-002: first-class canvas placement plus persistent UI working context, with focused regressions and negative assurance. |

## Handover in 60 Seconds

The owner asked to start updating the AIV UI after a critical review of current `main`. Four P0 product risks are in scope: the relationship canvas is hidden under Flare network authoring for imported/benchmark cases; full `innerHTML` rerenders lose disclosure/focus/scroll context after edits; the `SCREENING QUALIFIED` hero does not communicate the bounded calculation envelope; and assumption-driven readiness lacks explicit operator review/acceptance of the exact resolved assumption set. P1 items are a canvas+selected-item split layout, single selected-detail rendering, blocker-oriented readiness summary, relationship-delete safeguard, and accessibility/responsive cleanup.

Permanent boundaries: tables own engineering data; SVG owns presentation only; physical distance is explicit evidence and never derived from SVG; registered `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` owns numerical execution; Assessment is screening-authoritative; Line/Case is non-authoritative trace; imported `.eit` results are evidence until rerun; `designAuthority=false`.

No AIV production file had been edited at PR allocation. Repository policy requires local `node utils/backup.js save ...` before editing existing files. This connector-only runtime cannot execute that local command. Compensating recovery control for connector mutations: fetch and record every edited file's exact pre-edit blob SHA/content before mutation; Git branch/base history remains immutable rollback evidence. If a native checkout becomes available, run the repository backup command before any further edit.

## Grounding Epoch 1

- Live `main`: `ea50bf2f3f34f07af84d6c99e8433ca74128d5ac`.
- PR #491 created from that exact base; initial head `5466ac3907b991f9250c329ad36c4518cd25341f`.
- Canonical issue #453 remains the AIV acceptance/DoD tracking issue.
- Relevant predecessors: #451 SVG relationship workspace, #454 DoD completion, #456 flare-network authoring, #469 `.eit` import/workbench simplification, #474 release-lane wiring.
- `agents/MASTER_INDEX.md` is absent on current main (404).
- Existing `agent/aiv-*` branches are historical predecessor branches; no pre-existing PR491/ui-hardening workstream existed.

## Mission / Scope / Acceptance

### In scope
1. Lift the general AIV relationship/results canvas out of the Flare-network-only disclosure.
2. Preserve UI working context across table/assumption/readiness/result mutations.
3. Clarify screening authority/envelope presentation without changing authority flags.
4. Add explicit review/acceptance UX for the resolved assumption set before screening when assumptions are used.
5. Improve desktop canvas/detail arrangement and avoid hidden detail for every record.
6. Add blocker-oriented readiness summary while retaining detailed evidence.
7. Add relationship deletion safeguard/undo behavior.
8. Bounded accessibility/responsive cleanup and focused regression coverage.

### Hard stops / out of scope
- No equations, correlations, coefficients, thresholds, master values, or unit semantics changes.
- No numerical changes in `aiv-calculator.js` without separately explicit owner authorization.
- No change to `screeningResultScope=ASSESSMENT` or Line/Case non-authoritative semantics.
- No SVG/pixel-derived physical distance or topology engineering authority.
- No workflow changes without separate owner authorization.
- No merge without explicit owner authorization.

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | UX/architecture defect | P0 | ACTIVE | General relationship/results canvas nested under `Flare network authoring`, collapsed for `.eit`/benchmark paths. |
| ISS-002 | UX/state defect | P0 | ACTIVE | Full rerender after edits loses disclosure/focus/scroll working context. |
| ISS-003 | Authority communication risk | P0 | OPEN | Hero/banner insufficiently states bounded screening envelope. |
| ISS-004 | Execution-intent risk | P0 | OPEN | Assumption-resolved readiness can permit screening without explicit operator acceptance of exact assumption set. |
| IMP-001 | UX improvement | P1 | PLANNED | Canvas + selected-item desktop split. |
| IMP-002 | Performance | P1 | PLANNED | Render one selected detail rather than hidden panel per record. |
| IMP-003 | Operability | P1 | PLANNED | Blocker-oriented readiness summary/actions. |
| IMP-004 | Data safety | P1 | PLANNED | Relationship deletion safeguard/undo. |
| IMP-005 | Accessibility | P2 | PLANNED | Complete tabs/keyboard/responsive canvas semantics. |
| RISK-001 | Engineering authority | P0 | ACTIVE | UI change must not mutate numerical/result/distance authority. |
| RISK-002 | Regression | P0 | ACTIVE | `.eit`, benchmark, flare-network and CSV/XLSX paths must remain equivalent at authoritative table/kernel boundary. |
| DEC-001 | Scope | P0 | ACCEPTED | Stage-8/FLM1 generalization remains a separately scoped engineering-authority review; PR491 changes presentation/interaction only. |

## Current Diagnosis / Falsifiers

### H1 — Canvas discoverability failure
`renderAivInputWorkspaceHtml` nests `renderAivCanvasWorkspaceHtml` in the Flare-network disclosure and opens it only for flare-network state. Falsifier: `.eit` or benchmark data render the relationship/results canvas as a first-class workspace without flare-network activation.

### H2 — Working-context loss
`renderAivQualificationWorkspace` replaces `container.innerHTML` after table/assumption mutations; disclosure/focus/scroll state is DOM-local. Falsifier: edit one working-table cell/assumption and prove parent disclosure, selected record/detail tab, focus and scroll remain stable.

### H3 — Assumption execution-intent gap
Readiness resolves missing values from `AivAssumptionProfile.v1`; screening enablement currently depends on readiness counts only. Falsifier: screening requires an acceptance record tied to the current resolved assumption fingerprint whenever assumptions are present, and any relevant mutation invalidates acceptance.

## Authority / Negative Assurance

Must remain invariant:
1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = visual navigation / relationship editing / result explanation`.
3. Physical AIV distance only from relationship evidence/visible assumptions; never SVG geometry.
4. Numerical execution only through registered Engineering Calculation API/central AIV kernel.
5. Assessment result is qualified screening scope.
6. Line/Case summary is non-authoritative for screening.
7. Imported `.eit` AIV results remain evidence until rerun.
8. `designAuthority=false`.
9. New assumption acceptance is execution-intent/provenance only; it must not promote authority.

## Planned Changed-File Boundary

Likely existing files, to be narrowed stage by stage:
- `tabs/vibration-aiv-state.js`
- `tabs/vibration-aiv-qualification-tab.js`
- `tabs/vibration-aiv-qualification-view.js`
- `tabs/vibration-aiv-input-view.js`
- `tabs/vibration-aiv-canvas-view.js`
- `tabs/vibration-aiv-canvas-controller.js`
- `tabs/vibration-aiv-readiness-view.js`
- `tabs/vibration-aiv-workbench.css`
- focused `tests/vibration-aiv-*.test.mjs`

Prefer new small pure helper/state modules rather than expanding existing modules beyond repository limits.

## Pre-edit Backup / Blob Ledger

Repository local backup CLI is NOT_RUN in connector-only runtime. Before each existing-file mutation record exact blob SHA below. Git commit history + recorded blob is the rollback source.

| File | Pre-edit blob | Local backup CLI |
|---|---|---|
| TBD per stage | — | NOT_RUN / connector runtime |

## Validation Ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Current main source review | PASS | SOURCE_INSPECTION | NONE | Exact current AIV UI/controller/view files inspected. |
| Existing numerical authority baseline | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE (repo contracts) | No PR491 production edits at allocation. |
| Native `verify:aiv-canvas-release` | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | No native checkout/runner in this runtime. |
| Real-browser acceptance | NOT_RUN | NOT_OBSERVED | NONE | Required before closure. |

## Changed-File Ledger

| File | Change | Status |
|---|---|---|
| `agents/PR491_workreport.md` | Recovery-first PR report | ADDED |
| `agents/WIP-aiv-ui-hardening_workreport.md` | Bootstrap report | TO_BE_RETIRED after PR report checkpoint |

## Appendix A — Implementation Authorization / Takeover Questionnaire

Incoming takeover threshold: total >=92/100 and each >=17/20. Answers must be derived from live PR491 source/diff/evidence.

### A1 — Production Trace (20)
Trace `.eit` import and D.2.3 benchmark loading separately from user action through state mutation to authoritative tables, canvas projection, readiness, registered screening execution, and result rendering. Identify exactly where canvas visibility is coupled to flare-network state and name the minimum file boundary that can decouple presentation without changing input authority.

### A2 — Current Failure Isolation (20)
Using live PR491 source, prove/disprove that editing one working-table cell or assumption can collapse its parent disclosure and lose focus/scroll. State the exact rerender path, persisted versus DOM-local UI state, and one regression that falsifies the diagnosis.

### A3 — Authority / Invariant (20)
For the assumption-review gate, identify engineering inputs, the resolved-assumption authority object, invalidation events, and how to prove the UX cannot change physical-distance authority, equations, Assessment-vs-Line authority, or `designAuthority=false`.

### A4 — Independent Validation (20)
Design a matrix covering `.eit`, benchmark, flare-network and CSV/XLSX paths. Include a DOM/state test, a source/result authority negative-assurance test, and exact real-browser behaviors still requiring execution. UI output is not an oracle for AIV numerical correctness.

### A5 — Next-Commit / Minimal Patch (20)
From live PR491 diff, propose the smallest next commit fixing the highest-risk remaining defect. List exact files, state transitions, expected behavior, regression test, rollback/falsifier; reject broad refactors and numerical-kernel edits unrelated to the reproduced UI defect.

## Exact Continuation State

`EXACT_NEXT_ACTION = Fetch exact branch blobs for input/view/controller/state/tests; record pre-edit blobs; implement first-class relationship canvas plus persistent UI state in a minimal stage; update this report; validate source/diff/regressions where executable.`
