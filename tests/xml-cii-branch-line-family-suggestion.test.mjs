import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBranchLineKeySuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-panel.js';

test('progressive family mask can suggest a unique loaded line key', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-2"-P4110010-93833-01/B1',
    ['P4110001', 'Q5000001'],
  );
  assert.equal(result.status, 'match');
  assert.equal(result.key, 'P4110001');
  assert.equal(result.method, 'progressive-family-mask');
  assert.equal(result.mask, 'P41100XX');
});

test('progressive family mask refuses to choose when the authoritative keys are ambiguous', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-2"-P4110010-93833-01/B1',
    ['P4110001', 'P4110003'],
  );
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.key, '');
  assert.deepEqual(result.candidates, ['P4110001', 'P4110003']);
  assert.equal(result.mask, 'P41100XX');
});

test('family matching does not silently normalize a different leading designator', () => {
  const result = resolveBranchLineKeySuggestion(
    '/GLRD-1000-2"-B4110004-93833-01/B1',
    ['P4110001'],
  );
  assert.equal(result.status, 'none');
});
