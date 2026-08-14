export const FIT_RUN_EVIDENCE_SCHEMA = 'FitRunEvidencePackage.v1';

const FIT_CALCULATION_ID = 'VIB.FIV.FLOW_TURBULENCE';
const SNAPSHOT_SCHEMA = 'FitRunSnapshot.v1';
const TABULAR_WORKFLOW_SCHEMA = 'VibrationFacilityFitTabularWorkflow.v1';
const WORKFLOW_SCHEMA = 'VibrationFacilityFitWorkflow.v1';
const SHA256 = /^[0-9a-f]{64}$/u;

function evidenceError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'FitRunEvidenceError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const body = Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value);
}

function jsonClone(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function assertSnapshot(snapshot) {
  const valid = snapshot?.schema === SNAPSHOT_SCHEMA
    && typeof snapshot?.runId === 'string' && snapshot.runId.trim()
    && SHA256.test(String(snapshot?.snapshotHash ?? ''))
    && typeof snapshot?.canonicalInput === 'string'
    && snapshot?.input && typeof snapshot.input === 'object';
  if (!valid) {
    throw evidenceError('FIT_RUN_EVIDENCE_SNAPSHOT_INVALID', 'Current FIT result requires a complete run snapshot.');
  }
  if (stableJson(snapshot.input) !== snapshot.canonicalInput) {
    throw evidenceError('FIT_RUN_EVIDENCE_SNAPSHOT_DRIFT', 'Run snapshot canonical input no longer matches its captured input.');
  }
  return snapshot;
}

function assertExecution(envelope) {
  const workflow = envelope?.workflow;
  const valid = envelope?.schema === TABULAR_WORKFLOW_SCHEMA
    && envelope?.qualificationMode === 'benchmark'
    && envelope?.engineeringAuthority === 'NONE'
    && envelope?.screeningAuthorized === false
    && workflow?.schema === WORKFLOW_SCHEMA
    && workflow?.qualificationMode === 'benchmark'
    && workflow?.result?.calculationId === FIT_CALCULATION_ID;
  if (!valid) {
    throw evidenceError('FIT_RUN_EVIDENCE_EXECUTION_INVALID', 'FIT reproducibility evidence requires the benchmark-only central workflow result.');
  }
  return envelope;
}

function fileDescriptor(file) {
  if (!file) return null;
  return {
    name: file.name ?? null,
    format: file.format ?? null,
    kind: file.kind ?? null,
  };
}

function sourceFiles(files = {}) {
  return {
    topology: fileDescriptor(files.topology),
    operating: fileDescriptor(files.operating),
    enrichment: fileDescriptor(files.enrichment),
  };
}

function benchmarkEvidence(benchmark) {
  if (!benchmark) return null;
  return {
    id: benchmark.id ?? null,
    label: benchmark.label ?? null,
    sourceLocation: benchmark.sourceLocation ?? null,
    source: jsonClone(benchmark.source ?? null),
    identity: jsonClone(benchmark.identity ?? null),
    published: jsonClone(benchmark.published ?? null),
    modified: benchmark.modified === true,
  };
}

export function buildVibrationIntegrityRunEvidence(state = {}) {
  if (state.resultState !== 'CURRENT_RESULT') {
    throw evidenceError('FIT_RUN_EVIDENCE_RESULT_NOT_CURRENT', 'Only a CURRENT_RESULT may be exported as FIT reproducibility evidence.', {
      resultState: state.resultState ?? 'UNRUN',
    });
  }
  const snapshot = assertSnapshot(state.runSnapshot);
  const envelope = assertExecution(state.envelope);
  return deepFreeze({
    schema: FIT_RUN_EVIDENCE_SCHEMA,
    calculationId: FIT_CALCULATION_ID,
    qualificationMode: 'benchmark',
    resultState: state.resultState,
    authority: {
      engineeringAuthority: envelope.engineeringAuthority,
      screeningAuthorized: envelope.screeningAuthorized,
      designAuthority: false,
      purpose: 'REPRODUCIBILITY_EVIDENCE_ONLY',
    },
    run: jsonClone(snapshot),
    sources: {
      files: sourceFiles(state.files),
      benchmark: benchmarkEvidence(state.benchmark?.loaded ?? null),
    },
    execution: jsonClone(envelope),
  });
}

export function serializeVibrationIntegrityRunEvidence(state = {}) {
  return `${JSON.stringify(buildVibrationIntegrityRunEvidence(state), null, 2)}\n`;
}
