# WIP — Vibration right-panel production workflow

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL_PRESENTATION
- WIP: WIP-VIB-ROADMAP-WORKFLOW-20260819
- BRANCH: `agent/vibration-roadmap-workflow-20260819`
- BASE: `main@7f7ce459c8f059b503b045bbdebbe10d303b1044`
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- NUMERICAL_METHOD_CHANGED: NO
- ENGINEERING_AUTHORITY_CHANGED: NO
- PROJECT_PERSISTENCE_CHANGED: NO
- WORKFLOW_FILES_CHANGED: NO

## Handover in 60 seconds

Transform the existing right-side `Vibration Roadmap` from a catalogue-first presentation into an action-first workflow rail for the selected project/line, while consuming only existing `VibrationRoadmapProjection.v1` statuses.

This slice MUST NOT create a competing line/case completeness/status authority. PR658 owns `VIBRATION_LINE_CASE_ASSESSMENT_STATUS_PROJECTION`; this WIP is presentation-only and does not edit its files or calculate applicability/completeness.

Project v2 PR665 remains open/unmerged and is not a dependency for this slice. No Project-v2 file is edited.

## Live grounding

- main: `7f7ce459c8f059b503b045bbdebbe10d303b1044`
- latest main change: unrelated HP KD320 qualification (#666)
- PR615: merged/closed; its `agents/claims/PR615.yaml` still says ACTIVE and claims roadmap files, therefore that claim is stale historical coordination metadata rather than a live PR blocker.
- PR658: open draft, exact files under `tabs/vibration-integrity-assessment-status*.js`, `tabs/vibration-integrity-view.js` and tests; authority domain `VIBRATION_LINE_CASE_ASSESSMENT_STATUS_PROJECTION`.
- PR665: open draft Project-v2 persistence; do not stack or edit its files.

Coordination classification: `SAFE_WITH_STALE_CLAIM_RECONCILIATION`.

## Mission / usable capability

The right rail must answer, using existing governed status only:

1. What project/line am I viewing?
2. Which lifecycle phase currently needs attention?
3. What is the first visible blocker/current-state item?
4. Which existing node can I navigate to next?

Preserve all existing roadmap nodes and project open/import/save functions. Do not hide engineering detail permanently; reorganize it under an action-first summary.

## Planned implementation

- add a pure presentation helper for phase summaries + next-attention selection;
- update `tabs/vibration-roadmap-panel.js` to render workflow focus before the full phase/node list;
- update `tabs/vibration-roadmap-panel.css` for the workflow focus/phase-state presentation;
- add focused regression for ordering, non-authority semantics and rendering;
- retain line picker; do NOT invent a case picker because current `VibrationIntegrityProject.v1` has stable project lines but no governed project case subject collection.

## Protected invariants

- `VibrationRoadmapProjection.v1.authority.purpose = VISUAL_NAVIGATION_GUIDANCE_ONLY` remains unchanged.
- no applicability or completeness determination.
- no numerical/calculation/master/tolerance/unit changes.
- no screening/design/code/safety/root-cause authority.
- no project schema/serializer/controller persistence change.
- no mutation of PR658 status projection.
- no workflow-file changes.
- target/navigation actions remain only existing CALCULATION/WORKSPACE targets; no fabricated navigation target.

## Validation ledger

- live main/source grounding: PASS / SOURCE_INSPECTION
- PR615 claim reconciliation: PASS / SOURCE_INSPECTION — live PR merged despite stale ACTIVE claim file
- PR658 semantic/exact-file overlap: PASS / SOURCE_INSPECTION — no exact file overlap; presentation must not calculate its status domain
- repository-native focused tests: NOT_RUN
- browser acceptance: NOT_RUN

## Highest risk

A presentation helper could accidentally imply phase completion or applicability from `AVAILABLE`, `DATA`, `CURRENT_RESULT`, etc. It must label itself workflow focus/attention only and never use COMPLETE/PASS/SAFE semantics.

## EXACT_NEXT_ACTION

Create connector-side pre-edit backups of `tabs/vibration-roadmap-panel.js` and `tabs/vibration-roadmap-panel.css`, then implement the pure workflow-presentation helper and focused regression before editing the panel renderer.
