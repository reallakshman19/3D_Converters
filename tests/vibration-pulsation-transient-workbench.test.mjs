import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { calculateDeadlegStandard } from '../converters/vibration/deadleg/method.js';
import { calculateDryGasRapidOpening } from '../converters/vibration/transients/dry-gas-opening.js';
import {
  VIBRATION_DYNAMIC_WORK_ITEM_MODES,
  addVibrationDynamicWorkItem,
  buildVibrationDynamicWorkbenchProjection,
  createVibrationDynamicWorkItemStore,
  evaluateVibrationDynamicWorkItem,
  updateVibrationDynamicWorkItemEvidence,
  updateVibrationDynamicWorkItemScope,
  updateVibrationDynamicWorkItemValue,
} from '../tabs/vibration-integrity-pulsation-transient-model.js';

const root = fileURLToPath(new URL('..', import.meta.url));

const DEADLEG = Object.freeze({
  rhoV2Pa: 9000,
  densityKgM3: 18,
  velocityMS: 22.360679775,
  mainInsideDiameterMm: 250,
  branchInsideDiameterMm: 80,
  branchLengthM: 1.8,
  dynamicViscosityPaS: 0.00002,
  speedOfSoundMS: 390,
});

const T28 = Object.freeze({
  massFlowKgS: 18,
  gamma: 1.3,
  gasConstantJPerKmolK: 8314,
  upstreamTemperatureK: 330,
  molecularWeightKgPerKmol: 23,
  outsideDiameterMm: 219.1,
  insideDiameterMm: 190,
  wallThicknessMm: 14,
  schedule40ThicknessMm: 8.18,
  supportStiffness: 'MEDIUM',
});

function addReadyItem(mode, scope, values) {
  let store = addVibrationDynamicWorkItem(createVibrationDynamicWorkItemStore(), mode);
  const id = store.items[0].workItemId;
  store = updateVibrationDynamicWorkItemScope(store, id, scope);
  for (const [key, value] of Object.entries(values)) {
    store = updateVibrationDynamicWorkItemValue(store, id, key, value);
    store = updateVibrationDynamicWorkItemEvidence(store, id, key, `PROJECT-EVIDENCE:${scope}:${key}`);
  }
  return { store, id };
}

test('deadleg work item uses exact existing T2.6 kernel and remains non-governing', () => {
  let { store, id } = addReadyItem(VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD, 'DL-BRANCH-101', DEADLEG);
  const before = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.equal(before.assessmentUnitType, 'DEADLEG_BRANCH');
  assert.equal(before.readyToEvaluate, true);
  store = evaluateVibrationDynamicWorkItem(store, id);
  const item = buildVibrationDynamicWorkbenchProjection(store).items[0];
  const direct = calculateDeadlegStandard(DEADLEG);
  assert.deepEqual(item.result.payload, direct);
  assert.equal(item.resultState, 'CURRENT_RESULT');
  assert.equal(item.authority.calculationState, 'BENCHMARK_ONLY');
  assert.equal(item.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(item.authority.governingEligible, false);
  assert.equal(item.authority.eiMainLineContributionAllowed, false);
});

test('dry-gas T2.8 work item uses exact existing kernel and correct event assessment unit', () => {
  let { store, id } = addReadyItem(VIBRATION_DYNAMIC_WORK_ITEM_MODES.T28_DRY_GAS_RAPID_OPENING, 'STARTUP-EVENT-01', T28);
  store = evaluateVibrationDynamicWorkItem(store, id);
  const item = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.equal(item.assessmentUnitType, 'TRANSIENT_EVENT_PATH');
  assert.deepEqual(item.result.payload, calculateDryGasRapidOpening(T28));
  assert.equal(item.result.payload.qualificationState, 'BENCHMARK_ONLY');
  assert.equal(item.authority.designAuthority, false);
});

test('every explicit value requires evidence and no missing values are defaulted', () => {
  let store = addVibrationDynamicWorkItem(createVibrationDynamicWorkItemStore(), VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD);
  const id = store.items[0].workItemId;
  store = updateVibrationDynamicWorkItemScope(store, id, 'DL-102');
  store = updateVibrationDynamicWorkItemValue(store, id, 'rhoV2Pa', 10000);
  let item = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.equal(item.readyToEvaluate, false);
  assert.ok(item.missingEvidence.includes('rhoV2Pa'));
  assert.ok(item.missing.includes('densityKgM3'));
  assert.throws(() => evaluateVibrationDynamicWorkItem(store, id), /NOT_READY/);
  store = updateVibrationDynamicWorkItemEvidence(store, id, 'rhoV2Pa', 'PROCESS-SHEET-1');
  item = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.equal(item.readyToEvaluate, false);
});

test('invalid physical values fail closed before kernel execution', () => {
  let { store, id } = addReadyItem(VIBRATION_DYNAMIC_WORK_ITEM_MODES.DEADLEG_STANDARD, 'DL-103', DEADLEG);
  store = updateVibrationDynamicWorkItemValue(store, id, 'branchLengthM', '-1');
  const item = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.ok(item.invalid.includes('branchLengthM'));
  assert.equal(Object.hasOwn(item.input, 'branchLengthM'), false);
  assert.throws(() => evaluateVibrationDynamicWorkItem(store, id), /NOT_READY/);
});

test('input or evidence mutation makes retained result stale until reevaluated', () => {
  let { store, id } = addReadyItem(VIBRATION_DYNAMIC_WORK_ITEM_MODES.T28_DRY_GAS_RAPID_OPENING, 'EVENT-02', T28);
  store = evaluateVibrationDynamicWorkItem(store, id);
  assert.equal(buildVibrationDynamicWorkbenchProjection(store).items[0].resultState, 'CURRENT_RESULT');
  store = updateVibrationDynamicWorkItemEvidence(store, id, 'massFlowKgS', 'UPDATED-FLOW-RECORD');
  const stale = buildVibrationDynamicWorkbenchProjection(store).items[0];
  assert.equal(stale.resultState, 'STALE_RESULT');
  assert.equal(stale.result.payload.lof, calculateDryGasRapidOpening(T28).lof);
  store = evaluateVibrationDynamicWorkItem(store, id);
  assert.equal(buildVibrationDynamicWorkbenchProjection(store).items[0].resultState, 'CURRENT_RESULT');
});

test('workbench UI keeps pending source branches visibly blocked and out of the mechanism matrix', () => {
  const view = readFileSync(`${root}/tabs/vibration-integrity-pulsation-transient-view.js`, 'utf8');
  const matrix = readFileSync(`${root}/tabs/vibration-integrity-mechanisms.js`, 'utf8');
  assert.ok(view.includes('T2.4 Reciprocating / PD'));
  assert.ok(view.includes('SOURCE RECONCILIATION REQUIRED'));
  assert.ok(view.includes('T2.8 liquid / multiphase closure'));
  assert.ok(view.includes('PR471'));
  assert.equal(matrix.includes('vibration-integrity-pulsation-transient-model'), false);
  assert.equal(matrix.includes('VibrationDynamicWorkItem'), false);
});

test('UI contract exposes one dedicated pulsation/transient workspace', () => {
  const ui = readFileSync(`${root}/tabs/vibration-integrity-ui-contract.js`, 'utf8');
  const shell = readFileSync(`${root}/tabs/vibration-integrity-user-data-shell.js`, 'utf8');
  assert.ok(ui.includes("id: 'pulsation-transients'"));
  assert.ok(shell.includes("workspaceTab === 'pulsation-transients'"));
  assert.ok(shell.includes('handleVibrationDynamicWorkItemClick'));
  assert.ok(shell.includes('handleVibrationDynamicWorkItemChange'));
});
