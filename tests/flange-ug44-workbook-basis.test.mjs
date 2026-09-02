import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  LEGACY_WORKBOOK_PI,
  STATIC_HEAD_GRAVITY_M_PER_S2,
  designPressureWithStaticHeadPa,
  legacyWorkbookUg44Acceptance,
  meanGasketReactionDiameterM,
  resolveEqualOrthogonalMomentNm,
  staticHeadPressurePa,
} from '../converters/engineering-calculations/flange/ug44-workbook-basis.js';
import { ug44AcceptanceEquation } from '../converters/engineering-calculations/flange/ug44.js';
import { resolveFlangeOpeningLoads } from '../converters/engineering-calculations/flange/joint-loads.js';

const fixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/flange-ug44-workbook-rows.json', import.meta.url), 'utf8'),
);

function closeTo(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

test('transcribed workbook fixture covers the full published size/class matrix', () => {
  assert.equal(fixture.rows.length, 84);
  assert.equal(fixture.rowCount, 84);
  assert.equal(fixture.useAuthority, 'TEST_ONLY');
  assert.deepEqual(
    [...new Set(fixture.rows.map((row) => row.pressureClass))].sort((a, b) => a - b),
    [150, 300, 600, 900],
  );
  assert.equal(new Set(fixture.rows.map((row) => row.nominalSizeIn)).size, 21);
});

test('mean gasket diameter basis reproduces every transcribed workbook G', () => {
  for (const row of fixture.rows) {
    const derived = meanGasketReactionDiameterM({
      gasketInnerDiameterMm: row.gasketInnerDiameterMm,
      gasketOuterDiameterMm: row.gasketOuterDiameterMm,
    });
    assert.ok(
      closeTo(derived.gasketReactionDiameterMm, row.gasketReactionDiameterMm, 1e-9),
      `size ${row.nominalSizeIn}" class ${row.pressureClass}: G mm mismatch`,
    );
    assert.ok(
      closeTo(derived.gasketReactionDiameterM, row.gasketReactionDiameterM, 1e-12),
      `size ${row.nominalSizeIn}" class ${row.pressureClass}: G m mismatch`,
    );
    assert.equal(derived.isCodeSeatingWidthDerivation, false);
  }
});

test('equal-orthogonal-component scenario reproduces every transcribed resolved moment', () => {
  for (const row of fixture.rows) {
    const resolved = resolveEqualOrthogonalMomentNm({ componentMomentNm: row.componentMomentKNm });
    assert.ok(
      closeTo(resolved.resolvedMomentNm, row.resolvedMomentKNm, 1e-12),
      `size ${row.nominalSizeIn}" class ${row.pressureClass}: resolved moment mismatch`,
    );
    assert.equal(resolved.isGeneralComponentResolution, false);
  }
});

test('the workbook moment scenario is not the general component resolution', () => {
  const scenario = resolveEqualOrthogonalMomentNm({ componentMomentNm: 30 });
  assert.ok(closeTo(scenario.resolvedMomentNm, 30 * Math.SQRT2, 1e-12));

  const equalComponents = resolveFlangeOpeningLoads({ momentNm: { x: 30, y: 30 } });
  assert.ok(closeTo(equalComponents.bendingMomentNm, scenario.resolvedMomentNm, 1e-12));

  const unequalComponents = resolveFlangeOpeningLoads({ momentNm: { x: 30, y: 0 } });
  assert.equal(unequalComponents.bendingMomentNm, 30);
  assert.ok(unequalComponents.bendingMomentNm < scenario.resolvedMomentNm);
});

test('static head basis uses standard gravity and matches a known water column', () => {
  assert.equal(STATIC_HEAD_GRAVITY_M_PER_S2, 9.80665);
  const head = staticHeadPressurePa({ specificGravity: 1, liquidHeightM: 10 });
  assert.ok(closeTo(head.staticHeadKPa, 98.0665, 1e-9));
  assert.ok(closeTo(head.staticHeadPa, 98_066.5, 1e-6));

  const withHead = designPressureWithStaticHeadPa({
    designPressurePa: 710_000,
    specificGravity: 1,
    liquidHeightM: 10,
  });
  assert.ok(closeTo(withHead.designPressureWithStaticHeadPa, 808_066.5, 1e-6));
  assert.equal(withHead.appliesUniformHeadToEveryRow, true);
});

test('zero liquid height reproduces the workbook sheet PD of design pressure alone', () => {
  const withoutHead = designPressureWithStaticHeadPa({
    designPressurePa: 710_000,
    specificGravity: 1,
    liquidHeightM: 0,
  });
  assert.equal(withoutHead.staticHeadPa, 0);
  assert.equal(withoutHead.designPressureWithStaticHeadPa, 710_000);
});

test('legacy row reproduces the 2 inch class 150 sheet cells including the 3.14 literal', () => {
  const gasket = meanGasketReactionDiameterM({
    gasketInnerDiameterMm: 69.9,
    gasketOuterDiameterMm: 85.9,
  });
  const moment = resolveEqualOrthogonalMomentNm({ componentMomentNm: 0.145 });
  const row = legacyWorkbookUg44Acceptance({
    ratedPressurePa: 1380,
    designPressurePa: 710,
    gasketReactionDiameterM: gasket.gasketReactionDiameterM,
    momentFactor: 1.2,
    resolvedBendingMomentNm: moment.resolvedMomentNm,
    openingAxialForceN: 0.55,
  });

  assert.ok(closeTo(gasket.gasketReactionDiameterMm, 77.9, 1e-9));
  assert.ok(closeTo(moment.resolvedMomentNm, 0.20506096654409878, 1e-15));
  assert.ok(closeTo(row.leftHandSideNm, 3.4523554647055805, 1e-12));
  assert.ok(closeTo(row.rightHandSideNm, 3.452643448765962, 1e-12));
  assert.equal(row.pass, true);
  assert.equal(row.workbookWarning, 'OK');
  assert.equal(row.canUseForDesignAuthority, false);
});

test('the 3.14 literal makes the workbook allowable uniformly conservative', () => {
  const expectedDeviation = LEGACY_WORKBOOK_PI / Math.PI - 1;
  assert.ok(expectedDeviation < 0);

  for (const item of [
    { g: 0.0779, pr: 1380, pd: 710, fm: 1.2, me: 0.205, fe: 0.55 },
    { g: 1.2558, pr: 1770, pd: 700, fm: 0.6, me: 118.2, fe: 40.8 },
    { g: 0.3024, pr: 4660, pd: 700, fm: 0.5, me: 15.27, fe: 9.4 },
  ]) {
    const row = legacyWorkbookUg44Acceptance({
      ratedPressurePa: item.pr,
      designPressurePa: item.pd,
      gasketReactionDiameterM: item.g,
      momentFactor: item.fm,
      resolvedBendingMomentNm: item.me,
      openingAxialForceN: item.fe,
    });
    assert.ok(row.rightHandSideNm < row.exactRightHandSideNm);
    assert.ok(closeTo(row.rightHandSideRelativeDeviation, expectedDeviation, 1e-15));
  }
});

test('the qualified kernel equation matches the legacy row up to the pi constant', () => {
  const input = {
    ratedPressurePa: 1380,
    designPressurePa: 710,
    gasketReactionDiameterM: 0.0779,
    momentFactor: 1.2,
    bendingMomentNm: 0.20506096654409878,
    openingAxialForceN: 0.55,
  };
  const kernel = ug44AcceptanceEquation(input);
  const legacy = legacyWorkbookUg44Acceptance({
    ratedPressurePa: input.ratedPressurePa,
    designPressurePa: input.designPressurePa,
    gasketReactionDiameterM: input.gasketReactionDiameterM,
    momentFactor: input.momentFactor,
    resolvedBendingMomentNm: input.bendingMomentNm,
    openingAxialForceN: input.openingAxialForceN,
  });

  assert.ok(closeTo(kernel.leftNm, legacy.leftHandSideNm, 1e-12));
  assert.ok(closeTo(kernel.rightNm, legacy.exactRightHandSideNm, 1e-12));
  assert.equal(kernel.pass, legacy.exactPass);
});

test('the 2 inch class 150 row margin is smaller than the constant it is evaluated with', () => {
  const legacy = legacyWorkbookUg44Acceptance({
    ratedPressurePa: 1380,
    designPressurePa: 710,
    gasketReactionDiameterM: 0.0779,
    momentFactor: 1.2,
    resolvedBendingMomentNm: 0.20506096654409878,
    openingAxialForceN: 0.55,
  });
  const workbookMarginFraction = (legacy.rightHandSideNm - legacy.leftHandSideNm)
    / legacy.rightHandSideNm;

  assert.ok(workbookMarginFraction > 0);
  assert.ok(workbookMarginFraction < Math.abs(legacy.rightHandSideRelativeDeviation));
});

test('workbook basis helpers fail closed on unusable geometry and negative loads', () => {
  assert.throws(() => meanGasketReactionDiameterM({
    gasketInnerDiameterMm: 100,
    gasketOuterDiameterMm: 100,
  }), /gasketOuterDiameterMm/);

  assert.throws(() => meanGasketReactionDiameterM({
    gasketInnerDiameterMm: 0,
    gasketOuterDiameterMm: 100,
  }), /gasketInnerDiameterMm/);

  assert.throws(() => staticHeadPressurePa({
    specificGravity: -1,
    liquidHeightM: 10,
  }), /specificGravity/);

  assert.throws(() => resolveEqualOrthogonalMomentNm({ componentMomentNm: -1 }), /componentMomentNm/);

  assert.throws(() => legacyWorkbookUg44Acceptance({
    ratedPressurePa: 1380,
    designPressurePa: 710,
    gasketReactionDiameterM: 0.0779,
    momentFactor: 1.2,
    resolvedBendingMomentNm: 1,
    openingAxialForceN: -1,
  }), /openingAxialForceN/);
});

test('transcribed rows stay bound to the committed source workbook identity', () => {
  assert.equal(fixture.source.path, 'docs/flange/Flange UG 44(1).xlsx');
  assert.match(fixture.source.sha256, /^[0-9a-f]{64}$/);
  assert.ok(fs.existsSync(new URL(`../${fixture.source.path}`, import.meta.url)));
});
