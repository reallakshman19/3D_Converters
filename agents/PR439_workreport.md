# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Extend the merged HP piping class standardization tool with controlled production authority-package import/export and reproducibility checks. |
| Source task / issue | Owner instruction after merge of PR #437: continue production data/authority population work without inventing project values. |
| PR number | 439 |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD | report-allocation commit; refresh after Stage 3 |
| PR status | DRAFT / OPEN |
| Current stage | Stage 3 — changed-file / repository-state verification |
| Last completed stage | Stage 2 — PR allocation + report synchronization |
| Engineering status | Existing PR #437 straight-pipe class workflow is merged. This PR adds controlled transport/reproducibility of production inputs/evidence only. |
| Validation status | Stage 1/2 protocol checks PASS. Production validation NOT_RUN. |
| Current blocker | No persistent controlled package exists to move approved project/material/product/KD inputs between sessions or reviewers. |
| Exact next action | Verify branch/base and merged production files, then update this report before Stage 4 implementation. |

## Handover in 60 Seconds

**What is now true**

- PR #437 merged as `fc222b80845273f2fb2bc83f401d8c29f52abb74`.
- PR #439 is the only active continuation PR for production authority-package work.
- No production file has been changed in PR #439 yet.
- Existing calculation authority remains in the merged B31.3/KD engine.

**What is being worked on**

- JSON authority-package export/import through the real static UI.
- Source-lock validation and recalculate-on-import.

**What remains unfinished**

- package metadata and schema;
- export/import UI;
- source compatibility checks;
- deterministic row evidence restore;
- audit-only result snapshot;
- regression validation.

**What must not be assumed**

- imported calculated outputs are authoritative;
- source mismatches are acceptable;
- missing material/KD/product data may be defaulted;
- row approvals may be attached to a different wall/cycle.

**Highest-risk remaining item**

`RISK-013` — imported JSON accidentally becoming calculation authority.

**Exact next action**

Verify the PR baseline and production files, then implement Stage 4 after refreshing the report.

## Mission and Engineering Intent

### Mission

Make the existing piping-class qualification usable as a controlled handover workflow: configure → export → review/archive → import → recalculate → verify release state.

### Engineering consequence

Operators should no longer need to manually re-enter the full class basis and KD evidence. A package should be portable and auditable while never bypassing the calculation engine.

### In scope

- package metadata;
- dependency-free JSON export/import;
- engineering-input/evidence/cycle-spectrum serialization;
- source-lock validation;
- recalculation after import;
- row-level evidence restoration after key matching;
- audit-only calculated snapshot;
- visible import/package status;
- README and report updates.

### Explicit non-goals

- no licensed ASME dataset embedded;
- no guessed VIII-3/material/product values;
- no external database/service;
- no cryptographic signing;
- no routed-system fatigue;
- no change to PR #437 engineering equations.

### Governing principles

1. Imported calculated outputs are never solver authority.
2. Import restores controlled inputs/evidence, then recalculates.
3. B31.3/KD source identities are compatibility invariants.
4. Missing values remain visible blockers.
5. Row evidence is keyed to deterministic wall/cycle identity.
6. JSON remains human-readable and dependency-free.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Report initialization | HIGH | DONE | 1 | `PR_PENDING` report created before code |
| PR allocation | HIGH | DONE | 2 | Draft PR #439 |
| Report rename | HIGH | DONE | 2 | `agents/PR439_workreport.md` |
| Baseline verification | HIGH | IN_PROGRESS | 3 | pending production fetch/compare |
| Package metadata UI | HIGH | NOT_STARTED | 4 | — |
| JSON package export | HIGH | NOT_STARTED | 4 | — |
| JSON package import | HIGH | NOT_STARTED | 4 | — |
| Source-lock validation | HIGH | NOT_STARTED | 4 | — |
| Recalculate-on-import | CRITICAL | NOT_STARTED | 4 | — |
| Row evidence restore | HIGH | NOT_STARTED | 5 | — |
| Audit-only result snapshot | MEDIUM | NOT_STARTED | 5 | — |
| Regression validation | HIGH | NOT_STARTED | 6 | — |
| Final changed-file ledger check | HIGH | NOT_STARTED | 6 | — |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-013 | engineering/release risk | CRITICAL | IN_PROGRESS | Imported calculated values must never become calculation authority. | YES |
| RISK-014 | engineering/release risk | HIGH | IN_PROGRESS | Imported package may reference different B31.3/KD artifacts. | YES |
| RISK-015 | engineering/release risk | HIGH | IN_PROGRESS | Row approvals can be restored to wrong wall/cycle if keying is unstable. | YES |
| DEC-013 | deliberate decision | HIGH | ACCEPTED | Import restores inputs/evidence and recalculates; snapshot outputs are audit-only. | YES |
| DEC-014 | deliberate decision | HIGH | ACCEPTED | Package format is versioned dependency-free JSON. | YES |
| DEC-015 | deliberate decision | HIGH | ACCEPTED | No licensed Code datasets are added to source control. | YES |
| DEC-016 | deliberate decision | HIGH | ACCEPTED | Source mismatch blocks package application rather than warning-only continuation. | YES |
| IMP-020 | improvement opportunity | HIGH | IN_PROGRESS | Operator-visible authority package import/export. | YES |
| IMP-021 | improvement opportunity | MEDIUM | NOT_STARTED | Downloadable audit snapshot/bundle. | YES |
| QST-010 | unresolved question | MEDIUM | ACCEPTED | Cryptographic signing is explicitly out of scope. | YES |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

**Implementation performed:** created `agents/PR_PENDING_workreport.md` before production changes.

**Validation:** protocol ordering PASS.

**Stage decision:** COMPLETE.

### Stage 2 — PR allocation + report synchronization

**Implementation performed:** created draft PR #439 and renamed the living report to `agents/PR439_workreport.md`.

**Validation:** PR allocated from expected branch/base; PASS.

**Stage decision:** COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Current truth:** branch is based on the squash merge of PR #437.

**Objective:** confirm production baseline and isolate changed-file scope before editing.

**Expected scope/files:** report only.

**Engineering rationale:** persistence must be added without silently changing calculation equations.

**Planned validation:** fetch current production files; compare PR changed files; record baseline blob IDs.

**Known risks:** `RISK-013`–`RISK-015`.

### Stage 4 — Production authority package core

**Objective:** real operator-visible package export/import.

**Planned implementation:**

- package metadata fields;
- schema/version and embedded source identity manifest;
- serialize design basis, cycle blocks, KD controls, curve data and fracture disposition;
- download JSON;
- import JSON from file;
- strict package/source validation;
- restore inputs then call existing calculation pipeline;
- visible import status.

**Expected files:** `index.html`, `app.js` and preferably a focused `authority-package.js` module under 300 lines; README; report.

**Planned validation:** syntax; round trip; source mismatch block; missing/invalid package block; existing B31.3 reference unchanged.

### Stage 5 — Row evidence + audit snapshot

**Objective:** preserve row source/approval state without turning serialized results into solver authority.

**Planned implementation:** restore row evidence after recalculation/key match; include result snapshot for audit only.

**Validation:** mutate snapshot before import; calculated outputs must still reproduce from inputs.

### Stage 6 — Final validation / ledger / handover

Run focused validation, compare GitHub changed-file list to ledger, update PR body and handover.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR439_workreport.md` | 1 | 3 | Living mission control / evidence / handover | YES | PASS — created before production edits |

Temporary predecessor `agents/PR_PENDING_workreport.md` must be deleted as part of Stage 2 synchronization and must not remain in final PR scope.

## Engineering Decisions and Invariants

### DEC-013 — Recalculate on import

**Invariant:** imported result snapshots never drive the solver.

**Enforcement:** import pipeline applies only inputs/evidence, then invokes current calculation functions.

**Validation:** deliberately alter snapshot outputs in a test package; imported calculated values must ignore the altered snapshot.

### DEC-016 — Source mismatch blocks application

**Invariant:** package source manifest must match running B31.3/KD source identities before engineering fields are applied.

**Validation:** alter a source commit/blob in the package and confirm no engineering fields are mutated.

### Row identity invariant

Wall/cycle row evidence may be restored only when both deterministic nominal-wall key and cycle ID match the recalculated model.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Report existed before production edits | PASS | Stage 1 | GitHub history |
| PR allocation / correct base | PASS | `60aa651...` | PR #439 metadata |
| Baseline file verification | NOT_RUN | — | Stage 3 |
| JS syntax | NOT_RUN | — | Stage 4 |
| Package round trip | NOT_RUN | — | Stage 4 |
| Source mismatch rejection | NOT_RUN | — | Stage 4 |
| Snapshot non-authority | NOT_RUN | — | Stage 5 |
| Existing numerical regression | NOT_RUN | — | Stage 4/6 |
| Final PR file ledger | NOT_RUN | — | Stage 6 |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| PR #437 calculation equations unchanged | NOT_RUN | Stage 3/6 comparison |
| Imported package cannot directly overwrite results | NOT_RUN | Stage 5 |
| B31.3/KD source mismatch blocks application | NOT_RUN | Stage 4 |
| Row evidence maps only to matching wall/cycle | NOT_RUN | Stage 5 |

### Explicitly Not Validated

- project-specific material values;
- project-specific fatigue-curve values;
- authenticity/signatures outside Git/source IDs;
- external document-control approval;
- routed-system fatigue.

## Known / Deferred Work and Forward Sequence

### Open risks

`RISK-013`, `RISK-014`, `RISK-015`.

### Deferred improvements

- organization material/product libraries;
- external document-control service;
- cryptographic signing;
- server-side project storage.

### Recommended forward sequence

1. Finish package transport/recalculation safeguards.
2. Add deterministic evidence restoration and audit snapshot.
3. Validate and merge this persistence layer.
4. Only then consider controlled material/product libraries.

# Appendix A — Next-Agent Handover

## Current stopping point

PR #439 allocated. Production implementation has not started.

## PR / branch / HEAD

- PR: #439
- Branch: `agent/hp-class-authority-packages`
- Base: `fc222b80845273f2fb2bc83f401d8c29f52abb74`
- HEAD: refresh after report rename/delete operation

## Last completed stage

Stage 2 — PR allocation + report synchronization.

## Current active stage

Stage 3 — baseline verification.

## Start here

Fetch `engineering/hp-class-standardization/index.html`, `app.js`, `ui.js`, `README.md`, and the PR changed-file list. Record their baseline blob IDs before Stage 4.

## Do not redo

- PR #437 B31.3/KD calculations;
- source artifact identification;
- automatic pressure-only `Seq` framework;
- controlled-curve `Ni` interpolation.

## Do not assume

- imported outputs are solver inputs;
- source mismatch is non-blocking;
- approval evidence can be restored before recalculation/key matching.

## Files currently involved

`agents/PR439_workreport.md` only after pending-report deletion.

## Known failing checks

None; production tests NOT_RUN.

## Validation still required

Baseline verification; round trip; source mismatch; snapshot non-authority; row evidence restore; numerical regression; final file ledger.

## Highest-risk remaining item

`RISK-013` — import bypassing the current solver authority.

## Exact next recommended action

Complete Stage 3, update this report with baseline blob IDs and Stage 4 pre-plan, then implement package export/import.

## Required reading

- `CodingRules.md` commit `43eccc27967ecec7d67513c08255398b496be5ce`
- merged `agents/PR437_workreport.md`
- production app files under `engineering/hp-class-standardization/`
