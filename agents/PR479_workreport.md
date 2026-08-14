# PR479 — FIT Reproducibility Evidence Export

## Recovery header

- Source task: #443
- PR / branch: `#479` / `agent/fit-reproducibility-evidence`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: IMPLEMENTED_PENDING_FULL_RELEASE_EXECUTION
- Coordination: SAFE
- Authority invariant: FIT remains `BENCHMARK_ONLY`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`.

## Handover in 60 seconds

PR479 closes one concrete #443 reproducibility gap: a current FIT run can now be exported as `FitRunEvidencePackage.v1`, binding the existing SHA-256 `FitRunSnapshot.v1` to the exact benchmark/source descriptors and the full central `VibrationFacilityFitTabularWorkflow.v1` result/evidence envelope.

The exporter performs no FIT engineering calculation, unit conversion, correlation selection, or recomputation. Only `CURRENT_RESULT` is exportable; stale results fail closed.

The UI now exposes `Export run evidence JSON` beside the existing register CSV export. The regression is included in the permanent FIT/VIB release manifest, increasing the manifest from 43 to 44 test files.

## Implemented capability

### `tabs/vibration-integrity-run-evidence.js`

- schema: `FitRunEvidencePackage.v1`;
- requires `CURRENT_RESULT`;
- requires a complete `FitRunSnapshot.v1` with run ID and SHA-256 hash;
- verifies snapshot canonical-input consistency before export;
- requires the benchmark-only central tabular workflow contract;
- preserves FIT authority as `NONE / NOT_AUTHORIZED / designAuthority=false`;
- captures source file descriptors and controlled benchmark identity/published evidence;
- embeds the exact central workflow envelope rather than recomputing outputs;
- pretty-printed deterministic JSON serialization with trailing newline.

Stable fail-closed errors include:
- `FIT_RUN_EVIDENCE_RESULT_NOT_CURRENT`;
- `FIT_RUN_EVIDENCE_SNAPSHOT_INVALID`;
- `FIT_RUN_EVIDENCE_SNAPSHOT_DRIFT`;
- `FIT_RUN_EVIDENCE_EXECUTION_INVALID`.

### UI wiring

`tabs/vibration-integrity-tab.js` consumes the serializer and downloads `vibration-fit-run-evidence.json` only for `CURRENT_RESULT`.

`tabs/vibration-integrity-input-view.js` exposes `Export run evidence JSON`, disabled whenever the result is not current.

### Release seam

- new `tests/vibration-integrity-run-evidence.test.mjs` uses the real controlled benchmark/runtime + `runVibrationFacilityFitBenchmarkFromTables` production path;
- `scripts/verify-vibration-fit-release.mjs` includes that regression;
- `tests/vibration-fit-release-gate.test.mjs` now requires the seam and asserts 44 controlled test files.

## Ground truth / coordination

At grounding, open work was:
- #471 T2.8 candidate — separate mechanism/master paths;
- #474 AIV CI — separate AIV paths;
- #476 policy/docs — no production overlap;
- no active FIT implementation PR.

Classification: `SAFE`.

## Backup evidence

Before modifying any existing file, the exact current-main bytes were materialized locally and verified by Git blob SHA, then backed up with the repository utility:

```text
#1 tabs/vibration-integrity-tab.js
   blob 646113c43ec790625bb8ac09242eb506c8f09259
#2 tabs/vibration-integrity-input-view.js
   blob 0a1103534b27048b36c08153c502c725ce1d7a36
#3 scripts/verify-vibration-fit-release.mjs
   blob efa3f032379bffc7269b53fd90d11065a89571eb
#4 tests/vibration-fit-release-gate.test.mjs
   blob 129a0ce7ca4c2032ac5f7a5702a2b999f85184c2
#5 agents/PR479_workreport.md
   blob a00f5e514a30d76d14f62a4a97b523770711b613
```

Backup contexts are recorded in the local `.backups/log.json` produced by `node utils/backup.js save ...`.

## Validation ledger

- Repository grounding: **PASS** / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- Pre-edit Git-blob parity for four modified existing source/test files: **PASS 4/4** / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- `node --check tabs/vibration-integrity-run-evidence.js`: **PASS** / EXECUTED_TEST / LANGUAGE_RUNTIME
- `node --check tabs/vibration-integrity-tab.js`: **PASS** / EXECUTED_TEST / LANGUAGE_RUNTIME
- `node --check tabs/vibration-integrity-input-view.js`: **PASS** / EXECUTED_TEST / LANGUAGE_RUNTIME
- `node --check scripts/verify-vibration-fit-release.mjs`: **PASS** / EXECUTED_TEST / LANGUAGE_RUNTIME
- `node --check tests/vibration-fit-release-gate.test.mjs`: **PASS** / EXECUTED_TEST / LANGUAGE_RUNTIME
- Direct synthetic run-evidence build/serialize/current-result/stale/drift checks: **PASS** / EXECUTED_TEST / TEST_ORACLE
- Real production-path `tests/vibration-integrity-run-evidence.test.mjs`: **NOT_RUN** in this partial local materialization
- Exact `npm run verify:vibration-fit-release`: **NOT_RUN**; full 44-file repository checkout is not materialized locally
- GitHub Actions on implementation head before this report update: **NOT_RUN / no associated workflow runs observed**
- Real-browser JSON download acceptance: **NOT_RUN**
- Independent engineering review: **NOT_RUN**

## Negative assurance

No changes were made to:
- FIT equations/correlations/thresholds;
- FIT method/master data;
- central unit conversion;
- `BENCHMARK_ONLY` authority;
- topology downgrade semantics;
- current-vs-stale result state machine;
- backend ownership of calculated quantities;
- screening/design authority.

The evidence package states `purpose=REPRODUCIBILITY_EVIDENCE_ONLY`; it is not an authority promotion artifact.

## Remaining release gate

The implementation is ready for exact-repository execution. Completion evidence still requires:
1. execute `tests/vibration-integrity-run-evidence.test.mjs` in a complete checkout;
2. execute exact `npm run verify:vibration-fit-release` (44 files);
3. real browser `Run FIT benchmark -> Export run evidence JSON` download and JSON round-trip inspection;
4. keep any environment block as `NOT_RUN_ENVIRONMENT_BLOCKED`, never PASS.

## EXACT_NEXT_ACTION

Run the real production-path regression and full 44-file `verify:vibration-fit-release` from a complete current PR checkout; if green, perform browser download acceptance and record the downloaded package hash/run ID without changing FIT authority.
