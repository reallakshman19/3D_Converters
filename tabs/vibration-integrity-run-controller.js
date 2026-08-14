import { runVibrationFacilityFitBenchmarkFromTables } from '../converters/vibration/facility/fit-workflow-tabular.js';
import { buildVibrationIntegrityFacilityTableInput } from './vibration-integrity-input-runtime.js';
import {
  bindVibrationIntegrityEngineeringIdentity,
  buildVibrationIntegrityRunSnapshot,
} from './vibration-integrity-run-snapshot.js';

export async function executeVibrationIntegrityBenchmarkRun(capturedState) {
  const snapshot = await buildVibrationIntegrityRunSnapshot(capturedState);
  const tableInput = await buildVibrationIntegrityFacilityTableInput(capturedState);
  const envelope = runVibrationFacilityFitBenchmarkFromTables(
    tableInput,
    { allowLimitedExchange: capturedState.allowLimitedExchange },
  );
  const runSnapshot = await bindVibrationIntegrityEngineeringIdentity(snapshot, envelope);
  return Object.freeze({ envelope, runSnapshot });
}

export async function vibrationIntegrityRunInputDrifted(runSnapshot, liveState) {
  const current = await buildVibrationIntegrityRunSnapshot(liveState);
  return current.snapshotHash !== runSnapshot.snapshotHash;
}
