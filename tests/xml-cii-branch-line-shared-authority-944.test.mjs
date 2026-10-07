import assert from 'node:assert/strict';

import {
  resolveBranchLineKeySuggestion,
  resolveBranchLineRowSuggestion,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js';
import { buildModeASmartMapGroups } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-smart-map.js';
import { buildModeAProjectDataMatchPlan } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-bulk-preview.js';
import { deriveLineKeyFromBranchName } from '../converters/xml-cii2019-core/regex-line-key.js';

const keys = ['S8810009', 'A1234501', 'A1234502'];
const row = {
  sourceId: 'SRC-1',
  fileName: 'fresh.xml',
  branchName: '/AREA-S8810389-A1234500/B1',
  lineKey: 'S8810389',
  lineMiss: true,
};

const branchOnly = resolveBranchLineKeySuggestion(row.branchName, keys);
assert.equal(branchOnly.status, 'ambiguous',
  'control: branch-only evidence is intentionally ambiguous');

assert.equal(typeof resolveBranchLineRowSuggestion, 'function',
  'L4 requires one row-level decision authority');

if (typeof resolveBranchLineRowSuggestion === 'function') {
  const canonical = resolveBranchLineRowSuggestion(row, keys);
  assert.equal(canonical.status, 'match');
  assert.equal(canonical.key, 'S8810009');
  assert.equal(canonical.method, 'line-hint-family');
  assert.equal(canonical.mask, 'S8810XXX');

  const groups = buildModeASmartMapGroups([row], { 'SRC-1': keys });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].status, 'exact');
  assert.equal(groups[0].recommended, canonical.key);
  assert.deepEqual(groups[0].exactCandidates, [canonical.key]);

  const plan = buildModeAProjectDataMatchPlan(
    [row],
    { 'SRC-1': keys },
    resolveBranchLineRowSuggestion,
  );
  assert.deepEqual(plan.changes, [{
    sourceId: 'SRC-1',
    fileName: 'fresh.xml',
    branchName: row.branchName,
    lineKey: canonical.key,
  }]);
  assert.deepEqual(plan.ambiguous, []);
  assert.deepEqual(plan.unmatched, []);
}

// Persisted manual branch mapping remains higher authority than regex/token inference.
const manualBranch = '/AREA-S8810389-A1234500/B1';
const manualConfig = {
  linelist: {
    branchLineKeyMap: { [manualBranch]: 'S8810009' },
    branchNameRegex: '(A1234500)',
    lineNoGroup: 1,
    tokenDelimiter: '-',
    lineKeyTokenPositions: '2',
  },
};
assert.equal(
  deriveLineKeyFromBranchName(manualBranch, manualConfig),
  'S8810009',
  'persisted branchLineKeyMap must outrank regex and token fallback',
);
assert.equal(
  resolveBranchLineRowSuggestion({ ...row, lineKey: 'S8810009' }, keys).key,
  'S8810009',
  'surfaces must preserve the Preview-derived persisted mapping as exact loaded authority',
);

// Cross-surface safety provenance must not collapse.
const ambiguousRow = {
  sourceId: 'SRC-1', fileName: 'ambiguous.xml',
  branchName: '/AREA-P4110099/B1', lineKey: 'P4110099', lineMiss: true,
};
const blockedRow = {
  sourceId: 'SRC-1', fileName: 'blocked.xml',
  branchName: '/AREA-B4110004/B1', lineKey: 'B4110004', lineMiss: true,
};
if (typeof resolveBranchLineRowSuggestion === 'function') {
  const ambiguous = resolveBranchLineRowSuggestion(ambiguousRow, ['P4110001', 'P4110003']);
  assert.equal(ambiguous.status, 'ambiguous');
  assert.deepEqual(ambiguous.candidates, ['P4110001', 'P4110003']);

  const blocked = resolveBranchLineRowSuggestion(blockedRow, ['P4110001', 'P4110003']);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reason, 'DESIGNATOR_CHANGE_NOT_AUTHORIZED');
  assert.deepEqual(blocked.candidates, ['P4110001', 'P4110003']);

  const safetyPlan = buildModeAProjectDataMatchPlan(
    [ambiguousRow, blockedRow],
    { 'SRC-1': ['P4110001', 'P4110003'] },
    resolveBranchLineRowSuggestion,
  );
  assert.equal(safetyPlan.changes.length, 0);
  assert.equal(safetyPlan.ambiguous.length, 1);
  assert.deepEqual(safetyPlan.ambiguous[0].candidates, ambiguous.candidates);
  assert.equal(safetyPlan.ambiguous[0].method, ambiguous.method);
  assert.equal(safetyPlan.ambiguous[0].mask, ambiguous.mask);
  assert.equal(safetyPlan.blocked.length, 1);
  assert.deepEqual(safetyPlan.blocked[0].candidates, blocked.candidates);
  assert.equal(safetyPlan.blocked[0].method, blocked.method);
  assert.equal(safetyPlan.blocked[0].reason, blocked.reason);
  assert.equal(safetyPlan.blocked[0].mask, blocked.mask);
}

console.log('test-xml-cii-branch-line-shared-authority-944: PASS');
