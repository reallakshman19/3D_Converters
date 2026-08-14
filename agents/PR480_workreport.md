# PR480 — SBC Controlled Source Recovery Start

## Recovery header

- Source task: #450
- PR / branch: `#480` / `agent/sbc-controlled-source-recovery`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: HANDOFF_READY_FOR_REAL_SOURCE_EXECUTION
- Coordination: SAFE with #471
- Authority invariant: source/master state remains `CANDIDATE`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`; `masterValuesPublished=false`.

## Handover in 60 seconds

Merged #470 is the canonical source-recovery transport. Closed #452 is superseded historical evidence only and must not be ported as a production path.

This PR implements the first bounded SBC slice of #450: a deterministic source inventory that pins the controlled EI PDF and separates the nine T3 recovery targets into three table targets, two non-table rule targets, and four figure/curve targets.

No pages, table rows, score values, curve points, or master values are inferred. Missing content evidence remains explicit `REVIEW_REQUIRED` / `NOT_RUN`.

## Canonical flow

`controlled EI source -> /v2/tables/discover -> explicit reviewer page/locator/candidate selection -> /v2/tables/extract -> Observation.v1 + TablePass.v1 + EvidenceDecision.v1 -> source-target evidence receipt -> CANDIDATE only`

## Ground truth / coordination

- #471 owns T2.8 valve-closure candidate evidence; PR480 does not touch its candidate files/values.
- #474 owns AIV CI; no overlap.
- #476 owns policy/docs; no production overlap.
- no active SBC PR was found at grounding.
- #452 was explicitly closed as superseded by #470/current main.

Classification: `SAFE`.

## Implemented artifacts

- `scripts/inventory-vibration-master-sources.mjs`
  - emits `VibrationMasterSourceInventory.v1` for `EI_AVIFF.T3.SBC`;
  - binds current Stage 5C target registry rather than duplicating its three table IDs;
  - records DocumentEvidence v2 discover/extract endpoints and explicit-reviewer selection policy;
  - emits no page defaults, source values, master values, or curve points.
- `ValidationRecords/VibrationMasters/source-inventory-v1.json`
  - exactly 9 targets: 3 TABLE / 2 RULE / 4 CURVE;
  - source-pinned, publication blocked, authority unchanged.
- `tests/vibration-master-source-inventory-v2.test.mjs`
  - source identity and execution-state guard;
  - target-set and type separation;
  - no guessed page/locator/value/authority;
  - rule/curve rejection from Stage 5C table extraction;
  - deterministic committed-artifact parity.

## Controlled source verification

Pinned source:

```text
repository: reallaksh19/Common
commit:     fb549185b9b27edc2379734240320a85c5bef9f6
path:       EI - AVIFF Guidelines 2nd Edition.pdf
blob:       9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size:       10,348,594 bytes
commit tree: 531f2d08efbd07d20b38a943d8c0e09618499e01
```

The pinned Common Git tree was independently inspected and contains the exact path/blob/size above. This proves source object identity only; it does **not** prove any T3 page/table/figure content.

## Validation ledger

- Grounding/supersession reconciliation: **PASS** / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Controlled Common Git object metadata: **PASS** / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Deterministic inventory regression: **PASS 5/5** / EXECUTED_TEST / TEST_ORACLE
- Committed artifact equals deterministic builder: **PASS** / EXECUTED_TEST / TEST_ORACLE
- Live DocumentEvidence `/v2/tables/discover`: **NOT_RUN**
- Live DocumentEvidence explicit-page `/v2/tables/extract`: **NOT_RUN**
- SBC table/rule/curve reconciliation: **NOT_RUN**
- Numerical master publication: **NOT_APPLICABLE / BLOCKED**
- Engineering/screening/design authority promotion: **NOT_APPLICABLE**

## Negative assurance

Verified by design/tests for this slice:
- no production master values;
- no calculator or UI numerical behavior changed;
- no source-page guessing;
- no T2.8 overlap;
- no curve digitization;
- rules/curves cannot be routed through the Stage 5C table path;
- no authority promotion.

## Remaining blocker / next evidence gate

The exact controlled PDF bytes and a runnable DocumentEvidence v2 service must be available together before the three SBC table targets can advance beyond source identity. The next valid step is discovery, followed by explicit reviewer selection of pages/locator/candidate IDs and only then extraction. Figures T3-1…T3-4 and geometry/location rules remain separate evidence programs.

## EXACT_NEXT_ACTION

Run `/v2/tables/discover` against the exact controlled EI PDF bytes, record candidate/page evidence without accepting values, then prepare explicit reviewer selections for the three registered SBC table targets. Do not begin numerical master publication in this PR.
