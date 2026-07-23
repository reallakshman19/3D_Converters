import { canonicalDigest } from './mapping-package.js';
import { failFragment, validateFragmentShape } from './mapping-review-contract.js';
import { deepFreeze } from './canonical-json.js';

function fragmentPayload(fragment) {
  return {
    schema: fragment.schema,
    bundleId: fragment.bundleId,
    worklistId: fragment.worklistId,
    sourceGraphCanonicalSha256: fragment.sourceGraphCanonicalSha256,
    shardId: fragment.shardId,
    decisions: fragment.decisions,
  };
}

export async function calculateFragmentId(fragment) {
  return canonicalDigest(fragmentPayload(fragment));
}

export async function parseDecisionFragment(fragment) {
  const safeFragment = validateFragmentShape(fragment);
  const observedId = await calculateFragmentId(safeFragment);
  if (observedId !== safeFragment.fragmentId) {
    failFragment('BLOCKED_FRAGMENT_CONTRACT', 'fragmentId is stale or tampered.');
  }

  // decisions must be ordered by workItemId deterministically?
  // Let's verify decisions are unique per workItemId.
  const seenWorkItemIds = new Set();
  let lastId = '';
  for (const decision of safeFragment.decisions) {
    if (decision.workItemId < lastId) {
      failFragment('BLOCKED_FRAGMENT_CONTRACT', 'decisions must be strictly ordered by workItemId.');
    }
    if (seenWorkItemIds.has(decision.workItemId)) {
      failFragment('BLOCKED_FRAGMENT_CONTRACT', 'Duplicate workItemId found in decisions.');
    }
    seenWorkItemIds.add(decision.workItemId);
    lastId = decision.workItemId;
  }

  return deepFreeze(safeFragment);
}
