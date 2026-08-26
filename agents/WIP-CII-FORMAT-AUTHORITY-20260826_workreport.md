# WIP-CII-FORMAT-AUTHORITY-20260826 — CII fixed-FORTRAN syntax authority convergence

## Recovery header

```text
WORK_INTENT = IMPLEMENT
REPOSITORY_STATE = NEW_PR_REQUIRED
MUTATION_AUTHORITY = WRITE_ALLOWED_BOUNDED
CRITICALITY = ENGINEERING_CRITICAL
EXECUTION_MODE = AUTO
AUTO_STATE = RUNNING
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
REPORT_BASIS_HEAD = ca8d391ac5f829f53bebb3c37adf0547c34a67b4
BRANCH = agent/cii-fortran-format-authority-fix-20260826
COORDINATION = SAFE
```

## Handover in 60 Seconds

Mission: reconcile contradictory CAESAR II CII fixed-format syntax authorities discovered while cross-checking Writer2 V11/V14 semantics. Keep the already-qualified V11↔V14 converter behavior unchanged; repair only stale validator/profile constants and lock them with regression evidence.

Current live main: `ca8d391ac5f829f53bebb3c37adf0547c34a67b4`.

Current diagnosed defects:

1. `converters/scripts/cii14_section_rules.py` declares V14 `ALLOWBLS=26` rows/block, while the dedicated V11↔V14 converter, its independent validator, RCA, and benchmark tests establish V14 `ALLOWBLS=28` rows / 168 logical items.
2. `converters/scripts/cii_syntax_check_2019.py` declares V11/CII2019 `FORCMNT=13` and `FLANGES=11`, while `cii2019_section_rules.py` establishes `FORCMNT=20` and `FLANGES=12`; the latter explicitly records FLANGES 12 as the corrected neutral-file rule.

Protected invariants:

- V11 CONTROL remains `2X,6I13` for rows 1–3 and `2X,I13` for row 4.
- `CONTROL row1 field4 = NONAM`; `CONTROL row2 field4 = RESTRAINT count`.
- V11/V14 ELEMENT remains 15 rows/block.
- RESTRAINT remains 24 rows/block in both versions.
- SIF&TEES remains V11=10, V14=14 rows/block with semantic item 15/16 swap owned by `cii_v11_v14_sif.py`.
- V14 REDUCERS remains 2 rows/block; V11 remains 1.
- No converter, worker, Writer, topology, units, numerical values, or workflow semantics may change in this PR.

## Live grounding

- repo: `reallaksh19/3D_Converters`
- default branch: `main`
- live main SHA: `ca8d391ac5f829f53bebb3c37adf0547c34a67b4`
- branch created from exact main SHA: `agent/cii-fortran-format-authority-fix-20260826`
- open PR overlap scan: no open PR found for `CII v14` or `cii14_section_rules`; active open PRs are unrelated domains.
- repository instructions: root `AGENTS.md` and `.agents/AGENTS.md` read; Common engineering-pr-delivery skill read.
- native checkout attempt: `git clone` failed because runtime DNS cannot resolve `github.com`.

## Authority / evidence basis

Authoritative evidence used for the patch:

- `cii_v11_v14.py`: V11 ALLOWBLS 153 items/26 rows; V14 168 items/28 rows; fixed-column `2X,6G13.6` handling.
- `cii_v11_v14_validate.py`: independent V14 profile updates ALLOWBLS to 28, SIF&TEES 14, REDUCERS 2.
- `cii-v14-v11-import-rca.md`: records the repaired 28↔26 ALLOWBLS mapping and SIF semantic mapping.
- `test_cii_v11_v14.py`: retained native pair plus 28→26 / 26→28 ALLOWBLS regressions.
- `cii2019_section_rules.py`: corrected V11/CII2019 auxiliary row authority (`FORCMNT=20`, `FLANGES=12`).

## Implementation plan

1. Create exact pre-edit connector-side backups before modifying existing files. Native `node utils/backup.js save ...` is `NOT_RUN / ENVIRONMENT_BLOCKED` because a native checkout cannot be obtained; preserve exact Git blobs in a dedicated `.backups/connector-20260826-cii-format-authority/` directory before mutation and record this limitation explicitly.
2. Change V14 `ALLOWBLS` block width in `cii14_section_rules.py` from 26 to 28 and improve the adjacent comment so the source of authority is explicit.
3. Make `cii_syntax_check_2019.py` derive its auxiliary block widths from `cii2019_section_rules.LINES_PER_AUX_BLOCK` when available, retaining a corrected local fallback. This prevents future divergence and fixes `FORCMNT`/`FLANGES` immediately.
4. Add focused regression tests locking V11 and V14 authority convergence and proving stale widths fail.
5. Run source-level/syntax-local checks possible in the execution environment; repository-native Python tests remain `NOT_RUN` if exact checkout cannot be materialized.
6. Open draft PR; migrate this WIP recovery state to `agents/PR<NUMBER>_workreport.md`, status, and claim records; reconcile exact changed files.

## Active findings

- `ISS-CII-FMT-001`: V14 ALLOWBLS width conflict, 26 vs qualified 28.
- `ISS-CII-FMT-002`: legacy V11 syntax checker contains stale FORCMNT=13 and FLANGES=11.
- `RISK-CII-FMT-001`: fixed-record row count errors can cause valid CAESAR neutral files to be rejected or malformed files to pass a stale checker.
- `RISK-CII-FMT-002`: numeric lexical validity is not equivalent to fixed-FORTRAN field authority; this PR must not broaden generic numeric rewriting.
- `DEC-CII-FMT-001`: current V11↔V14 converter/independent validator + retained native pair outrank the stale merge-profile/checker constants.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main / branch grounding | PASS | REMOTE_EXECUTION | GitHub | main `ca8d391a...` |
| open CII-format PR overlap | PASS | REMOTE_EXECUTION | GitHub | no relevant open PR found |
| native checkout | NOT_RUN | LOCAL_EXECUTION | NONE | DNS cannot resolve github.com |
| native backup command | NOT_RUN | NOT_OBSERVED | NONE | depends on unavailable checkout |
| converter/RCA/test authority cross-check | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | pinned main source |
| implementation | NOT_RUN | NOT_OBSERVED | NONE | next action |

## Changed-file ledger

Current expected paths before implementation:

```text
agents/WIP-CII-FORMAT-AUTHORITY-20260826_workreport.md
agents/status/WIP-CII-FORMAT-AUTHORITY-20260826.yaml
agents/claims/WIP-CII-FORMAT-AUTHORITY-20260826.yaml
.backups/connector-20260826-cii-format-authority/converters_scripts_cii14_section_rules.py.bak
.backups/connector-20260826-cii-format-authority/converters_scripts_cii_syntax_check_2019.py.bak
converters/scripts/cii14_section_rules.py
converters/scripts/cii_syntax_check_2019.py
converters/scripts/test_cii_format_authority_convergence.py
```

## EXACT_NEXT_ACTION

Create the two exact pre-edit connector-side backups from main Git blobs, then patch only the two stale syntax authorities.

## Appendix A

`NOT_REQUIRED_INITIAL_AGENT` — this is a new WIP started from current main, not takeover of an existing engineering-critical PR. Any later takeover must complete the repository-specific Appendix A gate before further production mutation.
