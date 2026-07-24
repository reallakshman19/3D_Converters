import {
  FBX_WORKER_ERROR_CODES,
  FbxWorkerRuntimeError,
} from './worker-protocol.js';

const WASM_URL = new URL('../../../../third_party/ufbx/fbx_parser.wasm', import.meta.url);
const REQUIRED_EXPORTS = [
  'memory', 'malloc', 'free', 'fbx_parse',
  'fbx_result_ptr', 'fbx_result_len', 'fbx_error_ptr', 'fbx_error_len',
];
let modulePromise;

function wasiImports() {
  return new Proxy({}, { get: () => () => 0 });
}

async function readWasmBytes(url) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const [{ readFile }, { fileURLToPath }] = await Promise.all([
      import('node:fs/promises'), import('node:url'),
    ]);
    return readFile(fileURLToPath(url));
  }
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load FBX parser WASM: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function validateExports(api) {
  for (const name of REQUIRED_EXPORTS) {
    if (!(name in api)) throw new Error(`FBX parser WASM export is missing: ${name}`);
  }
  return api;
}

async function instantiateModule() {
  const bytes = await readWasmBytes(WASM_URL);
  const imports = { wasi_snapshot_preview1: wasiImports(), env: {} };
  const result = await WebAssembly.instantiate(bytes, imports);
  return validateExports(result.instance.exports);
}

export async function loadFbxWasmModule() {
  if (!modulePromise) modulePromise = instantiateModule();
  try {
    return await modulePromise;
  } catch (error) {
    modulePromise = undefined;
    const detail = error instanceof Error ? error.message : String(error);
    throw new FbxWorkerRuntimeError(
      FBX_WORKER_ERROR_CODES.WASM_LOAD_FAILED,
      'The FBX parser WASM could not be loaded.',
      { stage: 'loading-wasm', detail },
    );
  }
}

function copyString(memory, pointer, length) {
  if (!pointer || !length) return '';
  const bytes = new Uint8Array(memory.buffer, pointer, length);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function runtimeFailure(message, stage, detail) {
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.RUNTIME_ERROR,
    message,
    { stage, detail },
  );
}

function parserRejection(api) {
  let detail = '';
  try {
    detail = copyString(api.memory, api.fbx_error_ptr(), api.fbx_error_len());
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error);
  }
  return new FbxWorkerRuntimeError(
    FBX_WORKER_ERROR_CODES.PARSE_REJECTED,
    'The FBX parser failed or rejected the input.',
    { stage: 'parsing-fbx', detail: detail || 'ufbx rejected the FBX input.' },
  );
}

function decodeResult(api) {
  try {
    const text = copyString(api.memory, api.fbx_result_ptr(), api.fbx_result_len());
    return JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new FbxWorkerRuntimeError(
      FBX_WORKER_ERROR_CODES.RESULT_DECODE_FAILED,
      'The FBX parser result could not be decoded.',
      { stage: 'decoding-result', detail },
    );
  }
}

function copyInput(api, source, pointer) {
  try {
    new Uint8Array(api.memory.buffer, pointer, source.byteLength).set(source);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw runtimeFailure('The FBX input could not be copied into WASM memory.', 'copying-input', detail);
  }
}

function runParser(api, pointer, length) {
  try {
    if (!api.fbx_parse(pointer, length)) throw parserRejection(api);
  } catch (error) {
    if (error instanceof FbxWorkerRuntimeError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw runtimeFailure('The FBX parser runtime failed.', 'parsing-fbx', detail);
  }
}

function freeInput(api, pointer, priorError) {
  try {
    api.free(pointer);
  } catch (error) {
    if (priorError) return;
    const detail = error instanceof Error ? error.message : String(error);
    throw runtimeFailure('The FBX parser input allocation could not be released.', 'decoding-result', detail);
  }
}

export async function parseFbxBytesWithWasm(bytes, options = {}) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  options.onStage?.('loading-wasm');
  const api = await loadFbxWasmModule();
  options.onStage?.('copying-input');
  const pointer = api.malloc(source.byteLength || 1);
  if (!pointer) throw runtimeFailure('FBX parser input allocation failed.', 'copying-input', 'malloc-returned-zero');
  let priorError = null;
  try {
    copyInput(api, source, pointer);
    options.onStage?.('parsing-fbx');
    runParser(api, pointer, source.byteLength);
    options.onStage?.('decoding-result');
    return decodeResult(api);
  } catch (error) {
    priorError = error;
    throw error;
  } finally {
    freeInput(api, pointer, priorError);
  }
}
