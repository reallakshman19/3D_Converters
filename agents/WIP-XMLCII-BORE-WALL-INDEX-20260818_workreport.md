# WIP-XMLCII-BORE-WALL-INDEX-20260818 — Preview Bore/Wall indexing

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

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner-directed XML→CII (2019) Standalone source-level performance remediation.
PR_OR_WIP: WIP-XMLCII-BORE-WALL-INDEX-20260818
BRANCH: agent/xml-cii-bore-wall-index-20260818
PR_HEAD_OBSERVED: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_BASIS_HEAD: bca7fc9390c018753d09161052b0bf2fd54e33ce
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
MERGE_BASE: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_WORK_ITEM
GROUNDING_EPOCH: GE-001
CURRENT_TAKEOVER: NONE
CURRENT_STAGE: BASELINE
LAST_COMPLETED_STAGE: COORDINATION_CHECK
CURRENT_BLOCKER: NONE
HIGHEST_RISK: An index must preserve existing staged traversal order, canonical branch grouping, first-row exact Piping Class selection, benchmark correction precedence, and DTXR-vs-class authority order.
LAST_DURABLE_CHECKPOINT: Branch created directly from live main@bca7fc9 after active-PR overlap check.
EXACT_NEXT_ACTION: Back up both existing Bore/Wall files, add focused equivalence/complexity regression, then wire once-per-Preview indexes.
```

## 2. Handover in 60 Seconds

Current main Bore/Wall authority reparses and walks the complete StagedJson for every branch through `collectStagedBranchWallEvidence()`, and `findExactClassWall()` linearly scans all Piping Class rows for every branch. This WIP will build both lookup structures once per `applyPreviewBoreWallAuthority()` call and reuse them. No authority precedence or engineering values may change.

The earlier legacy Weight Match correctness hypothesis was independently falsified and closed without production edits; it is not part of this WIP.

## 3. Repository Ground Truth

`GE-001`, 2026-08-18: live `main` and merge base are `bca7fc9390c018753d09161052b0bf2fd54e33ce`. Open PR #616 owns Preview-search only. #614 is XML→CII scale validation-only. #605/#589 own support-gap paths. A live PR search for Bore/Wall production work returned no conflicting production owner. `agents/MASTER_INDEX.md` is absent on main.

Target source blobs:

- `xml-cii-adapted-preview-bore-wall-authority.js` = `8955e316b36c1769746759aeeb43e34926d47ecb`;
- `xml-cii-adapted-preview-wall-evidence.js` = `04ff82f24dfa9e7a112c17228d1fe24de0b32a55`.

## 4. Mission / Scope / Acceptance

Mission: change hidden Bore/Wall preparation from per-branch whole-master/whole-StagedJson work to once-per-Preview indexed preparation.

Approved production scope:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js`;
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-bore-wall-authority.js`;
- focused regression(s), mandatory backups, recovery metadata.

Non-goals: no #616 file; no Preview orchestration/cache change; no Material/Weight authority change; no writer/runtime/Python/support-GAP/topology/units/formulas/workers/workflows.

Acceptance:

1. staged JSON parse/walk occurs once per Bore/Wall application, not once per branch;
2. exact Piping Class wall rows are indexed once, retaining first matching row semantics;
3. benchmark correction `96620|250` remains higher authority than master rows;
4. canonical `/B<n>` branch grouping and staged evidence order remain identical;
5. branch/node output is equivalent to the prior algorithm on representative direct-wall, schedule, class-fallback, correction, and no-match cases;
6. invalid/empty StagedJson remains fail-soft exactly as before;
7. new JS remains under repository size limits and focused tests pass.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Remaining |
|---|---|---|---|---|
| staged branch evidence index | NOT_STARTED | planned in wall-evidence boundary | NOT_RUN | implement |
| exact class/DN wall index | NOT_STARTED | planned in wall-evidence boundary | NOT_RUN | implement |
| Bore/Wall consumer | NOT_STARTED | existing production authority | NOT_RUN | wire indexes |
| regression | NOT_STARTED | focused Node | NOT_RUN | add/execute |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary |
|---|---|---|---|---|---|
| IMP-001 | performance | high | P0 | OPEN | StagedJson parse/walk repeats once per branch. |
| IMP-002 | performance | high | P0 | OPEN | Piping Class master exact-wall scan repeats once per branch. |
| RISK-001 | authority | high | P0 | OPEN | Indexing could alter evidence/row ordering or correction precedence. |
| DEC-001 | authority | high | P0 | ACTIVE | Only lookup preparation changes; resolver and precedence remain unchanged. |

## 7. Current Technical Diagnosis

```text
Observed symptom: Preview Bore/Wall CPU grows with branches multiplied by staged components and Piping Class rows.
Hypothesis: Both full scans can be factored out of the branch loop without semantic change.
Supporting evidence: `correctedRow()` calls `collectStagedBranchWallEvidence(stagedJsonText, branchName)` and `findExactClassWall(config, class, bore)` for each branch row.
Falsifier: indexed and legacy reference outputs differ for any governed representative case.
Next isolating experiment: encode legacy reference behavior in a focused test, then compare indexed helpers and production authority.
```

## 8. Authority and Invariants

Authority remains:

```text
staged/XML wall evidence
-> existing DTXR wall evidence ledger
-> DIRECT_WALL wins
-> exact Piping Class class/DN wall fallback
-> weaker DTXR schedule evidence
-> branch Preview publication
```

Protected: evidence traversal order; canonical branch identity; first exact master row; benchmark correction; bore resolution; source/provenance strings; wall values/schedules; node bore correction; fail-soft invalid input behavior.

## 9. Validation

Baseline source inspection: PASS / SOURCE_INSPECTION / NONE on main@bca7fc9. Native repository checkout remains NOT_RUN / ENVIRONMENT_BLOCKED because direct clone cannot resolve `github.com`; this must not be represented as product PASS/FAIL.

## 10. Changed-File Ledger

At initialization only this WIP metadata exists. Planned exact production paths are the two Bore/Wall modules above, two exact pre-edit backups, and one focused regression.

## 11. Review / CI State

No PR allocated yet.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: absent on main
STATUS_RECORD: agents/status/WIP-XMLCII-BORE-WALL-INDEX-20260818.yaml
CLAIM_RECORD: agents/claims/WIP-XMLCII-BORE-WALL-INDEX-20260818.yaml
FILE_OVERLAP: none observed
AUTHORITY_OVERLAP: XML/CII wall authority is sensitive but no active PR claims these exact files
DEPENDENCY_OVERLAP: independent of #616; #614 validation may later consume results
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: collectStagedBranchWallEvidence(), findExactClassWall(), applyPreviewBoreWallAuthority()
Do not change: DTXR resolver, precedence, engineering master values, correction table
Validation still required: helper equivalence + production integration + syntax
Exact next action: create mandatory backups before editing existing source
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_WORK_ITEM`: Owner explicitly requested this new implementation. A later takeover must complete repository-specific Appendix A before production mutation.
