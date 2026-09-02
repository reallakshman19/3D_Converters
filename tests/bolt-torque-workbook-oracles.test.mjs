import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { calculateLegacyWorkbookDetailedAssembly } from '../converters/engineering-calculations/bolts/detailed-friction.js';
import {
  calculateShortFormTorque,
  calculateTargetPreload,
} from '../converters/engineering-calculations/bolts/short-form.js';

const INCH_M = 0.0254;
const LBF_N = 4.4482216152605;
const FT_LB_NM = 1.3558179483314004;

const fixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/bolt-torque-workbook-oracles.json', import.meta.url), 'utf8'),
);
const { detailedFriction, shortFormBs3580, shigleyClampBolt } = fixture.oracles;

function relativeError(actual, expected) {
  return Math.abs(actual - expected) / Math.abs(expected);
}

/** Short-form torque from area in mm^2, yield in MPa, diameter in mm. */
function shortFormTorqueNm({ areaMm2, yieldMPa, fraction, nutFactor, diameterMm }) {
  const preload = calculateTargetPreload({
    tensileStressAreaM2: areaMm2 * 1e-6,
    referenceStressPa: yieldMPa * 1e6,
    preloadFraction: fraction,
  });
  return calculateShortFormTorque({
    preloadN: preload.targetPreloadN,
    nominalDiameterM: diameterMm / 1000,
    nutFactor,
  }).torqueNm;
}

test('fixture is transcription-only and cites all three distinct torque bases', () => {
  assert.equal(fixture.recordState, 'TRANSCRIBED');
  assert.equal(fixture.useAuthority, 'TEST_ONLY');
  for (const oracle of [detailedFriction, shortFormBs3580, shigleyClampBolt]) {
    assert.match(oracle.source.sha256, /^[0-9a-f]{64}$/);
    assert.ok(fs.existsSync(new URL(`../${oracle.source.path}`, import.meta.url)));
  }
  const paths = new Set([
    detailedFriction.source.path, shortFormBs3580.source.path, shigleyClampBolt.source.path,
  ]);
  assert.equal(paths.size, 3, 'the three bases must come from three different sources');
});

// --- oracle 1: detailed V-thread torque -------------------------------------

test('detailed friction kernel reproduces the workbook thread geometry', () => {
  const geometry = calculateLegacyWorkbookDetailedAssembly({
    preloadN: detailedFriction.preloadLb * LBF_N,
    nominalDiameterM: detailedFriction.inputs.nominalDiameterIn * INCH_M,
    pitchM: detailedFriction.inputs.pitchIn * INCH_M,
    starts: 1,
    threadFrictionCoefficient: detailedFriction.inputs.threadFrictionCoefficient,
    bearingFrictionCoefficient: detailedFriction.inputs.bearingFrictionCoefficient,
    innerBearingDiameterM: detailedFriction.inputs.innerNutBearingDiameterIn * INCH_M,
    outerBearingDiameterM: detailedFriction.inputs.outerNutBearingDiameterIn * INCH_M,
  }).geometry;
  const expected = detailedFriction.derivedGeometry;

  assert.ok(relativeError(geometry.fundamentalTriangleHeightM / INCH_M, expected.fundamentalTriangleHeightIn) < 1e-12);
  assert.ok(relativeError(geometry.pitchDiameterM / INCH_M, expected.pitchDiameterIn) < 1e-12);
  assert.ok(relativeError(geometry.minorDiameterM / INCH_M, expected.minorDiameterIn) < 1e-12);
  assert.ok(relativeError(geometry.tensileStressAreaM2 / INCH_M ** 2, expected.tensileStressAreaIn2) < 1e-12);
  assert.ok(relativeError(geometry.helixAngleRad * 180 / Math.PI, expected.leadAngleDeg) < 1e-12);
  assert.equal(geometry.threadHalfAngleDeg * 2, expected.includedThreadAngleDeg);
});

test('detailed friction kernel reproduces the workbook nut factor decomposition', () => {
  const result = calculateLegacyWorkbookDetailedAssembly({
    preloadN: detailedFriction.preloadLb * LBF_N,
    nominalDiameterM: detailedFriction.inputs.nominalDiameterIn * INCH_M,
    pitchM: detailedFriction.inputs.pitchIn * INCH_M,
    starts: 1,
    threadFrictionCoefficient: detailedFriction.inputs.threadFrictionCoefficient,
    bearingFrictionCoefficient: detailedFriction.inputs.bearingFrictionCoefficient,
    innerBearingDiameterM: detailedFriction.inputs.innerNutBearingDiameterIn * INCH_M,
    outerBearingDiameterM: detailedFriction.inputs.outerNutBearingDiameterIn * INCH_M,
  });
  const legacy = result.legacyLinearized;
  const preloadTimesDiameter = legacy.preloadN * result.geometry.nominalDiameterM;
  const expected = detailedFriction.nutFactorComponents;

  assert.ok(relativeError(legacy.pitchTorqueNm / preloadTimesDiameter, expected.pitch) < 1e-12);
  assert.ok(relativeError(legacy.threadFrictionTorqueNm / preloadTimesDiameter, expected.threadFriction) < 1e-12);
  assert.ok(relativeError(legacy.bearingTorqueNm / preloadTimesDiameter, expected.bearingFriction) < 1e-12);

  const totalNutFactor = expected.pitch + expected.threadFriction + expected.bearingFriction;
  assert.ok(relativeError(legacy.effectiveNutFactor, totalNutFactor) < 1e-12);
});

test('detailed friction kernel matches the self-consistent ft-lb cell, not the defective N-m cell', () => {
  const legacy = calculateLegacyWorkbookDetailedAssembly({
    preloadN: detailedFriction.preloadLb * LBF_N,
    nominalDiameterM: detailedFriction.inputs.nominalDiameterIn * INCH_M,
    pitchM: detailedFriction.inputs.pitchIn * INCH_M,
    starts: 1,
    threadFrictionCoefficient: detailedFriction.inputs.threadFrictionCoefficient,
    bearingFrictionCoefficient: detailedFriction.inputs.bearingFrictionCoefficient,
    innerBearingDiameterM: detailedFriction.inputs.innerNutBearingDiameterIn * INCH_M,
    outerBearingDiameterM: detailedFriction.inputs.outerNutBearingDiameterIn * INCH_M,
  }).legacyLinearized;

  assert.ok(
    relativeError(legacy.totalTorqueNm / FT_LB_NM, detailedFriction.torque.selfConsistentFtLb) < 1e-12,
    'kernel must reproduce the workbook ft-lb torque',
  );

  // The workbook's own N-m cell is internally inconsistent; the kernel must not match it.
  const cellDeviation = relativeError(legacy.totalTorqueNm, detailedFriction.torque.workbookNewtonMetreCell);
  assert.ok(cellDeviation > 0.002, 'the defective N-m cell should remain unmatched');
  assert.ok(cellDeviation < 0.003, 'the N-m cell defect is ~0.25%; a larger gap means something else changed');
});

// --- oracle 2: BS 3580 short-form table -------------------------------------

test('short form reproduces every Min and Max cell exactly for the reproducible grades', () => {
  const { nutFactorUsed, minFraction, maxFraction } = shortFormBs3580.parameters;
  let checked = 0;

  for (const row of shortFormBs3580.rows) {
    for (const grade of shortFormBs3580.reproducibleGrades) {
      const cells = row.grades[grade];
      for (const [fraction, expected] of [[minFraction, cells.minNm], [maxFraction, cells.maxNm]]) {
        const torque = shortFormTorqueNm({
          areaMm2: row.tensileStressAreaMm2,
          yieldMPa: cells.statedYieldMPa,
          fraction,
          nutFactor: nutFactorUsed,
          diameterMm: row.nominalDiameterMm,
        });
        assert.ok(
          relativeError(torque, expected) < 1e-9,
          `M${row.nominalDiameterMm} ${grade} at ${fraction} yield: ${torque} vs ${expected}`,
        );
        checked += 1;
      }
    }
  }
  assert.equal(checked, shortFormBs3580.rows.length * shortFormBs3580.reproducibleGrades.length * 2);
});

test('the Design column is excluded because it is hand-rounded, not computed', () => {
  const { nutFactorUsed, designFraction } = shortFormBs3580.parameters;
  let differing = 0;
  let worst = 0;

  for (const row of shortFormBs3580.rows) {
    for (const grade of shortFormBs3580.reproducibleGrades) {
      const cells = row.grades[grade];
      const torque = shortFormTorqueNm({
        areaMm2: row.tensileStressAreaMm2,
        yieldMPa: cells.statedYieldMPa,
        fraction: designFraction,
        nutFactor: nutFactorUsed,
        diameterMm: row.nominalDiameterMm,
      });
      const deviation = (cells.designNm - torque) / torque;
      if (Math.abs(deviation) > 1e-9) differing += 1;
      if (Math.abs(deviation) > Math.abs(worst)) worst = deviation;
    }
  }

  assert.equal(differing, 33, 'the count of hand-rounded Design cells must not drift silently');
  assert.ok(worst > 0.06 && worst < 0.07, `worst Design deviation should be ~+6.29%, got ${worst}`);
  assert.ok(worst > 0, 'Design cells round upward, exceeding the 0.7-yield target they claim');
  assert.match(shortFormBs3580.excludedColumn.reason, /Hand-rounded/);
});

test('the Titanium column does not reproduce from its stated yield and is excluded', () => {
  const { nutFactorUsed, minFraction } = shortFormBs3580.parameters;
  const titanium = shortFormBs3580.unreproducibleGrades.Titanium;
  const row = shortFormBs3580.rows.find((item) => item.nominalDiameterMm === 20);
  const cells = row.grades.Titanium;

  const atStatedYield = shortFormTorqueNm({
    areaMm2: row.tensileStressAreaMm2,
    yieldMPa: titanium.statedYieldMPa,
    fraction: minFraction,
    nutFactor: nutFactorUsed,
    diameterMm: row.nominalDiameterMm,
  });
  // 275 / 366.67 = 0.75, so the stated yield under-predicts the column by exactly 25%.
  assert.ok(
    relativeError(atStatedYield, cells.minNm) > 0.24,
    'stated 275 MPa must not reproduce the column',
  );
  assert.ok(relativeError(atStatedYield, cells.minNm) < 0.26);

  const atImpliedYield = shortFormTorqueNm({
    areaMm2: row.tensileStressAreaMm2,
    yieldMPa: titanium.impliedYieldAtStatedNutFactorMPa,
    fraction: minFraction,
    nutFactor: nutFactorUsed,
    diameterMm: row.nominalDiameterMm,
  });
  assert.ok(relativeError(atImpliedYield, cells.minNm) < 1e-9);

  // The same cells also follow from the stated yield at a higher nut factor, so the
  // two readings cannot be separated from cell values alone.
  const atStatedYieldHigherK = shortFormTorqueNm({
    areaMm2: row.tensileStressAreaMm2,
    yieldMPa: titanium.statedYieldMPa,
    fraction: minFraction,
    nutFactor: 0.2,
    diameterMm: row.nominalDiameterMm,
  });
  assert.ok(relativeError(atStatedYieldHigherK, cells.minNm) < 1e-9);
  assert.ok(!shortFormBs3580.reproducibleGrades.includes('Titanium'));
});

test('the lubricant nut factor table stays within its published range', () => {
  const factors = Object.values(shortFormBs3580.nutFactorsByLubricant);
  assert.equal(factors.length, 7);
  assert.equal(Math.min(...factors), 0.12);
  assert.equal(Math.max(...factors), 0.3);
  assert.ok(factors.includes(shortFormBs3580.parameters.nutFactorUsed));
});

// --- oracle 3: Shigley clamp bolt torque ------------------------------------

test('short form at K = 0.2 reproduces every Shigley clamp bolt torque', () => {
  assert.equal(shigleyClampBolt.parameters.nutFactor, 0.2);
  assert.equal(shigleyClampBolt.rows.length, 9);

  for (const row of shigleyClampBolt.rows) {
    const torque = calculateShortFormTorque({
      preloadN: row.boltForceN,
      nominalDiameterM: row.boltDiameterMm / 1000,
      nutFactor: shigleyClampBolt.parameters.nutFactor,
    }).torqueNm;
    assert.ok(
      relativeError(torque, row.torqueNm) < 1e-12,
      `DN${row.nominalBoreDn}: ${torque} vs ${row.torqueNm}`,
    );
  }
});

test('the three bases are genuinely distinct nut factors', () => {
  const detailedNutFactor = detailedFriction.nutFactorComponents.pitch
    + detailedFriction.nutFactorComponents.threadFriction
    + detailedFriction.nutFactorComponents.bearingFriction;

  const bases = [
    detailedNutFactor,
    shortFormBs3580.parameters.nutFactorUsed,
    shigleyClampBolt.parameters.nutFactor,
  ];
  assert.equal(new Set(bases).size, 3, 'the package supplies three different effective nut factors');
  assert.ok(detailedNutFactor > 0.15 && detailedNutFactor < 0.2);
});
