import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
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

  const malformedPath = join(root, 'malformed.json');
  const malformedOutput = join(root, 'malformed-bundle');
  const bytes = Buffer.from(canonicalJson(family.worklist));
  await writeFile(malformedPath, bytes.subarray(0, bytes.length - 2));
  await assert.rejects(buildBoundedReviewBundle({
    worklistPath: malformedPath, outputDir: malformedOutput,
    maxItemsPerShard: 1, sortRunItems: 1, inputChunkBytes: 1,
  }), /Malformed JSON/);
  await assertAbsent(malformedOutput);
  await assertNoWorkspace(root, malformedOutput);

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
} finally {
  await rm(root, { recursive: true, force: true });
}
console.log('test-review-scale-failures: PASS');
