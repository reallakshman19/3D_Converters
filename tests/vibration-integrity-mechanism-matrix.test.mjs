import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VIBRATION_INTEGRITY_MECHANISMS,
  buildVibrationMechanismAssessment,
  buildVibrationMechanismMatrixRow,
} from '../tabs/vibration-integrity-mechanisms.js';

function row() {
  return {
    line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1',
    standardLof: 0.34, governingReferenceLof: 0.34,
    referenceBand: 'LOF_0_3_TO_LT_0_5', qualificationState: 'BENCHMARK_ONLY',
  };
}

test('mechanism catalogue matches the EI worked-example screening columns', () => {
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
    1,
  );
  assert.equal(VIBRATION_INTEGRITY_MECHANISMS[0].implementationState, 'BENCHMARK_ONLY');
});

test('FIT consumes the generic mechanism contract while non-FIT keeps zero child items', () => {
  const fit = buildVibrationMechanismAssessment(row(), 'fit', { resultState: 'CURRENT_RESULT' });
  const aiv = buildVibrationMechanismAssessment(row(), 'aiv', { resultState: 'CURRENT_RESULT' });
  assert.equal(fit.calculated, true);
  assert.equal(fit.lof, 0.34);
  assert.equal(fit.assessmentState, 'CALCULATED_BENCHMARK');
  assert.equal(fit.contractSet.cardinality.kind, 'ONE');
  assert.equal(fit.itemId, '["fit","L-100","NORMAL","CAN-1","mainline"]');
  assert.equal(aiv.calculated, false);
  assert.equal(aiv.lof, null);
  assert.equal(aiv.assessmentState, 'NOT_IMPLEMENTED');
  assert.deepEqual(aiv.contractSet.cardinality, { count: 0, kind: 'ZERO' });
});

test('stale FIT values remain inspectable but cannot be the current implemented governing result', () => {
  const matrix = buildVibrationMechanismMatrixRow(row(), { resultState: 'STALE_RESULT' });
  assert.equal(matrix.implementedGoverning, null);
  assert.equal(matrix.retainedImplementedGoverning.mechanism.id, 'fit');
  assert.equal(matrix.retainedImplementedGoverning.lof, 0.34);
  assert.equal(matrix.retainedImplementedGoverning.resultState, 'STALE_RESULT');
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
});

test('current implemented governing result never claims a complete vibration screening result', () => {
  const matrix = buildVibrationMechanismMatrixRow({ ...row(), governingReferenceLof: 3.12 }, { resultState: 'CURRENT_RESULT' });
  assert.equal(matrix.implementedGoverning.mechanism.id, 'fit');
  assert.equal(matrix.implementedGoverning.lof, 3.12);
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
  assert(matrix.assessments.every((assessment) => (
    assessment.mechanism.id === 'fit' || assessment.assessmentState === 'NOT_IMPLEMENTED'
  )));
});

test('unknown mechanisms fail closed', () => {
  assert.throws(
    () => buildVibrationMechanismAssessment(row(), 'not-a-mechanism'),
    /Unknown vibration mechanism/u,
  );
});
