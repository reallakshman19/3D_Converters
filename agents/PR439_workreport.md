# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Provide a controlled HP piping-class workspace with authority-package transport, editable engineering libraries, and docs-backed CSV loading. |
| Source task / issue | Owner instruction: link reusable libraries to CSV formats, dynamically fetch them from `docs/...`, and create a blank material file where applicable. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD before Stage 8 | `1e2db4cc5265252c53851d1516d33a4c62d799c4` |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 8 — docs-backed CSV libraries — IN_PROGRESS |
| Last completed stage | Stage 7 — configurable engineering libraries |
| Engineering status | JSON-backed authority packages and editable UI libraries are validated. Stage 8 will add runtime loading from governed `docs/Masters/...` files without changing calculator equations. |
| Validation status | Stage 7 PASS. Stage 8 validation NOT_RUN until implementation. |
| Current blocker | Existing pipe geometry/wall master is TSV and lacks purchase-spec/minus-tolerance authority; material `S/Syt` data suitable for this Chapter IX workflow is not available as a controlled docs CSV. |
| Exact next action | Add a CSV catalog, header-only material CSV, product overlay CSV, and a fetch/parser adapter that combines the product overlay with the existing canonical pipe master. |

## Handover in 60 Seconds

### What is now true

- PR #437 merged the B31.3/KD calculation engine.
- PR #439 adds authority-package JSON transport and editable material/product UI libraries.
- `docs/Masters/NPS_OD_BORE_SCHEDULE_MASTER.tsv` is an existing governed pipe geometry/wall source at blob `7e83f7283b4ca9f35a86a45c008ca0b52a053fcc`.
- That TSV supplies NPS/OD/schedule/wall geometry but not purchase product specification or negative wall tolerance.
- `docs/Masters/b313-material-factor-master.json` exists for other B31.3 factor workflows, but it is not adopted here as the Chapter IX `S/Syt` production source.

### What is being worked on

- A docs-backed CSV catalog under `docs/Masters/HP_Piping_Class/`.
- A blank/header-only material-property CSV.
- A product overlay CSV for purchase-specific data.
- Runtime same-origin fetch from the docs catalog and source files.
- CSV import/export through the editable UI.

### What remains unfinished

- CSV files and parser/fetch module.
- Product-master TSV adapter and overlay merge.
- Fetch/reload controls in `engineering-library.html`.
- CSV validation/regression and documentation.

### What must not be assumed

- The existing pipe master provides purchase tolerance.
- ASME B36 dimension-standard rows are equivalent to a pipe purchase specification.
- Missing CSV values may be defaulted.
- Material values in another project master are automatically valid for Chapter IX `S/Syt` use.

### Highest-risk remaining item

`RISK-019` — dynamically loaded docs data must not become engineering authority unless all required purchase/material fields are explicitly complete and source-traceable.

### Exact next action

Implement the catalog + blank material CSV + product overlay + canonical TSV adapter, then validate fail-closed behavior.

## Mission and Engineering Intent

The operator should be able to maintain controlled engineering tables as ordinary repository CSV files under `docs/Masters/HP_Piping_Class/`, refresh them in the browser without rebuilding JavaScript, edit them in the UI, and download updated CSVs for reviewed repository publication.

The implementation must preserve these invariants:

1. Calculator equations remain unchanged.
2. Docs data are loaded only from explicit catalog entries.
3. Material CSV may be empty/header-only and must remain a visible blocker until populated.
4. Canonical pipe geometry/wall comes from the existing project master rather than duplicated values.
5. Purchase-spec and wall-tolerance fields are an overlay and remain blank until controlled data are supplied.
6. No extrapolation of material properties.
7. No silent `-12.5%` tolerance.
8. Applying library data remains an explicit user action.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Authority-package transport | HIGH | VALIDATED | 4–6 | prior stage |
| Editable UI libraries | HIGH | VALIDATED | 7 | prior stage |
| CSV catalog under docs | HIGH | IN_PROGRESS | 8 | pending |
| Blank material CSV template | HIGH | IN_PROGRESS | 8 | pending |
| Product overlay CSV | HIGH | IN_PROGRESS | 8 | pending |
| Canonical TSV runtime adapter | HIGH | IN_PROGRESS | 8 | pending |
| Dynamic same-origin docs fetch | HIGH | IN_PROGRESS | 8 | pending |
| CSV material parser | HIGH | IN_PROGRESS | 8 | pending |
| CSV product overlay parser/merge | HIGH | IN_PROGRESS | 8 | pending |
| CSV export from UI | MEDIUM | IN_PROGRESS | 8 | pending |
| No-default / no-extrapolation gates | CRITICAL | IN_PROGRESS | 8 | pending |
| Solver blob preservation | CRITICAL | VALIDATED | 7 | exact hashes |
| Browser E2E | MEDIUM | NOT_RUN | 8 | environment unavailable |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-017 | engineering-data risk | CRITICAL | MITIGATED | UI libraries are explicit and empty by default. | YES |
| RISK-018 | product-data risk | HIGH | MITIGATED | Product tolerance has no universal fallback. | YES |
| RISK-019 | docs-data risk | CRITICAL | IN_PROGRESS | Fetched docs rows must remain incomplete/blocking where purchase/material authority is missing. | YES |
| RISK-020 | drift risk | HIGH | IN_PROGRESS | Do not duplicate the governed NPS/OD/schedule/wall table into an independent competing CSV. | YES |
| DEC-018 | decision | HIGH | ACCEPTED | No hidden engineering defaults. | YES |
| DEC-019 | decision | HIGH | ACCEPTED | Material interpolation is bounded; no extrapolation. | YES |
| DEC-020 | decision | HIGH | ACCEPTED | Apply remains explicit. | YES |
| DEC-021 | decision | HIGH | ACCEPTED | Reusable library storage remains separate from class-record package v1. | YES |
| DEC-023 | decision | HIGH | ACCEPTED | Stage 8 uses a docs CSV catalog; geometry/wall continues to come from the existing canonical TSV. | YES |
| DEC-024 | decision | HIGH | ACCEPTED | Material CSV is header-only until controlled Chapter IX `S/Syt` data are supplied. | YES |
| DEC-025 | decision | HIGH | ACCEPTED | Product CSV is an overlay for purchase-specific fields; blank overlay values remain blockers. | YES |
| IMP-023 | improvement | HIGH | IN_PROGRESS | Docs-backed dynamic CSV library loading. | YES |

## Stage Execution Log

### Stages 1–6 — authority-package workflow

COMPLETE. Schema/source validation precedes mutation; result snapshots are audit-only; recalculation and exact row-evidence matching are preserved.

### Stage 7 — configurable engineering libraries

COMPLETE. Added editable material/property and pipe-product tables, exact/bounded material interpolation, no extrapolation, exact product selection, separate library JSON and explicit Apply actions.

### Stage 8 — docs-backed CSV libraries

#### Current truth

- UI tables currently load only from manual entry or library JSON.
- Existing governed pipe master: `docs/Masters/NPS_OD_BORE_SCHEDULE_MASTER.tsv`, blob `7e83f7283b4ca9f35a86a45c008ca0b52a053fcc`.
- The existing master has NPS, OD, bore and schedule wall values.
- It does not provide product purchase specification or negative tolerance.
- No approved Chapter IX material `S/Syt` CSV exists in the requested format.

#### Objective

Make repository docs files the reusable editable data source without copying governed geometry into JavaScript.

#### Planned files

- `docs/Masters/HP_Piping_Class/library-catalog.csv`
- `docs/Masters/HP_Piping_Class/material-properties.csv` — header-only
- `docs/Masters/HP_Piping_Class/pipe-product-overrides.csv` — header-only purchase overlay
- `engineering/hp-class-standardization/engineering-library-csv.js`
- `engineering/hp-class-standardization/engineering-library-ui.js`
- `engineering/hp-class-standardization/engineering-library.html`
- `engineering/hp-class-standardization/ENGINEERING_LIBRARIES.md`
- this work report

#### Planned behavior

1. Fetch `library-catalog.csv` from docs via relative same-origin URL.
2. Fetch the header-only material CSV and populate zero rows when it contains no data.
3. Fetch canonical NPS/OD/schedule/wall TSV.
4. Expand canonical schedule cells into product candidate rows.
5. Fetch the product overlay CSV and merge purchase-specific `productSpec`, `minusTolerancePct`, and source metadata by `nps + schedule` key.
6. Display incomplete product rows but keep Apply blocked until purchase-specific fields are complete.
7. Allow UI download of material/product CSV in the governed formats.
8. Keep JSON import/export for full working-copy portability.

#### Planned validation

- parser syntax;
- CSV quoting/blank-field handling;
- material header-only file produces zero rows;
- canonical TSV row expansion matches known NPS 4 values;
- overlay merge does not invent tolerance/product spec;
- missing overlay remains non-applicable;
- same-origin fetch paths resolve from the engineering workspace;
- solver/UI baseline hashes unchanged;
- GitHub changed-file ledger reconciled.

Stage decision: IN_PROGRESS.

## Changed-File Ledger

Current PR paths before Stage 8 production changes:

1. `agents/PR439_workreport.md`
2. `engineering/hp-class-standardization/README.md`
3. `engineering/hp-class-standardization/authority-package.html`
4. `engineering/hp-class-standardization/authority-package-core.js`
5. `engineering/hp-class-standardization/authority-package-ui.js`
6. `engineering/hp-class-standardization/engineering-library.html`
7. `engineering/hp-class-standardization/engineering-library-core.js`
8. `engineering/hp-class-standardization/engineering-library-ui.js`
9. `engineering/hp-class-standardization/ENGINEERING_LIBRARIES.md`

Stage 8 expected additions are listed in the Stage 8 plan above. Any unexplained file blocks closure.

## Engineering Decisions and Invariants

### Solver authority invariant

Do not modify the calculation engine while adding repository-backed data transport. Baseline hashes:

- `app.js` `6d99672f2e790ddfcaaa3759eef18e169afb6158`
- `index.html` `9196edd0f89e892748c00dac249983b65effd47f`
- `ui.js` `c3a027b2c70e11bff87546e15101b6866ad81933`
- `styles.css` `0df7b10776acfa0bc1cbb33738a2ad0683695d80`

### Docs source invariant

The canonical NPS/OD/schedule/wall geometry remains owned by `docs/Masters/NPS_OD_BORE_SCHEDULE_MASTER.tsv`; Stage 8 must reference/parse it, not fork its numeric content.

### Material authority invariant

The new material CSV starts blank. No `S` or `Syt` is inferred from another master or generic material family.

### Product authority invariant

Geometry may come from the canonical pipe master; purchase specification and minus tolerance must come from the explicit product overlay or user edit before Apply.

## Validation and Evidence Ledger

| Validation | Status | Evidence |
|---|---|---|
| Stage 7 library suite | PASS | prior stage |
| Existing pipe master identity | PASS | blob `7e83f728...` |
| Stage 8 CSV syntax/parsers | NOT_RUN | pending implementation |
| Header-only material behavior | NOT_RUN | pending implementation |
| Canonical TSV expansion | NOT_RUN | pending implementation |
| Overlay fail-closed behavior | NOT_RUN | pending implementation |
| Solver blob preservation | PASS before Stage 8 | baseline hashes |
| Browser E2E | NOT_RUN | runner unavailable |

### Explicitly Not Validated

- correctness/licensing of future material CSV values;
- purchase tolerances until populated by project/product authority;
- external document-control signatures;
- browser E2E;
- routed-system fatigue.

## Known / Deferred Work and Forward Sequence

After Stage 8, a future organization-controlled workflow may publish reviewed CSV revisions through normal repository review. Cryptographic signing and external document-control integration remain out of scope.

# Appendix A — Next-Agent Handover

PR #439 is actively implementing Stage 8. Start at `engineering-library.html` / `engineering-library-ui.js` and the new docs catalog. Do not alter B31.3/KD equations. Do not populate the blank material CSV with guessed/benchmark values. Do not add a default wall tolerance. Validate the NPS 4 canonical expansion against `docs/Masters/NPS_OD_BORE_SCHEDULE_MASTER.tsv` before closing the stage.