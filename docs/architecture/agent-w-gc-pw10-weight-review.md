# Agent-W GC-PW/1.0 Weight proposal and review — bounded implementation ADR

**Responsibility:** #1001; governs both Phase 6 Match-1 and Rigid Weights Need Review / Final Match-2.
**Base:** main@485310e7f5e5472a1b189fde6d4dff677af071f2.
**Protocol:** reallaksh19/Common@c6cbe524915281760b516660d4330ba0f51d44b4:skills/engineering-pr-delivery-v3.2.
**Contract:** #999 GC-PW/1.0. No domain meaning changed here.

## 1. Reality check and rejected alternatives

Existing code already contains the authoritative bore/rating indexed scorer (`weight-valve-hints.js`, eligibility at 88–109, ranking at 196); matching includes exact length (default ±6 mm), semantic DTXR/node hint, rejected length cases, inferred interpolation/extrapolation, special factors. `flange-weight-fallback.js` remains the established fallback. Do **not** replace these formulas with another heuristic or promote the synthetic statistical validations to a source oracle.

Code paths currently duplicate fact preparation: `preview-dryrun-core.js` and `preview-rating-authority.js` resolve Rating/weight in Preview; `weight-match-renderer.js:425–535` separately invokes worker/fallback geometry then ranks; `rigid-review-mode-a.js:12–45` and integrator-owned `run-workflow*.js` reprepare/re-rank final-review facts. Worker `master-dataset-service.js` and bore/rating index already improve scaling. Existing Match-1 basis provenance and final precedence live in `rigid-weight-authority.js`; preserve their older config projections until #999 integrator sequences migration.

`weight-match-renderer.js:309` has a cache based on filename/size, staged JSON length, master row count and metadata. Equal-length replacements are not detected. `weight-match-model.js:245–291` uses branch name and positive node number or a negative-node fallback; repeated branch/component descriptors can collide. `mode-a-rigid-review-tools.js` skipped hidden rows during Use All; consolidated Final popup prepopulated *unaccepted* suggestions in inputs. The latter two are corrected in this branch.

Rejected: (a) UI-only spinner/timeouts; (b) separate Weight/Final scorers; (c) rebuilding XML geometry in a supposedly reusable weight kernel; (d) remote HTTP/API server before a separately governed transport; (e) replacing mature algorithms for architecture aesthetics.

## 2. Immutable data and custody

`weight-facts-review-service.js` is DOM-free, transport-neutral and knows only GC-PW envelopes, scopes, occurrence identity, kg, accepted stages and mass conservation. It rejects invalid schema/version/digests, reused basis identifiers carrying different facts, duplicate/cross-source occurrence identities, stale proposals/commands and nonfinite values. `openBasisJob` provides asynchronous loader progress, cancel/failure events and late-result fencing; cancelled jobs do not publish facts. Deterministic `getFacts` and `getProposals` paginate the full population, independent of visible UI rows.

`weight-facts-xml-cii-adapter.js` is a **temporary read-only** bridge from already prepared Weight rows to `FactRecord`, with `sourceId/branchOccurrenceIndex/nodeOrdinal` identity. If legacy ordinals are missing, input row order is an explicitly diagnosed temporary fallback bound to the exact InputBasis. It never gives `NodeNumber=-1` standalone identity. Rating is consumed only from existing authoritative facts; proposed, unresolved and conflict Rating/geometry facts cannot be scored. Existing `rankXmlCiiWeightCandidates` and flange fallback are invoked unchanged. Rank-1..5 positive candidates are proposals, and length-rejected candidates remain auditable; a 0 kg fallback is **not** a proposal.

GC-PW `basisId`, source, master/mapping, selection, config and override SHA-256 are required. The **upstream fact producer** must independently compute/check those cryptographic digests; the ledger validates envelope structure but cannot attest raw source bytes it never receives. The index/scorer config must be revision-pinned by the host. Do not reuse one mutable master/config object against an unchanged basisId.

## 3. Review decisions and run invariant

A proposal has no acceptance authority. `applyDecisions` accepts explicit commands and checks the per-source `expectedDecisionRevision` before atomically committing; a replay of the identical `commandId` returns its prior result. Cross-source keys, duplicate identities and silently changed accepted values are rejected. The accepted Match-1 and Final Match-2 records have separate revision namespaces, and `freezeSnapshot` produces independent immutable references. A later changed review invalidates old frozen run snapshots.

`verifyRun` requires all physical component identities bearing a mass fact, accepted positive kg (source if not explicitly overridden by frozen Match-1/Final), the live accepted-stage snapshot refs, and every unique child allocation. It checks sum(child kg) equals parent physical kg, rejects duplicate children and missing occurrences, and checks an **explicit** run-boundary output `unit/scale/value` transform. It never multiplies physical kg internally. Full source→XML-CII→final CII parity belongs to #999 integration, not to statistical weight tests.

## 4. Integration required — owned by #999

**INTEGRATION_REQUIRED-P:** Preview #1000 should deliver `openBasis(BasisRef)` and `getFacts({basisId,sourceId,subjectType,cursor,limit})` with frozen authoritative Rating, bore, length/DTXR, physical `occurrenceId`, source weight, authority/provenance. `weight-facts-xml-cii-adapter.js` can be deleted after the producer passes contract tests. No Agent-W modification to Preview modules.

**INTEGRATION_REQUIRED-WORKER:** Integrator must lease the canonical worker/dataset reader at master SHA+mapping revision and call `createXmlCiiFactWeightScorer(config,scoringRevision)` with immutable master context, or inject an equivalent worker scorer returning identical `Proposal`/audit records. A bare file size, count, FNV or mutable config is not sufficient as a master basis. Stale work requests must be rejected *before* UI acceptance.

**INTEGRATION_REQUIRED-UI:** Attach a source-bound session (BasisRef, canonical facts, ledger) to `bindXmlCiiWeightMatchPhase` in shared Weight renderer and to Mode A consolidated Weight. UI-selected candidates must issue `DecisionCommand(action='accept-proposal')`; manual entries use `enter-manual`; no prefilled proposal may write accepted state. Persistent config projection should happen only from frozen Match-1 review. Apply/bulk must enumerate all eligible occurrence IDs, not DOM rows.

**INTEGRATION_REQUIRED-FINAL:** The single Final popup lives in integrator-owned `xml-cii-adapted-run-workflow*.js`; migrate to the same service/candidate basis. Mode A Final popup (`xml-cii-adapted-rigid-review-mode-a.js`) must likewise send distinct `final-override` decisions and freeze `Rigidmatch2` before the integrator runs; cancel must leave the ledger unchanged. Explicit Rating/DTXR rerank demands a new InputBasis, not silent mutation of acceptance. Integrator-owned final writer should call `verifyRun` with actual physical-to-CII child allocations, original source occurrence IDs and explicit scale, before exporting.

No shared workflow, phase registry, Preview, worker protocol or writer files were edited by Agent-W. No API backend added.

## 5. Validation ledger / remaining vetoes

| Evidence | State |
|---|---|
| Exact-head source analysis, branch isolation and code audit | Examined; W0 issue comment |
| In-memory fact/decision/portable scorer tests | Isolated V8 runner, see W1/W2 issue checkpoint; native Node hosted CI still needed |
| Synthetic master 1,595 rows and ±6 mm/rejected method | Tested in isolated V8 only, not owner-scale proof |
| Original 385/10699/383/1595 masters, browser cold/warm and event-loop gap | NOT_RUN, owner dataset/runtime unavailable |
| Source/XML/master → independent CII engineering output, PL01+PL06 19/871 | NOT_RUN; integration dependency |
| Real browser both Match-1 and Final popups, cancel and stale UI cases | NOT_RUN |
| Local/browser worker portability and stopped/stale reply | In-memory async fence tested; real worker NOT_RUN |

Do not mark WW1–WW6 or full project acceptance completed until the live-run gates and integrator-owned writer checks actually pass.

## 6. Checkpoint W3 source-owned lifecycle / occurrence safeguards (not complete integration)

- `weight-match-model.js` now carries original `branchOccurrenceIndex` and `nodeOrdinal` into existing prepared rows without editing Preview. Identical `NodeNumber=-1` values get distinct physical identities through the read-only adapter.
- `weight-match-renderer.js` no longer places a top-ranked proposal in an unaccepted weight input. A candidate still requires a selection/explicit input event. This is a DOM-path safeguard, not proof that all save pathways are ported to the ledger.
- `xml-cii-adapted-weight-match-v2.js` now writes both explicit candidate and typed manual values to Match-1. Previously a typed Match-1 entry was silently projected to Final Match-2. `rigid-weight-authority.js` no longer deletes an existing Final value when a Match-1 weight changes, preserving independent stage precedence. Both root/docs modules are mirrored.
- The XML-CII scorer pins a copy of master rows/config on construction, and proposals include scoring revision, method, mass, row ordinal/source id and complete rejected audit. Legacy flange fallback issue-level provenance is retained at the proposal level.
- Full ModeA/individual Match-1 and single/ModeA Final acceptance are **not yet wired** to `applyDecisions` of the new session. The #999 integrator must attach source-bound, digest-attested FactRecord sessions to these runtime paths and writer; no self-parity acceptance is claimed.
- Integrator I01 `contracts/gc-pw-v1/contract.mjs` arrived on main at `1fb7abef62f3590f647ac3c6d482813904a5ca73` after this branch fork. Local envelopes were checked against its exact validator source (17 passes across BasisRef/FactRecord/Proposal/Page/DecisionCommand/JobEvent); `assertBasisDigest` against real input bytes and native browser transport still pending. InputBasis `Page.complete` describes finished computation, not terminal pagination.

**Cache veto:** The existing `weight-match-renderer.js` cache fingerprint remains based on metadata (filename/size, staged JSON length, master count, overrides). It must not be promoted as GC-PW basis identity. The future worker/UI bridge must use validated full-source/master SHA-256 or bypass that unsafe restored result. No performance claim/unsafe cache rewrite was made without owner-run timings.

## 7. Portable persistence seam (W4 independent unit)

`createWeightReviewService({score,digestReview})` accepts an injected canonical SHA-256 digest function (the integrator's `digestCanonical` is the intended provider). `exportReviewState({basisId})` emits a lossless, digest-sealed GC-PW envelope with both per-source per-stage revisioned command journals and frozen Match-1/Final snapshots. `restoreReviewState({basisId,payload})` verifies the digest and exact live InputBasis, validates source occurrence membership, committed proposal identity/mass, command journaling and snapshot references, stages all mutations and refuses to overwrite a different existing accepted state. Idempotent re-import is allowed. Scope keys and snapshot IDs use tuple serialization to prevent delimiter-induced aliasing.

**Trust boundary:** SHA-256 integrity does not authenticate an attacker who may rewrite both payload and checksum. The integrator-owned store must authorize/read the persisted value and bind it to authenticated source/basis custody. This module contains **no localStorage, IndexedDB, worker protocol or HTTP**; no durable storage was deployed. A resumed run must re-attest canonical input source/master/geometry and reject stale review snapshots.

Independent test covers final override 22kg prevailing over Match-1 20kg after export/reopen/restore, child allocations 10kg+12kg, explicit 10x output conversion, digest tampering and same-basis accepted-state collision. Native browser/storage integration remains gated.
