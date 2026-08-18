# PR620 — XML→CII Browser Semantic-Core Timing

## Authority

Validation-only Batch-C worker-admission evidence. No production file is modified.

## Baseline

- main: `22b7b57fed3e78534da41342fc3240c8d27369c3`
- landed dependency sequence: #611 → #613 → #617 → #618
- benchmark: `Benchmarks/css/SYS-0010.xml`

## Required evidence

A real Chromium run must execute the checked-out production `xmlCiiDryRunPreview()` graph and report:

- cold full Preview duration;
- same-source Line/Piping semantic rebuild duration;
- Material-only duration;
- Weight-only duration;
- source parse count/cache-hit count;
- incremental routing counters;
- branch/node cardinality;
- controlled master-row cardinality;
- browser identity and hardware concurrency.

## Worker gate

`50 ms` is the main-thread long-task boundary used for this qualification. Crossing it does not automatically admit workers: master-cardinality scaling is inspected first because the current semantic core performs Line List lookup inside the branch loop. If the 1000-master stress case alone crosses the boundary, indexing is the required next action before worker offload.

## State

`BROWSER_EXECUTION = PENDING_GITHUB_ACTIONS`

Do not represent Node or reconstructed harness timings as this browser evidence.
