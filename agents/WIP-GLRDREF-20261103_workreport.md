# GLRD reference-resolution fix — recovery report (WIP-GLRDREF-20261103)

## Mission / engineering classification
ENGINEERING_CRITICAL. Reproduce staged-JSON-to-enriched-XML baseline from `GLRD-1000-PSI-02.xml` and `STF_2026Nov03-0839_managed_stage.json`, correct false topology-reference diagnostics, and compare pre/post enriched XML. Do not change source XML, topology, node geometry, engineering fields, line-list data, or the writer's output selection.

## Source and custody
- Base main SHA: `3377b7f4baeeee5851e72dcc414d6c4a93f5a933`
- WIP branch: `fix/stagedjson-glrd-reference-targets-20261103`
- Source XML: `Benchmarks/XML-CII-2019/revamped/GLRD-1000-PSI-02.xml`
- StagedJSON: `Benchmarks/XML-CII-2019/revamped/STF_2026Nov03-0839_managed_stage.json`
- Line-list: `Benchmarks/XML-CII-2019/revamped/STD-00-PX-4338-01001-0001-02.xlsx` (not consumed by the config={} producer run; binary cannot be read through the current connector)
- Baseline output: `ValidationRecords/GLRD-1000-PSI-02-20261103/enriched_baseline.xml`
- After output: `ValidationRecords/GLRD-1000-PSI-02-20261103/enriched_after.xml`
- Source backup: `ValidationRecords/GLRD-1000-PSI-02-20261103/sj-psi-sequence-planner.before.js`

## Reproduction / independent authority
Production modules were fetched from live GitHub, their ESM imports linked for execution in a V8 JavaScript harness, and run on the full supplied staged JSON. A fixed clock of `2026-11-03T08:13:00Z` was used to compare serialized XML byte-for-byte. This is a full-data runtime execution, but NOT a native Node CLI test, browser E2E, or line-list-calibrated run.

Before: 86 original source branches; 30 canonical branches; 893 surviving records; 1156 XML nodes; 79 unresolved-reference warnings; 480 audit missing-field findings; writer/shadow validations PASS.
After: same 86/30/893/1156; 0 unresolved-reference warnings; 480 audit missing-field findings; writer/shadow validations PASS. XML byte comparison: IDENTICAL (754833 characters, zero changed lines).
Cross-check: all 79 `HREF`/`TREF` targets flagged by the old branch-only resolver are present as `REF` values in staged JSON and as `ComponentRefNo` in the supplied PSI XML.

The source XML has 1224 nodes (30 source branch blocks) and the output has 1156 nodes (30 canonical grouped branches). This is NOT a valid direct parity comparison because the PSI and generated writers have different component and endpoint encoding. No claim of source-node numerical parity is made.

## Implementation / invariant
- `tabs/stagedjson-to-enrichxml/sj-psi-sequence-planner.js`
- `docs/tabs/stagedjson-to-enrichxml/sj-psi-sequence-planner.js` (served mirror kept identical)
- `tests/stagedjson-glrd-component-ref-resolution.test.mjs` (full GLRD, external unknown, baseline output)
The diagnostic resolver accepts a reference when it points to a source BRANCH name or a source component `REF`/`COMPRE`. Truly missing refs still warn. No XML writer or resolver-value changes.

## Validation
- PASS: full supplied staged JSON original-vs-patched JS producer execution, 79 -> 0 false warnings.
- PASS: original and patched XML byte-by-byte equality; zero new output deltas.
- PASS: source PSI XML cross-check for all 79 references.
- PASS: synthetic missing-target case continues to warn.
- PASS: sequence validation and shadow parity validation on the real full-data run.
- NOT_RUN: native `node --test` in a checkout, GitHub CI, browser worker/E2E.
- NOT_RUN: Excel line-list and master-data enforcement; `config={}` was used, as in baseline bench tests.
- Unresolved/pre-existing: 480 missing-field audit findings. No assertion that they are fixed or safe for final CII export.

## Coordination / risks / next action
Preflight GitHub search found no open PR matching stagedjson or enrichxml; active-source overlap cannot be universally ruled out.
Do not merge without owner approval. Preserve original baseline, original planner backup, and the regression test.
EXACT_NEXT_ACTION: run `node --test tests/stagedjson-glrd-component-ref-resolution.test.mjs tests/stagedjson-psi-sequence-planner.test.mjs tests/stagedjson-enriched-xml-topology.test.mjs tests/stagedjson-enriched-xml-1885-benchmark.test.mjs` on the exact PR commit, then inspect CI results and independently review the 480 missing engineering-field findings.
