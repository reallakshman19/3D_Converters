import assert from 'node:assert/strict';

import {
  B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT,
  calculateAndSelectPreviewB313Wall,
} from '../converters/xml-cii2019-core/b313-preview-wall-update.js';

assert.equal(B313_PREVIEW_NEGATIVE_MILL_TOLERANCE_PCT, 12.5);

const dn250 = calculateAndSelectPreviewB313Wall({
  dn: 250,
  outsideDiameterMm: 273,
  designPressure: 51.1,
  pressureUnit: 'barg',
  corrosionAllowanceMm: 6,
  allowableStress: 20000,
  stressUnit: 'psi',
  qualityFactorE: 1,
  weldStrengthReductionW: 1,
  coefficientY: 0.4,
  dimensionStandard: 'ASME B36.10M',
});

assert.equal(dn250.ok, true, JSON.stringify(dn250, null, 2));
assert.ok(Math.abs(dn250.calculation.requiredNominalThicknessMm - 12.5536) < 0.0001);
assert.ok(Math.abs(dn250.selectedNominalWallMm - 12.7) < 1e-9);
assert.equal(dn250.selectedSchedule, '60');
assert.deepEqual(dn250.equivalentSchedules, ['60', 'XS']);
assert.ok(Math.abs(dn250.selectionMarginMm - (12.7 - dn250.calculation.requiredNominalThicknessMm)) < 1e-10);
assert.equal(dn250.calculation.manufacturingTolerance.basis, 'percent');
assert.equal(dn250.calculation.manufacturingTolerance.percent, 12.5);
assert.equal(dn250.calculation.manufacturingTolerance.inputValue, 12.5);
assert.equal(dn250.authority, 'EXPLICIT_PREVIEW_ACTION_NOT_AUTOMATIC_WALL_AUTHORITY');

const missingOd = calculateAndSelectPreviewB313Wall({
  dn: 250,
  designPressure: 51.1,
  pressureUnit: 'barg',
  corrosionAllowanceMm: 6,
  allowableStress: 20000,
  stressUnit: 'psi',
  qualityFactorE: 1,
  weldStrengthReductionW: 1,
  coefficientY: 0.4,
  dimensionStandard: 'ASME B36.10M',
});
assert.equal(missingOd.ok, false);
assert.equal(missingOd.code, 'B313_PREVIEW_OD_REQUIRED');

const missingPressureUnit = calculateAndSelectPreviewB313Wall({
  dn: 250,
  outsideDiameterMm: 273,
  designPressure: 51.1,
  corrosionAllowanceMm: 6,
  allowableStress: 20000,
  stressUnit: 'psi',
  qualityFactorE: 1,
  weldStrengthReductionW: 1,
  coefficientY: 0.4,
  dimensionStandard: 'ASME B36.10M',
});
assert.equal(missingPressureUnit.ok, false);
assert.equal(missingPressureUnit.code, 'B313_PREVIEW_PRESSURE_UNIT_REQUIRED');

const missingStress = calculateAndSelectPreviewB313Wall({
  dn: 250,
  outsideDiameterMm: 273,
  designPressure: 51.1,
  pressureUnit: 'barg',
  corrosionAllowanceMm: 6,
  stressUnit: 'psi',
  qualityFactorE: 1,
  weldStrengthReductionW: 1,
  coefficientY: 0.4,
  dimensionStandard: 'ASME B36.10M',
});
assert.equal(missingStress.ok, false);
assert.equal(missingStress.code, 'B313_PREVIEW_CALCULATION_FAILED');

console.log('XML/CII Preview B31.3 wall API composition checks passed.');
