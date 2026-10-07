import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  ALL_SCOPE_ID,
  ensureResolverHierarchyScope,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js';

const branch = (name, site) => ({
  name,
  type: 'BRANCH',
  attributes: { OWNER_SITE: site },
  children: [],
});

test('resolver UI defaults to a visible bounded hierarchy scope and caches the index', () => {
  const stagedJsonText = JSON.stringify([
    branch('/A/B1', '/SITE-A'),
    branch('/B/B1', '/SITE-B'),
  ]);
  const stateRef = { current: { stagedJsonText } };
  const first = ensureResolverHierarchyScope(stateRef.current, stateRef);
  assert.equal(first.index.indexable, true);
  assert.equal(first.selectedScopeId, '/SITE-A');
  assert.equal(stateRef.current.jsonTraceScopeId, '/SITE-A');
  const cached = stateRef.current.resolverJsonTraceUiScopeCache.index;

  const second = ensureResolverHierarchyScope(stateRef.current, stateRef);
  assert.equal(second.index, cached);
  assert.equal(second.selectedScopeId, '/SITE-A');
});

test('resolver UI preserves explicit All scopes instead of forcing the bounded default', () => {
  const stagedJsonText = JSON.stringify([
    branch('/A/B1', '/SITE-A'),
    branch('/B/B1', '/SITE-B'),
  ]);
  const stateRef = { current: { stagedJsonText, jsonTraceScopeId: ALL_SCOPE_ID } };
  const scope = ensureResolverHierarchyScope(stateRef.current, stateRef);
  assert.equal(scope.selectedScopeId, ALL_SCOPE_ID);
  assert.equal(stateRef.current.jsonTraceScopeId, ALL_SCOPE_ID);
});

test('unsupported JSON shape is explicit All scopes', () => {
  const stagedJsonText = JSON.stringify({ type: 'PROJECT', payload: { value: 1 } });
  const stateRef = { current: { stagedJsonText } };
  const scope = ensureResolverHierarchyScope(stateRef.current, stateRef);
  assert.equal(scope.index.indexable, false);
  assert.equal(scope.selectedScopeId, ALL_SCOPE_ID);
});

test('Resolver panel does not eagerly invoke semantic resolution during render', async () => {
  const source = await readFile(
    new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js', import.meta.url),
    'utf8',
  );
  assert.equal(source.includes("import { runStandaloneResolverJsonTrace }"), false);
  assert.equal(source.includes('result = runStandaloneResolverJsonTrace('), false);
  assert.match(source, /ensureResolverHierarchyScope\(state, stateRef\)/);
  assert.match(source, /Build \/ refresh resolver index/);
});
