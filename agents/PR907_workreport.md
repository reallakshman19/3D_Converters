# PR907 Work Report

## Identity
- Responsibility: #902 / C06.2 — Combined Preview → enriched XML → CII authority ledger
- Parent: #823 / C06
- Programme: #817
- Protocol: reallaksh19/Common@3fd3a971f51a7f2a502edcb194eb9c3d729c37c8:skills/engineering-pr-delivery-v3.2
- Classification: ENGINEERING_CRITICAL
- Base material head: PR #906 @ 1c52dc4d79f81cc4f33c84184c261a85c7ba7ba7
- Branch: agent/issue-902-c06-2-combined-authority-ledger-20261007
- PR: #907 (OPEN / DRAFT / stacked on PR #906)
- Recovery state: NONE
- Implementation authority: bounded test/fixture/runner implementation only

## Mission
Prove one combined P2810042 authority path from source-derived XML through Standalone Preview, final enriched/engine XML and the exact Standalone Python CII custody wrapper. This child must establish RED/GREEN integration evidence before any production repair.

## Appendix A
Qualification published on #902 comment 6027786967. Score 98/100, minimum challenge 19/20. Result: PASS for bounded test/runner implementation. Production mutation remains outside this child.

## Current implementation
- Source-derived combined fixture module covers the C01–C04 engineering witnesses without committing raw Owner files.
- Class 61440 rows are authoritative repo-master values for DN25, DN50, DN450, DN500 and DN600.
- Browser ledger runs prepareStandaloneWeightReviewXml → xmlCiiDryRunPreview → enrichStandaloneXmlForRun on the same fixture.
- Two C04 weights are explicitly labelled regression tokens: B3::150 = 42.25 kg and EXE/B2::10 = 51.5 kg. They are not claimed engineering/master masses.
- Runner executes converters/scripts/xml_to_cii2019_runtime_custody.py, matching Standalone invocation custody, with kg→N scale 10.
- CII parser reads actual ELEMENTS, REDUCERS, RIGID and COORDS bytes and checks representative DN25/DN50/DN450/reducer/rigid/coordinate witnesses.

## Protected invariants
- source OutsideDiameter outranks 24-inch Branchname/line-list identity;
- reducer 610→508 mm endpoints remain distinct;
- wall is per-node/class resolved, not branch-flattened;
- accepted rigid weight reaches only the exact Rigid=2 owner;
- CII coordinate Node10 maps 72298.40 115930.00 100000.00 → 72298.4 100000.0 -115930.0;
- Standalone CII uses xml_to_cii2019_runtime_custody.py, not a simplified writer path;
- no runtime/writer/master/workflow source is changed by #902.

## Planned changed-file ledger
- tests/fixtures/xml-cii-p2810042-c06-combined-fixture.js — source-derived 25-node combined witness fixture and authoritative 61440 test rows.
- tests/browser/xml-cii-issue-902-p2810042-combined-e2e.html — source/Preview/final-engine authority ledger.
- scripts/run-xml-cii-issue-902-p2810042-combined-e2e.mjs — Chromium + exact runtime-custody CII execution/parser.
- agents/PR907_workreport.md — recovery-first PR report.

## Validation
- PASS — local node --check for all three new JS/MJS surfaces before GitHub mutation.
- PASS — fixture builder emits 25 source-derived Node elements and no raw project/user header metadata.
- NOT_RUN — combined Chromium authority ledger on repository exact head.
- NOT_RUN — exact runtime-custody Python CII execution on repository exact head.
- NOT_APPLICABLE — runtime source/docs mirror delta; #902 currently changes no runtime source.

## Findings / negative knowledge
- Product CII does not consume the separately downloaded enriched XML artifact. Standalone CII reprocesses the original XML plus support config through xml_to_cii2019_runtime_custody.py. The oracle therefore compares both outputs from the same source/config instead of feeding one into the other.
- The Python weight-owner guard only blocks positive source weights that lose ownership; zero-weight unresolved rigid owners remain valid review state and are not forced to invented values.
- The full source baseline remains #901. The 25-node #902 fixture is a source-derived integration witness, not a replacement for the full-model inventory or #903 whole-model differential gate.

## Highest risk
A browser/final-XML GREEN result with a Python custody mismatch. If observed, #902 must remain RED and the owning path moves to #904; do not weaken the CII assertions.

## EXACT_NEXT_ACTION
Inspect automatic exact-head checks, then obtain executable combined-run evidence without editing workflow YAML. If the combined runner cannot be executed under an existing approved gate, leave #902 incomplete rather than claiming NOT_RUN as PASS.
