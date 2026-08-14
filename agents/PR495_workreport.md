# PR495 — Mode A Preview / DTXR / Process Authority Work Report

## Recovery header

| Field | State |
|---|---|
| Mission | Restore Mode A Preview controls and correct stale process/service fallback authority. |
| Scope | Phase 4 Preview + service-process fallback numeric validation only. |
| Branch | `agent/mode-a-preview-dtxr-process-fix` |
| Grounded main | `56f5a639edbfc629b5977abff7475ecada4a6d37` |
| Merge authority | NOT GRANTED for this PR. |
| Weight Match | Unchanged. |
| Mode A model isolation | Unchanged. |

## User-reported defects

1. `✨ Smart Map — Unmapped Lines` lacks Select All.
2. Mapped steam/project line still shows stale process values, e.g. `S8810371`, `T1=260`, and `Hydro/Test Pressure=Water`.
3. Consolidated Preview does not expose the two DTXR actions.
4. Individual Mode A Preview hides DTXR/B31.3 actions until a manual Preview build.

## Root cause

The process resolver can persist service-derived fallback values under `overrides.processData`. After an exact/explicit line mapping is later established, Preview sees those persisted fallback values as generic `override` values, so stale fallback data can outrank the mapped Line List row.

Additionally, service fallback previously accepted arbitrary text for numeric process fields, permitting values such as `Water` to enter Hydro/Test Pressure fallback state.

Individual Mode A Preview is lazy/manual-built. Native DTXR Wall, DTXR Rating and B31.3 controls are installed only after Preview branch rows exist, so they appeared hidden until Build Preview was clicked.

## Implemented corrections

- Add literal Select All to the Smart Map Unmapped Lines workbench. It selects visible rows but does not invent Map To values.
- Migrate stale `serviceProcessFallback` values away when an exact/mapped line exists.
- Preserve explicit Process From fields and Preview fields marked manual.
- Restrict service-process fallback fields to numeric values; labels such as Water/Steam are rejected.
- Add source-local consolidated DTXR Wall and DTXR Rating actions.
- Auto-build an explicitly expanded individual Mode A Preview once, restoring native DTXR Wall, DTXR Rating and B31.3 controls.
- Keep B31.3 source-specific; it is not duplicated into consolidated batch authority.
- Add focused regressions and a Preview-authority documentation addendum.

## Validation truth

- Source/diff review: performed.
- Focused tests: added, but NOT_RUN in this connector environment because the local runtime cannot resolve GitHub and no repository checkout is available.
- Browser acceptance: NOT_RUN.
- GitHub Actions: to be checked after draft PR creation; do not classify as PASS unless a workflow actually runs and succeeds.

## Negative assurance

No change to:

- Weight Match mechanics;
- batch CII ZIP contents;
- duplicate Branchname/NodeNumber policy;
- cross-source namespace isolation;
- support/restraint mapping;
- solver/conversion geometry mechanics;
- Mode A separate-model architecture.
