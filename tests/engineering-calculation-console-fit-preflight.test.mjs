import assert from 'node:assert/strict';
import test from 'node:test';
import { VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION as fit } from '../converters/engineering-calculations/adapters/vibration-fit.js';
import {
  canExecuteEngineeringCalculation,
  canResolveEngineeringCalculation,
  createEngineeringConsoleDraft,
  isEngineeringCalculationExecutable,
} from '../tabs/engineering-calculation-console-model.js';
import { renderEngineeringCalculationConsoleHtml } from '../tabs/engineering-calculation-console-view.js';

const aiv = Object.freeze({
  contractVersion: 'engineering-calculation-contract/v1',
  id: 'VIB.AIV.ACOUSTIC',
  family: 'VIB',
  name: 'Acoustic-Induced Vibration Screening',
  shortName: 'AIV',
  methodRevision: 'pending-qualification',
  purpose: 'blocked',
  authority: { calculationState: 'BLOCKED', qualificationState: 'BLOCKED', codeCompliance: false },
  applicability: { description: 'blocked', limitations: [] },
  inputs: [],
  outputs: [],
  qualificationIssue: 429,
  ui: { visible: true, executionModes: [], minimumQualificationToShow: 'IMPLEMENTED' },
  calculate() { return { ok: false }; },
});
const definitions = [fit, aiv];
const families = [{ id: 'VIB', label: 'Vibration & Dynamic Screening', count: 2 }];

function stateFor(qualificationMode = 'strict', activeView = 'basis') {
  const draft = createEngineeringConsoleDraft(fit, {
    phase: 'GAS',
    outsideDiameter: 168.3,
    wallThickness: 21.9456,
    insideDiameter: 124.3838,
    maximumUnsupportedSpan: 4000,
    density: 5,
    massFlow: 20000,
    gasDynamicViscosity: 0.02,
  });
  Object.assign(draft.units, {
    outsideDiameter: 'mm',
    wallThickness: 'mm',
    insideDiameter: 'mm',
    maximumUnsupportedSpan: 'mm',
    density: 'kg/m3',
    massFlow: 'kg/h',
    gasDynamicViscosity: 'cP',
  });
  return {
    selectedFamily: 'VIB', selectedId: fit.id, draft, mode: 'single', qualificationMode, activeView,
    editorErrors: [], validation: null, resolution: null, result: null,
    batchText: '[]', batchResult: null, batchError: null,
  };
}

function buttonTag(html, action) {
  const match = html.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`, 'u'));
  assert(match, `missing ${action}`);
  return match[0];
}

test('FIT is registered benchmark-only and strict mode cannot execute it', () => {
  assert.equal(isEngineeringCalculationExecutable(fit), true);
  assert.equal(canResolveEngineeringCalculation(fit), true);
  assert.equal(canExecuteEngineeringCalculation(fit, 'strict'), false);
  assert.equal(canExecuteEngineeringCalculation(fit, 'benchmark'), true);
  assert.equal(isEngineeringCalculationExecutable(aiv), false);
});

test('Console exposes full reference form but disables Calculate outside benchmark mode', () => {
  const html = renderEngineeringCalculationConsoleHtml({ definitions, families, definition: fit, state: stateFor('strict') });
  assert.match(html, /Workbook reference only/u);
  assert.match(html, /BENCHMARK_ONLY/u);
  for (const field of ['phase', 'outsideDiameter', 'wallThickness', 'maximumUnsupportedSpan', 'gasDynamicViscosity', 'naturalFrequency']) {
    assert.match(html, new RegExp(`data-field="${field}"`, 'u'));
  }
  assert.equal(buttonTag(html, 'validate').includes('disabled'), false);
  assert.equal(buttonTag(html, 'resolve').includes('disabled'), false);
  assert.equal(buttonTag(html, 'calculate').includes('disabled'), true);
});

test('Console enables Calculate and current-batch only in explicit benchmark mode', () => {
  const benchmark = renderEngineeringCalculationConsoleHtml({ definitions, families, definition: fit, state: stateFor('benchmark') });
  assert.equal(buttonTag(benchmark, 'calculate').includes('disabled'), false);

  const batch = renderEngineeringCalculationConsoleHtml({ definitions, families, definition: fit, state: stateFor('benchmark', 'batch') });
  assert.equal(buttonTag(batch, 'add-current-batch').includes('disabled'), false);

  const strictBatch = renderEngineeringCalculationConsoleHtml({ definitions, families, definition: fit, state: stateFor('strict', 'batch') });
  assert.equal(buttonTag(strictBatch, 'add-current-batch').includes('disabled'), true);
});

test('other blocked vibration calculators remain non-resolvable and non-executable', () => {
  const state = { ...stateFor('benchmark'), selectedId: aiv.id, draft: createEngineeringConsoleDraft(aiv) };
  const html = renderEngineeringCalculationConsoleHtml({ definitions, families, definition: aiv, state });
  assert.match(html, /Execution blocked/u);
  assert.equal(buttonTag(html, 'validate').includes('disabled'), true);
  assert.equal(buttonTag(html, 'resolve').includes('disabled'), true);
  assert.equal(buttonTag(html, 'calculate').includes('disabled'), true);
});
