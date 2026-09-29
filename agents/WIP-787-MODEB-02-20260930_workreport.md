# WIP-787-MODEB-02-20260930 — Mode B composite topology core

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
MODEB-01 RESULT = issuecomment-5900512596
DEPENDENCY_HEAD = a0ebd955ac1cf7078ab628a90ef5f515f4e1c46e (PR #788)
BRANCH = agent/issue-787-modeb-02-composite-core-20260930
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

## Engineering outcome for MODEB-02

Introduce the first composite-topology intermediate representation and boundary join evaluator without final output numbering or converter handoff.

The core must:

1. preserve every source node identity;
2. model source-document route edges separately from cross-document candidate/join edges;
3. treat POS as candidate-generation evidence only;
4. explicitly distinguish `ACCEPTED`, `AMBIGUOUS`, `REJECTED`, and `INSUFFICIENT_EVIDENCE` candidate states;
5. prohibit a source endpoint from being authoritatively joined to more than one cross-document target;
6. preserve coincident local identities instead of merging their node records;
7. allow deterministic acceptance only when evidence is sufficiently strong **and** uncontested under the evaluator contract;
8. retain all rejected/ambiguous alternatives and the evidence that caused the decision;
9. produce no composite/output NodeNumber in this slice.

## Initial evaluator direction

Evidence scoring will be explicit and auditable rather than opaque ML/fuzzy scoring. Candidate features available from MODEB-01 include:

- distance within tolerance;
- ComponentRefNo equality;
- Endpoint equality;
- ComponentType equality;
- ConnectionType equality;
- OD/bore compatibility/conflict;
- TEE involvement;
- restraint involvement;
- local predecessor/successor route context derived from observed nodes.

The real S8810010→S8811956 pair must not be resolved merely because one candidate has a larger raw signal count. MODEB-02 will first add local route/orientation context and a conflict/competition model. If that still does not provide decisive evidence, the real pair remains `AMBIGUOUS`; later Mode B work may use additional junction/domain evidence.

## Falsifiers

Publish `PLAN_UPDATE` before changing architecture if:

- the graph cannot preserve coincident source identities without treating them as merged vertices;
- route orientation cannot be derived deterministically from observed predecessor/successor positions;
- accepting a strong synthetic join requires NodeNumber-offset logic or combined-reference oracle data at runtime;
- the real candidate pair can only be resolved by using `SYS-001_Single.xml` as production authority rather than test oracle;
- final output numbering becomes necessary to express the graph (it must remain MODEB-03).

## Exact next action

Add route-context evidence to the MODEB observation consumer, implement `xml-cii-mode-b-composite/v1` graph/join states, qualify synthetic strong/conflict/ambiguous cases plus the frozen real three-candidate fixture, and keep final numbering absent.
