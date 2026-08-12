# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Extend the HP piping class standardization tool with controlled authority-package transport plus editable material/property and pipe-product libraries. |
| Source task / issue | Owner instruction: create configurable material/property and pipe-product tables editable via UI. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD | `b49cbcd5e691596a33b1eacd12eae4d392ab72bc` before Stage 7 pre-plan update |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 7 — configurable engineering libraries — IN_PROGRESS |
| Last completed stage | Stage 6 — authority-package validation / handover |
| Engineering status | Package import/export is validated. Stage 7 adds user-editable controlled material/property and pipe-product datasets without changing the merged calculation engine. |
| Validation status | Stage 6 PASS. Stage 7 validation NOT_RUN until implementation. |
| Current blocker | No reusable controlled UI tables currently exist for S/Syt versus temperature or product dimensions/tolerances. |
| Exact next action | Implement empty-by-default editable material/property and product tables in the package wrapper, add bounded interpolation and explicit apply actions, persist them through authority-package JSON, then run focused regression checks. |

## Handover in 60 Seconds

**What is now true**

- PR #437 merged the B31.3/KD straight-pipe calculator.
- PR #439 already adds versioned JSON authority-package import/export around the unchanged calculator.
- Stage 7 is authorized to add configurable engineering tables inside the same wrapper PR.

**What is being worked on**

- Material/property table: material spec, grade/condition, temperature, S, Syt, source/version.
- Pipe-product table: NPS/product spec, OD basis, nominal wall, minus tolerance, source/version.
- Explicit UI actions to apply selected controlled values to the calculator.
- Bounded interpolation with no extrapolation.
- JSON package persistence of the editable tables.

**What remains unfinished**

- Production implementation and validation of Stage 7.
- Browser E2E remains unavailable in this environment.

**What must not be assumed**

- No material/property or product values may be silently defaulted.
- Interpolation outside a controlled temperature range is prohibited.
- Product tolerance is not universally 12.5%.
- Selecting a library row does not constitute engineering approval; source/version metadata remains required.

**Highest-risk remaining item**

`RISK-017` — configurable libraries could become hidden engineering defaults or permit uncontrolled extrapolation.

**Exact next action**

Add a focused library core module and wrapper UI, integrate package persistence, then validate interpolation/range/application behavior while confirming solver blobs remain unchanged.

## Mission and Engineering Intent

### Mission

Make controlled production data reusable through editable UI tables while preserving explicit engineering authority and auditability.

### Engineering consequence

An engineer should be able to enter an approved material property dataset and product dimension dataset once, use them across class candidates, export them with the authority package, and re-import them without manual re-entry or hidden defaults.

### Stage 7 scope

Included:

- editable material/property rows;
- editable pipe-product rows;
- table source ID/version fields;
- add/remove rows;
- material/grade selection and target-temperature evaluation;
- exact-point or bounded linear interpolation for S and Syt only when bracketed;
- hard no-extrapolation behavior;
- explicit apply-to-calculator actions;
- product row application to D, candidate wall, product spec and minus tolerance;
- authority-package JSON persistence;
- visible validation/status messages;
- README/report updates.

Excluded:

- preloaded ASME proprietary material values;
- automatic web/database lookup;
- silent product/material defaults;
- changing the merged `app.js` equations;
- routed-system fatigue.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Authority-package transport | HIGH | VALIDATED | 4–6 | existing package tests |
| Editable material table | HIGH | IN_PROGRESS | 7 | pending implementation |
| S/Syt bounded interpolation | CRITICAL | IN_PROGRESS | 7 | pending pure tests |
| No-extrapolation gate | CRITICAL | IN_PROGRESS | 7 | pending pure tests |
| Editable product table | HIGH | IN_PROGRESS | 7 | pending implementation |
| Explicit apply actions | HIGH | IN_PROGRESS | 7 | pending integration |
| Table source/version metadata | HIGH | IN_PROGRESS | 7 | pending implementation |
| JSON persistence of tables | HIGH | IN_PROGRESS | 7 | pending round-trip test |
| Solver blob preservation | CRITICAL | VALIDATED / MUST REMAIN | 3/6/7 | app/index/ui/styles baseline hashes |
| Browser E2E | MEDIUM | NOT_RUN | 7 | runner unavailable |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-013 | release risk | CRITICAL | MITIGATED | Imported snapshots never become solver authority. | YES |
| RISK-014 | source risk | HIGH | MITIGATED | B31.3/KD source mismatch blocks package application. | YES |
| RISK-015 | evidence risk | HIGH | MITIGATED | Row evidence restore uses exact recalculated keys. | YES |
| RISK-017 | engineering-data risk | CRITICAL | IN_PROGRESS | Library values must not become silent defaults or allow extrapolation. | YES |
| RISK-018 | product-data risk | HIGH | IN_PROGRESS | Product minus tolerance must remain source-specific, not assumed universal. | YES |
| DEC-013 | decision | HIGH | ACCEPTED | Imported result snapshots are audit-only; calculator recalculates. | YES |
| DEC-017 | decision | HIGH | ACCEPTED | Wrapper architecture preserves merged solver blobs. | YES |
| DEC-018 | decision | HIGH | ACCEPTED | Libraries are empty by default and populated only by user-controlled data. | YES |
| DEC-019 | decision | HIGH | ACCEPTED | Material evaluation uses exact point or bounded linear interpolation; no extrapolation. | YES |
| DEC-020 | decision | HIGH | ACCEPTED | Applying library values to calculator fields requires an explicit user action. | YES |
| IMP-022 | improvement | HIGH | IN_PROGRESS | Controlled material/property and pipe-product libraries. | YES |

## Stage Roadmap

### Stages 1–6 — authority-package workflow

COMPLETE. See Git history and prior report revisions for implementation history. Final Stage 6 invariants remain active:

- source/schema validation before mutation;
- input restoration then recalculation;
- exact row-evidence matching;
- snapshots audit-only;
- merged solver/UI blobs unchanged.

### Stage 7 — configurable engineering libraries

**Current truth**: wrapper has package metadata/import/export but no reusable engineering datasets.

**Objective**: create usable editable tables and explicit calculator application without embedding Code data.

**Expected files**:

- `engineering/hp-class-standardization/engineering-library-core.js` — new pure validation/interpolation helpers;
- `engineering/hp-class-standardization/authority-package.html` — table UI and controls;
- `engineering/hp-class-standardization/authority-package-ui.js` — UI editing/apply/persistence integration;
- `engineering/hp-class-standardization/authority-package-core.js` — package library validation/persistence support;
- `engineering/hp-class-standardization/README.md`;
- this report.

**Engineering rationale**: reusable production datasets reduce manual transcription while source/version fields and bounded interpolation preserve authority.

**Planned behavior**:

1. Tables start empty.
2. Operator enters dataset source ID/version.
3. Material rows carry material spec, grade/condition, temperature, S and Syt.
4. Product rows carry NPS/tag, product spec, OD, nominal wall and minus tolerance.
5. Material evaluation groups exact material/grade and finds exact or bracketing temperatures.
6. Extrapolation is rejected.
7. Product application uses the selected exact row only.
8. Applying values updates calculator inputs but still requires normal calculator validation/recalculation.
9. Tables are exported/imported through the authority package.

**Edge cases**:

- duplicate material temperature for same material/grade;
- incomplete numeric cells;
- target temperature outside dataset;
- only one material point and nonexact temperature;
- product row missing tolerance/source;
- duplicate product identity;
- package created before Stage 7 with no libraries;
- corrupted package libraries.

**Planned validation**:

- JS syntax;
- exact-point material lookup;
- bounded interpolation;
- no extrapolation;
- duplicate/incomplete-row rejection;
- exact product row application mapping;
- package round trip with libraries;
- backward compatibility for v1 packages with no `libraries` member;
- merged solver blob preservation;
- final changed-file ledger.

**Stage decision**: IN_PROGRESS.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR439_workreport.md` | 1 | 7 | Mission control / evidence / handover | YES | Stage 7 pre-plan recorded |
| `engineering/hp-class-standardization/README.md` | 4 | 7 planned | Operator/package/library documentation | YES | pending |
| `engineering/hp-class-standardization/authority-package.html` | 4 | 7 planned | Production package + library UI | YES | pending |
| `engineering/hp-class-standardization/authority-package-core.js` | 4 | 7 planned | Package validation/import authority | YES | pending |
| `engineering/hp-class-standardization/authority-package-ui.js` | 4 | 7 planned | Package/library production integration | YES | pending |
| `engineering/hp-class-standardization/engineering-library-core.js` | 7 planned | 7 planned | Pure controlled table validation/interpolation | YES | pending |

## Engineering Decisions and Invariants

### Solver authority invariant

`app.js`, `index.html`, `ui.js`, and `styles.css` remain calculator authority and are not to be modified for Stage 7.

Baseline blobs:

- `app.js` `6d99672f2e790ddfcaaa3759eef18e169afb6158`
- `index.html` `9196edd0f89e892748c00dac249983b65effd47f`
- `ui.js` `c3a027b2c70e11bff87546e15101b6866ad81933`
- `styles.css` `0df7b10776acfa0bc1cbb33738a2ad0683695d80`

### Material-library invariant

No result is returned outside the entered temperature range. Exact points are used directly; otherwise interpolation requires valid lower/upper points for the same material specification and grade/condition.

### Product-library invariant

Only an explicitly selected product row may populate calculator dimension/tolerance inputs. No nearest-size or schedule guessing is allowed.

### Package invariant

Library data are controlled inputs transported by the package. They are not calculated output snapshots.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 6 package suite | PASS | prior Stage 6 | report/history |
| Library core syntax | NOT_RUN | — | Stage 7 |
| Material exact lookup | NOT_RUN | — | Stage 7 |
| Material interpolation | NOT_RUN | — | Stage 7 |
| No extrapolation | NOT_RUN | — | Stage 7 |
| Product row validation | NOT_RUN | — | Stage 7 |
| Package library round trip | NOT_RUN | — | Stage 7 |
| Solver blob preservation | NOT_RUN | — | Stage 7 final |
| Browser E2E | NOT_RUN | — | runner unavailable |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| No silent material defaults | NOT_RUN | Stage 7 UI/core inspection |
| No material extrapolation | NOT_RUN | pure tests |
| Product tolerance remains row/source-specific | NOT_RUN | UI/core tests |
| Applying library data remains explicit | NOT_RUN | UI integration inspection |
| Existing B31.3/KD equations unchanged | PASS baseline / recheck required | blob comparison |

### Explicitly Not Validated

- correctness of user-entered material/property data;
- correctness of user-entered product dimensions/tolerances;
- licensed-table provenance beyond entered source/version metadata;
- routed-system fatigue;
- browser E2E.

## Known / Deferred Work and Forward Sequence

After Stage 7, possible later work includes organization-managed library files, signed document-control records, and server-side storage. Those must not replace explicit source/version authority or introduce hidden defaults.

# Appendix A — Next-Agent Handover

## Current stopping point

PR #439 has a validated authority-package workflow and an approved Stage 7 plan for editable engineering libraries. Production Stage 7 code has not yet been committed at this report revision.

## Start here

Implement `engineering-library-core.js`, then connect it only through `authority-package.html` / `authority-package-ui.js`. Preserve the four solver/UI baseline blobs exactly.

## Do not redo

- B31.3/KD calculations;
- JSON package authority ordering;
- snapshot exclusion;
- row-evidence exact matching.

## Do not assume

- 12.5% tolerance is universal;
- interpolation outside the entered material range is acceptable;
- a library row is approved merely because it exists;
- tables may ship with hidden default engineering data.

## Highest-risk remaining item

`RISK-017` — configurable tables becoming an uncontrolled default database.

## Exact next recommended action

Add pure library validation/interpolation helpers with tests first, then UI editing/apply/persistence integration.
