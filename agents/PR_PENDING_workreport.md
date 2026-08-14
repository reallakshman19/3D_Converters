# FIT UI Post-Review Defect Takeover — Living Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Revalidate the prior FIT UI review against current `main`, repair only still-reproducible defects with P0 closure first, add regression coverage, run the applicable FIT/AIV release validation, and deliver a draft PR without merging. |
| Source task / issue | Owner task 2026-08-14; prior release/browser review record `docs/vibration/VibrationIntegrity-Release-Browser-Validation-v1.md`; FIT takeover issue #443. |
| PR number | PENDING |
| Branch | `agent/fit-ui-post-review-defects` |
| Base commit | `4fce8d2b8fc2790058f9b0f348fa135a5eda5704` |
| Current HEAD | `48e80fc0b6ab7ce9e55db3450e074328ed5cad72` before this report-stage update |
| PR status | NOT CREATED |
| Current stage | Stage 3 — P0 joined-basis/source-navigation repair |
| Last completed stage | Stage 2 — branch + living report initialization |
| Engineering status | FIT authority unchanged: benchmark-only / no screening or design authority change. |
| Validation status | Source revalidation PASS; branch/report initialization PASS; executable suites NOT_RUN. |
| Current blocker | Full repository checkout is unavailable in this agent runtime (`github.com` DNS unavailable; `gh` CLI absent). |
| Exact next action | Patch `tabs/vibration-integrity-input-view.js` and add direct regression coverage for joined-basis ordering plus exact source-anchor symmetry. |

## Handover in 60 Seconds

### What is now true

Current `main` was re-read at `4fce8d2b8fc2790058f9b0f348fa135a5eda5704`. Four prior FIT UI findings remain reproducible. Two historical workspace failures are already corrected on current main. The historical AIV UI-math finding is not reproduced by current source ownership. The assignment branch and living report now exist.

### What is being worked on

P0 closure: restore the joined Engineering-basis primary view and exact Source Data anchors/navigation without rolling back current FIT benchmark-comparison logic.

### What remains unfinished

P0 implementation/tests, P1 provenance/XLSX wording fixes, executable validation, draft PR allocation, report rename/synchronization, exact changed-file reconciliation.

### What must not be assumed

No executable release suite has passed. Browser acceptance has not run. FIT screening/design authority remains unauthorized.

### Highest-risk remaining item

Open draft PR #479 also changes `tabs/vibration-integrity-input-view.js`; this branch is based strictly on current main and must not import #479's unrelated run-evidence feature.

### Exact next action

Implement ISS-001/ISS-002 and extend the existing Engineering-basis test so a projected source link and its backing input ID are proven identical.

## Mission and Engineering Intent

### Mission

Close the still-valid FIT UI regressions from the prior release/browser review while preserving current-main numerical behavior, authority boundaries, and unrelated product changes.

### User / engineering consequence

Operators must see one joined line/case Engineering basis backed by the authoritative source tables, navigate projected fields to exact backing cells, see controlled evidence classification, and understand the complete topology import contract as the five-sheet XLSX export.

### Scope

- FIT Vibration Integrity visible input/workspace UI only.
- Existing source/working-state projection and source-anchor contract.
- Visible evidence/provenance token.
- Complete five-sheet XLSX wording.
- Regression tests and release validation.

### Non-goals

- No FIT equations/correlations/master changes.
- No AIV numerical changes.
- No 3D/canvas work.
- No screening/design authority transition.
- No unrelated release-failure cleanup or broad refactor.
- No `.github/workflows/*` changes.
- No PR #479 run-evidence functionality.

### Governing invariants

1. Joined Engineering basis is a projection of the same authoritative working cells, never a second store.
2. Projected source links resolve deterministically to exact backing source-cell IDs.
3. UI does not execute/reproduce FIT equations.
4. Missing/non-calculated mechanism state stays blank, never synthetic zero.
5. FIT remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; screening/design not authorized.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Re-read current main | P0 | DONE | 1 | `main@4fce8d2b...` exact source inspection |
| Revalidate prior workspace/UI findings | P0 | DONE | 1 | six prior workspace failures checked against current source |
| Branch + living report | P0 | DONE | 2 | branch `agent/fit-ui-post-review-defects`; report commit `48e80fc...` |
| Restore joined Engineering-basis primary UI | P0 | IN_PROGRESS | 3 | production consumer absent on current main |
| Restore exact Source Data anchors/navigation | P0 | IN_PROGRESS | 3 | backing input IDs absent on current main |
| Restore visible evidence classification | P1 | ACCEPTED | 4 | workspace row omits evidence-strength token |
| Restore five-sheet XLSX visible contract | P1 | ACCEPTED | 4 | import copy remains generic |
| Synthetic-zero prior failure | P0 | DONE | 1 | already resolved on main |
| `parse-workbook.js` 300-line prior failure | P1 | DONE | 1 | already resolved on main |
| Prior AIV UI forbidden-math finding | P1 | DONE | 1 | not reproduced on current main |
| Add focused regression tests | P0 | IN_PROGRESS | 3-4 | Stage 3 direct anchor test planned |
| Run FIT release suite | P0 | NOT_STARTED | 5 | `npm run verify:vibration-fit-release` |
| Run relevant AIV release suite | P0 | NOT_STARTED | 5 | `npm run verify:aiv-canvas-release` |
| Create draft PR | P0 | NOT_STARTED | 6 | pending |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | P0 | IN_PROGRESS | Joined Engineering-basis production consumer removed; raw source tables became primary UI. | Yes |
| ISS-002 | Defect | P0 | IN_PROGRESS | Source links target deterministic IDs no longer emitted on backing raw inputs. | Yes |
| ISS-003 | Defect | P1 | ACCEPTED | Visible workspace omits explicit evidence-strength token such as `EI_PUBLISHED_EXAMPLE`. | Yes |
| ISS-004 | Defect | P1 | ACCEPTED | Import surface does not explicitly identify complete five-sheet XLSX contract. | Yes |
| ISS-005 | Defect | P0 | DONE | Historical synthetic calculated zero already fixed on current main. | No |
| ISS-006 | Defect | P1 | DONE | Historical workbook parser module-size failure already fixed on current main. | No |
| ISS-007 | Defect | P1 | DONE | Historical AIV UI forbidden-math finding not reproduced on current main. | No |
| RISK-001 | Risk | P0 | ACCEPTED | Open PR #479 overlaps `tabs/vibration-integrity-input-view.js`. | Yes, document only |
| RISK-002 | Risk | P0 | ACCEPTED | Agent runtime cannot clone repo or invoke `gh`; executable evidence may remain NOT_RUN if hosted checks do not cover changed paths. | Yes |
| DEC-001 | Decision | P0 | ACCEPTED | Fix only defects reproduced on current main. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Restore projection/source-link architecture surgically while retaining current benchmark-comparison logic. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve FIT authority states. | Yes |

## Stage Roadmap

### Stage 1 — Current-main re-read + defect revalidation — COMPLETE

Current truth: base `4fce8d2b...`; ISS-001 through ISS-004 remain; ISS-005/006 resolved on main; ISS-007 not reproduced.

Validation: connected-GitHub exact source inspection. No executable test claim.

### Stage 2 — Branch + living report initialization — COMPLETE

Implementation performed:
- created branch `agent/fit-ui-post-review-defects` from exact main SHA;
- created `agents/PR_PENDING_workreport.md` before production code.

Validation:
- branch creation PASS;
- report creation PASS at commit `48e80fc0b6ab7ce9e55db3450e074328ed5cad72`.

Stage decision: COMPLETE.

### Stage 3 — P0 joined-basis/source-navigation repair — IN_PROGRESS

Current truth: current main retains the pure Engineering-basis projection/view but its production input area no longer renders it; source links exist but backing raw inputs no longer emit matching IDs.

Objective: restore the reviewed one-state joined-basis/source-navigation contract.

Expected files:
- `tabs/vibration-integrity-input-view.js`
- `tests/vibration-integrity-engineering-basis.test.mjs`
- living work report

Engineering rationale: the UI projection must remain usable without becoming a second authority store, and trace links must resolve to exact backing evidence.

Planned implementation:
- import/render `renderVibrationEngineeringBasis`;
- derive backing source IDs using `vibrationEngineeringBasisSourceCellId`;
- wrap raw tables as explicit Source Data and retain add/delete/revert mutation ownership there;
- render basis before Source Data;
- retain current central `buildFitMechanismBenchmarkComparison` behavior unchanged.

Expected behavior:
- projected edits continue to use existing `data-vi-table-cell` mutation contract;
- projected source links and backing input IDs are identical;
- no direct FIT calculation call is introduced.

Edge cases:
- fallback/empty tables remain renderable;
- local rows keep stable row identity behavior already owned by input model;
- topology authority downgrade semantics remain unchanged.

Planned validation:
- existing source-contract assertions;
- new direct render assertion for exact `href`/`id` symmetry and view ordering.

Known risks: PR #479 overlap; avoid copying any non-main feature code.

### Stage 4 — Remaining confirmed visible-contract repair — NOT_STARTED

Expected files: input view, workspace view, tests, living report.

Planned behavior: visible evidence-strength classification and explicit complete five-sheet XLSX wording.

### Stage 5 — Validation + changed-file reconciliation — NOT_STARTED

Planned validation: focused regressions; FIT release; AIV canvas release; exact changed-file list; hosted checks if triggered.

### Stage 6 — Draft PR + report synchronization — NOT_STARTED

Create draft PR, rename report to `agents/PR<NUMBER>_workreport.md`, update exact PR/head/validation state. Never merge.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 2 | 3 | Living engineering/delivery state | No | PASS: repository source present |
| `tabs/vibration-integrity-input-view.js` | 3 | 3 | Restore joined basis + backing source anchors | Yes | pending |
| `tests/vibration-integrity-engineering-basis.test.mjs` | 3 | 3 | Direct P0 regression coverage | No | pending |

## Decisions and Invariants

### DEC-001 — Current-source truth controls scope
Historical failures that do not reproduce are not implementation work.

### DEC-002 — Restore projection, do not roll back current FIT logic
Older joined-basis structure is behavioral reference only. Current benchmark-comparison and later current-main logic remain authoritative.

### DEC-003 — Authority unchanged
Presentation/integration only; no screening/design promotion.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Current-main source revalidation | PASS | `4fce8d2b...` | connected GitHub exact files |
| Branch/report initialization | PASS | `48e80fc...` | connected GitHub branch/file |
| Focused Engineering-basis/UI tests | NOT_RUN | — | pending Stage 3 implementation |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | full checkout unavailable so far |
| `npm run verify:aiv-canvas-release` | NOT_RUN | — | full checkout unavailable so far |
| Real browser FIT joined-edit/source navigation | NOT_RUN | — | browser runtime not established |
| Changed-file reconciliation | NOT_RUN | — | pending |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| FIT numerical method unchanged | PASS | no calculation files in planned scope |
| FIT authority boundary unchanged | PASS | no authority files planned; final diff still required |
| One authoritative working state | NOT_RUN | pending Stage 3 code/test |
| Exact projected-field → source-cell navigation | NOT_RUN | pending Stage 3 code/test |

### Explicitly Not Validated

- Real browser navigation/focus.
- Complete XLSX browser import.
- Full release execution.
- Independent vibration-engineering approval; no authority promotion requested.

## Known / Deferred Work and Forward Sequence

1. Close ISS-001/ISS-002 first.
2. Close ISS-003/ISS-004 without calculation/data authority changes.
3. Execute available focused/release validation.
4. Reconcile overlap risk with PR #479 in draft PR description.
5. Keep unrelated failures outside scope unless Owner expands it.

## Stage Execution Log

### Stage 1

Implementation: none.

Validation: exact current-main source review.

Findings: ISS-001/002/003/004 confirmed; ISS-005/006 resolved on main; ISS-007 not reproduced.

Stage decision: COMPLETE.

### Stage 2

Implementation: branch + living work report created before production code.

Validation: PASS via connected GitHub.

New findings: none.

Stage decision: COMPLETE.

## Next-Agent Handover

Current stopping point: immediately before Stage 3 production edit.

PR / branch / HEAD: PR pending; `agent/fit-ui-post-review-defects`; pre-stage HEAD `48e80fc0b6ab7ce9e55db3450e074328ed5cad72`.

Last completed stage: Stage 2.

Current active stage: Stage 3.

Start here: `tabs/vibration-integrity-input-view.js`. Restore only joined-basis rendering + source-cell ID/source-data wrapper, keeping current benchmark comparison.

Do not redo: synthetic-zero fix, parser split, AIV math ownership.

Do not assume: any executable suite is green.

Files currently involved: report; Stage 3 plans input view + Engineering-basis test.

Known failing check: existing Engineering-basis source contract is expected to fail current main.

Validation still required: focused UI tests, FIT release, AIV release, changed-file reconciliation, browser if available.

Open QST items: none requiring Owner decision.

Important deferred item: PR #479 overlap reconciliation.

Highest-risk remaining item: preserve current-main FIT behavior while restoring prior visible projection contract.

Exact next recommended action: implement ISS-001/ISS-002 and direct anchor-symmetry regression.

Required reading:
- `docs/vibration/VibrationIntegrity-Release-Browser-Validation-v1.md`
- `tabs/vibration-integrity-input-view.js`
- `tabs/vibration-integrity-engineering-basis-view.js`
- `tabs/vibration-integrity-engineering-basis.js`
- `tests/vibration-integrity-engineering-basis.test.mjs`
- `reallaksh19/Common/CodingRules.md`
