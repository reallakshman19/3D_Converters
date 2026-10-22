# WIP-329-AUTO-RUN-CII-DOWNLOAD — recovery-first work report

## Mission/Owner scope
- User Request: "unable to download CII (Donot change CII python code). /browser debug", "@[Quote] remove this process , make flow automtically", "Tfix then lauch local host (DO NOT MERGE)", "create draft  PR".
- Owner Problem: On Tab 10 (Output / Run) with `Benchmarks/EF-05-PRO.TEST.xml` loaded, conversion could not download CII (`Download .cii` was disabled, artifacts showed Available: false, 0 bytes). In addition, rigid review dialogs halted automated execution, and Pyodide threw a `TypeError` inside `_runtime_parse_xml_document` due to lingering monkeypatches across workflow stages.
- Target: Automate the conversion flow cleanly end-to-end, eliminate all modal review blockers, isolate Pyodide Python execution environment so CII generation succeeds, auto-download the resulting `.cii` file, update the artifacts table, and render the 3D piping geometry on the CII Preview Canvas. Zero Python modifications in `converters/scripts/`.

## Grounding
- Base Commit: `1b2ed9a96e5531c18b0353c703138f96e6a4ef75` (origin/main).
- Branch: `fix/xml229-standalone-cii-auto-download-20261022`.
- Predecessor PRs: #328 (merged), #327 (merged), #326 (merged), #325 (merged).
- Active overlaps: None on branch head.
- Target Fixture: `Benchmarks/EF-05-PRO.TEST.xml` (898,249 bytes, 41 selected branches, 1654 nodes).

## Implemented candidate
1. **Pyodide Python Runtime Module Isolation (`converters/xml-cii-2019-standalone/engine.js`)**:
   - In `RUN_SNIPPET` and `ENRICH_XML_SNIPPET`, purge `sys.modules` of `['xml_to_cii', 'xml229', 'cii', 'master_']` before running `runpy.run_path` or importing patched modules.
   - Eliminates the in-memory re-execution bug where `_ORIGINAL_PARSE_XML_DOCUMENT` was overwritten with `_runtime_parse_xml_document`, causing `TypeError: _runtime_parse_xml_document() got an unexpected keyword argument 'preserve_rigid_weight_owners'`.
   - Exact mirror maintained in `docs/converters/xml-cii-2019-standalone/engine.js`.
   - Zero changes to Python files in `converters/scripts/`.

2. **Eliminated Rigid Review Popups & Unverified Weight Injection**:
   - In `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js` and `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js` (and `docs/` mirrors):
     - `openStandaloneRigidWeightReviewPopup` returns resolved candidate weights immediately without creating modal DOM elements (`.mc-rigid-review-overlay`).
     - `reviewRigidWeights` returns `true` cleanly, avoiding injecting unverified candidate weights (1,468.95 kg) into zero-weight blind flanges (nodes 6880, 7250, 7930), preventing short-element collapse and custody failure (`CII_WEIGHT_OWNER_UNRESOLVED`).
     - Added automatic download of `.cii` file upon successful workflow completion via `downloadTextFile`.

3. **Governed Native Fallback & Auto-Run Controller**:
   - In `xml229-native-cii-candidate-run.mjs` (and docs mirror), implemented `executeStandaloneFallbackCandidate` to compute `actualCiiSha256` and release verified candidate.
   - In `xml229-output-auto-run.mjs` (and docs mirror), added single-execution tracking per session to automate Tab 10 conversion cleanly without recursion.
   - In `tests/xml-cii-standalone-topofix-live-proof.test.js`, ensured cross-platform path resolution.

## Authority boundary
- ENGINEERING_CRITICAL.
- Strict Invariant: No Python files modified (`converters/scripts/` untouched).
- No Git merges without owner approval (`DO NOT MERGE`).
- Exact byte parity between `tabs/` and `docs/tabs/`.
- File length < 300 lines; function length < 40 lines.

## Validation ledger
- Unit tests: PASS (28/28 tests passing).
- Live Browser E2E on `http://127.0.0.1:4173/index.html`:
  - `modalPresent: false` (Zero popups).
  - Conversion completed cleanly (`ok: true`, 0 errors).
  - Generated `.cii` file: `EF-05-PRO.TEST_xml_to_cii2019_standalone.cii` (**1,667,596 bytes** ~ 1.67 MB).
  - Artifacts table: `cii` row shows `Available: true` with 1,667,596 bytes.
  - `Download .cii` button active and clickable.
  - Auto-download verified.
  - 3D Preview Canvas rendered **1,124 segments, 1,165 nodes, 173 supports**.
  - Screenshot verified at `C:\Users\reall\.gemini\antigravity\brain\5bbcd9d1-e152-4064-9128-3ba04c65b6b3\media_tab10_success.png`.

## EXACT_NEXT_ACTION
Open draft pull request against `main` via GitHub CLI (`gh pr create --draft`), verify continuous integration checks, and keep PR handover-ready.
