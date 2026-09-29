# PR780 — XML→CII master dataset worker boundary

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
REPORT_BASIS_HEAD: b7be39ff108d319880f046b171527f45c1cebc67
MAIN_HEAD_LAST_CHECKED: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
MERGE_BASE: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
PR: 780
PR_STATE: OPEN_DRAFT
GROUNDING_EPOCH: GE-XMLCII-DATAWORKER-20260929-01
CURRENT_STAGE: additive worker infrastructure implementation
CURRENT_BLOCKER: existing-file production integration requires native pre-edit backups
HIGHEST_RISK: worker/data custody changing APPLIED engineering semantics or duplicating 100k-row main-thread state
EXACT_NEXT_ACTION: implement new worker protocol/client/store/worker modules and focused tests only
```

Source issue: #776. Plan comment: issue #776 comment `IMPLEMENTATION_PLAN — rev 1` published before production work.

Branch: `agent/xml-cii-master-dataset-worker-20260929`.

## Handover in 60 seconds

PR780 introduces a dedicated XML→CII Standalone Master Dataset Worker boundary. Current main synchronously performs XLSX parsing, all-sheet `sheet_to_json`, normalization, repeated dataset JSON serialization/localStorage persistence, and full-dataset Preview search on the UI thread. The target architecture transfers one ArrayBuffer to the worker, lists XLSX sheet names cheaply, parses only the selected sheet, normalizes/searches/persists off-main-thread, and returns metadata + bounded previews. `supportConfigJson` must not carry large master arrays.

The first implementation checkpoint is **additive new files only**. Do not edit existing JS until native `node utils/backup.js save ...` has been run for each target.

## Ground truth

```text
base/main: cd8e32d97f0a52d3ec40ed6b3a7112f16b8db520
PR head at allocation: b7be39ff108d319880f046b171527f45c1cebc67
changed files at allocation: 3 recovery records
PR draft: true
merge authority: OWNER_ONLY / NOT_GRANTED
```

Coordination:

- PR599: exact Preview/import area overlap, but live PR body says `SALVAGE_PARTIAL`, `READ_ONLY`, `TAKEOVER_REQUIRED`, `DO NOT MERGE AS-IS`; classification `COORDINATION_REQUIRED / NOT_BLOCKED`.
- PR614: related 100k validation-only work; no production ownership.
- PR779: merged predecessor at current main; lifecycle causality remains a separate investigation.

## Appendix A

Inherited from WIP bootstrap after live grounding and current-source inspection:

```text
A1 Production Trace             20/20
A2 Current Failure Isolation    19/20
A3 Authority / Invariant        20/20
A4 Independent Validation       18/20
A5 Next-Commit / Minimal Patch  19/20
TOTAL                            96/100
MINIMUM                          18/20
DISPOSITION QUALIFIED_FOR_BOUNDED_XMLCII_DATASET_WORKER_IMPLEMENTATION
```

## Protected invariants

- DRAFT mapping changes remain non-authoritative.
- APPLIED mapping revisions advance only at the existing successful authority boundary.
- Failed/cancelled/stale worker jobs cannot replace current APPLIED data.
- Support/GAP, topology, geometry, units, writer/runtime numerical semantics remain unchanged.
- No large dataset is serialized into `supportConfigJson` in the target architecture.

## Implementation decision

One logical dataset worker service, not a worker pool. Large import cancellation is hard cancellation: terminate/restart worker. Finalized datasets must be persisted so service restart does not destroy APPLIED data. Worker search uses a compact searchable representation and can remain O(N) initially because the acceptance criterion is **zero full-dataset synchronous scans on the main thread**; an index may be added only if worker latency evidence requires it.

## Validation ledger

```text
main/source grounding                       PASS / SOURCE_INSPECTION / NONE
issue plan publication                      PASS / REMOTE_EXECUTION / AUTHORITATIVE_REFERENCE
repo policy/protocol grounding              PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
open-PR overlap                             PASS / REMOTE_EXECUTION / NONE
Appendix A                                  PASS 96/100 / SOURCE_INSPECTION / IMPLEMENTATION_COUPLED
worker syntax/tests                         NOT_RUN
10k/50k/100k scale                          NOT_RUN
browser responsiveness                      NOT_RUN
engineering parity                          NOT_RUN
```

## Changed-file ledger

Current recovery-only files:

- `agents/WIP-XMLCII-DATAWORKER-20260929_workreport.md`
- `agents/status/WIP-XMLCII-DATAWORKER-20260929.yaml`
- `agents/claims/WIP-XMLCII-DATAWORKER-20260929.yaml`

Next additive files are expected under:

- `tabs/xml-cii-2019-standalone/workers/`
- `tests/xml-cii-master-dataset-worker*.test.mjs`
- `agents/PR780_*`

## Backup gate

No existing JS mutation is authorized until exact current branch bytes are backed up by the repository-native utility. Connector-side copies are not equivalent and must not be called PASS.

## Merge boundary

Draft only. Never merge without explicit Owner authorization.
