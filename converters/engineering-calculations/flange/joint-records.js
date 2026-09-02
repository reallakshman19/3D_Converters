/**
 * Joint identity and load-case records for the flange joint assessment.
 *
 * The record shape follows the one the source workbook already defines in its
 * hidden `Sheet2`:
 *
 *   JOBNAME | ELEMENTID | TO_NODE | SIZE | Rating | ME Resolved | FE | G | PR | PD | FM | LHS | RHS
 *
 * Identity is carried through the whole pipeline so every assessed row can be
 * traced back to the model node it came from.
 */

export const MOMENT_BASES = Object.freeze({
  COMPONENT_RESOLUTION: 'COMPONENT_RESOLUTION',
  EQUAL_ORTHOGONAL_SCENARIO: 'WORKBOOK_EQUAL_ORTHOGONAL_COMPONENT_SCENARIO',
});

function recordError(message, field) {
  const error = new TypeError(message);
  error.code = 'INPUT_INVALID';
  error.field = field;
  return error;
}

function text(value, field, { required = true } = {}) {
  const value_ = String(value ?? '').trim();
  if (!value_ && required) throw recordError(`${field} is required.`, field);
  return value_;
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw recordError(`${field} must be a finite number.`, field);
  return number;
}

function positive(value, field) {
  const number = finite(value, field);
  if (!(number > 0)) throw recordError(`${field} must be greater than zero.`, field);
  return number;
}

function nonNegative(value, field) {
  const number = finite(value, field);
  if (number < 0) throw recordError(`${field} must be zero or greater.`, field);
  return number;
}

function vector(value = {}, field) {
  return Object.freeze({
    x: finite(value.x ?? 0, `${field}.x`),
    y: finite(value.y ?? 0, `${field}.y`),
    z: finite(value.z ?? 0, `${field}.z`),
  });
}

export function jointIdentity(input = {}) {
  const jobName = text(input.jobName, 'jobName');
  const elementId = text(input.elementId, 'elementId');
  const toNode = text(input.toNode, 'toNode');
  return Object.freeze({
    jobName,
    elementId,
    toNode,
    jointKey: `${jobName}/${elementId}/${toNode}`,
  });
}

/**
 * A load case either supplies a full six-DOF state, which is resolved into
 * components, or the workbook's single moment magnitude, which is an
 * equal-orthogonal-component envelope rather than a resolution. Supplying both
 * is an error: the two describe different things and neither should silently win.
 */
export function normalizeLoadCase(input = {}) {
  const name = text(input.name, 'name');
  const hasSixDof = input.forceN !== undefined || input.momentNm !== undefined;
  const hasScenario = input.componentMomentNm !== undefined;

  if (hasSixDof && hasScenario) {
    throw recordError(
      'Supply either a six-DOF load state or a componentMomentNm scenario, not both.',
      'componentMomentNm',
    );
  }
  if (!hasSixDof && !hasScenario) {
    throw recordError('A load case needs either forceN/momentNm or componentMomentNm.', 'forceN');
  }

  const common = {
    name,
    designPressurePa: nonNegative(input.designPressurePa, 'designPressurePa'),
    specificGravity: input.specificGravity === undefined
      ? undefined
      : nonNegative(input.specificGravity, 'specificGravity'),
    liquidHeightM: input.liquidHeightM === undefined
      ? undefined
      : nonNegative(input.liquidHeightM, 'liquidHeightM'),
  };

  if (hasScenario) {
    return Object.freeze({
      ...common,
      momentBasis: MOMENT_BASES.EQUAL_ORTHOGONAL_SCENARIO,
      componentMomentNm: nonNegative(input.componentMomentNm, 'componentMomentNm'),
      openingAxialForceN: nonNegative(input.openingAxialForceN, 'openingAxialForceN'),
    });
  }

  return Object.freeze({
    ...common,
    momentBasis: MOMENT_BASES.COMPONENT_RESOLUTION,
    forceN: vector(input.forceN, 'forceN'),
    momentNm: vector(input.momentNm, 'momentNm'),
    offsetM: vector(input.offsetM, 'offsetM'),
    openingAxis: ['positive-z', 'negative-z'].includes(input.openingAxis ?? 'positive-z')
      ? (input.openingAxis ?? 'positive-z')
      : (() => { throw recordError('openingAxis must be positive-z or negative-z.', 'openingAxis'); })(),
  });
}

export function normalizeJoint(input = {}) {
  const identity = jointIdentity(input);
  const cases = Array.isArray(input.loadCases) ? input.loadCases : [];
  if (!cases.length) throw recordError('A joint needs at least one load case.', 'loadCases');

  const names = new Set();
  const loadCases = cases.map((item) => {
    const loadCase = normalizeLoadCase(item);
    if (names.has(loadCase.name)) {
      throw recordError(`Duplicate load case name: ${loadCase.name}.`, 'loadCases');
    }
    names.add(loadCase.name);
    return loadCase;
  });

  return Object.freeze({
    identity,
    nominalSizeIn: positive(input.nominalSizeIn, 'nominalSizeIn'),
    pressureClass: positive(input.pressureClass, 'pressureClass'),
    loadCases: Object.freeze(loadCases),
  });
}

export function masterSelectorsFor(joint) {
  return Object.freeze({
    flangeRating: { pressureClass: joint.pressureClass },
    momentFactor: { nominalSizeIn: joint.nominalSizeIn, pressureClass: joint.pressureClass },
    gasketGeometry: { nominalSizeIn: joint.nominalSizeIn, pressureClass: joint.pressureClass },
  });
}
