# PR491 — AIV UI Hardening Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Take over the AIV UI defects from the previous critical review, revalidate them against current `main`, close confirmed defects without changing AIV numerical/design authority, add regressions, and leave a draft PR. |
| Work intent | IMPLEMENT / TAKEOVER |
| Criticality | ENGINEERING_CRITICAL — UI edits authoritative AIV input records and controls screening execution. |
| PR | `#491` — DRAFT / OPEN / NOT MERGED |
| Branch | `agent/aiv-ui-hardening` |
| Current grounded main | `2f7b736ad782eb2f37603c97b8d1238ed7c8058f` |
| Merge base after reconciliation | `2f7b736ad782eb2f37603c97b8d1238ed7c8058f` |
| Exact code head before this report-only update | `317a7b7328251ffbd6ef6c846512eca8ddfba969` |
| Base drift at code head | `ahead_by=53`, `behind_by=0` |
| Net code boundary | AIV UI/controller/state/CSS/tests plus this governance report; no AIV numerical-kernel, physical-distance-authority, result-contract, dependency, or workflow-definition change. |
| Runtime status | `npm run verify:aiv-canvas-release` = **NOT_RUN / INFRASTRUCTURE_BLOCKED**. Hosted jobs were created but had zero steps. Real-browser acceptance = NOT_RUN. |
| Merge authority | **NOT AUTHORIZED.** Do not merge without explicit Owner authorization. |
| EXACT_NEXT_ACTION | On a functioning native checkout/runner at the PR exact head: run `npm run verify:aiv-canvas-release`; then execute the AIV real-browser acceptance checklist; only then request Owner merge authorization. |

## Handover in 60 Seconds

This takeover began by re-reading live `main@2f7b736ad782eb2f37603c97b8d1238ed7c8058f` and revalidating the previous AIV UI review findings against that source. An existing overlapping draft PR, `#491`, already owned the same AIV UI-hardening surface. To avoid a competing PR/branch, the work continued on that draft.

Two safety-critical defects from the prior review were confirmed and fixed first:

1. **P0 — Flare canvas drag crossed the engineering mutation boundary.**
   - Before: pointer-up called `onNetworkChange(moveAivFlareNetworkNodePresentation(...))`.
   - `onNetworkChange` was wired to the full network projection path, which rebuilt Sources, Assessments and Source→Assessment tables and cleared readiness/results.
   - Result: a presentation-only drag could replace manual/authoritative working tables.
   - Now: drag completes through `onPresentationChange`; the qualification tab updates only `state.flareNetwork` presentation state and rerenders. Engineering graph edits still use `onNetworkChange`.
   - Regression: drag changes node coordinates, never invokes the engineering mutation callback, and preserves a known 4.2 m engineering path length.

2. **P0 — Screening could be enabled with zero READY relationships.**
   - Before: readiness only required `notReady===0 && methodGap===0` (plus assumption acceptance on the inherited branch).
   - Result: empty/all-`NOT_APPLICABLE` readiness could satisfy the gate.
   - Now: shared `isAivScreeningReady()` additionally requires `readyForQualification > 0`.
   - UI enablement and `runScreening()` use the same helper.
   - Regressions cover zero rows, all-N/A, mixed READY/N/A, and READY plus NOT_READY.

After P0 closure, the remaining prior-review findings were revalidated:

- **P1 — green `SCREENING` badges conflate screening authority with a positive engineering outcome: CONFIRMED / FIXED.** Screening rows now use a neutral authority badge labelled `SCREENING OUTPUT`; the result summary continues to state `Design authority=false` and Line/Case remains non-authoritative.
- **P1 — result headers lack engineering units / controlled display precision: CONFIRMED / FIXED.** Known dB columns now state `(dB)`. Display formatting follows the controlled D.2.3 reference convention: dB to 0.1 dB, LOF to 0.01, FLM factors to four decimals. Full-precision values remain available in hover text and exported evidence is not rounded.
- **P2 — stale “no geometry editor” wording conflicts with Flare network authoring: NOT REPRODUCED on current main.** Current source exposes Flare network authoring and the previous stale wording is absent; no speculative copy patch was made.
- **P2 — existing Flare-node engineering properties cannot be corrected after creation: CONFIRMED / FIXED.** Existing Source/Assessment node rows now expose correction controls for engineering type, tag, line and Source operating case. These edits intentionally use the engineering graph mutation path; canonical identity/kind remain structural rather than casually editable.

The inherited #491 UX work was preserved after source inspection: first-class relationship/results canvas, rerender context preservation, explicit assumption acceptance, actionable readiness hierarchy, delete confirmation, selected-detail accessibility, responsive/shared CSS, and related tests.

## Grounding and Takeover Chain

### Epoch 1 — inherited PR creation

The predecessor opened draft PR #491 for issue #453 and implemented the broad AIV UI-hardening slice. Its original merge base was `ea50bf2f3f34f07af84d6c99e8433ca74128d5ac`.

### Epoch 2 — critical review defect takeover

Owner instruction: re-read current main, validate every prior defect, fix confirmed P0s first, add regression tests, run the relevant AIV release suite, create/retain a draft PR, and do not merge.

Live main was re-read before takeover coding:

```text
main = 2f7b736ad782eb2f37603c97b8d1238ed7c8058f
docs: update InputXML concept and add expert questionnaire (#492)
```

The P0 findings were validated directly against this main source before mutation.

### Epoch 3 — defect fixes

Key takeover commits before base reconciliation:

```text
570b881b  fix(aiv): isolate flare canvas presentation drag
06cdee77  fix(aiv): preserve tables on presentation drag
5b6a34a0  fix(aiv): require ready relationship for screening
bf23f267  fix(aiv): enforce nonempty screening readiness
f62a46f2  fix(aiv): align readiness UI with screening gate
e097dbe0  test(aiv): pin presentation-only flare drag
33363ceb  test(aiv): regress zero-ready screening gate
f335b0bd  fix(aiv): separate screening authority and format results
0ef57395  test(aiv): pin result authority and display precision
3adfa6ad  fix(aiv): make existing network node attributes editable
647d3271  fix(aiv): route node engineering edits through graph mutations
b356b59a  test(aiv): regress existing node correction path
```

### Epoch 4 — current-main reconciliation

Final comparison discovered the inherited branch was still two commits behind current main, although defect validation had already been performed against current main. Those two main commits touched only InputXML/XML-CII files outside the AIV patch surface.

A non-conflicting merge commit was constructed with the exact current-main blobs for all seven affected paths and both parents:

```text
317a7b7328251ffbd6ef6c846512eca8ddfba969
parents:
  b356b59a3e5a16dcf90663a45c03bc252f579b3e
  2f7b736ad782eb2f37603c97b8d1238ed7c8058f
```

Post-reconciliation compare:

```text
base       2f7b736ad782eb2f37603c97b8d1238ed7c8058f
code head  317a7b7328251ffbd6ef6c846512eca8ddfba969
status     ahead
ahead_by   53
behind_by  0
merge_base 2f7b736ad782eb2f37603c97b8d1238ed7c8058f
```

No AIV file was replaced by stale-base content during this merge reconciliation.

## Previous Review Defect Register

| ID | Priority | Current-main validation | Closure |
|---|---:|---|---|
| REV-001 — Presentation drag can overwrite authoritative/manual AIV tables | P0 | CONFIRMED | FIXED — presentation-only callback + regression. |
| REV-002 — Screening can enable with zero applicable/READY relationships | P0 | CONFIRMED | FIXED — shared gate requires `readyForQualification > 0`; empty/all-N/A/mixed regressions added. |
| REV-003 — Positive/green `SCREENING` badge conflates authority/outcome | P1 | CONFIRMED | FIXED — neutral `SCREENING OUTPUT` authority badge. |
| REV-004 — Result headers omit engineering units / uncontrolled display precision | P1 | CONFIRMED | FIXED — explicit dB headers; D.2.3-aligned display precision; full precision retained in hover/export. |
| REV-005 — Stale “no geometry editor” wording conflicts with Flare authoring | P2 | NOT REPRODUCED | NO PATCH — wording absent on current main. |
| REV-006 — Existing Flare-node engineering properties not correctable after creation | P2 | CONFIRMED | FIXED — editable engineering type/tag/line/case through authoritative graph-mutation path. |

## Inherited #491 Engineering Item Register

These were already in the overlapping draft and were retained after takeover inspection.

| Item | Status |
|---|---|
| First-class Source→Assessment relationship/results canvas | IMPLEMENTED |
| Rerender preserves disclosure/scroll/detail-tab/edit focus | IMPLEMENTED |
| Assessment-only screening authority / no design approval wording | IMPLEMENTED |
| Explicit acceptance of resolved assumptions before screening | IMPLEMENTED |
| Single selected-item detail rather than hidden per-record detail DOM | IMPLEMENTED |
| Actionable readiness blockers before full evidence table | IMPLEMENTED |
| Identity-specific relationship deletion confirmation | IMPLEMENTED |
| Detail-tab ARIA + keyboard behavior | IMPLEMENTED |
| Shared/responsive canvas CSS | IMPLEMENTED |

## Permanent Authority / Negative Assurance

The following invariants remain mandatory and are unchanged by the takeover:

1. `TABLES = engineering source of truth`.
2. SVG/canvas coordinates are presentation data only.
3. Physical AIV distance comes from explicit engineering relationship/network evidence, never SVG path/pixel length.
4. Numerical screening execution remains the registered `calculateEngineering({ calculationId: 'VIB.AIV.ACOUSTIC', ... })` bridge.
5. Assessment LOF is the qualified screening scope.
6. Line/Case remains non-authoritative trace.
7. Imported `.eit` results remain evidence until the registered calculation is rerun.
8. `designAuthority=false`.
9. Assumption acceptance records execution intent only; it does not change values or engineering authority.
10. Flare node drag cannot trigger engineering table regeneration or change physical segment length.
11. Screening requires at least one `READY_FOR_QUALIFICATION` relationship and zero `NOT_READY` / `METHOD_GAP` blockers.
12. UI display rounding is presentation-only; engineering/export evidence retains unrounded calculation values.

No takeover change modifies:

- `converters/vibration/aiv/aiv-calculator.js`;
- AIV equations or numerical master data;
- result-contract authority definitions;
- topology/physical-distance engineering semantics;
- AIV engineering export numerical semantics;
- package dependencies;
- GitHub workflow definitions.

## Key Takeover Implementation Seams

### Presentation-only Flare drag

`tabs/vibration-aiv-flare-network-controller.js` now sends pointer-drag completion to `onPresentationChange`.

`tabs/vibration-aiv-qualification-tab.js` handles that callback by updating only `state.flareNetwork` and rerendering. It does not call `projectAivFlareNetworkIntoWorkspace()` and does not replace working tables or clear readiness/results.

True engineering graph edits still use `onNetworkChange` and therefore intentionally regenerate the working tables.

### Single screening gate

New `tabs/vibration-aiv-screening-gate.js` owns the execution predicate:

```text
readyForQualification > 0
notReady == 0
methodGap == 0
assumption acceptance is current when assumptions exist
```

Both the button state and `runScreening()` consume this exact helper.

### Screening authority presentation

`tabs/vibration-aiv-result-view.js` distinguishes calculation mode from engineering outcome:

- `SCREENING OUTPUT` is rendered as an authority badge rather than a positive/green status.
- Line/Case remains explicitly `NON-AUTHORITATIVE`.
- design authority remains false.

### Controlled display precision

The controlled D.2.3 reference panel records values such as `164.7 dB`, `0.29` LOF and `1.2133` FLM1. Result presentation now follows that visible convention:

```text
dB   -> 1 decimal place
LOF  -> 2 decimal places
FLM  -> 4 decimal places
```

Full calculation precision remains in title/hover text and JSON/EIT export evidence is not rounded by this view layer.

### Existing-node correction path

Flare Source/Assessment node table rows now permit correction of:

- Source device type / Assessment type;
- tag;
- line;
- Source operating case.

These changes use `updateAivFlareNetworkNode()` through the engineering `onNetworkChange` path. Structural canonical ID/kind are intentionally not made casual inline edits.

## Regression Coverage Added in Takeover

### `tests/vibration-aiv-flare-network-authoring.test.mjs`

- presentation-only node drag never invokes engineering network mutation;
- dragged coordinates update presentation only;
- known 4.2 m engineering path length is preserved;
- existing Source engineering attributes can be edited through the graph mutation path;
- existing node table renders correction controls for type/case/line/tag.

### `tests/vibration-aiv-workbench-ui.test.mjs`

- zero readiness rows => screening false;
- all `NOT_APPLICABLE` => screening false;
- one READY + N/A rows => screening true when otherwise clear;
- READY + `NOT_READY` => screening false;
- rendered all-N/A readiness keeps Run AIV screening disabled.

### `tests/vibration-aiv-validated-result-export.test.mjs`

- result headers show known dB units;
- D.2.3 values use controlled display precision while preserving full precision in hover;
- screening rows use neutral `SCREENING OUTPUT` authority badge instead of positive `aivq-status ok`;
- displayed dB/FLM/LOF precision is pinned;
- export remains described as unrounded evidence.

## Pre-edit Recovery Ledger — Takeover-Specific

The repository backup CLI could not be executed because this runtime has no native checkout. Existing files were fetched before mutation and remain recoverable from exact Git blobs.

| File | Takeover pre-edit blob |
|---|---|
| `tabs/vibration-aiv-flare-network-controller.js` | `2255000c8444e39f8e3e028ababa5c378294c319` |
| `tabs/vibration-aiv-qualification-tab.js` | `df263d3bc7dfc3a8073f8be895fce2e46ee5eee4` |
| `tabs/vibration-aiv-execution.js` | `a9aee481f961bc004f5bc058e9cb954de09c1297` |
| `tabs/vibration-aiv-readiness-view.js` | `ab13b2d9b2fc68aab61a160320330663cc4a44cc` |
| `tabs/vibration-aiv-result-view.js` | `b9b1846dbc6de3a3a264ff203df147a4f892be5d` |
| `tabs/vibration-aiv-flare-network-view.js` | `4a5bc49011a108234e564059fbdecc996427fb51` |
| `tests/vibration-aiv-flare-network-authoring.test.mjs` | `7147802db9c74d4f9e0dbecc50184e685ac0ff7e` |
| `tests/vibration-aiv-workbench-ui.test.mjs` | `23b65f7332b69015834660c0f5d86dcb2699058f` |
| `tests/vibration-aiv-validated-result-export.test.mjs` | `2de72a47b38b3b5bf3fa3777c73a3231632771b1` |
| `agents/PR491_workreport.md` before takeover refresh | `1dccd551bbb86f2ec4ba195cd09fe471c05e62d0` |

New takeover source file:

- `tabs/vibration-aiv-screening-gate.js`.

The predecessor report contained the broader inherited #491 pre-edit ledger. Historical commits remain immutable and recoverable through Git.

## Current Diff Boundary from Current Main

At exact code head `317a7b7328251ffbd6ef6c846512eca8ddfba969`, comparison against `main@2f7b736a...` reports 31 net changed files, all under these categories:

- `tabs/vibration-aiv-*` UI/controller/state/CSS;
- `tests/vibration-aiv-*` focused regressions;
- `tests/vibration-module-boundaries.test.mjs`;
- `agents/PR491_workreport.md`.

The seven InputXML/XML-CII files used to reconcile current main disappear from the PR diff because their blobs exactly match current main.

## Release / Validation Evidence

### Intended controlled suite

The existing AIV controlled-source workflow invokes:

```text
npm run verify:aiv-canvas-release
```

The package script already covers the relevant AIV input-model, canvas, flare-network and EIT/export suites. No workflow or package-script widening was required for this takeover.

### Hosted execution attempts

The relevant workflow was triggered automatically by the PR code changes.

At code head `b356b59a3e5a16dcf90663a45c03bc252f579b3e`:

```text
run  31811229349
job  94802079263
status completed / failure
steps null
logs unavailable
```

An explicit rerun was requested successfully. Rerun job:

```text
job  94802198021
status completed / failure
steps null
logs unavailable
```

After current-main reconciliation, exact code head `317a7b7328251ffbd6ef6c846512eca8ddfba969` triggered:

```text
run  31811408631
job  94802665641
status completed / failure
steps null
logs unavailable
```

Classification for all of the above:

```text
NOT_RUN / INFRASTRUCTURE_BLOCKED
```

The controlled test command never reached a workflow step. This is **not** evidence of a product-test failure and must not be reported as PASS or FAIL for the suite itself.

### Native checkout

`npm run verify:aiv-canvas-release` on a native local checkout: **NOT_RUN**. This runtime has no usable native GitHub checkout path (`gh` unavailable; direct GitHub DNS from the container unavailable).

### Real-browser acceptance

**NOT_RUN** in this runtime. Required before merge for the interaction-heavy AIV UI:

- pointer pan/zoom/drag;
- verify drag never changes engineering tables/results;
- keyboard focus/detail navigation;
- canvas ↔ table selection/edit sync;
- relationship create/delete confirmation;
- filters;
- assumption review/acceptance;
- screening button gate for empty/all-N/A/mixed readiness;
- result authority badge and unit/precision presentation;
- downloads/exports;
- representative 100/300/500 relationship performance.

## Validation Status Summary

| Gate | Status | Evidence |
|---|---|---|
| Re-read current main before takeover coding | PASS | Main `2f7b736a...` fetched and defect sites validated before mutation. |
| Validate every prior-review defect | PASS | REV-001…REV-006 table above; one P2 item explicitly NOT_REPRODUCED. |
| Fix confirmed P0s first | PASS | Drag boundary + nonempty screening gate implemented before P1/P2 follow-ons. |
| Add regressions | SOURCE COMPLETE / EXECUTION PENDING | New regression assertions committed; suite execution blocked before steps. |
| Reconcile branch to current main | PASS | `behind_by=0`, merge base=`2f7b736a...`. |
| AIV release suite | NOT_RUN / INFRASTRUCTURE_BLOCKED | Exact-head workflow + explicit rerun created zero steps. |
| Real-browser AIV acceptance | NOT_RUN | No browser runner in current connector-only path. |
| Draft PR | PASS | PR #491 remains draft/open. |
| Merge | NOT AUTHORIZED / NOT PERFORMED | Owner authorization required. |

## Risks / Open Gates

- **RISK-001 — Runtime regression:** tests are committed but not executed because the runner failed before steps. Release acceptance remains HOLD.
- **RISK-002 — Browser interaction:** pointer/focus/scroll behavior needs real-browser verification. Release acceptance remains HOLD.
- **RISK-003 — Existing broad PR scope:** #491 contains inherited AIV UI-hardening work beyond the six takeover defects. That work was retained because it owns the same issue/surface; reviewers must evaluate the entire PR diff, not only takeover commits.
- **RISK-004 — Display formatting:** formatting is presentation-only and aligned to the controlled D.2.3 reference panel; export values must remain full precision. The added regression is intended to protect this boundary.

## Owner / Merge Gate

Current recommendation:

```text
PR status            DRAFT
production acceptance HOLD
merge                 DO NOT MERGE
```

Merge should be reconsidered only after:

1. exact-head `npm run verify:aiv-canvas-release` executes and passes on a functioning runner;
2. real-browser AIV acceptance is completed, with special attention to presentation drag vs engineering mutation and screening readiness gating;
3. any failures are fixed and revalidated;
4. the Owner explicitly authorizes merge.

## Appendix A — Expert Takeover Gate for the Next Agent

A successor must answer these from current source before receiving implementation/merge authority. Generic answers are insufficient.

### Q1 — Presentation vs engineering authority

Trace a Flare node pointer drag from DOM event to final state mutation. Identify the exact callback used on pointer-up and prove why that path cannot regenerate Sources/Assessments/Relationships or change physical distance. Then identify one true engineering node edit and show why it *must* use the engineering network projection path.

Minimum acceptable answer: name `createAivFlareNetworkAuthoringController`, `onPresentationChange`, `onNetworkChange`, `applyAivFlareNetworkPresentationState`/presentation handler, `applyFlareNetwork`, and the table projection seam; include a falsifier test.

### Q2 — Screening fail-closed predicate

State the complete current predicate for enabling/executing AIV screening and identify the single helper that owns it. Explain outcomes for: zero rows; all N/A; one READY + two N/A; one READY + one NOT_READY; READY with stale assumption acceptance.

Minimum acceptable answer: `readyForQualification > 0`, `notReady===0`, `methodGap===0`, current assumption acceptance, and proof that UI + execution use the same helper.

### Q3 — Result authority and precision

Explain why `SCREENING OUTPUT` is not a pass/safe classification, why Line/Case remains non-authoritative, and why UI formatting must not round exported evidence. Identify the controlled D.2.3 display convention and the full-precision retention mechanism.

Minimum acceptable answer: Assessment-only screening scope, `designAuthority=false`, dB/LOF/FLM display convention, hover/full precision, and export boundary.

### Q4 — Validation evidence discipline

Given a GitHub Actions job with `conclusion=failure`, `steps=null`, and no logs, classify the release suite correctly and explain what evidence would be required to call it a product-test PASS or FAIL.

Minimum acceptable answer: `NOT_RUN / INFRASTRUCTURE_BLOCKED`; never convert workflow conclusion alone into executed-test evidence; require actual command step/log/exit status or equivalent controlled native execution.

### Q5 — Exact-head takeover and rollback

Show the current main SHA, current PR head, merge base/behind state, net changed-file boundary, takeover pre-edit blobs, and rollback strategy. Explain why this PR must remain draft even if static inspection looks correct.

Minimum acceptable answer: current repository facts, immutable Git recovery points, runtime/browser gates, and explicit Owner merge authorization requirement.

### Recommended scoring

```text
Q1  20 marks
Q2  20 marks
Q3  20 marks
Q4  20 marks
Q5  20 marks

Minimum total: 92/100
Minimum each: 17/20
Safety-critical false claim: immediate failure
```

## Final Handoff Rule

Another qualified engineer/agent must be able to continue from this report and the PR without private chat context. If repository head, workflow evidence, or defect state changes, re-ground before acting and update this same living report. Do not merge without explicit Owner authorization.
