import { buildFbxGeometryBundle } from './geometry-bundle.js';
import { sha256Hex } from './sha256.js';
import { preflightFbxInput } from './worker-preflight.js';
import { FBX_WORKER_ERROR_CODES, FbxWorkerRuntimeError } from './worker-protocol.js';
import { FBX_GEOMETRY_WORKER_ERROR_CODES } from './geometry-worker-protocol.js';

const WASM_URL = new URL('../../../../third_party/ufbx/fbx_parser.wasm', import.meta.url);
const PROVENANCE_URL = new URL('../../../../third_party/ufbx/provenance.json', import.meta.url);
const LEGACY_EXPORTS = [
  'memory', 'malloc', 'free', 'fbx_parse', 'fbx_result_ptr', 'fbx_result_len',
  'fbx_error_ptr', 'fbx_error_len',
];
const GEOMETRY_EXPORTS = [
  'fbx_geometry_parse', 'fbx_geometry_result_ptr', 'fbx_geometry_result_len',
  'fbx_geometry_buffer_count', 'fbx_geometry_buffer_ptr', 'fbx_geometry_buffer_len',
];
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REVISION_PATTERN = /^[0-9a-f]{40}$/;
let modulePromise;
let wasmBytesPromise;
let parserIdentityPromise;

function wasiImports() { return new Proxy({}, { get: () => () => 0 }); }
async function readUrlBytes(url) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const [{ readFile }, { fileURLToPath }] = await Promise.all([
      import('node:fs/promises'), import('node:url'),
    ]);
    return new Uint8Array(await readFile(fileURLToPath(url)));
  }
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load FBX runtime resource: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
function wasmBytes() {
  if (!wasmBytesPromise) wasmBytesPromise = readUrlBytes(WASM_URL).catch((error) => {
    wasmBytesPromise = undefined; throw error;
  });
  return wasmBytesPromise;
}
function requireExports(api, names) {
  for (const name of names) if (!(name in api)) throw new Error(`FBX parser WASM export is missing: ${name}`);
  return api;
}
async function instantiateModule() {
  const result = await WebAssembly.instantiate(await wasmBytes(), {
    wasi_snapshot_preview1: wasiImports(), env: {},
  });
  return requireExports(result.instance.exports, LEGACY_EXPORTS);
}
function wasmLoadFailure(error) {
  const detail = error instanceof Error ? error.message : String(error);
  return new FbxWorkerRuntimeError(FBX_WORKER_ERROR_CODES.WASM_LOAD_FAILED,
    'The FBX parser WASM could not be loaded.', { stage: 'loading-wasm', detail });
}
export async function loadFbxWasmModule() {
  if (!modulePromise) modulePromise = instantiateModule();
  try { return await modulePromise; } catch (error) { modulePromise = undefined; throw wasmLoadFailure(error); }
}
function validProvenance(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.schema === 'UfbxWasmProvenance.v1'
    && REVISION_PATTERN.test(value.upstreamRevision) && HASH_PATTERN.test(value.sourceSha256)
    && HASH_PATTERN.test(value.wasmSha256);
}
async function readParserIdentity() {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await readUrlBytes(PROVENANCE_URL));
    const provenance = JSON.parse(text);
    if (!validProvenance(provenance)) throw new Error('FBX parser provenance fields are invalid.');
    const digest = await sha256Hex(await wasmBytes());
    if (digest !== provenance.wasmSha256) throw new Error('FBX parser WASM digest differs from provenance.');
    return Object.freeze({
      provenanceSchema: provenance.schema,
      upstreamRevision: provenance.upstreamRevision,
      sourceSha256: provenance.sourceSha256,
      wasmSha256: provenance.wasmSha256,
    });
  } catch (error) { throw wasmLoadFailure(error); }
}
export async function loadFbxParserIdentity() {
  if (!parserIdentityPromise) parserIdentityPromise = readParserIdentity().catch((error) => {
    parserIdentityPromise = undefined; throw error;
  });
  return parserIdentityPromise;
}
function identitiesEqual(left, right) {
  return left?.provenanceSchema === right?.provenanceSchema
    && left?.upstreamRevision === right?.upstreamRevision
    && left?.sourceSha256 === right?.sourceSha256 && left?.wasmSha256 === right?.wasmSha256;
}
function copyString(memory, pointer, length) {
  if (!pointer || !length) return '';
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(memory.buffer, pointer, length));
}
function runtimeFailure(message, stage, detail, code = FBX_WORKER_ERROR_CODES.RUNTIME_ERROR) {
  return new FbxWorkerRuntimeError(code, message, { stage, detail });
}
function parserRejection(api) {
  let detail = '';
  try { detail = copyString(api.memory, api.fbx_error_ptr(), api.fbx_error_len()); }
  catch (error) { detail = error instanceof Error ? error.message : String(error); }
  return new FbxWorkerRuntimeError(FBX_WORKER_ERROR_CODES.PARSE_REJECTED,
    'The FBX parser failed or rejected the input.', {
      stage: 'parsing-fbx', detail: detail || 'ufbx rejected the FBX input.',
    });
}
function decodeJson(api, pointerName, lengthName, code) {
  try { return JSON.parse(copyString(api.memory, api[pointerName](), api[lengthName]())); }
  catch (error) {
    throw runtimeFailure('The FBX parser result could not be decoded.', 'decoding-result',
      error instanceof Error ? error.message : String(error), code);
  }
}
function copyInput(api, source, pointer) {
  try { new Uint8Array(api.memory.buffer, pointer, source.byteLength).set(source); }
  catch (error) { throw runtimeFailure('The FBX input could not be copied into WASM memory.', 'copying-input', error instanceof Error ? error.message : String(error)); }
}
function runParser(api, name, pointer, length) {
  try { if (!api[name](pointer, length)) throw parserRejection(api); }
  catch (error) {
    if (error instanceof FbxWorkerRuntimeError) throw error;
    throw runtimeFailure('The FBX parser runtime failed.', 'parsing-fbx', error instanceof Error ? error.message : String(error));
  }
}
function freeInput(api, pointer, priorError) {
  try { api.free(pointer); }
  catch (error) { if (!priorError) throw runtimeFailure('The FBX parser input allocation could not be released.', 'decoding-result', error instanceof Error ? error.message : String(error)); }
}
async function withInput(bytes, options, callback) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  options.onStage?.('loading-wasm');
  const api = await loadFbxWasmModule();
  if (options.parserIdentity) {
    const actual = await loadFbxParserIdentity();
    if (!identitiesEqual(options.parserIdentity, actual)) throw wasmLoadFailure(new Error('FBX parser identity differs from repository provenance.'));
  }
  options.onStage?.('copying-input');
  const pointer = api.malloc(source.byteLength || 1);
  if (!pointer) throw runtimeFailure('FBX parser input allocation failed.', 'copying-input', 'malloc-returned-zero');
  let priorError = null;
  try { copyInput(api, source, pointer); options.onStage?.('parsing-fbx'); return await callback(api, pointer, source.byteLength); }
  catch (error) { priorError = error; throw error; }
  finally { freeInput(api, pointer, priorError); }
}
export async function parseFbxBytesWithWasm(bytes, options = {}) {
  return withInput(bytes, options, (api, pointer, length) => {
    runParser(api, 'fbx_parse', pointer, length); options.onStage?.('decoding-result');
    return decodeJson(api, 'fbx_result_ptr', 'fbx_result_len', FBX_WORKER_ERROR_CODES.RESULT_DECODE_FAILED);
  });
}
function copyGeometryBuffers(api) {
  const count = api.fbx_geometry_buffer_count();
  if (!Number.isSafeInteger(count) || count < 0 || count > 196608) throw runtimeFailure('The FBX geometry buffer count is invalid.', 'decoding-result', String(count), FBX_GEOMETRY_WORKER_ERROR_CODES.RESULT_DECODE_FAILED);
  const buffers = [];
  for (let index = 0; index < count; index += 1) {
    const pointer = api.fbx_geometry_buffer_ptr(index), length = api.fbx_geometry_buffer_len(index);
    if (!Number.isSafeInteger(pointer) || pointer < 0 || !Number.isSafeInteger(length)
      || length < 0 || (length > 0 && pointer === 0)) throw runtimeFailure('The FBX geometry buffer length is invalid.', 'decoding-result', `index=${index}`, FBX_GEOMETRY_WORKER_ERROR_CODES.RESULT_DECODE_FAILED);
    try {
      const bytes = new Uint8Array(length);
      if (length) bytes.set(new Uint8Array(api.memory.buffer, pointer, length));
      buffers.push(bytes.buffer);
    } catch (error) { throw runtimeFailure('The FBX geometry buffer could not be copied.', 'decoding-result', error instanceof Error ? error.message : String(error), FBX_GEOMETRY_WORKER_ERROR_CODES.RESULT_DECODE_FAILED); }
  }
  return buffers;
}
export async function parseFbxGeometryRawWithWasm(bytes, options = {}) {
  return withInput(bytes, options, (api, pointer, length) => {
    try { requireExports(api, GEOMETRY_EXPORTS); }
    catch (error) { throw wasmLoadFailure(error); }
    runParser(api, 'fbx_geometry_parse', pointer, length); options.onStage?.('decoding-result');
    const rawTopology = decodeJson(api, 'fbx_geometry_result_ptr', 'fbx_geometry_result_len', FBX_GEOMETRY_WORKER_ERROR_CODES.RESULT_DECODE_FAILED);
    return { rawTopology, buffers: copyGeometryBuffers(api) };
  });
}
function byteView(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(value);
}
function sameSourceIdentity(left, right) {
  return left?.sha256 === right.sha256 && left?.byteLength === right.byteLength && left?.fbxVersion === right.fbxVersion;
}
export async function parseFbxGeometryBundleWithWasm(bytes, options = {}) {
  const source = byteView(bytes).slice(), preflight = preflightFbxInput(source, source.byteLength);
  const actualSourceIdentity = { sha256: await sha256Hex(source), byteLength: source.byteLength, fbxVersion: preflight.version };
  if (options.sourceIdentity && !sameSourceIdentity(options.sourceIdentity, actualSourceIdentity)) throw runtimeFailure('The FBX source identity differs from the supplied bytes.', 'preflight', 'source-identity-mismatch', FBX_GEOMETRY_WORKER_ERROR_CODES.BUNDLE_INVALID);
  const parserIdentity = options.parserIdentity || await loadFbxParserIdentity();
  const parsed = await parseFbxGeometryRawWithWasm(source, { ...options, parserIdentity });
  options.onStage?.('enforcing-source-policy');
  const bundle = await buildFbxGeometryBundle({ ...parsed, sourceIdentity: actualSourceIdentity, parserIdentity });
  options.onStage?.('preparing-transfer');
  return bundle;
}
