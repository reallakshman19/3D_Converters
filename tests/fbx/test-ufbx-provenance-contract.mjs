import assert from 'node:assert/strict';
import {
  UFBX_BUILD_SOURCE_FILES,
  UFBX_SOURCE_FILES,
  UFBX_UPSTREAM_REVISION,
  acceptUfbxWasmProvenance,
} from '../../tabs/model-converters/converters/fbx/ufbx-provenance.js';
import {
  FBX_WASM_REQUIRED_EXPORTS,
  FBX_WASM_REQUIRED_IMPORTS,
} from '../../tabs/model-converters/converters/fbx/wasm-abi.js';

const HASH = '1'.repeat(64);
function valid() {
  return {
    schema: 'UfbxWasmProvenance.v1', upstreamRepository: 'ufbx/ufbx',
    upstreamRevision: UFBX_UPSTREAM_REVISION, upstreamTag: 'v0.18.0',
    license: 'MIT alternative', sourceFiles: [...UFBX_SOURCE_FILES],
    sourceSha256: HASH, buildSourceFiles: [...UFBX_BUILD_SOURCE_FILES],
    buildSourceSha256: HASH, buildScriptPath: 'scripts/fbx/build-ufbx-wasm.sh',
    buildScriptSha256: HASH,
    buildCommand: 'CC=clang-18 WASI_SYSROOT=/usr bash scripts/fbx/build-ufbx-wasm.sh',
    target: 'wasm32-wasi',
    compiler: { command: 'clang-18', sha256: HASH, version: 'Ubuntu clang version 18.1.3' },
    linker: { command: 'wasm-ld-18', sha256: HASH, version: 'Ubuntu LLD 18.1.3' },
    wasiSysroot: { packages: [
      { name: 'libclang-rt-18-dev-wasm32', version: '18.1.3-1' },
      { name: 'wasi-libc', version: '0.0~git20220510.9886d3d-2' },
    ], sha256: HASH },
    environment: { LC_ALL: 'C', SOURCE_DATE_EPOCH: '0', TZ: 'UTC' },
    requiredExports: FBX_WASM_REQUIRED_EXPORTS.map((item) => [...item]),
    requiredImports: FBX_WASM_REQUIRED_IMPORTS.map((item) => [...item]),
    wasmSha256: HASH, wasmByteLength: 123,
  };
}

const source = valid(), accepted = acceptUfbxWasmProvenance(source);
assert.ok(Object.isFrozen(accepted));
assert.ok(Object.isFrozen(accepted.compiler));
assert.ok(Object.isFrozen(accepted.wasiSysroot.packages));
source.compiler.version = 'mutated';
source.requiredExports[0][0] = 'mutated';
assert.notEqual(accepted.compiler.version, 'mutated');
assert.notEqual(accepted.requiredExports[0][0], 'mutated');

for (const mutate of [
  (value) => { delete value.wasmByteLength; },
  (value) => { value.runtimeVersion = 'volatile'; },
  (value) => { value.upstreamRevision = '0'.repeat(40); },
  (value) => { value.sourceSha256 = '0'.repeat(64); value.sourceFiles.reverse(); },
  (value) => { value.compiler.command = 'clang'; },
  (value) => { value.requiredExports.pop(); },
  (value) => { value.requiredImports.push(['env', 'hidden', 'function']); },
  (value) => { value.environment.generatedAt = 'now'; },
]) {
  const candidate = valid(); mutate(candidate);
  assert.throws(() => acceptUfbxWasmProvenance(candidate), /BLOCKED_PARSER_PROVENANCE/);
}

assert.throws(() => acceptUfbxWasmProvenance(null), /BLOCKED_PARSER_PROVENANCE/);
console.log('test-ufbx-provenance-contract: PASS');
