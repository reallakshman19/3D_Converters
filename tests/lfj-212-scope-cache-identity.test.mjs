import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureResolverHierarchyScope } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js';

const sourceFor = changedOwner => JSON.stringify(
  Array.from({length:7}, (_,i) => ({
    type:'SITE',
    name:i===1?changedOwner:'OWNER_'+i,
    pad:'Q'.repeat(260),
    children:[],
  })),
);
const legacySampleKey = source => {
  const middle = Math.floor(source.length/2);
  return [source.length, source.slice(0,96), source.slice(Math.max(0,middle-48),middle+48), source.slice(Math.max(0,source.length-96))].join('|');
};

test('212-T3: equal sampled key never reuses an unrelated original owner/zone UI catalogue', () => {
  const original = sourceFor('OWNER_1');
  const changed = sourceFor('OWNER_Z');
  assert.notEqual(original, changed);
  assert.equal(legacySampleKey(original), legacySampleKey(changed),
    'reproduce the formerly colliding length/first/middle/last-sample cache key');
  const stateRef = {current:{stagedJsonText:original,jsonTraceScopeId:'OWNER_1',resolverJsonTraceInputRevision:0}};
  const first = ensureResolverHierarchyScope(stateRef.current,stateRef);
  assert.equal(first.index.scopes.some(s=>s.id==='OWNER_1'),true);
  stateRef.current = {...stateRef.current,stagedJsonText:changed,jsonTraceScopeId:'OWNER_Z'};
  const second = ensureResolverHierarchyScope(stateRef.current,stateRef);
  assert.equal(second.index.scopes.some(s=>s.id==='OWNER_Z'),true,
    'new selected owner must be present in the current source, not an old sampled-text cache');
  assert.equal(second.index.scopes.some(s=>s.id==='OWNER_1'),false,
    'removed owner must not survive catalogue cache reuse');
  assert.equal(second.selectedScopeId,'OWNER_Z');
});

test('212-T3: unchanged original JSON can reuse its exact selected scope and never broaden ALL', () => {
  const source=sourceFor('OWNER_1');
  const stateRef={current:{stagedJsonText:source,jsonTraceScopeId:'OWNER_1',resolverJsonTraceInputRevision:0}};
  const first=ensureResolverHierarchyScope(stateRef.current,stateRef);
  const second=ensureResolverHierarchyScope(stateRef.current,stateRef);
  assert.equal(first.index,second.index,'same exact source may reuse verified index');
  assert.equal(second.selectedScopeId,'OWNER_1');
});
