# WIP-787-MODEB-02-20260930 — Mode B composite topology core

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
MODEB-01 RESULT = issuecomment-5900512596
DEPENDENCY_HEAD = a0ebd955ac1cf7078ab628a90ef5f515f4e1c46e (PR #788)
BRANCH = agent/issue-787-modeb-02-composite-core-20260930
PR = #789
PR_BASE = agent/issue-787-modeb-01-observation-20260930
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## MODEB-01 evidence carried forward

- 452 split nodes / 541 combined-reference nodes;
- 76 positive source NodeNumber collisions across split files;
- 120 same-position clusters;
- 253 restraint facts;
- 8 TEE facts;
- 3 cross-document zero-distance candidates: 1 unique-by-count, 2 ambiguous;
- one source endpoint has two exact-POS S8811956 candidates, one CORROBORATED (3 signals) and one POSITION_ONLY (1 signal);
- split corpus covers 6 combined branch names, with 1 split-only and 3 combined-only branch deltas;
- frozen observation fingerprint `fnv1a32:d7f8a61c` and 10 shared-coverage witness segments.

## Implemented MODEB-02 authority contract

`xml-cii-mode-b-composite/v1` preserves each split-source node as an immutable vertex and keeps source route edges separate from evaluated cross-document edges.

Candidate evidence is explicit and auditable:

- POS within tolerance: +1;
- ComponentRefNo match: +5;
- Endpoint match: +1;
- ComponentType match: +2;
- ConnectionType match: +2;
- OD match: +2;
- bore match: +2;
- opposed local route match: +3;
- partial route match: +1.

Defaults:

```text
point tolerance       0.001 mm
acceptance score      8
competition margin    3
neighbor search hops  16
```

Hard conflicts reject OD/bore conflicts. TEE-involved candidates require ComponentRefNo identity or opposed-route corroboration. A source endpoint may own at most one accepted cross-document edge. Equal/close eligible competition fails closed as `AMBIGUOUS`; candidates below threshold remain `INSUFFICIENT_EVIDENCE`. Dominated eligible alternatives are retained as `REJECTED` with winner provenance.

MODEB-02 deliberately emits no `outputNodeNumber` or `compositeNodeNumber`.

## Real-corpus result

Frozen composite fingerprint:

`fnv1a32:d5104931`

Pinned graph statistics:

```text
vertices                         452
source route edges               445
observed boundary candidates       3
accepted cross-document edges      1
ambiguous candidates               0
rejected candidates                0
insufficient candidates             2
connected components               6
same-position groups              120
```

### Accepted cross-document join

S8810010 branch terminal:

`split-1-SYS-6-S8810010-01.xml::/ASIM-1836-6"-S8810010-91261M7-HC-01/B1::1::88::570::1006649732/121515::2`

joins to S8811956 branch initial identity:

`split-3-SYS-S8811956-01.xml::/ASIM-1836-6"-S8811956-91261M7-HC-01/B1::1::0::-1::1006649732/121345::1`

Decision:

```text
state                ACCEPTED
score                10
route compatibility  MATCH (dot = -1)
evidence class       CORROBORATED
score parts          POS + type + connection + OD + opposed route
hard conflicts       none
```

The accepted edge creates one two-document connected component with 183 vertices. The remaining five components retain one-document custody with 36, 98, 43, 40 and 52 vertices. Total source vertices remain exactly 452.

### Insufficient alternatives

The TEE-involved S8810010→S8810011 POS candidate remains `INSUFFICIENT_EVIDENCE`, score 6: POS + OD + opposed route only.

The weaker same-POS S8810010 Node 570→S8811956 `121346` candidate also remains `INSUFFICIENT_EVIDENCE`, score 6: POS + OD + opposed route only.

Both remain `POSITION_ONLY`; route opposition alone cannot elevate them to topology authority.

## Independent combined-reference oracle check

`tests/xml-cii-issue-787-mode-b-combined-oracle.test.mjs` uses `SYS-001_Single.xml` **only as a test oracle**, never as runtime authority.

It proves:

1. the accepted S8810010 node is the split source branch terminal;
2. the accepted S8811956 target is the split source branch initial node;
3. the combined reference preserves that accepted identity as the first node of the S8811956 branch;
4. the weaker exact-POS `121346` alternative is the next adjacent interior node in both split and combined representations.

Thus the evaluator selected the correct source identity rather than merely selecting a coordinate.

## Validation evidence

Successful exact-head run before fixture freeze:

```text
head       4c2075f386948a9324d9ec4ee562081eed5875b8
workflow   Issue 787 Mode B Composite Validation
run        36653053845
job        109691329708
artifact   11071347967
zip sha256 73c396e005ce42e0766e6d0a8ad9cde628b808f44ccfd3393c75ecff4a588e1e
```

That run passed:

- MODEB-02 synthetic adversarial cases;
- real-corpus composite evaluation;
- combined-reference identity oracle;
- MODEB-01 observation + pinned fixture;
- existing single-document topology integration;
- all Issue #776 focused authority tests;
- all PR #780 worker/dataset regressions;
- deterministic composite evidence generation.

Adjacent `engineering-calculation-core` failures were compared against the exact stacked #788 base. Both head and base had the same six failure identities; classification was:

`baseline-only-failures`

No new adjacent failure identity was introduced by MODEB-02.

Semantic-core browser timing run `36653054051` on the same head also completed successfully.

## Frozen MODEB-02 fixture

The final handoff additionally pins:

- composite fingerprint;
- all graph counts;
- the accepted candidate identity / score / route status;
- both insufficient candidate identities / scores / evidence class;
- all connected-component sizes and document counts.

Files:

- `tests/fixtures/xml-cii-mode-b-composite-v1.json`
- `tests/xml-cii-issue-787-mode-b-composite-fixture.test.mjs`

The fixture-inclusive final head is undergoing exact-head requalification. MODEB-03 must consume this frozen graph contract; numbering must not alter or participate in join acceptance.

## Falsifiers retained

Publish `PLAN_UPDATE` before changing architecture if:

- the graph cannot preserve coincident source identities without treating them as merged vertices;
- route orientation cannot be derived deterministically from observed predecessor/successor positions;
- accepting a strong join requires NodeNumber-offset logic or combined-reference oracle data at runtime;
- the real candidate pair can only be resolved by using `SYS-001_Single.xml` as production authority rather than test oracle;
- final output numbering becomes necessary to express the graph before MODEB-03.

None of these falsifiers fired in MODEB-02.

## Exact next action

Finish fixture-inclusive exact-head qualification, publish `TASK_EVIDENCE` / `TASK_RESULT`, mark #789 Ready for Review, then start MODEB-03 as a stacked dependent workstream that assigns deterministic final Node Numbers strictly after topology completion.
