// R12/U03: independent equal-byte-length interior source replacement oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureResolverHierarchyScope} from './xml-cii-adapted-resolver-scope.js';

const original=JSON.stringify([{type:'BRANCH',name:'ActualSource',
  prefix:'x'.repeat(340),OWNER_ZONE:'ZONE-A',
  middle:'m'.repeat(680),suffix:'z'.repeat(340)}]);
const changed=original.replace('"OWNER_ZONE":"ZONE-A"','"OWNER_ZONE":"ZONE-B"');

test('R12/U03 semantic RED: source replacement outside sampled slices invalidates UI scope cache',()=>{
 assert.equal(changed.length,original.length);
 const middle=s=>s.slice(Math.floor(s.length/2)-48,Math.floor(s.length/2)+48);
 assert.equal(original.slice(0,96),changed.slice(0,96));
 assert.equal(middle(original),middle(changed));
 assert.equal(original.slice(-96),changed.slice(-96));
 const stateRef={current:{stagedJsonText:original}};
 const first=ensureResolverHierarchyScope(stateRef.current,stateRef);
 assert.deepEqual(first.index.scopes.map(s=>s.id),['ZONE-A']);
 const firstIndex=first.index;
 stateRef.current={...stateRef.current,stagedJsonText:changed};
 const second=ensureResolverHierarchyScope(stateRef.current,stateRef);
 assert.deepEqual(second.index.scopes.map(s=>s.id),['ZONE-B'],
   'changed original hierarchy owner cannot inherit cached source-sample index');
 assert.notStrictEqual(second.index,firstIndex,'old scope index must not be reused');
});

test('R12/U03 RED: superseding source revokes old selected scope and finished trace, even with matching new scope label',()=>{
 const a=JSON.stringify([{type:'BRANCH',name:'A',OWNER_ZONE:'ZONE-A',payload:'x'.repeat(300)}]);
 const b=a.replace('"payload":"x','"payload":"y');
 assert.equal(a.length,b.length);
 const stateRef={current:{stagedJsonText:a,jsonTraceScopeId:'ZONE-A',
  resolverJsonTraceResult:{old:true},resolverJsonTraceJsonResult:{old:true},
  resolverJsonTraceExportStatus:'DONE'}};
 ensureResolverHierarchyScope(stateRef.current,stateRef);
 stateRef.current={...stateRef.current,stagedJsonText:b};
 const out=ensureResolverHierarchyScope(stateRef.current,stateRef);
 assert.equal(out.sourceSuperseded,true);
 assert.equal(out.selectedScopeId,'__STALE_SOURCE_SCOPE__');
 assert.equal(stateRef.current.jsonTraceScopeId,'__STALE_SOURCE_SCOPE__');
 assert.equal(stateRef.current.resolverJsonTraceResult,null);
 assert.equal(stateRef.current.resolverJsonTraceJsonResult,null);
 assert.equal(stateRef.current.resolverJsonTraceExportStatus,'');
 stateRef.current={...stateRef.current,jsonTraceScopeId:'ZONE-A'};
 const selected=ensureResolverHierarchyScope(stateRef.current,stateRef);
 assert.equal(selected.selectedScopeId,'ZONE-A','manual re-selection restores current source scope');
});
