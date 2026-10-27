# PR346 — XML229 WP1 standalone topology inspection

Date: 27 October 2026. Engineering-critical WP1 only. PR: https://github.com/reallakshman19/3D_Converters/pull/346 (DRAFT, HOLD, never merge without Owner).
Work ID: WIP-XML229-TOPO-WP1-GPT6-20261027. Branch: `feat/xml229-topology-workspace-wp1-20261027`. Starting production main: `0e14160cb985247d97ee6ae673387f061eeed1f7`. Donor main: `e97bef94f05e387e32888db77e6ec925251402b7` (read-only).
Concept handoff: XML229 standalone topology workspace and onboarding prompt dated 2026-10-27.

## Scope and implemented files
- `topology-workspace.html` and `docs/topology-workspace.html`: direct standalone inspection route, explicit file admission and action/search/inspector surfaces.
- `tabs/topology-workspace/occurrence-scene.mjs` + `docs/` mirror: PSI116 original Branch/Node occurrence enumerator, source SHA + zero-based original branch/source ordinals matching resolver `B*:N*:S*` keys. Keeps helpers, SREF, GASK, coordinate-missing witnesses. Display strokes follow only source order, not inferred connections. Explicit original XML inspector.
- `tabs/topology-workspace/projected-canvas.mjs` + `docs/` mirror: 5B-derived 2D projection, pan/orbit, wheel zoom, cardinal/iso cameras, click picking, hit lists for collocated nodes, fit/focus, cleanup on dispose. Legacy 5B file not changed; original blob `db8a404a5d668b21ae34d3508f800fc1684eb0e4`.
- `tabs/topology-workspace/workspace-app.mjs` + `docs/` mirror: exact file bytes -> fatal UTF-8 decode retaining BOM and line breaks -> raw/text SHA, independent engine `topologyPreFinalOnly` result and digest fence, KEEP count, blocked action list, selectable full original occurrence inspection, search and linked action witnesses. Uses production `runXmlCii2019StandaloneEngineJob`; never calls GC-PW, O1, native or accepted Final.
- `tabs/topology-workspace/workspace.css` + `docs/` mirror: responsive layout.
- `tests/xml229-topology-workspace-wp1.test.mjs`: duplicate NodeNumber, coincident XY/Z, support, absent/malformed positions, authoritative finding witness keys.
- `tests/xml229-topology-workspace-wp1-browser.mjs`: designed real Chromium + vendored Python, FirstpassXML 216 source occurrences and real topology plan, no masters/O1/Final fixture, root/docs, search/action/inspector/pan view and screenshots.
- `agents/WIP-XML229-TOPO-WP1-GPT6-20261027_workreport.md`, `agents/claims/WIP-XML229-TOPO-WP1-GPT6-20261027.yaml`, this PR report.

No existing production file edited; no root/docs asset generator, workflow, PSI116 algorithm, engine, release, Weight or native writer changed. Only new files.

## Validation evidence, exact states
PASS (GitHub source inspection): `main` and donor SHAs, open PRs and 5B identity grounded.
PASS (GitHub blob comparison): all five WP1 root/docs mirrors identical blob SHAs after the source-enumeration fix.
NOT_RUN (local topology-only baseline): attempted `git clone --depth=1 https://github.com/reallakshman19/3D_Converters.git checkout`, exit 128, stdout empty, stderr `Could not resolve host: github.com`. The requested `node --experimental-vm-modules --test tests/xml229-topology-only-engine.test.mjs` was attempted without checkout, exit 1, stdout empty, stderr `Could not find 'tests/xml229-topology-only-engine.test.mjs'`. This is an environment/setup blocker and is neither an engine FAIL nor PASS. Both stdout/stderr/exit files and their SHA256 are preserved in the conversation's `XML229_WP1_Baseline_Execution_Blocker_20261027.zip` (not in GitHub).
NOT_RUN: new Node test, real Chromium browser test `node tests/xml229-topology-workspace-wp1-browser.mjs`, all existing regressions. No screenshot or independent source-to-output proof is claimed.
NOT_AVAILABLE: private Owner 245-action model. No private action approved.
NOT_APPLICABLE WP1: topology mutation, native release, masses, GC-PW, O1, Final accepted decisions.
Observation: 28 GitHub checks auto-launched for PR initial head `665335b08ddf545e32be7857d112535dd1fbec25`, many domain unrelated. Their aggregate success cannot substitute for new WP1 tests.

## Coordination and protected invariants
- PR329: open, shared engine/orchestration authority overlap; no shared source files touched; call existing exported engine API only. Classification COORDINATION_REQUIRED at future orchestration integration.
- PR335: open, downstream native short simplification; untouched and outside this WP.
- Prior PR344/345: historical merged; CRLF/lone-CR and text SHA preserved, no source normalization before hashing.
- No implicit DOM/localStorage XML source discovery. No self-synthesized XYZ. NodeNumber is a label; exact occurrence keys are distinct. `findings.node_keys` alone connects actions to original occurrences.
- Plan.sha256/findings.sha256 must equal source UTF-8 text SHA; late work discarded on epoch change. No transaction or native/Final packet in WP1.
- Browser picture is never an independent engineering authority. Source-order display edges are explicitly diagnostic; inferred ray links from 5B were not imported.

## Risk, hypothesis, falsifier
Highest risk: actual Pyodide browser app and source XML parser under root/docs not executed; browser test could reveal import/path/source-schema differences. Additional risk: 5B-derived projected view not a byte-for-byte extracted 5B renderer, so behavior parity must be measured rather than assumed.
Hypothesis: source-bound independent topology read can render and analyze public Firstpass with zero master/O1/Final state. Falsifier: browser engine response rejects sidecar SHA, missing WASM dependencies, canvas import fails or 216 source occurrences disagree.
First local commands on a real checkout:
```bash
node --experimental-vm-modules --test tests/xml229-topology-only-engine.test.mjs
node --test tests/xml229-topology-workspace-wp1.test.mjs
node tests/xml229-topology-workspace-wp1-browser.mjs
```
Record stdout, stderr, exit, browser screenshots, actual head SHA and source/provenance limits. Existing production tests remain protected.

## EXACT_NEXT_ACTION
On a network-enabled clone of PR346 HEAD run baseline and new Node/Chromium tests. Resolve concrete failures only within WP1 new files with root/docs mirror; update this report with PASS/FAIL evidence, independently inspect public source occurrence/plan counts and browser screenshot, recheck PR329 overlap, then request review. Do not merge or proceed to WP2 transaction editing while WP1 browser truth is unknown.


## 2026-10-27 19:39 UTC — Exact-head validation attempt #2 (still HOLD)
- A new permanent controller test was added at `tests/xml229-topology-workspace-controller.test.mjs` covering the source-only engine request, source epoch cancellation and plan SHA mismatch. No existing engineering runtime or workflow file was changed.
- GitHub source-execution checks (Code Mode V8 isolate, **not Node test runner**) on the exact committed Git blobs: **PASS 13 assertions** for `occurrence-scene.mjs` and `projected-canvas.mjs`, using production `weight-basis-xml-dom.js`; source blobs `6711696c58489f40219c9ea58a1cd72f872f3dac`, `d98221d0063815e162612b42b6aa4e3818970711`, `020ffd64999fc731da5b1c27b5a9c10cde5e5f26`. Checks duplicate node labels, original ordinals, source identity, support row, missing/malformed XYZ, 2D hit stack and authoritative finding witnesses.
- Exact committed WP1 controller source, Git blob `04a3b8140b96760e7dbacffe671bb95b3c0cb5c3`: **PASS 16 V8 assertions** using injected synthetic DOM, digest and fake engine sidecars. These confirm source admission, `topologyPreFinalOnly` and no-mutation option, KEEP summary, non-KEEP action display, source-qualified witness picking, stale-result fencing, and disposal. **Not evidence that real Pyodide, public Firstpass or Chromium navigation works.**
- Checkout command repeated at 19:39 UTC: `git clone --depth=1 --branch feat/xml229-topology-workspace-wp1-20261027 https://github.com/reallakshman19/3D_Converters.git .../checkout`. Exit **128**, stdout empty, stderr `Could not resolve host: github.com`. Local baseline and two new Node test commands each exited **1** because their exact files could not be found outside the checkout; classify **NOT_RUN (environment)**, not product failures.
- Available local Chromium with Python Playwright (Chromium 144) passed inline `page.set_content` smoke but `page.goto(http://127.0.0.1:<port>)` returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Hence **real browser journey NOT_RUN** and no screenshot accepted.
- Downloadable conversation evidence: `XML229_WP1_Validation_Attempt_20261027.zip` with individual stdout, stderr, exit codes, commands, browser restriction probe, SHA256 manifest and V8-check summary (not attached into repo).
- Existing GitHub workflows running on the PR do not call either new WP1 test. Their statuses (including Issue776 or C06) are not WP1 acceptance evidence. No Workflow file may be modified without explicit Owner permission.

**Classification:** isolated source contracts **PASS 29 assertions**, root/docs parity **PASS**, new permanent controller test **ADDED/NOT_RUN**, production topology-only baseline **NOT_RUN**, new Node tests **NOT_RUN**, browser no-master journey **NOT_RUN**. **PR346 remains DRAFT/HOLD**; unverified WP1 not accepted. Current blocker is infrastructure, not an observed algorithmic failure.

**EXACT_NEXT_ACTION:** execute `node --experimental-vm-modules --test tests/xml229-topology-only-engine.test.mjs`, `node --test tests/xml229-topology-workspace-wp1.test.mjs tests/xml229-topology-workspace-controller.test.mjs`, and `node tests/xml229-topology-workspace-wp1-browser.mjs` on a network-enabled *exact PR HEAD checkout with unrestricted localhost Chromium*. Archive first real run receipts, screenshots and SHA before review-ready status. Do not broaden to WP2.
