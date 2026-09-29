# PR780 — XML→CII master dataset worker boundary

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
REPORT_BASIS_CODE_HEAD: 2175e38252359ef823dd0ba3738ff547e8343333
MAIN_HEAD_LAST_CHECKED: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
MERGE_BASE: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
PR: 780
PR_STATE: OPEN_DRAFT
GROUNDING_EPOCH: GE-XMLCII-DATAWORKER-20260929-03
PROTOCOL: ENGINEERING_PR_DELIVERY_V3.1
COMMON_BASIS: 1ced68258afeaf50df113b1d38a4ceb9193587e3
TWO_PASS_REVISION: TPG-2P-2026-09-28-R3
CURRENT_STAGE: worker-search slice qualified; full-row compatibility hydration remains
CURRENT_BLOCKER: strict metadata-only main-thread runtime authority requires migration of synchronous engineering consumers
HIGHEST_RISK: removing full row arrays before dependent calculation/runtime consumers are migrated
EXACT_NEXT_ACTION: treat full normalized/raw row hydration as a separate compatibility-boundary plan; do not fold it into the qualified worker-search slice without new tracing and owner-approved scope
```

Source issue: #776. Branch: `agent/xml-cii-master-dataset-worker-20260929`.

## Delivered architecture

PR780 now has an active dedicated Master Dataset Worker boundary with:

- transferable file `ArrayBuffer` ownership;
- two-stage XLSX sheet discovery and selected-sheet parsing;
- worker mapping / normalization / validation / search corpus;
- IndexedDB large-dataset persistence;
- metadata-only `supportConfigJson` for worker-backed datasets;
- atomic current-generation APPLIED commit and cancellation/stale-job protection;
- startup IndexedDB hydration;
- one shared coordinator / one worker for import and Preview search;
- dataset-backed non-empty Preview search executed by worker SEARCH;
- persisted `datasetId` search support after reload;
- stale/out-of-order search-response suppression;
- fail-closed worker-search error handling with no 100k synchronous UI fallback;
- source/docs deployment parity and warm-cache release token `20260929-pr780-worker-search-1`.

Protected engineering authority remains unchanged: DRAFT mapping is non-authoritative; APPLIED revisions advance at the existing successful commit boundary; support/GAP, XML/CII topology, geometry, units, Weight Match, B31.3, and writer/runtime numerical semantics were not changed by this slice.

## Protocol / plan evidence

Engineering PR Delivery V3.1 was re-grounded against:

```text
Common@1ced68258afeaf50df113b1d38a4ceb9193587e3
Two-Pass TPG-2P-2026-09-28-R3
```

Parent issue #776 contains `PLAN_UPDATE — rev 2` before the worker-search implementation and final measured evidence comment `5889359664`.

All existing production/test files edited in the worker-search and cache-chain slices received repository-native pre-edit backup evidence via:

```bash
node utils/backup.js save <file> "<context>"
```

Temporary backup/apply workflows were removed after use.

## Exact-head authority evidence

Qualified code head:

```text
2175e38252359ef823dd0ba3738ff547e8343333
```

Issue #776 workflow run #102 (`36561810999`):

```text
Issue #776 focused regressions         24/24 PASS
PR780 master dataset regressions       24/24 PASS
worker-owned Preview search tests       3/3 PASS (included above)
deployment mirror/cache chain          PASS
WSW exact-head browser conversion      PASS
WSW parity comparisons                 694
WSW parity mismatches                  0
adjacent authority on PR head          17 PASS / 6 FAIL
adjacent authority on base             17 PASS / 6 FAIL
adjacent classification                baseline-only-failures
new adjacent failure identities        0
applicable enforcement                 PASS
Issue #776 workflow conclusion         SUCCESS
```

The six adjacent `engineering-calculation-core.test.mjs` failures are identical on the PR merge ref and base `cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520` and remain classified as baseline-only.

## Chromium 10k / 50k / 100k evidence

Responsiveness threshold: max animation-frame gap <= 250 ms. Synthetic fixture preparation is excluded from product timing.

| Rows | Payload bytes | Worker import | Import max frame gap | Compatibility hydration | Hydration max frame gap | Worker search | Search max frame gap | Last-row match | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10,000 | 966,754 | 141.1 ms | 16.7 ms | 33.7 ms | 16.7 ms | 1.4 ms | 16.2 ms | 9,999 | PASS |
| 50,000 | 4,922,633 | 271.9 ms | 16.7 ms | 95.4 ms | 16.7 ms | 2.6 ms | 16.3 ms | 49,999 | PASS |
| 100,000 | 9,867,486 | 273.5 ms | 16.8 ms | 198.2 ms | 16.7 ms | 3.5 ms | 16.2 ms | 99,999 | PASS |

Every scale found exactly one synthetic needle at the final source-row index, so worker search is not truncated to the Preview window. Worst observed frame gap was 16.8 ms.

Evidence artifact:

```text
name: issue-776-wsw-e2e.zip
artifact_id: 11030521137
sha256: bc1ea554d0d529935b878083e6eeb836cbfd93e01b85fe505cc5271f569a7242
```

## Acceptance ledger

```text
main-thread large XLSX.read                  PASS = 0
main-thread large sheet_to_json              PASS = 0
eager all-sheet materialization              PASS = 0
supportConfigJson dataset payload            PASS = 0
large-master localStorage dataset writes     PASS = 0
100k Preview full sync scan on main thread   PASS = 0 for dataset-backed search
stale/cancelled import authority mutation    PASS = 0
stale search result replaces newer query     PASS = 0
10k / 50k / 100k browser responsiveness     PASS
qualified WSW engineering-result parity      PASS / 694 comparisons / 0 mismatches
strict metadata-only main-thread row custody OPEN COMPATIBILITY BOUNDARY
```

## Remaining compatibility boundary

`master-dataset-import-coordinator.materialize()` still retrieves all normalized/raw chunks and the integration commits those arrays into `masterContext`. This remains because current engineering consumers synchronously read the row arrays.

Real Chromium evidence quantifies the compatibility cost at 33.7 / 95.4 / 198.2 ms for 10k / 50k / 100k rows, with ~16.7 ms maximum frame gap. The current path is responsive, but strict metadata-only main-thread runtime authority is therefore not yet complete.

Do not remove those arrays as an opportunistic optimization. The next slice requires a fresh production-consumer trace, authority plan, and migration design for synchronous calculation/runtime readers.

## Repo-wide CI classification outside PR780 authority

PR780's top app-shell cache token was reconciled in CAESAR/FBX cache-contract tests. Their remaining failures advance to older Model Converter cache assertions that this PR did not change. StagedJSON/InputXML also retains independent runtime/offline asset-contract failures outside the XML→CII worker-search changed paths. Do not expand PR780 to repair those unrelated baselines without a separate plan.

## Merge boundary

PR780 remains Draft. `MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED`.

No merge action has been taken.