import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  createEngineeringCalculationError,
} from '../contracts.js';
import { composeEngineeringQualification } from '../qualification.js';
import {
  FIT_REFERENCE_AUTHORITY,
  FIT_WORKBOOK_SOURCE,
  assessFit,
  calculateFit,
  evaluateFitApplicability,
} from '../../vibration/fit/index.js';

const REASONS = Object.freeze([
  'WORKBOOK_REFERENCE_ONLY',
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
      'FIT workbook-reference execution is available only in benchmark qualification mode.',
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
  };
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
  return {
    ok: true,
    outputs: outputValues(result, assessment),
    intermediates: {
      hydraulics: result.hydraulics,
      excitation: result.excitation,
      support: result.support,
      standardCorrelation: result.standard.correlation,
      advancedCorrelation: result.advanced?.correlation ?? null,
    },
    checks: [],
    assessment,
    qualification,
    applicability: { applicable: true, limitations: result.applicability.limitations },
    provenance: {
      domainApi: 'calculateFit',
      engineeringAuthority: FIT_REFERENCE_AUTHORITY,
      sourceWorkbook: FIT_WORKBOOK_SOURCE,
    },
    evidence: {
      equationIds: result.evidence.equationIds,
      sourceWorkbook: FIT_WORKBOOK_SOURCE,
      domainResult: result,
    },
    warnings: [{
      code: 'WORKBOOK_REFERENCE_ONLY',
      message: 'Result reproduces retained workbook-reference behavior and is not qualified screening or design authority.',
    }],
  };
}

const inputs = Object.freeze([
  { key: 'phase', label: 'Fluid phase', type: 'enum', values: ['LIQUID', 'GAS', 'MULTIPHASE'], required: true },
  { key: 'outsideDiameter', label: 'Outside diameter', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'wallThickness', label: 'Wall thickness', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'insideDiameter', label: 'Inside diameter', type: 'number', quantity: 'length', canonicalUnit: 'm', minExclusive: 0 },
  { key: 'maximumUnsupportedSpan', label: 'Maximum unsupported span', type: 'number', quantity: 'length', canonicalUnit: 'm', required: true, minExclusive: 0 },
  { key: 'massFlow', label: 'Single-phase mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'density', label: 'Single-phase density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'gasDynamicViscosity', label: 'Gas dynamic viscosity', type: 'number', quantity: 'dynamic_viscosity', canonicalUnit: 'Pa*s', minExclusive: 0 },
  { key: 'gasMassFlow', label: 'Gas mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'gasDensity', label: 'Gas density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'liquidMassFlow', label: 'Liquid mass flow', type: 'number', quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0 },
  { key: 'liquidDensity', label: 'Liquid density', type: 'number', quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0 },
  { key: 'fluidVelocity', label: 'Fluid velocity override', type: 'number', quantity: 'velocity', canonicalUnit: 'm/s', min: 0 },
  { key: 'naturalFrequency', label: 'Actual natural frequency', type: 'number', quantity: 'frequency', canonicalUnit: 'Hz', minExclusive: 0 },
]);

export const VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION = Object.freeze({
  contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
  id: 'VIB.FIV.FLOW_TURBULENCE',
  family: 'VIB',
  name: 'Flow-Induced Turbulence (FIT) — Workbook Reference',
  shortName: 'FIT Workbook Reference',
  methodRevision: 'crf-fit-d7d4c1-reference-v1',
  purpose: 'Execute source-traceable retained FIT workbook equations for migration and benchmark review only.',
  authority: {
    calculationState: 'IMPLEMENTED',
    qualificationState: 'BENCHMARK_ONLY',
    codeCompliance: false,
  },
  applicability: {
    description: 'Main-line FIT retained-workbook reference scope only.',
    limitations: [
      'Not qualified screening or design authority.',
      'Independent EI/project-method review remains required under issue #429.',
      'Manual OD support-family gap is fail-closed.',
    ],
  },
  inputs,
  outputs: [
    { key: 'standardFv', label: 'Standard reference Fv', type: 'number', quantity: 'pressure', canonicalUnit: 'Pa' },
    { key: 'standardLof', label: 'Standard reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
    { key: 'refinedLof', label: 'Advanced reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
    { key: 'governingReferenceLof', label: 'Governing reference LOF', type: 'number', quantity: 'dimensionless', canonicalUnit: null },
  ],
  qualificationIssue: 429,
  ui: {
    visible: true,
    executionModes: ['single', 'sandbox', 'batch'],
    minimumQualificationToShow: 'BENCHMARK_ONLY',
    requiredQualificationMode: 'benchmark',
    warning: 'Workbook reference only — not screening/design authority.',
  },
  validateInput,
  calculate,
});
