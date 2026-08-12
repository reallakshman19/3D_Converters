import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  createEngineeringCalculationError,
} from '../contracts.js';
import { composeEngineeringQualification } from '../qualification.js';
import {
  FIT_MULTIPHASE_RESOLUTION_MODES,
  FIT_REFERENCE_AUTHORITY,
  FIT_WORKBOOK_SOURCE,
  assessFit,
  buildFitCorrelationTrace,
  calculateFit,
  evaluateFitApplicability,
} from '../../vibration/fit/index.js';

const REASONS = Object.freeze([
  'WORKBOOK_REFERENCE_ONLY',
  'EI_WORKED_EXAMPLE_RECONCILED',
  'EI_METHOD_INDEPENDENT_REVIEW_REQUIRED',
  'QUALIFICATION_ISSUE_429_OPEN',
]);

function benchmarkQualification() {
  return composeEngineeringQualification({
    method: 'BENCHMARK_ONLY',
    data: 'BENCHMARK_ONLY',
    designAuthority: false,
    reasons: REASONS,
  });
}

function domainInput(input) {
  return {
    phase: input.phase,
    ...(input.multiphaseResolutionMode !== undefined ? { multiphaseResolutionMode: input.multiphaseResolutionMode } : {}),
    outsideDiameterM: input.outsideDiameter,
    wallThicknessM: input.wallThickness,
    ...(input.insideDiameter !== undefined ? { insideDiameterM: input.insideDiameter } : {}),
    maximumUnsupportedSpanM: input.maximumUnsupportedSpan,
    ...(input.massFlow !== undefined ? { massFlowKgS: input.massFlow } : {}),
    ...(input.density !== undefined ? { densityKgM3: input.density } : {}),
    ...(input.gasDynamicViscosity !== undefined ? { gasDynamicViscosityPaS: input.gasDynamicViscosity } : {}),
    ...(input.gasMassFlow !== undefined ? { gasMassFlowKgS: input.gasMassFlow } : {}),
    ...(input.gasDensity !== undefined ? { gasDensityKgM3: input.gasDensity } : {}),
    ...(input.liquidMassFlow !== undefined ? { liquidMassFlowKgS: input.liquidMassFlow } : {}),
    ...(input.liquidDensity !== undefined ? { liquidDensityKgM3: input.liquidDensity } : {}),
    ...(input.fluidVelocity !== undefined ? { fluidVelocityMS: input.fluidVelocity } : {}),
    ...(input.naturalFrequency !== undefined ? { naturalFrequencyHz: input.naturalFrequency } : {}),
  };
}

function engineeringError(error) {
  const outside = error.code === 'FIT_INPUT_OUTSIDE_APPLICABILITY'
    || error.code === 'FIT_SUPPORT_SIZE_FAMILY_UNRESOLVED';
  return createEngineeringCalculationError(
    outside ? 'INPUT_OUTSIDE_APPLICABILITY' : 'INPUT_INVALID',
    error.message,
    { fitCode: error.code, ...error.details },
    error.field ? error.field.replace(/(KgM3|KgS|PaS|MS|Hz|M)$/u, '') : null,
  );
}

function validateInput(input) {
  const result = evaluateFitApplicability(domainInput(input));
  return {
    ok: result.applicable,
    errors: result.errors.map(engineeringError),
    applicability: {
      applicable: result.applicable,
      limitations: result.limitations ?? [],
    },
  };
}

function blockedByMode() {
  return {
    ok: false,
    errors: [createEngineeringCalculationError(
      'ENGINEERING_METHOD_NOT_QUALIFIED',
      'FIT reference execution is available only in benchmark qualification mode.',
      { requiredQualificationMode: 'benchmark', qualificationIssue: 429 },
    )],
    qualification: benchmarkQualification(),
  };
}

function outputValues(calculation, assessment) {
  return {
    standardFv: calculation.standard.correlation.fv,
    standardLof: calculation.standard.lof,
    refinedLof: calculation.advanced?.lof ?? null,
    governingReferenceLof: calculation.governingReferenceLof,
    referenceThreshold: assessment.referenceThreshold ?? 1,
    referenceThresholdExceeded: assessment.referenceThresholdExceeded,
    referenceBand: assessment.referenceBand,
  };
}

function fitIntermediates(result) {
  return {
    hydraulics: result.hydraulics,
    excitation: result.excitation,
    support: result.support,
    standard: {
      fluidViscosityFactor: result.standard.fluidViscosityFactor,
      demand: result.standard.demand,
      lof: result.standard.lof,
    },
    standardCorrelation: buildFitCorrelationTrace(result.standard.correlation, 'STANDARD'),
    advancedEligibility: result.advancedEligibility,
    advanced: result.advanced ? {
      lof: result.advanced.lof,
      naturalFrequencyHz: result.advanced.naturalFrequencyHz,
    } : null,
    advancedCorrelation: buildFitCorrelationTrace(result.advanced?.correlation ?? null, 'ADVANCED'),
  };
}

function correlationIds(intermediates) {
  return [
    intermediates.standardCorrelation?.correlationId,
    intermediates.advancedCorrelation?.correlationId,
  ].filter(Boolean);
}

function calculate(input, runtime = {}) {
  if (runtime.options?.qualificationMode !== 'benchmark') return blockedByMode();
  const result = calculateFit(domainInput(input));
  const qualification = benchmarkQualification();
  if (!result.ok) {
    return {
      ok: false,
      errors: result.errors.map(engineeringError),
      qualification,
      applicability: { applicable: false, limitations: result.applicability?.limitations ?? [] },
      provenance: { sourceWorkbook: FIT_WORKBOOK_SOURCE },
    };
  }
  const assessment = assessFit(result);
  const intermediates = fitIntermediates(result);
  return {
    ok: true,
    outputs: outputValues(result, assessment),
    intermediates,
    checks: [],
    assessment,
    qualification,
    applicability: { applicable: true, limitations: result.applicability.limitations },
    provenance: {
      domainApi: 'calculateFit',
      engineeringAuthority: FIT_REFERENCE_AUTHORITY,
      sourceWorkbook: FIT_WORKBOOK_SOURCE,
      inputResolution: result.evidence.inputResolution,
      qualificationCoverageId: result.qualificationCoverage.coverageId,
      screeningCandidateScopeId: result.screeningCandidate.scopeId,
    },
    evidence: {
      equationIds: result.evidence.equationIds,
      correlationIds: correlationIds(intermediates),
      inputResolution: result.evidence.inputResolution,
      qualificationCoverage: result.qualificationCoverage,
      screeningCandidate: result.screeningCandidate,
      sourceWorkbook: FIT_WORKBOOK_SOURCE,
      domainResult: result,
    },
    warnings: [{
      code: 'BENCHMARK_REFERENCE_ONLY',
      message: 'Result is reconciled to retained workbook and EI worked-example evidence but is not qualified screening or design authority.',
    }],
  };
}

const inputs = Object.freeze([
  { key: 'phase', label: 'Fluid phase', type: 'enum', values: ['LIQUID', 'GAS', 'MULTIPHASE'], required: true },
  { key: 'multiphaseResolutionMode', label: 'Multiphase resolution mode', type: 'enum', values: FIT_MULTIPHASE_RESOLUTION_MODES },
  { key: 'outsideDiameter', label: 'Outside diameter', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'wallThickness', label: 'Wall thickness', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'insideDiameter', label: 'Inside diameter', type: 'number', quantity: 'length', canonicalUnit: 'm', minExclusive: 0 },
  { key: 'maximumUnsupportedSpan', label: 'Maximum unsupported span', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'massFlow', label: 'Single-phase / aggregate mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'density', label: 'Single-phase / effective density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'gasDynamicViscosity', label: 'Gas dynamic viscosity', type: 'number', quantity: 'dynamic_viscosity', canonicalUnit: 'Pa*s', minExclusive: 0 },
  { key: 'gasMassFlow', label: 'Gas mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'gasDensity', label: 'Gas density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'liquidMassFlow', label: 'Liquid aggregate mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'liquidDensity', label: 'Liquid aggregate density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'fluidVelocity', label: 'Fluid / effective velocity override', type: 'number', quantity: 'velocity', canonicalUnit: 'm/s', min: 0 },
  { key: 'naturalFrequency', label: 'Actual natural frequency', type: 'number', quantity: 'frequency', canonicalUnit: 'Hz', minExclusive: 0 },
]);

export const VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION = Object.freeze({
  contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
  id: 'VIB.FIV.FLOW_TURBULENCE',
  family: 'VIB',
  name: 'Flow-Induced Vibration Screening — FIT Workbook Reference',
  shortName: 'Flow-Induced Vibration Screening',
  methodRevision: 'ei-aviff2-fit-reference-v2',
  purpose: 'Execute source-traceable FIT reference equations for qualification and benchmark review only.',
  authority: {
    calculationState: 'IMPLEMENTED',
    qualificationState: 'BENCHMARK_ONLY',
    codeCompliance: false,
  },
  applicability: {
    description: 'Main-line FIT reference scope only.',
    limitations: [
      'Not qualified screening or design authority.',
      'EI worked examples are qualification evidence but do not cover the complete method domain.',
      'Independent EI/project-method review remains required under issue #429.',
      'Manual OD support-family gap remains fail-closed.',
      'Mixed aggregate/component multiphase data require an explicit resolution mode.',
    ],
  },
  inputs,
  outputs: [
    { key: 'standardFv', label: 'Standard reference Fv', type: 'number', quantity: 'pressure', canonicalUnit: 'Pa' },
    { key: 'standardLof', label: 'Standard reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
    { key: 'refinedLof', label: 'Advanced reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
    { key: 'governingReferenceLof', label: 'Governing reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
    { key: 'referenceBand', label: 'EI reference LOF band', type: 'string' },
  ],
  qualificationIssue: 429,
  ui: {
    visible: true,
    executionModes: ['single', 'sandbox', 'batch'],
    minimumQualificationToShow: 'BENCHMARK_ONLY',
    requiredQualificationMode: 'benchmark',
    productSurface: 'VIBRATION_INTEGRITY_TABLE_WORKSPACE',
    warning: 'Benchmark reference only — not screening/design authority.',
  },
  validateInput,
  calculate,
});
