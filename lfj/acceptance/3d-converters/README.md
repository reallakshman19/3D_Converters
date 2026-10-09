# LFJ #1104 / I0: 3D_Converters independent integration baseline

**Owner / coordination:** [#1104](https://github.com/reallaksh19/3D_Converters/issues/1104), parent #1042, neutral runtime provider #1105. **PROTOCOL_REF:** reallaksh19/Common@f8b3325f562b14b93b4ad5295d4665702d7a4616:skills/engineering-pr-delivery-v3.2. **Investigation HEAD:** 09bf832711b04afd476e51cef50920983d17fffb. **Claim status: I0 SOURCE AUDIT ONLY.** No direct migration, full browser result, performance pass or semantic points from this file.

## Actual original-source call chain and claimed owners

| Domain | Source flow verified on initial head | Required migration boundary |
|---|---|---|
| Resolver intake | xml-cii-adapted-events.js lines 91–97: readTextFile(File), retain stagedJsonText | R12: immutable Blob/Worker session, content identity, no full UI-owned JSON copy |
| Resolver scope | xml-cii-adapted-resolver-scope.js lines 9–40: length/first+middle+last-96 sample key and old scoped parser; xml-cii-json-hierarchy-scope.js lines 159–196: JSON.parse at All and selected slices | R12: committed LFJ occurrence query; selected set complete and keyed to immutable source digest+revision |
| Resolver engineering | xml-cii-adapted-events.js lines 208–226: synchronous runStandaloneResolverJsonTrace; xml-cii-resolver-json-trace.js owns XML-DTXR facts | R13: application Worker with existing domain interpretation, basis for XML/config/selection and source revision |
| Resolver output | xml-cii-adapted-events.js lines 249–272: full CSV in UI; xml-cii-adapted-resolver-json-trace.js lines 258–292: HTML tree innerHTML | R13: paged safe render, downloadable fully validated trace; source-derived strings escaped |
| Enrichment intake | sj-app.js 402–415: await File.text; 139–157: JSON.parse during tally render | R14: original source-backed index, complete bounded tally |
| Enrichment domain | sj-app.js 419–432 synchronous runEnrichment; sj-enrichment-engine.js lines 28–65: JSON.parse, topology/PSI/engineering generation | R15: Worker computation preserving application-owned material/rating/geometry/PSI semantics |
| Enrichment export | sj-app.js 299–316: XML, audit JSON, trace CSV | R15: independent full output corpus checks, no clipping |
| Runtime | lfj/ports/committed-worker-query.mjs 78–140: close source before returning occurrence page reader | #1105 only: neutral bounded source-backed selected-value session (avoid overlapping R10/IDB owners) |
| Deployment | docs/lfj/deployment-manifest.json: resolverWired=false, engineeringReady=false | #1097 + R12/R13 app-owner: real docs browser adoption, not just file mirror |
| GC-PW | Preview engineering sourceId/basisId, Weight frozen Match-1/Final, emitted CII remain domain-owned | NO source SHA/pointer may be substituted for physical engineering identity or output authorization |

## Independent observed RED candidates

1. **Sampled-key collision:** valid 1968-character JSON sources with changed OWNER_ZONE at offset 474 have equal old cache key; actual independent scope index changes ZONE-A to ZONE-C. This occurs in the real production cache function (scope blob b5cd496f388a46c70aa280167a32fcd95278d6ec). Existing file-upload state resetting may mask this path in some UI flows; actual browser supersession must be tested separately.
2. **Malformed JSON false-empty:** production buildStandaloneDtxrPositionGroups returns [] for truncated JSON, not typed invalid source (ledger blob faf632afeee59d72c861349c90dec9e10c1ea7a9). Independent actual user trace acceptance must reject parse errors, not guess every higher-level caller is affected.
3. **Deployed integration absent:** docs LFJ module manifest explicitly marks resolverWired=false and engineeringReady=false. Must not change flags based on this isolated test.

## Executable red and characterization semantics

From repository root:

- normal: node --test lfj/acceptance/3d-converters/source-reality-baseline.test.mjs
- intentionally RED: LFJ_I0_ACCEPTANCE=1 node --test lfj/acceptance/3d-converters/source-reality-baseline.test.mjs

**Normal passing = accurate baseline defect reproduction, NOT an integration pass.** The acceptance-mode tests intentionally fail until original behavior and deployed app integration are repaired. Upon real app migration, replace these old-module-only probes with actual served browser+download tests: passing them alone MUST NOT certify #1104.

## Real input/oracle register

- Benchmarks/1885Sjson/Sjson.json — 733806 bytes, fixture-manifest reports 279 original and enriched nodes, 163 records, five stage2 branches. Produced by tools/generate-1885-stagedjson-fixtures.mjs. Existing SHA of generated artifacts are **candidate** goldens until an independent engineering review signs expected outputs.
- Benchmarks/1885_NC/1885_NC.json — 10232634 bytes; accompanying original topology XML, canonical topology, trace ledger are **candidate** oracles, not automatically accepted.
- Authentically populated 30 MB / 90 MB — source files and independent expected output currently **NOT VERIFIED**. Synthetic repeats, whitespace padding or clones only count as artificial stress, never as real-source acceptance.

## Required next real browser end-to-end benchmark, not executed by I0

**Resolver:** fresh deployed docs app → actual File selection + original XML/master/config → LFJ source custody/Worker/durable IDB commit → ALL/Zone/explicit selection → real engineering Build/Refresh → trace first/mid/last paint → download node-wise and evidence CSV → independent full parsed output oracle.

**Enrichment:** fresh deployed docs app → actual File selection → LFJ session/tally → run real enrichment → audit/trace paint → download XML+audit+CSV → independent topology/PSI/material/weight/unknown field validation.

**Stage marks:** T0 input selection, T1 SHA verified, T2 Worker admit, T3 durable index transaction complete, T4 scope digest, T5 useful scope paint, T6–T8 engineering begin/end and useful result paint, T9 download request, T10 file complete, T11 independently parsed and verified. Record stage time + complete T0→T11, cold/warm separately, peak pending transfer, memory/IDB, main-thread long tasks, input latency, full original/selected counts, download SHA and source/basis revisions. Use 30+ trials for small/10MB p95 and >=5 complete authentic 30/90MB raw repetitions; no stable p95 claims from only five runs. Performance thresholds require measured red baseline and approved PLAN_UPDATE; correctness/stale-source exclusion/authorization cannot be traded for speed.

**No parallel edit conflicts:** This audit path is separate from #1105 provisional code, #1096 storage, #1097 docs mirror and R12/R13/R14/R15 application paths. First actual application edit requires unique writer lease and V3.2 claim-first/graph-diff amendment. Original R18 cross-repo G1 remains open; a distinct 3D-only gate must be admitted for #1104.
