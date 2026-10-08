# LFJ/1.0 — Resolver-first IMPLEMENTATION WORKPACK, review candidate V1

**REVISED FOR INDEPENDENT REVIEW — PLAN_NOT_APPROVED pending exact-head re-review, no product code.** [Source-level review request #5460026352](https://github.com/reallaksh19/3D_Converters/pull/1077#issuecomment-5460026352) defines nine blocking corrections B01–B09, all addressed as implementation requirements below. A corrected plan is NOT a claim that product source is fixed, the write-surface graph amended, or final Resolver acceptance passed. **Where older descriptive text conflicts, the binding corrections in §§14–17 govern.** Parent 3D_Converters#1042; owner-priority governance PR #1077; canonical worker child #1071, product draft #1075. Prepared 2026-10-08 against main f57b5799952e268ee57a91658ebae36ed723f43f and plan PR df5a7ebf7ff30f0ed697d8550ad4fd9405e3e2e2. **Reconstruct latest source before coding.**

## 0. Owner intent, precise outcome and non-goals

**Shared product:** LFJ/1.0 under 3D_Converters/lfj/ is a reusable structured-data engine, never a Resolver-specific parser. LFJ core independently owns original-byte custody, strict schema profiles, source-order occurrence indexing and ancestry, isolated bounded worker execution, transactional job state, scope/query/cursor pagination and versioned portable API contracts. **First and only live adopter:** 3 Resolver / JSON Trace. Deferred and explicitly NOT wired: StagedJSON → XML, 3D Draft Edit, Revision Compare. Older V4 adopters, full remote authenticated API, GLB/FBX and R18/R24 programme releases remain separately governed and NOT implicitly complete.

**User-facing end state:** Open actual Resolver; load a real StagedJSON File/Blob and authoritative XML/CII source; Build/Refresh yields complete, revisable Site/Zone/branch scope tree; selecting All or a bounded scope indexes all original occurrences without main-thread parsing; Resolve/Trace runs off-main; POS/PS/DTXR, bore/coordinate, matches/rejections and engineering source lineage agree exactly with independently approved expected output; page small result portions while retaining whole-source counts; replacing/cancelling a source never publishes stale trace/export; worker absence fails visibly, not via hidden main-thread fallback. Preserve existing Preview/Weight/GC-PW and CII permission invariants. Until proven, call it ACTIVE_INTEGRATION_TARGET, NOT WIRED/ACCEPTED.

**Current facts (reconciled at review):** R01–R05 native merged. R05 real 10,539,386-byte original staging JSON (SHA e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a): 270 array roots / 339,987 JSON values, Node census ~93.6s, not accepted responsiveness. R06 U01–U04 now have **exact-head native protocol evidence** at `a6e9c422114d2b5bbb64190f5336e8ebd78b480e` on still-DRAFT [PR #1075](https://github.com/reallaksh19/3D_Converters/pull/1075): [Node22/24 20/20 tests](https://github.com/reallaksh19/3D_Converters/actions/runs/37814706210), [retained Node22/24+Chromium Preview 3/3](https://github.com/reallaksh19/3D_Converters/actions/runs/37814705862), and [R06 U04 source RED→GREEN facts](https://github.com/reallaksh19/3D_Converters/issues/1071#issuecomment-6065186032). This is **not** independent merge acceptance nor deployed LFJ Chromium Worker qualification. Existing R07 is **provisionally proposed** in [child #1078](https://github.com/reallaksh19/3D_Converters/issues/1078) and [stacked governance draft #1079](https://github.com/reallaksh19/3D_Converters/pull/1079), target R06 branch, **NOT yet V3.2-admitted or product-coded**; R08–R10 and R12–R13 not materialized. **No Resolver code currently calls the complete LFJ execution path**.

## 1. Non-negotiable architecture / contract

Shared code must NEVER import tabs/xml-cii-2019-standalone, Resolver XML ledger, CII writer, Preview/Weight, or another application's files. It exposes app-agnostic, versioned ports only:

- **SourceSnapshot** — immutable original UTF-8 bytes, exact SHA-256, byteLength, caller sourceRefId distinct from digest, revision/closed state, bounded reads and Blob custody.
- **SchemaProfile** — declared accepted root/scheme, capabilities and negatives, no silent coercion or root fallback; source-local ownership policies rather than regex over descendant JSON.
- **Occurrence/IndexManifest** — sourceRefId + revision + RFC6901 path + original half-open byte span + ordinal + parent, own-attribute facts, complete and provisional status; duplicate display names remain different occurrences.
- **WorkerJob** — actual trusted Worker provenance; job/source reference/revision/epoch; bounded 64KiB-or-smaller transferable page and one outstanding; transport ACK is NOT source consumption; explicit terminal failure and stale suppression.
- **ScopeSelection / QueryPage** — All/None/include/exclude precedence and lineage, deterministic total source-order full counts, bounded page rows/bytes, revision- and query-bound opaque cursors.
- **Portable API interfaces** — the same typed request/response/error/capability envelope for local browser/Node and a FUTURE authorized remote adapter; no deployed authenticated API implied and R11 cannot earn progress.
- **Resolver adapter** — sole owner of staged engineering-field interpretation and XML/CII DTXR/POS/PS, bore, node aliases, positional joins, evidence CSV and export rights. LFJ digest/occurrenceId never becomes a GC-PW basis, physical source identity or write authorization.

One-way dependency: Resolver imports LFJ; LFJ imports NO application-specific module. Future adapters import LFJ contract, not other adapters. Other three named apps have documentation-only state PLACEHOLDER_NOT_WIRED.

## 2. Source-level integration inventory and known counterexamples

| Source surface (current main) | Actual behavior | Consequence / intended owner |
| --- | --- | --- |
| tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js | Parses top array with a foreground string scan; itemMetadata() uses fieldString() over a serialized whole subtree and source.length as byteLength; All uses JSON.parse(source) | Child OWNER_ZONE leaks into ancestor; UTF-16 vs UTF-8 mismatch and foreground fallback; R12 changes ONLY after LFJ selection/query gates |
| tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js | ensureResolverHierarchyScope() scans during render and caches with length+first/mid/last short samples | A same-length interior edit can reuse a stale scope; R12 U02/U03 |
| tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js | runResolverJsonTraceFromUi() async wrapper awaits source/staged JSON text, then invokes synchronous runStandaloneResolverJsonTrace() | Large trace is foreground work regardless of Worker index; R13 adapter/worker submission |
| tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js | scopedStagedJsonInput() calls legacy materializeJsonHierarchyScope(); runStandaloneResolverJsonTrace builds full resolutionLedger/results | Must preserve its XML/DTXR/POS/PS meaning while consuming LFJ-selected source; R13 |
| tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js | buildStandaloneDtxrPositionGroups() JSON.parse(stagedJsonText), walkStaged() recursive; buildStandaloneDtxrResolutionLedger() uses this | **POTENTIAL OWNER/WRITE-SURFACE BLOCKER:** file NOT in released R13 write_surface; choose importable read-only off-main worker wrapper if proven sufficient, otherwise secure authorized V3.2 graph-diff/replan BEFORE modification |
| actual docs/tabs/... mirrors | Browser may load mirrored deployment files | Each implementation PR audits mirror/build parity rather than passing tests on tabs/ while deployed docs/ remains stale |
| LFJ R03–R06 | Provider tests including real R05 file; R06 transport has no Resolver trace consumption | Green provider tests do NOT prove a live Resolver adopter or actual output correctness |

Pre-adoption independent RED negatives: a BRANCH lacking own Zone with a VALVE child with OWNER_ZONE (parent UNSCOPED), repeated-name siblings, UTF-8 multi-byte names, bare-array / children-array / objects-root profile cases, equal-length same-sample interior edit, malformed duplicate-key/depth, fully shaped fake Worker, Worker crash after ACK, stale cursor and stale trace result, All over large source, one-row page union, wrong XML trace counts, unauthorized CII output.

## 3. Governance and workpack rules — every package is independently rejectable

- Existing released Common V3.2 ENFORCED proposal digest: sha256:a52f221e3ba736fe2f76c203ce5608b8b8fb612daa067f9d84958ceab8e11c9d, 24 approved responsibilities / 130 programme scope points. **This document does not edit that proposal or award P/E.** R06 one canonical issue #1071, one product writer PR #1075. Others must have one separate governance admission and one bounded PRODUCT draft per existing responsibility.
- Strict dependency order R06 → R07 → R08 → R09 → R10 → R12 → R13. R08 also depends on R05; R10 on R06 and R09; R12 on R09/R10. No R12/R13 acceptance before dependencies. Independent fixture design and read-only compatibility research may proceed in parallel without violating exclusive code leases.
- For EVERY Uxx, capture (a) original falsifiable source claim; (b) independent RED fixture/test COMMITTED before production; (c) smallest GREEN code; (d) direct Node22/24 and real browser as relevant; (e) one exact head evidence receipt including actual changed files, original source/golden SHA, observed negative/result and known remaining veto; (f) V3.2 CHECKPOINT_FACTS_V1; (g) review then merge only full responsibility. No PR title/body/statistic substitutes for source proof.
- Existing leaf budgets: target 350 and hard 900 changed LOC, 15 min target / 20 min hard cycle. A hard overrun is a STOP/REPLAN, not license to split an owned semantic claim into mechanism-shaped progress points. Claim/unit/point denominators remain invariant absent owner-approved plan_updates + ENFORCED graph-diff.
- Engineer each Uxx as a bounded unit inside the responsible leaf PR; each sub-check may be a RED/GREEN commit and need not spawn a duplicate child PR. App adapter and shared core remain separate write owners. Protected docs mirroring and dedicated test paths require explicit lease/gate before implementation.

## 4. Phase 0 — source/golden intake and detailed interface review (READ-ONLY; non-progress-bearing)

**P0.1** Freeze authority / ledger. Read live #1042, #1071, #1075 and #1077, 24-leaf V3.2 graph/digest, true main/head, active writer leases; trace source order main vs docs mirror. Artifact: pinned source-module map with stable links/SHAs and owner-prompt digest. **Exit:** no conflicting writer/ambiguous module authority.

**P0.2** Resolver data-flow inventory. Enumerate Build/Refresh action, actual File/Blob fields, state cache, scope controls, trace ledger, CSV/export and docs deployment loader. Artifact: call graph with boundary Main vs Worker and each full-file conversion or in-process parse. **Exit:** explicitly enumerated main-thread allocations and engineering meaning owner.

**P0.3** Independent oracle custody. Pin original 10.54 MB fixture (byte SHA above) plus separately owned authoritative Input XML / expected Resolver trace outputs. For existing fixture where output is unknown, mark UNKNOWN instead of generating truth using same resolver. Handwrite targeted negative fixtures and expected PS/POS/DTXR/owner counts in distinct test oracle. **Exit:** fixture registry with input/output hashes, provenance and signed-independent expected values; missing original output prevents later acceptance.

**P0.4** Performance baseline before optimization. On named browser/hardware profile measure cold load, time to first indexed scope/page, p95 pointer/UI response, main/Worker heap/RSS, trace completion, source bytes, counts and whether main-thread JSON.parse is reached. Repeat with 10.54 MB fixture and separately approved populated 30/90 MB samples when available. Initial 93.6s Node is a performance risk, not a pass. **Exit:** reproducible benchmark harness plus raw measurements; targets are provisional until owner ratifies thresholds.

**P0 GATE:** Publish SOURCE_REALITY_MAP and golden registry; no implementation work is falsely complete from intake alone.

## 5. Phase 1 — foundation completion: R06 and R07

**R06 already admitted, exact existing writer #1075; phase changes no new R06 issue.**

| Package | Independently falsifiable acceptance | Direct test / output |
| --- | --- | --- |
| R06/U04.a Crash before READY | Native Worker exits without READY; admission rejects WORKER_FAILED promptly, never timeout success | Real Node Worker exit-on-start; no foreground inline fallback |
| R06/U04.b Crash after page ACK | Worker exits before SOURCE_CONSUMED; terminal typed failure, no second source read or success | Real Worker ACK-then-exit, first-page spy |
| R06/U04.c Protocol/stale faults | Wrong job/ref/revision/SHA/range, duplicate/late ACK and invalid consumed counts are rejected | Exact error-code matrix, zero accepted stale pages |
| R06/U04.d Cleanup/refusal | On failure: no lingering Worker/listeners/timers or partial accepted result; caller callback rejection fails closed | Native thread termination + observer-failure and no-ACK negatives |
| R06 GATE | U01–U04 exact-head verified, dedicated Node22/24 and retained Chromium/Preview/Weight no-regression, docs mirror | TASK_RESULT on #1071; merge #1075 only when no direct blockers |

**R07 must be separately admitted to lfj/transport/lifecycle/** (after R06). R07's full revision fence must accept an app-supplied effective dependency digest spanning JSON, XML, config, selected scope, source/mode, epoch and export authority; native job fencing alone does not prove Resolver publish/export safety (B04).

| Unit | Exact small implementation question | Required negative oracle |
| --- | --- | --- |
| R07/U01 Terminal cancel | Does cancel during source scan produce exactly one terminal CANCELLED, release Worker resources and refuse late READY/PAGE? | Cancel before/after ACK and before final commit |
| R07/U02 Crash/partial results | Can Worker crash/error leave provisional pages that look successfully COMPLETE? Never | Typed failure, staging rollback/abort, zero accepted completed manifest |
| R07/U03 Source revision fence | Can old SHA/revision/epoch publish scope or trace after new source? Never | Equal-length changed interior and opposite-order job completion |
| R07/U04 Retry safety | Can retry inherit old page cursor, selection or worker cache? Never | Reuse job ID/selection with changed source and late old Worker message |

**P1 GATE:** actual R06 transport + R07 lifecycle interfaces admit source jobs without foreground fallback, canceled/stale work cannot be committed. Node22/24, Chromium Worker and fault matrix; no Resolver UI adoption claim.

## 6. Phase 2 — exact selection: R08, lfj/query/selection/

| Unit | Bounded task | RED-first oracle and PASS |
| --- | --- | --- |
| R08/U01 Include | Formal typed All/None, include Site/Zone/branch/occurrence IDs, sourceRef/revision-bounded selection | Handwritten expected RFC6901 exact occurrence set, never name-only |
| R08/U02 Exclude priority | Parent include with child exclusion and nested include conflict has one documented precedence rule | Independent complete subtree membership oracle; forbidden descendant never included |
| R08/U03 Duplicate identity | Sibling repeated names and escaped JSON pointer names (~ and /) never collapse | Distinct ordinals/full source-order branch paths and IDs |
| R08/U04 Invalid/ambiguous scopes | Unknown root/profile, cross-source scope, incompatible selections, stale revision fail typed | Reject unsupported roots and no All-fallback on ambiguity |

**P2 GATE:** complete selected set equals independent original-source membership; no engineering semantics inside shared selection code. R08 evidence does not imply UI selection is wired.

## 7. Phase 3 — bounded result paging: R09, lfj/query/pages/

| Unit | Bounded task | RED-first oracle and PASS |
| --- | --- | --- |
| R09/U01 Page limit | Implement explicit page-size/byte cap and cursor schema; no huge single view | Count rows and bytes per response; page size 1 stress |
| R09/U02 Completeness | Union of all pages equals complete selected occurrences, including last partial page | Independent original census; no truncation at UI/worker row limit |
| R09/U03 Deterministic order | Stable source-order ordinal and duplicate-name ties | Same selection across runs/page sizes produces identical union/order |
| R09/U04 Stale cursor refusal | Cursor binds SHA, revision, profile/selection digest, sourceRef and job epoch | Replaced source/scope/current job reject old cursor, not silently restart/All |

**P3 GATE:** 10.54MB independent count from R05 is reachable through small pages; no browser memory claim until R10 and actual UI port.

## 8. Phase 4 — real browser/Node portability: R10, lfj/ports/

| Unit | Bounded task | RED-first oracle and PASS |
| --- | --- | --- |
| R10/U01 Byte/source consistency | Same original File/Blob bytes give same SHA/source revision on Node22/24 and Chromium module Worker | Multi-byte Unicode/escaped key and invalid UTF-8 cases |
| R10/U02 Occurrence/ownership parity | Exact ancestor, own Zone/Site, item ordinal/path/span results identical across environments | Child OWNER_ZONE never makes parent owned; repeated sibling names |
| R10/U03 Selection/page parity | Page union, counts/order, per-page cap and cursor stale negatives equal in both ports | page=1 and page=max independent expected output |
| R10/U04 Explicit unsupported capability | Worker unavailable, Blob unsupported, runtime port mismatch and schema incompatibility fail typed | CSP/missing Worker, no hidden foreground parse/fallback |

**PORTABILITY GATE (B03+B08):** native and *actual browser Worker* paths instantiate the same app-neutral interfaces; transport/paging safe; no Resolver-specific imports into LFJ. R10 must implement/test the versioned port envelope in §15, and an independently reproducible served docs-site LFJ module/Worker bundle with exact import paths, correct JS MIME, CSP-compatible construction and versioned cache invalidation. Current main has **NO docs/lfj/**; it is a blocker, not a documentation nicety. Any added build/deploy/doc paths require a prior claim-preserving ENFORCED writer-lease amendment. No silent main-thread fallback on 404, CSP or Worker denied. R11 tenant auth, quota, deployed endpoints remain deferred, no R11 points.

## 9. Phase 5 — first actual adopter: Resolver scope R12

**CURRENT (INSUFFICIENT) write surfaces:** tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js and tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js. **B01 MANDATORY PRE-R12:** explicitly amend approved V3.2 write leases to include Resolver-only File/Blob loader hooks in ui-adapted/xml-cii-adapted-events.js (source-binding section), ui-adapted/xml-cii-adapted-state.js (source session/revision/invalidation), any new named Resolver intake adapter, and deployed docs mirror equivalents, with writer order R12 first, R13 later for its distinct run/export sections. R12 has NO permission to modify these yet merely from this prose. Root/load must be Blob/byte snapshot rather than eager full stagedJsonText hydration, and not break unrelated XML/Preview/Weight loaders.

| Unit | Implementation increment | Independent RED and expected visible behavior |
| --- | --- | --- |
| R12/U01 Exact ancestor ownership | Replace subtree regex-derived owner with immutable R02/R05 source-local own-attribute facts | Branch with child VALVE OWNER_ZONE remains UNSCOPED; multi-site nested source |
| R12/U02 Exact source/occurrence scope | Bind UI scope choices to LFJ sourceRef+SHA+revision+occurrence IDs, not labels; typed profile failure | Repeated-name siblings separately selectable; multibyte original byte spans |
| R12/U03 Cache invalidation | Stop length/first-mid-last-key cache; key by source SHA/revision + scope query; asynchronous source-ready state | Equal-length unsampled interior mutation changes index; stale earlier Worker update refused |
| R12/U04 View bounded, source complete | Render paged scopes/branch counts from R09, never synchronous whole-source parse in render | 1-row view does not limit complete selection; All does not invoke foreground JSON.parse |

**P5 GATE:** visible 3 Resolver hierarchy scope selector uses the shared LFJ source/index/query; real browser UI remains clickable during 10.54MB intake; exact identity and counts preserved. No claim trace computation is wired until R13.

## 10. Phase 6 — Resolver JSON Trace computation / export: R13

**CURRENT (INSUFFICIENT) write surfaces:** tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js and ui-adapted/xml-cii-adapted-events.js. **B02 BINDING ARCHITECTURE:** production large-source R13 uses a dedicated **Resolver application module Worker** consuming LFJ original-source identities, selected bounded pages and compact incremental engineering projections. Keep unmodified xml-cii-trace-resolution-ledger.js ONLY as a small-source semantic regression comparator, never as the accepted large-file Worker algorithm. Before product changes obtain an authorized V3.2 ENFORCED graph/lease amendment naming Worker entrypoint, ledger or compact-projection module, ui-adapted/xml-cii-adapted-resolver-json-trace.js renderer, trace tree/table and CSV/export helpers, ui-adapted/xml-cii-adapted-events.js trace-run/export region, and corresponding docs deployment copies/build steps. R12's earlier source-load edits must finish before R13 touches the overlapping events.js file. Inline Promise wrapping a whole-source trace is a FAIL.

| Unit | Implementation increment | Independent test and acceptance |
| --- | --- | --- |
| R13/U01 Full/scoped trace parity | Route actual Build/Refresh through Resolver-specific Worker adapter using LFJ selection/manifest; compare full vs scoped trace over exact chosen occurrences | XML/JSON golden with expected complete and scoped DTXR/POS/PS join facts; real Worker thread sentinel |
| R13/U02 No missing original facts | Replace large-source whole-document result payload with bounded trace result pages/manifest without losing source occurrences or join semantics | Independently approved expected record counts, duplicate-named branches, POS/PS fallback/capture fields, page union |
| R13/U03 Engineering authority and output | Preserve existing XML basis, CII ref lineage, bore, coordinates, matched/rejected statuses and config/save/export behavior | Hand-authored real input-XML → expected trace/CSV/CII output goldens, untouched fields and permission-negative cases |
| R13/U04 Stale UI/render/export defense | Only latest valid job/source+XML revision and selection digest can update result, CSV or export status | Two concurrent builds complete in reverse order; cancel/source replace before final; no stale export |

**Key architecture acceptance:** Worker must perform expensive Resolver trace construction, NOT merely return LFJ index to an unchanged main-thread trace; no large File.text()/JSON.parse on foreground; source attribution and independent produced output goldens; browser responsiveness under actual selected-source load. If current R13 write surface is inadequate, STOP and obtain claim-preserving graph approval rather than editing xml-cii-trace-resolution-ledger.js or adding an unowned Worker file.

## 11. Phase 7 — independent Resolver-only release checkpoint (NOT R18)

**G7.1** Source fact completeness: original owner 10,539,386-byte source SHA, 270 root items, 339,987 original JSON values; source/Zone ownership parity against independent golden; root/profile variants and negative profiles.

**G7.2** Output correctness: independently authored XML, POS/PS/DTXR/bore/coordinates, trace result and actual selected/full output manifests; ensure expected output is NOT generated by the function under test. Golden unknowns remain **NO_GOLDEN / NOT_QUALIFIED** rather than guessed; synthetic expected outputs can unblock coding but never confer original-source engineering authority. No export authority from LFJ source facts alone.

**G7.3** Isolation and failure: real Chromium Worker, no foreground large parse/trace, missing Worker refusal, canceled/superseded source and error/terminal state; end-to-end source-to-page-to-trace invalidation.

**G7.4** Performance: real 10.54MB + owner-approved populated 30/90MB sources on named reference hardware; measure and archive p50/p95 UI responsiveness, first safe scope/page, full trace duration, main and Worker heap, max in-flight bytes, cold/warm runs. Proposed review thresholds: UI input-to-paint p95 <=100ms, no LFJ source-scan main-thread task >50ms, <=200 rendered rows/page; NOT approved, baselined or passed. A ~93.6s Node 10.54MB R05 census is an explicit performance blocker requiring measurement-driven optimization or an owner-authorized semantic scope/plan revision, never waiving completeness.

**G7.5** Functional product walkthrough: open actual Resolver tab; select source; Build/Refresh progress; scope choices; All; paged results; saved resolver config; node-wise trace/evidence CSV download; replace file while running; unauthorized CII operation denied. Assert DOM actions and deployed docs mirror behavior, not synthetic service mocks.

**G7.6** Independent reviewer source-level reality check and latest CI, exact candidate, retained Preview/Weight/GC-PW/CII regression, no unrelated app changes, correct success/failure permissions. Publish RESOLVER_VERTICAL_ACCEPTANCE with NOT_YET_QUALIFIED fields as needed.

**P7 GATE:** Only after all G7 checks pass: “Resolver/JSON Trace connected to LFJ/1.0”. This does NOT close R11 auth/remote, R14–R17 multi-app adoption, R18 full JSON-family, R19 3DMarkup or R20–R24 binary gates. Keep other named apps PLACEHOLDER_NOT_WIRED.

## 12. Phase 8 — future adapter placeholders ONLY (no product code)

| Consumer | Declared future adapter boundary | Current permission/state |
| --- | --- | --- |
| StagedJSON → XML | Source profile + selection facts to its own enrichment/XML conversion engine; own semantic XML output oracle required | PLACEHOLDER_NOT_WIRED |
| 3D Draft Edit | Staged source custody and reviewed edit ledger with untouched branch/topology preservation | PLACEHOLDER_NOT_WIRED |
| Revision Compare | Two independent SHA/revision sources + paired query/cursor and semantic diff presentation | PLACEHOLDER_NOT_WIRED |
| Future network API | Typed job/tenant/access/revision/request/result/error messages and explicit auth/quota/expiry contract; separate R11 implementation gate | CONTRACT_PLACEHOLDER_NOT_DEPLOYED |

No app imports LFJ until that app's owner authorizes an exact write surface, receives independent fixtures/goldens, and passes its own full acceptance. Sharing LFJ does NOT mean sharing Resolver-specific domain rules.

## 13. Publication and sequential admission checklist for every leaf

Each existing leaf enters as: OWNER_INTENT readback → V3.2 already released responsibility ID/claims/units → one governance-only binding PR (no code) with pinned ENFORCED/decompose-check, no digest/weight change → one exclusive product draft PR (unit RED→GREEN) → Node22/24 + relevant actual Chromium/real source oracles → exact-head TASK_EVIDENCE with CHECKPOINT_FACTS_V1, reviewer self-check + source-level reality check → one approved/merged product responsibility only when complete → parent PLAN_UPDATE and next child admitted. A new SHA invalidates previous E evidence until exact run replay. Parent issue scoreboards and smart titles are DERIVED, never manually typed as percentages.

**Explicit hold points requiring Owner review before silent action:** (H1) correctness/output golden source custody unavailable; (H2) R13 trace ledger file ownership outside released write surface; (H3) any leaf exceeds V3.2 hard LOC/time budget or requires new semantic leaf/reweights; (H4) production original 10.54MB / populated 30/90MB is too slow; (H5) browser deployment requires docs mirror or service Worker changes outside allowed surfaces; (H6) request for actual HTTP API or non-Resolver adopter violates current priority. Replan with append-only authorised PLAN_UPDATE, not an informal issue comment that overrides the released execution graph.

## 14. Independent reviewer D1–D6 — binding execution decisions (not open-ended questions)

[Independent exact-source review #5460026352](https://github.com/reallaksh19/3D_Converters/pull/1077#issuecomment-5460026352) resolves D1–D6. **Implement these decisions, do not repeatedly ask the Owner for a generic planning approval:**

| Decision | Resolved implementation instruction | Proof / veto |
| --- | --- | --- |
| D1: priority | LFJ reusable core, **Resolver / JSON Trace first and only adopter**. StagedJSON→XML, 3D Draft Edit, Revision Compare `PLACEHOLDER_NOT_WIRED`. | No other app imports LFJ or claims acceptance. |
| D2: algorithm | Dedicated real Resolver application Worker + **incremental, bounded trace projection**. Existing whole-source trace ledger is a SMALL fixture comparator only. | No `JSON.parse` entire large source, retained raw tree, full clone or foreground trace; R13 exact leases approved before source changes. |
| D3: goldens | Independently author expected small XML/staged-to-trace/CII/CSV oracles now. Real source authority and real approved output hashes acquired separately. | Original 10.54MB input census is **not** an output golden; missing original expected output = `NO_GOLDEN`, G7.2 `NOT_QUALIFIED`; coding may continue. |
| D4: performance | Name Chromium build, OS/device/hardware; capture cold/warm p50/p95 UI, first scope/page, worker+UI memory, bytes, pressure, cancellation. | Proposed 100ms/50ms/200 rows values `PROPOSED_UNMEASURED` until ratified; no genuine 30/90MB source = `NO_SOURCE`, G7.4 `NOT_QUALIFIED`. |
| D5: API | **R10** supplies a tested versioned local portable port envelope (§15); no deployed auth/HTTP service or R11 credit. | Node22/24 + actual browser Worker structured-clone/version/negative parity. |
| D6: governance | Retain released 24-leaf/130-point proposal and dependency topology. **Amend write surfaces** only by explicit authorized, claim-preserving V3.2 `plan_updates`/ENFORCED graph-diff and lease-order readback. | No product modification outside currently admitted R06; no speculative R12/R13 admission/merge/title percentages. R18/R24 remain separate. |

## 15. B01–B09 source corrections → executable boundaries and independent falsifiers

These are **plan-level resolutions**, not claims that runtime defects are repaired. Every RED below is authored and committed separately before the corresponding product GREEN.

### B01 — R12 real File/Blob intake, state and source invalidation

The existing `bindSourceEvents` in `ui-adapted/xml-cii-adapted-events.js` eagerly uses `readTextFile(file)` for staged JSON (main L93–100); `ui-adapted/xml-cii-adapted-state.js` owns source/session/dependency revisions (main L248–333). Neither is currently leased to R12. **Before R12 code**: authorize R12-only intake/selection lease covering precisely these regions or an explicitly named delegated adapter, plus docs mirror. Implement source selection as direct `File/Blob → openBlobSourceSnapshot`, obtaining immutable SHA/revision and bounded byte reads; avoid full string hydration of large staged JSON in the foreground. The preexisting XML/other feature's file/text path remains unaffected. For events.js R12 owns only source and selection binding; **R13 owns only trace run, CSV, clipboard and export after R12 merges**, with an ordered writer fence and non-overlap confirmed by diff. RED independent `source select A → same-size changed interior B → A completes late` must never reuse A's index or publish stale selections. Typed Blob/unsupported profile and canceled scan are visible in the real served UI.

### B02 — R13 computation, renderer, CSV and dedicated Worker

Current main `xml-cii-trace-resolution-ledger.js` L196–251 performs full `JSON.parse` and recursive `walkStaged` retaining `raw`; L593–625 creates full groups and records. `ui-adapted/xml-cii-adapted-resolver-json-trace.js` L218–393 creates complete evidence tree, table rows and nested HTML even for inactive subtabs. `ui-adapted/xml-cii-adapted-events.js` L249–267 constructs a full CSV synchronously. **Binding decision**: a real dedicated Resolver module Worker imports app-neutral LFJ index/selection/page/ports, builds *bounded incremental engineering projection* within Resolver adapter and streams page-limited trace facts/manifests. Preserve branch, bore, original global sequence/occurrence, inherited points and coordinate calibration, POS/PS joins, ambiguity and XML/source rights. Legacy ledger is **small-case oracle comparator only**. Before code, grant R13 the explicit Worker entrypoint and projection, table/tree/CSV helper, renderer, export and docs deployment write surfaces, with claim/point conservation. RED: full vs scoped XML/POS/PS independent golden, repeated names, 1-row page, missing Worker, malformed source, incomplete page manifest. **Fail** if Worker merely moves source indexing while foreground continues large synchronous trace, or if one message clones all result rows.

### B03 — actual served deployment (R10 and app mirror leases)

**Verified source-level absence on main:** `docs/lfj/` returns 404, while `docs/tabs/xml-cii-2019-standalone/**` exists. R10's existing lease is only `lfj/ports/**`, so claim-preserving ENFORCED amendment must name **actual build/packaging script + `docs/lfj/**` (or reproducible equivalent)** and hosted deploy test before writing those files. Deterministic one-way packager emits versioned app-neutral module imports and valid browser module-Worker entrypoint URLs; served docs app resolves paths and required JS MIME/CSP/module semantics, deploy cache/version drift is invalidated. R12/R13 also lease mirrored docs/tabs sources or a single-source deterministic packager per exact file. **RED** serve docs entrypoint with LFJ worker URL removed/404, wrong MIME, blocked CSP, old bundle; real Chromium must show typed not-ready error and no inline JSON parse; Node source-tree tests are insufficient. Delivery gate checks source-to-doc content/build manifest parity and network import failures.

### B04 — complete Resolver job/version/export identity

R07's generic epoch must be extended by an R13 app-supplied **`ResolverExecutionBasis.v1`** whose stable digest derives at least:
`{stagedSourceRefId, stagedSha256, stagedRevision, selectedScopeDigest, xmlSourceRefId, xmlRevisionOrSha256, effectiveResolverConfigRevision, effectiveSupportConfigRevision, sourceKind, branchSelectionRevision, runEpoch, exportAuthorityRevision}`.
Do not use filename, string length, jobId alone or JSON digest alone. Bind every displayed result, matched/rejected status, save/config state, benchmark, clipboard, CSV and CII/export eligibility to the same current basis. Stage provisional Worker pages privately; **only atomically publish complete, basis-matching results**. On any dependency/source/mode/config edit cancel/invalidate existing job; the UI must not download old results while recalculation is pending. RED opposite-order completion A/B; same JSON with changed XML/config; save vs refresh; click CSV at cancellation boundary; source-kind and branch-selection changes. No stale provisional data becomes a zero-match or downloadable success.

### B05 — malformed and unsupported roots must NOT become successful empty trace

Legacy `buildStandaloneDtxrPositionGroups` catches failed `JSON.parse` and returns `[]` (ledger main L245–251). Its walker handles bare arrays and children arrays but may not traverse schema wrapper variants. Define `ResolverAdmittedProfile.v1` **separate** from LFJ `SchemaProfile`: root shape + version/producer + allowed engineering fields/rights + exact matching golden + explicit no-trace InputXML workflow semantics. Admit only profiles actually proven by expected engineering outputs; support for a LFJ root is NOT automatic Resolver export capability. Distinguish `VALID_EMPTY_SCOPE`, `INPUTXML_TRACE_NOT_REQUIRED`, `INVALID_JSON`, `UNSUPPORTED_ROOT`, `AMBIGUOUS_ENVELOPE`, `DUPLICATE_SOURCE_KEY`, `INVALID_UTF8`, `DEPTH_LIMIT`, `SOURCE_STALE`, `WORKER_UNAVAILABLE`; use project typed-error code casing consistently when implemented. Negative independently authored dual `objects`+`hierarchy`, unsupported wrappers, malformed bytes, repeated child Zone and unsupported deep source must reject visibly, **never return valid empty matches**. Valid legal empty scope remains possible with an independently proved complete index.

### B06 — bound the entire engineering data path, not just R09 pages

Define a compact Resolver-only `TraceOccurrenceProjection.v1`: `{sourceRefId,revision,path,ordinal,parent,ownAttributes,inheritedBranch,inheritedPoint,inheritedBore,xmlCandidateKeys,ambiguity,calibrationEvidence}` with explicit true global-context semantics. Query paging bounds **both source input and output serialization/structured clone**; XML matching may depend on global context outside selected output, which must be conserved by a bounded index (not dropped as "not selected"). Worker uses capped mutable working sets, measured spill/index/page budgets and no uncontrolled raw tree/complete group clone; UI renders at most an approved visible row/DOM budget, lazily materializes opened tree branches; subtab badges use counts/manifest, not prebuilding whole row arrays. CSV/export uses bounded streamed pages or equivalent bounded memory path and completeness digest; no foreground full CSV string. Acceptance measures retained heap, message max bytes, page/DOM row count, full-page union and output digest against independent oracle. **A capped display is never a capped engineering calculation**. Memory targets require real browser baseline; no guessed pass.

### B07 — safe source-controlled DOM boundary

Current `renderTraceTreeHtml` (main L275–301) concatenates `branch.branchName`, `bore.bore`, `position.label`, `position.concatenated` into an `innerHTML` string. R13 MUST replace interpolated source-derived values with DOM `textContent`/text nodes and safe element creation (or narrowly reviewed context-escaping with proof); never treat source data as HTML. Add real Chromium hostile source input with `<img onerror=...>`, `<svg onload=...>`, quotes and escaped text, assert zero execution, no DOM injection and correct literal rendering. Include docs/ mirror in the same writer/build custody. Do not retain old renderer unchanged under a Worker migration.

### B08 — accountable local portable API envelope in R10 now

R10 owns a *real tested* `LFJ.PortEnvelope.v1` under `lfj/ports/**`, schema-versioned and structured-clone safe across Node22, Node24 and Chromium Worker. Minimal request `{version,operation,requestId,jobId,source:{sourceRefId,sourceSha256,sourceRevision,profileId,capabilities},query:{selectionDigest,cursor,pageLimit},bounds:{maxSourcePageBytes,maxResultRows,maxResultBytes},optionalAuthContext}`; response `{version,requestId,jobId,kind:'ACCEPTED|PAGE|PROGRESS|COMPLETE|ERROR',sourceBasis,selectionDigest,counts,cursor,terminal,error:{code,detail}}`. Validate unknown versions, unsupported capability, malformed bounds and missing source/job/basis; typed refusal with no inline fallback. `optionalAuthContext` is data-only and cannot grant access. R11 owns real tenant/auth/quota/expiry/network services **later** and receives no progress now. Native/Chromium cross-clone and reject tests are mandatory, not a README-only API claim.

### B09 — truth-aligned live R06 frontier / governance

Canonical R06 issue #1071 and only active product PR #1075, source branch `lfj/r06-worker-isolation`. U01 actual Worker provenance, U02 bounded ACK and U03 actual worker-consumed-byte **protocol** were evidenced at earlier exact candidate `4fa6cbfef7daa563e096ec8438afc77299e19773` via [TASK_EVIDENCE](https://github.com/reallaksh19/3D_Converters/issues/1071#issuecomment-6064270355). **Current source checkpoint:** U04 native RED `10a13b23c6fd18ee1d8c794f901064644d40735b` led to code fix and additional fault negatives on still-DRAFT #1075. At exact `a6e9c422114d2b5bbb64190f5336e8ebd78b480e`, [R06 native Node22/24 20/20 green](https://github.com/reallaksh19/3D_Converters/actions/runs/37814706210) and [retained 3/3 nonregression green](https://github.com/reallaksh19/3D_Converters/actions/runs/37814705862), [TASK_EVIDENCE](https://github.com/reallaksh19/3D_Converters/issues/1071#issuecomment-6065186032); **NOT merged/independently source reviewed for final R06 acceptance**. This does not prove the full R05 parser runs in a deployed Worker. On any continuation re-fetch PR and relevant commit workflows; stale prior evidence does not qualify new candidate until replay. Correct `resolver-first-vertical-slice.PLAN.md`, this document and PR description together; no hand-edited scoreboards.

## 16. Explicit file → owner → permission → RED → deployment matrix (implementation source contract)

**IMPORTANT:** Rows tagged `AMENDMENT_REQUIRED` are **requests, not currently granted permission**. Issue #1077 does not edit approved V3.2 graph. Each surface requires pinning to live source/file before binding, exact source-to-doc mirror/build paths and an ENFORCED claim-preserving lease approved **before product PR edits**. Only the named existing R06 write lease is active now.

| File / module (source and/or deployment) | Responsible leaf; sequential writer / lease state | RED or independent oracle | Served deployment requirement |
| --- | --- | --- | --- |
| `lfj/transport/execution/**` | R06 existing exclusive #1075; U01–U04 native tests GREEN, independent source review/merge PENDING | Crash before READY/after ACK, invalid/late protocol, no resource leak | Real native+browser Worker, no inline fallback |
| `lfj/transport/lifecycle/**` | R07 AFTER R06; ADMISSION_REQUIRED | Cancel/crash/revision/retry stress | Worker cannot publish stale state |
| `lfj/query/selection/**` | R08 AFTER R07; ADMISSION_REQUIRED | Own Zone, repeated siblings, nested exclusion | Same selected identity |
| `lfj/query/pages/**` | R09 AFTER R08; ADMISSION_REQUIRED | page=1 complete union, stale cursor, cap | Complete selection despite tiny view |
| `lfj/ports/**`, new R10 versioned envelope | R10 AFTER R09; ADMISSION_REQUIRED | Node22/24/Chromium clone/version/typed errors | Same results in served Worker |
| LFJ browser module packager/build script and `docs/lfj/**` (currently absent) or equivalent | R10 extension **AMENDMENT_REQUIRED** | docs-site 404/MIME/CSP/cache RED | Served docs actually loads LFJ+module Worker |
| `tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js` + ui-adapted `xml-cii-adapted-resolver-scope.js` | R12 existing proposed leaves, AFTER R10 | Child Zone isolation, exact source scope | `docs/tabs/xml-cii-2019-standalone/` parity |
| ui-adapted `xml-cii-adapted-events.js` (File/Blob source handler L61–115), ui-adapted `xml-cii-adapted-state.js` and any named intake adapter | R12 extension **AMENDMENT_REQUIRED**, **FIRST WRITER** on events.js | 10.54MB Blob, equal-length edited interior, replacement | Corresponding docs mirror and no full foreground File.text |
| `tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js` | R13 existing proposed leaf, AFTER R12 | Full/scoped XML/trace golden, malformed rejects | Corresponding docs mirror |
| Resolver module Worker entrypoint, compact trace projection, `xml-cii-trace-resolution-ledger.js` if changed | R13 extension **AMENDMENT_REQUIRED**; comparator itself read-only until lease granted | Incremental global join, parse errors, group/bore/point semantic goldens | Worker URL/CSP/MIME and docs mirror |
| ui-adapted `xml-cii-adapted-events.js` (Run/Refresh L207–229; export L249–267; clipboard) | R13 extension/current events writer **SECOND**, after merged R12 File/Blob region, no concurrent writer | Late A/B job, changed XML/config, CSV-at-cancel | Docs mirror; explicit export basis |
| ui-adapted `xml-cii-adapted-resolver-json-trace.js` renderer + trace tree/table/CSV helpers | R13 extension **AMENDMENT_REQUIRED** | Malicious HTML, lazy rendered counts/rows and export complete digest | Docs mirror; no unsafe `innerHTML` |
| `docs/tabs/xml-cii-2019-standalone/**` exact changed mirrors or deterministic builder | R12/R13 ordered extension **AMENDMENT_REQUIRED** | Diff/build parity, served network requests and E2E click | No missing imports/stale versions |
| `lfj/api-port/**` authenticated remote service | R11 explicitly DEFERRED; NO IMPLEMENTATION CREDIT | Future tenant isolation/TTL/quota | NO DEPLOYED API |

**Writer fence:** R10 packaging lease first; R12 scope+File/Blob+state and docs source deployment second; R13 trace Worker/computation+render/export/docs third, with exact existing events.js section separation. Main/PR diff must prove no Preview, Weight, unrelated source/CI mirror ownership contamination. A graph amendment needs approved plan update, strict ENFORCED `decompose-check`/`graph-diff`, source lease mapping, digest/claim/weight conservation and provider readback. A product writer does not receive permission via prose alone.

## 17. Ordered execution and reviewer closure matrix

| Step | Execute, only with admitted writer | Gate proving a working vertical slice rather than isolated PR statistics |
| --- | --- | --- |
| A1 R06 | U04 real-Worker failure/cleanup source work done on #1075; independent reviewer source check and merge gate remain | Exact-head Node22/24 native 20/20 and retained Chromium Preview 3/3 proven; actual LFJ browser Worker awaits R10; deliberate merge only after independently qualified |
| A2 R07 | Cancel, crash partial rollback, all-source job fences, fresh retry | One terminal outcome; old source/result never commits |
| A3–A4 R08/R09 | Semantic include/exclude and bounded page full union | Original source identity/count unchanged; invalid selection/cursor fails |
| A5 R10 plus B03+B08 | Node/browser parity + real tested versioned envelope + reproducible docs LFJ+Worker packaging | Served docs Chromium import and Worker denial/404/CSP cases, no foreground fallback; **lease amendment first** |
| A6 PRE-R12 | Claim-preserving R12/R13 and docs deploy writer amendment and readback | ALL B01/B02/B03/B07 paths present with ordered events.js ownership; no unapproved code |
| A7 R12 | Blob source-load, exact ownership/scope, revision-safe cached selection and page-limited UI | Real served file control → LFJ source index → distinct scopes, page=1 full union, stale cache RED |
| A8 R13 | Dedicated Resolver application Worker + bounded projection/joins/results, safe DOM and streamed complete exports | True clicked Build/Refresh trace off-main and output parity; source/XML/config/mode/epoch/authority stale block; hostile DOM test |
| G7 independent Resolver | G7.1 original source, G7.2 independent true output, G7.3 faults, G7.4 hardware/browser 10.54+genuine 30/90MB, G7.5 served UI/download, G7.6 security and downstream | No final Resolver ACCEPTED without independent real output goldens and genuine populated large-source perf/heap; G7 NOT_QUALIFIED otherwise |

**No progress invention:** Each original R07–R10/R12–R13 U01–U04 remains the only semantic unit denominator. B01–B09 are design/acceptance/falsification details **inside existing claim boundaries**, not nine new points, nine child issues, or mechanism-as-product. “API fields now” is R10 port compatibility, NOT a shortcut to R11 auth. “Deployment gate” is a cross-cutting R10/R12/R13 acceptance and write-surface contract, NOT evidence R18 multi-app JSON gate or R24 binary gate passed.

### Re-review checklist / explicit residual blockers

- [x] Review B01–B09 are translated into file-backed implementation boundaries with RED cases and observable app behavior.
- [x] Six D1–D6 decisions are binding instructions, not repeated open-ended questions.
- [x] Real `docs/lfj/` absence and `JSON.parse`→`[]` invalid-empty behavior are documented as source-level blockers.
- [x] R06 truth re-reconciled: U01–U04 native green at `a6e9c422...` with exact-head evidence; R06 still draft/unmerged; R07 graph binding on unmerged stacked #1079 is **NOT** admission or product completion.
- [ ] **BEFORE WRITING PRODUCT:** authorized ENFORCED graph-diff/readback for R10 packager/docs and R12/R13 loader/state/Worker/ledger/DOM/CSV/docs write surfaces.
- [ ] **BEFORE PRODUCT ACCEPTANCE:** genuine served docs browser app/Worker + original file/source parity and independent security/source failures.
- [ ] **BEFORE RESOLVER RELEASE:** independent authentic XML/trace/CSV/CII output goldens (`NO_GOLDEN` until provided); genuine populated 30/90MB source and approved reference-device performance (`NO_SOURCE` until provided).
- [ ] **BEFORE PLAN_APPROVED:** an independent new exact-head reviewer re-runs this matrix and grants explicit approval. This document and PR #1077 remain `PLAN_NOT_APPROVED` until then.

**Current implementation authorization:** Existing R06 sole writer may continue. New application writes remain unadmitted. This document itself awards zero product completion.
