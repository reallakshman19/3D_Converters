# LFJ R10 — actual cross-runtime Worker source port (U01/U02 prototype)

Governance: [R10 #1088](https://github.com/reallaksh19/3D_Converters/issues/1088) existing C5_PORTS (5 original programme points), admitted by [PR #1089](https://github.com/reallaksh19/3D_Converters/pull/1089) after accepted R06 and R09; product source `lfj/ports/**` only. Full C5_PORTS responsibility remains **IN PROGRESS** until Node and actually served browser Worker outputs, scoped R08/R09 pages, unsupported-capability cases and deployment permissions are qualified. No new graph claim.

## Wire protocol (source facts only; NO R07 commit)

The host constructs a **real native isolated Worker** — `source-node-worker.mjs` via `node:worker_threads.Worker` or `source-browser-worker.mjs` via native browser `new Worker(url,{type:'module'})`. It sends a single message `{schema:'LFJ.CrossRuntimeSourcePort.v1',kind:'SCAN',jobId,sourceRefId,revision,blob,expectedSha256,pageEvents}` with a structured-cloned native Blob. Worker modules delegate to the same `scanSourceInsideWorker` and compute the R03 immutable original-byte SHA plus R04/R05 occurrence stream entirely inside the Worker; **no foreground JSON.parse, no fake READY/ACK-only worker**.

Each outbound `PROVISIONAL_PAGE` contains `sequence`, exact job/ref and up to `pageEvents` original R05 event rows. **At most one source event page may be unacknowledged**: host must stage the exact event page in its own transaction and return `{schema,kind:'PAGE_ACK',jobId,sourceRefId,sequence}` only after staging succeeds. The scan waits for this ACK before reading/emitting further pages, with a bounded 5-second timeout. Wrong/missing ACK rejects the scan with a typed source-port fault and cannot produce `SCAN_DONE`. `FAILED` may follow earlier provisional pages; the host must rollback staging, never interpret it as a valid empty or partial engineering result.

Only after full original JSON grammar and complete source event census does Worker send `SCAN_DONE` with `LFJ.JSON.OccurrenceIndexSummary.v1` (`complete:true`, `rightsBasis:SOURCE_FACTS_ONLY`, `engineeringReady:false`). This is **not** `LFJ.WorkerLifecycle.v1 SOURCE_INDEX_COMPLETE`: only the separate R07 transaction/verified R06 Worker byte receipt and caller-owned atomic commit may confer a committed source index, and even that grants **no engineering export rights**.

## Genuine cross-runtime verification

- Node22/24 independent `source-worker-port.test.mjs` launches a native WorkerThread entry (not an inline Worker-shaped object); compares source SHA to independent `node:crypto`, checks handwritten nested/escaped RFC6901 pointer census (seven OPEN+seven SEAL), original source replacement with equal byte length, malformed JSON refusal and no-ACK queue-pressure behavior.
- Actual hosted Chromium Playwright launches a **served ES module Worker** at `/lfj/ports/source-browser-worker.mjs`; compares Worker SHA to independent `window.crypto.subtle` **and** Node SHA and original pointer census. Source is served from exact PR checkout by a test-only HTTP server. This is genuine cross-runtime source-code behavior, but **not** the app's deployed `docs/lfj` tree.

## Remaining acceptance vetoes

The existing R05/R07 source-index pipeline has no default persistent queryable store; R09 supplies only the storage-port interface. The present R10 scan sends original provisional events to the host but **does not** yet stitch these facts into a real persistent or complete R07 Worker-consumed receipt plus R08→R09 paged view, or test U03 true selected-page parity in both environments. `docs/lfj` is not deployed, and the graph's `lfj/ports/**` lease cannot be used to edit `docs/**`, Resolver `tabs/**`, CI mirror owners or independent domain adapters without a V3.2 authorized claim-preserving amendment.

Do not claim live Resolver, authentic XML-CII/DTXR/POS/PS outputs, 10.54/30/90MB browser performance, cross-session cursor durability, or adoption by future repositories. Source facts remain distinct from R02 typed Site/Zone ownership, R08 selection, GC-PW Basis or edit authority.
