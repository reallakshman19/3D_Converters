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
