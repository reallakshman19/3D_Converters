import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VIBRATION_INTEGRITY_MECHANISMS,
  buildVibrationMechanismAssessment,
  buildVibrationMechanismMatrixRow,
} from '../tabs/vibration-integrity-mechanisms.js';

test('mechanism catalogue matches the EI worked-example screening columns', () => {
  assert.deepEqual(
    VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => mechanism.id),
    [
      'fit',
      'mechanicalExcitation',
      'reciprocatingPulsation',
      'rotatingStall',
      'deadlegPulsation',
      'corrugationPulsation',
      'slugFlow',
      'aiv',
      'valveTransients',
      'cavitationFlashing',
      'thermowells',
      'smallBoreConnections',
    ],
  );
  assert.equal(
    VIBRATION_INTEGRITY_MECHANISMS.filter((item) => item.implementationState !== 'NOT_IMPLEMENTED').length,
    1,
  );
  assert.equal(VIBRATION_INTEGRITY_MECHANISMS[0].implementationState, 'BENCHMARK_ONLY');
});

test('FIT is the only mechanism allowed to project a current calculation', () => {
  const row = {
    standardLof: 0.34,
    governingReferenceLof: 0.34,
    referenceBand: 'LOF_LT_1',
    qualificationState: 'BENCHMARK_ONLY',
  };
  const fit = buildVibrationMechanismAssessment(row, 'fit');
  const aiv = buildVibrationMechanismAssessment(row, 'aiv');
  assert.equal(fit.calculated, true);
  assert.equal(fit.lof, 0.34);
  assert.equal(fit.assessmentState, 'CALCULATED_BENCHMARK');
  assert.equal(aiv.calculated, false);
  assert.equal(aiv.lof, null);
  assert.equal(aiv.assessmentState, 'NOT_IMPLEMENTED');
});

test('implemented governing result never claims a complete vibration screening result', () => {
  const matrix = buildVibrationMechanismMatrixRow({
    standardLof: 3.12,
    governingReferenceLof: 3.12,
    referenceBand: 'LOF_GE_1',
  });
  assert.equal(matrix.implementedGoverning.mechanism.id, 'fit');
  assert.equal(matrix.implementedGoverning.lof, 3.12);
  assert.equal(matrix.fullScreeningGoverningEstablished, false);
  assert(matrix.assessments.every((assessment) => (
    assessment.mechanism.id === 'fit' || assessment.assessmentState === 'NOT_IMPLEMENTED'
  )));
});

test('unknown mechanisms fail closed', () => {
  assert.throws(
    () => buildVibrationMechanismAssessment({}, 'not-a-mechanism'),
    /Unknown vibration mechanism/u,
  );
});
