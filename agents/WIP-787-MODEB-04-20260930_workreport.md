# WIP-787-MODEB-04-20260930 — runtime handoff and whole-system authority qualification

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
MODEB-01 RESULT = issuecomment-5900512596 / PR #788
MODEB-02 RESULT = issuecomment-5902078982 / PR #789
MODEB-03 RESULT = issuecomment-5902220950 / PR #790
DEPENDENCY_HEAD = 7e2739597868bc39bba2594bca3528ee0d03a6e7
OBSERVATION = fnv1a32:d7f8a61c
COMPOSITE = fnv1a32:d5104931
NUMBERING = fnv1a32:2eb8628d
BRANCH = agent/issue-787-modeb-04-runtime-handoff-20260930
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Owned outcome

Materialize the frozen Mode B source/topology/numbering authority into the existing XML→CII engine-input boundary, then qualify the resulting whole-system conversion without re-running topology authority inside the handoff.

Required whole-system evidence includes:

- exact source-identity custody across materialization;
- accepted topology and output numbering unchanged from MODEB-02/03 fixtures;
- no raw XML concatenation and no per-file numeric offset strategy;
- explicit-restraint custody including `PS-14292.1` and `PS-14259.4` through the actual native writer path;
- material authority including code `106` semantics without promoting unresolved suggestions;
- rigid weight/provenance behavior unchanged;
- frozen 10-segment shared-coverage witness continuity;
- coverage-aware comparison to `SYS-001_Single.xml` because the supplied split set is a partial semantic subset;
- Mode A behavior unchanged;
- governing programme document updated in the same PR if runtime binding is introduced.

## Authority boundary

MODEB-04 consumes these frozen fixtures as read-only authority:

- `tests/fixtures/xml-cii-mode-b-observation-v1.json`
- `tests/fixtures/xml-cii-mode-b-composite-v1.json`
- `tests/fixtures/xml-cii-mode-b-numbering-v1.json`

It must not change candidate scoring, accepted edge identity, component ownership, traversal or output numbering merely to make the converter pass.

## Falsifiers

Publish `PLAN_UPDATE` before architectural change if:

- the existing XML→CII writer cannot consume a semantically materialized multi-document source without a second conversion engine;
- preserving non-positive helpers/sentinels makes native conversion invalid and requires MODEB-03 numbering semantics to change;
- restraint/material/weight authority is lost unless topology is recomputed during handoff;
- production runtime requires `SYS-001_Single.xml` as authority rather than as a benchmark oracle;
- coverage-aware parity cannot distinguish missing combined-only branches from genuine semantic loss;
- runtime binding requires bypassing the current worker/standalone engine contract.

## Exact next action

Reconcile the current standalone XML→CII worker/native-writer boundary and governing programme contract, then implement the smallest materializer that can feed the existing authoritative writer while preserving frozen Mode B authority.
