# LFJ/1.0 — Resolver-first vertical slice: executable sequence and blocker status

**Classification: REVIEW_REVISED / PLAN_NOT_APPROVED pending independent exact-head re-review.** Existing owner-authorized priority update, **governance only**: no product code, no amended materialization/leases, no merge, no V3.2 progress claims. Parent [3D_Converters #1042](https://github.com/reallaksh19/3D_Converters/issues/1042); review PR [#1077](https://github.com/reallaksh19/3D_Converters/pull/1077); consolidated [independent required-changes review](https://github.com/reallaksh19/3D_Converters/pull/1077#issuecomment-5460026352). **Normative, task-complete detail is [resolver-first-implementation-workpack.REVIEW.md](./resolver-first-implementation-workpack.REVIEW.md), especially §§14–17.** No abbreviated note in this file overrides that workpack.

## 0. Owner's preserved intent and live consumer states

> "resuable engine wired to 3 Resolver / JSON Trace.
>
> other app, place holder like not wired.
>
> First priority is 3 Resolver / JSON Trace. start coding, autorised.
>
> Make a detailed plan"

**Architecture:** LFJ/1.0 is a reusable app-neutral shared source/profile/occurrence/Worker/query/API-interface engine, initially housed under `3D_Converters/lfj/`, with **no import of Resolver or engineering UI/writer code into LFJ core**. Separate adapters retain each application's semantics, output permissions and original source authority.

| Consumer | Current milestone state | Runtime permission |
| --- | --- | --- |
| 3 Resolver / JSON Trace | `ACTIVE_INTEGRATION_TARGET`, **NOT YET WIRED OR ACCEPTED** | First/only authorized adopter after correctly admitted dependencies |
| StagedJSON → XML | `PLACEHOLDER_NOT_WIRED` | No LFJ import/product edit |
| 3D Draft Edit | `PLACEHOLDER_NOT_WIRED` | No LFJ import/product edit |
| Revision Compare | `PLACEHOLDER_NOT_WIRED` | No LFJ import/product edit |

Prior V4 XCU/3DMarkup, glTF/FBX and remote service roadmap is retained as separate future scope, not abandoned or deemed complete.

## 1. Exact GitHub and source-level continuation checkpoint

At review baseline: `3D_Converters/main@f57b5799952e268ee57a91658ebae36ed723f43f`; released V3.2 24-responsibility/130-point proposal digest `sha256:a52f221e3ba736fe2f76c203ce5608b8b8fb612daa067f9d84958ceab8e11c9d`. Re-read all live refs before using this as current truth. R01–R05 native product merged. Canonical R06 [issue #1071](https://github.com/reallaksh19/3D_Converters/issues/1071), [draft PR #1075](https://github.com/reallaksh19/3D_Converters/pull/1075) **exclusive writer**. U01 Worker-provenance, U02 one-page ACK-pressure and U03 Worker-consumed-byte protocol have prior exact-head evidence at `4fa6cbfef7daa563e096ec8438afc77299e19773`; [U03 TASK_EVIDENCE](https://github.com/reallaksh19/3D_Converters/issues/1071#issuecomment-6064270355). U04 source-fault matrix is **RED-only** as of review at `10a13b23c6fd18ee1d8c794f901064644d40735b`; neither U04 GREEN nor PR merge is claimed. New commits require fresh exact-head qualification; there is no deployed LFJ Resolver runtime acceptance.

Verified source blockers on current main:

- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js` eagerly reads StagedJSON `File.text`/full text (L93–100), then its `runResolverJsonTraceFromUi` calls the synchronous `runStandaloneResolverJsonTrace` after async file hydration (L207–229); CSV export builds complete strings on main (L249–267).
- `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js` (L248–333) owns source, configuration and dependency revisions, but has no R12 write lease today.
- `tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js` looks for own owner fields over serialized nested subtrees: child OWNER_ZONE can contaminate parent; it calls whole-source `JSON.parse` on All, treats JS string length as byteLength; `ui-adapted/xml-cii-adapted-resolver-scope.js` samples 3 string regions as cache key and scans during render.
- `tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js` L196–251 uses full `JSON.parse`, recursive `walkStaged` retaining `raw`, and **silently returns [] on parse errors**, which is **not** a valid zero-match trace. L593–625 computes full groups and records synchronously; it lies OUTSIDE current R13 lease.
- `ui-adapted/xml-cii-adapted-resolver-json-trace.js` renders full trees/table rows and directly interpolates source-controlled values into `innerHTML` (L275–301); `ui-adapted/xml-cii-adapted-events.js` downloads complete CSV strings. These must be R13-owned and bounded.
- `docs/tabs/xml-cii-2019-standalone/**` deployment mirrors exist, while **`docs/lfj/` is absent** at inspected main. Tests of source modules do not prove production docs Worker URLs, JS MIME/CSP, cache and import resolution.
- Real checked-in source: `Benchmarks/Managejson to Input XML/ATTRIBUTE_managed_stage.json`, **10,539,386 original bytes**, SHA-256 `e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a`, root 270 and 339,987 JSON value census. Historical Node original 10.54MB census ~93.6 seconds is a performance risk, **not** browser/trace correctness. Real XML/trace/CII expected outputs: `NO_GOLDEN`; authentic populated 30/90MB sources: `NO_SOURCE` until acquired.

## 2. One executable data path with versioned trust boundaries

```text
Resolver original StagedJSON Blob/File + authoritative XML/CII + config/mode
 -> R03 immutable original-byte SourceSnapshot, exact SHA+revision
 -> R01 admitted SchemaProfile + Resolver-specific engineering profile
 -> R04 tokenizer, R05 complete original occurrences / R02 source-local ownership
 -> R06 real isolated Worker + R07 terminal job/revision lifecycle
 -> R08 exact include/exclude scoped selection + R09 bounded complete ordered pages
 -> R10 portable source/job/query/result/error envelope + real served docs LFJ bundle
 -> R12 REAL Resolver file-loading/state/scope control/selection UI
 -> R13 REAL dedicated Resolver module Worker:
       bounded incremental engineering trace projection and global context
       XML/DTXR/POS/PS joins, source/branch/bore/coordinate/calibration authority
       bounded result pages, safe DOM, complete streamed CSV/export
 -> G7 independent output/security/real-device browser acceptance
```

LFJ portable API versioned interface is an actual **R10 product deliverable**, NOT a deployed remote authenticated API; R11 tenant isolation/auth/quota/network backend remains unimplemented and receives no progress. `LFJ.PortEnvelope.v1` must type version, request/job, profile capability, source SHA/ref/revision, query/cursor, bounded input/output pages, result counts, terminal error and optional *data-only* auth context; reject unsupported version and malformed clone, checked in Node22/24 plus actual Chromium Worker.

**Resolver must have its own complete execution basis**, not JSON SHA alone: staged source ref/revision/SHA, selection digest, **XML revision/SHA**, effective Resolver/support config revisions, source/branch mode, run epoch, and export authority. UI result, saved config, benchmark, clipboard, CSV, displayed counts and export all fail closed on stale basis; provisional Worker pages never publish as complete.

## 3. Binding B01–B09 review corrections and accountable authorship

| Blocker | Required change within existing claim responsibilities | Independent RED/acceptance |
| --- | --- | --- |
| B01 R12 File/Blob intake/state | V3.2 authorized R12 extension for Resolver-only `events.js` file handler + `state.js` source epoch + docs mirror, **R12 FIRST writer** | Real file control on 10.54MB Blob, equal-length interior replacement, no entire JSON string on foreground |
| B02 R13 trace and output | Authorize dedicated Resolver module Worker + compact incremental projection/ledger + UI renderer, tree/table and CSV/export helpers; legacy parse/walk used for **small-source comparison only** | Full/scoped XML/DTXR/POS/PS independently authored golden, bounded real Worker work/message/DOM, no foreground whole parse |
| B03 docs deploy | Authorize R10 LFJ module packager/`docs/lfj/**` or equivalent; R12/R13 paired app mirror/build ownership | Served docs Chromium worker imports, URL/MIME/CSP/404/stale cache negatives; no fallback |
| B04 identity | R07 generic epoch + R13 full JSON+XML+config+selection+mode+authority+run-basis digest | Same JSON changed XML/config; late refresh/save, cancellation-before-export; zero stale outputs |
| B05 schema | LFJ schema profile != Resolver engineering-approved profile; invalid, ambiguous or unsupported root typed failure | Malformed JSON/UTF8, dual envelope, bad depth, repeated names, legal empty vs invalid zero |
| B06 end-to-end bounds | Complete engineering computation/joins outside output scope; cap Worker retained state, result clones, DOM and CSV | Page=1 complete union, independent POS/PS expected records, heap and message measurements |
| B07 HTML injection | R13 safe `textContent`/nodes for all source-derived tree, branch, bore and position text, docs mirror | Chromium hostile HTML literals cannot execute/inject, remain visibly literal |
| B08 portable API | R10 implement `LFJ.PortEnvelope.v1` and tests under `lfj/ports/**` | Node22/24/Chromium version/structured-clone/unsupported capability refusals |
| B09 governance | U01–U03 earlier evidence, U04 RED-only; no manual P/E/title | Read back exact R06 head and per-head CI before reporting |

**WRITE-SURFACE AUTHORISATION IS NOT YET GRANTED BY THIS DOCUMENT.** Existing released R12 lease only includes `xml-cii-json-hierarchy-scope.js` and `xml-cii-adapted-resolver-scope.js`. Existing R13 lease includes `xml-cii-resolver-json-trace.js` and `xml-cii-adapted-events.js`. Existing R10 is `lfj/ports/**` only. Before product edits, separately approve material claim-preserving V3.2 ENFORCED graph-diff covering **R10 docs LFJ packager; R12 File/Blob loader, state, docs; R13 Worker entrypoint, trace projection/ledger, renderer, CSV/export, docs**. Declare ordered shared `events.js` ownership (R12 file-input first, then R13 run/export later) and exact source → deploy mapping; no simultaneous writer. The full per-file ownership/red-oracle table is in [workpack §16](./resolver-first-implementation-workpack.REVIEW.md).

## 4. Phase-by-phase strictly dependency-ordered implementation

| Phase / admitted responsibility | Four semantic outcomes or independently rejectable unit | Explicit exit |
| --- | --- | --- |
| P0 read-only truth/oracles | Heads/leases, actual file/event/result graph, independent small golden, original real source + measured baseline | `SOURCE_REALITY_MAP`; unknown output `NO_GOLDEN`, source `NO_SOURCE` |
| P1-A1 R06 (existing #1075) | Finish U04 worker crash-before-ready, ACK-before-consume crash, stale/malformed ACK, termination/cleanup | U01–U04 exact-head native/Chromium + direct retained regression, then TASK_RESULT |
| P1-A2 R07 `lfj/transport/lifecycle/**` | U01 cancel terminal; U02 partial crash refusal; U03 old revision/source/job fence; U04 retry fresh selection | Exactly one terminal job, zero stale commit |
| P2-A3 R08 `lfj/query/selection/**` | U01 includes; U02 nested exclusions; U03 repeated-name distinct occurrence; U04 incompatible scope refusal | Independently expected selected source membership |
| P3-A4 R09 `lfj/query/pages/**` | U01 row/byte cap; U02 complete union; U03 deterministic order; U04 stale cursor | page=1 returns complete union via pages, no clipping |
| P4-A5 R10 `lfj/ports/**` + **authorized docs LFJ packager** | U01 same byte/digest; U02 same ownership/path; U03 same selection/pages; U04 unsupported typed refusals; add B08 versioned port acceptance inside these units | Node22/24 + Chromium parity **and served deployment worker/MIME/CSP** |
| P5-PRE-R12 governance | Claim-preserving approved ownership of all R10/R12/R13 required source/docs paths, explicit sequential event regions | ENFORCED checker/graph-diff accepted, approval+writer readback |
| P5-A7 R12 | U01 correct ancestor source owner; U02 exact occurrence+selection; U03 full revision cache invalidation; U04 paged complete view, plus loader/state seam | Live docs Resolver File/Blob→LFJ scope control; no foreground scan |
| P6-A8 R13 | U01 full/scoped result parity; U02 all expected engineering occurrences; U03 original XML/CII rights; U04 no stale publication, plus safe DOM and complete bounded CSV/Worker | Actual clicked Build/Refresh executes trace CPU in real Worker and matches independent expected outputs |
| P7 G7 independent | G7.1 source; G7.2 true engineering golden; G7.3 crash/fault; G7.4 real populated large source browser perf/heap; G7.5 served user path/export; G7.6 source/security/Preview/Weight/GC-PW regression | Resolver `ACCEPTED` **only if every gate independently PASSED**, separate from R18/R24 |
| P8 deferred | StagedJSON→XML, Draft Edit, Revision Compare adapters remain contracts/placeholders; remote HTTP/API implementation R11 deferred | NO LFJ imports, NO release claim |

All four semantic units per leaf are **existing approved units**, not new points for plumbing, deployment or test orchestration. RED commit before minimal GREEN, exact-head direct Node+Chromium and independent input→output oracles, `TASK_EVIDENCE` + `CHECKPOINT_FACTS_V1`, review, only then merge. Existing 350 target / 900 hard LOC leaf budgets trigger V3.2 replan when exceeded. Parent issue title/scoreboard projected, never hand-edited.

## 5. Independently controlled source/output/performance acceptance

- **Real known source only:** original 10,539,386-byte SHA-pinned `ATTRIBUTE_managed_stage.json`; input census NOT accepted XML/CII/CSV trace output. Source-specific facts cannot grant engineering authoring/export rights.
- **Independent small RED fixtures:** no inherited child Zone bleed; duplicate-name siblings and escaped pointers; equal-length interior edit; XML/config-only revision; invalid UTF8/duplicate-key/dual-root/deep input; false/absent Worker and late ACK; selected-outside-context POS/PS; bad original-source authority; hostile `<img onerror>` branch name; full-vs-scope output, page=1 union and stale CSV.
- **Unobtained release inputs:** approved engineering XML/JSON→POS/PS/DTXR/CSV/CII output oracle = `NO_GOLDEN` until independent custodian; authentic populated >=30MB and 90MB datasets = `NO_SOURCE`. **Coding may continue; G7.2/G7.4 cannot pass** before those are sourced and verified.
- **Proposed unmeasured SLO:** input-to-paint p95 <=100ms, no LFJ source-scan main-thread task >50ms, rendered <=200 rows/page, Worker source page <=64KiB one outstanding; explicit owner baseline/ratification on named OS/device/Chromium build required. Measure cold/warm p50/p95, first usable scope/page, full trace, Worker/main heap RSS and maximum payload, cancellation latency, source counts; raw run artifacts attached. Historical ~93.6s Node 10.54MB index is a performance investigation trigger, **never** a browser pass.

## 6. Review decisions D1–D6 — ALREADY RESOLVED by independent reviewer

D1 = Resolver-only live adopter, other three named apps placeholders. D2 = dedicated real Resolver Worker and incremental trace projection, legacy ledger small-case comparator only; explicit R13 source lease expansion required. D3 = author small independent engineering golden now, real authoritative golden `NO_GOLDEN` until obtained, coding not blocked. D4 = benchmark named real Chromium/device, limits unapproved until baseline, genuine 30/90MB `NO_SOURCE`. D5 = tested versioned local envelope in R10, no remote API/auth service/R11 points. D6 = preserve released claims/digest/130 total, ordered ENFORCED graph lease amendments, no concurrent writers, G7 separate R18/R24. **Do not ask the Owner to restate these generic decisions.** Exact missing external source/golden or mandated material amendment approval remain verifiable hold points.

## 7. Current review state / ordered next actions

1. **This docs-only plan revision:** incorporate [nine independent blockers](https://github.com/reallaksh19/3D_Converters/pull/1077#issuecomment-5460026352) in both governance docs and PR description, then obtain a fresh **independent exact-head plan re-review**. `PLAN_NOT_APPROVED` until reviewer clears it; docs alone award no completed semantic unit.
2. Existing [R06 #1075](https://github.com/reallaksh19/3D_Converters/pull/1075) writer may finish U04 RED→GREEN and exact-head evidence **without waiting for a general plan discussion**.
3. Admit R07→R08→R09; R10 needs its portable contract + explicit docs packaging surface; before R12/R13 product work, approve full source/deploy ownership amendment using ENFORCED graph-diff and ordered events.js lease.
4. Connect real Resolver controls and trace Worker, then independently qualify the served deployment and G7 sources/goldens/performance. Unmet gates remain `NOT_QUALIFIED`. Do not count broader R18/R24 releases or deferred consumers.

**FINAL STATUS: governance REVIEW_REVISED; PLAN_NOT_APPROVED until independent exact-head confirmation. No product code or released proposal changes in this PR.**
