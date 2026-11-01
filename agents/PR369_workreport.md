# PR369 — Pyodide native support mapper import closure

STATUS: DRAFT_PR_OPEN / ENGINEERING_CRITICAL / REVIEW_REQUIRED
BASE_MAIN_SHA: d8ce6ce7bbb5dc3108360201a3312da02210fe27
BRANCH: fix/xml229-worker-missing-support-mapper-20261101
PR: https://github.com/reallakshman19/3D_Converters/pull/369
PR_HEAD: 143991fbcb912b00b66abbe2380452d98ca1b44e
CI: PENDING
REVIEW: NOT_RUN
TAKEOVER_AUTHORITY: READ_ONLY
SOURCE: Owner's second 10 Output/Run BM2 attempt, native Worker failed
ORIGINAL_LINEAGE_STAGE after 5.053s (screen 19.2s), code UNCLASSIFIED_EXCEPTION.
Current Worker verified Final-mass and branch-format census; no CII output.

## Independent production trace and isolation
The engine fetches only SCRIPT_FILE_NAMES into Pyodide /scripts. Native
runtime_custody.main -> stage_native_original_lineage ->
_validate_finalized_geometry -> import xml229_prefinal_restraints ->
top-level 'from xml229_support_type_mapper import mapped_support_kind'.
The engine includes xml229_prefinal_restraints.py but OMITTED
xml229_support_type_mapper.py. The latter is present in both converter
script trees and has only the standard-library 're' import. Complete
static enumeration of Python imports from every bundled script found
xml229_support_type_mapper as the only unbundled local import. Therefore
a fresh Worker without an already cached module raises ModuleNotFoundError,
which engine RUN_SNIPPET reports as UNCLASSIFIED_EXCEPTION with the
ORIGINAL_LINEAGE_STAGE phase. This is a strong source-grounded causal
explanation; the user's sanitized failure receipt does not contain the
private traceback, so the exact attempt's exception class is not claimed.

## Minimal patch, protected behavior and tests
Add only 'xml229_support_type_mapper.py' to SCRIPT_FILE_NAMES immediately
before prefinal_restraints.py in BOTH root and docs engine.js. Preserve pre-edit
root/docs bytes separately in .backups. Add an explicit Node contract test
that enumerates local Python imports from every included script, requiring
the dependency closure, plus root/docs mirrors and native guard retention.
No changes to accepted Final masses, JSON, XML, geometry, support mapping,
native Python/writer semantics, UI failure allowlist, release gate, CII
reconciliation, Worker transport, or timeout. No fake CII or mass authority.

STATUS=PASS (static source inspection): missing single Python dependency
identified; mapper root/docs parity; engine root/docs parity before patch.
STATUS=NOT_RUN (actual Pyodide): exact Owner source and Final packet are not
available from the audit text; no real browser/native output validated.
ORACLE: in-repository Python import closure, independent of UI report.
HIGHEST_RISK: A later genuine source/lineage/geometry guard may still fail
after the import is repaired. Native download remains protected.
EXACT_NEXT_ACTION: Execute Node bundle test and real BM2 Chrome/Pyodide
native regression; review CI, then load patched browser assets and retry
Owner's exact source+four masters+Final packet, verify independent CII,
and only then authorize output. Never merge/deploy without Owner authority.

## Draft publication checkpoint
PR369 created against main d8ce6ce7bbb5dc3108360201a3312da02210fe27;
only engine root/docs, backup snapshots, one contract test and this report.
The diagnosis is a reproducible static Python-import closure violation,
not an observed Owner native CII success. No merge, deployment or release
was performed. The newly authored test's regex escapes were corrected in
the second commit before draft publication. Test execution remains NOT_RUN
until CI observation. Exact follow-on is native Chrome/Owner retry after
reviewed integration, then independent full CII reconciliation.

## REBASE CHECKPOINT — 2026-11-01 ~07:5xZ
Main already independently contains the exact missing module in root/docs Worker
`SCRIPT_FILE_NAMES` from commit `9ef4a28a1d3ed2a30542e1e2b59c5c17c6998eda`.
Original PR369 engine patch became REDUNDANT and differs only in script name
ordering; retaining it would needlessly undo main's ordering. Rebase PR369
onto c231cd383f7aa3d3ea8b5eae7d06a1f2b1a13986, retaining ONLY the new dependency-closure test and this report.
Original engine snapshots are no longer production-edit backups because the
rebased PR does not edit production source. Previous git commits remain as
recoverable evidence. No published native CII or Owner-specific check claimed.
REBASE_VALIDATION: main engine already imports mapper (source+docs parity).
EXACT_NEXT_ACTION: run Node import-closure regression as a CI check and close
or merge PR369 only by Owner approval; treat separate BM2 support/process and
mass concerns as an independent investigation, not silent PR scope expansion.
