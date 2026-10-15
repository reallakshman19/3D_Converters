# WIP-XML229-WEIGHT-SESSION-STALE-20261015 — Diagnose and Permanently Fix False-Stale Weight Match

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: READ_ONLY
REPORT_BASIS_HEAD: 945c40f39d2d0898a98f8b634ee32416625334b4
MAIN_HEAD_LAST_CHECKED: 945c40f39d2d0898a98f8b634ee32416625334b4
MERGE_BASE: 945c40f39d2d0898a98f8b634ee32416625334b4
CURRENT_STAGE: DRAFT_PR_AND_OWNER_HANDOVER
HIGHEST_RISK: NONE — Strict physical configuration isolation with fail-closed bounds on true mutations
EXACT_NEXT_ACTION: Await Owner review on Issue #229; do NOT merge without explicit Owner authorization.
```

## Classification

```text
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
```

## Problem Statement & Root Cause

### Symptom
When loading original XML and staged JSON with the 4 real masters (Line List 385/801, Piping Class 10,699, Material Map 383, Valve Weights 1,595), clicking **4 Preview → Build Preview** succeeded with `P4_ENGINEERING_VERIFIED`. However, opening **Weight Match — verified original physical facts** reported:
`Existing source review is stale: Source Blob, Owner selection or masters changed; rebuild and review`.

### Root Cause Isolated
1. **Background Workbench Mutation:** Navigating through phases or hydrating the standalone app invokes `enhanceRegexSmartWorkbench` / `applyStandaloneRegexTesterResult`, which populates `stateRef.current.supportConfigJson` with heuristic token extraction properties (`regexTester`, `formats`, `linelist.branchNameRegex`, `rating.pipingClassRegex`, `weight.boreRegex`, etc.).
2. **Raw Config String Equivalence:** `compareXml229P4LiveSourceSnapshot` compared `supportConfigJson` using raw JSON string equivalence (`canonicalJson(JSON.parse(a)) === canonicalJson(JSON.parse(b))`). Because regex token extraction keys were added, `configEquivalent` returned `false` with reason `CONFIG_CONTENT_CHANGED: supportConfigJson content changed: diffKeys=[weight,linelist,regexTester,rating,formats]`, incorrectly rejecting the authoritative GC-PW Worker session.
3. **InputBasis Divergence:** `resolveXml229P4ProductionInputs` passed raw `supportConfigJson` to `createPreviewBasis`, causing the GC-PW Worker's `configSha256` to incorporate transient regex keys. A repeat Build Preview produced a differing `basisId`, falsely invalidating existing Match-1 and Final reviews.

## Architectural Correction

1. **`canonicalPhysicalConfig(rawJson)`**:
   - Strips transient workbench/UI metadata: `regexTester`, `formats`, `jsonTrace`, `supportTypeMapper`, `manualElementSideload`, `previewDiagnostics`, and diagnostic report/result objects.
   - Strips token extraction regex rules from `linelist`, `rating`, `weight` (`branchNameRegex`, `pipingClassRegex`, `boreRegex`, token delimiters, positions, etc.).
   - Prunes empty sub-objects (`rating: {}`, `linelist: {}`, `weight: {}`) when no physical fields remain.
   - Strictly preserves all physical master rows, mappings, column mappings, and calculation tolerances (`boreToleranceMm`, units, etc.).
2. **Physical Liveness Comparison (`configEquivalent`)**:
   - Compares canonical physical configuration representations instead of raw UI strings.
   - Benign workbench/regex background updates evaluate as equivalent (no false invalidation).
   - Real physical calculation modifications (`boreToleranceMm`, column mappings, etc.) fail closed with `CONFIG_CONTENT_CHANGED`.
3. **Physical-Source-Bound InputBasis**:
   - `resolveXml229P4ProductionInputs` passes `canonicalPhysicalConfig` into `createPreviewBasis`, ensuring that repeat Preview builds yield the exact same `basisId` and preserve explicit Match-1 and Final engineering decisions.
4. **Master Context Canonicalization**:
   - Normalizes `datasetRefs`, `mappingRevisions`, and `rowCounts` via `canonicalJson` to avoid key-insertion ordering mismatches.

## Validation Evidence

1. **Unit & Integration Tests:**
   - `node --test tests/xml-cii-229-*.test.mjs`: All 138/138 tests pass.
   - `tests/xml-cii-229-review-session-live-basis.test.mjs`:
     - Verified session survives regex tester key insertion and workbench mutations.
     - Verified session fails closed if true physical config (`boreToleranceMm`) or master revisions change.
   - `tests/xml-cii-229-run-stage-truth-entrypoints.test.mjs`:
     - Verified exact UI diagnostics and error codes.
2. **End-to-End Browser Automation:**
   - `scripts/xml-cii-229-four-real-masters-existing-workflow-browser.mjs`: PASSED (`pass: true`).
   - Verified that after Build Preview, navigating through Regex, JSON Trace, and Weight Match preserves the authoritative GC-PW Worker session.
   - Verified that repeat Build Preview retains explicit Match-1 (`35 kg`) and Final (`40 kg`) reviews without creating a divergent `basisId`.
   - Verified that Native CII Run remains strictly HELD (`INDEX_COMMITTED` is source-only).
3. **Parity Check:**
   - `git diff --no-index tabs/xml-cii-2019-standalone/ docs/tabs/xml-cii-2019-standalone/`: 100% exact 0-diff parity.

## Invariants Preserved
- No disabling of `isCurrent()` or catching/ignoring `STALE_INPUT`.
- No unverified cached row replacement or UI-thread JSON reloading.
- Native CII Run remains strictly HELD.
- Match-1 and Final reviews remain distinct explicit human engineering decisions.
- Merge authority: OWNER_ONLY.
