# XML229 — native mass-owner decision gate (non-releasing)

**Owner #229 · Release authority #301 · separate Weight Match repair #310**

## Proven technical boundaries

The genuine production Worker / 41-branch public EF05/BC4 Chromium test on draft
PR #310 has passed the 80% Apply oracle: 175/175 occurrence/kg values, 0 differences,
17 paginated pages, edit preserved and first populated Applied Weight input visible.
Those are editable drafts and do not create accepted Match-1/Final decisions.

The original-Blob GC-PW Worker challenge separately produced **three synthetic**
reviewed Final masses and R2-verified three positive engine-input XML weights.
The exact XML SHA was submitted to the Python native runtime CLI. The CII output
had **one positive RIGID record**, not three. This is a *real exercised boundary*,
not an Owner-private case or proof that all three should be RIGID.

The current native `xml_to_cii2019.py` builds RIGID edges when the arriving node
has `Rigid=2`, or when an upstream `Rigid=2` arrives at a FLAN with the same
component reference. A positive XML node `Weight` alone is not a CII mass-slot
declaration. The CII ELEMENTS section points at 1-based RIGID record indices.
Mass is emitted from the native rigid owner node, multiplied by the configured
one-time `weight_scale` (legacy 10). Native edge cleanup, split and renumbering
can change correspondence; no node number, branch name, count or aggregate
equality by itself establishes original physical identity.

## Engineering decision matrix — no rule is silently approved

| Enriched physical | Current native classification | Required engineering specification |
| --- | --- | --- |
| `RIGID`, `Rigid=2` | Incoming edge may be a RIGID owner | Prove exactly which retained element and rigid slot owns original mass, and that transformations preserve or explicitly allocate it |
| `VALV` with positive Final kg but no `Rigid=2` | Does not automatically create RIGID record | Engineering chooses an appropriate mass representation, geometry, split policy and output convention. Do **not** auto-convert to RIGID |
| `INST` with positive Final kg but no `Rigid=2` | Does not automatically create RIGID record | Engineering chooses how an instrument physical mass is consumed, if and where supported; prohibit silent loss/duplication |
| `FLAN` with positive Final kg | A retained incoming RIGID→FLAN edge qualifies when the immediately prior node has `Rigid=2` and both component references normalize to the same nonblank value | Its native mass must come from the **flange arrival node**, never the prior RIGID owner; source XML adjacency alone is not post-cleanup lineage |
| Other positive original physical type | No globally proved native ownership rule | Explicit engineering type/slot allocation and fail-closed independent output challenge required |

No inferred or score-based rule is authority. Manual draft, default valve weight,
suggestion confidence, XML-only run and existing Match-1 history cannot substitute
for an individually reviewed Final engineering decision.

## Required independent acceptance evidence

1. Exact complete original physical census and source/master/input/review revisions,
   independently authored and hashed. Historical 125 accepted Match-1 decisions
   are separate and immutable, not mass-upgraded.
2. One canonical explicit source/accepted-Final mass per original occurrence
   with reason and independent author/revision. No unresolved, conflicted or
   decision-stale occurrence is eligible.
3. Original occurrence → R2 **exact** engine XML identity (branch occurrence,
   node ordinal, type, ref, position, positive mass and identical XML SHA).
4. Engine XML → native retained edges/physical child owner mapping, including
   renumbering, split allocation and explicit native element/rigid indices.
   Independent evidence must establish every child pointer and prohibit
   duplicate/orphan or nonexistent native mass slots.
5. Actual emitted CII ELEMENTS→RIGID mass, declared force units, exact once
   conversion and sum of *all* accepted physical child allocations, with an
   independently authored challenge (G5/I03); no self-declared proof loop.
6. Owner engineering approval and separate merge/deployment authorization.

Until all gates pass, `xml229-original-json-engineering-authority` remains
**HELD**. Explicit XML-only conversion is allowed solely as a clearly selected
test mode and excludes draft/JSON-derived engineering mass authority.

## Evidence-only inventory CLI

`scripts/xml229-native-mass-owner-inventory.py` consumes private local inputs:
- `--r2-transfer`: a complete R2 evidence record from the governed review,
  not a hand-constructed substitute for authority
- `--engine-xml`: exact verified pre-native XML bytes
- `--cii`: actual native CII file
- `--weight-scale`: asserted configured scale, checked numeric but not by
  itself independent proof of the converter's invocation
- `--expected-cii-sha256`: expected SHA from independent output custody
- `--output`: **OWNER-LOCAL PRIVATE** summary path

It validates SHA, R2 original/engine identity and owner-count consistency;
checks native CII structure, force units and ELEMENTS→RIGID pointer integrity;
and gives only aggregate per-type counts and masses. It separately reports
`explicitRigid2SourceKg`, `sameRefRigidToFlanCandidateKg`,
`preConversionRigidEdgeCandidateKg`, `unresolvedPositiveNativeOwnerKg`,
`nativeRigidEquivalentKgUnderClaimedScale`, and the algebraic aggregate
difference. **Numerical balance is never native occurrence-to-slot proof**:
a controlled forged 2000-unit single rigid output matches four source masses
of 200kg at claimed scale 10 while three component owners remain unresolved.

Optional `--deny-unresolved-mass` fails with
`NATIVE_OWNER_RULE_UNRESOLVED` **before writing the report** if a positive
source physical matches neither **pre-conversion** native incoming-edge
predicate: (a) `Rigid=2` on a non-first arrival node; or (b) `FLAN`
immediately after `Rigid=2` with identical nonblank normalized component
reference. A `Rigid=2` tag on the first branch node has no incoming element,
and a mismatched flange reference cannot borrow its predecessor's mass.
Passing this flag does **not** prove that the candidate edge survives
cleanup/renumbering, maps to the correct native output slot, has a reviewed
Final decision, or is release-ready. The inventory is not an allocation
algorithm and **always** emits native-release/Final-consumption verification
as false. The private
report must not be published with source/master rows.
G5 synthetic tests reject forged authority, source/engine duplicate/drift,
unexpected CII pointers, altered mass/units and invalid scale.

### Current native edge-predicate challenge (not owner release)

Additional controlled actual Python CLI cases explicitly exercise:
- **Same-reference** RIGID(35kg)→FLAN(70kg): two native RIGID output
  records represent 1050 scaled units, with the flange record receiving its
  **own** 70kg, not its upstream RIGID's 35kg. VALV(45kg) and INST(50kg)
  still lack an established native RIGID edge in this model (95kg).
- Identical adjacency **but mismatched component references**: flange must
  not qualify as a RIGID edge, output has one 35kg direct RIGID and 165kg
  without the known pre-conversion predicate.
- A first-branch-node `Rigid=2` marker creates no incoming native edge;
  a later same-reference flange can independently qualify.
- Each remains `nativeCiiPhysicalSlotVerified=false`. Source adjacency and
  numeric equality cannot certify post-cleanup native edge identity.

**Engineering action:** distinguish legitimate native edge eligibility from
independent output mapping; do not silently mark a VALV, INST or unrelated
FLAN mass represented by another node's native RIGID slot.

## Optional owner-local provisional native slot challenge

The evidence-only inventory supports
`--provisional-lineage-claims path/to/OWNER_PRIVATE_claims.json`.
This is deliberately **not** Final approval, an allocation policy, or native
release; the claims and the R2 transfer stay on the Owner's machine and are
not printed or committed.

The JSON record must have schema
`XML229.NativeMassOwnerProvisionalClaims.v1`, exact
`basisId`, `finalIntentSha256`, `engineInputSha256`, `ciiSha256`,
`nativeCiiReleaseAuthorized:false`, and a `rows` array spanning **every**
positive original physical occurrence exactly once.

For an occurrence with a known pre-conversion native RIGID edge predicate,
`CII_RIGID_CANDIDATE` requires its `originalOccurrenceId`,
zero-based `nativeElementIndex`, zero-based `rigidRecordIndex`, and
exact integer `ciiFromNode` and `ciiToNode`. The checker verifies:
- The R2 original physical identity and exact engine XML node mass
- The independently supplied candidate belongs to a known direct-Rigid2
  or same-reference RIGID→FLAN predicate (no invented VALV/INST mapping)
- The actual emitted CII ELEMENTS record points at the claimed RIGID record
- The actual endpoint numbers match the claim and the emitted RIGID weight
  matches *that physical's* engine kg multiplied once by the claimed scale
- No positive RIGID record is unclaimed and no claimed slot is duplicated

`UNRESOLVED` requires an explicit reason and **no** native indices or
endpoints. An original physical may remain unresolved even when its
pre-conversion predicate is eligible: an edge can be cleaned, split or
renumbered. A positive emitted native slot cannot be silently marked
unclaimed. The output adds only aggregate challenged/unresolved counts
and kg; it does not return raw original IDs.

**Critical evidentiary limit:** a claimant-supplied endpoint and pointer that
match CII bytes do not independently prove that this original physical owns
the native edge. Sources with identical kilograms can be swapped by a
dishonest or mistaken claimant. Therefore even a completely passing
provisional challenge sets `verifiedClaimAuthor:false`,
`independentSourceLineageVerified:false`,
`physicalMatch2ConsumptionVerified:false` and
`nativeCiiReleaseAuthorized:false`. For native engineering authority,
a separately authored G5 complete source/Final/retained-edge lineage
must prove the original-to-native geometry and allocations without
depending on this proposed claim as its own oracle.

The held-out public cases cover same-reference 35kg RIGID / 70kg FLAN
with exact CII pointers, plus 45kg VALV / 50kg INST declared unresolved.
Negative cases challenge forged authority, missing or duplicated owners,
illegal valve-to-RIGID claims, duplicated/mispointed native slots,
wrong endpoints, altered individual emitted mass, and a positive output
slot omitted from the claims. Those exercises do **not** create reviewed
Final rows or a signoff.

## Production retained-edge observation (non-releasing, Owner-local)

The native Python runtime's retained `ConversionModel` is an additional
custody boundary. A synthetic source node can be pruned or renumbered before
`ELEMENTS` and `RIGID` are emitted; a pre-conversion `Rigid=2` or
same-reference `RIGID→FLAN` predicate is not proof of a retained edge.

The separate diagnostic
`scripts/xml229-native-retained-edge-observer.py` invokes the **unchanged**
`xml_to_cii2019_runtime_custody.py` with *only* exact enriched engine XML,
output CII path and declared weight scale. It intercepts the final model
just before CII serialization and writes an Owner-local witness containing
the retained edges' native element indexes, rigid indexes, endpoints,
post-cleanup runtime/source node numbers, owner component types and masses.
It requires actual output bytes and the full emitted CII pointer/mass records
to match the captured model. The original model witness contains sensitive
physical identifiers: it is created **exclusively** with mode `0600` on
POSIX; an existing witness is never overwritten. Do not upload this witness,
Owner source XML, or R2 original occurrence mappings to public CI or GitHub.

For a controlled input, run:

```bash
python3 scripts/xml229-native-retained-edge-observer.py \
  --engine-xml /PRIVATE/R2-enriched-engine.xml \
  --cii-out /PRIVATE/native-output.cii \
  --private-witness-out /PRIVATE/retained-edges.json \
  --weight-scale 10
```

The ordinary inventory then accepts the optional
`--private-retained-edge-observation /PRIVATE/retained-edges.json` with
the matching R2 transfer, engine XML, CII bytes and expected CII SHA.
It independently checks the runtime observation hashes, every emitted
CII ELEMENTS endpoint and RIGID pointer, and every positive native
RIGID mass. For each retained positive owner it also requires a
**unique original R2 node match** (source node number, branch,
component type/reference/endpoint and XYZ position), exact original
engine mass, and an independently located original *upstream*
node within the same branch whose type/reference/position matches the
retained upstream node. The original source Rigid or same-reference
RIGID→FLAN predicate must justify a positive rigid slot. If a native
split, cleanup, overlapping component signature, or ambiguous source
node prevents a unique original-edge link, the checker **fails closed**.
This intentionally conservative 1:1 witness cannot infer split allocations.

The returned aggregate `retainedEdgeChallenge` may report matched and
unrepresented kilograms, but never original physical IDs. It always sets
`independentRuntimeAuthorVerified:false`,
`independentOriginalToNativeGeometryVerified:false`,
`physicalMatch2ConsumptionVerified:false`,
`nativeCiiPhysicalSlotVerified:false`, and
`nativeCiiReleaseAuthorized:false`.
The observation is first-party native-runtime data—not independent
engineering approval or a separately authored G5 source oracle.
Only an independent original-Final→retained-edge/split lineage and
separate Owner release review can advance governed Output/Run.

Controlled exact-runtime tests cover direct RIGID35 and same-reference
FLAN70 mapping to two distinct emitted CII slots, separately unmatched
VALV45 and INST50, wrong-reference FLAN, forged upstream source identity,
type, reference, position, emitted pointer, individual mass, and private
witness file protection. None modifies native converter logic.

**EXACT_NEXT_ACTION:** Owner/engineering supplies approved per-class physical
mass-owner geometry and representation. Implement a separate, tightly scoped
native release candidate with an independently produced complete lineage and
actual native output challenge. Do not bypass held R2/G5 authority in this PR.
