# LFJ/1.0 R03 — Immutable source-byte custody

**Authority:** [LFJ parent #1042](https://github.com/reallaksh19/3D_Converters/issues/1042), bounded [child #1057](https://github.com/reallaksh19/3D_Converters/issues/1057), Common V3.2 ENFORCED proposal-v2 and the frozen source-custody architecture. The only production surface here is `source-snapshot.mjs` under `lfj/source/`.

## SourcePort at R03 boundary

`createSourceSnapshotBuilder({byteLength,expectedSha256?,revision,maxChunkBytes?})` accepts a declared immutable revision generation plus **ordered original Uint8Array chunks** (default per-input chunk budget 1MiB); `append(bytes,offset)` enforces exact contiguous ordering and defensively copies data. `finalize()` succeeds only after exact declared bytes arrive and after comparing the streaming SHA-256 to an optional external original-byte digest. An incomplete or bad-hash source **never becomes READY**. `SourceSnapshotError.code` is stable and typed.

Finalized `LFJ.SourceSnapshot.v1` exposes `byteLength`, `sha256`, `sourceId`, `revision`, `encoding='UTF-8'`; bounded `readRange(startByte,endByteExclusive,revision)` and `readChunks(revision,maxChunkBytes)`; and `close()` for custody disposal. The returned revision binds the caller generation **and** independently recomputed SHA. Read calls reject absent/stale revision, invalid UTF-8 byte bounds and oversize (>1MiB) projections even if a caller tries to override the read cap. Retained source chunks cannot be changed through input aliases or returned copies. Original bytes, including BOM or malformed UTF-8, are retained unchanged; **validating JSON / UTF-8 is R04**, not this custody leaf.

**Scope limitation:** This is a pure local custody primitive, NOT a Worker, streaming tokenizer, Node file opener, browser UI, tenant-safe HTTP object handle, engineering export or 30/90MB performance claim. The raw source SHA in a local object is not a tenant authorization token; R11 must wrap handles/cursors in tenant-aware authorization.

## RED first / independent Node oracle

- Initial test-only RED commit `711b54dc7d09f233368f1f0781a4bcd3e1410e5b`: `node --test lfj/source/source-snapshot.test.mjs` fails `ERR_MODULE_NOT_FOUND` without the new contract (precommitted tests).
- Additional meaningful RED commit `faec9807953258c2294c3e25b34a70fa8de4e174`: a caller requesting >1MiB in one range must get `RANGE_LIMIT`, and the first R03 implementation erroneously permitted override. Independently executed RED reported `Missing expected exception`; repair commit `d2ab8d90d7da56c51a4d66316b47cd54139fd41e`.
- Test groups: exact original byte SHA-256 checked with Node `crypto.createHash` and standard SHA-256 `abc` digest; UTF-8 multibyte/UTF-16 offset distinction and copy safety; same-size interior mutation stale revision; partial, reordered, duplicated, overflow, mismatched hash, closed handle and 1MiB hard projection bound.
- Supplementary local independent hash oracle ran 12 buffer sizes from 0 to 1MiB including 55/56/63/64-byte block boundaries. **These are synthetic functional vectors, NOT populated 30/90MB or Chromium performance results.**

## Existing real-source custody references (not re-attested by this branch)

- [3D original managed stage](https://github.com/reallaksh19/3D_Converters/blob/90437ba460ccbe886448513ee6a4d655a3e3f7f6/Benchmarks/Managejson%20to%20Input%20XML/ATTRIBUTE_managed_stage.json), blob `4183d5853fde74787dc180bda49f55d5b3479d57`, prior SHA256 `e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a`, 10,539,386 bytes.
- [XCU original managed stage](https://github.com/reallaksh19/XML_Compare_Utilities/blob/2e588a5469f463b177990d7f8683deb56ce48a0e/Benchmark/ATTRIBUTE_managed_stage_1885_Steam.json), blob `9e192a074614f40597b164321aabd94be49c70cf`, prior SHA256 `38c6080c73f84e55581ad75dcbfb6b580ea587fc287ecf1861d9dc8e793b5cd3`, 1,108,586 bytes.
- **Not in this branch:** full original-byte rehash of those two real fixtures, populated real 30/90MB, independently signed JSON/XML/CSV/trace outputs, browser/Node hosted performance and heap, or live source/docs deployment parity.

**Direct test command:** `node --test lfj/source/*.test.mjs`. R03 exact GitHub runner still requires a distinct hosted qualification mechanism under an exclusive governance lease; do not infer it passed from local tests. No PR should merge from this note alone.
