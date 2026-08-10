import { pressureToMPa, stressToMPa } from './b313-units.js';
import { B313_STANDARD, B313_EDITION } from './b313-applicability.js';

export function calculateB313PressureStressRatios(input = {}) {
  const pressureUnit = input.pressureUnit || 'MPa';
  const stressUnit = input.stressUnit || pressureUnit;
  let pressureMPa;
  let allowableStressMPa;
  let qualityFactorE;
  try {
    pressureMPa = pressureToMPa(input.designPressure, pressureUnit, 'designPressure');
    allowableStressMPa = stressToMPa(input.allowableStress, stressUnit, 'allowableStress');
    qualityFactorE = Number(input.qualityFactorE);
    if (!Number.isFinite(qualityFactorE) || qualityFactorE <= 0 || qualityFactorE > 1) throw new RangeError('qualityFactorE must be > 0 and <= 1');
  } catch (error) {
    return { ok: false, code: 'INVALID_B313_RATIO_INPUT', message: error.message, standard: B313_STANDARD, edition: B313_EDITION };
  }
  const pressureAllowableStressRatio = pressureMPa / allowableStressMPa;
  const pressureEffectiveStressRatio = pressureMPa / (allowableStressMPa * qualityFactorE);
  return {
    ok: true,
    code: 'B313_PRESSURE_STRESS_RATIOS_CALCULATED',
    standard: B313_STANDARD,
    edition: B313_EDITION,
    pressureMPa,
    allowableStressMPa,
    qualityFactorE,
    pressureAllowableStressRatio,
    pressureEffectiveStressRatio,
    pressureStressRatio: pressureEffectiveStressRatio,
  };
}
