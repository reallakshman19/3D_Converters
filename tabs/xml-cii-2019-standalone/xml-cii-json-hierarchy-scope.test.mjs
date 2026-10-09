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
