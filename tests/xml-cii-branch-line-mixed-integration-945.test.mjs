import assert from 'node:assert/strict';

import { deriveLineKeyFromBranchName } from '../converters/xml-cii2019-core/regex-line-key.js';
import { resolveBranchLineRowSuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js';
import {
  buildModeASmartMapGroups,
  modeASmartMapGroupForRow,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-smart-map.js';
import { buildModeAProjectDataMatchPlan } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-bulk-preview.js';

const previewConfig = { linelist: {} };
const sourceLineKeys = {
  'SRC-U': ['U2601008'],
  'SRC-V': ['V4810001', 'V4810007'],
  'SRC-B': ['P5920002', 'P5920009'],
};

const cases = [
  {
    kind: 'unique-family',
    sourceId: 'SRC-U',
    fileName: 'fresh-unique.xml',
    branchName: '/NORTH-3000-PL-U2601435-01/B1',
    expectedHint: 'U2601435',
    expectedStatus: 'match',
    expectedKey: 'U2601008',
    expectedMethod: 'line-hint-family',
    expectedMask: 'U2601XXX',
  },
  {
    kind: 'held-out-sibling',
    sourceId: 'SRC-U',
    fileName: 'fresh-sibling.xml',
    branchName: '/NORTH-3000-PL-U2601764-02/B2',
    expectedHint: 'U2601764',
    expectedStatus: 'match',
    expectedKey: 'U2601008',
    expectedMethod: 'line-hint-family',
    expectedMask: 'U2601XXX',
  },
  {
    kind: 'ambiguous-family',
    sourceId: 'SRC-V',
    fileName: 'fresh-ambiguous.xml',
    branchName: '/SOUTH-4200-PL-V4810099-03/B1',
    expectedHint: 'V4810099',
    expectedStatus: 'ambiguous',
    expectedKey: '',
    expectedMethod: 'line-hint-family',
    expectedMask: 'V48100XX',
    expectedCandidates: ['V4810001', 'V4810007'],
  },
  {
    kind: 'cross-designator',
    sourceId: 'SRC-B',
    fileName: 'fresh-blocked.xml',
    branchName: '/WEST-5100-PL-B5920044-04/B3',
    expectedHint: 'B5920044',
    expectedStatus: 'blocked',
    expectedKey: '',
    expectedMethod: 'cross-designator-family',
    expectedMask: '?59200XX',
    expectedCandidates: ['P5920002', 'P5920009'],
    expectedReason: 'DESIGNATOR_CHANGE_NOT_AUTHORIZED',
  },
];

const rows = cases.map((entry) => {
  const lineKey = deriveLineKeyFromBranchName(entry.branchName, previewConfig);
  assert.equal(lineKey, entry.expectedHint, `Preview must derive the declared fresh hint for ${entry.kind}`);
  return {
    sourceId: entry.sourceId,
    fileName: entry.fileName,
    branchName: entry.branchName,
    lineKey,
    lineMiss: true,
  };
});

const canonicalByBranch = new Map();
for (const [index, row] of rows.entries()) {
  const expected = cases[index];
  const decision = resolveBranchLineRowSuggestion(row, sourceLineKeys[row.sourceId]);
  canonicalByBranch.set(row.branchName, decision);

  assert.equal(decision.status, expected.expectedStatus, `${expected.kind} status`);
  assert.equal(decision.key, expected.expectedKey, `${expected.kind} key`);
  assert.equal(decision.method, expected.expectedMethod, `${expected.kind} method`);
  assert.equal(decision.mask, expected.expectedMask, `${expected.kind} mask`);
  if (expected.expectedCandidates) assert.deepEqual(decision.candidates, expected.expectedCandidates);
  if (expected.expectedReason) assert.equal(decision.reason, expected.expectedReason);
}

const counts = [...canonicalByBranch.values()].reduce((acc, decision) => {
  if (decision.status === 'match') acc.mapped += 1;
  else if (decision.status === 'ambiguous') acc.ambiguous += 1;
  else if (decision.status === 'blocked') acc.blocked += 1;
  else acc.unmatched += 1;
  return acc;
}, { mapped: 0, ambiguous: 0, blocked: 0, unmatched: 0 });
counts.unresolved = counts.ambiguous + counts.blocked + counts.unmatched;

assert.deepEqual(counts, {
  mapped: 2,
  ambiguous: 1,
  blocked: 1,
  unmatched: 0,
  unresolved: 2,
});

// Mode A must consume the same canonical result/provenance for the mixed sample.
const groups = buildModeASmartMapGroups(rows, sourceLineKeys);
for (const row of rows) {
  const group = modeASmartMapGroupForRow(groups, row);
  assert.ok(group, `Mode A group missing for ${row.branchName}`);
  const rowIndex = group.rows.findIndex((candidate) => candidate.branchName === row.branchName);
  assert.notEqual(rowIndex, -1);
  const modeADecision = group.branchLineDecisions[rowIndex];
  const canonical = canonicalByBranch.get(row.branchName);
  assert.equal(modeADecision.status, canonical.status);
  assert.equal(modeADecision.key, canonical.key);
  assert.deepEqual(modeADecision.candidates, canonical.candidates);
  assert.equal(modeADecision.method, canonical.method);
  assert.equal(modeADecision.mask, canonical.mask);
  assert.equal(modeADecision.reason || '', canonical.reason || '');
}

// Project matching is the Mode A write proposal surface: only safe matches become changes.
const plan = buildModeAProjectDataMatchPlan(rows, sourceLineKeys, resolveBranchLineRowSuggestion);
assert.equal(plan.changes.length, 2);
assert.deepEqual(
  plan.changes.map((change) => change.branchName).sort(),
  cases.filter((entry) => entry.expectedStatus === 'match').map((entry) => entry.branchName).sort(),
);
assert.equal(plan.ambiguous.length, 1);
assert.equal(plan.blocked.length, 1);
assert.equal(plan.unmatched.length, 0);

assert.deepEqual(plan.ambiguous[0].candidates, ['V4810001', 'V4810007']);
assert.equal(plan.blocked[0].reason, 'DESIGNATOR_CHANGE_NOT_AUTHORIZED');
assert.deepEqual(plan.blocked[0].candidates, ['P5920002', 'P5920009']);

console.log('test-xml-cii-branch-line-mixed-integration-945: PASS', counts);
