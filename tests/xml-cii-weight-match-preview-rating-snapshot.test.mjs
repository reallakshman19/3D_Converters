import assert from 'node:assert/strict';
import test from 'node:test';

import {
  XML_CII_PREVIEW_CACHE_ENVELOPE_KEY,
  buildXmlCiiPreviewRatingSnapshot,
  readXmlCiiPreviewRatingSnapshot,
  resolveXmlCiiPreviewRating,
  resolveXmlCiiWeightMatchRating,
} from '../converters/xml-cii2019-core/preview-rating-snapshot.js';

test('Weight Match uses exact Preview branch Rating instead of node Rating', () => {
  const snapshot = buildXmlCiiPreviewRatingSnapshot([
    { branchName: '/GLRD/B1', lineKey: 'P4110003', rating: '900', ratingSource: 'piping-class-master' },
  ]);
  const result = resolveXmlCiiWeightMatchRating({
    branchName: '/GLRD/B1',
    lineKey: 'P4110003',
    rating: '150',
    dtxr: 'WELDING NECK FLANGE SCH 40S 900#',
  }, { mode: 'preview', snapshot });
  assert.equal(result.rating, '900');
  assert.equal(result.source, 'preview-branch');
  assert.equal(result.dtxrRating, '900');
});

test('Preview line-key fallback is allowed only when unambiguous', () => {
  const unambiguous = buildXmlCiiPreviewRatingSnapshot([
    { branchName: '/A/B1', lineKey: 'L1', rating: '900' },
    { branchName: '/A/B2', lineKey: 'L1', rating: '900' },
  ]);
  assert.equal(resolveXmlCiiPreviewRating({ lineKey: 'L1' }, unambiguous).rating, '900');

  const ambiguous = buildXmlCiiPreviewRatingSnapshot([
    { branchName: '/A/B1', lineKey: 'L1', rating: '150' },
    { branchName: '/A/B2', lineKey: 'L1', rating: '900' },
  ]);
  assert.equal(resolveXmlCiiPreviewRating({ lineKey: 'L1' }, ambiguous).rating, '');
});

test('DTXR Rating is used only in explicit DTXR mode', () => {
  const snapshot = buildXmlCiiPreviewRatingSnapshot([
    { branchName: '/A/B1', lineKey: 'L1', rating: '150' },
  ]);
  const row = { branchName: '/A/B1', lineKey: 'L1', dtxr: 'BALL VALVE TRUNN FB FLGD 900#' };
  assert.equal(resolveXmlCiiWeightMatchRating(row, { mode: 'preview', snapshot }).rating, '150');
  const dtxr = resolveXmlCiiWeightMatchRating(row, { mode: 'dtxr', snapshot });
  assert.equal(dtxr.rating, '900');
  assert.equal(dtxr.source, 'weight-match-dtxr-explicit');
});

test('missing Preview Rating remains unresolved rather than re-derived', () => {
  const snapshot = buildXmlCiiPreviewRatingSnapshot([]);
  const result = resolveXmlCiiWeightMatchRating({
    branchName: '/A/B1',
    lineKey: 'L1',
    rating: '150',
    resolvedPipingClass: '93834',
    dtxr: 'VALVE 900#',
  }, { mode: 'preview', snapshot });
  assert.equal(result.rating, '');
  assert.equal(result.source, 'preview-rating-missing');
});

test('deterministic Preview cache envelope restores Weight Match Rating authority', () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    values.set(XML_CII_PREVIEW_CACHE_ENVELOPE_KEY, JSON.stringify({
      authority: { digest: 'sha256:preview-900' },
      legacyPayload: {
        fp: 'preview-fingerprint',
        data: {
          branchRows: [{ branchName: '/E/B1', lineKey: 'E1', rating: '900' }],
        },
      },
    }));
    const snapshot = readXmlCiiPreviewRatingSnapshot();
    assert.equal(snapshot.authorityDigest, 'sha256:preview-900');
    assert.equal(resolveXmlCiiPreviewRating({ branchName: '/E/B1' }, snapshot).rating, '900');
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
