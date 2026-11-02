# XML229 — historical, superseded row-owner architecture (DO NOT IMPLEMENT AS-WRITTEN)

> **SUPERSEDED by [coordinate-preserving physical-node / nodal-restraint / rigid-split two-pass design](xml229-coordinate-vertex-nodal-two-pass-rfc.md) (Owner correction 2026-11-02).**
>
> The earlier assumption that every staged support must choose **one original XML row** was incorrect for multiple connected source occurrences at one physical node, including repeated `-1` placeholders. The earlier "unresolved coincident rows ⇒ HOLD" reasoning and the synthetic 27-case test harness **do not qualify the corrected design**. Read the successor RFC as the authoritative scope: (1) physical-node equivalence with source XYZ preserved, (2) 1..6 nodal support slots and Step 7→8, (3) rigid splitting followed by a node/weight second pass. Historical regression gates below still apply where compatible.

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

On a **selected JSON-governed support-transfer path**, read bytes of the Owner-selected original staged JSON and original XML and cryptographically bind the exact byte SHA-256 to the session. In the independent XML-only path, preserve native XML source and already-authored restraints without manufacturing a JSON source or ledger. The parsed source is NOT Preview's derived rows or a Worker suggestion.

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

1. **Selected JSON-governed transfer only:** before Preview/Weight Final, construct and verify the ledger against the *exact* selected original source + indexed JSON. If mandatory support ownership cannot resolve, expose bounded `OWNER_EVIDENCE_REQUIRED` review **before** Final acceptance. **XML-only source conversion must not require staged JSON or a support ledger; optional master/format ambiguity must not block core XML-only conversion.**
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

## H. Historical regression risk register: compulsory compatibility gates

This register is derived from actual repository PR descriptions/issues, not from Owner's private files. **No check is presently implemented by this design PR**. The production migration cannot be declared ready until the exact-head implementation demonstrates the relevant positive and negative tests in **real native conversion and independent output verification**, not merely in UI presentation.

| Historical failure | Source | Mandatory design invariant and executable acceptance oracle |
| --- | --- | --- |
| Source JSON restraints missing from governed Final and CII | PR #357 | Pre-Final provenance ledger and the frozen EnrichedXML must contain the exact same mandatory support-member occurrence census. Independently parse emitted CII RESTRANT records and prove type/gap/direction/friction/stiffness for every member; detect duplicate or missing output. |
| Step 7 edited support kind silently ignored, Step 8 GUIDE/LIM numerical codes reversed | PR #365 | Hash-bound *saved effective* Step 7/8 mapper and mutation rules must be independently recomputed from source. Confirm `REST/+Y=14`, `GUIDE/GUI=8`, `LINESTOP/LIM=9` with controlled real-CII positives. Reject stale saved `7→8`, `10→9` contradictory rules, unsupported custom aliases and unsafe type/gap defaults. |
| Alias `NODEGAP=0` falsely contradicted explicit `CMPSUPGAP` | PR #372 | Apply the existing independently verified source-gap precedence before ledger commit. `CMPSUPGAP=10mm GAP` + legacy `NODEGAP=0` selects explicit 10 mm; conflicting *nonzero* gaps HOLD. Independently verify generated XML/CII gaps and original zero where authored. |
| Multiple REST, GUIDE, LINE STOP members accidentally collapsed or assigned to wrong node | PRs #365/#370/#384/#385 | Ledger key **source support-member occurrence**, not (node, support kind). Allow many distinct source members to one verified original XML owner without deduplicating their gaps. Validate 0/5/8 mm synthetic triple; reject duplicate source-member transfer and a wrong gap in CII. |
| TEE port 3 falsely introduced branch detour / DY | PR #356 | Route-port owner graph **preserves existing TEE/branch-specific port semantics**, including genuine 1,3,0,2 origin and validated 1→0→2 main run, without creating/removing/reordering physical nodes after Final. Independently check BM2 62 tee vectors/785-element baseline where that fixture/config applies, other edge types and explicit authored branch-port witnesses. |
| Datum/offset, snap/coincidence, off-pipe support and default restraint axis/stiffness changed engineering placement | Issue #350, PR #370 | Separate **coordinate-frame/Datum transformations** from ownership. Every allowed transform must be source/config-bound, unique and geometrically verified; off-pipe, multiple-transform and competing-snap cases HOLD. Retain original authored axis, stiffness, friction, direction and explicit zero; apply configured fallback only where source policy permits. Include nonzero Datum, rotated frames, endpoint/interior support, negative/blank/zero contrary cases in EnrichedXML and parsed CII. |
| Welding TEE identity or SIF displayed in Evidence Tree failed to reach correct native CII slot | Issues #363/#364 and PR #356 | Tee/SIF semantic source claim is **not** automatically a support restraint. Preserve independent tee occurrence→SIF owner proof from the same exact source graph. Validate `TEEDESC` precedence and Welding Tee CII numeric SIF code **3**, and verify emitted `SIF&TEES` owner/section without changing qualified TEE vectors or inventing SIF from an unsupported DTXR label. |
| Repeated `NodeNumber=-1`, reused `ComponentRefNo`, changed ordinals led to lost/duplicated owners | PRs #260/#383 and issue #136 | Identify original nodes using source hash + branch **occurrence** ordinal + node ordinal, route components by *contiguous run* and endpoint/port, not global identifier or XYZ. Check PL01/PL06 19 branches, 871 original nodes, 322 repeated negative-one IDs, and original→retained map bijection under both Mode A and Mode B. |
| Remote valid COMPRE edge vetoed unique PS/original-author owner, increasing HOLD from 9 to 56 | PRs #387/#388 | Carrier relationship has separate types: `source support → source edge` and `source edge/port → XML node`. No direct `COMPRE === XML support ComponentRefNo` assumption. Genuine remote edge with zero equal candidate refs must not veto *independently verified and noncontradictory* node evidence; false/duplicated carrier claims HOLD. Replay the authentic B7410250 source and a dedicated V4 9→56 regression. |
| A declared carrier was `MALFORMED_REFERENCE`, and V6 fixed a different branch-walker case but did not improve the Owner's 21 | PR #389 + Owner V6 | Producer-specific COMPRE grammar tests against **raw selected source**; types, normalization and route identity separately verified. Log reason locally without leaking reference. Mandatory claim-count **21 is a baseline, not a target to manipulate**. Exact original Owner replay must account for all 21 (10 sampled + 11 not exported). |
| Original XML authored restraint falsely considered synthesized independent evidence | PR #386 | Original-author type/gap comes **only** from original immutable XML before JSON replay. Replayed support attrs may not self-certify ownership in the ledger. Tampered self-proclaimed proof fails independent replay; original-author incompatible type/gap HOLD. |
| Source-only conversion blocked by optional masters, conflicting Regex Format 1/2 or absent Rating | PRs #374/#378, issue #376 | **Keep XML-only mode separate** from selected JSON-governed support transfer. Require **no JSON ledger** when source-only is selected; missing Line List/Piping Class/MAT Map and Rating do not veto core conversion. Conflicting Format 1/2 remain two non-authorizing Preview passes; no silent enrichment selection. Explicit selected JSON may **not** fall back to XML-only on a ledger failure. Native syntax must still pass. |
| Material, wall, P/T/density and CII code stayed blank or default despite Preview | PRs #371/#372 and issue #364 | Support ledger grants **no** process/material/wall authority. Use separately SHA-bound selected master and saved column/mapping evidence. Independently compare EnrichedXML `WallThickness`, `MaterialCode/Number`, pressures, temperatures, densities against actual emitted CII numerical fields. Reject missing/misleading defaults and ambiguous master rows; preserve legitimate original values; explicit zero ≠ absent. |
| Accepted valve kg at physical 5950→5960 dropped to zero CII RIGID | PRs #371/#372 and issue #136 | Exact original physical occurrence and split allocation remain owned by existing Final mass binder, not the new support ledger. Compare every accepted kg (including approved zero) to native RIGID kg×10 pointer and independent emitted-CII proof; do not infer from a matching substring or transfer weights by node name/proximity. |
| Pre-Final topology/source revision or instrument modeling modified after accepted Final | PRs #359/#362 and issue #136 | Any original source amendment, node insertion/rigidity change, transform/config/approved-binding change invalidates old Preview/Final and ledger; require fresh original XML digest, retained ordinals, full physical/fact census, accepted masses and replay. EnrichedXML is exactly the frozen consumed native XML, not a separately reconstructed approximation. |
| Wrong source/master identity survived cached or stale session/reload | PRs #253/#260/#361; issue #229 | Bind original XML bytes, original JSON Blob bytes if selected, master row contents, selected branch scope, saved mapping/config, source-revision generation and Final packet into **one** request fingerprint. Reject stale cache, prior session Worker, reused old Final, selected-format disabled/enabled persistence drift, late async responses and download after changed basis. |
| A fix merged into a feature branch, not production main | PRs #380/#381 | Deployment gate compares exact intended feature code blobs to **live main** and served `docs/` mirrors, then validates the real browser/Pyodide loaded source version and artifact SHA; merge status alone is insufficient. |
| Native Python dependency missing from Worker copied asset inventory | PRs #368/#369 | Verify recursive Python imported module closure against both Worker `SCRIPT_FILE_NAMES` inventories; cold-start actual Pyodide and assert ledger module imports. Local Python PASS alone is insufficient. |
| Native typed error masked as `UNCLASSIFIED_EXCEPTION` or UI claimed Run never began | PRs #367/#373/#379, issue #375 | Exact stage + typed bounded fail-closed reason in native log and UI; source-safe allowlisted status sample. Preserve **observed candidate failure** separately from independent **release HELD**. All new failure codes appear in Python/JS diagnosis tests with privacy negatives. |
| Worker/JSON large scale, stale event ring, timeout, missing instrument advisory | PRs #362/#373/#378, issues #375/#376 | Construct private source/edge/occurrence indices once, linear or indexed near-linear (no all-pairs scan); no original JSON bytes in UI state; paginated Worker, cancellation and revision fencing. Compare cold/warm on actual master sizes, 14.5 MB JSON and Owner 622,915-occurrence regime where available; preserve bounded phase telemetry beyond 256-event ring; browser DOM review remains optional to native correctness. |
| Test-only CII is valid syntax but wrong engineering meaning or lacks Owner acceptance | PRs #377/#378/#385/#389, issues #364/#376 | **Three different verdicts**: syntax-valid optional XML-only, source-bound native synthetic engineering verification, exact Owner governed CII approved. Green unit CI gives only first/second. Require independent per-record CII engineering and source-to-mass reconciliation on exact real session; no download/release when any mandatory source support evidence is unresolved. |

### I. Migration and regression qualification protocol (not optional)

1. **Pin baselines from current main.** Capture exact source/test/runtime/served blob IDs, and golden traces for XML-only, EF05, authentic BM2, B7410250 support carrier, Firstpass and supported PL01/PL06 Mode A/B sources. Preserve prior V2–V6 negative cases, including the original V4 9→56 regression. Record expected outputs and expected holds independently; do not use an existing parser's output as the only oracle.
2. **Shadow ledger without engineering authority.** Compute new support→original occurrence ledger beside the existing pipeline **only when original JSON was selected**; it must not mutate the candidate XML, Final packet or native model. Compare per-source-member ownership, original gap/kind, branch/port, prefinal versus native decisions and contradiction counts. A difference is actionable evidence, not automatic approval.
3. **Reconcile every source-owned field.** For each authentic source basis, compare untouched authored XML, old/new EnrichedXML with justified field deltas, accepted original masses, original+retained ordinal mapping, emitted CII `ELEMENTS`, `RIGID`, `RESTRANT`, tees/SIF, process/material, CII syntax and full model invariants. Enrichment **must not** silently overwrite unrelated source authority.
4. **Cut over atomically.** Remove both independent spatial owner-**authority** paths from source prefinal and native conversion in the same implementational release. Keep old pure indexing and evidence lookup where useful but no second final owner vote. Store the ledger hash in the packet, regenerate/challenge it from exact originals inside native, and write **one** frozen SHA-bound EnrichedXML consumed by the converter.
5. **Test in actual served Chromium/Pyodide.** Cold/hot session, browser reload, saved mapper changes, selected/absent JSON, optional masters, duplicate XML ordinals, malformed/remote carrier, negative hold, module import closure, same output source SHA and live deployed revision. Performance and cancellation regressions are release blockers.
6. **No synthetic-only declaration of success.** Before merge or release, all scoped workflows must be PASS on **exact PR head**, actual Owner 21-claim replay must provide independent occurrence-by-occurrence evidence or an explicit reviewed HOLD, independent reviewer confirms engineering field/mass/topology reconciliation and the Owner authorizes release. Legacy unrelated workflow failures must be classified, not silently waived.

**Release matrix:** XML-only success does **not** approve JSON-governed support transfer. A valid ledger does **not** approve Final mass, material, topology or CII. Full Worker Final mass census does **not** approve native CII. A correct EnrichedXML does **not** approve its independently unverified CII serialization.

## Evidence still required for the Owner's case

The bounded V6 JSON intentionally lacks actual original staged support carrier declarations, route hierarchy, node endpoint attributes, source XML occurrences and 11 of 21 conflicts. A safe automatic binding cannot be manufactured from that summary. Obtain the exact Owner-selected original XML, indexed staged JSON, saved effective support config, finalized XML retained-ordinal basis and accepted Final packet **in the private source-bound environment**. Use these to prove each mandatory support owner or surface an explicit engineering review choice. Never print private source data in an audit download.

## Release decision

**HELD** until a complete ledger has been independently reconstructed from the exact originals, all mandatory source support occurrences are reconciled one-to-one to original XML node occurrences, and actual native CII engineering/mass checks pass. Neither this RFC nor prior V2–V6 synthetic tests can approve that release.
