# WIP-XMLCII-CSEARCH-CLEAN-20260818 — Batch C Preview search replay

## State

```text
BASE_MAIN = 1d9340248b11569f7c7c4f02ac429c7d8c66ff81
BRANCH = agent/xml-cii-c2-preview-search-clean-20260818
WORK_TYPE = NEW_PR
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
WORKERS = NOT_ADMITTED
```

## Mission

Replay the useful Preview-search performance intent from salvage PRs #598/#599 on current main without inheriting their stack/backup-policy defects and without restoring the obsolete 150-row Preview limitation.

## Current-main defect

`buildPreviewSearchRows()` eagerly normalized every Line List row and called `JSON.parse(state.supportConfigJson)` from row normalization. On a 100,000-row master this makes search-preparation work O(N) before the user searches and can make config parsing O(N).

The landed virtual-row implementation already consumes arrays by numeric index. Therefore the bounded correction can remain in one production module: expose a Proxy-backed Array view that normalizes/memoizes a Line List row only when that numeric index is actually read.

## Production scope

Exactly one existing production file:

```text
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-preview-search.js
```

No edit is required to `xml-cii-adapted-import-masters.js`.

## Authority invariants

- `master.rows` / APPLIED normalized rows remain preferred over raw rows.
- DRAFT mapping is never used as Preview/search authority.
- Raw rows are fallback only when APPLIED rows are absent, matching existing precedence.
- Search returns a normal `Array.isArray(...) === true` view and the landed virtual-row engine remains unchanged.
- No engineering formula, support/GAP semantics, InputXML→CII Python CORE, writer/runtime, units, topology, material/weight calculations, cache persistence, or worker ownership changes.

## Backup custody

Pre-edit production Git blob:

```text
18bc26a0a42dbcc92041dc21e8814bf4e4183fd3
```

Retained backup:

```text
.backups/1_tabs_xml_cii_2019_standalone_ui_adapted_xml_cii_adapted_import_preview_search_js.bak
```

Remote backup blob is exactly `18bc26a0a42dbcc92041dc21e8814bf4e4183fd3`, byte-identical to pre-edit main.

Because this session has connector-backed repository access rather than a native checkout, the backup was materialized through GitHub rather than claiming execution of `node utils/backup.js`. The resulting artifact itself is exact and independently verified by Git blob identity.

## Implementation

- prefer already-parsed `state.masterContext.config` when available;
- otherwise parse `supportConfigJson` once when the Line List view is created;
- return non-Line-List master arrays unchanged;
- for Line List, return a Proxy over the authoritative source array;
- normalize each numeric index on first access only;
- memoize normalized rows for the panel lifetime;
- expose read-only preparation counters through `previewSearchPreparationStats()` for deterministic qualification.

## Reconstructed execution evidence

Local Node harness used the exact new module logic, the exact landed virtual-row logic, and a minimal Line-List normalizer stub. Evidence class: `LOCAL_RECONSTRUCTED / IMPLEMENTATION_COUPLED`, not repository-native release evidence.

```text
4 tests / 4 PASS / 0 FAIL
100,000 source rows
initial normalized rows = 0
initial virtual window normalized rows = 60
first complete search normalized rows = 100000
second search normalized rows = 100000 (reused)
clear query = no additional normalization
fallback supportConfigJson parses = 1 total
committed masterContext.config parses = 0
```

The 100k reconstructed test completed in approximately 0.56 s on the available Node runtime. This timing is diagnostic only and is not a product/browser acceptance threshold.

## Repository test

Committed regression:

```text
tests/xml-cii-preview-search-lazy-preparation.test.mjs
```

It pins:

- 100k lazy preparation;
- <=60 initial virtual rows through the landed default window;
- complete final-match addressability at source index 99,999;
- memoization across repeated search;
- clear-query no rebuild;
- support config parse once / parsed-config zero-parse;
- APPLIED-over-raw authority;
- non-Line-List array identity.

Repository-native exact-checkout execution: `NOT_RUN / ENVIRONMENT_BLOCKED` in this connector session.

## Coordination

No exact production-file overlap with #611 or #613. #614 is validation-only. Backup filename is unique and no shared `.backups/log.json` is included.

## Next gate

Open as a draft PR from current main. Do not merge without owner authorization. After this independent slice, Batch C production continuation remains gated by landing/re-grounding #611/#613 before Material-Master-only incremental Preview can be implemented cleanly from main.
