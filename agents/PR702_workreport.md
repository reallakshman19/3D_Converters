# PR702 — CII fixed-FORTRAN syntax authority convergence

## Recovery header

```text
PR = 702
WORK_INTENT = IMPLEMENT
REPOSITORY_STATE = DRAFT_PR_OPEN
MUTATION_AUTHORITY = WRITE_ALLOWED_BOUNDED
CRITICALITY = ENGINEERING_CRITICAL
EXECUTION_MODE = AUTO
AUTO_STATE = RUNNING
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
BASE_MAIN = ca8d391ac5f829f53bebb3c37adf0547c34a67b4
PR_HEAD_AT_ALLOCATION = 62d89116dddfc59d3a5e0aa3eeee54f9cc802179
BRANCH = agent/cii-fortran-format-authority-fix-20260826
COORDINATION = SAFE
```

## Handover in 60 Seconds

PR #702 reconciles contradictory CAESAR II CII fixed-format syntax authorities found during V11/V14 Writer2 cross-checking. It deliberately does **not** change the V11↔V14 converter, Writer behavior, numerical engineering content, topology, units, browser runtime, or workflows.

Implemented engineering corrections:

1. `converters/scripts/cii14_section_rules.py`: Ver14 `ALLOWBLS` corrected **26 → 28 rows/block**, matching 168 logical V14 allowable items and the dedicated bridge converter/validator/RCA.
2. `converters/scripts/cii_syntax_check_2019.py`: CII2019/V11 `FORCMNT` corrected **13 → 20** and `FLANGES` corrected **11 → 12**, matching `cii2019_section_rules.py`.
3. `converters/scripts/test_cii_format_authority_convergence.py`: adds five regressions locking V11/V14 authority convergence, V14 ALLOWBLS stale-width falsification, #1042 CONTROL NONAM/RESTRAINT I13 separation, and Writer-relevant block cardinalities.

Current PR state at allocation:

```text
state = OPEN
isDraft = true
merged = false
base = main@ca8d391ac5f829f53bebb3c37adf0547c34a67b4
head = 62d89116dddfc59d3a5e0aa3eeee54f9cc802179
merge authority = NOT GRANTED
```

## Protected engineering invariants

- CONTROL row 1–3 fixed integer grammar remains `2X,6I13`; row 4 remains `2X,I13`.
- 1-based `CONTROL row1 / field4 = NONAM`; 1-based `CONTROL row2 / field4 = RESTRAINT count`.
- ELEMENT remains 15 rows/block in V11 and V14.
- RESTRANT remains 24 rows/block in both versions.
- SIF&TEES remains V11=10 rows/block and V14=14 rows/block; item 15/16 axial/torsional semantic swap remains owned by `cii_v11_v14_sif.py`.
- REDUCERS remains V11=1 / V14=2 rows/block.
- MISCEL_1 mixed I13/G13.6 semantics are untouched.
- no generic numeric/D-exponent authority is added.

## Authority / evidence basis

- `cii_v11_v14.py`: V11 ALLOWBLS 153 items/26 rows; V14 168 items/28 rows.
- `cii_v11_v14_validate.py`: independent V14 auxiliary deltas `ALLOWBLS=28`, `SIF&TEES=14`, `REDUCERS=2`.
- `docs/cii/cii-v14-v11-import-rca.md`: explicit repaired 28↔26 ALLOWBLS mapping and semantic SIF mapping.
- `test_cii_v11_v14.py`: retained native pair and 28→26 / 26→28 ALLOWBLS regressions.
- `cii2019_section_rules.py`: current V11 auxiliary authority `FORCMNT=20`, `FLANGES=12` with explicit FLANGES correction comment.

## Decisions

- `DEC-CII-FMT-001`: dedicated converter/independent validator/native-pair evidence outranks stale duplicate constants.
- `DEC-CII-FMT-002`: no refactor was introduced to make the legacy checker dynamically derive its map. The minimal two-literal correction is paired with a regression that asserts complete map equality to `cii2019_section_rules.py`, preventing future silent divergence while preserving runtime/import behavior.
- `DEC-CII-FMT-003`: no unrelated REAL token/D-exponent change is allowed in PR702.

## Backup custody

The repository-mandated native `node utils/backup.js save ...` command is `NOT_RUN / ENVIRONMENT_BLOCKED`: this runtime cannot obtain a native checkout because DNS resolution for `github.com` fails.

Before production mutation, exact main Git blobs were retained in the branch:

```text
cii14_section_rules.py
  main blob = fa0aed33322dd6995427bce440edbd465efcc897
  backup blob = fa0aed33322dd6995427bce440edbd465efcc897

cii_syntax_check_2019.py
  main blob = 37f7092a0e11c775c62139254fc1001dcc9b0776
  backup blob = 37f7092a0e11c775c62139254fc1001dcc9b0776
```

Backup paths:

```text
.backups/connector-20260826-cii-format-authority/converters_scripts_cii14_section_rules.py.bak
.backups/connector-20260826-cii-format-authority/converters_scripts_cii_syntax_check_2019.py.bak
```

The first connector-created syntax-checker backup was not byte-identical. It was detected before any production edit and corrected by commit `847064fe4939fc761cdedf26c44ded5b4347c845`, which points the backup path directly at the exact original Git blob. Final custody is exact.

## Engineering implementation commits

```text
f4597e8417364007a3d68f2ee21d10dd3c5d9131
  cii14_section_rules.py
  ALLOWBLS 26 -> 28 only (+ authority comment)

607a4ebd27b890b83fd60e3cc9b4362952db2e2c
  cii_syntax_check_2019.py
  FORCMNT 13 -> 20
  FLANGES 11 -> 12

51004e5a24877bc07aad5ba0815e2b2c0a4ac389
  add test_cii_format_authority_convergence.py
```

GitHub commit-diff inspection proves the production changes are limited to those three intended row-count literals plus the Ver14 explanatory comment.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main grounding | PASS | REMOTE_EXECUTION | GitHub | main remained `ca8d391a...` through PR allocation |
| open CII-format PR overlap | PASS | REMOTE_EXECUTION | GitHub | no relevant open PR found before branch mutation |
| exact pre-edit blob custody | PASS | REMOTE_EXECUTION | GitHub blob identity | both final backup blobs exactly equal main preimages |
| production diff minimality | PASS | REMOTE_EXECUTION | GitHub commit diff | only three intended authority values changed |
| new regression Python syntax | PASS | LOCAL_EXECUTION_RECONSTRUCTED | Python `compile()` | exact authored test source compiles |
| source authority cross-check | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | converter/validator/RCA/tests agree with corrected values |
| native checkout | NOT_RUN | LOCAL_EXECUTION | NONE | DNS cannot resolve github.com |
| native backup command | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| focused regression in repo checkout | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| full CII Python regression suite | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| actual CAESAR import | NOT_RUN | NOT_OBSERVED | NONE | no runtime acceptance claim made |

No NOT_RUN is promoted to PASS.

## Changed-file ledger

Expected hosted PR file set after WIP migration:

```text
.backups/connector-20260826-cii-format-authority/converters_scripts_cii14_section_rules.py.bak
.backups/connector-20260826-cii-format-authority/converters_scripts_cii_syntax_check_2019.py.bak
agents/PR702_workreport.md
agents/status/PR702.yaml
agents/claims/PR702.yaml
converters/scripts/cii14_section_rules.py
converters/scripts/cii_syntax_check_2019.py
converters/scripts/test_cii_format_authority_convergence.py
```

## EXACT_NEXT_ACTION

1. retire WIP-named recovery artifacts after PR702 status/claim creation;
2. fetch hosted PR702 changed-file list and exact diff;
3. inspect reviews/threads and available check/run state;
4. if executable repository environment remains unavailable, preserve focused/full tests as NOT_RUN and stop before ready-for-review/merge claims unless another exact execution path is available.

## Appendix A — takeover qualification

Any incoming agent must answer from live PR702/repository state before further engineering mutation:

1. State current `main`, PR702 head, draft state, merge authority, and exact changed-file list.
2. Show why Ver14 ALLOWBLS is 28 rows/168 items using the dedicated converter, independent validator, RCA, and tests; identify the stale 26-row source that PR702 changes.
3. Show V11 `FORCMNT=20` and `FLANGES=12` authority from `cii2019_section_rules.py` and identify the stale legacy checker values repaired here.
4. Trace CONTROL row1/field4 NONAM versus row2/field4 RESTRAINT using both 1-based neutral-file and zero-based implementation notation.
5. Explain why SIF&TEES is not a simple 10↔14 row truncation/extension and state the item 15/16 semantic swap.
6. Confirm that PR702 does not broaden numeric lexical formatting, D-exponent parsing, converter semantics, Writer authority, topology, units, or workflow behavior.
7. Reconcile validation truth: distinguish remote diff/source PASS from repository-native Python NOT_RUN and do not promote the latter.
8. Verify exact pre-edit backup blob identities and explain the corrected initial backup-custody incident.

Minimum takeover verdict: all eight answers grounded to live source/PR state, with no merge action unless Owner authorization is explicit.
