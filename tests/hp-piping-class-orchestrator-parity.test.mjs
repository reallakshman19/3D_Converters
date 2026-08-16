import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createHpPipingClassProject,
  evaluateHpPipingClassProject,
  validateHpPipingClassProject,
} from '../converters/b313-chapter-ix/hp-piping-class.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');

function close(actual, expected, tolerance = 1e-10) {
  assert(Number.isFinite(actual), `actual is not finite: ${actual}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function legacyStatic({ D, P, S, ci, co, tolerancePct, nominalWall }) {
  const pressureDesignThicknessMm = ((D - 2 * co) / 2) * (1 - Math.exp(-P / S));
  const requiredMinimumThicknessMm = pressureDesignThicknessMm + ci + co;
  const toleranceFactor = 1 - tolerancePct / 100;
  const requiredNominalThicknessMm = requiredMinimumThicknessMm / toleranceFactor;
  const minimumAsManufacturedThicknessMm = nominalWall * toleranceFactor;
  const effectiveNetWallMm = minimumAsManufacturedThicknessMm - ci - co;
  const pressureRatingMpa = S * Math.log((D - 2 * co) / (D - 2 * (minimumAsManufacturedThicknessMm - ci)));
  const staticPass = minimumAsManufacturedThicknessMm >= requiredMinimumThicknessMm && pressureRatingMpa >= P;
  return {
    pressureDesignThicknessMm,
    requiredMinimumThicknessMm,
    requiredNominalThicknessMm,
    minimumAsManufacturedThicknessMm,
    effectiveNetWallMm,
    pressureRatingMpa,
    staticPass,
  };
}

function legacyPressureState(P, D, effectiveWall) {
  const ro = D / 2;
  const ri = ro - effectiveWall;
  const denominator = ro * ro - ri * ri;
  return [
    P * (ro * ro + ri * ri) / denominator,
    P * ri * ri / denominator,
    -P,
  ];
}

function legacyStressIntensity(values) {
  return Math.max(...values) - Math.min(...values);
}

function legacyCycleSalt({ fromPressureMpa, toPressureMpa, D, effectiveWall }) {
  const from = legacyStressIntensity(legacyPressureState(fromPressureMpa, D, effectiveWall));
  const to = legacyStressIntensity(legacyPressureState(toPressureMpa, D, effectiveWall));
  return Math.abs(to - from) / 2;
}

function fatigueBasis(overrides = {}) {
  return {
    code: 'ASME BPVC VIII-3',
    edition: '2025',
    methodRef: 'KD-3 external calculation',
    calculationRef: 'HP-FAT-EXT-001',
    calculatedBy: 'ENGINEER_A',
    checkedBy: 'ENGINEER_B',
    checkedAt: '2026-08-16T04:30:00Z',
    ...overrides,
  };
}

function directProject({ nominalWallMm = 13.49, brownfield = false, withFatigue = true } = {}) {
  const direct = {
    mode: 'DIRECT_ENGINEERING_INPUT',
    outsideDiameterMm: 114.3,
    allowableStressMpa: 138,
    nominalWallMm,
    minusTolerancePct: 12.5,
  };
  const wallState = brownfield
    ? {
      fatigueWallBasis: 'PROJECTED_END_OF_LIFE',
      measuredCurrentWallMm: 10.2,
      futureInternalLossMm: 1.2,
      futureExternalLossMm: 0.3,
    }
    : { fatigueWallBasis: 'END_OF_LIFE_EFFECTIVE' };
  const greenfield = legacyStatic({
    D: direct.outsideDiameterMm,
    P: 20,
    S: direct.allowableStressMpa,
    ci: 3,
    co: 0,
    tolerancePct: direct.minusTolerancePct,
    nominalWall: direct.nominalWallMm,
  });
  const fatigueWall = brownfield ? 8.7 : greenfield.effectiveNetWallMm;
  const salt = legacyCycleSalt({
    fromPressureMpa: 2,
    toPressureMpa: 20,
    D: direct.outsideDiameterMm,
    effectiveWall: fatigueWall,
  });

  return createHpPipingClassProject({
    metadata: { projectId: 'HP-PROJ-001', classId: 'HP-CS-001', revision: 'A' },
    methodManifest: {
      b313Edition: '2024',
      viii3Edition: '2025',
      calculationMode: 'USER_CALCULATED_KD3',
    },
    classBasis: { designPressureMpa: 20, internalAllowanceMm: 3, externalAllowanceMm: 0 },
    products: [{ productId: 'NPS4-S160', calculationBasis: direct, wallState }],
    transient: withFatigue ? {
      spectrum: { spectrumId: 'HP-CS-001-SPECTRUM', designLifeYears: 20 },
      states: [
        { spectrumId: 'HP-CS-001-SPECTRUM', stateId: 'LOW', pressureMpa: 2, materialTemperatureC: 40, structuralTemperatureC: 40 },
        { spectrumId: 'HP-CS-001-SPECTRUM', stateId: 'HIGH', pressureMpa: 20, materialTemperatureC: 200, structuralTemperatureC: 200 },
      ],
      transitions: [{
        spectrumId: 'HP-CS-001-SPECTRUM', cycleId: 'C1', fromStateId: 'LOW', toStateId: 'HIGH',
        totalCycles: 500, category: 'PROCESS_CYCLE',
      }],
    } : { spectrum: null, states: [], transitions: [] },
    fatigueEvidence: withFatigue ? [{
      productId: 'NPS4-S160',
      externalResults: [{
        cycleId: 'C1', locationId: 'BORE_INNER_SURFACE', fromStateId: 'LOW', toStateId: 'HIGH',
        userAlternatingStressIntensityMpa: salt,
        equivalentAlternatingStressMpa: 70,
        permissibleCycles: 10000,
        calculationBasis: fatigueBasis(),
      }],
    }] : [],
  });
}

function checkedSource(overrides = {}) {
  return {
    qualificationState: 'INDEPENDENTLY_CHECKED',
    verifiedBy: 'ENGINEER_A', independentCheckBy: 'ENGINEER_B',
    verifiedAt: '2026-08-15T10:00:00Z', independentCheckedAt: '2026-08-15T11:00:00Z',
    ...overrides,
  };
}

function governedBasisPackage() {
  return {
    packageVersion: 'b313-ch9-basis-package/v1',
    query: { materialId: 'TEST-MAT', b313Edition: '2024', materialTemperatureC: 150, productId: 'TEST-PROD-NPS4' },
    masters: {
      sources: [
        checkedSource({ sourceId: 'SRC-B313', role: 'B313_ALLOWABLE_STRESS', standard: 'ASME B31.3', edition: '2024', documentHash: `sha256:${'a'.repeat(64)}` }),
        checkedSource({ sourceId: 'SRC-DIM', role: 'PIPE_DIMENSION', standard: 'TEST DIMENSION STANDARD', edition: 'R1', documentHash: `sha256:${'b'.repeat(64)}` }),
        checkedSource({ sourceId: 'SRC-TOL', role: 'PRODUCT_TOLERANCE', standard: 'TEST TOLERANCE STANDARD', edition: 'R1', documentHash: `sha256:${'c'.repeat(64)}` }),
      ],
      materialAllowable: [
        { materialId: 'TEST-MAT', b313Edition: '2024', temperatureC: 100, allowableStressMpa: 150, sourceId: 'SRC-B313', sourceLocator: 'Synthetic 100C', interpolationPolicy: 'LINEAR_NO_EXTRAPOLATION', qualificationState: 'INDEPENDENTLY_CHECKED' },
        { materialId: 'TEST-MAT', b313Edition: '2024', temperatureC: 200, allowableStressMpa: 130, sourceId: 'SRC-B313', sourceLocator: 'Synthetic 200C', interpolationPolicy: 'LINEAR_NO_EXTRAPOLATION', qualificationState: 'INDEPENDENTLY_CHECKED' },
      ],
      pipeProduct: [{
        productId: 'TEST-PROD-NPS4', dimensionId: 'TEST-DIM-NPS4', materialId: 'TEST-MAT',
        productSpec: 'TEST PIPE SPEC', manufacturingProcess: 'TEST_PROCESS',
        toleranceRuleId: 'TEST-TOL-12.5', qualificationState: 'INDEPENDENTLY_CHECKED',
      }],
      pipeDimension: [{
        dimensionId: 'TEST-DIM-NPS4', nps: 4, odMm: 114.3, schedule: 'TEST_160', nominalWallMm: 13.49,
        dimensionStandard: 'TEST DIMENSION STANDARD', dimensionEdition: 'R1',
        sourceId: 'SRC-DIM', sourceLocator: 'Synthetic dimension row', qualificationState: 'INDEPENDENTLY_CHECKED',
      }],
      manufacturingTolerance: [{
        toleranceRuleId: 'TEST-TOL-12.5', productSpec: 'TEST PIPE SPEC', manufacturingProcess: 'TEST_PROCESS',
        minusTolerancePct: 12.5, toleranceStandard: 'TEST TOLERANCE STANDARD', toleranceEdition: 'R1',
        sourceId: 'SRC-TOL', sourceLocator: 'Synthetic tolerance row', qualificationState: 'INDEPENDENTLY_CHECKED',
      }],
    },
  };
}

function governedProject() {
  return createHpPipingClassProject({
    metadata: { projectId: 'HP-PROJ-GOV', classId: 'HP-CS-GOV', revision: 'A' },
    methodManifest: { b313Edition: '2024', calculationMode: 'USER_CALCULATED_KD3' },
    classBasis: { designPressureMpa: 20, internalAllowanceMm: 3, externalAllowanceMm: 0 },
    products: [{
      productId: 'TEST-PROD-NPS4',
      calculationBasis: { mode: 'GOVERNED_BASIS_PACKAGE', basisPackage: governedBasisPackage() },
      wallState: { fatigueWallBasis: 'END_OF_LIFE_EFFECTIVE' },
    }],
    transient: { spectrum: null, states: [], transitions: [] },
    fatigueEvidence: [],
  });
}

test('I1 project model validates the current direct HP reference without DOM state', () => {
  const project = directProject();
  const validation = validateHpPipingClassProject(project);
  assert.equal(validation.ok, true, JSON.stringify(validation));
});

test('I2 orchestrator reproduces current legacy static and pressure-cycle Salt through canonical APIs', () => {
  const project = directProject();
  const result = evaluateHpPipingClassProject(project, { includeEvidence: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  const product = result.products[0];
  const legacy = legacyStatic({ D: 114.3, P: 20, S: 138, ci: 3, co: 0, tolerancePct: 12.5, nominalWall: 13.49 });
  const staticResult = product.calculations.static.outputs;
  close(staticResult.pressureDesignThicknessMm, legacy.pressureDesignThicknessMm);
  close(staticResult.requiredMinimumThicknessMm, legacy.requiredMinimumThicknessMm);
  close(staticResult.requiredNominalThicknessMm, legacy.requiredNominalThicknessMm);
  close(staticResult.minimumAsManufacturedThicknessMm, legacy.minimumAsManufacturedThicknessMm);
  close(staticResult.effectiveNetWallMm, legacy.effectiveNetWallMm);
  close(staticResult.pressureRatingMpa, legacy.pressureRatingMpa);
  assert.equal(staticResult.staticPass, legacy.staticPass);
  close(product.selectedFatigueWallMm, legacy.effectiveNetWallMm);

  const legacySalt = legacyCycleSalt({ fromPressureMpa: 2, toPressureMpa: 20, D: 114.3, effectiveWall: legacy.effectiveNetWallMm });
  close(product.calculations.fatigue.outputs.cycles[0].coreSaltMpa, legacySalt);
  close(product.calculations.fatigue.outputs.cumulativeUsage, 0.05);
  assert.equal(product.engineeringState, 'REVIEW_COMPLETE_NOT_AUTHORIZED');
  assert.equal(result.authority.nativeCoreKd3Qualified, false);
  assert.equal(result.authority.codeCompliance, false);
  assert.equal(result.authority.canUseForDesignAuthority, false);
});

test('I2 governed product path uses RESOLVE_BASIS and STRAIGHT_PRESSURE_FROM_BASIS', () => {
  const result = evaluateHpPipingClassProject(governedProject());
  assert.equal(result.ok, true, JSON.stringify(result));
  const product = result.products[0];
  assert.equal(product.calculations.basis.ok, true);
  assert.equal(product.calculations.basis.outputs.resolverState, 'RESOLVED_NOT_AUTHORIZED');
  close(product.resolvedBasis.allowableStressMpa, 140);
  close(product.resolvedBasis.outsideDiameterMm, 114.3);
  close(product.resolvedBasis.nominalWallMm, 13.49);
  close(product.resolvedBasis.minusTolerancePct, 12.5);
  close(product.calculations.static.outputs.pressureDesignThicknessMm, 7.607928029277122);
  close(product.calculations.static.outputs.requiredNominalThicknessMm, 12.123346319173853);
  close(product.calculations.static.outputs.pressureRatingMpa, 23.420702313632596);
  assert.equal(product.calculations.static.outputs.staticReferencePass, true);
  assert.equal(product.engineeringState, 'STATIC_EVALUATED_FATIGUE_NOT_SUPPLIED');
});

test('I2 brownfield orchestration uses explicitly selected projected end-of-life wall for fatigue', () => {
  const project = directProject({ brownfield: true });
  const result = evaluateHpPipingClassProject(project);
  assert.equal(result.ok, true, JSON.stringify(result));
  const product = result.products[0];
  close(product.calculations.wallState.outputs.projectedEndOfLifeWallMm, 8.7);
  close(product.selectedFatigueWallMm, 8.7);
  const expectedSalt = legacyCycleSalt({ fromPressureMpa: 2, toPressureMpa: 20, D: 114.3, effectiveWall: 8.7 });
  close(product.calculations.fatigue.outputs.cycles[0].coreSaltMpa, expectedSalt);
});

test('I3 separates successful execution from a static engineering reference failure', () => {
  const project = directProject({ nominalWallMm: 11.5, withFatigue: false });
  const result = evaluateHpPipingClassProject(project);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.products[0].calculationOk, true);
  assert.equal(result.products[0].calculations.static.ok, true);
  assert.equal(result.products[0].assessment.staticPass, false);
  assert.equal(result.products[0].engineeringState, 'STATIC_REFERENCE_FAIL');
  assert.equal(result.summary.staticReferenceFailed, 1);
});

test('I3 static-only class remains calculable while fatigue evidence is explicitly not supplied', () => {
  const result = evaluateHpPipingClassProject(directProject({ withFatigue: false }));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.products[0].calculations.fatigue.state, 'NOT_EVALUATED');
  assert.equal(result.products[0].assessment.fatigueEvaluated, false);
  assert.equal(result.summary.fatigueNotSupplied, 1);
});

test('I1-I3 production orchestration contains no HP UI, DOM, legacy static formula, or native KD-3 dependency', () => {
  const source = fs.readFileSync(path.join(repo, 'converters/b313-chapter-ix/hp-piping-class-orchestrator.js'), 'utf8');
  assert.doesNotMatch(source, /engineering\/hp-class-standardization/);
  assert.doesNotMatch(source, /document\.|getElementById|querySelector/);
  assert.doesNotMatch(source, /requiredPressureWall|pressureRating\s*\(|calculateAutomaticSeq|interpolateFatigueLife/);
  assert.match(source, /createEngineeringCalculationEngine/);
  assert.match(source, /PIPE\.B313\.CH9\.STRAIGHT_PRESSURE_FROM_BASIS/);
  assert.match(source, /PIPE\.B313\.CH9\.FATIGUE_USER_CALCULATED/);
});
