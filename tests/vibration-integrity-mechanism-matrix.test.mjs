import assert from 'node:assert/strict';
import test from 'node:test';
import { sbcFacilityScopeId } from '../converters/vibration/sbc/facility.js';
import { SBC_TYPE3_BLOCKERS } from '../converters/vibration/sbc/type3-user-data.js';
import {
  VIBRATION_INTEGRITY_MECHANISMS,
  buildVibrationMechanismAssessment,
  buildVibrationMechanismMatrixRow,
} from '../tabs/vibration-integrity-mechanisms.js';

function row() {
  return {
    line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1',
    standardLof: 0.34, governingReferenceLof: 0.34,
    referenceBand: 'LOF_0_3_TO_LT_0_5', qualificationState: 'SCREENING',
  };
}

function userRow(scopeId, blockerId, value) {
  return {
    mechanismId: 'smallBoreConnections', blockerId, scopeId, recordKey: 'TYPE3',
    xValue: '', xUnit: '', yValue: '', yUnit: '', value: String(value), unit: '1',
    sourceReference: 'Independent facility test input', notes: '',
  };
}

function sbcRows(targetRow = row()) {
  const scopeId = sbcFacilityScopeId(targetRow);
  return [
    userRow(scopeId, SBC_TYPE3_BLOCKERS.mainlineLof, 1),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.mainlineMultiplier, 1.42),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.firstHasMass, 'TRUE'),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.firstMassGeometryLof, 0.4),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.figureT31, 0.2),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.firstMinimumSpanLof, 0.7),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.firstLocationLof, 1),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.figureT33, 0.6),
    userRow(scopeId, SBC_TYPE3_BLOCKERS.figureT34, 0.2),
  ];
}

test('catalogue exposes FIT screening and SBC candidate without promoting other mechanisms', () => {
  assert.deepEqual(
    VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => mechanism.id),
    [
      'fit','mechanicalExcitation','reciprocatingPulsation','rotatingStall',
      'deadlegPulsation','corrugationPulsation','slugFlow','aiv',
      'valveTransients','cavitationFlashing','thermowells','smallBoreConnections',
    ],
  );
  assert.equal(
    VIBRATION_INTEGRITY_MECHANISMS.filter((item) => item.implementationState !== 'NOT_IMPLEMENTED').length,
    2,
  );
  assert.equal(VIBRATION_INTEGRITY_MECHANISMS[0].implementationState, 'SCREENING');
  assert.equal(VIBRATION_INTEGRITY_MECHANISMS.at(-1).implementationState, 'CANDIDATE_USER_INPUT');
});

test('FIT screening survives the generic contract and SBC without data is input-required', () => {
  const target = row();
  const fit = buildVibrationMechanismAssessment(target, 'fit', { resultState: 'CURRENT_RESULT' });
  const sbc = buildVibrationMechanismAssessment(target, 'smallBoreConnections');
  const aiv = buildVibrationMechanismAssessment(target, 'aiv');
  assert.equal(fit.calculated, true);
  assert.equal(fit.assessmentState, 'CALCULATED_SCREENING');
  assert.equal(fit.implementationState, 'IMPLEMENTED_SCREENING');
  assert.equal(fit.qualificationState, 'SCREENING');
  assert.equal(sbc.calculated, false);
  assert.equal(sbc.assessmentState, 'APPLICABILITY_UNKNOWN');
  assert.equal(sbc.implementationState, 'IMPLEMENTED_CANDIDATE_USER_INPUT');
  assert.equal(sbc.facilityScopeId, 'SBC-FACILITY/L-100/NORMAL/CAN-1');
  assert.deepEqual(sbc.readiness.missing, ['SBC_TYPE3_USER_INPUT_TEMPLATE']);
  assert.equal(aiv.assessmentState, 'NOT_IMPLEMENTED');
  assert.deepEqual(aiv.contractSet.cardinality, { count: 0, kind: 'ZERO' });
});

test('facility-scoped Type-3 project data calculates SBC as candidate only', () => {
  const target = row();
  const sbc = buildVibrationMechanismAssessment(target, 'smallBoreConnections', {
    userEngineeringDataRows: sbcRows(target),
  });
  assert.equal(sbc.calculated, true);
  assert.equal(sbc.assessmentState, 'CALCULATED_CANDIDATE');
  assert.equal(sbc.resultState, 'CURRENT_RESULT');
  assert.equal(sbc.lof, 0.7);
  assert.equal(sbc.qualificationState, 'CANDIDATE_USER_INPUT');
  assert.equal(sbc.contractSet.items[0].qualification.screeningAuthority, 'NOT_AUTHORIZED');
});

test('higher SBC candidate cannot replace authorized FIT screening governing', () => {
  const target = row();
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'CURRENT_RESULT',
    userEngineeringDataRows: sbcRows(target),
  });
  assert.equal(matrix.screeningGoverning.mechanism.id, 'fit');
  assert.equal(matrix.screeningGoverning.lof, 0.34);
  assert.equal(matrix.candidateGoverning.mechanism.id, 'smallBoreConnections');
  assert.equal(matrix.candidateGoverning.lof, 0.7);
  assert.equal(matrix.implementedGoverning.mechanism.id, 'fit');
  assert.equal(matrix.implementedGoverning.lof, 0.34);
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
});

test('stale facility state excludes both screening and candidate values from current governing', () => {
  const target = row();
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'STALE_RESULT',
    userEngineeringDataRows: sbcRows(target),
  });
  assert.equal(matrix.screeningGoverning, null);
  assert.equal(matrix.candidateGoverning, null);
  assert.equal(matrix.implementedGoverning, null);
  assert.equal(matrix.retainedScreeningGoverning.mechanism.id, 'fit');
  assert.equal(matrix.retainedCandidateGoverning.mechanism.id, 'smallBoreConnections');
  assert.equal(matrix.retainedScreeningGoverning.resultState, 'STALE_RESULT');
  assert.equal(matrix.retainedCandidateGoverning.resultState, 'STALE_RESULT');
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
});

test('incomplete SBC data remains fail-closed and does not create a candidate governing value', () => {
  const target = row();
  const rows = sbcRows(target).filter((item) => item.blockerId !== SBC_TYPE3_BLOCKERS.figureT34);
  const matrix = buildVibrationMechanismMatrixRow(target, {
    resultState: 'CURRENT_RESULT', userEngineeringDataRows: rows,
  });
  const sbc = matrix.assessments.find((item) => item.mechanism.id === 'smallBoreConnections');
  assert.equal(sbc.calculated, false);
  assert.equal(sbc.assessmentState, 'APPLICABLE_INCOMPLETE');
  assert.ok(sbc.readiness.missing.includes('LOFGEOM(G)'));
  assert.equal(matrix.candidateGoverning, null);
  assert.equal(matrix.screeningGoverning.mechanism.id, 'fit');
});

test('unknown mechanisms fail closed', () => {
  assert.throws(
    () => buildVibrationMechanismAssessment(row(), 'not-a-mechanism'),
    /Unknown vibration mechanism/u,
  );
});
