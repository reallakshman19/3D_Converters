import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveBranchLineKeySuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js';

const branch = '/AREA-S8810389-A1234500/B1';
const loadedKeys = ['S8810009', 'A1234501', 'A1234502'];

// Raw branch evidence is intentionally not unique: the unrelated A-token family
// becomes ambiguous before the S-family reaches a unique generalized mask.
const branchOnly = resolveBranchLineKeySuggestion(branch, loadedKeys);
assert.equal(branchOnly.status, 'ambiguous');

// BL1: upstream structural extraction has already identified the Line Key token.
// That evidence plus the loaded Line List leaves one authoritative family key.
const withLineHint = resolveBranchLineKeySuggestion(branch, loadedKeys, {
  lineHint: 'S8810389',
});
assert.equal(withLineHint.status, 'match');
assert.equal(withLineHint.key, 'S8810009');
assert.equal(withLineHint.method, 'line-hint-family');
assert.equal(withLineHint.mask, 'S8810XXX');
assert.equal(loadedKeys.includes(withLineHint.key), true);

// Exact loaded hint is stronger than family inference.
const exactHint = resolveBranchLineKeySuggestion('/AREA-A1234500/B1', loadedKeys, {
  lineHint: 'S8810009',
});
assert.deepEqual(exactHint, {
  status: 'match',
  key: 'S8810009',
  candidates: ['S8810009'],
  method: 'line-hint-exact',
  hint: 'S8810009',
});

// Existing branch-exact authority must remain higher than a competing hint.
const exactBranch = resolveBranchLineKeySuggestion(
  '/AREA-S8810381-A1234500/B1',
  ['S8810381', 'S8810009'],
  { lineHint: 'S8810009' },
);
assert.deepEqual(exactBranch, {
  status: 'match',
  key: 'S8810381',
  candidates: ['S8810381'],
});

// Bulk Mapping must preserve the upstream hint even for an unresolved row.
const panelSource = await readFile(
  new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-panel.js', import.meta.url),
  'utf8',
);
const actionsSource = await readFile(
  new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js', import.meta.url),
  'utf8',
);
assert.match(panelSource, /data-line-hint=/);
assert.match(actionsSource, /lineHint/);
assert.match(actionsSource, /resolveBranchLineKeySuggestion\([^\n]+\{\s*lineHint/s);

console.log('test-xml-cii-branch-line-unique-family-941: PASS');
