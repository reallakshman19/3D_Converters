import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fbxRoot = join(root, 'tabs/model-converters/converters/fbx');
const auditRoot = join(fbxRoot, 'benchmark-audit');

async function filesAt(path) {
  if ((await stat(path)).isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => filesAt(join(path, entry.name))))).flat();
}

for (const file of await filesAt(fbxRoot)) {
  if (!file.endsWith('.js') || file.startsWith(auditRoot)) continue;
  const text = await readFile(file, 'utf8');
  assert.doesNotMatch(text, /benchmark-audit\//, `${relative(root, file)} imports Agent Q audit code`);
}
for (const file of await filesAt(auditRoot)) {
  if (!file.endsWith('.js')) continue;
  const text = await readFile(file, 'utf8');
  assert.doesNotMatch(text, /from ['"]\.\.\/(?:conversion|staged-writer|mapping-)/, `${relative(root, file)} imports production behavior`);
}

console.log('test-benchmark-audit-boundaries: PASS');
