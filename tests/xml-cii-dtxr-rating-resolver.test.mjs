import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectXmlCiiDtxrRatingEvidence,
  extractXmlCiiRatingFromDtxr,
  resolveXmlCiiRatingAuthority,
} from '../converters/xml-cii2019-core/dtxr-rating-resolver.js';

test('extracts explicit DTXR rating forms only', () => {
  assert.equal(extractXmlCiiRatingFromDtxr('WELDING NECK FLANGE SCH 80 300#'), '300');
  assert.equal(extractXmlCiiRatingFromDtxr('VALVE CLASS 900 RF'), '900');
  assert.equal(extractXmlCiiRatingFromDtxr('FLANGE CL150'), '150');
  assert.equal(extractXmlCiiRatingFromDtxr('PIPE SCH 80 WTH 15.09'), '');
});

test('uses DTXR only when higher authority is absent', () => {
  const result = resolveXmlCiiRatingAuthority({ dtxrValues: ['FLANGE 900#'] });
  assert.equal(result.rating, '900');
  assert.equal(result.source, 'dtxr-rating');
  assert.equal(result.conflict, false);
});

test('piping class rating outranks corroborating DTXR', () => {
  const result = resolveXmlCiiRatingAuthority({ pipingClassRating: '900', dtxrValues: ['FLANGE 900#'] });
  assert.equal(result.rating, '900');
  assert.equal(result.source, 'piping-class-master');
  assert.equal(result.conflict, false);
});

test('higher authority is retained when DTXR conflicts', () => {
  const result = resolveXmlCiiRatingAuthority({ pipingClassRating: '150', dtxrValues: ['FLANGE 900#'] });
  assert.equal(result.rating, '150');
  assert.equal(result.source, 'dtxr-rating-conflict');
  assert.equal(result.resolvedSource, 'piping-class-master');
  assert.equal(result.conflict, true);
});

test('conflicting DTXR ratings do not auto-populate', () => {
  const evidence = collectXmlCiiDtxrRatingEvidence(['FLANGE 150#', 'VALVE CLASS 900']);
  assert.deepEqual(evidence.ratings, ['150', '900']);
  const result = resolveXmlCiiRatingAuthority({ dtxrValues: evidence.evidence });
  assert.equal(result.rating, '');
  assert.equal(result.conflict, true);
  assert.equal(result.needsReview, true);
});
