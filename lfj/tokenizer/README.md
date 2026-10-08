# LFJ R04 — bounded original-byte incremental JSON grammar, U01 only

**Owner child:** [#1062](https://github.com/reallaksh19/3D_Converters/issues/1062); parent [#1042](https://github.com/reallaksh19/3D_Converters/issues/1042); released V3.2 claim C2_TOKENS=5/130, four separable 25%-weight units. **Qualified narrow units: U01 escaped strings and U02 Unicode fidelity. U03 full JSON grammar and U04 global budgets are NOT accepted.**

## Downstream-first source identity

This module imports no Preview/Weight code and never changes [GC-PW/1.0](https://github.com/reallaksh19/3D_Converters/blob/main/contracts/gc-pw-v1/contract.mjs) source IDs, `basisId`, Mode B XML order, physical source ordinals, `RigidMatch1`, `Rigidmatch2` or final CII mass. It reads R03 immutable original bytes, not a string length, filename, pointer into a cloned object or guessed engineering selection.

**Upstream:** R03 `LFJ.SourceSnapshot.v1`, including sync in-memory `readRange` and async Blob-backed `readRange`; both carry SHA and revision, and enforce <=1MiB page reads. Original bytes are never mutated and old revisions reject reads. R03 exact [Node 22/24 original 10.54MB source gate](https://github.com/reallaksh19/3D_Converters/actions/runs/37783551081) passed. R01 separately provides [AST-free token-derived RootFacts](https://github.com/reallaksh19/3D_Converters/pull/1053); R04 is not allowed to manufacture `complete:true` before **all** JSON grammar has been checked in U03.

## API implemented at U01

`createJsonByteCursor(snapshot,{startByte=0,pageBytes=65536,signal=null})` exposes `sourceSha256`, `sourceRevision`, `byteLength`, current `position`, `peek()`, `take()`. The cursor asynchronously reads a bounded original source range, over either synchronous or asynchronous R03 store. `pageBytes` is 1..1MiB. Operations reject invalid source/range, stale or closed R03 source, and AbortSignal cancellation with typed errors. Cursor position and scanner token spans are original UTF-8 byte offsets, never JS UTF-16 offsets.

`scanQuotedJsonString(cursor,{maxTokenBytes=65536})` consumes exactly one **quoted JSON string token**, returning immutable `{type:'string',startByte,endByteExclusive,value,sourceSha256,sourceRevision}`. It preserves even/odd backslash behavior, quotes, solidus, control escapes and bounded `\\uXXXX` escapes. Surrogate-pair escapes are decoded together; invalid escapes/control bytes, unclosed strings and malformed UTF-8 refuse typed errors. The scanner does NOT accept a whole JSON document or claim grammar is complete.

**No unbounded scalar copying:** token cannot exceed 1MiB, even if caller overrides the limit; default 64KiB. UTF-8 byte text is decoded only for one bounded scalar. `TextDecoder('utf-8',{fatal:true,ignoreBOM:true})` rejects malformed data while retaining legitimate U+FEFF characters inside a JSON string (file-level BOM policy remains U03). Node22/24 U02 independently exercises split multibyte bytes, escaped surrogate pairs, isolated surrogate negatives, malformed/overlong/truncated UTF8 and sync/async R03 backing.

## Evidence, RED-first

- Precommitted RED `lfj/tokenizer/json-tokenizer.test.mjs` at commit `16bcf5ad47e6d3d2ba11b2981665e5f247cce56b` imported a nonexistent R04 module and asserted independently authored escaped string + byte-span results and typed malformed cases.
- First candidate production code `lfj/tokenizer/json-tokenizer.mjs` at commit `4fdfe066ee59d03b697cbd2bb093407de24a1b16`. Real direct source V8 probes were done with a **local TextDecoder polyfill** (not a Node/Chromium validation) solely to compare expected string cases and byte spans; dedicated hosted Node 22/24 workflow required to qualify.
- `node --test lfj/tokenizer/*.test.mjs`. Dedicated [R04 workflow](../../.github/workflows/lfj-r04-tokenizer.yml) is exact PR merge-tree Node22/24; no application acceptance implied by its future green status.

## U02 independent RED → hosted GREEN

- Test-first `lfj/tokenizer/json-tokenizer-unicode.test.mjs` was committed at `e79b8f329305ebfb6fd903657dc3acee6ab8a1e0` before the production fix. [Exact Node22/24 RED run 37784906317](https://github.com/reallaksh19/3D_Converters/actions/runs/37784906317) failed precisely `U+FEFF expected ﻿alpha / actual alpha`, 7/8 cases green, both versions. A default `TextDecoder` strips a leading BOM per decoded raw segment, which silently removed a legal Unicode character *inside* string content.
- Production U02 fix `80ea2d29df1ce7ffc5ddd5d8ca1e3d7f670b4082` sets `ignoreBOM:true` only for individual quoted-string raw segments, preserving original data without bypassing `fatal:true`. [Exact Node22/24 GREEN run 37784998351](https://github.com/reallaksh19/3D_Converters/actions/runs/37784998351) passed 8/8 direct token tests in Node22 and Node24. This is **token-local correctness**, not an authorized full-source JSON parser.

## NEXT, not yet done

U03 complete object/array/numeric/literal grammar with duplicate *raw textual* keys and completed `lfj-token-root-facts/v1`; U04 global bounds, depth and cancellation under large one-byte chunk adversaries and actual owner file. Later R05 complete ordered occurrences, R06 worker isolation, R07 state/cancel, R12–R19 independent application adoption, R18 actual 30/90MB Chromium/engineering-output goldens. No full-document `JSON.parse` fallback.
