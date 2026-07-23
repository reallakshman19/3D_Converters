#!/usr/bin/env node
/**
 * Re-runs closure evidence, validates Draft 2020-12 contracts, and proves that
 * dry-run is observable while HISTORY_ENFORCED remains unavailable.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  evaluateNodeHistoryMode,
} from '../node-history/closure/node-history-mode-decision.js';
import { serializeNodeHistoryArtifact } from '../node-history/closure/node-history-lifecycle-policy.js';
import { collectNodeHistoryClosureArtifacts } from './node-history-closure-evidence.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const POLICY_PATH = resolve(ROOT, 'node-history/closure/policies/default-policy.v1.json');
const CANDIDATE_PATH = resolve(ROOT, 'node-history/closure/candidates/ASIM-1885/ZONE-1885-NC/closure-candidate.json');
const artifacts = await collectNodeHistoryClosureArtifacts({
  root: ROOT,
  policyVersion: '1.0.0',
  configVersion: 'NODE-HISTORY-LIFECYCLE-2026-07',
  baselineRevision: '6b91a9618d3fd03c4f87947b76f44c423816a209',
  evaluatedAt: '2026-07-23T06:00:00Z',
  echoOutput: true,
});

assert.equal(readFileSync(POLICY_PATH, 'utf8'), serializeNodeHistoryArtifact(artifacts.policy));
assert.equal(readFileSync(CANDIDATE_PATH, 'utf8'), serializeNodeHistoryArtifact(artifacts.candidate));
validateDraftSchemas(artifacts);

const dryRun = await evaluateNodeHistoryMode({
  requestedMode: 'HISTORY_DRY_RUN',
  lifecyclePolicy: artifacts.policy,
  closureCandidate: artifacts.candidate,
});
assert.equal(dryRun.validation.status, 'PASS');
assert.equal(dryRun.effectiveMode, 'HISTORY_DRY_RUN');
assert.equal(dryRun.historyAuthoritative, false);

const enforced = await evaluateNodeHistoryMode({
  requestedMode: 'HISTORY_ENFORCED',
  lifecyclePolicy: artifacts.policy,
  closureCandidate: artifacts.candidate,
});
assert.equal(enforced.validation.status, 'BLOCKED');
assert.equal(enforced.effectiveMode, null);
assert.equal(enforced.productionSelectionAllowed, false);
assert.ok(enforced.validation.blockers.some((row) => row.code === 'HISTORY_ENFORCEMENT_NOT_APPROVED'));

process.stdout.write([
  'Node-history closure verification PASS',
  `real registry nodes: ${artifacts.candidate.benchmarks.find((row) => row.basis === 'REAL_PROJECT').metrics.canonicalNodeCount}`,
  `candidate status: ${artifacts.candidate.validation.status}`,
  `enforcement eligible: ${artifacts.candidate.enforcementEligible}`,
  'production authority changed: false',
  '',
].join('\n'));

function validateDraftSchemas(values) {
  const script = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
for case in payload["cases"]:
    Draft202012Validator.check_schema(case["schema"])
    Draft202012Validator(case["schema"], format_checker=Draft202012Validator.FORMAT_CHECKER).validate(case["artifact"])
`;
  const cases = [
    schemaCase('NodeHistoryLifecyclePolicy.v1', values.policy),
    schemaCase('NodeHistoryClosureCandidate.v1', values.candidate),
  ];
  const result = spawnSync('python', ['-c', script], {
    cwd: ROOT,
    input: JSON.stringify({ cases }),
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
}

function schemaCase(name, artifact) {
  return {
    schema: JSON.parse(readFileSync(resolve(ROOT, `node-history/schemas/${name}.schema.json`), 'utf8')),
    artifact,
  };
}
