# WIP-787-MODEB-01-20260930 — Mode B corpus/topology observation harness

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-787-modeb-01-observation-20260930
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current-source reconciliation

The existing `converters/xml-cii2019-core/topology/` package is single-document topology-length/audit machinery. It provides useful vocabulary and regression coverage for support/restraint roles, helper nodes, inline endpoint spans, POS tolerance and route continuity, but it does not own a cross-document graph or join contract.

MODEB-01 therefore adds a separate **read-only observation layer** beside the existing topology package. It does not mutate XML, accept joins, renumber nodes, or change current conversion behavior.

## Owned outcome

Produce deterministic machine-readable facts from the three split benchmark XMLs and combined `SYS-001_Single.xml`, including immutable source identities, branch segments, same-position multiplicity, duplicate Node Numbers, TEE/restraint facts, cross-document candidate evidence and at least 10 continuous combined-reference witnesses.

## Falsifiers

- observation cannot parse the four benchmark files deterministically;
- POS precision/units prevent useful explicit-tolerance candidate generation;
- split↔combined corpus is not semantically comparable;
- ComponentRefNo/Endpoint semantics are unusable even as corroborating evidence;
- 10 continuous combined-reference witnesses cannot be selected deterministically;
- implementation begins accepting joins or renumbering nodes in MODEB-01.

## Exact next action

Implement `xml-cii-mode-b-observation/v1`, real-corpus focused tests, a deterministic report generator and a dedicated CI workflow while preserving all existing single-document topology tests.
