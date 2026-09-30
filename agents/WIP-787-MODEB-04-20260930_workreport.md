# WIP-787-MODEB-04-20260930 — qualified runtime handoff and whole-system authority evidence

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
PLAN = #787 IMPLEMENTATION_PLAN rev 1 / issuecomment-5900333050
PLAN_UPDATE_1 = issuecomment-5902281285
PLAN_UPDATE_2 = issuecomment-5903320907
MODEB-01 RESULT = issuecomment-5900512596 / PR #788
MODEB-02 RESULT = issuecomment-5902078982 / PR #789
MODEB-03 RESULT = issuecomment-5902220950 / PR #790
DEPENDENCY_HEAD = 7e2739597868bc39bba2594bca3528ee0d03a6e7
FROZEN_OBSERVATION = fnv1a32:d7f8a61c
FROZEN_COMPOSITE = fnv1a32:d5104931
FROZEN_NUMBERING = fnv1a32:2eb8628d
BRANCH = agent/issue-787-modeb-04-runtime-handoff-20260930
PR = #791
VALIDATED_CODE_HEAD = e0cdeca1d161da21a67a7e752a3bef43ed6fa396
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Owned outcome

MODEB-04 materializes the frozen Mode B observation → composite → numbering authority into the existing XML→CII runtime boundary and delegates through the existing workflow/native writer. It does not introduce a second conversion engine, alter MODEB-02 accepted-edge authority, or mutate the frozen MODEB-03 numbering ledger.

The resulting Mode B API is runtime-bound but remains explicitly:

```text
UI_ENABLED = false
PRODUCTION_DEFAULT = false
PRODUCTION_AUTHORIZED = false
```

Mode A and the normal single-file path remain unchanged.

## Implemented runtime authority

### 1. Frozen cross-document bridge

The one accepted MODEB-02/03 cross-document edge remains the only cross-document writer-visible alias:

```text
upstream component = 1006649732/121515
downstream helper  = 1006649732/121345
orientation        = TAIL_TO_HEAD
rendered junction  = 1370
native degree      = 2
```

The weaker coincident identity `1006649732/121346` is not promoted and remains a separate positive node (`1390`).

### 2. Source-authoritative same-document shared junctions

Exact-head native-writer qualification exposed a second, distinct rendering requirement: positive source NodeNumbers that are intentionally shared across Branch blocks inside the same source document must retain shared writer-visible identity after MODEB-03 occurrence numbering.

MODEB-04 now derives same-document aliases only when all of the following are true:

- same split `sourceDocumentId`;
- same positive source `NodeNumber`;
- occurrences span at least two Branch blocks;
- positions are coincident within the native writer shared-junction tolerance (6 mm);
- each occurrence retains positive MODEB-03 numbering custody.

The MODEB-03 rows and original per-occurrence output numbers remain immutable evidence. Only runtime XML rendering restores the source-authoritative shared junction required by the existing native writer.

Real-corpus result:

```text
same-document junction groups      = 5
governed junction occurrences      = 10
cross-document helper aliases      = 1
direct positive MODEB-03 rewrites  = 224
same-document alias rewrites       = 10
frozen positive ledger rows        = 234
preserved non-positive sentinels   = 217
materialized vertices              = 452
```

Representative proven repair — `SYS-6-S8810011-01.xml` source NodeNumber `430`:

```text
/B1 component 1006657924/45557 -> MODEB-03 output 2220
/B6 component 1006657924/45669 -> MODEB-03 output 480
runtime rendered shared junction -> 480
position spread -> 0 mm
```

Both immutable source identities and both original MODEB-03 output numbers remain in evidence while native runtime topology regains the source shared junction.

## Truthful-CI failure discovery and correction

The first MODEB-04 native-writer workflow appeared green because the evidence command used:

```text
python3 ... | tee ...
```

without `pipefail`. The Python process had actually failed while `tee` returned success. The workflow was corrected to propagate producer failures before accepting any runtime evidence.

After fail-truthful CI was enabled, the actual native failure was:

```text
ValueError: Edge 58 received multiple restraints; unsupported mapping.
```

A dedicated classifier then ran the exact same native writer over:

- `SYS-6-S8810010-01.xml` — PASS;
- `SYS-6-S8810011-01.xml` — PASS;
- `SYS-S8811956-01.xml` — PASS;
- `SYS-001_Single.xml` — PASS;
- pre-correction Mode B materialized XML — FAIL.

This proved the failure was introduced by Mode B materialization rather than inherited writer debt.

### Root cause

Per-occurrence MODEB-03 output numbering had separated the two source NodeNumber `430` occurrences in S8810011. The `/B6` start therefore appeared degree-1. Because source metadata has `RestrainOpenEnds=Yes`, the native writer synthesized an open-end restraint at that false route end while the following node already owned explicit restraint authority. Both then attempted to occupy native Edge 58.

The fix restores the same-document source junction at materialization time. The writer itself was not weakened or bypassed.

## Native writer result after correction

Final exact-head native model evidence:

```text
model status                 = PASS
native edges                 = 117
model restraints             = 43
CAESAR type-14 restraints    = 37
accepted cross-doc junction  = 1370
degree at junction 1370      = 2
weak coincident node         = 1390
```

The target S8810011 `/B6` shared-junction occurrence is no longer a false open end. A separate legitimate route-end occurrence remains degree-1, proving the correction did not globally suppress native open-end behavior.

Explicit `+Y` REST witnesses `PS-14292.1` and `PS-14259.4` remain present through materialization and native writer authority. Branch-owned process/material metadata and all seven original Branch blocks remain preserved.

## Combined-reference authority

`SYS-001_Single.xml` remains a benchmark/test oracle only. Production runtime materialization is constructed from the split sources and does not consume the combined file as topology authority.

The frozen 10 continuous shared-coverage witnesses remain qualified against the combined reference, while combined-only branches are not treated as missing split-source semantics.

## Governing programme record

`docs/InputxmltoCII2019Fixplan.md` is updated in PR #791 to distinguish:

- Mode A existing/default separate-model behavior;
- explicit Mode B runtime API;
- Mode B UI-hidden/non-default status;
- absence of production authorization;
- combined reference as oracle rather than runtime authority.

## Exact-head qualification

Validated code head:

```text
e0cdeca1d161da21a67a7e752a3bef43ed6fa396
```

### MODEB-04 runtime validation

```text
workflow = Issue 787 Mode B Runtime Handoff Validation
run      = 36663615832
result   = SUCCESS
```

Passed steps include:

- new-JS size contract;
- MODEB-04 materialization/runtime API regressions;
- real three-source materialization;
- baseline/native restraint collision classification;
- native XML→CII writer shared-junction proof;
- frozen MODEB-03 numbering regressions;
- frozen MODEB-02 composite/oracle regressions;
- MODEB-01 observation regressions;
- existing single-document topology behavior;
- inherited issue #776 authority suite;
- inherited PR #780 master-dataset suite;
- adjacent authority head-versus-stacked-base classification;
- evidence upload.

Evidence artifact:

```text
artifact id     = 11075421735
artifact digest = sha256:4f9413bb66e4647ae565d60c038347bdcaca734b91c6c14e3d4e20147e00d18a
runtime digest  = fnv1a32:f310ad6a
```

### Browser semantic-core timing

```text
workflow = XML CII Browser Semantic Core Timing
run      = 36663615831
result   = SUCCESS
```

## Authority states after MODEB-04

```text
SOURCE_PRESENT          = true
RUNTIME_BOUND           = true
NATIVE_WRITER_PASS      = true
FROZEN_TOPOLOGY_KEPT    = true
FROZEN_NUMBERING_KEPT   = true
MODE_A_PRESERVED        = true
UI_VISIBLE_MODE_B       = false
PRODUCTION_DEFAULT      = false
PRODUCTION_AUTHORIZED   = false
```

No statement in this report advances Mode B to default, UI-enabled or production-authorized status.

## Recovery / integrity notes

- pre-edit recovery material is retained under `.backups/issue-787/modeb-04/`;
- runtime/docs mirror parity is regression-tested;
- the temporary duplicate `xml-cii-mode-b-runtime-source-junctions.js` helper created during concurrent reconciliation was removed after the live branch was found to contain the stronger governed `xml-cii-mode-b-runtime-junctions.js` implementation;
- no concurrent live implementation was overwritten;
- CI producer failures are no longer maskable by `tee` in the MODEB-04 evidence path.

## Handoff

```text
HANDOVER_READINESS = READY_FOR_REVIEW
BLOCKER = NONE
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

Exact next action: independent review of PR #791. Keep Mode B UI-hidden, non-default and production-unauthorized. Do not merge without owner authorization.
