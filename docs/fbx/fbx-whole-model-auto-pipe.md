# Automatic whole-model StagedJSON (no mapping file, no manual zone selection)

`tabs/model-converters/converters/fbx/zone-geometry/whole-model-auto-pipe.js`,
wired into `tabs/model-converters/converters/fbx-to-stagedjson.js`'s `run()`.

## What changed

Previously, clicking **Run Conversion** with only an FBX file (no second
"Mapping Package" file) produced just the raw parsed source-graph JSON and a
conversion report (`SOURCE_GRAPH_JSON_PASS`) — real StagedJSON required
either uploading an external mapping file, or manually opening the zone
preview, selecting a zone, and clicking "Analyse zone geometry" per zone.

`run()` now automatically attempts whole-model PIPE classification whenever
no mapping file is supplied:

1. Parses the geometry bundle for the uploaded FBX (the same
   `parseFbxGeometryBundleInWorker` call the manual zone toolbar already
   uses).
2. Enumerates every preview zone from the parsed source graph
   (`listFbxSourceGraphPreviewZones`) — no user selection required.
3. Runs the existing, unchanged per-zone auto-pipe classifier
   (`analyseFbxZoneGeometry`) for every zone in parallel.
4. Merges every zone that reaches `STAGEDJSON_PASS` into one StagedJSON
   document, sorted by zone id for determinism.
5. If at least one zone produced StagedJSON and no branch identifier
   collides across zones, the conversion result becomes `STAGEDJSON_PASS`
   with the merged StagedJSON as the primary downloadable output
   (`<name>.json`), tagged `WHOLE_MODEL_AUTO_PIPE_PASS` in the report
   diagnostics and log lines (`WHOLE_MODEL_AUTO_PIPE_ZONES_PASSED:n/total`).
6. If no zone passes (or a real error occurs at any step — a missing
   source graph, a Worker/geometry-bundle failure, a colliding identifier),
   the behavior falls back exactly to the previous
   `SOURCE_GRAPH_JSON_PASS` output. Nothing is fabricated; a model whose
   geometry doesn't satisfy real cylindrical PIPE admission still correctly
   reports that it couldn't classify, it just no longer requires a human to
   click through each zone to discover that.

## What did not change

- Per-zone admission rules (`FbxAutoPipeProfile.v1`, boundary-loop/shell
  checks, connectivity) are completely untouched — this only adds
  orchestration across zones, not new classification logic.
- The manual zone-selector UI (pick a zone, "Analyse zone geometry",
  "Download zone StagedJSON") still works exactly as before, for anyone who
  wants to inspect or export a single zone independently.
- The mapping-file path (`convertFbxToStagedJson` with a supplied mapping)
  is completely unaffected — this only changes behavior when **no** mapping
  file is supplied.

## Duplicate identifier handling

Each zone's auto-pipe writer numbers its own branches independently
(`FBX-BRANCH-0001`, ...), so merging multiple zones can in principle
produce colliding `REF`/`id` values. Rather than silently renumbering
branch content (which could break internal `HREF`/`TREF`/`CREF`
cross-references inside a branch), a collision blocks the whole-model
result and falls back to `SOURCE_GRAPH_JSON_PASS` — consistent with this
codebase's fail-closed convention (see also Phase 4 host-authority binding,
which blocks rather than guesses on ambiguity).

## What is NOT proven here

- **No real TAY-A run.** Verified end-to-end against the real Worker +
  WASM parser + geometry-bundle pipeline using `tests/fixtures/fbx/two-pipes.fbx`
  (`tests/fbx/test-whole-model-auto-pipe-real-worker.mjs`), but that
  fixture's synthetic geometry does not satisfy real cylindrical PIPE
  admission, so every zone correctly blocks there. Whether the real TAY-A
  source's ~389 selected geometries pass real PIPE admission — and
  therefore whether this produces StagedJSON with zero clicks for that
  specific model — has not been verified in this environment; the source
  `.fbx` is hosted on Google Drive and was not fetched here.
- **No hosted GitHub Actions result** for this exact head; only run locally.
