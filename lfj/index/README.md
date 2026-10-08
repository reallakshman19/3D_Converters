# LFJ R05 — original JSON value occurrence event index (U01 only)

[Child R05 #1068](https://github.com/reallaksh19/3D_Converters/issues/1068), parent [#1042](https://github.com/reallaksh19/3D_Converters/issues/1042), exact independent governance [PR #1069](https://github.com/reallaksh19/3D_Converters/pull/1069) merged before product coding. Existing V3.2 responsibility C2_INDEX = 5 of 130 planned points, exclusive production writes `lfj/index/**`. R02 own Site/Zone source owner truth and R04 original byte syntax are merged qualified read-only providers; do not replace/modify them.

## U01 contract and source custody

`streamJsonOccurrenceEvents(snapshot,{sourceRefId,onEventPage,pageEvents=256,pageBytes=65536,maxOccurrences=2000000,signal})` takes an exact R03 source snapshot plus **a caller-supplied, stable original source reference** (e.g. a PL01 engineering file identity). That source reference is distinct from LFJ's content-addressed `sha256:...` ID and **must not automatically substitute for GC-PW `sourceId`**. The R04 parser receives original bytes and validates the entire JSON grammar on this revision.

The sink `onEventPage` MUST be a callable function: each bounded frozen page contains `OPEN` value events in **original source order** and `SEAL` events after the corresponding scalar/composite closes. An `OPEN` carries `occurrenceId`, zero-based `ordinal`, RFC6901 path, `parentId`, `type`, `startByte`, `sourceSha256`, `sourceRevision`, `sourceRefId`; `SEAL` carries original byte `endByteExclusive` against the same identity. Every JSON **value**, not just selected top-level branches, is visited: objects, arrays, strings, numbers, boolean, null and all descendants. Keys are property names/pointer segments, **not separate JSON value occurrences**.

Identity is JSON-safe `JSON.stringify(['lfj-json-value/v1',sourceRefId,sourceRevision,escapedPointer])`, not a physical component identity. `engineeringReady:false`, `rightsBasis:'SOURCE_FACTS_ONLY'`; neither `BasisRef` nor `physicalOccurrenceId` nor frozen `RigidMatch1`/`Rigidmatch2` are produced by this module.

Working memory is held to O(R04 grammar depth + bounded event page), **not** all source values. The index has no default in-memory collector. A receiving storage port may persist provisional events, but must **commit only after** the returned `LFJ.JSON.OccurrenceIndexSummary.v1` has `complete:true` and matching source SHA/revision. A thrown parser/sink error never returns a complete summary; U04 will separately govern persisted rollback/epoch staleness. The default page size is 256, hard max 4096, original value budget 2,000,000, enforced before emission.

## Independent RED-before-GREEN

- U01 [source-order golden](./source-occurrence-index.test.mjs) hardcodes **13** expected value JSON pointers for a nested mixed primitive/BRANCH/children/empty-array/null fixture, including unselected data; verifies one OPEN and one SEAL for each, source-scoped parent ID, source byte length, unique identity and bounded asynchronous page delivery. Invalid JSON may not yield a complete index; async sink failure propagates.
- RED test committed `45f09789ee4e02de95a561eae5d9052a6c1afdcc` before implementation. [Node22/24 hosted RED #37793415161](https://github.com/reallaksh19/3D_Converters/actions/runs/37793415161) failed for **missing production module**; it is not a semantic failure beyond the absent implementation.
- First production code `30a2eea8752c6fe7e999dc2291cba4796d2de5fd` `source-occurrence-index.mjs`. Dedicated [R05 source truth workflow](../../.github/workflows/lfj-r05-index.yml) runs exact HEAD Node22/24 independently. Await both before claiming U01 qualified.

## Remaining four-unit responsibility

- **U02 not started:** names are not identities, identical names in same/different parents/files, escaped Unicode/`~/` path collision negatives and exact `sourceRefId` semantics.
- **U03 not started:** independent original UTF8 byte start/end golden for nested arrays/objects and own-local `attributes` custody; integrate R02 ownership without ancestor/subtree bleed. Source fact populations must come from independently authored real owner-file goldens, not LFJ index's output itself.
- **U04 not started:** same-size changed source bytes, stale snapshot revision, abort, source close, async failing sink, authoritative commit/revision fences, bounded real owner fixture and no early `complete:true`. Browser Worker responsiveness/30MB/90MB and actual CII writer output belong to other responsibilities (R06–R18).

**Direct downstream protection:** 4 Preview and Rigid Weight code is untouched. Their exact combined release predecessor [#37792260662](https://github.com/reallaksh19/3D_Converters/actions/runs/37792260662) passed Node22/24 + actual Chromium Preview button. This does not certify R05 adoption in those apps.
