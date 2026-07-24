import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fbxRoot = join(root, 'tabs/model-converters/converters/fbx');
const converterPath = join(root, 'tabs/model-converters/converters/fbx-to-stagedjson.js');
const sourceRoots = [fbxRoot, converterPath];

async function filesAt(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => filesAt(join(path, entry.name))));
  return nested.flat();
}

function namedFunctionLengths(text) {
  const lines = text.split('\n'), lengths = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (!/\bfunction\s+\w+\s*\(/.test(lines[start])) continue;
    let depth = 0, opened = false;
    for (let end = start; end < lines.length; end += 1) {
      depth += (lines[end].match(/\{/g) || []).length;
      depth -= (lines[end].match(/\}/g) || []).length;
      opened ||= lines[end].includes('{');
      if (opened && depth === 0) { lengths.push({ line: start + 1, length: end - start + 1 }); break; }
    }
  }
  return lengths;
}

const prohibited = [
  /\bFBXLoader\b/, /THREE\.FBXLoader/, /Math\.random/, /Date\.now/,
  /nearestNeighbor/i, /raycast.*topology/i, /tolerance.*connect/i,
  /distance.*(?:connect|topology)/i, /https?:\/\/.*(?:cdn|unpkg|jsdelivr)/i,
  /export\s+default\b/, /(?:displayName|domSourceName|domClass).*\.(?:match|test)\(/i,
  /componentType\s*(?:\|\||\?\?)/,
];
for (const sourceRoot of sourceRoots) {
  for (const file of await filesAt(sourceRoot)) {
    if (!file.endsWith('.js')) continue;
    const text = await readFile(file, 'utf8');
    assert.ok(text.split('\n').length <= 300, `${relative(root, file)} exceeds 300 lines`);
    for (const pattern of prohibited) assert.doesNotMatch(text, pattern, `${relative(root, file)} violates ${pattern}`);
    for (const fn of namedFunctionLengths(text)) {
      assert.ok(fn.length <= 40, `${relative(root, file)} function at line ${fn.line} has ${fn.length} lines`);
    }
  }
}

const runtimeFiles = [
  'worker-protocol.js', 'worker-preflight.js', 'worker-diagnostics.js',
  'parser-client.js', 'parser-worker.js', 'parser-wasm.js',
];
for (const name of runtimeFiles) await readFile(join(fbxRoot, name), 'utf8');

const protocol = await readFile(join(fbxRoot, 'worker-protocol.js'), 'utf8');
for (const stage of [
  'preflight', 'loading-wasm', 'copying-input', 'parsing-fbx',
  'decoding-result', 'enforcing-source-policy', 'preparing-transfer', 'complete',
]) assert.match(protocol, new RegExp(`['"]${stage}['"]`), `worker protocol lacks ${stage}`);
assert.doesNotMatch(protocol, /percent(?:age)?|estimated remaining/i, 'worker protocol invents opaque parse progress');
assert.match(protocol, /assertSourceGraphEnvelope/, 'worker protocol must validate completion graphs');
assert.match(protocol, /assertGraphReferences/, 'worker protocol must validate completion references');

const client = await readFile(join(fbxRoot, 'parser-client.js'), 'utf8');
assert.match(client, /settle\('SETTLED_SUCCESS', message\.graph\)/, 'client must resolve only the graph');
assert.match(client, /worker\.onmessageerror = null/, 'client must release messageerror listener');
assert.match(client, /worker\.terminate\(\)/, 'client must terminate every worker');

const converter = await readFile(converterPath, 'utf8');
assert.doesNotMatch(converter, /onDiagnostics|stageTimingsMs|workerMode|jobId/, 'runtime diagnostics entered converter artifacts');

const parser = await readFile(join(root, 'third_party/ufbx/fbx_parser.c'), 'utf8');
assert.doesNotMatch(parser, /default:\s*return\s+"OTHER"/, 'parser silently collapses element evidence');
for (const type of ['MATERIAL', 'CAMERA', 'LIGHT', 'TEXTURE', 'VIDEO', 'SKIN_DEFORMER', 'ANIM_CURVE']) {
  assert.match(parser, new RegExp(`UFBX_ELEMENT_${type}`), `parser lacks ${type} evidence`);
}
console.log('test-static-guards: PASS');
