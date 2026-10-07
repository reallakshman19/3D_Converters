import assert from 'node:assert/strict';

import { resolveBranchLineKeySuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js';

function assertFamilyTransfer({
  knownBranch,
  knownHint,
  heldOutBranch,
  heldOutHint,
  negativeBranch,
  negativeHint,
  loadedKeys,
  expectedKey,
  expectedMask,
}) {
  const known = resolveBranchLineKeySuggestion(knownBranch, loadedKeys, { lineHint: knownHint });
  assert.equal(known.status, 'match');
  assert.equal(known.key, expectedKey);
  assert.equal(known.mask, expectedMask);
  assert.equal(loadedKeys.includes(known.key), true);

  const heldOut = resolveBranchLineKeySuggestion(heldOutBranch, loadedKeys, { lineHint: heldOutHint });
  assert.equal(heldOut.status, 'match');
  assert.equal(heldOut.key, expectedKey);
  assert.equal(heldOut.mask, expectedMask,
    'held-out sibling must resolve through the same structural family mask as the known sibling');
  assert.equal(loadedKeys.includes(heldOut.key), true);

  const negative = resolveBranchLineKeySuggestion(negativeBranch, loadedKeys, { lineHint: negativeHint });
  assert.notEqual(negative.status, 'match',
    'structurally different held-out branch must not inherit the recognized family');
  assert.equal(negative.key, '');
}

assertFamilyTransfer({
  knownBranch: '/ASIM-1885-PL-3"-S8810389-91261M7-01/B2',
  knownHint: 'S8810389',
  heldOutBranch: '/ASIM-1885-PL-4"-S8810472-91261M7-02/B3',
  heldOutHint: 'S8810472',
  negativeBranch: '/ASIM-1885-PL-4"-S8820472-91261M7-02/B3',
  negativeHint: 'S8820472',
  loadedKeys: ['S8810009'],
  expectedKey: 'S8810009',
  expectedMask: 'S8810XXX',
});

assertFamilyTransfer({
  knownBranch: '/GLRD-1000-6"-P4110010-93833-01/B1',
  knownHint: 'P4110010',
  heldOutBranch: '/GLRD-1000-8"-P4110099-93833-02/B2',
  heldOutHint: 'P4110099',
  negativeBranch: '/GLRD-1000-8"-P4120099-93833-02/B2',
  negativeHint: 'P4120099',
  loadedKeys: ['P4110001'],
  expectedKey: 'P4110001',
  expectedMask: 'P41100XX',
});

console.log('test-xml-cii-branch-line-heldout-generalization-943: PASS');
