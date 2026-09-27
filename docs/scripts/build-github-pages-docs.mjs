import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const tempDir = path.join(repoRoot, '.pages-docs-build-tmp');
const sourceDocsTemp = path.join(tempDir, 'source-docs');
const manifestPath = path.join(docsDir, '.pages-mirror-manifest.json');

const ROOT_EXCLUDES = new Set([
  '.git',
  'node_modules',
  'docs',
  '.pages-docs-build-tmp',
]);

async function pathExists(target) {
  try {
    await readdir(target);
    return true;
  } catch {
    try {
      await readFile(target);
      return true;
    } catch {
      return false;
    }
  }
}

async function readPreviousGeneratedNames() {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    return new Set(parsed.generatedTopLevelEntries || []);
  } catch {
    return new Set();
  }
}

await rm(tempDir, { recursive: true, force: true });
await mkdir(sourceDocsTemp, { recursive: true });

const previousGenerated = await readPreviousGeneratedNames();
const docsEntries = await readdir(docsDir, { withFileTypes: true });

// Preserve hand-maintained docs, not the generated mirror.
const sourceDocNames = docsEntries
  .map(entry => entry.name)
  .filter(name =>
    name !== 'docs' &&
    name !== '.pages-mirror-manifest.json' &&
    !previousGenerated.has(name)
  );

for (const name of sourceDocNames) {
  await cp(
    path.join(docsDir, name),
    path.join(sourceDocsTemp, name),
    { recursive: true, force: true, preserveTimestamps: true }
  );
}

const rootEntries = (await readdir(repoRoot, { withFileTypes: true }))
  .map(entry => entry.name)
  .filter(name => !ROOT_EXCLUDES.has(name))
  .sort();

const collisions = rootEntries.filter(name => sourceDocNames.includes(name));
if (collisions.length) {
  throw new Error(
    'Refusing to overwrite hand-maintained docs that collide with root deployment entries: ' +
    collisions.join(', ')
  );
}

// Remove the previous generated mirror while leaving hand-maintained docs intact.
for (const name of previousGenerated) {
  await rm(path.join(docsDir, name), { recursive: true, force: true });
}
await rm(path.join(docsDir, 'docs'), { recursive: true, force: true });
await rm(manifestPath, { force: true });

// Mirror the repository root into docs/ so Pages-from-/docs has the same URL layout
// as Pages-from-/(root).
for (const name of rootEntries) {
  const source = path.join(repoRoot, name);
  const target = path.join(docsDir, name);
  if (!(await pathExists(source))) continue;
  await cp(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
}

// Runtime code historically fetches "docs/..." URLs. Under a /docs Pages source,
// those URLs map to repository docs/docs/..., so retain a nested copy of source docs.
await mkdir(path.join(docsDir, 'docs'), { recursive: true });
for (const name of sourceDocNames) {
  await cp(
    path.join(sourceDocsTemp, name),
    path.join(docsDir, 'docs', name),
    { recursive: true, force: true, preserveTimestamps: true }
  );
}

const manifest = {
  schema: 'GithubPagesDocsMirror.v1',
  generatedTopLevelEntries: rootEntries,
  nestedDocsSourceEntries: sourceDocNames.sort(),
  source: 'repository root mirrored into docs/ for branch-based GitHub Pages',
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

await rm(tempDir, { recursive: true, force: true });
console.log(`GitHub Pages mirror ready in docs/ (${rootEntries.length} root entries, ${sourceDocNames.length} source-doc entries).`);
