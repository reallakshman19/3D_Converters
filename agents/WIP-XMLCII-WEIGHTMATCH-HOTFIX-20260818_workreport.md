# WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818 — Legacy Weight Match correctness hotfix

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
AUTO_STOP_REASON: NOT_APPLICABLE

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner-directed XML→CII (2019) Standalone performance audit remediation; first coherent slice is the correctness-critical legacy Weight Match defect.
PR_OR_WIP: WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818
BRANCH: agent/xml-cii-weight-match-hotfix-20260818

PR_HEAD_OBSERVED: bca7fc9390c018753d09161052b0bf2fd54e33ce (pre-WIP metadata baseline)
REPORT_BASIS_HEAD: bca7fc9390c018753d09161052b0bf2fd54e33ce
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
MERGE_BASE: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: NOT_REQUIRED_NEW_WORK_ITEM
GROUNDING_EPOCH: GE-001
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: PLAN
LAST_COMPLETED_STAGE: COORDINATION CHECK
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Candidate-cardinality repair must not change scoring, candidate order on equal scores, override selection, or finalized weight semantics.
LAST_DURABLE_CHECKPOINT: WIP branch grounded on main@bca7fc9 with exact-file/authority overlap classified SAFE.

EXACT_NEXT_ACTION: Commit the mandatory exact pre-edit backup, then add a focused multi-issue regression that fails current global-top-five behavior before applying the minimal production fix.
```

## 2. Handover in 60 Seconds

### What is now true
Current `main` is `bca7fc9390c018753d09161052b0bf2fd54e33ce`. `tabs/xml-cii-2019-standalone/xml-cii-weight-match.js` creates all issue×master candidates, globally sorts them, then applies one global `.slice(0, 5)`. Build/Finalize Weight Match still call this module.

### What is currently being worked on
A surgical hotfix so each weight issue receives its own top five candidates while preserving existing scoring and finalization behavior.

### What remains unfinished
Focused regression, production patch, exact-head validation, PR creation, WIP→PR custody migration, and CI/review reconciliation.

### What has been proven
Source inspection proves the global-top-five defect and live event routing. Current open XML→CII PRs do not edit the target production file.

### What has NOT been proven / NOT_RUN
Full repository checkout/test execution and browser acceptance are NOT_RUN. Direct clone is environment-blocked by `Could not resolve host: github.com`.

### What must not be assumed
This hotfix does not consolidate the two weight authorities, build a WeightMasterIndex, change weight scoring semantics, or qualify any new engineering master data.

### Highest-risk remaining item
Preserving stable candidate ordering and override/finalized selection while changing candidate cardinality.

### Exact next action
Persist the mandatory pre-edit backup and focused regression, execute reconstructed Node validation, then patch production minimally.

## 3. Repository Ground Truth

Grounding epoch `GE-001`, verified 2026-08-18 against live GitHub:

- repository/default branch: `reallaksh19/3D_Converters`, `main`;
- live main SHA / merge base: `bca7fc9390c018753d09161052b0bf2fd54e33ce`;
- branch: `agent/xml-cii-weight-match-hotfix-20260818` created directly from that SHA;
- PR: not allocated yet;
- open XML→CII performance/semantic PRs reviewed for overlap: #616, #614, #605, #599, #598, #597, #589, #417, #412;
- exact target-file overlap: none observed;
- #616 owns only Preview-search preparation and must not be duplicated here;
- #614 is validation-only for Batch-C scale and does not own the legacy matcher;
- #605/#589 own support-gap paths, not weight candidate selection;
- #417 explicitly excludes weight work;
- live main advanced to #624 before this WIP and no subsequent main commit was observed during grounding.

## 4. Mission / Scope / Acceptance

Mission: correct the production-connected legacy Weight Match global-top-five defect with the smallest reviewable patch and bounded memory behavior.

Approved scope:

- `tabs/xml-cii-2019-standalone/xml-cii-weight-match.js`;
- one focused regression under `tests/`;
- mandatory pre-edit backup;
- WIP/PR recovery metadata.

Explicit non-goals:

- no `rankXmlCiiWeightCandidates()` authority migration in this PR;
- no WeightMasterIndex;
- no Bore/Wall, Material, Preview cache, Run parity, workbook, branch-scope, Pyodide, worker, support/GAP, writer, formula, unit, topology, or workflow changes;
- no #616 production-file edits;
- no merge without explicit Owner authorization.

Acceptance criteria:

1. two or more independent issues each retain up to five ranked candidates;
2. candidate ranking per issue preserves the existing scoring formula and stable master-row order for ties;
3. finalized default selection remains the highest-ranked candidate for that issue;
4. explicit candidate override still wins when present in that issue's retained candidate set;
5. a single-issue input remains behaviorally equivalent except for internal allocation strategy;
6. production candidate output is bounded to `issueCount × 5` rows rather than the full Cartesian product;
7. focused executable regression passes on the exact patched bytes.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Global-top-five repair | NOT_STARTED | production path already live | NOT_RUN | `xml-cii-weight-match.js` | patch after failing regression |
| Focused regression | NOT_STARTED | standalone Node test | NOT_RUN | `tests/` | create and execute |
| Mandatory backup | LOCAL_PREPARED_NOT_COMMITTED | N/A | exact pre-edit blob hash verified locally | `.backups/` | commit before production edit |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-001 | correctness | high | P0 | OPEN | Global `.slice(0, 5)` retains five candidates overall rather than per issue. | live main source inspection | yes |
| IMP-001 | performance | high | P0 | OPEN | Current code constructs/sorts the issue×master Cartesian candidate set. | live main source inspection | yes |
| RISK-001 | invariant | high | P0 | OPEN | Repair could accidentally change score/tie/override semantics. | authority trace | yes |
| DEC-001 | authority | high | P0 | ACTIVE | This PR changes candidate cardinality/allocation only; scoring/master authority remains unchanged. | scope decision | yes |
| DEBT-001 | follow-on | medium | P1 | DEFERRED | Two weight authorities remain; shared ranker consolidation and indexing are follow-on work. | source audit | no |

## 7. Current Technical Diagnosis

```text
Observed symptom: Later weight issues can receive no candidates even when valid master rows exist.
Current hypothesis: One global sort/slice truncates all issue candidate rows to five total.
Supporting evidence: buildWeightCandidateRows() flatMaps all issue×candidate rows, sorts globally, then slices once.
Alternative hypotheses: finalizeRows() filtering/override logic could be dropping rows independently.
Already ruled out: UI event reachability; Build and Finalize Weight Match both call the legacy module.
Falsifier: A two-issue fixture where both issues receive five candidates on unmodified main would falsify ISS-001.
Next isolating experiment: Execute such a fixture against exact main bytes; expect candidate rows only for the first/highest-scoring issue under current code.
```

## 8. Authority and Invariants

Authority trace:

```text
Weight Master rows
-> legacy candidate normalization
-> unchanged 25/25/25/25 scoring
-> per-issue candidate selection
-> optional user override
-> finalizedMatches in support config
-> downstream UI/config consumer
```

Protected invariants:

- Weight Master input values/units remain unchanged;
- bore/rating/length/component-type scoring values and tolerances remain unchanged;
- stable master-row ordering remains tie-break behavior;
- user override remains selection authority when it identifies a retained candidate;
- no engineering authority is promoted;
- no Preview/shared-ranker semantics are changed.

## 9. Current Validation

```text
ID: VAL-001
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: NONE
Tested HEAD: main@bca7fc9390c018753d09161052b0bf2fd54e33ce
Command/evidence: GitHub exact source blob 3312ea78d6fdfde8ea82130b4ed30597ca40b2d1
Expected: identify a global rather than per-issue top-five boundary
Actual: `.flatMap(...).sort(...).slice(0, 5)` confirmed
Limitations: source inspection only
Origin: PREEXISTING

ID: VAL-002
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: IMPLEMENTATION_COUPLED
Tested HEAD: N/A
Command/evidence: repository-native Node suite
Expected: focused regression passes after patch
Actual: NOT_RUN; local clone blocked by DNS
Limitations: exact checkout unavailable
Origin: UNKNOWN_ORIGIN
```

Negative assurance: no score constants/tolerances, weight values, unit interpretation, support/GAP behavior, writer/runtime, Preview authority, or Python conversion behavior is intentionally changed.

## 10. Changed-File Ledger

No branch implementation files exist yet beyond recovery metadata. Intended production/test scope is exactly the target matcher, one new focused regression, one exact backup, and WIP/PR metadata.

## 11. Review / CI State

No PR allocated yet. No review threads/checks apply yet.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: not present on main
STATUS_RECORD: agents/status/WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818.yaml
CLAIM_RECORD: agents/claims/WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818.yaml
LAST_OVERLAP_CHECK: GE-001 / 2026-08-18
FILE_OVERLAP: none observed on target production file
AUTHORITY_OVERLAP: related XML→CII work exists, but active PRs do not own legacy Weight Match candidate selection
DEPENDENCY_OVERLAP: #616 is independent Preview-search work; #614 is validation-only; no hard dependency
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: buildWeightCandidateRows()
Exact file/function/component: tabs/xml-cii-2019-standalone/xml-cii-weight-match.js
Current value/path under investigation: global `.slice(0, 5)` after issue×master flatMap
Do not redo: source reachability and global-top-five diagnosis
Do not change: scoring constants/tolerances, shared Preview weight authority, weight master values
Validation still required: failing-before/passing-after multi-issue regression; single-issue/override invariants
Highest-risk remaining item: stable candidate and override semantics
Exact next action: commit exact pre-edit backup + focused regression, run baseline failure, then minimally repair per-issue selection
```

## 14. Takeover / Custody Chain

`GE-001`: new work item grounded directly from live `main@bca7fc9`; no predecessor implementation is being taken over. Existing audit conclusions were revalidated against current source before mutation.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_WORK_ITEM`: this is not a takeover of an existing engineering-critical implementation. Owner explicitly granted write authority by directing implementation. Any future takeover of this WIP/PR must complete repository-specific Appendix A before engineering-critical production mutation.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

## Stage Execution Log

- BOOTSTRAP: loaded Common engineering-pr-delivery protocol and repository `AGENTS.md` / `.agents/AGENTS.md`.
- COORDINATION CHECK: grounded main/open PRs and classified target-file work `SAFE`.
- PLAN: bounded first PR to the correctness-critical legacy matcher only.
