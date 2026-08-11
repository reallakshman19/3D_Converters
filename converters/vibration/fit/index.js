export {
  FIT_PHASES,
  FIT_REFERENCE_AUTHORITY,
  FIT_REFERENCE_LIMITS,
  FIT_SUPPORT_CATEGORIES,
  FIT_WORKBOOK_SOURCE,
  classifyFitSupportStiffness,
  fitAdvancedCorrelation,
  fitSpanBoundaries,
  fitStandardCorrelation,
  resolveFitSupportCategory,
} from './method.js';

export {
  evaluateFitApplicability,
  fitAdvancedEligibility,
  validateFitReferenceInput,
} from './applicability.js';

export { calculateFit } from './calculate.js';
export { assessFit } from './assess.js';
export {
  FIT_PHYSICAL_DERIVATIONS,
  resolveFitPhysicalContext,
  validateFitPhysicalInput,
} from './physical-context.js';
