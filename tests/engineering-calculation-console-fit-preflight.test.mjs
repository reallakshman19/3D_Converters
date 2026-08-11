import assert from 'node:assert/strict';
import test from 'node:test';
import { PENDING_ENGINEERING_CALCULATION_DEFINITIONS } from '../converters/engineering-calculations/pending-definitions.js';
import {
  canResolveEngineeringCalculation,
  createEngineeringConsoleDraft,
  isEngineeringCalculationExecutable,
  isEngineeringCalculationPreflightEnabled,
} from '../tabs/engineering-calculation-console-model.js';
import { renderEngineeringCalculationConsoleHtml } from '../tabs/engineering-calculation-console-view.js';

const fit = PENDING_ENGINEERING_CALCULATION_DEFINITIONS.find((row) => row.id === 'VIB.FIV.FLOW_TURBULENCE');
const aiv = PENDING_ENGINEERING_CALCULATION_DEFINITIONS.find((row) => row.id === 'VIB.AIV.ACOUSTIC');
const definitions = [fit, aiv];
const families = [{ id: 'VIB', label: 'Vibration & Dynamic Screening', count: definitions.length }];

function buttonTag(html, action) {
  const match = html.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`, 'u'));
  assert(match, `Missing ${action} button`);
  return match[0];
}

function stateFor(definition, activeView = 'basis', resolution = null) {
  const draft = createEngineeringConsoleDraft(definition, {
    outsideDiameter: 168.3,
    wallThickness: 7.11,
    massFlow: 42480,
    density: 37.4,
    maximumUnsupportedSpan: 5800,
  });
  if (definition.id === fit.id) {
    Object.assign(draft.units, {
      outsideDiameter: 'mm',
      wallThickness: 'mm',
      massFlow: 'kg/h',
      density: 'kg/m3',
      maximumUnsupportedSpan: 'mm',
    });
  }
  return {
    selectedFamily: 'VIB',
    selectedId: definition.id,
    draft,
    mode: 'single',
    qualificationMode: 'strict',
    activeView,
    editorErrors: [],
    validation: null,
    resolution,
    result: null,
    batchText: '[]',
    batchResult: null,
    batchError: null,
  };
}

test('blocked FIT definition is preflight-resolvable but never executable', () => {
  assert.equal(isEngineeringCalculationExecutable(fit), false);
  assert.equal(isEngineeringCalculationPreflightEnabled(fit), true);
  assert.equal(canResolveEngineeringCalculation(fit), true);
  assert.equal(isEngineeringCalculationExecutable(aiv), false);
  assert.equal(isEngineeringCalculationPreflightEnabled(aiv), false);
  assert.equal(canResolveEngineeringCalculation(aiv), false);
});

test('FIT Console renders physical fields and enables only Validate/Resolve', () => {
  const html = renderEngineeringCalculationConsoleHtml({
    definitions,
    families,
    definition: fit,
    state: stateFor(fit),
  });

  assert.match(html, /Physical preflight only\./u);
  for (const field of ['outsideDiameter', 'wallThickness', 'massFlow', 'density', 'maximumUnsupportedSpan']) {
    assert.match(html, new RegExp(`data-field="${field}"`, 'u'));
    assert.match(html, new RegExp(`data-unit="${field}"`, 'u'));
  }
  assert.equal(buttonTag(html, 'validate').includes('disabled'), false);
  assert.equal(buttonTag(html, 'resolve').includes('disabled'), false);
  assert.equal(buttonTag(html, 'calculate').includes('disabled'), true);
});

test('FIT Basis renders derived preflight with explicit non-authority language', () => {
  const resolution = {
    ok: true,
    canonicalInput: {
      outsideDiameter: 0.1683,
      wallThickness: 0.00711,
      massFlow: 11.8,
      density: 37.4,
      maximumUnsupportedSpan: 5.8,
    },
    resolvedInputs: {},
    errors: [],
    warnings: [],
    applicability: { applicable: null, status: 'NOT_EVALUATED', limitations: [] },
    preflight: {
      authority: 'PHYSICAL_CONTEXT_ONLY',
      status: 'PHYSICAL_PREFLIGHT_ONLY',
      derived: {
        insideDiameterM: 0.15408,
        flowAreaM2: 0.0186,
        volumetricFlowM3S: 0.3155,
        meanVelocityMS: 16.96,
      },
      evidence: [],
    },
  };
  const html = renderEngineeringCalculationConsoleHtml({
    definitions,
    families,
    definition: fit,
    state: stateFor(fit, 'basis', resolution),
  });

  assert.match(html, /Physical preflight/u);
  assert.match(html, /PHYSICAL_CONTEXT_ONLY/u);
  assert.match(html, /not FIT applicability, LOF, screening or assessment authority/u);
  assert.match(html, /Mean velocity/u);
});

test('blocked FIT cannot be added as current batch request from the Console', () => {
  const html = renderEngineeringCalculationConsoleHtml({
    definitions,
    families,
    definition: fit,
    state: stateFor(fit, 'batch'),
  });

  assert.match(html, /Current calculator is not executable and cannot be added to batch/u);
  assert.equal(buttonTag(html, 'add-current-batch').includes('disabled'), true);
  assert.equal(buttonTag(html, 'run-batch').includes('disabled'), false);
});

test('unqualified non-preflight calculators retain the original fully blocked form behavior', () => {
  const html = renderEngineeringCalculationConsoleHtml({
    definitions,
    families,
    definition: aiv,
    state: stateFor(aiv),
  });

  assert.match(html, /Execution blocked\./u);
  assert.doesNotMatch(html, /Physical preflight only\./u);
  assert.equal(buttonTag(html, 'validate').includes('disabled'), true);
  assert.equal(buttonTag(html, 'resolve').includes('disabled'), true);
  assert.equal(buttonTag(html, 'calculate').includes('disabled'), true);
});
