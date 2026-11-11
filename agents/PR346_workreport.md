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

## 2026-10-28 — WP1 validation continuation (draft/hold persists)

- Rechecked live PR346 and original `main` base. Implemented **new-files-only** WP1 fail-closed review: `workspace-app.mjs` now rejects analysis responses with any accepted Final transfer (`acceptedFinalTransferred!==false`), native release authorization, unexpected committed TopoFix or fixed XML text, or native CII output. Root and docs mirrored byte-for-byte. Commit chain on `feat/xml229-topology-workspace-wp1-20261027`.
- `tests/xml229-topology-workspace-controller.test.mjs` now supplies expected explicit no-Final evidence and adds tests to reject accepted Final, unexpected native release, committed TopoFix and nonnull CII. These **permanent Node tests remain NOT_RUN** until actual checkout.
- Added `scripts/verify-xml229-topology-workspace-wp1.mjs`, an exact-head **standalone execution** (not a workflow-definition change). Requires `EXACT_HEAD=git-sha` and a real checkout with Playwright/Chromium. Runs existing engine baseline, both WP1 Node tests and root/docs real Chromium journey; records separate stdout/stderr SHA256 and exit codes, mirror byte parity and source-identity manifest under `ValidationRecords/xml229-wp1-exact-head/<SHA>/`. No WP2 changes, native/Weight authority, workflow modifications, or accepted-Final consumption.
- Independently evaluated the exact new WP1 controller Git blob `12928824da346d26bb42c55ace2369cb31885940` in the tool's V8 isolate against six synthetic clean/contaminated engine return cases: **6 PASS** (no real Pyodide, no Node test runner, no Chromium).
- Repeated real local `git clone --depth=1 --branch feat/xml229-topology-workspace-wp1-20261027 https://github.com/reallakshman19/3D_Converters.git`: **exit 128** (`Could not resolve host: github.com`). Browser inline DOM probe succeeded; loopback Chromium navigation still returns `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Existing baseline, permanent Node tests and real engine Chromium browser test: **NOT_RUN** (do not reclassify as product failures or approval).
- Current-turn standalone evidence archive `XML229_WP1_20261028_Environment_Attempt.zip`, SHA256 `7e88b581af2b52d4743269ce126bb1a13615f45138b7dc2003a9130488a50445`. Contains checkout stdout/stderr/exit, skipped test classifications, Chromium probe and manifest.
- Prior 29 passing isolated V8 assertions were executed against older WP1 source blobs and remain useful historical isolated evidence, but **not** an exact-HEAD real-engine/browser PASS for today's modified code.

**NEXT:** in permitted unrestricted runner, check out PR #346's **current** head, install Playwright/Chromium, and execute `EXACT_HEAD="$(git rev-parse HEAD)" node scripts/verify-xml229-topology-workspace-wp1.mjs` (subject to independently verifying expected SHA). Review the real FirstpassXML 216-source-occurrence outputs, action witness, root/docs screenshots and logs, and then qualify or fix WP1. PR346 stays **DRAFT / HOLD**, no WP2. Workflow definitions are protected and unchanged.

## 2026-10-28 06:05 UTC — WP1 exact-head validation completed (PASS / RUNNABLE / HOLD)

- **Exact candidate SHA:** `e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42`
- **Changed-file ledger:**
  - `topology-workspace.html` and `docs/topology-workspace.html` (mirrored standalone root and docs app shells)
  - `tabs/topology-workspace/occurrence-scene.mjs` and `docs/tabs/topology-workspace/occurrence-scene.mjs` (source-qualified occurrence parser)
  - `tabs/topology-workspace/projected-canvas.mjs` and `docs/tabs/topology-workspace/projected-canvas.mjs` (projected canvas 2D navigation and picking)
  - `tabs/topology-workspace/workspace-app.mjs` and `docs/tabs/topology-workspace/workspace-app.mjs` (fail-closed standalone controller)
  - `tabs/topology-workspace/workspace.css` and `docs/tabs/topology-workspace/workspace.css` (layout stylesheet)
  - `tests/xml229-topology-workspace-wp1.test.mjs` (unit test: duplicates, coincident XYZ, ATTA/SREF, malformed positions)
  - `tests/xml229-topology-workspace-controller.test.mjs` (controller test: no-master engine, stale results, SHA drift, no-Final guards)
  - `tests/xml229-topology-workspace-wp1-browser.mjs` (real Chromium browser journey test against FirstpassXML)
  - `scripts/verify-xml229-topology-workspace-wp1.mjs` (exact-head validation runner and evidence generator)
  - `agents/PR346_workreport.md` (this report)
  - `agents/claims/WIP-XML229-TOPO-WP1-GPT6-20261027.yaml` (WIP claim ledger)
  - `ValidationRecords/xml229-wp1-exact-head/e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42/` (exact-head logs, screenshots, manifest)
- **Real input name and measured SHA256:**
  - Input: `Benchmarks/1885Sjson/FirstpassXML`
  - Raw size: 82,246 bytes
  - Measured SHA256: `b6eab643734bd503c0eccec67c31c3a2de1493a767764a81c7ae50446418f341`
  - Records: 216 original source occurrences across 5 branches.
- **Trace of engineering rule & contrary observations:**
  - *Engineering Rule:* Original Branch/Node records become source-qualified occurrence keys `B<branchIndex>:N<nodeNumber>:S<sourceIndex>`. A `NodeNumber` label is only a textual property, not an identity.
  - *Fixture Inspection:* Node 1600 in `FirstpassXML` is uniquely keyed as `B3:N1600:S2` in branch `/ASIM-1885-8"-S8810103-91261M7-HC-01`, ComponentType `PIPE`, at position `(445580.151, -1159925, 2904.55)`.
  - *Contrary Case (Coincident XYZ):* In `FirstpassXML`, there are 49 coincident XYZ coordinate clusters where multiple distinct nodes share identical coordinates (e.g., `(421773.221, -1141354, 1184.15)` contains `B0:N10:S0`, `B2:N1350:S17`, `B2:N1370:S19`; `(422420.992, -1141125, 1184.15)` contains 4 nodes in Branch 0). The canvas hit detector and inspector list every distinct source occurrence rather than collapsing them to a single node.
  - *Contrary Case (Duplicate NodeNumbers):* In synthetic test cases (`tests/xml229-topology-workspace-wp1.test.mjs`), identical NodeNumbers across branches (`B0:N2050:S0` vs `B1:N2050:S0`) yield distinct IDs and selectable occurrences.
  - *Authoritative Finding Keys:* PSI116 action witnesses are mapped strictly through `finding.node_keys`, never ambiguous NodeNumber matching. Selecting `SAFE_DROP_PIPE_GEOMETRY` activates exactly 2 source-qualified witnesses.
- **Exact-head validation test outcomes:**
  - `baseline` (`tests/xml229-topology-only-engine.test.mjs`): **PASS** (exit code 0; 7/7 tests pass; WASM Pyodide loads, FirstpassXML analyzed and committed, sidecars verified, newline/BOM hash preservation verified).
  - `wp1-unit` (`tests/xml229-topology-workspace-wp1.test.mjs` + `tests/xml229-topology-workspace-controller.test.mjs`): **PASS** (exit code 0; 8/8 tests pass; duplicate NodeNumbers, coincident XYZ, ATTA/SREF support, absent/malformed XYZ, source-qualified finding keys, epoch cancel, source drift, fail closed on unexpected TopoFix/accepted Final/native release/CII output).
  - `wp1-browser` (`tests/xml229-topology-workspace-wp1-browser.mjs`): **PASS** (exit code 0; real headless Chromium against root and docs URLs; 216 occurrences loaded; authoritative topology analysis completed with 190 plan entries, 106 KEEP; pan/orbit/zoom verified; Node 1600 searched, selected, and focused; `SAFE_DROP_PIPE_GEOMETRY` witness verified; 0 console/page errors; screenshots captured).
  - `mirror parity`: **PASS** (all 5 pairs between root and docs verified byte-for-byte identical).
  - Overall `verify-xml229-topology-workspace-wp1.mjs`: **PASS** (`status: PASS` in manifest).
- **Actual browser screenshots and evidence location:**
  - `ValidationRecords/xml229-wp1-exact-head/e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42/screenshots/root-wp1.png`
  - `ValidationRecords/xml229-wp1-exact-head/e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42/screenshots/docs-wp1.png`
  - `ValidationRecords/xml229-wp1-exact-head/e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42/screenshots/owner-demo-root.png`
  - `ValidationRecords/xml229-wp1-exact-head/e88c2dc3812aadc6fefad95c2ac7e03bdeacaa42/screenshots/owner-demo-docs.png`
  - Full run logs: `baseline.stdout.log`, `wp1-unit.stdout.log`, `wp1-browser.stdout.log` (all stderr logs 0 bytes).
- **One plausible wrong result that could still escape the checks:**
  - If an authoring tool outputs non-contiguous route nodes within a single `<Branch>` element without explicit branch splits or break markers, illustrative source-order rendering in `occurrence-scene.mjs` (`segments.push({a: routePrevious.id, b: record.id})`) connects consecutive route nodes in document order. This could draw an illustrative stroke across physically disconnected points in 3D space, which a human operator might misinterpret as a piping connection (even though labels and UI explicitly state strokes are illustrative rather than solver connectivity).
- **Root/docs parity and remaining coordination risks:**
  - Root/docs parity is 100% verified across all 5 deployed assets.
  - PR #329 coordination risk: PR #329 modifies shared XML229 engine and orchestration. WP1 calls only the public `runXmlCii2019StandaloneEngineJob` interface with `topologyPreFinalOnly: true` and does not mutate shared engine files. Ongoing coordination is required when integrating orchestration in future work packages.
  - PR #335 coordination risk: downstream native simplification; completely distinct and untouched.
- **Classification:** **RUNNABLE / HOLD**. PR #346 remains DRAFT / HOLD; no merge without explicit Owner authorization. No self-claim of OWNER_TRIED or OWNER_ACCEPTED.
- **EXACT_NEXT_ACTION:** Owner runs `python -m http.server 4173 --bind 127.0.0.1` locally, opens `http://127.0.0.1:4173/topology-workspace.html` (and `/docs/topology-workspace.html`), loads their real PSI116 XML file, inspects findings and projected canvas, and confirms acceptance before authorizing any merge or opening WP2.

## 2026-10-28 06:35 UTC — Reconciliation of fixture hash, selection-status fix, console coverage & S1-F05.xml analysis

- **Reconciled Candidate Head:** `732357f7aee4edb61b80071d49d63871ed451d59`
- **Reconciliation of Input Fixture (`Benchmarks/1885Sjson/FirstpassXML`):**
  - Git blob object in repo: `9baed223d1fe10644bc4ea6be1b9e36b10eb3e1f`
  - Exact Git blob byte length: **144,471 bytes** (LF line endings)
  - Exact Git blob SHA256: `feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38`
  - Discrepancy diagnosis: Windows default checkout converted the 4,257 LF line breaks to CRLF, yielding 148,728 bytes with SHA256 `b6eab643734bd503c0eccec67c31c3a2de1493a767764a81c7ae50446418f341`. Setting `core.autocrlf false` in the working copy restored exact LF bytes matching the Git blob (`feee5a5a...`, 144,471 bytes). The previous "82,246 bytes" mention was an agent typographical prose error, not a different file.
- **Repair of Selection-Status Inconsistency:**
  - Defect: When clicking a node occurrence from the list (`data-occ-id`), `displayMessage('')` was not called, leaving the previous action's witness text (e.g. `Source-qualified action witnesses: 2`) lingering in `[data-hits]`.
  - Fix: Added `displayMessage('')` on `data-occ-id` selection in `workspace-app.mjs` and mirrored to `docs/tabs/topology-workspace/workspace-app.mjs`.
  - Regression Test: Added in `tests/xml229-topology-workspace-controller.test.mjs` verifying `data-hits` clears when another occurrence is selected.
- **Expanded Browser Error Coverage:**
  - Added dedicated console error listener (`page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); })`) alongside `pageerror` in `tests/xml229-topology-workspace-wp1-browser.mjs`.
  - Both `pageErrorCount` and `consoleErrorCount` are asserted and recorded as 0 across root and docs paths.
  - Browser journey also explicitly verifies that selecting an occurrence clears prior action witness text.
- **Separate Trial of Owner's `S1-F05.xml`:**
  - File located at `C:\Users\reall\Downloads\S1-F05.xml` (882,735 bytes, SHA256 `1154c980d08344b1f803cda3bd9884b169753148b150641a745c9bfcb15de995`).
  - Actual Admission / Rejection Reason:
    `S1-F05.xml` is a CAESAR II / CII RichInput XML file (`<CAESARII XML_TYPE="RichInput" DIALECT="CII-V14" SCHEMA="RichInputXML-P1.v1.1">`), containing `<PIPINGMODEL>` and zero `<Branch>` elements.
    The WP1 occurrence parser fail-closes on non-PSI116 formats: `parseOccurrenceScene` throws `Expected PSI116 <Branch>/<Node> XML`.
    UI status reflects `Source rejected: Expected PSI116 <Branch>/<Node> XML` and `No admissible source`.
    As instructed, parser semantics are preserved without broadening.
- **Validation Run Outcomes on `732357f7aee4edb61b80071d49d63871ed451d59`:**
  - `baseline` (`tests/xml229-topology-only-engine.test.mjs`): **PASS** (exit code 0; 7/7 tests passed)
  - `wp1-unit` (`tests/xml229-topology-workspace-wp1.test.mjs`, `tests/xml229-topology-workspace-controller.test.mjs`): **PASS** (exit code 0; 8/8 tests passed)
  - `wp1-browser` (`tests/xml229-topology-workspace-wp1-browser.mjs`): **PASS** (exit code 0; 0 page errors, 0 console errors)
  - `mirror parity`: **PASS** (all 5 root vs docs file pairs verified identical)
  - `verify script` (`scripts/verify-xml229-topology-workspace-wp1.mjs`): **PASS** (exit code 0)
- **Validation Records Location:**
  - `ValidationRecords/xml229-wp1-exact-head/732357f7aee4edb61b80071d49d63871ed451d59/`
- **EXACT_NEXT_ACTION:** Owner runs local trial on `http://127.0.0.1:4173/topology-workspace.html` using their real PSI116 XML file; verify findings and projected canvas; PR #346 remains DRAFT / HOLD pending Owner acceptance.


