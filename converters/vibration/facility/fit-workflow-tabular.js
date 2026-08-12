import { parseVibrationFacilityFitTables } from './fit-tables.js';
import { runVibrationFacilityFitBenchmark } from './fit-workflow.js';

export const VIBRATION_FACILITY_FIT_TABULAR_WORKFLOW_SCHEMA = 'VibrationFacilityFitTabularWorkflow.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function runVibrationFacilityFitBenchmarkFromTables(input = {}, options = {}) {
  const parsed = parseVibrationFacilityFitTables(input);
  const workflow = runVibrationFacilityFitBenchmark(parsed, options);

  return deepFreeze({
    schema: VIBRATION_FACILITY_FIT_TABULAR_WORKFLOW_SCHEMA,
    authority: 'TABULAR_WORKFLOW_ORCHESTRATION_ONLY',
    engineeringAuthority: 'NONE',
    screeningAuthorized: false,
    qualificationMode: 'benchmark',
    imports: parsed.imports,
    workflow,
  });
}

export { VIBRATION_FACILITY_TOPOLOGY_INPUT_FORMAT } from './fit-tables.js';
