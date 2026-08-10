import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  calculateB313Thickness,
  createB313ThicknessCalculator,
  evaluateB313ProvidedWall,
  minimumAsManufacturedFromNominal,
  normalizeNegativeMillTolerance,
  requiredNominalFromMinimum,
  selectB313NominalWall,
} from '../converters/b313-thickness/index.js';

const benchmark = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/B313Thickness/b313-thickness-benchmarks.json', import.meta.url),
  'utf8',
));

function close(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual), `${label}: actual must be finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}

for (const entry of benchmark.cases) {
  test(`golden benchmark ${entry.id}: ${entry.description}`, () => {
    const result = calculateB313Thickness(entry.inputs);
    assert.equal(result.ok, true, JSON.stringify(result));
    close(result.pressureDesignThicknessMm, entry.expected.pressureDesignThicknessMm, benchmark.numericTolerance.absoluteMm, `${entry.id} pressureDesignThicknessMm`);
    close(result.requiredMinimumThicknessMm, entry.expected.requiredMinimumThicknessMm, benchmark.numericTolerance.absoluteMm, `${entry.id} requiredMinimumThicknessMm`);
    close(result.requiredNominalThicknessMm, entry.expected.requiredNominalThicknessMm, benchmark.numericTolerance.absoluteMm, `${entry.id} requiredNominalThicknessMm`);
    close(result.applicability.pressureStressRatio, entry.expected.pressureStressRatio, benchmark.numericTolerance.dimensionless, `${entry.id} pressureStressRatio`);
    close(result.applicability.thicknessDiameterRatio, entry.expected.thicknessDiameterRatio, benchmark.numericTolerance.dimensionless, `${entry.id} thicknessDiameterRatio`);
    close(result.minimumAsManufacturedAtRequiredNominalMm, result.requiredMinimumThicknessMm, benchmark.numericTolerance.absoluteMm, `${entry.id} tolerance closure`);
    assert.equal(result.edition, '2024');
    assert.equal(result.paragraph, '304.1.2');
    assert.equal(result.equation, '3a');
  });
}

for (const entry of benchmark.negativeCases) {
  test(`negative benchmark ${entry.id}: ${entry.description}`, () => {
    const result = calculateB313Thickness(entry.inputs);
    assert.equal(result.ok, false);
    assert.equal(result.code, entry.expectedCode);
  });
}

test('percent and absolute manufacturing tolerance use the same adequacy invariant', () => {
  const minimum = 10;
  const percent = normalizeNegativeMillTolerance({ basis: 'percent', value: 12.5 });
  const percentNominal = requiredNominalFromMinimum(minimum, percent);
  close(percentNominal, 11.428571428571429, 1e-12, 'percent nominal');
  close(minimumAsManufacturedFromNominal(percentNominal, percent), minimum, 1e-12, 'percent closure');

  const equivalentAbsolute = percentNominal - minimum;
  const absolute = normalizeNegativeMillTolerance({ basis: 'absolute', value: equivalentAbsolute, unit: 'mm' });
  close(requiredNominalFromMinimum(minimum, absolute), percentNominal, 1e-12, 'absolute-equivalent nominal');
  close(minimumAsManufacturedFromNominal(percentNominal, absolute), minimum, 1e-12, 'absolute closure');
});

test('bare manufacturing tolerance is never guessed', () => {
  assert.throws(() => normalizeNegativeMillTolerance(0.125), /explicit basis/);
});

test('provided-wall evaluation passes at exact manufactured minimum and fails below it', () => {
  const base = benchmark.cases[0].inputs;
  const calc = calculateB313Thickness(base);
  const exact = evaluateB313ProvidedWall({ ...base, providedNominalThickness: calc.requiredNominalThicknessMm });
  assert.equal(exact.ok, true);
  assert.equal(exact.status, 'PASS');
  close(exact.marginMm, 0, 1e-9, 'exact boundary margin');

  const fail = evaluateB313ProvidedWall({ ...base, providedNominalThickness: calc.requiredNominalThicknessMm - 0.01 });
  assert.equal(fail.ok, true);
  assert.equal(fail.status, 'FAIL');
  assert(fail.marginMm < 0);
});

test('nominal-wall selector chooses thinnest candidate whose manufactured minimum passes', () => {
  const base = benchmark.cases[0].inputs;
  const result = selectB313NominalWall({
    ...base,
    candidates: [
      { schedule: 'A', wallThicknessMm: 12.7 },
      { schedule: 'B', wallThicknessMm: 14.2 },
      { schedule: 'C', wallThicknessMm: 15.09 },
      { schedule: 'D', wallThicknessMm: 18.26 },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.selected.candidate.schedule, 'C');
  assert.equal(result.selected.pass, true);
  assert(result.evaluatedCandidates.find((row) => row.candidate.schedule === 'B').pass === false);
});

test('nominal-wall selector fails closed when no candidate is adequate', () => {
  const result = selectB313NominalWall({
    ...benchmark.cases[0].inputs,
    candidates: [{ schedule: 'A', wallThicknessMm: 8 }, { schedule: 'B', wallThicknessMm: 10 }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'NO_ADEQUATE_NOMINAL_WALL');
});

test('factory defaults are reusable across modules', () => {
  const calculator = createB313ThicknessCalculator({
    pressureUnit: 'MPa',
    stressUnit: 'MPa',
    lengthUnit: 'mm',
    qualityFactorE: 1,
    weldStrengthReductionW: 1,
    coefficientY: 0.4,
    negativeMillTolerance: { basis: 'percent', value: 12.5 },
  });
  const result = calculator.calculate({
    designPressure: 10,
    outsideDiameter: 273.05,
    allowableStress: 138,
    corrosionAllowance: 3,
  });
  close(result.requiredNominalThicknessMm, benchmark.cases[0].expected.requiredNominalThicknessMm, 1e-9, 'factory result');
});

function lcg(seed = 3132024) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('1000 seeded property cases preserve monotonic engineering relationships', () => {
  const random = lcg();
  for (let i = 0; i < 1000; i += 1) {
    const D = 50 + random() * 550;
    const S = 100 + random() * 120;
    const E = 0.85 + random() * 0.15;
    const W = 0.85 + random() * 0.15;
    const Y = 0.35 + random() * 0.15;
    const P = 0.5 + random() * Math.min(20, 0.2 * S * E);
    const ca = random() * 4;
    const tol = random() * 15;

    const common = {
      designPressure: P,
      pressureUnit: 'MPa',
      outsideDiameter: D,
      lengthUnit: 'mm',
      allowableStress: S,
      stressUnit: 'MPa',
      qualityFactorE: E,
      weldStrengthReductionW: W,
      coefficientY: Y,
      corrosionAllowance: ca,
      negativeMillTolerance: { basis: 'percent', value: tol },
    };

    const base = calculateB313Thickness(common);
    if (!base.ok) continue;

    const higherPressure = calculateB313Thickness({ ...common, designPressure: P * 1.01 });
    if (higherPressure.ok) assert(higherPressure.requiredNominalThicknessMm >= base.requiredNominalThicknessMm);

    const higherStress = calculateB313Thickness({ ...common, allowableStress: S * 1.01 });
    if (higherStress.ok) assert(higherStress.requiredNominalThicknessMm <= base.requiredNominalThicknessMm);

    const higherCorrosion = calculateB313Thickness({ ...common, corrosionAllowance: ca + 0.1 });
    assert.equal(higherCorrosion.ok, true);
    assert(higherCorrosion.requiredNominalThicknessMm > base.requiredNominalThicknessMm);

    const higherTolerance = calculateB313Thickness({ ...common, negativeMillTolerance: { basis: 'percent', value: Math.min(50, tol + 0.1) } });
    assert.equal(higherTolerance.ok, true);
    assert(higherTolerance.requiredNominalThicknessMm >= base.requiredNominalThicknessMm);
  }
});
