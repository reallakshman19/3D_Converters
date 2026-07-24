import assert from 'node:assert/strict';
import {
  FBX_WORKER_JOB_SCHEMA,
  FBX_WORKER_MESSAGE_SCHEMA,
  FBX_WORKER_OPERATION,
  FBX_WORKER_STAGES,
  FBX_WORKER_TYPES,
  FBX_WORKER_ERROR_CODES,
  FbxWorkerRuntimeError,
  assertAcceptedMessage,
  assertCompleteMessage,
  assertErrorMessage,
  assertFbxWorkerJob,
  assertProgressMessage,
  assertWorkerEnvelope,
  makeAccepted,
  makeComplete,
  makeProgress,
  makeWorkerError,
  trustedJobId,
} from '../../tabs/model-converters/converters/fbx/worker-protocol.js';

const bytes = new ArrayBuffer(27);
const job = {
  schema: FBX_WORKER_JOB_SCHEMA,
  operation: FBX_WORKER_OPERATION,
  jobId: 'job-1',
  inputByteLength: bytes.byteLength,
  bytes,
};
assert.equal(assertFbxWorkerJob(job), job);
assert.equal(trustedJobId('a:b.c_1-2'), 'a:b.c_1-2');
assert.equal(trustedJobId('bad job id'), null);

for (const invalid of [
  null,
  { ...job, schema: 'wrong' },
  { ...job, operation: 'wrong' },
  { ...job, jobId: '' },
  { ...job, inputByteLength: -1 },
  { ...job, bytes: new Uint8Array(1) },
]) {
  assert.throws(() => assertFbxWorkerJob(invalid), (error) => {
    assert.equal(error.code, FBX_WORKER_ERROR_CODES.JOB_INVALID);
    return true;
  });
}

const accepted = makeAccepted(job);
assert.equal(accepted.schema, FBX_WORKER_MESSAGE_SCHEMA);
assert.equal(accepted.type, FBX_WORKER_TYPES.ACCEPTED);
assertAcceptedMessage(assertWorkerEnvelope(accepted, job.jobId), bytes.byteLength);

const progress = [];
for (const [ordinal, stage] of FBX_WORKER_STAGES.slice(0, -1).entries()) {
  const message = makeProgress(job.jobId, stage, ordinal);
  assertProgressMessage(assertWorkerEnvelope(message, job.jobId), progress);
  progress.push(stage);
}

const graph = {
  schema: 'FbxSourceGraph.v2',
  file: { version: 7400, ascii: false, creator: '' },
  documentMetadata: { originalApplication: '', latestApplication: '' },
  globalSettings: { unitMeters: 1, axes: { right: 0, up: 1, front: 2 } },
  sourceObjects: [], occurrences: [], geometries: [], hierarchyEdges: [],
  connectionEdges: [], warnings: [], unsupportedRecords: [], unresolvedReferences: [],
  duplicateSourceObjectIds: [],
};
assertCompleteMessage(assertWorkerEnvelope(makeComplete(job.jobId, graph, {}), job.jobId), progress);
assert.throws(
  () => assertCompleteMessage(makeComplete(job.jobId, { schema: 'FbxSourceGraph.v2' }, {}), progress),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);
assert.throws(
  () => assertCompleteMessage(makeComplete(job.jobId, { ...graph, jobId: 'leak' }, {}), progress),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);
const failure = new FbxWorkerRuntimeError(
  FBX_WORKER_ERROR_CODES.PARSE_REJECTED,
  'rejected',
  { stage: 'parsing-fbx', detail: 'proof' },
);
const errorProgress = FBX_WORKER_STAGES.slice(0, 4);
const errorMessage = makeWorkerError(job.jobId, failure, errorProgress, {});
assertErrorMessage(assertWorkerEnvelope(errorMessage, job.jobId), errorProgress);
assert.throws(
  () => assertErrorMessage({ ...errorMessage, stage: 'decoding-result' }, errorProgress),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);

assert.throws(
  () => assertWorkerEnvelope({ ...accepted, jobId: 'other' }, job.jobId),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);
assert.throws(
  () => assertProgressMessage(makeProgress(job.jobId, 'parsing-fbx', 0), []),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);
assert.throws(
  () => assertCompleteMessage(makeComplete(job.jobId, graph, {}), []),
  (error) => error.code === FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
);

console.log('test-worker-protocol: PASS');
