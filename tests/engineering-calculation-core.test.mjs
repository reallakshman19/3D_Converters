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

function fitGasRequest(qualificationMode = 'benchmark') {
  return {
    calculationId: 'VIB.FIV.FLOW_TURBULENCE',
    inputs: {
      phase: 'GAS',
      outsideDiameter: 168.3,
      wallThickness: 21.9456,
      insideDiameter: 124.3838,
      maximumUnsupportedSpan: 4000,
      density: 5,
      massFlow: 20000,
      gasDynamicViscosity: 0.02,
    },
    inputUnits: {
      outsideDiameter: 'mm',
      wallThickness: 'mm',
      insideDiameter: 'mm',
      maximumUnsupportedSpan: 'mm',
      density: 'kg/m3',
      massFlow: 'kg/h',
      gasDynamicViscosity: 'cP',
    },
    options: { qualificationMode, includeEvidence: true },
  };
}

function nearlyEqual(actual, expected, tolerance = 1e-12) {
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test('default catalogue exposes 4 executable definitions and 18 qualification-blocked placeholders', () => {
  const all = listEngineeringCalculations();
  const available = listEngineeringCalculations({ availableOnly: true });
  assert.equal(all.length, 22);
  assert.equal(available.length, 4);
  assert.deepEqual(available.map((row) => row.id).sort(), [
    'ESTIMATION.WEIGHT.EMPIRICAL',
    'PIPE.B313.MATERIAL_DESIGN',
    'PIPE.B313.THICKNESS',
    'VIB.FIV.FLOW_TURBULENCE',
  ]);
  const families = listEngineeringCalculationFamilies();
  assert.equal(families.reduce((sum, family) => sum + family.count, 0), 22);
  const externalPressure = getEngineeringCalculationDefinition('PIPE.EXTERNAL_PRESSURE.CHECK');
  assert.equal(externalPressure.authority.qualificationState, 'BLOCKED');
  assert.equal(externalPressure.qualificationIssue, 428);
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
  const central = calculateEngineering({ calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL', inputs: empiricalInput });
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
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL', inputs: empiricalInput,
    options: { candidateModel: EMPIRICAL_WEIGHT_MODEL },
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errors[0].code, 'INPUT_INVALID');
  assert.equal(Object.hasOwn(rejected, 'outputs'), false);
  const sandbox = calculateEngineering({
    calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL', inputs: empiricalInput,
    options: { executionMode: 'sandbox', candidateModel: EMPIRICAL_WEIGHT_MODEL },
  });
  assert.equal(sandbox.ok, true, JSON.stringify(sandbox));
  assert.equal(sandbox.provenance.candidate, true);
  assert.equal(sandbox.qualification.data, 'DRAFT');
  assert.equal(sandbox.qualification.designAuthority, false);
});

test('FIT is active only as benchmark-only workbook reference and retains issue #429', () => {
  const definition = getEngineeringCalculationDefinition('VIB.FIV.FLOW_TURBULENCE');
  const qualification = getEngineeringCalculationQualification(definition.id);
  assert.equal(definition.id, 'VIB.FIV.FLOW_TURBULENCE');
  assert.equal(definition.name, 'Flow-Induced Turbulence (FIT) — Workbook Reference');
  assert.equal(definition.methodRevision, 'crf-fit-d7d4c1-reference-v1');
  assert.equal(definition.authority.calculationState, 'IMPLEMENTED');
  assert.equal(definition.authority.qualificationState, 'BENCHMARK_ONLY');
  assert.equal(definition.authority.codeCompliance, false);
  assert.equal(definition.qualificationIssue, 429);
  assert.equal(qualification.qualificationIssue, 429);
  assert.equal(definition.ui.requiredQualificationMode, 'benchmark');
  assert(definition.inputs.every((field) => field.engineeringDefault === undefined));
});

test('FIT strict and screening execution fail closed while benchmark mode reproduces retained gas reference', () => {
  for (const mode of ['strict', 'screening']) {
    const blocked = calculateEngineering(fitGasRequest(mode));
    assert.equal(blocked.ok, false);
    assert.equal(blocked.errors[0].code, 'ENGINEERING_METHOD_NOT_QUALIFIED');
    assert.equal(blocked.qualification.effective, 'BENCHMARK_ONLY');
    assert.equal(Object.hasOwn(blocked, 'outputs'), false);
  }
  const result = calculateEngineering(fitGasRequest('benchmark'));
  assert.equal(result.ok, true, JSON.stringify(result));
  nearlyEqual(result.outputs.standardLof, 0.06111973374777248, 1e-12);
  nearlyEqual(result.outputs.standardFv, 96734.96621707715, 1e-8);
  assert.equal(result.outputs.refinedLof, null);
  assert.equal(result.assessment.status, 'REFERENCE_BELOW_THRESHOLD');
  assert.equal(Object.hasOwn(result.assessment, 'pass'), false);
  assert.equal(result.qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(result.qualification.designAuthority, false);
  assert.equal(result.provenance.engineeringAuthority, 'WORKBOOK_REFERENCE_ONLY');
  assert.equal(result.provenance.sourceWorkbook.gitBlob, 'd7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e');
});

test('FIT central Resolve normalizes native workbook units including dynamic viscosity', () => {
  const request = fitGasRequest('benchmark');
  const resolved = resolveEngineeringCalculationInputs(
    request.calculationId, request.inputs, {},
    { inputUnits: request.inputUnits, qualificationMode: 'benchmark' },
  );
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  nearlyEqual(resolved.canonicalInput.outsideDiameter, 0.1683);
  nearlyEqual(resolved.canonicalInput.wallThickness, 0.0219456);
  nearlyEqual(resolved.canonicalInput.insideDiameter, 0.1243838);
  nearlyEqual(resolved.canonicalInput.maximumUnsupportedSpan, 4);
  nearlyEqual(resolved.canonicalInput.massFlow, 20000 / 3600);
  nearlyEqual(resolved.canonicalInput.gasDynamicViscosity, 0.00002);
  assert.equal(resolved.resolvedInputs.massFlow.transformation, 'kg/h->kg/s');
  assert.equal(resolved.resolvedInputs.gasDynamicViscosity.transformation, 'cP->Pa*s');
});

test('FIT validation fails closed on missing gas viscosity and unresolved manual-diameter family', () => {
  const missingViscosity = fitGasRequest('benchmark');
  delete missingViscosity.inputs.gasDynamicViscosity;
  delete missingViscosity.inputUnits.gasDynamicViscosity;
  const missing = validateEngineeringCalculationInput(
    missingViscosity.calculationId, missingViscosity.inputs,
    { inputUnits: missingViscosity.inputUnits, qualificationMode: 'benchmark' },
  );
  assert.equal(missing.ok, false);
  assert(missing.errors.some((error) => error.field === 'gasDynamicViscosity'));

  const gap = calculateEngineering({
    calculationId: 'VIB.FIV.FLOW_TURBULENCE',
    inputs: {
      phase: 'LIQUID', outsideDiameter: 250, wallThickness: 10,
      maximumUnsupportedSpan: 20, density: 900, massFlow: 36000,
    },
    inputUnits: {
      outsideDiameter: 'mm', wallThickness: 'mm', maximumUnsupportedSpan: 'm',
      density: 'kg/m3', massFlow: 'kg/h',
    },
    options: { qualificationMode: 'benchmark' },
  });
  assert.equal(gap.ok, false);
  assert.equal(gap.errors[0].code, 'INPUT_OUTSIDE_APPLICABILITY');
});

test('other vibration mechanisms remain qualification-blocked', () => {
  const definition = getEngineeringCalculationDefinition('VIB.AIV.ACOUSTIC');
  assert.equal(definition.authority.qualificationState, 'BLOCKED');
  assert.deepEqual(definition.inputs, []);
  const result = calculateEngineering({ calculationId: definition.id, inputs: {} });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'ENGINEERING_METHOD_BLOCKED');
  assert.equal(Object.hasOwn(result, 'outputs'), false);
});

test('validation and resolution remain available independently of execution', () => {
  const invalid = validateEngineeringCalculationInput('PIPE.B313.THICKNESS', {});
  assert.equal(invalid.ok, false);
  assert(invalid.errors.some((error) => error.code === 'INPUT_REQUIRED'));
  const resolved = resolveEngineeringCalculationInputs(
    'PIPE.B313.THICKNESS',
    {
      designPressure: 10, outsideDiameter: 10, allowableStress: 20,
      qualityFactorE: 1, weldStrengthReductionW: 1, coefficientY: 0.4,
      negativeMillTolerance: { basis: 'percent', value: 12.5 },
    }, {},
    { inputUnits: { designPressure: 'barg', outsideDiameter: 'in', allowableStress: 'ksi' } },
  );
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert(Math.abs(resolved.canonicalInput.designPressure - 1) < 1e-12);
  assert(Math.abs(resolved.canonicalInput.outsideDiameter - 254) < 1e-12);
  assert(Math.abs(resolved.canonicalInput.allowableStress - 137.89514586336722) < 1e-9);
});

test('mixed batch preserves benchmark FIT, successful empirical, and blocked AIV results independently', () => {
  const batch = calculateEngineeringBatch({
    contractVersion: 'engineering-calculation-batch/v1',
    requests: [
      fitGasRequest('benchmark'),
      { calculationId: 'ESTIMATION.WEIGHT.EMPIRICAL', inputs: empiricalInput },
      { calculationId: 'VIB.AIV.ACOUSTIC', inputs: {} },
    ],
  });
  assert.equal(batch.ok, false);
  assert.equal(batch.total, 3);
  assert.equal(batch.succeeded, 2);
  assert.equal(batch.failed, 1);
  assert.equal(batch.results[0].qualification.effective, 'BENCHMARK_ONLY');
  assert.equal(batch.results[1].ok, true);
  assert.equal(batch.results[2].errors[0].code, 'ENGINEERING_METHOD_BLOCKED');
  assert(Object.isFrozen(batch));
});
