# PR614 Work Report — C8 scale qualification

## Current state

```text
PR = 614
BRANCH = agent/xml-cii-c8-scale-qualification-20260818
BASE_MAIN = e93cf16b9670a9876135a659b4f26506857b2c36
WORK_INTENT = VALIDATE
CRITICALITY = STANDARD / VALIDATION_ONLY
PRODUCTION_BEHAVIOR_CHANGE = NONE
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_PR614
WORKER_ADMISSION = NOT_ADMITTED
```

## Result

Adds one deterministic 10k/50k/100k scale qualification test for already-landed master virtualization/search and Weight-only Preview incrementality. Local execution is 6/6 PASS. Remote test blob `e6b65f3b433bff0dd5b4ddd00045adbeabc1e856` matches the locally executed file exactly.

At 100k rows: DOM data-row window remains <=60, all 1,031 synthetic search matches remain addressable, one initial full Preview build is followed by one Weight-only build, `branchRowsReused=100000`, and `nodeRowsRecomputed=100000`.

Observed Node diagnostics are evidence only: search-index ~3.984 ms at 100k; synthetic row-copy-only Weight phase ~1.847 ms. No timing threshold is part of acceptance.

Chromium headless qualification is NOT_RUN: even a trivial page produced 0 DOM bytes and timed out in this container. Worker admission therefore remains NOT_ADMITTED.

No production, workflow, support/GAP, writer/runtime, formula, unit, topology, cache, or worker code changes.

## EXACT_NEXT_ACTION

Reconcile PR614 reviews/checks/scope and leave draft/unmerged pending explicit owner authority. C5 Material-Master-only incremental integration is technically qualified in read-only trace but BLOCKED_BY_ACTIVE_CLAIM because it requires `xml-cii-adapted-preview-dryrun.js`, currently modified by PR613.
