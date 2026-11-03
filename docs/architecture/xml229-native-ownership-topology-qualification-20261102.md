# XML229 original topology and member qualification

02 November 2026. Primary [WBS](xml229-native-ownership-wbs-20261102.md), pinned V6 source `5c39dd7bdbb7f2f63a686823b72bdb81909d52af`. Seven bounded source/runtime checks pass. This qualifies the public cases below, without adopting a new production schema or completing AppendixA, private replay or release acceptance.

## What the original readers establish

| Case | Fixed expectation | Observed | STATUS / oracle |
| --- | --- | --- | --- |
| EF50/60 original route | Same original branch, consecutive positive nodes at identical XYZ have one zero-length route edge. | Unmodified native parser with preserved geometry produces edge50→60, length0. | PASS; original XML branch order and independent literal coordinate comparison. |
| EF50/60 legacy cleanup | Existing short-span cleanup retains node50 and absorbs node60. | Only node50 remains at the station. | PASS; executed legacy reader. This does not authorize cleanup after accepted Final. |
| Original Preview custody | Every original occurrence keeps a unique source ordinal even when cleaned. | 1,654 original rows / 1,654 unique branch+node ordinal keys; 1,333 retained /321 dropped. Both50/60 retained with unchanged coordinates. | PASS; actual Chrome DOM and source count/identity oracle. |
| Disconnected crossing, Preview | Two separate three-node branch routes; equal XYZ at their interior nodes20/50 supplies no link. | Four within-branch length assignments; both branches/nodes remain separate. | PASS; explicit synthetic connectivity and coordinates. |
| Disconnected crossing, native | Same controlled routes remain two connected components. | `[10,20,30]` and `[40,50,60]`, with four original within-branch edges. | PASS; independent graph traversal of actual reader edges. |
| Negative helper authority | Naming an OLET direction helper must block geometry-only removal. | `OLET_HELPER_AUTHORITY_CONFLICT`. | PASS corrected fixture; expected guard fixed before rerun. |
| Six authored nodal members | Six explicitly authored ±X/±Y/±Z members at node20 preserve types, directions, distinct gaps0–5, stiffness1751270000000 and friction0.3. | Pinned base native RESTRANT writer emits six occupied slots: codes13–18 and all expected values/directions. | PASS; independently specified literal XML members and parsed actual auxiliary records. Full governed CII/Owner run NOT_RUN. |

Exact source hashes, inputs, ledger rows, original archived member fields, emitted auxiliary slot values and execution history: [evidence](../../agents/evidence/xml229-topology-qualification-20261102.json). Reusable [browser checks](../../agents/evidence/xml229-topology-qualification-20261102.mjs), [native checks](../../agents/evidence/xml229_topology_qualification_20261102.py) and [browser runner](../../agents/evidence/xml229_prefinal_repro_20261102.py) are saved. Chrome executed30 transitive modules; native checks executed two exact Git-exported modules; eight traced source files were separately byte-verified.

The named-helper test initially appended a second NodeName element after an existing empty one. The reader correctly selected the first field, so the intended mutation had not occurred. The [initial result](../../agents/evidence/xml229-topology-qualification-20261102-initial.json) is retained. The corrected fixture edits the existing field; production source and expected guard stayed unchanged. No product defect is inferred from that test-author mistake.

## Why X, Y and -1 cannot be resolved by one key

EF50/60 are a qualified connected-station example in the original reader's branch-route model. Their connection is demonstrated by the actual branch edge and the SREF role, not just a coordinate search. The existing length collector classifies node60 as `support-reference-sref`, while the Preview occurrence ledger preserves both original records. A physical-vertex map must preserve both aliases while selecting one qualified attachment identity.

The original XML contains810 occurrences numbered-1 at639 distinct literal XYZ positions. All1,654 source records have distinct branch/node ordinals. NodeNumber=-1 is therefore neither an occurrence identity nor a global vertex identity.

For OLET ref`=1006649732/119347`, zero-based source ordinals9/10/11/12 have endpoints1/3/0/2. Ordinals9/11/12 share the junction position; ordinal10 is a different direction-witness position. Current qualified cleanup retains positive node70 and records all three anonymous negative helpers as dropped `OLET_GEOMETRY_HELPER` rows. It verifies the complete component group and rejects name/restraint/rigid/mass authority on a helper. Sharing a ComponentRefNo does not make every component record the same physical point, and helper removal does not grant ownership of restraints or kilograms.

The optional `xml_to_cii2019_contracted_direction.py` wrapper has its own component reconstruction and cross-branch alias logic. It was inspected as a distinct route and was not imported or installed in this experiment. The governed runtime imports base/patched/direction and preserves accepted geometry through `preserve_finalized_geometry`; it must not silently acquire another contraction/alias policy.

## Member independence: benchmark evidence and limits

The unchanged archive `ASIM-1836_managed_stage-2.zip` contains39 records matching the PS14168/14169 families across eight branches. This is a concrete reason that a name-family search cannot authorize attachment. The relevant8-inch B3 group contains:

- PS14168: Pipe Rest DATUM, TYPE104 SREF hardware and GT02 GUIDE with authored6mm gap at one archived position.
- PS14169: Pipe Rest DATUM, TYPE104 SREF hardware, GT02 GUIDE, AT05 WEAR PLATE and ST03 PIPE STOP at another archived position.
- A Copy-of-PS14169/DATUM at a third position; it cannot be moved to the similarly named station.

These source records distinguish restraint intent from supporting hardware. They do not supply the Owner's saved Step7/8 decisions. NODETYPE/NODEGAP are absent from these selected records; GUIDE/STOP gaps at PS14169 must not be borrowed from another member or the historical enriched XML. Archived B3 coordinates differ from the original EF B4 frame, so attachment to EF remains NOT_QUALIFIED. No transform was invented or applied.

The earlier six-declared-path challenge remains evidence that `Map(kind)` cannot retain occurrence multiplicity. It is not proof that every constructed repeated-kind path is an independent physical restraint. The six authored directional-member check now separately proves the existing native base writer's six-slot capability without relying on that assumption. Preserve hardware relationships and explicit independent members; neither kind equality nor different JSON paths alone settles physical independence.

## Minimal coherent repair boundary, prepared read-only

1. **Original occurrence identity:** source XML digest + branch occurrence ordinal + original node ordinal. NodeNumber, name, ComponentRefNo, Endpoint and raw Position remain immutable evidence fields. Dropped helper rows retain identity and their qualified role/reason.
2. **Original physical vertex:** project source occurrences through qualified branch/component connection witnesses. EF50/60 share the demonstrated station. The disconnected interior-crossing control remains two vertices. Never union records globally by XYZ, name family, negative number or ComponentRefNo. Cross-branch joins require their own qualified source witness and ambiguity rules.
3. **Member identity and values:** selected JSON digest + original member path/ordinal, or original XML occurrence + authored Restraint ordinal. Keep raw fields, effective saved classification/mutation, hardware relationship, type/direction/gap/stiffness/friction/units and source order. Qualify independence before assigning slots; do not deduplicate solely by kind/type or numeric equality.
4. **Pre-Final consumer:** bind the qualified ordered members once per original physical vertex before materialization. Retain every alias/XYZ in lineage and use member identity for idempotence. The affected current boundary is `xml229-prefinal-restraints.mjs` → `xml-cii-mds-restraint-closure.js`, where row-by-row and Map(kind)/existing-type decisions currently occur.
5. **Independent native verification:** reconcile the original source-derived expected members with the exact Final geometry/native attachment. Keep `xml229_prefinal_restraints.py`, `xml229_native_final_mass_binding.py` and runtime custody coherent; preserve full Final/source comparison and accepted physical masses/zeros. Later staged enrichment must not silently make a second owner decision for already-bound members.
6. **Rigid second pass:** after an approved split, retain original occurrence/vertex/member relations, derive new coordinates under the qualified split rule and verify them, then repeat physical-node/member and the existing accepted physical-weight pass before Final. No rigid split was executed in this qualification.

This is a bounded patch specification, not a new resolver implementation or adopted contract. Before production changes, live-base/overlap and one-writer custody plus A1–A5 implementation qualification remain necessary. No score, distinct-review approval or implementation authority is inferred from seven passing author checks. PR investigation remains deferred at the Owner's direction.

EXACT_NEXT_ACTION: Turn the six boundaries above into a concrete minimal pre-Final/native patch plan and repository-grounded AppendixA qualification, keeping the fixed public expectations and existing Final/mass guards. Remain READ_ONLY until implementation custody and qualification are established. Do not repeat the unavailable-private-bundle request or substitute archived coordinates/synthetic passes for the exact Owner21 run.
