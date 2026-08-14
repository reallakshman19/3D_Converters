# PR491 — AIV UI Hardening Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Harden the AIV screening workspace UX and execution safeguards without changing numerical or engineering authority. |
| Work intent | IMPLEMENT |
| Criticality | ENGINEERING_CRITICAL — UI edits authoritative AIV table/relationship records and controls screening execution. |
| Source task | Canonical issue `#453` + Owner-directed critical AIV UI review/update on 2026-08-14. |
| PR | `#491` — DRAFT / OPEN / MERGEABLE |
| Branch | `agent/aiv-ui-hardening` |
| Grounded base | `main@ea50bf2f3f34f07af84d6c99e8433ca74128d5ac` |
| Exact latest implementation head | `33363ceb27c5988969867937898412c658294b62` |
| Base drift | `ahead_by=46`, `behind_by=0` |
| Net diff | 28 files: AIV UI/controller/state/CSS/tests + this report only. |
| Engineering status | Reviewed P0/P1/P2 source implementation complete; two additional fail-closed defects found during concurrent review were incorporated. |
| Runtime status | Native release suite NOT_RUN; real-browser acceptance NOT_RUN. |
| Latest hosted CI | Run `31810476088`, job `94799614480`: `conclusion=failure`, `steps=null` => `NOT_RUN / INFRASTRUCTURE_BLOCKED`. |
| Merge authority | NOT AUTHORIZED. Keep draft until native + browser gates pass and Owner explicitly authorizes merge. |
| EXACT_NEXT_ACTION | Native checkout at this exact implementation head -> `npm run verify:aiv-canvas-release` -> #453 real-browser checklist -> fix only reproduced defects -> refresh report. |

## Handover in 60 Seconds

PR491 implements the critical AIV UI review while preserving AIV numerical and engineering authority boundaries.

What is now true:
- the general Source→Assessment relationship/results canvas is first-class for `.eit`, D.2.3 benchmark, flare-network and tabular paths instead of being hidden beneath Flare network authoring;
- root rerenders preserve keyed disclosure state, table scroll, selected-detail tab and active table/assumption edit focus;
- screening UI states Assessment-only authority, bounded release envelope, Line/Case trace-only and no design approval;
- if readiness resolves assumptions, screening is fail-closed until the operator accepts the exact current resolved assumption set; any readiness-invalidating input/profile/topology mutation clears that acceptance;
- the canvas uses one selected-item detail host rather than hidden detail DOM for every record;
- readiness surfaces relationship blockers before the full engineering evidence table;
- relationship deletion requires identity-specific confirmation from canvas and table paths;
- selected-detail tabs have ARIA linkage, roving tabindex and Left/Right/Home/End keyboard behavior;
- canvas CSS is shared rather than injected by the renderer and the hard 720 px minimum is removed.

Two additional defects were found after the first implementation checkpoint and adopted into the branch after re-grounding:
1. **Flare node drag was still routed through the engineering network-change callback.** It now uses a presentation-only callback, and a regression proves drag changes presentation coordinates without changing the 4.2 m engineering path length.
2. **A readiness result with zero READY relationships could satisfy the old `notReady==0 && methodGap==0` gate.** New `isAivScreeningReady()` requires `readyForQualification > 0` in addition to zero blockers and current assumption acceptance. UI and execution use the same helper; a zero-ready regression was added.

This runtime cannot execute a native checkout. The latest implementation-head Actions job has zero/null steps, so `verify:aiv-canvas-release` is still NOT_RUN. Do not turn static/source evidence into a runtime PASS.

## Grounding / Takeover Chain

### Epoch 1 — initial grounding
- Live main: `ea50bf2f3f34f07af84d6c99e8433ca74128d5ac`.
- Canonical issue: #453.
- Predecessors re-read: #451, #454, #456, #469, #474.
- No `agents/MASTER_INDEX.md` exists on current main.
- No pre-existing PR owning this exact AIV UI-hardening scope was found.
- Draft PR #491 allocated before production edits.

### Epoch 2 — first source-complete checkpoint
- First implementation checkpoint: `6b86ac1c4c2192ae7ebef4017dddf1cfc849c141`.
- Source/diff showed UI/controller/state/CSS/tests only; no AIV calculator/result-contract/export/workflow changes.
- Hosted run `31810004558`, job `94798083284` had no steps => NOT_RUN.

### Epoch 3 — concurrent branch continuation / re-ground
After the first checkpoint, the branch advanced through additional focused commits. Work was not overwritten. The new commits were inspected and accepted because they narrowed two fail-closed defects without crossing authority boundaries:

```text
570b881b  fix(aiv): isolate flare canvas presentation drag
06cdee77  fix(aiv): keep flare presentation drag out of engineering projection
5b6a34a0  test(aiv): cover flare presentation-only callback path
bf23f267  fix(aiv): enforce nonempty screening readiness
f62a46f2  fix(aiv): align readiness UI with screening gate
e097dbe0  test(aiv): pin presentation-only flare drag
33363ceb  test(aiv): regress zero-ready screening gate
```

Latest implementation comparison:

```text
base       ea50bf2f3f34f07af84d6c99e8433ca74128d5ac
head       33363ceb27c5988969867937898412c658294b62
ahead_by   46
behind_by  0
files      28
```

Latest implementation-head hosted run: `31810476088`; job `94799614480`; `steps=null` => NOT_RUN / INFRASTRUCTURE_BLOCKED.

## Engineering Item Register

| ID | Priority | Status | Current closure |
|---|---:|---|---|
| ISS-001 — Canvas hidden under Flare authoring | P0 | IMPLEMENTED | First-class data-gated canvas precedes optional Flare authoring. |
| ISS-002 — Rerender loses work context | P0 | IMPLEMENTED | Capture/restore disclosure, table scroll, detail tab and edit focus. |
| ISS-003 — Authority presentation too broad | P0 | IMPLEMENTED | Assessment-only / bounded envelope / no design approval surfaced. |
| ISS-004 — Assumed inputs can run without explicit acceptance | P0 | IMPLEMENTED | Exact resolved-set acceptance required before screening. |
| ISS-005 — Zero-ready screening gate | P0 | IMPLEMENTED | Shared gate requires `readyForQualification > 0`. |
| ISS-006 — Flare presentation drag crossed engineering mutation callback | P0 | IMPLEMENTED | Presentation-only callback separated; engineering path length regression added. |
| IMP-001 — Canvas + selected detail layout | P1 | IMPLEMENTED | Responsive desktop split. |
| IMP-002 — Hidden detail DOM scaling | P1 | IMPLEMENTED | One on-demand selected detail. |
| IMP-003 — Readiness action hierarchy | P1 | IMPLEMENTED | Blockers shown before full engineering table. |
| IMP-004 — Relationship deletion safeguard | P1 | IMPLEMENTED | Identity-specific confirmation, fail-closed. |
| IMP-005 — Accessibility/responsive cleanup | P2 | IMPLEMENTED | ARIA tabs/keyboard/shared CSS/responsive canvas. |
| RISK-001 — Numerical/authority regression | P0 | SOURCE-MITIGATED / RUNTIME-PENDING | No numerical/result authority files changed; runtime suite NOT_RUN. |
| RISK-002 — Cross-input-path regression | P0 | TESTS-ADDED / RUNTIME-PENDING | Existing release suite includes updated regressions; execution NOT_RUN. |
| DEC-001 — Stage-8/FLM1/general applicability | P0 | OUT OF SCOPE | Separate engineering-authority program; calculator mechanics untouched. |

## Permanent Authority / Negative Assurance

Must remain true:

1. `TABLES = engineering source of truth`.
2. `SVG CANVAS = presentation / relationship editing / result explanation`.
3. Physical AIV distance comes from explicit relationship evidence/visible assumptions, never SVG connector/path length.
4. Numerical screening execution remains the registered `calculateEngineering({ calculationId: 'VIB.AIV.ACOUSTIC', ... })` bridge.
5. Assessment LOF is the qualified screening scope.
6. Line/Case remains non-authoritative trace.
7. Imported `.eit` results remain evidence until rerun.
8. `designAuthority=false`.
9. Assumption acceptance is execution intent only and does not change values or authority.
10. Flare node presentation drag is not an engineering network mutation and cannot rewrite generated AIV tables or physical segment length.
11. Screening requires at least one `READY_FOR_QUALIFICATION` relationship.

No PR491 diff touches:
- `converters/vibration/aiv/aiv-calculator.js`;
- AIV numerical masters/equations;
- result-contract authority definitions;
- topology/physical-distance engineering semantics;
- AIV engineering export semantics;
- package dependencies;
- GitHub workflow definitions.

## Key Implementation Seams

### First-class canvas
`tabs/vibration-aiv-input-view.js` now renders the relationship canvas whenever current AIV/topology data exist. Flare authoring remains a separate optional disclosure.

### Rerender context
New `tabs/vibration-aiv-ui-context.js` captures/restores:
- `data-aiv-disclosure-key` state;
- `data-aiv-scroll-key` scroll offsets;
- current selected-detail tab;
- roving tabindex;
- active table/assumption input focus.

### Assumption run gate
New `tabs/vibration-aiv-assumption-acceptance.js` canonicalizes the resolved assumption set. Equality uses the exact canonical `key`; the `fnv1a32:*` fingerprint is display/trace only.

`clearReadiness()` clears acceptance. Current screening gate is centralized in `tabs/vibration-aiv-screening-gate.js`:

```text
notReady == 0
methodGap == 0
readyForQualification > 0
current assumption acceptance (if assumptions exist)
```

Both UI enablement and `runScreening()` use the same gate.

### Single selected detail
`renderAivCanvasSelectedDetailHtml(state, selectionKey)` renders only the selected Source, Assessment or Relationship. The renderer consumes existing projection/result contracts and performs no AIV math.

### Flare presentation-only drag
`tabs/vibration-aiv-flare-network-controller.js` uses `onPresentationChange` for node drag instead of `onNetworkChange`. `tabs/vibration-aiv-qualification-tab.js` updates only `state.flareNetwork` and rerenders for presentation changes; the engineering network projection/table generation path remains under `onNetworkChange`.

### Relationship delete
`tabs/vibration-aiv-delete-safeguard.js` requires confirmation with Source → Assessment · Case. Incomplete rows use explicit unknown placeholders but still require confirmation.

## Pre-edit Recovery Ledger

Native repository backup CLI is NOT_RUN because this is a connector-only runtime. Existing files were fetched before mutation and remain recoverable from exact Git blobs + grounded base.

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
| `tabs/vibration-aiv-flare-network-controller.js` | `2255000c8444e39f8e3e028ababa5c378294c319` |
| `tabs/vibration-aiv-workbench.css` | `78b733688a50409ff3ba34b63949b4d04a022818` |
| `tabs/vibration-aiv-qualification.css` | `adbcd34fe3f204afa1e00fee3beecdbe4b053681` |
| `tests/vibration-aiv-workbench-ui.test.mjs` | `cdc50e9bdfc527e440d602f11b6c88d7e4a0b542` |
| `tests/vibration-aiv-canvas-dod.test.mjs` | `8ecd37bcd81662ca2f75660cfcdbd34100794ccd` |
| `tests/vibration-aiv-canvas-assumptions.test.mjs` | `fdfb416af3f28ba12bb61719ce3fa8dc8b1c3806` |
| `tests/vibration-aiv-canvas-interaction.test.mjs` | `e37b7b9ef6668e0fe4cb4ca79cd16efee68f6e25` |
| `tests/vibration-aiv-canvas-relationship-edit.test.mjs` | `690314a14f4468f3b45107296d26bea024bff867` |
| `tests/vibration-aiv-canvas-view.test.mjs` | `305f0ea2435dd52c106ceaf856055f5af524db82` |
| `tests/vibration-aiv-flare-network-authoring.test.mjs` | `7147802db9c74d4f9e0dbecc50184e685ac0ff7e` |
| `tests/vibration-module-boundaries.test.mjs` | `47c86d056196b5369b2529c3ca21475d2b690971` |

New source files have no pre-edit blob:
- `tabs/vibration-aiv-assumption-acceptance.js`
- `tabs/vibration-aiv-assumption-acceptance-controller.js`
- `tabs/vibration-aiv-delete-safeguard.js`
- `tabs/vibration-aiv-screening-gate.js`
- `tabs/vibration-aiv-ui-context.js`
- `tabs/vibration-aiv-workspace-browser.js`
- this report.

## Final Changed-File Boundary

### AIV UI/controller/state/CSS
- `tabs/vibration-aiv-assumption-acceptance-controller.js`
- `tabs/vibration-aiv-assumption-acceptance.js`
- `tabs/vibration-aiv-assumption-view.js`
- `tabs/vibration-aiv-canvas-controller.js`
- `tabs/vibration-aiv-canvas-detail.js`
- `tabs/vibration-aiv-canvas-view.js`
- `tabs/vibration-aiv-delete-safeguard.js`
- `tabs/vibration-aiv-execution.js`
- `tabs/vibration-aiv-flare-network-controller.js`
- `tabs/vibration-aiv-input-view.js`
- `tabs/vibration-aiv-qualification-tab.js`
- `tabs/vibration-aiv-qualification-view.js`
- `tabs/vibration-aiv-qualification.css`
- `tabs/vibration-aiv-readiness-view.js`
- `tabs/vibration-aiv-screening-gate.js`
- `tabs/vibration-aiv-state.js`
- `tabs/vibration-aiv-ui-context.js`
- `tabs/vibration-aiv-workbench.css`
- `tabs/vibration-aiv-workspace-browser.js`

### Focused regressions
- `tests/vibration-aiv-canvas-assumptions.test.mjs`
- `tests/vibration-aiv-canvas-dod.test.mjs`
- `tests/vibration-aiv-canvas-interaction.test.mjs`
- `tests/vibration-aiv-canvas-relationship-edit.test.mjs`
- `tests/vibration-aiv-canvas-view.test.mjs`
- `tests/vibration-aiv-flare-network-authoring.test.mjs`
- `tests/vibration-aiv-workbench-ui.test.mjs`
- `tests/vibration-module-boundaries.test.mjs`

### Governance
- `agents/PR491_workreport.md`

## Release / Validation Seam

No package script change was required. Existing commands already cover the changed tests:

```text
verify:aiv-input-model
  -> vibration-module-boundaries.test.mjs

verify:aiv-canvas
  -> canvas view / interaction / relationship / assumptions / DoD ...

verify:aiv-flare-network
  -> flare-network authoring/presentation regression

verify:aiv-eit-export
  -> vibration-aiv-workbench-ui.test.mjs

verify:aiv-canvas-release
  -> input-model + canvas + flare-network + EIT export
```

Source regressions now cover:
- benchmark/non-flare first-class canvas;
- rerender disclosure/scroll/tab/focus restoration;
- exact assumption-set acceptance/invalidation;
- screening disabled until acceptance;
- screening disabled when zero relationships are READY even if blockers are zero;
- one selected-detail host/on-demand detail;
- ARIA/keyboard detail-tab behavior;
- relationship delete confirmation;
- presentation-only flare drag with unchanged engineering path distance;
- responsive canvas/source guard;
- module size/no-equation boundaries for new helper seams.

## Validation Ledger

### PASS — source / exact-diff evidence
- base→implementation-head compare: `ahead_by=46`, `behind_by=0`, 28 files;
- changed-file boundary contains no AIV calculator/result-contract/master/export/dependency/workflow file;
- registered Engineering Calculation API remains the execution bridge;
- shared screening gate is used by UI and execution;
- flare drag callback is presentation-only;
- no SVG-derived physical-distance path was added;
- high-risk controllers/views remain within repository module-size policy by source inspection; new helper modules are included in module-boundary regressions;
- existing package release commands include all updated test groups.

### NOT_RUN — runtime evidence
| Check | Status | Evidence |
|---|---|---|
| `npm run verify:aiv-canvas-release` native execution | NOT_RUN | Native checkout unavailable. |
| Latest implementation-head Actions test execution | NOT_RUN / INFRASTRUCTURE_BLOCKED | Run `31810476088`, job `94799614480`, `steps=null`. |
| Real-browser #453 interaction/accessibility/download acceptance | NOT_RUN | No browser harness. |
| Real-browser 100/300/500 relationship performance | NOT_RUN | Requires real browser candidate. |

### Engineering assertions still requiring runtime confirmation
- actual table↔canvas selection/focus lifecycle after the single-detail seam;
- actual browser relationship create/delete confirmation flow;
- assumption review/accept → run behavior in browser;
- real file downloads;
- actual release-suite numerical/result parity;
- actual 100/300/500 rendering performance.

No PASS claim is made for these.

## Recovery / Isolation Map

If a runtime regression appears, isolate before editing:

```text
canvas discoverability       -> vibration-aiv-input-view.js
rerender context             -> vibration-aiv-ui-context.js + qualification-tab
assumption acceptance        -> assumption-acceptance* + screening-gate + execution
zero-ready gate              -> vibration-aiv-screening-gate.js
selected detail              -> canvas-view/controller/detail + state
relationship deletion        -> delete-safeguard + qualification-tab
flare presentation drag      -> flare-network-controller + qualification-tab presentation callback
readiness presentation       -> readiness-view
responsive styling           -> workbench.css / qualification.css cache seam
```

Do **not** modify `aiv-calculator.js` merely to make a UI regression pass.

## Next-Agent Handover

**Stopping point:** source implementation and source-level hardening complete; native/browser evidence still open.

**Branch / PR:** `agent/aiv-ui-hardening` / #491.

**Implementation head:** `33363ceb27c5988969867937898412c658294b62`.

**Highest-risk remaining item:** first real native/browser run may reveal integration/focus/performance defects not observable through source inspection.

**Start here:** checkout exact candidate -> `npm run verify:aiv-canvas-release` -> execute #453 browser checklist on same commit -> fix only reproduced defects -> update report with exact observations.

**Do not redo:** first-class canvas, context preservation, assumption acceptance, shared nonempty screening gate, single selected detail, blocker summary, delete confirmation, presentation-only flare drag, tab accessibility, CSS centralization.

**Do not touch without separate authorization:** AIV equations/FLM/Stage-8 mechanics/master data/result authority/topology authority/physical-distance semantics/engineering export/workflow gates.

**Merge:** NOT AUTHORIZED.

## Appendix A — Implementation Takeover Qualification

Incoming agents must answer from live PR491 source/diff. Recommended threshold: >=92/100 overall and >=17/20 each.

### A1 — Production trace — 20
Trace `.eit`, D.2.3 benchmark, Flare authoring and XLSX/CSV separately through authoritative tables, canvas projection, readiness, assumption resolution/acceptance, shared screening gate, registered calculation execution and result projection. Prove why canvas presentation state cannot become a second engineering-data authority.

### A2 — Rerender/state isolation — 20
For one Source table-cell edit, predict the exact effect on disclosure state, table scroll, selected canvas identity, active detail tab, edit focus, readiness, screening result and prior assumption acceptance. Name a browser test that falsifies the prediction.

### A3 — Assumption + screening gate safety — 20
Explain why the display fingerprint is not the acceptance oracle, what exact canonical content is compared, why `readyForQualification > 0` is mandatory, and which mutations invalidate acceptance. Prove neither acceptance nor readiness can promote design authority.

### A4 — Visual-versus-engineering mutation boundary — 20
Trace both relationship creation/deletion and Flare node drag. Show where canonical identity is used, where confirmation occurs, why drag cannot alter segment engineering length or generated AIV tables, and why no SVG distance is inferred.

### A5 — Native validation / minimal-fix discipline — 20
Give the exact final validation sequence. If a check fails, isolate projection, UI-context, selection/detail, acceptance/screening gate, deletion, Flare presentation, styling or pre-existing numerical behavior before editing. A proposal to change the numerical kernel solely to satisfy a UI failure fails this gate.

## Exact Continuation State

`EXACT_NEXT_ACTION = checkout PR491 at implementation head 33363ceb27c5988969867937898412c658294b62 -> npm run verify:aiv-canvas-release -> real-browser #453 acceptance on same candidate -> fix only reproduced defects -> update this report with executable evidence -> request Owner review; do not merge without explicit authorization.`
