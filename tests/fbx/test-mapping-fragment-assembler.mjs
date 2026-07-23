import assert from 'node:assert/strict';
import { buildReviewBundle } from '../../tabs/model-converters/converters/fbx/mapping-review-bundle.js';
import { assembleFragments } from '../../tabs/model-converters/converters/fbx/mapping-fragment-assembler.js';
import { worklistFixture } from './worklist-helpers.mjs';
import { calculateFragmentId } from '../../tabs/model-converters/converters/fbx/mapping-decision-fragment.js';

const family = await worklistFixture('family');
const { bundle, shards } = await buildReviewBundle(family.worklist, 2);

// Generate valid fragments from shards
async function createFragment(shard) {
  const fragment = {
    schema: 'FbxMappingDecisionFragment.v1',
    bundleId: shard.bundleId,
    worklistId: shard.worklistId,
    sourceGraphCanonicalSha256: shard.sourceGraphCanonicalSha256,
    shardId: shard.shardId,
    decisions: shard.workItems.map(item => ({
      workItemId: item.workItemId,
      disposition: 'exclude-with-reason',
      reason: 'automated test',
    })),
    fragmentId: '0'.repeat(64),
  };
  fragment.fragmentId = await calculateFragmentId(fragment);
  return fragment;
}

const fragments = await Promise.all(shards.map(createFragment));

// Test 1: Successful assembly
const decisionSet = await assembleFragments(family.worklist, bundle, fragments);
assert.equal(decisionSet.schema, 'FbxMappingDecisionSet.v1');
assert.equal(decisionSet.decisions.length, family.worklist.workItems.length);

// Test 2: Missing fragment
try {
  await assembleFragments(family.worklist, bundle, [fragments[0]]);
  assert.fail('Should block missing shards');
} catch (error) {
  assert.equal(error.status, 'BLOCKED_FRAGMENT_COVERAGE');
}

// Test 3: Duplicate fragments
try {
  await assembleFragments(family.worklist, bundle, [...fragments, fragments[0]]);
  assert.fail('Should block duplicate shards');
} catch (error) {
  assert.equal(error.status, 'BLOCKED_FRAGMENT_CONFLICT');
}

// Test 4: Missing decisions in fragment
const incompleteFragment = structuredClone(fragments[0]);
incompleteFragment.decisions.pop();
incompleteFragment.fragmentId = await calculateFragmentId(incompleteFragment);
try {
  await assembleFragments(family.worklist, bundle, [incompleteFragment, ...fragments.slice(1)]);
  assert.fail('Should block partial fragment coverage');
} catch (error) {
  assert.equal(error.status, 'BLOCKED_FRAGMENT_COVERAGE');
}

console.log('test-mapping-fragment-assembler: PASS');
