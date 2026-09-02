/**
 * Resolves UG-44(b) kernel inputs from either directly supplied scalars or the
 * documented workbook derivations in `./ug44-workbook-basis.js`.
 *
 * Resolution is fail-closed by design. Where a value can arrive by more than one
 * route, supplying both routes is an error rather than a silent precedence rule:
 * a caller who disagrees with themselves about `G` should be told, not quietly
 * given one of the two answers.
 *
 * Deriving an input from a documented workbook basis does not govern it. The
 * calculation remains BENCHMARK_ONLY; see
 * `docs/engineering-calculations/flange-ug44-source-register.md`.
 */

import {
  designPressureWithStaticHeadPa,
  meanGasketReactionDiameterM,
} from './ug44-workbook-basis.js';

export const GASKET_DIAMETER_BASES = Object.freeze({
  DIRECT: 'DIRECT_INPUT',
  MEAN_GASKET_CONTACT: 'WORKBOOK_MEAN_GASKET_CONTACT_DIAMETER',
});

export const DESIGN_PRESSURE_BASES = Object.freeze({
  DIRECT: 'DIRECT_INPUT',
  WITH_STATIC_HEAD: 'WORKBOOK_DESIGN_PRESSURE_PLUS_STATIC_HEAD',
});

function inputError(message, field) {
  const error = new TypeError(message);
  error.code = 'INPUT_INVALID';
  error.field = field;
  return error;
}

function supplied(value) {
  return value !== undefined && value !== null && value !== '';
}

/**
 * `G` either straight from the caller or derived as the mean gasket contact
 * diameter. Diameters are canonical metres; the workbook basis works in
 * millimetres, so the conversion happens here rather than at the boundary.
 */
export function resolveGasketReactionDiameter(input = {}) {
  const direct = supplied(input.gasketReactionDiameter);
  const inner = supplied(input.gasketInnerDiameter);
  const outer = supplied(input.gasketOuterDiameter);

  if (direct && (inner || outer)) {
    throw inputError(
      'Supply either gasketReactionDiameter or the gasket inner/outer diameters, not both.',
      'gasketReactionDiameter',
    );
  }

  if (direct) {
    return Object.freeze({
      gasketReactionDiameterM: Number(input.gasketReactionDiameter),
      basis: GASKET_DIAMETER_BASES.DIRECT,
      isCodeSeatingWidthDerivation: false,
    });
  }

  if (inner !== outer) {
    throw inputError(
      'Deriving the gasket reaction diameter needs both gasketInnerDiameter and gasketOuterDiameter.',
      inner ? 'gasketOuterDiameter' : 'gasketInnerDiameter',
    );
  }

  if (!inner) {
    throw inputError(
      'Supply gasketReactionDiameter, or gasketInnerDiameter and gasketOuterDiameter to derive it.',
      'gasketReactionDiameter',
    );
  }

  const derived = meanGasketReactionDiameterM({
    gasketInnerDiameterMm: Number(input.gasketInnerDiameter) * 1000,
    gasketOuterDiameterMm: Number(input.gasketOuterDiameter) * 1000,
  });

  return Object.freeze({
    gasketReactionDiameterM: derived.gasketReactionDiameterM,
    gasketContactWidthMm: derived.gasketContactWidthMm,
    basis: GASKET_DIAMETER_BASES.MEAN_GASKET_CONTACT,
    isCodeSeatingWidthDerivation: false,
  });
}

/**
 * `PD` at the flange face, optionally including the workbook's static-head term.
 * Specific gravity and liquid height must be supplied together; a head needs
 * both, and one alone is more likely a mistake than an intent.
 */
export function resolveDesignPressure(input = {}) {
  const design = Number(input.designPressure);
  const hasGravity = supplied(input.specificGravity);
  const hasHeight = supplied(input.liquidHeight);

  if (hasGravity !== hasHeight) {
    throw inputError(
      'Static head needs both specificGravity and liquidHeight.',
      hasGravity ? 'liquidHeight' : 'specificGravity',
    );
  }

  if (!hasGravity) {
    return Object.freeze({
      designPressurePa: design,
      staticHeadPa: 0,
      basis: DESIGN_PRESSURE_BASES.DIRECT,
    });
  }

  const withHead = designPressureWithStaticHeadPa({
    designPressurePa: design,
    specificGravity: Number(input.specificGravity),
    liquidHeightM: Number(input.liquidHeight),
  });

  return Object.freeze({
    designPressurePa: withHead.designPressureWithStaticHeadPa,
    staticHeadPa: withHead.staticHeadPa,
    systemDesignPressurePa: withHead.designPressurePa,
    basis: DESIGN_PRESSURE_BASES.WITH_STATIC_HEAD,
  });
}

/**
 * Full kernel input set plus the basis record describing how each derived value
 * was obtained, so a surface can show which route produced `G` and `PD`.
 */
export function resolveUg44CalculationInputs(input = {}) {
  const gasket = resolveGasketReactionDiameter(input);
  const pressure = resolveDesignPressure(input);

  return Object.freeze({
    calculationInputs: Object.freeze({
      ratedPressurePa: input.ratedPressure,
      designPressurePa: pressure.designPressurePa,
      gasketReactionDiameterM: gasket.gasketReactionDiameterM,
      momentFactor: input.momentFactor,
      bendingMomentNm: input.bendingMoment,
      openingAxialForceN: input.openingAxialForce,
    }),
    basis: Object.freeze({
      gasketReactionDiameter: gasket,
      designPressure: pressure,
    }),
  });
}
