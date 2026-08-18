# PR #615 Stage 2 — Engineering Source Identity

## Grounding epoch

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by Owner instruction `proceed next stack on same PR`
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- BASE_MAIN_SHA: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- PR: #615, draft/open/mergeable
- REPORT_BASIS_HEAD: `47008276b238ec5a95bf05375abccc427ec1c6e6`
- BRANCH_RELATION: ahead 8 / behind 0
- REVIEWS: 0
- REVIEW_THREADS: 0
- COMMIT_STATUSES: 0 returned
- PR_WORKFLOW_RUNS: 0 returned
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Stage coordination decision

The planned mechanism-workspace consumer is presently `BLOCKED_BY_ACTIVE_CLAIM`:

- PR #479 owns `tabs/vibration-integrity-tab.js` (FIT top-level workspace);
- PR #506 owns `tabs/engineering-calculations-tab.js` and `tabs/vibration-aiv-qualification-tab.js` plus AIV runtime files;
- PR #508 owns `tabs/vibration-integrity-mechanisms.js` and SBC facility/view paths.

PR615 will not edit through those claims. The prior statement that the shared engineering tab had no active claimant is stale and must be corrected in the final work report.

This stage therefore continues with the next unblocked P0 correction: explicit engineering source identity.

## Source authority and scope

Primary publication identity is grounded to the Energy Institute publication page/sample:

```text
publisher     = Energy Institute
publication   = Guidelines for the avoidance of vibration induced fatigue failure in process pipework
edition       = 2nd
publication   = January 2008
ISBN          = 9780852934630
```

The official sample contents establishes technical modules T1 through T13. It does not independently establish all current repository mechanism subsection/flowchart mappings.

Therefore the implementation shall keep distinct fields for:

```text
technicalModule
sectionId
flowchartId
equationId
tableId
figureId
printedPage
pdfPage
```

No bare `T2.x` string may silently stand for both a section and a flowchart.

Repository-only mechanism locator labels may be retained as reconciliation evidence, but must be visibly marked `RECONCILIATION_REQUIRED` until controlled-source reconciliation is complete.

Thermowell must not silently collapse EI T4 and the current repository ASME PTC 19.3 TW-2016 label into one method identity; the roadmap binding shall expose the conflict.

## Authority trace

```text
Energy Institute publication / controlled source
  -> EngineeringMethodSource.v1 registry
  -> roadmap source binding
  -> VibrationRoadmapProjection.v1
  -> read-only right-panel source label
```

This stage may change source identity metadata and its visual publication only. It may not change applicability, numerical equations, LOF, reduction/aggregation, qualification, screening authority, or design authority.

## Prediction / falsifier

Prediction:
- every roadmap node gains either an explicit source identity or an explicit unresolved/conflicted source state;
- T1/T5-T13 lifecycle nodes resolve to distinct technical modules;
- T2 mechanism nodes retain section/flowchart separation;
- thermowell renders a source conflict;
- no source state changes any roadmap applicability/result state.

Falsifier:
- a test can make a bare ambiguous locator become authoritative without typed locator fields;
- a source conflict is hidden or automatically resolved;
- source metadata changes `status`, LOF, applicability, completeness, screening authority, or design authority;
- an active mechanism-workspace/shared-tab file is modified in this stage.

## Validation plan

1. contract tests for typed locator separation and fail-closed unknown/status data;
2. registry tests for publication identity, T1-T13 module custody, mechanism reconciliation states, and thermowell conflict;
3. projection tests proving source metadata is observational with respect to engineering status;
4. renderer tests proving the source state is operator-visible;
5. syntax and <300-line checks;
6. repository-native/browser gates remain separately reported if not executable.

## Appendix A

NOT_REQUIRED_FOR_CONTINUATION — same active implementation agent and PR; this is not a takeover. Engineering-critical validation and authority boundaries remain mandatory.

## EXACT_NEXT_ACTION

Implement `EngineeringMethodSource.v1` plus the controlled source registry, consume it in the PR615 roadmap registry/projection/panel, add focused regressions, then update PR615 workreport/status/claim and reconcile the changed-file ledger. Do not touch active FIT/AIV/SBC mechanism workspace files or workflow files.
