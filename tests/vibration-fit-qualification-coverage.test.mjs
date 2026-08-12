import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION } from '../converters/engineering-calculations/adapters/vibration-fit.js';
import {
  FIT_QUALIFICATION_EVIDENCE_STRENGTH,
  calculateFit,
} from '../converters/vibration/fit/index.js';

const eiBenchmarks = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json', import.meta.url),
  'utf8',
));

function eiCase(id) {
  return eiBenchmarks.cases.find((row) => row.id === id);
}

function assertNoAuthority(coverage) {
  assert.equal(coverage.coverageId, 'FIT-REFERENCE-COVERAGE-V1');
  assert.equal(coverage.screeningQualified, false);
  assert.equal(coverage.engineeringAuthority, 'NONE');
  assert(Object.isFrozen(coverage));
}

test('EI D2 medium-stiff gas result reports published-example coverage without granting authority', () => {
  const result = calculateFit(eiCase('EI-D2-FIT-RECYCLE-SUCTION-6IN').input);
  assert.equal(result.ok, true, JSON.stringify(result));
  const coverage = result.qualificationCoverage;
  assertNoAuthority(coverage);
  assert.equal(coverage.phasePath.path, 'SINGLE_PHASE_GAS');
  assert.equal(coverage.phasePath.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.EI_PUBLISHED_EXAMPLE);
  assert.equal(coverage.phasePath.eiPublishedExampleCoverage, true);
  assert.equal(coverage.standardCorrelation.supportCategory, 'MEDIUM_STIFF');
  assert.equal(coverage.standardCorrelation.eiPublishedExampleCoverage, true);
  assert(coverage.standardCorrelation.evidenceIds.includes('EI-D2-FIT-RECYCLE-SUCTION-6IN'));
  assert.equal(result.evidence.qualificationCoverage, coverage);
});

test('EI D4 aggregate multiphase and flexible-large liquid slices retain published-example coverage', () => {
  const separator = calculateFit(eiCase('EI-D4-FIT-SEPARATOR-INLET-20IN').input);
  assert.equal(separator.ok, true, JSON.stringify(separator));
  assert.equal(separator.qualificationCoverage.phasePath.path, 'MULTIPHASE_AGGREGATE_EFFECTIVE');
  assert.equal(separator.qualificationCoverage.phasePath.eiPublishedExampleCoverage, true);
  assert.equal(separator.qualificationCoverage.phasePath.equivalenceCoverage, true);
  assert.equal(separator.qualificationCoverage.standardCorrelation.supportCategory, 'STIFF');
  assert.equal(separator.qualificationCoverage.standardCorrelation.eiPublishedExampleCoverage, true);

  const water = calculateFit(eiCase('EI-D4-FIT-PRODUCED-WATER-10IN').input);
  assert.equal(water.ok, true, JSON.stringify(water));
  assert.equal(water.qualificationCoverage.phasePath.path, 'SINGLE_PHASE_LIQUID');
  assert.equal(water.qualificationCoverage.standardCorrelation.supportCategory, 'FLEXIBLE_LARGE');
  assert.equal(water.qualificationCoverage.standardCorrelation.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.EI_PUBLISHED_EXAMPLE);
  assert.equal(water.qualificationCoverage.standardCorrelation.eiPublishedExampleCoverage, true);
});

test('standard correlation families with weaker evidence are explicit rather than promoted', () => {
  const mediumSmall = calculateFit({
    phase: 'LIQUID',
    outsideDiameterM: 0.1683,
    wallThicknessM: 0.00711,
    maximumUnsupportedSpanM: 8,
    densityKgM3: 1000,
    fluidVelocityMS: 1,
  });
  assert.equal(mediumSmall.ok, true, JSON.stringify(mediumSmall));
  assert.equal(mediumSmall.support.category, 'MEDIUM_SMALL');
  assert.equal(mediumSmall.qualificationCoverage.standardCorrelation.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.RETAINED_PARITY_ONLY);
  assert.equal(mediumSmall.qualificationCoverage.standardCorrelation.eiPublishedExampleCoverage, false);
  assert.equal(mediumSmall.qualificationCoverage.standardCorrelation.independentHandBenchmarkCoverage, false);
  assert.equal(mediumSmall.qualificationCoverage.standardCorrelation.noIndependentExample, true);

  const mediumLarge = calculateFit({
    phase: 'LIQUID',
    outsideDiameterM: 0.508,
    wallThicknessM: 0.009525,
    maximumUnsupportedSpanM: 15,
    densityKgM3: 1000,
    fluidVelocityMS: 1,
  });
  assert.equal(mediumLarge.ok, true, JSON.stringify(mediumLarge));
  assert.equal(mediumLarge.support.category, 'MEDIUM_LARGE');
  assert.equal(mediumLarge.qualificationCoverage.standardCorrelation.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.INDEPENDENT_HAND_BENCHMARK);
  assert.equal(mediumLarge.qualificationCoverage.standardCorrelation.eiPublishedExampleCoverage, false);
  assert.equal(mediumLarge.qualificationCoverage.standardCorrelation.independentHandBenchmarkCoverage, true);
});

test('advanced flexible-small and flexible-large evidence strengths remain distinct', () => {
  const small = calculateFit({
    phase: 'LIQUID',
    outsideDiameterM: 0.1683,
    wallThicknessM: 0.00711,
    maximumUnsupportedSpanM: 10,
    densityKgM3: 1000,
    fluidVelocityMS: 1.6589405806551936,
    naturalFrequencyHz: 2,
  });
  assert.equal(small.ok, true, JSON.stringify(small));
  assert(small.advanced);
  assert.equal(small.support.category, 'FLEXIBLE_SMALL');
  assert.equal(small.qualificationCoverage.advancedCorrelation.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.INDEPENDENT_HAND_BENCHMARK);
  assert.equal(small.qualificationCoverage.advancedCorrelation.eiPublishedExampleCoverage, false);
  assert.equal(small.qualificationCoverage.referenceBand.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.INDEPENDENT_HAND_BENCHMARK);

  const large = calculateFit({
    phase: 'LIQUID',
    outsideDiameterM: 0.508,
    wallThicknessM: 0.009525,
    maximumUnsupportedSpanM: 20,
    densityKgM3: 1000,
    fluidVelocityMS: 2,
    naturalFrequencyHz: 2,
  });
  assert.equal(large.ok, true, JSON.stringify(large));
  assert(large.advanced);
  assert.equal(large.support.category, 'FLEXIBLE_LARGE');
  assert.equal(large.qualificationCoverage.advancedCorrelation.evidenceStrength, FIT_QUALIFICATION_EVIDENCE_STRENGTH.RETAINED_PARITY_ONLY);
  assert.equal(large.qualificationCoverage.advancedCorrelation.independentHandBenchmarkCoverage, false);
  assert.equal(large.qualificationCoverage.advancedCorrelation.noIndependentExample, true);
});

test('central FIT adapter carries coverage in evidence while remaining benchmark-only', () => {
  const row = eiCase('EI-D2-FIT-RELIEF-UPSTREAM-4IN');
  const input = row.input;
  const result = VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION.calculate({
    phase: input.phase,
    outsideDiameter: input.outsideDiameterM,
    wallThickness: input.wallThicknessM,
    insideDiameter: input.insideDiameterM,
    maximumUnsupportedSpan: input.maximumUnsupportedSpanM,
    massFlow: input.massFlowKgS,
    density: input.densityKgM3,
    gasDynamicViscosity: input.gasDynamicViscosityPaS,
  }, { options: { qualificationMode: 'benchmark' } });

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.qualification.method, 'BENCHMARK_ONLY');
  assert.equal(result.qualification.designAuthority, false);
  assert.equal(result.evidence.qualificationCoverage.screeningQualified, false);
  assert.equal(result.evidence.qualificationCoverage.engineeringAuthority, 'NONE');
  assert.equal(result.provenance.qualificationCoverageId, 'FIT-REFERENCE-COVERAGE-V1');
});
