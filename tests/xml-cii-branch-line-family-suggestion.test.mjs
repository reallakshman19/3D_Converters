import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBranchLineKeySuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-panel.js';

test('exact boundary-safe key remains highest authority', () => {
  const result = resolveBranchLineKeySuggestion('/AREA-10-S8810105-01/B1', ['S88101', 'S8810105']);
  assert.deepEqual(result, { status: 'match', key: 'S8810105', candidates: ['S8810105'] });
});

test('progressive family mask maps only when one loaded key survives', () => {
  const result = resolveBranchLineKeySuggestion('/GLRD-1000-6"-P4110010-93833-01/B1', ['P4110001']);
  assert.equal(result.status, 'match');
  assert.equal(result.key, 'P4110001');
  assert.deepEqual(result.candidates, ['P4110001']);
  assert.equal(result.method, 'progressive-family-mask');
  assert.equal(result.mask, 'P41100XX');
  assert.equal(result.wildcardCount, 2);
});

test('progressive family mask blocks ambiguous loaded keys', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-6"-P4110010-93833-01/B1',
    ['P4110001', 'P4110003'],
  );
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.key, '');
  assert.deepEqual(result.candidates, ['P4110001', 'P4110003']);
  assert.equal(result.mask, 'P41100XX');
});

test('family resolver never rewrites a B designator into a P family', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-6"-B4110004-93833-01/B1',
    ['P4110001', 'P4110003'],
  );
  assert.deepEqual(result, { status: 'none', key: '', candidates: [] });
});

test('exact loaded token wins even when neighboring family keys exist', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-6"-P4110010-93833-01/B1',
    ['P4110010', 'P4110001', 'P4110003'],
  );
  assert.deepEqual(result, { status: 'match', key: 'P4110010', candidates: ['P4110010'] });
});
