export const FBX_WORKER_JOB_SCHEMA = 'FbxWorkerJob.v1';
export const FBX_WORKER_MESSAGE_SCHEMA = 'FbxWorkerMessage.v1';
export const FBX_WORKER_OPERATION = 'PARSE_SOURCE_GRAPH';

export const FBX_WORKER_TYPES = Object.freeze({
  ACCEPTED: 'FBX_WORKER_ACCEPTED',
  PROGRESS: 'FBX_WORKER_PROGRESS',
  COMPLETE: 'FBX_WORKER_COMPLETE',
  ERROR: 'FBX_WORKER_ERROR',
});

export const FBX_WORKER_STAGES = Object.freeze([
  'preflight',
  'loading-wasm',
  'copying-input',
  'parsing-fbx',
  'decoding-result',
  'enforcing-source-policy',
  'preparing-transfer',
  'complete',
]);

export const FBX_WORKER_ERROR_CODES = Object.freeze({
  JOB_INVALID: 'FBX_WORKER_JOB_INVALID',
  PREFLIGHT_EMPTY_INPUT: 'FBX_PREFLIGHT_EMPTY_INPUT',
  PREFLIGHT_SIZE_MISMATCH: 'FBX_PREFLIGHT_SIZE_MISMATCH',
  PREFLIGHT_UNSUPPORTED_HEADER: 'FBX_PREFLIGHT_UNSUPPORTED_HEADER',
  PREFLIGHT_UNSUPPORTED_VERSION: 'FBX_PREFLIGHT_UNSUPPORTED_VERSION',
  ABORTED: 'FBX_WORKER_ABORTED',
  TIMEOUT: 'FBX_WORKER_TIMEOUT',
  RUNTIME_ERROR: 'FBX_WORKER_RUNTIME_ERROR',
  WASM_LOAD_FAILED: 'FBX_WASM_LOAD_FAILED',
  PARSE_REJECTED: 'FBX_PARSE_REJECTED',
  RESULT_DECODE_FAILED: 'FBX_RESULT_DECODE_FAILED',
  SOURCE_GRAPH_POLICY_FAILED: 'FBX_SOURCE_GRAPH_POLICY_FAILED',
});

const KNOWN_TYPES = new Set(Object.values(FBX_WORKER_TYPES));
const KNOWN_CODES = new Set(Object.values(FBX_WORKER_ERROR_CODES));
const JOB_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value, max = 1024) {
  return typeof value === 'string' && value.length <= max;
}

export class FbxWorkerRuntimeError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'FbxWorkerRuntimeError';
    this.code = code;
    this.stage = options.stage ?? null;
    this.detail = options.detail ?? null;
    this.progressStages = Object.freeze([...(options.progressStages || [])]);
    this.diagnostics = options.diagnostics ?? null;
  }
}

export function trustedJobId(value) {
  return typeof value === 'string' && JOB_ID_PATTERN.test(value) ? value : null;
}

export function assertFbxWorkerJob(value) {
  if (!isRecord(value)) throw invalidJob('Worker job must be an object.');
  if (value.schema !== FBX_WORKER_JOB_SCHEMA) throw invalidJob('Unsupported worker job schema.');
  if (value.operation !== FBX_WORKER_OPERATION) throw invalidJob('Unsupported worker operation.');
  if (!trustedJobId(value.jobId)) throw invalidJob('Worker jobId is malformed.');
  if (!(value.bytes instanceof ArrayBuffer)) throw invalidJob('Worker bytes must be an ArrayBuffer.');
  if (!Number.isSafeInteger(value.inputByteLength) || value.inputByteLength < 0) {
    throw invalidJob('Worker inputByteLength must be a non-negative safe integer.');
  }
  return value;
}

function invalidJob(detail) {
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.JOB_INVALID,
    'The FBX worker job is invalid.',
    { detail },
  );
}

export function assertWorkerEnvelope(value, expectedJobId) {
  if (!isRecord(value)) throw protocolError('Worker message must be an object.');
  if (value.schema !== FBX_WORKER_MESSAGE_SCHEMA) throw protocolError('Unsupported worker message schema.');
  if (!KNOWN_TYPES.has(value.type)) throw protocolError('Unsupported worker message type.');
  if (value.jobId !== expectedJobId) throw protocolError('Worker message jobId does not match the active job.');
  return value;
}

export function assertAcceptedMessage(value, expectedLength) {
  if (value.operation !== FBX_WORKER_OPERATION) throw protocolError('Accepted message operation is invalid.');
  if (value.inputByteLength !== expectedLength) throw protocolError('Accepted message length is invalid.');
  return value;
}

export function assertProgressMessage(value, receivedStages) {
  const ordinal = receivedStages.length;
  const expected = FBX_WORKER_STAGES[ordinal];
  if (ordinal >= FBX_WORKER_STAGES.length - 1) throw protocolError('Progress cannot follow preparing-transfer.');
  if (value.ordinal !== ordinal || value.stage !== expected) throw protocolError('Worker progress ordering is invalid.');
  return value;
}

export function assertCompleteMessage(value, receivedStages) {
  const required = FBX_WORKER_STAGES.slice(0, -1);
  if (value.stage !== 'complete') throw protocolError('Completion stage is invalid.');
  if (receivedStages.length !== required.length) throw protocolError('Completion arrived before all required stages.');
  if (!isRecord(value.graph) || value.graph.schema !== 'FbxSourceGraph.v2') {
    throw protocolError('Completion graph is not FbxSourceGraph.v2.');
  }
  return value;
}

export function assertErrorMessage(value, receivedStages) {
  if (!KNOWN_CODES.has(value.code)) throw protocolError('Worker error code is invalid.');
  if (!boundedText(value.message, 2048)) throw protocolError('Worker error message is invalid.');
  if (!Array.isArray(value.progressStages)) throw protocolError('Worker error progress history is invalid.');
  if (value.progressStages.length !== receivedStages.length) throw protocolError('Worker error progress history is inconsistent.');
  for (let i = 0; i < receivedStages.length; i += 1) {
    if (value.progressStages[i] !== receivedStages[i]) throw protocolError('Worker error progress history is inconsistent.');
  }
  return value;
}

export function protocolError(detail, progressStages = []) {
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
    'The FBX worker protocol was violated.',
    { detail, progressStages },
  );
}

export function makeAccepted(job) {
  return {
    schema: FBX_WORKER_MESSAGE_SCHEMA,
    type: FBX_WORKER_TYPES.ACCEPTED,
    jobId: job.jobId,
    operation: job.operation,
    inputByteLength: job.inputByteLength,
  };
}

export function makeProgress(jobId, stage, ordinal) {
  return {
    schema: FBX_WORKER_MESSAGE_SCHEMA,
    type: FBX_WORKER_TYPES.PROGRESS,
    jobId,
    stage,
    ordinal,
  };
}

export function makeComplete(jobId, graph, diagnostics) {
  return {
    schema: FBX_WORKER_MESSAGE_SCHEMA,
    type: FBX_WORKER_TYPES.COMPLETE,
    jobId,
    stage: 'complete',
    graph,
    diagnostics,
  };
}

export function makeWorkerError(jobId, error, progressStages, diagnostics = null) {
  const code = KNOWN_CODES.has(error?.code) ? error.code : FBX_WORKER_ERROR_CODES.RUNTIME_ERROR;
  const message = boundedText(error?.message, 2048) ? error.message : 'The FBX worker failed.';
  const detail = boundedText(error?.detail, 4096) ? error.detail : boundedText(error?.message, 4096) ? error.message : null;
  return {
    schema: FBX_WORKER_MESSAGE_SCHEMA,
    type: FBX_WORKER_TYPES.ERROR,
    jobId,
    code,
    stage: error?.stage ?? progressStages.at(-1) ?? null,
    message,
    detail,
    progressStages: [...progressStages],
    diagnostics,
  };
}
