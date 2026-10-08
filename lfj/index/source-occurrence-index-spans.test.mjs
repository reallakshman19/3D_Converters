// R05/U03 independent original-source byte-span and direct OWN-node metadata oracle.
// The fixture/fragment boundaries are explicitly authored; no LFJ index output
// is used to derive expected start/end offsets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceSnapshotBuilder} from '../source/source-snapshot.mjs';
import {resolveSourceOwners} from '../adapters/ownership/source-ownership.mjs';
import {streamJsonOccurrenceEvents} from './source-occurrence-index.mjs';

const child='{"type":"VALVE","name":"V","attributes":{"OWNER_ZONE":"/Z-CHILD"}}';
const branch='{"type":"BRANCH","name":"β💡","attributes":{},"children":['+child+']}';
const input='{"hierarchy":['+branch+'],"tail":1.20e+03}';
const encoder=new TextEncoder(),original=encoder.encode(input);
const snap=()=>{
  const b=createSourceSnapshotBuilder({byteLength:original.length,revision:'U03-unaltered-original'});
  for(let i=0;i<original.length;i++)b.append(original.subarray(i,i+1),i);
  return b.finalize();
};
function expectedSpan(fragment) {
  const p=input.indexOf(fragment);
  assert.ok(p>=0,'independently authored fragment exists in original source');
  assert.equal(input.indexOf(fragment,p+1),-1,'oracle fragment is unambiguous');
  return [encoder.encode(input.slice(0,p)).length,encoder.encode(input.slice(0,p+fragment.length)).length];
}
async function events(snapshot,options={}) {
 const pages=[];
 const summary=await streamJsonOccurrenceEvents(snapshot,{
  sourceRefId:'REAL-PL01',pageBytes:1,pageEvents:2,
  onEventPage:async p=>pages.push(p),...options,
 });
 return {summary,open:pages.flat().filter(e=>e.kind==='OPEN'),
  seal:pages.flat().filter(e=>e.kind==='SEAL'),pages};
}
const at=(rows,path)=>{const r=rows.find(x=>x.path===path);assert.ok(r,'missing '+path);return r;};

test('U03 original UTF8 half-open byte spans for nested composites, Unicode, scalar and lexical number',async()=>{
 const source=snap(),{summary,open,seal}=await events(source);
 const cases=[
  ['',input],['/hierarchy','['+branch+']'],['/hierarchy/0',branch],
  ['/hierarchy/0/name','"β💡"'],['/hierarchy/0/children/0',child],
  ['/hierarchy/0/children/0/attributes/OWNER_ZONE','"/Z-CHILD"'],
  ['/tail','1.20e+03'],
 ];
 for(const [path,fragment] of cases){
  const o=at(open,path),z=seal.find(e=>e.occurrenceId===o.occurrenceId);
  assert.ok(z,'missing SEAL '+path);
  assert.deepEqual([o.startByte,z.endByteExclusive],expectedSpan(fragment),path);
  assert.deepEqual(original.subarray(o.startByte,z.endByteExclusive),encoder.encode(fragment));
 }
 assert.equal(at(open,'/hierarchy/0/children/0').parentId,at(open,'/hierarchy/0/children').occurrenceId);
 assert.equal(at(open,'/hierarchy/0/name').parentId,at(open,'/hierarchy/0').occurrenceId);
 assert.equal(summary.endByteExclusive,original.length);
 source.close();
});

test('U03 RED: opt-in bounded scalar facts preserve exact own attributes, no descendant owner pollution',async()=>{
 const source=snap(),{open}=await events(source,{includeScalarValues:true});
 const name=at(open,'/hierarchy/0/name');
 const parentType=at(open,'/hierarchy/0/type');
 const childType=at(open,'/hierarchy/0/children/0/type');
 const childZone=at(open,'/hierarchy/0/children/0/attributes/OWNER_ZONE');
 const lexicalNumber=at(open,'/tail');
 assert.equal(name.value,'β💡');
 assert.equal(parentType.value,'BRANCH');
 assert.equal(childType.value,'VALVE');
 assert.equal(childZone.value,'/Z-CHILD');
 assert.equal(lexicalNumber.value,'1.20e+03','retain exact source decimal, do not JS-round engineering facts');
 // Construct only two explicitly listed node occurrences. OWN attributes are
 // taken from exact direct JSON Pointer children, not ancestor-subtree regex.
 const facts=[
  {sourceId:'REAL-PL01',occurrenceId:at(open,'/hierarchy/0').occurrenceId,
   parentOccurrenceId:null,type:parentType.value,name:name.value,attributes:{}},
  {sourceId:'REAL-PL01',occurrenceId:at(open,'/hierarchy/0/children/0').occurrenceId,
   parentOccurrenceId:at(open,'/hierarchy/0').occurrenceId,type:childType.value,
   name:at(open,'/hierarchy/0/children/0/name').value,
   attributes:{OWNER_ZONE:childZone.value}},
 ];
 const owned=resolveSourceOwners(facts);
 assert.equal(owned[0].ownerZone,null,'child-owned OWNER_ZONE must not attach to parent');
 assert.equal(owned[1].ownerZone,'/Z-CHILD');
 assert.equal(owned[1].ownerZoneSource,facts[1].occurrenceId);
 assert.equal(owned[0].engineeringReady,false);
 source.close();
});

test('U03 opt-in is explicit: default original occurrence pages do not disclose scalar payloads',async()=>{
 const source=snap(),{open}=await events(source);
 for(const row of open) assert.equal(Object.hasOwn(row,'value'),false);
 source.close();
});
