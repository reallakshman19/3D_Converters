# WIP-XMLCII-CSEARCH-20260818 — Batch C Preview search preparation

## Classification

- Work type: `NEW_PR_REQUIRED`
- Engineering criticality: `STANDARD`
- Coordination: `SAFE`
- Merge authority: `OWNER_ONLY / NOT_GRANTED`
- Base commit: `e93cf16b9670a9876135a659b4f26506857b2c36`
- Branch: `agent/xml-cii-c-search-prep-20260818`

## Mission

Cleanly replay the useful parts of salvage PRs #598 and #599 on current main without inheriting their backup-policy defects.

Confirmed current-main costs:

1. `buildPreviewSearchRows()` reparses `state.supportConfigJson` inside Line List row normalization, making config parsing O(N) during corpus preparation.
2. `appendPreview()` eagerly builds the complete search corpus when Preview renders, even before the user enters a search.

## Exact production scope

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-preview-search.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js`

No overlap was found with open Batch-C production PRs #611 or #613. PR #614 is validation-only.

## Required invariants

- APPLIED mapping remains Preview/search authority; DRAFT mapping never becomes calculation/search authority.
- Full logical Preview remains virtualized; do not restore legacy 150-row truncation.
- Search results remain complete and addressable.
- Physical Preview rows remain bounded by the landed virtual-row implementation.
- No engineering formulas, support/GAP semantics, InputXML→CII CORE, writer/runtime, units, or workers change.
- Workers remain `NOT_ADMITTED`.

## Acceptance

At 100,000 logical rows:

- corpus build count = 0 before first non-empty search;
- first non-empty search builds corpus exactly once;
- subsequent searches reuse the same corpus;
- clearing search returns to the full logical base Preview without rebuilding the search corpus;
- fallback support-config parse count <= 1 per corpus build;
- caller-supplied parsed config causes support-config parse count = 0;
- search matches are not truncated;
- virtual physical rows remain within the landed bound (<=60 data rows where DOM harness is available);
- output/search equivalence against current behavior is demonstrated for representative Line List rows.

## Mandatory pre-edit gate

Before editing each existing production file, run:

```text
node utils/backup.js save <file> "Batch C Preview-search clean replay"
```

and retain byte-identical backup evidence.

## Salvage provenance

PR #598 and PR #599 are read-only design/test evidence only. They remain non-mergeable as-is because their original edits did not satisfy the repository-native pre-edit backup rule. Legacy #599 also assumed a 150-row default Preview, which is no longer valid after C2 virtualization; only the lazy-custody idea may be replayed.

## Next action

Materialize exact main blobs locally, verify Git blob SHAs, run the two mandatory backups, then patch parse-once search preparation and lazy corpus custody with focused regression tests.