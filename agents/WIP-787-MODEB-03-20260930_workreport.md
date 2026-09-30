# WIP-787-MODEB-03-20260930 — deterministic post-topology numbering

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
MODEB-01 RESULT = issuecomment-5900512596 / PR #788
MODEB-02 RESULT = issuecomment-5902078982 / PR #789
DEPENDENCY_HEAD = 928d883a16754c2458b0a6e0d12aab217cec69f7
DEPENDENCY_COMPOSITE = fnv1a32:d5104931
BRANCH = agent/issue-787-modeb-03-numbering-20260930
PR = #790
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Frozen input contract

MODEB-03 consumes `xml-cii-mode-b-composite/v1` only after join evaluation is complete. It does not modify candidate scores, states, accepted edges or connected-component ownership.

Frozen MODEB-02 graph:

```text
vertices                         452
source route edges               445
accepted cross-document edges      1
insufficient candidates             2
connected components               6
same-position groups              120
composite fingerprint  fnv1a32:d5104931
```

## Numbering authority

`xml-cii-mode-b-numbering/v1` assigns a deterministic output NodeNumber ledger after topology completion.

Rules:

1. `sourceIdentity` is immutable.
2. source `NodeNumber` is immutable provenance.
3. positive source engineering nodes receive globally unique output numbers.
4. non-positive helper/sentinel NodeNumbers are preserved unchanged.
5. positive numbering is graph traversal based, not fixed per-file offsets and not source-NodeNumber arithmetic.
6. same-POS identities remain separate rows.
7. numbering cannot create/remove/accept a topology edge.
8. vertex/source-edge/accepted-edge array ordering cannot change the source→output mapping.
9. malformed graph custody and invalid numbering configuration fail closed.
10. converter handoff remains MODEB-04.

Default namespace:

```text
start = 10
step  = 10
```

Accepted cross-document edges are oriented source-route tail→head when that direction is uniquely determined. Otherwise numbering uses a deterministic canonical traversal fallback without changing topology authority.

## Real-corpus numbering result

Frozen numbering fingerprint:

`fnv1a32:2eb8628d`

Pinned statistics:

```text
source vertices                    452
connected components                 6
positive engineering vertices      234
non-positive sentinel/helper rows  218
unnumbered source rows                0
first positive output NodeNumber     10
last positive output NodeNumber    2340
accepted cross-document edges         1
canonical fallback orientations       0
```

All 234 positive output NodeNumbers are globally unique. The source corpus's repeated positive engineering labels remain untouched as provenance while their output labels no longer collide.

All 218 non-positive rows remain source-preserved. The real corpus includes both `-1` and `-2`; MODEB-03 does not promote these helper/sentinel values merely to obtain uniqueness.

## Accepted boundary orientation

The frozen MODEB-02 edge:

`S8810010 /B1 Node570 ref 1006649732/121515 Endpoint2`

→

`S8811956 /B1 initial node ref 1006649732/121345 Endpoint1`

is oriented uniquely:

`TAIL_TO_HEAD`

No canonical fallback was required in the real corpus. This orientation is derived after topology acceptance and cannot alter the accepted edge identity.

## Deterministic component traversal

Pinned component vertex counts in numbering order:

`[40, 52, 43, 183, 98, 36]`

The 183-vertex component is the only two-document connected component established by MODEB-02. The other five components retain source-document custody.

Representative pinned mappings:

```text
S8811956 /B2 node 70 ref 121401    -> output 10
S8811956 /B2 node -2 ref 121402    -> output -2 (sentinel preserved)
D8810083 /B1 node 680 ref 119309   -> output 2340
```

## Synthetic qualification

MODEB-03 tests prove:

- duplicate positive source NodeNumbers across documents receive distinct outputs;
- non-positive helpers do not consume positive numbering slots;
- accepted tail→head topology traverses across documents without file offsets;
- reordering graph arrays preserves the source→output mapping;
- coincident source identities remain distinct numbered rows;
- duplicate source identities, missing edge endpoints, invalid start/step and malformed graph custody fail closed;
- runtime/docs numbering core is byte-identical.

## Exact-head qualification evidence

Initial full exact-head qualification:

```text
head       35c9de3622b74ed8ecb0f4e1548f8749fa6d1aaa
numbering workflow run 36654377365 — SUCCESS
semantic browser run   36654377346 — SUCCESS
artifact               11071832832
artifact zip sha256     45e32faf4bb4b8a7c87b62ebd0c11424aee00228dcd52ee66c78909fb4506051
```

That run passed:

- MODEB-03 synthetic + real-corpus numbering tests;
- frozen MODEB-02 graph authority;
- frozen MODEB-01 observation authority;
- existing single-document topology integration;
- all Issue #776 focused authority regressions;
- all PR #780 worker/dataset regressions;
- deterministic numbering evidence generation;
- semantic-core browser timing.

Adjacent engineering-calculation failures were compared against exact stacked #789 base `928d883a...`. Head and base contain the same six failure identities, so classification is:

`baseline-only-failures`

No new adjacent failure identity was introduced by MODEB-03.

## Frozen MODEB-03 downstream fixture

Files:

- `tests/fixtures/xml-cii-mode-b-numbering-v1.json`
- `tests/xml-cii-issue-787-mode-b-numbering-fixture.test.mjs`

The fixture pins:

- numbering fingerprint;
- source composite fingerprint;
- all aggregate counts;
- accepted-edge orientation;
- component cardinalities;
- representative positive/sentinel mappings;
- global positive-number uniqueness and full source-identity custody.

The fixture-inclusive final head is undergoing exact-head requalification. MODEB-04 must consume this numbering result rather than recompute graph authority or numbering.

## Falsifiers retained for MODEB-04

A `PLAN_UPDATE` is required if converter handoff proves any of the following:

- the native writer requires helper/sentinel endpoints to receive positive NodeNumbers;
- final CII semantics require original positive source NodeNumbers themselves to be preserved rather than remapped;
- materializing engine input requires changing MODEB-02 join authority;
- the handoff cannot preserve source identity/provenance through numbering;
- production binding requires `SYS-001_Single.xml` as runtime authority rather than test oracle.

None of these falsifiers fired during MODEB-03 itself.

## Programme authority note

`docs/InputxmltoCII2019Fixplan.md` still treats multi-file merge/renumbering as not production-authorized. MODEB-01/02/03 therefore remain qualification artifacts, not runtime binding. MODEB-04 must update the governing programme document in the same PR if it introduces an authorized runtime handoff.

## Exact next action

Finish fixture-inclusive exact-head qualification, publish MODEB-03 `TASK_RESULT`, mark PR #790 Ready for Review, then start MODEB-04 as a stacked dependent workstream for engine-input materialization and whole-system REST/material/weight/topology qualification.
