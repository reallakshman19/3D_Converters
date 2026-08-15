# WIP-aiv-critical-hardening-20260815 — AIV critical hardening work report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: N/A

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner instruction 2026-08-15 to proceed with robust AIV audit correction sequence; issue #453 remains the production-acceptance umbrella.
PR_OR_WIP: WIP-aiv-critical-hardening-20260815
BRANCH: agent/aiv-critical-hardening-20260815

PR_HEAD_OBSERVED: no PR yet; branch initially based on 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
REPORT_BASIS_HEAD: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
MAIN_HEAD_LAST_CHECKED: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
MERGE_BASE: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-001
CURRENT_TAKEOVER: N/A - new branch from current main

CURRENT_STAGE: IMPLEMENTATION_PREP
LAST_COMPLETED_STAGE: AUDIT_AND_GROUNDING
CURRENT_BLOCKER: none
HIGHEST_RISK: readiness can authorize a row that the promoted calculator rejects or interprets differently; simultaneous-source grouping semantics are not enforced.
LAST_DURABLE_CHECKPOINT: WIP report initialization

EXACT_NEXT_ACTION: patch null-safe canvas filter first-sync and add focused regression, then align readiness/calculator preconditions before changing any numerical grouping semantics.
```

## 2. Handover in 60 Seconds

### What is now true
- Current main is `0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4`; the only newer commit after the audited AIV main `353d905...` is unrelated SBC PR #505, so audited AIV source remains applicable.
- Owner authorized proceeding with the audit correction sequence.
- New isolated branch `agent/aiv-critical-hardening-20260815` was created from current main.
- No AIV production mutation has occurred yet.

### What is currently being worked on
Critical hardening of the merged AIV application: runtime state safety, readiness/executable contract parity, simultaneous-source semantics, stale async protection, master provenance/export custody, and authority normalization.

### What remains unfinished
All implementation and validation stages remain unfinished at report initialization.

### What has been proven
- Source inspection reproduced a deterministic first-sync null crash in the canvas filter controller.
- Source inspection found readiness/calculator precondition mismatches: pressure-drop domain, upstream-temperature domain, and branch-OD requirements.
- Source inspection found `simultaneousSourceGroup` retained in relationship/contribution data but calculator aggregation keyed only by assessment+case.
- Source inspection found master-resolution provenance is not included in screening/canvas export package inputs.
- Source inspection found promoted assessment results can embed candidate-authority contribution objects.
- Source inspection found AIV dynamic import cache token remains `aiv-qualification-1` despite qualification module changes.

### What has NOT been proven / NOT_RUN
- Native `npm run verify:aiv-canvas` on final candidate: NOT_RUN.
- Full AIV/release suite on final candidate: NOT_RUN.
- Real-browser acceptance: NOT_RUN.
- Hosted Actions on final PR: NOT_RUN.
- Production-safe semantics for independent `Simultaneous Source Group` scenarios: requires explicit implementation contract and regression.

### What must not be assumed
- A READY row is not currently guaranteed executable.
- SVG geometry/pixels are never engineering distance authority.
- Line/case summary is not screening authority; Assessment remains authoritative screening scope.
- Master blob verification is not equivalent to engineering qualification.
- `NOT_RUN` is not PASS.

### Highest-risk remaining item
Numerical source-combination scope can be wrong if relationships from separate simultaneous-source groups share assessment+case.

### Exact next action
Implement runtime null safety and executable-readiness parity with tests; keep numerical formulas unchanged until aggregation scope is explicitly fixed and independently checked.

## 3. Repository Ground Truth

- Default branch: `main`.
- GE-001 main SHA: `0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4`.
- Parent AIV audited SHA: `353d905a7af3bc566ba5572771fa2d16c1617a48`.
- Main drift from audited SHA: SBC PR #505 only; no AIV file changes observed in commit metadata.
- Open AIV-search PRs: #483 shared vibration-master governance framework only; #457 post-merge AIV validation documentation only.
- `agents/MASTER_INDEX.md`: absent on current main.
- AIV production acceptance issue #453 remains open.
- Connector-backed environment; local `gh` is unavailable. Existing-file backup command cannot be executed without a local checkout; immutable pre-edit Git blob SHAs will be retained in this report and each file fetch/update uses exact blob SHA protection.

## 4. Mission / Scope / Acceptance

Mission: convert the audit findings into a surgical hardening PR that prevents runtime crash, makes readiness a true executable precondition gate, preserves engineering authority/provenance, and removes ambiguous simultaneous-source behavior.

Approved scope:
1. null-safe canvas/filter first sync and presentation fault containment where required;
2. readiness/calculator precondition parity for all promoted screening inputs;
3. explicit simultaneous-source aggregation scope and regression evidence;
4. stale async/dataset transaction protection where small and surgical;
5. preserve/export master-resolution lineage;
6. normalize promoted screening authority in nested contribution evidence;
7. bump AIV product-surface cache token;
8. focused regressions and release-suite wiring only where already present.

Non-goals:
- no design authority;
- no new EI equations/coefficients/tolerances;
- no SVG-derived engineering distance;
- no broad UI redesign;
- no workflow-file edits;
- no merge without explicit owner authorization.

Acceptance:
- deterministic initial render no longer crashes on null filter state;
- every READY relationship accepted by screening gate satisfies calculator domain requirements for the supported assessment contract;
- separate simultaneous-source groups are not silently co-combined;
- exported screening evidence retains exact master lineage for master-derived cells;
- promoted assessment/contribution evidence has coherent current authority semantics while retaining lineage state explicitly;
- final candidate has explicit PASS/FAIL/NOT_RUN ledger and draft PR.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Null-safe filter first sync | UNSTARTED | current canvas controller | source-inspection FAIL reproduced | `tabs/vibration-aiv-canvas-filter.js` | patch + controller regression |
| Readiness/calculator parity | UNSTARTED | readiness -> request -> registered calculator | source-inspection gaps confirmed | `converters/vibration/aiv/aiv-readiness.js` | add domain checks + tests |
| Simultaneous grouping | UNSTARTED | calculator stage 7 | semantics defect confirmed | `aiv-calculator.js` | define grouping/result contract + tests |
| Master export lineage | UNSTARTED | screening/canvas export | omission confirmed | execution/export modules | pass `masterResolution` + schema evidence |
| Authority normalization | UNSTARTED | promoted calculator result | contradiction confirmed | calculator | promoted contribution projection |
| Cache token | UNSTARTED | Engineering Calculations AIV mount | stale token confirmed | `tabs/engineering-calculations-tab.js` | bump token |
| Async stale protection | UNSTARTED | dataset/readiness/screening | risk confirmed by source inspection | loaders/execution | add generation token if surgical |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-AIV-001 | ISS | P0 | 1 | OPEN | `state=null` filter sync dereferences `input.caseId` | source inspection | yes |
| ISS-AIV-002 | ISS | P0 | 1 | OPEN | readiness omits promoted calculator domain checks | source inspection | yes |
| ISS-AIV-003 | ISS | P0/P1 | 1 | OPEN | simultaneous group ignored in calculator grouping key | source inspection | yes |
| RISK-AIV-004 | RISK | P1 | 2 | OPEN | async result can commit after input mutation | source inspection | yes |
| ISS-AIV-005 | ISS | P1 | 2 | OPEN | master provenance omitted from screening export | source inspection | yes |
| ISS-AIV-006 | ISS | P1 | 2 | OPEN | nested contribution authority remains candidate/not-authorized | source inspection | yes |
| RISK-AIV-007 | RISK | P1 | 2 | OPEN | stale AIV dynamic-import cache token | source inspection | yes |
| RISK-AIV-008 | RISK | P1 | 3 | OPEN | auto-discovered assessment explicit edits may be lost on global master clear | source inspection | review after blockers |
| DEBT-AIV-009 | DEBT | P2 | 3 | OPEN | configured line/case LOF numeric reference invites misuse despite non-authoritative flag | source inspection | defer unless needed |

## 7. Current Technical Diagnosis

```text
Observed symptom:
AIV workspace can fail on first canvas sync with Cannot read properties of null (reading 'caseId').

Current hypothesis:
The immediate crash is a null-normalization defect. More broadly, the readiness, aggregation, provenance and authority layers were evolved independently and now contain contract drift.

Supporting evidence:
- filter controller initializes local state to null;
- createAivCanvasFilterState defaults only undefined, then dereferences input.caseId;
- readiness validates fewer numerical domains than candidate/promoted calculation;
- calculator groups contributions by assessment+case only;
- screening export omits state.masterResolution;
- promoted result directly embeds candidate contribution objects.

Alternative hypotheses:
Browser-only DOM state defect or stale bundle can also reproduce symptoms, but source defect is sufficient and deterministic.

Already ruled out:
SVG geometry is not the intended distance authority; flare-network path code explicitly uses engineering segment lengths.

Falsifier:
A controller-first-sync regression with null internal state must pass after patch; readiness adversarial fixtures must fail closed before calculateEngineering; multi-group fixture must not produce cross-group combination.

Next isolating experiment:
Patch only null normalization and regression first; then add readiness checks without numerical formula changes and verify independent existing D.2.3 expectations remain unchanged.
```

## 8. Authority and Invariants

- `screeningResultScope = ASSESSMENT`.
- `lineCaseSummaryAuthoritativeForScreening = false`.
- `designAuthority = false`.
- Tables/records are engineering input authority; SVG is navigation/presentation only.
- Physical AIV distance comes from explicit relationship evidence or unique resolved flare-network engineering-length path; never SVG pixels.
- Explicit project/user values > exact pinned master values > visible assumptions.
- Master Git-blob verification proves identity/integrity only; it must not silently imply engineering qualification.
- No new equation/coefficient/tolerance changes in this PR unless separately justified and independently validated.

## 9. Current Validation

### VAL-001
Status: FAIL
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: current AIV source inherited from `353d905...`, unchanged at `0b03855...`
Evidence: filter controller null initial state + createAivCanvasFilterState null dereference
Expected: first sync tolerates empty/null prior state
Actual: deterministic null dereference
Origin: PREEXISTING

### VAL-002
Status: FAIL
Observation: SOURCE_INSPECTION
Oracle: IMPLEMENTATION_COUPLED
Tested HEAD: `0b03855...`
Evidence: readiness checks compared to promoted/candidate calculator preconditions
Expected: READY implies executable supported input
Actual: missing P1>P2, temperature-domain and general Stage-8 branch-OD parity
Origin: PREEXISTING

### VAL-003
Status: FAIL
Observation: SOURCE_INSPECTION
Oracle: ANALYTICAL
Tested HEAD: `0b03855...`
Evidence: calculator group key excludes `simultaneousSourceGroup`
Expected: separate declared groups must not be silently energy-summed together
Actual: all same assessment+case contributions are summed
Origin: PREEXISTING

### VAL-004
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: INDEPENDENT_REPRODUCTION
Tested HEAD: final candidate pending
Command/evidence: native AIV/release/browser suites
Expected: pass
Actual: NOT_RUN
Origin: UNKNOWN_ORIGIN

## 10. Changed-File Ledger

At initialization only this new work report is changed. Production/test ledger will be updated at every checkpoint.

## 11. Review / CI State

No PR yet. Hosted CI NOT_RUN. No review threads.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: absent on main
STATUS_RECORD: none found/created yet
CLAIM_RECORD: none found/created yet
LAST_OVERLAP_CHECK: GE-001
FILE_OVERLAP: no open AIV PR found owning target runtime/readiness/calculator files
AUTHORITY_OVERLAP: PR #483 is shared vibration-master governance only; coordinate by preserving its no-authority-promotion boundary
DEPENDENCY_OVERLAP: issue #453 acceptance remains umbrella
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: runtime filter first-sync defect
Exact file/function/component: tabs/vibration-aiv-canvas-filter.js / createAivCanvasFilterState and controller sync path
Do not redo: audit source-trace already recorded above
Do not change: engineering equations, SVG-distance authority, assessment screening scope
Validation still required: focused Node tests, AIV release suite, browser, CI
Highest-risk remaining item: simultaneous source grouping
Exact next action: patch null normalization and add regression, then checkpoint report
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Qualification basis:

```text
PR_HEAD: no PR; branch base 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
MAIN_HEAD: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
GROUNDING_EPOCH: GE-001
Generated from OPEN ISS/RISK/QST: ISS-AIV-001..006, RISK-AIV-004/007/008
PARTIAL implementation: none at initialization
NOT_RUN validation: native Node/browser/release/CI
Next intended stage: runtime safety then readiness parity
APPENDIX_A_STATUS: CURRENT
```

### A1 Production Trace — 20/20
Trace: Engineering Calculations tab dynamically mounts `vibration-aiv-qualification-tab.js`; render creates canvas controller; render calls `canvasController.sync()`; sync calls filter controller `sync()`; filter controller starts with `state=null` and passes it to `createAivCanvasFilterState`; factory dereferences `input.caseId`. Prediction: first qualifying canvas render can throw before any engineering action. Falsifier: controller first-sync regression with null internal state passes after a minimal null-normalization patch.

### A2 Current Failure Isolation — 19/20
Failure is not in topology math or SVG distance logic. The immediate exception is presentation-state initialization. Separately, READY/execution mismatch originates at readiness-domain coverage versus calculator preconditions, not the registered request bridge. Minimal isolation: do not alter formulas; add readiness checks matching calculator domains and prove D.2.3 numerical outputs unchanged. One point withheld because native reproduction is not available in connector-only environment.

### A3 Authority / Invariant — 20/20
Protected invariants: Assessment-level screening only; line/case summary non-authoritative; design authority false; SVG presentation coordinates never engineering distance; explicit/user > pinned master > assumption; no master-identity verification promoted to engineering qualification. Any patch that changes EI coefficients or derives distance from SVG fails qualification immediately.

### A4 Independent Validation — 18/20
Independent oracles available in repository for 160+160=163.0102999566398 dB and 160+150=160.41392685158226 dB, plus controlled D.2.3 path. New multi-group test must use hand-authored source contributions/relationships and verify groups are not cross-combined. Current limitation: native execution on branch not yet available, so 2 marks withheld until executable evidence exists.

### A5 Next-Commit / Minimal Patch — 20/20
Commit 1 scope: null-normalize filter state and add first-sync regression only. Commit 2: readiness precondition parity + adversarial tests, no numerical formula change. Commit 3: simultaneous-group result-scope correction with explicit contract/test. Subsequent commits: provenance/authority/cache/stale-state hardening. Do not broad-refactor controllers.

```text
APPENDIX_A_SCORE: 97/100
MINIMUM_CHALLENGE_SCORE: 18/20
QUALIFICATION_THRESHOLD: >=92/100 and each >=17/20
IMPLEMENTATION_AUTHORITY: WRITE_ALLOWED
```

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log
- 2026-08-15 GE-001: re-grounded to latest main, classified engineering-critical, checked overlap, created isolated branch and initialized WIP report.
