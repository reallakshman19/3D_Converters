/**
 * #1104 A04-U05: true R03/R04/R05 original byte scan -> SourceSessionV1
 * qualified port -> #1104 receiver -> first-party CAS -> typed R02.
 *
 * The test port adapts real original events to the already-defined native
 * SourceSessionV1 wire API. It does NOT impersonate browser Worker/IDB or
 * replace the separate authored docs H1 acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openBlobSourceSnapshot} from '../../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../../index/source-occurrence-index.mjs';
import {runSourceOnlyTypedSession} from './run-source-only-typed-session.mjs';
const code=x=>e=>{assert.equal(e?.code,x);return true;};
const value=[
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_SITE:'/S'},
    children:[{type:'VALVE',name:'é',attributes:{OWNER_ZONE:'/C'}}]},
  {type:'BRANCH',name:'/DUP',attributes:{OWNER_ZONE:'/OTHER'}}
];

async function realPort(source=value,{subset=false,onScalar}={}){
  const data=new TextEncoder().encode(JSON.stringify(source));
  const sha=createHash('sha256').update(data).digest('hex');
  const original=await openBlobSourceSnapshot(new Blob([data]),{
    revision:'A04-REAL-ORIGINAL',expectedSha256:sha,chunkBytes:64
  });
  const events=[];
  let summary;
  try{
    summary=await streamJsonOccurrenceEvents(original,{
      sourceRefId:'A04-ORIGINAL',pageEvents:5,pageBytes:64,
      onEventPage:async page=>events.push(...page)
    });
  }finally{original.close();}
  const all=events.filter(x=>x.kind==='OPEN');
  const rows=subset?all.filter(x=>x.path===''||x.path.startsWith('/0')):all;
  const seals=new Map(events.filter(x=>x.kind==='SEAL')
    .map(x=>[x.occurrenceId,x.endByteExclusive]));
  const expectedBasis=Object.freeze({
    sourceRefId:'A04-ORIGINAL',sourceSha256:sha,
    sourceRevision:summary.sourceRevision,
    selectionDigest:subset?'A04-SUBSET':'A04-ALL',
    jobId:'A04-ONLY-APP-GENERATION',
    dependencyRevision:'XML-MASTER-REV-1',byteLength:data.byteLength
  });
  let current={...expectedBasis},closed=false,closeCalls=0;
  const sourceFields={sourceRefId:expectedBasis.sourceRefId,
    sourceSha256:expectedBasis.sourceSha256,
    sourceRevision:expectedBasis.sourceRevision};
  const selectedFields={...sourceFields,selectionDigest:expectedBasis.selectionDigest,
    jobEpoch:expectedBasis.jobId};
  const port={
    schema:'LFJ.SourceSession.v1',summary,
    completion:{kind:'SOURCE_INDEX_COMPLETE',complete:true,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false},
    pageManifest:{
      schema:'LFJ.CommittedSelectionPageManifest.v1',
      ...selectedFields,complete:true,selectedCount:rows.length,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
    },
    async getCompletionManifest(){
      return {...sourceFields,selectionDigest:expectedBasis.selectionDigest,
        jobId:expectedBasis.jobId,sourceByteLength:data.byteLength,
        occurrenceCount:summary.occurrenceCount,eventCount:summary.eventCount,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async readPage({cursor,maxRows}){
      if(closed)throw Object.assign(Error('closed'),{code:'SESSION_CLOSED'});
      const start=cursor===null?0:Number(cursor.slice(2));
      const end=Math.min(rows.length,start+maxRows);
      const complete=end===rows.length;
      return {schema:'LFJ.CommittedSelectionPage.v1',...selectedFields,
        totalCount:rows.length,rows:rows.slice(start,end),complete,
        cursor:complete?null:'p:'+end,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async readOccurrence({occurrenceId,maxBytes}){
      if(closed)throw Object.assign(Error('closed'),{code:'SESSION_CLOSED'});
      const row=all.find(x=>x.occurrenceId===occurrenceId);
      if(!row)throw Error('missing original occurrence');
      const end=seals.get(row.occurrenceId);
      const bytes=data.slice(row.startByte,end);
      if(bytes.length>maxBytes)throw Error('scalar over cap');
      if(onScalar)await onScalar(row,{update:patch=>{current={...current,...patch}}});
      return {schema:'LFJ.SourceOccurrenceValue.v1',...sourceFields,
        occurrenceId,rowPath:row.path,path:row.path,ordinal:row.ordinal,
        type:row.type,startByte:row.startByte,endByteExclusive:end,bytes,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async close(){closed=true;closeCalls++;}
  };
  return {
    session:port,expectedBasis,
    getCurrentBasis:()=>({...current}),
    isClosed:()=>closed,closeCalls:()=>closeCalls,
    update:patch=>{current={...current,...patch}},originalCount:all.length
  };
}

test('A04-U05 real R05 port -> first-party source transaction -> exact own typed owners',async()=>{
  const p=await realPort();
  const result=await runSourceOnlyTypedSession({...p,maxRows:3,maxFacts:128});
  assert.equal(p.isClosed(),true);
  assert.equal(p.closeCalls(),1);
  assert.equal(result.schema,'LFJ.3D.SourceOnlyTypedSessionResult.v1');
  assert.equal(result.engineeringReady,false);
  assert.equal(result.candidate.engineeringReady,false);
  assert.equal(result.sourceReceipt.selectedCount,p.originalCount);
  assert.ok(result.publicationSerial>0);
  assert.deepEqual(result.candidate.nodes.map(n=>n.name),['/DUP','é','/DUP']);
  assert.deepEqual(result.candidate.nodes.map(n=>n.ownerSite),['/S','/S',null]);
  assert.deepEqual(result.candidate.nodes.map(n=>n.ownerZone),[null,'/C','/OTHER']);
  assert.notEqual(result.candidate.nodes[0].occurrenceId,
    result.candidate.nodes[2].occurrenceId);
});

test('A04-U05 actual selected original subset is allowed as R09 fact publication but NOT full typed A04',async()=>{
  const p=await realPort(value,{subset:true});
  await assert.rejects(
    runSourceOnlyTypedSession({...p,maxRows:2,maxFacts:128}),
    code('SOURCE_CENSUS_MISMATCH')
  );
  assert.equal(p.isClosed(),true);
  assert.equal(p.closeCalls(),1);
});

test('A04-U05 real original SourceSession stale XML/master during first scalar read aborts without candidate',async()=>{
  let count=0;
  const p=await realPort(value,{onScalar:async(_row,{update})=>{
    if(++count===2)update({dependencyRevision:'changed XML/master'});
  }});
  await assert.rejects(runSourceOnlyTypedSession({...p,maxRows:2,maxFacts:128}),
    code('CONSUMER_BASIS_STALE'));
  assert.equal(p.isClosed(),true);
  assert.equal(p.closeCalls(),1);
});

test('A04-U05 cancelled source never yields a typed candidate or retained session',async()=>{
  const p=await realPort();
  const abort=new AbortController();abort.abort();
  await assert.rejects(
    runSourceOnlyTypedSession({...p,maxRows:2,signal:abort.signal}),
    code('CONSUMER_CANCELLED')
  );
  assert.equal(p.isClosed(),true);
  assert.equal(p.closeCalls(),1);
});

test('A04-U05 invalid runner limits close exclusive source before receiver admission',async()=>{
  const p=await realPort();
  await assert.rejects(
    runSourceOnlyTypedSession({...p,maxFacts:4097}),
    code('SOURCE_RUN_CONFIG_INVALID')
  );
  assert.equal(p.isClosed(),true);
  assert.equal(p.closeCalls(),1);
});
