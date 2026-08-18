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
- CURRENT_IMPLEMENTATION_HEAD_BEFORE_REPORT_UPDATE: `7a076009e93165b324438cf4c4be3b3b82221ed8`
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR #615 implements the first integrated EI vibration-project/right-roadmap slice. It adds a generic multi-module `EnergyInstituteEit.v5` importer, a persistence-only `VibrationIntegrityProject.v1`, a read-only Phase × Scope × Specialty roadmap projection, and a collapsible right-side panel on the Engineering Calculations Vibration surface. FIT/AIV roadmap buttons reuse the existing `data-calc-id` routing. The panel and project container do not determine applicability, LOF, aggregation, completeness, screening authority, or design authority.

Overlap remains `COORDINATION_REQUIRED`: #571 mechanism coverage; #539/#540 FIT family/view files; #506/#517 AIV; #546/#508 SBC; #560 FIV roadmap doc. Exact-file search before editing `tabs/engineering-calculations-tab.js` found no active PR claim for that file.

## Implemented

### Generic `.eit` core

- Fail-closed v5 contract for `options.version`, `lines`, `pipes`, `streams`, and optional `mats`.
- Controlled-v5 module registry: `fit`, `fip`, `mex`, `aiv`, `sbc`, `thw`, `tra`, `caf`.
- Preserves declaration/result/detail presence independently, including raw and parsed legacy JSON-in-JSON payloads.
- Detects populated `*_data` even when the legacy token is absent from `lines[].modules`.
- Preserves malformed and unknown compatibility payloads rather than silently deleting them.
- Historical imported values remain `HISTORICAL_REVIEW_REQUIRED`.

### Native project seam

`VibrationIntegrityProject.v1` is a persistence container only:

```text
containerAuthority = PERSISTENCE_CONTAINER_ONLY
importedResultsAreCurrentEngineeringAuthority = false
screeningAuthorized = false
designAuthority = false
```

The pure `.eit -> project` adapter:

- retains the complete normalized `.eit` import as source evidence;
- creates EIT-compatibility line subjects without claiming canonical engineering identity;
- groups meaningful module payloads into mechanism-import records;
- keeps imported/historical values out of `currentResults`;
- preserves unknown modules separately;
- rejects duplicate EIT line identity instead of inventing a merge key;
- supports deterministic project JSON serialize/parse round-trip;
- produces line-scoped roadmap state that can be sent to the UI projection channel.

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
- imported state is visually distinct from CURRENT_RESULT and STALE_RESULT;
- panel is mounted only for VIB family/landing;
- FIT and AIV navigation use existing `data-calc-id` handling;
- panel collapse only changes presentation;
- `vibration-roadmap-state` is a presentation-state input channel, not a calculation command channel.

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

PASS. `.backups/1_tabs_engineering_calculations_tab_js.bak` has the exact pre-edit blob `64196d6e...`.

## Main Drift Reconciliation

Main advanced during the first checkpoint from `be618ecd...` to `1d934024...`. Compare showed only:

```text
backup/3D_Converters_pre_PR612_backup.zip
```

No vibration/EIT/roadmap overlap. Branch was re-grounded with a two-parent merge before shared UI mutation.

## Validation Ledger

Executed against reconstructed exact shared-tab bytes plus exact PR files:

```text
node --check relevant JS/MJS                         PASS
vibration-eit-generic.test.mjs                      PASS 4/4
vibration-project-eit.test.mjs                      PASS 5/5
vibration-roadmap-projection.test.mjs               PASS 5/5
vibration-roadmap-controller.test.mjs               PASS 4/4
vibration-roadmap-tab-wiring.test.mjs               PASS 3/3
TOTAL                                                PASS 21/21
new JS files < 300 physical lines                   PASS
engineering-calculations-tab.js after edit          295 lines
```

Truthful remaining gates:
- repository-native exact-checkout tests: `NOT_RUN / ENVIRONMENT_BLOCKED` (`github.com` DNS unavailable in local container);
- served browser/Chromium panel acceptance: `NOT_RUN`;
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

- DEC-615-01: generic `.eit` compatibility is separated from mechanism numerical authority.
- DEC-615-02: visual roadmap is a projection, not a workflow engine.
- DEC-615-03: FIT/AIV navigation reuses existing router.
- DEC-615-04: native project import is pure/transactional: build and validate candidate state before any UI store can replace current state.
- RISK-615-01: browser layout/interaction remains unexecuted.
- RISK-615-02: generic multi-module `.eit` export is not yet refactored from AIV-specific export; existing AIV round-trip authority must be preserved.
- DEBT-615-01: add user-facing project Open/Save and generic `.eit` import controls around the new pure project APIs.
- DEBT-615-02: source identity, mechanism-level result reduction, FIT span/process/multiphase/frequency custody still need to feed the project/roadmap through authoritative contracts.

## Appendix A — Next-Agent Expert Questions

1. Why can `lines[].modules` not be the sole module-presence truth in the controlled v5 `.eit`?
2. Why must imported historical LOF never enter `currentResults` without a registered rerun?
3. Which layer owns mechanism applicability, and why is roadmap inference prohibited?
4. Why is deadleg/FIP represented as CROSS_BOUNDARY rather than branch-only?
5. How will generic `.eit` export preserve non-target module bytes/semantics while updating only qualified current mechanism output?
6. How will a UI project load remain transactional if schema/reference validation fails?

## EXACT_NEXT_ACTION

Add user-facing project Open/Save plus generic `.eit` import around the pure project APIs, feed selected project/line state through `vibration-roadmap-state`, and qualify with real controlled `.eit` plus served-browser acceptance. Do not genericize current AIV `.eit` export until its active authority/round-trip ownership is re-grounded.
