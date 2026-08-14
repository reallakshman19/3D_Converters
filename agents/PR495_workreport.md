# PR495 — Mode A Preview / Weight / Fast Run Work Report

## Recovery header

| Field | State |
|---|---|
| Mission | Restore Mode A Preview/Weight controls, correct process fallback authority, and reduce avoidable multi-file UI/run overhead. |
| Scope | Phase 4 Preview + service-process numeric guard + Phase 6 Weight Match UI + consolidated rigid review + Finalize/Run orchestration/presentation. |
| Branch | `agent/mode-a-preview-dtxr-process-fix` |
| Grounded main | `56f5a639edbfc629b5977abff7475ecada4a6d37` |
| Merge authority | NOT GRANTED for this PR. |
| Mode A model isolation | Unchanged: one XML → one independent CII model. |
| Conversion execution | Sequential, source-isolated; no parallel `Promise.all` engineering execution. |

## User-reported defects

1. `✨ Smart Map — Unmapped Lines` lacks Select All.
2. Mapped steam/project line can retain stale process values, e.g. `S8810371`, `T1=260`, and `Hydro/Test Pressure=Water`.
3. Consolidated Preview does not expose the two DTXR actions.
4. Individual Mode A Preview hides DTXR/B31.3 actions until a manual Preview build.
5. Consolidated Weight Match is missing native single-source controls.
6. Consolidated `Rigid Weights Need Review` lacks useful fill/re-rating review aids.
7. Finalize/Run needs one-click **Finalize, Run & Download ZIP**.
8. Preview, Weight Match and Run look unresponsive/slow in multi-file mode.

## Root causes

### Process authority

The process resolver can persist service-derived fallback values under `overrides.processData`. After an exact/explicit line mapping is later established, Preview sees those persisted fallback values as generic `override` values, so stale fallback data can outrank the mapped Line List row.

Service fallback also previously accepted arbitrary text for numeric process fields, permitting values such as `Water` to enter Hydro/Test Pressure fallback state.

### Hidden Preview/Weight controls

Individual Mode A Preview is lazy/manual-built. Native DTXR Wall, DTXR Rating and B31.3 controls are installed only after Preview branch rows exist.

Consolidated Weight Match was a simplified layer and did not surface the native Build / DTXR Rating / preferred / inch-to-mm workflow controls.

### Run responsiveness

The previous multi-file run loop performed `render()` before every XML conversion. With many files, this repeatedly rebuilt the whole workspace and rebound Preview/Weight/Run controls while conversion work was executing.

## Implemented corrections

### Preview

- Add literal Select All to Smart Map Unmapped Lines. It selects visible rows but does not invent Map To values.
- Migrate stale `serviceProcessFallback` values away when an exact/mapped line exists.
- Preserve explicit Process From fields and Preview fields marked manual.
- Restrict service-process fallback fields to numeric values; labels such as Water/Steam are rejected.
- Add source-local consolidated DTXR Wall and DTXR Rating actions.
- Auto-build an explicitly expanded individual Mode A Preview once, restoring native DTXR Wall, DTXR Rating and B31.3 controls.
- Keep B31.3 source-specific; it is not duplicated into consolidated batch authority.

### Weight Match

Consolidated Weight Match now exposes:

- `Build Weight Data — All XML`
- `Use Rating as per DTXR`
- `Use all ★ preferred (exact)`
- `⇄ in→mm: ON/OFF`

Safety/authority rules:

- DTXR Rating is ephemeral Weight Match rerank authority only; it does not silently write Preview Rating.
- Leaving DTXR mode clears its transient reranked candidate so later bulk acceptance cannot accidentally use stale DTXR-derived candidate state.
- Bulk preferred application is exact-only: preferred + direct + 100%; inferred/interpolated/extrapolated/factor/fallback candidates remain Review.
- Simple per-row `Use`/exact fill writes source-local `overrides.rigidWeight` and updates the visible row in place instead of rebuilding all XML Weight Match data.
- Undo and true candidate-policy changes still rebuild when required.

### Consolidated rigid review

Added review-only helpers:

- `Use DTXR Ratings & Refresh`
- `Use All Suggestions`

These fill inputs only. No source-local Rating/Weight is committed until `Apply Weights and Run All Models`.

`Skip Review` remains absent in consolidated Mode A by design.

### Finalize / Run

Added:

- `Finalize, Run & Download ZIP`

Both normal `Run Separate Models` and the ZIP action use the compact fast runner:

```text
preflight
→ consolidated rigid review if needed
→ for each enabled XML:
     clear source caches
     run isolated model
     lightweight progress update / UI yield
→ one final full render
→ optional ZIP of successful CII outputs
```

No full workspace render occurs inside the per-source conversion loop.

No parallel conversion was introduced.

### Compact multi-file presentation

For 2+ enabled XMLs:

- Preview / Weight Match default to `Consolidated only (fastest)`.
- only one individual workbench can be opened through the source selector;
- individual bodies remain lazy-loaded;
- Run per-file readiness/results tables are collapsed by default;
- summary / manifest / ZIP actions remain visible.

## Principal new/modified implementation paths

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a-fast.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-weight-tools.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-consolidated-easy-weight-ui.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-rigid-review-tools.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-compact-ui.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js`
- `tests/xml-cii-mode-a-fast-multi-ui.test.mjs`

Earlier PR495 Preview/service-process paths remain part of the same branch.

## Validation truth

- Source/diff review: performed continuously during implementation.
- Focused permanent regressions: added.
- Native Node test execution: **NOT_RUN / INFRASTRUCTURE_BLOCKED**. `git ls-remote https://github.com/reallaksh19/3D_Converters.git HEAD` fails because the native runtime cannot resolve `github.com`.
- Browser acceptance: **NOT_RUN**.
- GitHub Actions: must be checked from the exact PR head; absence of a run is not PASS.
- Latest branch comparison during implementation: based directly on `main@56f5a639edbfc629b5977abff7475ecada4a6d37`, `behind=0`.

## Qualification still required

- browser proof that Preview/Weight multi mode stays responsive with the representative 15-file batch;
- representative `S8810371` project-master/Steam authority proof;
- consolidated Weight Match parity with equivalent single-source runs;
- rigid popup DTXR/refill acceptance;
- one-click Finalize/Run/ZIP proof;
- batch result and CII ZIP parity versus the same XMLs run one-by-one.

## Negative assurance

No change to:

- duplicate Branchname/NodeNumber policy;
- cross-source namespace isolation;
- support/restraint mapping;
- geometry or solver/conversion mechanics;
- one XML → one CII architecture;
- successful-only ZIP inclusion policy.

No merge authority has been granted. Keep PR #495 draft/unmerged until the owner explicitly authorizes merge.
