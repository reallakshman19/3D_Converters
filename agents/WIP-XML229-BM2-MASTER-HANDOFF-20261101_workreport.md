# WIP XML229 BM2 master and JSON handoff — 2026-11-01
CLASSIFICATION: ENGINEERING_CRITICAL
STATUS: READ_ONLY TAKEOVER QUALIFIED; scoped implementation authorized by Owner request "ok proceed fix" at 09:51 UTC, with no merge/release authority.
BASE_MAIN_SHA: f69188fd2510c31efbc370fab810d22f9f3df9ac
BRANCH: fix/xml229-bm2-master-source-handoff-20261101
PREDECESSOR: merged PR #370 (DTXR position-first) https://github.com/reallakshman19/3D_Converters/pull/370
RECOVERY: preserve root and served mirror pre-edit backups; do not publish private Owner artifacts or manufacture mass/support facts.
CONFLICTS: open #329 and #312 concern engine/mass authority; this PR will not edit native writer, Final packet, mass binding, Worker orchestration, Preview UI, or canonical masters. Changes confined to native pre-Final XML enrichment + narrow tests and exact docs mirror.

## Owner's real output (independent source)
Private upload: GLRD-1000-PI-01 - BM2_enriched.xml: 31 branches, 816 nodes, every WallThickness=0. Node3430 DTXR_POS=REST and DTXR_PS=REST, no real GUIDE/LINE STOP/gap. Source node3430 XYZ 123504.12 114999.98 101330.73.
Private upload: xml229-verified-native (10).cii: 785 ELEMENTS each 0.01mm wall fallback; 139 RIGID records including 5950->5960 pointer84=0 N. All T1/T2/T3, P1, fluid density observed 0. Output weight 5960 0kg agrees CII 0 N. No accepted Final positive mass demonstrated.
Private audit: xml-cii-propagation-audit-1793524954605.json: 93 missing temp rows, 31 zero-density "propagated", 0 Weight Match rows; cannot prove source-present P/T/weight without O1, approved line rows and Final packet.
Authority: 93833 spec master `docs/Masters/SpecwisePipingClass/93833.json`, row 10558, size 6, convertedBore 150, wall 7.112, material DSS, rating900, corrosion0. Public BM2 branch 0 original OD=168.3 and wall=0. LL_BM2 workbook pinned native test `tests/test_xml229_bm2_linelist_unique_alias.py` proves source C9=4110001, K9=11000, Y9=120, Z9=-50, M9->CIIdensity109.85 when mapped data are provided. Real artifact has none: input custody/projection is unverified.

## Appendix A takeover qualification
A1 Production Trace 20/20: UI enrichSupportConfigJson -> engine.js runEnrichedXml/runtime_custody.py -> patched._maybe_enrich_from_staged_json -> patched._apply_process_data_to_xml -> native model -> CII ELEMENTS.
A2 Failure Isolation 20/20: supported pclass rows enter support config but native _apply_process_data_to_xml writes no WallThickness; source zero -> CII fallback 0.01mm, confirmed on private actual output. _maybe_enrich_from_staged_json drops entire staged JSON reapply when XML contains any DTXR annotations; uploaded stale REST proves annotations present but source JSON not available. Line-list Python source-bound positive test already passes, so actual missing master/mapping cannot be fabricated.
A3 Authority/Invariants 20/20: exact class + node OD resolved DN via existing addon.od_to_dn; require unique consistent source master rows, avoid guess when missing/ambiguous. Never touch position/endpoint/ref/topology; Final kg lineage and full RIGID output proof untouched. No conversion of material strings to unverified numeric CII material codes. No guessed support gaps or weight.
A4 Independent Validation 20/20: real BM2 first branch + pinned public class row 10558 -> 7.112mm expected; existing real workbook test K9/Y9/Z9; native emitted CII element row2 wall; negative conflicting candidate test and explicit wall preservation; stale-REST JSON refresh synthetic source test. Private artifact baseline alone is failure evidence, not an acceptance oracle for approved master/Final.
A5 Minimal Patch 20/20: patch converters/scripts/xml_to_cii2019_patched.py and docs byte-identical; preserve explicit user-approved line field maps; source-master uniqueness and wall application pre-Final. Add one regression test and targeted stale-DTXR test; no release/mass authority changes.
QUALIFICATION_SCORE: 100/100, minimum 20/20; grounded in current source, test, master, live PR/branch and real Owner output.
TAKEOVER_DECISION: SALVAGE_PARTIAL — previous PS position patch stays; extend with source-handoff fix and independent tests.
SOURCE OF TRUTH: current repo main base and Owner's uploaded artifacts; inspect actual CI, not just source.

## Current validation
NOT_RUN: new regression and actual end-to-end live Worker run.
PASS SOURCE: pinned `tests/test_xml229_bm2_linelist_unique_alias.py` already asserts matched-row CII 11000 / 120 / -50 / density 109.85 in a non-native synthetic file.
FAIL PRODUCTION: Owner real BM2 emitted values remain missing.
RELEASE: HELD. No merge permission.
EXACT_NEXT_ACTION: edit served+root `xml_to_cii2019_patched.py` after backups, add source-grounded native enrichment regression, run CI; if proof fails, revert/repair without masking source authority. Ask Owner for O1/Final packet to resolve actual GUIDE+LINE STOP/gap and positive valve mass.
