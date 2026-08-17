# PR598 Work Report — Preview Search O(N) Config-Parse Repair

## Current state

```text
PR = 598
BRANCH = agent/xml-cii-standalone-perf-batch-c2-preview-search
BASE = agent/xml-cii-standalone-perf-batch-c1 (PR596)
CRITICALITY = ENGINEERING_CRITICAL (Preview derived from applied engineering master state)
EXECUTION_MODE = AUTO
PR_RECOVERY_STATE = SALVAGE_PARTIAL
TAKEOVER_AUTHORITY = READ_ONLY
AUTO_STATE = TAKEOVER_REQUIRED
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
REPORT_BASIS_HEAD = 154f8376f9c689ac6d4cc876a99cb8494536a5d0
MAIN_LAST_GROUNDED = 00a3296f4b860ab1acb49ed690a4122122394d56
DEPENDENCIES = PR595 -> PR596 replay first
```

## Mission / proven defect

Preview search prepared all master rows, and Line List row normalization previously resolved its field map by parsing `supportConfigJson` inside the row path. This made one N-row search build permit O(N) config parses (e.g. ~20,000 parses for 20,000 rows).

The bounded repair is to resolve the APPLIED field map once per search-row build, without changing which rows or mappings are authoritative.

## Implemented candidate behavior

- `xml-cii-adapted-import-preview-search.js` now resolves `previewSearchFieldMap()` once per build.
- Committed `masterContext.config` is preferred: zero JSON parses for mapping lookup.
- Fallback `supportConfigJson` is parsed once per whole build.
- Normalized/APPLIED master rows remain preferred; raw source rows are fallback input only.
- Added aggregate `previewSearchBuildCount`, `previewSearchRowsPrepared`, `previewSearchBuildMs` metrics and evidence display.
- Added a 10,000-row regression intended to prove 1 fallback parse / 0 committed-cache parses and unchanged row semantics.

## Authority / invariants

- APPLIED master rows and mapping remain Preview authority.
- Raw source rows do not become authoritative.
- Search is presentation-only derived data.
- No support/GAP resolver, CII writer, conversion core, units, engineering calculations or source authority changed.
- No index is persisted.

## Candidate changed files

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-preview-search.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf-evidence.js`
- `tests/xml-cii-standalone-preview-search-perf.test.mjs`

Initially-added/inherited performance workflows were removed after policy review. Three-dot stacked PR history can still display workflow deletions until replay/rebase; no performance workflow should be part of the qualified replay.

## Validation truth

```text
source inspection of O(N) parse path = PASS_INSPECTION_ONLY
10,000-row focused test             = NOT_RUN
browser Preview search              = NOT_RUN
perf timing/counters                 = NOT_RUN
GitHub Actions                       = NOT_APPLICABLE_UNAUTHORIZED_WORKFLOWS_REMOVED
mandatory pre-edit backup            = NOT_RUN_POLICY_NONCOMPLIANT
```

## Compliance / recovery disposition

Existing files were edited without mandatory pre-edit `node utils/backup.js save ...` execution. Therefore this PR is candidate salvage evidence only and must be replayed in a native checkout after PR595/PR596 are policy-compliantly reproduced.

## Hypothesis / falsifier

Hypothesis: config parse complexity per Preview-search build becomes O(1) while search output remains semantically identical.

Falsifier: >1 fallback JSON parse per build, any difference in selected/searchable APPLIED rows, or use of raw/draft values over APPLIED values.

## Native replay qualification

```bash
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-preview-search.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf-evidence.js
node --test tests/xml-cii-standalone-preview-search-perf.test.mjs
```

Required expected counts on 10,000-row fixture:

```text
fallback supportConfigJson parses = 1
committed masterContext.config parses = 0
previewSearchBuildCount = 1
previewSearchRowsPrepared = 10000
```

Rerun lower-stack Batch A/C1 tests and real-browser Preview search.

## Appendix A

`NOT_COMPLETED_FOR_NATIVE_REPLAY`. Incoming agent must qualify >=92/100, min 17/20 each, proving production search trace, O(N) defect reproduction, applied-vs-raw custody, independent count/equivalence test, and minimal backup-compliant replay patch.

## Coordination

- PR595 and PR596 are hard predecessor dependencies.
- PR599 and PR600 are descendants.
- PR589 requires semantic coordination only through lower-stack support/GAP gates.
- PR597 exact-file overlap was SAFE at last check.

## Highest risk

A search optimization could accidentally derive fields from stale/raw/draft mappings. Runtime tests are NOT_RUN and existing-file backups were not performed before candidate edits.

## EXACT_NEXT_ACTION

After policy-compliant PR595→PR596 replay passes, start from that exact head; complete Appendix A; backup `xml-cii-adapted-import-preview-search.js`, `xml-cii-adapted-perf.js`, and `xml-cii-adapted-perf-evidence.js` before edits; replay this small diff; execute 10,000-row count/equivalence test and browser search; supersede PR598 rather than merge it as-is.
