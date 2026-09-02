import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFlangeMasterStore } from '../converters/engineering-calculations/flange/master-dataset.js';
import { MOMENT_BASES, masterSelectorsFor, normalizeJoint } from '../converters/engineering-calculations/flange/joint-records.js';
import { assessJoint, resolveLoadCaseFaceLoads } from '../converters/engineering-calculations/flange/joint-assessment.js';
import { envelopeJoint, envelopeJoints, selectGoverningRow } from '../converters/engineering-calculations/flange/joint-envelope.js';
import { renderFlangeJointAssessmentHtml } from '../tabs/engineering-calculation-flange-joint-surface.js';

const store = buildFlangeMasterStore();

const BASE_JOINT = {
  jobName: 'SOR2', elementId: 'E-101', toNode: '90', nominalSizeIn: 2, pressureClass: 150,
};

function joint(overrides = {}) {
  return { ...BASE_JOINT, ...overrides };
}

function assess(input) {
  return assessJoint({ store, joint: input });
}

const THREE_CASES = joint({
  loadCases: [
    { name: 'DESIGN', forceN: { z: 550 }, momentNm: { x: 145, y: 145 }, designPressurePa: 710_000 },
    { name: 'SUSTAINED', forceN: { z: 400 }, momentNm: { x: 100, y: 100 }, designPressurePa: 710_000 },
    { name: 'OFFSET', forceN: { z: 550, y: 200 }, momentNm: { x: 145, y: 145 }, offsetM: { x: 0.5 }, designPressurePa: 710_000 },
  ],
});

test('joint identity is carried through to every assessed row', () => {
  const assessment = assess(THREE_CASES);
  assert.equal(assessment.ok, true);
  assert.equal(assessment.rows.length, 3);

  for (const row of assessment.rows) {
    assert.equal(row.identity.jobName, 'SOR2');
    assert.equal(row.identity.elementId, 'E-101');
    assert.equal(row.identity.toNode, '90');
    assert.equal(row.identity.jointKey, 'SOR2/E-101/90');
  }
});

test('governed masters supply G, PR and FM, with G derived not stored', () => {
  const assessment = assess(THREE_CASES);
  const { values } = assessment.masters;

  assert.ok(Math.abs(values.gasketReactionDiameterM - 0.0779) < 1e-12);
  assert.equal(values.ratedPressurePa, 1_770_000);
  assert.equal(values.momentFactor, 1.2);
  assert.equal(assessment.masters.gasketReactionDiameterBasis, 'WORKBOOK_MEAN_GASKET_CONTACT_DIAMETER');
  assert.equal(assessment.masters.resolverState, 'SOURCE_PENDING');
  assert.equal(assessment.masters.canUseForDesignAuthority, false);
});

test('master selectors key on the joint size and class', () => {
  const selectors = masterSelectorsFor(normalizeJoint(THREE_CASES));
  assert.deepEqual(selectors.flangeRating, { pressureClass: 150 });
  assert.deepEqual(selectors.momentFactor, { nominalSizeIn: 2, pressureClass: 150 });
  assert.deepEqual(selectors.gasketGeometry, { nominalSizeIn: 2, pressureClass: 150 });
});

test('moment transport applies r x F and can reduce the resultant bending', () => {
  const assessment = assess(THREE_CASES);
  const design = assessment.rows.find((row) => row.loadCase === 'DESIGN');
  const offset = assessment.rows.find((row) => row.loadCase === 'OFFSET');

  assert.equal(design.faceLoads.transportApplied, false);
  assert.equal(offset.faceLoads.transportApplied, true);

  // r = (0.5,0,0), F = (0,200,550): My becomes 145 - 0.5*550 = -130, so the
  // resultant bending falls even though a force component was added.
  assert.ok(Math.abs(offset.faceLoads.transportedMomentNm.y + 130) < 1e-9);
  assert.ok(Math.abs(offset.faceLoads.transportedMomentNm.z - 100) < 1e-9);
  assert.ok(offset.faceLoads.bendingMomentNm < design.faceLoads.bendingMomentNm);
});

test('a closing axial load contributes no opening force', () => {
  const assessment = assess(joint({
    loadCases: [{ name: 'CLOSING', forceN: { z: -5_000 }, momentNm: { x: 100 }, designPressurePa: 710_000 }],
  }));
  assert.equal(assessment.rows[0].faceLoads.openingAxialForceN, 0);
});

test('torsion and shear are resolved but do not enter the bending term', () => {
  const assessment = assess(joint({
    loadCases: [{
      name: 'TORSION', forceN: { x: 300, y: 400, z: 550 },
      momentNm: { x: 145, y: 145, z: 900 }, designPressurePa: 710_000,
    }],
  }));
  const row = assessment.rows[0];

  assert.equal(row.faceLoads.torsionalMomentNm, 900);
  assert.equal(row.faceLoads.transverseShearN, 500);
  assert.ok(Math.abs(row.faceLoads.bendingMomentNm - Math.hypot(145, 145)) < 1e-9);
});

test('the envelope selects the highest-utilization case, not the largest moment', () => {
  // SUSTAINED carries the smaller moment but a much higher design pressure.
  const assessment = assess(joint({
    loadCases: [
      { name: 'DESIGN', forceN: { z: 550 }, momentNm: { x: 145, y: 145 }, designPressurePa: 710_000 },
      { name: 'SUSTAINED', forceN: { z: 100 }, momentNm: { x: 50, y: 50 }, designPressurePa: 2_600_000 },
    ],
  }));
  const envelope = envelopeJoint(assessment);
  const design = assessment.rows.find((row) => row.loadCase === 'DESIGN');
  const sustained = assessment.rows.find((row) => row.loadCase === 'SUSTAINED');

  assert.ok(sustained.faceLoads.bendingMomentNm < design.faceLoads.bendingMomentNm);
  assert.ok(sustained.utilization > design.utilization);
  assert.equal(envelope.governingLoadCase, 'SUSTAINED');
  assert.equal(envelope.governingUtilization, sustained.utilization);
  assert.equal(envelope.pass, true, 'the governing case still passes; governing is not the same as failing');
});

test('static head reaches the design pressure of a load case', () => {
  const assessment = assess(joint({
    loadCases: [{
      name: 'HEAD', forceN: { z: 550 }, momentNm: { x: 145, y: 145 },
      designPressurePa: 710_000, specificGravity: 1, liquidHeightM: 10,
    }],
  }));
  const row = assessment.rows[0];

  assert.ok(Math.abs(row.designPressure.staticHeadPa - 98_066.5) < 1e-6);
  assert.ok(Math.abs(row.designPressure.designPressurePa - 808_066.5) < 1e-6);
  assert.equal(row.designPressure.basis, 'WORKBOOK_DESIGN_PRESSURE_PLUS_STATIC_HEAD');
});

// --- moment basis -----------------------------------------------------------

test('the workbook scenario basis is recorded as an envelope, not a resolution', () => {
  const faceLoads = resolveLoadCaseFaceLoads({
    momentBasis: MOMENT_BASES.EQUAL_ORTHOGONAL_SCENARIO,
    componentMomentNm: 145,
    openingAxialForceN: 550,
  });

  assert.equal(faceLoads.isGeneralComponentResolution, false);
  assert.ok(Math.abs(faceLoads.bendingMomentNm - 145 * Math.SQRT2) < 1e-12);
  assert.equal(faceLoads.transportApplied, false);
  assert.equal(faceLoads.torsionalMomentNm, null);
});

test('the two bases agree only when the orthogonal components are equal', () => {
  const equal = assess(joint({
    loadCases: [
      { name: 'RESOLVED', forceN: { z: 550 }, momentNm: { x: 145, y: 145 }, designPressurePa: 710_000 },
    ],
  })).rows[0];
  const scenario = assess(joint({
    loadCases: [{ name: 'SCENARIO', componentMomentNm: 145, openingAxialForceN: 550, designPressurePa: 710_000 }],
  })).rows[0];
  const unequal = assess(joint({
    loadCases: [{ name: 'UNEQUAL', forceN: { z: 550 }, momentNm: { x: 145, y: 0 }, designPressurePa: 710_000 }],
  })).rows[0];

  assert.ok(Math.abs(equal.faceLoads.bendingMomentNm - scenario.faceLoads.bendingMomentNm) < 1e-12);
  assert.ok(unequal.faceLoads.bendingMomentNm < scenario.faceLoads.bendingMomentNm);
});

test('a joint mixing bases is flagged rather than ranked across them', () => {
  const assessment = assess(joint({
    loadCases: [
      { name: 'RESOLVED', forceN: { z: 550 }, momentNm: { x: 145, y: 145 }, designPressurePa: 710_000 },
      { name: 'SCENARIO', componentMomentNm: 145, openingAxialForceN: 550, designPressurePa: 710_000 },
    ],
  }));
  const envelope = envelopeJoint(assessment);

  assert.equal(envelope.momentBasis, 'MIXED');
  assert.equal(envelope.momentBasisComparable, false);
  assert.match(renderFlangeJointAssessmentHtml({
    envelope: envelopeJoints([assessment]), assessments: [assessment],
  }), /Mixed moment bases/u);
});

// --- failure handling -------------------------------------------------------

test('an unknown size or class fails closed without inventing a master value', () => {
  const assessment = assess(joint({
    nominalSizeIn: 5,
    loadCases: [{ name: 'DESIGN', forceN: { z: 550 }, momentNm: { x: 145 }, designPressurePa: 710_000 }],
  }));

  assert.equal(assessment.ok, false);
  assert.match(assessment.code, /MASTER/u);
  assert.equal(assessment.canUseForDesignAuthority, false);
});

test('malformed joints and load cases fail closed', () => {
  assert.equal(assess(joint({ loadCases: [] })).ok, false);
  assert.equal(assess({ ...BASE_JOINT, jobName: '', loadCases: [{ name: 'A', forceN: {}, designPressurePa: 0 }] }).ok, false);

  const both = assess(joint({
    loadCases: [{
      name: 'BOTH', forceN: { z: 1 }, momentNm: { x: 1 }, componentMomentNm: 1,
      openingAxialForceN: 1, designPressurePa: 710_000,
    }],
  }));
  assert.equal(both.ok, false);
  assert.match(both.message, /not both/u);

  const duplicate = assess(joint({
    loadCases: [
      { name: 'A', forceN: { z: 1 }, momentNm: { x: 1 }, designPressurePa: 1 },
      { name: 'A', forceN: { z: 2 }, momentNm: { x: 2 }, designPressurePa: 1 },
    ],
  }));
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.message, /Duplicate load case/u);
});

test('selectGoverningRow ignores rows that could not be assessed', () => {
  assert.equal(selectGoverningRow([]), null);
  assert.equal(selectGoverningRow([{ ok: false, utilization: 99 }]), null);
});

// --- multi-joint envelope and surface ---------------------------------------

test('the multi-joint envelope reports the worst joint across the set', () => {
  const light = assess(joint({
    toNode: '100',
    loadCases: [{ name: 'DESIGN', forceN: { z: 50 }, momentNm: { x: 20, y: 20 }, designPressurePa: 710_000 }],
  }));
  const heavy = assess(THREE_CASES);
  const envelope = envelopeJoints([light, heavy]);

  assert.equal(envelope.jointCount, 2);
  assert.equal(envelope.assessedCount, 2);
  assert.equal(envelope.governingJoint, 'SOR2/E-101/90');
  assert.ok(envelope.governingUtilization > 0.7);
});

test('the surface renders the workbook Sheet2 record shape with the governing case marked', () => {
  const assessment = assess(THREE_CASES);
  const html = renderFlangeJointAssessmentHtml({
    envelope: envelopeJoints([assessment]), assessments: [assessment],
  });

  for (const header of ['Job', 'Element', 'Node', 'Size', 'Class', 'Load case', 'ME (N·m)', 'FE (N)', 'G (mm)', 'PR (kPa)', 'PD (kPa)', 'FM', 'Utilization']) {
    assert.ok(html.includes(`<th>${header}</th>`), `missing column ${header}`);
  }
  assert.match(html, /SOR2\/E-101\/90/u);
  assert.match(html, /DESIGN ★/u);
  assert.match(html, /is-governing/u);
  assert.match(html, /Resolved components/u);
});

test('the surface states the authority boundary and the envelope limitation', () => {
  const assessment = assess(THREE_CASES);
  const html = renderFlangeJointAssessmentHtml({
    envelope: envelopeJoints([assessment]), assessments: [assessment],
  });

  assert.match(html, /ENGINEERING_SANDBOX master records/u);
  assert.match(html, /Nothing here is Code compliance, design authority or governing eligibility/u);
  assert.match(html, /the worst of those supplied, not a complete load set/u);
});

test('the surface renders an empty state and a not-assessed joint safely', () => {
  assert.match(renderFlangeJointAssessmentHtml({}), /No joints assessed yet/u);

  const bad = assess(joint({ nominalSizeIn: 5, loadCases: [{ name: 'D', forceN: { z: 1 }, momentNm: { x: 1 }, designPressurePa: 1 }] }));
  const html = renderFlangeJointAssessmentHtml({ envelope: envelopeJoints([bad]), assessments: [bad] });
  assert.match(html, /Joint not assessed/u);
});
