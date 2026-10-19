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
| `FLAN` with positive Final kg | Narrow same-component-reference RIGID→FLAN case may be classified | Differentiate physical flange mass from its upstream component and disallow borrowing wrong owner mass |
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
`explicitRigid2SourceKg`, `unresolvedPositiveNativeOwnerKg`,
`nativeRigidEquivalentKgUnderClaimedScale`, and the algebraic aggregate
difference. **Numerical balance is never native occurrence-to-slot proof**:
a controlled forged 2000-unit single rigid output matches four source masses
of 200kg at claimed scale 10 while three component owners remain unresolved.

Optional `--deny-unresolved-mass` fails with
`NATIVE_OWNER_RULE_UNRESOLVED` **before writing the report** if a positive
source physical has no explicit `Rigid=2` marker. This is a conservative
diagnostic guard, not an engineering rule: an explicitly approved
same-reference RIGID→FLAN allocation could still be blocked by it. Passing the
flag alone does **not** prove native output slot ownership, Final authorship,
or release. The inventory is not an allocation algorithm and **always**
emits native-release/Final-consumption verification as false. The private
report must not be published with source/master rows.
G5 synthetic tests reject forged authority, source/engine duplicate/drift,
unexpected CII pointers, altered mass/units and invalid scale.

**EXACT_NEXT_ACTION:** Owner/engineering supplies approved per-class physical
mass-owner geometry and representation. Implement a separate, tightly scoped
native release candidate with an independently produced complete lineage and
actual native output challenge. Do not bypass held R2/G5 authority in this PR.
