# WIP-XMLCII-C4B-20260818 — C4b authoritative config-save routing

## Current state

```text
STACK_BASE = PR607 / f7fb087179c4b80275b3afdb0f361a11255d3996
MAIN_LAST_CHECKED = 00a3296f4b860ab1acb49ed690a4122122394d56
CRITICALITY = ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY = WRITE_ALLOWED_FOR_ROUTING_AFTER_BACKUP_GATE
PR_RECOVERY_STATE = RECOVERABLE
APPENDIX_A = 98/100; min 18/20
PRODUCTION_MUTATION = BLOCKED_PENDING_EXACT_PRE_EDIT_BACKUPS
C3_WORKER_ADMISSION = NOT_ADMITTED
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
```

## Mission

Close the C4 integration-routing gap without changing config semantics: every confirmed active Standalone UI surface that authoritatively saves `supportConfigJson` must cross the existing `updateWorkflowState()` boundary so the C4 revision ledger advances consistently.

Preserve exactly:

- serialized config bytes produced by each surface;
- existing LocalStorage persistence;
- existing `result: null` invalidation where present;
- existing render/callback behavior;
- all engineering formulas, support/GAP interpretation and writer/runtime ownership.

## Grounded active save surfaces

Current PR607 phase/event graph confirms six active direct-save routes:

1. `xml-cii-adapted-config.js`
   - active Config panel through `xml-cii-adapted-phase-panels.js`;
   - direct `stateRef.current = { ...stateRef.current, supportConfigJson: ta.value }` in Save.
   - exact stack blob: `f96d5abb6c6d6bbebdb8bdd88f0dc82c77bb1f4d`.

2. `xml-cii-adapted-bend-radius-toggle.js`
   - active Bend Radius panel through phase panels;
   - direct serialized config assignment on save.
   - exact stack blob: `7bdf4553e31ee4255a79a51aefccde334039bab3`.

3. `xml-cii-adapted-preview-diagnostics-audit-v7.js`
   - active Preview v7 wrapper through phase panels;
   - `persistConfig(nextConfig)` directly replaces `supportConfigJson`, clears result, persists and renders.
   - exact stack blob: `3b6342a83038da61479405238cab7f54c0e3946e`.

4. `xml-cii-adapted-weight-match-v2.js`
   - active Weight Match v2 panel through phase panels;
   - config finalization directly replaces `supportConfigJson` and result state.
   - exact stack blob: `1dbdc5da89489a450145411f0f7dd4b666731a70`.

5. `xml-cii-adapted-support-type-mapper.js`
   - active Support Type Mapper panel through phase panels;
   - config save directly replaces `supportConfigJson`, clears result, persists and renders.
   - exact stack blob: `55dea1aa2dce29da6c7e204a573e161fbbcc6ae6`.

6. `xml-cii-adapted-run-workflow-atta-default.js`
   - active Run handler installed by `xml-cii-adapted-events-smart.js`;
   - ATTA-default/rigid review applies config updates through direct `stateRef.current.supportConfigJson` mutation before rerun.
   - exact stack blob: `6acb29a59f6809469b4535765095fa28dcfb6bd6`.

The older `xml-cii-adapted-run-workflow.js` is not the active Run handler once `events-smart` installs the ATTA-default route, so it is not in this bounded C4b patch. The old non-v2 Weight Match is also not the active phase panel.

Smart-Fill UI itself stores dialog/policy state; authoritative config writes land in the active Run review route above.

## Routing contract

For each active save, replace only the state-assignment boundary, e.g.:

```js
stateRef.current = updateWorkflowState(stateRef.current, {
  supportConfigJson: nextJson,
  result: null, // only where existing code already clears it
});
```

Do not change serialization, config construction, persistence order, user-visible status or rendering.

## Appendix A

```text
A1 active phase/event save-surface production trace     20/20
A2 direct-state bypass isolation                        20/20
A3 revision/engineering authority preservation         20/20
A4 static + C4 regression validation design             18/20
A5 six-file minimal routing patch / falsifier           20/20
TOTAL                                                     98/100
```

A4 is limited by unavailable real browser execution; browser evidence remains NOT_RUN.

## Mandatory backup gate

Exact repository backup utility is locally verified:

`utils/backup.js = cd0c755457bb623b0487200a7d0b7217d8b3478e`

The six target files are not currently materialized in the offline scratch checkout. The container download transport cannot fetch the connector/private GitHub bytes, so **no production file has been edited and no backup is claimed yet**.

Hard gate before mutation:

1. reconstruct each target exactly from PR607;
2. verify `git hash-object` equals the blob SHA listed above;
3. run `node utils/backup.js save <file> "C4b config-save routing from PR607 before edit"`;
4. only then edit that file.

Any mismatched reconstruction is rejected and must not be used as backup authority.

## Validation plan

New focused static integration test should assert all six active files route authoritative saves through `updateWorkflowState()` and the targeted direct support-config assignment patterns are absent.

Then execute:

- `node --check` on all six edited modules;
- C4 dependency-revision suite (currently corrected 10/10 baseline);
- C4b routing static test;
- browser Config/Bend/Preview/Weight/Support/Run save flows = NOT_RUN unless actually executable.

## Negative assurance

No revision math changes; no config schema/business-rule change; no support/GAP semantic change; no CII writer/runtime change; no workers; no persistent indexes/caches; no workflow files; no immutable InputXML→CII core change.

## Hypothesis / falsifier

Hypothesis: routing current config saves through the existing central state boundary makes revision custody complete for these active surfaces without changing config bytes or engineering results.

Falsifier: any routed save produces different config JSON, persistence/result-clear/render behavior changes, an active direct save remains, or C4 revision regressions fail.

## EXACT_NEXT_ACTION

Materialize the six exact PR607 target bytes, verify all Git blob SHAs, execute mandatory backups, then apply the six surgical routing edits and focused regression. Do not merge; do not start workers.