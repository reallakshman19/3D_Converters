# PR8 — Dynamic Step 7 support-rule authority

HANDOVER_READINESS: COORDINATION_REQUIRED
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: IMPLEMENT / VALIDATE / OPEN_DRAFT
WORKING_BRANCH: fix/xml229-step7-dynamic-authority-20261115
MAIN_HEAD_LAST_CHECKED: fa54925905c42e2591ca42e5ddafe4ea1f2952aa
CURRENT_STAGE: NATIVE_RULE_PROOF_PASS_PRODUCT_RELEASE_HOLD
APPENDIX_A_STATUS: SELF_ASSESSED_94_OF_100_NOT_INDEPENDENT
MERGE_AUTHORITY: OWNER_ONLY

## Verified execution
- Exact implementation head e38fe95617bdd65852eaef6786ca6b8a171665a6: Run HOLD audit 43704090044, Node22 job 132781315213, 88 pass / 0 fail; Node24 job 132781315441 success. Independent literal expected support kinds, selected IDs, named/comma/wildcard fields, source scopes, priority, disabled rules, conflict refusal, Preview projection and Python table replay.
- Actual full committed GLRD-1000-PSI-02.xml/STF_2026Nov03-0839_managed_stage.json, no fabricated geometry; file identities independently asserted. Native CII block 51 node3760: shipped configuration and mapper-default control and arbitrary-field control all slots 1/2/3 = 14/8/9, respectively. Reconstructed saved GT5 REST rule control has 14/9, no GUI, respecting saved priority. Arbitrary-field rows MDSSUPPFUNC,OWNER equals ST at priority1 and MDSSUPPFUNC regex ^GT$ at priority2 win on actual source occurrences. Original baseline run 43702052838 produced shipped 14/8; saved-rule reconstruction 14 only.
- Whole audit FAILED: default/custom 142/145 records verified, 3 failed, provenance gaps 0; reconstruction 103/106 verified. PS4131 nine duplicated enriched expectations map to three physical native slots, verified but not independent occurrence-to-slot custody proof. Audit/export/physical vertex authority remain outside this classifier PR.
- Chromium job 132781998559 fails before tests (Playwright cannot install Chromium on Ubuntu 26.04). PR6/7 coordinate runner fix. Native Final 43704090015 fails on existing BM2 Node3430 mutation/conflict and diagnostic-code failures; P1 Focused 43704090320 also failed, not release qualified. No CI modifications here.
- Follow-up code head bea345d7a1e24197c27e1ceb7e4c73baf83667fe forwards complete support config into real resolver trace projection and adds original-source resolver-to-Preview test. Exact-head HOLD 43704302002 was running at handover; do not credit prior pass as exact-head pass. Existing trace snapshots may need rebuild when a newly configured field was not captured. Explicit alternate source-schema profiles/legacy no-match fallback not requalified.
- Prior test-authoring syntax defect corrected at e38fe95617bdd65852eaef6786ca6b8a171665a6, no weakened assertion. No actual saved owner PC config, independent reviewer, browser acceptance or merge authorization.

## Next action
Check follow-up exact-head CI and reconcile PR1 (superseded approach), PR4/7 audit and PR6 runner scope with owner. Keep draft; do not merge or activate V2. No change to source files, writer, topology, gap or units. Verify saved PC configuration and complete physical restraint custody separately.

## Original implementation report and backups

# WIP-STEP7-DYNAMIC-20261115 — generic dynamic Step 7 execution, current-main candidate

Criticality ENGINEERING_CRITICAL; owner explicitly requested dynamic Step 7 fix and proof. Base fa54925905c42e2591ca42e5ddafe4ea1f2952aa. PR1 2671f708bcd30013c954cfb5b39201c71d2b9d is 10 behind / 4 ahead, unmergeable. SALVAGE_PARTIAL: carry forward named-field and saved-priority approach, use current root as authority, port into active v045; no force push, no merge. PR4/7 own audit/export and PR6 CI; no changes to their branches. Coordination required; do not merge both mapper drafts.

Appendix A self-assessment (not independent review): A1 19/20: traced Step 7 UI applySupportMappingRowPatch -> migrated config -> parent index / active v045 closure and original source audit; Python table replay; Preview trace field projection. A2 20/20: original-source native baseline exact head e162a282372d02b57f810499cbc833acf84e8044, CI 43702052838 demonstrated shipped 14/8, reconstructed saved GT5 REST 14 only, mapper-generated 14/8/9 at node3760 block51. A3 19/20: retain lower numeric priority, source scope, saved kind/disabled/field, NODETYPE mutation and tie refusal, source-first before generated labels, no new geometry, writer, gap or unit authority; preserve CA100 composite default. A4 18/20: independent literal arbitrary-field and original input hash/CII slot oracles; no exact owner saved config or independent reviewer. A5 18/20: current-main config/evaluator/trace/Preview/parent resolver/Python parity and original-source regression; no workflow edits; no topology/physical-vertex switch. Total 94/100, minimum 18, same author only. Release HOLD.

Implementation: named and wildcard fields consume original scalar source attributes; generated labels fallback-only; default MDS rows visible before Test/Save, priorities 900–930 as existing mapper, saved edits preserved. Preview uses same serialized table; parent resolver consults owner rule before legacy fallback; v045 closure uses original attributes. Python mirrors table decisions. No PS-4131-specific production rules. Existing legacy no-match fallback preserved, not a qualified replacement of all non-governed mapping paths.

Validation NOT_RUN: test implementation next commit; no release claim. Original files backed up by exact original blob references under .backups/WIP-STEP7-DYNAMIC-20261115; local checkout/backup CLI unavailable (container DNS). Actual saved PC config unavailable. Reconstructed GT5 REST must stay REST, not silently overwritten.

Changed-file ledger:
- converters/xml-cii2019-core/support-kind-precedence.js original 3c5ae78a81bb2a0a6cb8344aca92880d01642769
- v045/converters/xml-cii2019-core/support-kind-precedence.js original 026b79eca40cb35e50411b761aa97e191aaab141
- converters/xml-cii2019-core/support-mapping-config.js original defb40e55435ea2e1ad8fd51b96cc4ff9034af51
- v045/converters/xml-cii2019-core/support-mapping-config.js original c24a9d4472e441a842da715d4d339ec0b0f0f320
- tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original 2972da8e2ab08e20060792d05193dad00f0ee2e3
- v045/tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original a687f704fbeedd1deb28f461c17d2302d5f968fd
- tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original a21a52301308e772652e2142190a88ac2f4c2924
- v045/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original 3af0d8f297adc3f6761489d5c21807d08ea76936
- converters/scripts/xml229_support_type_mapper.py original 3d5dcdbe1999eadc2c4e611ef8e446e9862df15b
- converters/xml-cii2019-core/support-mapping-legacy.js original 33b36bd60d0f912cd0405b2cedddf94d606fc9ab
- v045/converters/xml-cii2019-core/support-mapping.js original 39f0180579a14ce5348a19b18fa23d3315836880
- v045/tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js original 6cfbed7cba49e33bb844092e7563eb57063995ac
- docs/converters/xml-cii2019-core/support-kind-precedence.js original 3c5ae78a81bb2a0a6cb8344aca92880d01642769
- docs/converters/xml-cii2019-core/support-mapping-config.js original defb40e55435ea2e1ad8fd51b96cc4ff9034af51
- docs/tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original 2972da8e2ab08e20060792d05193dad00f0ee2e3
- docs/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original a21a52301308e772652e2142190a88ac2f4c2924
- docs/converters/scripts/xml229_support_type_mapper.py original 3d5dcdbe1999eadc2c4e611ef8e446e9862df15b
- docs/converters/xml-cii2019-core/support-mapping-legacy.js original 33b36bd60d0f912cd0405b2cedddf94d606fc9ab

EXACT_NEXT_ACTION: add exact-source native regression and dynamic named/wildcard/priority JS-Python tests; run established CI without workflow edits. Do not merge.

## Executable verification checkpoint
Added tests/xml229-step7-dynamic-authority.test.mjs (literal arbitrary named fields, wildcard, scopes, matches, priority, saved edits, Preview and Python parity); tests/xmlcii-ps4131-dynamic-step7-native.test.mjs (exact committed full PSI-02/STF, four configurations, native slots). Existing HOLD gate imports these plus existing owner precedence and Step78 tests; no workflow edits. No original tests weakened. Prior reproduction test remains unchanged on its separate branch. Actual PC config still unavailable. Exact-head test execution NOT_RUN at commit time.

## Test authoring correction
First candidate CI 43704023957 failed at test module parse (regex replacement expanded a $ sequence in the generated test text). Corrected only the test syntax and duplicated suffix; literal expected engineering results unchanged. Exact-head rerun required. No production claim from the failed run.

## Owner-authorized completion and conditional merge (2026-11-15)
Exact prior head 846191340fd538e5b08e961d82108d9572dec08e Node22/24 PASS on Run HOLD 43704481265, including actual resolver-to-Preview; Node22 89/89. Chromium installation fails before launch on Ubuntu26.04, job 132783401294. Owner requests completion of these two checks then merge PR8. Bounded CI scope extension: reuse the exact PR6 browser-only runner pin (blob 725c25e9c7cd0b45b81461ff0a20154b851de9c9) in the HOLD workflow, leaving Node matrix, Playwright, tests and all engineering authority unchanged. PR6/7 share this workflow; do not merge them independently without reconciliation. Backup preserved as original Git blob a8eb9b1dda3abb7775c36de4ac1531507ff8a7dc under .backups; no local checkout, backup CLI unavailable in this connector-only operation. Recheck exact-head Node/browser gates and distinguish baseline failures from introduced regressions before any merge. Full engineering audit still FAILED; no engineering-release authorization implied by merging code. Exact next action: inspect candidate HOLD jobs and other engineering regressions, then merge only if conditions are met. No independent review yet.
