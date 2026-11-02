# XML229 — canonical support ownership: replace dual position matchers

Status: **ARCHITECTURE RFC — not a production fix, not native release authority**  
Owner evidence: 2026-11-02 V6 governed browser Run, `XML229_STAGED_POSITION_AMBIGUOUS`, 21 mandatory claims at 0.5 mm; V6 reference categories in the bounded receipt.  
Baseline: main `5c39dd7bdbb7f2f63a686823b72bdb81909d52af` (PR389 included).

## Decision

**Remove the engineering obligation to resolve staged JSON support ownership twice.**
Today, `xml229_prefinal_restraint_source.resolve` reconstructs support ownership during the source/Final verification path, while `xml_to_cii2019_master_addon._position_bound_dtxr` reconstructs it again in native staged enrichment. These use different semantics. The first may use scored branch/PS/proximity; the second is fail-closed under per-claim collisions. Verifying the earlier *execution* does not prove that the same source member was transferred exactly once to the same physical owner at native release.

Replace this with one **canonical, source-attested support occurrence ledger** produced before engineering Final acceptance and consumed, never independently re-derived, by source restraint replay and native CII conversion.

### Why a unique owner cannot always be computed from the supplied evidence

Two XML nodes sharing XYZ are **distinct source occurrences** until topology/identity proves otherwise. Neither `tolerance=0.5mm`, an equal position, ordinal rank, physical-element proximity, the first candidate, nor a coincident-node equivalence class is source ownership authority.

V6's sampled failing claims include:
- **244**: XML candidate rows 699/700 have distinct positions, both within tolerance; no PS, XML ref, carrier or original-author restraint proof.
- **271, 472, 485, 567**: coincident candidates, no distinguishing independent identity.
- **473, 474, 486, 487, 568**: one PS-corroborated candidate but an explicit **MALFORMED_REFERENCE** carrier; it cannot be silently ignored or guessed.
- The other 11 mandatory claims were not included in the bounded export and **must be inspected** before any release claim.

In such cases a correct system reports `OWNER_EVIDENCE_REQUIRED` with the affected original source occurrence. If **no source evidence distinguishes two physical nodes**, the system needs an original-source amendment or an explicit engineering-approved binding; a different algorithm cannot logically infer the intended node.

## Architecture

### A. Exact original source extraction (one pass)

Read bytes of the Owner-selected original staged JSON and original XML and cryptographically bind the exact byte SHA-256 to the session. The parsed source is NOT Preview's derived rows or a Worker suggestion.

Index every original staged object as a distinct immutable `SourceOccurrenceId`: `(json_sha256, branch_occurrence_ordinal, hierarchy_path_indices)`. A support and a route component are never identified only by names, formatted REF values or XYZ. Keep **all** raw producer attributes in private Worker memory, including `COMPRE`, `ATTACHED_COMPONENT_REF`, `REF`, `NAME`, `POSI`, support kind and explicit gap.

The parser follows typed `BRANCH` ownership only. Build the route-edge graph from source component occurrences and explicit topology, preserving edge orientation and endpoint identity. A support's **own** `REF` is not its carrier; parse producer-declared COMPRE/ATTACHED_COMPONENT_REF according to the documented source dialect. Reject conflicting, unrecognized or multiple target route occurrences; do not silently normalize malformed strings into another component.

### B. Exact XML occurrence graph (one pass)

Index every original XML node by `(source_xml_sha256, branch_occurrence_index, node_ordinal)`, **not** NodeNumber (which can be negative/renumbered), global ComponentRefNo (repeated endpoints), or XYZ. Retain original `ComponentRefNo`, `NodeName/PS`, `ComponentType`, `Endpoint`, port connectivity, original-author restraints and exact source position.

Map an original source route **occurrence** to an XML **contiguous component run** using branch identity, exact component reference, component class, endpoint order and graph connectivity. Do not conflate a remote route-edge carrier reference with a support node `ComponentRefNo`. A source-support attachment is the exact oriented route **port/station**, not the closest XML node.

Where a source edge corresponds to multiple XML endpoints at the same XYZ, use **source-declared endpoint/edge-port incidence** (and original XML source node occurrence) to identify the supported station. If the producer did not supply the required port/occurrence relation, the ownership is **unproven**. Do not add a guessed owner or duplicate the restraint.

### C. Resolve support membership as a constraint problem

For every **mandatory** source support occurrence, require exactly one source-verified owner. Candidate positions only narrow the search; they never establish authority. Admissible positive evidence:

1. Exact source-declared XML support-node occurrence identity independently verified against the indexed original XML.
2. Verified producer attachment edge occurrence + orientation/endpoint/port incidence, then exact original XML component run and support station.
3. Unique exact PS/support identity within the original branch and source-qualified station, with no contradictory producer route declaration.
4. Matching independently authored **original** XML restraint type and explicit numeric gap on one original occurrence, with no competing match.
5. When all automatic evidence is insufficient: an **explicit, audited engineering binding** to the original source occurrence and XML branch+node ordinal, independently checked for positional, topology, type/gap, source revision and approval constraints.

A declared malformed carrier is **not a negative vote that can be overridden by geometry**. Diagnose the raw producer grammar locally and classify it; only an explicitly documented, independently attested meaning may qualify. If it cannot be validated, hold the affected support and request amended source/engineer review.

The solver is deterministic, order-invariant under unrelated records, and fail-closed for contradictory evidence. Preserve many-to-one valid support membership (e.g., one REST + one GUIDE with their **independent gaps**) without permitting one source member to be copied onto two XML nodes.

### D. Immutable proof ledger (the single handoff)

Proposed `XML229.SourceSupportOwnerLedger.v1` private contract:

```json
{
  "schema": "XML229.SourceSupportOwnerLedger.v1",
  "originalJsonSha256": "<sha256 of exact original bytes>",
  "sourceXmlSha256": "<sha256 of original XML bytes>",
  "configurationFingerprint": "<source-bound effective support rules>",
  "entries": [
    {
      "sourceOccurrence": {"branchOrdinal": 0, "hierarchyPath": [1, 8]},
      "originalXmlOwner": {"branchOrdinal": 0, "nodeOrdinal": 19},
      "sourceMemberOrdinal": 0,
      "proof": {
        "kind": "VERIFIED_ROUTE_PORT",
        "routeOccurrence": {"branchOrdinal": 0, "hierarchyPath": [1, 4]},
        "port": "END",
        "xmlComponentRun": [17, 18, 19]
      },
      "supportKind": "GUIDE",
      "explicitGapMm": 5
    }
  ],
  "mandatoryCount": 1,
  "resolvedMandatoryCount": 1,
  "unresolvedMandatoryCount": 0
}
```

All values above are **illustrative synthetic schema data**; no actual source identifiers are derived from the Owner's debug sample. The ledger is **not self-attesting**. The independent native verifier must reconstruct and challenge all source references, port incidences, original authored restraint types/gaps and original ordinals against the raw, SHA-bound originals; never trust a user-supplied `proof.kind` assertion alone.

Private raw provenance stays within the Worker. A downloadable debug file may expose only allowlisted reason categories, sampled source/candidate *indices*, cardinalities and matcher/ledger version, never original source paths, coordinates, reference strings, source content or raw SHA.

### E0. EnrichedXML is the governed engineering artifact, not a second ownership oracle

The native converter already has two XML enrichment modes:
- Ordinary `enriched-only` creates an enriched XML preview independently of the governed Final mass packet.
- Governed native Run starts with exact original XML + SHA-bound accepted Final; it stages finalized-geometry XML, invokes `_maybe_enrich_from_staged_json`, hydrates process/material data, applies bend policy, asserts accepted geometry, binds actual Final masses, then `_export_native_enriched_xml` copies the **exact converter input bytes**. The export intentionally does **not** rerun enrichment. Because Owner V6 fails in `STAGED_POSITION_TRANSFER`, no governed native EnrichedXML reaches the export stage.

The replacement must define an explicit `XML229.GovernedEnrichedXML.v1` artifact **and** an independent private ownership ledger. Do not conflate the two. EnrichedXML is the engine-readable XML engineering product; the ledger is its source/ownership proof.

#### Pipeline and custody

```text
Original XML bytes + original staged JSON bytes + effective config
    ├── Canonical support/route/XML occurrence mapping (independent evidence)
    └── Original XML + pre-Final finalized geometry + accepted Final mass basis
        ↓
Original-support-owner ledger (verified, all mandatory resolved)
        ↓
Apply approved support semantics to exact finalized XML node occurrences
        + original authored XML restraint reconciliation (never overwrite)
        + verified process/material/mass/bend enrichment
        ↓
ENRICHED XML — exact bytes frozen and SHA-256 attested
        ↓
Native CII parser/writer consumes frozen EnrichedXML bytes (no rematch)
        ↓
Independent native CII syntax, restraint, gap, occurrence, topology,
mass and source-basis postcheck; only then release
```

**Mandatory source vs generated distinction:** an already-enriched, Owner-selected XML is **input evidence**. It may have original engineering restraints, DTXR annotations, Weight, process or material values. Its source bytes must be hashed **before any rewrite**, and original-author restraints must be compared against the ledger and preserved if compatible; if incompatible, hold. A generated `DTXR_POS`/ `DTXR_PS` label is a **description**, not positive owner authority. An existing label cannot make an unverified node authoritative. EnrichedXML generated by Preview is not automatically the same artifact or source basis as the Final/native converter's exact accepted XML.

**Node lifecycle:** target keys in the ledger are `(original XML branch occurrence, original node ordinal)`, never only `NodeNumber`. After finalized-geometry reductions and approved renumbering, the source-bound ordinal mapping must prove which finalized XML node represents the original target. If that node was removed, replaced, reassigned to another branch, or its topology became inconsistent, HOLD. If an additional support node is needed, build and source-approve it **before** Weight Final and re-accept geometry and masses. EnrichedXML may not insert or reposition physical nodes after accepted Final.

**Restraint reconciliation:** for each original support member, materialize the configured type, stiffness, gap, friction and direction under its unique verified target. Compare the already-authored original XML `Restraint` elements to those expected semantics; do not delete/replace unexplained authored restraints. Preserve multiple distinct `REST`, `GUIDE`, `LINESTOP` members on one proven node with independent gaps; avoid duplicate emitted restraint slots by explicit source-member occurrence identities. No auto-REST/auto-open-end heuristic may impersonate the original supported restraint.

**Non-support fields:** retain all existing source-bound mass, process, material, wall, bend, insulation and format rules and their independent source verification. The support-owner ledger **does not approve** any of those fields. They are separate verification dimensions in the same exact consumed EnrichedXML.

**Proof and export:** the private governed artifact manifest binds `sourceXmlSha256`, `originalJsonSha256`, effective config fingerprint, accepted Final packet identity, original↔retained node ordinal map, support-ledger digest and `enrichedXmlSha256`. The native writer loads only the verified, already-frozen EnrichedXML bytes; it may not run a second enrichment or positional matcher. After CII serialization, independently verify every expected source restraint member maps to the correct CII node/type/gap and that exact accepted mass consumption succeeds. Only then publish both verified native CII and its exact consumed EnrichedXML.

**Visibility:** an `enriched-only` preview can remain available separately, explicitly marked `PREVIEW / NOT-NATIVE-RELEASED`; a governed EnrichedXML must not be presented as released after a downstream CII or independent-reconciliation failure. Private source IDs, paths, hashes, coordinates and raw carrier references remain in local trusted custody; downloadable status receipts expose only typed bounded provenance counts/categories.

### E. Single consumer path and source lifecycle

1. Before Preview/Weight Final: construct and verify the ledger against the *exact* original source + indexed JSON. If any mandatory support cannot resolve, expose a bounded `OWNER_EVIDENCE_REQUIRED` review **before** Final acceptance.
2. Source restraint replay writes the verified ledger's target node occurrences only; `xml229_prefinal_restraint_source.resolve` must not independently pick a nearest/first source support.
3. If solving requires introducing an attachment node, do so **before Final acceptance**, with explicit source/engineering approval, topology verification and a newly generated source basis. Invalidate earlier Weight/Final; never mutate Final geometry behind the acceptance.
4. Bind the accepted Final to the ledger hash, source XML SHA, staged JSON SHA, config, original ordinal map, support census and accepted physical masses.
5. Native `STAGED_POSITION_TRANSFER` **consumes the same ledger**, translates original ordinal through verified retained-source-ordinal mapping, checks exact source member IDs/kind/gaps and prior explicit XML restraints, and **never reruns independent positional matching**.
6. The native model and emitted CII must independently verify every support member's CII restraint type/gap, original owner mapping, uniqueness, topology and accepted mass. No release before all independent checks PASS.

Any source edit, branch/config/transform change or new manual engineering binding changes the source basis and requires fresh Worker receipts, Preview, Final acceptance and native release verification.

### F. Acceptance criteria / non-negotiable tests

- **Identity**: a distinct-position overlap and a true same-XYZ two-owner collision do not silently select a node; a valid exact route+port identifies one owner regardless of XML enumeration order.
- **Carrier grammar**: round-trip original producer's actual COMPRE/ATTACHED_COMPONENT_REF syntax from checked-in fixtures; unknown, conflicting, missing, duplicate and cross-branch references hold. Never use support's own REF as route authority.
- **Topology**: repeated ComponentRefNo across two contiguous XML endpoint records is not two route owners; remote carrier edge resolves only via explicit port incidence. Branch topology and source occurrence remain exact.
- **Many-to-one**: distinct source REST(0mm), GUIDE(5mm), LINE STOP(8mm) survive on one **independently verified** original XML occurrence, with no member/gap dropped or attached twice.
- **Lineage**: source JSON/XML/config/Final hash drift, stale ledger, original ordinal drift, removed owner, prefinal/native disagreement or unapproved topology modification all fail closed.
- **Replay**: prefinal and native use **exactly one** ledger, source IDs and target ordinals; test proves no secondary spatial owner selection runs.
- **Release**: real native CLI emits independently verified restraint slots and accepted mass, with no CII file on every invalid/adversarial scenario; run in Pyodide/Chromium as well as Python 3.11/3.12 and Node.
- **Owner-specific**: use exact 21-claim V6 basis, including the 11 omitted claims; compare independent private source proof, not inferred owner counts. Expect 21 → 0 **only if** each claim receives valid positive evidence. Verify complete original-support census and actual CII postcheck.

### G. Required changes (planned together, not eight more incremental matchers)

- `converters/scripts/xml229_prefinal_restraint_source.py`: cease selecting independent ownership by branch/proximity score.
- `converters/scripts/xml229_prefinal_restraints.py`: replay source-verified ledger and record exact support member provenance.
- `converters/scripts/xml229_native_final_mass_binding.py`: independently verify source ledger and approved ordinal mapping in Final packet, including any approved support-node changes.
- `converters/scripts/xml_to_cii2019_master_addon.py` and `xml_to_cii2019_patched.py`: replace `_position_bound_dtxr` as owner authority with ledger consumption; preserve all member rows and native refusal when ledger incomplete.
- Workflow Worker, accepted-Final packet, UI review and CII verifier: carry and challenge ledger hash/coverage/candidate reasons from source through release.
- Root/docs mirrors and exact-head CI: enforce source equality and original basis tests.

## Evidence still required for the Owner's case

The bounded V6 JSON intentionally lacks actual original staged support carrier declarations, route hierarchy, node endpoint attributes, source XML occurrences and 11 of 21 conflicts. A safe automatic binding cannot be manufactured from that summary. Obtain the exact Owner-selected original XML, indexed staged JSON, saved effective support config, finalized XML retained-ordinal basis and accepted Final packet **in the private source-bound environment**. Use these to prove each mandatory support owner or surface an explicit engineering review choice. Never print private source data in an audit download.

## Release decision

**HELD** until a complete ledger has been independently reconstructed from the exact originals, all mandatory source support occurrences are reconciled one-to-one to original XML node occurrences, and actual native CII engineering/mass checks pass. Neither this RFC nor prior V2–V6 synthetic tests can approve that release.
