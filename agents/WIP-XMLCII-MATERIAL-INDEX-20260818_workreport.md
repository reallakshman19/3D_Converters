# WIP-XMLCII-MATERIAL-INDEX-20260818 — Preview Material authority indexing

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
PR_OR_WIP: WIP-XMLCII-MATERIAL-INDEX-20260818
BRANCH: agent/xml-cii-material-authority-index-20260818
MAIN_HEAD_LAST_CHECKED: e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e
MERGE_BASE: e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Indexing must preserve first matching Line List source-row semantics, including a first matching row whose material is blank, and must not change material-code authority/conflict behavior.
EXACT_NEXT_ACTION: Create mandatory pre-edit backup, encode independent legacy-vs-indexed lookup cases, then apply one-file indexed lookup/memoization patch.
```

## Mission

Remove repeated full Line List normalization/scans from `applyPreviewMaterialCodeAuthority()` and avoid repeated pure Material Map fuzzy resolution for identical material strings during one apply pass.

## Ground truth

- current main is `e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e`, the squash merge of PR #630;
- target source: `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-material-authority.js`;
- target blob: `fa13b47a2fdb28922ef86c73716c9ca9c6a85e14`;
- current `processLineListMaterial()` loops all `config.linelist.masterRows`, normalizes each row, and returns the first source row matching any alias for each branch;
- `resolveXmlCiiMaterialCodeFromMap()` is also recomputed for every branch even when process material text repeats.

## Scope

In scope:
- one Material authority production module;
- one focused regression;
- exact pre-edit backup;
- WIP/PR custody metadata.

Out of scope:
- `xml-cii-adapted-preview-incremental.js` claimed by C5M;
- adapted Preview dryrun/core/rating/bore-wall;
- shared fuzzy resolver semantics;
- master data contents;
- support/GAP, writer/runtime, Python, topology, workflows, workers.

## Coordination

- PR #628 Bore/Wall: no exact-file overlap;
- PR #616 Preview Search: no exact-file overlap;
- C5M WIP claims only `xml-cii-adapted-preview-incremental.js` plus its test/metadata. Authority overlap is coordinated because this indexed Material authority can later benefit that path, but this WIP does not edit C5M files.
- classification: `COORDINATION_REQUIRED_BOUNDED`, no exact-file collision.

## Semantic invariants / falsifier

The indexed Line List lookup must select the same earliest source row as legacy scanning across all target aliases. If that first matching row has blank material, indexed lookup must return blank rather than falling through to a later row. Direct `processMaterial`/`lineListMaterial` remains higher priority.

Material-map memoization is per apply call only and keyed by exact process-material text. It may reuse only the pure resolver result under the same material rows and fuzzy config. Overrides/conflict decisions remain per-row.

Falsifier: any legacy/indexed mismatch in source-row selection, blank-first behavior, material code/source/conflict/review fields, or any mutation/persistence of cached authority.

## Validation state

- source trace: PASS / SOURCE_INSPECTION;
- open-PR exact-file overlap: PASS / NONE FOUND;
- mandatory backup: NOT_RUN;
- focused regression: NOT_RUN;
- repository-native/browser suite: NOT_RUN / ENVIRONMENT_BLOCKED.
