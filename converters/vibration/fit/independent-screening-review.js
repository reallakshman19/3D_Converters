export const FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA = 'FitIndependentScreeningReview.v1';

const SHA40 = /^[0-9a-f]{40}$/u;
const GO = 'GO_BOUNDED_SCREENING';
const DESIGN_NOT_AUTHORIZED = 'NOT_AUTHORIZED';

function reviewError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'FitIndependentScreeningReviewError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function text(value) {
  return String(value ?? '').trim();
}

function requiredText(value, field, errors) {
  if (!text(value)) errors.push(field);
}

function requiredTrue(value, field, errors) {
  if (value !== true) errors.push(field);
}

export function createFitIndependentScreeningReviewTemplate(candidateSha = '') {
  return Object.freeze({
    schema: FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA,
    candidateSha: text(candidateSha),
    reviewer: Object.freeze({
      name: '', role: '', organization: '', independenceStatement: '', reviewDate: '',
    }),
    sourceReview: Object.freeze({
      t22PageEquationMappingReviewed: false,
      officialErrataReviewedAndDispositioned: false,
      projectAdoptionReviewedAndApproved: false,
      sourceDifferencesAcceptedAsLimitations: false,
      notes: '',
    }),
    boundedScopeReview: Object.freeze({
      scopeAccepted: false,
      qst003ExclusionAccepted: false,
      advancedFrequencyBoundaryAccepted: false,
      multiphaseResolutionPolicyAccepted: false,
      manualDataFillOnlyPolicyAccepted: false,
      methodBlockersNonOverrideableAccepted: false,
      notes: '',
    }),
    releaseEvidence: Object.freeze({
      candidateSha: text(candidateSha),
      releaseSuite: 'NOT_RUN',
      browserAcceptance: 'NOT_RUN',
      realFiveSheetXlsxAcceptance: 'NOT_RUN',
      dataBlockerAcceptance: 'NOT_RUN',
      evidencePackageAcceptance: 'NOT_RUN',
    }),
    decision: Object.freeze({
      screeningRecommendation: 'PENDING',
      designAuthorityRecommendation: DESIGN_NOT_AUTHORIZED,
      conditions: Object.freeze([]),
      comments: '',
    }),
  });
}

export function validateFitIndependentScreeningReview(review) {
  const errors = [];
  if (review?.schema !== FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA) errors.push('schema');
  if (!SHA40.test(text(review?.candidateSha))) errors.push('candidateSha');

  requiredText(review?.reviewer?.name, 'reviewer.name', errors);
  requiredText(review?.reviewer?.role, 'reviewer.role', errors);
  requiredText(review?.reviewer?.independenceStatement, 'reviewer.independenceStatement', errors);
  requiredText(review?.reviewer?.reviewDate, 'reviewer.reviewDate', errors);

  requiredTrue(review?.sourceReview?.t22PageEquationMappingReviewed, 'sourceReview.t22PageEquationMappingReviewed', errors);
  requiredTrue(review?.sourceReview?.officialErrataReviewedAndDispositioned, 'sourceReview.officialErrataReviewedAndDispositioned', errors);
  requiredTrue(review?.sourceReview?.projectAdoptionReviewedAndApproved, 'sourceReview.projectAdoptionReviewedAndApproved', errors);
  requiredTrue(review?.sourceReview?.sourceDifferencesAcceptedAsLimitations, 'sourceReview.sourceDifferencesAcceptedAsLimitations', errors);

  for (const field of [
    'scopeAccepted', 'qst003ExclusionAccepted', 'advancedFrequencyBoundaryAccepted',
    'multiphaseResolutionPolicyAccepted', 'manualDataFillOnlyPolicyAccepted',
    'methodBlockersNonOverrideableAccepted',
  ]) requiredTrue(review?.boundedScopeReview?.[field], `boundedScopeReview.${field}`, errors);

  if (text(review?.releaseEvidence?.candidateSha) !== text(review?.candidateSha)) {
    errors.push('releaseEvidence.candidateSha');
  }
  for (const field of [
    'releaseSuite', 'browserAcceptance', 'realFiveSheetXlsxAcceptance',
    'dataBlockerAcceptance', 'evidencePackageAcceptance',
  ]) {
    if (review?.releaseEvidence?.[field] !== 'PASS') errors.push(`releaseEvidence.${field}`);
  }

  if (review?.decision?.screeningRecommendation !== GO) errors.push('decision.screeningRecommendation');
  if (review?.decision?.designAuthorityRecommendation !== DESIGN_NOT_AUTHORIZED) {
    errors.push('decision.designAuthorityRecommendation');
  }

  return Object.freeze({
    ok: errors.length === 0,
    schema: FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA,
    candidateSha: text(review?.candidateSha) || null,
    errors: Object.freeze([...new Set(errors)]),
    screeningRecommendation: review?.decision?.screeningRecommendation ?? null,
    designAuthorityRecommendation: review?.decision?.designAuthorityRecommendation ?? null,
  });
}

export function assertFitIndependentScreeningReviewComplete(review) {
  const result = validateFitIndependentScreeningReview(review);
  if (!result.ok) throw reviewError(
    'FIT_INDEPENDENT_SCREENING_REVIEW_INCOMPLETE',
    'Independent FIT bounded-screening review is incomplete or not tied to passing exact-candidate evidence.',
    { candidateSha: result.candidateSha, fields: result.errors },
  );
  return result;
}
