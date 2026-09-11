import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEngineeringConsoleRequest,
  buildEngineeringResultViewModel,
  createEngineeringConsoleDraft,
  engineeringResultLabel,
  invalidateEngineeringConsoleExecution,
  isEngineeringCalculationExecutable,
  parseEngineeringBatchEditor,
  parseEngineeringConsoleField,
} from '../tabs/engineering-calculation-console-model.js';
import { renderInputForm, renderResults } from '../tabs/engineering-calculation-console-sections.js';

const definition = {
  id: 'TEST.CALC.ONE',
  authority: { qualificationState: 'IMPLEMENTED', codeCompliance: false },
  inputs: [
    { key: 'p', label: 'Pressure', type: 'number', required: true, quantity: 'pressure', canonicalUnit: 'MPa' },
    { key: 'flag', type: 'boolean', engineeringDefault: false },
    { key: 'mode', type: 'enum', values: ['A', 'B'], engineeringDefault: 'A' },
    { key: 'obj', type: 'object' },
    { key: 'arr', label: 'Attestations', type: 'array' },
    { key: 'optional', type: 'number' },
  ],
  outputs: [
    { key: 'pressure', label: 'Calculated pressure', type: 'number', quantity: 'pressure', canonicalUnit: 'MPa' },
  ],
};

test('draft uses declared defaults, JSON aggregate editing, and canonical units only', () => {
  const draft = createEngineeringConsoleDraft(definition, { p: 12, arr: [{ id: 'A1' }] });
  assert.equal(draft.values.p, 12);
  assert.equal(draft.values.flag, false);
  assert.equal(draft.values.mode, 'A');
  assert.equal(draft.units.p, 'MPa');
  assert.equal(draft.values.arr, '[\n  {\n    "id": "A1"\n  }\n]');
  assert.equal(draft.values.optional, '');
});

test('typed parser preserves zero/false, supports arrays, and rejects malformed aggregate shapes', () => {
  assert.deepEqual(parseEngineeringConsoleField({ key: 'n', type: 'number' }, 0), { included: true, value: 0 });
  assert.deepEqual(parseEngineeringConsoleField({ key: 'b', type: 'boolean' }, false), { included: true, value: false });
  assert.deepEqual(parseEngineeringConsoleField({ key: 'a', type: 'array' }, '[{"id":"A1"}]'), {
    included: true,
    value: [{ id: 'A1' }],
  });
  assert.throws(() => parseEngineeringConsoleField({ key: 'o', type: 'object' }, '{bad'), /JSON/);
  assert.throws(() => parseEngineeringConsoleField({ key: 'a', type: 'array' }, '{"id":"A1"}'), /JSON array/);
});

test('array fields render as JSON textarea controls rather than scalar text inputs', () => {
  const draft = createEngineeringConsoleDraft(definition, { p: 10, arr: [{ id: 'A1' }] });
  const html = renderInputForm(definition, { draft, editorErrors: [] });
  assert.match(html, /<textarea[^>]+data-field="arr"/);
  assert.match(html, /&quot;id&quot;: &quot;A1&quot;/);
});

test('request omits blank optional fields and enables sandbox explicitly', () => {
  const draft = createEngineeringConsoleDraft(definition, { p: 10, arr: [{ id: 'A1' }] });
  const built = buildEngineeringConsoleRequest(definition, draft, { executionMode: 'sandbox', qualificationMode: 'screening' });
  assert.equal(built.ok, true);
  assert.equal(built.request.inputs.p, 10);
  assert.deepEqual(built.request.inputs.arr, [{ id: 'A1' }]);
  assert.equal(Object.hasOwn(built.request.inputs, 'optional'), false);
  assert.equal(built.request.inputUnits.p, 'MPa');
  assert.equal(built.request.options.executionMode, 'sandbox');
  assert.equal(built.request.options.qualificationMode, 'screening');
});

test('blocked state and batch parsing fail closed', () => {
  assert.equal(isEngineeringCalculationExecutable(definition), true);
  assert.equal(isEngineeringCalculationExecutable({ id: 'VIB.FIV.X', authority: { qualificationState: 'BLOCKED' } }), false);
  assert.equal(parseEngineeringBatchEditor('[{"calculationId":"A.B.C"}]').batchRequest.requests.length, 1);
  assert.equal(parseEngineeringBatchEditor('{bad').ok, false);
});

test('result label never equates successful execution with engineering PASS', () => {
  assert.equal(engineeringResultLabel({ ok: true, assessment: null }), 'NOT ASSESSED');
  assert.equal(engineeringResultLabel({ ok: true, assessment: { status: 'PASS' } }), 'PASS');
  assert.equal(engineeringResultLabel({ ok: true, checks: [{ satisfied: false }] }), 'FAIL');
  assert.equal(engineeringResultLabel({ ok: false, errors: [{ code: 'ENGINEERING_METHOD_BLOCKED' }] }), 'NOT AVAILABLE');
});

test('result view model separates execution, assessment, authority, checks, and output metadata', () => {
  const view = buildEngineeringResultViewModel(definition, {
    ok: true,
    outputs: { pressure: 12.5 },
    checks: [{ id: 'LIMIT', satisfied: false, utilization: 1.25, designAuthority: false }],
    assessment: { governingEligible: false, designAuthority: false, codeCompliance: false },
    qualification: { effective: 'BENCHMARK_ONLY', designAuthority: false },
    execution: { executionId: 'exec-1' },
  });

  assert.equal(view.execution.status, 'COMPLETED');
  assert.equal(view.assessment.status, 'FAIL');
  assert.equal(view.authority.effective, 'BENCHMARK_ONLY');
  assert.equal(view.checks[0].status, 'FAIL');
  assert.equal(view.checks[0].authority, 'BENCHMARK_ONLY');
  assert.equal(view.outputs[0].label, 'Calculated pressure');
  assert.equal(view.outputs[0].unit, 'MPa');
});

test('results renderer exposes failed assessment separately from execution and renders units', () => {
  const html = renderResults(definition, {
    ok: true,
    outputs: { pressure: 12.5 },
    checks: [{ id: 'LIMIT', status: 'FAIL', utilization: 1.25, authority: 'BENCHMARK_ONLY' }],
    assessment: { status: 'FAIL', disposition: 'LIMIT_EXCEEDED', governingEligible: false, designAuthority: false, codeCompliance: false },
    qualification: { effective: 'BENCHMARK_ONLY', designAuthority: false },
    execution: { executionId: 'exec-1' },
  }, null);

  assert.match(html, /Assessment failed/);
  assert.match(html, /<small>Execution<\/small><strong>COMPLETED<\/strong>/);
  assert.match(html, /Calculated pressure/);
  assert.match(html, /<td>MPa<\/td>/);
  assert.doesNotMatch(html, />CALCULATED</);
});

test('input mutation invalidates stale single-calculation evidence', () => {
  const state = {
    validation: { ok: true }, resolution: { ok: true }, result: { ok: true }, batchResult: { ok: true },
  };
  invalidateEngineeringConsoleExecution(state);
  assert.equal(state.validation, null);
  assert.equal(state.resolution, null);
  assert.equal(state.result, null);
  assert.deepEqual(state.batchResult, { ok: true });
});
