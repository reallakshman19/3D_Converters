# XML→CII 2019 recovery — original-source custody and Chromium acceptance protocol

Authority: [#921](https://github.com/reallaksh19/3D_Converters/issues/921), [LFJ Plan A #1135](https://github.com/reallaksh19/3D_Converters/issues/1135), [Overall Plan B #1136](https://github.com/reallaksh19/3D_Converters/issues/1136). Protocol `reallaksh19/Common@13989969f6b7e432c4f7c1ddfe975449dba53593:skills/engineering-pr-delivery-v3.2`.
This contract is for all 8 delivery leaves. **DO NOT call the graph's V3.2 admission a product test.**

## 1. Four distinct evidence categories
| Category | Truth | Can release product? |
|---|---|---|
| Source-only Node | Pure functions and source validation | NO |
| Native Chromium | Real File/Blob, Worker, IndexedDB, source SHA, scope/page union | Only LFJ native acceptance, NOT Resolver/Preview/CII |
| Application Chromium | Real `docs/` standalone tab + real buttons + downloaded CSV/XML/CII | Required for user-facing responsibility |
| Deployed Chromium | Actual Pages URL, served asset SHA verified, same user journey and goldens | Required for Plan B release |

Never replace a missing category with a green check from another. Every leaf MUST personally obtain its owned Chromium evidence; outside reviewer/local agent/CI availability does not convert NOT_RUN to PASS.

## 2. Immutable source registry — mandatory input manifest fields
Each actual run must create a `corpus-manifest.json` recording:
- `corpus_id`, `origin` = OWNER_ORIGINAL | CHECKED_IN_AUTHENTIC | SYNTHETIC, `custody_status` = VERIFIED | NOT_STAGED | MISSING | CORRUPTED;
- absolute approved fixture locator or repository-relative path (no raw private bytes in logs/issues);
- SHA-256 over original bytes, true byte count, original encoding, profile/provenance;
- independently counted original source occurrences (not derived from LFJ output), hierarchy/site/zone IDs, selected scope and expected selected count;
- XML source digest/branch-node/physical component census, even where many `NodeNumber=-1` entries share the same displayed number;
- each of the four master file digests, parsed header/schema, row counts, exact field maps and config/override digest;
- independent expected goldens: original node-wise trace CSV, matched facts/evidence-tree CSV, reviewed Preview records, Match1/Match2 commands, enriched XML and parsed final CII.

Owner corpus **NOT_STAGED is a blocking original-file gate**. A generated/padded 30MB source is never labelled OWNER_ORIGINAL.

Known reference inputs requiring re-verification on live test head:
- `Benchmarks/1885Sjson/Sjson.json`: prior native run observed 733,806 B, 23,754 occurrences.
- `Benchmarks/1885_NC/1885_NC.json`: prior native run observed 10,232,634 B, 328,156 occurrences.
- `Benchmarks/Managejson to Input XML/ATTRIBUTE_managed_stage.json`: a checked-in large structured stage, previous J01 scope test >10 million JS characters (not 30MB original acceptance).
- Owner genuine ~30MB original JSON: **NOT YET VERIFIED AS STAGED HERE**, must have exact SHA and independent census.
- Original PL-01, PL-06 and SYS-24 XML + real four masters: must obtain approved fixture bytes/config. Expected earlier owner census is 19 branches, 871 original nodes, 322 repeating `NodeNumber=-1`; owner row scales 385 / 10699 / 383 / 1595. These are target oracles, **not a claim current run passed**.
- 90MB is separate LFJ stress-tier, not an implicit replacement for the original 30MB owner file.

## 3. Pinned Chromium execution, actual app only
Use an isolated Actions job (or identical local browser), pin Playwright package version and installed Chromium build, capture `node --version` and OS/CPU/memory; start HTTP server rooted at `docs/`. Reference setup (not a claimed test run):
```bash
npm install --no-save --ignore-scripts playwright@1.52.0
npx playwright install --with-deps chromium
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs &
# Test driver must navigate to http://127.0.0.1:8765/,
# use real XML→CII 2019 Standalone tab and DOM controls,
# then inspect actual downloads, not helper-returned JS objects.
```
The final validated browser test file and exact replay command belong to B5 #1145. Existing `tests/browser/` are candidates for reuse; do NOT silently rewrite or bypass their assertions.

For source-native LFJ A1: use authentic Blob/File, native Chromium Worker+IndexedDB transaction completion, not an inline mock; verify exact original bytes and entire page union after cold reload. For Resolver A3: real choose source/Zone/Build + both CSV downloads. B1: real Build Preview click. B2: both real review popups and distinct persisted acceptance commands. B3: real Preview/Run B31.3 material decisions. B4: actual Run and parse every generated XML/CII output. B5: complete deployed sequence with all stages.

## 4. Required measurements and immutable observed result
Every Chromium run emits:
```
RUN_ID, TESTED_HEAD, DEPLOYED_ASSET_SHA_MAP, BROWSER_VERSION, RUNNER_CPU_RAM_OS,
FIXTURE_SHA_MAP, CONFIG_SHA, MASTER_SHA_MAP, ORACLE_SHA_MAP,
PER_STAGE_MS, LONG_TASK_COUNT, LONG_TASK_MAX_MS, MAX_FRAME_GAP_MS,
WORKER_MESSAGE_BYTES, INDEXEDDB_STAGING_MS, COMMIT_MS, QUERY_MS,
PEAK_JS_HEAP_IF_AVAILABLE, STORAGE_BYTES_BEFORE_AFTER, SELECTED_OCCURRENCE_COUNT,
XML_BRANCH_NODE_COUNTS, PREVIEW_PHYSICAL_COUNT, REVIEWED_MASS_UNITS,
OUTPUT_XML_SHA, OUTPUT_CII_SHA, EXPLICIT_DIFF_SUMMARY, NEGATIVE_CASES,
CONSOLE_ERRORS, UNHANDLED_REJECTIONS, NETWORK_ERRORS, TERMINAL_STATUS.
```
Use `performance.mark/measure` (no estimating times from sampled hot-frame percentages). Chromium long tasks >50ms are reported; a 250ms max UI gap is an **initial proposed target** until the owner has accepted an exact reference runner/SLA. Capture p50/p95/p99 runs on repeated cold/warm trials when reproducible. Precommit a numerical pass envelope after measuring a fixed RED baseline, **before changing optimized production code**. Never invent a timing PASS when no baseline/approved limit exists.

Must record these stages separately: original File read → source parse/index → Worker/IDB durable commit → scope selection/page union → XML trace resolution → two CSVs → masters loading → Preview fact calculation → Preview DOM paint → Weight proposal → Match1 → Match2 → actual Mode A/B Run → output writer → independent output parse. An unresolved spinner or promise is FAIL; a typed visible error/retry is terminal error (not success), and may satisfy error-behavior negative tests only.

## 5. Mandatory negative/adversarial cases
Invalid/truncated JSON; unsupported root; altered same-length/same-prefix source; edited middle bytes; changed master with same row count; switched XML/config/selection during Worker job; late completed stale Worker response; transaction abort or quota; missing/tampered module; cancellation and retry; duplicate source occurrences and repeated -1 node labels; Format1/Format2 disagreement; ambiguity 91261/91261M7 material; missing B31.3; weight proposal vs reviewed 59/15kg; unapproved final weight; split component mass conservation. Include expected failure code and actual failure code.

## 6. Evidence artifact package and hard outcome gate
At every semantic unit checkpoint, upload/link **not private source bytes** but:
- `run-manifest.json`, `corpus-manifest.json`, `checks.json`, `performance.json`, `oracle-diff.json`, `console.json`, `network.json`, `download-hashes.json`, `trace.zip`, screenshots;
- the exact SHA of Chromium driver and production modules; test commands, baseline, seed, filter, environment; failing line/path and reproducibility command;
- actual expected-vs-observed source/trace/Preview/Review/output values and a disposition for every mismatch (PASS/FAIL/NOT_RUN); no screenshot-only acceptance.

Publish a V3.2 `TASK_EVIDENCE — CHECKPOINT` linked from the owned *main issue* and have GitHub update read back. The agent supplies only facts/unit IDs and exact evidence candidate; DELP computes P/E and issue-title projection. If the artifacts are not present or not tied to exact current head, E cannot be current and no product PASS is allowed.

## 7. Release ordering
- Plan A native/source and real Resolver+CSV pass first, with authored/deployed closure pass.
- Preview and Weight may independently validate and merge their own controlled interfaces; shared acceptance must use one current FactSnapshot.
- B4 actual enriched XML/CII output is mandatory after accepted Preview/Weight/Material.
- B5 deployed Chromium acceptance re-runs the complete original-source journey. No other repo's provisioning gate is allowed to postpone the existing XML→CII standalone product indefinitely; external reuse is separately tracked.
