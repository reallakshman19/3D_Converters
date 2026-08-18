# PR #615 Work Report — Generic EIT Project, Dynamic Roadmap, and Source Identity

## Recovery Header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by current Owner instruction
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- BASE_MAIN_SHA_AT_CURRENT_REGROUND: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- PR: #615
- REPORT_BASIS_HEAD: `96f0acdceb40ad8451f5947fb3656185330145f0`
- PR_STATE_AT_REPORT_BASIS: OPEN / DRAFT / MERGEABLE
- BRANCH_RELATION_AT_STAGE_START: ahead 8 / behind 0
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR #615 now contains four connected, deliberately non-authoritative layers:

```text
EnergyInstituteEit.v5 compatibility import
        -> VibrationIntegrityProject.v1 (.vibproj)
        -> EngineeringMethodSource.v1 / vibration source registry
        -> VibrationRoadmapProjection.v1
        -> right-side visual navigator
```

The project and roadmap do **not** determine mechanism applicability, engineering LOF, mechanism reduction, EI main-line aggregation, completeness, screening authority, or design authority.

Stage 2 added typed engineering source identity and made source state visible in the roadmap. The official Energy Institute 2nd-edition publication/sample is used only to control publication identity and T1-T13 technical-module custody. Current repository mechanism subsection labels such as `T2.2`, `T2.3`, etc. remain `RECONCILIATION_REQUIRED`; they are not promoted to controlled flowchart identities.

Thermowell is explicitly `CONFLICTED`: EI T4 and the current repository `ASME PTC 19.3 TW-2016` label are both retained and are not silently combined.

## Live Ground Truth / Coordination

At the Stage-2 grounding epoch:

```text
main                    1d9340248b11569f7c7c4f02ac429c7d8c66ff81
PR615 pre-stage head    47008276b238ec5a95bf05375abccc427ec1c6e6
reviews                 0
review threads          0
combined statuses       0 returned
PR workflow runs        0 returned
```

The intended next mechanism-workspace consumer was reclassified `BLOCKED_BY_ACTIVE_CLAIM`:

- PR #479 owns `tabs/vibration-integrity-tab.js`;
- PR #506 owns `tabs/engineering-calculations-tab.js`, `tabs/vibration-aiv-qualification-tab.js`, and AIV runtime paths;
- PR #508 owns `tabs/vibration-integrity-mechanisms.js` and SBC facility/view paths.

Important reconciliation: the prior report statement that no open PR claimed `tabs/engineering-calculations-tab.js` is stale. PR #506 does claim that path. PR615 made **no further shared-tab edit** in Stage 2.

Coordination classification remains `COORDINATION_REQUIRED`; mechanism-workspace integration is blocked until ownership is reconciled or those claims land/close.

## Implemented — Stage 1

### Generic `.eit` core

- fail-closed v5 contract for `options.version`, `lines`, `pipes`, `streams`, optional `mats`;
- controlled-v5 module registry: `fit`, `fip`, `mex`, `aiv`, `sbc`, `thw`, `tra`, `caf`;
- declaration/result/detail presence preserved independently;
- populated `*_data` retained even if omitted from `lines[].modules`;
- malformed and unknown compatibility payloads retained visibly;
- imported numerical values remain `HISTORICAL_REVIEW_REQUIRED`.

### Native project seam

`VibrationIntegrityProject.v1` is persistence-only:

```text
containerAuthority = PERSISTENCE_CONTAINER_ONLY
importedResultsAreCurrentEngineeringAuthority = false
screeningAuthorized = false
designAuthority = false
```

It provides deterministic `.vibproj` save/open, transactional `.eit -> project` load, line selection, and explicit refusal to restore persisted `currentResults` until a separately qualified current-result persistence contract exists.

### Right-side roadmap / project controls

- Import EI `.eit`;
- Open `.vibproj`;
- Save `.vibproj`;
- project title and selected line;
- Phase × Scope × Specialty roadmap;
- FIT/AIV navigation reuses existing `data-calc-id` routing;
- `vibration-project-changed` and `vibration-roadmap-state` remain orchestration/presentation channels only.

## Implemented — Stage 2 Source Identity

### `EngineeringMethodSource.v1`

Typed source fields are distinct:

```text
technicalModule
sectionId
flowchartId
equationId
tableId
figureId
printedPage
pdfPage
```

Contract controls include:

- unknown-field rejection;
- typed `T<n>` technical-module format;
- dotted section format such as `T2.4`;
- hyphenated flowchart format such as `T2-4`;
- positive page validation;
- explicit source status and locator-basis enums;
- `CONTROLLED` records require `CONTROLLED_SOURCE` custody;
- source identity itself has `SOURCE_IDENTITY_ONLY` authority.

### Controlled source registry

Primary publication identity:

```text
publisher       Energy Institute
publication     Guidelines for the avoidance of vibration induced fatigue failure in process pipework
edition         2nd
publicationDate 2008-01
ISBN            9780852934630
```

The official sample contents controls the T1-T13 technical-module identities and printed module start pages.

Mechanism subsection records derived from current repository labels remain `RECONCILIATION_REQUIRED`; their T2 module start page is **not** misrepresented as the subsection page.

A `RESOLVED` source binding fails closed unless all bound source records are `CONTROLLED`.

### Roadmap source publication

Every roadmap node now carries a source binding or an explicit unresolved/conflicted state.

Lifecycle visibility now distinguishes:

- T1 Mechanism Identification;
- T5 Visual Assessment — Piping;
- T6 Visual Assessment — Tubing;
- T7 Basic Vibration Measurement;
- T8 Specialist Measurement;
- T9 Predictive Analysis;
- T10 Main-Line Corrective Action;
- T11 SBC Corrective Action;
- T12 Thermowell Corrective Action;
- T13 Good Design Practice.

Generic post-modification verification remains source `UNRESOLVED`; no T1-T13 module is invented as its sole authority.

The panel visibly shows `RECONCILIATION_REQUIRED`, `CONFLICTED`, or unresolved source custody while retaining the existing statement that the roadmap is not an applicability/completion gate.

## Authority Boundary / Negative Assurance

```text
source registry purpose  = SOURCE_IDENTITY_AND_LOCATOR_CUSTODY_ONLY
roadmap purpose          = VISUAL_NAVIGATION_GUIDANCE_ONLY
engineeringAuthority     = NONE
screeningAuthority       = NOT_AUTHORIZED
designAuthority          = false
```

Permanent invariants:

- imported result != current result;
- missing module != NOT_APPLICABLE;
- not calculated != LOF 0;
- source identity != engineering authority;
- repository label != controlled source reconciliation;
- dotted section ID != hyphenated flowchart ID;
- source conflict must not be auto-resolved;
- project storage != engineering authority;
- panel/source rendering cannot calculate or mutate engineering results.

Stage 2 intentionally did **not** modify:

- engineering equations/correlations;
- mechanism applicability;
- mechanism result reduction;
- EI main-line aggregation;
- FIT/AIV/SBC numerical production files;
- `tabs/engineering-calculations-tab.js`;
- generic multi-module `.eit` export;
- workflow files.

## Backup Evidence

The historical Stage-1 shared-tab edit was backed up using the repository utility after exact current-main blob verification:

```text
pre-edit blob = 64196d6e400daeca8ca650407840bebc5df5a056
backup        = .backups/1_tabs_engineering_calculations_tab_js.bak
```

Stage 2 changes only PR615-owned/new source/roadmap/panel paths; no additional shared existing-main file was modified.

## Validation Ledger

### Prior Stage-1 reconstructed gate

Executed before Stage 2 on its corresponding exact reconstructed bytes:

```text
vibration-eit-generic                         PASS 4/4
vibration-project-eit                         PASS 7/7
vibration-roadmap-projection                  PASS 5/5
vibration-roadmap-controller                  PASS 6/6
vibration-roadmap-tab-wiring                  PASS 3/3
TOTAL                                         PASS 25/25
```

Do not reinterpret this as a current-head full-suite execution.

### Stage-2 source-identity focused gate

Executed in the available local Node runtime using the exact Stage-2 source/roadmap/panel code before GitHub publication:

```text
node --check source + roadmap + panel         PASS
vibration-method-source.test.mjs              PASS 6/6
vibration-roadmap-source-identity.test.mjs    PASS 4/4
STAGE-2 TOTAL                                 PASS 10/10
new source JS modules < 300 physical lines    PASS
roadmap registry < 300 physical lines         PASS
panel module < 300 physical lines             PASS
```

Evidence classification:

- STATUS: PASS
- OBSERVATION: LOCAL_EXECUTION / reconstructed exact implementation surface
- ORACLE: IMPLEMENTATION_COUPLED + AUTHORITATIVE_REFERENCE for EI publication/T1-T13 taxonomy

Compatibility source inspection confirmed the existing roadmap header phrase and status projection logic were preserved; repository-native current-head execution remains separate.

### Remaining truthful gates

- repository-native exact-checkout suite: `NOT_RUN / ENVIRONMENT_BLOCKED` (container cannot resolve GitHub hosts);
- served browser/Chromium project/source-panel acceptance: `NOT_RUN`;
- real controlled `.eit` CLI/project round-trip from native checkout: `NOT_RUN`;
- independent engineering review: `NOT_RUN`.

No absent workflow/status is treated as PASS.

## Changed-File Ledger

Stage-2 additions:

- `agents/PR615_stage2_source_identity.md`
- `converters/vibration/source/method-source-record.js`
- `converters/vibration/source/registry.js`
- `tests/vibration-method-source.test.mjs`
- `tests/vibration-roadmap-source-identity.test.mjs`

Stage-2 modified PR615-owned files:

- `converters/vibration/roadmap/registry.js`
- `tabs/vibration-roadmap-panel.js`

Stage-1 paths remain as previously recorded: EIT/project/roadmap core, roadmap controller/panel/CSS, shared-tab mount, CLI, tests, backup and governance records.

## Decisions / Risks / Debt

- DEC-615-01: generic `.eit` compatibility is separate from mechanism numerical authority.
- DEC-615-02: roadmap is a projection, not a workflow engine.
- DEC-615-03: project load is transactional and persistence-only.
- DEC-615-04: V1 refuses persisted current-result authority.
- DEC-615-06: source locators are typed; bare `T2.x` is not a universal locator.
- DEC-615-07: repository subsection labels remain reconciliation evidence, not controlled authority.
- DEC-615-08: thermowell EI-T4 / ASME-label collision is published as `CONFLICTED`.
- RISK-615-01: served browser/file-dialog/source-label usability is not yet executed.
- RISK-615-02: generic `.eit` export remains AIV-ownership-sensitive and deferred.
- RISK-615-03: PR615 and PR506 both currently modify the shared engineering tab from different branches; no further PR615 shared-tab mutation is permitted without reconciliation.
- DEBT-615-01: mechanism workspaces do not yet consume `vibration-project-changed` because active claims block the intended first consumers.
- DEBT-615-02: `AssessmentUnitResult -> MechanismLineResult -> EI mainline` reduction remains the next major common engineering correction.
- DEBT-615-03: FIT span/process/multiphase/frequency custody remains outstanding.
- DEBT-615-04: mechanism subsection/flowchart source reconciliation remains outstanding.

## Appendix A

`NOT_REQUIRED_FOR_CONTINUATION` for Stage 2: same active agent and PR, not a takeover. Any future takeover must re-ground and satisfy the skill's repository-specific qualification gate before engineering-critical production mutation.

## EXACT_NEXT_ACTION

Do not edit FIT/AIV/SBC mechanism workspaces while PR #479/#506/#508 claims remain active. The next unblocked common-engineering stack is `MechanismNumericResult.v1` / `MechanismLineResult.v1` and the reducer interface, followed by changing EI main-line aggregation to consume only qualified mechanism-level results. Before that stage, re-ground current main/open claims and verify no active PR owns the intended result/aggregation paths. Generic `.eit` export remains deferred.
