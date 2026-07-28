import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveStandaloneWeightReviewRating,
  standaloneWeightReviewRatingInfo,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-rating-authority.js';

test('manual rating keeps precedence and shared resolver flags DTXR conflict', () => {
  const result = resolveStandaloneWeightReviewRating({
    key: 'R1',
    rating: '150',
    dtxr: 'VALVE CLASS 900',
  }, {
    overrides: { rating: { R1: 'CL 300' } },
  });

  assert.equal(result.rating, '300');
  assert.equal(result.resolvedSource, 'override');
  assert.equal(result.dtxrRating, '900');
  assert.equal(result.conflict, true);
  assert.equal(result.needsReview, true);
});

test('resolved branch rating outranks DTXR and preserves conflict evidence', () => {
  const result = resolveStandaloneWeightReviewRating({ rating: '150', dtxr: '900# valve' }, {});
  assert.equal(result.rating, '150');
  assert.equal(result.resolvedSource, 'piping-class-master');
  assert.equal(result.dtxrRating, '900');
  assert.equal(result.conflict, true);
});

test('DTXR-only rating uses the shared parser', () => {
  const result = resolveStandaloneWeightReviewRating({ dtxr: 'rating: 600' }, {});
  assert.equal(result.rating, '600');
  assert.equal(result.resolvedSource, 'dtxr-rating');
  assert.equal(result.conflict, false);
});

test('explicit DTXR rating preserves precedence over text while exposing disagreement', () => {
  const result = resolveStandaloneWeightReviewRating({ dtxrRating: '150', dtxr: 'CLASS 900' }, {});
  assert.equal(result.rating, '150');
  assert.equal(result.dtxrExplicitRating, '150');
  assert.equal(result.dtxrTextRating, '900');
  assert.equal(result.conflict, true);
});

test('default rating remains last fallback', () => {
  const result = resolveStandaloneWeightReviewRating({}, { rating: { defaultRating: 'CL 2500' } });
  assert.equal(result.rating, '2500');
  assert.equal(result.resolvedSource, 'default');
  assert.equal(result.conflict, false);
});

test('display info uses shared normalization and conflict state', () => {
  const info = standaloneWeightReviewRatingInfo({
    rating: 'CL 150',
    branchRating: '150',
    dtxr: '900#',
    ratingConflict: true,
  });
  assert.equal(info.shownRating, 'CL 150');
  assert.equal(info.dtxrRating, '900');
  assert.equal(info.conflict, true);
  assert.equal(info.fromDtxr, false);
});
