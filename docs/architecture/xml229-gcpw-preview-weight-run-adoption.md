# XML229 / GC-PW/1.0 — Preview, Weight Match and Run shared-authority adoption ADR

**Status:** PROPOSED / NOT APPROVED; design-only handoff for independent contract-owner review.  
**Date:** 2026-10-13.  
**Owning outcome:** [3D_Converters#229](https://github.com/reallakshman19/3D_Converters/issues/229). **Architecture owner:** [#96](https://github.com/reallakshman19/3D_Converters/issues/96) (migrated from #999), consolidated programme [#212](https://github.com/reallakshman19/3D_Converters/issues/212).  
**Evidence baseline:** `main@0cda581c737572180aa64310461764e8a5b78fdf`; [DRAFT/HOLD #237](https://github.com/reallakshman19/3D_Converters/pull/237) `eb673e45494b2409fd688823aaeb5b93b1b86d7f`. All path statements below are source inspection and GitHub/CI evidence, not independent full application acceptance.  
**Authority:** Owner instructed **skip v3.6** for #229; no restart of closed BuddyRunner; preserve #133 B1 / #136 B4 exclusive-writer decisions, #203 C05 and #96 governed engineering semantics. No code, tests, workflow, release gate, app deployment, schema or main changes in this ADR.

## 1. Executive decision required

**Adopt the already implemented GC-PW/1.0 canonical InputBasis, original-occurrence FactRecord/FactPage, attested Weight review service and separate RigidMatch1 / Rigidmatch2 decisions as the prospective common authority. Do not build another competing shared service.** Stage the migration behind an approved read-only shadow and one source-bound session, and only cut over Preview, Weight, report and Run when the *same exact basisId / occurrenceId / reviewed snapshot* is demonstrated in the real authored UI and native CII run.

This **is a proposal**, not a contract approval. There are two conceptually different values presently called “accepted”: (a) XML229's `Apply suggestion` stores a legacy numeric `rigidWeight` plus `rigidWeightProposalMeta` and displays `Accepted · Suggested`; (b) GC-PW/1.0's explicit `DecisionCommand` freezes approved `RigidMatch1` and a separate later `Rigidmatch2`. Never treat (a) as (b) or promote merely because a table field is nonblank.

### Reject the two false solutions

- **Patch-only:** teach Preview to call `buildXmlCiiValidatedRigidWeightLegacyView(saved, [])`. This falsely treats absent current issue rows as missing components, bypasses original source/selection custody, and risks a second full geometry computation. A global blind rewrite of `xmlCiiEffectiveRigidWeightMap` also changes historic manual behavior without evidence.
- **Green output only:** merge #237 because its validated standalone XML output bridge passed. Real Preview independently shows a stale selected override; other report/raw readers have not been reconciled. A green synthetic engine bridge is not 4 Preview, source-selected physical review or Owner acceptance.

## 2. Exact existing interfaces — reuse, do not rebuild

| Existing file / exported seam | What it already supplies | Exact unproven adoption boundary |
|---|---|---|
| `contracts/gc-pw-v1/contract.mjs` | `makeBasisRef`, `assertBasisDigest`, FactRecord, Proposal, DecisionCommand, SnapshotRef and paged-completeness validators | Actual active UI does not yet use its SHA-bound basis to guard every Preview/Weight/Run transition |
| `contracts/gc-pw-v1/occurrence-bridge.mjs` | `physicalOccurrenceId`, `attestLiveBasis`, `verifyPhysicalFactPages`, `toWeightFacts` | Requires independently enumerated original XML occurrences, never derive total from rendered subset |
| `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js` | `createPreviewBasis` hashes source, selection, staged text, masters, mappings, config and overrides | Actual selected Owner/site/zone source + per-file generation must be passed, not inferred from filename or ALL |
| `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-read-model.js` | `openPreviewFactReadModel` immutable fact pages and completion guard | Engineering producer and selected physical field population still need independent positive acceptance |
| `tabs/xml-cii-2019-standalone/integration/gc-pw-preview-weight-session.js` | `openGcPwPreviewWeightSession`: Preview Basis → source fact pages → attested Weight service; cancellation, progress and stale handling ports | Its required `factPageProducer` must be the **actual** authored Preview Worker, not a test-only callback. Repository call-site search at baseline found this entry in its implementation/tests, **not active production Preview/Run** |
| `converters/xml-cii2019-core/weight-facts-attested-session.js` and `weight-facts-review-service.js` | Source/master SHA custody, transactional `applyDecisions`, accepted `RigidMatch1` distinct from `Rigidmatch2`, frozen snapshots | UI legacy `rigidWeight` save does not persist these immutable scoped commands/snapshots |
| `converters/xml-cii2019-core/weight-facts-canonical-consumer.js` | `createCanonicalWeightFactSession` verified source/occurrence integration | At baseline call-site search found implementation and tests only, not the active Preview/Run UI |
| `converters/xml-cii2019-core/weight-facts-mode-a-final-read.js` | `readVerifiedModeAFinalRows` requires completed verified session and separate source-scoped reviews | No automatic inference from saved legacy row keys or unapproved Final stage |
| `converters/xml-cii2019-core/rigid-weight-authority.js` | Deployed legacy `rigidWeight` precedence and separate governed Match-1 provenance view | FNV/WeakMap proposal basis is a compatibility mechanism, **not equal to a GC-PW SHA256 immutable InputBasis** |
| `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js` | Actual `xmlCiiDryRunPreview`, full and incremental reranking | Calls raw `withXmlCiiEffectiveRigidWeightLegacyView` without current provenance check; demonstrably stale `selectedOverride` |
| `tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-validation-report.js` | Empirical report uses `resolveXmlCiiRigidWeight` | Raw saved legacy resolution can misdescribe a stale proposal as effective, separately test actual report before claiming |
| `tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js` and `xml-cii-weight-output-authority.js` | Real `enrichStandaloneXmlForRun` and `prepareStandaloneRigidWeightAuthority` → `applyStandaloneAcceptedRigidWeights` | #237 proviso validates only this consumer; current Run diagnostics enumerate stale Match-1, not `staleLegacyProposals` |

**Existing executable acceptance witnesses:** `tests/gc-pw-preview-weight-session.test.mjs`, `tests/gc-pw-preview-worker-fact-port.test.mjs`, `tests/gc-pw-v1-contract.test.mjs`, `tests/gc-pw-v1-occurrence-bridge.test.mjs`, `tests/xml-cii-agent-w-weight-canonical-integration.test.mjs`, `tests/xml-cii-preview-facts-read-model.test.mjs`, `tests/xml-cii-weight-output-authority.test.mjs`, `tests/xml-cii-rigid-weight-lifecycle.test.mjs`; existence ≠ an exact-head hosted or original-Owner PASS.

## 3. Verified negative evidence and required common view

**RED #1: output.** [Run #38447287600](https://github.com/reallakshman19/3D_Converters/actions/runs/38447287600) on #237 before fix `50afad23...`: 11/15 PASS, four intentionally RED; old 12.5 kg reaches standalone XML after same-key geometry or Weight master change.

**GREEN candidate: isolated output.** [Run #38448371276](https://github.com/reallakshman19/3D_Converters/actions/runs/38448371276) on `70e7308f...`: 17/17 PASS, current Weight Match Chromium witness and root/served parity PASS; withheld stale saved provenance-bearing numeric candidate in `buildXmlCiiValidatedRigidWeightLegacyView`; provenance-free historic manual 8.25 kg, same-basis suggestion and explicit Final 17.75 kg controls PASS. These are **not** a complete shared authority migration.

**RED #2: Preview.** [Run #38449573808](https://github.com/reallakshman19/3D_Converters/actions/runs/38449573808) at #237 `eb673e45...`: 17/19 PASS, two intentionally RED; current XML geometry with same component key still has Preview `weightMatch.selectedOverride === true` for stale saved 12.5 kg while the validated Run-output view withholds it.

**Proposed public read result** (adapter-level projection, **not a new GC-PW/1.0 schema field and not approved as contract**):

```ts
type XmlCiiEffectiveWeightRead = {
  basisId: string;                  // exact SHA256 GC-PW InputBasis
  sourceId: string; occurrenceId: string; // original, physical, never bare NodeNumber
  sourceMassKg: number | null;
  proposedMassKg: number | null;
  resolvedMassKg: number | null;    // null for stale/unresolved, NEVER invented 0
  source: 'source'|'legacy-manual'|'proposal'|'RigidMatch1'|'Rigidmatch2'|'unresolved';
  status: 'PROPOSED'|'LEGACY_MANUAL'|'ACCEPTED_MATCH1'|'FINAL'
        |'STALE_REVIEW_REQUIRED'|'UNRESOLVED'|'CONFLICT';
  decisionRevision: string | null;
  provenanceRefs: string[];
  diagnostics: Array<{code:string;field?:string}>;
};
```

Renderers and reports consume this one read-only envelope. **Only** a distinct reviewed `DecisionCommand` may alter Match-1/Final. A new raw candidate and an existing saved legacy proposal cannot acquire Final by ranking, display, same numeric value, or stale reuse. Values of `0` in preexisting XML are original-source facts, *not* a fabricated accepted engineering mass.

## 4. Architecture: ownership, inputs, outputs and concurrency

```text
Owner/Source picker + LFJ original XML/JSON + explicit selected source/scope
  -> frozen XML bytes / staged bytes / selection / per-file generation
  -> createPreviewBasis() -> SHA256 BasisRef (GC-PW/1.0)
  -> source original-occurrence census (independent of rendered result)
  -> actual local Preview Worker: bounded FactRecord pages, original occurrence IDs
  -> verifyPhysicalFactPages() + openPreviewFactReadModel()
  -> openGcPwPreviewWeightSession() -> attested Weight scorer/review
  -> immutable read projection for Preview full/incremental + Weight UI/report
  -> explicit Review-1 Command + separate Final Review-2 snapshot
  -> original-basis + decision-revision Run verifier
  -> enriched XML + native CII, independent output authority/evidence digest
```

**One fact owner, multiple consumers.** The common fact producer does not depend on an editable table or an output XML file. Preview displays facts, proposals and review status; Weight scores the same frozen facts; Run reads the reviewed state from exactly that basis. Reuse existing worker/master index and scoring components, not a second geometry/rating algorithm. Root and served `docs/` exports must stay identical.

**Epoch/fence:** source identity/generation, selected-scope digest, staged revision, master dataset/mapping revisions, config/overrides digest, active request ID, immutable `basisId`, and review revision must match at *every* load, page, callback, save, redraw and Run request. A newer basis invalidates previous async results and ephemeral cache; cancelled/late Worker pages do not become accepted facts. Incremental Preview rerank can reuse frozen branch facts only if it can *prove* that all input signatures relevant to the cached facts are identical; otherwise full bounded recomputation. Cache key must include actual content SHA, not only length/count/filename.

**Scope:** original occurrences include duplicate Branchname, same NodeNumber (including `-1`), Mode B per-file ownership and branch/node ordinals. A selected zone cannot silently become `ALL` when the selected read model is unavailable. Missing signed owner-mapping/approved Line List 385 remains `BLOCKED`, not reinterpreted to make UI work.

**Error policy:** typed `STALE_BASIS`, `CROSS_BASIS_FACT`, `TRUNCATED_POPULATION`, `STALE_DECISION`, `UNRESOLVED_ENGINEERING_AUTHORITY`, `PROVENANCE_CHANGED` and `WORKER_CANCELLED` must result in no new review/output authority. Display “review required” instead of stale Accepted. Exactly which cases veto the *entire* Run vs withhold an individual suggested weight is a **#96 Owner decision**; do not infer approval here.

## 5. Compatibility and staged introduction, without a big-bang rewrite

| Controlled workpack | Source/code seam | Required executable exit (all exact head) | Current gate |
|---|---|---|---|
| **A0 Actual Owner-scale measurement/oracle** | Authored Preview, Weight, Run; profile 385/10699/383/1595 selected input | Current real browser, heap/long tasks/Worker time and output identity; read-only original-Owner data | **BLOCKED** authentic Owner inputs/385 approved mapping |
| **A1 Approve this ADR/field authority** | #96 and #212, #133/#136 boundaries | Named contract owner + separate reviewer `PASS / CHANGES_REQUIRED / HOLD`, explicit release-veto/status meanings, allowed file/writer lease | **PENDING** |
| **A2 Read-only shadow session** | Real UI-selected source → `openGcPwPreviewWeightSession` with actual worker pages | Source SHA, ALL vs exact zone, changed same-length XML, changed same-count master, cancellation, duplicate node -1, original full page count; no writes/authoritative fallback | **PENDING A1 / selected B1 writer** |
| **A3 Preview consumes one frozen basis** | `preview-dryrun.js`, Preview Worker, incremental cache, source read model | RED Preview stale override → GREEN, content-addressed cache, factual/proposed distinction, 385/10699/383/1595 performance budget and docs parity | **PENDING A2** |
| **A4 Weight UI and report use same read projection** | Weight parent and standalone fallback, empirical validation report, canonical Weight review service | Blank-only remains blank-only; unchanged/manual/Final/proposed held; explicit Match-1 vs Final, save/reload stale refusal; no silent rank promotion | **PENDING A2–A3** |
| **A5 Run consumes verified snapshot** | `enrichStandaloneXmlForRun`, source-to-engine bridge, Python CII custody | Same `basisId`, original selected occurrences, reviewed decision revisions, no stale XML weight, Run/Preview diagnostics consistent, CII independent output digest | **PENDING A2–A4 + B4 writer** |
| **A6 Release and rollback** | Registered Pages + parent/fallback Chromium + independent review | Exact SHA browser, all relevant guarded CI, no unreviewed red, original 28/808 private incidents, Owner O1–O5 disposition, rollback to legacy only if no false authority | **PENDING all above** |

**Compatibility direction:** Preexisting `rigidWeight` **without** proposal metadata remains a separately labelled legacy manual override under its historical contract; do not erase it or silently confer a GC-PW Final decision. A metadata-bearing saved suggestion whose basis is stale is held for human review; do not edit a migrated snapshot in place. When migration is approved, implement an explicit one-time, idempotent conversion with owner-visible provenance and exact source basis; any unconvertible old record stays `NEEDS_REVIEW`, never forged Review-1/Final.

**Rollback:** preserve existing saved configs unchanged while shadowing; cut-over feature switch applies only to presentation until reviewed source+review+run chain proves parity. Switch off new read projection upon a regression **without enabling unsafe old released weights**; Run remains fail-closed on mismatched basis. Do not “fix” CI by suppressing tests or modifying #203's historical allowlist.

## 6. Concrete reviewer matrix — what to test, not just “run CI”

| Case | Witness | Expected outcome |
|---|---|---|
| Source mutated with equal length / master changed with equal rows | `makeBasisRef` + `assertBasisDigest` / real live content readback | New basis or `CONTENT_DIGEST_MISMATCH` / `MASTER_CONTENT_DRIFT`; no stale accepted value |
| Same numeric proposal after geometry/rating/master basis change | #237 RED/ GREEN lineage; actual Preview node | Preview, Weight report and XML Run all say `STALE_REVIEW_REQUIRED`; no `selectedOverride` |
| Correct same-basis explicit suggestion | Parent/fallback cold/reload | Display is only proposed/suggested; no implicit Match-1 or Final |
| Historical no-metadata legacy manual + explicit governed Final | Parent/fallback/Run | Exact older compatible value displayed with legacy provenance; explicit Final wins, without mass invention |
| Duplicate Branchname / `NodeNumber=-1` / mixed Mode B source IDs | `physicalOccurrenceId`, full FactPage verification | No collision, deduplication or wrong-source acceptance |
| Missing page, reordered/foreign page, late worker after cancellation | `verifyPhysicalFactPages`, job/session API | Typed fail closed; no partial Preview reviewable or Run-authorized result |
| Acceptance revision conflict / unqualified proposal | `applyDecisions` and `freezeSnapshot` | Revision conflict/reason requirement, no unreviewed promote |
| Preview incremental vs full vs source revision | Real authored browser | Same hash-bound read results; if unprovable, recompute; no stale render |
| Original 28/28 saved Run formats | Owner-local XML/config/selection | Original occurrence per-role diagnostics exactly reconciled; fail closed when unresolved |
| Original 808 staged pages / 622,915 occurrences | Owner-local source and LFJ receipts | Responsive Worker, staged vs committed distinction, no fictitious percentage, no export right from staging |
| Root/docs served parity + independent CII | Fixed exact run + deployed browser | No source/served drift, no bypass of format/Preview/Final/source gates, independent parsed CII and digest |

**Suggested existing first-run commands**, at a checked-out exact revision with installed Node and Chromium where required:
```bash
node --test tests/gc-pw-v1-contract.test.mjs tests/gc-pw-v1-occurrence-bridge.test.mjs tests/gc-pw-preview-weight-session.test.mjs tests/gc-pw-preview-worker-fact-port.test.mjs tests/xml-cii-agent-w-weight-canonical-integration.test.mjs tests/xml-cii-preview-facts-read-model.test.mjs
node --test tests/xml-cii-weight-output-authority.test.mjs tests/xml-cii-rigid-weight-lifecycle.test.mjs tests/xml-cii-229-weight-blank-only.test.mjs
```
The last `xml-cii-229-weight-blank-only` test belongs to **draft PR #237**, not baseline `main` for its two latest Preview RED additions; use that exact PR head or omit it from a `main` run. These commands are a proposal, not reported executed results.

## 7. Owner/integrator decisions explicitly needed before implementation

**D1 — semantic:** Does clicking “Apply suggestion to blanks” record only an unapproved proposal/suggested legacy value, or explicitly commence a distinct governed Review-1 command after qualified confirmation? Do not silently rename a legacy candidate `Accepted · Match-1` to appease old tests.

**D2 — safety:** Must a stale provenance-bearing saved suggestion block the **whole Run**, or be withheld with an explicit blocking-or-warning diagnostic at the individual component? Define how complete mass/property review is proven.

**D3 — historical:** Which provenance-free legacy manual weights are allowed in Preview/Run, and are they displayed as `LEGACY_MANUAL` pending explicit re-attestation? Preserve saved user data while preventing invented engineering approval.

**D4 — ownership:** Who is the sole writer of actual active Preview B1 and downstream native CII B4 surfaces? Respect [#133](https://github.com/reallakshman19/3D_Converters/issues/133) and [#136](https://github.com/reallakshman19/3D_Converters/issues/136), any current competing PR; require review of file paths before implementation.

**D5 — authority and performance:** Accept the preexisting GC-PW/1.0 session and read-model as the integration boundary subject to real Owner A0 profiling and immutable selection custody, or identify a concrete contract defect with a versioned amendment, before coding.

## 7A. A2 exact-head runtime audit — completed test-only, without granting acceptance

**2026-10-13, new verified evidence:** [DRAFT test-only PR #239](https://github.com/reallakshman19/3D_Converters/pull/239) at exact `4be1e2a0f6b7b50df4cf6fea3d6739e1565da7b1`, [hosted run #38453795626](https://github.com/reallakshman19/3D_Converters/actions/runs/38453795626) **SUCCESS**. The job ran 12/12 Node tests (including two new tests that execute the **actual** `xml-cii-adapted-preview-facts-worker-entry.js` message handler) and existing Chromium Weight blank-only/served-parity checks PASS. Product main, Worker, Preview, Weight, Run and CI definitions were not modified.

**Observed unscoped Worker:** real XML source and branch/node occurrence census can complete, but the actual Worker explicitly emits `engineeringAcceptance:'NOT_ASSESSED'` and `fullFactPopulationAccepted:false`. A real SHA-256 `createPreviewBasis` passed to `createGcPwPreviewWorkerFactPort` correctly causes `ENGINEERING_NOT_VERIFIED` **before** consulting any positive engineering fact read model or permitting a Weight decision. That is the correct safety outcome, and proves the current Worker cannot be an accepted positive FactPage producer merely by wiring a method.

**Observed selected source:** a request with explicit `scope.selection` receives `SCOPED_ENGINEERING_PENDING` from the actual Worker, without an ALL-population completion. This is a verified low-level safety gate but **not** proof that the authored B1 Owner picker forwards the selection into the Worker (the earlier #133/#212 UI handoff remains separately RED/blocked).

**Required A2-positive acceptance:** the B1 sole writer must provide a verified, full-population `FactRecord` engineering producer using the original source + selected zone identity and content-bound `basisId`; an integrator must feed its paged read model through the existing `createGcPwPreviewWorkerFactPort` and `openGcPwPreviewWeightSession`; the independent source census and all physically required fields must match. No artificial flag upgrade, fixture-only `verifyEngineeringComplete`, legacy `nodeRows` re-labelling, double geometry computation, automatic Match-1, or blocked selection fallback is admissible. Keep data path read-only/shadow until #96 and #133 authorize writer and file seams.

**This narrows the next workpack:** prepare a B1-authorized *real source-selected Worker fact producer / census* followed by the existing GC-PW shadow port, not a new common service and not a local Preview UI weight-label patch. #239 is test-only and is not intended to merge into #237's conflicting test branch without separate reconciliation.

## 7B. Independent public-original GLRD Worker source census — completed

**Hosted original input, not an invented minimal fixture:** `Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml` on `main@0cda581c`, Git blob `8769ffe538ecacc621daf39919ca00ba27008211`, **627,599 bytes** and SHA-256 `923a2b493483ecaaebe696f3d08a0b688f3ce3c9f456fb11b8e6a5889eea22ba`. This is a public source benchmark for B4, **not** the Owner-private 28-branch or 808-page input.

**Verified with actual Worker module:** [test-only DRAFT PR #239](https://github.com/reallakshman19/3D_Converters/pull/239) HEAD `ed62a295e65ee928271509a508e1f3a329feac96`; [hosted run #38454738869](https://github.com/reallakshman19/3D_Converters/actions/runs/38454738869) **SUCCESS 13/13 Node tests**, existing Chromium and docs parity passed. Test independently enumerated **41 original Branch and 1,166 Node tags**, then executed the current `xml-cii-adapted-preview-facts-worker-entry.js` message handler and verified its complete original `sourceOccurrences` census and coverage return exactly 41/1,166. The Worker still truthfully returns `engineeringAcceptance='NOT_ASSESSED'` and `fullFactPopulationAccepted=false`; those flags are **correct and not to be upgraded without positive facts**. A separately verified scoped request fails closed with `SCOPED_ENGINEERING_PENDING`.

**Owner/writer implication:** independent *source-census custody* is demonstrably possible for 1,166 nodes, so the missing capability is **positive original-occurrence-bound physical engineering fields and selected-scope forwarding** rather than an inability to enumerate the original XML. Do not confuse physical Node coverage with verified weight fields, approved Match-1, authenticated per-file Zone selection, a browser-based GLRD Preview or native CII correctness. Implement positive facts only through the B1 lease + #96 GC-PW contract review, and retain their independent full-population/cancellation oracle.

## 8. Current engineering stop line and exact successor action

- Keep **PR #237 OPEN/DRAFT/RED** at `eb673e45...` and product main unchanged. Its two deliberately failing Preview oracles are **evidence**, not a reason to throw tests away or modify unowned files.
- This ADR is a **design-only candidate**; it claims no native browser performance, real 28/808 replay, independent reviewer consent, new code coverage, GC-PW schema change or release acceptance.
- **Smallest next executable authorized workpack after D1–D5 approval:** adapt the *actual authored* selected source/scope to `openGcPwPreviewWeightSession` in read-only/shadow mode with a real bounded Preview Worker `factPageProducer`; demonstrate a content-SHA and original-ordinal receipt from the same source that the normal button consumed. Do **not** mutate Weight or Run in that first workpack. Publish exact parent/fallback browser/CI evidence before broadening.
- Until approval, an independent reviewer can perform a **read-only A0 source/call-site audit and ADR review** and publish `PASS / CHANGES_REQUIRED / HOLD` with exact source refs, no permissions invented.

```text
XML229-GCPW-ADR | BASE=0cda581c737572180aa64310461764e8a5b78fdf | STATUS=PROPOSED_DESIGN_ONLY | EXISTING_GCPW=REUSE | PROD_UI_WIRING=NOT_PROVEN | PR237=HOLD_PREVIEW_RED | OWNER_D1_D5=PENDING | CODING_AUTHORITY=NOT_GRANTED | v3.6=SKIPPED
```
