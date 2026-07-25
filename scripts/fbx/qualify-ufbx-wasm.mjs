import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp, lstat, mkdir, mkdtemp, readFile, readlink, realpath, rm, stat, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  UFBX_BUILD_SOURCE_FILES,
  UFBX_SOURCE_FILES,
  UFBX_UPSTREAM_REVISION,
  acceptUfbxWasmProvenance,
} from '../../tabs/model-converters/converters/fbx/ufbx-provenance.js';
import {
  FBX_WASM_REQUIRED_EXPORTS,
  FBX_WASM_REQUIRED_IMPORTS,
  FBX_WASM_TARGET,
  inspectFbxWasmAbi,
} from '../../tabs/model-converters/converters/fbx/wasm-abi.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACKAGE_NAMES = ['libclang-rt-18-dev-wasm32', 'wasi-libc'];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT, encoding: options.encoding || 'utf8',
    env: options.env || process.env, maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return String(result.stdout).trim();
}

function firstLine(value) {
  return String(value).split(/\r?\n/, 1)[0].trim();
}

async function fileManifest(paths, root = ROOT) {
  const entries = [];
  for (const path of [...paths].sort()) {
    const bytes = await readFile(join(root, path));
    entries.push({ path, byteLength: bytes.byteLength, sha256: sha256(bytes) });
  }
  return Object.freeze(entries);
}

function manifestSha256(domain, entries) {
  const body = entries.map((item) => `${item.path}\0${item.byteLength}\0${item.sha256}\n`).join('');
  return sha256(Buffer.from(`${domain}\0${body}`, 'utf8'));
}

export async function calculateUfbxSourceIdentity(root = ROOT) {
  const bytes = [];
  for (const path of UFBX_SOURCE_FILES) bytes.push(await readFile(join(root, 'third_party/ufbx', path)));
  return sha256(Buffer.concat(bytes));
}

export async function calculateUfbxBuildSourceIdentity(root = ROOT) {
  return manifestSha256('UfbxWasmBuildSources.v1', await fileManifest(UFBX_BUILD_SOURCE_FILES, root));
}

async function toolIdentity(command, versionArgs = ['--version']) {
  const path = await realpath(run('bash', ['-lc', `command -v ${command}`]));
  return { command, path, sha256: sha256(await readFile(path)),
    version: firstLine(run(path, versionArgs)) };
}

async function compilerIdentities() {
  const compiler = await toolIdentity('clang-18');
  const candidate = run(compiler.path, ['--target=wasm32-wasi', '-print-prog-name=wasm-ld']);
  const path = candidate.includes('/') ? await realpath(candidate)
    : await realpath(run('bash', ['-lc', `command -v ${candidate}`]));
  const linker = { command: 'wasm-ld-18', path,
    sha256: sha256(await readFile(path)), version: firstLine(run(path, ['--version'])) };
  return { compiler, linker };
}

async function packageIdentity(name) {
  return { name, version: run('dpkg-query', ['-W', '-f=${Version}', name]) };
}

async function sysrootFiles() {
  const paths = new Set();
  for (const name of PACKAGE_NAMES) {
    const listed = run('dpkg-query', ['-L', name]).split(/\r?\n/).filter(Boolean);
    for (const path of listed) paths.add(path);
  }
  const entries = [];
  for (const path of [...paths].sort()) {
    let info;
    try { info = await lstat(path); } catch { continue; }
    if (info.isSymbolicLink()) {
      const target = await readlink(path);
      entries.push({ path, type: 'symlink', byteLength: Buffer.byteLength(target),
        sha256: sha256(Buffer.from(target, 'utf8')) });
    } else if (info.isFile()) {
      const bytes = await readFile(path);
      entries.push({ path, type: 'file', byteLength: bytes.byteLength,
        sha256: sha256(bytes) });
    }
  }
  return entries;
}

async function wasiIdentity() {
  const packages = [];
  for (const name of PACKAGE_NAMES) packages.push(await packageIdentity(name));
  const entries = await sysrootFiles();
  return { packages, sha256: manifestSha256('UfbxWasiSysroot.v1', entries) };
}

function buildEnvironment(root, compilerPath) {
  return {
    PATH: '/usr/bin:/bin', HOME: join(root, '.home'), TMPDIR: join(root, '.tmp'),
    LC_ALL: 'C', LANG: 'C', TZ: 'UTC', SOURCE_DATE_EPOCH: '0',
    CC: compilerPath, WASI_SYSROOT: '/usr',
    FBX_WASM_OUTPUT: join(root, '.qualification', 'fbx_parser.wasm'),
  };
}

async function extractCheckout(commit, directory) {
  await mkdir(directory, { recursive: true });
  run('bash', ['-lc', `git archive ${commit} | tar -xf - -C "${directory}"`]);
  await rm(join(directory, 'third_party/ufbx/fbx_parser.wasm'), { force: true });
  await rm(join(directory, 'third_party/ufbx/provenance.json'), { force: true });
  await mkdir(join(directory, '.qualification'), { recursive: true });
  await mkdir(join(directory, '.home'), { recursive: true });
  await mkdir(join(directory, '.tmp'), { recursive: true });
}

async function cleanBuild(commit, label, compilerPath) {
  const parent = await mkdtemp(join(tmpdir(), `fbx-wasm-${label}-`));
  const root = join(parent, `checkout-${label}`);
  await extractCheckout(commit, root);
  const env = buildEnvironment(root, compilerPath);
  run('bash', ['scripts/fbx/build-ufbx-wasm.sh'], { cwd: root, env });
  const path = env.FBX_WASM_OUTPUT, bytes = await readFile(path), abi = inspectFbxWasmAbi(bytes);
  return { root, path, bytes, sha256: sha256(bytes), byteLength: bytes.byteLength, abi };
}

function stableTool(value) {
  return { command: value.command, sha256: value.sha256, version: value.version };
}

function buildRecord(build) {
  return { sha256: build.sha256, byteLength: build.byteLength,
    target: build.abi.target, exports: build.abi.exports, imports: build.abi.imports };
}

async function buildProvenance(facts) {
  const value = {
    schema: 'UfbxWasmProvenance.v1', upstreamRepository: 'ufbx/ufbx',
    upstreamRevision: UFBX_UPSTREAM_REVISION, upstreamTag: 'v0.18.0',
    license: 'MIT alternative', sourceFiles: [...UFBX_SOURCE_FILES],
    sourceSha256: facts.sourceSha256, buildSourceFiles: [...UFBX_BUILD_SOURCE_FILES],
    buildSourceSha256: facts.buildSourceSha256,
    buildScriptPath: 'scripts/fbx/build-ufbx-wasm.sh',
    buildScriptSha256: sha256(await readFile(join(ROOT, 'scripts/fbx/build-ufbx-wasm.sh'))),
    buildCommand: 'CC=clang-18 WASI_SYSROOT=/usr bash scripts/fbx/build-ufbx-wasm.sh',
    target: FBX_WASM_TARGET, compiler: stableTool(facts.compiler),
    linker: stableTool(facts.linker), wasiSysroot: facts.wasiSysroot,
    environment: { LC_ALL: 'C', SOURCE_DATE_EPOCH: '0', TZ: 'UTC' },
    requiredExports: FBX_WASM_REQUIRED_EXPORTS,
    requiredImports: FBX_WASM_REQUIRED_IMPORTS,
    wasmSha256: facts.buildA.sha256, wasmByteLength: facts.buildA.byteLength,
  };
  return acceptUfbxWasmProvenance(value);
}

async function qualify(outputDirectory) {
  const commit = run('git', ['rev-parse', 'HEAD']);
  const sourceSha256 = await calculateUfbxSourceIdentity();
  const buildSourceSha256 = await calculateUfbxBuildSourceIdentity();
  const { compiler, linker } = await compilerIdentities();
  const wasiSysroot = await wasiIdentity();
  const buildA = await cleanBuild(commit, 'A', compiler.path);
  const buildB = await cleanBuild(commit, 'B', compiler.path);
  const byteIdentical = buildA.bytes.equals(buildB.bytes);
  if (!byteIdentical) throw new Error('FBX_WASM_REPRODUCIBILITY_FAILED build bytes differ.');
  const facts = { commit, sourceSha256, buildSourceSha256, compiler, linker,
    wasiSysroot, buildA, buildB };
  const provenance = await buildProvenance(facts);
  const committedPath = join(ROOT, 'third_party/ufbx/fbx_parser.wasm');
  const committed = await readFile(committedPath);
  const evidence = {
    schema: 'UfbxWasmReproducibility.v1', repositoryCommit: commit,
    upstreamRevision: UFBX_UPSTREAM_REVISION, sourceSha256, buildSourceSha256,
    compiler: stableTool(compiler), linker: stableTool(linker), wasiSysroot,
    builds: [buildRecord(buildA), buildRecord(buildB)], byteIdentical,
    workingDirectoryIndependent: buildA.root !== buildB.root,
    committed: { sha256: sha256(committed), byteLength: committed.byteLength,
      matchesBuilds: committed.equals(buildA.bytes) },
  };
  await mkdir(outputDirectory, { recursive: true });
  await cp(buildA.path, join(outputDirectory, 'fbx_parser.wasm'));
  await writeFile(join(outputDirectory, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  await writeFile(join(outputDirectory, 'reproducibility.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ wasmSha256: buildA.sha256,
    wasmByteLength: buildA.byteLength, byteIdentical,
    workingDirectoryIndependent: evidence.workingDirectoryIndependent,
    committedMatches: evidence.committed.matchesBuilds })}\n`);
}

async function main() {
  const output = resolve(process.argv[2] || join(ROOT, '.qualification', 'ufbx-wasm'));
  await qualify(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
