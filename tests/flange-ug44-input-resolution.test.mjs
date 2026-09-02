import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  DESIGN_PRESSURE_BASES,
  GASKET_DIAMETER_BASES,
  resolveDesignPressure,
  resolveGasketReactionDiameter,
  resolveUg44CalculationInputs,
} from '../converters/engineering-calculations/flange/ug44-input-resolution.js';
import {
  FLANGE_UG44_ENGINEERING_CALCULATION_ID,
  calculateEngineering,
  getEngineeringCalculationDefinition,
} from '../converters/engineering-calculations/index.js';

const fixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/flange-ug44-workbook-rows.json', import.meta.url), 'utf8'),
);

const BASE_LOADS = { momentFactor: 0.5, bendingMoment: 1, openingAxialForce: 1 };

function closeTo(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

test('directly supplied gasket reaction diameter passes through unchanged', () => {
  const resolved = resolveGasketReactionDiameter({ gasketReactionDiameter: 0.0779 });
  assert.equal(resolved.gasketReactionDiameterM, 0.0779);
  assert.equal(resolved.basis, GASKET_DIAMETER_BASES.DIRECT);
  assert.equal(resolved.isCodeSeatingWidthDerivation, false);
});

test('derived gasket reaction diameter reproduces every transcribed workbook row', () => {
  for (const row of fixture.rows) {
    const resolved = resolveGasketReactionDiameter({
      gasketInnerDiameter: row.gasketInnerDiameterMm / 1000,
      gasketOuterDiameter: row.gasketOuterDiameterMm / 1000,
    });
    assert.ok(
      closeTo(resolved.gasketReactionDiameterM, row.gasketReactionDiameterM, 1e-12),
      `size ${row.nominalSizeIn}" class ${row.pressureClass}: derived G mismatch`,
    );
    assert.equal(resolved.basis, GASKET_DIAMETER_BASES.MEAN_GASKET_CONTACT);
  }
});

test('a derived gasket diameter is never presented as a Code seating-width derivation', () => {
  const resolved = resolveGasketReactionDiameter({
    gasketInnerDiameter: 0.0699,
    gasketOuterDiameter: 0.0859,
  });
  assert.equal(resolved.isCodeSeatingWidthDerivation, false);
  assert.equal(resolved.basis, GASKET_DIAMETER_BASES.MEAN_GASKET_CONTACT);
});

test('design pressure without a liquid column is the supplied value', () => {
  const resolved = resolveDesignPressure({ designPressure: 710_000 });
  assert.equal(resolved.designPressurePa, 710_000);
  assert.equal(resolved.staticHeadPa, 0);
  assert.equal(resolved.basis, DESIGN_PRESSURE_BASES.DIRECT);
});

test('design pressure with a liquid column adds the workbook static head', () => {
  const resolved = resolveDesignPressure({
    designPressure: 710_000,
    specificGravity: 1,
    liquidHeight: 10,
  });
  assert.ok(closeTo(resolved.staticHeadPa, 98_066.5, 1e-6));
  assert.ok(closeTo(resolved.designPressurePa, 808_066.5, 1e-6));
  assert.equal(resolved.systemDesignPressurePa, 710_000);
  assert.equal(resolved.basis, DESIGN_PRESSURE_BASES.WITH_STATIC_HEAD);
});

test('a zero-height column still records the static-head basis it was asked for', () => {
  const resolved = resolveDesignPressure({
    designPressure: 710_000,
    specificGravity: 1,
    liquidHeight: 0,
  });
  assert.equal(resolved.designPressurePa, 710_000);
  assert.equal(resolved.basis, DESIGN_PRESSURE_BASES.WITH_STATIC_HEAD);
});

test('supplying both gasket routes fails closed rather than picking one', () => {
  assert.throws(() => resolveGasketReactionDiameter({
    gasketReactionDiameter: 0.1,
    gasketInnerDiameter: 0.09,
    gasketOuterDiameter: 0.11,
  }), (error) => error.code === 'INPUT_INVALID' && /not both/.test(error.message));
});

test('an incomplete gasket geometry fails closed and names the missing diameter', () => {
  assert.throws(() => resolveGasketReactionDiameter({ gasketInnerDiameter: 0.09 }), (error) => (
    error.code === 'INPUT_INVALID' && error.field === 'gasketOuterDiameter'
  ));
  assert.throws(() => resolveGasketReactionDiameter({ gasketOuterDiameter: 0.11 }), (error) => (
    error.code === 'INPUT_INVALID' && error.field === 'gasketInnerDiameter'
  ));
});

test('omitting the gasket diameter entirely fails closed', () => {
  assert.throws(() => resolveGasketReactionDiameter({}), (error) => (
    error.code === 'INPUT_INVALID' && error.field === 'gasketReactionDiameter'
  ));
});

test('a half-specified liquid column fails closed rather than assuming the other half', () => {
  assert.throws(() => resolveDesignPressure({
    designPressure: 710_000, specificGravity: 1,
  }), (error) => error.code === 'INPUT_INVALID' && error.field === 'liquidHeight');

  assert.throws(() => resolveDesignPressure({
    designPressure: 710_000, liquidHeight: 10,
  }), (error) => error.code === 'INPUT_INVALID' && error.field === 'specificGravity');
});

test('resolution assembles the full kernel input set with its basis record', () => {
  const resolved = resolveUg44CalculationInputs({
    ratedPressure: 1_380_000,
    designPressure: 710_000,
    gasketInnerDiameter: 0.0699,
    gasketOuterDiameter: 0.0859,
    momentFactor: 1.2,
    bendingMoment: 0.205,
    openingAxialForce: 0.55,
  });

  assert.ok(closeTo(resolved.calculationInputs.gasketReactionDiameterM, 0.0779, 1e-12));
  assert.equal(resolved.calculationInputs.designPressurePa, 710_000);
  assert.equal(resolved.calculationInputs.momentFactor, 1.2);
  assert.equal(resolved.basis.gasketReactionDiameter.basis, GASKET_DIAMETER_BASES.MEAN_GASKET_CONTACT);
  assert.equal(resolved.basis.designPressure.basis, DESIGN_PRESSURE_BASES.DIRECT);
});

// --- through the registered adapter ----------------------------------------

test('the adapter declares the derivation inputs as optional', () => {
  const definition = getEngineeringCalculationDefinition(FLANGE_UG44_ENGINEERING_CALCULATION_ID);
  const byKey = Object.fromEntries(definition.inputs.map((item) => [item.key, item]));

  for (const key of ['gasketReactionDiameter', 'gasketInnerDiameter', 'gasketOuterDiameter', 'specificGravity', 'liquidHeight']) {
    assert.ok(byKey[key], `${key} must be declared`);
    assert.equal(byKey[key].required, false, `${key} must be optional`);
  }
  assert.equal(byKey.gasketInnerDiameter.canonicalUnit, 'm');
  assert.equal(byKey.specificGravity.canonicalUnit, null);
});

test('the console can evaluate UG-44 from gasket geometry without precomputing G', () => {
  const result = calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: {
      ratedPressure: 1380,
      designPressure: 710,
      gasketInnerDiameter: 69.9,
      gasketOuterDiameter: 85.9,
      momentFactor: 1.2,
      bendingMoment: 0.20506096654409878,
      openingAxialForce: 0.55,
    },
    inputUnits: {
      ratedPressure: 'kPa',
      designPressure: 'kPa',
      gasketInnerDiameter: 'mm',
      gasketOuterDiameter: 'mm',
      bendingMoment: 'N*m',
      openingAxialForce: 'N',
    },
  });

  assert.equal(result.ok, true);
  assert.ok(closeTo(result.intermediates.resolvedGasketReactionDiameter * 1000, 77.9, 1e-9));
  assert.equal(result.provenance.gasketReactionDiameterBasis, GASKET_DIAMETER_BASES.MEAN_GASKET_CONTACT);
  assert.equal(result.provenance.gasketReactionDiameterIsCodeSeatingWidthDerivation, false);
  assert.equal(result.qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(result.assessment.codeCompliance, false);
});

test('deriving G gives the same result as supplying it precomputed', () => {
  const shared = {
    ratedPressure: 1_380_000,
    designPressure: 710_000,
    momentFactor: 1.2,
    bendingMoment: 0.20506096654409878,
    openingAxialForce: 0.55,
  };
  const derived = calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: { ...shared, gasketInnerDiameter: 0.0699, gasketOuterDiameter: 0.0859 },
  });
  const direct = calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: { ...shared, gasketReactionDiameter: 0.0779 },
  });

  assert.equal(derived.ok, true);
  assert.equal(direct.ok, true);
  assert.ok(closeTo(derived.outputs.maximumPressure, direct.outputs.maximumPressure, 1e-6));
  assert.equal(derived.outputs.equationSatisfied, direct.outputs.equationSatisfied);
  assert.notEqual(derived.provenance.gasketReactionDiameterBasis, direct.provenance.gasketReactionDiameterBasis);
});

test('the static head reaches the kernel as design pressure through the engine', () => {
  const result = calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: {
      ratedPressure: 1_380_000,
      designPressure: 710_000,
      gasketReactionDiameter: 0.0779,
      specificGravity: 1,
      liquidHeight: 10,
      ...BASE_LOADS,
      momentFactor: 1.2,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(closeTo(result.intermediates.resolvedDesignPressure, 808_066.5, 1e-6));
  assert.ok(closeTo(result.intermediates.staticHeadPressure, 98_066.5, 1e-6));
  assert.equal(result.provenance.designPressureBasis, DESIGN_PRESSURE_BASES.WITH_STATIC_HEAD);
});

test('ambiguous or incomplete input fails closed through the engine', () => {
  const cases = [
    { gasketReactionDiameter: 0.1, gasketInnerDiameter: 0.09, gasketOuterDiameter: 0.11 },
    {},
    { gasketInnerDiameter: 0.09 },
    { gasketReactionDiameter: 0.1, specificGravity: 1 },
  ];

  for (const extra of cases) {
    const result = calculateEngineering({
      calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
      inputs: { ratedPressure: 1_000_000, designPressure: 100_000, ...BASE_LOADS, ...extra },
    });
    assert.equal(result.ok, false, `expected failure for ${JSON.stringify(extra)}`);
    assert.ok(result.errors.some((error) => error.code === 'INPUT_INVALID'));
  }
});

test('the applicability text keeps the derivation from reading as governed', () => {
  const definition = getEngineeringCalculationDefinition(FLANGE_UG44_ENGINEERING_CALCULATION_ID);
  const limitations = definition.applicability.limitations.join(' ');

  assert.match(limitations, /not an Appendix 2 effective-seating-width derivation/);
  assert.match(limitations, /does not govern G/);
  assert.match(limitations, /applied uniformly rather than per-nozzle elevation/);
});
