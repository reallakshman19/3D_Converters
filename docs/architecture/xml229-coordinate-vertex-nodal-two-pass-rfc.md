# XML229: coordinate-preserving physical-node / restraint / rigid-split two-pass design

**Status:** Corrective design (2026-11-02, Owner instruction). **Supersedes the owner-uniqueness premise** in `xml229-canonical-support-ownership-ledger-rfc.md`. No production code modified here, no actual Owner-source acceptance or CII release claimed.

## Correct problem statement (three operations; one source graph)

1. The same physical piping vertex may be represented by more than one source XML `Node` occurrence (including coincident or repeated `-1` placeholder IDs, duplicated physical endpoint witnesses, and across-branch junction aliases). **Two XML rows need not be two physical owners.** `NodeNumber` and row count are not physical identity.
2. Original JSON Trace contains **nodal** restraint membership `REST | GUIDE`, `REST | GUIDE | LINE STOP`, or other correctly classified members, up to **six CII restraint slots on one node**. Each source member supplies its own type, gap, stiffness, friction and direction; Step 7 classification and Step 8 type mutation act on the member set *before* materializing XML and CII.
3. If rigid/valve/flange processing splits a physical element or creates a new node, **preserve original node coordinates and support semantics**; derive each new node coordinate from the source segment, record parent/child incidence and pass-2 alias mapping, reconcile restraints once on the final connected vertex and run the **existing independently approved weight second-pass / Final owner** on the final physical topology. No silent extra mass owners.

A `21 mandatory ambiguous claims` count computed at the XML *row* level is **not evidence of 21 ambiguous physical vertices**. The previously asserted requirement to choose either candidate row 699 or 700 whenever they have identical XYZ was an incorrect target for cases where both rows represent the same connected physical vertex. The first investigation must project each pair through the original graph and its retained-ordinal/split lineage. Do not predetermine a distinct physical owner from row indices alone.

## Grounded upstream code inspection: where the data actually flows

- `tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js`: `buildStandaloneDtxrPositionGroups` groups original staged source entries spatially; `recordForNode` subsequently makes XML-row decisions. That separation is where a **source nodal group** can become multiple ambiguous row candidates.
- `tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js`: `evidenceByKind` already groups REST/GUIDE/LINESTOP by support kind and member attributes; `closeGovernedMdsPositionRestraintsXml` iterates each XML node separately, checks a row's `AMBIGUOUS_REVIEW`, appends XML `Restraint` children and relies on Step 7/8. This stage should instead consume the **physical vertex's complete support-member set** and output one terminal normalized nodal spec list. The current `evidenceByKind` map collapses duplicate kinds; preserve all *engineering-distinct* members up to the CII-supported capacity.
- `tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs` wraps the above, freezing its generated restraints ahead of Final. `converters/scripts/xml229_prefinal_restraints.py` independently reconstructs staged restraints during native source verification. Both must operate on the same physical-vertex group and be independently checked, not independently pick an XML row from XYZ.
- `tabs/xml-cii-2019-standalone/integration/xml229-finalized-weight-geometry.mjs`: `assignSourceNodeNumbers` converts nonpositive `NodeNumber` placeholders into unique positive IDs while retaining `sourceNodeOrdinal` **and leaving `Position` unchanged**. `promoteWitnessedRigidEdges` labels already existing endpoint=1→2 VALV/FLAN/INST spans rigid; **the audited current governed implementation does not insert new physical points** in that function. It produces `retainedSourceOrdinalsByBranch`.
- `tabs/xml-cii-2019-standalone/integration/xml229-physical-component-lineage.mjs` records paired physical endpoints and branch-connection aliases, so the existing physical-vertex equivalence graph has upstream data. The native `xml229_native_final_mass_binding.py` reconstructs source ordinal numbering, original XYZ and derived Rigid flags and rejects added or moved physical nodes **after accepted Final**.
- `converters/scripts/xml_to_cii2019.py`: `RESTRAINT_SLOTS_PER_AUX = 6`, `_parse_restraints` admits up to six on one node. `_build_explicit_restraint_specs` keys by native positive node number, so aliased same-vertex rows must be normalized to one canonical CII node before this stage. `_drop_short_element_nodes` can transfer restraint specs from one near-duplicate to its neighbor, but the **governed Final path skips this second native cleanup**; never re-enable a moving/short-hop heuristic post-Final.
- `converters/scripts/xml_to_cii2019_patched.py`: `_apply_staged_position_restraints` takes `_stagedPositionMemberRows` from the independent native position resolver; `_merge_specs` currently deduplicates by numeric code and truncates at six. These operations should not silently discard engineering-distinct members; canonical vertex assignment must precede numeric packing.
- `converters/xml-cii2019-core/split-rigid-weight-propagation.js` is an existing **legacy, ungovened XML enrichment** step that copies a unique positive weight across same-ref split siblings. It is not proof of independently accepted Final kg and **must not cause duplication of physical CII RIGID masses**. Preserve the separate accepted physical mass ownership and independent emitted CII mass reconciliation.
- `tabs/model-converters/xml-cii-node-to-inputxml-topology-normalizer.js` is a **different InputXML topology route**, not this governed Final pipeline. Its coordinate coalescing has a configurable default 6 mm tolerance and `mergeRestraints` silently stops at six; this must be regression-qualified before sharing any such logic with the governed XML229 path. Do not treat all within-6 mm points as identical.

## Pass 1 — original physical vertex reconstruction *upstream* of Final

A. Freeze the original source `Position` strings and parse XYZ in their declared datum/coordinate frame using decimal-preserving normalization. Apply an approved source-to-XML datum transform **once**, preserving exact original source raw values and an explicit transformed coordinate. Distinguish `exact same XYZ` from `within match tolerance`; tolerance is for searching, **not vertex equality**.

B. Build a disjoint-set / graph equivalence relation over *XML node occurrences* using actual branch connection/incidence, same physical endpoint/junction aliases and **coordinate equality**. Repeated `-1` is merely an unnumbered placeholder; renumber each retained occurrence without changing XYZ. Two unrelated disconnected pipes at the same XYZ are not automatically one physical vertex, while connected coincident source rows share one physical vertex even if their `NodeNumber` differs. Nonzero-distance neighboring rows **must not merge solely on proximity**.

C. Index original JSON Trace support groups by transformed XYZ plus engineering branch/connected topology scope, not by XML row number. Attach every supported nodal member to a **physical vertex group**. If two row-level candidates are members of the **same** group, there is exactly one physical target, so **no ownership HOLD** and no "choose 699 vs 700" problem. When a unique physical connected group is found from source coordinate and original graph, choose a deterministic retained CII **representation** for that vertex based on connectivity/retained lineage; never choose a physical owner by nearest row.

D. Build a complete `restraintSlots[physicalVertexId]` array from source JSON member occurrences. Run the configured Step 7→Step 8 mutation on every entry, preserving all independently authored type, numeric gap, friction, stiffness and direction. Merge truly duplicate *same-member* references only, not two independent nodal degrees of restraint. Sort deterministically by source occurrence and engineering slot policy. Native supports **1..6 slots**. For a seventh required slot, establish an explicit engineering policy rather than silently truncating.

## Pass 2 — split topology, preserve XYZ, redistribute *representations*, not restraints/mass

If approved rigid/valve/flange splitting needs new physical nodes, it must occur **before** finalized geometry and Weight Final acceptance. For each new split node on an existing source segment `A=(ax,ay,az)`, `B=(bx,by,bz)`, at validated parametric position `t\in[0,1]`:

```
P_new = A + t * (B-A)
P'_A = P_A; P'_B = P_B
parentEdgeId = source edge occurrence
childEdgeIds = (A -> new, new -> B)
splitLineage = (original source, A occurrence, B occurrence, t, new node ID)
```

If the new row is an alias at an existing source vertex, its XYZ is **exactly the copied vertex coordinate** and it aliases the same `physicalVertexId`. If it is an actual interior subdivision, it is a **new topology vertex**, without automatically inheriting a nodal restraint from A or B. This prevents relocating a GUIDE/LINE STOP by a 0.5/6 mm heuristic.

Rebuild the **physical vertex equivalence and native node-number map** after the split. Reapply the *same* source member slots by `physicalVertexId` onto exactly one retained **CII native node representation** of each vertex, retaining original XYZ. Never attach the same REST/GUIDE/LINSTOP membership to every split sibling or another nearby row. Verify slot count, per-member original gap/type, and no dropped original physical vertex. Serialize governed EnrichedXML from this exact final topology and consume those same bytes in native CII.

**Second-pass weight** is a separate accepted physical-part calculation, not copying approved kg to every new endpoint: preserve existing `physicalOccurrenceId` and component endpoint pairing, allocate or propagate according to the existing validated Weight second-pass policy, and independently verify every accepted kg (including explicit zero) appears exactly once in actual CII RIGID at the final physical owner. No new mass accepted by a node split.

**Current governed boundary:** present `XML229.FinalizedWeightGeometry.v1` explicitly forbids newly created physical nodes after acceptance. A true **pre-Final** node split needs an expanded reviewed topology-change/lineage contract and reacceptance of the geometry and weights. A post-Final split cannot simply be bolted into the native converter; native must consume only the exact reviewed final source.

## Worked example: same physical vertex, multiple source labels

```text
Original XML, one connected physical vertex at (10,20,30):
   source occurrence (branch=0, ordinal=699), NodeNumber=X/-1, XYZ=(10,20,30)
   source occurrence (branch=0, ordinal=700), NodeNumber=Y/-1, XYZ=(10,20,30)
   topology: 699 ---same connected physical junction--- 700

JSON Trace, same nodal position:
   source member S1: REST, gap=0
   source member S2: GUIDE, gap=5 mm
   source member S3: LINESTOP, gap=8 mm

Pass 1: two *source rows*, ONE connected physical vertex V17
   V17.slots = [(+Y,0), (GUI,5), (LIM,8)]

Rigid splitting / second pass:
   introduce a derived alias row if needed with exactly (10,20,30)
   V17 still has exactly one canonical CII native node ID, say 1700
   original parent coordinates unchanged
   physical mass assigned to its independently accepted component occurrence

Final EnrichedXML:
   NodeNumber 1700, Position (10,20,30)
     <Restraint Type=+Y Gap=0>
     <Restraint Type=GUI Gap=5>
     <Restraint Type=LIM Gap=8>

CII 2019:
   exactly one RESTRANT record associated with node 1700, three occupied slots
   each type/gap identical; no duplicates on other coincident XML rows
```

`NodeNumber=X/Y/-1` above is a symbolic representation of repeated source placeholders; the actual schema uses integer `NodeNumber` and may use `-1` repeatedly.

## Correct mathematical acceptance conditions

Let `~` mean **source-topology-proven identical physical vertex**, not just same nearest position. Let `[n]` be the equivalence class of an original XML node.

**(1) Unique connected physical vertex after coalescing:** `unique({[n] : n in nodeCandidates(s)}) == 1`. Multiple rows in that one equivalence class **are not an ambiguity**. If candidates represent truly disconnected physical vertices, inspect graph/branch transformation before making an engineering claim; do not duplicate a restraint solely to avoid a HOLD.

**(2) Nodal restraint conservation:** `multiset(source-accepted restraint members for V) == multiset(Final EnrichedXML restraint members for V) == multiset(CII node V restraint slots)`, with correct Step 7/8 type mutation and authored parameters, and total slots `<= 6`.

**(3) Coordinate and split conservation:** `P_original_after == P_original_before` for each retained source physical node; new nodes must have source-edge incidence and validated interpolated/copy XYZ; the sum of split sub-edge displacement vectors equals the original segment displacement.

**(4) Weight conservation:** `sum(CII RIGID mass by accepted physical occurrence) == sum(accepted Final physical kg * 10)` with independent per-owner equality, after the existing second pass. No sibling double count.

The corrective acceptance target is **not zero warnings**. It is eliminating *false row-level ambiguity* by reconstructing the physical vertex, then showing accurate EnrichedXML/native CII node and six-slot semantics while preserving all source coordinates and accepted physical mass.

## Critical next executable proof

Do not reuse the 27/27 earlier model tests as proof of this corrected approach: they explicitly assume one mandatory source member must resolve to one **original XML row**, the premise the Owner has challenged. Their synthetic adversarial checks can be preserved as isolated safety tests, but the acceptance oracle must be replaced.

Build actual code-level tests of:

- original XML with two or three coincident, connected rows including repeated `-1`, plus one disconnected same-XYZ physical vertex (must not be coalesced);
- two and six distinct source support members, edited Step 7/8 aliases, zero and nonzero gaps, valid actual `<Restraint>` output and six actual CII slots on one node;
- one generated rigid-split alias at the exact source coordinate and one true interior split point, original XYZ/edge-vector parity, second-pass unique nodal restraint owner, no disappearing supports;
- existing physical weight second pass, approved explicit zero, preserved VALV/FLAN paired endpoints, *real emitted CII* per-original kg check;
- authentic BM2, EF05 and Owner 21 diagnostic pairs projected through **source physical topology**, plus browser Pyodide exact-source/served-runtime verification.

**No release** until those tests are executed against the real converter and actual Owner selected XML/JSON/Final packet.
