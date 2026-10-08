# LFJ/1.0 — Resolver-first IMPLEMENTATION WORKPACK, review candidate V1

**Review-only, no product code.** Parent 3D_Converters#1042; owner-priority governance PR #1077; canonical worker child #1071, product draft #1075. Prepared 2026-10-08 against main f57b5799952e268ee57a91658ebae36ed723f43f and plan PR df5a7ebf7ff30f0ed697d8550ad4fd9405e3e2e2. **Reconstruct latest source before coding.**

## 0. Owner intent, precise outcome and non-goals

**Shared product:** LFJ/1.0 under 3D_Converters/lfj/ is a reusable structured-data engine, never a Resolver-specific parser. LFJ core independently owns original-byte custody, strict schema profiles, source-order occurrence indexing and ancestry, isolated bounded worker execution, transactional job state, scope/query/cursor pagination and versioned portable API contracts. **First and only live adopter:** 3 Resolver / JSON Trace. Deferred and explicitly NOT wired: StagedJSON → XML, 3D Draft Edit, Revision Compare. Older V4 adopters, full remote authenticated API, GLB/FBX and R18/R24 programme releases remain separately governed and NOT implicitly complete.

**User-facing end state:** Open actual Resolver; load a real StagedJSON File/Blob and authoritative XML/CII source; Build/Refresh yields complete, revisable Site/Zone/branch scope tree; selecting All or a bounded scope indexes all original occurrences without main-thread parsing; Resolve/Trace runs off-main; POS/PS/DTXR, bore/coordinate, matches/rejections and engineering source lineage agree exactly with independently approved expected output; page small result portions while retaining whole-source counts; replacing/cancelling a source never publishes stale trace/export; worker absence fails visibly, not via hidden main-thread fallback. Preserve existing Preview/Weight/GC-PW and CII permission invariants. Until proven, call it ACTIVE_INTEGRATION_TARGET, NOT WIRED/ACCEPTED.

**Current facts:** R01–R05 native merged. R05 real 10,539,386-byte original staging JSON (SHA e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a): 270 array roots / 339,987 JSON values, Node census ~93.6s, not accepted responsiveness. R06 U01–U03 exact node and downstream evidence on #1075 exists; U04 independent RED candidate 10a13b23c6fd18ee1d8c794f901064644d40735b not yet accepted. R07–R10 and R12–R13 not materialized. **No Resolver code currently calls the complete LFJ execution path**.

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

**R07 must be separately admitted to lfj/transport/lifecycle/** (after R06).

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

**PORTABILITY GATE:** native and *actual browser Worker* paths instantiate same app-neutral interfaces; transport/paging safe; no Resolver-specific imports into LFJ. Define forward-compatible API envelope/specification only; R11 tenant auth, remote quota, deployed endpoint and remote correctness remain deferred. If authentic LFJ endpoint is missing, document it as not implemented, not working.

## 9. Phase 5 — first actual adopter: Resolver scope R12

**Only sanctioned write surfaces:** tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js and tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js. Exact approved graph must admit R12 after R09/R10. If additional source loader/UI state/doc mirrors require product edits, raise a V3.2 owner-approved graph amendment first, not silent cross-lease modification.

| Unit | Implementation increment | Independent RED and expected visible behavior |
| --- | --- | --- |
| R12/U01 Exact ancestor ownership | Replace subtree regex-derived owner with immutable R02/R05 source-local own-attribute facts | Branch with child VALVE OWNER_ZONE remains UNSCOPED; multi-site nested source |
| R12/U02 Exact source/occurrence scope | Bind UI scope choices to LFJ sourceRef+SHA+revision+occurrence IDs, not labels; typed profile failure | Repeated-name siblings separately selectable; multibyte original byte spans |
| R12/U03 Cache invalidation | Stop length/first-mid-last-key cache; key by source SHA/revision + scope query; asynchronous source-ready state | Equal-length unsampled interior mutation changes index; stale earlier Worker update refused |
| R12/U04 View bounded, source complete | Render paged scopes/branch counts from R09, never synchronous whole-source parse in render | 1-row view does not limit complete selection; All does not invoke foreground JSON.parse |

**P5 GATE:** visible 3 Resolver hierarchy scope selector uses the shared LFJ source/index/query; real browser UI remains clickable during 10.54MB intake; exact identity and counts preserved. No claim trace computation is wired until R13.

## 10. Phase 6 — Resolver JSON Trace computation / export: R13

**Approved write surfaces currently:** tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js and tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js. Current actual expensive core is ALSO in xml-cii-trace-resolution-ledger.js, which **is not part of the R13 write lease**. R13 lead must decide and prove BEFORE coding: (A) existing ledger module can be imported unmodified into a dedicated Resolver application Worker with LFJ input/original identity and bounded selected source pages; or (B) incremental/refactored ledger or new Worker entrypoint is necessary, requiring approved V3.2 graph-diff/plan_update/write-lease expansion or responsibility split conserving semantic claims. Merely wrapping existing synchronous runStandaloneResolverJsonTrace in an async Promise is a FAIL.

| Unit | Implementation increment | Independent test and acceptance |
| --- | --- | --- |
| R13/U01 Full/scoped trace parity | Route actual Build/Refresh through Resolver-specific Worker adapter using LFJ selection/manifest; compare full vs scoped trace over exact chosen occurrences | XML/JSON golden with expected complete and scoped DTXR/POS/PS join facts; real Worker thread sentinel |
| R13/U02 No missing original facts | Replace large-source whole-document result payload with bounded trace result pages/manifest without losing source occurrences or join semantics | Independently approved expected record counts, duplicate-named branches, POS/PS fallback/capture fields, page union |
| R13/U03 Engineering authority and output | Preserve existing XML basis, CII ref lineage, bore, coordinates, matched/rejected statuses and config/save/export behavior | Hand-authored real input-XML → expected trace/CSV/CII output goldens, untouched fields and permission-negative cases |
| R13/U04 Stale UI/render/export defense | Only latest valid job/source+XML revision and selection digest can update result, CSV or export status | Two concurrent builds complete in reverse order; cancel/source replace before final; no stale export |

**Key architecture acceptance:** Worker must perform expensive Resolver trace construction, NOT merely return LFJ index to an unchanged main-thread trace; no large File.text()/JSON.parse on foreground; source attribution and independent produced output goldens; browser responsiveness under actual selected-source load. If current R13 write surface is inadequate, STOP and obtain claim-preserving graph approval rather than editing xml-cii-trace-resolution-ledger.js or adding an unowned Worker file.

## 11. Phase 7 — independent Resolver-only release checkpoint (NOT R18)

**G7.1** Source fact completeness: original owner 10,539,386-byte source SHA, 270 root items, 339,987 original JSON values; source/Zone ownership parity against independent golden; root/profile variants and negative profiles.

**G7.2** Output correctness: independently authored XML, POS/PS/DTXR/bore/coordinates, trace result and actual selected/full output manifests; ensure expected output is NOT generated by the function under test. Golden unknowns remain UNQUALIFIED. No export authority from LFJ source facts alone.

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

## 14. Review decisions requested from Owner

- **D1 Priority:** Confirm Resolver-only actual integration milestone is first and other three named apps remain placeholders until their own acceptance.
- **D2 Trace-worker architecture:** Prefer import existing unmodified trace ledger inside Resolver Worker as interim faithful semantic baseline; if source review proves it cannot meet bounded large-file behavior, authorize a claim-preserving V3.2 R13 write-surface replan for incremental ledger and dedicated Worker entrypoint. Do not choose by assumption.
- **D3 Original goldens:** Identify an independent engineering custodian for actual Resolver XML/staged source pairs and accepted output manifests; fabricated synthetic examples are useful REDs, not engineering output authority.
- **D4 Performance limits:** Confirm intended reference device/browser, 30MB/90MB populated source owners, and approve measured goals only after baseline.
- **D5 API scope:** Versioned interface now, no deployed authenticated remote endpoint until separate R11 authorization.
- **D6 Governance:** Keep existing released graph/130-point scope; do not accelerate by secretly bypassing R06–R10 or unadmitted R12/R13 dependencies.

**Review status:** PROPOSED — NO NEW PRODUCT CODE / NO NEW LEAF / NO GRAPH MUTATION from this workpack. Existing R06 draft #1075 separate and remains unmerged pending U04 qualification.