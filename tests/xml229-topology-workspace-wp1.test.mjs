import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {parseOccurrenceScene,affectedOccurrenceIds}
  from '../tabs/topology-workspace/occurrence-scene.mjs';
import {projectOccurrence,hitOccurrences}
  from '../tabs/topology-workspace/projected-canvas.mjs';

installWeightBasisXmlDom(globalThis);
const digest='b'.repeat(64);
const xml='<PipeStressExport>'+
  '<Branch><Branchname>BR-A</Branchname>'+
  '<Node><NodeNumber>2050</NodeNumber><Position>0 0 0</Position><ComponentType>PIPE</ComponentType></Node>'+
  '<Node><NodeNumber>2060</NodeNumber><Position>100 0 0</Position><ComponentType>PIPE</ComponentType></Node>'+
  '<Node><NodeNumber>2060</NodeNumber><Position>100 0 0</Position><ComponentType>ATTA</ComponentType>'+
    '<NodeName>SUPPORT/SREF</NodeName><ComponentRefNo>R-1</ComponentRefNo></Node>'+
  '<Node><NodeNumber>2050</NodeNumber><ComponentType>GASK</ComponentType></Node></Branch>'+
  '<Branch><Branchname>BR-B</Branchname>'+
  '<Node><NodeNumber>2050</NodeNumber><Position>0 0 0</Position><ComponentType>PIPE</ComponentType></Node>'+
  '</Branch></PipeStressExport>';

test('original occurrences remain distinct across duplicate numbers and coincident XYZ',()=>{
  const scene=parseOccurrenceScene(xml,digest);
  assert.equal(scene.branches.length,2);
  assert.equal(scene.records.length,5);
  assert.equal(new Set(scene.records.map(r=>r.id)).size,5);
  assert.equal(scene.records[0].key,'B0:N2050:S0');
  assert.equal(scene.records[4].key,'B1:N2050:S0');
  assert.notEqual(scene.records[0].id,scene.records[4].id);
  assert.equal(scene.records[2].support,true);
  assert.equal(scene.records[2].route,false);
  assert.equal(scene.records[3].position,null);
  assert.equal(scene.segments.length,1); // source-order illustrative segment only
});

test('canvas picking disambiguates stacked original occurrences instead of first label',()=>{
  const scene=parseOccurrenceScene(xml,digest);
  const view={yaw:0,pitch:0,zoom:1,panX:0,panY:0};
  const p=projectOccurrence(scene.records[0].position,scene.bounds,view,800,500);
  const hits=hitOccurrences(scene,view,800,500,p.x,p.y);
  assert.deepEqual(hits.map(r=>r.key),['B0:N2050:S0','B1:N2050:S0']);
  const q=projectOccurrence(scene.records[1].position,scene.bounds,view,800,500);
  const helperHits=hitOccurrences(scene,view,800,500,q.x,q.y,true);
  assert.deepEqual(helperHits.map(r=>r.key),['B0:N2060:S1','B0:N2060:S2']);
});

test('findings map action to source-qualified keys, not shared node number',()=>{
  const scene=parseOccurrenceScene(xml,digest);
  const action={finding_ids:['F-2'],node_numbers:[2050]};
  const findings=[{finding_id:'F-2',node_keys:['B1:N2050:S0']}];
  assert.deepEqual(affectedOccurrenceIds(action,findings,scene),[scene.records[4].id]);
  assert.deepEqual(affectedOccurrenceIds({finding_ids:['unknown'],node_numbers:[2050]},
    findings,scene),[]);
});

test('no coordinate is synthesized for malformed or absent XYZ',()=>{
  const bad=xml.replace('100 0 0','not a coordinate');
  const scene=parseOccurrenceScene(bad,digest);
  assert.equal(scene.records[1].position,null);
  assert.equal(scene.records[1].route,false);
  assert.equal(scene.records[0].position.x,0);
});
