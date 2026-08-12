import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  assessFit,
  calculateFit,
} from '../converters/vibration/fit/index.js';

const benchmarkSet = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json', import.meta.url),
  'utf8',
));

function closePublished(actual, expected, relativeTolerance = benchmarkSet.roundingPolicy.relativeTolerance) {
  const tolerance = Math.max(1e-12, Math.abs(expected) * relativeTolerance);
  assert(Number.isFinite(actual), `Expected finite value, received ${actual}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`);
}

function d4EquivalentInputs() {
  const gasMassFlowKgS = 27180 / 3600;
  const liquidMassFlowKgS = 828796 / 3600;
  const liquidVolumetricFlowM3S = (326 + 532) / 3600;
  const liquidDensityKgM3 = liquidMassFlowKgS / liquidVolumetricFlowM3S;
  const gasDensityKgM3 = 5;
  const totalMassFlowKgS = gasMassFlowKgS + liquidMassFlowKgS;
  const totalVolumetricFlowM3S = (5436 + 326 + 532) / 3600;
  const effectiveDensityKgM3 = totalMassFlowKgS / totalVolumetricFlowM3S;
  return {
    common: {
      phase: 'MULTIPHASE',
      outsideDiameterM: 0.508,
      wallThicknessM: 0.009525,
      maximumUnsupportedSpanM: 5,
    },
    aggregate: { massFlowKgS: totalMassFlowKgS, densityKgM3: effectiveDensityKgM3 },
    components: { gasMassFlowKgS, gasDensityKgM3, liquidMassFlowKgS, liquidDensityKgM3 },
  };
}

for (const row of benchmarkSet.cases) {
  test(`${row.id}: reproduces published EI FIT worked-example result`, () => {
    const result = calculateFit(row.input);
    assert.equal(result.ok, true, `${row.id}: ${JSON.stringify(result)}`);
    assert.equal(result.support.stiffness, row.published.supportStiffness, row.id);
    if (row.published.supportCategory) assert.equal(result.support.category, row.published.supportCategory, row.id);
    closePublished(result.excitation.rhoV2, row.published.rhoV2Pa);
    closePublished(result.standard.fluidViscosityFactor, row.published.fluidViscosityFactor);
    closePublished(result.standard.correlation.fv, row.published.standardFvPa);
    closePublished(result.standard.lof, row.published.standardLof);
    assert.equal(assessFit(result).referenceBand, row.published.referenceBand, row.id);
    assert.equal(result.qualification.method, 'BENCHMARK_ONLY');
    assert.equal(result.qualification.designAuthority, false);
  });
}

test('EI boundary: advanced FIT is excluded at exactly 1 Hz and allowed at exactly 3 Hz', () => {
  const base = {
    phase: 'LIQUID',
    outsideDiameterM: 0.1683,
    wallThicknessM: 0.00711,
    maximumUnsupportedSpanM: 10,
    densityKgM3: 1000,
    fluidVelocityMS: 1.6589405806551936,
  };
  const atOne = calculateFit({ ...base, naturalFrequencyHz: 1 });
  assert.equal(atOne.ok, true, JSON.stringify(atOne));
  assert(atOne.standard.lof >= 1);
  assert.equal(atOne.advanced, null);
  assert.equal(atOne.advancedEligibility.reason, 'NATURAL_FREQUENCY_OUTSIDE_DECLARED_RANGE');

  const atThree = calculateFit({ ...base, naturalFrequencyHz: 3 });
  assert.equal(atThree.ok, true, JSON.stringify(atThree));
  assert.equal(atThree.advancedEligibility.eligible, true);
  assert(atThree.advanced);
});

test('EI D4 boundary: 273 mm flexible line resolves to FLEXIBLE_LARGE', () => {
  const row = benchmarkSet.cases.find((item) => item.id === 'EI-D4-FIT-PRODUCED-WATER-10IN');
  const result = calculateFit(row.input);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.support.stiffness, 'FLEXIBLE');
  assert.equal(result.support.category, 'FLEXIBLE_LARGE');
});

test('multiphase aggregate effective inputs and component-derived inputs converge when each shape is unambiguous', () => {
  const { common, aggregate: aggregateInput, components: componentInput } = d4EquivalentInputs();
  const aggregate = calculateFit({ ...common, ...aggregateInput });
  const components = calculateFit({ ...common, ...componentInput });

  assert.equal(aggregate.ok, true, JSON.stringify(aggregate));
  assert.equal(components.ok, true, JSON.stringify(components));
  assert.equal(aggregate.hydraulics.resolutionMode, 'AGGREGATE_EFFECTIVE');
  assert.equal(aggregate.hydraulics.resolutionModeSelection, 'INFERRED');
  assert.equal(components.hydraulics.resolutionMode, 'COMPONENT_DERIVED');
  assert.equal(components.hydraulics.resolutionModeSelection, 'INFERRED');
  closePublished(aggregate.hydraulics.velocityMS, components.hydraulics.velocityMS, 1e-12);
  closePublished(aggregate.excitation.densityKgM3, components.excitation.densityKgM3, 1e-12);
  closePublished(aggregate.standard.lof, components.standard.lof, 1e-12);
});

test('mixed multiphase input shapes fail closed without an explicit resolution mode', () => {
  const { common, aggregate, components } = d4EquivalentInputs();
  const result = calculateFit({ ...common, ...aggregate, ...components });
  assert.equal(result.ok, false, JSON.stringify(result));
  assert(result.errors.some((error) => error.code === 'FIT_MULTIPHASE_INPUT_AMBIGUOUS'));
});

test('explicit aggregate multiphase mode is deterministic when both data shapes are supplied', () => {
  const { common, aggregate, components } = d4EquivalentInputs();
  const result = calculateFit({
    ...common,
    ...aggregate,
    ...components,
    multiphaseResolutionMode: 'AGGREGATE_EFFECTIVE',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hydraulics.resolutionMode, 'AGGREGATE_EFFECTIVE');
  assert.equal(result.hydraulics.resolutionModeSelection, 'EXPLICIT');
  assert.equal(result.hydraulics.alternateModeDataPresent, true);
  assert.equal(result.evidence.inputResolution.selection, 'EXPLICIT');
});

test('explicit component multiphase mode is deterministic when both data shapes are supplied', () => {
  const { common, aggregate, components } = d4EquivalentInputs();
  const result = calculateFit({
    ...common,
    ...aggregate,
    ...components,
    multiphaseResolutionMode: 'COMPONENT_DERIVED',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hydraulics.resolutionMode, 'COMPONENT_DERIVED');
  assert.equal(result.hydraulics.resolutionModeSelection, 'EXPLICIT');
  assert.equal(result.hydraulics.alternateModeDataPresent, true);
  assert.equal(result.evidence.inputResolution.selection, 'EXPLICIT');
});

test('invalid explicit multiphase mode fails validation', () => {
  const { common, aggregate } = d4EquivalentInputs();
  const result = calculateFit({
    ...common,
    ...aggregate,
    multiphaseResolutionMode: 'AUTO',
  });
  assert.equal(result.ok, false, JSON.stringify(result));
  assert(result.errors.some((error) => error.code === 'FIT_INPUT_INVALID' && error.field === 'multiphaseResolutionMode'));
});
