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

## 2026-11-01 10:12 Owner extended scope: line list, Weight and Material/Rating
Owner explicitly requested verify, fix and test these remaining three production failures.
Last tested code SHA 1af5f8cd06ecdff7926b6c42678c0e95ac69d2a7.
Current latest scoped code SHA b7d9f512196eb316387786141cc38006c8b9ecbd
(the unrelated-row master eligibility guard added after the tested SHA).
Appendix A qualification remains within same native-source handoff/Final mass-ownership authority:
- A1 trace: `buildXmlCiiWorkflowJobFromUiState` / `enrichSupportConfigJson` → passed `masterRows`/O1/Final packet → Pyodide `runtime_custody.py` → patched XML enrichment → model CII material MISCEL_1 and RIGID.
- A2 isolation: Owner's real 785 CII RRMAT/material IDs are ALL 1 (native fallback, not ASTM material resolution). Real 785 temp/pressure/density fields 0. Real Final valve 5950→5960 pointer 84 0N corresponds enriched Weight=0kg, so weight-loss claim is NOT located at writer. Original Final acceptance and active master config unavailable.
- A3 invariants: use only approved numeric material-map IDs from exact name-matched selected map; class material name/rating are not CII material IDs. DO NOT silently equate differing S31803/S32803 despite previous JavaScript alias; prevent reclassifying VALV/FLAN/ANCI as pipe material. All positive kg only from accepted Final immutable packet. Never update actual Owner mass or engineering release.
- A4 independent source oracles: actual BM2 spec 93833 convertedBore150 wall7.112 Material_Name ASTM A790 UNS S31803 Rating900; exact configured material map entry for test is SYNTHETIC 741 and passes to actual CII MISCEL_1 first ID 741. A790-S32803 code338 remains unmatched by strict native exact source mapping, never treated as automatic engineering equivalence. Real-geometry valve positions/ref tested with SYNTHETIC Final 2.5kg and proves writer emits pointer + 25N. Pinned LL_BM2 workbook C9=4110001 K9=11000 Y9=120 Z9=-50; native BM2 LL CI passes given configured rows.
- A5 scoped patch and verification: source + docs `xml_to_cii2019_patched.py` add material/rating source metadata and exact map numeric ID pre-parse; selected class/bore metadata conflicts and selected material name/code conflicts fail closed; unrelated full-master rows ignored. No class rating field exists in native 2019 CII per inspected writer; XML PipingClassRating=900 is provenance only, not a claimed CII rating serialization. Added three guarded tests to CI-invoked substage suite: real source class meta+exact synthetic material code CII slot, negative ambiguous/alias, and real BM2 valve ref/coordinates with synthetic accepted positive kg to RIGID. Source/served copies remain byte-identical.
- Test at 1af5f8: native Python CI [41296906511](https://github.com/reallakshman19/3D_Converters/actions/runs/41296906511) source-transfer job124819556316 **PASS 15/15**, existing native Final 24/24 PASS; separately BM2 unique line list workflow PASS. JS mass-test jobs fail same 3 pre-existing source-shape assertions, not green.
- Latest b7d9f5 source-scoping CI [41297114117](https://github.com/reallakshman19/3D_Converters/actions/runs/41297114117) **QUEUED**, not labeled PASS; source scoping now ignores invalid or conflicting unrelated rows in the full ~10k piping class master. A requested full-master direct parse was NOT COMPLETED because connector content was truncated; new regression validates unrelated row conflict isolation synthetically.
- User uploaded real XML/CII/audit remain PRE-FIX FAIL, cannot replace them with a claimed production-output PASS.
CURRENT ACTUAL END-TO-END STATUS: NOT PROVEN. Weight accepted Final/active original O1 missing. No real verified CII from current browser and no numeric ID for 93833 without a direct exact approved map row. UI master custody for live Master→native execution unverified; line-list positive workbook test is conditional on actual selected config.
AUTHORITY: draft PR371, no merge/deployment/release permission. Directly review the exact Owner Final packet and live supportConfigJson/masters before completing the other two handoffs.
EXACT_NEXT_ACTION: Recheck latest GitHub Actions for code b7d9f5; if native tests pass, retain draft; compare actual active Worker master mapping, original Final occurrence17/24 effectiveKg, selected material-map source row against rendered CII. Never synthesize accepted kg or alias-grade material ID.

## 2026-11-01 10:24 — latest scoped source/master CI completed
TESTED_CODE_HEAD: b7d9f512196eb316387786141cc38006c8b9ecbd
CI: https://github.com/reallakshman19/3D_Converters/actions/runs/41297114117
PASS: native-python-source-transfer job 124820155015; 15/15 new/old substage tests, 3/3 owner tests, 24/24 native Final mass-consumption tests, 9/9 instrument tests. Full source-and-docs `patched.py` byte parity inspected PASS.
PASS: XML229 BM2 Unique Line List Native on equivalent code head https://github.com/reallakshman19/3D_Converters/actions/runs/41297114091 (the selected source row case). SOURCE-BOUND, NOT A LIVE WORKER RECEIPT.
FAIL: JavaScript independent CII checks Node22/Node24 still fail three existing source-string shape assertions, unrelated to native Python source tests. Overall status NON-GREEN.
SAFETY: real `MISCEL_1` from Owner uploaded CII contains 785 occurrences of ID 1, the writer's default; this is NOT accepted ASTM A790 S31803 identity. Strict exact configured mapping is required, otherwise material ID remains unresolved. The selected spec's class900 is provenance in enriched XML; native CII has no generic rating field per writer inspection.
NEW_FINAL_STATUS: draft unmerged. Implemented code tests PASS; actual Owner source/O1/approved numeric material-map/Final kg not supplied for production acceptance.
EXACT_NEXT_ACTION: obtain source-approved numeric material row (exact S31803 match, not alias), current active Worker Master state and immutable Final packet; run fresh XML→CII and independently reconcile all 785 material codes, P/T/density, valve 5950→5960 and node3430.

## 2026-11-01 10:36+ Owner explicit next stage — Material ID / valve zero / rating
SCOPE AUTHORITY: Owner explicitly asked to fix VALV5960 0kg/RIGID0N and material code/rating; explicitly directed to work on PR371 only. PR372 open and edits exact native files, so NO merge/rebase/reconcile without review. PR312/329/315 cover overlapping runtime/UI/Weight sources and are not edited.
LIVE BASE: main f69188fd2510c31efbc370fab810d22f9f3df9ac, PR371 prior head 0012c82f6f8538c43f199b0c3449354574ca03f4. Work on existing PR branch only.
ROOT CAUSE (SOURCE): binder `bind_native_final_xml()` gets `item.effectiveKg` from immutable Final packet and places it at lineage-matched node before writer. `verify_emitted_native_masses()` independently checks exact RIGID. Real Owner enriched node5960 is Weight0kg and 5950->5960 RIGID84 force0N; this is consistent upstream zero, not a proven native writer bug. Physical 17/24 accepted Final packet/Weight Match canonical source missing. Cannot infer positive mass, adjust source weight, or change binder. Existing test `test_valve_5950_5960_positive_final_mass_can_be_consumed_when_accepted` uses SYNTHETIC 2.5kg -> actual emitted 25N, not Owner acceptance.
MATERIAL SOURCE: existing material code path only read selected `material.mapRows`; preview policy docs `docs/xml-cii/material-code-fuzzy-authority.md` declare user-pinned Material-identity override as primary. CII `MISCEL_1` stores numeric material IDs with fallback1; class master 93833 source lists ASTM A790 UNS S31803, rating900. Bundled PCF_MAT_MAP contains `A790-S32803` code338, not source-exact S31803; do not silently alias. CII has no generic piping-class rating slot; enriched XML PipingClassRating=900 is only grounded provenance.
NEW IMPLEMENTATION: `xml_to_cii2019_patched.py` and docs mirror add `_material_scoped_pin_ids`, resolving only explicit scoped override keys `Material`, `MAT:<full name>` or `MAT:A790-S31803` (exact spec+grade). Class-, line- or branch-keyed saved overrides cannot become a material pin; positive integer-only, identity and conflicting selected map/pin fail-closed. Selected Material map headers `Material Name`/`Material Code`/MaterialCode now supported.
SECOND FIX: `_process_material_for_line` reads only uniquely mapped line-list Material from exact/unique line key; a nonblank Process Material precedes class-sourced material when selecting native numeric ID, even if process material remains unresolved. Conflicting exact line rows -> `XML229_LINE_MATERIAL_AMBIGUOUS`. No fallback from unresolved process material to class material ID. Preserve original positive XML node MaterialCode, class rating provenance, CII writer unchanged.
TESTS ADDED: 4 new source-constrained tests, now 19 total substage tests (pending independent CI): synthetic user-selected Material-scoped code741 -> emitted MISCEL_1 and class rating provenance; fail conflicting class-scoped/unapproved alias/invalid/multiple pinned codes; exact line-list process material A106-B & map code106 wins over class DSS source741 in emitted CII; missing map for a nonblank process material never copies class ID, conflicting line rows fail. These values are SYNTHETIC counterexamples, never actual Owner mapping.
ROOT/DOCS BACKUPS: `.backups/20261101-xml229-material-pin-*-before.bak` and `.backups/20261101-xml229-process-material-precedence-*.bak` before changes; source/served pairs must remain identical.
CI AT LATEST CODE HEAD: b2b14d344403fb865ec1b783df97ad7e1820d5d1 — GitHub Native Final workflow RUN 41298793204 and BM2 Unique Line List 41298793181 at last check QUEUED, hence NOT_RUN (not PASS). Earlier head b7d9f5 independent Python native 15/15 and Final24/24 PASSED; separate old JS string assertions failed. This new patch must pass independently before any code claim.
NO NUMERIC OR RELEASE AUTHORITY: user did not provide actual Final packet17/24, active supportConfigJson approved material pin, or current Worker O1. Cannot fix old real zero by inventing mass. Neither CII class rating nor code338 is asserted approved. Draft PR only, NO MERGE.
EXACT_NEXT_ACTION: inspect GitHub Actions run 41298793204 native Python stage and 41298793181 BM2 LL. Correct tests if failing; run source/served parity. If still no Owner Final/master, keep mass and grade release HOLD and request session-bound accepted packet + user-approved numeric code after finishing independent CI. 
