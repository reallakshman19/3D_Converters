export const VIBRATION_FACILITY_FIT_PLAN_SCHEMA = 'VibrationFacilityFitPlan.v1';
export const VIBRATION_FACILITY_FIT_CALCULATION_ID = 'VIB.FIV.FLOW_TURBULENCE';

export const FIT_FACILITY_ENRICHMENT_PROPERTIES = Object.freeze({
  ASSESSMENT_POINT: 'FIT_ASSESSMENT_POINT',
  OUTSIDE_DIAMETER: 'OUTSIDE_DIAMETER',
  WALL_THICKNESS: 'WALL_THICKNESS',
  INSIDE_DIAMETER: 'INSIDE_DIAMETER',
  MAX_UNSUPPORTED_SPAN: 'MAX_UNSUPPORTED_SPAN',
  NATURAL_FREQUENCY: 'NATURAL_FREQUENCY',
});

export const FIT_FACILITY_SUPPORTED_PHASES = Object.freeze(['LIQUID', 'GAS', 'MULTIPHASE']);

export function fitFacilityPlanError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'VibrationFacilityFitPlanError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}
