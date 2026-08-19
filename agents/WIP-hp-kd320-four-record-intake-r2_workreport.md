# WIP hp-kd320-four-record-intake-r2 — Work Report

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BRANCH: `agent/hp-kd320-four-record-intake-r2`
- BASE: `main@989b24f361ad287a0c0f25f267a118338bf2ed7a`
- REPORT_BASIS_HEAD: `989b24f361ad287a0c0f25f267a118338bf2ed7a`
- COORDINATION: SAFE for KD320; live GitHub search found no open PR containing KD320.
- BACKUP: `backup/hp-kd320-four-record-intake-r2-pre-edit-20260819` preserves the exact pre-edit base. Repository backup CLI is NOT_RUN because no local checkout/CLI is available in this connector-only environment.

## Handover in 60 seconds

Mission: complete the KD320 CSV preview transport contract with exactly four first-class record classes: `CONTROLLED_SOURCE`, `EDITION_SEMANTIC`, `QF022_ORACLE`, `QF023_PROJECT_CALC`.

Preserve the merged Q2 admission evaluator and 2023→2025 edition-reconciliation evaluator as the only gate authorities. Do not add KD320 engineering arithmetic, fatigue-curve interpolation, licensed ASME text, automatic evidence admission, design authority, production-kernel permission, or native CORE qualification.

Current main already supports QF022/QF023 through `kd320-q2/csv-intake.js`; the missing product capability is normalized CSV preview for controlled source receipts and edition-semantic rows.

## Mission / acceptance

1. Add a four-record CSV facade without changing existing Q2 numerical semantics.
2. `CONTROLLED_SOURCE` must require exactly `Q1-SRC-B313-2024` and `Q1-SRC-VIII3-2025`, canonical editions, SHA-256 custody, exact locators, verifier/checker custody, and distinct identities.
3. `EDITION_SEMANTIC` must require exactly `KD320-SEM-002…013`, no duplicates, source edition 2023, target edition 2025, and reuse `evaluateKd320EditionReconciliation()`.
4. QF022/QF023 must delegate to the already-merged CSV adapter rather than reimplementing their numerical-chain validation.
5. UI must expose all four record classes, exact templates, row/file blockers and existing gate state.
6. All authority flags remain false and upload remains preview-only/browser-memory-only.
7. Regression tests must prove missing/duplicate semantic rows, edition mismatch, SHA/custody defects and delegation to existing Q2 gates.

## Authority / protected invariants

- `nativeCoreKd3Qualified=false`
- `codeCompliance=false`
- `canUseForDesignAuthority=false`
- `productionKernelAllowed=false`
- `automaticPromotionAllowed=false`
- Production fatigue route remains `USER_CALCULATED_KD3`.
- No native KD320 equations or fatigue-curve data may be introduced.
- No licensed source text may be persisted in the public repository.
- CSV preview cannot persist or promote evidence automatically.

## Current diagnosis

ISS-001: merged CSV UI has only QF023 project and QF022 published modes; it lacks first-class `CONTROLLED_SOURCE` and `EDITION_SEMANTIC` records.

RISK-001: duplicating Q2 or edition logic would create a second qualification authority. Patch must delegate to existing evaluators.

RISK-002: `csv-intake.js` is already above the repository new-JS line budget. Do not enlarge it; add a bounded facade module instead.

DEC-001: keep existing `csv-intake.js` unchanged; implement a new four-record facade and route the UI through it.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Live main grounding | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | `main@989b24f...` |
| Open KD320 PR overlap | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | zero open KD320 PRs |
| Existing Q1 authority remains blocked | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | G0/G1 pending |
| New regression tests | NOT_RUN | NOT_OBSERVED | IMPLEMENTATION_COUPLED | pending implementation |
| Browser execution | NOT_RUN | NOT_OBSERVED | NONE | pending; do not infer PASS |
| Hosted CI | NOT_RUN | NOT_OBSERVED | NONE | pending PR |

## Changed-file ledger

Durable control artifacts only at bootstrap. Production/test paths will be added here after mutation.

## Appendix A

NOT_REQUIRED_FOR_TAKEOVER: this is a new successor PR from live `main`, not takeover of an existing engineering-critical PR. Repository-specific authority trace and invariants are recorded above.

## EXACT_NEXT_ACTION

Implement the bounded four-record CSV facade, then wire the existing KD320 Evidence Intake UI to it and add focused regression tests before PR creation.
