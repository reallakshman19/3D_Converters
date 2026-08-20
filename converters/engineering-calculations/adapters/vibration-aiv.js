import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  createEngineeringCalculationError,
} from '../contracts.js';
import { composeEngineeringQualification } from '../qualification.js';
import { AIV_DEFAULT_ASSUMPTION_PROFILE } from '../../vibration/aiv/aiv-assumption-profile.js';
import { calculateAiv } from '../../vibration/aiv/aiv-calculator.js';
import { validateAivScreeningProfile } from '../../vibration/aiv/aiv-screening-profile.js';

const SCREENING_REASONS = Object.freeze([
  'EI_D2_3_PRODUCT_PATH_22_OF_22_PASS',
  'BENCHMARK_ONLY_EXACT_HEAD_RELEASE_VALIDATION_PASS',
  'SCREENING_EIGHT_GROUP_MACHINE_QUALIFICATION_PASS',
  'SOURCE_RECONCILED_T2_6_STAGE8_CALCULATION',
  'VISIBLE_USER_CONFIGURABLE_ASSUMPTIONS',
  'ASSESSMENT_SCOPE_SCREENING_ONLY',
  'AIV_LINE_REDUCTION_RULE_QUALIFIED_DERIVATION_ONLY',
  'AIV_LINE_INVENTORY_COMPLETENESS_EVIDENCE_OPTIONAL_AND_NON_PROMOTING',
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
  if (input.inventoryCompletenessAttestations !== undefined && !Array.isArray(input.inventoryCompletenessAttestations)) {
    errors.push(createEngineeringCalculationError('INPUT_INVALID', 'AIV inventory completeness attestations must be an array.', {}, 'inventoryCompletenessAttestations'));
  }
  if ((input.inventoryCompletenessAttestations?.length ?? 0) > 0
      && (!Number.isSafeInteger(Number(input.engineeringInputRevision)) || Number(input.engineeringInputRevision) < 0)) {
    errors.push(createEngineeringCalculationError(
      'INPUT_INVALID',
      'AIV inventory completeness evidence requires the exact non-negative engineering input revision.',
      {},
      'engineeringInputRevision',
    ));
  }
  const profile = input.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE;
  const validation = validateAivScreeningProfile(profile);
  if (!validation.valid) {
    errors.push(createEngineeringCalculationError(
      'INPUT_INVALID',
      'AIV screening assumption profile violates screening policy.',
      { issues: validation.issues },
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
        'Stage 8 T2.6 uses current assessment geometry, connection type and explicit duplex disposition; benchmark A/S/B and FLM1 values are oracle-only.',
        'Line/case reduction uses the qualified greatest-discontinuity rule.',
        'Welded-discontinuity inventory completeness may be verified from exact-revision human attestation plus machine topology checks, but this calculation does not promote line/case screening authority.',
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
    inventoryCompletenessAttestations: input.inventoryCompletenessAttestations ?? [],
    engineeringInputRevision: input.engineeringInputRevision ?? null,
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
        'Stage 8 uses the source-reconciled T2.6 evaluator; configured D.2.3 intermediates are not runtime inputs.',
        'Line/case LOF is derived from current assessment results using the qualified greatest-discontinuity rule.',
        result.lineCaseAssessmentInventoryCompleteness === 'VERIFIED_COMPLETE'
          ? 'Current line/case inventory completeness evidence verified; line/case screening authority is still not promoted by this method revision.'
          : 'Line/case inventory completeness is not fully verified.',
        'Result does not provide design approval.',
      ],
    },
    provenance: {
      domainApi: 'calculateAiv',
      methodId: 'VIB.AIV.ACOUSTIC',
      methodRevision: 'ei-aviff2-aiv-auto-screening-v4',
      stage8Model: 'SOURCE_CALCULATED_T2_6',
      assumptionProfileSchema: result.assumptionProfile.schema,
      lineCaseAggregationRuleId: result.lineCaseAggregationRuleId,
      inventoryCompletenessHumanEvidenceRequired: true,
      humanEvidenceRequired: false,
      screeningQualificationReceipt: 'AIV-SCREENING-ReleaseValidationReceipt-v1.json',
    },
    evidence: {
      domainResult: result,
      stageOrder: result.stageOrder,
    },
    warnings: screening ? [{
      code: 'SCREENING_ONLY_NOT_DESIGN_AUTHORITY',
      message: 'AIV assessment result is qualified for screening only; inventory completeness evidence does not itself promote the derived line/case candidate to screening authority, and design authority remains false.',
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
  { key: 'inventoryCompletenessAttestations', label: 'Welded-discontinuity inventory completeness attestations', type: 'array' },
  { key: 'engineeringInputRevision', label: 'Engineering input revision', type: 'integer', quantity: 'dimensionless', canonicalUnit: null },
]);

export const VIBRATION_AIV_ENGINEERING_CALCULATION_DEFINITION = Object.freeze({
  contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
  id: 'VIB.AIV.ACOUSTIC',
  family: 'VIB',
  name: 'Acoustic-Induced Vibration Screening',
  shortName: 'Acoustic-Induced Vibration',
  methodRevision: 'ei-aviff2-aiv-auto-screening-v4',
  purpose: 'Execute the traceable 10-stage AIV method with source-calculated T2.6 assessment screening, derived line/case reduction and explicit welded-discontinuity inventory completeness custody.',
  authority: {
    calculationState: 'IMPLEMENTED',
    qualificationState: 'SCREENING',
    codeCompliance: false,
  },
  applicability: {
    description: 'Gas-phase pressure-reducing AIV source-to-welded-discontinuity assessment screening with explicit source/path/geometry/material evidence, visible assumptions and optional exact-revision inventory completeness evidence.',
    limitations: [
      'Assessment-level screening authority only; no design authority.',
      'Current source-calculated T2.6 screening envelope is WELDOLET/WELDED_TEE with explicit branch OD and Duplex YES/NO disposition.',
      'Line/case reduction rule is qualified for derivation.',
      'Verified inventory completeness evidence does not itself promote line/case screening authority.',
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
    warning: 'SCREENING ONLY — assessment scope; line/case candidate remains non-authoritative even when inventory completeness is verified; not design authority.',
  },
  validateInput,
  calculate,
});
