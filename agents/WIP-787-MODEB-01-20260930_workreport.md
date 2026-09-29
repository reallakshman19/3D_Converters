# WIP-787-MODEB-01-20260930 — Mode B corpus/topology observation harness

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-787-modeb-01-observation-20260930
PR = #788
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current-source reconciliation

The existing `converters/xml-cii2019-core/topology/` package is single-document topology-length/audit machinery. It provides useful vocabulary and regression coverage for support/restraint roles, helper nodes, inline endpoint spans, POS tolerance and route continuity, but it does not own a cross-document graph or join contract.

MODEB-01 therefore adds a separate **read-only observation layer** beside the existing topology package. It does not mutate XML, accept joins, renumber nodes, or change current conversion behavior.

## Implemented observation contract

`xml-cii-mode-b-observation/v1` records:

- immutable source document / branch occurrence / node identity;
- source NodeNumber, NodeName, ComponentRefNo, Endpoint, ComponentType, ConnectionType, POS and available OD/bore evidence;
- explicit restraint facts;
- support/restraint, support-reference, GASK/helper, bend/OLET helper and TEE roles;
- per-branch sequential source segments;
- same-position clusters without identity collapse;
- duplicate positive Node Numbers across documents;
- cross-document zero/near-POS candidate pairs with independent evidence dimensions;
- unique-vs-ambiguous candidate observations;
- split-vs-combined branch coverage deltas;
- 10 deterministic continuous combined-reference witnesses constrained to topology represented by the split corpus;
- deterministic fingerprint with no timestamp dependence.

Every boundary candidate is `OBSERVATION_ONLY`. MODEB-01 contains no accepted join, composite graph ownership or output/composite numbering.

## Real-corpus evidence

Validated observation fingerprint before final report-only commits:

`fnv1a32:d7f8a61c`

### Corpus sizes

```text
split documents         3
split branches          7
split nodes             452
combined branches       9
combined nodes          541
split route segments    445
same-position clusters  120
duplicate NodeNumbers   76
TEE facts               8
restraint facts         253
```

Split-file populations:

- `SYS-6-S8810010-01.xml`: 2 branches / 125 nodes
- `SYS-6-S8810011-01.xml`: 2 branches / 141 nodes
- `SYS-S8811956-01.xml`: 3 branches / 186 nodes
- `SYS-001_Single.xml`: 9 branches / 541 nodes

### Split ↔ combined coverage

The three requested split files are **not** a complete branch-for-branch reproduction of the combined file. This confirms the Owner's warning that some combined segments may not be represented by the supplied split subset.

```text
shared branch names       6
split-only branch names   1
combined-only branches    3
```

Shared:

- `/ASIM-1836-2"-D8810083-91261M7-PP-01/B1`
- `/ASIM-1836-6"-S8810010-91261M7-HC-01/B1`
- `/ASIM-1836-6"-S8810011-91261M7-HC-01/B1`
- `/ASIM-1836-6"-S8810011-91261M7-HC-01/B6`
- `/ASIM-1836-6"-S8811956-91261M7-HC-01/B1`
- `/ASIM-1836-6"-S8811956-91261M7-HC-01/B6`

Split-only:

- `/ASIM-1836-6"-S8811956-91261M7-HC-01/B2`

Combined-only:

- `/ASIM-1836-2"-D8810086-91261M7-PP-01/B1`
- `/ASIM-1836-2"-D8810183-91261M7-PP-01/B1`
- `/ASIM-1836-2"-D8810184-91261M7-PP-01/B1`

Qualification must therefore compare only shared semantic coverage unless additional split sources are supplied; combined-only branches are explicit corpus deltas, not reconstruction failures.

## Cross-document boundary observations

At `0.001 mm` POS tolerance the real split corpus exposes exactly **3** cross-document candidate pairs:

```text
unique candidates      1
ambiguous candidates   2
CORROBORATED           1
POSITION_ONLY          2
```

### Candidate A — unique observation, but POS-led / TEE boundary

`SYS-6-S8810010-01.xml` endpoint near `ComponentRefNo=1006657924/45726`, Endpoint 3  
↔ `SYS-6-S8810011-01.xml` Node 10, `ComponentRefNo=1006657924/45557`, Endpoint 1

- distance: `0 mm`
- evidence class: `POSITION_ONLY`
- observation disposition: `UNIQUE_CANDIDATE_OBSERVATION`
- OD: MATCH
- TEE involved: true
- corroboration count: 1

The unique candidate count does **not** make this an accepted join; TEE/context evidence must be evaluated in MODEB-02.

### Candidates B/C — same S8810010 endpoint has two S8811956 possibilities

Shared source endpoint:

`SYS-6-S8810010-01.xml`, Node 570, `ComponentRefNo=1006649732/121515`, Endpoint 2

Candidate B:

- S8811956 helper node `ComponentRefNo=1006649732/121345`, Endpoint 1
- distance `0 mm`
- component type MATCH
- connection type MATCH
- OD MATCH
- evidence class `CORROBORATED`
- corroboration count 3
- disposition `AMBIGUOUS_CANDIDATE_OBSERVATION`

Candidate C:

- S8811956 Node 10, `ComponentRefNo=1006649732/121346`, Endpoint 1
- distance `0 mm`
- OD MATCH only
- evidence class `POSITION_ONLY`
- corroboration count 1
- disposition `AMBIGUOUS_CANDIDATE_OBSERVATION`

This is direct benchmark proof that **same POS cannot be Mode B topology authority**. MODEB-02 must use additional orientation / predecessor-successor / junction context and remain fail-closed if that evidence cannot resolve the pair.

## Durable 10-segment witness chain

The initial automatic witness selector chose a combined-only branch. MODEB-01 corrected this before handoff: witnesses are now restricted to branch names present in both split and combined corpus and weighted for ComponentRefNo overlap with split evidence.

Pinned witness branch:

`/ASIM-1836-6"-S8810010-91261M7-HC-01/B1`

All 10 witness endpoint ComponentRefNo values are present in split evidence.

```text
W01  Node 20 RIGID → 30 ATTA   353 mm
W02  30 ATTA → 40 ATTA         1318.36 mm
W03  40 ATTA → 50 ATTA         0 mm
W04  50 ATTA → 60 ATTA         0 mm
W05  60 ATTA → 70 ATTA         0 mm
W06  70 ATTA → 80 ATTA         0 mm
W07  80 ATTA → 90 ATTA         3202.82 mm
W08  90 ATTA → 100 ATTA        0 mm
W09  100 ATTA → 110 ATTA       0 mm
W10  110 ATTA → -1 ELBO        523.8 mm
```

Durable fixture:

- `tests/fixtures/xml-cii-mode-b-observation-v1.json`
- `tests/xml-cii-issue-787-mode-b-fixture.test.mjs`

The fixture pins corpus counts, coverage deltas, all three candidate identities/evidence classes/dispositions and all 10 witnesses.

## Validation completed before final fixture-CI head

Run `36640841786` on head `10240fbd39b99fcd5993dcc8a95fd2a94ce4ae97`:

- 9 real-corpus MODEB observation tests PASS
- existing `seljson-to-inputxml-topology-element-length.test.js` PASS
- deterministic observation evidence generated and uploaded
- artifact ID `11066727016`
- artifact zip SHA256 `4f9d3ccc7f556278dd815bd2b5340e2f760579f1c57763667125350864c29575`

Final fixture-inclusive exact-head CI is rerunning after adding the durable fixture to the workflow.

## MODEB-02 engineering consequence

The observation phase materially narrows the next implementation without changing the published architecture:

1. POS is candidate-generation evidence only.
2. Node Number is not cross-document identity; 76 positive Node Numbers collide across the three split files.
3. Coincident multiplicity is common: 120 same-position clusters exist.
4. Restraint/support identity cannot be collapsed by position: 253 restraint facts are retained.
5. TEE-specific context is necessary; 8 TEE facts exist and one unique POS candidate is TEE-involved.
6. The S8810010→S8811956 boundary contains one source endpoint with two exact-POS candidates; MODEB-02 must represent both candidates and either resolve with stronger topology evidence or keep the join ambiguous.
7. Combined-reference parity must be coverage-aware because the requested split subset has one split-only and three combined-only branch names.

No child `PLAN_UPDATE` is required: these findings instantiate the already-planned graph/evidence/ambiguity model rather than changing it.

## Falsifier status

- four files parse deterministically: **not falsified**
- POS precision useful for candidate generation: **not falsified**, but insufficient for authority
- split↔combined semantic comparability: **partially supported / coverage delta proven**
- ComponentRefNo/Endpoint unusable as corroboration: **not falsified**
- 10 reconstructable continuous witnesses unavailable: **not falsified after shared-coverage correction**
- accidental join/numbering mutation in MODEB-01: **not present**

## Exact next action

Complete fixture-inclusive exact-head CI, publish `TASK_RESULT — MODEB-01`, mark PR #788 Ready for Owner review, then start MODEB-02 on a new branch with a graph/join-evaluator contract that consumes these frozen observations and does not silently resolve the observed ambiguous pair.
