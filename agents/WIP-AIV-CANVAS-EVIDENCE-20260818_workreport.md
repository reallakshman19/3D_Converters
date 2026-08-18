# WIP-AIV-CANVAS-EVIDENCE-20260818 — Recovery Workreport

## Recovery header
- Repository: `reallaksh19/3D_Converters`
- Base assignment: stacked on PR643 head `afe72d5cc4859bf4d76e95c83563e86d4169b902`
- Working branch: `agent/vibration-aiv-canvas-evidence-hardening-20260818`
- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: AUTO
- AUTO_STATE: RUNNING
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_THIS_REPAIR_SET

## Handover in 60 seconds
Phase 3 closes post-#641 canvas evidence/currency gaps without changing numerical engineering behavior:
1. Canvas export must use the same full screening-package input custody as normal export: flare-network/generated path evidence, EIT import evidence, inventory-completeness attestations, and engineering input revision.
2. Canvas export must independently require current screening lineage; stale `screeningResult.ok` is insufficient.
3. Detailed inspector calculation/contribution results must fail closed when screening lineage is stale.
4. Canvas completeness presentation must include welded-discontinuity inventory completeness while explicitly preserving `line/case screening authority = NOT_AUTHORIZED`.
5. Working input rows omitted from projection because engineering identity is incomplete must be counted and visibly disclosed; do not invent placeholder nodes.
6. Canvas structured presentation export should prefer the unified projection rather than the retired logical-only projection, while remaining `presentationOnly`.

## Protected invariants
- PR642 disconnected/orphaned Source blocker remains intact.
- PR643 interaction semantics remain intact.
- No AIV equations/constants/benchmark expected values.
- No Stage-9 aggregation change.
- No line/case authority promotion or generic EI main-line contribution.
- Canvas projection/export remains non-authoritative presentation evidence.
- `designAuthority=false`.

## Validation ledger
- predecessor PR643: PASS / open draft / mergeable at `afe72d5c...`.
- repository-native tests: NOT_RUN / executable checkout unavailable.
- browser journey: NOT_RUN / Browser unavailable.
- native backup command: NOT_RUN / ENVIRONMENT_BLOCKED; record pre-edit blobs before existing-file edits.

## EXACT_NEXT_ACTION
Inspect normal screening export input builder, canvas export bridge, unified projection, inspector/results renderer, completeness labels and projection omission behavior; implement a shared evidence-custody contract and focused regressions.
