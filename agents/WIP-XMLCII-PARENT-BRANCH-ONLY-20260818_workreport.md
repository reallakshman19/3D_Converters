# WIP-XMLCII-PARENT-BRANCH-ONLY-20260818 — parent Run-parity branch-only Preview

## Recovery state

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_STALE_MERGED_PREDECESSOR
MERGE_AUTHORITY: OWNER_AUTO_MODE_GRANTED
REPOSITORY: reallaksh19/3D_Converters
PR_OR_WIP: WIP-XMLCII-PARENT-BRANCH-ONLY-20260818
BRANCH: agent/xml-cii-parent-branch-only-20260818
MAIN_HEAD_LAST_CHECKED: 765d15e87def22291792ddb533df9ea532fb3f67
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
```

## Mission

Finish the execution-granularity step left intentionally open by merged PR #630. The parent Model Converters Run-parity call consumes only Preview `branchRows`; normal Preview also constructs node Weight-review rows. Add an opt-in branch-only mode to the legacy parent Preview and make Run-parity request it, eliminating discarded node-row traversal/ranking while preserving ordinary Preview behavior.

## Ground truth

- current main: `765d15e87def22291792ddb533df9ea532fb3f67` after #633;
- predecessor PR #630 is live `closed/merged=true` at merge commit `e3fa32bf...`;
- its committed claim/status still say ACTIVE_DRAFT and are stale repository metadata; this successor will supersede/release that stale custody explicitly;
- production targets:
  - `tabs/model-converters/converters/xmltocii2019_helper/preview-renderer.js` blob `a347007b2b233715c13eb0ced28a5003d9b0079b`;
  - `tabs/model-converters/converters/xmltocii2019_helper/xml-cii-parent-run-parity-weight-scope.js` blob `c3a6f88db3032aa661adec0493534e720a875e3c`;
  - `tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js` blob `ef13ef3f08c310741cdce95f237b4318ccd040cd`.

## Design

- extend legacy `xmlCiiDryRunPreview(..., options = {})` with opt-in `options.branchRowsOnly === true`;
- branch authority calculations remain identical;
- after each branch row is appended, branch-only mode skips node-row construction entirely;
- default/normal Preview path remains unchanged and still returns node Weight-review rows;
- Run-parity helper requests branch-only mode and stops mutating `config.weight.masterRows`;
- bump parent import query versions so deployed browsers load the new helper/Preview bytes.

## Invariants / falsifiers

- branch-only `branchRows` must deep-equal normal Preview `branchRows` for the same inputs;
- normal Preview must still execute node ranking and return node rows;
- branch-only must perform zero node Weight ranking and return `nodeRows: []`;
- config object and Weight Master array identity/value must remain untouched by the Run-parity helper;
- no adapted Preview/C5/C5M files, shared ranker, engineering values, support/GAP, writer/runtime, Python, workflows or workers change.

## Validation state

- source/dependency trace: PASS;
- predecessor closure reconciliation: PASS / PR630 MERGED, metadata stale;
- mandatory backups: NOT_RUN;
- focused branch-row equivalence: NOT_RUN;
- node-work suppression: NOT_RUN;
- repository-native/browser suite: NOT_RUN / ENVIRONMENT_BLOCKED.
