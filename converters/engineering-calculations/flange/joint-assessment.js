/**
 * Per-load-case flange joint assessment.
 *
 * Carries a six-DOF load state at a model node through to a UG-44(b) result:
 *
 *   identity -> transport (M + r x F) -> resolve -> governed masters -> kernel
 *
 * The moment basis is reported on every row. A six-DOF state is resolved into
 * its actual components; the workbook scenario is an equal-orthogonal envelope.
 * The two coincide only when the orthogonal components are equal, so rows
 * produced under different bases are not directly comparable and must not be
 * presented as though they were.
 */

import { resolveFlangeOpeningLoads, transportMomentToJointFace } from './joint-loads.js';
import { resolveUg44MasterInputs } from './ug44-master-resolver.js';
import { calculateUg44RatedFlange } from './ug44.js';
import { designPressureWithStaticHeadPa, resolveEqualOrthogonalMomentNm } from './ug44-workbook-basis.js';
import { MOMENT_BASES, masterSelectorsFor, normalizeJoint } from './joint-records.js';

function failed(identity, loadCaseName, code, message, details = {}) {
  return Object.freeze({
    ok: false,
    identity,
    loadCase: loadCaseName,
    code,
    message,
    details,
    canUseForDesignAuthority: false,
  });
}

/** Flange-face loads for one case, with the transport and resolution recorded. */
export function resolveLoadCaseFaceLoads(loadCase) {
  if (loadCase.momentBasis === MOMENT_BASES.EQUAL_ORTHOGONAL_SCENARIO) {
    const scenario = resolveEqualOrthogonalMomentNm({ componentMomentNm: loadCase.componentMomentNm });
    return Object.freeze({
      momentBasis: loadCase.momentBasis,
      bendingMomentNm: scenario.resolvedMomentNm,
      openingAxialForceN: loadCase.openingAxialForceN,
      torsionalMomentNm: null,
      transverseShearN: null,
      transportApplied: false,
      isGeneralComponentResolution: false,
    });
  }

  const transported = transportMomentToJointFace({
    forceN: loadCase.forceN,
    momentNm: loadCase.momentNm,
    offsetM: loadCase.offsetM,
  });
  const resolved = resolveFlangeOpeningLoads({
    forceN: loadCase.forceN,
    momentNm: transported,
    openingAxis: loadCase.openingAxis,
  });
  const offset = loadCase.offsetM;

  return Object.freeze({
    momentBasis: loadCase.momentBasis,
    bendingMomentNm: resolved.bendingMomentNm,
    openingAxialForceN: resolved.openingAxialForceN,
    torsionalMomentNm: resolved.torsionalMomentNm,
    transverseShearN: resolved.transverseShearN,
    transportApplied: offset.x !== 0 || offset.y !== 0 || offset.z !== 0,
    transportedMomentNm: transported,
    isGeneralComponentResolution: true,
  });
}

function designPressureFor(loadCase) {
  if (loadCase.specificGravity === undefined && loadCase.liquidHeightM === undefined) {
    return { designPressurePa: loadCase.designPressurePa, staticHeadPa: 0, basis: 'DIRECT_INPUT' };
  }
  const withHead = designPressureWithStaticHeadPa({
    designPressurePa: loadCase.designPressurePa,
    specificGravity: loadCase.specificGravity ?? 0,
    liquidHeightM: loadCase.liquidHeightM ?? 0,
  });
  return {
    designPressurePa: withHead.designPressureWithStaticHeadPa,
    staticHeadPa: withHead.staticHeadPa,
    basis: withHead.basis,
  };
}

export function assessJointLoadCase({ joint, loadCase, masters }) {
  const faceLoads = resolveLoadCaseFaceLoads(loadCase);
  const pressure = designPressureFor(loadCase);

  let result;
  try {
    result = calculateUg44RatedFlange({
      ratedPressurePa: masters.values.ratedPressurePa,
      designPressurePa: pressure.designPressurePa,
      gasketReactionDiameterM: masters.values.gasketReactionDiameterM,
      momentFactor: masters.values.momentFactor,
      bendingMomentNm: faceLoads.bendingMomentNm,
      openingAxialForceN: faceLoads.openingAxialForceN,
    });
  } catch (error) {
    return failed(joint.identity, loadCase.name, error.code ?? 'INPUT_INVALID', error.message);
  }

  return Object.freeze({
    ok: true,
    identity: joint.identity,
    loadCase: loadCase.name,
    nominalSizeIn: joint.nominalSizeIn,
    pressureClass: joint.pressureClass,
    momentBasis: faceLoads.momentBasis,
    faceLoads,
    designPressure: pressure,
    masters: Object.freeze({
      values: masters.values,
      recordIds: masters.recordIds,
      sourceIds: masters.sourceIds,
      resolverState: masters.resolverState,
      gasketReactionDiameterBasis: masters.gasketReactionDiameterBasis,
    }),
    result,
    utilization: result.utilization,
    pass: result.pass,
    canUseForDesignAuthority: false,
  });
}

export function assessJoint({ store, joint: input }) {
  let joint;
  try {
    joint = normalizeJoint(input);
  } catch (error) {
    const identity = { jobName: input?.jobName ?? '', elementId: input?.elementId ?? '', toNode: input?.toNode ?? '', jointKey: '' };
    return failed(identity, null, error.code ?? 'INPUT_INVALID', error.message, { field: error.field });
  }

  const masters = resolveUg44MasterInputs(store, masterSelectorsFor(joint));
  if (!masters.ok) {
    return failed(joint.identity, null, masters.code, masters.message, masters.details);
  }

  const rows = joint.loadCases.map((loadCase) => assessJointLoadCase({ joint, loadCase, masters }));
  return Object.freeze({
    ok: true,
    identity: joint.identity,
    nominalSizeIn: joint.nominalSizeIn,
    pressureClass: joint.pressureClass,
    masters,
    rows: Object.freeze(rows),
    canUseForDesignAuthority: false,
  });
}
