# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Provide a controlled HP piping-class workspace with authority-package transport plus editable material/property and pipe-product libraries. |
| Source task / issue | Owner instruction: create configurable material/property and pipe-product tables editable via UI. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD before final report sync | `c1394cb865ffd4ec006c0cccf4b0575daf9c11b9` |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 7 — configurable engineering libraries — COMPLETE |
| Last completed stage | Stage 7 |
| Engineering status | Authority-package workflow plus empty-by-default editable material/property and pipe-product libraries are implemented without changing the merged calculator engine. |
| Validation status | PASS for library syntax, exact lookup, bounded interpolation, no-extrapolation, duplicate validation, exact selected-product validation, empty-default UI, JSON round trip, published blob identity, and solver blob preservation. Browser E2E remains NOT_RUN. |
| Current blocker | No software blocker in current scope. Engineering correctness still depends on controlled values/source references entered by the project engineer. |
| Exact next action | Review PR #439. Use `engineering-library.html` as the full controlled workspace and populate only approved engineering datasets. |

## Handover in 60 Seconds

**What is now true**

- PR #437 merged the B31.3/KD calculator.
- PR #439 already had `authority-package.html` for controlled class-record JSON transport.
- Stage 7 adds `engineering-library.html`, which wraps the authority-package workspace and adds editable material/property and pipe-product tables.
- Both tables start empty; the repository ships no material values, pipe dimensions, wall tolerances or proprietary Code tables.
- Material application uses an exact entered temperature point or bounded linear interpolation only.
- Material extrapolation is blocked.
- Applying a material computes design `S` and every cycle-block `Syt` before mutating calculator fields; any out-of-range/incomplete cycle blocks the whole action.
- Applying a product requires one exact selected row and explicitly replaces `D`, product spec, wall tolerance/source and candidate wall.
- Libraries can be exported/imported with `hp-piping-engineering-libraries/v1` JSON.
- Existing authority-package v1 and merged calculator files remain unchanged.

**What remains unfinished**

- Browser E2E in a real static-host environment.
- Optional future organization-managed/signed library distribution.
- Actual project data population and engineering approval.

**What must not be assumed**

- 12.5% wall tolerance is universal.
- interpolation beyond the entered material temperature range is acceptable.
- a row is approved merely because it exists in the UI.
- library source/version metadata validates the technical correctness of the entered values.

**Highest-risk remaining item**

`RISK-017` — user-entered libraries must remain controlled inputs and never become hidden defaults.

**Exact next action**

Review the Stage 7 library workflow and populate a controlled test dataset through the real hosted UI.

## Mission and Engineering Intent

### Mission

Reduce repeated manual transcription of class-standardization inputs while preserving traceable engineering authority.

### User / engineering consequence

A reviewer can enter or import a controlled material property table and pipe-product table, apply those values explicitly to the calculator, and export the tables for reuse without embedding unverified values in source code.

### Scope

Implemented:

- material table columns: material specification, grade, condition, temperature, `S`, `Syt`, row source;
- product table columns: NPS/tag, product specification, design D/max OD, nominal wall, minus tolerance, row source;
- library ID/revision/preparer and separate material/product source-version fields;
- add/remove editable rows;
- material-group selection and design-temperature input;
- exact-point or bounded linear interpolation;
- no extrapolation;
- cycle-average `Syt` application;
- exact product selection/application;
- library JSON import/export;
- dedicated operator documentation;
- unchanged solver and authority-package implementation.

Explicit non-goals:

- no preloaded ASME material/fatigue data;
- no product schedule database;
- no nearest-size inference;
- no silent wall-tolerance default;
- no external database/service;
- no routed-system analysis.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Authority-package transport | HIGH | VALIDATED | 4–6 | existing package test suite |
| Editable material table | HIGH | VALIDATED | 7 | `engineering-library.html` / UI |
| Exact/bounded S interpolation | CRITICAL | VALIDATED | 7 | Node pure tests |
| Exact/bounded Syt interpolation | CRITICAL | VALIDATED | 7 | Node pure tests |
| No-extrapolation gate | CRITICAL | VALIDATED | 7 | out-of-range test |
| Editable product table | HIGH | VALIDATED | 7 | workspace UI |
| Product-specific tolerance | HIGH | VALIDATED | 7 | exact-row application logic |
| Explicit Apply actions | HIGH | VALIDATED | 7 | UI integration/static review |
| Empty-by-default tables | CRITICAL | VALIDATED | 7 | HTML DOM test |
| Library JSON import/export | HIGH | VALIDATED | 7 | core JSON round trip |
| Library source/version metadata | HIGH | VALIDATED | 7 | metadata validation |
| Solver blob preservation | CRITICAL | VALIDATED | 7 | exact GitHub hashes |
| Browser E2E | MEDIUM | NOT_RUN | 7 | runner unavailable |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-013 | release risk | CRITICAL | MITIGATED | Authority-package snapshots remain audit-only. | YES |
| RISK-014 | source risk | HIGH | MITIGATED | B31.3/KD source mismatch blocks package import. | YES |
| RISK-015 | evidence risk | HIGH | MITIGATED | Package row evidence uses exact recalculated keys. | YES |
| RISK-017 | engineering-data risk | CRITICAL | MITIGATED | Library tables are empty by default, require explicit sources, and require explicit Apply actions. | YES |
| RISK-018 | product-data risk | HIGH | MITIGATED | Minus tolerance comes from the selected controlled product row/source; no universal default is introduced. | YES |
| DEC-018 | decision | HIGH | ACCEPTED | Libraries ship empty and contain no hidden engineering defaults. | YES |
| DEC-019 | decision | HIGH | ACCEPTED | Material values use exact points or bounded linear interpolation only; extrapolation is prohibited. | YES |
| DEC-020 | decision | HIGH | ACCEPTED | Library values reach the calculator only through explicit Apply actions. | YES |
| DEC-021 | decision | HIGH | ACCEPTED | Reusable libraries use their own `hp-piping-engineering-libraries/v1` JSON instead of silently changing authority-package v1. | YES |
| DEC-022 | decision | HIGH | ACCEPTED | Applying a product replaces the candidate-wall list with the selected row to prevent old-family wall carryover. | YES |
| IMP-022 | improvement | HIGH | DONE | Controlled material/property and pipe-product libraries. | YES |

## Stage Execution Log

### Stages 1–6 — authority-package workflow

COMPLETE. Key invariants remain:

- source/schema validation before package mutation;
- calculator recalculation after import;
- snapshots audit-only;
- exact row-evidence matching;
- merged solver/UI blobs unchanged.

### Stage 7 — configurable engineering libraries

**Before stage**

- tables did not exist;
- production data were manually re-entered;
- no managed interpolation/range guard existed.

**Implementation performed**

Added:

- `engineering-library-core.js` — pure validation/interpolation/selection module;
- `engineering-library-ui.js` — editable table UI, import/export and explicit apply integration;
- `engineering-library.html` — full controlled workspace wrapping `authority-package.html`;
- `ENGINEERING_LIBRARIES.md` — operator/authority documentation.

Material workflow:

1. enter/import controlled rows;
2. select material spec/grade/condition;
3. enter design temperature for `S`;
4. evaluate `S` and each cycle-average `Syt`;
5. block the entire action if any required point is missing/outside range;
6. apply values and trigger normal calculator recalculation.

Product workflow:

1. enter/import product rows;
2. select one exact row;
3. require product source/version;
4. set D, product specification, minus tolerance and source;
5. replace candidate-wall list with the selected nominal wall;
6. trigger normal calculator recalculation.

**Deviation from initial Stage 7 plan**

The initial pre-plan proposed storing libraries inside authority-package v1. Implementation instead uses a separate versioned library JSON schema. Rationale: keep the already validated authority-package v1 schema backward-compatible, keep reusable datasets separate from one class-calculation record, and avoid broadening package authority semantics. This is recorded as `DEC-021`.

**Edge-case corrections during implementation**

- unrelated unfinished draft rows no longer block application of a completed selected material group/product row;
- export still validates every stored row, so incomplete rows cannot be archived as a valid library;
- blank design/cycle temperature fields are not interpreted as `0°C`;
- product source/version are mandatory before apply;
- material source/version are mandatory before apply;
- product application replaces candidate walls instead of appending across product families.

**Validation performed**

PASS:

- `node --check engineering-library-core.js`;
- `node --check engineering-library-ui.js`;
- required top-level DOM IDs present and unique;
- material table starts with 0 rows;
- product table starts with 0 rows;
- valid library schema/metadata/row validation;
- exact material lookup;
- linear interpolation benchmark: `100°C: S=150/Syt=250`, `200°C: S=130/Syt=210`, `150°C -> S=140/Syt=230`;
- `250°C` request blocked as no-extrapolation;
- duplicate material temperature rejected;
- completed selected material group remains usable with unrelated draft row;
- exact selected product valid with unrelated draft row;
- invalid selected product blocked;
- library JSON serialize/parse round trip;
- module size: core 216 lines, UI 205 lines;
- published Git blob identity matches locally tested files;
- merged calculator blobs unchanged.

Browser E2E: NOT_RUN — unavailable in current environment. The workspace is intended for same-origin static HTTP hosting.

Stage decision: COMPLETE.

## Changed-File Ledger

| File | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|
| `agents/PR439_workreport.md` | Mission control / evidence / handover | YES | PASS |
| `engineering/hp-class-standardization/README.md` | Existing authority-package documentation from Stages 4–6 | YES | PASS prior stage |
| `engineering/hp-class-standardization/authority-package.html` | Existing controlled-package wrapper | YES | PASS prior stage |
| `engineering/hp-class-standardization/authority-package-core.js` | Existing package authority logic | YES | PASS prior stage |
| `engineering/hp-class-standardization/authority-package-ui.js` | Existing package integration | YES | PASS prior stage |
| `engineering/hp-class-standardization/engineering-library.html` | New full library + package workspace | YES | PASS static/blob |
| `engineering/hp-class-standardization/engineering-library-core.js` | Pure library validation/interpolation | YES | PASS Node tests |
| `engineering/hp-class-standardization/engineering-library-ui.js` | Editable tables/apply/import-export integration | YES | PASS syntax/static review |
| `engineering/hp-class-standardization/ENGINEERING_LIBRARIES.md` | Operator/authority documentation | YES | PASS review |

GitHub actual changed-file list: **PASS — exactly nine explained paths**.

## Engineering Decisions and Invariants

### Solver authority invariant

Stage 7 does not modify the merged solver/UI files.

Final verified hashes:

- `app.js` `6d99672f2e790ddfcaaa3759eef18e169afb6158`
- `index.html` `9196edd0f89e892748c00dac249983b65effd47f`
- `ui.js` `c3a027b2c70e11bff87546e15101b6866ad81933`
- `styles.css` `0df7b10776acfa0bc1cbb33738a2ad0683695d80`

### Material-library invariant

A material application must be one material spec/grade/condition group. Exact entered points are used directly; otherwise both lower and upper controlled points are required. No extrapolation.

### Product-library invariant

Only one exact selected product row may apply. No nearest-size lookup, schedule inference or inherited candidate walls.

### Empty-default invariant

No engineering rows are created on page load. Users must add/import them.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Evidence |
|---|---|---|
| Authority-package Stage 6 suite | PASS | prior stage |
| Library core syntax | PASS | Node |
| Library UI syntax | PASS | Node |
| Library HTML IDs / empty rows | PASS | HTML parser |
| Exact material point | PASS | pure test |
| Bounded interpolation | PASS | pure test |
| No extrapolation | PASS | pure test |
| Duplicate material temperature | PASS | pure test |
| Selected product validation | PASS | pure test |
| Library JSON round trip | PASS | pure test |
| Published/local library blobs | PASS | Git SHA comparison |
| Solver blob preservation | PASS | GitHub hashes |
| Final PR changed-file ledger | PASS | GitHub list |
| Browser E2E | NOT_RUN | runner unavailable |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| No silent material/product defaults | PASS | empty table DOM + no source data constants |
| No material extrapolation | PASS | explicit range guard/test |
| Product tolerance remains source-specific | PASS | selected row + source/version requirement |
| Application is explicit | PASS | Apply buttons only; no auto-apply event |
| Existing B31.3/KD equations unchanged | PASS | exact solver blobs |
| Correctness of user-entered engineering data | NOT_RUN | remains project engineering authority |

### Explicitly Not Validated

- correctness/licensing of user-entered material values;
- correctness of user-entered pipe dimensions/tolerances;
- external document-control approval/signature;
- browser E2E;
- routed-system fatigue.

## Known / Deferred Work and Forward Sequence

No known software defect remains in Stage 7 scope.

Possible future work:

1. organization-managed signed library bundles;
2. version-diff/review UI for library changes;
3. optional curated non-proprietary product tables where licensing permits;
4. external document-control integration.

Any future managed library must preserve source/version metadata, empty/no-silent-default behavior for unknown data, and no extrapolation.

# Appendix A — Next-Agent Handover

## Current stopping point

PR #439 now contains both the controlled authority-package workflow and the configurable engineering-library workspace.

## PR / branch

- PR: #439
- Branch: `agent/hp-class-authority-packages`
- Base: `fc222b80845273f2fb2bc83f401d8c29f52abb74`
- Stage 7 production head before this final report-only sync: `c1394cb865ffd4ec006c0cccf4b0575daf9c11b9`

## Start here

Open `engineering/hp-class-standardization/engineering-library.html` on a same-origin static host.

## Do not redo

- B31.3/KD calculations;
- authority-package import order/snapshot isolation;
- Stage 7 interpolation/product selection core.

## Do not assume

- libraries contain approved project data;
- wall tolerance is universally 12.5%;
- extrapolation is permissible;
- a UI row is equivalent to an approved engineering record.

## Known failing checks

None. Browser E2E is NOT_RUN, not failing.

## Highest-risk remaining item

Future organization-managed libraries must not introduce hidden defaults or data whose source/version cannot be audited.

## Exact next recommended action

Review PR #439 in a hosted browser with one controlled test material table and one product row, then decide whether to merge or add organization-managed library distribution in a later PR.
