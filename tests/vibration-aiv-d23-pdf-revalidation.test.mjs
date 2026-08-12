import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIV_D23_PDF_REVALIDATION,
  AIV_EI_EXAMPLES_PDF_SOURCE,
} from '../converters/vibration/aiv/aiv-d23-pdf-revalidation.js';

function sourcePwl({ p1PaAbs, p2PaAbs, massFlowKgS, temperatureK, molecularWeight, sffDb = 0 }) {
  return 10 * Math.log10(
    (((p1PaAbs - p2PaAbs) / p1PaAbs) ** 3.6)
    * (massFlowKgS ** 2)
    * ((temperatureK / molecularWeight) ** 1.2),
  ) + 126.1 + sffDb;
}

function flm1(diameterRatio) {
  return -0.07
    + 0.91 * diameterRatio
    + 1.32 / diameterRatio
    - 0.48 * (diameterRatio ** 1.5)
    + 0.065 * (diameterRatio ** 2);
}

function flm2(pwlDb) {
  return 0.29 + 0.09 * Math.tanh((pwlDb - 172) / 2.9);
}

test('EI examples PDF source identity is pinned exactly', () => {
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.repository, 'reallaksh19/Common');
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.commit, 'fb549185b9b27edc2379734240320a85c5bef9f6');
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.path, 'EI examples.pdf');
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.gitBlob, '1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec');
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.sizeBytes, 1602640);
  assert.equal(AIV_EI_EXAMPLES_PDF_SOURCE.productionAuthority, false);
});

test('relief and recycle published source PWL values reproduce from the displayed inputs', () => {
  const relief = sourcePwl({
    p1PaAbs: 9.9e6,
    p2PaAbs: 0.1e6,
    massFlowKgS: 53482 / 3600,
    temperatureK: 137 + 273.15,
    molecularWeight: 21.75,
  });
  const recycle = sourcePwl({
    p1PaAbs: 8.8e6,
    p2PaAbs: 2.6e6,
    massFlowKgS: 53482 / 3600,
    temperatureK: 136.7 + 273.15,
    molecularWeight: 21.75,
  });
  assert(Math.abs(relief - 164.7) <= 0.05, `relief PWL ${relief}`);
  assert(Math.abs(recycle - 159.4) <= 0.05, `recycle PWL ${recycle}`);
});

test('relief attenuation and weldolet downstream chain reproduce the published final LOF disposition', () => {
  const item = AIV_D23_PDF_REVALIDATION.reliefFirstDiscontinuity;
  const attenuationDb = 60 * 0.8 / 154;
  assert(Math.abs(attenuationDb - item.published.attenuationDb) < 0.001);
  assert.equal(item.published.assessmentPwlDb, 164.4);

  const ratio = 168.3 / 60.3;
  const calculatedFlm1 = flm1(ratio);
  const calculatedFlm2 = flm2(164.4);
  const nAfterFlm1 = 7.99e9 * calculatedFlm1;
  const nAfterFlm2 = nAfterFlm1 * calculatedFlm2;
  const lf = -0.1303 * Math.log(nAfterFlm2) + 3.1;
  const lof = lf >= 0.5 ? Math.min(1, Math.max(0, lf)) : 0.29;

  assert(Math.abs(calculatedFlm2 - 0.2009) < 0.0001);
  assert(Math.abs(lf - 0.31) < 0.01);
  assert.equal(lof, 0.29);
  assert.equal(item.published.LOF, 0.29);
});

test('published FLM1 value remains an explicit arithmetic reconciliation gap', () => {
  const item = AIV_D23_PDF_REVALIDATION.reliefFirstDiscontinuity;
  const calculated = flm1(168.3 / 60.3);
  assert(Math.abs(calculated - 1.2109758194311824) < 1e-12);
  assert.equal(item.published.FLM1, 1.2133);
  assert(Math.abs(calculated - item.published.FLM1) > 0.002);
  assert.equal(item.arithmeticReconciliation.state, 'OPEN');
  assert.equal(item.arithmeticReconciliation.consequence, 'FINAL_LOF_UNCHANGED_AT_0_29');
  assert.equal(AIV_D23_PDF_REVALIDATION.authority.productionEquationAuthorized, false);
});
