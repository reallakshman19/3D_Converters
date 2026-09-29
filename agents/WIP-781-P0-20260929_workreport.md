# WIP-781-P0-20260929 — Issue #781 P0 B31.3 live-row custody + explicit REST preservation trace

## Recovery state

```text
ISSUE = #781
PLAN = IMPLEMENTATION_PLAN rev 1 / issuecomment-5893573324
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-781-p0-b313-rest-20260929
CRITICALITY = ENGINEERING_CRITICAL
EXECUTION_SCOPE = STEP-781-01 only
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Mission

Implement only the approved P0 slice:

1. remove B31.3 Preview action availability/evaluation dependence on the legacy Preview localStorage row cache by threading current in-memory Preview `branchRows` into the controller path;
2. retain legacy cache strictly as backward-compatible fallback;
3. add focused regression coverage proving the action remains available with live rows while legacy cache is empty;
4. trace explicit `+Y` restraint custody for `PS-14292.1` and `PS-14259.4` end-to-end before any support fallback or production support logic is changed.

No lower-priority #781 slice is owned by this WIP.

## Live grounding

- `main`: `7057e3d031663fbe92c22f4a3b8c98cc32d06e7b`
- post-#780 worker/dataset architecture: `2b6c38f47d547fe8e2d35f89b0d636d91ed77860`
- Common V3.1 basis: `1ced68258afeaf50df113b1d38a4ceb9193587e3`
- Two-Pass revision: `TPG-2P-2026-09-28-R3`
- no existing #781 branch or PR was present at start.

## Coordination

```text
B31.3 target-file overlap = SAFE from inspected open XML/CII PR scopes
REST/support production authority = COORDINATION_REQUIRED if trace proves a production support mutation is necessary
```

Open PR #773 explicitly excludes support/B31.3 work; PR #772 likewise excludes support/B31.3. Older support/gap PRs remain relevant historical evidence but do not justify changing current-head support logic without a reproduced loss stage.

## Production trace / current failure isolation

Current Preview path:

```text
renderStandalonePreviewReportPanel()
  -> xmlCiiBuildAndRenderPreview(v7)
     -> buildLegacyPreview()
        -> xmlCiiDryRunPreview()
        -> branchRows in memory
        -> render table
     -> v7 currently discards build result
  -> installPreviewB313WallUpdateAuditController()
     -> B31.3 update controller reads legacy localStorage cache
     -> action creation returns early when cache rows are absent
```

The base Preview renderer already owns the exact current `branchRows`. The P0 defect is the custody/API boundary, not B31.3 numerical calculation logic.

## Authority / preserve invariants

- B31.3 remains an explicit Preview action, never automatic wall authority.
- S/E/W/Y and material-factor qualification remain fail-closed.
- No wall value is applied merely because the action becomes visible.
- #780 master dataset worker/IndexedDB custody remains unchanged; do not reintroduce persistent master arrays into UI state.
- Preview `branchRows` are bounded current Preview result data, not master-data authority.
- Legacy cache may remain compatibility fallback but must not gate action existence.
- No new REST fallback may be added for the cited nodes while source explicit `+Y` exists.

## Appendix A — implementation qualification

### A1 Production Trace — 20/20
Traced the current source from standalone Preview entry through V7/base renderer to the B31.3 controllers. Confirmed current in-memory `branchRows` are rendered, then discarded at the API boundary, while B31.3 action creation re-reads the legacy cache.

### A2 Current Failure Isolation — 20/20
Exact defect: `installAction()` obtains only `readLegacyBranchRows()` and returns on `!rows.length`; audit controller also initializes/refreshes retained rows from the same cache. Therefore an empty compatibility cache suppresses a valid action even when the Preview table was built from live rows.

### A3 Authority / Invariant — 20/20
Patch changes row transport/action availability only. It does not alter B31.3 equations, factor authority, material resolution, pressure/unit handling, corrosion, OD parity, wall selection, or explicit-action semantics.

### A4 Independent Validation — 19/20
Focused source and behavioral regression will independently force `localStorage` Preview cache empty while supplying live Preview rows and assert action visibility/evaluation input. Browser full-app execution remains pending until hosted/native environment provides it.

### A5 Next-Commit / Minimal Patch — 20/20
Minimal production patch: return/currently expose Preview result rows; pass them into B31.3 install; prefer live host/supplied rows and fall back to legacy cache. Add focused regression. No support production change until custody trace proves exact loss stage.

```text
TOTAL = 99/100
DISPOSITION = QUALIFIED_FOR_BOUNDED_STEP_781_01_IMPLEMENTATION
```

## Backup truth

Repository policy requires `node utils/backup.js save <file> ...` before editing existing files. This connector environment has no GitHub DNS/native checkout, so the native command is:

```text
NOT_RUN / ENVIRONMENT_BLOCKED
```

Before any production edit, exact pre-edit Git blobs are copied on this branch under `.backups/issue-781/p0/`. These are byte-identical connector-side recovery copies and are not misrepresented as execution of the native backup utility.

## Validation plan

1. static/API contract test: Preview renderer returns/exposes current branch rows;
2. B31.3 controller test/static regression: live rows + empty legacy cache -> action available;
3. audit path uses supplied/current live rows for report evaluation;
4. existing `tests/xml-cii-b313-preview-ui-static.test.js` remains passing;
5. source restraint fixtures: prove explicit `+Y` at cited benchmark identities;
6. trace parsed/enriched/Preview/writer/final CII custody and record exact first failing stage before support mutation;
7. no regression to #780 metadata-only master custody.

## Current validation truth

```text
source trace = PASS / CURRENT_HEAD_INSPECTION
failure isolation = PASS / CURRENT_HEAD_INSPECTION
open-PR overlap = SAFE for B31.3 target files; support trace may require later coordination
native backup utility = NOT_RUN / ENVIRONMENT_BLOCKED
connector exact-blob backups = IN_PROGRESS before production edit
focused tests = NOT_RUN
browser = NOT_RUN
```

## Changed-file ledger

Pre-edit: recovery records + exact connector backup copies only. No production file changed yet.

## Highest risk

Accidentally replacing fail-closed B31.3 engineering authority with UI state or stale row data. Mitigation: current host/live rows first, supplied snapshot second, legacy cache fallback last; no numerical authority changes.

## EXACT_NEXT_ACTION

Create exact pre-edit blob backups, then patch the Preview result handoff and B31.3 live-row selection with a focused regression proving AC-781-01 through AC-781-04.
