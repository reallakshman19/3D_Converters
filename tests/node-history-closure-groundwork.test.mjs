import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildNodeHistoryClosureCandidate,
  validateNodeHistoryClosureCandidate,
} from '../node-history/closure/node-history-closure-candidate.js';
import {
  evaluateNodeHistoryMode,
} from '../node-history/closure/node-history-mode-decision.js';
import {
  buildNodeHistoryLifecyclePolicy,
  validateNodeHistoryLifecyclePolicy,
} from '../node-history/closure/node-history-lifecycle-policy.js';

const POLICY_URL = new URL(
  '../node-history/closure/policies/default-policy.v1.json',
  import.meta.url,
);
const CANDIDATE_URL = new URL(
  '../node-history/closure/candidates/ASIM-1885/ZONE-1885-NC/closure-candidate.json',
  import.meta.url,
);

test('committed lifecycle policy is deterministic, immutable and fail-safe by default', async () => {
  const expected = readJson(POLICY_URL);
  const rebuilt = await buildNodeHistoryLifecyclePolicy({
    policyVersion: '1.0.0',
    configVersion: 'NODE-HISTORY-LIFECYCLE-2026-07',
  });
  assert.deepEqual(rebuilt, expected);
  assert.deepEqual(await validateNodeHistoryLifecyclePolicy(rebuilt), []);
  assert.equal(rebuilt.defaultMode, 'BOOTSTRAP_REVIEW');
  assert.equal(rebuilt.rollbackMode, 'HISTORY_DRY_RUN');
  assert.equal(rebuilt.modes.HISTORY_DRY_RUN.modeAvailable, true);
  assert.equal(rebuilt.modes.HISTORY_ENFORCED.modeAvailable, false);
  assert.equal(rebuilt.modes.HISTORY_ENFORCED.approvedClosureRequired, true);
  assert.equal(Object.isFrozen(rebuilt.modes.HISTORY_ENFORCED), true);
});

test('real ASIM-1885 evidence is distinguished from simulated evidence', async () => {
  const candidate = readJson(CANDIDATE_URL);
  assert.deepEqual(await validateNodeHistoryClosureCandidate(candidate), []);
  const real = candidate.benchmarks.filter((row) => row.basis === 'REAL_PROJECT');
  const simulated = candidate.benchmarks.filter((row) => row.basis === '[SIMULATED]');
  assert.equal(real.length, 1);
  assert.equal(real[0].benchmarkId, 'REAL-ASIM-1885-REGISTRY-BOOTSTRAP');
  assert.equal(real[0].metrics.canonicalNodeCount, 3926);
  assert.equal(real[0].status, 'PASS');
  assert.equal(simulated.length, 2);
  assert.ok(simulated.every((row) => row.benchmarkId.startsWith('SIMULATED-')));
});

test('unapproved closure candidate permits dry-run observation but never production authority', async () => {
  const lifecyclePolicy = readJson(POLICY_URL);
  const closureCandidate = readJson(CANDIDATE_URL);
  const dryRun = await evaluateNodeHistoryMode({
    requestedMode: 'HISTORY_DRY_RUN',
    lifecyclePolicy,
    closureCandidate,
  });
  assert.equal(dryRun.validation.status, 'PASS');
  assert.equal(dryRun.effectiveMode, 'HISTORY_DRY_RUN');
  assert.equal(dryRun.historyAuthoritative, false);
  assert.equal(dryRun.registryMutationAllowed, false);

  const enforced = await evaluateNodeHistoryMode({
    requestedMode: 'HISTORY_ENFORCED',
    lifecyclePolicy,
    closureCandidate,
  });
  assert.equal(enforced.validation.status, 'BLOCKED');
  assert.equal(enforced.effectiveMode, null);
  assert.equal(enforced.historyAuthoritative, false);
  assert.equal(enforced.productionSelectionAllowed, false);
  assert.ok(enforced.validation.blockers.some((row) => row.code === 'HISTORY_ENFORCEMENT_UNAVAILABLE'));
});

test('altered candidate hash and partial gate sets fail closed', async () => {
  const lifecyclePolicy = readJson(POLICY_URL);
  const altered = readJson(CANDIDATE_URL);
  altered.benchmarks[0].metrics.canonicalNodeCount += 1;
  const alteredDecision = await evaluateNodeHistoryMode({
    requestedMode: 'HISTORY_DRY_RUN',
    lifecyclePolicy,
    closureCandidate: altered,
  });
  assert.equal(alteredDecision.validation.status, 'BLOCKED');
  assert.ok(alteredDecision.validation.blockers.some((row) => row.code === 'CLOSURE_CANDIDATE_INVALID'));

  const stalePolicy = structuredClone(lifecyclePolicy);
  stalePolicy.lifecyclePolicyHash = `sha256:${'0'.repeat(64)}`;
  const staleDecision = await evaluateNodeHistoryMode({
    requestedMode: 'HISTORY_DRY_RUN',
    lifecyclePolicy: stalePolicy,
    closureCandidate: readJson(CANDIDATE_URL),
  });
  assert.equal(staleDecision.validation.status, 'BLOCKED');
  assert.ok(staleDecision.validation.blockers.some((row) => row.code === 'LIFECYCLE_POLICY_SCOPE_MISMATCH'));

  const source = readJson(CANDIDATE_URL);
  source.closureGates.pop();
  await assert.rejects(
    () => buildNodeHistoryClosureCandidate(source),
    /closureGates must contain EG-01 through EG-08/,
  );
});

function readJson(url) {
  return JSON.parse(readFileSync(url, 'utf8'));
}
