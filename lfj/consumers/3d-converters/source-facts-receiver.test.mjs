import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeSelectedSourceFacts} from './source-facts-receiver.mjs';

const encoder=new TextEncoder();
const raw=encoder.encode('{"name":"é","q":7}');
const scalarA=encoder.encode('"é"');
const scalarB=encoder.encode('7');
const find=(haystack,needle)=>{
  for(let i=0;i+needle.length<=haystack.length;i++)
    if(needle.every((v,j)=>haystack[i+j]===v))return i;
  throw Error('source corpus byte span missing');
};
const aStart=find(raw,scalarA),bStart=find(raw,scalarB);
const basis=Object.freeze({
  sourceRefId:'original-custody-1',sourceSha256:'original-sha-1',
  sourceRevision:'original-revision-1',selectionDigest:'full-original-selection-1',
  jobId:'original-worker-job-1',dependencyRevision:'XML-masters-config-1',
  byteLength:raw.length
});
const rows=[
  {kind:'OPEN',...pickSource(),occurrenceId:'root',ordinal:0,path:'',parentId:null,type:'object',startByte:0},
  {kind:'OPEN',...pickSource(),occurrenceId:'name',ordinal:1,path:'/name',parentId:'root',type:'string',startByte:aStart},
  {kind:'OPEN',...pickSource(),occurrenceId:'q',ordinal:2,path:'/q',parentId:'root',type:'number',startByte:bStart}
];
function pickSource(){
  return {sourceRefId:basis.sourceRefId,sourceSha256:basis.sourceSha256,sourceRevision:basis.sourceRevision};
}
function makePorts(overrides={}){
  let live={...basis},closeCount=0,readCount=0,pageCount=0;
  const hooks=overrides;
  const session={
    schema:'LFJ.SourceSession.v1',
    completion:{kind:'SOURCE_INDEX_COMPLETE',complete:true,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false},
    pageManifest:{
      schema:'LFJ.CommittedSelectionPageManifest.v1',complete:true,...pickSource(),
      selectionDigest:basis.selectionDigest,jobEpoch:basis.jobId,
      selectedCount:3,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
    },
    async getCompletionManifest(){
      hooks.onManifest?.(()=>live);
      return {
        ...pickSource(),sourceByteLength:raw.length,selectionDigest:basis.selectionDigest,
        jobId:basis.jobId,occurrenceCount:3,eventCount:6,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
      };
    },
    async readPage({cursor,maxRows,maxBytes}){
      assert.equal(maxRows,64);assert.equal(maxBytes,65536);
      pageCount++;
      hooks.onPage?.(()=>live);
      const data=cursor===null?rows.slice(0,2):cursor==='next'?rows.slice(2):[];
      return {schema:'LFJ.CommittedSelectionPage.v1',complete:cursor!==null,
        rows:data,cursor:cursor===null?'next':null,totalCount:3,...pickSource(),
        selectionDigest:basis.selectionDigest,jobEpoch:basis.jobId,
        rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async readOccurrence({occurrenceId,expectedSourceRevision,maxBytes}){
      assert.equal(expectedSourceRevision,basis.sourceRevision);
      assert.equal(maxBytes,65536);
      readCount++;
      hooks.onRead?.(()=>live);
      const row=rows.find(x=>x.occurrenceId===occurrenceId);
      if(!row||row.type==='object')throw Error('container read forbidden');
      const bytes=row.type==='string'?scalarA:scalarB;
      return {schema:'LFJ.SourceOccurrenceValue.v1',...pickSource(),
        occurrenceId,ordinal:row.ordinal,path:row.path,type:row.type,
        startByte:row.startByte,endByteExclusive:row.startByte+bytes.length,
        bytes,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async close(){closeCount++;}
  };
  return {
    session,getCurrentBasis:()=>live, mutate:(patch)=>{live={...live,...patch};},
    counts:()=>({closeCount,readCount,pageCount}),
    input:()=>({session,expectedBasis:{...basis},getCurrentBasis:()=>live})
  };
}
function verifyCode(code){return e=>e?.code===code;}

test('I3 positive: two real UTF-8 scalar spans, root metadata only, exact selected union and close',async()=>{
  const p=makePorts(),observed=[];
  const out=await consumeSelectedSourceFacts({...p.input(),onOccurrence:x=>observed.push(x)});
  assert.equal(out.complete,true);
  assert.equal(out.selectedCount,3);assert.equal(out.scalarCount,2);
  assert.equal(out.containerCount,1);assert.equal(out.pages,2);
  assert.equal(out.deliveredScalarBytes,scalarA.length+scalarB.length);
  assert.equal(out.engineeringReady,false);
  assert.equal(out.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.equal(observed[0].bytes,null,'nested container must never be materialized');
  assert.equal(new TextDecoder().decode(observed[1].bytes),'"é"');
  assert.equal(new TextDecoder().decode(observed[2].bytes),'7');
  assert.equal(observed[0].row.path,'','root JSON pointer is empty');
  assert.deepEqual(p.counts(),{closeCount:1,readCount:2,pageCount:2});
});

test('I3 fail-close: scope-only supersession during await readPage invalidates result',async()=>{
  let p;
  p=makePorts({onPage:()=>p.mutate({selectionDigest:'new scope'})});
  await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),onOccurrence:()=>{}}),
    verifyCode('CONSUMER_BASIS_STALE'));
  assert.equal(p.counts().closeCount,1);
  assert.equal(p.counts().readCount,0);
});

test('I3 fail-close: dependency-only supersession during scalar byte read',async()=>{
  let p;
  p=makePorts({onRead:()=>p.mutate({dependencyRevision:'changed master'})});
  let delivered=0;
  await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),
    onOccurrence:()=>{delivered++;}}),verifyCode('CONSUMER_BASIS_STALE'));
  assert.equal(delivered,1,'root metadata already emitted; stale scalar must not emit');
  assert.equal(p.counts().closeCount,1);
});

test('I3 fail-close: source-only / job-only changes after onOccurrence',async()=>{
  for(const patch of [{sourceSha256:'changed bytes'},{jobId:'superseded-job'}]){
    const p=makePorts();
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),
      onOccurrence:()=>p.mutate(patch)}),verifyCode('CONSUMER_BASIS_STALE'));
    assert.equal(p.counts().closeCount,1);
  }
});

test('I3 fail-close: callback exception closes exclusive source session',async()=>{
  const p=makePorts();
  await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),
    onOccurrence:()=>{throw Error('consumer rejected original source');}}),/consumer rejected/);
  assert.equal(p.counts().closeCount,1);
});

test('I3 rejects forged page rights, incomplete selected union and missing OPEN identity',async()=>{
  for(const [patch,code] of [
    [{engineeringReady:true},'CONSUMER_PAGE_INVALID'],
    [{complete:true,cursor:null},'CONSUMER_CARDINALITY_INVALID'],
    [{rows:[]},'CONSUMER_PAGE_INVALID'],
    [{rows:[{...rows[0],sourceRefId:'other source'}]},'CONSUMER_OCCURRENCE_INVALID'],
    [{rows:[{...rows[0],ordinal:-1}]},'CONSUMER_OCCURRENCE_INVALID']
  ]){
    const p=makePorts();
    const old=p.session.readPage;
    p.session.readPage=async args=>({...await old(args),...patch});
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),onOccurrence:()=>{}}),
      verifyCode(code));
    assert.equal(p.counts().closeCount,1);
  }
});

test('I3 denies forged original scalar spans and unauthorized engineering rights',async()=>{
  for(const bad of [
    {path:'/wrong-physical-owner'},
    {engineeringReady:true},
    {bytes:new Uint8Array([1])}
  ]){
    const p=makePorts();
    const old=p.session.readOccurrence;
    p.session.readOccurrence=async args=>({...await old(args),...bad});
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),onOccurrence:()=>{}}),
      verifyCode('CONSUMER_VALUE_INVALID'));
    assert.equal(p.counts().closeCount,1);
  }
});

test('I3 port refuses fake H1 session, overlimit scalar, missing dependency and signal cancellation',async()=>{
  {
    const p=makePorts();p.session.completion.engineeringReady=true;
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),onOccurrence:()=>{}}),
      verifyCode('SOURCE_SESSION_UNQUALIFIED'));
    assert.equal(p.counts().closeCount,1);
  }
  {
    const p=makePorts();
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),
      maxScalarBytes:1,onOccurrence:()=>{}}),verifyCode('CONSUMER_VALUE_INVALID'));
    assert.equal(p.counts().closeCount,1);
  }
  {
    const p=makePorts();const invalid=p.input();
    delete invalid.expectedBasis.dependencyRevision;
    await assert.rejects(()=>consumeSelectedSourceFacts({...invalid,onOccurrence:()=>{}}),
      verifyCode('CONSUMER_BASIS_REQUIRED'));
  }
  {
    const p=makePorts();const c=new AbortController();c.abort();
    await assert.rejects(()=>consumeSelectedSourceFacts({...p.input(),
      signal:c.signal,onOccurrence:()=>{}}),verifyCode('CONSUMER_CANCELLED'));
    assert.equal(p.counts().closeCount,1);
  }
});

test('I3 selectedCount 0 NONE selection accepted only with complete empty exact page',async()=>{
  const p=makePorts();
  p.session.pageManifest.selectedCount=0;
  const old=p.session.readPage;
  p.session.readPage=async args=>({...await old(args),complete:true,cursor:null,totalCount:0,rows:[]});
  let count=0;
  const out=await consumeSelectedSourceFacts({...p.input(),onOccurrence:()=>{count++;}});
  assert.equal(count,0);assert.equal(out.selectedCount,0);assert.equal(out.pages,1);
  assert.equal(p.counts().closeCount,1);
});
