import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceDependencyRevisionState,
  dependencyRevisionKey,
  dependencyRevisionSnapshot,
  initializeDependencyRevisionState,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dependency-revisions.js';

function context(overrides = {}) {
  return {
    lineRows: [], pipingClassRows: [], materialMapRows: [], weightMasterRows: [],
    appliedMappingRevision: { lineList: 0, pipingClass: 0, materialMap: 0, weight: 0 },
    mappingDrafts: {}, config: { linelist: { branchLineKeyMap: {} } },
    ...overrides,
  };
}

function state(overrides = {}) {
  const base = { sourceText: '', supportConfigJson: '{"linelist":{"branchLineKeyMap":{}}}', masterContext: context() };
  const next = { ...base, ...overrides };
  return { ...next, ...initializeDependencyRevisionState(next, next.masterContext?.config || {}) };
}

test('initial revisions identify existing config but no empty source/master/branch authority', () => {
  const s = state();
  assert.deepEqual(dependencyRevisionSnapshot(s), {
    sourceModelRevision: 0,
    lineListAppliedRevision: 0,
    pipingClassAppliedRevision: 0,
    materialAppliedRevision: 0,
    weightAppliedRevision: 0,
    supportConfigRevision: 1,
    branchLineMapRevision: 0,
  });
});

test('draft-only master mapping changes do not bump any dependency revision', () => {
  const previous = state();
  const next = {
    ...previous,
    masterContext: {
      ...previous.masterContext,
      mappingDrafts: { lineList: { fieldMap: { lineKey: 'LINE' }, dirty: true, basisAppliedRevision: 0 } },
    },
  };
  Object.assign(next, advanceDependencyRevisionState(previous, next, next.masterContext.config));
  assert.deepEqual(dependencyRevisionSnapshot(next), dependencyRevisionSnapshot(previous));
});

test('source edit bumps only sourceModelRevision', () => {
  const previous = state();
  const next = { ...previous, sourceText: '<ROOT />' };
  Object.assign(next, advanceDependencyRevisionState(previous, next, next.masterContext.config));
  const before = dependencyRevisionSnapshot(previous);
  const after = dependencyRevisionSnapshot(next);
  assert.equal(after.sourceModelRevision, before.sourceModelRevision + 1);
  for (const key of Object.keys(before).filter((key) => key !== 'sourceModelRevision')) assert.equal(after[key], before[key]);
});

test('branch map change bumps supportConfigRevision and branchLineMapRevision only', () => {
  const previous = state();
  const parsed = { linelist: { branchLineKeyMap: { B1: 'L-100' } } };
  const next = { ...previous, supportConfigJson: '{"linelist":{"branchLineKeyMap":{"B1":"L-100"}}}' };
  Object.assign(next, advanceDependencyRevisionState(previous, next, parsed));
  const before = dependencyRevisionSnapshot(previous);
  const after = dependencyRevisionSnapshot(next);
  assert.equal(after.supportConfigRevision, before.supportConfigRevision + 1);
  assert.equal(after.branchLineMapRevision, before.branchLineMapRevision + 1);
  assert.equal(after.lineListAppliedRevision, before.lineListAppliedRevision);
  assert.equal(after.weightAppliedRevision, before.weightAppliedRevision);
});

test('unrelated support config change does not bump branchLineMapRevision', () => {
  const previous = state();
  const parsed = { linelist: { branchLineKeyMap: {} }, supportPositionMatch: { toleranceMm: 20 } };
  const next = { ...previous, supportConfigJson: JSON.stringify(parsed) };
  Object.assign(next, advanceDependencyRevisionState(previous, next, parsed));
  const before = dependencyRevisionSnapshot(previous);
  const after = dependencyRevisionSnapshot(next);
  assert.equal(after.supportConfigRevision, before.supportConfigRevision + 1);
  assert.equal(after.branchLineMapRevision, before.branchLineMapRevision);
});

test('weight authority change bumps weight only and leaves source/line/branch dependency key unchanged', () => {
  const previous = state();
  const nextWeightRows = [{ key: 'V1', weight: 10 }];
  const next = {
    ...previous,
    masterContext: {
      ...previous.masterContext,
      weightMasterRows: nextWeightRows,
      appliedMappingRevision: { ...previous.masterContext.appliedMappingRevision, weight: 1 },
    },
  };
  Object.assign(next, advanceDependencyRevisionState(previous, next, next.masterContext.config));
  const before = dependencyRevisionSnapshot(previous);
  const after = dependencyRevisionSnapshot(next);
  assert.equal(after.weightAppliedRevision, before.weightAppliedRevision + 1);
  assert.equal(after.lineListAppliedRevision, before.lineListAppliedRevision);
  const p1LikeKeys = ['sourceModelRevision', 'lineListAppliedRevision', 'branchLineMapRevision'];
  assert.equal(dependencyRevisionKey(next, p1LikeKeys), dependencyRevisionKey(previous, p1LikeKeys));
});

test('line-list Apply bumps lineListAppliedRevision while unrelated master revisions stay fixed', () => {
  const previous = state();
  const next = {
    ...previous,
    masterContext: {
      ...previous.masterContext,
      lineRows: [{ lineKey: 'L-100' }],
      appliedMappingRevision: { ...previous.masterContext.appliedMappingRevision, lineList: 1 },
    },
  };
  Object.assign(next, advanceDependencyRevisionState(previous, next, next.masterContext.config));
  const before = dependencyRevisionSnapshot(previous);
  const after = dependencyRevisionSnapshot(next);
  assert.equal(after.lineListAppliedRevision, before.lineListAppliedRevision + 1);
  assert.equal(after.pipingClassAppliedRevision, before.pipingClassAppliedRevision);
  assert.equal(after.materialAppliedRevision, before.materialAppliedRevision);
  assert.equal(after.weightAppliedRevision, before.weightAppliedRevision);
});
