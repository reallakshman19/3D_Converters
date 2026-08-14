# PR491 — AIV UI Hardening Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Harden the AIV screening workspace UX and execution safeguards without changing numerical or engineering authority. |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL — the UI edits authoritative AIV table/relationship records and controls screening execution. |
| Source task | Canonical issue `#453` + Owner-directed critical AIV UI review/update on 2026-08-14. |
| PR | `#491` — DRAFT / OPEN / MERGEABLE |
| Branch | `agent/aiv-ui-hardening` |
| Grounded base | `main@ea50bf2f3f34f07af84d6c99e8433ca74128d5ac` |
| Final implementation head | `6b86ac1c4c2192ae7ebef4017dddf1cfc849c141` |
| Base drift at implementation head | `behind_by=0`; 38 commits ahead of grounded base. |
| Diff boundary | 25 files: AIV UI/controller/state/CSS/tests + this PR report only. No numerical-kernel/result-contract/topology-authority/export/dependency/workflow changes. |
| Engineering status | Source implementation complete for the reviewed P0/P1/P2 UI-hardening scope. |
| Validation status | Source/diff/authority-boundary inspection PASS. Native `verify:aiv-canvas-release` NOT_RUN. Real-browser acceptance NOT_RUN. |
| Hosted CI | Run `31810004558`, job `94798083284`: `conclusion=failure` with `steps=null`; classify `NOT_RUN / INFRASTRUCTURE_BLOCKED`, not executed test failure. |
| Merge authority | NOT AUTHORIZED. Keep draft until native release suite + real-browser acceptance pass and Owner explicitly authorizes merge. |
| EXACT_NEXT_ACTION | On a native checkout of this exact candidate: run `npm run verify:aiv-canvas-release`; then execute #453 real-browser interaction/accessibility/download/performance acceptance. Fix only reproduced defects. |

## Handover in 60 Seconds

PR491 implements the critical AIV UI review without changing the AIV numerical kernel or engineering authority. The general Source→Assessment relationship/results canvas is now first-class for `.eit`, D.2.3 benchmark, flare-network and tabular paths instead of being hidden under Flare network authoring. Full-workspace rerenders now preserve keyed disclosures, table scroll position, selected-detail tab and active table/assumption edit focus.

When readiness resolves missing engineering values through `AivAssumptionProfile.v1`, screening is now fail-closed until the operator reviews and accepts the **exact current resolved assumption set**. The acceptance record uses exact canonical assumption content for equality; a compact fingerprint is presentation only. Any table/profile/topology mutation clears readiness and acceptance. This is an execution-intent safeguard only; it does not upgrade engineering authority.

The canvas is now a desktop SVG + single selected-item detail split instead of materializing one hidden detail panel per record. Detail tabs have ARIA control/label linkage plus Left/Right/Home/End keyboard navigation. Readiness surfaces blocking relationships before the full 13-column evidence table. Relationship deletion requires an identity-specific confirmation from both canvas and table paths. Canvas styles were moved out of renderer-local `<style>` injection into the shared AIV stylesheet and the hard 720 px canvas minimum was removed.

Permanent boundaries remain unchanged: tables own engineering values; SVG owns presentation/relationship navigation; physical distance never comes from SVG geometry; registered `calculateEngineering('VIB.AIV.ACOUSTIC', ...)` remains the only screening execution bridge; Assessment is the screening-authoritative result scope; Line/Case is trace only; imported `.eit` results remain evidence until rerun; `designAuthority=false`.

The remaining gate is **execution evidence**, not further source redesign. This environment cannot obtain a native checkout/browser, and the final implementation-head GitHub Actions job again received zero steps. Do not call the release suite PASS; it is NOT_RUN.

## Grounding / Coordination Epochs

### Epoch 1 — bootstrap
- Live `main`: `ea50bf2f3f34f07af84d6c99e8433ca74128d5ac`.
- Canonical acceptance issue: `#453`.
- Relevant predecessors re-read: #451, #454, #456, #469, #474.
- `agents/MASTER_INDEX.md` absent on current main.
- No pre-existing PR owning this AIV UI-hardening authority/file boundary was found.
- Branch allocated from exact main: `agent/aiv-ui-hardening`; draft PR #491 created before production edits.

### Epoch 2 — final implementation grounding
- Branch comparison against grounded base: `ahead_by=38`, `behind_by=0`.
- Exact implementation head: `6b86ac1c4c2192ae7ebef4017dddf1cfc849c141`.
- Exact implementation-head hosted run: `31810004558`; job `94798083284`; zero/null steps.
- Net changed-file set contains only AIV presentation/controller/state/CSS/tests plus this report.

## Engineering Item Register

| ID | Type | Priority | Status | Closure / current evidence |
|---|---|---:|---|---|
| ISS-001 | UX architecture | P0 | IMPLEMENTED | General relationship/results canvas is first-class and no longer nested under Flare authoring. Benchmark regression asserts canvas precedes optional Flare disclosure. |
| ISS-002 | UX state | P0 | IMPLEMENTED | `captureAivUiContext` / `restoreAivUiContext` preserve disclosure, scroll, detail-tab and edit-focus state around root rerender. |
| ISS-003 | Authority communication | P0 | IMPLEMENTED | Hero/banner now state Assessment-only authority, bounded release envelope, Line/Case trace-only and no design approval. |
| ISS-004 | Execution-intent safety | P0 | IMPLEMENTED | Current resolved assumption set must be explicitly accepted before screening; mutations invalidate acceptance through readiness clearing. |
| IMP-001 | Workspace UX | P1 | IMPLEMENTED | Desktop canvas + selected-item split; stacks responsively below 980 px. |
| IMP-002 | DOM/performance | P1 | IMPLEMENTED | One selected detail rendered on demand rather than hidden detail DOM for every Source/Assessment/Relationship. |
| IMP-003 | Operability | P1 | IMPLEMENTED | Readiness clear/blocker summary precedes detailed evidence table. |
| IMP-004 | Data safety | P1 | IMPLEMENTED | Identity-specific, fail-closed relationship delete confirmation for canvas and authoritative table delete paths. |
| IMP-005 | Accessibility/responsive | P2 | IMPLEMENTED | ARIA tab linkage, roving tabindex, Arrow/Home/End navigation, responsive canvas width, shared CSS. |
| RISK-001 | Authority regression | P0 | SOURCE-MITIGATED / RUNTIME-PENDING | No numerical kernel/result contract/topology authority/export file changed; module-boundary tests extended but NOT_RUN natively. |
| RISK-002 | Cross-path regression | P0 | TESTS-ADDED / RUNTIME-PENDING | Existing release commands include updated benchmark/canvas/EIT/module-boundary tests; execution still NOT_RUN. |
| DEC-001 | Engineering scope | P0 | ACCEPTED | Stage-8/FLM1/general screening-method authority remains separate. PR491 does not change calculator mechanics. |

## Implemented Design

### 1. First-class AIV relationship/results canvas
Old behavior:

```text
AIV input
  -> Flare network authoring disclosure
       -> Flare authoring
       -> AIV relationship canvas
```

New behavior:

```text
Import / benchmark / flare / tabular input
  -> AIV relationship + results canvas (first-class when AIV/topology data exist)
  -> optional Flare network authoring disclosure
  -> assumptions / benchmark disclosure
  -> working engineering tables disclosure
```

The canvas remains a projection/interaction surface only. It does not own engineering quantities.

### 2. Rerender context preservation
New `tabs/vibration-aiv-ui-context.js` captures/restores:
- keyed disclosure `open` state;
- keyed table horizontal/vertical scroll;
- selected item's active detail tab;
- roving tab semantics;
- active authoritative table-cell or assumption-field focus using `preventScroll` where supported.

Working tables expose `data-aiv-scroll-key`; major disclosures expose stable `data-aiv-disclosure-key` values.

### 3. Explicit resolved-assumption acceptance
New `tabs/vibration-aiv-assumption-acceptance.js` creates `AivAssumptionAcceptance.v1` from canonical sorted resolved assumptions. `acceptance.key` is the exact canonical set used for equality; `fingerprint=fnv1a32:*` is display/trace convenience only.

Screening readiness now requires:

```text
readiness.notReady == 0
AND readiness.methodGap == 0
AND assumption acceptance is current (when assumptionCount > 0)
```

`clearReadiness()` also clears acceptance. Therefore changes to working tables, assumption profile, topology/import state, network generation or other readiness-invalidating state cannot silently reuse previous acceptance.

### 4. Single selected-detail renderer
`renderAivCanvasSelectedDetailHtml(state, selectionKey)` renders only the currently selected Source, Assessment or Relationship detail. Selection is published from the canvas controller to workspace state and the one detail host is hydrated directly.

Result ownership is unchanged: the detail renderer consumes the existing projection/result contracts; it does not recompute PWL, attenuation, combination or LOF.

### 5. Readiness action hierarchy
The readiness panel now distinguishes:
- relationship counts/status summary;
- actionable relationship blockers;
- assumption-review/acceptance gate;
- full Engineering details table under a disclosure.

### 6. Relationship deletion safeguard
Both canvas delete and relationship-table delete require confirmation containing Source → Assessment · Case. Incomplete relationship rows remain deletable after confirmation using explicit `unknown ...` placeholders. Deletion still removes only the relationship row.

### 7. Accessibility / stylesheet cleanup
- tab buttons now have `aria-controls`; panels have `aria-labelledby`;
- selected detail implements roving tabindex and Left/Right/Home/End keyboard navigation;
- canvas/detail uses a responsive two-column → one-column layout;
- canvas renderer no longer emits a local `<style>` block;
- canvas SVG no longer forces `min-width:720px`;
- AIV top stylesheet cache token advanced to `aiv-qualification-12`, nested workbench stylesheet to `v=2`.

## Permanent Authority / Negative Assurance

The following remain hard invariants and were not modified by PR491:

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = presentation / relationship editing / result explanation`.
3. Physical AIV distance comes from explicit relationship evidence or visible assumption resolution; never SVG connector/path length.
4. Numerical execution remains `calculateEngineering({ calculationId: 'VIB.AIV.ACOUSTIC', ... })` in `tabs/vibration-aiv-execution.js`.
5. Assessment-level LOF remains the qualified SCREENING result scope.
6. Configured Line/Case summary remains non-authoritative for screening.
7. Imported legacy `.eit` AIV values remain evidence only until current screening rerun.
8. `designAuthority=false`.
9. Assumption acceptance is not engineering-authority promotion.
10. PR491 does not touch `converters/vibration/aiv/aiv-calculator.js`, numerical master data, result contracts, engineering exports, package/dependency semantics, or workflows.

## Pre-edit Backup / Blob Ledger

Repository policy calls for `node utils/backup.js save ...` on a native checkout. This runtime is connector-only and direct Git/DNS access is unavailable, so that command is **NOT_RUN**. Each existing file was fetched before mutation; the exact pre-edit Git blob is the recovery source, and the grounded base commit remains immutable rollback evidence.

| Existing file | Pre-edit blob |
|---|---|
| `tabs/vibration-aiv-input-view.js` | `2970df206ee8c3f7e1bff357ee89c2e14d5b3ab9` |
| `tabs/vibration-aiv-assumption-view.js` | `649e056bc2e23e4609598ed23a0c789d9f9146f3` |
| `tabs/vibration-aiv-qualification-tab.js` | `b6fc3d87d5b6946276f791e117823eb63fee1507` |
| `tabs/vibration-aiv-execution.js` | `d4fd173038084809a7cf5586a278628371d6f149` |
| `tabs/vibration-aiv-readiness-view.js` | `b38bd02ea59f4de3c60d2de663ff98107d4b4967` |
| `tabs/vibration-aiv-qualification-view.js` | `1e52a9dc0d6d5bff2648115cff5d3fd6ec326f74` |
| `tabs/vibration-aiv-state.js` | `bfecaa315e97c41df6fd9e00caee70c31e474e37` |
| `tabs/vibration-aiv-canvas-view.js` | `ddbc82f0d35bded85f92300890da5bdbda2caf5f` |
| `tabs/vibration-aiv-canvas-controller.js` | `9dd5a98c2107322d57341b0ac86a2a9d61da151c` |
| `tabs/vibration-aiv-canvas-detail.js` | `bef7d524d9a9c0f5c6fe1583df9f919a6e04599d` |
| `tabs/vibration-aiv-workbench.css` | `78b733688a50409ff3ba34b63949b4d04a022818` |
| `tabs/vibration-aiv-qualification.css` | `adbcd34fe3f204afa1e00fee3beecdbe4b053681` |
| `tests/vibration-aiv-workbench-ui.test.mjs` | `cdc50e9bdfc527e440d602f11b6c88d7e4a0b542` |
| `tests/vibration-aiv-canvas-dod.test.mjs` | `8ecd37bcd81662ca2f75660cfcdbd34100794ccd` |
| `tests/vibration-aiv-canvas-assumptions.test.mjs` | `fdfb416af3f28ba12bb61719ce3fa8dc8b1c3806` |
| `tests/vibration-aiv-canvas-interaction.test.mjs` | `e37b7b9ef6668e0fe4cb4ca79cd16efee68f6e25` |
| `tests/vibration-aiv-canvas-relationship-edit.test.mjs` | `690314a14f4468f3b45107296d26bea024bff867` |
| `tests/vibration-aiv-canvas-view.test.mjs` | `305f0ea2435dd52c106ceaf856055f5af524db82` |
| `tests/vibration-module-boundaries.test.mjs` | `47c86d056196b5369b2529c3ca21475d2b690971` |

New files require no pre-edit backup:
- `tabs/vibration-aiv-assumption-acceptance.js`
- `tabs/vibration-aiv-assumption-acceptance-controller.js`
- `tabs/vibration-aiv-delete-safeguard.js`
- `tabs/vibration-aiv-ui-context.js`
- `tabs/vibration-aiv-workspace-browser.js`
- this report.

## Final Changed-File Ledger

### Production presentation/controller/state
- `tabs/vibration-aiv-assumption-acceptance.js` — exact resolved-set acceptance identity.
- `tabs/vibration-aiv-assumption-acceptance-controller.js` — review/accept actions.
- `tabs/vibration-aiv-assumption-view.js` — persistent disclosure identities.
- `tabs/vibration-aiv-canvas-controller.js` — selection publication + keyboard detail navigation.
- `tabs/vibration-aiv-canvas-detail.js` — complete ARIA/keyboard tab behavior.
- `tabs/vibration-aiv-canvas-view.js` — first-class responsive canvas + one selected detail; no local style injection.
- `tabs/vibration-aiv-delete-safeguard.js` — confirmed relationship deletion.
- `tabs/vibration-aiv-execution.js` — run gate requires current acceptance; registered engineering execution unchanged.
- `tabs/vibration-aiv-input-view.js` — first-class canvas + persistent disclosure/table-scroll keys.
- `tabs/vibration-aiv-qualification-tab.js` — UI context lifecycle, selection detail, acceptance/delete wiring.
- `tabs/vibration-aiv-qualification-view.js` — bounded authority messaging.
- `tabs/vibration-aiv-qualification.css` — cache version only.
- `tabs/vibration-aiv-readiness-view.js` — blocker summary + assumption acceptance UX.
- `tabs/vibration-aiv-state.js` — acceptance/selected-canvas presentation state.
- `tabs/vibration-aiv-ui-context.js` — rerender UI-state preservation.
- `tabs/vibration-aiv-workbench.css` — shared canvas/workbench presentation CSS.
- `tabs/vibration-aiv-workspace-browser.js` — browser-only stylesheet/download helpers.

### Regression / boundary tests
- `tests/vibration-aiv-canvas-assumptions.test.mjs`
- `tests/vibration-aiv-canvas-dod.test.mjs`
- `tests/vibration-aiv-canvas-interaction.test.mjs`
- `tests/vibration-aiv-canvas-relationship-edit.test.mjs`
- `tests/vibration-aiv-canvas-view.test.mjs`
- `tests/vibration-aiv-workbench-ui.test.mjs`
- `tests/vibration-module-boundaries.test.mjs`

### Governance
- `agents/PR491_workreport.md`

## Test / Release Seam

No package script change was necessary. Existing commands already include every changed regression area:

```text
verify:aiv-input-model
  -> vibration-module-boundaries.test.mjs

verify:aiv-canvas
  -> canvas view / interaction / selection / relationship / assumptions / DoD ...

verify:aiv-eit-export
  -> vibration-aiv-workbench-ui.test.mjs

verify:aiv-canvas-release
  -> input-model + canvas + flare-network + EIT export
```

Added/updated source regressions cover:
- benchmark canvas visible independently of Flare authoring;
- disclosure/scroll/detail-tab/edit-focus restoration;
- exact assumption acceptance and invalidation on resolved-set change;
- screening button disabled until assumption acceptance;
- single selected-detail host and on-demand Source/Assessment/Relationship detail;
- ARIA linkage and keyboard tab movement;
- identity-specific fail-closed relationship deletion;
- responsive canvas source guard / removal of 720 px minimum;
- module-size and no-engineering-equation boundary extension to new hardening modules.

## Validation and Evidence Ledger

### Software validation

| Validation | Status | Evidence / classification |
|---|---|---|
| Exact base→branch compare | PASS | `ahead_by=38`, `behind_by=0`; 25 changed files confined to AIV UI/controller/state/CSS/tests + report. |
| High-risk module size source inspection | PASS | qualification tab/controller/view/readiness/input files inspected below 300 physical-line boundary; new helpers are small and are added to the module-size regression list. |
| No numerical/kernel/result-contract/export/workflow diff | PASS | exact changed-file compare. |
| Existing release command coverage | PASS (configuration inspection) | `package.json` already composes updated tests into `verify:aiv-canvas-release`; package itself unchanged. |
| Native `npm run verify:aiv-canvas-release` | **NOT_RUN** | No native repository checkout in this runtime. |
| Final implementation-head hosted AIV workflow | **NOT_RUN / INFRASTRUCTURE_BLOCKED** | Run `31810004558`, job `94798083284`, `steps=null`; no checkout/test step executed. |
| Real-browser AIV acceptance | **NOT_RUN** | No browser harness/native running application available here. |
| 100/300/500 real rendered-object browser performance | **NOT_RUN** | Source test remains in release suite, but native/browser execution unavailable. |

### Engineering validation

| Property | Status | Evidence |
|---|---|---|
| Engineering source of truth remains tables | PASS by source/diff inspection | No new alternate engineering-data store; canvas selection/detail is presentation state. |
| Physical distance remains non-SVG | PASS by source/diff inspection | No pixel/path-derived distance implementation added; existing relation/table authority retained. |
| Registered Engineering Calculation API remains numerical execution bridge | PASS by source inspection | `vibration-aiv-execution.js` still owns the only `calculateEngineering` call; acceptance is a pre-execution UI gate. |
| Assessment vs Line/Case authority unchanged | PASS by source/diff inspection | UI text strengthened; result contracts/calculator not changed. |
| `designAuthority=false` unchanged | PASS by source/diff inspection | No authority transition code changed. |
| Assumption acceptance cannot self-promote authority | PASS by source inspection | acceptance record contains set identity/count only and is used solely as run enablement. |
| Native numerical/result behavior | NOT_RUN | Requires actual release suite. |

### Explicitly NOT validated
- actual Node execution of the focused/combined test files;
- browser pointer pan/drag/wheel zoom/focus lifecycle on the candidate;
- real canvas↔table DOM synchronization through user interaction after the new single-detail seam;
- actual file-download acceptance;
- actual 100/300/500 browser rendering performance.

No PASS claim is made for these.

## Known / Deferred Work

1. **Native release execution:** run `npm run verify:aiv-canvas-release` on a complete checkout of the same candidate.
2. **Real-browser #453 acceptance:** pointer pan, wheel zoom, node drag, keyboard/focus, table↔canvas selection, relationship create/delete confirmation, filters, selected detail/tabs, assumption review/focus, screening gating, JSON/SVG/EIT downloads.
3. **Performance:** execute real browser fixtures at 100 / 300 / 500 relationships; source-level projection/layout performance tests alone do not close the browser gate.
4. **Separate engineering-authority question:** Stage-8/FLM1/general applicability remains outside PR491; do not combine that engineering-method program with this UI PR.
5. Optional PNG screenshot export remains unrelated/non-blocking unless separately requested.

## Recovery / Rollback

If a regression is found, do not patch the AIV calculator to make UI tests pass. Isolate the failing seam first:

```text
first-class canvas placement -> input-view only
rerender preservation        -> ui-context + qualification-tab
assumption run gate          -> acceptance helper/readiness/execution bridge
single selected detail       -> canvas-view/controller/detail + state
relationship deletion        -> delete-safeguard + qualification-tab
responsive styling           -> workbench CSS / stylesheet cache token
```

The exact grounded pre-change state is recoverable from `main@ea50bf2f3f34f07af84d6c99e8433ca74128d5ac` plus the pre-edit blob ledger above.

## Next-Agent Handover

**Current stopping point:** source implementation complete; runtime/native/browser gates remain open.

**PR / branch:** `#491` / `agent/aiv-ui-hardening`.

**Implementation head:** `6b86ac1c4c2192ae7ebef4017dddf1cfc849c141`.

**Do not redo:** first-class canvas separation, UI-context helper, assumption acceptance, single selected-detail architecture, readiness blocker summary, delete safeguard, keyboard/ARIA cleanup, CSS centralization.

**Start here:** acquire native checkout at exact PR candidate → run `npm run verify:aiv-canvas-release` → execute #453 browser checklist → fix only reproduced defects → refresh this report.

**Do not assume:** GitHub `conclusion=failure` means test failure; the final implementation-head job has zero/null steps. Do not assume browser behavior from source tests.

**Do not change without separate authorization:** AIV equations, FLM/Stage-8 mechanics, master data, topology authority, physical-distance semantics, result authority, engineering exports, workflow gates.

**Merge:** not authorized.

## Appendix A — Implementation Takeover Qualification

Incoming agents must answer from the live PR491 source/diff, not from generic UI/AIV knowledge. Recommended gate: >=92/100 overall and >=17/20 each.

### A1 — Production trace and source-of-truth proof — 20
Trace each path separately:

```text
EI .eit import
D.2.3 benchmark load
Flare-network authoring
XLSX/CSV tabular input
```

For each, identify the authoritative working tables, canvas projection entry, readiness join, assumption resolution, acceptance gate, registered screening execution call and result projection. Explain exactly why the first-class canvas cannot become a second engineering-data authority.

### A2 — Rerender/state failure isolation — 20
Starting from one edit to an AIV Source table cell, trace the call path through `applyTableMutation`, readiness invalidation, root render, UI-context capture/restore and canvas synchronization. Predict what happens to:
- open Working data tables disclosure;
- horizontal table scroll;
- selected canvas identity;
- active detail tab;
- cell focus;
- prior assumption acceptance.

Name one executable browser regression that would falsify your answer.

### A3 — Assumption acceptance and authority invariant — 20
Explain why `fingerprint` is not the acceptance oracle, what exact data **is** compared, and all events that invalidate acceptance. Prove that acceptance neither changes resolved engineering values nor upgrades screening/design authority. Describe the failure mode if acceptance were retained after an authoritative input mutation.

### A4 — Relationship mutation / deletion safety — 20
Trace canvas Source→Assessment creation and deletion through canonical Source + Assessment + Operating Case identity to the relationship table. Show that creating a visual connector cannot generate physical distance, and deleting a relationship cannot cascade into Source/Assessment records. Include the incomplete-row deletion behavior and confirmation failure semantics.

### A5 — Exact next validation and minimal-fix discipline — 20
Given the current state (`verify:aiv-canvas-release` NOT_RUN; browser acceptance NOT_RUN), provide the exact validation sequence on a native checkout. If a test/browser check fails, state how you will isolate whether it is projection, UI-context, selection/detail, assumption gate, deletion, styling or pre-existing numerical behavior before changing code. Any proposal to modify the AIV numerical kernel merely to satisfy a UI regression fails this gate.

## Exact Continuation State

`EXACT_NEXT_ACTION = Native checkout of PR491 candidate -> npm run verify:aiv-canvas-release -> real-browser #453 acceptance on the same candidate -> fix only reproduced defects -> update this report with exact executable evidence -> request Owner review; do not merge without explicit authorization.`
