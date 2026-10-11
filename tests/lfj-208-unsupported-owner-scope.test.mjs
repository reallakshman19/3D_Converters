import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SCOPE_ID, buildJsonHierarchyScopeIndex, materializeJsonHierarchyScope,
} from '../tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js';
import {
  ensureResolverHierarchyScope,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js';

const original = JSON.stringify([
  {type:'SITE',name:'OWNER-A',children:[{type:'BRANCH',name:'A-1',NodeNumber:-1}]},
  {type:'SITE',name:'OWNER-B',children:[{type:'BRANCH',name:'B-1',NodeNumber:-1}]},
]);
const nonindexable=JSON.stringify({type:'SITE',name:'OWNER-A',record:{NodeNumber:-1}});
const stale='OWNER-THIRD-NOT-IN_THIS_JSON';

test('INT-05A positive: explicit original site selection returns only the selected original item',()=>{
  const index=buildJsonHierarchyScopeIndex(original);
  assert.equal(index.indexable,true);
  assert.deepEqual(index.scopes.map(s=>s.id),['OWNER-A','OWNER-B']);
  const result=materializeJsonHierarchyScope(original,index,'OWNER-B');
  assert.equal(result.scopeId,'OWNER-B');
  assert.equal(result.value.length,1);
  assert.equal(result.value[0].name,'OWNER-B');
  assert.equal(result.value[0].children[0].NodeNumber,-1);
});

test('INT-05A unknown explicit selected scope cannot be silently substituted with first owner',()=>{
  const index=buildJsonHierarchyScopeIndex(original);
  const state={stagedJsonText:original,jsonTraceScopeId:stale};
  const display=ensureResolverHierarchyScope(state);
  assert.equal(display.selectedScopeId,stale,
    'preserve unsupported selected owner so real Build can reject it rather than switching owner');
  assert.throws(()=>materializeJsonHierarchyScope(original,index,stale),/unknown.*scope/i);
});

test('INT-05A unsupported selected site on non-indexable JSON must reject instead of broadening to ALL',()=>{
  const index=buildJsonHierarchyScopeIndex(nonindexable);
  assert.equal(index.indexable,false);
  const display=ensureResolverHierarchyScope({
    stagedJsonText:nonindexable,jsonTraceScopeId:'OWNER-A',
  });
  assert.equal(display.selectedScopeId,'OWNER-A');
  assert.throws(
    ()=>materializeJsonHierarchyScope(nonindexable,index,'OWNER-A'),
    /not indexable|unsupported.*scope|cannot.*scope/i,
  );
});

test('INT-05A supported explicit ALL remains full-source including both original -1 occurrences',()=>{
  const index=buildJsonHierarchyScopeIndex(original);
  const full=materializeJsonHierarchyScope(original,index,ALL_SCOPE_ID);
  assert.equal(full.scopeId,ALL_SCOPE_ID);
  assert.equal(full.value.length,2);
  assert.deepEqual(full.value.map(x=>x.children[0].NodeNumber),[-1,-1]);
});

test('INT-05A omitted selection still selects the established default on indexable sources',()=>{
  const index=buildJsonHierarchyScopeIndex(original);
  const state={stagedJsonText:original,jsonTraceScopeId:''};
  assert.equal(ensureResolverHierarchyScope(state).selectedScopeId,index.defaultScopeId);
  assert.equal(materializeJsonHierarchyScope(original,index,'').scopeId,index.defaultScopeId);
});

test('INT-05A nonindexable input with explicitly requested ALL remains available',()=>{
  const index=buildJsonHierarchyScopeIndex(nonindexable);
  const full=materializeJsonHierarchyScope(nonindexable,index,ALL_SCOPE_ID);
  assert.equal(full.scopeId,ALL_SCOPE_ID);
  assert.equal(full.value.record.NodeNumber,-1);
});
