import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION } from '../converters/engineering-calculations/adapters/vibration-fit.js';
import { calculateFit } from '../converters/vibration/fit/index.js';

const eiBenchmarks = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json', import.meta.url),
  'utf8',
));

function eiCase(id) {
  return eiBenchmarks.cases.find((row) => row.id === id);
}

function assertNeverAuthorizes(candidate) {
  assert.equal(candidate.scopeId, 'FIT-SCREENING-CANDIDATE-V1');
  assert.equal(candidate.screeningAuthorized, false);
  assert.equal(candidate.engineeringAuthority, 'NONE');
  assert.equal(candidate.domainCoverageEstablished, false);
  assert.equal(candidate.pointCoverageOnly, true);
  assert(Object.isFrozen(candidate));
}

test('EI D2 gas medium-stiff cases are candidates for engineering review only', () => {
  for (const id of [
    'EI-D2-FIT-RECYCLE-SUCTION-6IN',
    'EI-D2-FIT-RELIEF-UPSTREAM-4IN',
    'EI-D2-FIT-RELIEF-DOWNSTREAM-6IN',
  ]) {
    const result = calculateFit(eiCase(id).input);
    assert.equal(result.ok, true, `${id}: ${JSON.stringify(result)}`);
    const candidate = result.screeningCandidate;
    assertNeverAuthorizes(candidate);
    assert.equal(candidate.candidateForEngineeringReview, true, id);
    assert.equal(candidate.status, 'CANDIDATE_STANDARD_SLICE', id);
    assert.equal(candidate.phasePath, 'SINGLE_PHASE_GAS', id);
    assert.equal(candidate.supportCategory, 'MEDIUM_STIFF', id);
    assert.equal(candidate.continuationRequired, false, id);
  }
});

test('EI D4 aggregate/stiff slice is a candidate while D4 flexible-large standard slice requires continuation', () => {
  const separator = calculateFit(eiCase('EI-D4-FIT-SEPARATOR-INLET-20IN').input);
  assert.equal(separator.ok, true, JSON.stringify(separator));
  assertNeverAuthorizes(separator.screeningCandidate);
  assert.equal(separator.screeningCandidate.candidateForEngineeringReview, true);
  assert.equal(separator.screeningCandidate.phasePath, 'MULTIPHASE_AGGREGATE_EFFECTIVE');
  assert.equal(separator.screeningCandidate.supportCategory, 'STIFF');
  assert.equal(separator.screeningCandidate.status, 'CANDIDATE_STANDARD_SLICE');
  assert.equal(separator.screeningCandidate.continuationRequired, false);

  const water = calculateFit(eiCase('EI-D4-FIT-PRODUCED-WATER-10IN').input);
  assert.equal(water.ok, true, JSON.stringify(water));
  assertNeverAuthorizes(water.screeningCandidate);
  assert.equal(water.screeningCandidate.candidateForEngineeringReview, true);
  assert.equal(water.screeningCandidate.supportCategory, 'FLEXIBLE_LARGE');
  assert.equal(water.screeningCandidate.status, 'CANDIDATE_STANDARD_SLICE_FURTHER_ASSESSMENT_REQUIRED');
  assert.equal(water.screeningCandidate.continuationRequired, true);
  assert(water.standard.lof >= 1);
  assert.equal(water.advanced, null);
});

test('standard families without EI worked-example points are not screening candidates', () => {
  const cases = [
    {
      expected: 'MEDIUM_SMALL',
      input: {
        phase: 'LIQUID', outsideDiameterM: 0.1683, wallThicknessM: 0.00711,
        maximumUnsupportedSpanM: 8, densityKgM3: 1000, fluidVelocityMS: 1,
      },
    },
    {
      expected: 'MEDIUM_LARGE',
      input: {
        phase: 'LIQUID', outsideDiameterM: 0.508, wallThicknessM: 0.009525,
        maximumUnsupportedSpanM: 15, densityKgM3: 1000, fluidVelocityMS: 1,
      },
    },
    {
      expected: 'FLEXIBLE_SMALL',
      input: {
        phase: 'LIQUID', outsideDiameterM: 0.1683, wallThicknessM: 0.00711,
        maximumUnsupportedSpanM: 10, densityKgM3: 1000, fluidVelocityMS: 1,
      },
    },
  ];

  for (const row of cases) {
    const result = calculateFit(row.input);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.support.category, row.expected);
    assertNeverAuthorizes(result.screeningCandidate);
    assert.equal(result.screeningCandidate.candidateForEngineeringReview, false);
    assert.equal(result.screeningCandidate.status, 'STANDARD_CORRELATION_NOT_EI_EXAMPLE_COVERED');
  }
});

test('component-derived multiphase path is not a candidate even when its standard correlation has EI evidence', () => {
  const result = calculateFit({
    phase: 'MULTIPHASE',
    outsideDiameterM: 0.508,
    wallThicknessM: 0.009525,
    maximumUnsupportedSpanM: 5,
    gasMassFlowKgS: 27180 / 3600,
    gasDensityKgM3: 5,
    liquidMassFlowKgS: 828796 / 3600,
    liquidDensityKgM3: (828796 / 3600) / ((326 + 532) / 3600),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.support.category, 'STIFF');
  assert.equal(result.hydraulics.resolutionMode, 'COMPONENT_DERIVED');
  assertNeverAuthorizes(result.screeningCandidate);
  assert.equal(result.screeningCandidate.candidateForEngineeringReview, false);
  assert.equal(result.screeningCandidate.status, 'PHASE_PATH_NOT_EI_EXAMPLE_COVERED');
});

test('an executed advanced path is never a screening candidate under the current evidence set', () => {
  const result = calculateFit({
    phase: 'LIQUID',
    outsideDiameterM: 0.1683,
    wallThicknessM: 0.00711,
    maximumUnsupportedSpanM: 10,
    densityKgM3: 1000,
    fluidVelocityMS: 1.6589405806551936,
    naturalFrequencyHz: 2,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert(result.advanced);
  assertNeverAuthorizes(result.screeningCandidate);
  assert.equal(result.screeningCandidate.candidateForEngineeringReview, false);
  assert.equal(result.screeningCandidate.status, 'ADVANCED_PATH_NOT_EI_EXAMPLE_COVERED');
  assert.equal(result.screeningCandidate.continuationRequired, true);
});

test('central adapter propagates candidate evidence but screening execution remains blocked', () => {
  const input = eiCase('EI-D2-FIT-RECYCLE-SUCTION-6IN').input;
  const canonical = {
    phase: input.phase,
    outsideDiameter: input.outsideDiameterM,
    wallThickness: input.wallThicknessM,
    insideDiameter: input.insideDiameterM,
    maximumUnsupportedSpan: input.maximumUnsupportedSpanM,
    massFlow: input.massFlowKgS,
    density: input.densityKgM3,
    gasDynamicViscosity: input.gasDynamicViscosityPaS,
  };

  const benchmark = VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION.calculate(
    canonical,
    { options: { qualificationMode: 'benchmark' } },
  );
  assert.equal(benchmark.ok, true, JSON.stringify(benchmark));
  assert.equal(benchmark.evidence.screeningCandidate.candidateForEngineeringReview, true);
  assert.equal(benchmark.evidence.screeningCandidate.screeningAuthorized, false);
  assert.equal(benchmark.provenance.screeningCandidateScopeId, 'FIT-SCREENING-CANDIDATE-V1');
  assert.equal(benchmark.qualification.method, 'BENCHMARK_ONLY');
  assert.equal(benchmark.qualification.designAuthority, false);

  const screening = VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION.calculate(
    canonical,
    { options: { qualificationMode: 'screening' } },
  );
  assert.equal(screening.ok, false);
  assert.equal(screening.errors[0].code, 'ENGINEERING_METHOD_NOT_QUALIFIED');
  assert.equal(Object.hasOwn(screening, 'outputs'), false);
});
