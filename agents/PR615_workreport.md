# PR #615 Work Report — Generic EIT Project + Dynamic Vibration Roadmap

## Recovery Header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- PR: #615
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: main
- BASE_MAIN_SHA_AT_CURRENT_REGROUND: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- CURRENT_IMPLEMENTATION_HEAD_BEFORE_REPORT_UPDATE: `4c8ebe32ec612213512658a180d80aec034e18ab`
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR #615 implements the first integrated EI vibration-project/right-roadmap slice. It now provides generic multi-module `EnergyInstituteEit.v5` import, a persistence-only `VibrationIntegrityProject.v1` native project file (`.vibproj`), user-facing Import/Open/Save project controls, line selection, a read-only Phase × Scope × Specialty roadmap projection, and a collapsible right-side panel on the Engineering Calculations Vibration surface. FIT/AIV nodes reuse the existing `data-calc-id` routing.

The project and panel do **not** determine mechanism applicability, LOF, reduction/aggregation, completeness, screening authority, or design authority.

Overlap remains `COORDINATION_REQUIRED`: #571 mechanism coverage; #539/#540 FIT family/view files; #506/#517 AIV; #546/#508 SBC; #560 FIV roadmap doc. Exact-file search before editing `tabs/engineering-calculations-tab.js` found no active PR claim for that file. No further shared-tab edit was required for project controls.

## Implemented

### Generic `.eit` core

- Fail-closed v5 contract for `options.version`, `lines`, `pipes`, `streams`, optional `mats`.
- Controlled-v5 module registry: `fit`, `fip`, `mex`, `aiv`, `sbc`, `thw`, `tra`, `caf`.
- Preserves declaration/result/detail presence independently, including raw and parsed legacy JSON-in-JSON payloads.
- Detects populated `*_data` even when the legacy token is absent from `lines[].modules`.
- Preserves malformed and unknown compatibility payloads visibly.
- Historical imported values remain `HISTORICAL_REVIEW_REQUIRED`.

### Native project seam

`VibrationIntegrityProject.v1` is a persistence container only:

```text
containerAuthority = PERSISTENCE_CONTAINER_ONLY
importedResultsAreCurrentEngineeringAuthority = false
screeningAuthorized = false
designAuthority = false
```

The `.eit -> project` adapter:

- retains normalized `.eit` import as source evidence;
- creates EIT-compatibility line subjects without claiming canonical engineering identity;
- stores meaningful imported mechanism payloads separately from current results;
- preserves unknown compatibility modules;
- rejects duplicate EIT line identity rather than inventing a merge key;
- deterministic JSON serialize/parse round-trip;
- `.vibproj` is the native user-facing project extension;
- project load rejects forged engineering/screening/design authority;
- V1 rejects persisted `currentResults` until a qualified current-result persistence contract exists.

The last rule is deliberate: opening a project never silently restores a current screening result. Registered calculations must be rerun/currentness-qualified separately.

### User-facing project controls

The right panel now includes:

- `Import EI .eit`
- `Open project`
- `Save project`
- project title
- selected project-line dropdown
- import/open/save status/error message

Load is transactional by construction:

```text
read file -> parse -> schema/authority/reference validation -> build candidate -> commit project state
```

If parsing/validation fails, `currentProject` is not replaced.

A `vibration-project-changed` event exposes the selected project/line to future mechanism-workspace integration without giving the panel calculation authority.

### Roadmap projection and UI

Phases:
- IDENTIFY
- SCREEN
- VERIFY
- DIAGNOSE
- MITIGATE
- CONFIRM

Physical scopes:
- MAINLINE
- BRANCH_ATTACHMENT
- CROSS_BOUNDARY
- CROSS_SCOPE

Specialties include FLOW / MECHANICAL / PULSATION / ACOUSTIC / TRANSIENT / PROCESS_INSTABILITY / BRANCH_INTEGRITY / INTRUSIVE_ELEMENT / FIELD_DYNAMICS / PREDICTIVE_RCA.

Runtime rules:
- missing module -> AVAILABLE, never inferred NOT_APPLICABLE;
- NOT_APPLICABLE requires explicit evidence;
- imported/current/stale/action/attention states remain distinct;
- panel mounts only for VIB family/landing;
- FIT/AIV navigation uses existing `data-calc-id` handling;
- panel collapse only changes presentation;
- `vibration-roadmap-state` is a presentation-state channel, not a calculation command channel.

## Authority Boundary

```text
roadmap purpose          = VISUAL_NAVIGATION_GUIDANCE_ONLY
determines applicability = false
determines completeness  = false
engineeringAuthority     = NONE
screeningAuthority       = NOT_AUTHORIZED
designAuthority          = false
```

Permanent invariants:
- imported result != current result;
- missing module != NOT_APPLICABLE;
- not calculated != LOF 0;
- roadmap status != engineering acceptance;
- project storage != engineering authority;
- project load cannot promote authority;
- panel render/collapse/navigation cannot calculate or mutate engineering results.

## Backup Evidence

Before editing the current-main shared tab, exact bytes were verified against Git blob:

```text
expected current blob = 64196d6e400daeca8ca650407840bebc5df5a056
reconstructed blob    = 64196d6e400daeca8ca650407840bebc5df5a056
```

Repository utility executed:

```text
node utils/backup.js save tabs/engineering-calculations-tab.js "PR615 right-side vibration roadmap mount"
```

PASS. `.backups/1_tabs_engineering_calculations_tab_js.bak` is the exact pre-edit blob `64196d6e...`.

## Main Drift Reconciliation

Main advanced during the initial checkpoint from `be618ecd...` to `1d934024...`; compare showed only:

```text
backup/3D_Converters_pre_PR612_backup.zip
```

No vibration/EIT/roadmap overlap. Branch was re-grounded before shared UI mutation.

## Validation Ledger

Executed against reconstructed exact shared-tab bytes plus exact PR files:

```text
node --check relevant JS/MJS                         PASS
vibration-eit-generic.test.mjs                      PASS 4/4
vibration-project-eit.test.mjs                      PASS 7/7
vibration-roadmap-projection.test.mjs               PASS 5/5
vibration-roadmap-controller.test.mjs               PASS 6/6
vibration-roadmap-tab-wiring.test.mjs               PASS 3/3
TOTAL                                                PASS 25/25
new JS files < 300 physical lines                   PASS
engineering-calculations-tab.js after edit          295 lines
```

Truthful remaining gates:
- repository-native exact-checkout tests: `NOT_RUN / ENVIRONMENT_BLOCKED` (`github.com` DNS unavailable in local container);
- served browser/Chromium project/panel acceptance: `NOT_RUN`;
- real controlled `.eit` CLI/project round-trip from a native checkout: `NOT_RUN`;
- independent engineering review: `NOT_RUN`.

No GitHub workflow is added or treated as a gate.

## Changed-file Ledger

Core:
- `converters/vibration/eit/contract.js`
- `converters/vibration/eit/module-registry.js`
- `converters/vibration/eit/parse.js`
- `converters/vibration/project/schema.js`
- `converters/vibration/project/from-eit.js`
- `converters/vibration/project/serialize.js`
- `converters/vibration/project/roadmap.js`
- `converters/vibration/roadmap/registry.js`
- `converters/vibration/roadmap/projection.js`

UI:
- `tabs/vibration-roadmap-panel.js`
- `tabs/vibration-roadmap-controller.js`
- `tabs/vibration-roadmap-panel.css`
- `tabs/engineering-calculations-tab.js`

Verification/tooling:
- `scripts/inspect-vibration-eit-roadmap.mjs`
- `tests/vibration-eit-generic.test.mjs`
- `tests/vibration-project-eit.test.mjs`
- `tests/vibration-roadmap-projection.test.mjs`
- `tests/vibration-roadmap-controller.test.mjs`
- `tests/vibration-roadmap-tab-wiring.test.mjs`

Recovery/governance:
- `.backups/1_tabs_engineering_calculations_tab_js.bak`
- `agents/PR615_workreport.md`
- `agents/status/PR615.yaml`
- `agents/claims/PR615.yaml`
- WIP records retained as history.

## Issues / Risks / Decisions

- DEC-615-01: generic `.eit` compatibility is separate from mechanism numerical authority.
- DEC-615-02: roadmap is a projection, not a workflow engine.
- DEC-615-03: FIT/AIV navigation reuses the existing router.
- DEC-615-04: project load is transactional and persistence-only.
- DEC-615-05: V1 refuses persisted current-result authority; rerun/currentness qualification remains mechanism-owned.
- RISK-615-01: browser layout/file-dialog/download interaction remains unexecuted.
- RISK-615-02: generic multi-module `.eit` export is not yet refactored from AIV-specific export; current AIV round-trip/authority must be preserved.
- DEBT-615-01: mechanism workspaces do not yet consume `vibration-project-changed`; the event seam is present.
- DEBT-615-02: source identity, mechanism-level result reduction, FIT span/process/multiphase/frequency custody still need to feed project/roadmap through authoritative contracts.

## Appendix A — Next-Agent Expert Questions

1. Why can `lines[].modules` not be the sole module-presence truth in controlled v5 `.eit`?
2. Why must imported historical LOF never enter persisted/current-result authority without a qualified registered rerun?
3. Which layer owns mechanism applicability, and why is roadmap inference prohibited?
4. Why is deadleg/FIP represented as CROSS_BOUNDARY rather than branch-only?
5. How will generic `.eit` export preserve unrelated modules while updating only qualified mechanism output?
6. How will FIT/AIV/SBC consume project events without creating a second editable engineering store?

## EXACT_NEXT_ACTION

Qualify the implemented project controls using the real controlled `.eit` and served-browser interaction when a native checkout/browser surface is available; then wire `vibration-project-changed` into mechanism workspaces one bounded mechanism at a time. In parallel, continue the engineering semantic corrections (source identity, `MechanismLineResult` reduction, FIT physical/process custody) outside the roadmap UI. Do not genericize `.eit` export until AIV round-trip authority ownership is re-grounded.
