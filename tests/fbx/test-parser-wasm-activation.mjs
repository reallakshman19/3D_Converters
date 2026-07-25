import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const buildPath = new URL('scripts/fbx/build-ufbx-wasm.sh', root);
const build = await readFile(buildPath, 'utf8');

for (const evidence of [
  'WASI_SYSROOT must identify the governed WASI sysroot',
  'governed compiler major 18 is required',
  'compiler.sha256=',
  'compiler.version<<EOF',
  'wasi_sysroot.path=',
  'output.sha256=',
]) assert.match(build, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const symbol of [
  'fbx_parse', 'fbx_result_ptr', 'fbx_result_len',
  'fbx_geometry_parse', 'fbx_geometry_result_ptr', 'fbx_geometry_result_len',
  'fbx_geometry_buffer_count', 'fbx_geometry_buffer_ptr', 'fbx_geometry_buffer_len',
  'fbx_error_ptr', 'fbx_error_len',
]) assert.match(build, new RegExp(`--export=${symbol}\\b`));

async function makeCompiler(directory, major) {
  const path = join(directory, 'clang-18');
  await writeFile(path, `#!/usr/bin/env bash\nset -euo pipefail\nif [[ "\${1-}" == --version ]]; then\n  printf 'clang version ${major}.0.0 (governed test double)\\n'\n  exit 0\nfi\nout=''\nwhile ((\$#)); do\n  if [[ "$1" == -o ]]; then shift; out="$1"; fi\n  shift || true\ndone\ntest -n "$out"\nprintf 'wasm-test-bytes' >"$out"\n`);
  await chmod(path, 0o755);
  return path;
}

async function runBuild(major) {
  const work = await mkdtemp(join(tmpdir(), 'fbx-wasm-activation-'));
  const bin = join(work, 'bin');
  const sysroot = join(work, 'sysroot');
  const output = join(work, 'fbx_parser.wasm');
  await mkdir(bin);
  await mkdir(join(sysroot, 'include'), { recursive: true });
  await mkdir(join(sysroot, 'lib', 'wasm32-wasi'), { recursive: true });
  await makeCompiler(bin, major);
  const result = spawnSync('bash', [buildPath.pathname], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      CC: 'clang-18',
      WASI_SYSROOT: sysroot,
      FBX_WASM_OUTPUT: output,
    },
  });
  return { output, result };
}

const accepted = await runBuild(18);
assert.equal(accepted.result.status, 0, accepted.result.stderr);
assert.equal(await readFile(accepted.output, 'utf8'), 'wasm-test-bytes');
assert.match(accepted.result.stdout, /compiler\.version<<EOF/);
assert.match(accepted.result.stdout, /output\.sha256=[0-9a-f]{64}/);

const rejected = await runBuild(17);
assert.notEqual(rejected.result.status, 0);
assert.match(rejected.result.stderr, /governed compiler major 18 is required/);

console.log('test-parser-wasm-activation: BUILD_GUARDS_PASS');
