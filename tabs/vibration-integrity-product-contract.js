export const VIBRATION_INTEGRITY_FIT_CONTRACT_SCHEMA = 'VibrationIntegrityFitContract.v1';

export const VIBRATION_INTEGRITY_ACTION_IDS = Object.freeze({
  loadBenchmark: 'load-benchmark',
  preflight: 'preflight',
  run: 'run',
  exportRegister: 'export',
  exportEvidence: 'export-evidence',
});

export const VIBRATION_INTEGRITY_RESULT_STATES = Object.freeze([
  'UNRUN',
  'RUNNING',
  'CURRENT_RESULT',
  'STALE_RESULT',
  'INVALID_INPUT',
]);

export const VIBRATION_INTEGRITY_FIT_CONTRACT = Object.freeze({
  schema: VIBRATION_INTEGRITY_FIT_CONTRACT_SCHEMA,
  revision: '1.0.0',
  coreActions: VIBRATION_INTEGRITY_ACTION_IDS,
  resultStates: VIBRATION_INTEGRITY_RESULT_STATES,
  authorityBoundary: Object.freeze({
    boundedFitScreeningMayBeAuthoritative: true,
    candidateMechanismsMayReplaceScreeningGoverning: false,
    designAuthority: false,
  }),
});
