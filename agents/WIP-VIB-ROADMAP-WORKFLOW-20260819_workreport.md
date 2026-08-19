# WIP — Vibration right-panel production workflow

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL_PRESENTATION
- WIP: WIP-VIB-ROADMAP-WORKFLOW-20260819
- BRANCH: `agent/vibration-roadmap-workflow-20260819`
- BASE: `main@7f7ce459c8f059b503b045bbdebbe10d303b1044`
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
- NUMERICAL_METHOD_CHANGED: NO
- ENGINEERING_AUTHORITY_CHANGED: NO
- PROJECT_PERSISTENCE_CHANGED: NO
- WORKFLOW_FILES_CHANGED: NO

## Handover in 60 seconds

The existing right-side `Vibration Roadmap` is now action-first while remaining presentation-only. It keeps project import/open/save, selected-line control, all existing phase/scope/mechanism nodes, collapse/resize behavior and existing calculation/workspace navigation targets.

New behavior:

```text
Current project / line
-> NEXT ATTENTION card from existing ACTION | ATTENTION | STALE node state
-> numbered Identify / Screen / Verify / Diagnose / Mitigate / Confirm phases
-> phase presentation state only
-> complete existing node catalogue below each phase
```

No phase is called complete. `AVAILABLE`, `DATA`, `IMPORTED` and `CURRENT_RESULT` never become completeness/applicability authority.

## Live grounding / coordination

- main: `7f7ce459c8f059b503b045bbdebbe10d303b1044`
- branch relation: ahead 9 / behind 0 before this report sync
- latest main change: unrelated HP KD320 qualification (#666)
- PR615 is merged/closed; its main-branch claim still says ACTIVE for roadmap files and is stale historical metadata, not a live PR owner.
- PR658 remains open/draft with exact files under `tabs/vibration-integrity-assessment-status*.js`, `tabs/vibration-integrity-view.js` and tests; authority domain `VIBRATION_LINE_CASE_ASSESSMENT_STATUS_PROJECTION`.
- PR665 remains open/draft Project-v2 persistence and is not a dependency; no Project-v2 path is edited.

Coordination: `SAFE_WITH_STALE_CLAIM_RECONCILIATION`.

## Implemented capability

New pure module `tabs/vibration-roadmap-workflow-view.js` builds `VibrationRoadmapWorkflowPresentation.v1` from `VibrationRoadmapProjection.v1` only.

Presentation states are deliberately non-authorizing:

```text
NEEDS_ATTENTION
HAS_CURRENT_RESULT
HAS_DATA
AVAILABLE
NOT_APPLICABLE_ONLY
```

The focus algorithm scans phases in existing order and selects the first existing `ACTION`, `ATTENTION` or `STALE` node. It does not infer that an AVAILABLE node is required and does not invent a navigation target.

`tabs/vibration-roadmap-panel.js` now renders:

- header `Vibration Assessment`;
- current project + current line before project actions;
- `Next attention` card with existing target seam when one is already registered;
- a fail-safe `No roadmap attention flag ... does not mean the assessment is complete` message otherwise;
- numbered phase headers with non-completion state labels;
- every prior roadmap node underneath.

`tabs/vibration-roadmap-panel.css` adds visual focus/numbered-phase styling while retaining the right rail width/collapse/responsive contract.

## Case-scope decision

No case picker was added. Current `VibrationIntegrityProject.v1` provides stable line subjects but no governed project case collection. This slice will not invent a case identity source or derive one from incidental UI data. Exact line+case workflow integration belongs in a later slice when a stable governed case source is available.

## Authority boundary

```text
purpose                     RIGHT_RAIL_WORKFLOW_FOCUS_PRESENTATION_ONLY
determinesApplicability     false
determinesCompleteness      false
determinesPhaseCompletion   false
engineeringAuthority        NONE
screeningAuthority          NOT_AUTHORIZED
designAuthority             false
```

`VibrationRoadmapProjection.v1` itself is unchanged and remains `VISUAL_NAVIGATION_GUIDANCE_ONLY`.

No calculation, coefficient, tolerance, unit, master, source registry, project schema/serialization/currentness, engineer disposition, verification authority, workflow file, design/code/safety/root-cause authority or PR658 status projection is changed.

## Backups

Exact pre-edit connector/Git copies:

- `.backups/connector-20260819-vib-roadmap-workflow/tabs/vibration-roadmap-panel.js`
- `.backups/connector-20260819-vib-roadmap-workflow/tabs/vibration-roadmap-panel.css`

Native `node utils/backup.js save ...`: `NOT_RUN / ENVIRONMENT_BLOCKED` because no native checkout is available. Connector backups are rollback evidence, not a claimed native-backup PASS.

## Validation ledger

Executed against exact authored production/test bytes and verified by Git blob identity:

```text
node --check workflow helper                         PASS / LOCAL_EXECUTION
node --check edited panel                            PASS / LOCAL_EXECUTION
focused workflow-panel test                          PASS 4/4 / LOCAL_EXECUTION
workflow helper blob                                 e6f21bba96ca9eef5fb369f6a5fe0c35ccdf27e6
edited panel blob                                    19a97696dbdcf98d5f36c2910b2a4c573a461108
focused test blob                                    831f1d3d9a29bf240ac47fc003110077805a6d1d
source line policy                                   PASS: 77 / 118 / 82
branch changed-file reconciliation                   PASS: 9 intended / 0 unexplained
main relation before report sync                     PASS: ahead 9 / behind 0
existing roadmap resize/collapse assertions          PASS / SOURCE_INSPECTION compatible
existing shared calculation click seam               PASS / SOURCE_INSPECTION (`data-calc-id` reused)
```

Focused test proves:

1. earliest existing attention phase becomes focus;
2. DATA/CURRENT states do not become phase-complete authority;
3. panel renders action-first focus and preserves registered navigation targets;
4. no-attention state explicitly refuses to imply assessment completion.

Truthfully not executed:

```text
repository-native complete roadmap regression suite  NOT_RUN / ENVIRONMENT_BLOCKED
served browser acceptance                             NOT_RUN / ENVIRONMENT_BLOCKED
independent engineering numerical verification       NOT_APPLICABLE / no numerical change
```

## Changed-file ledger

1. `tabs/vibration-roadmap-workflow-view.js` — new pure presentation helper
2. `tabs/vibration-roadmap-panel.js` — action-first right rail
3. `tabs/vibration-roadmap-panel.css` — workflow focus styling
4. `tests/vibration-roadmap-workflow-panel.test.mjs` — focused regression
5. `.backups/connector-20260819-vib-roadmap-workflow/tabs/vibration-roadmap-panel.js`
6. `.backups/connector-20260819-vib-roadmap-workflow/tabs/vibration-roadmap-panel.css`
7. `agents/WIP-VIB-ROADMAP-WORKFLOW-20260819_workreport.md`
8. `agents/status/WIP-VIB-ROADMAP-WORKFLOW-20260819.yaml`
9. `agents/claims/WIP-VIB-ROADMAP-WORKFLOW-20260819.yaml`

## Highest risk

The panel is now more workflow-like, but the underlying roadmap states remain presentation guidance. Future integration must consume PR658/other governed workflow state rather than progressively turning this helper into a hidden completeness/applicability engine.

## EXACT_NEXT_ACTION

Open a draft PR from this branch, migrate recovery authority to PR-numbered report/status/claim records, release WIP custody, then reconcile current PR head/main/check/review truth. Do not merge without explicit Owner authorization.
