# PR599 Work Report — Lazy Preview Search Preparation

## Current state

```text
PR = 599
BRANCH = agent/xml-cii-standalone-perf-batch-c2b-lazy-preview-search
BASE = agent/xml-cii-standalone-perf-batch-c2-preview-search (PR598)
CRITICALITY = ENGINEERING_CRITICAL (Preview over applied master state)
EXECUTION_MODE = AUTO
PR_RECOVERY_STATE = SALVAGE_PARTIAL
TAKEOVER_AUTHORITY = READ_ONLY
AUTO_STATE = TAKEOVER_REQUIRED
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
REPORT_BASIS_HEAD = afaddbba747d3cdee97a7a481572a6d6b15cae9b
MAIN_LAST_GROUNDED = 00a3296f4b860ab1acb49ed690a4122122394d56
DEPENDENCIES = PR595 -> PR596 -> PR598 replay first
```

## Mission / proven unnecessary work

Even after the C2 O(1)-config-parse repair, opening a master Preview still built the entire full-search row corpus immediately although the visible default table was already bounded to 150 rows. If Search was never used, that O(N) preparation was wasted.

## Implemented candidate behavior

- `createLazyPreviewSearchRows(master,state)` holds a disposable closure for the full search corpus.
- Initial/default Preview renders the existing APPLIED `master.previewRows` only (max 150).
- Full search rows build on the first **non-empty** query only.
- Subsequent search keystrokes reuse the same array/corpus.
- Clearing Search returns to the existing bounded APPLIED Preview rows without rebuilding.
- No proxy, second state tree, persistent index or worker is introduced.
- Test fixture targets 10,000 rows and intended counts: 0 builds at creation; exactly 1 build after repeated search access.

## Authority / invariants

- APPLIED normalized master rows remain Preview/search source.
- Search corpus is disposable presentation data, never persisted authority.
- Clearing/searching cannot change mapping revisions/config/master rows.
- No support/GAP, conversion, writer, source or units semantics changed.

## Candidate changed files

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js`
- `tests/xml-cii-standalone-preview-search-lazy.test.mjs`

Initially-added/inherited performance workflows were removed after root-policy review. Stacked three-dot history may still show workflow deletion commits until the work is replayed/rebased.

## Validation truth

```text
source-level eager-build isolation = PASS_INSPECTION_ONLY
10,000-row lazy build tests        = NOT_RUN
browser first-search behavior       = NOT_RUN
C2 predecessor tests                = NOT_RUN
GitHub Actions                      = NOT_APPLICABLE_UNAUTHORIZED_WORKFLOWS_REMOVED
mandatory pre-edit backup           = NOT_RUN_POLICY_NONCOMPLIANT
```

## Compliance / recovery disposition

`xml-cii-adapted-import-masters.js` is an existing file and was edited without first executing the mandatory repository backup command. Therefore PR599 is salvage evidence only; replay after qualified PR595/596/598 in a native checkout.

## Hypothesis / falsifier

Hypothesis: default Preview requires no full-search corpus build; first non-empty search performs one build; subsequent queries reuse it with identical search results.

Falsifier: any build before first non-empty query, >1 build for repeated queries in same panel instance, default Preview changing from the APPLIED 150-row projection, or stale corpus surviving an authority-changing full panel rebuild.

## Native replay qualification

```bash
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js
node --test tests/xml-cii-standalone-preview-search-lazy.test.mjs
node --test tests/xml-cii-standalone-preview-search-perf.test.mjs
```

Expected 10,000-row counts:

```text
panel/lazy-custody creation: previewSearchBuildCount=0, rowsPrepared=0
first non-empty search: buildCount=1, rowsPrepared=10000
second/third search: buildCount remains 1, same corpus identity
clear search: bounded APPLIED Preview restored; no new build
```

Also run browser search behavior and all lower-stack gates.

## Appendix A

`NOT_COMPLETED_FOR_NATIVE_REPLAY`. Incoming agent must qualify >=92/100/min 17 each on exact Preview event lifecycle, authority/basis invalidation, measurable eager-build reproduction, independent search-result equivalence, and backup-compliant minimal replay.

## Coordination

Hard predecessors: PR595, PR596, PR598. Descendant: PR600. PR589 semantic coordination flows through lower-stack engineering equivalence; PR597 exact-file overlap SAFE at last check.

## Highest risk

A lazy closure could retain stale search data if a panel is reused after an authority change. Current architecture full-renders authority changes, which should dispose the closure, but this has not been browser-executed.

## EXACT_NEXT_ACTION

After policy-compliant PR595→596→598 replay passes, backup `xml-cii-adapted-import-masters.js` with `node utils/backup.js save ...` before editing; replay only the lazy closure/event change; run C2/C2b tests and browser checks proving zero eager build / one first-search build / disposal after Apply/import; supersede PR599.
