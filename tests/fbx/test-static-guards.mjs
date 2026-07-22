import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoots = [
  join(root, 'tabs/model-converters/converters/fbx'),
  join(root, 'tabs/model-converters/converters/fbx-to-stagedjson.js'),
];

async function filesAt(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => filesAt(join(path, entry.name))));
  return nested.flat();
}

function namedFunctionLengths(text) {
  const lines = text.split('\n');
  const lengths = [];
  for (let start = 0; start < lines.length; start++) {
    if (!/\bfunction\s+\w+\s*\(/.test(lines[start])) continue;
    let depth = 0, opened = false;
    for (let end = start; end < lines.length; end++) {
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
  /export\s+default\b/, /(?:displayName|domSourceName).*\.(?:match|test)\(/i,
];
for (const sourceRoot of sourceRoots) {
  for (const file of await filesAt(sourceRoot)) {
    if (!file.endsWith('.js')) continue;
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n').length;
    assert.ok(lines <= 300, `${relative(root, file)} has ${lines} lines`);
    for (const pattern of prohibited) assert.doesNotMatch(text, pattern, `${relative(root, file)} violates ${pattern}`);
    for (const fn of namedFunctionLengths(text)) {
      assert.ok(fn.length <= 40, `${relative(root, file)} function at line ${fn.line} has ${fn.length} lines`);
    }
  }
}
const parser = await readFile(join(root, 'third_party/ufbx/fbx_parser.c'), 'utf8');
assert.doesNotMatch(parser, /default:\s*return\s+"OTHER"/, 'parser silently collapses element evidence');
for (const type of ['MATERIAL', 'CAMERA', 'LIGHT', 'TEXTURE', 'VIDEO', 'SKIN_DEFORMER', 'ANIM_CURVE']) {
  assert.match(parser, new RegExp(`UFBX_ELEMENT_${type}`), `parser lacks ${type} evidence`);
}
console.log('test-static-guards: PASS');
