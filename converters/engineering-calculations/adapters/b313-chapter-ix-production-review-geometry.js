import { createEngineeringCalculationError } from '../contracts.js';
import { composeEngineeringQualification } from '../qualification.js';
import {
  B313_CHAPTER_IX_STRAIGHT_PRESSURE_REVIEW_ENGINEERING_CALCULATION_DEFINITION,
  B313_CHAPTER_IX_USER_FATIGUE_REVIEW_ENGINEERING_CALCULATION_DEFINITION as BASE_USER_FATIGUE_REVIEW,
  B313_CHAPTER_IX_WALL_STATE_REVIEW_ENGINEERING_CALCULATION_DEFINITION,
} from './b313-chapter-ix-production-review.js';
import { validateUserKd3ExternalAnalysisGeometry } from '../../b313-chapter-ix/user-fatigue-geometry-custody.js';

const REASONS = Object.freeze([
  'PRODUCTION_ENGINEERING_REVIEW_EXECUTION',
  'EXTERNAL_KD3_GEOMETRY_BOUND_TO_CORE_SALT_BASIS',
  'QUALIFICATION_AND_EVIDENCE_CUSTODY_REMAIN_ADVISORY',
  'NO_CODE_COMPLIANCE_OR_DESIGN_AUTHORITY',
]);

function qualification() {
  return composeEngineeringQualification({
    method: 'IMPLEMENTED',
    data: 'DRAFT',
    designAuthority: false,
    reasons: REASONS,
  });
}

function geometryFailure(result) {
  return {
    ok: false,
    errors: [createEngineeringCalculationError(
      result.code,
      result.message,
      { domainDetails: result.details ?? {} },
      result.details?.field ?? 'externalResults',
    )],
    qualification: qualification(),
    provenance: {
      domainApi: 'validateUserKd3ExternalAnalysisGeometry',
      engineeringAuthority: 'PRODUCTION_ENGINEERING_REVIEW_ONLY',
      codeCompliance: false,
      canUseForDesignAuthority: false,
    },
    evidence: { geometryCustody: result },
  };
}

function calculateGeometryBoundUserFatigue(input) {
  const geometry = validateUserKd3ExternalAnalysisGeometry({
    outsideDiameterMm: input.outsideDiameter,
    effectiveWallMm: input.effectiveWall,
    externalResults: input.externalResults,
  });
  if (!geometry.ok) return geometryFailure(geometry);
  const result = BASE_USER_FATIGUE_REVIEW.calculate(input);
  if (!result.ok) return result;
  return {
    ...result,
    intermediates: {
      ...result.intermediates,
      externalAnalysisGeometry: geometry.expectedGeometry,
      geometryMatchToleranceMm: geometry.toleranceMm,
      geometryToleranceAuthority: geometry.toleranceAuthority,
    },
    warnings: [
      ...(result.warnings ?? []),
      {
        code: 'EXTERNAL_KD3_GEOMETRY_BOUND',
        message: 'External Seq/N were accepted only after every row declared the same OD and effective wall used by CORE for pressure-cycle Salt. The 1e-6 mm match tolerance is repository data-coupling QA only, not an ASME acceptance tolerance.',
      },
    ],
    provenance: {
      ...result.provenance,
      externalAnalysisGeometryBound: true,
      geometryMatchToleranceMm: geometry.toleranceMm,
    },
  };
}

export const B313_CHAPTER_IX_USER_FATIGUE_GEOMETRY_BOUND_REVIEW_ENGINEERING_CALCULATION_DEFINITION = Object.freeze({
  ...BASE_USER_FATIGUE_REVIEW,
  methodRevision: 'production-engineering-review-v2-geometry-bound',
  purpose: 'Use externally supplied Seq/N for production engineering review only when each row declares the exact OD and effective wall used by the external KD3 calculation and that geometry matches the CORE Salt basis.',
  applicability: {
    ...BASE_USER_FATIGUE_REVIEW.applicability,
    limitations: [
      ...(BASE_USER_FATIGUE_REVIEW.applicability?.limitations ?? []),
      'Each external Seq/N row must declare analysisGeometry matching the CORE fatigue OD and effective wall.',
    ],
  },
  calculate: calculateGeometryBoundUserFatigue,
});

export const B313_CHAPTER_IX_PRODUCTION_REVIEW_ENGINEERING_CALCULATION_DEFINITIONS = Object.freeze([
  B313_CHAPTER_IX_STRAIGHT_PRESSURE_REVIEW_ENGINEERING_CALCULATION_DEFINITION,
  B313_CHAPTER_IX_WALL_STATE_REVIEW_ENGINEERING_CALCULATION_DEFINITION,
  B313_CHAPTER_IX_USER_FATIGUE_GEOMETRY_BOUND_REVIEW_ENGINEERING_CALCULATION_DEFINITION,
]);
