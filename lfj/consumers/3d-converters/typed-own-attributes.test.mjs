// #1104 A04 preflight: source-only R05 -> typed R02 boundary.
// This test invokes REAL R03/R04/R05 original bytes (no fake occurrence labels).
// H1 actual docs acceptance remains separate and REQUIRED before A04 release.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openBlobSourceSnapshot} from '../../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../../index/source-occurrence-index.mjs';
import {inspectStructuredJsonRoot} from '../../contracts/profiles/root-profile.mjs';
import {resolveSourceOwners} from '../../adapters/ownership/source-ownership.mjs';
import {projectTypedOwnAttributes} from './typed-own-attributes.mjs';

const enc=new TextEncoder();
async function actualFacts(value,{sourceRefId='A04-SRC',revision='A04-CUSTODY'}={}){
  const data=enc.encode(JSON.stringify(value));
  const sha=createHash('sha256').update(data).digest('hex');
  const snapshot=await openBlobSourceSnapshot(new Blob([data]),{
    revision,expectedSha256:sha,chunkBytes:64
  });
  const events=[];
  try{
    const summary=await streamJsonOccurrenceEvents(snapshot,{sourceRefId,
      pageEvents:5,pageBytes:64,onEventPage:async p=>events.push(...p)
    });
    assert.equal(summary.complete,true);
    const seals=new Map(events.filter(x=>x.kind==='SEAL')
      .map(x=>[x.occurrenceId,x.endByteExclusive]));
    const facts=events.filter(x=>x.kind==='OPEN').map(row=>({
      row,bytes:['string','number','boolean','null'].includes(row.type)?
        data.slice(row.startByte,seals.get(row.occurrenceId)):null,
      sourceOnly:true
    }));
    const basis={sourceRefId,sourceSha256:sha,sourceRevision:snapshot.revision,
      selectionDigest:'A04-SCOPE-ALL',jobId:'A04-TEST-JOB',
      dependencyRevision:'A04-XML-MASTERS-CONFIG',byteLength:data.length};
    const receipt={schema:'LFJ.3D.ConsumerSourceFactsReceipt.v1',
      ...basis,selectedCount:facts.length,complete:true,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    return {facts,receipt,rootProfile:inspectStructuredJsonRoot(value),data,summary};
  }finally{snapshot.close();}
}
const codeIs=c=>e=>e?.code===c;

test('RED: direct R05 JSON value events are not R02 engineering nodes',async()=>{
  const input=await actualFacts([{type:'BRANCH',name:'/A',attributes:{OWNER_ZONE:'/Z'}}]);
  assert.throws(()=>resolveSourceOwners(input.facts.map(f=>f.row)),codeIs('INVALID_OCCURRENCE'));
});

test('A04 real R05 spans: descendant OWNER_ZONE never backfills parent, and duplicate name distinct',async()=>{
  const a=await actualFacts([
    {type:'BRANCH',name:'/SAME',attributes:{OWNER:'/STRUCTURE'},
      children:[{type:'VALVE',name:'é',attributes:{OWNER_ZONE:'/Z-CHILD'}}]},
    {type:'BRANCH',name:'/SAME',attributes:{OWNER_ZONE:'/Z-SECOND'}}
  ]);
  const v=projectTypedOwnAttributes(a);
  assert.equal(v.schema,'LFJ.3D.TypedOwnAttributesCandidate.v1');
  assert.equal(v.engineeringReady,false);
  assert.equal(v.rightsBasis,'SOURCE_ONLY_PROJECTED_CANDIDATE');
  assert.equal(v.nodes.length,3);
  const [parent,child,other]=v.nodes;
  assert.equal(parent.name,'/SAME');
  assert.equal(parent.parentOccurrenceId,null);
  assert.equal(parent.attributes.OWNER,'/STRUCTURE');
  assert.equal(parent.ownerZone,null);
  assert.equal(child.ownerZone,'/Z-CHILD');
  assert.equal(child.ownerZoneSource,child.occurrenceId);
  assert.equal(child.parentOccurrenceId,parent.occurrenceId);
  assert.equal(other.ownerZone,'/Z-SECOND');
  assert.notEqual(parent.occurrenceId,other.occurrenceId);
  assert.equal(v.sourceSha256,a.receipt.sourceSha256);
  assert.equal(v.selectedCount,a.facts.length);
});

test('A04 nested hierarchy and typed Site/Zone inheritance only from own ancestor',async()=>{
  const input=await actualFacts({hierarchy:[
    {type:'SITE',name:'/S',children:[
      {type:'ZONE',name:'/Z',children:[
        {type:'BRANCH',name:'/B',attributes:{OWNER:'/SYS'},
          children:[{type:'PIPE',name:'/P'}]}
      ]}
    ]}
  ]});
  const v=projectTypedOwnAttributes(input);
  assert.deepEqual(v.nodes.map(x=>x.type),['SITE','ZONE','BRANCH','PIPE']);
  assert.deepEqual(v.nodes.map(x=>x.ownerSite),['/S','/S','/S','/S']);
  assert.deepEqual(v.nodes.map(x=>x.ownerZone),[null,'/Z','/Z','/Z']);
  assert.deepEqual(v.nodes.map(x=>x.branchOwner),[null,null,'/SYS','/SYS']);
  assert.equal(v.rootKind,'hierarchy');
});

test('A04 fail closed: scope cardinality, forged original parent and unsupported root',async()=>{
  const input=await actualFacts([{type:'BRANCH',name:'/B'}]);
  const wrong={...input,receipt:{...input.receipt,selectedCount:input.facts.length+1}};
  assert.throws(()=>projectTypedOwnAttributes(wrong),codeIs('SOURCE_SCOPE_INCOMPLETE'));
  const fake=input.facts.map(x=>x);
  fake[1]={...fake[1],row:{...fake[1].row,parentId:'forged-parent'}};
  assert.throws(()=>projectTypedOwnAttributes({...input,facts:fake}),codeIs('SOURCE_GRAPH_INVALID'));
  assert.throws(()=>projectTypedOwnAttributes({...input,
    rootProfile:{schema:'lfj-root-profile/v1',rootKind:'unapproved',
      rootKey:null,profileId:'staged-generic/v1',
      rightsBasis:'STRUCTURAL_INSPECTION_ONLY',
      capabilities:{read:true,edit:false,export:false}}}),codeIs('ROOT_PROFILE_REQUIRED'));
});

test('A04 fail closed: tampered original UTF-8 scalar, omitted name and non-own child metadata',async()=>{
  const a=await actualFacts([{type:'BRANCH',name:'/P',children:[
    {type:'VALVE',name:'/C',attributes:{OWNER_ZONE:'/CHILD'}}
  ]}]);
  const original=a.facts.find(x=>x.row.path==='/0/name');
  const fake=a.facts.map(x=>x===original?{...x,bytes:enc.encode('"\\uZZZZ"')}:x);
  assert.throws(()=>projectTypedOwnAttributes({...a,facts:fake}),codeIs('SCALAR_INVALID'));
  const noName=a.facts.filter(x=>x.row.path!=='/0/name');
  assert.throws(()=>projectTypedOwnAttributes({...a,facts:noName,
    receipt:{...a.receipt,selectedCount:noName.length}}),codeIs('SOURCE_GRAPH_INVALID'));
  // Unsupported fake descriptor may not promote untrusted ordinary source.
  assert.throws(()=>projectTypedOwnAttributes({...a,receipt:{
    ...a.receipt,engineeringReady:true}}),codeIs('SOURCE_SCOPE_INCOMPLETE'));
  const clean=projectTypedOwnAttributes(a);
  assert.equal(clean.nodes[0].ownerZone,null,'descendant cannot set parent Zone');
  assert.equal(clean.nodes[1].ownerZone,'/CHILD');
});

test('A04 bounded preflight: no inferred domain authority, no unbounded collector',async()=>{
  const input=await actualFacts({objects:[{type:'BRANCH',name:'/B'}]});
  assert.throws(()=>projectTypedOwnAttributes({...input,maxRows:2}),
    codeIs('SOURCE_LIMIT'));
  const v=projectTypedOwnAttributes(input);
  assert.equal(v.rootKind,'objects');
  assert.equal(v.nodes.length,1);
  assert.equal(v.nodes[0].sourceId.startsWith('['),true,
    'source candidate ID is a compound namespace, not a physical GC-PW ID');
  assert.equal(v.engineeringReady,false);
});
