import assert from 'node:assert/strict';
import { canonicalJson, deepFreeze } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { convertFbxToStagedJson } from '../../tabs/model-converters/converters/fbx/conversion.js';
import { parseFbxBytesWithWasm } from '../../tabs/model-converters/converters/fbx/parser-wasm.js';
import { handleFbxWorkerMessage } from '../../tabs/model-converters/converters/fbx/parser-worker.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';
import { promoteNoMappingJsonOutput } from '../../tabs/model-converters/converters/fbx-to-stagedjson.js';
import { FBX_WORKER_TYPES } from '../../tabs/model-converters/converters/fbx/worker-protocol.js';
import { fixtureBytes, fixtureMapping } from './helpers.mjs';

const FORBIDDEN_RUNTIME_KEYS = new Set([
  'jobId', 'workerId', 'timestamp', 'timestamps', 'stageTimingsMs',
  'browserCapabilities', 'workerCreated', 'workerTerminated',
  'terminalCode', 'progressStages', 'workerMode', 'inputByteLength',
]);

function assertNoRuntimeFields(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRuntimeFields(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!FORBIDDEN_RUNTIME_KEYS.has(key), `${path}.${key} is a runtime-only field`);
    assertNoRuntimeFields(child, `${path}.${key}`);
  }
}

async function managedParse(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const transfer = source.slice().buffer;
  const messages = [];
  await handleFbxWorkerMessage({
    schema: 'FbxWorkerJob.v1',
    operation: 'PARSE_SOURCE_GRAPH',
    jobId: 'byte-parity-job',
    inputByteLength: transfer.byteLength,
    bytes: transfer,
  }, (message) => messages.push(message));
  const error = messages.find((message) => message.type === FBX_WORKER_TYPES.ERROR);
  if (error) throw new Error(`${error.code}: ${error.detail || error.message}`);
  const complete = messages.find((message) => message.type === FBX_WORKER_TYPES.COMPLETE);
  assert.ok(complete, 'managed worker did not complete');
  assertNoRuntimeFields(complete.graph);
  return complete.graph;
}

function comparableResult(result) {
  return {
    ok: result.ok,
    conversionStatus: result.conversionStatus,
    outputs: result.outputs.map(({ name, mime, text }) => ({ name, mime, text })),
    logs: result.logs,
  };
}

const bytes = await fixtureBytes();
const directGraph = deepFreeze(enforceSourceGraphPolicy(await parseFbxBytesWithWasm(bytes)));
const workerGraph = await managedParse(bytes);
assert.equal(canonicalJson(workerGraph), canonicalJson(directGraph), 'FbxSourceGraph.v2 bytes changed');

const mapping = await fixtureMapping();
const baseOptions = { bytes, inputName: 'two-pipes.fbx', parserEvidence: null, parserEvidenceError: null };
const directMapped = await convertFbxToStagedJson({
  ...baseOptions,
  mapping,
  mappingError: null,
  parse: async () => directGraph,
});
const workerMapped = await convertFbxToStagedJson({
  ...baseOptions,
  mapping,
  mappingError: null,
  parse: managedParse,
});
assert.deepEqual(comparableResult(workerMapped), comparableResult(directMapped));
workerMapped.outputs.forEach((output) => assertNoRuntimeFields(JSON.parse(output.text)));

const directNoMapping = await convertFbxToStagedJson({
  ...baseOptions,
  mapping: null,
  mappingError: null,
  parse: async () => directGraph,
});
const workerNoMapping = await convertFbxToStagedJson({
  ...baseOptions,
  mapping: null,
  mappingError: null,
  parse: managedParse,
});
assert.deepEqual(comparableResult(workerNoMapping), comparableResult(directNoMapping));
assert.deepEqual(
  comparableResult(promoteNoMappingJsonOutput(workerNoMapping, 'two-pipes.fbx')),
  comparableResult(promoteNoMappingJsonOutput(directNoMapping, 'two-pipes.fbx')),
);

console.log('test-worker-byte-parity: PASS');
