# PR #615 Work Report — Generic EIT + Dynamic Vibration Roadmap

## Recovery Header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- PR: #615
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: main
- BASE_MAIN_SHA_AT_CURRENT_REGROUND: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- PRE_UI_HEAD: `b481096f8f9f4d424f1871f86b36a80947029e77`
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR #615 starts the integrated EI vibration-project/right-roadmap architecture. It adds a generic multi-module EnergyInstituteEit.v5 parser and a non-authoritative Phase × Scope × Specialty roadmap projection, then mounts a collapsible right-side panel into the existing Engineering Calculations Vibration family. FIT/AIV roadmap buttons reuse the existing `data-calc-id` navigation seam. No calculation equation, applicability rule, LOF reduction, completeness rule, screening authority, or design authority is implemented in the panel.

Current overlap is `COORDINATION_REQUIRED`: #571 mechanism coverage; #539/#540 FIT family/view files; #506/#517 AIV; #546/#508 SBC; #560 FIV roadmap doc. Exact-file search before the shared-tab edit found no open PR claiming `tabs/engineering-calculations-tab.js`.

## Implemented

### Generic `.eit` core

- `EnergyInstituteEit.v5` contract and fail-closed version/shape checks.
- Observed controlled-v5 module registry: `fit`, `fip`, `mex`, `aiv`, `sbc`, `thw`, `tra`, `caf`.
- Import preserves module declaration, result presence, detail presence, raw values, parsed detail, malformed state, unknown tokens, and historical `maxLof` independently.
- Important legacy invariant: a populated `*_data` payload is detected even if the token is absent from `lines[].modules`.
- Imported historical results remain `HISTORICAL_REVIEW_REQUIRED`; current engineering/screening/design authority is not granted.

### Roadmap projection

- Phases: IDENTIFY / SCREEN / VERIFY / DIAGNOSE / MITIGATE / CONFIRM.
- Physical scopes: MAINLINE / BRANCH_ATTACHMENT / CROSS_BOUNDARY / CROSS_SCOPE.
- Specialty labels include FLOW / MECHANICAL / PULSATION / ACOUSTIC / TRANSIENT / PROCESS_INSTABILITY / BRANCH_INTEGRITY / INTRUSIVE_ELEMENT / FIELD_DYNAMICS / PREDICTIVE_RCA.
- Missing module remains AVAILABLE; it is never inferred as NOT_APPLICABLE.
- NOT_APPLICABLE requires explicit evidence.
- Current/stale registered result state may supersede imported presentation state without changing the imported evidence.

### Right-side panel

- Mounted only for VIB family or VIB family landing.
- Desktop third column; responsive fallback below 1180 px and 900 px.
- Collapsible without affecting engineering state.
- Active FIT/AIV calculation highlighted.
- Uses existing parent `[data-calc-id]` routing; no second router.
- Dedicated `vibration-roadmap-state` event accepts display/project projections only and cannot execute calculations.

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
- panel render/collapse/navigation does not calculate or mutate engineering results.

## Backup Evidence

Before modifying the current-main shared file, the exact current bytes were reconstructed and verified by Git blob:

```text
tabs/engineering-calculations-tab.js
expected current blob = 64196d6e400daeca8ca650407840bebc5df5a056
reconstructed blob    = 64196d6e400daeca8ca650407840bebc5df5a056
```

Then the repository backup utility was executed:

```text
node utils/backup.js save tabs/engineering-calculations-tab.js "PR615 right-side vibration roadmap mount"
```

Result: PASS. Backup content blob is the exact pre-edit blob `64196d6e...`, retained as `.backups/1_tabs_engineering_calculations_tab_js.bak`.

## Current-main Drift Reconciliation

During initial checkpoint main advanced from `be618ecd...` to `1d934024...`. Compare showed one added file only:

```text
backup/3D_Converters_pre_PR612_backup.zip
```

No vibration/EIT/roadmap overlap. Branch was re-grounded with a two-parent merge before the shared UI edit.

## Validation Ledger

Executed in a reconstructed local Node surface using the exact current shared-tab bytes and exact PR implementation bytes:

```text
node --check relevant JS/MJS                                  PASS
vibration-eit-generic.test.mjs                               PASS 4/4
vibration-roadmap-projection.test.mjs                        PASS 5/5
vibration-roadmap-controller.test.mjs                        PASS 4/4
vibration-roadmap-tab-wiring.test.mjs                        PASS 3/3
TOTAL                                                        PASS 16/16
new JS files < 300 physical lines                            PASS
shared engineering-calculations-tab.js after edit = 295     PASS
```

Truthful remaining gates:

- repository-native exact-checkout tests: `NOT_RUN / ENVIRONMENT_BLOCKED` (`github.com` DNS unavailable in local container);
- served browser/Chromium right-panel acceptance: `NOT_RUN`;
- real controlled `.eit` CLI execution from a native checkout: `NOT_RUN`;
- independent engineering review: `NOT_RUN`.

No GitHub workflow is added or treated as a gate.

## Changed-file Ledger

Engineering/data core:
- `converters/vibration/eit/contract.js`
- `converters/vibration/eit/module-registry.js`
- `converters/vibration/eit/parse.js`
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
- `tests/vibration-roadmap-projection.test.mjs`
- `tests/vibration-roadmap-controller.test.mjs`
- `tests/vibration-roadmap-tab-wiring.test.mjs`

Recovery/governance:
- `.backups/1_tabs_engineering_calculations_tab_js.bak`
- `agents/PR615_workreport.md`
- `agents/status/PR615.yaml`
- `agents/claims/PR615.yaml`
- earlier WIP records retained as history.

## Issues / Risks / Decisions

- DEC-615-01: generic `.eit` compatibility is separated from mechanism numerical authority.
- DEC-615-02: visual roadmap is a projection, not a workflow engine.
- DEC-615-03: FIT/AIV navigation reuses existing `data-calc-id` routing.
- RISK-615-01: browser layout/interaction is not yet executed in this environment.
- RISK-615-02: generic `.eit` export is not yet refactored from the current AIV-specific exporter; this slice only establishes generic import/roundtrip-preservation foundations.
- DEBT-615-01: `VibrationIntegrityProject.v1` persistence/import transaction is the next bounded slice.
- DEBT-615-02: common engineering corrections (source identity, MechanismLineResult reduction, FIT span/process/multiphase custody) still need to feed the roadmap projection via authoritative project state.

## Appendix A — Next-Agent Expert Questions

1. Can the agent explain why `lines[].modules` cannot be treated as the sole module-presence truth in controlled v5 `.eit`?
2. Can the agent prove that imported historical LOF and current registered result authority are separate states?
3. Can the agent identify the exact layer where mechanism applicability belongs and why the roadmap must not derive it?
4. Can the agent explain why deadleg/FIP is represented as CROSS_BOUNDARY rather than naively BRANCH_ATTACHMENT only?
5. Can the agent preserve FIT/AIV existing routing and authority while adding project context?
6. Can the agent demonstrate that collapse/render of the panel is observationally irrelevant to numerical calculation outputs?

## EXACT_NEXT_ACTION

Implement `VibrationIntegrityProject.v1` as a non-authoritative persistence container plus transactional `.eit -> project` import, then connect project state to the existing `vibration-roadmap-state` projection channel. Do not refactor AIV/FIT/SBC numerical files or genericize `.eit` export until exact current ownership/source-authority boundaries are re-grounded.
