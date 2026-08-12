import { evaluateFitQualificationCoverage } from './qualification-coverage.js';

export const FIT_SCREENING_CANDIDATE_SCOPE_ID = 'FIT-SCREENING-CANDIDATE-V1';

function freezeResult(value) {
  return Object.freeze({
    scopeId: FIT_SCREENING_CANDIDATE_SCOPE_ID,
    screeningAuthorized: false,
    engineeringAuthority: 'NONE',
    domainCoverageEstablished: false,
    pointCoverageOnly: true,
    ...value,
    reasons: Object.freeze([...(value.reasons ?? [])]),
  });
}

export function evaluateFitScreeningCandidateScope(calculation = {}) {
  if (!calculation?.ok) {
    return freezeResult({
      candidateForEngineeringReview: false,
      status: 'CALCULATION_UNAVAILABLE',
      coverageId: null,
      continuationRequired: null,
      reasons: ['SUCCESSFUL_REFERENCE_CALCULATION_REQUIRED'],
    });
  }

  const coverage = calculation.qualificationCoverage ?? evaluateFitQualificationCoverage(calculation);
  if (coverage.screeningQualified !== false || coverage.engineeringAuthority !== 'NONE') {
    return freezeResult({
      candidateForEngineeringReview: false,
      status: 'COVERAGE_AUTHORITY_INVARIANT_VIOLATED',
      coverageId: coverage.coverageId ?? null,
      continuationRequired: null,
      reasons: ['EVIDENCE_COVERAGE_MUST_REMAIN_NON_AUTHORIZING'],
    });
  }

  if (calculation.advanced) {
    return freezeResult({
      candidateForEngineeringReview: false,
      status: 'ADVANCED_PATH_NOT_EI_EXAMPLE_COVERED',
      coverageId: coverage.coverageId,
      continuationRequired: true,
      reasons: [
        'ADVANCED_CORRELATION_EXECUTED',
        'NO_EI_APPENDIX_D_ADVANCED_WORKED_EXAMPLE_POINT_IN_CURRENT_SET',
      ],
    });
  }

  if (!coverage.phasePath.eiPublishedExampleCoverage) {
    return freezeResult({
      candidateForEngineeringReview: false,
      status: 'PHASE_PATH_NOT_EI_EXAMPLE_COVERED',
      coverageId: coverage.coverageId,
      continuationRequired: calculation.standard?.lof >= 1,
      reasons: [
        `PHASE_PATH_${coverage.phasePath.path}_HAS_NO_EI_WORKED_EXAMPLE_POINT`,
      ],
    });
  }

  if (!coverage.standardCorrelation.eiPublishedExampleCoverage) {
    return freezeResult({
      candidateForEngineeringReview: false,
      status: 'STANDARD_CORRELATION_NOT_EI_EXAMPLE_COVERED',
      coverageId: coverage.coverageId,
      continuationRequired: calculation.standard?.lof >= 1,
      reasons: [
        `STANDARD_CORRELATION_${coverage.standardCorrelation.supportCategory}_HAS_NO_EI_WORKED_EXAMPLE_POINT`,
      ],
    });
  }

  const continuationRequired = calculation.standard.lof >= 1;
  return freezeResult({
    candidateForEngineeringReview: true,
    status: continuationRequired
      ? 'CANDIDATE_STANDARD_SLICE_FURTHER_ASSESSMENT_REQUIRED'
      : 'CANDIDATE_STANDARD_SLICE',
    coverageId: coverage.coverageId,
    continuationRequired,
    phasePath: coverage.phasePath.path,
    supportCategory: coverage.standardCorrelation.supportCategory,
    standardReferenceLof: calculation.standard.lof,
    coverageBasis: 'EI_WORKED_EXAMPLE_METHOD_SLICE',
    reasons: [
      'PHASE_PATH_HAS_EI_WORKED_EXAMPLE_POINT',
      'STANDARD_CORRELATION_HAS_EI_WORKED_EXAMPLE_POINT',
      'CANDIDATE_STATUS_IS_FOR_ENGINEERING_REVIEW_ONLY',
      'WORKED_EXAMPLE_POINT_DOES_NOT_ESTABLISH_FULL_DOMAIN_COVERAGE',
      ...(continuationRequired ? ['STANDARD_LOF_AT_OR_ABOVE_REFERENCE_THRESHOLD'] : []),
    ],
  });
}
