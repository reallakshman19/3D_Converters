function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

const SUPPORTED_RATINGS = Object.freeze(['150', '300', '600', '900', '1500', '2500']);
const RATING_ALT = SUPPORTED_RATINGS.join('|');

export function normalizeXmlCiiRating(value) {
  const source = text(value).toUpperCase();
  if (!source) return '';
  const explicit = source.match(new RegExp(`\\b(?:CL|CLASS|RATING)?\\s*(${RATING_ALT})\\s*#?\\b`, 'i'));
  if (explicit) return explicit[1];
  const digits = source.replace(/[^0-9]/g, '');
  return SUPPORTED_RATINGS.includes(digits) ? digits : '';
}

export function extractXmlCiiRatingFromDtxr(value) {
  const source = text(value).toUpperCase();
  if (!source) return '';
  const hashMatch = source.match(new RegExp(`\\b(?:CL|CLASS|RATING)?\\s*(${RATING_ALT})\\s*#`, 'i'));
  if (hashMatch) return hashMatch[1];
  const namedMatch = source.match(new RegExp(`\\b(?:CL|CLASS|RATING)\\s*[-:]?\\s*(${RATING_ALT})\\b`, 'i'));
  return namedMatch ? namedMatch[1] : '';
}

export function collectXmlCiiDtxrRatingEvidence(values = []) {
  const evidence = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    const raw = text(value?.dtxr ?? value?.text ?? value?.value ?? value);
    const rating = extractXmlCiiRatingFromDtxr(raw);
    if (!rating) continue;
    evidence.push({
      rating,
      dtxr: raw,
      source: text(value?.source) || 'dtxr',
      componentType: text(value?.componentType ?? value?.type),
      componentRefNo: text(value?.componentRefNo ?? value?.ref),
    });
  }
  const ratings = [...new Set(evidence.map((item) => item.rating))];
  return {
    evidence,
    ratings,
    rating: ratings.length === 1 ? ratings[0] : '',
    conflict: ratings.length > 1,
  };
}

export function resolveXmlCiiRatingAuthority({
  manualRating = '',
  lineListRating = '',
  pipingClassRating = '',
  prefixRating = '',
  dtxrValues = [],
} = {}) {
  const higher = [
    ['override', manualRating],
    ['line-list', lineListRating],
    ['piping-class-master', pipingClassRating],
    ['piping-class-prefix', prefixRating],
  ]
    .map(([source, value]) => ({ source, rating: normalizeXmlCiiRating(value), raw: text(value) }))
    .find((item) => item.rating);

  const dtxr = collectXmlCiiDtxrRatingEvidence(dtxrValues);
  const rating = higher?.rating || (!dtxr.conflict ? dtxr.rating : '');
  const source = higher?.source || (rating ? 'dtxr-rating' : 'none');
  const dtxrConflict = Boolean(
    dtxr.conflict ||
    (higher?.rating && dtxr.rating && higher.rating !== dtxr.rating),
  );

  return {
    rating,
    source: dtxrConflict ? 'dtxr-rating-conflict' : source,
    resolvedSource: source,
    raw: higher?.raw || rating,
    dtxrRating: dtxr.rating,
    dtxrRatings: dtxr.ratings,
    dtxrEvidence: dtxr.evidence,
    conflict: dtxrConflict,
    needsReview: !rating || dtxrConflict,
  };
}
