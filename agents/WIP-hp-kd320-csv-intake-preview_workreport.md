# WIP — KD320 CSV Evidence Intake Preview

## Handover in 60 Seconds

- Repository: `reallaksh19/3D_Converters`
- Branch: `agent/hp-kd320-csv-intake-preview`
- Base: PR625 head `1c0f6268bcdc1098754bbc0627d9631b5bf6cdfb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Mutation authority: WRITE_ALLOWED
- Merge authority: OWNER_GRANTED_ON_COMPLETION (2026-08-19)
- Stack: PR622 -> PR623 -> PR625 -> this successor
- Mission: add a CSV upload/preview surface for KD320 evidence without changing numerical mechanics or authority.
- Current authority invariant: native CORE KD320=false; Code compliance=false; design authority=false; production kernel=false; automatic promotion=false.

## Live Ground Truth

Grounding epoch: 2026-08-19.

Normalized qualification stack immediately before this branch:

- PR622 head `1661b316a4e081a4ead47db9ca8bda7a9669eb04`, 13 files, one commit.
- PR623 head `dd789f69399e1f5cf485a67526d6bbbae9697f72`, 10 files, one commit, base PR622 branch.
- PR625 head `1c0f6268bcdc1098754bbc0627d9631b5bf6cdfb`, 11 files, one commit, base PR623 branch.
- Current normalized heads had zero commit-status entries at grounding time.
- Backup refs exist for pre-normalization PR622/623/625 heads.

Repository instructions loaded from root `AGENTS.md`, `.agents/AGENTS.md`, and `Common/skills/engineering-pr-delivery/SKILL.md`.

## Scope

Implement exactly:

1. CSV parser/preflight for two modes:
   - `PROJECT_CHECKED_CALCULATION`
   - `PUBLISHED_NUMERICAL_ORACLE`
2. Row-level custody and engineering-contract validation before Q2 evaluation.
3. Published-reference edition routing: direct 2025 candidate or fail-closed 2023->2025 reconciliation preview.
4. New native `KD320 Evidence Intake` Engineering subtab with file upload, mode selector, template download, preview table, state and blockers.
5. Focused tests for parser/preflight, Q2/edition-gate reuse, UI registration, and authority-negative assurance.

Out of scope:

- native KD320 arithmetic;
- fatigue-curve implementation or licensed curve data;
- changes to Q1/Q2/edition evaluator semantics;
- Code text or licensed-source bytes;
- workflow files;
- production-authority promotion;
- automatic evidence admission.

## Technical Diagnosis

The existing Q2 evaluator intentionally defers project/published-oracle validation until Q1 controlled evidence is complete. Therefore a UI that only injects CSV rows into Q2 would hide malformed oracle-row defects behind `Q1_CONTROLLED_EVIDENCE_PENDING`. The successor requires an independent structural preflight before calling the existing evaluator.

Falsifier: if existing Q2 already exposes oracle-row blockers while Q1 is incomplete, the new preflight would be redundant. Source inspection of `kd320-q2/intake.js` shows project/published oracle validators are called only when `q1Complete` is true, so the preflight remains necessary.

## Authority / Invariants

The CSV layer may translate evidence into existing candidate contracts. It must never:

- calculate `Seq` or `N`;
- infer missing Code semantics;
- silently fill missing custody identities/timestamps;
- reinterpret a 2023 published source as target 2025 authority;
- set any production/design authority flag true;
- modify the Q2 or edition reconciliation evaluators;
- automatically admit an oracle after preview.

## Coordination

Open KD320 PRs are PR622, PR623, PR625. This branch is intentionally stacked on PR625. It reuses their evaluator APIs but does not modify their files. Coordination classification: `SAFE_STACKED_DEPENDENCY`.

## Validation Ledger

- Repository/source grounding: PASS / SOURCE_INSPECTION / NONE.
- PR-stack normalization: PASS / REMOTE_GITHUB_STATE / NONE.
- Hosted CI for normalized heads: NOT_RUN / NOT_OBSERVED / NONE.
- CSV implementation tests: NOT_RUN.
- UI registration tests: NOT_RUN.
- Browser execution: NOT_RUN.

## Changed-File Ledger

Current:

- `agents/WIP-hp-kd320-csv-intake-preview_workreport.md` — this recovery record.

Planned:

- `agents/status/WIP-hp-kd320-csv-intake-preview.yaml`
- `agents/claims/WIP-hp-kd320-csv-intake-preview.yaml`
- `engineering/hp-class-standardization/qualification/kd320-q2/csv-intake.js`
- `tabs/hp-kd320-evidence-intake-tab.js`
- `tabs/engineering-workspace-tab.js` (registration only; exact pre-edit blob retained)
- focused tests.

## Active Findings / Risks

- `RISK-001`: CSV can create false confidence if preview language is interpreted as Code qualification. Mitigation: separate CSV preflight state from Q2 admission state and display authority false.
- `RISK-002`: 2023 published examples must not be relabeled 2025. Mitigation: route through existing PR625 edition reconciliation gate.
- `RISK-003`: connector-only environment has no `gh` CLI and cannot run the repository backup command against the remote branch. Mitigation: preserve exact pre-edit blob/tree and create an explicit repository backup artifact before changing the existing registration file; record this as an environment substitution, not as execution of `node utils/backup.js`.

## Exact Next Action

Create status/claim records, implement and locally syntax/unit-test the standalone CSV parser against copied evaluator contracts, then publish the parser/UI/test slice and open a draft successor PR on PR625.