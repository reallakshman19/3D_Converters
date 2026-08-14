# FIT UI Post-Review Defect Takeover — Living Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Revalidate the prior FIT UI review against current `main`, repair only still-reproducible defects with P0 closure first, add regression coverage, run the applicable FIT/AIV release validation, and deliver a draft PR without merging. |
| Source task / issue | Owner task 2026-08-14; prior release/browser review record `docs/vibration/VibrationIntegrity-Release-Browser-Validation-v1.md`; FIT takeover issue #443. |
| PR number | PENDING |
| Branch | `agent/fit-ui-post-review-defects` |
| Base commit | `4fce8d2b8fc2790058f9b0f348fa135a5eda5704` |
| Current HEAD | report-init commit assigned by GitHub after this write |
| PR status | NOT CREATED |
| Current stage | Stage 2 — branch/report initialization |
| Last completed stage | Stage 1 — current-main re-read and defect revalidation |
| Engineering status | FIT authority unchanged: benchmark-only / no screening or design authority change. |
| Validation status | Source revalidation complete; executable suites NOT_RUN. |
| Current blocker | Full repository checkout is unavailable in this agent runtime (`github.com` DNS unavailable; `gh` CLI absent). |
| Exact next action | Implement the four still-reproducible FIT UI defects without touching already-resolved items. |

## Handover in 60 Seconds

### What is now true

Current `main` was re-read at `4fce8d2b8fc2790058f9b0f348fa135a5eda5704`. The prior six workspace/UI release-review failures were checked individually. Four remain reproducible; two are already corrected on current main. The former AIV UI-math boundary finding is also not reproduced by current source search/boundary ownership.

### What is being worked on

Restore the FIT joined Engineering-basis primary view and exact Source Data anchors/navigation first, then restore visible provenance and five-sheet XLSX contract wording.

### What remains unfinished

Production fixes, regression execution, FIT release suite, applicable AIV release validation, draft PR allocation, report rename/synchronization, exact changed-file reconciliation.

### What must not be assumed

No release suite has passed yet. Browser acceptance has not been executed. FIT screening/design authority is not granted by these UI changes.

### Highest-risk remaining item

The input-view file also overlaps open draft PR #479; this PR must restore the reviewed UI contract from current main without importing #479's unrelated run-evidence feature.

### Exact next action

Patch `tabs/vibration-integrity-input-view.js` surgically against current main and extend its existing Engineering-basis regression seam.

## Mission and Engineering Intent

### Mission

Close the still-valid FIT UI regressions from the prior release/browser review while preserving current-main numerical behavior, authority boundaries, and unrelated product changes.

### User / engineering consequence

Operators must see one joined line/case Engineering basis backed by the authoritative source tables, be able to navigate every projected field to its exact backing cell, see the controlled evidence classification, and understand that complete topology import means the five-sheet XLSX contract rather than a generic workbook.

### Scope

- FIT Vibration Integrity visible input/workspace UI only.
- Existing source/working-state projection and source-anchor contract.
- Visible evidence/provenance token.
- Complete five-sheet XLSX wording.
- Regression tests for the repaired seams.
- Relevant release validation.

### Non-goals

- No FIT equations/correlations/master changes.
- No AIV numerical implementation changes.
- No 3D/canvas work.
- No screening/design authority transition.
- No unrelated release failures or broad refactor.
- No `.github/workflows/*` changes.
- No incorporation of PR #479 run-evidence functionality.

### Governing invariants

1. The joined Engineering basis is a projection of the same authoritative working cells, never a second store.
2. Projected source links must resolve deterministically to exact backing source-cell IDs.
3. UI must not execute or reproduce FIT engineering equations.
4. Missing/non-calculated mechanism state must remain blank, not synthetic zero.
5. FIT remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`, screening/design not authorized.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Re-read current main | P0 | DONE | 1 | `main@4fce8d2b...`; current FIT source/test files inspected |
| Revalidate prior workspace/UI findings | P0 | DONE | 1 | prior six failures checked against current source |
| Restore joined Engineering-basis primary UI | P0 | ACCEPTED | 3 | `renderVibrationEngineeringBasis(inputState)` absent on current main |
| Restore exact Source Data anchors/navigation | P0 | ACCEPTED | 3 | basis links exist, backing input IDs absent on current main |
| Restore visible evidence classification | P1 | ACCEPTED | 4 | workspace row does not render `phaseEvidenceStrength` / `correlationEvidenceStrength` |
| Restore five-sheet XLSX visible contract | P1 | ACCEPTED | 4 | input copy says generic XLSX preferred; current static test expects five-sheet wording |
| Synthetic-zero prior failure | P0 | DONE | 1 | already resolved on main by `assessment.calculated` blank-state handling + regression test |
| `parse-workbook.js` 300-line prior failure | P1 | DONE | 1 | current file ends below 300 physical lines |
| Prior AIV UI forbidden-math finding | P1 | DONE | 1 | current UI-boundary search finds math in engineering modules only; current boundary test owns exact restriction |
| Add focused regression tests | P0 | NOT_STARTED | 3-4 | pending |
| Run FIT release suite | P0 | NOT_STARTED | 5 | `npm run verify:vibration-fit-release` |
| Run relevant AIV release suite | P0 | NOT_STARTED | 5 | repository command is `npm run verify:aiv-canvas-release`; hosted AIV workflow trigger depends on changed paths |
| Create draft PR | P0 | NOT_STARTED | 6 | pending |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | P0 | ACCEPTED | Joined Engineering-basis production consumer removed; raw source tables became primary UI. | Yes |
| ISS-002 | Defect | P0 | ACCEPTED | Source links target deterministic IDs that are no longer emitted on backing raw inputs. | Yes |
| ISS-003 | Defect | P1 | ACCEPTED | Visible facility workspace omits explicit FIT evidence-strength token such as `EI_PUBLISHED_EXAMPLE`. | Yes |
| ISS-004 | Defect | P1 | ACCEPTED | Import surface does not explicitly identify the complete five-sheet XLSX contract. | Yes |
| ISS-005 | Defect | P0 | DONE | Historical synthetic calculated zero is already fixed on current main. | No |
| ISS-006 | Defect | P1 | DONE | Historical workbook parser module-size failure is already fixed on current main. | No |
| ISS-007 | Defect | P1 | DONE | Historical AIV UI forbidden-math finding is not reproduced on current main. | No |
| RISK-001 | Risk | P0 | ACCEPTED | Open PR #479 also changes `tabs/vibration-integrity-input-view.js`; future reconciliation may conflict. | Yes, document only |
| RISK-002 | Risk | P0 | ACCEPTED | Agent runtime cannot clone repository or invoke `gh`; executable evidence must come from an available repository/hosted path or remain explicitly NOT_RUN. | Yes |
| DEC-001 | Decision | P0 | ACCEPTED | Fix only findings reproduced on current main; do not re-fix resolved historical failures. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Restore the prior projection/source-link architecture surgically while retaining current benchmark-comparison logic. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve all FIT engineering authority states unchanged. | Yes |

## Stage Roadmap

### Stage 1 — Current-main re-read + defect revalidation — COMPLETE

Current truth: base `4fce8d2b...`; four FIT UI findings remain, two prior workspace failures already fixed, AIV UI-math finding not reproduced.

Validation: connected-GitHub source inspection against exact current-main blobs. No executable test claim.

### Stage 2 — Branch + living report initialization — IN_PROGRESS

Objective: create assignment branch and work report before production code.

Expected files: `agents/PR_PENDING_workreport.md` only.

Planned validation: branch base identity and report presence.

### Stage 3 — P0 joined-basis/source-navigation repair — NOT_STARTED

Expected files:
- `tabs/vibration-integrity-input-view.js`
- `tests/vibration-integrity-engineering-basis.test.mjs`
- living work report

Planned behavior:
- render joined Engineering basis before raw Source Data;
- emit exact deterministic source IDs on backing raw cells;
- retain one backing state and all existing mutation/revert semantics;
- no numerical FIT code in UI.

### Stage 4 — Remaining confirmed visible-contract repair — NOT_STARTED

Expected files:
- `tabs/vibration-integrity-input-view.js`
- `tabs/vibration-integrity-view.js`
- `tests/vibration-integrity-tab-static.test.mjs` if additional assertions are required
- living work report

Planned behavior:
- visible evidence-strength classification;
- explicit complete five-sheet XLSX import wording.

### Stage 5 — Validation + changed-file reconciliation — NOT_STARTED

Planned validation:
- focused UI regressions;
- `npm run verify:vibration-fit-release`;
- applicable AIV release command `npm run verify:aiv-canvas-release`;
- exact changed-file list;
- hosted check results if automatically triggered.

### Stage 6 — Draft PR + report synchronization — NOT_STARTED

Create draft PR, rename report to `agents/PR<NUMBER>_workreport.md`, update exact PR/head/validation state. Do not merge.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 2 | 2 | Living engineering/delivery state | No | source presence pending |

## Decisions and Invariants

### DEC-001 — Current-source truth controls scope
Historical failures that no longer reproduce are not implementation work in this PR.

### DEC-002 — Restore projection, do not roll back current FIT logic
The older joined-basis structure is a behavioral reference only. Current-main benchmark comparison and other later logic remain authoritative.

### DEC-003 — Authority unchanged
This PR changes presentation/integration only. It cannot promote FIT screening/design authority.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Current-main source revalidation | PASS | `4fce8d2b...` | connected GitHub exact files |
| Focused Engineering-basis/UI tests | NOT_RUN | — | pending implementation |
| `npm run verify:vibration-fit-release` | NOT_RUN | — | full checkout unavailable so far |
| `npm run verify:aiv-canvas-release` | NOT_RUN | — | full checkout unavailable so far |
| Real browser FIT joined-edit/source navigation | NOT_RUN | — | browser runtime not established |
| Changed-file reconciliation | NOT_RUN | — | pending implementation |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| FIT numerical method unchanged | PASS | no calculation files selected for scope |
| FIT authority boundary unchanged | PASS | scope/decision; must reconfirm final diff |
| One authoritative working state | NOT_RUN | pending repaired production path/test |
| Exact projected-field → source-cell navigation | NOT_RUN | pending repair/test |

### Explicitly Not Validated

- Browser navigation/scroll/focus behavior.
- Complete XLSX import in a real browser.
- Full current-head FIT/AIV release execution.
- Independent vibration-engineering approval; not required for presentation defect repair and no authority promotion is requested.

## Known / Deferred Work and Forward Sequence

1. Repair ISS-001/ISS-002 first because they block the primary operator workflow and browser acceptance prerequisites.
2. Repair ISS-003/ISS-004 without changing calculation or data authority.
3. Run focused and release validations against the resulting exact head.
4. Reconcile overlap risk with PR #479 in the draft PR description; do not import its feature scope.
5. Leave any unrelated release failures explicitly outside this defect PR unless the Owner expands scope.

## Stage Execution Log

### Stage 1

Implementation performed: none.

Validation performed: current-main source review at exact commit `4fce8d2b8fc2790058f9b0f348fa135a5eda5704`.

Findings:
- ISS-001 CONFIRMED.
- ISS-002 CONFIRMED.
- ISS-003 CONFIRMED.
- ISS-004 CONFIRMED.
- ISS-005 already resolved on main.
- ISS-006 already resolved on main.
- ISS-007 not reproduced on current main.

Stage decision: COMPLETE.

## Next-Agent Handover

Current stopping point: branch/report initialization immediately before production edit.

PR / branch / HEAD: PR pending; `agent/fit-ui-post-review-defects`; report-init commit pending assignment.

Last completed stage: Stage 1.

Current active stage: Stage 2.

Start here: `tabs/vibration-integrity-input-view.js` on current base. Restore only the joined basis + source-cell ID/source-data wrapper pieces, retaining the current central benchmark-comparison import/behavior.

Do not redo: synthetic-zero fix, workbook parser split, AIV numerical/UI ownership unless a current executable test disproves the source revalidation.

Do not assume: any suite is green or browser acceptance works.

Files currently involved: work report only until Stage 3 begins.

Known failing checks: the existing `vibration-integrity-engineering-basis.test.mjs` source contract is expected to fail current main because the production consumer/anchors are absent.

Validation still required: focused UI tests, FIT release suite, applicable AIV release suite, changed-file reconciliation, browser acceptance if executable.

Open QST items: none requiring Owner decision at this stage.

Important deferred items: open PR #479 reconciliation risk.

Highest-risk remaining item: preserve current-main FIT behavior while restoring the older visible projection contract.

Exact next recommended action: patch ISS-001/ISS-002 and add direct anchor-symmetry regression coverage.

Required reading:
- `docs/vibration/VibrationIntegrity-Release-Browser-Validation-v1.md`
- `tabs/vibration-integrity-input-view.js`
- `tabs/vibration-integrity-engineering-basis-view.js`
- `tabs/vibration-integrity-engineering-basis.js`
- `tests/vibration-integrity-engineering-basis.test.mjs`
- `Common/CodingRules.md` current main via connected repository.
