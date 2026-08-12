# PR440 — FIT / VIB Release-Gate Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add a deterministic one-command release verification entrypoint for the merged FIT/VIB benchmark product without changing engineering authority or numerical behavior. |
| Source task | Owner instruction after merge of PR #438: proceed with the remaining current-head executable-regression / engineering-review gate. |
| Base | `main` at `5f5f78e080596ccf70f7f19c03fbd4050e6993ab` |
| Branch | `agent/fit-vibration-release-gate` |
| PR | #440 — `test(vibration): add FIT/VIB release verification gate` |
| PR state | OPEN / DRAFT |
| Current stage | **Stage 2 — PR ALLOCATION / SYNC** |
| Engineering authority | FIT remains `BENCHMARK_ONLY`; screening/design authority remains NOT AUTHORIZED. |
| Product boundary | Table-only vibration product; no 3D/canvas/model runtime. |

## Handover in 60 Seconds

PR #438 is merged. PR #440 makes the complete merged FIT/VIB regression runnable from a normal checkout with one fail-fast command and a controlled list of existing tests. This environment cannot execute the private checkout because normal GitHub network access is unavailable, so this PR must not claim runtime PASS evidence it cannot produce.

Product path remains:

```text
Engineering Calculations
  -> Calculations
     -> Vibration & Dynamic Screening (6)
        -> FIT benchmark workspace
```

## Mission / Engineering Intent

1. Provide one deterministic command for the merged FIT/VIB release regression.
2. Run existing tests only; do not create a second numerical path.
3. Stop later test groups after the first failed group.
4. Include central Engineering API/core and Console/VIB-family tests because the product surface depends on them.
5. Include source extraction/reference/EI/hand benchmark evidence tests.
6. Include exchange/dataset/facility/tabular/workspace/UI tests required by the merged product.
7. Keep the test manifest explicit and reviewable in source.
8. Do not modify FIT equations, coefficients, applicability, LOF semantics or authority state.
9. Do not add AIV/SBC/cavitation/surge/slug numerical code.
10. Do not add or modify GitHub Actions; external runner/billing limitations are not solved by workflow churn.
11. Preserve evidence chronology: older full/focused runs remain prior-head evidence, not current-head PASS.

## Mission Status

| Work item | Status |
|---|---|
| Inspect current package/release-script conventions | DONE |
| Define exact FIT/VIB release test manifest | DONE |
| Allocate draft PR #440 | DONE |
| Rename report to PR number | IN_PROGRESS |
| Pre-code changed-file verification | NOT_STARTED |
| Add release verification script | NOT_STARTED |
| Add package command | NOT_STARTED |
| Add release-gate contract test | NOT_STARTED |
| Run release gate in this environment | BLOCKED_ENVIRONMENT |
| Full current-head execution in normal checkout | NOT_RUN |
| Engineering authority review / approval | BLOCKED_EXTERNAL_REVIEW |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Use a repository-local fail-fast Node runner, consistent with `verify:inputxml-release`. |
| DEC-002 | Decision | ACCEPTED | No workflow/CI infrastructure change in this assignment. |
| DEC-003 | Decision | ACCEPTED | Release gate runs existing tests and never promotes engineering authority. |
| DEC-004 | Decision | ACCEPTED | Group tests into core/Console, FIT engineering evidence, facility/tabular, and workspace/UI seams. |
| DEC-005 | Decision | ACCEPTED | Release-gate contract test imports the manifest without executing the runner and verifies critical coverage/no duplicates/existing files. |
| RISK-001 | Risk | MITIGATING | Explicit manifest + contract test prevents accidental duplicate/missing critical seams. |
| RISK-002 | Risk | ACTIVE | This environment cannot execute the private repository checkout; validation must remain `NOT_RUN`. |
| QST-001 | Question | BLOCKED_EXTERNAL | Independent vibration-engineering approval remains outside software self-approval. |

## Exact Release Test Manifest

### Group A — central API / Console / product entry

- `tests/engineering-calculation-core.test.mjs`
- `tests/engineering-calculation-console-static.test.mjs`
- `tests/engineering-calculation-console-fit-preflight.test.mjs`

### Group B — FIT method/source/evidence

- `tests/fit-workbook-source-extractor.test.mjs`
- `tests/vibration-fit-workbook-reference.test.mjs`
- `tests/vibration-fit-ei-worked-examples.test.mjs`
- `tests/vibration-fit-independent-benchmarks.test.mjs`
- `tests/vibration-fit-physical-context.test.mjs`
- `tests/vibration-fit-qualification-coverage.test.mjs`
- `tests/vibration-fit-screening-candidate.test.mjs`

### Group C — table exchange / dataset / facility execution

- `tests/vibration-table-exchange.test.mjs`
- `tests/vibration-tabular-input.test.mjs`
- `tests/vibration-csv-export.test.mjs`
- `tests/vibration-integrity-dataset.test.mjs`
- `tests/vibration-facility-fit-plan.test.mjs`
- `tests/vibration-facility-fit-preflight.test.mjs`
- `tests/vibration-facility-fit-execute.test.mjs`
- `tests/vibration-facility-fit-register.test.mjs`
- `tests/vibration-facility-fit-workflow.test.mjs`
- `tests/vibration-facility-fit-tabular-workflow.test.mjs`

### Group D — workspace / UI / architecture

- `tests/vibration-workspace-model.test.mjs`
- `tests/vibration-integrity-detail-view.test.mjs`
- `tests/vibration-integrity-tab-static.test.mjs`
- `tests/vibration-module-boundaries.test.mjs`
- `tests/vibration-fit-release-gate.test.mjs` (new self-contract)

## Stage Protocol

### Stage 1 — Report / findings

Status: COMPLETE.

Findings:

- `package.json` has no FIT/VIB verification command.
- `scripts/verify-inputxml-release.mjs` establishes the repository pattern for a fail-fast release command.
- PR #438 merged all product layers and the tests listed above.
- Normal network access from this runtime fails, so execution evidence cannot be generated here.

Decision: implement a local release runner only; do not add workflow infrastructure or authority changes.

### Stage 2 — PR allocation / sync

Status: IN_PROGRESS.

- Draft PR #440 created from merged main `5f5f78e...`.
- Report is being renamed from `PR_PENDING` to `PR440`.

### Stage 3 — changed-file verification

Status: NOT_STARTED.

Expected pre-code diff after report rename: exactly `agents/PR440_workreport.md`.

### Stage 4 — implementation

Status: NOT_STARTED.

Planned files:

- `scripts/verify-vibration-fit-release.mjs`
- `package.json`
- `tests/vibration-fit-release-gate.test.mjs`

### Stage 5 — validation / closure

Status: NOT_STARTED.

## Changed-File Ledger

Expected final assignment-only files:

- `agents/PR440_workreport.md`;
- `scripts/verify-vibration-fit-release.mjs`;
- `package.json`;
- `tests/vibration-fit-release-gate.test.mjs`.

No production vibration kernel files are planned.

## Validation Ledger

| Check | Status |
|---|---|
| Source review of package/release-script convention | PASS |
| Pre-code changed-file reconciliation | NOT_RUN |
| Release-gate contract test source review | NOT_RUN |
| Release runner source review | NOT_RUN |
| `npm run verify:vibration-fit-release` | NOT_RUN / environment cannot checkout private repo |
| Full current-head browser/XLSX integration | NOT_RUN |
| Engineering screening authority | NOT_AUTHORIZED |

## Known / Deferred Work

- Execute the new release command in a normal authenticated checkout with Node/dependencies available.
- Record exact PASS/FAIL output in this report/PR when available.
- Complete adopted EI/project method review and independent vibration-engineer approval before any authority promotion.

## Forward Sequence

1. Complete report rename and delete `PR_PENDING`.
2. Reconcile pre-code diff.
3. Implement one-command release gate, package command and self-contract.
4. Source-review final diff and keep runtime status explicit.
5. Leave PR draft until actual current-head execution evidence is attached, unless owner explicitly directs otherwise.

## Next-Agent Handover

- PR #440 is validation-only.
- Do not change FIT engineering authority.
- Do not add workflow infrastructure or unrelated tests.
- Keep the gate deterministic and reviewable.
