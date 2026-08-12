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

test('default catalogue exposes 3 executable definitions and 19 qualification-blocked placeholders', () => {
  const all = listEngineeringCalculations();
  const available = listEngineeringCalculations({ availableOnly: true });
  assert.equal(all.length, 22);
  assert.equal(available.length, 3);
  assert.deepEqual(available.map((row) => row.id).sort(), [
    'ESTIMATION.WEIGHT.EMPIRICAL',
    'PIPE.B313.MATERIAL_DESIGN',
    'PIPE.B313.THICKNESS',
  ]);
  const families = listEngineeringCalculationFamilies();
  assert.equal(families.reduce((sum, family) => sum + family.count, 0), 22);
  const externalPressure = getEngineeringCalculationDefinition('PIPE.EXTERNAL_PRESSURE.CHECK');
  assert.equal(externalPressure.authority.qualificationState, 'BLOCKED');
  assert.equal(externalPressure.qualificationIssue, 428);
  const shellIndentation = getEngineeringCalculationDefinition('PIPE.SHELL_INDENTATION');
  assert.equal(shellIndentation.id, 'PIPE.SHELL_INDENTATION');
  assert.equal(shellIndentation.authority.qualificationState, 'BLOCKED');
  assert.equal(shellIndentation.qualificationIssue, 428);
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

test('B31.3 direct-factor provided-wall check maps exact governing semantics', () => {
  const request = {
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: 'PIPE.B313.THICKNESS',
    inputs: {
      designPressure: 2,
      outsideDiameter: 114.3,
      allowableStress: 138,
      weldJointFactor: 1,
      weldStrengthReductionFactor: 1,
      coefficientY: 0.4,
      corrosionAllowance: 3,
      mechanicalAllowance: 0,
      erosionAllowance: 0,
      negativeMillTolerance: 12.5,
      providedNominalThickness: 13.49,
    },
    inputUnits: {
      designPressure: 'MPa',
      outsideDiameter: 'mm',
      allowableStress: 'MPa',
      corrosionAllowance: 'mm',
      mechanicalAllowance: 'mm',
      erosionAllowance: 'mm',
      providedNominalThickness: 'mm',
    },
    options: { qualificationMode: 'strict', includeEvidence: true },
  };
  const result = calculateEngineering(request);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.outputs.providedNominalThicknessMm, 13.49);
  assert.equal(result.outputs.providedWallPass, true);
  assert.equal(result.qualification.designAuthority, false);
});

test('empirical FINAL result has direct-vs-central parity and Sandbox candidate protection', () => {
  const direct = estimateEmpiricalWeight(empiricalInput);
  const central = calculateEngineering({
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    inputs: empiricalInput,
    options: { qualificationMode: 'benchmark' },
  });
  assert.equal(central.ok, true, JSON.stringify(central));
  assert.equal(central.outputs.estimateKg, direct.final);
  assert.equal(central.outputs.approach1Kg, direct.approach1);
  assert.equal(central.outputs.approach2Kg, direct.approach2);
  assert.equal(central.qualification.designAuthority, false);

  const forbiddenCandidate = calculateEngineering({
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    inputs: { ...empiricalInput, candidateModel: EMPIRICAL_WEIGHT_MODEL },
    options: { qualificationMode: 'benchmark' },
  });
  assert.equal(forbiddenCandidate.ok, false);
  assert.equal(forbiddenCandidate.errors[0].code, 'INPUT_INVALID');

  const sandboxCandidate = calculateEngineering({
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
    executionMode: 'sandbox',
    inputs: { ...empiricalInput, candidateModel: EMPIRICAL_WEIGHT_MODEL },
    options: { qualificationMode: 'benchmark' },
  });
  assert.equal(sandboxCandidate.ok, true, JSON.stringify(sandboxCandidate));
  assert.equal(sandboxCandidate.outputs.estimateKg, direct.final);
});

test('blocked methods are discoverable but numerical execution remains unavailable', () => {
  const definition = getEngineeringCalculationDefinition('VIB.FIV.FLOW_TURBULENCE');
  assert(definition);
  assert.equal(definition.authority.qualificationState, 'BLOCKED');
  assert.equal(definition.qualificationIssue, 429);
  assert.equal(definition.inputs.length, 0);
  assert.equal(definition.outputs.length, 0);

  const result = calculateEngineering({
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    calculationId: definition.id,
    inputs: {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'ENGINEERING_METHOD_BLOCKED');
});

test('independent validate and resolve routes normalize units before execution', () => {
  const request = b313MaterialRequest();
  const validation = validateEngineeringCalculationInput(
    request.calculationId,
    request.inputs,
    { inputUnits: request.inputUnits, context: {}, ...request.options },
  );
  assert.equal(validation.ok, true, JSON.stringify(validation));

  const resolution = resolveEngineeringCalculationInputs(
    request.calculationId,
    request.inputs,
    {},
    { inputUnits: request.inputUnits, ...request.options },
  );
  assert.equal(resolution.ok, true, JSON.stringify(resolution));
  assert.equal(resolution.values.designPressure, benchmark.input.designPressure * 0.1);
  assert.equal(resolution.units.designPressure, 'MPa');
});

test('mixed batch returns immutable per-request results in source order', () => {
  const batch = calculateEngineeringBatch({
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    requests: [
      b313MaterialRequest(),
      {
        contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
        calculationId: 'VIB.FIV.FLOW_TURBULENCE',
        inputs: {},
      },
      {
        contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
        calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL',
        inputs: empiricalInput,
        options: { qualificationMode: 'benchmark' },
      },
    ],
  });
  assert.equal(batch.results.length, 3);
  assert.equal(batch.results[0].ok, true);
  assert.equal(batch.results[1].ok, false);
  assert.equal(batch.results[2].ok, true);
  assert(Object.isFrozen(batch));
  assert(Object.isFrozen(batch.results));
});

test('qualification discovery remains conservative', () => {
  const b313 = getEngineeringCalculationQualification('PIPE.B313.MATERIAL_DESIGN');
  const empirical = getEngineeringCalculationQualification('ESTIMATION.WEIGHT.EMPIRICAL');
  const blocked = getEngineeringCalculationQualification('VIB.FIV.FLOW_TURBULENCE');
  assert.equal(b313.designAuthority, false);
  assert.equal(empirical.designAuthority, false);
  assert.equal(blocked.designAuthority, false);
});
