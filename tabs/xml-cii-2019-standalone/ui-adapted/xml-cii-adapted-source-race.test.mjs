/** Native Node regressions against the REAL UI event and state handlers. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJsonHierarchyScopeIndex, materializeJsonHierarchyScope, UNSCOPED_ID
} from '../xml-cii-json-hierarchy-scope.js';
import { buildStandaloneDtxrPositionGroups } from '../xml-cii-trace-resolution-ledger.js';
import { beginLatestOperation } from './xml-cii-adapted-latest-operation.js';
import { beginIndexedBuild } from './xml-cii-adapted-lfj-build-lifecycle.js';
import { currentResolverTraceRevision, updateWorkflowState } from './xml-cii-adapted-state.js';
import {
  ALL_SCOPE_ID, ensureResolverHierarchyScope,
  renderResolverHierarchyScopeControl, selectResolverHierarchyScope
} from './xml-cii-adapted-resolver-scope.js';
import { bindSourceEvents, runResolverJsonTraceFromUi,
  downloadResolverTraceCsvFromUi } from './xml-cii-adapted-events.js';

function createState() {
  return {
    activePhaseId: 'source', sourceKind: 'xml',
    sourceFile: null, sourceText: '', stagedJsonFile: null, stagedJsonText: '',
    supportConfigJson: '{}', resolverJsonTraceConfig: {},
    resolverJsonTraceInputRevision: 0, resolverJsonTraceAcceptedRevision: null,
    resolverJsonTraceResult: null, resolverJsonTraceJsonResult: null,
    resolverJsonTraceRunning: false, resolverJsonTraceExportStatus: '',
    masterContext: null, result: null
  };
}

function fakeContainer(configValue) {
  const listeners = new Map();
  return {
    querySelector(selector) {
      if (selector === '[data-field="resolver-json-config"]')
        return configValue === undefined ? null : { value: configValue };
      return {
        addEventListener(type, callback) {
          if (type === 'change') listeners.set(selector, callback);
        }
      };
    },
    change(field, value, files) {
      const handler = listeners.get(`[data-field="${field}"]`);
      assert.ok(handler, `listener for ${field} is bound`);
      return handler({ target: { value, files } });
    }
  };
}

function withDeferredFileReader(run) {
  const previous = globalThis.FileReader;
  const readers = [];
  globalThis.FileReader = class {
    readAsText(file) { this.file = file; readers.push(this); }
  };
  return Promise.resolve().then(() => run(readers)).finally(() => {
    if (previous === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = previous;
  });
}

test('a slower older XML selection cannot overwrite the latest selected XML', async () => {
  await withDeferredFileReader(async readers => {
    const ref = { current: createState() };
    const container = fakeContainer();
    bindSourceEvents(container, ref, () => {});
    const old = { name: 'old.xml' }, next = { name: 'new.xml' };
    const first = container.change('source-file', '', [old]);
    const second = container.change('source-file', '', [next]);
    assert.equal(readers.length, 2);
    assert.equal(ref.current.sourceFile, next);
    readers[1].result = '<Root>new</Root>';
    readers[1].onload();
    await second;
    readers[0].result = '<Root>old</Root>';
    readers[0].onload();
    await first;
    assert.equal(ref.current.sourceFile, next);
    assert.equal(ref.current.sourceText, '<Root>new</Root>');
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision, null);
  });
});

test('manual source edit supersedes a pending FileReader and clears old file', async () => {
  await withDeferredFileReader(async readers => {
    const ref = { current: createState() };
    const container = fakeContainer();
    bindSourceEvents(container, ref, () => {});
    const pending = container.change('source-file', '', [{ name: 'old.xml' }]);
    container.change('source-text', '<Root>typed</Root>');
    readers[0].result = '<Root>from-old-file</Root>';
    readers[0].onload();
    await pending;
    assert.equal(ref.current.sourceFile, null);
    assert.equal(ref.current.sourceText, '<Root>typed</Root>');
  });
});

test('a slower older staged JSON read cannot replace newer selection', async () => {
  await withDeferredFileReader(async readers => {
    const ref = { current: createState() };
    const container = fakeContainer();
    bindSourceEvents(container, ref, () => {});
    const old = { name: 'old.json' }, next = { name: 'new.json' };
    const first = container.change('staged-json-file', '', [old]);
    const second = container.change('staged-json-file', '', [next]);
    readers[1].result = '[{"type":"BRANCH","name":"new"}]';
    readers[1].onload();
    await second;
    readers[0].result = '[{"type":"BRANCH","name":"old"}]';
    readers[0].onload();
    await first;
    assert.equal(ref.current.stagedJsonFile, next);
    assert.equal(ref.current.stagedJsonText, '[{"type":"BRANCH","name":"new"}]');
  });
});

test('invalid typed Resolver config fails closed without old CSV authorization', async () => {
  const ref = { current: createState() };
  ref.current.sourceText = '<Root><Node /></Root>';
  ref.current.stagedJsonText = '[]';
  let renders = 0;
  const result = await runResolverJsonTraceFromUi(fakeContainer('{broken'),
    ref, () => renders++, false);
  assert.equal(result, null);
  assert.equal(ref.current.resolverJsonTraceRunning, false);
  assert.equal(ref.current.resolverJsonTraceAcceptedRevision, null);
  assert.match(ref.current.resolverJsonTraceExportStatus, /configuration JSON is invalid/);
  assert.ok(renders >= 2);
});

test('missing original source or staged JSON ends Build and blocks both CSVs', async () => {
  const ref = { current: createState() };
  ref.current.sourceText = '<Root><Node /></Root>';
  const result = await runResolverJsonTraceFromUi(fakeContainer(),
    ref, () => {}, false);
  assert.equal(result, null);
  assert.equal(ref.current.resolverJsonTraceRunning, false);
  assert.match(ref.current.resolverJsonTraceExportStatus, /both required/);
  assert.equal(downloadResolverTraceCsvFromUi(ref, () => {}, 'evidence-tree'), null);
  assert.equal(downloadResolverTraceCsvFromUi(ref, () => {}, 'node-wise-trace'), null);
});

test('late older Build cannot override newer Build on identical inputs', async () => {
  await withDeferredFileReader(async readers => {
    const ref = { current: createState() };
    ref.current.sourceFile = { name: 'same.xml' };
    const container = fakeContainer();
    const first = runResolverJsonTraceFromUi(container, ref, () => {}, false);
    const second = runResolverJsonTraceFromUi(container, ref, () => {}, false);
    assert.equal(readers.length, 2);
    readers[1].result = '<Root>newer</Root>';
    readers[1].onload();
    await second;
    const newerStatus = ref.current.resolverJsonTraceExportStatus;
    assert.match(newerStatus, /both required/);
    readers[0].result = '<Root>older</Root>';
    readers[0].onload();
    await first;
    assert.equal(ref.current.resolverJsonTraceExportStatus, newerStatus);
    assert.equal(ref.current.resolverJsonTraceRunning, false);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision, null);
  });
});

test('unreadable selected source fails closed rather than preserving old bytes', async () => {
  await withDeferredFileReader(async readers => {
    const ref = { current: createState() };
    ref.current.sourceText = '<Root>old</Root>';
    const container = fakeContainer();
    bindSourceEvents(container, ref, () => {});
    const pending = container.change('source-file', '', [{ name: 'empty.xml' }]);
    assert.equal(ref.current.sourceText, '');
    readers[0].result = '';
    readers[0].onload();
    await pending;
    assert.equal(ref.current.sourceFile, null);
    assert.equal(ref.current.sourceText, '');
    assert.match(ref.current.resolverJsonTraceWriteBackStatus, /read failed/);
  });
});

test('CSV actions reject an in-progress Build even with a former accepted epoch', () => {
  const ref = { current: createState() };
  ref.current.resolverJsonTraceAcceptedRevision = 0;
  ref.current.resolverJsonTraceRunning = true;
  assert.equal(downloadResolverTraceCsvFromUi(ref, () => {}, 'evidence-tree'), null);
  assert.match(ref.current.resolverJsonTraceExportStatus, /blocked/);
});

test('hierarchy changes revoke current indexed preview, receipt and consent immediately', () => {
  const ref = { current: {
    ...createState(), resolverSourceMode: 'lfj-indexed-preview',
    jsonTraceScopeId: ALL_SCOPE_ID, stagedJsonFile: new Blob(['{}']),
    lfjIndexedPreview: { nodeWiseRows: [] },
    lfjIndexedExportReceipt: { schema: 'test-receipt' },
    lfjIndexedExportOptIn: true,
    resolverJsonTraceAcceptedRevision: 0, resolverJsonTraceRunning: true
  } };
  const stillLatest = beginLatestOperation(ref, 'resolver-build');
  const running = beginIndexedBuild(ref);
  assert.equal(selectResolverHierarchyScope(ref, 'zone-1'), true);
  assert.equal(running.signal.aborted, true);
  assert.equal(stillLatest(), false);
  assert.equal(currentResolverTraceRevision(ref.current), 1);
  assert.equal(ref.current.resolverJsonTraceAcceptedRevision, null);
  assert.equal(ref.current.lfjIndexedPreview, null);
  assert.equal(ref.current.lfjIndexedExportReceipt, null);
  assert.equal(ref.current.lfjIndexedExportOptIn, false);
  assert.equal(ref.current.resolverJsonTraceRunning, false);
  assert.match(ref.current.resolverJsonTraceExportStatus, /rebuild before exporting/);
  assert.equal(selectResolverHierarchyScope(ref, 'zone-1'), false,
    'identical selection must not invent another revision');
});

test('scope control offers an explicit All reset for original indexed File', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return {
        tag, style: {}, dataset: {}, children: [], listeners: {},
        appendChild(child) { this.children.push(child); },
        addEventListener(event, callback) { this.listeners[event] = callback; }
      };
    }
  };
  try {
    const ref = { current: {
      ...createState(), resolverSourceMode: 'lfj-indexed-preview',
      jsonTraceScopeId: 'old-zone', stagedJsonFile: new Blob(['{}']),
      lfjIndexedExportReceipt: { schema: 'old' }, lfjIndexedExportOptIn: true
    }};
    const scope = ensureResolverHierarchyScope(ref.current, ref);
    assert.equal(scope.selectedScopeId, 'old-zone',
      'do not silently relabel the previous scope as All');
    assert.equal(scope.index, null);
    const parent = { children: [], appendChild(el) { this.children.push(el); } };
    let renders = 0;
    renderResolverHierarchyScopeControl(parent, ref, () => renders++, scope);
    const bar = parent.children[0];
    const select = bar.children.find(el => el.tag === 'select');
    assert.ok(select);
    assert.equal(select.disabled, false, 'user must be able to reset unsupported scope');
    select.listeners.change({ target: { value: ALL_SCOPE_ID } });
    assert.equal(ref.current.jsonTraceScopeId, ALL_SCOPE_ID);
    assert.equal(currentResolverTraceRevision(ref.current), 1);
    assert.equal(ref.current.lfjIndexedExportReceipt, null);
    assert.equal(ref.current.lfjIndexedExportOptIn, false);
    assert.equal(renders, 1);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

for (const [label, patch] of [
  ['hierarchy', { jsonTraceScopeId: 'zone-1' }],
  ['branch', { branchSelection: ['BR-01'] }]
]) {
  test('indexed Build refuses unsupported selected ' + label + ' before starting Workers', async () => {
    const ref = { current: updateWorkflowState(createState(), {
      resolverSourceMode: 'lfj-indexed-preview',
      stagedJsonFile: new Blob(['{"source":true}']),
      sourceText: '<Root><Node /></Root>',
      jsonTraceScopeId: ALL_SCOPE_ID,
      ...patch
    }) };
    let renders = 0;
    const result = await runResolverJsonTraceFromUi(fakeContainer(), ref,
      () => renders++, false);
    assert.equal(result, null);
    assert.equal(ref.current.resolverJsonTraceRunning, false);
    assert.equal(ref.current.lfjIndexedPreview, null);
    assert.equal(ref.current.lfjIndexedExportReceipt, null);
    assert.equal(ref.current.lfjIndexedExportOptIn, false);
    assert.match(ref.current.resolverJsonTraceExportStatus, /All scopes only/);
    assert.ok(renders >= 2);
  });
}

function legacyScopeFixture() {
  return [
    { type: 'BRANCH', name: 'LINE-A', OWNER_ZONE: 'ZONE-1',
      children: [{ type: 'COMPONENT', name: 'A source item', position: [1, 2, 3] }] },
    { type: 'BRANCH', name: 'LINE-B', OWNER_ZONE: 'ZONE-2',
      children: [{ type: 'COMPONENT', name: 'B source item', position: [11, 12, 13] }] },
    { type: 'BRANCH', name: 'LINE-C', OWNER_ZONE: 'ZONE-1',
      children: [{ type: 'COMPONENT', name: 'C source item', position: [21, 22, 23],
        attributes: { JsonNodeNo: 'ORIGINAL-77' } }] }
  ];
}

function originalFactEntries(staged) {
  return buildStandaloneDtxrPositionGroups(staged).flatMap(g => g.entries)
    .sort((a, b) => a.jsonSequence - b.jsonSequence);
}

test('T04 legacy scope selects noncontiguous source roots before matching', () => {
  const data = legacyScopeFixture();
  const json = JSON.stringify(data);
  const index = buildJsonHierarchyScopeIndex(json);
  assert.equal(index.strategy, 'root-array');
  assert.equal(index.indexable, true);
  assert.deepEqual(index.scopes.map(s => [s.id, s.itemCount]),
    [['ZONE-1', 2], ['ZONE-2', 1]]);
  const all = materializeJsonHierarchyScope(json, index, ALL_SCOPE_ID);
  assert.deepEqual(all.value, data);
  const selected = materializeJsonHierarchyScope(json, index, 'ZONE-1');
  assert.deepEqual(selected.value.map(x => x.name), ['LINE-A', 'LINE-C']);
  assert.equal(selected.itemCount, 2);
  const onlyOther = materializeJsonHierarchyScope(json, index, 'ZONE-2');
  assert.deepEqual(onlyOther.value.map(x => x.name), ['LINE-B']);
  assert.throws(() => materializeJsonHierarchyScope(json, index, 'UNKNOWN-ZONE'),
    /Unknown JSON hierarchy scope/);
});

test('T04 selected view sequence/paths differ from original source custody', () => {
  const json = JSON.stringify(legacyScopeFixture());
  const index = buildJsonHierarchyScopeIndex(json);
  const all = originalFactEntries(json);
  const selected = originalFactEntries(materializeJsonHierarchyScope(
    json, index, 'ZONE-1').value);
  assert.deepEqual(all.map(x => x.path),
    ['$[0].children[0]', '$[1].children[0]', '$[2].children[0]']);
  assert.deepEqual(all.map(x => x.jsonSequence), [2, 4, 6]);
  assert.deepEqual(selected.map(x => x.path),
    ['$[0].children[0]', '$[1].children[0]']);
  assert.deepEqual(selected.map(x => x.jsonSequence), [2, 4]);
  assert.equal(selected[0].jsonNodeNo, '2',
    'fallback node identity follows the filtered legacy preorder');
  assert.equal(selected[1].jsonNodeNo, 'ORIGINAL-77',
    'explicit node identity survives filtered input materialization');
  assert.equal(all[2].path, '$[2].children[0]',
    'original source provenance path must not be overwritten by the selected view');
  assert.equal(selected[1].branchName, 'LINE-C');
});

test('T04 unscoped and root-children legacy labels are distinct from indexed admission', () => {
  const items = [...legacyScopeFixture(), {
    type: 'BRANCH', name: 'NO-OWNER-ZONE',
    children: [{ type: 'COMPONENT', name: 'unscoped', position: [1, 2, 3] }]
  }];
  const json = JSON.stringify(items);
  const index = buildJsonHierarchyScopeIndex(json);
  assert.equal(index.scopes.find(s => s.id === UNSCOPED_ID)?.itemCount, 1);
  assert.deepEqual(materializeJsonHierarchyScope(json, index, UNSCOPED_ID)
    .value.map(x => x.name), ['NO-OWNER-ZONE']);
  const wrapper = JSON.stringify({ children: items });
  const wrappedIndex = buildJsonHierarchyScopeIndex(wrapper);
  assert.equal(wrappedIndex.strategy, 'root-children-array',
    'legacy accepts this shape, but the native indexed profile only accepts root arrays');
  assert.deepEqual(materializeJsonHierarchyScope(wrapper, wrappedIndex, 'ZONE-2')
    .value.map(x => x.name), ['LINE-B']);
});
