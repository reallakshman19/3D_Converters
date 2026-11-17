# WIP-uxml-route-20261117 — step 10 "UXML route" switch (UXML plan step 5)

## Mission and scope
Owner, 17 Nov 2026: "Start step 5" of the UXML revamp plan: a step-10 switch "UXML route", **off by default**, that the Owner tests live.
With the switch on, the CII engine gets the XML from the UXML supports stage (XML_Compare_Utilities `uxml/v2`, draft PR 282),
instead of today's enrichment chain. Today's route is unchanged with the switch off. Mode B (several staged JSON files) always uses today's route.
Classification: ENGINEERING_CRITICAL (XML/CII engineering semantics), behind an opt-in switch. The Owner approved this runtime switch (plan step 5).

## Implementation
- `vendor/uxml-v2/` (81 files) + `PIN.json`: the import closure of `supports/SupportsStage.js`, copied by `scripts/vendor-uxml-v2.mjs`
  from XML_Compare_Utilities commit `cfea5beb` (PR 282 head), SHA-256 per file.
- `v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js`: `enrichStandaloneXmlForUxmlRoute` runs today's enricher first (holds, journal,
  parity rows, warnings unchanged), then the stage from today's branch-pass input (XML after the gasket drop, job config, today's material map rows).
  Today's parity check (`createStandaloneRunParityEvidence` with today's expected entries) must pass on the stage XML, or the Run is held.
  The log compares the two XMLs (every branch and node value, restraints in order).
- `xml-cii-uxml-route-compare.js`: that comparison. `ui-adapted/xml-cii-uxml-route-switch.js`: the step-10 checkbox (localStorage `xmlCii.uxmlRoute`).
- Edited: `xml-cii-workflow-api-atta-default.js` (picks the enricher by the switch), `xml-cii-adapted-events-mode-a-consolidated-review-v2.js`
  (adds the checkbox under the Run buttons), `enrichment-run-parity.js` (exports `dropGasketNodesFromXmlText`, no behaviour change).

## Validation
| Check | Status | Observation |
|---|---|---|
| Pin, closure, switch default off (`tests/xml-cii-uxml-route.test.mjs`) | PASS | 3/3, node --test |
| Today vs UXML route on the 7 UXML benchmarks (G30, G30-NOJSON, G30-CUSTOM, RMS-BLOW-1, ACTIVE-AUDIT, BM2, EF05), Node + jsdom | PASS | parity PASS 7/7; only `ElementLengthMm` differs (10/10/10/31/0/133/184 nodes; Owner 16 Nov: lengths from the final numbering); restraints differ 0 |
| CII from both XMLs, `xml_to_cii2019_runtime_custody.py` with the app's arguments | PASS | byte-equal 7/7 (178 to 15,741 lines) |
| Browser (local server), full `runXmlCii2019Workflow` on EF-05, switch off vs on | PASS | CII SHA-256 equal, 15,742 lines; log lines shown |
| Checkbox in step 10, remembered on tick | PASS | browser |
| Existing `xml-cii-standalone*` + `xml-cii-workflow*` tests | same as main | 6 failures on main 9a50f8bd and on this branch, same 6 |
| Owner live test | NOT_RUN | after merge (Pages) or on a local server |

## Risks and decisions
- The vendored stage pins PR 282's head; if PR 282 changes before merge, re-run `node scripts/vendor-uxml-v2.mjs <XCU checkout>`.
- Today's route still runs first, so the switch-on Run takes a few seconds longer (EF-05: stage ~1.2 s in the browser).
- The stage works on the PSI116 XML as plain data; it is not yet a UXML-document stage with a revision delta (later plan step).

## EXACT_NEXT_ACTION
Owner: merge on their word; then tick "UXML route (test)" in step 10 and Run a model; the log shows the comparison with today's route.
