# PR780 — XML→CII master dataset worker boundary

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
REPORT_BASIS_CODE_HEAD: d4503be54c964b5e98759836b2529ff4e6301cd3
MAIN_HEAD_LAST_CHECKED: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
MERGE_BASE: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
PR: 780
PR_STATE: OPEN_DRAFT
GROUNDING_EPOCH: GE-XMLCII-DATAWORKER-20260929-02
CURRENT_STAGE: post-green performance acceptance audit
CURRENT_BLOCKER: worker-backed Preview search is not wired; complete rows are still hydrated to main thread
HIGHEST_RISK: claiming metadata-only / 100k responsiveness before the UI path actually satisfies it
EXACT_NEXT_ACTION: obtain native pre-edit backup for current xml-cii-adapted-import-masters.js, wire dataset-backed Preview search to worker SEARCH, then run Chromium 10k/50k/100k responsiveness evidence
```

Source issue: #776. Branch: `agent/xml-cii-master-dataset-worker-20260929`.

## Current implementation state

PR780 now has an active dedicated Master Dataset Worker boundary:

- transferable file `ArrayBuffer` client path;
- two-stage XLSX discovery / selected-sheet parsing;
- worker mapping, normalization, search corpus and IndexedDB persistence;
- metadata-only `supportConfigJson` for worker-backed datasets;
- stale-generation protection and worker termination cancellation;
- startup IndexedDB hydration;
- source/docs deployment mirrors for the wired runtime and all ten worker modules.

Protected engineering authority remains unchanged by intent: DRAFT mapping is non-authoritative, APPLIED revision advances only on successful current-generation commit, and support/GAP/topology/geometry/units/writer numerical semantics are outside this PR.

## Exact-head CI evidence

Validation run #75 (`36556428565`) on code head `d4503be54c964b5e98759836b2529ff4e6301cd3`:

```text
Issue #776 focused regressions        24/24 PASS
PR780 master dataset regressions      21/21 PASS
deployment mirror/cache chain         PASS
WSW exact-head browser conversion     PASS
adjacent suite on PR head             6 failures
adjacent suite on base                same 6 failures
adjacent classification               baseline-only-failures
new adjacent failure identities       0
applicable enforcement                PASS
workflow conclusion                   SUCCESS
```

The six adjacent engineering-calculation failures are identical on PR head and base `cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520`; they are not classified as PR780 regressions.

## Post-green acceptance audit

Green authority/deployment CI is necessary but not sufficient for the performance mission.

### Gap A — full main-thread materialization remains

`master-dataset-import-coordinator.materialize()` fetches every normalized chunk and every raw chunk and accumulates full `rows[]` / `rawRows[]`. `xml-cii-adapted-master-worker-events.js` then commits those arrays into `masterContext`.

Therefore IndexedDB/config custody is corrected, but the current implementation is not yet a strict metadata-only main-thread dataset architecture.

### Gap B — Preview search still scans synchronously on main thread

`xml-cii-adapted-import-masters.js` still executes:

```js
indexes = buildMatchingRowIndexes(allRows, searchInput.value, previewSearchText);
```

The worker exposes SEARCH, but the Preview UI does not currently route dataset-backed queries to it.

### Gap C — real scale responsiveness is not yet qualified

```text
10k browser import responsiveness     NOT_RUN
50k browser import responsiveness     NOT_RUN
100k browser import responsiveness    NOT_RUN
100k Preview main-thread scan = 0     NOT_YET_TRUE
strict metadata-only main-thread rows NOT_YET_TRUE
```

PR614 remains useful historical scale evidence for virtualization/search index correctness, but its own record explicitly says browser qualification was NOT_RUN and workers were NOT_ADMITTED; it cannot qualify PR780's worker integration.

## Backup / edit gate

The next bounded production target is `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js` for worker-backed Preview search routing. Repository policy requires a native pre-edit backup of the **current bytes** before editing an existing production JS file. The prior C2 virtualization backup was taken against an older stack base and does not establish a fresh current-byte backup for this takeover slice.

Do not bypass this with a connector-side copy.

## Merge boundary

Draft only. `MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED`.

Do not call PR780 performance-complete or merge-ready until the open scale/search/materialization criteria are explicitly resolved or the Owner narrows the acceptance target.