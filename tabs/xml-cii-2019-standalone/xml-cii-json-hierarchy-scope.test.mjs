// R12/U01 independent direct-parent ownership regression against real Resolver index.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJsonHierarchyScopeIndex, UNSCOPED_ID} from './xml-cii-json-hierarchy-scope.js';

test('R12/U01 semantic RED: child OWNER_ZONE cannot become parent BRANCH own owner',()=>{
 const json=JSON.stringify([{type:'BRANCH',name:'Parent',
  children:[{type:'BRANCH',name:'Child',OWNER_ZONE:'ZONE-CHILD'}]}]);
 const index=buildJsonHierarchyScopeIndex(json);
 assert.equal(index.itemCount,1);
 assert.deepEqual(index.scopes.map(s=>s.id),[UNSCOPED_ID]);
 assert.equal(index.scopes[0].itemCount,1);
});
test('R12/U01 semantic RED: parent SITE beats nested child OWNER_ZONE even across alias priority',()=>{
 const json=JSON.stringify([{type:'BRANCH',name:'Parent',SITE:'SITE-PARENT',
  children:[{type:'BRANCH',OWNER_ZONE:'ZONE-CHILD'}]}]);
 const index=buildJsonHierarchyScopeIndex(json);
 assert.deepEqual(index.scopes.map(s=>s.id),['SITE-PARENT']);
});
test('R12/U01 independent positive: explicit parent OWNER_ZONE remains its direct authority',()=>{
 const json=JSON.stringify([{type:'BRANCH',name:'Parent',OWNER_ZONE:'ZONE-PARENT',
  children:[{type:'BRANCH',OWNER_ZONE:'ZONE-CHILD'}]}]);
 const index=buildJsonHierarchyScopeIndex(json);
 assert.deepEqual(index.scopes.map(s=>s.id),['ZONE-PARENT']);
});

test('R12/U01: direct item attributes OWNER_SITE is authoritative, descendant attributes cannot override it',()=>{
 const json=JSON.stringify([{type:'BRANCH',name:'Parent',
  attributes:{OWNER_SITE:'SITE-PARENT'},
  children:[{type:'BRANCH',attributes:{OWNER_ZONE:'ZONE-CHILD'}}]}]);
 const index=buildJsonHierarchyScopeIndex(json);
 assert.deepEqual(index.scopes.map(s=>s.id),['SITE-PARENT']);
});

test('R12/U02 RED: cannot materialize a source-replaced same-length JSON from old indexed byte offsets',()=>{
 const a=JSON.stringify([{type:'BRANCH',name:'A',OWNER_ZONE:'SITE-A'}]);
 const b=a.replace('SITE-A','SITE-B');
 assert.equal(a.length,b.length);
 const index=buildJsonHierarchyScopeIndex(a);
 assert.throws(()=>materializeJsonHierarchyScope(b,index,'SITE-A'),
   e=>e?.code==='SOURCE_SCOPE_STALE');
});
test('R12/U02 RED: invalid scope is not a silent All scope on an unsupported envelope',()=>{
 const source=JSON.stringify({type:'PROJECT',payload:{opaque:1}});
 const index=buildJsonHierarchyScopeIndex(source);
 assert.throws(()=>materializeJsonHierarchyScope(source,index,'FORGED-ZONE'),
   e=>e?.code==='SOURCE_SCOPE_UNKNOWN');
});
test('R12/U04 RED: oversized legacy JSON never scans or parses on foreground without Worker',()=>{
 const huge=JSON.stringify([{type:'BRANCH',OWNER_ZONE:'SITE-X',description:'x'.repeat(1100000)}]);
 assert.throws(()=>buildJsonHierarchyScopeIndex(huge),
   e=>e?.code==='SOURCE_SCOPE_WORKER_REQUIRED');
});
