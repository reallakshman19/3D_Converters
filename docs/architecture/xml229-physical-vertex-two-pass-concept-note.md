# Concept Note — XML229 coordinate-preserving physical vertices, nodal restraints and two-pass rigid/weight processing

**Status:** PROPOSED / DESIGN ONLY — not implemented, not an approved engineering CII release  
**Date:** 2026-11-02  
**Applies to:** Selected original PSI/XML229 + optional staged JSON Trace -> Pre-Final -> Weight Match/Final -> governed EnrichedXML -> native CII 2019  
**Existing architecture draft:** [PR #390](https://github.com/reallakshman19/3D_Converters/pull/390); [detailed corrective RFC](xml229-coordinate-vertex-nodal-two-pass-rfc.md)  
**Related existing work:** issues [#364](https://github.com/reallakshman19/3D_Converters/issues/364), [#350](https://github.com/reallakshman19/3D_Converters/issues/350), [#376](https://github.com/reallakshman19/3D_Converters/issues/376), [#98](https://github.com/reallakshman19/3D_Converters/issues/98), [#136](https://github.com/reallakshman19/3D_Converters/issues/136); historical PRs #356, #357, #365, #370–#389.

## 1. Executive statement

The design should solve **three mechanical engineering problems**, not create another XML-row-level carrier/PS matcher.

1. **Repeated/coincident source nodes:** One real connected physical piping vertex may be represented by multiple original XML node occurrences, including repeated `NodeNumber=-1` placeholders and branch/endpoint aliases. Preserve exact source coordinates; recognize the shared *physical vertex* from coordinates **and actual connectivity**, not from a globally unique node number or a nearby-point heuristic.
2. **Nodal restraint membership:** Staged JSON Trace can describe `REST | GUIDE`, `REST | GUIDE | LINESTOP`, or other valid combinations of **one to six** restraint entries attached to one physical node. Preserve every engineering-distinct member and its own gap, stiffness, friction, direction and source occurrence. Apply the saved Step 7 support-kind classification and Step 8 restraint-type mutation before writing the final node's XML restraints and native CII slots.
3. **Rigid split / second pass:** When an approved rigid/valve/flange split changes node representations or creates actual new nodes, preserve all original XYZ, derive any true new point from a source segment, record parent-child lineage, **reconstruct the physical-node groups again**, reattach the nodal restraint set **once**, and run the *existing* accepted physical weight second pass / Final owner reconciliation. Splitting one component does not manufacture new mass owners or copy each restraint onto every sibling.

**Correction to prior proposal:** V6 reported 21 mandatory `XML229_STAGED_POSITION_AMBIGUOUS` *row-level* claims at 0.5 mm. Those are **not proven to be 21 distinct physical-vertex ambiguities**. An algorithm that insists on choosing between XML rows 699 and 700 despite confirmed connectivity and coincident XYZ is solving the wrong problem. Inspect source graph equivalence first. Some row pairs might be physically distinct and will need proper source topology interpretation; do not assert all 21 are resolved before a real-source replay.

## 2. Terminology and engineering identity

- **Original XML occurrence** = immutable tuple (source XML byte SHA, branch *occurrence* ordinal, node ordinal), holding original raw `Position`, source `NodeNumber` (including `-1`), original component/endpoints and original-authored restraints.
- **Physical vertex** = connected piping junction/station and its aliasing source occurrences. A union of **topology-proven**, same-coordinate occurrences (or explicit verified connection alias). Two pipes crossing at identical XYZ but unconnected remain **two** physical vertices.
- **Source restraint member** = distinct staged JSON hierarchy occurrence with a support kind and its own engineering parameters. Identity is by actual source path / member occurrence, not normalized kind alone. Identical *kind* does not imply duplicate member.
- **Native CII representation** = a unique positive node number used as the canonical serialization of one physical vertex. Repeated `-1` represents unassigned source numbering, not equality or a CII node number.
- **Physical mass owner** = accepted one-part identity and Final kg, separate from XML node count and support-member count.
- **Generated split node** = (a) an alias of an existing vertex at **exact copied XYZ**, or (b) a genuinely new interior vertex at a validated position on one original segment. These must never be conflated.
- **Coordinate equality vs tolerance:** normalize units/Datum/frame once. Equality after the approved transform and witnessed connectivity identifies alias groups; 0.5 mm/6 mm radius only supports **candidate search**, never automatic vertex welding.

## 3. Root cause boundary in existing code (source inspected)

| Upstream/current file | Verified role and gap |
|---|---|
| `tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js` | `buildStandaloneDtxrPositionGroups` forms source spatial groups, but `recordForNode` then decides each XML row, producing false row collisions for physical aliases. |
| `tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js` | `evidenceByKind` recognizes REST/GUIDE/LINESTOP, `closeGovernedMdsPositionRestraintsXml` writes row-by-row; the `Map(kind,...)` can collapse distinct same-kind members. Move the accepted source-member *multiset* to one physical vertex. |
| `converters/xml-cii2019-core/restraint-type-mutation.js` + `tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js` | Existing Step 7/8 authorities must remain the only effective classification/mutation, including saved user rules; no new guessed type table. |
| `tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs` + `converters/scripts/xml229_prefinal_restraints.py` | Pre-Final materialization and independent native replay use distinct row resolvers. Replace the owner-decision boundary with physical-vertex lineage, while keeping source replay as an independent checker. |
| `tabs/xml-cii-2019-standalone/integration/xml229-finalized-weight-geometry.mjs` | `assignSourceNodeNumbers` already renumbers nonpositive placeholders and preserves original `Position`/source ordinals. `promoteWitnessedRigidEdges` marks existing positive-length VALV/FLAN/INST spans; **this function does not create physical split nodes**. Do not claim otherwise. |
| `tabs/xml-cii-2019-standalone/integration/xml229-physical-component-lineage.mjs` + `converters/scripts/xml229_native_final_mass_binding.py` | Existing endpoint pair aliases, source ordinal mappings and exact original coordinate/Final checks are reuse points; native currently forbids post-Final new points. |
| `converters/scripts/xml_to_cii2019.py` | `RESTRAINT_SLOTS_PER_AUX=6`; `_parse_restraints` reads 1..6 at one node. `_build_explicit_restraint_specs` keys by positive node number. Non-governed `_drop_short_element_nodes` may transfer restraints; governed Final skips independent re-cleaning. |
| `converters/scripts/xml_to_cii2019_patched.py` | `_apply_staged_position_restraints` consumes position-claim rows and `_merge_specs` deduplicates by numeric kind; both risk losing member multiplicity. Actual CII packing should receive the normalized node's complete member list. |
| `converters/xml-cii2019-core/split-rigid-weight-propagation.js` | Existing legacy same-ref sibling weight-copy logic is **not** proof that accepted kg should be duplicated on every generated CII physical RIGID. Distinguish from governed Final allocation. |
| `tabs/model-converters/xml-cii-node-to-inputxml-topology-normalizer.js` | Different (InputXML) route has <=6 mm coordinate coalescing and truncates restraint list at six. Do **not** migrate nearest-position merging or silent truncation into governed XML229. |

## 4. Target processing contract

```text
Original selected XML (immutable raw XYZ and occurrence IDs)
     + original staged JSON Trace (optional, immutable hierarchy/member IDs)
     + source/config/Datum snapshot
       |
       v
PASS 1: original node occurrence index + connected topology + coordinate frame
       |-- same physical vertex equivalence; disjoint crossing pipes remain disjoint
       |-- repeated -1 receives an identity/renumbering map, not inferred equality
       v
NODAL RESTRAINT SOURCE: JSON Trace members -> Step 7 -> Step 8
       |-- ordered 0..6 source-distinct nodal slots per physical vertex
       |-- preserve explicit 0/nonzero gaps, stiffness, friction, directions
       v
APPROVED GEOMETRY/SPLIT (PRE-FINAL ONLY)
       |-- original positions preserved byte-for-byte where applicable
       |-- verified alias XYZ copy or derived interior XYZ = A + t(B-A)
       |-- parent edge + child edges + source occurrence lineage recorded
       v
PASS 2: rebuild physical node groups on reviewed split geometry
       |-- transfer nodal slot set to one canonical positive CII vertex ID
       |-- no duplication onto split siblings / no loss from short-node cleanup
       |-- existing physical-part endpoint / weight second pass
       v
Weight Match -> Final accepted mass + geometry snapshot
       v
Governed EnrichedXML EXACT BYTES (all engineering fields)
       v
Native CII consumes these bytes, NO second physical ownership vote
       v
Independent parse of CII node/RESTRANT/RIGID/ELEMENTS/SIF&TEES
       v
Verified artifact(s), then authorization/download
```

The **XML-only** path without selected JSON must continue working with its original XML-author restraints and without a fabricated support ledger, as required by #376. A selected JSON-governed run must not silently drop JSON support intent on error.

## 5. Proposed internal artifacts (implementation contract, not yet deployed)

**`XML229.OriginalPhysicalVertexMap.v1`**: original XML source hash; coordinate frame ID/transform; original-vertex IDs; for each vertex, exact normalized XYZ plus original raw values, alias source occurrence IDs, branch/port incidence and reasoned topology union edges; any disjoint coincident vertices remain distinct. Each original XML occurrence belongs to exactly one physical vertex; no source occurrence vanishes.

**`XML229.NodalRestraintSet.v1`**: selected JSON source hash and effective Step 7/8 config digest; physical vertex ID; ordered, occurrence-identified source restraint members and their original attrs, mutated type, numeric CII code, gap, stiffness/friction/direction, and original XML authored restraint reconciliation; slot count <=6. Distinct source occurrences are never deduplicated by kind.

**`XML229.RigidSplitLineage.v1`**: pre-split accepted source edge occurrence; original A/B source vertices/XYZ; split type (`EXISTING_EDGE_PROMOTION`, `ALIAS`, `INTERIOR`); generated node ID and final XYZ; edge parametric t for interior; children and branch/endpoint role; source-coordinate preservation proof; pre-Final topology revision. Real new nodes must be reviewed **before** Final.

**`XML229.PostSplitVertexMap.v1`**: mapping original physical vertex -> one final CII canonical node number and all split/renumbered aliases; complete disjoint original-versus-new vertex set; each source restraint member assigned to exactly one supported final vertex and one CII slot; linked to reviewed final source geometry fingerprint. Interior split point is a new vertex, not automatically eligible to inherit an endpoint's nodal supports.

**`XML229.GovernedEnrichedXML.v1`**: SHA-bound exact bytes consumed by native CII, tying selected source/config, post-split vertex and restraint sets, accepted Final physical mass manifest, line-list/material/TEE/SIF processing and provenance receipts. This artifact **does not** give process/material/mass authority just because support-node identity is correct.

## 6. Formal invariants and expected outcomes

**V1 — Physical-node identity:** if two source rows have identical transformed XYZ and topology confirms the same connected station, they map to **one** physical vertex; repeated `-1` alone proves nothing. Same XYZ with disjoint topology remains separate. A false row-level `AMBIGUOUS` must not block an otherwise verified single physical vertex.

**V2 — Coordinate conservation:** for every retained original node occurrence, `P_final(original) = P_original` in the agreed frame, without cumulative resnapping. An alias generated at an original endpoint uses that endpoint's exact position. A genuine interior split uses `P_new=A+t(B-A)`, with `0<t<1`, original endpoints unchanged, and `(P_new-A)+(B-P_new)=B-A` componentwise.

**V3 — Nodal restraint conservation:** for each physical vertex V, the *multiset* of original source-authorized members after effective Step 7/8 mutation equals the multiset in final EnrichedXML and the slots in actual CII on canonical node V, including separate gap, stiffness, friction, direction and source-member count. For supported nodes, `0<=slots(V)<=6`; no silent truncation or same-kind deduplication. Original-authored XML restraints remain accounted for.

**V4 — One native node owner:** all original source aliases and approved split aliases of V have **one** canonical CII node number and one RESTRANT owner; an interior split vertex is distinct. Do not coalesce all within a distance tolerance.

**V5 — Mass invariance:** accepted original physical component occurrence IDs retain their mass authorization after split. Actual CII RIGID mass is reconciled **per independently accepted physical owner** in native scale (current kg*10), including explicitly accepted zero. Split siblings are not separate masses.

**V6 — Engineering isolation:** support-node handling does not change unrelated TEE vectors/SIF, material, wall, rating, process values, insulation, bend, source-controlled rigidity or existing XML-only outcomes. No second native geometry cleanup after Final.

**V7 — Freeze/authority:** source JSON/XML, effective config/Datum, split topology, accepted Weight Final and frozen EnrichedXML remain mutually bound. Source revision or genuine new split invalidates old Final acceptance. A synthetic model's green tests are not a native CII acceptance.

## 7. Worked conceptual example (not Owner private source)

```text
XML source branch B0:
  occurrence 699: NodeNumber=-1, Position=(100,200,300)
  occurrence 700: NodeNumber=-1, Position=(100,200,300)
  connectivity shows both are the same physical vertex V17

JSON Trace, at V17:
  S1: REST, gap 0
  S2: GUIDE, gap 5 mm
  S3: LINESTOP, gap 8 mm

Pass 1       -> V17 aliases {699,700}
Step 7/8     -> V17 slots [(+Y,14,0), (GUI,8,5), (LIM,9,8)]
Split        -> possible new alias of V17 at EXACT (100,200,300)
                 or interior new vertex V18 on independently witnessed edge;
                 V18 does NOT receive V17 restraints
Pass 2       -> one native CII number for V17, e.g. 1700
EnrichedXML  -> node 1700 with 3 Restraint records and exact XYZ
CII          -> node 1700 with 3 occupied RESTRANT slots, no duplicate
Mass         -> independently accepted physical component weight remains once
```

**Interpretation warning:** Source diagnostic XML row numbers 699/700 in an Owner receipt are not proof those actual rows are at these example coordinates or share a physical vertex. This is a *synthetic explanatory fixture only*.

## 8. Work Breakdown Structure (WBS) — implementable, dependency-ordered

Each item is a separate reviewable deliverable with an explicit oracle. **Do not close an item based solely on code inspection or synthetic unit tests.** The order is the default dependency chain; some independent test/UX work can run in parallel.

| WBS | Work package | Dependency | Implementation deliverable | Acceptance / exit gate |
|---|---|---|---|---|
| **0.1** | Pin live baseline / source inventory | None | Exact main/PR SHA, served docs revision, source + JSON + config + Final packet hashes, input matrix; original V6 21-claim category baseline | Reproducible evidence manifest; no synthesized private values |
| **0.2** | Trace all split and node-loss paths | 0.1 | Source-to-XML-to-FFG-to-native flow diagram, list all helpers/short-hop, rigid promotion, actual insertions, weight reuse | For each operation: phase, inputs, XYZ mutation, lineage and whether native/Preview/XML-only |
| **0.3** | Specify coordinate and topology authority | 0.1–0.2 | Coordinate-frame/Datum spec, exact-position canonicalization, source-branch incidence, alias proof taxonomy, crossing-node counterexample | Engineering review accepts equality/graph rules; no position-only welding |
| **1.1** | Immutable occurrence + coordinate index | 0.3 | New pure original XML index; raw XYZ/parsed XYZ, branch occurrence, original ordinals including repeated -1 and source-basis hash | Original source node census preserved; 100% original coordinate round-trip |
| **1.2** | Physical-vertex equivalence graph (Pass 1) | 1.1 | Union/find or indexed graph keyed by real connectivity, branch junction aliases and exact transformed XYZ | Two/three connected coincident aliases -> 1 vertex; unconnected same XYZ -> 2; near-but-distinct -> 2 |
| **1.3** | Node canonical numbering and lineage | 1.2 | Deterministic alias->physicalVertexId map, unique positive CII IDs for final representations; legacy -1 renumber audit | No merged source occurrence disappears; permutation/reload does not alter physical identity |
| **2.1** | Extract full original JSON Trace nodal members | 1.2 | Indexed source-member occurrence list; XYZ/branch/frame; REST/GUIDE/LINESTOP etc; original gaps and attributes | Same-coordinate multi-members retained, duplicate-kind distinct members retained; non-support DTXR ignored |
| **2.2** | Apply saved Step 7 then Step 8 *per member* | 2.1 | Pure semantic/mutation projection reusing current mapper and config authority | REST/+Y=14, GUIDE/GUI=8, LINESTOP/LIM=9; custom mapper, edited mutation, explicit gap 0 tested |
| **2.3** | Pack 0..6 nodal restraint slots | 2.2,1.3 | Source occurrence -> ordered slot contract; authored XML reconciliation, per-member gap/stiffness/friction/direction | 2,3,6 distinct entries on one physical vertex; 7 never silently truncated; one genuine same source member is not double-counted |
| **3.1** | Qualify current rigid promotion/split semantics | 0.2,1.3 | Explicit classification of existing-node renumber, rigid-edge promotion, aliases and actual new interior-node operations | Document demonstrated current governed case: **promotion no new physical node**; no false claim of a split |
| **3.2** | Pre-Final rigid split lineage and coordinate preservation | 3.1,2.3 | For any approved actual creation, source-edge parametric coordinate/copy algorithm, original->new node/edge incidence, new topology hash | P_original unchanged; interior equation/vector conservation; aliases copied exactly; new-node creation before Final |
| **4.1** | Rebuild physical vertices on split geometry (Pass 2) | 3.2 | Source->split->final canonical CII node map, retaining all source aliases and truly new vertices | No accidental union of disconnected crossing pipes; no orphan original member |
| **4.2** | Rebind nodal restraints **once** to final vertex | 4.1,2.3 | Final node REST/GUI/LIM slot materializer and source-member to native slot index map | Exactly 1 native node per physical vertex; slots 1..6 preserved including same kind, each member once |
| **4.3** | Guard short-node cleanup and CII node-number transforms | 4.2 | Align normalizer/native parse with reviewed post-split map; no second distance-based owner voting | Native Final mode never moves/drop/transfers accepted nodal constraints; other legacy/xml-only route regression unaffected |
| **5.1** | Reuse accepted physical-part second-pass Weight mapping | 4.1 | Existing physicalOccurrenceId, 1->2 component endpoint grouping and all Final kg custody preserved | Valve/flange/instrument pair remains one accepted mass owner; no sibling weight amplification |
| **5.2** | Reconcile Final kg after split | 5.1,4.2 | Exact per-component Final packet linkage and independent actual RIGID output mass verifier | Positive and confirmed-zero mass cases, kg*10, no duplication, no undeclared owners |
| **6.1** | Governed EnrichedXML from post-split map | 4.3,5.2 | One frozen exact EnrichedXML with complete node+restraint slots and accepted source/master engineering fields | Exact consumed-byte SHA; unaffected process/material/wall/TEE/SIF values; no extra enrichment replay |
| **6.2** | Native CII consume/serialize all six slots | 6.1 | Native writer receives final canonical node/slot map; packed RESTRANT rows correct | Actual emitted CII 1,2,3,6-slot tests: code, gap, stiffness, friction, direction, owner |
| **6.3** | Independent source -> EnrichedXML -> actual CII oracle | 6.2 | Separate parser/attestation, source occurrence counts, exact node XYZ, CII RESTRANT/RIGID/ELEMENTS/SIF fields | Fail test by changing exactly one code/gap/position/mass/slot; prove first-divergence reporting |
| **7.1** | Worker/Browser custody and performance | 1–6 | Indexed Worker data handoff, source/config/Final revision fencing, private bounded diagnostics, root/docs served parity | Cold/warm Chromium/Pyodide, large JSON source, cancellation, module closure, selected vs absent JSON |
| **7.2** | Authentic benchmark regression suite | 6.3,7.1 | BM2/EF05/Firstpass/PL01/PL06 existing approved fixtures, TEE routes, material and original restraint behavior | Source/output semantic parity, no known regression from #350/#356/#357/#365/#370–#389 |
| **7.3** | Exact Owner V6 21-claim physical-vertex replay | 6.3,7.2, private exact Owner inputs | Private occurrence->physical-vertex classification of **all 21**, pre/post split, Final EnrichedXML + real CII logs | Each claim accounted for by source coordinates+connectivity; real output engineering verification; no unsupported guess |
| **8.1** | Shadow qualification and atomic cutover | 7.2–7.3 | Existing vs new ownership parity on unchanged outputs, remove independent *row-owner* votes together | Exact-head PR CI + separate engineering reviewer; no half-integrated dual matcher |
| **8.2** | Actual deployment / release acceptance | 8.1 | Root/docs/main parity; actual served browser version; independent native CII review and Owner approval | Release only after all governed source, geometry, restraint, and mass checks pass |

### Workstream boundaries / suggested PR decomposition

- **PR-A (WBS 0–1):** read-only original occurrence/coordinate/topology model, no native behavior changes.
- **PR-B (WBS 2):** JSON Trace member-set and Step 7/8 pure nodal projection, preserved original source authority, tests without CII release.
- **PR-C (WBS 3–4):** reviewed geometry/split lineage plus second-pass vertex/slot rebinding, including six-slot and same-kind tests.
- **PR-D (WBS 5):** reuse/extend existing physical mass second-pass, no kg algorithm rewrite.
- **PR-E (WBS 6):** frozen EnrichedXML and real native CII serialization + independent field/slot oracle.
- **PR-F (WBS 7–8):** actual Worker/Owner-source E2E, qualification, atomic production cutover, audit receipts.

Keep each PR pinned to a precise base/head; do not merge unresolved producer/Final/native semantics from separately evolving branches. An early shadow PR **must not** introduce automatic support transfer, physical node merges or mass releases.

## 9. Regression test specification

**Physical vertex:**
- same XYZ and connected: A/B represented by two source rows (`-1`, `-1`), one physical vertex;
- multiple connected branch-port aliases at same XYZ; one canonical native node;
- same XYZ but physically disconnected crossing lines: two physical vertices;
- two near but unequal XYZ within 0.5 mm and 6 mm: distinct without source-witnessed topology;
- repeated positive connected-node number across branches; original source ordinals retained;
- nonzero Datum and translated source positions transformed exactly once.

**Nodal restraint:**
- `REST|GUIDE`, `REST|GUIDE|LINESTOP`, and six independently authorized member slots;
- repeated kind with independently distinct member/source gap (not Map(kind) dedup);
- explicitly authored original XML restraint preserved alongside compatible JSON;
- explicit zero vs missing and `CMPSUPGAP` vs placeholder `NODEGAP=0`;
- Step 7 custom aliases and Step 8 known numeric type mappings and invalid saved rows;
- one source member -> one final CII slot; no duplicate across coincident siblings;
- **7 required slots** produces explicit capacity outcome rather than silent data loss.

**Rigid and weight second pass:**
- existing span rigid promotion with no invented physical node;
- generated alias copy exact source XYZ, interior split interpolation and signed vector conservation;
- original node coordinates unchanged in split XML; no mutation after Weight Final;
- original restraint remains on the correct endpoint vertex, never interior by proximity;
- valve/flange 1->2 one physical mass owner, positive and confirmed-zero accepted kg;
- independent parse of actual CII RIGID mass and RESTRANT slot, negative tamper cases.

**End-to-end / non-regression:**
- exact source/Final/EnrichedXML/native CII lineages;
- root/docs and cold Pyodide imports; previous module inventory failure;
- XML-only without JSON and optional masters still operational;
- retained TEE DX/DY, SIF&TEES, line-list, material/wall, bend and original-authored fields;
- genuine source-size/Worker runtime performance and bounded private diagnostics;
- 21 actual Owner claims examined on their **actual** source data, not copied from an unrelated public benchmark.

## 10. Acceptance definition and constraints

A WBS test is **COMPLETE** only if its code, source contract, negative controls, actual native output where applicable, changed-module root/docs parity and independent evidence are in the linked exact-head PR. The program is accepted only when:

1. all 21 original Owner row-level reports are reclassified by actual physical vertex, with documented expected physical-node result; no synthetic coordinate replacement;
2. original and retained XYZ/split incidence are proved, with zero unjustified source-node movement;
3. 1..6 nodal restraint slots survive Step 7/8 and native CII with correct member parameters and exactly one physical-node owner;
4. accepted physical component masses survive second pass without multiplying upon split;
5. generated EnrichedXML is the exact native-consumed artifact, and real CII passes independent field/slot/weight/topology checks;
6. XML-only route and historical engineering regression suites remain compatible;
7. actual served runtime, reviewed Final and engineering Owner acceptance authorize the output.

**Out of scope / expressly not sufficient:** another V7 position/carrier grammar patch; using the smallest coordinate distance to pick an XML row; arbitrary XYZ-only merge of disconnected topology; suppressing all holds by silently losing REST/GUI/LIM; duplicating kg on split siblings; issuing CII from an old Final after a real topology change; declaring success on synthetic model tests alone.

## 11. Open engineering decisions to resolve in WBS 0.3 / 2.3 / 3.1

1. Which source graph edge/port facts prove two equal-coordinate XML occurrences are one **connected physical node** for all supported branches and tee/olet ports? Do not turn remote carrier references into node equality.
2. What is the approved coordinate frame/Datum transformation precision and equality rule for units and repeat-split serialization? No cumulative 0.5-mm snapping.
3. What is the exact distinction between **actual new physical split nodes** and currently observed source existing-node rigid promotion / renumber? Identify every real writer that inserts nodes, if any.
4. When more than six independently authored nodal restraints are present, what explicitly reviewed engineering policy governs (no silent truncation)? Also define preservation policy for multiple same-kind slots if the target CII semantics prohibit a particular combination.
5. How do canonical native node numbering and branch/tee shared-node connectivity remain stable through Final if an original source uses repeated negative placeholders?
6. Confirm the exact existing approved physical-component Weight second-pass contract that must be reused rather than copied from the legacy same-ref sibling propagator.

The target is **successful physical-node reconstruction and correct CII engineering output**—not treating an ambiguity counter or HOLD as a substitute for implementing the physical graph and second pass.
