import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA,
  assertFitIndependentScreeningReviewComplete,
  createFitIndependentScreeningReviewTemplate,
  validateFitIndependentScreeningReview,
} from '../converters/vibration/fit/index.js';

const CANDIDATE = 'a'.repeat(40);

function approvedReview() {
  const template = createFitIndependentScreeningReviewTemplate(CANDIDATE);
  return {
    ...template,
    reviewer: {
      name: 'Independent Reviewer',
      role: 'Vibration Engineer',
      organization: 'Independent Engineering Review',
      independenceStatement: 'I did not author the production implementation or its benchmark outputs.',
      reviewDate: '2026-08-14',
    },
    sourceReview: {
      t22PageEquationMappingReviewed: true,
      officialErrataReviewedAndDispositioned: true,
      projectAdoptionReviewedAndApproved: true,
      sourceDifferencesAcceptedAsLimitations: true,
      notes: 'Direct source and project-adoption review complete.',
    },
    boundedScopeReview: {
      scopeAccepted: true,
      qst003ExclusionAccepted: true,
      advancedFrequencyBoundaryAccepted: true,
      multiphaseResolutionPolicyAccepted: true,
      manualDataFillOnlyPolicyAccepted: true,
      methodBlockersNonOverrideableAccepted: true,
      notes: 'Bounded screening scope accepted; design authority excluded.',
    },
    releaseEvidence: {
      candidateSha: CANDIDATE,
      releaseSuite: 'PASS',
      browserAcceptance: 'PASS',
      realFiveSheetXlsxAcceptance: 'PASS',
      dataBlockerAcceptance: 'PASS',
      evidencePackageAcceptance: 'PASS',
    },
    decision: {
      screeningRecommendation: 'GO_BOUNDED_SCREENING',
      designAuthorityRecommendation: 'NOT_AUTHORIZED',
      conditions: [],
      comments: 'Recommendation applies only to the reviewed bounded candidate.',
    },
  };
}

test('independent review template is fail-closed and tied to an exact candidate SHA', () => {
  const review = createFitIndependentScreeningReviewTemplate(CANDIDATE);
  assert.equal(review.schema, FIT_INDEPENDENT_SCREENING_REVIEW_SCHEMA);
  assert.equal(review.candidateSha, CANDIDATE);
  assert.equal(review.releaseEvidence.candidateSha, CANDIDATE);
  assert.equal(review.decision.screeningRecommendation, 'PENDING');
  assert.equal(review.decision.designAuthorityRecommendation, 'NOT_AUTHORIZED');
  const validation = validateFitIndependentScreeningReview(review);
  assert.equal(validation.ok, false);
  assert(validation.errors.includes('releaseEvidence.releaseSuite'));
  assert(validation.errors.includes('sourceReview.t22PageEquationMappingReviewed'));
});

test('review cannot GO without exact-candidate release/browser evidence', () => {
  const review = approvedReview();
  const invalid = {
    ...review,
    releaseEvidence: { ...review.releaseEvidence, candidateSha: 'b'.repeat(40), browserAcceptance: 'NOT_RUN' },
  };
  const validation = validateFitIndependentScreeningReview(invalid);
  assert.equal(validation.ok, false);
  assert(validation.errors.includes('releaseEvidence.candidateSha'));
  assert(validation.errors.includes('releaseEvidence.browserAcceptance'));
  assert.throws(
    () => assertFitIndependentScreeningReviewComplete(invalid),
    (error) => error.code === 'FIT_INDEPENDENT_SCREENING_REVIEW_INCOMPLETE',
  );
});

test('review cannot override QST-003 or manual-data policy gate', () => {
  const review = approvedReview();
  const invalid = {
    ...review,
    boundedScopeReview: {
      ...review.boundedScopeReview,
      qst003ExclusionAccepted: false,
      methodBlockersNonOverrideableAccepted: false,
    },
  };
  const validation = validateFitIndependentScreeningReview(invalid);
  assert.equal(validation.ok, false);
  assert(validation.errors.includes('boundedScopeReview.qst003ExclusionAccepted'));
  assert(validation.errors.includes('boundedScopeReview.methodBlockersNonOverrideableAccepted'));
});

test('complete independent review may recommend bounded screening but never design authority', () => {
  const review = approvedReview();
  const validation = assertFitIndependentScreeningReviewComplete(review);
  assert.equal(validation.ok, true);
  assert.equal(validation.screeningRecommendation, 'GO_BOUNDED_SCREENING');
  assert.equal(validation.designAuthorityRecommendation, 'NOT_AUTHORIZED');

  const designOverride = {
    ...review,
    decision: { ...review.decision, designAuthorityRecommendation: 'AUTHORIZED' },
  };
  assert.equal(validateFitIndependentScreeningReview(designOverride).ok, false);
});
