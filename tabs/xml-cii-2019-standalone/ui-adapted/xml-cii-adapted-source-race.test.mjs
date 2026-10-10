/** Native Node regressions against the REAL UI event and state handlers. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJsonHierarchyScopeIndex, materializeJsonHierarchyScope, UNSCOPED_ID
} from '../xml-cii-json-hierarchy-scope.js';
import { buildStandaloneDtxrPositionGroups } from '../xml-cii-trace-resolution-ledger.js';
import {
  createOriginalToSelectedRootManifest,
  ALL_SOURCE_SCOPES, UNSCOPED_SOURCE_ID
} from '../../../lfj/consumers/3d-converters/source-root-selection-manifest.mjs';
import {
  extractDirectOriginalRootMetadata
} from '../../../lfj/consumers/3d-converters/verified-source-root-reader.mjs';
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

function originalRootManifestFixture(patch = {}) {
  return {
    sourceSha256: 'a'.repeat(64), sourceGeneration: 'original-gen-1',
    originalSourceBytes: 1200, xmlSha256: 'b'.repeat(64),
    configDigest: 'c'.repeat(64), requestedScopeId: 'ZONE-1',
    rootProfile: 'root-array',
    roots: [
      { ordinal: 1, parentOrdinal: 0, member: 0,
        startByte: 2, endByteExclusive: 190, type: 'BRANCH',
        name: 'LINE-A', ownerScope: 'ZONE-1',
        scopeEvidence: 'DIRECT_ROOT', scopeKey: 'OWNER_ZONE' },
      { ordinal: 7, parentOrdinal: 0, member: 1,
        startByte: 220, endByteExclusive: 420, type: 'BRANCH',
        name: 'LINE-B', ownerScope: 'ZONE-2',
        scopeEvidence: 'DIRECT_ATTRIBUTES', scopeKey: 'ZONE_ID' },
      { ordinal: 14, parentOrdinal: 0, member: 2,
        startByte: 480, endByteExclusive: 660, type: 'BRANCH',
        name: 'LINE-C', ownerScope: 'ZONE-1',
        scopeEvidence: 'DIRECT_ROOT', scopeKey: 'OWNER_ZONE' }
    ],
    ...patch
  };
}

test('T05a selected manifest maps noncontiguous original roots into dense view', async () => {
  const source = originalRootManifestFixture();
  const manifest = await createOriginalToSelectedRootManifest(source);
  assert.equal(manifest.schema, 'LFJ.A3.OriginalToSelectedRootManifest.v1');
  assert.equal(manifest.originalRootCount, 3);
  assert.equal(manifest.selectedRootCount, 2);
  assert.deepEqual(manifest.selected.map(x => [
    x.originalOrdinal, x.originalPath, x.displayPath, x.branchName
  ]), [
    [1, '$[0]', '$[0]', 'LINE-A'],
    [14, '$[2]', '$[1]', 'LINE-C']
  ]);
  assert.match(manifest.selectionDigestSha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.sourceOnly, true);
  assert.equal(manifest.engineeringReady, false);
  assert.equal(manifest.downloadAuthorized, false);
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.census),
    'original root evidence must not be mutable after the manifest is hashed');
  assert.ok(Object.isFrozen(manifest.selected),
    'selected root order must not be mutable after the manifest is hashed');
  assert.ok(Object.isFrozen(manifest.selected[0]));
  assert.throws(() => manifest.selected.reverse(), TypeError,
    'an earlier selection must never mutate after SHA binding');
  const repeat = await createOriginalToSelectedRootManifest(source);
  assert.equal(repeat.selectionDigestSha256, manifest.selectionDigestSha256,
    'same ordered original metadata and basis => identical digest');
  const all = await createOriginalToSelectedRootManifest(
    originalRootManifestFixture({ requestedScopeId: ALL_SOURCE_SCOPES }));
  assert.equal(all.selectedRootCount, 3);
  assert.deepEqual(all.selected.map(x => x.displayPath),
    ['$[0]', '$[1]', '$[2]']);
  assert.notEqual(all.selectionDigestSha256, manifest.selectionDigestSha256,
    'ALL and restricted scope must never share receipt basis');
});

test('T05a source, XML, config and zone identity are all digest-bound', async () => {
  const basis = originalRootManifestFixture();
  const full = await createOriginalToSelectedRootManifest(basis);
  for (const patch of [
    { sourceSha256: 'd'.repeat(64) }, { sourceGeneration: 'original-gen-2' },
    { xmlSha256: 'e'.repeat(64) }, { configDigest: 'f'.repeat(64) },
    { requestedScopeId: 'ZONE-2' },
    { roots: basis.roots.map((root, i) => i === 2
      ? { ...root, endByteExclusive: 665 } : root) }
  ]) {
    const modified = await createOriginalToSelectedRootManifest(
      originalRootManifestFixture(patch));
    assert.notEqual(modified.selectionDigestSha256, full.selectionDigestSha256);
  }
});

test('T05a refuses unverified root ordinals, scope evidence and topology', async () => {
  const base = originalRootManifestFixture();
  const corruptions = [
    [{ ...base.roots[0], parentOrdinal: 7 }, 'ROOT_PROVENANCE_INVALID'],
    [{ ...base.roots[0], member: 1 }, 'ROOT_PROVENANCE_INVALID'],
    [{ ...base.roots[0], type: 'SITE' }, 'TOPOLOGY_NOT_PROVEN'],
    [{ ...base.roots[0], scopeEvidence: 'NESTED_ONLY' }, 'SCOPE_EVIDENCE_INVALID'],
    [{ ...base.roots[0], scopeEvidence: 'NONE' }, 'SCOPE_EVIDENCE_INVALID'],
    [{ ...base.roots[0], ownerScope: UNSCOPED_SOURCE_ID }, 'SCOPE_EVIDENCE_INVALID'],
    [{ ...base.roots[0], ownerScope: ALL_SOURCE_SCOPES }, 'SCOPE_EVIDENCE_INVALID'],
    [{ ...base.roots[0], ordinal: 0 }, 'ROOT_PROVENANCE_INVALID'],
    [{ ...base.roots[0], endByteExclusive: 1500 }, 'ROOT_PROVENANCE_INVALID']
  ];
  for (const [bad, expected] of corruptions) {
    await assert.rejects(
      createOriginalToSelectedRootManifest({
        ...base, roots: [bad, ...base.roots.slice(1)]
      }), e => e.code === expected, expected);
  }
  for (const [patch, expected] of [
    [{ requestedScopeId: 'NOT-PRESENT' }, 'SCOPE_UNKNOWN'],
    [{ requestedScopeId: '' }, 'SCOPE_INVALID'],
    [{ rootProfile: 'root-children-array' }, 'ROOT_PROFILE_UNSUPPORTED'],
    [{ roots: [] }, 'SCOPE_EMPTY'],
    [{ sourceSha256: 'bad' }, 'SCOPE_BASIS_INVALID']
  ]) {
    await assert.rejects(
      createOriginalToSelectedRootManifest(originalRootManifestFixture(patch)),
      e => e.code === expected, expected);
  }
  const unscoped = await createOriginalToSelectedRootManifest(
    originalRootManifestFixture({
      requestedScopeId: UNSCOPED_SOURCE_ID,
      roots: base.roots.map((row, i) => i === 1
        ? { ...row, ownerScope: '', scopeEvidence: 'NONE', scopeKey: '' } : row)
    }));
  assert.deepEqual(unscoped.selected.map(x => x.originalRootIndex), [1]);
});

test('T05b accepts directly evidenced original root zone but never nested-only label', () => {
  const root = { type:'BRANCH', name:'BR-A',
    attributes:{ OWNER_ZONE:'ZONE-1', ZONE_ID:'ZONE-1' },
    children:[{ type:'COMPONENT', name:'leaf', OWNER_ZONE:'FAKE-NESTED' }] };
  assert.deepEqual(extractDirectOriginalRootMetadata(root), {
    type:'BRANCH', name:'BR-A', ownerScope:'ZONE-1',
    scopeEvidence:'DIRECT_ATTRIBUTES', scopeKey:'OWNER_ZONE'
  });
  const nestedOnly = { type:'BRANCH', name:'BR-NEST',
    children:[{ type:'COMPONENT', OWNER_ZONE:'ZONE-9' }] };
  assert.deepEqual(extractDirectOriginalRootMetadata(nestedOnly), {
    type:'BRANCH', name:'BR-NEST', ownerScope:'',
    scopeEvidence:'NONE', scopeKey:''
  }, 'a nested child label must NOT silently establish root source authority');
});

test('T05b rejects ambiguous direct source zone, malformed root and root topology', () => {
  const base = { type:'BRANCH', name:'LINE', children:[] };
  const bad = [
    [ {...base, OWNER_ZONE:'ZONE-1', attributes:{ZONE_ID:'ZONE-2'} },
      'SCOPE_EVIDENCE_AMBIGUOUS' ],
    [ {...base, TYPE:'ZONE'}, 'ROOT_METADATA_AMBIGUOUS' ],
    [ {...base, attributes:[]}, 'ROOT_METADATA_INVALID' ],
    [ {...base, children:null}, 'TOPOLOGY_NOT_PROVEN' ],
    [ {...base, type:'ZONE'}, 'TOPOLOGY_NOT_PROVEN' ],
    [ {...base, name:''}, 'TOPOLOGY_NOT_PROVEN' ],
    [ {...base, OWNER_ZONE:'A', owner_zone:'B'}, 'ROOT_METADATA_AMBIGUOUS' ]
  ];
  for (const [value, code] of bad)
    assert.throws(() => extractDirectOriginalRootMetadata(value),
      error => error.code === code, code);
});

test('T05b exact direct root ownership does not change on reordered subtrees', () => {
  const source = {
    type:'BRANCH', name:'LINE-A', OWNER_ZONE:'ZONE-1',
    children:[{type:'COMPONENT', name:'child1',attributes:{OWNER_ZONE:'ZONE-X'}},
      {type:'COMPONENT', name:'child2',OWNER_ZONE:'ZONE-Y'}]
  };
  const before = extractDirectOriginalRootMetadata(source);
  source.children.reverse();
  const after = extractDirectOriginalRootMetadata(source);
  assert.deepEqual(after,before,'nested owners cannot affect verified root scope');
});
