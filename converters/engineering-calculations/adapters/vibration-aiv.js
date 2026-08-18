import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  createEngineeringCalculationError,
} from '../contracts.js';
import { composeEngineeringQualification } from '../qualification.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  validateAivAssumptionProfile,
} from '../../vibration/aiv/aiv-assumption-profile.js';
import { calculateAiv } from '../../vibration/aiv/aiv-calculator.js';

const SCREENING_REASONS = Object.freeze([
  'EI_D2_3_PRODUCT_PATH_22_OF_22_PASS',
  'BENCHMARK_ONLY_EXACT_HEAD_RELEASE_VALIDATION_PASS',
  'SCREENING_EIGHT_GROUP_MACHINE_QUALIFICATION_PASS',
  'VISIBLE_USER_CONFIGURABLE_ASSUMPTIONS',
  'ASSESSMENT_SCOPE_SCREENING_ONLY',
  'AIV_LINE_REDUCTION_RULE_QUALIFIED_DERIVATION_ONLY',
  'AIV_LINE_ASSESSMENT_INVENTORY_COMPLETENESS_UNVERIFIED',
  'DESIGN_AUTHORITY_FALSE',
]);

function qualification(mode) {
  const screening = mode === 'screening';
  return composeEngineeringQualification({
    method: screening ? 'SCREENING' : 'BENCHMARK_ONLY',
    data: screening ? 'SCREENING' : 'BENCHMARK_ONLY',
    designAuthority: false,
    reasons: SCREENING_REASONS,
  });
}

function validateInput(input) {
  const errors = [];
  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    errors.push(createEngineeringCalculationError('INPUT_REQUIRED', 'AIV sources table requires at least one source.', {}, 'sources'));
  }
  if (!Array.isArray(input.assessments) || input.assessments.length === 0) {
    errors.push(createEngineeringCalculationError('INPUT_REQUIRED', 'AIV assessments table requires at least one assessment.', {}, 'assessments'));
  }
  if (!Array.isArray(input.relationships) || input.relationships.length === 0) {
    errors.push(createEngineeringCalculationError('INPUT_REQUIRED', 'AIV source-to-assessment table requires at least one relationship.', {}, 'relationships'));
  }
  if (!input.topology || typeof input.topology !== 'object') {
    errors.push(createEngineeringCalculationError('INPUT_REQUIRED', 'AIV topology exchange is required.', {}, 'topology'));
  }
  const profile = input.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE;
  const validation = validateAivAssumptionProfile(profile);
  if (!validation.valid) {
    errors.push(createEngineeringCalculationError(
      'INPUT_INVALID',
      'AIV assumption profile is invalid.',
      { missing: validation.missing, invalidNumeric: validation.invalidNumeric },
      'assumptionProfile',
    ));
  }
  return {
    ok: errors.length === 0,
    errors,
    applicability: {
      applicable: errors.length === 0,
      limitations: [
        'Assessment-level LOF is the qualified screening result scope.',
        'Line/case reduction uses the qualified greatest-discontinuity rule but remains non-authoritative until welded-discontinuity inventory completeness is proven.',
        'Missing engineering inputs may be filled only by the visible/exported user-configurable assumption profile.',
        'designAuthority=false.',
      ],
    },
  };
}

function calculate(input, runtime = {}) {
  const mode = runtime.options?.qualificationMode;
  if (!['benchmark', 'screening'].includes(mode)) {
    return {
      ok: false,
      errors: [createEngineeringCalculationError(
        'ENGINEERING_METHOD_NOT_QUALIFIED',
        'AIV execution requires explicit qualificationMode=benchmark or qualificationMode=screening.',
        { allowedQualificationModes: ['benchmark', 'screening'], qualificationIssue: 441 },
      )],
      qualification: qualification('screening'),
    };
  }
  const result = calculateAiv({
    sources: input.sources,
    assessments: input.assessments,
    relationships: input.relationships,
    exchange: input.topology,
    assumptionProfile: input.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE,
    qualificationMode: mode,
  });
  const screening = mode === 'screening';
  return {
    ok: true,
    outputs: {
      sourceResults: result.sourceResults,
      assessmentResults: result.assessmentResults,
      lineCaseSummaries: result.lineCaseSummaries,
      screeningResultScope: result.screeningResultScope,
      lineCaseAggregationRuleId: result.lineCaseAggregationRuleId,
      lineCaseAggregationRuleQualification: result.lineCaseAggregationRuleQualification,
      lineCaseAssessmentInventoryCompleteness: result.lineCaseAssessmentInventoryCompleteness,
      completeKernelStageCount: result.implementedStageCount,
    },
    intermediates: {
      stageOrder: result.stageOrder,
      profileValidation: result.profileValidation,
    },
    checks: [],
    assessment: {
      resultScope: screening ? 'ASSESSMENT_SCREENING' : 'BENCHMARK',
      screeningAuthority: screening ? 'AUTHORIZED' : 'NOT_AUTHORIZED',
      lineCaseAggregationRuleQualification: result.lineCaseAggregationRuleQualification,
      lineCaseAssessmentInventoryCompleteness: result.lineCaseAssessmentInventoryCompleteness,
      lineCaseSummaryAuthoritativeForScreening: false,
      designAuthority: false,
    },
    qualification: qualification(mode),
    applicability: {
      applicable: true,
      limitations: [
        screening ? 'Assessment-level screening authority only.' : 'Benchmark execution only.',
        'Line/case LOF is derived from current assessment results using the qualified greatest-discontinuity rule.',
        'Line/case summary remains non-authoritative because complete welded-discontinuity coverage is not established by this calculation.',
        'Result does not provide design approval.',
      ],
    },
    provenance: {
      domainApi: 'calculateAiv',
      methodId: 'VIB.AIV.ACOUSTIC',
      methodRevision: 'ei-aviff2-aiv-auto-screening-v2',
      assumptionProfileSchema: result.assumptionProfile.schema,
      lineCaseAggregationRuleId: result.lineCaseAggregationRuleId,
      humanEvidenceRequired: false,
      screeningQualificationReceipt: 'AIV-SCREENING-ReleaseValidationReceipt-v1.json',
    },
    evidence: {
      domainResult: result,
      stageOrder: result.stageOrder,
    },
    warnings: screening ? [{
      code: 'SCREENING_ONLY_NOT_DESIGN_AUTHORITY',
      message: 'AIV assessment result is qualified for screening only; the derived line/case candidate remains non-authoritative until welded-discontinuity inventory completeness is proven, and design authority remains false.',
    }] : [{
      code: 'BENCHMARK_REFERENCE_ONLY',
      message: 'AIV result is running in benchmark mode and does not carry screening authority.',
    }],
  };
}

const inputs = Object.freeze([
  { key: 'sources', label: 'AIV Sources', type: 'table', required: true },
  { key: 'assessments', label: 'AIV Assessments', type: 'table', required: true },
  { key: 'relationships', label: 'AIV Source to Assessment', type: 'table', required: true },
  { key: 'topology', label: 'Topology exchange', type: 'object', required: true },
  { key: 'assumptionProfile', label: 'AIV assumption profile', type: 'object' },
]);

export const VIBRATION_AIV_ENGINEERING_CALCULATION_DEFINITION = Object.freeze({
  contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
  id: 'VIB.AIV.ACOUSTIC',
  family: 'VIB',
  name: 'Acoustic-Induced Vibration Screening',
  shortName: 'Acoustic-Induced Vibration',
  methodRevision: 'ei-aviff2-aiv-auto-screening-v2',
  purpose: 'Execute the traceable 10-stage AIV method for assessment-level screening and derived line/case reduction with visible user-configurable assumptions.',
  authority: {
    calculationState: 'IMPLEMENTED',
    qualificationState: 'SCREENING',
    codeCompliance: false,
  },
  applicability: {
    description: 'Gas-phase pressure-reducing AIV source-to-welded-discontinuity assessment screening with explicit source/path/geometry evidence and visible assumptions.',
    limitations: [
      'Assessment-level screening authority only; no design authority.',
      'Line/case reduction rule is qualified for derivation, but line screening authority is blocked until welded-discontinuity inventory completeness is proven.',
      'All assumed values must remain visible, editable and exported.',
      'Project application outside the qualified input/model envelope remains the user’s responsibility to review.',
    ],
  },
  inputs,
  outputs: [
    { key: 'sourceResults', label: 'Source results', type: 'table' },
    { key: 'assessmentResults', label: 'Assessment screening results', type: 'table' },
    { key: 'lineCaseSummaries', label: 'Derived non-authoritative line / case candidates', type: 'table' },
    { key: 'screeningResultScope', label: 'Screening result scope', type: 'string' },
    { key: 'lineCaseAggregationRuleQualification', label: 'Line/case reduction rule qualification', type: 'string' },
    { key: 'lineCaseAssessmentInventoryCompleteness', label: 'Line/case assessment inventory completeness', type: 'string' },
    { key: 'completeKernelStageCount', label: 'Kernel stage count', type: 'integer', quantity: 'dimensionless', canonicalUnit: null },
  ],
  qualificationIssue: 441,
  ui: {
    visible: true,
    executionModes: ['single', 'sandbox', 'batch'],
    minimumQualificationToShow: 'SCREENING',
    requiredQualificationMode: 'screening',
    productSurface: 'VIBRATION_AIV_QUALIFICATION_WORKSPACE',
    warning: 'SCREENING ONLY — assessment scope; derived line/case candidate is not screening authority; not design authority.',
  },
  validateInput,
  calculate,
});
