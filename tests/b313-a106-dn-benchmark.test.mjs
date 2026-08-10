import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { calculateB313Thickness } from '../converters/b313-thickness/index.js';

const benchmark = JSON.parse(fs.readFileSync(
  new URL('../Benchmarks/B313Thickness/a106-grb-dn-thickness-benchmark.json', import.meta.url),
  'utf8',
));

function close(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual), `${label}: actual must be finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}

for (const row of benchmark.rows) {
  test(`A106 Gr B DN${row.dn} derives t and tm`, () => {
    const result = calculateB313Thickness({
      ...benchmark.sharedInputs,
      outsideDiameter: row.outsideDiameterMm,
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    close(result.tMm, row.expected.tMm, 1e-12, `DN${row.dn} t`);
    close(result.tmMm, row.expected.tmMm, 1e-12, `DN${row.dn} tm`);
    close(result.requiredNominalThicknessMm, row.expected.requiredNominalThicknessMm, 1e-12, `DN${row.dn} ordered wall`);
    close(result.applicability.pressureAllowableStressRatio, benchmark.expectedPressureAllowableStressRatio, 1e-12, `DN${row.dn} P/S`);
    close(result.tmMm, result.tMm + benchmark.sharedInputs.corrosionAllowance, 1e-12, `DN${row.dn} tm=t+C`);
    close(
      result.requiredNominalThicknessMm,
      result.tmMm / (1 - benchmark.sharedInputs.negativeMillTolerance.value / 100),
      1e-12,
      `DN${row.dn} tolerance adjustment`,
    );
  });
}
