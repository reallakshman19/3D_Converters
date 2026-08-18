# WIP-XMLCII-C8-20260818 — Batch-C scale qualification ladder

## Current state

```text
BASE_MAIN = e93cf16b9670a9876135a659b4f26506857b2c36
BRANCH = agent/xml-cii-c8-scale-qualification-20260818
WORK_INTENT = VALIDATE
CRITICALITY = STANDARD / VALIDATION_ONLY
PRODUCTION_BEHAVIOR_CHANGE = NONE
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
WORKER_ADMISSION = NOT_ADMITTED
```

## Mission

Add a deterministic 10k/50k/100k scale qualification ladder for the already-landed Batch-C mechanisms without introducing machine-dependent timing thresholds.

The ladder locks two production invariants:

1. master Preview virtualization/search keeps the physical data-row window <=60 while retaining every matching authoritative source row;
2. Weight-only Preview performs exactly one initial full build followed by one partial build, reuses all branch rows, and reports exact dependent node-row recomputation counts.

## Local execution

`tests/xml-cii-standalone-scale-qualification.test.mjs`: **6/6 PASS**.

Observed diagnostics on this Node runtime (evidence only, not thresholds):

```text
10k  search-index ~1.081 ms; matches 104; DOM <=60
50k  search-index ~2.727 ms; matches 516; DOM <=60
100k search-index ~3.984 ms; matches 1031; DOM <=60

10k  synthetic Weight-only copy ~0.475 ms
50k  synthetic Weight-only copy ~1.742 ms
100k synthetic Weight-only copy ~1.847 ms
```

The Weight-only timing is deliberately a synthetic row-copy phase and is not represented as real engineering reranking latency.

## Browser evidence attempt

Chromium exists at `/usr/bin/chromium`, but this runtime cannot use it as a headless evidence runner: even a trivial local HTML page produced 0 DOM bytes and timed out after repeated system-bus startup failures. Browser qualification therefore remains `NOT_RUN`; the tool failure is not product evidence.

## Scope

New test only:
- `tests/xml-cii-standalone-scale-qualification.test.mjs`

No existing file is edited, so the repository pre-edit backup rule is not invoked for production/test source.

## Negative assurance

No production module, engineering calculation, support/GAP path, writer/runtime, workflow, formula, unit, topology, cache, worker, or authority boundary changes.

## Worker admission

Still `NOT_ADMITTED`. The scale ladder shows the landed row-window/search-index primitives remain bounded through 100k rows, but it does not provide real full-app main-thread timing. C3 worker ownership remains unjustified without that evidence.

## EXACT_NEXT_ACTION

Publish the exact locally executed 63-line scale qualification test, verify remote blob parity, open a draft validation PR against current main, reconcile reviews/checks/scope, and leave unmerged pending explicit owner authorization. Then resume read-only C5 dependency-specific recomputation trace.
