import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const UFBX_WASM_TARGET = 'wasm32-wasi';
export const UFBX_WASM_REQUIRED_EXPORTS = Object.freeze([
  ['fbx_attribute_buffer_count', 'function'],
  ['fbx_attribute_buffer_len', 'function'],
  ['fbx_attribute_buffer_ptr', 'function'],
  ['fbx_attribute_error_len', 'function'],
  ['fbx_attribute_error_ptr', 'function'],
  ['fbx_attribute_parse', 'function'],
  ['fbx_attribute_result_len', 'function'],
  ['fbx_attribute_result_ptr', 'function'],
  ['fbx_error_len', 'function'],
  ['fbx_error_ptr', 'function'],
  ['fbx_geometry_buffer_count', 'function'],
  ['fbx_geometry_buffer_len', 'function'],
  ['fbx_geometry_buffer_ptr', 'function'],
  ['fbx_geometry_parse', 'function'],
  ['fbx_geometry_result_len', 'function'],
  ['fbx_geometry_result_ptr', 'function'],
  ['fbx_parse', 'function'],
  ['fbx_result_len', 'function'],
  ['fbx_result_ptr', 'function'],
  ['free', 'function'],
  ['malloc', 'function'],
  ['memory', 'memory'],
]);
export const UFBX_WASM_REQUIRED_IMPORTS = Object.freeze([
  ['wasi_snapshot_preview1', 'fd_close', 'function'],
  ['wasi_snapshot_preview1', 'fd_seek', 'function'],
  ['wasi_snapshot_preview1', 'fd_write', 'function'],
]);

function compareTuple(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function exactTuples(actual, expected, label) {
  const left = [...actual].sort(compareTuple);
  const right = [...expected].sort(compareTuple);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`FBX_WASM_ABI_INVALID ${label} differ: ${JSON.stringify(left)}`);
  }
  return Object.freeze(left.map((item) => Object.freeze(item)));
}

export function inspectUfbxWasm(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const module = new WebAssembly.Module(source);
  const exports = WebAssembly.Module.exports(module).map(({ name, kind }) => [name, kind]);
  const imports = WebAssembly.Module.imports(module).map(({ module: owner, name, kind }) => [owner, name, kind]);
  return Object.freeze({
    target: UFBX_WASM_TARGET,
    exports: exactTuples(exports, UFBX_WASM_REQUIRED_EXPORTS, 'exports'),
    imports: exactTuples(imports, UFBX_WASM_REQUIRED_IMPORTS, 'imports'),
  });
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: node scripts/fbx/inspect-ufbx-wasm.mjs <wasm>');
  const result = inspectUfbxWasm(await readFile(path));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
