# WIP-XMLCII-WEIGHT-TOP5-20260818 — legacy Weight Match bounded top-five

## Recovery state

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
PR_OR_WIP: WIP-XMLCII-WEIGHT-TOP5-20260818
BRANCH: agent/xml-cii-weight-match-top5-20260818
MAIN_HEAD_LAST_CHECKED: 3a26d25902ef8d6f304422cba507f2500dfa61a1
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
```

## Mission

Optimize the legacy standalone Weight Match candidate ranking only. Current correctness already keeps the top five per issue; the performance defect is that each issue allocates/scans all valid master candidates, sorts the full scored list, then slices five.

Target: replace full per-issue sort/allocation with stable bounded top-five selection while preserving exact score fields, candidate order on ties, candidate IDs, per-issue grouping, overrides, diagnostics and finalization.

## Ground truth

- main: `3a26d25902ef8d6f304422cba507f2500dfa61a1` after #632 and #628 merges;
- production target: `tabs/xml-cii-2019-standalone/xml-cii-weight-match.js`;
- pre-edit blob: `3312ea78d6fdfde8ea82130b4ed30597ca40b2d1`;
- no open PR or active claim found for this exact production file;
- #616 Preview Search and C5/C5M adapted Preview files are excluded.

## Complexity target

Before: per issue `M` scored-row allocations plus full `M log M` sort, then keep five.

After: per issue one pass through `M` valid candidates and at most five retained scored rows; bounded insertion cost. Scoring semantics remain unchanged.

## Falsifier

For arbitrary/tied candidate fixtures, optimized candidate rows must be deep-equal to the legacy `map -> stable sort(totalScore desc) -> slice(0,5)` result for every issue. Tie order must remain source-master order.

## Validation state

- source trace: PASS;
- exact-file overlap: PASS / NONE FOUND;
- mandatory pre-edit backup: NOT_RUN;
- focused equivalence/scale regression: NOT_RUN;
- repository-native/browser suite: NOT_RUN / ENVIRONMENT_BLOCKED.
