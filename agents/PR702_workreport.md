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
BRANCH = agent/cii-fortran-format-authority-fix-20260826
COORDINATION = SAFE
```

## Handover in 60 Seconds

PR #702 reconciles contradictory CAESAR II CII fixed-FORTRAN syntax authorities found during V11/V14 Writer2 cross-checking. It does **not** change the V11↔V14 converter, Writer behavior, numerical engineering content, topology, units, browser runtime, or workflows.

Implemented engineering corrections:

1. `converters/scripts/cii14_section_rules.py`: Ver14 `ALLOWBLS` corrected **26 → 28 rows/block**, matching **168 logical V14 items** and the dedicated bridge converter/validator/RCA.
2. `converters/scripts/cii_syntax_check_2019.py`: CII2019/V11 `FORCMNT` corrected **13 → 20** and `FLANGES` corrected **11 → 12**, matching `cii2019_section_rules.py`.
3. The same legacy checker now counts **physical auxiliary rows including blank fixed rows** instead of dropping blanks. This is required because a fixed-record row can be semantically present even when blank; current `cii2019_section_rules.py` explicitly records this for real 12-row FLANGES records.
4. `converters/scripts/test_cii_format_authority_convergence.py`: now contains seven focused regressions locking V11/V14 authority convergence, stale V14 ALLOWBLS width rejection, #1042 CONTROL NONAM/RESTRAINT I13 separation, Writer-relevant cardinalities, and blank physical-row custody in both validation and derived-count reporting.

## Protected engineering invariants

- CONTROL rows 1–3 remain `2X,6I13`; row 4 remains `2X,I13`.
- 1-based `CONTROL row1 / field4 = NONAM`; 1-based `CONTROL row2 / field4 = RESTRAINT count`.
- ELEMENT remains 15 rows/block in V11 and V14.
- RESTRANT remains 24 rows/block in both versions.
- SIF&TEES remains V11=10 and V14=14 rows/block; the item 15/16 axial/torsional semantic swap remains owned by `cii_v11_v14_sif.py`.
- REDUCERS remains V11=1 / V14=2 rows/block.
- MISCEL_1 mixed I13/G13.6 semantics are untouched.
- no generic numeric/D-exponent authority is added.

## Authority / evidence basis

- `cii_v11_v14.py`: V11 ALLOWBLS 153 items/26 rows; V14 168 items/28 rows.
- `cii_v11_v14_validate.py`: independent V14 auxiliary deltas `ALLOWBLS=28`, `SIF&TEES=14`, `REDUCERS=2`.
- `docs/cii/cii-v14-v11-import-rca.md`: explicit repaired 28↔26 ALLOWBLS mapping and semantic SIF mapping.
- `test_cii_v11_v14.py`: retained native pair and 28→26 / 26→28 ALLOWBLS regressions.
- `cii2019_section_rules.py`: current V11 auxiliary authority `FORCMNT=20`, `FLANGES=12`, and physical-row-preserving `aux_block_rows()` with explicit warning not to discard blank FLANGES rows.
- `cii2019_flanges_sync.py`: neutral-file profile states FLANGES = 72 values on 12 physical lines, including its fixed string row.

## Decisions

- `DEC-CII-FMT-001`: dedicated converter/independent validator/native-pair evidence outranks stale duplicate constants.
- `DEC-CII-FMT-002`: no refactor was introduced to dynamically derive the legacy checker map. The smallest literal corrections are paired with a regression asserting complete V11 map equality to `cii2019_section_rules.py`.
- `DEC-CII-FMT-003`: fixed-record cardinality is physical-row cardinality. Blank rows inside an auxiliary block are content, not disposable whitespace.
- `DEC-CII-FMT-004`: no unrelated REAL token/D-exponent, converter, Writer, topology, units, or workflow changes are admitted.

## Backup custody

Native `node utils/backup.js save ...` is `NOT_RUN / ENVIRONMENT_BLOCKED`: this runtime cannot obtain a native checkout because DNS resolution for `github.com` fails.

Before production mutation, exact main Git blobs were retained:

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

The first connector-created syntax-checker backup was not byte-identical. It was detected **before any production mutation** and corrected by commit `847064fe4939fc761cdedf26c44ded5b4347c845` by pointing the backup path directly to the exact original blob. Final custody is exact.

## Engineering implementation commits

```text
f4597e8417364007a3d68f2ee21d10dd3c5d9131
  Ver14 ALLOWBLS 26 -> 28 (+ authority comment)

607a4ebd27b890b83fd60e3cc9b4362952db2e2c
  V11 FORCMNT 13 -> 20
  V11 FLANGES 11 -> 12

51004e5a24877bc07aad5ba0815e2b2c0a4ac389
  initial five-test format-authority convergence suite

a2e5f5188141ce8adfdcb402869d4e699749aef2
  preserve all physical auxiliary payload rows in legacy block validation/reporting

d4af9710f1bb6f4f5550e04a02d6f7ca599ae239
  add blank-row FLANGES validation/report falsifiers
```

Commit-diff inspection for `a2e5f5...` proves exactly two behavior changes: `_validate_blocked_section()` and `_build_report()` switch from nonblank-row filtering to physical payload-row counting. No other checker logic changed.

## Issues / disposition

- `ISS-CII-FMT-001`: V14 ALLOWBLS 26-vs-28 conflict — **FIXED_IN_BRANCH**.
- `ISS-CII-FMT-002`: legacy V11 FORCMNT=13 / FLANGES=11 — **FIXED_IN_BRANCH**.
- `ISS-CII-FMT-003`: legacy checker collapsed blank fixed rows before auxiliary block counting — **FIXED_IN_BRANCH**.
- `RISK-CII-FMT-001`: fixed-record row-count errors can reject valid CAESAR files or admit malformed ones — mitigated by convergence/falsifier tests.
- `RISK-CII-FMT-002`: numeric lexical validity is not equivalent to fixed-FORTRAN authority — unchanged; no generic numeric rewrite added.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| live main grounding | PASS | REMOTE_EXECUTION | GitHub | main stayed `ca8d391a...` through prior hosted reconciliation; recheck required before final freeze |
| open CII-format PR overlap | PASS | REMOTE_EXECUTION | GitHub | none relevant at branch start |
| exact pre-edit blob custody | PASS | REMOTE_EXECUTION | GitHub blob identity | both backup blobs equal main preimages |
| production diff minimality for three constants | PASS | REMOTE_EXECUTION | GitHub commit diff | only intended row-count literals/comment |
| blank-row behavior diff minimality | PASS | REMOTE_EXECUTION | GitHub commit diff | exactly two physical-row count sites |
| updated seven-test Python syntax | PASS | LOCAL_EXECUTION_RECONSTRUCTED | Python `compile()` | exact authored test text compiles; not repository execution |
| source authority cross-check | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | converter/validator/RCA/tests/section rules align |
| native checkout | NOT_RUN | LOCAL_EXECUTION | NONE | DNS cannot resolve github.com |
| native backup command | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| focused regression in exact repo checkout | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| full CII Python regression suite | NOT_RUN | NOT_OBSERVED | NONE | exact checkout unavailable |
| actual CAESAR import | NOT_RUN | NOT_OBSERVED | NONE | no runtime acceptance claim made |

No `NOT_RUN` entry is represented as PASS.

## Changed-file ledger

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

Re-ground live `main`, PR702 head/draft/mergeability, eight-file scope, reviews/threads, and hosted check state. If no exact executable checkout becomes available, leave focused/full Python tests `NOT_RUN`, keep PR702 draft/unmerged, mark the recovery package handover-ready, and stop AUTO at the environment boundary.

## Appendix A — takeover qualification

Any incoming agent must answer from live PR702/repository state before further engineering mutation:

1. State current `main`, PR702 head, draft state, merge authority, and exact changed-file list.
2. Prove Ver14 ALLOWBLS = 28 rows/168 items using converter + independent validator + RCA/tests; identify the stale 26-row source repaired here.
3. Prove V11 FORCMNT=20 and FLANGES=12 and show why FLANGES cardinality is **physical 12 rows even if one row is blank**.
4. Trace CONTROL row1/field4 NONAM versus row2/field4 RESTRAINT in 1-based neutral-file and zero-based implementation notation.
5. Explain why SIF&TEES is not a simple 10↔14 truncation/extension and state item 15/16 semantic swap.
6. Confirm PR702 does not broaden numeric lexical formatting, D-exponent parsing, converter semantics, Writer authority, topology, units, or workflows.
7. Reconcile validation truth: distinguish remote/source/reconstructed-syntax PASS from exact repository runtime `NOT_RUN`.
8. Verify both exact pre-edit backup blob identities and explain the corrected initial backup-custody incident.
9. Inspect the blank-row regression and show that 12 physical FLANGES rows with one blank pass while 11 physical rows fail.

No merge action is permitted without explicit Owner authorization.
