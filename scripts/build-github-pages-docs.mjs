import {
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {evaluateClosure,requireComplete} from '../docs/lfj/indexed-runtime-closure.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedOutput = process.env.LFJ_PAGES_OUTPUT_DIR;
if (requestedOutput && !path.isAbsolute(requestedOutput))
  throw new Error('LFJ_PAGES_OUTPUT_DIR must be an absolute disposable directory');
const docsDir = requestedOutput ? path.resolve(requestedOutput) : path.join(repoRoot, 'docs');
if (requestedOutput) {
  // Read the real target to reject symlink aliases of checked-in source/docs.
  const actual = await realpath(docsDir);
  const rel = path.relative(repoRoot, actual);
  if (!rel || (rel !== '..' && !rel.startsWith('..'+path.sep) && !path.isAbsolute(rel)))
    throw new Error('Refusing temporary Pages output inside the source repository');
}
const tempDir = path.join(path.dirname(docsDir), '.pages-docs-build-tmp');
const indexedManifestName = '.lfj-indexed-runtime-overlay-manifest.json';
const indexedManifestPath = path.join(docsDir, indexedManifestName);
const sha256 = b => createHash('sha256').update(b).digest('hex');
const indexedSources = requireComplete(await evaluateClosure({repoRoot,artifact:'root'}))
  .files.filter(x=>x.path.startsWith('lfj/'));
const indexedOverlay = [];
// Validate BEFORE any generator copy/delete, including the one already
// browser-tested V4.1 collision. Unknown divergences fail with no mutation.
for (const entry of indexedSources) {
  const source = await readFile(path.join(repoRoot, entry.path));
  if (sha256(source) !== entry.sha256)
    throw new Error('A2_INDEXED_SOURCE_CHANGED: '+entry.path);
  let previous = null;
  try { previous = await readFile(path.join(docsDir, entry.path)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let sharedException = false;
  if (previous && sha256(previous) !== entry.sha256) {
    const rootText = source.toString('utf8');
    const isShared = entry.path === 'lfj/source/source-snapshot.mjs' &&
      rootText.includes('export class Sha256 {') &&
      previous.toString('utf8') === rootText.replace('export class Sha256 {','class Sha256 {');
    if (!isShared)
      throw new Error('A2_LFJ_OWNERSHIP_COLLISION: '+entry.path);
    sharedException = true;
  }
  indexedOverlay.push({path:entry.path,sha256:entry.sha256,
    ownership:entry.path==='lfj/source/source-snapshot.mjs'?
      'V41_BROWSER_QUALIFIED_ADDITIVE_EXPORT':'A3_INDEXED_SOURCE_MIRROR'});
}
const sourceDocsTemp = path.join(tempDir, 'source-docs');
const manifestPath = path.join(docsDir, '.pages-mirror-manifest.json');

const RUNTIME_ROOT_DIRECTORIES = Object.freeze([
  'assets',
  'canonical',
  'config',
  'contracts',
  'converters',
  'core',
  'data',
  'debug',
  'diagnostics',
  'dist',
  'engineering',
  'interchange',
  'js',
  'opt',
  'overlays',
  'parser',
  'pcf-builder',
  'pcf-legacy',
  'pcfx',
  'rvm',
  'rvm-pcf-extract',
  'rvm-pcf-master-tabs',
  'rvm-pcf-topology',
  'rvm-viewer',
  'schemas',
  'styles',
  'support',
  'tabs',
  'third_party',
  'topology-5b',
  'uxml',
  'validation',
  'validators',
  'vendor',
  'view',
  'viewer3d',
  'xml-compare',
]);

const RUNTIME_ROOT_FILES = Object.freeze([
  'index.html',
  '.nojekyll',
  'site.webmanifest',
  'main-rhbg-fitguard.js',
  'viewer-3d.js',
  'viewer-3d-config.js',
  'viewer-3d-defaults.js',
  'viewer-actions.js',
  'RvmSourceKindPolicy.js',
]);

const RUNTIME_ENTRY_SET = new Set([
  ...RUNTIME_ROOT_DIRECTORIES,
  ...RUNTIME_ROOT_FILES,
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

function isProductionRuntimeFile(sourcePath) {
  const baseName = path.basename(sourcePath);
  if (baseName.startsWith('.git') && baseName !== '.nojekyll') return false;
  if (baseName === '.DS_Store' || baseName === 'Thumbs.db') return false;
  if (/\.bak($|[._])/i.test(baseName)) return false;
  if (/\.before($|[._])/i.test(baseName)) return false;
  return true;
}

await rm(tempDir, { recursive: true, force: true });
await mkdir(sourceDocsTemp, { recursive: true });

const previousGenerated = await readPreviousGeneratedNames();
const docsEntries = await readdir(docsDir, { withFileTypes: true });

// Preserve hand-maintained docs, not the generated mirror or runtime entries.
const sourceDocNames = docsEntries
  .map(entry => entry.name)
  .filter(name =>
    name !== 'docs' &&
    name !== '.pages-mirror-manifest.json' &&
    name !== indexedManifestName &&
    !RUNTIME_ENTRY_SET.has(name) &&
    !previousGenerated.has(name)
  );

for (const name of sourceDocNames) {
  await cp(
    path.join(docsDir, name),
    path.join(sourceDocsTemp, name),
    { recursive: true, force: true, preserveTimestamps: true }
  );
}

const targetEntries = [...RUNTIME_ROOT_FILES, ...RUNTIME_ROOT_DIRECTORIES].sort();
const collisions = targetEntries.filter(name => sourceDocNames.includes(name));
if (collisions.length) {
  throw new Error(
    'Refusing to overwrite hand-maintained docs that collide with root deployment entries: ' +
    collisions.join(', ')
  );
}

// Remove previous generated entries and existing runtime entries while leaving hand-maintained docs intact.
const entriesToRemove = new Set([
  ...previousGenerated,
  ...RUNTIME_ENTRY_SET,
]);
for (const name of entriesToRemove) {
  await rm(path.join(docsDir, name), { recursive: true, force: true });
}
await rm(path.join(docsDir, 'docs'), { recursive: true, force: true });
await rm(manifestPath, { force: true });
await rm(indexedManifestPath, { force: true });

// Copy runtime root files
const copiedRootFiles = [];
for (const name of RUNTIME_ROOT_FILES) {
  const source = path.join(repoRoot, name);
  const target = path.join(docsDir, name);
  if (!(await pathExists(source))) continue;
  await cp(source, target, {
    force: true,
    preserveTimestamps: true,
  });
  copiedRootFiles.push(name);
}

// Ensure .nojekyll is present in docsDir
const docsNoJekyll = path.join(docsDir, '.nojekyll');
if (!(await pathExists(docsNoJekyll))) {
  await writeFile(docsNoJekyll, '', 'utf8');
  if (!copiedRootFiles.includes('.nojekyll')) copiedRootFiles.push('.nojekyll');
}

// Copy runtime root directories with production filter
const copiedRootDirectories = [];
for (const name of RUNTIME_ROOT_DIRECTORIES) {
  const source = path.join(repoRoot, name);
  const target = path.join(docsDir, name);
  if (!(await pathExists(source))) continue;
  await cp(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    filter: (src) => isProductionRuntimeFile(src),
  });
  copiedRootDirectories.push(name);
}


// Narrow A3 LFJ module import/Worker closure, NEVER the whole LFJ directory.
// Existing V4.1 docs/lfj files remain, except the explicitly attested
// additive Sha256 export already replayed in original V4.1 Chromium.
for (const entry of indexedOverlay) {
  const target = path.join(docsDir, entry.path);
  await mkdir(path.dirname(target), {recursive:true});
  await cp(path.join(repoRoot, entry.path), target, {force:true});
}
await writeFile(indexedManifestPath, JSON.stringify({
  schema:'LFJ.A2.IndexedRuntimeOverlayManifest.v1',
  source:'CHECKED_IN_A3_MODULE_CLOSURE_NOT_DEPLOYMENT_ATTESTATION',
  files:indexedOverlay
},null,2)+'\n', 'utf8');

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
  schema: 'GithubPagesDocsRuntimeManifest.v2',
  runtimeRootFiles: copiedRootFiles.sort(),
  runtimeRootDirectories: copiedRootDirectories.sort(),
  generatedTopLevelEntries: [...copiedRootFiles, ...copiedRootDirectories].sort(),
  nestedDocsSourceEntries: sourceDocNames.sort(),
  source: 'strict production runtime manifest mirrored into docs/ for branch-based GitHub Pages',
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

await rm(tempDir, { recursive: true, force: true });
console.log(`GitHub Pages runtime mirror ready in docs/ (${copiedRootFiles.length} root files, ${copiedRootDirectories.length} root directories, ${sourceDocNames.length} source-doc entries).`);
