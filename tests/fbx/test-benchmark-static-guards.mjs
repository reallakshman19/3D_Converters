import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../tabs/model-converters/converters/fbx', import.meta.url));
const benchmarkRoot = join(root, 'benchmark');
async function filesAt(path) {
  if ((await stat(path)).isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => filesAt(join(path, entry.name))))).flat();
}
const benchmarkFiles = (await filesAt(benchmarkRoot)).filter((file) => file.endsWith('.js'));
const productionFiles = (await filesAt(root)).filter((file) => file.endsWith('.js') && !file.startsWith(benchmarkRoot));
for (const file of productionFiles) {
  assert.doesNotMatch(await readFile(file, 'utf8'), /from ['"][^'"]*benchmark\//,
    `${file} imports qualification-only benchmark code`);
}
for (const file of benchmarkFiles) {
  const text = await readFile(file, 'utf8');
  assert.doesNotMatch(text, /Date\.now|Math\.random|performance\.|process\.env|navigator\./,
    `${file} contains runtime-dependent evidence state`);
  assert.doesNotMatch(text, /coordinate.*(?:zone|membership)|distance.*(?:match|identity)/i,
    `${file} contains prohibited engineering inference`);
}
console.log('test-benchmark-static-guards: PASS');
