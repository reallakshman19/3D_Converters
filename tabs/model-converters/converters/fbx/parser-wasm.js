const WASM_URL = new URL('../../../../third_party/ufbx/fbx_parser.wasm', import.meta.url);
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

async function loadModule() {
  if (!modulePromise) {
    modulePromise = readWasmBytes(WASM_URL).then(async (bytes) => {
      const imports = { wasi_snapshot_preview1: wasiImports(), env: {} };
      const result = await WebAssembly.instantiate(bytes, imports);
      return result.instance.exports;
    });
  }
  return modulePromise;
}

function copyString(memory, pointer, length) {
  if (!pointer || !length) return '';
  return new TextDecoder().decode(new Uint8Array(memory.buffer, pointer, length));
}

export async function parseFbxBytesWithWasm(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const api = await loadModule();
  const pointer = api.malloc(source.byteLength || 1);
  if (!pointer) throw new Error('FBX parser input allocation failed.');
  try {
    new Uint8Array(api.memory.buffer, pointer, source.byteLength).set(source);
    const ok = api.fbx_parse(pointer, source.byteLength);
    if (!ok) {
      const message = copyString(api.memory, api.fbx_error_ptr(), api.fbx_error_len());
      throw new Error(message || 'ufbx rejected the FBX input.');
    }
    const text = copyString(api.memory, api.fbx_result_ptr(), api.fbx_result_len());
    return JSON.parse(text);
  } finally {
    api.free(pointer);
  }
}
