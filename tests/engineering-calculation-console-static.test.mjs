import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderEngineeringCalculationConsoleHtml } from '../tabs/engineering-calculation-console-view.js';
import { createEngineeringConsoleDraft } from '../tabs/engineering-calculation-console-model.js';

const tab = fs.readFileSync(new URL('../tabs/engineering-calculations-tab.js', import.meta.url), 'utf8');
const view = fs.readFileSync(new URL('../tabs/engineering-calculation-console-view.js', import.meta.url), 'utf8');
const sections = fs.readFileSync(new URL('../tabs/engineering-calculation-console-sections.js', import.meta.url), 'utf8');
const extension = fs.readFileSync(new URL('../core/engineering-tabs-extension.js', import.meta.url), 'utf8');

test('Console production wiring uses the central Engineering Calculation API only', () => {
  assert.match(tab, /converters\/engineering-calculations\/index\.js/);
  for (const api of [
    'calculateEngineering',
    'calculateEngineeringBatch',
    'validateEngineeringCalculationInput',
    'resolveEngineeringCalculationInputs',
  ]) assert.match(tab, new RegExp(api));

  for (const forbidden of [
    'b313-thickness',
    'b313-material-factors',
    'empirical-weight/index',
    'calculateB313',
    'estimateEmpiricalWeight',
  ]) assert.doesNotMatch(tab + view + sections, new RegExp(forbidden));
});

test('Engineering extension exposes the lazy Console tab', () => {
  assert.match(extension, /id: 'engineering-calculations'/);
  assert.match(extension, /renderEngineeringCalculationsTab/);
});

test('blocked definition is visibly non-executable and issue-qualified', () => {
  const blocked = {
    id: 'VIB.FIV.FLOW_TURBULENCE', family: 'VIB', name: 'FIV', shortName: 'FIV',
    methodRevision: 'pending', purpose: 'Pending', qualificationIssue: 429,
    authority: { qualificationState: 'BLOCKED' }, applicability: { limitations: [] }, inputs: [],
  };
  const state = {
    selectedFamily: 'VIB', selectedId: blocked.id, draft: createEngineeringConsoleDraft(blocked),
    mode: 'single', qualificationMode: 'strict', activeView: 'basis', editorErrors: [],
    validation: null, resolution: null, result: null, batchText: '[]', batchResult: null, batchError: null,
  };
  const html = renderEngineeringCalculationConsoleHtml({
    definitions: [blocked], families: [{ id: 'VIB', label: 'Vibration', count: 1 }],
    definition: blocked, state,
  });
  assert.match(html, /Execution blocked/);
  assert.match(html, /#429/);
  assert.match(html, /data-action="calculate" disabled/);
});

test('required enum shows an explicit unselected state', () => {
  const definition = {
    id: 'ESTIMATION.WEIGHT.EMPIRICAL', family: 'ESTIMATION', name: 'Weight',
    methodRevision: '1', purpose: 'x', authority: { qualificationState: 'BENCHMARK_ONLY' },
    applicability: { limitations: [] },
    inputs: [{ key: 'target', label: 'Target', type: 'enum', required: true, values: ['RF/RTJ KG', 'BW KG'] }],
  };
  const state = {
    selectedFamily: 'ESTIMATION', selectedId: definition.id, draft: createEngineeringConsoleDraft(definition),
    mode: 'single', qualificationMode: 'strict', activeView: 'results', editorErrors: [],
    validation: null, resolution: null, result: null, batchText: '[]', batchResult: null, batchError: null,
  };
  const html = renderEngineeringCalculationConsoleHtml({
    definitions: [definition], families: [{ id: 'ESTIMATION', label: 'Estimation', count: 1 }],
    definition, state,
  });
  assert.match(html, /Select…/);
});
