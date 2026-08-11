import {
  FIT_PHASES,
  FIT_REFERENCE_LIMITS,
  classifyFitSupportStiffness,
  fitSpanBoundaries,
  resolveFitSupportCategory,
} from './method.js';

function error(code, field, message, details = {}) {
  return Object.freeze({ code, field, message, details: Object.freeze({ ...details }) });
}

function finite(input, field, { positive = false, nonNegative = false } = {}) {
  const value = input[field];
  if (value === undefined || value === null) return error('FIT_INPUT_REQUIRED', field, `${field} is required.`);
  if (typeof value !== 'number' || !Number.isFinite(value)) return error('FIT_INPUT_INVALID', field, `${field} must be a finite number.`);
  if (positive && value <= 0) return error('FIT_INPUT_INVALID', field, `${field} must be greater than zero.`, { value });
  if (nonNegative && value < 0) return error('FIT_INPUT_INVALID', field, `${field} must be zero or greater.`, { value });
  return null;
}

function requiredPhaseData(input) {
  if (input.phase === 'LIQUID' || input.phase === 'GAS') {
    const fields = [['densityKgM3', { positive: true }]];
    if (input.fluidVelocityMS === undefined) fields.unshift(['massFlowKgS', { nonNegative: true }]);
    return fields;
  }
  return [
    ['gasMassFlowKgS', { nonNegative: true }],
    ['gasDensityKgM3', { positive: true }],
    ['liquidMassFlowKgS', { nonNegative: true }],
    ['liquidDensityKgM3', { positive: true }],
  ];
}

export function validateFitReferenceInput(input = {}) {
  const errors = [];
  for (const [field, rule] of [
    ['outsideDiameterM', { positive: true }],
    ['wallThicknessM', { positive: true }],
    ['maximumUnsupportedSpanM', { positive: true }],
  ]) {
    const issue = finite(input, field, rule);
    if (issue) errors.push(issue);
  }
  if (!FIT_PHASES.includes(input.phase)) {
    errors.push(error('FIT_INPUT_INVALID', 'phase', `phase must be one of ${FIT_PHASES.join(', ')}.`));
  }
  if (input.insideDiameterM !== undefined) {
    const issue = finite(input, 'insideDiameterM', { positive: true });
    if (issue) errors.push(issue);
  }
  if (input.fluidVelocityMS !== undefined) {
    const issue = finite(input, 'fluidVelocityMS', { nonNegative: true });
    if (issue) errors.push(issue);
  }
  for (const [field, rule] of requiredPhaseData(input)) {
    const issue = finite(input, field, rule);
    if (issue) errors.push(issue);
  }
  if (input.phase === 'GAS') {
    const issue = finite(input, 'gasDynamicViscosityPaS', { positive: true });
    if (issue) errors.push(issue);
  }
  if (input.naturalFrequencyHz !== undefined) {
    const issue = finite(input, 'naturalFrequencyHz', { positive: true });
    if (issue) errors.push(issue);
  }
  if (Number.isFinite(input.outsideDiameterM) && Number.isFinite(input.wallThicknessM)
      && 2 * input.wallThicknessM >= input.outsideDiameterM) {
    errors.push(error('FIT_INPUT_INVALID', 'wallThicknessM', 'Wall thickness must leave a positive internal diameter.'));
  }
  if (Number.isFinite(input.insideDiameterM) && Number.isFinite(input.outsideDiameterM)
      && input.insideDiameterM >= input.outsideDiameterM) {
    errors.push(error('FIT_INPUT_INVALID', 'insideDiameterM', 'Inside diameter must be less than outside diameter.'));
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function evaluateFitApplicability(input = {}) {
  const validation = validateFitReferenceInput(input);
  if (!validation.ok) return Object.freeze({ applicable: false, errors: validation.errors, limitations: Object.freeze([]) });

  const diameterMm = input.outsideDiameterM * 1000;
  const limits = FIT_REFERENCE_LIMITS;
  const errors = [];
  if (diameterMm < limits.minOutsideDiameterMm || diameterMm > limits.maxOutsideDiameterMm) {
    errors.push(error(
      'FIT_INPUT_OUTSIDE_APPLICABILITY',
      'outsideDiameterM',
      `Reference correlation requires outside diameter between ${limits.minOutsideDiameterMm} and ${limits.maxOutsideDiameterMm} mm.`,
      { diameterMm },
    ));
  }

  const boundaries = fitSpanBoundaries(diameterMm);
  const stiffness = classifyFitSupportStiffness(input.maximumUnsupportedSpanM, boundaries);
  const supportCategory = resolveFitSupportCategory(stiffness, diameterMm);
  if (!supportCategory) {
    errors.push(error(
      'FIT_SUPPORT_SIZE_FAMILY_UNRESOLVED',
      'outsideDiameterM',
      'Reference workbook does not define a deterministic medium/flexible diameter family for this manual diameter.',
      { diameterMm, smallMaxMm: limits.smallFamilyMaxOutsideDiameterMm, largeMinMm: limits.largeFamilyMinOutsideDiameterMm },
    ));
  }

  return Object.freeze({
    applicable: errors.length === 0,
    errors: Object.freeze(errors),
    limitations: Object.freeze([
      'WORKBOOK_REFERENCE_ONLY',
      'EI_METHOD_INDEPENDENT_REVIEW_REQUIRED',
      'MAIN_LINE_FIT_ONLY',
    ]),
    support: Object.freeze({ boundaries, stiffness, category: supportCategory }),
  });
}

export function fitAdvancedEligibility(calculation) {
  if (!calculation?.standard || calculation.standard.lof < FIT_REFERENCE_LIMITS.referenceLofThreshold) {
    return Object.freeze({ eligible: false, reason: 'STANDARD_LOF_BELOW_REFERENCE_THRESHOLD' });
  }
  if (!String(calculation.support?.category ?? '').startsWith('FLEXIBLE_')) {
    return Object.freeze({ eligible: false, reason: 'SUPPORT_NOT_FLEXIBLE' });
  }
  const fn = calculation.input?.naturalFrequencyHz;
  if (fn === undefined || fn === null) return Object.freeze({ eligible: false, reason: 'NATURAL_FREQUENCY_REQUIRED' });
  if (fn < FIT_REFERENCE_LIMITS.advancedNaturalFrequencyMinHz || fn > FIT_REFERENCE_LIMITS.advancedNaturalFrequencyMaxHz) {
    return Object.freeze({
      eligible: false,
      reason: 'NATURAL_FREQUENCY_OUTSIDE_DECLARED_RANGE',
      rangeHz: Object.freeze([
        FIT_REFERENCE_LIMITS.advancedNaturalFrequencyMinHz,
        FIT_REFERENCE_LIMITS.advancedNaturalFrequencyMaxHz,
      ]),
    });
  }
  return Object.freeze({ eligible: true, reason: 'ELIGIBLE' });
}
