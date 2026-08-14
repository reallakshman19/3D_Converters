# PR480 — SBC Controlled Source Recovery Start

## Recovery header

- Source task: #450
- PR / branch: `#480` / `agent/sbc-controlled-source-recovery`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: CONTINUE
- Coordination: SAFE with #471
- Authority invariant: source/master state remains `CANDIDATE`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`; `masterValuesPublished=false`.

## Handover in 60 seconds

Merged #470 is the canonical source-recovery transport. Closed #452 is superseded historical evidence only and must not be ported as a production path.

This PR starts the SBC branch of #450 with the required deterministic source inventory and source-plan artifact. It separates:
- tabular T3 targets recoverable through DocumentEvidence v2;
- geometry/location score rules requiring non-table evidence;
- Figures T3-1…T3-4 requiring a dedicated curve/digitization workstream.

No pages, table rows, score values, or curve points may be inferred. Missing evidence remains explicit.

## Canonical flow

`controlled EI source -> /v2/tables/discover -> explicit reviewer page/locator/candidate selection -> /v2/tables/extract -> Observation.v1 + TablePass.v1 + EvidenceDecision.v1 -> source-target evidence receipt -> CANDIDATE only`

## Ground truth / coordination

- #471 owns T2.8 valve-closure candidate evidence; PR480 will not touch its candidate files/values.
- #474 owns AIV CI; no overlap.
- #476 owns policy/docs; no production overlap.
- no active SBC PR found.
- #452 was explicitly closed as superseded by #470/current main.

Classification: `SAFE`.

## Active hypothesis / falsifier

**Hypothesis:** the merged Stage 5C target registry and controlled Common Git object are sufficient to generate a deterministic SBC source inventory without guessed pages or values.

**Falsifier:** any locator/page/value not established by controlled evidence remains `REVIEW_REQUIRED`/`NOT_RUN`; the implementation must not supply a default.

## Intended changed-file ledger

New:
- `scripts/inventory-vibration-master-sources.mjs`
- `ValidationRecords/VibrationMasters/source-inventory-v1.json`
- `tests/vibration-master-source-inventory-v2.test.mjs`

Potential additional new SBC-only source-plan helpers/fixtures if needed. Existing Stage 5C files will be changed only if a demonstrated defect requires it and only after mandatory backup.

## Validation ledger

- Grounding/supersession reconciliation: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Controlled Common Git object metadata: NOT_RUN
- Deterministic inventory tests: NOT_RUN
- Live DocumentEvidence discovery/extraction: NOT_RUN
- SBC reconciliation: NOT_RUN
- Numerical master publication: NOT_APPLICABLE

## Negative assurance

Must remain unchanged:
- no production master values;
- no calculator or UI numerical behavior;
- no source-page guessing;
- no T2.8 overlap;
- no curve digitization in this PR;
- no authority promotion.

## EXACT_NEXT_ACTION

Verify the exact controlled EI PDF object metadata in `reallaksh19/Common`, inspect the Stage 5C receipt contract, then implement the deterministic inventory/schema with separate TABLE, NON_TABLE_RULE, and CURVE recovery states.
