# PR600 Work Report — Purpose-Scoped Source Document Parse Cache

## Current state

```text
PR = 600
BRANCH = agent/xml-cii-standalone-perf-batch-c3-source-parse-cache
BASE = agent/xml-cii-standalone-perf-batch-c2b-lazy-preview-search (PR599)
CRITICALITY = ENGINEERING_CRITICAL (derived parse of authoritative XML/InputXML source)
EXECUTION_MODE = AUTO
PR_RECOVERY_STATE = SALVAGE_PARTIAL
TAKEOVER_AUTHORITY = READ_ONLY
AUTO_STATE = TAKEOVER_REQUIRED
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
REPORT_BASIS_HEAD = cba0e0717a223db3df7d7499d62d27082e149d1f
MAIN_LAST_GROUNDED = 00a3296f4b860ab1acb49ed690a4122122394d56
DEPENDENCIES = PR595 -> PR596 -> PR598 -> PR599 replay first
```

## Mission / proven duplicate work

Within one Source Mode render, the same authoritative `state.sourceText` was parsed independently by Source Validity Diagnostics and Source Hierarchy Preview. The bounded C3 candidate removes that duplicate UI parse without creating SourceSession/ExecutionContext architecture, persistence, hashing or worker ownership.

## Implemented candidate behavior

- New `xml-cii-adapted-source-derived-context.js` caches one derived DOM document by **exact source string equality**.
- First consumer parses once; the second consumer of identical source gets the same frozen wrapper/document.
- Same-source revisit is a cache hit.
- Any exact source string change reparses/replaces context.
- Clearing source explicitly evicts the old cached document; reloading identical text after clear must parse again.
- Empty source is not parsed/promoted.
- Parser failure is cached only for the exact failing source basis.
- Source Validity Diagnostics and Hierarchy Preview consume the common context and no longer own separate DOMParser calls.
- Added `sourceParseCount`, `sourceParseCacheHitCount`, `sourceParseMs` aggregate evidence.
- Tests pin exact-basis reuse/invalidation/clear/failure and static integration of both UI consumers.

## Authority / invariants

- `state.sourceText` remains authoritative; cached DOM is disposable derived evidence.
- Runtime invalidation uses exact source equality, not SHA/revision.
- Nothing is persisted.
- No converter/enrichment/Regex Tester/branch scope/output-run parser is redirected in this slice.
- No worker/runtime owner switch is introduced.
- No CII writer, support/GAP, units, topology or numerical authority changes.

## Candidate changed files

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-derived-context.js` (new)
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-mode.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-preview.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf-evidence.js`
- `tests/xml-cii-standalone-source-parse-cache.test.mjs`
- `tests/xml-cii-standalone-source-parse-cache-integration.test.mjs`

All performance workflow files initially added in this stack were removed after root-policy review. Stacked three-dot PR history can still show workflow deletion paths until the stack is replayed/rebased; no workflow modification belongs in the qualified C3 replay.

## Validation truth

```text
source-level duplicate parser trace = PASS_INSPECTION_ONLY
cache unit tests                    = NOT_RUN
consumer integration test           = NOT_RUN
real browser Source Mode            = NOT_RUN
sourceParseMs measurements           = NOT_RUN
GitHub Actions                       = NOT_APPLICABLE_UNAUTHORIZED_WORKFLOWS_REMOVED
mandatory pre-edit backups           = NOT_RUN_POLICY_NONCOMPLIANT
```

## Compliance / recovery disposition

Existing files (`source-mode.js`, `source-preview.js`, `perf.js`, `perf-evidence.js`) were edited without first executing mandatory `node utils/backup.js save ...` in a native checkout. The branch is therefore salvage evidence only and must not be merged as-is.

AUTO MODE stops here: further worker/cache expansion would require both policy-compliant replay and measured CPU evidence. There is currently no runtime evidence that worker offload is justified.

## Hypothesis / falsifier

Hypothesis: Source Mode validity + hierarchy can share one disposable parse of the exact source basis, reducing two DOM parses to one without altering source/Preview semantics.

Falsifier: different validity/hierarchy behavior, stale DOM after source edit/clear, more than one parse for two same-basis consumers, or cached derived document becoming an input authority outside its bounded UI consumers.

## Native replay qualification

```bash
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-derived-context.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-mode.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-source-preview.js
node --test tests/xml-cii-standalone-source-parse-cache.test.mjs
node --test tests/xml-cii-standalone-source-parse-cache-integration.test.mjs
```

Browser evidence should show for one loaded source:

```text
first Source Mode render: sourceParseCount +1; second UI consumer = cache hit
revisit same source: no new parse
source edit/change: +1 parse
source clear + identical reload: +1 parse after clear
```

Also rerun all predecessor performance/authority gates.

## Worker admission gate

Do **not** add an XLSX/XML/JSON worker simply because Batch C named workers. Use `?perf=1` measurements after replay. Worker admission requires a measured CPU-heavy stage/main-thread stall and explicit runtime ownership approval where applicable. Current worker status: `NOT_ADMITTED`.

## Appendix A

`NOT_COMPLETED_FOR_NATIVE_REPLAY`. Incoming agent must qualify >=92/100/min 17 each on: exact source parse production trace; duplicate-parse isolation; source/derived authority and invalidation; independent browser/metric proof; minimal backup-compliant replay plus worker-admission falsifier.

## Coordination

Hard predecessors: PR595, PR596, PR598, PR599. PR597 exact-file overlap SAFE at last check. PR589 support-gap semantics remains a lower-stack coordination dependency. No other active PR identified exact-file overlap with C3 at last check.

## Highest risk

Caching parsed XML can silently retain stale source evidence if invalidation is wrong. Clear/reload invalidation was explicitly added to the candidate, but runtime/browser tests and mandatory backups are missing.

## EXACT_NEXT_ACTION

Native checkout: re-ground current main and active PRs; replay/qualify PR595→596→598→599 first with mandatory pre-edit backups. Then complete C3 Appendix A, backup each existing C3 file before editing, replay exact-source cache, execute cache/integration/browser tests and collect sourceParseMs. Only if measured source/XLSX/JSON main-thread cost remains material should a separate worker-admission work pack be opened. Supersede PR600; do not merge it as-is.
