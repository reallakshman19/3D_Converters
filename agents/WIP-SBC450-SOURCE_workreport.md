# WIP-SBC450-SOURCE — SBC Controlled Source Recovery Start

## Recovery header

- Source task: #450
- Repository: `reallaksh19/3D_Converters`
- Branch: `agent/sbc-controlled-source-recovery`
- Base/main at grounding: `36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Mutation authority: WRITE_ALLOWED inside bounded source-recovery scope
- Coordination: SAFE with active #471 T2.8 work
- Authority invariant: recovered evidence remains `CANDIDATE`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`; `masterValuesPublished=false`.

## Handover in 60 seconds

Merged #470 is the canonical Stage 5C path. Superseded #452 is historical evidence only and its `/v1/search`/Markdown-normalization production path must not be revived.

This WIP starts the SBC branch of #450 from current main using:

`controlled EI source -> DocumentEvidence /v2/tables/discover -> explicit reviewer page/locator/candidate selection -> /v2/tables/extract -> Observation.v1/TablePass.v1/EvidenceDecision.v1 -> source-target receipt -> CANDIDATE only`.

The first deliverable is the issue-required source inventory artifact plus a reusable SBC source-plan generator for the tabular T3 targets. It will record what is source-pinned, what requires DocumentEvidence table extraction, and what must remain separate non-table/curve recovery. It will not publish any EI numerical master values.

## Active hypothesis / falsifier

**Hypothesis:** current `vibration-stage5c-targets.mjs` and the controlled Common Git object are sufficient to generate a deterministic, fail-closed source inventory/plan for the SBC T3 work without guessing pages or values.

**Falsifier:** if a locator/page/value is not established by controlled evidence, emit `SOURCE_PINNED`/`REVIEW_REQUIRED`/`NOT_RUN` rather than inventing it. No guessed page defaults are permitted.

## Intended changed-file boundary

Expected new files:
- `scripts/inventory-vibration-master-sources.mjs`
- `ValidationRecords/VibrationMasters/source-inventory-v1.json`
- `tests/vibration-master-source-inventory-v2.test.mjs`

Possible additional new SBC-only plan/profile files if needed after inspection.

No existing Stage 5C production file will be changed unless a demonstrated gap requires it and the mandatory backup is taken first.

## Coordination check

- #471 owns T2.8 valve-closure candidate evidence; this WIP will not touch T2.8 candidate values/files.
- #474 owns AIV CI; no overlap.
- #476 owns policy/docs; no production overlap.
- No active SBC PR found.
- #452 is CLOSED/SUPERSEDED and may be consulted only for lessons/tests.

Classification: `SAFE`.

## Validation ledger

- Grounding and supersession reconciliation: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Controlled Common Git object metadata verification: NOT_RUN
- Deterministic inventory tests: NOT_RUN
- Live DocumentEvidence discovery/extraction: NOT_RUN
- SBC table reconciliation: NOT_RUN
- Numerical/master publication: NOT_APPLICABLE for this WIP

## EXACT_NEXT_ACTION

Verify the controlled EI PDF Git object/size in `reallaksh19/Common`, inspect the merged Stage 5C receipt/target contracts, then implement a deterministic inventory that separates SBC TABLE, NON_TABLE_RULE, and CURVE work with no inferred pages or values.
