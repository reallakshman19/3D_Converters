import {
  extractXmlCiiRatingFromDtxr,
  normalizeXmlCiiRating,
  resolveXmlCiiRatingAuthority,
} from '../../../converters/xml-cii2019-core/dtxr-rating-resolver.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function firstConfiguredRating(row, config) {
  const keys = [
    row?.key,
    row?.lineKey,
    row?.branchName,
    row?.requestedPipingClass,
    row?.resolvedPipingClass,
    row?.nodeNumber,
  ].filter(Boolean);

  const ratingOverrides = config?.overrides?.rating;
  if (ratingOverrides && typeof ratingOverrides === 'object' && !Array.isArray(ratingOverrides)) {
    for (const key of keys) {
      const value = text(ratingOverrides[key]);
      if (value) return value;
    }
  }

  const processOverrides = config?.overrides?.processData;
  if (processOverrides && typeof processOverrides === 'object' && !Array.isArray(processOverrides)) {
    for (const key of keys) {
      const value = text(processOverrides[key]?.rating);
      if (value) return value;
    }
  }

  return '';
}

export function resolveStandaloneWeightReviewRating(row = {}, config = {}) {
  const manualRating = firstConfiguredRating(row, config);
  const resolvedRating = text(row?.rating);
  const explicitDtxrRating = normalizeXmlCiiRating(row?.dtxrRating);
  const textDtxrRating = extractXmlCiiRatingFromDtxr(row?.dtxr);
  const selectedDtxrRating = explicitDtxrRating || textDtxrRating;

  const authority = resolveXmlCiiRatingAuthority({
    manualRating,
    pipingClassRating: resolvedRating,
    dtxrValues: selectedDtxrRating ? [`${selectedDtxrRating}#`] : [],
  });

  const dtxrEvidenceConflict = Boolean(
    explicitDtxrRating && textDtxrRating && explicitDtxrRating !== textDtxrRating,
  );
  const defaultRaw = text(config?.rating?.defaultRating || config?.defaultRating);
  const defaultRating = normalizeXmlCiiRating(defaultRaw);
  const rating = authority.rating || defaultRating;
  const resolvedSource = authority.rating
    ? authority.resolvedSource
    : (defaultRating ? 'default' : authority.resolvedSource);
  const conflict = Boolean(authority.conflict || dtxrEvidenceConflict);

  return {
    ...authority,
    rating,
    source: conflict ? 'dtxr-rating-conflict' : resolvedSource,
    resolvedSource,
    raw: authority.raw || defaultRaw || rating,
    dtxrRating: selectedDtxrRating,
    dtxrTextRating: textDtxrRating,
    dtxrExplicitRating: explicitDtxrRating,
    conflict,
    needsReview: !rating || conflict,
  };
}

export function standaloneWeightReviewRatingInfo(issue = {}) {
  const explicitDtxrRating = normalizeXmlCiiRating(issue?.dtxrRating);
  const textDtxrRating = extractXmlCiiRatingFromDtxr(issue?.dtxr);
  const dtxrRating = explicitDtxrRating || textDtxrRating;
  const shownRating = text(issue?.rating || dtxrRating);
  const derivedRating = text(issue?.branchRating || issue?.derivedRating || issue?.resolvedRating);
  const normalizedShown = normalizeXmlCiiRating(shownRating);
  const evidenceRatings = [explicitDtxrRating, textDtxrRating].filter(Boolean);
  const conflict = Boolean(
    issue?.ratingConflict
    || issue?.ratingAuthority?.conflict
    || (normalizedShown && evidenceRatings.some((rating) => rating !== normalizedShown))
    || (explicitDtxrRating && textDtxrRating && explicitDtxrRating !== textDtxrRating),
  );
  const fromDtxr = Boolean(
    !conflict
    && !issue?.branchRating
    && dtxrRating
    && normalizedShown === dtxrRating,
  );

  return {
    shownRating,
    dtxrRating,
    conflict,
    fromDtxr,
    derivedRating,
  };
}
