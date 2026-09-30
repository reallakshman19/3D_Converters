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
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Frozen input contract

MODEB-03 consumes `xml-cii-mode-b-composite/v1` only after join evaluation is complete. It must not modify candidate scores, states, accepted edges or connected-component ownership.

Frozen real-corpus contract:

```text
vertices                         452
source route edges               445
accepted cross-document edges      1
insufficient candidates             2
connected components               6
same-position groups              120
```

The accepted edge and all unresolved alternatives are pinned by `tests/fixtures/xml-cii-mode-b-composite-v1.json`.

## Numbering authority

The purpose of MODEB-03 is to assign a deterministic **output NodeNumber namespace** only after topology completion.

Constraints:

1. source identity and source `NodeNumber` remain immutable provenance;
2. repeated positive source NodeNumbers across documents are valid input and must not collide in output;
3. source `NodeNumber <= 0` sentinel/helper semantics are preserved and are not promoted to positive engineering nodes merely to obtain uniqueness;
4. positive output NodeNumbers are assigned from graph traversal, not file offsets and not arithmetic based on original source NodeNumber;
5. same-POS identities remain separate rows even when adjacent or coincident;
6. numbering cannot create/remove/accept a topology edge;
7. input array ordering must not affect the mapping;
8. numbering must fail closed on malformed graph custody (missing edge endpoint, duplicate source identity, invalid numbering configuration);
9. converter handoff remains MODEB-04.

## Initial deterministic strategy

- preserve source-route direction;
- orient accepted cross-document edges only when one endpoint is a source-route tail and the other a source-route head; otherwise retain the edge for connectivity and use deterministic canonical traversal without granting new topology authority;
- derive connected components from the already-frozen graph;
- order components by a canonical semantic graph key, not source-file numeric offsets;
- traverse each component deterministically using source-route direction and sorted semantic tie-breaks, with canonical fallback for cycles/branching;
- assign positive output numbers `10, 20, 30, ...` to vertices whose source NodeNumber is positive;
- retain non-positive source sentinel values unchanged in the numbering ledger;
- emit complete source→output mapping plus traversal/component provenance.

## Falsifiers

Publish `PLAN_UPDATE` before changing architecture if:

- the writer requires non-positive helper endpoints to receive positive NodeNumbers;
- final CII semantics require source NodeNumbers themselves to be preserved rather than remapped;
- deterministic traversal requires changing MODEB-02 join decisions;
- the real graph cannot be numbered uniquely without fixed per-file offsets;
- accepted cross-document topology cannot be represented independently of numbering.

## Exact next action

Implement `xml-cii-mode-b-numbering/v1`, qualify synthetic reordered/duplicate/sentinel/branch cases and the frozen real composite, then pin the resulting real numbering fingerprint for MODEB-04.
