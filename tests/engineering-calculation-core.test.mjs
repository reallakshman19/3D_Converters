import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  calculateEngineering,
  calculateEngineeringBatch,
  getEngineeringCalculationDefinition,
  getEngineeringCalculationQualification,
  listEngineeringCalculationFamilies,
  listEngineeringCalculations,
  resolveEngineeringCalculationInputs,
  validateEngineeringCalculationInput,
} from '../converters/engineering-calculations/index.js';
import {
  EMPIRICAL_WEIGHT_MODEL,
  estimateEmpiricalWeight,
} from '../converters/empirical-weight/index.js';

const benchmark = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/B313MaterialFactors/a106-grb-full-pipeline-benchmark.json', import.meta.url),
  'utf8',
));

function b313MaterialRequest() {
  return {
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: 'PIPE.B313.MATERIAL_DESIGN',
    inputs: {
      material: benchmark.input.material,
      allowProjectFamilyDefault: benchmark.input.allowProjectFamilyDefault,
      designTemperature: benchmark.input.designTemperature,
      manufacturingRoute: benchmark.input.manufacturingRoute,
      designPressure: benchmark.input.designPressure,
      outsideDiameter: benchmark.input.outsideDiameter,
      dn: benchmark.input.dn,
      corrosionAllowance: benchmark.input.corrosionAllowance,
      negativeMillTolerance: benchmark.input.negativeMillTolerance,
      dimensionStandard: benchmark.input.dimensionStandard,
    },
    inputUnits: {
      designTemperature: benchmark.input.temperatureUnit,
      designPressure: benchmark.input.pressureUnit,
      outsideDiameter: benchmark.input.lengthUnit,
      corrosionAllowance: benchmark.input.lengthUnit,
    },
    options: { qualificationMode: 'benchmark', includeEvidence: true },
  };
}

const empiricalInput = Object.freeze({
  target: 'BW KG',
  typeDesc: 'Flanged Gate Valve',
  ns: 10,
  rating: 900,
  approach: 'FINAL',
});

test('default catalogue exposes 3 executable definitions and 16 explicitly blocked placeholders', () => {
  const all = listEngineeringCalculations();
  const available = listEngineeringCalculations({ availableOnly: true });
  assert.equal(all.length, 19);
  assert.equal(available.length, 3);
  assert.deepEqual(available.map((row) => row.id).sort(), [
    'ESTIMATION.WEIGHT.EMPIRICAL',
    'PIPE.B313.MATERIAL_DESIGN',
    'PIPE.B313.THICKNESS',
  ]);
  const families = listEngineeringCalculationFamilies();
  assert.equal(families.reduce((sum, family) => sum + family.count, 0), 19);
  assert(Object.isFrozen(all));
  assert(Object.isFrozen(getEngineeringCalculationDefinition('PIPE.B313.THICKNESS')));
});

test('B31.3 retained A106 benchmark is preserved through the centralized material-design API', () => {
  const result = calculateEngineering(b313MaterialRequest());
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.outputs.materialId, benchmark.expected.materialId);
  assert(Math.abs(result.outputs.requiredNominalThicknessMm - benchmark.expected.requiredNominalThicknessMm) < 1e-9);
  assert.equal(result.outputs.selectedNominalWallMm, benchmark.expected.selectedWallMm);
  assert.equal(result.outputs.selectedSchedule, benchmark.expected.schedule);
  assert.deepEqual(result.outputs.equivalentSchedules, benchmark.expected.equivalentSchedules);
  assert.equal(result.qualification.designAuthority, false);
  assert.equal(result.qualification.method, 'IMPLEMENTED');
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.outputs));
});

test('direct B31.3 factor path preserves provided-wall assessment without claiming design authority', () => {
  const result = calculateEngineering({
    calculationId: 'PIPE.B313.THICKNESS',
    inputs: {
      designPressure: 51.1,
      outsideDiameter: 273,
      allowableStress: benchmark.expected.S_MPa,
      qualityFactorE: 1,
      weldStrengthReductionW: 1,
      coefficientY: 0.4,
      corrosionAllowance: 6,
      negativeMillTolerance: { basis: 'percent', value: 12.5 },
      providedNominalThickness: 12.7,
    },
    inputUnits: {
      designPressure: 'barg',
      outsideDiameter: 'mm',
      allowableStress: 'MPa',
      corrosionAllowance: 'mm',
      providedNominalThickness: 'mm',
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.checks.length, 1);
  assert.equal(result.checks[0].status, 'PASS');
  assert.equal(result.assessment.pass, true);
  assert.equal(result.qualification.designAuthority, false);
});

test('empirical documented sample has direct-domain parity through the centralized API', () => {
  const direct = estimateEmpiricalWeight(empiricalInput);
  const central = calculateEngineering({
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    inputs: empiricalInput,
  });
  assert.equal(direct.ok, true, JSON.stringify(direct));
  assert.equal(central.ok, true, JSON.stringify(central));
  assert.equal(central.outputs.weightKg, direct.weightKg);
  assert.equal(central.outputs.approach, direct.approach);
  assert.equal(central.outputs.confidence, direct.confidence);
  assert.equal(central.outputs.modelId, direct.modelId);
  assert.equal(central.qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(central.qualification.designAuthority, false);
});

test('candidate empirical model is Sandbox-only and uses the same production definition', () => {
  const rejected = calculateEngineering({
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    inputs: empiricalInput,
    options: { candidateModel: EMPIRICAL_WEIGHT_MODEL },
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errors[0].code, 'INPUT_INVALID');
  assert.equal(Object.hasOwn(rejected, 'outputs'), false);

  const sandbox = calculateEngineering({
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    inputs: empiricalInput,
    options: {
      executionMode: 'sandbox',
      candidateModel: EMPIRICAL_WEIGHT_MODEL,
    },
  });
  assert.equal(sandbox.ok, true, JSON.stringify(sandbox));
  assert.equal(sandbox.provenance.candidate, true);
  assert.equal(sandbox.qualification.data, 'DRAFT');
  assert.equal(sandbox.qualification.designAuthority, false);
});

test('qualification-gated FIV placeholder fails before any numerical output is produced', () => {
  const definition = getEngineeringCalculationDefinition('VIB.FIV.FLOW_TURBULENCE');
  const qualification = getEngineeringCalculationQualification(definition.id);
  assert.equal(definition.authority.qualificationState, 'BLOCKED');
  assert.equal(definition.qualificationIssue, 429);
  assert.equal(qualification.qualificationIssue, 429);

  const result = calculateEngineering({ calculationId: definition.id, inputs: {} });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'ENGINEERING_METHOD_BLOCKED');
  assert.equal(Object.hasOwn(result, 'outputs'), false);
  assert.equal(result.qualification.effective, 'BLOCKED');
});

test('validation and resolution are available independently of execution', () => {
  const invalid = validateEngineeringCalculationInput('PIPE.B313.THICKNESS', {});
  assert.equal(invalid.ok, false);
  assert(invalid.errors.some((error) => error.code === 'INPUT_REQUIRED'));

  const resolved = resolveEngineeringCalculationInputs(
    'PIPE.B313.THICKNESS',
    {
      designPressure: 10,
      outsideDiameter: 10,
      allowableStress: 20,
      qualityFactorE: 1,
      weldStrengthReductionW: 1,
      coefficientY: 0.4,
      negativeMillTolerance: { basis: 'percent', value: 12.5 },
    },
    {},
    { inputUnits: { designPressure: 'barg', outsideDiameter: 'in', allowableStress: 'ksi' } },
  );
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert(Math.abs(resolved.canonicalInput.designPressure - 1) < 1e-12);
  assert(Math.abs(resolved.canonicalInput.outsideDiameter - 254) < 1e-12);
  assert(Math.abs(resolved.canonicalInput.allowableStress - 137.89514586336722) < 1e-9);
});

test('mixed batch preserves successful and blocked item results independently', () => {
  const batch = calculateEngineeringBatch({
    contractVersion: 'engineering-calculation-batch/v1',
    requests: [
      { calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL', inputs: empiricalInput },
      { calculationId: 'VIB.AIV.ACOUSTIC', inputs: {} },
    ],
  });
  assert.equal(batch.ok, false);
  assert.equal(batch.total, 2);
  assert.equal(batch.succeeded, 1);
  assert.equal(batch.failed, 1);
  assert.equal(batch.results[0].ok, true);
  assert.equal(batch.results[1].errors[0].code, 'ENGINEERING_METHOD_BLOCKED');
  assert(Object.isFrozen(batch));
});
