# WIP hp-kd320-q1-semantic-intake — Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BRANCH: `agent/hp-kd320-q1-semantic-intake`
- BASE: `main@6c3109935eb2d30652eab441080464777091b1bb`
- REPORT_BASIS_HEAD: `6c3109935eb2d30652eab441080464777091b1bb`
- PREDECESSOR: PR #650 merged by squash as `6c3109935eb2d30652eab441080464777091b1bb`
- BACKUP: `backup/hp-kd320-q1-semantic-intake-pre-edit-20260819`
- COORDINATION: `COORDINATION_REQUIRED` with open PR #649 for `tabs/engineering-workspace-tab.js`; actual hunk is the Calculations loader cache identity, not KD320 evidence authority.

## Handover in 60 seconds

Mission: add preview-only Q1 semantic evidence intake for the canonical `KD320-SEM-001…014` set without changing the four first-class record classes landed in PR650. Treat the semantic CSV as a controlled-source sub-package, not a fifth record class.

No Code semantics may be inferred, reconstructed or populated. The template contains semantic IDs and required source-receipt identity only; all source locators/controlled semantic references/rules/custody fields remain blank for user-controlled evidence.

The existing Q2 admission evaluator remains the qualification authority. The new parser may construct a transient candidate only to show whether the semantic package is structurally complete; source receipts remain pending unless separately supplied, therefore Q1 cannot be promoted by this increment.

## Acceptance

1. Exact 14-row template: `KD320-SEM-001…014`; SEM001 -> `Q1-SRC-B313-2024`, SEM002…014 -> `Q1-SRC-VIII3-2025`.
2. Required per-row custody: exact controlled locator, controlled semantic ref, explicit units/sign/selection/interpolation/applicability values, extractor/checker identities and UTC timestamps.
3. Distinct extractor/checker identities and exact semantic/source binding.
4. No `engineeringDefinition`, licensed text, equation text, curve points or numerical KD320 values accepted in the public CSV contract.
5. Missing/duplicate/unknown semantics fail closed.
6. Preview delegates readiness to the existing Q2 admission evaluator using pending source receipts; authority flags remain false.
7. Engineering UI exposes the Q1 semantic sub-package under `CONTROLLED_SOURCE`, with exact template download and browser-memory-only upload.
8. No native arithmetic, production registration, master-data write, automatic admission or design authority.

## Authority / invariants

- `nativeCoreKd3Qualified=false`
- `codeCompliance=false`
- `canUseForDesignAuthority=false`
- `productionKernelAllowed=false`
- `automaticPromotionAllowed=false`
- production fatigue route remains `USER_CALCULATED_KD3`.
- four top-level CSV record classes remain unchanged.
- licensed ASME content remains outside the public repository.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live main grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | `main@6c310993...` |
| PR650 merge | PASS | GITHUB_MERGE_RESULT | AUTHORITATIVE_REFERENCE | squash merged |
| Existing Q1 contract | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | canonical 14 semantics still pending |
| Focused tests | NOT_RUN | NOT_OBSERVED | NONE | pending implementation |
| Full repo tests | NOT_RUN | NOT_OBSERVED | NONE | connector-only environment |
| Browser | NOT_RUN | NOT_OBSERVED | NONE | do not infer PASS |
| Hosted CI | NOT_RUN | NOT_OBSERVED | NONE | no PR yet |

## EXACT_NEXT_ACTION

Implement a bounded Q1 semantic CSV parser/template module and wire it into the existing KD320 Evidence Intake UI as a controlled-source sub-package, then add fail-closed regression tests.