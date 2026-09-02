import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MARGINAL_PASS_FRACTION,
  UG44_PRODUCT_SURFACE,
  assessUg44Cap,
  assessUg44Margin,
  renderUg44ResultsHtml,
} from '../tabs/engineering-calculation-ug44-surface.js';
import { renderEngineeringCalculationConsoleHtml } from '../tabs/engineering-calculation-console-view.js';
import { createEngineeringConsoleDraft } from '../tabs/engineering-calculation-console-model.js';
import {
  FLANGE_UG44_ENGINEERING_CALCULATION_ID,
  calculateEngineering,
  getEngineeringCalculationDefinition,
  listEngineeringCalculationFamilies,
  listEngineeringCalculations,
} from '../converters/engineering-calculations/index.js';

const definition = getEngineeringCalculationDefinition(FLANGE_UG44_ENGINEERING_CALCULATION_ID);

/** The workbook's 2" class 150 row in SI: it passes by less than a twentieth of a percent. */
const MARGINAL_ROW = {
  ratedPressure: 1_380_000,
  designPressure: 710_000,
  gasketInnerDiameter: 0.0699,
  gasketOuterDiameter: 0.0859,
  momentFactor: 1.2,
  bendingMoment: 145 * Math.SQRT2,
  openingAxialForce: 550,
};

function evaluate(overrides = {}) {
  return calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: { ...MARGINAL_ROW, ...overrides },
  });
}

function consoleState(result) {
  return {
    selectedFamily: 'FLANGE',
    selectedId: definition.id,
    familyLanding: null,
    draft: createEngineeringConsoleDraft(definition),
    editorErrors: [],
    activeView: 'results',
    mode: 'single',
    qualificationMode: 'strict',
    result,
    validation: null,
    batchText: '',
  };
}

function renderConsole(result, target = definition) {
  return renderEngineeringCalculationConsoleHtml({
    definitions: listEngineeringCalculations(),
    families: listEngineeringCalculationFamilies(),
    definition: target,
    state: { ...consoleState(result), selectedId: target.id },
  });
}

test('the adapter declares the surface the console renders', () => {
  assert.equal(definition.ui.productSurface, UG44_PRODUCT_SURFACE);
  assert.equal(definition.ui.visible, true);
});

test('the console pill keeps reporting the BENCHMARK_ONLY authority state', () => {
  // A ui.lifecycleState would take precedence over the authority state in the pill.
  assert.equal(definition.ui.lifecycleState, undefined);
  assert.equal(definition.authority.calculationState, 'BENCHMARK_ONLY');
  assert.match(renderConsole(null), /BENCHMARK_ONLY/);
});

test('the equivalent pressure decomposition names both relations and their shares', () => {
  const html = renderUg44ResultsHtml(evaluate());

  assert.match(html, /16·ME \/ \(π·G³\)/u);
  assert.match(html, /4·FE \/ \(π·G²\)/u);
  assert.match(html, /Bending contributes 19\.1× the axial term/u);
  assert.match(html, /100\.0%/u);
});

test('a marginal pass is reported as marginal rather than as a plain pass', () => {
  const result = evaluate();
  const margin = assessUg44Margin(result.outputs);

  assert.equal(result.outputs.equationSatisfied, true);
  assert.ok(margin.marginal, 'the workbook 2 inch class 150 row should read as marginal');
  assert.ok(margin.marginFraction < MARGINAL_PASS_FRACTION);
  assert.ok(margin.marginFraction > 0);

  const html = renderUg44ResultsHtml(result);
  assert.match(html, /Reference relation satisfied — marginal/u);
  assert.match(html, /0\.0452%/u);
  assert.match(html, /sensitive to rounding and constant choices/u);
});

test('a comfortable pass is not flagged marginal', () => {
  const result = evaluate({ bendingMoment: 50, openingAxialForce: 100 });
  const margin = assessUg44Margin(result.outputs);

  assert.equal(margin.marginal, false);
  const html = renderUg44ResultsHtml(result);
  assert.match(html, /<strong>Reference relation satisfied\.<\/strong>/u);
  assert.doesNotMatch(html, /marginal/u);
});

test('an exceeded relation renders as exceeded', () => {
  const result = evaluate({ bendingMoment: 5_000 });
  assert.equal(result.outputs.equationSatisfied, false);

  const html = renderUg44ResultsHtml(result);
  assert.match(html, /Reference relation exceeded/u);
  assert.doesNotMatch(html, /Reference relation satisfied/u);
});

test('the rating cap is shown alongside the uncapped value when it binds', () => {
  const result = evaluate({ bendingMoment: 1, openingAxialForce: 1 });
  const cap = assessUg44Cap(result.outputs, result.intermediates);

  assert.ok(cap.capBinds, 'a negligible external load should leave the rating as the binding term');
  assert.ok(cap.uncapped > cap.capped);

  const html = renderUg44ResultsHtml(result);
  assert.match(html, /The flange pressure rating limits this result, not the external load/u);
  assert.match(html, /Uncapped/u);
});

test('a load-limited result says the external load is what binds', () => {
  const result = evaluate();
  const cap = assessUg44Cap(result.outputs, result.intermediates);

  assert.equal(cap.capBinds, false);
  assert.match(renderUg44ResultsHtml(result), /The external load limits this result/u);
});

test('a derived gasket diameter is shown with its basis and its caveat', () => {
  const html = renderUg44ResultsHtml(evaluate());

  assert.match(html, /Derived — mean gasket contact diameter/u);
  assert.match(html, /77\.900 mm/u);
  assert.match(html, /not an Appendix 2 effective-seating-width derivation/u);
  assert.match(html, /does not govern G/u);
});

test('a directly supplied gasket diameter carries no derivation caveat', () => {
  const result = evaluate({
    gasketInnerDiameter: undefined,
    gasketOuterDiameter: undefined,
    gasketReactionDiameter: 0.0779,
  });
  const html = renderUg44ResultsHtml(result);

  assert.match(html, /Supplied directly/u);
  assert.doesNotMatch(html, /effective-seating-width/u);
});

test('the static head row appears only when a head was actually applied', () => {
  assert.doesNotMatch(renderUg44ResultsHtml(evaluate()), /Static head/u);

  const withHead = evaluate({ specificGravity: 1, liquidHeight: 10 });
  const html = renderUg44ResultsHtml(withHead);
  assert.match(html, /Static head/u);
  assert.match(html, /SG · height · 9\.80665/u);
  assert.match(html, /Derived — design pressure \+ static head/u);
});

test('no rendered string presents the result as Code or design acceptance', () => {
  for (const result of [evaluate(), evaluate({ bendingMoment: 5_000 }), evaluate({ bendingMoment: 50 })]) {
    const html = renderUg44ResultsHtml(result);
    assert.doesNotMatch(html, /code compliant/iu);
    assert.doesNotMatch(html, /design acceptable/iu);
    assert.doesNotMatch(html, /code acceptance/iu);
    assert.match(html, /not a Code or design disposition/u);
    assert.match(html, /NOT DESIGN AUTHORITY/u);
    assert.match(html, /NOT CODE COMPLIANCE/u);
  }
});

test('the surface degrades safely with no result and with a failed result', () => {
  assert.match(renderUg44ResultsHtml(null), /No calculation result yet/u);

  const failed = calculateEngineering({
    calculationId: FLANGE_UG44_ENGINEERING_CALCULATION_ID,
    inputs: { ratedPressure: 1_000_000, designPressure: 100_000, momentFactor: 0.5, bendingMoment: 1, openingAxialForce: 1 },
  });
  assert.equal(failed.ok, false);
  const html = renderUg44ResultsHtml(failed);
  assert.match(html, /INPUT_INVALID/u);
  assert.doesNotMatch(html, /Reference relation satisfied/u);
});

test('margin and cap helpers fail safe on unusable output shapes', () => {
  assert.equal(assessUg44Margin({}).marginal, false);
  assert.ok(Number.isNaN(assessUg44Margin({}).marginFraction));
  assert.equal(assessUg44Margin({ availablePressure: 0, demandPressure: 0 }).satisfied, false);
  assert.equal(assessUg44Cap({}, {}).capBinds, false);
});

// --- routing ----------------------------------------------------------------

test('the console routes UG-44 to the assessment surface', () => {
  const html = renderConsole(evaluate());
  assert.match(html, /External equivalent pressure/u);
  assert.match(html, /Capacity and demand/u);
  assert.doesNotMatch(html, /<th>Output<\/th><th>Value<\/th>/u);
});

test('other calculations keep the generic results table', () => {
  const other = listEngineeringCalculations()
    .find((item) => item.family === 'FLANGE' && item.id !== FLANGE_UG44_ENGINEERING_CALCULATION_ID
      && item.id.startsWith('BOLT.'));
  assert.ok(other, 'expected a sibling bolt calculation in the FLANGE family');

  const html = renderConsole(null, getEngineeringCalculationDefinition(other.id));
  assert.doesNotMatch(html, /External equivalent pressure/u);
});

test('the input form carries the benchmark authority restriction', () => {
  assert.match(renderConsole(null), /Authority restriction/u);
  assert.match(renderConsole(null), /Not Code compliance and not design authority/u);
});
