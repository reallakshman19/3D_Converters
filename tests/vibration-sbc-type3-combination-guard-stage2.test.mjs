import assert from 'node:assert/strict';
import test from 'node:test';
import { combineSbcType3Terms } from '../converters/vibration/sbc/type3-user-data.js';

function validTerms() {
  return {
    hasMass: true, c: 0.68, d: 0.2, e: 0.7, firstLocation: 1,
    f: 0.6, g: 0.2, mainlineLof: 1, multiplier: 1.42,
  };
}

test('shared Type-3 custody rejects missing numeric terms instead of coercing them to zero', () => {
  for (const missing of ['c', 'd', 'e', 'firstLocation', 'f', 'g', 'mainlineLof', 'multiplier']) {
    for (const invalid of [null, undefined, '']) {
      const terms = { ...validTerms(), [missing]: invalid };
      assert.throws(
        () => combineSbcType3Terms({ scopeId: 'GUARD', terms }),
        new RegExp(`SBC_TYPE3_TERM_INVALID:${missing}`),
      );
    }
  }
});

test('documented no-mass case alone permits C to collapse to zero', () => {
  const terms = { ...validTerms(), hasMass: false, c: null };
  const result = combineSbcType3Terms({ scopeId: 'NO-MASS', terms });
  assert.equal(result.firstSpan.c, 0);
  assert.equal(result.ok, true);
});
