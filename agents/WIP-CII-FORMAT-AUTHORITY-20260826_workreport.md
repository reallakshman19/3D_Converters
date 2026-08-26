# WIP-CII-FORMAT-AUTHORITY-20260826 — CII fixed-FORTRAN syntax authority convergence

## Recovery header

```text
WORK_INTENT = IMPLEMENT
REPOSITORY_STATE = READY_FOR_DRAFT_PR
MUTATION_AUTHORITY = WRITE_ALLOWED_BOUNDED
CRITICALITY = ENGINEERING_CRITICAL
EXECUTION_MODE = AUTO
AUTO_STATE = RUNNING
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
REPORT_BASIS_HEAD = 51004e5a24877bc07aad5ba0815e2b2c0a4ac389
BASE_MAIN = ca8d391ac5f829f53bebb3c37adf0547c34a67b4
BRANCH = agent/cii-fortran-format-authority-fix-20260826
COORDINATION = SAFE
```

## Handover in 60 Seconds

Mission: reconcile contradictory CAESAR II CII fixed-format syntax authorities discovered while cross-checking Writer2 V11/V14 semantics. Keep the already-qualified V11↔V14 converter behavior unchanged; repair only stale validator/profile constants and lock them with regression evidence.

Current live main remains `ca8d391ac5f829f53bebb3c37adf0547c34a67b4` as rechecked after implementation.

Implemented corrections:

1. `converters/scripts/cii14_section_rules.py`: V14 `ALLOWBLS` corrected from 26 to **28 rows/block**, matching 168 logical V14 items and the dedicated bridge validator/converter/RCA.
2. `converters/scripts/cii_syntax_check_2019.py`: legacy V11/CII2019 `FORCMNT` corrected **13 → 20** and `FLANGES` corrected **11 → 12**, matching `cii2019_section_rules.py`.
3. `converters/scripts/test_cii_format_authority_convergence.py`: five focused regressions lock V11/V14 auxiliary authority convergence, V14 ALLOWBLS 28-row acceptance / stale 26-row rejection, the #1042 NONAM-vs-RESTRAINT CONTROL slots, and Writer-relevant version-specific cardinalities.

Protected invariants remain unchanged:

- V11 CONTROL remains `2X,6I13` for rows 1–3 and `2X,I13` for row 4.
- `CONTROL row1 field4 = NONAM`; `CONTROL row2 field4 = RESTRAINT count`.
- V11/V14 ELEMENT remains 15 rows/block.
- RESTRAINT remains 24 rows/block in both versions.
- SIF&TEES remains V11=10, V14=14 rows/block with semantic item 15/16 swap owned by `cii_v11_v14_sif.py`.
- V14 REDUCERS remains 2 rows/block; V11 remains 1.
- No converter, worker, Writer, topology, units, numerical values, or workflow semantics changed.

## Live grounding

- repo: `reallaksh19/3D_Converters`
- default branch: `main`
- live main SHA: `ca8d391ac5f829f53bebb3c37adf0547c34a67b4`
- branch: `agent/cii-fortran-format-authority-fix-20260826`
- open PR overlap scan: no open PR found for `CII v14` or `cii14_section_rules`; active open PRs were unrelated domains.
- repository instructions: root `AGENTS.md` and `.agents/AGENTS.md` read; Common engineering-pr-delivery skill read.
- native checkout attempt: `git clone` failed because runtime DNS cannot resolve `github.com`.

## Authority / evidence basis

- `cii_v11_v14.py`: V11 ALLOWBLS 153 items/26 rows; V14 168 items/28 rows; fixed-column `2X,6G13.6` handling.
- `cii_v11_v14_validate.py`: independent V14 profile updates ALLOWBLS to 28, SIF&TEES 14, REDUCERS 2.
- `docs/cii/cii-v14-v11-import-rca.md`: records repaired 28↔26 ALLOWBLS mapping and SIF semantic mapping.
- `test_cii_v11_v14.py`: retained native pair plus 28→26 / 26→28 ALLOWBLS regressions.
- `cii2019_section_rules.py`: corrected V11/CII2019 auxiliary row authority (`FORCMNT=20`, `FLANGES=12`).

## Decisions

- `DEC-CII-FMT-001`: current V11↔V14 converter/independent validator + retained native pair outrank stale duplicate constants.
- `DEC-CII-FMT-002`: planned runtime derivation of `cii_syntax_check_2019.BLOCK_LINES_PER_SECTION` from `cii2019_section_rules` was deliberately **not** implemented. The smaller correction changes only two stale literals; the new regression asserts complete equality between both V11 maps, preventing future silent divergence without changing import/fallback behavior.
- `DEC-CII-FMT-003`: no unrelated lexical REAL/D-exponent changes are admitted by this workstream.

## Backup custody

The mandated native `node utils/backup.js save ...` command is `NOT_RUN / ENVIRONMENT_BLOCKED` because no native checkout can be obtained in this runtime.

Before either production file was changed, exact Git-blob preimages were preserved on the branch:

```text
cii14_section_rules.py original blob
  fa0aed33322dd6995427bce440edbd465efcc897
  -> .backups/connector-20260826-cii-format-authority/converters_scripts_cii14_section_rules.py.bak
  verified backup blob = fa0aed33322dd6995427bce440edbd465efcc897

cii_syntax_check_2019.py original blob
  37f7092a0e11c775c62139254fc1001dcc9b0776
  -> .backups/connector-20260826-cii-format-authority/converters_scripts_cii_syntax_check_2019.py.bak
  verified backup blob = 37f7092a0e11c775c62139254fc1001dcc9b0776
```

The first connector-created syntax-checker backup accidentally contained unrelated lexical-real edits. This was detected **before any production mutation**. Commit `847064fe4939fc761cdedf26c44ded5b4347c845` corrected the backup path by directly referencing the exact original Git blob. Final backup identity is exact.

## Implementation commits

```text
f4597e8417364007a3d68f2ee21d10dd3c5d9131
  cii14_section_rules.py
  ALLOWBLS 26 -> 28 only

607a4ebd27b890b83fd60e3cc9b4362952db2e2c
  cii_syntax_check_2019.py
  FORCMNT 13 -> 20
  FLANGES 11 -> 12

51004e5a24877bc07aad5ba0815e2b2c0a4ac389
  add focused authority-convergence regression
```

GitHub commit-diff inspection proves the two production edits contain only the intended three authority-literal corrections (plus the V14 explanatory comment).

## Active findings

- `ISS-CII-FMT-001`: V14 ALLOWBLS width conflict — **FIXED_IN_BRANCH**.
- `ISS-CII-FMT-002`: legacy V11 syntax checker stale FORCMNT/FLANGES widths — **FIXED_IN_BRANCH**.
- `RISK-CII-FMT-001`: fixed-record row count errors can reject valid CAESAR neutral files or admit malformed ones — mitigated by convergence regression.
- `RISK-CII-FMT-002`: numeric lexical validity is not equivalent to fixed-FORTRAN field authority — unchanged, no generic numeric rewrite added.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main / branch grounding | PASS | REMOTE_EXECUTION | GitHub | main still `ca8d391a...` after implementation |
| open CII-format PR overlap | PASS | REMOTE_EXECUTION | GitHub | no relevant open PR found at start |
| exact pre-edit blob custody | PASS | REMOTE_EXECUTION | GitHub blob identity | both final backup blobs equal main preimages |
| production diff minimality | PASS | REMOTE_EXECUTION | GitHub commit diff | 1 V14 literal + comment; 2 V11 literals only |
| new test Python syntax | PASS | LOCAL_EXECUTION_RECONSTRUCTED | Python `compile()` | exact authored test source compiles |
| converter/RCA/test authority cross-check | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | pinned main source |
| native checkout | NOT_RUN | LOCAL_EXECUTION | NONE | DNS cannot resolve github.com |
| native backup command | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| `python test_cii_format_authority_convergence.py` in repository checkout | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| full CII Python regression suite | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| external CAESAR import | NOT_RUN | NOT_OBSERVED | NONE | not required for literal authority reconciliation; no claim made |

No `NOT_RUN` entry is represented as PASS.

## Changed-file ledger

```text
.backups/connector-20260826-cii-format-authority/converters_scripts_cii14_section_rules.py.bak
  exact pre-edit Git blob backup

.backups/connector-20260826-cii-format-authority/converters_scripts_cii_syntax_check_2019.py.bak
  exact pre-edit Git blob backup after corrected custody commit

agents/WIP-CII-FORMAT-AUTHORITY-20260826_workreport.md
  living recovery record

agents/status/WIP-CII-FORMAT-AUTHORITY-20260826.yaml
  machine-readable state

agents/claims/WIP-CII-FORMAT-AUTHORITY-20260826.yaml
  bounded path/authority claim

converters/scripts/cii14_section_rules.py
  V14 ALLOWBLS 26 -> 28

converters/scripts/cii_syntax_check_2019.py
  V11 FORCMNT 13 -> 20; FLANGES 11 -> 12

converters/scripts/test_cii_format_authority_convergence.py
  new five-test convergence/falsifier suite
```

## EXACT_NEXT_ACTION

Open a draft PR from this branch, allocate the PR number, migrate the recovery artifacts to `PR<NUMBER>` records, then reconcile the hosted PR diff and any available checks. Merge remains unauthorized.

## Appendix A

`NOT_REQUIRED_INITIAL_AGENT` — this is a new WIP started from current main, not takeover of an existing engineering-critical PR. Any later takeover must complete the repository-specific Appendix A gate before further production mutation.
