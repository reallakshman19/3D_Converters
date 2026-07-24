import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { calculateWorklistId } from '../../tabs/model-converters/converters/fbx/mapping-worklist.js';
import { buildReviewBundle } from '../../tabs/model-converters/converters/fbx/mapping-review-bundle.js';
import { calculateFragmentId } from '../../tabs/model-converters/converters/fbx/mapping-decision-fragment.js';
import { buildBoundedReviewBundle } from '../../tabs/model-converters/converters/fbx/review-execution/bounded-bundle.js';
import { assembleBoundedFragments } from '../../tabs/model-converters/converters/fbx/review-execution/bounded-assembly.js';
import { worklistFixture } from './worklist-helpers.mjs';

async function assertAbsent(path) {
  await assert.rejects(access(path), (error) => error.code === 'ENOENT');
}

async function assertNoWorkspace(parent, target) {
  const prefix = `.${basename(target)}.f2s007-`;
  assert.equal((await readdir(parent)).filter((name) => name.startsWith(prefix)).length, 0);
}

async function expectBundleFailure(root, worklist, name, expected) {
  const input = join(root, `${name}.json`);
  const output = join(root, `${name}-bundle`);
  await writeFile(input, canonicalJson(worklist));
  await assert.rejects(
    buildBoundedReviewBundle({
      worklistPath: input, outputDir: output, maxItemsPerShard: 1,
      sortRunItems: 1, inputChunkBytes: 3,
    }),
    expected,
  );
  await assertAbsent(output);
  await assertNoWorkspace(root, output);
}

async function expectRawBundleFailure(root, name, bytes, expected) {
  const input = join(root, `${name}.json`);
  const output = join(root, `${name}-bundle`);
  await writeFile(input, bytes);
  await assert.rejects(buildBoundedReviewBundle({
    worklistPath: input, outputDir: output,
    maxItemsPerShard: 1, sortRunItems: 1, inputChunkBytes: 1,
  }), expected);
  await assertAbsent(output);
  await assertNoWorkspace(root, output);
}

async function sourceFiles(path) {
  const { stat } = await import('node:fs/promises');
  if ((await stat(path)).isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => sourceFiles(join(path, entry.name))))).flat();
}

function namedFunctionLengths(text) {
  const lines = text.split('\n');
  const lengths = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (!/\bfunction\s+\w+\s*\(/.test(lines[start])) continue;
    let depth = 0;
    let opened = false;
    for (let end = start; end < lines.length; end += 1) {
      depth += (lines[end].match(/\{/g) || []).length;
      depth -= (lines[end].match(/\}/g) || []).length;
      opened ||= lines[end].includes('{');
      if (opened && depth === 0) {
        lengths.push({ line: start + 1, length: end - start + 1 });
        break;
      }
    }
  }
  return lengths;
}

async function assertStaticGuards() {
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
  const sourceRoot = join(repositoryRoot, 'tabs/model-converters/converters/fbx/review-execution');
  const prohibited = [
    /localeCompare/, /Intl\.Collator/, /Math\.random/, /Date\.now/,
    /randomUUID/, /\.normalize\(/, /export\s+default\b/, /https?:\/\//,
  ];
  for (const path of await sourceFiles(sourceRoot)) {
    if (!path.endsWith('.js')) continue;
    const text = await readFile(path, 'utf8');
    assert.ok(text.split('\n').length <= 300, `${relative(repositoryRoot, path)} exceeds 300 lines`);
    for (const pattern of prohibited) assert.doesNotMatch(text, pattern);
    for (const fn of namedFunctionLengths(text)) assert.ok(fn.length <= 40, `${path}:${fn.line} exceeds 40 lines`);
  }
}

function exclusionFragment(bundle, shard) {
  return {
    schema: 'FbxMappingDecisionFragment.v1',
    bundleId: bundle.bundleId,
    worklistId: shard.worklistId,
    sourceGraphCanonicalSha256: shard.sourceGraphCanonicalSha256,
    shardId: shard.shardId,
    fragmentId: '0'.repeat(64),
    decisions: shard.workItems.map((item) => ({
      workItemId: item.workItemId,
      disposition: 'exclude-with-reason',
      reason: 'failure proof',
    })),
  };
}

const root = await mkdtemp(join(tmpdir(), 'f2s007-failures-'));
try {
  const family = await worklistFixture('family');
  const duplicate = structuredClone(family.worklist);
  duplicate.workItems.push(structuredClone(duplicate.workItems[0]));
  duplicate.worklistId = '0'.repeat(64);
  duplicate.worklistId = await calculateWorklistId(duplicate);
  await expectBundleFailure(root, duplicate, 'duplicate', /contains duplicates/);

  const stale = structuredClone(family.worklist);
  stale.worklistId = '0'.repeat(64);
  await expectBundleFailure(root, stale, 'stale', /worklistId is stale or tampered/);

  const canonical = canonicalJson(family.worklist);
  await expectRawBundleFailure(root, 'malformed', Buffer.from(canonical).subarray(0, Buffer.byteLength(canonical) - 2), /Malformed JSON/);
  await expectRawBundleFailure(root, 'non-json-whitespace', canonical.replace('{\n', '{\u00a0'), /Malformed JSON/);

  const worklistPath = join(root, 'assembly-worklist.json');
  await writeFile(worklistPath, canonicalJson(family.worklist));
  const reference = await buildReviewBundle(family.worklist, 1);
  const bundlePath = join(root, 'assembly-bundle.json');
  await writeFile(bundlePath, canonicalJson(reference.bundle));
  const fragment = exclusionFragment(reference.bundle, reference.shards[0]);
  fragment.fragmentId = await calculateFragmentId(fragment);
  const fragmentPath = join(root, 'fragment.json');
  await writeFile(fragmentPath, canonicalJson(fragment));
  const outputPath = join(root, 'missing-fragments.json');
  await assert.rejects(assembleBoundedFragments({
    worklistPath, bundlePath, fragmentPaths: [fragmentPath], outputPath,
    sortRunItems: 1, inputChunkBytes: 2,
  }), /Not all shards/);
  await assertAbsent(outputPath);
  await assertNoWorkspace(root, outputPath);
  assert.ok((await readFile(worklistPath)).length > 0);
  await assertStaticGuards();
} finally {
  await rm(root, { recursive: true, force: true });
}
console.log('test-review-scale-failures: PASS');
