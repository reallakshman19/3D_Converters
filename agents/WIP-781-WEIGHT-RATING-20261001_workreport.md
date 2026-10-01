# WIP-781-WEIGHT-RATING-20261001 — Weight Rating mapping and manual class fill

## CURRENT RECOVERY STATE
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: READ_ONLY_FOR_INCOMING_AGENT
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: owner follow-up to Issue #781 / merged PR #810
BRANCH: agent/issue-781-weight-rating-20261001
WORK_LOCATION: C:/CodeA/3DC_live_acceptance
MAIN_HEAD_LAST_CHECKED: d6f19bdd3bf2c07e339d5e549d1b82795aa0fb4c
MERGE_BASE: d6f19bdd3bf2c07e339d5e549d1b82795aa0fb4c
REPORT_BASIS_HEAD: d6f19bdd3bf2c07e339d5e549d1b82795aa0fb4c
GROUNDING_EPOCH: GE-20261001-RATING-01
CURRENT_STAGE: QUALIFIED_BOUNDED_IMPLEMENTATION
HIGHEST_RISK: Persisted Rating edits must reach worker validation before ranking; old Match-1 acceptances must become stale.
EXACT_NEXT_ACTION: Implement shared configured prefix fallback and persisted manual branch/line Rating plus explicit visible same-class fill; pass config through basis and ranking, then run exact 41-branch browser acceptance.

## Mission and scope
ENGINEERING_CRITICAL. Owner requests Phase 6 Weight Match to use Rating prefix mapping and allow manual Rating entry with class fill like Phase 4 Preview. Boundaries: existing shared renderer, resolver, worker basis/ranking, prefix editor persistence, cache release edges and source/docs mirrors. No writer/runtime/canvas switch, master data changes, numerical matching changes, automatic DTXR fallback, or workflow edits. Merge owner-only.

Acceptance: configured prefix produces Rating without a built Preview; existing nonempty Preview retains authority absent explicit manual override; manual branch/line Rating persists through Build/reopen; fill targets current same-class rows; affected candidates rerank and stale Match-1 requires reacceptance; DTXR remains explicit; full docs-path 41 branches/1654 nodes remains responsive (max rAF gap <=250ms).

## Ground truth and coordination
PR #810 merged 2026-09-30T23:39:40Z; current main d6f19bdd includes its repair and later timing evidence. New coherent follow-up branch. #801 draft head20feb4f remains open, overlapping renderer, adapter, worker client and release ancestors; its old stale-cache hunks are superseded by current main. #792 draft head224022 overlaps Mode-A release ancestors; #794 Line List overlaps master authority. COORDINATION_REQUIRED; do not cherry-pick, close, or change those PRs. PR810 report/claim remains premerge historical, not current authority. No MASTER_INDEX found. Unique current claim/status recorded.

Git-less owner snapshot C:/CodeA/3DC_809 supplies exact EF-05 fixture. Git worktree has sparse Benchmarks exclusion because tracked XML->CII2019 is invalid on Windows. A fetch/switch collateral staged README deletion was independently restored by rebuilding the index with core.protectNTFS=false (index only), and Benchmarks skip-worktree flags restored. No source content altered by this recovery. Verify clean index before implementation commit.

## Diagnosis and evidence
ISS-RATING-PREFIX: shared preview-rating-snapshot resolver only reads Preview or explicit DTXR; ranking re-resolves authority without config. Worker basis likewise lacks config. Executed Node baseline: row PC31441C4, configured 3->300, empty snapshot, DTXR900 returns blank preview-rating-missing. First wrong boundary is Weight resolver: config is discarded. Falsifier: same baseline already returns300.
ISS-RATING-PERSIST: prefix editor updateRatingSequence runs Tester but never applies returned supportConfigJson or persists regex config. xmlCiiEnrichedConfigFromState parses saved supportConfigJson only. Falsifier: changing prefix and entering Weight without another Apply/Test changes its saved ratingSequence.
IMP-RATING-MANUAL: renderer Rating cell is static; existing onSaveConfig supports source-scoped overrides.rating/processData and Match-1 custody. Minimal patch adds editable Rating with explicit class fill, using those buckets and worker rebuild.
RISK-RATING-CACHE: cache fingerprint omits rating config; worker and Pages module query edges must be refreshed.

## Authority/invariants
Manual values use existing overrides.rating and processData branch/line keys; no invented Preview snapshot. Nonempty Preview Rating remains automatic authority; configured prefix only fills missing Rating. Ambiguous/conflicting Preview must fail closed. Explicit DTXR remains its own mode; entering manual Rating returns to normal mode. Class grouping uses exact normalized requested piping class, excludes other classes and unselected rows. Master fingerprints, geometry, selected occurrences and accepted weight provenance remain protected. Source/docs bytes identical.

## Validation ledger
| ID | STATUS | OBSERVATION | ORACLE | Evidence |
|---|---|---|---|---|
| V-BASELINE | FAIL | LOCAL_EXECUTION | INDEPENDENT_REPRODUCTION | PC31441C4 + 3->300 + empty snapshot returns blank; DTXR900 only diagnostic. |
| V-TRACE | PASS | SOURCE_INSPECTION | IMPLEMENTATION_COUPLED | adapter->renderer->basis/ranking->shared resolver; editor result discarded; exact current-main code inspected. |
| V-NEW-NODE | NOT_RUN | NOT_OBSERVED | NONE | manual precedence, class isolation, prefix order, ambiguity and stale Match1. |
| V-NEW-BROWSER | NOT_RUN | NOT_OBSERVED | NONE | real41 docs path, mapping edit, manual/classfill persistence, stale Match1, heartbeat. |
| V-CI | NOT_RUN | NOT_OBSERVED | NONE | new PR not allocated. |

## Appendix A — implementation qualification
Decision CONTINUE on independently grounded current main, no inherited unmerged patch. A1 trace editor->supportConfigJson->adapter->renderer->worker basis and dataset ranking->snapshot resolver:20/20. A2 baseline above isolates exact discarded config and missing input:20/20. A3 existing manual buckets, snapshot conflict/DTXR policy, Match1 rating digest and selection isolation inspected:19/20. A4 independent input/expected prefix300 and proposed real fixture UI/state/provenance/frame tests:18/20. A5 patch shared resolver, pass config, editor saved result, branch/line cell helper, async rebuild and bounded cache edges:19/20. Total96/100 each>=17, PASS for bounded implementation. Incoming agent must independently requalify.

## Changed-file ledger / continuation
Initial intended files: this report, matching status/claim. Production edits pending and backups mandatory. Do not redo PR810 three fixes. Exact next action in recovery header. Checks/reviews not yet applicable to a new PR. Historical numerical authority is not established by UI screenshots.
