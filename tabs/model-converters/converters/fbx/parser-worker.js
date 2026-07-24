import { deepFreeze } from './canonical-json.js';
import { parseFbxBytesWithWasm } from './parser-wasm.js';
import { enforceSourceGraphPolicy } from './source-graph.js';
import { createWorkerDiagnostics } from './worker-diagnostics.js';
import { preflightFbxInput } from './worker-preflight.js';
import {
  FBX_WORKER_ERROR_CODES,
  FBX_WORKER_STAGES,
  FbxWorkerRuntimeError,
  assertFbxWorkerJob,
  makeAccepted,
  makeComplete,
  makeProgress,
  makeWorkerError,
  protocolError,
  trustedJobId,
} from './worker-protocol.js';

function policyFailure(error) {
  if (error instanceof FbxWorkerRuntimeError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.SOURCE_GRAPH_POLICY_FAILED,
    'The parsed FBX source graph failed policy enforcement.',
    { stage: 'enforcing-source-policy', detail },
  );
}

function runtimeFailure(error, stage = null) {
  if (error instanceof FbxWorkerRuntimeError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
    'The FBX worker runtime failed.',
    { stage, detail },
  );
}

function createStageEmitter(jobId, post, progressStages, diagnostics) {
  return (stage) => {
    const ordinal = progressStages.length;
    const expected = FBX_WORKER_STAGES[ordinal];
    if (stage !== expected || stage === 'complete') {
      throw protocolError(`Worker attempted stage ${stage}; expected ${expected}.`, progressStages);
    }
    diagnostics.markStage(stage);
    progressStages.push(stage);
    post(makeProgress(jobId, stage, ordinal));
  };
}

function defaultDependencies(overrides = {}) {
  return {
    parse: parseFbxBytesWithWasm,
    preflight: preflightFbxInput,
    enforce: enforceSourceGraphPolicy,
    freeze: deepFreeze,
    diagnosticsFactory: createWorkerDiagnostics,
    ...overrides,
  };
}

export async function handleFbxWorkerMessage(message, post, overrides = {}) {
  const dependencies = defaultDependencies(overrides);
  const progressStages = [];
  let terminalSent = false;
  let jobId = trustedJobId(message?.jobId);
  let diagnostics = dependencies.diagnosticsFactory(message?.inputByteLength || 0);
  const sendTerminal = (value) => {
    if (terminalSent) return false;
    post(value);
    terminalSent = true;
    return true;
  };
  try {
    const job = assertFbxWorkerJob(message);
    jobId = job.jobId;
    diagnostics = dependencies.diagnosticsFactory(job.inputByteLength);
    post(makeAccepted(job));
    const emitStage = createStageEmitter(job.jobId, post, progressStages, diagnostics);
    emitStage('preflight');
    const bytes = new Uint8Array(job.bytes);
    dependencies.preflight(bytes, job.inputByteLength);
    const parsed = await dependencies.parse(bytes, { onStage: emitStage });
    emitStage('enforcing-source-policy');
    let graph;
    try {
      graph = dependencies.freeze(dependencies.enforce(parsed));
    } catch (error) {
      throw policyFailure(error);
    }
    emitStage('preparing-transfer');
    const snapshot = diagnostics.snapshot('FBX_WORKER_COMPLETE', graph);
    sendTerminal(makeComplete(job.jobId, graph, snapshot));
  } catch (error) {
    const failure = runtimeFailure(error, progressStages.at(-1) || null);
    const snapshot = diagnostics.snapshot(failure.code);
    sendTerminal(makeWorkerError(jobId, failure, progressStages, snapshot));
  }
}

let workerJobReceived = false;

function dispatchWorkerMessage(value, post) {
  if (workerJobReceived) {
    const error = new FbxWorkerRuntimeError(
      FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
      'The FBX worker accepts only one job.',
      { detail: 'duplicate-worker-job' },
    );
    post(makeWorkerError(trustedJobId(value?.jobId), error, []));
    return;
  }
  workerJobReceived = true;
  handleFbxWorkerMessage(value, post);
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event) => dispatchWorkerMessage(event.data, (value) => self.postMessage(value));
} else if (typeof process !== 'undefined' && process.versions?.node) {
  const { parentPort } = await import('node:worker_threads');
  parentPort?.on('message', (value) => dispatchWorkerMessage(value, (result) => parentPort.postMessage(result)));
}
