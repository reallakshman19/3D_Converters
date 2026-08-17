# PR596 Work Report — XML→CII Standalone Performance Batch C1/C7

## Current state

```text
PR = 596
BRANCH = agent/xml-cii-standalone-perf-batch-c1
BASE = agent/xml-cii-standalone-perf-batch-a (PR595)
CRITICALITY = ENGINEERING_CRITICAL (UI rendering over engineering-state custody)
EXECUTION_MODE = AUTO
PR_RECOVERY_STATE = SALVAGE_PARTIAL
TAKEOVER_AUTHORITY = READ_ONLY
AUTO_STATE = TAKEOVER_REQUIRED
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
REPORT_BASIS_HEAD = 5c8f87f2d9e2835425ef5b190887a4bc23f001e1
MAIN_LAST_GROUNDED = 00a3296f4b860ab1acb49ed690a4122122394d56
DEPENDENCY = PR595 policy-compliant replay required first
```

## Mission

Start Batch C with the lowest-risk measured UI scalability slice:

- C1: stop draft-only master mapping changes from reconstructing the whole XML→CII Standalone workspace;
- C7: expose aggregate performance evidence only in qualification/dev mode.

No worker, index, parsed-source cache, support/GAP semantic change or CII writer change belongs in this PR.

## Implemented candidate behavior

- New pure `xml-cii-adapted-render-scope.js` classifies render requests fail-closed.
- New `xml-cii-adapted-master-dom-sync.js` updates only visible mapping draft controls/status.
- `xml-cii-adapted-workflow-shell.js` can downgrade exactly-one-visible-draft change to local DOM sync; any authority uncertainty falls back to existing full render.
- Added actual render counters (`workspaceFullRenderCount`, `workspacePartialRenderCount`, `masterPartialDomUpdateCount`) in addition to Batch-A requested-render counters.
- New `xml-cii-adapted-perf-evidence.js` shows aggregate counters/timers only under `?perf=1` / qualification flag; production has no evidence drawer.
- Tests pin fail-closed render classification, local draft DOM synchronization and aggregate evidence formatting.

## Fail-closed partial-render contract

Partial render is permitted only when:

1. previous and next state exist;
2. no non-draft top-level authority changed;
3. parsed config identity is unchanged;
4. normalized rows/raw rows are unchanged;
5. APPLIED revisions are unchanged;
6. source metadata/row counts/preview/sheet/workbook/diagnostics are unchanged;
7. exactly one master draft changed;
8. that master is the visible Source & Masters sub-tab.

Anything else => full render.

## Authority / invariants

- APPLIED mapping/config/revision remain authoritative.
- Local DOM sync cannot normalize/persist/Apply data.
- Support/GAP resolver semantics remain untouched.
- CII conversion/writer/runtime ownership remains untouched.
- `converters/scripts/inputxml_to_cii2019.py` remains unchanged.
- Performance evidence is observational only.

## Candidate changed files

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dom-sync.js` (new)
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf-evidence.js` (new)
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js`
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-render-scope.js` (new)
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js`
- `tests/xml-cii-standalone-master-dom-sync.test.mjs`
- `tests/xml-cii-standalone-perf-evidence.test.mjs`
- `tests/xml-cii-standalone-render-scope.test.mjs`

An initially-added C1 GitHub workflow and inherited Batch-A workflow were removed after policy review. Because this is a stacked branch, GitHub's three-dot PR file list may continue to display workflow deletion history until the stack is replayed/rebased; the current branch tree does not intentionally add a performance workflow.

## Validation truth

```text
source-level design/diff review         = PASS_INSPECTION_ONLY
focused Node tests                       = NOT_RUN
browser UI acceptance                    = NOT_RUN
actual full-vs-partial runtime counters  = NOT_RUN
GitHub Actions                           = NOT_APPLICABLE; unauthorized workflows removed
mandatory pre-edit backup for existing files = NOT_RUN / POLICY_NONCOMPLIANT
```

## Compliance / recovery disposition

Existing files (`xml-cii-adapted-perf.js`, `xml-cii-adapted-workflow-shell.js`) were edited without first executing the repository-mandated `node utils/backup.js save ...` command in a native checkout. This cannot be repaired retroactively. The implementation and tests are salvage evidence only.

PR596 must not be merged as-is. Replay onto the qualified PR595/native baseline with backups before each existing-file edit.

## Coordination

- PR595: hard dependency; replay/qualify first.
- PR598/599/600: descendants; do not replay before C1.
- PR597: SAFE exact-file overlap at last check.
- PR589: semantic coordination remains required because lower-stack Batch-A support/GAP equivalence depends on current behavior.

## Hypothesis / falsifier

Hypothesis: mapping draft-only operations can update only local UI controls with zero actual full-workspace render and no change in APPLIED engineering state.

Falsifier: any draft-only action that changes normalized rows/config/applied revision/output readiness, loses event bindings/UI state, or requires a full render for correctness invalidates the optimization.

## Native replay qualification commands

```bash
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dom-sync.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-render-scope.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf.js
node --check tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-perf-evidence.js
node --test tests/xml-cii-standalone-render-scope.test.mjs
node --test tests/xml-cii-standalone-master-dom-sync.test.mjs
node --test tests/xml-cii-standalone-perf-evidence.test.mjs
```

Also rerun PR595 authority/support-GAP gates and real-browser draft/edit/Apply flows with `?perf=1`.

## Appendix A

`NOT_COMPLETED_FOR_NATIVE_REPLAY`. Incoming agent must qualify >=92/100, min 17/20 each, proving: render production trace; authority-change detection; fail-closed classifier invariants; independent browser/perf validation plan; minimal backup-compliant replay patch.

## Highest risk

A render optimization can conceal required state/UI updates. The classifier therefore intentionally defaults to full render, but this has not been executed in the real browser and existing-file backup policy was not met.

## EXACT_NEXT_ACTION

After a policy-compliant PR595 replay passes, start from that exact head in a native checkout. Complete Appendix A; run `node utils/backup.js save` for `xml-cii-adapted-perf.js` and `xml-cii-adapted-workflow-shell.js` before editing; replay C1/C7; run focused tests and browser `?perf=1` evidence; prove Auto Map/Stage Saved/Discard produce zero actual full-workspace renders while Apply/import remain full-authority boundaries; supersede PR596.
