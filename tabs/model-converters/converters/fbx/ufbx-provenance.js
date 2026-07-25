import { deepFreeze } from './canonical-json.js';
import {
  FBX_WASM_REQUIRED_EXPORTS,
  FBX_WASM_REQUIRED_IMPORTS,
  FBX_WASM_TARGET,
} from './wasm-abi.js';

export const UFBX_WASM_PROVENANCE_SCHEMA = 'UfbxWasmProvenance.v1';
export const UFBX_UPSTREAM_REVISION = '729ab835444f5f229e5f7cff332692ce6c00415d';
export const UFBX_SOURCE_FILES = deepFreeze(['ufbx.c', 'ufbx.h']);
export const UFBX_BUILD_SOURCE_FILES = deepFreeze([
  'scripts/fbx/build-ufbx-wasm.sh',
  'scripts/fbx/inspect-ufbx-wasm.mjs',
  'tabs/model-converters/converters/fbx/wasm-abi.js',
  'third_party/ufbx/fbx_attributes.c',
  'third_party/ufbx/fbx_parser.c',
  'third_party/ufbx/ufbx.c',
  'third_party/ufbx/ufbx.h',
]);

const TOP_KEYS = [
  'schema', 'upstreamRepository', 'upstreamRevision', 'upstreamTag', 'license',
  'sourceFiles', 'sourceSha256', 'buildSourceFiles', 'buildSourceSha256',
  'buildScriptPath', 'buildScriptSha256', 'buildCommand', 'target', 'compiler',
  'linker', 'wasiSysroot', 'environment', 'requiredExports', 'requiredImports',
  'wasmSha256', 'wasmByteLength',
];
const TOOL_KEYS = ['command', 'sha256', 'version'];
const SYSROOT_KEYS = ['packages', 'sha256'];
const PACKAGE_KEYS = ['name', 'version'];
const ENV_KEYS = ['LC_ALL', 'SOURCE_DATE_EPOCH', 'TZ'];
const HASH = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const PACKAGE_NAMES = Object.freeze([
  'libclang-rt-18-dev-wasm32', 'wasi-libc',
]);

function fail(message) {
  throw new Error(`BLOCKED_PARSER_PROVENANCE ${message}`);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) fail(`${label} fields are invalid.`);
}

function exactArray(value, expected, label) {
  if (!Array.isArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) {
    fail(`${label} differs from the governed contract.`);
  }
}

function hash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${label} is invalid.`);
}

function validateTool(value, label, expectedCommand) {
  exactKeys(value, TOOL_KEYS, label);
  if (value.command !== expectedCommand || typeof value.version !== 'string'
    || !value.version.trim()) fail(`${label} identity is invalid.`);
  hash(value.sha256, `${label}.sha256`);
}

function validateSysroot(value) {
  exactKeys(value, SYSROOT_KEYS, 'wasiSysroot');
  hash(value.sha256, 'wasiSysroot.sha256');
  if (!Array.isArray(value.packages) || value.packages.length !== PACKAGE_NAMES.length) {
    fail('wasiSysroot packages are invalid.');
  }
  value.packages.forEach((item, index) => {
    exactKeys(item, PACKAGE_KEYS, `wasiSysroot.packages[${index}]`);
    if (item.name !== PACKAGE_NAMES[index]
      || typeof item.version !== 'string' || !item.version) {
      fail('wasiSysroot package identity is invalid.');
    }
  });
}

function validateEnvironment(value) {
  exactKeys(value, ENV_KEYS, 'environment');
  if (value.LC_ALL !== 'C' || value.TZ !== 'UTC'
    || value.SOURCE_DATE_EPOCH !== '0') fail('Build environment is invalid.');
}

export function acceptUfbxWasmProvenance(value) {
  const provenance = structuredClone(value);
  exactKeys(provenance, TOP_KEYS, 'provenance');
  if (provenance.schema !== UFBX_WASM_PROVENANCE_SCHEMA
    || provenance.upstreamRepository !== 'ufbx/ufbx'
    || !REVISION.test(provenance.upstreamRevision)
    || provenance.upstreamRevision !== UFBX_UPSTREAM_REVISION
    || provenance.upstreamTag !== 'v0.18.0'
    || provenance.license !== 'MIT alternative') fail('Upstream identity is invalid.');
  exactArray(provenance.sourceFiles, UFBX_SOURCE_FILES, 'sourceFiles');
  exactArray(provenance.buildSourceFiles, UFBX_BUILD_SOURCE_FILES, 'buildSourceFiles');
  hash(provenance.sourceSha256, 'sourceSha256');
  hash(provenance.buildSourceSha256, 'buildSourceSha256');
  hash(provenance.buildScriptSha256, 'buildScriptSha256');
  if (provenance.buildScriptPath !== 'scripts/fbx/build-ufbx-wasm.sh'
    || provenance.buildCommand
      !== 'CC=clang-18 WASI_SYSROOT=/usr bash scripts/fbx/build-ufbx-wasm.sh'
    || provenance.target !== FBX_WASM_TARGET) fail('Build identity is invalid.');
  validateTool(provenance.compiler, 'compiler', 'clang-18');
  validateTool(provenance.linker, 'linker', 'wasm-ld-18');
  validateSysroot(provenance.wasiSysroot);
  validateEnvironment(provenance.environment);
  exactArray(provenance.requiredExports, FBX_WASM_REQUIRED_EXPORTS,
    'requiredExports');
  exactArray(provenance.requiredImports, FBX_WASM_REQUIRED_IMPORTS,
    'requiredImports');
  hash(provenance.wasmSha256, 'wasmSha256');
  if (!Number.isSafeInteger(provenance.wasmByteLength)
    || provenance.wasmByteLength <= 0) fail('wasmByteLength is invalid.');
  return deepFreeze(provenance);
}
