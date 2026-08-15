import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateSbcType3MasterAssistedCandidate,
  createSbcType3MasterAssistedCurveTemplate,
  sbcT3BranchLengthKey,
  sbcT3ParentScheduleKey,
} from '../converters/vibration/sbc/type3-master-assisted.js';
import { combineSbcType3Terms } from '../converters/vibration/sbc/type3-user-data.js';

function d7Physical() {
  return {
    firstSpanHasUnsupportedMass: true,
    fittingKey: 'WELDOLET',
    branchLengthMm: 700,
    valvePressureClass: 600,
    valveConfiguration: 'ONE_VALVE_OR_INTEGRAL_DBB',
    parentSchedule: 120,
    sbcMinDiameterIn: 1.5,
    firstSpanLengthM: 0.9,
    subsequentMassSpanM: 2.3,
    subsequentNoMassSpanM: 1.4,
  };
}

function completedRows(template, values) {
  return template.map((row, index) => ({
    ...row,
    value: String(values[index]),
    sourceReference: 'EI worked-example/manual curve read',
  }));
}

test('physical selector rules preserve source boundaries', () => {
  assert.equal(sbcT3ParentScheduleKey(120), '80');
  assert.equal(sbcT3ParentScheduleKey('Schedule 40'), '40');
  assert.equal(sbcT3ParentScheduleKey(200), 'GT_160');
  assert.equal(sbcT3BranchLengthKey(200), 'LE_200_MM');
  assert.equal(sbcT3BranchLengthKey(700), 'GT_600_MM');
});

test('master-assisted curve template emits exact D7 manual lookup coordinates', async () => {
  const rows = await createSbcType3MasterAssistedCurveTemplate({
    scopeId: 'D7', physical: d7Physical(),
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].blockerId, 'EI_AVIFF.T3.SBC.FIGURE_T3_1');
  assert.equal(Number(rows[0].xValue), 1.5);
  assert.equal(Number(rows[0].yValue), 0.9 / 0.7);
  assert.equal(rows[1].blockerId, 'EI_AVIFF.T3.SBC.FIGURE_T3_3');
  assert.equal(Number(rows[1].yValue), 2.3);
  assert.equal(rows[2].blockerId, 'EI_AVIFF.T3.SBC.FIGURE_T3_4');
  assert.equal(Number(rows[2].yValue), 1.4);
});

test('D7 master-assisted path reproduces C, E and final Type-3 result', async () => {
  const physical = d7Physical();
  const template = await createSbcType3MasterAssistedCurveTemplate({ scopeId: 'D7', physical });
  const result = await calculateSbcType3MasterAssistedCandidate({
    scopeId: 'D7', physical, userRows: completedRows(template, [0.2, 0.6, 0.2]),
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'CALCULATED_MASTER_ASSISTED_CANDIDATE');
  assert.equal(result.masterAssistance.geometryC, 0.68);
  assert.equal(result.masterAssistance.minimumSpanE, 0.7);
  assert.equal(result.masterAssistance.modifiedMinimumSpanM, 0.63);
  assert.equal(result.firstSpan.geometryLof, 0.7);
  assert.equal(result.firstSpan.locationLof, 1.0);
  assert.equal(result.subsequentSpans.geometryLof, 0.6);
  assert.equal(result.mainline.lof, 1.0);
  assert.equal(result.mainline.multiplier, 1.42);
  assert.equal(result.lof, 0.7);
  assert(result.curveMasterStatus.every((item) => item.status === 'BLOCKED_SOURCE_DATA_CONFLICT'));
  assert.equal(result.authority.screeningAuthority, 'NOT_AUTHORIZED');
});

test('no-mass path uses T3-2 and can calculate location from candidate scores', async () => {
  const physical = {
    firstSpanHasUnsupportedMass: false,
    fittingKey: 'WELDOLET',
    parentSchedule: 40,
    sbcMinDiameterIn: 1.0,
    firstSpanLengthM: 2.0,
    subsequentMassSpanM: 1.0,
    subsequentNoMassSpanM: 1.0,
    locationKey: 'BEND',
  };
  const template = await createSbcType3MasterAssistedCurveTemplate({ scopeId: 'NM', physical });
  assert.equal(template[0].blockerId, 'EI_AVIFF.T3.SBC.FIGURE_T3_2');
  const result = await calculateSbcType3MasterAssistedCandidate({
    scopeId: 'NM', physical, mainlineLof: 0.2,
    userRows: completedRows(template, [0.4, 0.3, 0.2]),
  });
  assert.equal(result.masterAssistance.geometryC, 0);
  assert.equal(result.masterAssistance.minimumSpanE, 0.2);
  assert.equal(result.masterAssistance.locationLof, 0.8);
  assert.equal(result.firstSpan.geometryLof, 0.4);
  assert(Math.abs(result.lof - 0.284) < 1e-12);
});

test('curve user data must match the exact generated x/y coordinate', async () => {
  const physical = d7Physical();
  const template = await createSbcType3MasterAssistedCurveTemplate({ scopeId: 'D7-X', physical });
  const rows = completedRows(template, [0.2, 0.6, 0.2]);
  rows[0] = { ...rows[0], yValue: '1.3' };
  const result = await calculateSbcType3MasterAssistedCandidate({
    scopeId: 'D7-X', physical, userRows: rows,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'NOT_READY');
  assert.equal(result.problems[0].term, 'LOFGEOM(D)');
});

test('unsupported physical master selector fails closed', async () => {
  const physical = { ...d7Physical(), parentSchedule: 5 };
  const result = await calculateSbcType3MasterAssistedCandidate({
    scopeId: 'BAD-SCHEDULE', physical, userRows: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.problems[0].reason, /SBC_T3_PARENT_SCHEDULE_NOT_READY/u);
});

test('shared Type-3 combination seam retains the established worked-example chain', () => {
  const result = combineSbcType3Terms({
    scopeId: 'COMBINE',
    terms: {
      hasMass: true, c: 0.68, d: 0.2, e: 0.7, firstLocation: 1,
      f: 0.6, g: 0.2, mainlineLof: 1, multiplier: 1.42,
    },
  });
  assert.equal(result.firstSpan.modifier, 0.7);
  assert.equal(result.subsequentSpans.modifier, 0.6);
  assert.equal(result.overallModifier, 0.7);
  assert.equal(result.lof, 0.7);
});
