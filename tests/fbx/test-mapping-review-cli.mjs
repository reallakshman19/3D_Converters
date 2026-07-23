import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { worklistFixture } from './worklist-helpers.mjs';
import { calculateFragmentId } from '../../tabs/model-converters/converters/fbx/mapping-decision-fragment.js';

const family = await worklistFixture('family');
const testDir = resolve('tests/fbx/fixtures/review-cli-test');

// Always clean up on exit, even on test failure
try {
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });

  const worklistPath = join(testDir, 'worklist.json');
  await writeFile(worklistPath, JSON.stringify(family.worklist));

  const bundleDir = join(testDir, 'bundle');

  // Test 1: Build Bundle CLI
  const buildCmd = spawnSync('node', [
    'scripts/fbx/build-mapping-review-bundle.mjs',
    worklistPath,
    bundleDir,
    '--max-items',
    '2'
  ], { encoding: 'utf8' });
  if (buildCmd.status !== 0) throw new Error(`build CLI failed: ${buildCmd.stderr}`);

  const manifest = JSON.parse(await readFile(join(bundleDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 'FbxMappingReviewBundle.v1');

  // Test 1b: CSV Byte Determinism
  const bundleDir2 = join(testDir, 'bundle2');
  const buildCmd2 = spawnSync('node', [
    'scripts/fbx/build-mapping-review-bundle.mjs',
    worklistPath,
    bundleDir2,
    '--max-items',
    '2'
  ], { encoding: 'utf8' });
  if (buildCmd2.status !== 0) throw new Error(`build CLI failed: ${buildCmd2.stderr}`);

  for (const shardMeta of manifest.shards) {
    const csv1 = await readFile(join(bundleDir, shardMeta.fileName.replace('.json', '.csv')));
    const csv2 = await readFile(join(bundleDir2, shardMeta.fileName.replace('.json', '.csv')));
    assert.equal(Buffer.compare(csv1, csv2), 0, 'CSV output is not byte-deterministic');

    const csvText = csv1.toString('utf8');
    assert.ok(csvText.startsWith('NON_AUTHORITATIVE_REVIEW_VIEW,'), 'CSV missing NON_AUTHORITATIVE_REVIEW_VIEW header');
  }

  // Build decision fragments for the success-path tests
  const fragmentPaths = [];
  for (const shardMeta of manifest.shards) {
    const shard = JSON.parse(await readFile(join(bundleDir, shardMeta.fileName), 'utf8'));
    const fragment = {
      schema: 'FbxMappingDecisionFragment.v1',
      bundleId: shard.bundleId,
      worklistId: shard.worklistId,
      sourceGraphCanonicalSha256: shard.sourceGraphCanonicalSha256,
      shardId: shard.shardId,
      decisions: shard.workItems.map((item) => ({
        workItemId: item.workItemId,
        disposition: 'exclude-with-reason',
        reason: 'cli test',
      })),
      fragmentId: '0'.repeat(64),
    };
    fragment.fragmentId = await calculateFragmentId(fragment);
    const fragPath = join(testDir, `fragment-${shard.ordinal}.json`);
    await writeFile(fragPath, JSON.stringify(fragment));
    fragmentPaths.push(fragPath);
  }

  // Test 2: Assemble Fragments CLI
  const decisionSetPath = join(testDir, 'decision-set.json');
  const assembleCmd = spawnSync('node', [
    'scripts/fbx/assemble-mapping-decision-fragments.mjs',
    worklistPath,
    join(bundleDir, 'manifest.json'),
    ...fragmentPaths,
    '--output',
    decisionSetPath
  ], { encoding: 'utf8' });
  if (assembleCmd.status !== 0) throw new Error(`assemble CLI failed: ${assembleCmd.stderr}`);

  const decisionSet = JSON.parse(await readFile(decisionSetPath, 'utf8'));
  assert.equal(decisionSet.schema, 'FbxMappingDecisionSet.v1');
  assert.equal(decisionSet.decisions.length, family.worklist.workItems.length);

  // Test 3: Failed assembly produces no output file
  // Pass only the first fragment for a multi-shard bundle; assembly must fail.
  const failOutputPath = join(testDir, 'should-not-exist.json');
  const failCmd = spawnSync('node', [
    'scripts/fbx/assemble-mapping-decision-fragments.mjs',
    worklistPath,
    join(bundleDir, 'manifest.json'),
    fragmentPaths[0],
    '--output',
    failOutputPath
  ], { encoding: 'utf8' });
  assert.notEqual(failCmd.status, 0, 'Incomplete assembly must exit non-zero');
  try {
    await access(failOutputPath);
    assert.fail('No output file should exist after failed assembly');
  } catch (e) {
    assert.equal(e.code, 'ENOENT', 'Output file must not exist after failed assembly');
  }

} finally {
  await rm(testDir, { recursive: true, force: true });
}

console.log('test-mapping-review-cli: PASS');
