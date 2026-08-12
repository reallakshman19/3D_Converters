# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Provide the HP piping-class standardization workspace with controlled authority packages, editable docs-backed engineering libraries, and direct access through the repository Engineering UI. |
| Source task / issue | Owner requested configurable CSV-backed libraries under `docs/...`, then reported `Invalid calculation ID: PIPE.SHELL_INDENTATION`, then specified `Engineering Calculations` as the main tab with B31.3 Material Factors, Empirical Weight Tuning, and HP Piping Class as subtabs. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Production HEAD before final report sync | `268d6c466789ed6694450a7588c073322020d700` |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 9 — central Engineering UI wiring — COMPLETE |
| Last completed stage | Stage 9 |
| Engineering status | HP class calculator remains unchanged; authority-package, docs-backed library transport, central Engineering subtab shell, and registry compatibility fix are implemented. |
| Validation status | PASS for Stage 7/8 pure library tests; PASS local JS syntax/ID-pattern check for Stage 9 registry/workspace/HP renderer; PASS source/ledger reconciliation. Repository CI and hosted-browser E2E are NOT_RUN. |
| Current blocker | No coding blocker in current scope. Material `S/Syt` and purchase-specific max-OD/tolerance data remain intentionally blank until controlled project values are published. |
| Exact next action | Open the main application on same-origin static hosting, select Engineering → Engineering Calculations → HP Piping Class, confirm browser rendering/docs fetch, then review PR #439 for merge. |

## Handover in 60 Seconds

### What is now true

- PR #437 merged the B31.3/KD HP piping-class calculation engine.
- PR #439 adds controlled authority-package JSON transport.
- PR #439 adds editable material/property and pipe-product libraries.
- The library dynamically fetches `docs/Masters/HP_Piping_Class/library-catalog.csv`.
- `material-properties.csv` is intentionally header-only.
- `pipe-product-overrides.csv` is intentionally header-only and requires explicit purchase `product_spec`, `design_d_max_mm`, `minus_tolerance_pct`, and `source_ref` before application.
- Canonical NPS/OD/schedule/wall geometry remains sourced from `docs/Masters/NPS_OD_BORE_SCHEDULE_MASTER.tsv`, blob `7e83f7283b4ca9f35a86a45c008ca0b52a053fcc`.
- Reference OD is not silently promoted to Chapter IX maximum permitted/design `D`.
- Material exact-point/bounded interpolation remains; extrapolation is blocked.
- No universal `-12.5%` wall tolerance exists.
- The Engineering navigation now has one top-level item: **Engineering Calculations**.
- Inside it are subtabs: **Calculations**, **B31.3 Material Factors**, **Empirical Weight Tuning**, **HP Piping Class**.
- Existing deep links for the prior B31.3/Empirical top-level IDs are redirected into the main Engineering Calculations tab.
- `PIPE.SHELL_INDENTATION` remains the stable pending calculation ID and no longer breaks registry construction.

### User-visible defect corrected

Observed error:

`Invalid calculation ID: PIPE.SHELL_INDENTATION`

Root cause:

- `pending-definitions.js` contains stable roadmap ID `PIPE.SHELL_INDENTATION`;
- `registry.js` required at least three dot-separated ID segments using `{2,}`;
- the default registry includes pending definitions, so the exception occurred before Engineering Calculations rendered.

Correction:

- registry grammar now accepts two-or-more segments using `{1,}`;
- the published ID is not renamed;
- retained core test explicitly resolves `PIPE.SHELL_INDENTATION` as a blocked issue-428 definition.

### What remains unfinished

- Hosted-browser E2E on the actual deployment target.
- Population/review of controlled Chapter IX material `S/Syt` rows.
- Population/review of product maximum permitted OD and negative tolerance overlay rows.
- Optional future repository publication/approval workflow for CSV revisions.

### What must not be assumed

- A fetched docs row is approved merely because it renders.
- Reference/nominal OD equals maximum permitted purchase OD.
- `12.5%` is a universal manufacturing tolerance.
- Other B31.3 benchmark/factor masters automatically qualify Chapter IX `S/Syt` values.
- Missing engineering fields may be defaulted.

## Mission and Engineering Intent

The PR supplies a controlled data/UX layer around the already merged calculator. Engineering formulas remain owned by the calculator; repository CSV/JSON/UI layers provide traceable input/evidence transport only.

Primary operator route:

**Engineering → Engineering Calculations → HP Piping Class**

Direct technical route remains:

`engineering/hp-class-standardization/engineering-library.html`

## Mission Status

| Work Item | Priority | Status | Stage |
|---|---:|---|---:|
| Authority-package transport | HIGH | VALIDATED | 4–6 |
| Editable material/product libraries | HIGH | VALIDATED | 7 |
| Docs CSV catalog and dynamic fetch | HIGH | VALIDATED | 8 |
| Header-only material CSV | HIGH | VALIDATED | 8 |
| Product purchase overlay CSV | HIGH | VALIDATED | 8 |
| Canonical pipe TSV adapter | HIGH | VALIDATED | 8 |
| No material extrapolation | CRITICAL | VALIDATED | 7–8 |
| No default wall tolerance | CRITICAL | VALIDATED | 7–8 |
| Explicit maximum permitted/design D | CRITICAL | VALIDATED | 8 |
| Registry `PIPE.SHELL_INDENTATION` defect | CRITICAL | FIXED | 9 |
| Single Engineering Calculations main tab | HIGH | IMPLEMENTED | 9 |
| B31.3/Empirical/HP subtabs | HIGH | IMPLEMENTED | 9 |
| Legacy Engineering deep-link routing | MEDIUM | IMPLEMENTED | 9 |
| Stage 9 syntax / ID-pattern smoke | HIGH | PASS | 9 |
| Hosted browser E2E | MEDIUM | NOT_RUN | 9 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| RISK-017 | engineering-data | CRITICAL | MITIGATED | No hidden library defaults; explicit Apply only. |
| RISK-018 | product-data | HIGH | MITIGATED | No universal purchase tolerance. |
| RISK-019 | docs-data | CRITICAL | MITIGATED | Missing material/purchase fields remain blockers. |
| RISK-020 | source drift | HIGH | MITIGATED | Existing canonical pipe TSV remains geometry authority. |
| ISS-005 | UI defect | CRITICAL | FIXED | Registry rejected stable `PIPE.SHELL_INDENTATION` ID. |
| IMP-024 | UI integration | HIGH | DONE | HP class exposed under central Engineering Calculations subtabs. |
| DEC-023 | data design | HIGH | ACCEPTED | Docs CSV catalog discovers reusable data. |
| DEC-024 | material authority | HIGH | ACCEPTED | Material CSV ships blank/header-only. |
| DEC-025 | product authority | HIGH | ACCEPTED | Product CSV is purchase overlay only. |
| DEC-026 | geometry authority | CRITICAL | ACCEPTED | `design_d_max_mm` is explicit; reference OD is not promoted. |
| DEC-027 | ID compatibility | CRITICAL | ACCEPTED | Preserve stable `PIPE.SHELL_INDENTATION`; allow valid two-segment calculation IDs. |
| DEC-028 | navigation | HIGH | ACCEPTED | One main `Engineering Calculations` tab owns the Engineering subtabs. |

## Stage Execution Log

### Stages 1–6 — authority-package workflow

COMPLETE. Source/schema validation occurs before mutation; imported calculations are rerun; exported result snapshots are audit-only; row evidence is restored only by exact recalculated keys.

### Stage 7 — configurable engineering libraries

COMPLETE. Added editable material/property and product tables, bounded material interpolation, no extrapolation, exact product application, working-copy JSON import/export and explicit Apply actions.

### Stage 8 — docs-backed CSV libraries

COMPLETE. Added:

- `docs/Masters/HP_Piping_Class/library-catalog.csv`
- `docs/Masters/HP_Piping_Class/material-properties.csv`
- `docs/Masters/HP_Piping_Class/pipe-product-overrides.csv`
- `engineering/hp-class-standardization/engineering-library-csv.js`
- runtime same-origin docs fetch/reload;
- CSV downloads;
- canonical pipe TSV expansion and purchase-overlay merge.

Key safeguards:

- blank material CSV produces zero rows;
- duplicate/incomplete overlay records are rejected;
- purchase product spec, max permitted/design `D`, tolerance and source are required before Apply;
- reference OD is shown separately from design/max OD;
- canonical geometry is referenced, not duplicated into a competing product CSV.

### Stage 9 — central Engineering UI wiring

COMPLETE.

Implemented:

- `registry.js` calculation-ID pattern changed from `{2,}` to `{1,}` after the first segment;
- new `tabs/engineering-workspace-tab.js` owns internal Engineering subtabs;
- new `tabs/hp-piping-class-tab.js` embeds the full HP workspace;
- `core/engineering-tabs-extension.js` now exposes only the top-level `Engineering Calculations` item;
- prior B31.3/Empirical tab IDs are treated as subtab deep links;
- shared event-bus context is forwarded to the existing B31.3/Empirical renderers;
- static/core regression assertions added;
- Engineering UI and HP README documentation updated.

Local Stage 9 smoke evidence:

- `node --check` equivalent source smoke for registry/workspace/HP renderer: PASS;
- explicit ID regex check: `PIPE.SHELL_INDENTATION` PASS;
- source inspection confirms main-tab/subtab hierarchy and HP iframe path;
- GitHub Actions run at inspected head: none available; not claimed PASS;
- hosted-browser E2E: NOT_RUN.

## Changed-File Ledger

Final expected PR file set: 20 intentional paths.

1. `agents/PR439_workreport.md`
2. `converters/engineering-calculations/registry.js`
3. `core/engineering-tabs-extension.js`
4. `docs/EngineeringMastersUI.md`
5. `docs/Masters/HP_Piping_Class/library-catalog.csv`
6. `docs/Masters/HP_Piping_Class/material-properties.csv`
7. `docs/Masters/HP_Piping_Class/pipe-product-overrides.csv`
8. `engineering/hp-class-standardization/ENGINEERING_LIBRARIES.md`
9. `engineering/hp-class-standardization/README.md`
10. `engineering/hp-class-standardization/authority-package-core.js`
11. `engineering/hp-class-standardization/authority-package-ui.js`
12. `engineering/hp-class-standardization/authority-package.html`
13. `engineering/hp-class-standardization/engineering-library-core.js`
14. `engineering/hp-class-standardization/engineering-library-csv.js`
15. `engineering/hp-class-standardization/engineering-library-ui.js`
16. `engineering/hp-class-standardization/engineering-library.html`
17. `tabs/engineering-workspace-tab.js`
18. `tabs/hp-piping-class-tab.js`
19. `tests/engineering-calculation-console-static.test.mjs`
20. `tests/engineering-calculation-core.test.mjs`

GitHub changed-file reconciliation at Stage 9: PASS — exactly these 20 paths, no unexplained file.

## Engineering Decisions and Invariants

### Solver preservation

Stage 7–9 do not modify the merged HP calculation engine files. Baseline blobs remain:

- `engineering/hp-class-standardization/app.js` `6d99672f2e790ddfcaaa3759eef18e169afb6158`
- `engineering/hp-class-standardization/index.html` `9196edd0f89e892748c00dac249983b65effd47f`
- `engineering/hp-class-standardization/ui.js` `c3a027b2c70e11bff87546e15101b6866ad81933`
- `engineering/hp-class-standardization/styles.css` `0df7b10776acfa0bc1cbb33738a2ad0683695d80`

### Material invariant

Only exact controlled points or bounded interpolation may supply `S/Syt`. No extrapolation.

### Product invariant

Canonical pipe geometry can populate reference OD/wall, but product purchase spec, maximum permitted/design `D`, negative tolerance and purchase source must be explicit before Apply.

### Navigation invariant

`Engineering Calculations` is the sole top-level Engineering navigation item. Material-factor, empirical-tuning and HP-class tools are subordinate workspaces.

## Validation and Evidence Ledger

| Validation | Status | Evidence |
|---|---|---|
| Authority-package import guards | PASS | prior stages |
| Material exact/bounded interpolation | PASS | Stage 7 pure tests |
| Material no extrapolation | PASS | Stage 7 pure tests |
| CSV quoted-field parsing | PASS | Stage 8 pure tests |
| Header-only material CSV => zero rows | PASS | Stage 8 pure tests/source |
| NPS 4 canonical TSV expansion | PASS | Stage 8 pure benchmark |
| Product overlay blank/incomplete blocking | PASS | Stage 8 pure tests |
| Explicit max OD / tolerance requirement | PASS | Stage 8 validation |
| `PIPE.SHELL_INDENTATION` ID grammar | PASS | Stage 9 local regex smoke + retained core assertion |
| Main Engineering tab hierarchy | PASS source/static | `engineering-tabs-extension.js` + workspace source |
| HP workspace iframe wiring | PASS source/static | `hp-piping-class-tab.js` |
| JS syntax smoke for Stage 9 core modules | PASS | local `node --check` smoke |
| Final 20-file PR ledger | PASS | GitHub list |
| GitHub CI | NOT_RUN | no workflow run at inspected head |
| Hosted browser E2E | NOT_RUN | browser runner unavailable |

### Explicitly Not Validated

- correctness/licensing of future material CSV values;
- correctness of future purchase tolerances/max OD values;
- browser rendering on the deployed host;
- external document-control approval/signature;
- routed-system fatigue.

# Appendix A — Next-Agent Handover

## Current stopping point

PR #439 contains the complete current production wrapper/data/UI scope. The user-visible registry error has been corrected in source and HP Piping Class is now a subtab under the single main Engineering Calculations tab.

## Start here

Run the actual application from same-origin static hosting and select:

**Engineering → Engineering Calculations → HP Piping Class**

Confirm:

1. Engineering Calculations opens without the `PIPE.SHELL_INDENTATION` error;
2. four subtabs render;
3. HP Piping Class embeds the engineering library workspace;
4. docs CSV catalog fetch succeeds;
5. material table is blank and canonical product rows load with purchase fields blank/blocking.

## Do not redo

- B31.3/KD formulas;
- authority-package import order/snapshot isolation;
- Stage 7 interpolation/product-selection core;
- Stage 8 CSV/TSV source architecture;
- stable `PIPE.SHELL_INDENTATION` naming.

## Do not assume

- browser E2E has been run;
- blank material/product authority data are errors in the code;
- reference OD is max purchase OD;
- any default tolerance is permitted.

## Exact next recommended action

Hosted-browser verification, then merge review if acceptable.