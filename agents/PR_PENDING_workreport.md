# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Extend the merged HP piping class standardization tool with controlled production authority-package import/export and reproducibility checks. |
| Source task / issue | Owner instruction after merge of PR #437: continue production data/authority population work without inventing project values. |
| PR number | PENDING |
| Branch | `agent/hp-class-authority-packages` |
| Base commit | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| Current HEAD | `fc222b80845273f2fb2bc83f401d8c29f52abb74` |
| PR status | NOT_CREATED |
| Current stage | Stage 1 — report initialization + technical findings |
| Last completed stage | PR #437 Stage 12 merged to `main` |
| Engineering status | Existing straight-pipe class workflow is merged. Production authority inputs remain manual and session-local. |
| Validation status | New-stage validation NOT_RUN. Merged PR #437 baseline remains the starting point. |
| Current blocker | No persistent controlled package exists to move approved project/material/product/KD inputs between sessions or reviewers. |
| Exact next action | Create draft PR, rename report, then implement production-consumed JSON authority-package export/import with source-lock validation and recalculation-on-import. |

## Handover in 60 Seconds

**What is now true**

- PR #437 is merged as `fc222b80845273f2fb2bc83f401d8c29f52abb74`.
- The merged tool calculates B31.3 static wall, K304.8.3 pressure stress, pressure-only KD stress pairs, controlled `Seq`, controlled-curve `Ni`, cumulative usage and class-envelope status.
- Governing B31.3/KD source identities remain explicit.

**What is being worked on**

- A controlled JSON authority package that an operator can export, review, archive and re-import through the real UI.

**What remains unfinished**

- Package metadata and schema/versioning.
- Export of engineering inputs/evidence/cycle spectrum/KD controls.
- Import validation and UI population.
- Recalculation after import so serialized calculated outputs never become solver authority.
- Preservation/restoration of row-level evidence approvals.
- Downloadable qualification bundle suitable for handover.

**What must not be assumed**

- Imported calculated values are authoritative.
- A package with mismatched B31.3/KD source identity is valid.
- Missing production material/product/KD data may be defaulted.
- Approval checkboxes alone replace underlying controlled evidence IDs.

**Highest-risk remaining item**

`RISK-013` — imported JSON accidentally becoming calculation authority instead of input/evidence transport.

**Exact next action**

Allocate the PR, rename this report, then implement package export/import with recalculation and source-lock checks.

## Mission and Engineering Intent

### Mission

Make the existing class-standardization tool usable as a controlled engineering handover workflow by allowing approved input/evidence packages to be moved between users/sessions without copying values manually.

### User / Engineering Consequence

An operator should be able to configure one class qualification, export a traceable JSON package, send/archive it, re-import it later, recalculate the model from serialized inputs, and see whether the package remains compatible with the embedded B31.3/KD source identities.

### Scope

Included:

- authority package metadata;
- JSON export through the production UI;
- JSON import through the production UI;
- schema/source validation;
- engineering-input and evidence restoration;
- cycle-spectrum restoration;
- row-level evidence/source restoration after recalculation;
- qualification snapshot included for audit only;
- explicit import status and blockers;
- README documentation.

Excluded:

- embedding licensed ASME material/fatigue data;
- guessing project VIII-3 edition;
- external database/network services;
- cryptographic document signing;
- routed-system analysis;
- changing PR #437 calculation equations.

### Governing Engineering Principles

1. Imported calculated outputs are never solver authority.
2. Recalculate from imported controlled inputs before displaying release status.
3. Exact B31.3/KD source identities are package compatibility invariants.
4. Missing production values stay missing/blocked.
5. Approval/evidence transport must remain explicit and auditable.
6. Package format must be human-readable and dependency-free.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Report initialization | HIGH | DONE | 1 | This file |
| PR allocation / report rename | HIGH | NOT_STARTED | 2 | — |
| Baseline changed-file verification | HIGH | NOT_STARTED | 3 | — |
| Package metadata UI | HIGH | NOT_STARTED | 4 | — |
| JSON package export | HIGH | NOT_STARTED | 4 | — |
| JSON package import | HIGH | NOT_STARTED | 4 | — |
| Source-lock compatibility validation | HIGH | NOT_STARTED | 4 | — |
| Recalculate-on-import authority protection | CRITICAL | NOT_STARTED | 4 | — |
| Row evidence restore | HIGH | NOT_STARTED | 5 | — |
| Qualification snapshot export | MEDIUM | NOT_STARTED | 5 | — |
| Regression validation | HIGH | NOT_STARTED | 6 | — |
| Final PR ledger check | HIGH | NOT_STARTED | 6 | — |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| RISK-013 | engineering/release risk | CRITICAL | IN_PROGRESS | Imported calculated values must never become calculation authority. | YES |
| RISK-014 | engineering/release risk | HIGH | IN_PROGRESS | A package may reference different B31.3/KD source artifacts than the running tool. | YES |
| RISK-015 | engineering/release risk | HIGH | IN_PROGRESS | Row approvals can be restored onto the wrong wall/cycle if keys are unstable. | YES |
| DEC-013 | deliberate decision | HIGH | ACCEPTED | Package import restores inputs/evidence, then recalculates; snapshot outputs are audit-only. | YES |
| DEC-014 | deliberate decision | HIGH | ACCEPTED | Package format will be dependency-free JSON with explicit schema version. | YES |
| DEC-015 | deliberate decision | HIGH | ACCEPTED | No licensed Code curve/material values are added by this PR. | YES |
| IMP-020 | improvement opportunity | HIGH | IN_PROGRESS | Add operator-visible authority package import/export. | YES |
| IMP-021 | improvement opportunity | MEDIUM | NOT_STARTED | Add downloadable qualification snapshot/bundle. | YES |
| QST-010 | unresolved question | MEDIUM | ACCEPTED | Cryptographic signing is out of scope; package uses explicit metadata and source IDs only. | YES |

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

**Current truth**: merged app is session-local and manually populated.

**Objective**: define authority-package scope and invariants.

**Expected scope/files**: `agents/PR_PENDING_workreport.md` only.

**Engineering rationale**: persistence must not alter calculation authority.

**Planned validation**: protocol compliance review.

**Stage decision**: COMPLETE.

### Stage 2 — PR allocation + report synchronization

Create draft PR from the branch, rename report to `agents/PR<NUMBER>_workreport.md`, and record PR/HEAD.

### Stage 3 — Changed-file / repository-state verification

Verify branch base equals the PR #437 merge commit and inspect the current production files before editing.

### Stage 4 — Production authority package core

Add package metadata, export/import controls, pure serialization/validation functions and real UI integration.

Expected files:

- `engineering/hp-class-standardization/index.html`
- `engineering/hp-class-standardization/app.js`
- optionally one new focused JS module under 300 lines if needed
- `engineering/hp-class-standardization/README.md`
- work report

Planned validation:

- JS syntax;
- round-trip package test;
- source mismatch rejection;
- missing field handling;
- existing NPS 4 regression unchanged.

### Stage 5 — Evidence restoration + audit snapshot

Restore row-level evidence only after recalculation; include calculated snapshot in export but never consume it as solver input.

### Stage 6 — Final validation / ledger / handover

Compare changed-file ledger to GitHub, verify PR state, update report and PR body.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living mission control / handover | YES | PASS — initialized before production edits |

## Engineering Decisions and Invariants

### DEC-013 — Recalculate on import

**What must remain true**: serialized calculated outputs cannot alter current engineering results.

**Where enforced**: import pipeline restores only approved input/evidence fields, then calls the existing calculation engine.

**How validated**: mutate exported snapshot outputs before import and verify recalculated values remain governed by inputs.

**Does this PR change the invariant?**: It introduces and enforces the invariant.

### DEC-014 — JSON transport

**What must remain true**: the package remains human-readable, dependency-free and portable through static hosting.

### DEC-015 — No licensed data embedding

**What must remain true**: the package mechanism transports user-controlled licensed values but does not add proprietary Code datasets to source control.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 1 report exists before production edits | PASS | `fc222b8...` base + report commit | repository file |
| JS syntax | NOT_RUN | — | Stage 4 |
| Round-trip package | NOT_RUN | — | Stage 4 |
| Source mismatch rejection | NOT_RUN | — | Stage 4 |
| Snapshot non-authority test | NOT_RUN | — | Stage 5 |
| PR changed-file comparison | NOT_RUN | — | Stage 6 |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Existing PR #437 engineering equations unchanged | NOT_RUN | compare after implementation |
| Imported package cannot override calculated results directly | NOT_RUN | Stage 5 regression |
| Source identity mismatch is visible/blocking | NOT_RUN | Stage 4 regression |

### Explicitly Not Validated

- project-specific material values;
- project-specific fatigue curve values;
- external document-control approval;
- cryptographic authenticity/signatures;
- routed-system fatigue.

## Known / Deferred Work and Forward Sequence

### Open risks

- `RISK-013`, `RISK-014`, `RISK-015`.

### Deferred improvements

- managed organization material/product libraries;
- cryptographic signing / external document-control integration;
- server-side project storage.

### Recommended Forward Sequence

1. Implement JSON authority package import/export.
2. Validate exact round trip and source locks.
3. Add audit-only result snapshot and row evidence restoration.
4. Only after this persistence path is stable, consider controlled material/product libraries.

# Appendix A — Next-Agent Handover

## Current stopping point

PR #437 is merged. New branch `agent/hp-class-authority-packages` exists from merge commit `fc222b80845273f2fb2bc83f401d8c29f52abb74`. No production files have been changed on this branch yet.

## PR / branch / HEAD

- PR: PENDING
- Branch: `agent/hp-class-authority-packages`
- Base: `fc222b80845273f2fb2bc83f401d8c29f52abb74`
- HEAD: report initialization commit to be recorded after PR allocation

## Last completed stage

Stage 1 — report initialization + technical findings.

## Current active stage

Stage 2 — PR allocation + report synchronization.

## Start here

Create a draft PR, rename this report to the allocated PR number, then fetch current `index.html`, `app.js`, `ui.js`, and `README.md` from the branch before production edits.

## Do not redo

- PR #437 calculations.
- B31.3/KD source identification.
- automatic pressure-only `Seq` framework.
- controlled fatigue-curve `Ni` interpolation.

## Do not assume

- imported outputs are valid inputs;
- package source IDs may differ from the running tool;
- approvals can be applied before recalculation/key matching.

## Files currently involved

- `agents/PR_PENDING_workreport.md`
- production files not yet changed.

## Known failing checks

None. Stage 4 validation is NOT_RUN.

## Validation still required

Round-trip import/export, source mismatch, snapshot non-authority, row evidence restoration, existing numerical regression, changed-file ledger.

## Open QST-* items

`QST-010` is resolved as an explicit scope decision: cryptographic signing is not part of this PR.

## Important deferred IMP-* items

Managed material/product libraries; external document-control integration.

## Highest-risk remaining item

`RISK-013` — imported calculated outputs accidentally becoming solver authority.

## Exact next recommended action

Allocate draft PR, rename report, then implement production JSON export/import with recalculation.

## Required reading

- `CodingRules.md` commit `43eccc27967ecec7d67513c08255398b496be5ce`
- merged `agents/PR437_workreport.md`
- `engineering/hp-class-standardization/README.md`
- `engineering/hp-class-standardization/app.js`
