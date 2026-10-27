# XML229 TopoFix exact-source digest correction

REPORT_BASIS_HEAD: 30e555e3d39db57b6b07e3720b54751f8ab73238
WORK_INTENT: IMPLEMENT / NEW_PR_REQUIRED / WRITE_ALLOWED / ENGINEERING_CRITICAL
Actor: Oracle standalone UNKNOWN; author, not Independent Reviewer6adef8f2.
Owner steering: CII downloaded but topology review reports TOPOFIX_PLAN_SOURCE_DRIFT; continue the authorized production repair.

## Current truth and failure isolation

PR344 was merged externally at30e555e3, whose tree is exactly the prior validated76d5dd9e tree a8d637b03be74f5004ece8bc33f1264810ac242e. Main push checks10/10 pass. Its old workreport claiming Draft/unmerged is stale history. New defect has its own isolated worktree/PR. xml229-topology-source-bytes-fix is a partial materialization copied from the matching main tree; never publish a reconstructed full tree from it.

Confirmed reproduction: Python read_psi116_xml(Path) calls read_text(utf8), which translates CRLF/loneCR to LF. It therefore hashes different source text from the exact browser/engine input, while the original file remains unchanged. Passing the same string in memory produces the correct original hash. The JS strict plan/source guard correctly rejects that different digest. Do not remove/normalize that guard.

## Scope, hypothesis and protected authority

Preserve original UTF-8 text bytes when the topology parser opens a file. Keep geometry parsing/actions, original occurrence identity, Final acceptance, Worker handoff, numerical mass/owner rules, native output reconciliation and release checks unchanged. Test LF/CRLF/loneCR/mixed/newline/Unicode/boundary tampering, Python replay, actual WASM plan/lineage/handoff and real root/docs browser journey. File download alone does not establish that TopoFix succeeded or which native route was used; current private output has not been inspected.

Falsifier: exact parser/plan/lineage/handoff SHA does not match the input UTF-8 SHA after the correction, or a truly modified source is accepted. No byte-equivalence fallback or tolerance is allowed.

## Grounding and coordination

All88 live open PR changed-file lists inspected: no exact intended parser/regression overlap and no psi116_topology_resolver domain overlap. #329 broad orchestration authority remains separate and its branch is untouched. MASTER_INDEX at main404. 24 relevant claim files inspected. The only topology claims are Oracle’s merged PR343/344 records; their ACTIVE/Draft labels are stale against live closed/merged GitHub. No matching active parser/test claim. Scope is SAFE for these exact paths; broad orchestration custody remains shared. No other agent or message launched.

## Validation state

Prepatch CRLF reproduction: FAIL as expected; path SHA3c006e... differs from exact source SHA6b8b4147..., in-memory SHA6b8b4147.... Original file bytes unchanged. No Owner Final accepted or current private CII certified.
Postpatch Python/WASM/browser: PENDING. Existing PR344 passing LF browser evidence is a baseline, not coverage for this newline defect.

## Continuation

EXACT_NEXT_ACTION: apply the minimal source-preserving read, add raw-byte/path/memory/receipt regressions, exercise the actual controller/engine/L3 and root/docs CRLF browser journey, then publish a new Draft from current main. No merge authorization is assumed. Production first, legacy CI fence maintenance outside scope.

## Implementation and initial validation

Production delta: topology parser now decodes read_bytes() as strict UTF-8, preserving CRLF/loneCR/BOM instead of text-mode newline translation. Root/docs exact mirror. JS plan/source guard and native writer unchanged. No replacement normalized-SHA acceptance path.

New Python path/memory/raw-byte/plan/lineage/replay test: original implementation fails4 newline variants, unchanged LF case passes; patched implementation all8 tests pass (5 encoding/newline subcases plus existing7). No input file bytes modified.
New actual-WASM/controller/L3 matrix before patch reproduces exact TOPOFIX_PLAN_SOURCE_DRIFT for CRLF/loneCR/mixed/BOM+Unicode; LF passes. Postpatch actual WASM/controller/L3 suite7/7 PASS; all5 source forms pass exact hashes; truly modified original source is rejected. Added browser cases retain original LF root/docs and add genuine CRLF root/docs; assert exact original SHA in plan/lineage/handoff, original bytes/text retained through commit, new manual Final0, explicit fresh12.5kg, actual independent native verification/download. Browser execution pending CI.

Changed-file ledger: root/docs converters/psi116_topology_resolver/parser.py; tests/psi116_topofix_transaction.py; tests/xml229-topology-only-engine.test.mjs; tests/xml229-topology-run-journey-browser.mjs; this new report/claims/status. No workflow, geometry/mass policy or release changes. A download reported by the Owner remains USER_SUPPLIED; its current manifest/bytes have not been examined.

Local final focused checks: Python8/8; Output/Run23/23 (includes WASM7/7); existing L3 handoff10/10; public L2 live pre-Final PASS, its native CII NOT_RUN. Node24.22.1/Python3. No Owner model or downloaded CII inspected. Existing Chromium entrypoint now asserts all4 LF/CRLF root/docs outcomes so those cases cannot silently be skipped. No workflow edits. Browser remains NOT_RUN locally; inspect exact-head CI before claiming browserPASS.

Exact changed paths:
- `converters/psi116_topology_resolver/parser.py`
- `docs/converters/psi116_topology_resolver/parser.py`
- `tests/psi116_topofix_transaction.py`
- `tests/xml229-topology-only-engine.test.mjs`
- `tests/xml229-topology-run-journey-browser.mjs`
- `tests/xml229-topofix-fresh-worker-reattach-browser.mjs`
- `agents/WIP-XML229-TOPOLOGY-SOURCE-BYTES-20261027_workreport.md`
- `agents/claims/WIP-XML229-TOPOLOGY-SOURCE-BYTES-20261027.yaml`
- `agents/status/WIP-XML229-TOPOLOGY-SOURCE-BYTES-20261027.yaml`
