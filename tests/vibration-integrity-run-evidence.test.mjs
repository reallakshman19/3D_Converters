import assert from 'node:assert/strict';
import test from 'node:test';
import { runVibrationFacilityFitBenchmarkFromTables } from '../converters/vibration/facility/fit-workflow-tabular.js';
import {
  buildLoadedVibrationIntegrityBenchmark,
  buildVibrationIntegrityFacilityTableInput,
  createVibrationIntegrityInputRuntimeState,
} from '../tabs/vibration-integrity-input-runtime.js';
import { VIBRATION_FIT_UI_BENCHMARK_CASES } from '../tabs/vibration-integrity-benchmarks.js';
import {
  FIT_RUN_EVIDENCE_SCHEMA,
  buildVibrationIntegrityRunEvidence,
  serializeVibrationIntegrityRunEvidence,
} from '../tabs/vibration-integrity-run-evidence.js';
import { buildVibrationIntegrityRunSnapshot } from '../tabs/vibration-integrity-run-snapshot.js';

async function currentBenchmarkState() {
  const id = VIBRATION_FIT_UI_BENCHMARK_CASES[0].id;
  const loaded = buildLoadedVibrationIntegrityBenchmark(id);
  const state = {
    ...createVibrationIntegrityInputRuntimeState(),
    benchmark: { selectedId: id, loaded: loaded.loaded, detachedFromSource: false },
    tables: loaded.tables,
    files: loaded.files,
    allowLimitedExchange: loaded.allowLimitedExchange,
  };
  const snapshot = await buildVibrationIntegrityRunSnapshot(state);
  const envelope = runVibrationFacilityFitBenchmarkFromTables(
    buildVibrationIntegrityFacilityTableInput(state),
    { allowLimitedExchange: state.allowLimitedExchange },
  );
  return {
    ...state,
    resultState: 'CURRENT_RESULT',
    runSnapshot: Object.freeze({ ...snapshot, runId: 'FIT-RUN-TEST-001' }),
    envelope,
  };
}

test('FIT run evidence binds exact working snapshot to the central benchmark workflow', async () => {
  const state = await currentBenchmarkState();
  const evidence = buildVibrationIntegrityRunEvidence(state);
  assert.equal(evidence.schema, FIT_RUN_EVIDENCE_SCHEMA);
  assert.equal(evidence.calculationId, 'VIB.FIV.FLOW_TURBULENCE');
  assert.equal(evidence.qualificationMode, 'benchmark');
  assert.equal(evidence.authority.engineeringAuthority, 'NONE');
  assert.equal(evidence.authority.screeningAuthorized, false);
  assert.equal(evidence.authority.designAuthority, false);
  assert.equal(evidence.run.snapshotHash, state.runSnapshot.snapshotHash);
  assert.equal(evidence.run.canonicalInput, state.runSnapshot.canonicalInput);
  assert.equal(evidence.sources.benchmark.id, state.benchmark.loaded.id);
  assert.equal(evidence.sources.benchmark.published.standardLof, state.benchmark.loaded.published.standardLof);
  assert.equal(evidence.execution.workflow.result.rows[0].centralResult.outputs.standardLof,
    state.envelope.workflow.result.rows[0].centralResult.outputs.standardLof);
});

test('FIT run evidence serializer round-trips the governed package', async () => {
  const state = await currentBenchmarkState();
  const serialized = serializeVibrationIntegrityRunEvidence(state);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.schema, FIT_RUN_EVIDENCE_SCHEMA);
  assert.equal(parsed.run.runId, 'FIT-RUN-TEST-001');
  assert.equal(parsed.execution.workflow.result.calculationId, 'VIB.FIV.FLOW_TURBULENCE');
  assert.equal(serialized.endsWith('\n'), true);
});

test('FIT run evidence rejects stale results', async () => {
  const state = await currentBenchmarkState();
  assert.throws(
    () => buildVibrationIntegrityRunEvidence({ ...state, resultState: 'STALE_RESULT' }),
    (error) => error?.code === 'FIT_RUN_EVIDENCE_RESULT_NOT_CURRENT',
  );
});

test('FIT run evidence detects canonical snapshot drift', async () => {
  const state = await currentBenchmarkState();
  const runSnapshot = { ...state.runSnapshot, canonicalInput: '{"tampered":true}' };
  assert.throws(
    () => buildVibrationIntegrityRunEvidence({ ...state, runSnapshot }),
    (error) => error?.code === 'FIT_RUN_EVIDENCE_SNAPSHOT_DRIFT',
  );
});
