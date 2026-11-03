# PR404 — GLRD staged-json component-target diagnostics fix
**STATE:** DRAFT; DO NOT MERGE. **ENGINEERING_CRITICAL**. **Mission:** capture pre-fix XML, repair false topology reference warnings, recreate XML, show exact diff and run regression checks.

## Ground truth / source
- Base main at starting point: `3377b7f4baeeee5851e72dcc414d6c4a93f5a933`.
- Branch: `fix/stagedjson-glrd-reference-targets-20261103`; PR: https://github.com/reallakshman19/3D_Converters/pull/404
- Reference PSI XML: `Benchmarks/XML-CII-2019/revamped/GLRD-1000-PSI-02.xml`; staged JSON: `Benchmarks/XML-CII-2019/revamped/STF_2026Nov03-0839_managed_stage.json`.
- Excel line list supplied but binary could not be decoded via available GitHub connector; master/Excel policy *not exercised* in this baseline.
- Pre-fix artifact: `ValidationRecords/GLRD-1000-PSI-02-20261103/enriched_baseline.xml` created **before** modifying code; the planner before-image is `.../sj-psi-sequence-planner.before.js`.
- Post-fix artifact: `ValidationRecords/GLRD-1000-PSI-02-20261103/enriched_after.xml`; comparison: `.../enriched_xml_diff.txt`.

## A1–A5 implementation qualification / proof
- **A1 Production trace:** `sj-enrichment-engine.js` → `sj-parser.js` → `sj-psi-sequence-planner.js` reference warnings → writer output. The false positive comes from `knownNames` containing source BRANCH names but not component `REF`.
- **A2 Isolation:** exactly 79 original HREF/TREF warnings; all 79 targets occur as JSON component REF and independent PSI XML ComponentRefNo. None is an absent branch by design.
- **A3 Protected authority:** preserve original tree, source endpoints, geometry, numerical enrichment, grouping, node cardinality and XML writer. Keep missing-target warnings fail-visible.
- **A4 Independent validation:** linked original production JS modules executed against complete 1.8 MB managed JSON (V8 harness, fixed clock 2026-11-03T08:13:00Z), before and after; 79→0 warnings, baseline/after XML identical 754833 characters, 0 line differences. Synthetic missing target still generates warning. Other sequence and shadow-parity flags OK. Newly added Node test is *not yet independently executed* by native Node CI.
- **A5 Minimal patch:** read-only source-component REF/COMPRE membership check added to planner; mirrored to deployed docs file; targeted test added. No writer or source-data mutations.

## Real fixture metrics (before / after)
| Check | Before | After | Status |
|---|---|---|---|
| Unresolved reference warnings | 79 | 0 | PASS targeted |
| JSON source branch count | 86 | 86 | PASS |
| Canonical grouped branch count | 30 | 30 | PASS |
| Emitted XML node count | 1156 | 1156 | PASS |
| Enrichment record count | 893 | 893 | PASS |
| Audit missing-field findings | 480 | 480 | UNCHANGED, not fixed |
| XML byte changes | — | 0 | PASS |
| Sequence / shadow writer validations | OK | OK | PASS |

Source PSI XML has 1224 nodes; the enriched XML has 1156. Node count is NOT a direct equivalence oracle across the original PSI representation and grouped enriched writer.

## CI at observed exact PR head f9368099a53ee1d0f6b50a32499f54317754324a
28 workflows completed: **23 SUCCESS, 5 FAILURE**. This is **NOT a fully green PR**. Inspected failing logs:
1. Issue 884 qualification-only scope gate rejects non-884 changed paths.
2. Issue 835 C05.1 evidence-only scope gate rejects the real scoped patch/evidence files.
3. Issue 781 P0 XML-CII fails a preview renderer string assertion, and adjacent-baseline classification log is missing.
4. Issue 781 Worker Weight API browser-worker-scale times out in `tests/browser/xml-cii-weight-rating-input-e2e.mjs`.
5. Issue 841 C05 final qualification also includes that browser timeout and issue-781 P0 preview assertion.
The failures concern unrelated legacy/specialized gates or areas outside modified planner, but baseline/head causality has NOT been fully established. Do not label all 5 as definitively pre-existing.
Full native focused test command remains NOT_RUN:
`node --test tests/stagedjson-glrd-component-ref-resolution.test.mjs tests/stagedjson-psi-sequence-planner.test.mjs tests/stagedjson-enriched-xml-topology.test.mjs tests/stagedjson-enriched-xml-1885-benchmark.test.mjs`

## File ledger
- modified: `tabs/stagedjson-to-enrichxml/sj-psi-sequence-planner.js`
- modified: `docs/tabs/stagedjson-to-enrichxml/sj-psi-sequence-planner.js`
- added: `tests/stagedjson-glrd-component-ref-resolution.test.mjs`
- added: `ValidationRecords/GLRD-1000-PSI-02-20261103/*` baseline, after, diff, original backup
- previous WIP: `agents/WIP-GLRDREF-20261103_workreport.md`
- this report: `agents/PR404_workreport.md`
No line-list or master data modifications.

## Decision / risks / exact next action
**Decision:** keep DRAFT with no merge. **Coordination:** no stagedjson/enrichxml open PR found in initial targeted search; full multiagent overlap remains unproven. **Highest risk:** 480 unresolved audit fields and missing native focused-suite / Excel qualification; CI is not fully green.
**EXACT_NEXT_ACTION:** checkout PR #404 head; run the focused Node command above, independently examine audit missing-field findings against the supplied Excel/master authority, and compare failing CI gates on main/baseline to distinguish pre-existing failures from regressions. Obtain owner merge authorization only after independent engineering qualification.
