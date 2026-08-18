# WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818 — Falsified legacy Weight Match correctness hypothesis

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: TERMINAL
TAKEOVER_AUTHORITY: REVOKED

EXECUTION_MODE: MANUAL
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
AUTO_STOP_REASON: HYPOTHESIS_FALSIFIED_BEFORE_PRODUCTION_EDIT

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner-directed XML→CII (2019) Standalone performance remediation.
PR_OR_WIP: WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818
BRANCH: agent/xml-cii-weight-match-hotfix-20260818

PR_HEAD_OBSERVED: 7d717a432d161f5a6c30ecdb8d4cf9de569a103e (metadata-only checkpoint before falsifier)
REPORT_BASIS_HEAD: bca7fc9390c018753d09161052b0bf2fd54e33ce
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
MERGE_BASE: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_SYNC: CURRENT

APPENDIX_A_STATUS: NOT_REQUIRED_NEW_WORK_ITEM
GROUNDING_EPOCH: GE-002
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: CLOSURE
LAST_COMPLETED_STAGE: BASELINE_FALSIFIER
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Do not reintroduce the false claim that current main has a global five-candidates-across-all-issues correctness defect.
LAST_DURABLE_CHECKPOINT: Exact main blob reconstructed and executable two-issue falsifier passed unchanged.

EXACT_NEXT_ACTION: Release this claim and start a fresh WIP from current main for the confirmed Bore/Wall staged-json indexing hotspot.
```

## 2. Handover in 60 Seconds

### What is now true
The junior/audit claim that `xml-cii-weight-match.js` applies one global top-five across all issues is **false on current `main`**. The exact source blob is `3312ea78d6fdfde8ea82130b4ed30597ca40b2d1`. Its `.sort(...).slice(0, 5)` is inside the `flatMap` callback, so each issue already receives up to five candidates.

### What was proven
A reconstructed source file hashed byte-identically to the GitHub blob. A two-issue Node regression expected five candidates for each issue, stable tie order, default selection for both issues, and an explicit override on the second issue. It **passed on unmodified main bytes**.

### What remains true as performance debt
The legacy matcher still maps/sorts the full Weight Master separately for each issue, so CPU/object churn remains approximately per-issue `M` candidate construction plus `M log M` sorting. That is a performance concern, but not the claimed correctness defect and not a reason to patch this WIP ahead of the larger confirmed Preview hotspots.

### What changed in production
Nothing. No production/test/backup file was committed to this branch. Only WIP recovery metadata exists.

### Exact next action
Begin a new non-stacked WIP from `main@bca7fc9` for Bore/Wall staged-json indexing.

## 3. Repository Ground Truth

`GE-002` reuses the live grounding from `GE-001`: default `main`, main/merge-base `bca7fc9390c018753d09161052b0bf2fd54e33ce`, no PR allocated, target-file overlap previously classified SAFE. The WIP branch contains recovery metadata only.

## 4. Mission / Scope / Acceptance — Final Disposition

Original mission hypothesis: repair a global top-five correctness defect in the legacy matcher.

Disposition: **ABANDON / FALSE POSITIVE**. The required baseline failure did not reproduce; therefore production mutation is prohibited by the delivery protocol and anti-gaming rules.

Follow-on performance debt is intentionally not smuggled into this terminated work item. It may be addressed later as a separately grounded performance PR or by removing the legacy authority in favor of the shared ranker.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| Claimed correctness repair | NOT_IMPLEMENTED_BY_DESIGN | N/A | hypothesis falsified | `xml-cii-weight-match.js` | none |
| Local falsifier | diagnostic only, not committed | N/A | PASS on exact main bytes | reconstructed test | none |
| Mandatory backup | command executed locally against exact pre-edit blob, not committed because no edit followed | N/A | backup Git hash matched source blob | local `.backups/` | none |

## 6. Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence |
|---|---|---|---|---|---|---|
| ISS-001 | correctness | high | P0 | **CLOSED_FALSE_POSITIVE** | Claimed global top-five across all issues. | exact executable falsifier passed on unmodified main |
| IMP-001 | performance | medium/high | P1 | DEFERRED | Full Weight Master is still constructed/scored/sorted per issue. | source inspection |
| DEC-001 | integrity | high | P0 | CLOSED | No production change after falsifier disproved defect. | validation result |

## 7. Technical Diagnosis

```text
Observed claim: later issues can receive no candidate because one global `.slice(0, 5)` truncates all issues.
Actual parse/behavior: `.sort(...).slice(0, 5)` is part of the callback expression passed to `flatMap`.
Prediction from actual code: two independent issues each return five candidates.
Falsifier execution: exact main bytes returned ten total candidates, five per issue, and both finalized successfully.
Conclusion: correctness claim falsified; only per-issue full-master performance debt remains.
```

## 8. Authority and Invariants

No authority boundary was changed. Weight Master rows, score formula/tolerances, candidate ordering, override selection, finalized config, Preview/shared weight authority, support/GAP behavior, writer/runtime, units, topology, and Python conversion remain byte-for-byte untouched by this WIP.

## 9. Current Validation

```text
ID: VAL-001
Status: PASS
Observation: LOCAL_EXECUTION
Oracle: INDEPENDENT_REPRODUCTION
Tested HEAD/Basis: exact source blob 3312ea78d6fdfde8ea82130b4ed30597ca40b2d1 from main@bca7fc9
Command/evidence: node tests/xml-cii-legacy-weight-match-per-issue.test.mjs in reconstructed minimal tree; source file git-hash-object matched GitHub blob before execution
Expected under junior hypothesis: 5 total candidates, later issue starved
Expected under actual-parentheses interpretation: 10 total, 5 per issue
Actual: PASS; 10 total, A-1..A-5 and B-1..B-5, both finalized, B-3 override honored
Limitations: reconstructed minimal tree rather than native checkout; module is self-contained and exact source blob identity was verified
Origin: PREEXISTING CLAIM FALSIFIED

ID: VAL-002
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: IMPLEMENTATION_COUPLED
Tested HEAD: N/A
Command/evidence: native repository checkout/full suite
Expected: N/A because no patch exists
Actual: NOT_RUN; clone failed `Could not resolve host: github.com`
Limitations: environment DNS/network
Origin: UNKNOWN_ORIGIN
```

## 10. Changed-File Ledger

Branch changes are recovery metadata only:

- `agents/WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818_workreport.md`;
- `agents/status/WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818.yaml`;
- `agents/claims/WIP-XMLCII-WEIGHTMATCH-HOTFIX-20260818.yaml`.

No production/test/backup path was committed.

## 11. Review / CI State

No PR was created because there is no usable production change. CI/review are NOT_APPLICABLE for this terminated WIP.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: not present on main
STATUS_RECORD: terminal
CLAIM_RECORD: released
LAST_OVERLAP_CHECK: GE-002
FILE_OVERLAP: none materialized
AUTHORITY_OVERLAP: none materialized
DEPENDENCY_OVERLAP: none
COORDINATION_STATE: SAFE_TO_CLOSE
```

## 13. Continuation State

```text
Start here: new WIP, not this branch
Do not redo: global-top-five correctness repair
Do not change based on this WIP: legacy weight scoring/cardinality semantics
Validation still required: none for this terminated hypothesis
Highest-risk remaining item: confirmed Bore/Wall per-branch staged parse/walk
Exact next action: ground Bore/Wall indexing from current main and active PR claims
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED`: no production implementation exists to take over. Any future engineering-critical implementation WIP must establish its own authorization/custody.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- `GE-001`: initial source inspection misread callback parentheses and recorded the junior correctness claim as likely true.
- Mandatory backup utility was reconstructed byte-identically (`utils/backup.js` blob `cd0c7554…`); `node utils/backup.js save ...` succeeded against the exact source blob before any contemplated edit.
- `GE-002`: executable falsifier corrected the diagnosis before production mutation. This supersedes the initial claim.
