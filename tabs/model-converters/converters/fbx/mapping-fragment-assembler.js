import { failAssembler, validateBundleShape } from './mapping-review-contract.js';
import { parseDecisionFragment } from './mapping-decision-fragment.js';
import { validateMappingWorklistShape } from './mapping-worklist-contract.js';
import { createDecisionSet } from './mapping-decision-compiler.js';

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function calculateExpectedShards(worklist, bundle) {
  const { maxItemsPerShard, shardCount } = bundle.partitionPolicy;
  const items = [...worklist.workItems].sort((a, b) => compareText(a.workItemId, b.workItemId));
  
  const actualShardCount = Math.ceil(items.length / maxItemsPerShard);
  if (shardCount !== actualShardCount) failAssembler('BLOCKED_ASSEMBLER_BINDING', 'partitionPolicy shardCount does not cover the worklist exactly.');
  if (bundle.shards.length !== actualShardCount) failAssembler('BLOCKED_ASSEMBLER_BINDING', 'bundle.shards length does not match required shard count.');
  
  const expectedShards = new Map();
  for (let i = 0; i < shardCount; i++) {
    const chunk = items.slice(i * maxItemsPerShard, (i + 1) * maxItemsPerShard);
    const expectedItemIds = new Set(chunk.map((w) => w.workItemId));
    const shardMeta = bundle.shards[i];
    if (!shardMeta) failAssembler('BLOCKED_ASSEMBLER_BINDING', `Missing shard metadata at ordinal ${i}.`);
    expectedShards.set(shardMeta.shardId, expectedItemIds);
  }
  return expectedShards;
}

function validateFragmentBinding(fragment, bundle, expectedShards, providedFragments) {
  if (fragment.bundleId !== bundle.bundleId) failAssembler('BLOCKED_FRAGMENT_BINDING', 'Fragment bundleId mismatch.');
  if (fragment.worklistId !== bundle.worklistId) failAssembler('BLOCKED_FRAGMENT_BINDING', 'Fragment worklistId mismatch.');
  if (fragment.sourceGraphCanonicalSha256 !== bundle.sourceGraphCanonicalSha256) {
    failAssembler('BLOCKED_FRAGMENT_BINDING', 'Fragment sourceGraph hash mismatch.');
  }
  if (providedFragments.has(fragment.shardId)) {
    failAssembler('BLOCKED_FRAGMENT_CONFLICT', `Multiple fragments provided for shard ${fragment.shardId}.`);
  }
  if (!expectedShards.has(fragment.shardId)) {
    failAssembler('BLOCKED_FRAGMENT_BINDING', `Fragment references unknown shardId ${fragment.shardId}.`);
  }
}

async function collectFragments(fragments, bundle, expectedShards) {
  const providedFragments = new Map();
  for (const raw of fragments) {
    const safeFragment = await parseDecisionFragment(raw);
    validateFragmentBinding(safeFragment, bundle, expectedShards, providedFragments);
    providedFragments.set(safeFragment.shardId, safeFragment);
  }
  if (providedFragments.size !== expectedShards.size) {
    failAssembler('BLOCKED_FRAGMENT_COVERAGE', 'Not all shards have a corresponding decision fragment.');
  }
  return providedFragments;
}

function extractDecisions(expectedShards, providedFragments, worklist) {
  const allDecisions = [];
  const workItemsById = new Map(worklist.workItems.map((w) => [w.workItemId, w]));
  for (const [shardId, expectedItemIds] of expectedShards.entries()) {
    const fragment = providedFragments.get(shardId);
    if (fragment.decisions.length !== expectedItemIds.size) {
      failAssembler('BLOCKED_FRAGMENT_COVERAGE', `Fragment ${shardId} missing decisions.`);
    }
    for (const decision of fragment.decisions) {
      if (!expectedItemIds.has(decision.workItemId)) {
        failAssembler('BLOCKED_FRAGMENT_COVERAGE', `Fragment ${shardId} has unexpected item ${decision.workItemId}.`);
      }
      if (decision.disposition === 'promote') {
        const item = workItemsById.get(decision.workItemId);
        const entry = decision.mappingEntry;
        if (entry.sourceModelObjectId !== item.sourceModelObjectId) failAssembler('BLOCKED_ASSEMBLER_IDENTITY_TAMPERING', 'sourceModelObjectId tampered.');
        if (entry.sourceOccurrenceId !== item.sourceOccurrenceId) failAssembler('BLOCKED_ASSEMBLER_IDENTITY_TAMPERING', 'sourceOccurrenceId tampered.');
        
        const expectedGeometry = item.geometryEvidence.map((g) => g.geometryObjectId).sort().join('\0');
        const actualGeometry = [...entry.sourceGeometryObjectIds].sort().join('\0');
        if (expectedGeometry !== actualGeometry) failAssembler('BLOCKED_ASSEMBLER_IDENTITY_TAMPERING', 'sourceGeometryObjectIds tampered.');
      }
      allDecisions.push(decision);
    }
  }
  return allDecisions;
}

export async function assembleFragments(worklist, bundle, fragments) {
  const safeWorklist = validateMappingWorklistShape(worklist);
  const safeBundle = validateBundleShape(bundle);

  if (safeBundle.worklistId !== safeWorklist.worklistId) {
    failAssembler('BLOCKED_ASSEMBLER_BINDING', 'Bundle worklistId does not match the provided worklist.');
  }
  
  const { calculateBundleId } = await import('./mapping-review-bundle.js');
  const expectedBundleId = await calculateBundleId(safeBundle);
  if (expectedBundleId !== safeBundle.bundleId) {
    failAssembler('BLOCKED_ASSEMBLER_BINDING', 'Bundle ID is stale or tampered.');
  }

  const expectedShards = calculateExpectedShards(safeWorklist, safeBundle);
  const providedFragments = await collectFragments(fragments, safeBundle, expectedShards);
  const allDecisions = extractDecisions(expectedShards, providedFragments, safeWorklist);
  
  allDecisions.sort((a, b) => compareText(a.workItemId, b.workItemId));
  return createDecisionSet({ worklist: safeWorklist, decisions: allDecisions });
}
