import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indexAttNativeHierarchy } from '../../tabs/model-converters/att-native-hierarchy-index.js';
import {
  createAttScopeSelection, setAttScopeRule, attScopeEffectiveChecked,
  attScopeNodeState, resolveAttScopeSelection,
} from '../../tabs/model-converters/att-native-scope-selection.js';
const source = [
  ['SITE','/S1','/*'],['ZONE','/S1/Z1','/S1'],['BRAN','/S1/Z1/B1','/S1/Z1'],
  ['EQUI','/S1/Z1/EQ','/S1/Z1'],['ZONE','/S1/Z2','/S1'],
  ['BRAN','/S1/Z2/B2','/S1/Z2'],['VALV','/S1/Z2/B2/V','/S1/Z2/B2'],
  ['SITE','/S2','/*'],['ZONE','/S2/Z3','/S2'],['BRAN','/S2/Z3/B3','/S2/Z3'],
  ['SPINE','/ORPHAN','/MISSING'],
].flatMap(([type,name,owner])=>['NEW '+name,'NAME:= '+name,'TYPE:= '+type,'OWNER:= '+owner]).join('\n')+'\nEND';
const index = await indexAttNativeHierarchy(source);
assert.equal(index.counts.typed, 11);
let selection=createAttScopeSelection();
assert.equal(resolveAttScopeSelection(index,selection).selectedNativeCount,0);
selection=setAttScopeRule(index,selection,'/S1',true);
assert.equal(resolveAttScopeSelection(index,selection).selectedNativeCount,7);
assert.deepEqual(resolveAttScopeSelection(index,selection).selectedBranchIds,
  ['branch:/S1/Z1/B1','branch:/S1/Z2/B2']);
assert.equal(attScopeEffectiveChecked(index,selection,'/S1/Z2/B2/V'),true);
selection=setAttScopeRule(index,selection,'/S1/Z2',false);
assert.equal(attScopeNodeState(index,selection,'/S1'),'mixed');
assert.equal(attScopeNodeState(index,selection,'/S1/Z1'),'checked');
assert.equal(attScopeEffectiveChecked(index,selection,'/S1/Z2/B2'),false);
assert.deepEqual(resolveAttScopeSelection(index,selection).selectedBranchIds,['branch:/S1/Z1/B1']);
selection=setAttScopeRule(index,selection,'/S1/Z2/B2',true);
assert.equal(attScopeNodeState(index,selection,'/S1/Z2'),'mixed');
assert.deepEqual(resolveAttScopeSelection(index,selection).selectedBranchIds,
  ['branch:/S1/Z1/B1','branch:/S1/Z2/B2']);
selection=setAttScopeRule(index,selection,'/S2/Z3',true);
assert.equal(resolveAttScopeSelection(index,selection).selectedBranchIds.length,3);
selection=setAttScopeRule(index,selection,'/S1',false);
assert.deepEqual(resolveAttScopeSelection(index,selection).selectedBranchIds,
  ['branch:/S2/Z3/B3']);
selection=setAttScopeRule(index,selection,'/S2',false);
assert.equal(resolveAttScopeSelection(index,selection).selectedNativeCount,0);
assert.equal(resolveAttScopeSelection(index,selection).explicitSelection,false);
assert.throws(()=>setAttScopeRule(index,selection,'/fake',true),/Unknown/);
const client = await readFile(new URL('../../tabs/model-converters/att-native-scope-popup.js',import.meta.url),'utf8');
const legacy = await readFile(new URL('../../tabs/model-converters/legacy-adapter.js',import.meta.url),'utf8');
assert.match(client, /projectAttNativeTree/);
assert.match(client, /openAttNativeScopePopup/);
assert.match(client, /data-native-full/);
assert.match(client, /selectedBranchIds/);
assert.match(legacy,/scopeSelection = await openAttNativeScopePopup/);
assert.match(legacy,/runValues\.rvmScope = scopeSelection/);
assert.doesNotMatch(legacy,/const attTextForScope = _decodeTextUtf8\(secondaryBytes\)/);
console.log('test-att-native-scope-selection: PASS exact native scope and live popup binding');
