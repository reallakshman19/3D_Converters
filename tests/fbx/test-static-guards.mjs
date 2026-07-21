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

const prohibited = [
  /\bFBXLoader\b/, /THREE\.FBXLoader/, /Math\.random/, /Date\.now/,
  /nearestNeighbor/i, /raycast.*topology/i, /tolerance.*connect/i,
  /https?:\/\/.*(?:cdn|unpkg|jsdelivr)/i, /export\s+default\b/,
];
for (const sourceRoot of sourceRoots) {
  for (const file of await filesAt(sourceRoot)) {
    if (!file.endsWith('.js')) continue;
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n').length;
    assert.ok(lines <= 300, `${relative(root, file)} has ${lines} lines`);
    for (const pattern of prohibited) assert.doesNotMatch(text, pattern, `${relative(root, file)} violates ${pattern}`);
  }
}
console.log('test-static-guards: PASS');
