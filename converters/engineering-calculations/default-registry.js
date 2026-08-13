import { createEngineeringCalculationRegistry } from './registry.js';
import { B313_ENGINEERING_CALCULATION_DEFINITIONS } from './adapters/b313.js';
import { EMPIRICAL_WEIGHT_ENGINEERING_CALCULATION_DEFINITION } from './adapters/empirical-weight.js';
import { VIBRATION_AIV_ENGINEERING_CALCULATION_DEFINITION } from './adapters/vibration-aiv.js';
import { VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION } from './adapters/vibration-fit.js';
import { PENDING_ENGINEERING_CALCULATION_DEFINITIONS } from './pending-definitions.js';

export const ACTIVE_ENGINEERING_CALCULATION_DEFINITIONS = Object.freeze([
  ...B313_ENGINEERING_CALCULATION_DEFINITIONS,
  EMPIRICAL_WEIGHT_ENGINEERING_CALCULATION_DEFINITION,
  VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION,
  VIBRATION_AIV_ENGINEERING_CALCULATION_DEFINITION,
]);

export const DEFAULT_ENGINEERING_CALCULATION_DEFINITIONS = Object.freeze([
  ...ACTIVE_ENGINEERING_CALCULATION_DEFINITIONS,
  ...PENDING_ENGINEERING_CALCULATION_DEFINITIONS,
]);

export function createDefaultEngineeringCalculationRegistry({ includePending = true } = {}) {
  return createEngineeringCalculationRegistry({
    definitions: includePending
      ? DEFAULT_ENGINEERING_CALCULATION_DEFINITIONS
      : ACTIVE_ENGINEERING_CALCULATION_DEFINITIONS,
  });
}
