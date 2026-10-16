# PR 272 Work Report: Restore Mature 13-Column Weight Match Presentation & Integrate Rich Facts

**PR Number:** #272  
**Branch:** `feat/xml229-weight-presentation-rich-facts-and-bulk`  
**Base:** `main`  
**PR State:** OPEN (DRAFT)  
**PR URL:** https://github.com/reallakshman19/3D_Converters/pull/272  
**Merge Authority:** OWNER_ONLY  

---

## 1. Mission & Scope
1. Resolve the regression introduced in PR #271 where an interceptor in `renderAdaptedWeightMatchPanelV2` hijacked the UI to an experimental 5-column placeholder table (`installXml229WorkerHeldWeightPanel`), displacing the mature 13-column `weight-match-renderer.js`. Restore full 13-column presentation by default with rich component facts and bulk Match-1 capabilities.
2. Resolve out-of-the-box branch format checklist friction in XML→CII Standalone where standard piping branches (e.g. `/ASIM-1836-8"-P8810021-31441C4-PP/B4`) triggered `branch-format-authority: missing (error)` due to legacy token positions (`3, 4, 4, 2` vs standard `4, 5, 5, 3`) and `rating: NO_VALID_TOKEN_POSITION`.
3. Resolve persistent output screen checklist display where optional unbuilt stages (`resolver-json`, `manual-restraints`, `support-mapper`) showed alarming `missing (warning)` instead of `not-run (separate stage)`.

---

## 2. Changes Made
1. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js` & `docs/`**:
   - Replaced automatic redirection to worker panel with explicit opt-in gate (`options?.useWorkerPanel || stateRef?.current?.useWorkerHeldWeightPanel`).
   - Restored standard execution path to `renderer.xmlCiiRenderWeightMatchPhase()` and `renderer.bindXmlCiiWeightMatchPhase()`.
   - Restored 13 columns: `Status`, `Branch`, `Line Key`, `ComponentType`, `Bore`, `Rating`, `Node`, `ComponentRefNo_Endpoint`, `DTXR`, `Valve Hint`, `Length`, `Weight (kg)`, `Nearest Suggestions`.
2. **`converters/xml-cii2019-core/branch-format-extraction.js` & `docs/`**:
   - Updated `unusedAlternativeTemplate` to recognize Format 2 whether configured with legacy `(3,4,4,2)` or standard `(4,5,5,3)` hints.
   - Updated `evaluate()` so that when `resolvedRating` is derived from piping class via `sequence`, `rating` is not reported as an error in `reasons`.
3. **`tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js` & `docs/`**:
   - Updated `createDefaultRegexTesterConfig()` with standard default token positions: `lineKey: 4, pipingClass: 5, rating: 5, bore: 3, tokenDelimiter: '-'`.
4. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js` & `docs/`**:
   - Aligned `updateRegexTesterConfig` fallback `defaultFormat` to standard `(4, 5, 5, 3)`.
5. **`tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js` & `docs/`**:
   - Restored `'Accepted · Match-1'` text in `statusCell`.
6. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js` & `docs/`**:
   - Updated `renderChecklist` to map unbuilt independent stages (`resolver-json`, `manual-restraints`, `support-mapper`) via `xml229UnbuiltIndependentStage` so they consistently render as `not-run` with `(separate stage)` in the pre-run checklist.
7. **`tests/xml-cii-229-p4-weight-presentation-adapter.test.mjs`**:
   - Added automated tests verifying standard 41-branch fixture resolves with `0 blocking items` (`branch-format-authority: ready`) and unbuilt independent stages render as `not-run (separate stage)`.
8. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match.js` & `docs/`**:
   - Fixed issue where unaccepted candidate suggestions were erroneously marked with `mapped: true` and `weight: nr.weightMatch.weight`.
   - Now only explicit overrides mark `mapped: true`, ensuring blank rows retain unmapped status so `selectXmlCiiBlankWeightSuggestion` can populate them via `#mc-wm-fill-best` ("Apply suggestion to blank cells").
9. **`tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js` & `docs/`**:
   - Modernized `previewDone(input)` to inspect in-memory `input.previewResult?.branchRows?.length > 0`, `input.previewBranchRows?.length > 0`, and modern cache keys (`xml-cii-pv-cache-v8-rating-policy`, `xml-cii-pv-cache-v8-dtxr`, `xml-cii-pv-cache-v7`, `xml-cii-pv-cache-v6`, `xml-cii-pv-cache-v5`, `xml-cii-pv-cache-v2`).
   - Modernized `weightMatchDone(input)` to inspect in-memory `weightIssues`, `weightMatchStatus`, `masterContext.config.overrides.rigidWeight`, and modern cache keys (`xml-cii-wm-cache-v2-preview-rating`, `xml-cii-wm-cache-v1`).
10. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js` & `docs/`**:
    - Changed `reportFromState` to compute live `buildStandaloneOutputRunReadiness(state)` instead of returning stale cached reports.
    - Merged mode-A root state (`stateRef?.modeABaseRef?.current`) with branch-scoped state in `renderStandaloneOutputRunPanel` so stage completions are detected irrespective of ref layer.
11. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js`, `xml-cii-adapted-preview-renderer-v7.js`, `xml-cii-adapted-preview-renderer.js` & `docs/`**:
    - Added `savePreviewToState` writing through `targetRef = stateRef?.modeABaseRef || stateRef`.
    - Hooked `onPreviewBuilt` and `onOriginalWorkerPreviewCompleted` to persist preview rows and reports across tab unmounting.
    - Ensured `precomputedPreview` bypasses idle reset and preserves table rendering on tab revisit.
12. **`tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js` & `tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js` & `docs/`**:
    - Added `onWeightMatchBuilt` callback hook in `bindXmlCiiWeightMatchPhase` and persisted issues and `weightMatchStatus` to `targetRef = stateRef?.modeABaseRef || stateRef`.

---

## 3. Root Cause Analysis (RCA) & Logic Clarifications

### A. Suggestion Generation Requires Bore + Rating + Length
- In `converters/xml-cii2019-core/weight-valve-hints.js` (`rankXmlCiiWeightCandidates`):
  ```javascript
  if (boreMm === null || boreMm === undefined || lengthMm === null || lengthMm === undefined)
    return { nodeHint: null, candidates: [], rejectedCandidates: [], best: null };
  ```
  And in `weightMasterEligibleRows(rows, boreMm, wantedRating)`:
  ```javascript
  if (!Number.isFinite(bore) || !wantedRating) return [];
  ```
- **Conclusion**: The algorithm strictly enforces all three dimensions (Bore, Rating, Length). If any one of them is missing (e.g. Node 6330 where Rating is not mapped), candidate suggestions cannot and will not be generated (`No suggestion`).

### B. "Applied 0 suggestion(s) to blank Weight(kg) cells"
- When `ui-adapted/xml-cii-adapted-weight-match.js` built `localIssues`, it set `mapped: hasOverride || (nr.weightMatch && nr.weightMatch.weight > 0)`.
- Because `nr.weightMatch` contained the best candidate from dry-run preview, `mapped` was marked `true` and `data-wm-accepted="true"` was rendered.
- `selectXmlCiiBlankWeightSuggestion` enforces fail-closed protection:
  `if (input.dataset?.wmAccepted === 'true' || issue.mapped) return null;`
- Consequently, clicking "Apply suggestion to blank cells" rejected all rows and reported 0 applied.
- **Fix**: Restricted `mapped` and `weight` strictly to actual overrides (`nr.weightMatch?.selectedOverride`), leaving candidate suggestions unmapped until explicitly accepted.

### C. Output Screen Hold (`xml229-original-json-engineering-authority`)
- In `tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js`, `selectedOriginalJsonSourceReceipts(input)` detects `xml229StagedSourceReceipt`.
- When an O1 staged JSON file is loaded into `3 Resolver / JSON Trace`, PR #262's fail-closed governance holds native CII run authority (`INDEX_COMMITTED` is source-only for trace/CSV exports).
- In pure XML mode (or when no staged JSON is present), `xml229StagedSourceReceipt` is null and `0 blocking items` are reported.

### D. Tab 4 ("4 Preview") Data Reset on Tab Navigation
- `createXmlCiiBranchScopedStateRef` produces an ephemeral proxy object on every `.current` property access. Direct assignments like `stateRef.current.previewResult = result` wrote only to a discarded wrapper, dropping state on tab transition.
- In `xml-cii-adapted-preview-renderer.js`, preview click passed `skipLegacyCache: true`, preventing cache persistence.
- `renderStandalonePreviewReportPanel` lacked state hydration, and `xmlCiiBuildAndRenderPreview` defaulted to idle if `options.precomputedPreview` was omitted or unhandled in the worker gate.
- **Fix**: Writes persist to `stateRef.modeABaseRef || stateRef`, cache saving is enabled, and precomputed preview data bypasses idle prompts on remount.

### E. Tab 10 ("Output / Run") Failing to Detect Preview and Weight Match
- `previewDone(input)` and `weightMatchDone(input)` in `xml-cii-output-run-readiness.js` only checked obsolete legacy localStorage keys (`xml-cii-pv-cache-v6/v5`, `xml-cii-wm-cache-v1`) and ignored memory rows and modern cache keys.
- `reportFromState` returned stale memoized reports instead of re-evaluating readiness when returning to Tab 10.
- **Fix**: Modernized detection to check in-memory rows (`previewResult`, `weightIssues`, `weightMatchStatus`), modern cache versions, and fresh readiness compilation on every render.

---

## 4. Validation Status
- **Automated Unit & Regression Tests**:
  - `node --test tests/xml-cii-229-*.test.mjs`: **159 of 159 PASS** (100% GREEN).
  - `node --test tests/xml-cii-j04-*.test.mjs`: **30 of 30 PASS** (100% GREEN).
  - `node --test tests/xml-cii-issue-*.test.mjs`: **204 of 204 PASS** (100% GREEN).
- **Playwright Browser Tests**:
  - `scratch/test_tab_persistence_and_detection.mjs`:
    - Build Preview -> 85 rows rendered.
    - Weight Match -> 189 rows rendered, 188 suggestions applied.
    - Output / Run -> `preview-audit: ready` ("Preview / dry-run data is available."), `weight-match: ready` ("Weight decisions saved.").
    - Revisit Tab 4 Preview -> 85 rows retained immediately (0 idle prompts).
- **Parity Check**:
  - Strict 0-diff parity across all modified pairs between `tabs/` and `docs/`.

---

## 5. Protected Invariants & Authority
- **No Destructive XML Mutations**: PSI116 XML raw geometry remains pristine.
- **Merge Authority**: OWNER_ONLY. PR #272 remains in draft mode until explicit user authorization.
- **Readiness Policy**: Native CII Run readiness contracts preserved; unrun optional stages distinguished as non-blocking `warning` / `not-run`.

---

## 6. Exact Work Location & Next Action
- **Work Tree**: Committed to `feat/xml229-weight-presentation-rich-facts-and-bulk`.
- **Exact Next Action**: Provide summary of committed fixes and verification to user.

