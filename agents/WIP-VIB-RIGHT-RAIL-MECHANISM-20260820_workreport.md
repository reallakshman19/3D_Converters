# WIP-VIB-RIGHT-RAIL-MECHANISM-20260820 — Recovery Work Report

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR_HEAD_OBSERVED: 72ef2f1907a3e2ebde8ad0abe156d2aedd01b284
REPORT_BASIS_HEAD: 72ef2f1907a3e2ebde8ad0abe156d2aedd01b284
MAIN_HEAD_LAST_CHECKED: 72ef2f1907a3e2ebde8ad0abe156d2aedd01b284
MERGE_BASE: 72ef2f1907a3e2ebde8ad0abe156d2aedd01b284
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_OWNER_ASSIGNED_IMPLEMENTATION
GROUNDING_EPOCH: GE-001
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: right-rail presentation accidentally infers applicability/completeness from static mechanism availability instead of governed T1/MechanismCoverage evidence
EXACT_NEXT_ACTION: add a pure mechanism-summary projection + regression, then wire it into the existing selected-assessment right rail

## Handover in 60 Seconds

Mission: extend the existing action-first Vibration Assessment right rail so the selected exact line/case/canonical scope visibly exposes all 12 governed vibration mechanisms and their current assessment state. Cavitation/flashing and thermowell must remain visible when required even while numerical qualification is blocked.

This is not a new vibration calculator and not a second cockpit. It consumes the already-merged chain:

`selected register row -> governed T1 identification -> buildVibrationMechanismMatrixRow() -> MechanismCoverage.v1 / AssessmentCompleteness.v1 -> transient roadmap context -> right rail`.

Permanent authority boundary: projection only. No equations, applicability rules, completeness calculation, EI aggregation, project persistence, screening/design/code authority, Product Freeze, workflow, runtime/writer/canvas ownership, or source/master values may change.

## Live Ground Truth — GE-001

- repository: `reallaksh19/3D_Converters`
- base/default branch: `main`
- live main: `72ef2f1907a3e2ebde8ad0abe156d2aedd01b284`
- working branch: `agent/vib-right-rail-mechanism-cockpit-20260820`
- PR: not allocated yet
- predecessor UI: merged PR #667 action-first right rail; merged PR #658 selected exact line/case context
- coverage authority: merged PR #572 (`MechanismIdentification -> RequiredAssessmentSet -> MechanismCoverage -> AssessmentCompleteness`)
- mechanism universe: 12 IDs from `converters/vibration/mechanisms/registry.js`
- integrated matrix paths on current main: FIT screening, Mechanical screening, AIV assessment-scope screening, SBC candidate; other mechanisms remain unavailable/not implemented unless separately integrated.

## Coordination

- PR #540: `COORDINATION_REQUIRED / NO EXACT FILE OVERLAP PLANNED`; owns Engineering Calculation VIB family/console projection. This WIP does not edit those files.
- PR #665: `SAFE`; Project-v2 persistence neighbor, no exact planned file overlap, no persistence dependency.
- PR #649: `COORDINATION_REQUIRED / AUTHORITY_INDEPENDENT`; adds benchmark-only deadleg/transient workbench and edits `vibration-integrity-tab.js`, but not the planned bridge/right-rail files. Do not import its unmerged runtime state.
- PR #657: `SAFE`; T1 review-matrix presentation neighbor. Consume only current-main governed identification resolver.
- PR #653 / issue #652: `SHARED_READ`; T2.4/T2.5 source qualification stays source-blocked.
- PR #655 / issue #654: `SHARED_READ`; EI T4 thermowell source qualification stays source-blocked and separate from future ASME PTC 19.3 TW detailed assessment.
- issue #545: `SHARED_READ`; T2.9 cavitation/flashing qualification remains independently source-gated.

## Mission / Acceptance

1. Selected right rail shows the full 12-mechanism universe from the current mechanism matrix.
2. Projection distinguishes explicit `REQUIRED`, `NOT_APPLICABLE`, `UNRESOLVED`, and missing T1 identification.
3. Required unavailable mechanisms show a fail-closed incomplete/not-implemented state; absence of a kernel never renders as N/A or complete.
4. Current results/candidate/stale states may be displayed but do not create authority.
5. Cavitation/flashing and Thermowell remain visible as assessment obligations when required.
6. SBC and Thermowell remain outside any implied EI main-line aggregate in this presentation.
7. No automatic applicability, no universal vibration score, no numerical changes.
8. Right-rail context remains transient/non-persistent and exact-scope bound.

## Technical Diagnosis

Current right rail shows selected scope, workflow status, next case action, EI completeness summary and screening currentness, then the general lifecycle roadmap. It does not expose which individual required mechanisms are complete, blocked, unavailable or N/A. The main facility matrix already contains this information, so the defect is a missing projection boundary rather than a missing numerical engine.

Falsifier: if the new projection can show `COMPLETE` or `NOT_APPLICABLE` for a required `cavitationFlashing`/`thermowells` row whose governed coverage reason is `NOT_IMPLEMENTED`, the implementation is invalid.

## Authority Trace

- applicability authority: explicit governed T1 identification records only — READ ONLY
- required-assessment/completeness authority: `MechanismCoverage.v1` / `AssessmentCompleteness.v1` — READ ONLY
- calculation authority: mechanism kernels/adapters — READ ONLY
- matrix recovery: `buildVibrationMechanismMatrixRow()` — READ ONLY
- new mechanism summary: transient presentation projection only — WRITE ALLOWED
- right rail HTML/CSS: projection only — WRITE ALLOWED
- persistence/export: OUT OF SCOPE

## Planned Changed Files

New:
- `tabs/vibration-roadmap-mechanism-summary.js`
- `tabs/vibration-roadmap-mechanism-summary-view.js`
- `tests/vibration-roadmap-mechanism-summary.test.mjs`

Existing, only after connector-side exact-byte backup because native checkout backup command is unavailable here:
- `tabs/vibration-integrity-roadmap-bridge.js`
- `tabs/vibration-roadmap-panel.js`
- `tabs/vibration-roadmap-panel.css`

Recovery metadata:
- this WIP report/status/claim; later migrated to `PR<number>` after allocation.

## Validation Ledger

- live main/repo instructions/skill grounding: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- open PR overlap inspection: PASS / SOURCE_INSPECTION / NONE
- current right-rail and bridge trace: PASS / SOURCE_INSPECTION / IMPLEMENTATION_COUPLED
- current 12-mechanism registry/matrix trace: PASS / SOURCE_INSPECTION / IMPLEMENTATION_COUPLED
- focused new regression: NOT_RUN
- repository-native regression: NOT_RUN
- served browser: NOT_RUN
- native `node utils/backup.js save`: NOT_RUN / ENVIRONMENT_BLOCKED; connector-side exact-byte backup required before edits

## Active Items

- DEC-001: extend merged #667/#658 right rail; do not create another product surface.
- DEC-002: use governed identification/coverage as the only disposition/completeness basis; static catalogue availability is presentation metadata only.
- DEC-003: source-blocked mechanisms stay visible; blocked != absent and blocked != N/A.
- RISK-001: stale/open PR #571 metadata exists even though successor #572 is merged. Current main is authority.
- RISK-002: PR #649 may later integrate deadleg/transient results; this PR must remain compatible and not claim those unmerged results.
- RISK-003: Thermowell EI T4 versus ASME PTC 19.3 TW method identity remains a source-governance conflict; this PR must not merge those methods.

## Merge Authority

OWNER_ONLY / NOT_GRANTED. No merge without a separate explicit owner instruction.