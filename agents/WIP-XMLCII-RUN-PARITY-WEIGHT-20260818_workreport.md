# WIP-XMLCII-RUN-PARITY-WEIGHT-20260818 — Parent Run-parity discarded Weight scan

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner-directed XML→CII (2019) Standalone source-level performance remediation.
PR_OR_WIP: WIP-XMLCII-RUN-PARITY-WEIGHT-20260818
BRANCH: agent/xml-cii-run-parity-weight-scan-20260818
PR_HEAD_OBSERVED: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_BASIS_HEAD: bca7fc9390c018753d09161052b0bf2fd54e33ce
MAIN_HEAD_LAST_CHECKED: bca7fc9390c018753d09161052b0bf2fd54e33ce
MERGE_BASE: bca7fc9390c018753d09161052b0bf2fd54e33ce
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_WORK_ITEM
GROUNDING_EPOCH: GE-001
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: Any parity optimization must preserve parent branch/process facts, config mutation behavior, and all Weight authority used later by standalone adapted Preview.
LAST_DURABLE_CHECKPOINT: Branch created from live main after XML→CII open-PR and active-claim inspection.
EXACT_NEXT_ACTION: Back up enrichment-run-parity.js, encode a fail-closed regression proving parent parity hides only Weight master rows from its discarded node ranking, then apply the surgical call-boundary change.
```

## Handover in 60 Seconds

The parent Model Converters Run-parity stage calls `xmlCiiDryRunPreview(sourceXmlText, enriched.config, stagedJsonText)` and consumes only `.branchRows`. That Preview still walks eligible nodes and calls the shared Weight ranker, whose master scan is discarded. Standalone Run later executes adapted Preview and consumes node/weight rows, so the parent weight-master scoring is duplicate work.

This WIP will suppress only `config.weight.masterRows` during the synchronous parent parity Preview call, restore the exact array identity in `finally`, and keep the same config object so existing branch resolver mutations/provenance remain intact. No Weight ranking semantics or final standalone weight authority may change.

## Repository ground truth

- live `main`: `bca7fc9390c018753d09161052b0bf2fd54e33ce`;
- target source blob `tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js`: `b7a9a541a6dfbbfe1d566b5ea251d9ca11081437`;
- `agents/MASTER_INDEX.md`: absent on main;
- PR #628 remains separate Bore/Wall work;
- PR #616 owns Preview-search only;
- stale active C5W claim owns adapted Preview dryrun/rating/incremental files, not this parent parity file;
- coordination classification: `COORDINATION_REQUIRED` by Weight authority domain, with no exact-file collision. This WIP must not edit C5W files or ranking logic.

## Mission / scope / acceptance

Mission: remove the full Weight-Master scan from the parent Run-parity Preview call whose `nodeRows` are discarded.

In scope:
- `tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js`;
- focused regression;
- mandatory exact pre-edit backup;
- WIP/PR custody metadata.

Out of scope: adapted Preview, Weight ranker/model semantics, overrides, writer/runtime switch, Python, support/GAP, Material/Rating/Line authority, workers, workflows, snapshot custody.

Acceptance:
1. parent parity passes an empty `weight.masterRows` only while executing its synchronous dry-run Preview;
2. all other Weight configuration remains visible to Preview;
3. original master-row array identity is restored after success and throw;
4. same config object is used so branch resolver mutations are not lost;
5. caller still consumes only branchRows and publication output is unchanged for an equivalent stubbed Preview;
6. no change to standalone adapted Preview weight ranking.

## Technical diagnosis / falsifier

Observed source: `applyPreviewRunParity()` reads only `.branchRows`, while parent `xmlCiiDryRunPreview()` ranks eligible nodes using `rankXmlCiiWeightCandidates(..., config, ...)` before returning.

Hypothesis: Weight master rows are not a branch-row dependency in the parent Preview; temporarily hiding only that array removes the discarded O(nodes × masterRows) scan without changing branch facts.

Falsifier: any branch-row difference when only `weight.masterRows` is hidden, loss of config mutations, failure to restore the master array on exceptions, or any downstream standalone Weight change.

## Authority / negative assurance

Protected authority: branch/process facts remain produced by the same parent Preview resolver; Weight Master remains authoritative for the later standalone adapted Preview/Weight Match path. This PR only removes a discarded computation from an earlier parity stage.

No formulas, engineering values, units, master contents, support/GAP rules, topology, Python solver/converter logic, writer semantics, or output parity gate are changed.

## Validation state

- source trace: PASS / SOURCE_INSPECTION / NONE;
- exact main target blob: PASS / SOURCE_INSPECTION / NONE;
- native full checkout: NOT_RUN / ENVIRONMENT_BLOCKED from current execution environment;
- focused regression: NOT_RUN;
- repository-native suite/CI: NOT_RUN.

## Changed-file ledger

At initialization: this WIP report only. Planned source/test/backup/status/claim paths are declared above.

## Review / coordination

No PR allocated. No exact production-file claim collision found. Broader Weight-authority overlap with stale C5W is acknowledged and bounded by explicit exclusions.

## Continuation

Start at `applyPreviewRunParity()` in `enrichment-run-parity.js`. Do not touch adapted Preview or Weight ranker. First create the mandatory pre-edit backup and regression, then make one call-boundary change.
