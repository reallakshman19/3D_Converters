# PR_PENDING — FIT / VIB Release-Gate Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add a deterministic one-command release verification entrypoint for the merged FIT/VIB benchmark product without changing engineering authority or numerical behavior. |
| Source task | Owner instruction after merge of PR #438: proceed with the remaining current-head executable-regression / engineering-review gate. |
| Base | `main` at `5f5f78e080596ccf70f7f19c03fbd4050e6993ab` |
| Branch | `agent/fit-vibration-release-gate` |
| PR | PENDING |
| Current stage | **Stage 1 — REPORT / FINDINGS** |
| Engineering authority | FIT remains `BENCHMARK_ONLY`; screening/design authority remains NOT AUTHORIZED. |
| Product boundary | Table-only vibration product; no 3D/canvas/model runtime. |

## Handover in 60 Seconds

PR #438 is merged. The remaining software gate is to make the complete FIT/VIB regression runnable from a normal checkout with one fail-fast command and a controlled list of tests. This environment cannot execute the private checkout because normal GitHub network access is unavailable, so this PR must not claim runtime PASS evidence it cannot produce.

Planned product path remains:

```text
Engineering Calculations
  -> Calculations
     -> Vibration & Dynamic Screening (6)
        -> FIT benchmark workspace
```

## Mission / Engineering Intent

1. Provide one deterministic command for the merged FIT/VIB release regression.
2. Run existing tests only; do not create a second numerical path.
3. Fail immediately on the first failed test process.
4. Include central Engineering API/core and Console/VIB-family tests because the product surface depends on them.
5. Include exchange/dataset/facility/tabular/workspace/UI/source-extractor tests required by the merged product.
6. Keep the test manifest reviewable in source.
7. Do not modify FIT equations, coefficients, applicability, LOF semantics or authority state.
8. Do not add AIV/SBC/cavitation/surge/slug numerical code.
9. Do not add or modify GitHub Actions; the current runner/billing limitation is external and workflow changes would not supply trustworthy execution evidence.
10. Preserve prior evidence chronology: older 235/235 and focused runs remain prior-head evidence, not current-head PASS.

## Mission Status

| Work item | Status |
|---|---|
| Inspect current package/release-script conventions | DONE |
| Define exact FIT/VIB release test manifest | IN_PROGRESS |
| Add release verification script | NOT_STARTED |
| Add package command | NOT_STARTED |
| Add self-test/static contract for release gate | NOT_STARTED |
| Run release gate in this environment | BLOCKED_ENVIRONMENT |
| Full current-head execution in normal checkout | NOT_RUN |
| Engineering authority review / approval | BLOCKED_EXTERNAL_REVIEW |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | Use a repository-local fail-fast Node runner, consistent with `verify:inputxml-release`. |
| DEC-002 | Decision | ACCEPTED | No workflow/CI infrastructure change in this assignment. |
| DEC-003 | Decision | ACCEPTED | Release gate runs existing tests and never promotes engineering authority. |
| RISK-001 | Risk | ACTIVE | A stale test manifest could omit a product dependency; add a manifest contract test / explicit grouping. |
| RISK-002 | Risk | ACTIVE | This environment cannot execute the private repository checkout; validation must remain `NOT_RUN`. |
| QST-001 | Question | BLOCKED_EXTERNAL | Independent vibration-engineering approval remains outside software self-approval. |

## Stage Protocol

### Stage 1 — Report / findings

Status: IN_PROGRESS.

Findings so far:

- `package.json` currently has no FIT/VIB verification command.
- The repository already uses a fail-fast release script pattern in `scripts/verify-inputxml-release.mjs`.
- PR #438 merged the FIT domain, central adapter, exchange/dataset/facility/tabular/workspace layers, Console/VIB family landing, UI, source extractor and evidence tests.
- A release-gate command should exercise those merged seams together from one checkout.
- Normal network access from this runtime fails, so execution evidence cannot be generated here.

### Stage 2 — PR allocation / sync

Status: NOT_STARTED.

### Stage 3 — changed-file verification

Status: NOT_STARTED.

### Stage 4 — implementation

Status: NOT_STARTED.

### Stage 5 — validation / closure

Status: NOT_STARTED.

## Planned Changed-File Ledger

Expected assignment-only files:

- `agents/PR_PENDING_workreport.md` then `agents/PR<NUMBER>_workreport.md`;
- `scripts/verify-vibration-fit-release.mjs`;
- `package.json`;
- one focused release-gate contract/static test if needed.

No production vibration kernel files are planned.

## Validation Ledger

| Check | Status |
|---|---|
| Source review of package/release-script convention | PASS |
| Current-head release gate execution | NOT_RUN |
| Full current-head browser/XLSX integration | NOT_RUN |
| Engineering screening authority | NOT_AUTHORIZED |

## Known / Deferred Work

- Execute the new release command in a normal authenticated checkout with Node/dependencies available.
- Record exact PASS/FAIL output in this report/PR when available.
- Complete adopted EI/project method review and independent vibration-engineer approval before any authority promotion.

## Forward Sequence

1. Finish Stage 1 exact test inventory.
2. Open draft PR and rename report to PR number.
3. Reconcile changed-file baseline.
4. Implement one-command release gate and its focused contract test.
5. Source-review the gate; do not claim runtime PASS unless actually executed.

## Next-Agent Handover

- Do not change FIT engineering authority in this PR.
- Do not add workflow infrastructure or unrelated tests.
- Keep this PR narrowly about making current-head regression executable and reviewable.
