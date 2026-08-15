# WIP-aiv-master-db-ui — AIV master DB UI wiring

## Recovery header

```text
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
HANDOVER_READINESS: READY_FOR_DRAFT_PR
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: NOT_APPLICABLE_NEW_WORK
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner request 2026-08-15 — upgrade target AIV data flow and wire UI to DB-creator masters
PR_OR_WIP: WIP-aiv-master-db-ui
BRANCH: agent/aiv-master-db-ui-wiring
BASE: main@0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
REPORT_BASIS_HEAD: fefe3764836a25de2c5c0338ca805e9f90261982
MAIN_HEAD_LAST_CHECKED: 0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
REPORT_SYNC: CURRENT
EXACT_NEXT_ACTION: open draft PR, rename this report to PR<number>_workreport.md, then inspect exact-head hosted checks
```

## Handover in 60 Seconds

The AIV workspace now consumes a **product-managed, exact-pinned master snapshot** sourced from:

```text
reallaksh19/Advanced_Analysis
dad2f1dbf8f200132c9669d275467611d51d6d3b
docs/EI data/AIV misc/masters
```

End users do **not** upload or maintain the seven DB master CSVs. The seven source files are vendored byte-for-byte under `converters/vibration/aiv/master-data/`, auto-loaded when the AIV workspace starts, re-hashed using the Git blob algorithm at runtime, structurally parsed fail-closed, and applied automatically whenever topology/dataset context becomes available.

Master enrichment is a reversible overlay. Visible `[M]` cells identify master-derived values. Explicit project/user edits remove master custody for that field and remain authoritative. Visible assumptions `[A]` remain the last fallback.

```text
explicit project/user value > exact-pinned master enrichment > visible assumption
```

No AIV equations, readiness rules, distance authority, result-scope authority, or design authority changed.

## Live ground truth / coordination

- current `main`: `0fb4be2a03aa455efe5d476c8a8ba4e82b732b95`; rechecked immediately before draft-PR preparation.
- branch status versus current main: `31 ahead / 0 behind`; merge base is current main.
- open PR483 remains draft/open and owns only generic `converters/vibration/masters/*` framework paths plus its validator/test/report. It explicitly contains no EI numerical masters and no UI behavior. Exact changed-file overlap with this WIP: **none**.
- coordination classification: `COORDINATION_REQUIRED` due shared master-governance domain; implementation avoids PR483 paths and does not create a competing generic registry.
- no `agents/MASTER_INDEX.md` exists on current main.

## Source master package — exact identity

Expected Advanced_Analysis source blobs and vendored 3D_Converters destination blobs are identical:

```text
M_COMPONENT_TYPE.csv     700f4c8da754a5ec3bc59cafd54a3581b05e5b65
M_DOCUMENT_SOURCE.csv    75894476eaddaecbcacc637a8e968dc5414d72b6
M_MATERIAL.csv           731fdd83b6f6f6ebc5ca9b964be55c508ad85ed7
M_PIPE_DIMENSION.csv     7aaee1609329f00273a40637052705eed251b30b
M_PIPING_CLASS.csv       c3c3381295b22b94354651e76af79519e44e6017
M_SOURCE_DEVICE_TYPE.csv 0019925fe1cc56945fe3a7154edefa3fb5b5dd47
M_UNIT.csv               d0364eb267d94c784a058810c5c4173cbded4d37
```

Pinned row counts:

```text
documents      15
units          27
materials      17
components     20
sourceDevices  11
pipeDimensions 137
pipingClasses  34
```

Runtime bundled loader requires exact Git-blob equality before parsing. Filename equality alone is never accepted.

## Source-data qualification caveat

This adapter verifies **identity and structural integrity**, not independent correctness of every engineering value in the DB-creator source. Source inspection identified retained caveats in the upstream snapshot, including related-but-not-exact material provenance references for A333/A350 and EI-guideline provenance used on the B444/B861 rows. The upstream validator proves schema/PK/FK/join consistency, not independent value qualification.

Therefore:

```text
engineeringQualification = NOT_ESTABLISHED_BY_ADAPTER
screeningAuthorityConferred = false
designAuthority = false
```

The source snapshot is consumed exactly; this PR does not silently repair or reinterpret its records.

## Implemented production behavior

### Master loading

1. Seven controlled master CSVs are bundled under the AIV module.
2. AIV workspace calls `loadBundledAivMasterDatabase()` at startup.
3. Each asset is fetched locally and Git-blob SHA-1 verified against the exact Advanced_Analysis source blob.
4. Header, PK uniqueness, document/material FK, and supported-domain validation fail closed.
5. UI shows auto-load status, source repo/commit/path, row counts, and authority boundary. There is no end-user master-file selector.

### Deterministic enrichment

- exact source-device mappings may fill blank `Source Device Type`;
- exact/unambiguous topology component mappings may discover assessment candidates and fill blank `Assessment Type`;
- topology + piping-class + pipe-dimension masters may fill blank main OD/ID/WT;
- deterministic branch class + pipe-dimension lookup may fill blank branch OD/WT;
- topology/material/piping-class masters may fill blank material and duplex state;
- unresolved or ambiguous joins remain unresolved;
- project/user values are never overwritten.

### Explicit non-generation boundary

Master resolution has no setter path for:

```text
Operating Case
Mass Flow
Upstream Pressure
Downstream Pressure
Upstream Temperature
Molecular Weight
Source State
Physical Distance
Applicability Disposition
Simultaneous Source Group
```

Generic topology element lengths do not become AIV physical-distance authority. Existing explicit flare-network segment/path distance authority remains unchanged.

### Reversible overlay

- `[M]` field provenance is retained separately from table values;
- editing a master-derived field converts it to explicit project/user custody;
- changing source/assessment identity or assessment type invalidates dependent `[M]` fields;
- row deletion rebases master provenance indices;
- topology/dataset replacement removes still-master-derived values and auto-discovered rows before re-resolving;
- explicit edits survive later master reapply.

## Authority / invariants

UNCHANGED:
- registered AIV ten-stage numerical kernel;
- equations, correlations, coefficients, and tolerances;
- qualification-mode mechanics;
- readiness status rules;
- explicit user-over-assumption precedence;
- flare-network explicit-segment engineering-distance authority;
- SVG/presentation coordinates non-authoritative for distance;
- Assessment LOF is the screening result scope;
- Line/Case summary remains non-authoritative for screening;
- `.eit` import/export contracts;
- `designAuthority=false`.

Master integration itself confers no new screening or design authority.

## Findings / decisions

- `IMP-001 CLOSED`: master source is pinned by source repository + commit + path + exact seven Git blobs.
- `IMP-002 CLOSED`: bundled destination blobs were remotely inspected and equal the source blobs 7/7.
- `IMP-003 CLOSED`: ordinary users no longer select master files; the product auto-loads the controlled snapshot.
- `IMP-004 CLOSED`: master-derived values are visibly marked `[M]` and assumptions remain `[A]`.
- `IMP-005 CLOSED`: master overlay is reversible and explicit user edits retain precedence.
- `RISK-001 CONTROLLED`: ambiguous source/discontinuity semantic mapping remains unresolved.
- `RISK-002 CONTROLLED`: generic topology does not generate physical AIV distance.
- `RISK-003 CONTROLLED`: PR483 domain overlap exists but no path overlap; this PR stays AIV-specific.
- `RISK-004 OPEN_SOURCE_DATA`: source DB engineering provenance/value caveats remain upstream; adapter does not promote authority.
- `DEC-001`: use a pinned AIV-specific adapter rather than modifying PR483's generic registry in parallel.
- `DEC-002`: vendor byte-identical source assets so the browser has deterministic offline/local product access.
- `DEC-003`: data-origin precedence is `explicit > master > assumption`.

## Existing-file recovery blobs / backup truth

Immutable pre-edit blobs:

```text
tabs/vibration-aiv-qualification-tab.js  d7c8b2c8af7c5ddcc062168f087bbec07e7a4df7
tabs/vibration-aiv-input-view.js         ddbd7c4692bd7a080523f68a8e11c5ac67d18c09
package.json                              e786f685b4a9673c789d1aabdde17f8a96c872c7
```

`tabs/vibration-aiv-state.js` was inspected (`021f6a89a483c0d7de820e6c59ebe35f322fe139`) but not modified.

Repository backup command: **NOT_RUN / ENVIRONMENT_BLOCKED**. This session is connector-only; container DNS cannot reach GitHub and `gh` is unavailable. Do not represent the repository backup CLI as executed.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| current main grounding | PASS | REMOTE_EXECUTION | NONE | `0fb4be2...` rechecked |
| branch drift | PASS | REMOTE_EXECUTION | NONE | 31 ahead / 0 behind before this report update |
| PR483 exact-file overlap | PASS | SOURCE_INSPECTION | NONE | no overlap; coordination domain only |
| Advanced_Analysis source file identities | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | exact commit/path/blobs |
| vendored master byte identity | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | destination Git blobs equal source 7/7 |
| new module size policy | PASS | SOURCE_INSPECTION | NONE | master modules/controller/view/loader all <300 lines |
| focused draft core/static checks | PASS | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | 6/6 on pre-auto-load draft; superseded by stronger final test files, not claimed as final exact-head run |
| bundled identity regression file | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | implemented and registered; no local checkout runtime |
| `verify:aiv-input-model` | NOT_RUN | NOT_OBSERVED | MIXED | connector-only runtime |
| `verify:aiv-screening-release` | NOT_RUN | NOT_OBSERVED | MIXED | connector-only runtime |
| full `verify:aiv-canvas-release` | NOT_RUN | NOT_OBSERVED | MIXED | connector-only runtime |
| real-browser master auto-load/enrichment | NOT_RUN | NOT_OBSERVED | NONE | pending acceptance |
| repo backup CLI | NOT_RUN | NOT_OBSERVED | NONE | ENVIRONMENT_BLOCKED |

No unexecuted test is claimed PASS.

## Changed-file ledger

### Production / reference
- `converters/vibration/aiv/aiv-master-db-reference.js` — exact source pin, schema specs, Git blob hashing.
- `converters/vibration/aiv/aiv-master-db.js` — structural fail-closed parser/validator.
- `converters/vibration/aiv/aiv-master-db-resolver.js` — deterministic blank-only master enrichment.
- `converters/vibration/aiv/aiv-master-db-bundled.js` — auto-load and exact runtime blob verification.
- `converters/vibration/aiv/master-data/M_COMPONENT_TYPE.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_DOCUMENT_SOURCE.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_MATERIAL.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_PIPE_DIMENSION.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_PIPING_CLASS.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_SOURCE_DEVICE_TYPE.csv` — exact source blob.
- `converters/vibration/aiv/master-data/M_UNIT.csv` — exact source blob.
- `tabs/vibration-aiv-master-db-controller.js` — master lifecycle + reversible overlay.
- `tabs/vibration-aiv-master-db-view.js` — auto-loaded status/provenance panel; no end-user DB upload.
- `tabs/vibration-aiv-dataset-loader.js` — split existing dataset loading and trigger silent master re-resolution.
- `tabs/vibration-aiv-input-view.js` — `[M]` origin display and master-aware working-table copy.
- `tabs/vibration-aiv-qualification-tab.js` — auto-load master controller and dataset integration.

### Tests / registration
- `tests/vibration-aiv-master-db.test.mjs` — hashing/parser/resolver/precedence tests.
- `tests/vibration-aiv-master-db-bundled.test.mjs` — exact vendored-blob and controlled-row-count regression.
- `tests/vibration-aiv-master-db-ui.test.mjs` — auto-load/no-upload UI and no-process/distance-generation guards.
- `package.json` — registers the three master regressions in `verify:aiv-input-model`.

### Recovery
- `agents/WIP-aiv-master-db-ui_workreport.md` — this living report; rename after PR number exists.

## Appendix A — critical next-agent questionnaire

### A1 Production Trace — 19/20
Trace one master-derived Assessment OD from topology to UI.

Expected answer: topology `canonicalId/type/dnInMm/schedule/pipingClass` → exact component mapping / main PIPE class → `M_PIPE_DIMENSION` → resolver blank-only write with source commit/master record trace → `[M]` badge → assumption resolver only fills remaining blanks. Explicit value stops the master write.

### A2 Current Failure Isolation — 19/20
If `[M]` values do not appear, isolate in this order: bundled asset fetch → Git blob verification → structural DB parse → topology availability → exact semantic mapping → piping-class match → dimensional uniqueness → table blank/explicit precedence → UI trace map. Do not alter equations or assumptions to hide a join failure.

### A3 Authority / Invariant — 20/20
The adapter may enrich reference inputs but cannot promote engineering/screening/design authority. It must never derive generic-topology AIV distance, overwrite explicit data, invent process-case values, or treat source identity verification as engineering-value qualification.

### A4 Independent Validation — 18/20
Strongest independent check currently available is exact cross-repository Git-blob equality 7/7 against the owner-provided Advanced_Analysis commit. Native Node/full AIV/browser runs remain NOT_RUN in this connector-only session and must be executed before claiming runtime qualification.

### A5 Next Commit / Minimal Patch — 19/20
After PR creation, only reconciliation/report/check-status changes are expected. If hosted CI exposes a product defect, patch the smallest failing master adapter/UI path while protecting the authority boundary above. Do not modify the source master values in this repo.

**Appendix A score: 95/100; every section >=18/20.**
