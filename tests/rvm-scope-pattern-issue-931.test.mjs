import test from 'node:test';
import assert from 'node:assert/strict';

import * as scopePattern from '../converters/rvm-scope-pattern.js';

const branch = {
  name: '/ASIM-1837-XX-YY--PL/B2',
  type: 'BRANCH',
  attributes: {
    OWNER_SITE: '/SITE-A',
    OWNER: '/SITE-A/ZONE-12/PIPE-7',
    PIPE: '/PIPE-7',
  },
};

test('matching outer quotes are removed from each user scope token', () => {
  assert.deepEqual(scopePattern.splitScopeTokens('"183*-*--PL"'), ['183*-*--PL']);
  assert.deepEqual(scopePattern.splitScopeTokens("'SITE-A'; S8810009"), ['SITE-A', 'S8810009']);
});

test('glob tokens match inside an atomic field instead of requiring the whole field', () => {
  assert.equal(scopePattern.matchesScopeText('/ASIM-1837-XX-YY--PL/B2', '183*-*--PL'), true);
  assert.equal(scopePattern.matchesScopeText('/ASIM-1885-PL-3"-S8810009-91261M7-01/B2', '1885*91261M7'), true);
});

test('regex metacharacters other than star remain literal user text', () => {
  assert.equal(scopePattern.matchesScopeText('/A/183.X-ABC--PL', '183.X*--PL'), true);
  assert.equal(scopePattern.matchesScopeText('/A/1830X-ABC--PL', '183.X*--PL'), false);
});

test('atomic field matching does not allow one glob to bridge unrelated fields', () => {
  assert.equal(typeof scopePattern.matchesScopeFields, 'function');
  assert.equal(scopePattern.matchesScopeFields(['183-AAA', 'BBB--PL'], '183*--PL'), false);
  assert.equal(scopePattern.matchesScopeFields(['prefix 183-AAA-BBB--PL suffix'], '183*--PL'), true);
});

test('RVM object matching uses branch and hierarchy fields consistently', () => {
  assert.equal(typeof scopePattern.matchesRvmScope, 'function');
  assert.equal(scopePattern.matchesRvmScope(branch, '"183*-*--PL"'), true);
  assert.equal(scopePattern.matchesRvmScope(branch, 'ZONE-12'), true);
  assert.equal(scopePattern.matchesRvmScope(branch, 'NO-SUCH-SCOPE'), false);
});
