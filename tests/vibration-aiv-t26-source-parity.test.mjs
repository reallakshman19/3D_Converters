import assert from 'node:assert/strict';
import test from 'node:test';

import { createAivAssumptionProfile } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { validateAivScreeningProfile } from '../converters/vibration/aiv/aiv-screening-profile.js';
import {
  AIV_T26_SOURCE_BINDING,
  calculateAivT26Discontinuity,
  validateAivT26Assessment,
} from '../converters/vibration/aiv/aiv-t26.js';

function approx(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}

function assessment(overrides = {}) {
  return {
    assessmentCanonicalId: 'AIV-T26-TEST',
    assessmentType: 'WELDOLET',
    mainOutsideDiameter: { value: 168.3, unit: 'mm' },
    mainInsideDiameter: { value: 154, unit: 'mm' },
    mainWallThickness: { value: 7.11, unit: 'mm' },
    branchOutsideDiameter: { value: 60.3, unit: 'mm' },
    material: 'CARBON_STEEL',
    duplexState: 'NO',
    ...overrides,
  };
}

test('T2.6 source binding pins merged PR1289 source authority', () => {
  assert.equal(AIV_T26_SOURCE_BINDING.sourceMergeCommit, 'ca53d589b79fc34f5a5616c0ce7de00e06c13df4');
  assert.equal(AIV_T26_SOURCE_BINDING.sourceFlowchartBlob, '176d98565f582983c78868aa6210848a16f75881');
  assert.equal(AIV_T26_SOURCE_BINDING.productionReleaseQualificationRequired, true);
  assert.equal(AIV_T26_SOURCE_BINDING.designAuthority, false);
});

test('T2.6 independently reproduces the D.2.3 source-calculated a/s/B chain', () => {
  const result = calculateAivT26Discontinuity({
    pointPwlDb: 164.3883116883117,
    assessment: assessment(),
  });
  approx(result.A, 0.9398945187723486, 1e-12, 'A');
  approx(result.S, 68.22911392405064, 1e-12, 'S');
  approx(result.B, 152.2067364535756, 1e-9, 'B');
  approx(result.log10N, 9.902644470587115, 1e-10, 'log10N');
  approx(result.N, 7991797506.05151, 2, 'N');
  approx(result.FLM1, 1.2109758194311824, 1e-12, 'FLM1');
  assert.equal(result.FLM1Mode, 'SOURCE_CALCULATED');
  assert.equal(result.FLM2Applied, true);
  assert.equal(result.FLM3Applied, false);
  approx(result.lof, 0.29, 1e-12, 'LOF');
});

test('T2.6 applies the >=10 FLM1 branch, skips FLM2 for welded tee, and applies Duplex FLM3', () => {
  const result = calculateAivT26Discontinuity({
    pointPwlDb: 172,
    assessment: assessment({
      assessmentType: 'WELDED_TEE',
      branchOutsideDiameter: { value: 10, unit: 'mm' },
      duplexState: 'YES',
    }),
  });
  assert.equal(result.FLM1, 0.5);
  assert.equal(result.FLM2Applied, false);
  assert.equal(result.FLM2, 1);
  assert.equal(result.FLM3Applied, true);
  assert.equal(result.FLM3, 0.263);
});

test('T2.6 clamps fatigue factor before LOF mapping', () => {
  const low = calculateAivT26Discontinuity({ pointPwlDb: 155, assessment: assessment() });
  const high = calculateAivT26Discontinuity({ pointPwlDb: 190, assessment: assessment() });
  assert.ok(low.LfRaw < 0);
  assert.equal(low.Lf, 0);
  assert.equal(low.lof, 0.29);
  assert.ok(high.LfRaw > 1);
  assert.equal(high.Lf, 1);
  assert.equal(high.lof, 1);
});

test('T2.6 assessment validation fails closed on unsupported type, unit, branch geometry and Duplex state', () => {
  const invalid = validateAivT26Assessment(assessment({
    assessmentType: 'OTHER_WELDED_DISCONTINUITY',
    mainWallThickness: { value: 7.11, unit: 'in' },
    branchOutsideDiameter: null,
    duplexState: 'UNRESOLVED',
  }));
  assert.equal(invalid.valid, false);
  const codes = invalid.issues.map((item) => item.code);
  assert.ok(codes.includes('AIV_T26_ASSESSMENT_TYPE_UNQUALIFIED'));
  assert.ok(codes.includes('AIV_T26_DIMENSION_UNIT_UNSUPPORTED'));
  assert.ok(codes.includes('AIV_T26_DIMENSION_REQUIRED'));
  assert.ok(codes.includes('AIV_T26_DUPLEX_STATE_REQUIRED'));
});

test('screening profile validation does not consume benchmark A/S/B or FLM1 configuration', () => {
  const profile = createAivAssumptionProfile({
    benchmark: {
      publishedA: 'not-screening-input',
      publishedS: '',
      publishedB: 'not-screening-input',
      flm1Mode: 'PUBLISHED',
      flm1Published: '999',
    },
  });
  const validation = validateAivScreeningProfile(profile);
  assert.equal(validation.status, 'PASS');
  assert.equal(validation.benchmarkIntermediatesRequired, false);
});
