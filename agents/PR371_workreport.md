# PR371 Work Report — BM2 Native Master/JSON Handoff
STATUS: DRAFT / NOT MERGED / NO RELEASE AUTHORITY
CLASSIFICATION: ENGINEERING_CRITICAL
HEAD TESTED: 75a2c0d78b0c70a9bc0e92e211ac116bb2bca8db
BASE MAIN AT FORK: f69188fd2510c31efbc370fab810d22f9f3df9ac
PR: https://github.com/reallakshman19/3D_Converters/pull/371
PREDECESSOR: merged PR370 position-first DTXR; real Owner artifact disproved full production propagation.
WIP: agents/WIP-XML229-BM2-MASTER-HANDOFF-20261101_workreport.md (Appendix A 100/100, source chain, private artifact failure facts).
DECISION: SALVAGE_PARTIAL — preserve guards and targeted positive source-bound fixes; do not claim four-stage end-to-end working.
PR_OVERLAP: open PRs #329, #312, #315 and master/weight PRs; no change to those modules.

## Failure baseline (read-only, private files not committed)
Owner supplied real enriched XML, downloaded CII and JSON audit. Public source first BM2 node20 OD168.3 wall0, browser enriched node20 wall0, CII row2 0.01mm. All enriched nodes 816 wall0, all CII 785 elements wall fallback 0.01mm. Real Owner support node3430 REST/REST rather than Guide+LineStop, no CMPSUPGAP; source O1 unavailable. Valve node5960 weight0 and actual element5950→5960 RIGID record84 force0, so writer did not lose a positive bound mass. Audit 93 missing T1/T2/T3 rows, 31 density zeros mislabeled "propagated", no Weight Match rows. Real approved P1/T/Final decisions cannot be reconstructed from this data.

## Diff ledger
- converters/scripts/xml_to_cii2019_patched.py and docs/converters/scripts/xml_to_cii2019_patched.py: exact selected-master `Piping Class` + `convertedBore` -> positive wall when source wall absent; OD->DN by existing pinned master addon table; original positive wall preserved, conflicting rows and impossible thickness fail closed. No class/material string forced into unapproved CII numeric MaterialNumber; no writer or mass mutation.
- converters/scripts/xml_to_cii2019_master_addon.py and docs/converters/scripts/xml_to_cii2019_master_addon.py: matched O1 POSI support may evict stale `DTXR_PS` when source owns node by uniquely verified position and no PS-only source claim; do not remove explicit XML Restraint.
- converters/scripts/xml_to_cii2019_patched.py: fresh O1 staged JSON no longer skipped due to stale pre-existing DTXR annotation elsewhere. Preserve authoritative line-list fieldMap instead of silently overriding with semantic heuristic.
- tests/xml229-native-substage-diagnostic.test.py: added 4 source-bound tests (now 12) using real BM2 and pinned 93833 spec row10558, test actual output CII wall 7.112, 2in source 3.9116, negative duplicate master and explicit wall preservation, synthetic source O1 stale REST+position guard and synthetically generated GUIDE/LINE STOP/15mm gap, explicit line-map guard.
- .backups/20261101-xml229-bm2-handoff-*-root.bak and matching docs/test backups preserve original bytes.
- agents/WIP-XML229-BM2-MASTER-HANDOFF-20261101_workreport.md and this report track source, limitations, qualification and recovery.
ROOT/SERVED PARITY: PASS for patched.py and master_addon.py. NO workflow, engine, UI, Writer, binder, Final, master source or topology modifications.

## CI independent observations
RUN 41295505846: https://github.com/reallakshman19/3D_Converters/actions/runs/41295505846
PASS: native-python-source-transfer job124815411728, Python tests:
- xml229-native-substage-diagnostic.test.py 12/12
- xml229-native-owner-cardinality.test.py 3/3
- xml229-native-final-mass-consumption.test.py 24/24
- xml229-instrument-source-revision.test.py 9/9
RUN 41295505628: BM2 unique line-list native test SUCCESS, pinned workbook line C9=4110001, K9=11000, Y9=120, Z9=-50 and CII density 109.85 where source-bound row supplied.
FAIL existing: independent-js-cii-mass-check (Node22/Node24) has 3 JS source-shape assertions: /useRestraintTypeBasedOnJson:false/, shared Pyodide reset, failure-phase exposure; unrelated to changed Python files. Do not label overall CI green.
FIRST TEST RUN at head d70d3f failed due to erroneous JavaScript string replacement interpolation corrupting Python test text at section token '#$'. Repaired at head 75a2c0; independent native tests now PASS. Preserve failed run in record.
PRIVATE OWNER ACTUAL NEW OUTPUT: NOT_RUN. Browser new conversion/Final packet/O1 missing.
VALIDATION ORACLE: actual class source master value independently fixed at 7.112mm; existing CII writer output parsed in test; test synthetic JSON 15mm is not Owner support data; Owner's actual prior CII remains FAIL.

## Hard Holds / authority
1. Actual support at node3430 only REST in uploaded enriched output; exact O1 JSON with component POSI and CMPSUPGAP required to prove Guide+LineStop. New code can now refresh stale DTXR but cannot infer missing descriptions or gap.
2. Actual valve physical source occurrence 17/24 native output0kg: accepted positive Final owner packet absent. Do not force weight, split or bypass native mass guard.
3. Line-list Python source-bound positive test proves code path when masterRows/fieldMap supplied; Owner current UI master hydration and approved mapping unavailable. Do not fill missing real T/P/Density from defaults.
4. Material number/code unresolved 0; material name and rating 93833/900 alone do not authorize numeric CII material code.
5. Engineering output has not been independently reconciled against fresh source-bound production Run; NO release or merge authority.

## Recovery
EXACT_NEXT_ACTION: Owner/new agent obtain exact O1 Worker source JSON, immutable accepted Final packet, active Run supportConfigJson mastered rows/fieldMap and fresh enriched/CII output; independently check node3430 DTXR/gap; valve owner 17/24 kg; first branch LL C9/K9/Y9/Z9/M9; class93833 DN150 wall7.112; compare CII/lineage. Keep PR draft, do not merge until Owner authorizes. Review active PR overlaps and current main SHA.
