/** Native Node regressions against the REAL UI event and state handlers. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
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

test('CSV actions reject an in-progress Build even with a former accepted epoch', () => {
  const ref = { current: createState() };
  ref.current.resolverJsonTraceAcceptedRevision = 0;
  ref.current.resolverJsonTraceRunning = true;
  assert.equal(downloadResolverTraceCsvFromUi(ref, () => {}, 'evidence-tree'), null);
  assert.match(ref.current.resolverJsonTraceExportStatus, /blocked/);
});
