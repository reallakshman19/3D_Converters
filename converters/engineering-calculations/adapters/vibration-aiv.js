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

const BENCHMARK_REASONS = Object.freeze([
  'EI_D2_3_PRODUCT_PATH_22_OF_22_PASS',
  'EXACT_HEAD_LOCAL_RELEASE_VALIDATION_PASS',
  'SCREENING_QUALIFICATION_NOT_YET_APPLIED',
]);

function benchmarkQualification() {
  return composeEngineeringQualification({
    method: 'BENCHMARK_ONLY',
    data: 'BENCHMARK_ONLY',
    designAuthority: false,
    reasons: BENCHMARK_REASONS,
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
        'BENCHMARK_ONLY execution is currently authorized.',
        'Assessment-level LOF is the numerical screening candidate scope; configured line/case LOF is not authoritative for screening.',
        'designAuthority=false.',
      ],
    },
  };
}

function calculate(input, runtime = {}) {
  if (runtime.options?.qualificationMode !== 'benchmark') {
    return {
      ok: false,
      errors: [createEngineeringCalculationError(
        'ENGINEERING_METHOD_NOT_QUALIFIED',
        'AIV is currently executable only in benchmark qualification mode.',
        { requiredQualificationMode: 'benchmark', qualificationIssue: 441 },
      )],
      qualification: benchmarkQualification(),
    };
  }
  const result = calculateAiv({
    sources: input.sources,
    assessments: input.assessments,
    relationships: input.relationships,
    exchange: input.topology,
    assumptionProfile: input.assumptionProfile ?? AIV_DEFAULT_ASSUMPTION_PROFILE,
    qualificationMode: 'benchmark',
  });
  return {
    ok: true,
    outputs: {
      sourceResults: result.sourceResults,
      assessmentResults: result.assessmentResults,
      lineCaseSummaries: result.lineCaseSummaries,
      screeningResultScope: result.screeningResultScope,
      completeKernelStageCount: result.implementedStageCount,
    },
    intermediates: {
      stageOrder: result.stageOrder,
      profileValidation: result.profileValidation,
    },
    checks: [],
    assessment: {
      resultScope: 'BENCHMARK',
      benchmarkOnly: true,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    },
    qualification: benchmarkQualification(),
    applicability: {
      applicable: true,
      limitations: [
        'Benchmark execution only.',
        'Line/case summary is a configured scope reference and is not authoritative for screening.',
      ],
    },
    provenance: {
      domainApi: 'calculateAiv',
      methodId: 'VIB.AIV.ACOUSTIC',
      assumptionProfileSchema: result.assumptionProfile.schema,
      humanEvidenceRequired: false,
    },
    evidence: {
      domainResult: result,
      stageOrder: result.stageOrder,
    },
    warnings: [{
      code: 'BENCHMARK_REFERENCE_ONLY',
      message: 'AIV benchmark result is not yet screening or design authority.',
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
  name: 'Acoustic-Induced Vibration Screening — EI Benchmark',
  shortName: 'Acoustic-Induced Vibration',
  methodRevision: 'ei-aviff2-aiv-auto-v1',
  purpose: 'Execute the traceable 10-stage AIV method in BENCHMARK_ONLY qualification mode before screening promotion.',
  authority: {
    calculationState: 'IMPLEMENTED',
    qualificationState: 'BENCHMARK_ONLY',
    codeCompliance: false,
  },
  applicability: {
    description: 'Gas-phase pressure-reducing AIV source-to-welded-discontinuity benchmark and configured-assumption domain.',
    limitations: [
      'Not design authority.',
      'Screening authority is not yet enabled.',
      'Line/case LOF is a configured reference and not an assessment-level screening result.',
      'All assumed values must remain visible, editable and exported.',
    ],
  },
  inputs,
  outputs: [
    { key: 'sourceResults', label: 'Source results', type: 'table' },
    { key: 'assessmentResults', label: 'Assessment results', type: 'table' },
    { key: 'lineCaseSummaries', label: 'Line / case summaries', type: 'table' },
    { key: 'screeningResultScope', label: 'Screening candidate scope', type: 'string' },
    { key: 'completeKernelStageCount', label: 'Kernel stage count', type: 'integer', quantity: 'dimensionless', canonicalUnit: null },
  ],
  qualificationIssue: 441,
  ui: {
    visible: true,
    executionModes: ['single', 'sandbox', 'batch'],
    minimumQualificationToShow: 'BENCHMARK_ONLY',
    requiredQualificationMode: 'benchmark',
    productSurface: 'VIBRATION_AIV_QUALIFICATION_WORKSPACE',
    warning: 'BENCHMARK_ONLY — screening/design authority not yet enabled.',
  },
  validateInput,
  calculate,
});
