# LFJ/V4 — Resolver-first vertical slice (Owner priority update, 2026-10-08)

**Classification:** owner-authorized priority and implementation-sequence plan; governance-only draft, not runtime code, accepted evidence, a release gate, or amendment to the currently released machine proposal. **Parent:** [3D_Converters #1042](https://github.com/reallaksh19/3D_Converters/issues/1042). **Protocol:** [Common V3.2](https://github.com/reallaksh19/Common/tree/957377de11843f78dd7210450c8e5a99b859eea9/skills/engineering-pr-delivery-v3.2), current ENFORCED proposal digest `sha256:a52f221e3ba736fe2f76c203ce5608b8b8fb612daa067f9d84958ceab8e11c9d`.

## 0. Lossless owner instruction and decision

> "resuable engine wired to 3 Resolver / JSON Trace.
>
> other app, place holder like not wired.
>
> First priority is 3 Resolver / JSON Trace. start coding, autorised.
>
> Make a detailed plan"

**Interpretation:** LFJ remains an app-independent portable engine. Its ONLY current runtime adopter is **3 Resolver / JSON Trace** inside `3D_Converters`. Do not wire LFJ into Enrichment, XML_Compare_Utilities Draft, Revision Compare, 3DMarkupTool, GLB/FBX workflows or authenticated remote APIs as part of the Resolver-first milestone. Preserve those applications' existing behavior, owner-approved longer-term V4 decomposition and format-specific rights; describe future ports and compatibility contracts as placeholders only. Owner authorization supersedes historical Pass-1 read-only wording prospectively; it does **not** authorize merging unfinished code, bypassing V3.2 claim-first admission, reusing an active writer's lease, or claiming untested engineering outputs.

## 1. Cold actual source truth / no false acceptance

Baseline heads at decision: `3D_Converters@f57b5799952e268ee57a91658ebae36ed723f43f`, `XML_Compare_Utilities@2e588a5469f463b177990d7f8683deb56ce48a0e`, `Common@957377de11843f78dd7210450c8e5a99b859eea9`. Recheck these before each code unit.

- Original [PR #928](https://github.com/reallaksh19/3D_Converters/pull/928) still unmerged. J01 [PR #992](https://github.com/reallaksh19/3D_Converters/pull/992) merged; Resolver's legacy index exists on main.
- R01 (root profiles), R02 (ancestor ownership), R03 (exact source custody), R04 (incremental tokenizer), R05 (original occurrence index) are native merged. [R05](https://github.com/reallaksh19/3D_Converters/issues/1068) proved an independent **10,539,386-byte** bare-array source at SHA-256 `e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a`, with **270** array roots and **339,987** JSON values; Node source-index time was reported around **93.6 s**, NOT an accepted browser performance target, and not a trace/XML golden.
- Canonical [R06 #1071](https://github.com/reallaksh19/3D_Converters/issues/1071), [draft PR #1075](https://github.com/reallaksh19/3D_Converters/pull/1075) has an EXCLUSIVE active writer for `lfj/transport/execution/**`. U01 strict worker provenance and U02 bounded transfer ACK are reportedly implemented/qualified; U03 consumed-byte progress and U04 fault matrix remain open. Do not duplicate or push into this writer's branch.
- Legacy [Resolver hierarchy scope](https://github.com/reallaksh19/3D_Converters/blob/f57b5799952e268ee57a91658ebae36ed723f43f/tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js) searches nested slices with `fieldString()`, so child `OWNER_ZONE` can contaminate a parent's scope; unsupported roots and All invoke whole-source `JSON.parse`; `source.length` is labeled `byteLength`. [Resolver UI](https://github.com/reallaksh19/3D_Converters/blob/f57b5799952e268ee57a91658ebae36ed723f43f/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js) synchronously builds the index on render and caches by length plus three 96-char samples. [event handler](https://github.com/reallaksh19/3D_Converters/blob/f57b5799952e268ee57a91658ebae36ed723f43f/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js) is `async` but calls synchronous `runStandaloneResolverJsonTrace`. Provider correctness is NOT live adopter correctness.

## 2. The only live vertical data path

```text
Resolver StagedJSON File/Blob + authoritative XML/CII input
  -> immutable original-byte SourceSnapshot (R03 SHA-256 + source revision)
  -> explicit SchemaProfile (R01) + byte grammar (R04)
  -> original occurrence path/spans (R05) + ancestor ownership (R02)
  -> trusted Worker execution (R06), fault/cancel/stale terminal lifecycle (R07)
  -> exact ScopeQuery and Selection (R08)
  -> complete counts + bounded source-order QueryPages (R09)
  -> browser/Node same results and source ports (R10)
  -> 3 Resolver UI source selector, scope tree, state and paging (R12)
  -> Resolver trace computation in isolated job, XML/CII authority retained (R13)
  -> independent Resolver-only acceptance checkpoint
```

The shared LFJ package owns custody, profile capabilities, worker/job transport, stable occurrence identity, selection/paging, progress, revision fences and typed errors. The Resolver adapter owns XML/trace semantics, POS/PS/DTXR, bore and branch rules, CII field resolution and any engineering permissions. **Never equate LFJ SHA sourceId with existing GC-PW `basisId`, `physicalOccurrenceId` or any downstream match identity.** A source reader/index/viewer capability NEVER implicitly grants engineering edit/export or CII authority.

**Boundary:** source parse, scope discovery and expensive trace resolution must not block the UI; moving only the index to a Worker while leaving the full trace synchronous fails the objective. Source-level `File.text()` for large input, stringifying whole files to cross the Worker boundary, whole-doc selected-metadata regex and silent main-thread fallback are prohibited. Where legacy behavior must be preserved for small files, use an explicitly documented threshold/capability path, NEVER an unnoticed large-file degradation.

## 3. Work sequence: one claim-owned responsibility and writer at a time

| Step | Existing leaf / independent question | Owned code surface | Direct RED then acceptance |
| --- | --- | --- | --- |
| A0 | Owner intent, dependency and fixture inventory | `lfj/governance/**` only | Readback owner priority and latest main/PR leases; unchanged 130-point graph until validated change |
| A1 | R06: Is all large execution truly off-main and bounded? | `lfj/transport/execution/**` **existing writer #1075 only** | U03 real Worker byte-consumption, U04 no-ACK/crash/invalid-protocol; no inline parse |
| A2 | R07: Can cancel, crash or supersede ever publish stale results? | `lfj/transport/lifecycle/**` | Four semantic units: terminal cancellation, crash refusal, revision fence, retry safety |
| A3 | R08: Does selection include exact original occurrences? | `lfj/query/selection/**` | Include/exclude semantics, repeated-name siblings, ancestor/owner conflict and unsupported-scope negatives |
| A4 | R09: Do bounded pages reconstruct complete selected source without lies? | `lfj/query/pages/**` | One-row page-union oracle, deterministic source order, stale cursor refusal, full counts despite page cap |
| A5 | R10: Do Node and actual browser ports agree? | `lfj/ports/**` | Same byte SHA/revision/owner/selection/page facts on Node 22/24 and Chromium Worker |
| A6 | R12: Can Resolver display exact owner scopes without foreground scans? | `tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js`, `ui-adapted/xml-cii-adapted-resolver-scope.js` | U01 owner correctness, U02 occurrence IDs, U03 same-size-interior-edit cache invalidation, U04 source complete despite limited rendered rows |
| A7 | R13: Does actual Resolver return correct trace/CII facts through Worker? | `tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js`, `ui-adapted/xml-cii-adapted-events.js` | U01 full-vs-scoped trace, U02 complete POS/PS/DTXR/refs, U03 existing engineering authority, U04 stale result refusal |
| A8 | RESOLVER_VERTICAL_ACCEPTED — independent, **non-progress-bearing checkpoint**, NOT R18 | Resolver-source golden and browser acceptance evidence | Real populated source, independent XML/trace/CII outputs, error/worker/heap/interaction budgets and source/docs parity |

**Do not create duplicate R06 children/PRs or write outside a responsibility's lease.** R07-R10 and R12-R13 use the existing **24-leaf, 130-point ENFORCED proposal** (unless an independently validated new plan revision is necessary). Admission of each child follows the exact pinned checker and predecessor evidence. If a unit exceeds the V3.2 budget, split/reapprove responsibility while conserving claim weights before continuing. Preserve the four V3.2 publications: `IMPLEMENTATION_PLAN`, `PLAN_UPDATE`, `TASK_EVIDENCE`, `TASK_RESULT`, with exact-head evidence and independently authored RED before GREEN.

## 4. Resolver-specific contracts to implement / satisfy

- `SourceSnapshot.v1`: immutable byte SHA256, byteLength (not JS UTF-16 string length), original sourceRef (separate from digest), source revision, backing/encoding, limits.
- `SchemaProfile.v1`: exact supported root (`array`, `hierarchy`, `objects`, `branches`, typed-single only where actually proven), producer/schema version, field ownership policy and capabilities; reject ambiguous dual envelopes and unknown shapes with typed errors, not All fallback.
- `IndexManifest.v1`: source SHA+revision, profile fingerprint, all-value and all-branch counts, complete/partial status, orphan/duplicate diagnostics, source-order ancestry and exact UTF-8 spans.
- `Occurrence.v1`: typed RFC6901 ordered path with escaped `~`/`/`, ordinal, parent/sourceRef identity and own-field span; `name` is a display label, NEVER identity.
- `ScopeQuery.v1` / `Selection.v1`: explicit selection/all/none, include/exclude and descendant rules, SHA+revision+profile+selection digest, stable cursors, fail-closed capability mismatch; page row count DOES NOT bound total selection.
- `WorkerJob.v1`: protocol/job/request IDs, sourceRef and revision, worker provenance, progress based on bytes actually consumed, ACK/backpressure, cancel/fault and one terminal outcome. UI must suppress out-of-order responses.
- `TraceExportManifest.v1`: input XML basis, staged source SHA, selection digest, full source counts, selected occurrence counts, output record counts/digests, original CII authority/ref lineage, adapter version, explicitly supported output rights, rejected/ambiguous facts and untouched-field oracles.
- Future API, Enrichment, XCU Draft, Revision and 3DMarkup: only interface/capability placeholders documenting prospective adaptors; no import, event hook, Worker swap, downstream write path or implied support.

## 5. RED-first independent oracle and source registry

**OWNER_REPOSITORY_REAL input** (not fabricated): [ATTRIBUTE_managed_stage.json @ verified base](https://github.com/reallaksh19/3D_Converters/blob/f57b5799952e268ee57a91658ebae36ed723f43f/Benchmarks/Managejson%20to%20Input%20XML/ATTRIBUTE_managed_stage.json); bytes `10,539,386`, SHA256 `e465fa696c80516868349032af6cf1976d9a180c86ea2a7b9eab28c6436fa92a`, root bare-array count `270`, independent full JSON value census `339,987` as asserted by [R05 test](https://github.com/reallaksh19/3D_Converters/blob/f57b5799952e268ee57a91658ebae36ed723f43f/lfj/index/source-occurrence-index-real-source.test.mjs). These are test-specified original source facts; browser 30/90 MB acceptance and XML/CII output goldens remain unproven.

**SYNTHETIC RED, never marketed as real input:** (1) parent without own Zone, valve child with `OWNER_ZONE`: parent remains unscoped; (2) identical-name sibling branches: distinct source paths; (3) equal-length interior source mutation outside first/middle/last cache samples: force a new digest/revision/index; (4) dual envelope `objects` + `hierarchy` refuses unsupported ambiguity; (5) invalid UTF-8, duplicate keys, depth, broken Unicode, bounded numeric tokens; (6) no Worker, fake Worker, crash, silent fallback, slow ACK, cancellation race; (7) row limit 1 union exactly equals complete selected scope; (8) stale source/cursor/output after replacement; (9) trace parity across full and zone selected against independently authored XML/DTXR/POS/PS expectations; (10) source-untouched and permission-negative cases.

**Still missing and hard veto:** authentic populated >=30 MB and 90 MB-class original source plus independent sources/goldens approved by a separate custodian; expected final trace/XML/CSV/CII manifest with exact output digests, counts and engineering invariants (not produced by the same converter under test). Unknown expected output fields must remain UNKNOWN, not guessed.

## 6. Proposed unmeasured performance and correctness thresholds

**PROPOSED/UNMEASURED; must be baselined and approved on named reference hardware and exact browser versions before becoming release limits.** Interactive input-to-paint p95 at most **100 ms** while Worker indexes; no LFJ-attributable UI task above **50 ms** from source scanning; scope/page UI projection bounded to **<=200 rows per page**; source transfer currently R06-targeted **<=64 KiB outstanding one-at-a-time** until ACK; no large-source main-thread JSON parse. Cancellation observable promptly, target acknowledgement p95 **<=250 ms** at explicit worker yield checkpoints; no old-revision result accepted. For the real populated 30/90 MB reference corpus, record intake/index and first safe page times, peak UI and Worker heap/RSS separately; **no index-time or memory pass is inferred** from existing Node 10.54 MB test (~93.6 seconds). Optimize measured bottlenecks under an independently owned leaf when necessary, without weakening source completeness.

Test Node 22/24, actual Chromium module Worker and failure scenarios; compare source facts/output against independent oracle, not against a second invocation of the same LFJ implementation. Preserve docs mirror parity and existing 4 Preview/Weight/Mode B/CII output tests as relevant nonregression gates.

## 7. Checkpoints, hold points, future adapters

At A1/U03-U04 → A2 → A3 → A4 → A5 → A6 → A7, publish exact source commits and `TASK_EVIDENCE`; let the V3.2 provider derive title/scoreboard P/E rather than hand-edit it. Keep R18 as the original **multi-repo JSON release gate** (still OPEN) and R24 as binary gate (still OPEN). Resolver-only acceptance **does not complete either**. Deferred applications must be marked `PLACEHOLDER_NOT_WIRED`, neither `ADOPTED` nor implicitly broken/uninstalled.

**Next executable code action:** the existing R06 writer completes independently verifiable U03 consumed-byte progress and U04 transport/fault matrix at exact head; then admit R07 in its own write surface, proceeding in dependency order. In parallel, independent Resolver RED oracles may be designed/reviewed read-only, but do not materialize R12 as completed or merge product wiring before R09/R10 gates. Original CII/Preview/Weight engineering ownership is unchanged.
