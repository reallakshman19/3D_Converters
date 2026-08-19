# WIP-VIB-RIGHT-RAIL-SCOPE-SELECTOR-20260819

## Recovery header

```text
HANDOVER_READINESS: READY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: STANDARD_PRESENTATION_NAVIGATION
REPOSITORY: reallaksh19/3D_Converters
BASE_BRANCH: main
BASE_SHA: 2f34c3904b6a4d70c577461e1ae3191f1bf4f713
BRANCH: agent/vibration-right-rail-scope-selector-20260819
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_FOLLOW_ON
```

## Mission / usable behavior

Let the existing right-side Vibration Assessment rail switch among exact assessment scopes that already exist in the current Vibration Integrity register.

```text
current workspace rows
-> VibrationRoadmapScopeChoices.v1
-> right-rail Assessment scope selector
-> vibration-roadmap-controller
-> existing data-vi-row button by exact rowKey
-> existing selected-row status/workflow publication
```

Exact current-workspace identity remains:

```text
rowKey + line + caseId + canonicalId
```

This is current-register navigation only. It does not create or persist an operating-case subject.

## Why this boundary is required

Current Project-v1 has stable project lines but no governed case-subject collection. Open PR665 owns Project-v2 persistence files. This slice therefore does not invent project case identity or edit `schema.js`, `serialize.js`, `from-eit.js`, `load-currentness.js`, or Project-v2 tests.

## Authority

`VibrationRoadmapScopeChoices.v1`:

```text
purpose                 CURRENT_REGISTER_SCOPE_NAVIGATION_ONLY
identitySource          VibrationWorkspaceModel.currentRows
createsCaseIdentity     false
persistenceAuthority    NONE
determinesApplicability false
determinesCompleteness  false
determinesNextAction    false
engineeringAuthority    NONE
screeningAuthority      NOT_AUTHORIZED
designAuthority         false
```

The selector cannot determine mechanism applicability, EI completeness, workflow next action, governing screening evidence, engineering disposition, verification, RCA, design/code/safety, persistence, or numerical results.

## Implementation

### `tabs/vibration-roadmap-scope-selection.js`
New 91-line pure module. Builds immutable exact register choices, formats line/case/canonical labels, validates governed envelopes, rejects duplicate/ambiguous row keys, rejects unavailable selected keys, omits incomplete source rows rather than synthesizing identity, and rejects forged authority/choice envelopes.

### `tabs/vibration-integrity-roadmap-bridge.js`
When and only when an existing facility row is already selected, publishes `scopeChoices` from `state.workspace.rows` beside the existing selected line/case assessment status. Existing no-selected-row behavior remains `null`.

### `tabs/vibration-roadmap-panel.js`
Renders `Assessment scope` only when the selected assessment contains a governed scope-choice envelope with at least two current register rows. Option labels keep line, case and canonical ID visible.

### `tabs/vibration-roadmap-controller.js`
On `data-roadmap-assessment-select` change, validates the chosen row key against the current governed scope list and clicks the existing matching `data-vi-row` control. No direct mutation of Vibration Integrity state and no FIT remount occurs.

## Coordination

- PR668 merged predecessor: executable selected-case action.
- PR667/#658 merged roadmap/status predecessors.
- PR649 remains open with shared UI/cache custody; no claimed PR649 production/cache file is touched.
- PR665 remains open Project-v2; no Project-v2 persistence file is touched.
- PR517 AIV PF02 and PR539 FIT freeze remain no-file-overlap neighbors.

Classification: `SAFE`.

## Rollback evidence

Before editing existing files, exact Git-blob copies were committed under:

```text
.backups/connector-20260819-vib-right-rail-scope-selector/tabs/vibration-integrity-roadmap-bridge.js
.backups/connector-20260819-vib-right-rail-scope-selector/tabs/vibration-roadmap-panel.js
.backups/connector-20260819-vib-right-rail-scope-selector/tabs/vibration-roadmap-controller.js
```

Backup commit: `dc4527bda693e6957943e6304b5f3e7f4ccf3875`.

Native `node utils/backup.js` remains `NOT_RUN / ENVIRONMENT_BLOCKED`; connector/Git copies are rollback evidence, not a native backup PASS.

## Validation truth

Exact pure module/test bytes were executed locally and their Git hashes match the branch content SHA values:

```text
scope module  a7c170402f0a0c93ace797185be25f5a5543a362
test          885d514240baafc5dcbc860c7c81e1fc668be259
```

Executed:

```text
scope-selector contract test       PASS 7/7 / LOCAL_EXECUTION
scope module syntax                PASS / LOCAL_EXECUTION
exact module/test blob identity    PASS / ARTIFACT_INSPECTION
new file line policy               PASS: 91 module / 76 test
```

Exact integration blobs inspected:

```text
bridge      26b4e389ede62db7791ed9180a9e9957000455e3
panel       72393977a4033c76f99341369a0d8c822b64bcf8
controller  5e8e28d70d2b0392c1e381e2e41bc7157077e96e
```

Physical-line custody remains bounded:

```text
bridge       ~70
panel        ~181
controller   295
```

Integration wiring is `PASS / SOURCE_INSPECTION`, not runtime PASS.

Still:

```text
repository-native broader vibration regressions  NOT_RUN / ENVIRONMENT_BLOCKED
served browser scope-selector journey             NOT_RUN / ENVIRONMENT_BLOCKED
native backup CLI                                 NOT_RUN / ENVIRONMENT_BLOCKED
independent numerical verification                NOT_APPLICABLE / no numerical change
```

## Exact next action

Refresh current main, compare branch against it, ensure all changed paths are intended and no new active claim overlaps exist. Then allocate a draft PR and migrate WIP custody to PR-numbered recovery records. Do not merge without new explicit owner authorization for the follow-on PR.
