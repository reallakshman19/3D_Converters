# XML229 — three problems, grounded in the benchmarks

02 November 2026 (Asia/Dubai). Planning and source study only; product repairs and engineering acceptance remain NOT_RUN.

Active recovery: [WIP report](../../agents/WIP-XML229-BENCHMARK-3FIX-20261102_workreport.md). Literal observations and file identities: [evidence](../../agents/evidence/xml229-benchmark-study-20261102.json). Reproducer: [read-only benchmark analysis](../../agents/evidence/xml229_benchmark_study_20261102.py).

## Owner scope and working understanding

The Owner identified three problems: shared/coincident node records including `-1`; combined nodal JSON restraints through restraint mutation into CII; and coordinate preservation when rigid splitting creates numbered nodes, followed by another node pass and the existing second weight pass. The Owner directed the agent to study the benchmark folder to understand the examples.

The Owner subsequently selected the [native attachment ownership WBS](xml229-native-ownership-wbs-20261102.md) **first**. This document now supplies supporting benchmark evidence and acceptance cases; its separate work order is deferred. The unavailable saved private run does not prevent public-source inspection under the selected WBS. Preserve all three engineering requirements when reconciling the current physical-vertex design and existing implementation candidates.

The source records demonstrate co-located numbered nodes, anonymous component endpoints, and repeated positive branch-junction nodes. Each case needs the correct physical connectivity and a preserved restraint list. A repeated numeric sentinel is not a global node identity. Co-location alone does not authorize joining distinct engineering connections.

## What was actually examined

The local folder contains 229 files across several conversion domains. This study concentrates on PSI116 XML, staged support JSON, CAESAR InputXML, and native CII. It does not claim that every unrelated benchmark was qualified.

Local HEAD is `a658ed0305a1745181938155b7f1c554f98ae283`. Reader/split/mutation source was inspected at pinned commit `5c39dd7bdbb7f2f63a686823b72bdb81909d52af`. This pin was the last observed V6 main; this study does not assert a fresh live GitHub main observation. Refresh live heads and claims before implementation.

| Literal source | Observation | Consequence for the plan |
| --- | --- | --- |
| [EF-05 original XML](../../Benchmarks/EF-05-PRO.TEST.xml), nodes 50 and 60, first `/B4` branch | Both are ATTA records at `459657.72 -1481227.40 101259.55`, with different component refs. | Pass 1 must classify co-located support occurrences and their physical attachment before assigning an output node. |
| Same file, OLET ref `=1006649732/119347` | Endpoint 1 / center 0 / endpoint 2 have numbers `-1 / 70 / -1` at `459657.72 -1481727.40 101259.55`; another port has its own geometry. | Preserve endpoint role, component occurrence and branch. Do not use all `-1` records as one dictionary key or erase every record at a shared coordinate. |
| [BM2 original XML](../../Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01%20-%20BM2.xml), first branch | Nodes 20 and 30 have identical XYZ and distinct ANCI refs; node 30 contains an authored `+Y` restraint. | Resolving a shared station must retain the authored restraint and explain the resulting node identity. |
| [EF-05 enriched XML](../../Benchmarks/EF-05-PRO.TEST_enriched-3.xml), node 90 | One node contains `+Y` and `GUI`, with gaps `0` and `6`; DTXR_POS contains the REST and GUIDE member descriptions. | The entire per-node list must reach CII. A zero REST gap and nonzero GUIDE gap are separate values. |
| Same enriched file, node 160 | One node contains `+Y`, `GUI`, `LIM`, with gaps `0`, `20`, `20`; REST friction is `0.3`, GUIDE/LIMIT friction uses `-1.010100`. | Preserve type, gap, stiffness, friction/sentinel and direction per restraint. A pipe-delimited trace describes several members on one node. |
| [BM_CII InputXML](../../Benchmarks/INPUT%20XML%20to%20CII%202019/BM_CII/BM_CII_INPUT.XML) and [native benchmark CII](../../Benchmarks/INPUT%20XML%20to%20CII%202019/BM_CII/BM_CII%5BBenchmark%5D.CII) | Native RESTRANT has 8 blocks, each with 6 slots and 4 physical lines per slot. Node 35 occupies three slots; node 255 occupies two. | Preserve multiple restraint slots on one output node; validate actual emitted CII independently. |
| [ASIM staged archive](../../Benchmarks/ASIM-1836_managed_stage-2.zip) | Selected support records sharing PS-family text occur at several positions. A matching REF also appears with different branch/position values from EF-05. | Establish the selected coordinate transform and branch/source basis. A tag or archive name alone cannot qualify the exact XML/JSON pairing. |

The enriched EF-05 file is a historical artifact, not output generated or accepted by this study. Its observed combined restraints establish concrete examples; their complete engineering correctness remains a separate qualification.

### Branch-scoped census

Positions in this table are grouped by exact stored Position text within each branch. These are observation counts, not a tolerance-based merge policy or a proposed count of physical nodes.

| File | Branches | Node records | `-1` | `-2` | Coincident groups | Groups with positive and negative IDs | Nodes with multiple restraints |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EF-05 original | 41 | 1654 | 810 | 11 | 420 | 179 | 0 |
| EF-05 enriched-3 | 41 | 1165 | 465 | 11 | 76 | 46 | 40 |
| GLRD BM2 | 31 | 1196 | 790 | 0 | 347 | 114 | 0 |
| PL-BM1 | 28 | 1702 | 535 | 3 | 444 | 56 | 0 |

The specific meanings and allowed handling of each populated negative sentinel require the relevant format/source rule. In particular, XML NodeNumber `-1` and CAESAR property sentinel `-1.010100` are different fields and must not be conflated.

### Mutation evidence to qualify

Literal paired records show InputXML node 35 types `17,1,3` versus native CII types `14,2,4`, and node 255 types `17,7` versus native `14,8`. These are two representations of the same benchmark cases, not interchangeable numeric enums.

The inspected default mutation rows include `17→14`, `7→9`, `10→8`, `1→2`, `2→3`, `3→5`, `18→15`. The active imported configuration and source dialect must therefore be established before expecting a default mutation table to reproduce these benchmark pairs. This observation does not establish a defect in an actual selected run. Keep one mutation application per source value, its configured direction, and its before/after evidence explicit.

## Existing implementation surfaces

Source pin: `5c39dd7bdbb7f2f63a686823b72bdb81909d52af`. Paths and line numbers below refer to that pin; no source edits were made.

| Boundary | Inspected behavior | Required qualification |
| --- | --- | --- |
| `converters/scripts/xml_to_cii2019.py:535–540,656–753` | Default parser skips nonpositive numbers; cleanup can merge restraint lists while dropping a short arriving node, with separate shared-junction/weighted handling. | Follow original occurrence and restraints through the exact configured path; do not equate proximity cleanup with demonstrated physical attachment. |
| `tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js:381–493` | Split preparation protects repeated positive junctions, removes eligible coincident predecessor helpers, then promotes eligible length-bearing negative endpoints to new positive numbers and sets rigid markers. The allocation loop writes NodeNumber/Rigid, not Position. | Capture before/after occurrence, position, connectivity and restraint lists. Check all other cleanup stages too; a numbering-only loop does not prove the whole pipeline preserves geometry. |
| Same helper, `:595–629`; standalone `xml-cii-standalone-run-parity.js:225–249` | Existing preparation performs length annotation, split numbering and canonical cleanup for weight review. | Add the second node/attachment checks at the appropriate existing stage before Final acceptance; reuse the existing weight-review flow. |
| `converters/xml-cii2019-core/restraint-type-mutation.js`; `converters/scripts/xml229_prefinal_restraints.py:236–291` | Configured type mutation exists in JS and Python. Prefinal profile creation appends restraint elements with individual properties. | Compare both routes against source-specific, independently specified expectations; preserve individual members sharing a node. |
| `converters/scripts/xml_to_cii2019.py:369–400,1509–1554` | Parser accepts up to six restraint entries; writer emits six slots for each AssignedRestraint group. | Inspect populated and empty slots in the actual CII. Group capacity is already supported; prove correct list construction and attachment. |
| `converters/scripts/xml_cii_weighted_geometry.py:17–55` | Weighted source endpoints can receive temporary numbers; nonzero weighted physical hops have preservation rules. | Recheck identities and physical owner mass after node resolution; retain the existing second weight pass and mass authority. |

## WBS 1 — node consistency, first pass

| ID | Deliverable | Depends on | Acceptance |
| --- | --- | --- | --- |
| 1.1 | A fixture matrix of source branch/ordinal, NodeNumber, endpoint, component ref, XYZ, adjacency and authored restraint list. | None | Account for EF-05 50/60, OLET `-1/70/-1`, BM2 20/30, a repeated positive branch junction and a distinct co-located connection counterexample. Literal starting evidence is saved; physical classifications remain to qualify. |
| 1.2 | Reproduce how the current selected path resolves each case and identify the first incorrect boundary. | 1.1 | Each retained/aliased/removed/generated node has a justified relation to the source occurrence. Valid branch junctions remain connected; different positions or protected distinct connections remain distinct. |
| 1.3 | The smallest qualified repair, only if reproduction demonstrates one is needed. | 1.2 | First-pass node checks pass; authored restraints, component ownership, endpoint coordinates and bystander topology remain correct. Complete live grounding, Appendix A and writer custody before production mutation. |

## WBS 2 — JSON nodal restraints → mutation → CII

| ID | Deliverable | Depends on | Acceptance |
| --- | --- | --- | --- |
| 2.1 | Source-specific restraint expectations and the actual mutation configuration. | 1.1 | Resolve the representation difference in BM_CII 35/255; record source enum, configured rule and expected native enum. Include REST, GUIDE, LIMIT, explicit zero and sentinel cases. |
| 2.2 | Preserve the full restraint list on the resolved physical node through the existing mutation path. | 1.2, 2.1 | EF-05 node 90 retains two members and node 160 three; exercise 1–6 populated slots. Preserve each gap, friction, stiffness, direction and allowed connected-node reference. Apply mutation exactly once. Diagnose any unsupported overflow. |
| 2.3 | Independently read actual emitted CII restraint records and element references. | 2.2 | Every expected member appears on its intended output node, with no lost/extra slot or wrong node reference. A repeated type with different direction/gap is not discarded merely because its type matches another member. |

## WBS 3 — rigid splitting, coordinates and second passes

| ID | Deliverable | Depends on | Acceptance |
| --- | --- | --- | --- |
| 3.1 | A before/after split map for every affected source endpoint and new numbered node. | 1.2 | Existing source coordinates remain preserved under the declared coordinate representation. Promoted endpoints retain their source positions; any genuinely constructed point has a defined geometric basis. Preserve branch junctions, positive IDs and nonzero physical component spans. |
| 3.2 | Run the node checks again after split numbering and cleanup; recheck the complete restraint attachment list. | 1.3, 2.2, 3.1 | Detect new aliases/collisions, stale node references, accidental disconnections, zero-length artifacts and unintended movement. Rerunning the check is stable. No late rematching or geometry edit after Final acceptance. |
| 3.3 | Run the existing second weight pass on the resulting physical model, then qualify Final and actual CII. | 2.3, 3.2 | Each physical component retains its approved mass exactly once, including accepted zeros; component census and total mass reconcile. Actual CII geometry/restraints/mass agree with the accepted resulting model. Stale basis invalidates dependent approval. |

The dependencies identify engineering order, not appointed people or a mandate for new agents. No agents, timers, production patches or schema changes are created by this WBS.

## Validation and limits

| STATUS | OBSERVATION | ORACLE |
| --- | --- | --- |
| PASS | Literal XML census and selected EF restraint values; native BM_CII block/slot examination; machine-readable evidence read back. | Direct stdlib parsing and literal native-record decoding, with no production converter imports. Historical fixture acceptance is not established. |
| PASS, seven files | Core examined fixture bytes equal the pinned Git blobs. | Direct byte comparison and independently computed digests. |
| FAIL byte identity, two files | The supplementary sideload XML and JSON have worktree CRLF versus pinned Git LF. Initial all-nine exact-byte assertion failed; the difference is retained in the evidence. | Raw byte comparison; diagnostic CRLF-only comparison does not convert this failure to PASS. No source or expected hash was changed. |
| PASS | Nine WBS IDs and dependencies are internally consistent; document/evidence readback and local links verified. | Author checks; no distinct engineering review. |
| NOT_RUN | Selected-run reproduction of the three problems, physical equivalence qualification, repairs, actual newly generated CII comparison and browser/native acceptance. | Required source-specific execution and independent engineering expectations. |

The saved private bundle remains unavailable. It is required only for claims about that exact private run. Continue public benchmark isolation within the selected scope. Before production changes refresh live Git/GitHub, qualify Appendix A, resolve overlap and writer custody, and keep merge/release Owner-only.

Next: follow the Owner-selected native ownership WBS, currently read-only 0.1; use these literal cases as supporting expectations when tracing physical-vertex/member binding into the governed materializer/native handoff. Do not start this document's separate mutation-first sequence or repeat the earlier terminology question.
