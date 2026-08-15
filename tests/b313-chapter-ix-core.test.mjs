import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateEngineering,
  getEngineeringCalculationDefinition,
  resolveEngineeringCalculationInputs,
} from '../converters/engineering-calculations/index.js';
import { calculateChapterIxStraightPressure } from '../converters/b313-chapter-ix/straight-pipe.js';

const REGRESSION_INPUT = Object.freeze({
  outsideDiameter: 114.3,
  designPressure: 20,
  allowableStress: 138,
  internalAllowance: 3,
  externalAllowance: 0,
  minusTolerancePct: 12.5,
  providedNominalThickness: 13.49,
});

const DOMAIN_REGRESSION_INPUT = Object.freeze({
  outsideDiameterMm: 114.3,
  designPressureMpa: 20,
  allowableStressMpa: 138,
  internalAllowanceMm: 3,
  externalAllowanceMm: 0,
  minusTolerancePct: 12.5,
  providedNominalThicknessMm: 13.49,
});

function close(actual, expected, tolerance = 1e-10) {
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test('Chapter IX domain kernel reproduces frozen NPS 4 software regression', () => {
  const result = calculateChapterIxStraightPressure(DOMAIN_REGRESSION_INPUT);
  assert.equal(result.ok, true, JSON.stringify(result));
  close(result.pressureDesignThicknessMm, 7.7103934983403475);
  close(result.requiredMinimumThicknessMm, 10.710393498340348);
  close(result.requiredNominalThicknessMm, 12.240449712388969);
  close(result.minimumAsManufacturedThicknessMm, 11.80375);
  close(result.effectiveNetWallMm, 8.80375);
  close(result.pressureRatingMpa, 23.086120852009273);
  close(result.pressureRatingMargin, 1.1543060426004637);
  assert.equal(result.staticPass, true);
});

test('Chapter IX domain kernel fails closed on invalid tolerance and effective wall', () => {
  const tolerance = calculateChapterIxStraightPressure({
    ...DOMAIN_REGRESSION_INPUT,
    minusTolerancePct: 100,
  });
  assert.equal(tolerance.ok, false);
  assert.equal(tolerance.code, 'INPUT_INVALID');

  const effectiveWall = calculateChapterIxStraightPressure({
    ...DOMAIN_REGRESSION_INPUT,
    providedNominalThicknessMm: 3,
  });
  assert.equal(effectiveWall.ok, false);
  assert.equal(effectiveWall.code, 'INPUT_INVALID');
  assert.match(effectiveWall.message, /non-positive effective net wall/i);
});

test('central catalogue exposes Chapter IX as benchmark-only and non-authoritative', () => {
  const definition = getEngineeringCalculationDefinition('PIPE.B313.CH9.STRAIGHT_PRESSURE');
  assert.equal(definition.authority.calculationState, 'IMPLEMENTED');
  assert.equal(definition.authority.qualificationState, 'BENCHMARK_ONLY');
  assert.equal(definition.authority.codeCompliance, false);
  assert.equal(definition.ui.requiredQualificationMode, 'benchmark');
  assert.equal(definition.ui.productSurface, 'ENGINEERING_CALCULATIONS');
  assert(definition.inputs.every((field) => field.engineeringDefault === undefined));
});

test('central Chapter IX execution blocks default/strict/screening modes', () => {
  for (const mode of [undefined, 'strict', 'screening']) {
    const result = calculateEngineering({
      calculationId: 'PIPE.B313.CH9.STRAIGHT_PRESSURE',
      inputs: REGRESSION_INPUT,
      ...(mode ? { options: { qualificationMode: mode } } : {}),
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'ENGINEERING_METHOD_NOT_QUALIFIED');
    assert.equal(result.qualification.effective, 'BENCHMARK_ONLY');
    assert.equal(result.qualification.designAuthority, false);
    assert.equal(Object.hasOwn(result, 'outputs'), false);
  }
});

test('central Chapter IX benchmark mode reproduces frozen static results', () => {
  const result = calculateEngineering({
    calculationId: 'PIPE.B313.CH9.STRAIGHT_PRESSURE',
    inputs: REGRESSION_INPUT,
    options: { qualificationMode: 'benchmark', includeEvidence: true },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  close(result.outputs.pressureDesignThicknessMm, 7.7103934983403475);
  close(result.outputs.requiredMinimumThicknessMm, 10.710393498340348);
  close(result.outputs.minimumAsManufacturedThicknessMm, 11.80375);
  close(result.outputs.effectiveNetWallMm, 8.80375);
  close(result.outputs.pressureRatingMpa, 23.086120852009273);
  assert.equal(result.outputs.staticPass, true);
  assert.equal(result.checks.length, 2);
  assert(result.checks.every((check) => check.status === 'PASS'));
  assert.equal(result.assessment.status, 'REFERENCE_PASS');
  assert.equal(result.qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(result.qualification.designAuthority, false);
  assert.equal(result.provenance.engineeringAuthority, 'SOFTWARE_REGRESSION_ONLY');
  assert.equal(result.provenance.codeCompliance, false);
});

test('central resolver preserves explicit unit conversion without engineering defaults', () => {
  const resolved = resolveEngineeringCalculationInputs(
    'PIPE.B313.CH9.STRAIGHT_PRESSURE',
    {
      ...REGRESSION_INPUT,
      designPressure: 200,
    }, {},
    {
      inputUnits: {
        outsideDiameter: 'mm',
        designPressure: 'barg',
        allowableStress: 'MPa',
        internalAllowance: 'mm',
        externalAllowance: 'mm',
        providedNominalThickness: 'mm',
      },
      qualificationMode: 'benchmark',
    },
  );
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  close(resolved.canonicalInput.designPressure, 20);
  assert.equal(resolved.canonicalInput.minusTolerancePct, 12.5);
});
