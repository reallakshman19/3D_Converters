/**
 * Input bases transcribed from the committed bolted-joint/flange source workbooks.
 *
 * Every export here reproduces what a source workbook actually does, so that the
 * difference between the workbook and the qualified kernel in `./ug44.js` is
 * explicit and testable rather than implicit. Nothing in this module carries Code
 * compliance, design authority, or master-data authority. See
 * `docs/engineering-calculations/flange-ug44-source-register.md`.
 */

const PI = Math.PI;

/** The constant literally typed into the workbook's RHS cells in place of pi. */
export const LEGACY_WORKBOOK_PI = 3.14;

/** Standard gravity used by the workbook's static-head cell. */
export const STATIC_HEAD_GRAVITY_M_PER_S2 = 9.80665;

export const UG44_WORKBOOK_BASIS_SOURCES = Object.freeze({
  ratingVsNozzleLoads: Object.freeze({
    path: 'docs/flange/Flange Rating Vs Nozzle loads -Rev.3.xlsx',
    sha256: 'd664bad746f39479a09ee9f126c39dd858822dfcb575f45d0a09152fa89e3b66',
    sheets: Object.freeze(['#150', '#300', '#600', '#900', 'Sheet1', 'Sheet2']),
  }),
  ug44Extract: Object.freeze({
    path: 'docs/flange/Flange UG 44(1).xlsx',
    sha256: 'f0c2f005539f23ce738418cdb0c89d4ad0036fd35c5b300750750c0c7372ba46',
    sheets: Object.freeze(['FlangeUG44b']),
  }),
});

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    const error = new TypeError(`${field} must be a finite number.`);
    error.code = 'INPUT_INVALID';
    error.field = field;
    throw error;
  }
  return number;
}

function nonNegative(value, field) {
  const number = finite(value, field);
  if (number < 0) {
    const error = new RangeError(`${field} must be greater than or equal to zero.`);
    error.code = 'INPUT_OUTSIDE_APPLICABILITY';
    error.field = field;
    throw error;
  }
  return number;
}

function positive(value, field) {
  const number = finite(value, field);
  if (number <= 0) {
    const error = new RangeError(`${field} must be greater than zero.`);
    error.code = 'INPUT_OUTSIDE_APPLICABILITY';
    error.field = field;
    throw error;
  }
  return number;
}

/**
 * Gasket reaction diameter as the workbook derives it: the mean of the gasket
 * contact inner and outer diameters, written there as `((OD - ID) / 2) + ID`.
 *
 * This is the workbook's basis, not a Code-derived `G`. ASME VIII-1 Appendix 2
 * makes `G` depend on the effective gasket seating width `b`, so a seating-width
 * derivation will not generally return this value.
 */
export function meanGasketReactionDiameterM({
  gasketInnerDiameterMm,
  gasketOuterDiameterMm,
} = {}) {
  const inner = positive(gasketInnerDiameterMm, 'gasketInnerDiameterMm');
  const outer = positive(gasketOuterDiameterMm, 'gasketOuterDiameterMm');
  if (!(outer > inner)) {
    const error = new RangeError('gasketOuterDiameterMm must exceed gasketInnerDiameterMm.');
    error.code = 'INPUT_OUTSIDE_APPLICABILITY';
    error.field = 'gasketOuterDiameterMm';
    throw error;
  }
  const gasketReactionDiameterMm = ((outer - inner) / 2) + inner;
  return Object.freeze({
    basis: 'WORKBOOK_MEAN_GASKET_CONTACT_DIAMETER',
    gasketReactionDiameterMm,
    gasketReactionDiameterM: gasketReactionDiameterMm / 1000,
    gasketContactWidthMm: (outer - inner) / 2,
    isCodeSeatingWidthDerivation: false,
  });
}

/**
 * Static head as the workbook's `=SG * height * 9.80665` cell computes it.
 * The workbook expresses the result in kPa; both units are returned here.
 */
export function staticHeadPressurePa({ specificGravity, liquidHeightM } = {}) {
  const sg = nonNegative(specificGravity, 'specificGravity');
  const height = nonNegative(liquidHeightM, 'liquidHeightM');
  const staticHeadKPa = sg * height * STATIC_HEAD_GRAVITY_M_PER_S2;
  return Object.freeze({
    basis: 'WORKBOOK_SG_TIMES_HEIGHT_TIMES_STANDARD_GRAVITY',
    staticHeadKPa,
    staticHeadPa: staticHeadKPa * 1000,
  });
}

/**
 * `PD` at the flange face as the workbook defines it: system design pressure plus
 * the static head of the contained liquid column. The workbook applies one
 * sheet-level `PD` to every row, so the head is the column maximum, not a
 * per-nozzle elevation.
 */
export function designPressureWithStaticHeadPa({
  designPressurePa,
  specificGravity = 0,
  liquidHeightM = 0,
} = {}) {
  const design = nonNegative(designPressurePa, 'designPressurePa');
  const head = staticHeadPressurePa({ specificGravity, liquidHeightM });
  return Object.freeze({
    basis: 'WORKBOOK_DESIGN_PRESSURE_PLUS_STATIC_HEAD',
    designPressurePa: design,
    staticHeadPa: head.staticHeadPa,
    designPressureWithStaticHeadPa: design + head.staticHeadPa,
    appliesUniformHeadToEveryRow: true,
  });
}

/**
 * The workbook's `=SQRT(ME*ME + ME*ME)` moment resolution: a scenario in which
 * both orthogonal bending components equal `ME`, giving `ME * sqrt(2)`.
 *
 * This is an envelope assumption about the load case, not a resolution of real
 * components. Use `resolveFlangeOpeningLoads` in `./joint-loads.js` when actual
 * `Mx`/`My` are known; that returns `hypot(mx, my)` and only coincides with this
 * value when the two components happen to be equal.
 */
export function resolveEqualOrthogonalMomentNm({ componentMomentNm } = {}) {
  const component = nonNegative(componentMomentNm, 'componentMomentNm');
  return Object.freeze({
    basis: 'WORKBOOK_EQUAL_ORTHOGONAL_COMPONENT_SCENARIO',
    componentMomentNm: component,
    resolvedMomentNm: Math.hypot(component, component),
    isGeneralComponentResolution: false,
  });
}

/**
 * The workbook's acceptance row evaluated exactly as written, including its
 * `3.14` literal, alongside the same relation evaluated with `Math.PI`.
 *
 * Because `3.14 < pi`, the workbook's right-hand side is slightly smaller than
 * the exact relation, so the workbook is marginally conservative. The returned
 * `rightHandSideRelativeDeviation` quantifies that for regression comparisons.
 */
export function legacyWorkbookUg44Acceptance({
  ratedPressurePa,
  designPressurePa,
  gasketReactionDiameterM,
  momentFactor,
  resolvedBendingMomentNm,
  openingAxialForceN,
} = {}) {
  const pr = positive(ratedPressurePa, 'ratedPressurePa');
  const pd = nonNegative(designPressurePa, 'designPressurePa');
  const g = positive(gasketReactionDiameterM, 'gasketReactionDiameterM');
  const fm = nonNegative(momentFactor, 'momentFactor');
  const me = nonNegative(resolvedBendingMomentNm, 'resolvedBendingMomentNm');
  const fe = nonNegative(openingAxialForceN, 'openingAxialForceN');

  const leftHandSideNm = (16 * me) + (4 * fe * g);
  const pressureTermPa = (pr - pd) + (fm * pr);
  const rightHandSideNm = LEGACY_WORKBOOK_PI * g ** 3 * pressureTermPa;
  const exactRightHandSideNm = PI * g ** 3 * pressureTermPa;

  return Object.freeze({
    method: 'LEGACY_WORKBOOK_UG44B_ROW_REFERENCE',
    sourceBasis: 'FLANGE_RATING_VS_NOZZLE_LOADS_REV3_SHEET_ROW',
    leftHandSideNm,
    rightHandSideNm,
    exactRightHandSideNm,
    rightHandSideRelativeDeviation: (rightHandSideNm - exactRightHandSideNm) / exactRightHandSideNm,
    pass: leftHandSideNm <= rightHandSideNm,
    exactPass: leftHandSideNm <= exactRightHandSideNm,
    workbookWarning: leftHandSideNm > rightHandSideNm ? 'ERROR' : 'OK',
    limitations: Object.freeze([
      'Reproduces the legacy workbook row, including its 3.14 literal; not the exact relation.',
      'PR, G, FM and PD are workbook cell values, not governed master data.',
      'No Code compliance or design authority is claimed.',
    ]),
    canUseForDesignAuthority: false,
  });
}
