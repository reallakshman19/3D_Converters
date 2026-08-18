# PR628 — XML→CII Preview Bore/Wall indexing

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
PR_OR_WIP: PR628
BRANCH: agent/xml-cii-bore-wall-index-20260818
PR_URL: https://github.com/reallaksh19/3D_Converters/pull/628
PR_HEAD_OBSERVED: 33891dd393b908dc32c2d18d75ca8d859a845c67
REPORT_BASIS_HEAD: 33891dd393b908dc32c2d18d75ca8d859a845c67
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
MERGE_BASE: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_SYNC: CURRENT_AT_PR_ALLOCATION
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_WORK_ITEM
GROUNDING_EPOCH: GE-003
CURRENT_TAKEOVER: NONE

CURRENT_STAGE: CI_REVIEW
LAST_COMPLETED_STAGE: DRAFT_PR_PUBLISH
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Native repository real-core execution remains to be observed from PR checks; local focused lookup equivalence passed on exact branch bytes.
LAST_DURABLE_CHECKPOINT: Draft PR #628 created with 8 expected changed files; production/test blobs previously validated exactly.
EXACT_NEXT_ACTION: Complete PR-numbered custody migration, fetch exact new PR head, inspect checks/reviews/threads, and reconcile any actionable failures without merging.
```

## 2. Handover in 60 Seconds

PR #628 changes the hidden Preview Bore/Wall preparation from branch-multiplied scans to two once-per-Preview indexes:

- `Map<canonicalBranch, wallEvidence[]>` built from StagedJson once;
- exact `class|DN` wall result map built from Piping Class rows once.

`applyPreviewBoreWallAuthority()` builds both indexes before iterating `branchRows`, then reuses them. Existing DTXR resolver and authority order are untouched.

No Weight Match changes are included. The earlier junior “global top five” correctness claim was falsified before production mutation: current main already slices five candidates per issue.

## 3. Repository Ground Truth

Grounding `GE-003` at draft allocation:

- PR: #628, open and draft;
- base: `main` at `bca7fc9390c018753d09161052b0bf2fd54e33ce`;
- allocated head before PR-numbered metadata commits: `33891dd393b908dc32c2d18d75ca8d859a845c67`;
- branch was `behind_by: 0` immediately pre-PR;
- initial changed-file count: 8, all expected;
- open #616 owns Preview-search only and is not touched;
- no active PR was found claiming the two Bore/Wall production files;
- no workflow files changed.

Pre-edit source blobs preserved by required backups:

- Bore/Wall authority `8955e316b36c1769746759aeeb43e34926d47ecb`;
- wall evidence `04ff82f24dfa9e7a112c17228d1fe24de0b32a55`.

Validated modified blobs before PR metadata migration:

- wall evidence `1de4824a50955bfdeaaca94532970c30055a6b90`;
- Bore/Wall authority `a7f666f5f4389fdf8fa0681296ebe603461fda57`;
- focused test `739fccec5360e3626e4065838333230f60fad6d9`.

## 4. Mission / Scope / Acceptance

Mission: eliminate per-branch whole-StagedJson and whole-Piping-Class preparation in Preview Bore/Wall without changing engineering authority or published facts.

In scope:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js`;
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-bore-wall-authority.js`;
- `tests/xml-cii-preview-bore-wall-index.test.mjs`;
- exact pre-edit backups and agent custody records.

Out of scope: #616 search file, Preview cache/orchestration, core DTXR resolver/ledger, Material/Weight authority, support/GAP, writer/runtime, Python, topology, formulas, units, workers, workflows.

Acceptance status:

1. StagedJson parse/walk once per Bore/Wall application — PASS focused.
2. Piping Class wall rows scanned once per application — PASS focused.
3. First exact master row semantics preserved — PASS focused.
4. `96620|250` correction remains authoritative — PASS focused.
5. canonical `/B<n>` grouping and evidence order unchanged — PASS independent reference.
6. direct DTXR wall remains above class fallback — PASS focused integration.
7. invalid staged JSON remains fail-soft — PASS.
8. node bore correction remains active — PASS focused integration.
9. repository-native real-core execution — PENDING/NOT_YET_OBSERVED.

## 5. Implementation State

| Work item | State | Notes |
|---|---|---|
| staged branch evidence index | COMPLETE | parse/walk once, ordered evidence buckets |
| exact class/DN wall index | COMPLETE | correction seeded first; first-row/null semantics preserved |
| Bore/Wall consumer | COMPLETE | two indexes built once before branch loop |
| focused regression | COMPLETE | structural complexity + independent legacy equivalence |
| mandatory backups | COMPLETE | exact pre-edit bytes |
| draft PR | COMPLETE | #628 |
| CI/review reconciliation | IN_PROGRESS | inspect exact final PR head after metadata migration |

## 6. Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary |
|---|---|---|---|---|---|
| IMP-001 | performance | high | P0 | IMPLEMENTED | StagedJson parse/walk removed from per-branch loop. |
| IMP-002 | performance | high | P0 | IMPLEMENTED | exact class-wall master scan removed from per-branch loop. |
| RISK-001 | authority | high | P0 | QUALIFIED_FOCUSED | traversal/row/correction/authority ordering covered. |
| RISK-002 | validation | medium | P1 | OPEN | repository-native real-core test evidence pending PR checks. |
| DEC-001 | authority | high | P0 | ACTIVE | lookup preparation only; no resolver/engineering-value changes. |

## 7. Technical Diagnosis / Change

Before:

```text
B branches × (parse/walk S staged components + scan P class rows)
≈ O(B×S + B×P)
```

After:

```text
parse/walk S once + scan P once + B map lookups
≈ O(S + P + B)
```

The compatibility wrapper functions remain available for other callers. The production Bore/Wall authority consumes the indexes directly.

A deliberate detail in the class index preserves legacy `.find()` behavior: the first class/DN key is stored even if its wall result is `null`, so a later valid duplicate cannot silently become authoritative. Benchmark corrections are inserted before master rows and cannot be overwritten.

## 8. Authority and Invariants

Authority remains:

```text
staged/XML wall evidence
→ existing DTXR wall evidence ledger
→ DIRECT_WALL wins
→ exact Piping Class class/DN wall fallback
→ weaker DTXR schedule evidence
→ Preview publication
```

Negative assurance: no engineering values, unit conversions, schedule values, correction constants, DTXR parsing policy, Material/Weight authority, support/GAP rules, writer/runtime logic, Python logic, topology, or workflow configuration changed.

## 9. Validation

```text
VAL-001 PASS — repository backup policy
Exact pre-edit reconstructed hashes matched GitHub source blobs. `node utils/backup.js save` was executed before source edits; exact backups are committed.

VAL-002 PASS — syntax
node --check on both modified production modules and the focused test passed on exact modified bytes.

VAL-003 PASS — independent lookup equivalence / structural performance invariant
node tests/xml-cii-preview-bore-wall-index.test.mjs
Output: XML CII Preview Bore/Wall indexed preparation checks passed.
Observed: one JSON parse followed by 100 branch lookups; zero master row reads after index construction; independent legacy staged evidence equivalence; first-row/null duplicate behavior; correction precedence; NPS mapping; invalid JSON; no-match behavior.

VAL-004 PASS_WITH_LIMITATION — focused authority integration
Direct staged wall still outranks class wall; class wall remains fallback; node bore corrections remain. Local reconstruction used minimal stubs only at imported DTXR resolver/ledger boundaries so modified modules could execute without a checkout.

VAL-005 NOT_RUN / ENVIRONMENT_BLOCKED — native repository suite
Direct clone failed: `Could not resolve host: github.com`. This is not a product PASS/FAIL. PR checks are required repository-native evidence.
```

## 10. Changed-File Ledger

Production:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js`;
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-bore-wall-authority.js`.

Qualification/custody:

- `tests/xml-cii-preview-bore-wall-index.test.mjs`;
- two exact `.backups/*.bak` files;
- WIP records being superseded by `agents/PR628_*` records.

No `.github/workflows/` change.

## 11. Review / CI State

At allocation PR #628 is draft/open. Initial `mergeable: false` is not interpreted as a semantic failure because the PR had just been created and GitHub mergeability/check computation may not have completed. Exact final-head checks/reviews must be fetched after metadata migration.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: absent on main
STATUS_RECORD: agents/status/PR628.yaml
CLAIM_RECORD: agents/claims/PR628.yaml
FILE_OVERLAP: none observed at GE-003
AUTHORITY_OVERLAP: no active owner for these exact Bore/Wall files
DEPENDENCY_OVERLAP: independent of #616; #614 may consume performance evidence later
COORDINATION_STATE: SAFE
```

## 13. Continuation State

```text
Start here: exact PR #628 head after metadata migration
Do not redo: implementation, focused local equivalence, mandatory backup
Do not change: DTXR resolver, authority order, correction values
Validation still required: PR-head check runs/status and review/thread reconciliation
Highest-risk remaining item: repository-native real-core execution
Exact next action: inspect PR head, checks, changed files, reviews; fix only actionable failures within claimed scope
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_WORK_ITEM`. Owner authorized this new engineering-critical implementation. A future takeover requires repository-specific qualification before production mutation.
