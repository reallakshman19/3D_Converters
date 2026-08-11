# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Extend the merged HP piping class standardization tool with controlled production authority-package import/export and reproducibility checks. |
| Source task / issue | Owner instruction after merge of PR #437: continue production data/authority population work without inventing project values. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD | `b846b17724920cf5494012f76af830591a275802` before this report update |
| PR status | DRAFT / OPEN |
| Current stage | Stage 4 — production authority package core |
| Last completed stage | Stage 3 — changed-file / repository-state verification |
| Engineering status | PR #437 calculations are frozen as baseline. PR #439 will add a separate production-consumed package wrapper rather than modifying solver/UI calculation files. |
| Validation status | Stage 1–3 PASS. Production package validation NOT_RUN. |
| Current blocker | No persistent controlled package exists to move approved project/material/product/KD inputs between sessions or reviewers. |
| Exact next action | Implement `authority-package.html` + focused package core/UI scripts and document the production path; do not modify baseline `app.js`, `index.html`, or `ui.js`. |

## Handover in 60 Seconds

**What is now true**

- PR #437 is merged as `fc222b80845273f2fb2bc83f401d8c29f52abb74`.
- PR #439 is draft/open from that exact base.
- GitHub changed-file list currently contains only `agents/PR439_workreport.md`.
- Baseline engineering blobs are frozen:
  - `app.js` = `6d99672f2e790ddfcaaa3759eef18e169afb6158`
  - `index.html` = `9196edd0f89e892748c00dac249983b65effd47f`
  - `ui.js` = `c3a027b2c70e11bff87546e15101b6866ad81933`
  - `README.md` = `036369a37d702955f43b4e8d63d1a56b0e6170b2`
- Production package work will be layered around the existing app, not inside its solver.

**What is being worked on**

A same-origin static wrapper that hosts the existing `index.html` in an iframe and adds controlled JSON package import/export around it.

**What remains unfinished**

- package schema/source manifest;
- metadata UI;
- export/import;
- strict pre-mutation validation;
- recalculation after import;
- deterministic row evidence restoration;
- audit-only snapshot;
- README and validation.

**What must not be assumed**

- imported snapshot values are solver inputs;
- source mismatches are tolerable;
- missing engineering values may be defaulted;
- a row approval may be restored without exact wall/cycle key match.

**Highest-risk remaining item**

`RISK-013` — import bypassing the merged calculation authority.

**Exact next action**

Implement the wrapper/core after this report commit, then run pure-core and integration-oriented static tests.

## Mission and Engineering Intent

### Mission

Make the class qualification portable and auditable: configure → export JSON → review/archive → import → recalculate → restore matched evidence → verify release state.

### Engineering consequence

A controlled package can move between reviewers/sessions without manual re-entry while preserving the merged calculator as the only solver authority.

### Scope

Included:

- package metadata;
- dependency-free JSON export/import;
- design/KD/cycle input transport;
- exact B31.3/KD source manifest;
- strict source/schema validation before mutation;
- recalculation after import;
- row-level manual/evidence restoration by deterministic key;
- audit-only calculated snapshot;
- visible package status;
- documentation.

Excluded:

- licensed ASME data embedding;
- guessed material/edition/product values;
- external database/network storage;
- cryptographic signing;
- routed-system analysis;
- changes to PR #437 engineering equations.

### Governing principles

1. Imported calculated outputs are never solver authority.
2. Source/schema validation occurs before any calculator DOM mutation.
3. Import restores inputs/evidence, runs the existing calculator, restores matched row evidence, then runs the existing calculator again.
4. B31.3/KD source identities must match exactly.
5. Missing production values remain missing and blocked.
6. Row evidence requires exact deterministic `wall.toFixed(4)-cycleId` matching.
7. Package transport is human-readable JSON and dependency-free.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Report initialization | HIGH | DONE | 1 | report created before code |
| PR allocation / report rename | HIGH | DONE | 2 | PR #439 / current report |
| Baseline verification | HIGH | DONE | 3 | source blob IDs + one-file PR list |
| Preserve solver blobs | CRITICAL | ACCEPTED | 3 | wrapper architecture `DEC-017` |
| Package wrapper UI | HIGH | IN_PROGRESS | 4 | pending |
| JSON package core | HIGH | IN_PROGRESS | 4 | pending |
| Source-lock validation | HIGH | IN_PROGRESS | 4 | pending |
| Recalculate-on-import | CRITICAL | IN_PROGRESS | 4 | pending |
| Row evidence restore | HIGH | NOT_STARTED | 5 | — |
| Audit-only result snapshot | MEDIUM | NOT_STARTED | 5 | — |
| Regression validation | HIGH | NOT_STARTED | 6 | — |
| Final changed-file ledger | HIGH | NOT_STARTED | 6 | — |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-013 | engineering/release risk | CRITICAL | IN_PROGRESS | Imported calculated values must never become calculation authority. | YES |
| RISK-014 | engineering/release risk | HIGH | IN_PROGRESS | Package may reference different B31.3/KD artifacts. | YES |
| RISK-015 | engineering/release risk | HIGH | IN_PROGRESS | Row approvals may map to wrong wall/cycle. | YES |
| RISK-016 | engineering/runtime risk | MEDIUM | ACCEPTED | Same-origin iframe access requires HTTP/static hosting; local `file://` behavior is browser-dependent. | YES |
| DEC-013 | deliberate decision | HIGH | ACCEPTED | Import restores inputs/evidence and recalculates; snapshots are audit-only. | YES |
| DEC-014 | deliberate decision | HIGH | ACCEPTED | Package is versioned dependency-free JSON. | YES |
| DEC-015 | deliberate decision | HIGH | ACCEPTED | No licensed Code datasets are added. | YES |
| DEC-016 | deliberate decision | HIGH | ACCEPTED | Source mismatch blocks application before mutation. | YES |
| DEC-017 | deliberate decision | HIGH | ACCEPTED | Add package workflow as a same-origin wrapper so `app.js`, `index.html`, and `ui.js` remain byte-identical to merged PR #437. | YES |
| IMP-020 | improvement opportunity | HIGH | IN_PROGRESS | Operator-visible package import/export. | YES |
| IMP-021 | improvement opportunity | MEDIUM | IN_PROGRESS | Include audit-only qualification snapshot in export. | YES |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

Implementation: report created before production edits.

Validation: ordering PASS.

Stage decision: COMPLETE.

### Stage 2 — PR allocation + report synchronization

Implementation: draft PR #439 created; report renamed; pending predecessor deleted.

Validation: base/head/PR allocation PASS.

Stage decision: COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Implementation performed**

- Confirmed PR base `fc222b80845273f2fb2bc83f401d8c29f52abb74`.
- Confirmed current PR file list contains only the living report.
- Recorded baseline blobs listed in Mission Control/Handover.

**Engineering finding**

Direct edits to `app.js` would make it harder to prove PR #437 equations are unchanged. A same-origin wrapper can provide real production package capability while consuming the merged application unchanged.

**Decision**

`DEC-017` accepted.

**Validation**

- baseline branch/base: PASS;
- changed-file isolation: PASS;
- baseline blobs recorded: PASS.

**Stage decision**: COMPLETE.

### Stage 4 — Production authority package core

**Current truth**

No package persistence exists; merged calculator is stable.

**Objective**

Provide real export/import through `authority-package.html` using the unchanged calculator iframe.

**Expected scope/files**

- new `engineering/hp-class-standardization/authority-package.html`;
- new `engineering/hp-class-standardization/authority-package-core.js` (<300 lines);
- new `engineering/hp-class-standardization/authority-package-ui.js` (<300 lines target);
- `README.md`;
- work report.

**Engineering rationale**

Keep persistence authority separate from solver authority and avoid calculation churn.

**Planned implementation**

- schema `hp-piping-class-authority-package/v1`;
- package ID/revision/project/preparer/checker/lifecycle metadata;
- exact B31.3/KD source manifest;
- collect design fields, cycle rows, KD controls and fracture evidence from iframe;
- strict source/schema/cycle-ID validation before mutation;
- JSON download and file import;
- restore inputs and cycle rows;
- invoke existing calculator via its public classic-script `calculate()` function/button.

**Expected behavior**

Invalid/mismatched packages make zero calculator mutations. Valid packages repopulate input/evidence state and recalculate.

**Edge cases**

- duplicate cycle IDs;
- malformed JSON;
- missing package metadata;
- blank engineering fields in draft package;
- iframe not yet loaded;
- source mismatch.

**Planned validation**

- Node syntax for both new JS files;
- pure schema/source validation tests;
- round-trip object test;
- source mismatch rejection;
- existing solver blobs unchanged.

**Known risks**

`RISK-013`–`RISK-016`.

### Stage 5 — Row evidence + audit snapshot

Restore row source/approval/manual values only after first recalculation and exact key match; run calculator again so automatic/manual combinations recompute correctly. Export snapshot is audit-only and ignored on import.

### Stage 6 — Final validation / ledger / handover

Run complete regression and PR ledger comparison; update report and PR body.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR439_workreport.md` | 1 | 4 | Living mission control / evidence / handover | YES | PASS so far |
| `engineering/hp-class-standardization/authority-package.html` | 4 | 4 | Production wrapper UI | YES | NOT_RUN |
| `engineering/hp-class-standardization/authority-package-core.js` | 4 | 4 | Pure package schema/source validation | YES | NOT_RUN |
| `engineering/hp-class-standardization/authority-package-ui.js` | 4 | 4 | Real iframe import/export integration | YES | NOT_RUN |
| `engineering/hp-class-standardization/README.md` | 4 | 4 | Operator instructions / authority boundary | YES | NOT_RUN |

`app.js`, `index.html`, `ui.js`, and `styles.css` are **not planned changes**.

## Engineering Decisions and Invariants

### DEC-013 — Recalculate on import

Imported snapshot values must never affect calculations. Only controlled inputs/evidence are applied; the existing calculator is invoked afterward.

### DEC-016 — Source mismatch blocks application

Package source manifest must exactly match embedded source constants before any calculator field is touched.

### DEC-017 — Wrapper preserves solver

The package layer consumes `index.html` through same-origin iframe. Calculation files remain byte-identical to merged baseline.

### Row identity invariant

Evidence restore requires an exact row `data-key` match generated by the merged calculator.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Report before production edits | PASS | Stage 1 | GitHub history |
| PR correct base | PASS | Stage 2 | PR #439 |
| Baseline changed-file isolation | PASS | Stage 3 | only work report changed |
| Baseline `app.js` blob | PASS | Stage 3 | `6d99672f...` |
| Baseline `index.html` blob | PASS | Stage 3 | `9196edd0...` |
| Baseline `ui.js` blob | PASS | Stage 3 | `c3a027b2...` |
| New JS syntax | NOT_RUN | — | Stage 4 |
| Package round trip | NOT_RUN | — | Stage 4/5 |
| Source mismatch rejection | NOT_RUN | — | Stage 4 |
| Snapshot non-authority | NOT_RUN | — | Stage 5 |
| Row evidence restore | NOT_RUN | — | Stage 5 |
| Final PR ledger | NOT_RUN | — | Stage 6 |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| PR #437 equations remain unchanged | PASS at Stage 3 baseline | solver blobs recorded; recheck Stage 6 |
| Import cannot directly overwrite calculated outputs | NOT_RUN | Stage 5 |
| Source mismatch causes zero calculator mutation | NOT_RUN | Stage 4 |
| Row evidence maps only to exact row key | NOT_RUN | Stage 5 |

### Explicitly Not Validated

- project-specific values;
- licensed data correctness;
- cryptographic authenticity;
- external document control;
- `file://` iframe interoperability;
- routed-system fatigue.

## Known / Deferred Work and Forward Sequence

Open risks: `RISK-013`–`RISK-016`.

Deferred: managed material/product libraries, external document-control integration, cryptographic signing, server-side storage.

Recommended sequence:

1. Complete package transport safely.
2. Close evidence/snapshot handling.
3. Merge persistence layer.
4. Then consider controlled material/product libraries as a separate PR.

# Appendix A — Next-Agent Handover

## Current stopping point

Stage 3 complete; no production files changed yet.

## PR / branch / HEAD

- PR #439
- branch `agent/hp-class-authority-packages`
- base `fc222b80845273f2fb2bc83f401d8c29f52abb74`

## Last completed stage

Stage 3 — baseline verification.

## Current active stage

Stage 4 — production authority package core.

## Start here

Create the three new package files listed in Stage 4. Do not edit `app.js`, `index.html`, or `ui.js`.

## Do not redo

PR #437 calculations/source work.

## Do not assume

Snapshots are solver authority; source mismatch can proceed; row approvals can be attached without exact key matching.

## Files currently involved

Living report only; planned package files + README next.

## Known failing checks

None; Stage 4 checks NOT_RUN.

## Validation still required

Syntax, schema/source validation, round trip, zero-mutation mismatch behavior, evidence restore, snapshot non-authority, final blob/PR ledger.

## Highest-risk remaining item

`RISK-013` — import bypassing solver authority.

## Exact next recommended action

Implement Stage 4 package wrapper/core and run pure tests before adding evidence restoration.

## Required reading

- `CodingRules.md` commit `43eccc27967ecec7d67513c08255398b496be5ce`
- merged `agents/PR437_workreport.md`
- current `engineering/hp-class-standardization/README.md`
