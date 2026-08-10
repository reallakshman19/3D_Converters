/** Public empirical weight-estimation API. */
export {
  createEmpiricalWeightEstimator,
  estimateEmpiricalWeight,
  lookupEmpiricalWeight,
  estimateEmpiricalWeightApproach1,
  estimateEmpiricalWeightApproach2,
} from './empirical-weight-estimator.js';
export {
  DEFAULT_EMPIRICAL_WEIGHT_ABNORMALITY_THRESHOLD_PCT,
  compareObservedWeightToEmpiricalEstimate,
  createEmpiricalWeightValidator,
  validateEmpiricalWeight,
  buildEmpiricalWeightValidationReport,
  empiricalWeightValidationReportToCsv,
} from './empirical-weight-validation.js';
export { EMPIRICAL_WEIGHT_MODEL } from './empirical-weight-model.js';
