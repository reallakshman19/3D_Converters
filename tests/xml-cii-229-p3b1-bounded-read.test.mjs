import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  readXml229SelectedOriginalValues,
  XML229_BOUNDED_READ_SCHEMA,
} from '../tabs/xml-cii-2019-standalone/integration/xml229-bounded-original-read.mjs';
import {XML229_STAGED_SOURCE_SCHEMA} from '../tabs/xml-cii-2019-standalone/integration/xml229-staged-source-receipt.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const doc='[{"a":1},{"a":2}]';
function setup({
  corrupt=null,onPage=null,chunkBudget=8388608,
}={}){
  const blob=new Blob([doc],{type:'application/json'});
  const digest=sha(doc);
  const sourceRefId='p3b1-test-source',generationId='p3b1-generation';
  const sourceRevision=generationId+':sha256:'+digest;
  const receipt=Object.freeze({
    schema:XML229_STAGED_SOURCE_SCHEMA,generationId,sourceRefId,
    sourceRevision,sha256:digest,byteLength:blob.size,
    pageCount:2,occurrenceCount:10,phase:'INDEX_COMMITTED',
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false,
  });
  const dependencyBasis=Object.freeze({
    xmlSha256:'a'.repeat(64),selectionSha256:'b'.repeat(64),
    configSha256:'c'.repeat(64),mastersSha256:'d'.repeat(64),
  });
  const id=path=>JSON.stringify(['lfj-json-value/v1',sourceRefId,sourceRevision,path]);
  const row=(kind,path,ordinal,extra)=>({
    schema:'LFJ.JSON.OccurrenceEvent.v1',sourceRefId,
    sourceRevision,sourceSha256:digest,kind,occurrenceId:id(path),
    ordinal,...extra,
  });
  const pages=[
    {page:0,rows:[
      row('OPEN','/0',1,{path:'/0',startByte:1,parentId:id(''),type:'object'}),
      row('SEAL','/0',1,{endByteExclusive:8}),
      row('OPEN','/1',3,{path:'/1',startByte:9,parentId:id(''),type:'object'}),
    ]},
    {page:1,rows:[row('SEAL','/1',3,{endByteExclusive:16})]},
  ];
  if(corrupt==='missing')pages[1].rows=[];
  if(corrupt==='duplicate')pages[1].rows.push(row('SEAL','/0',1,{endByteExclusive:8}));
  let visits=0,commits=[],stages=[],aborts=[];
  const store={
    async *readCommittedPages(){
      for(const page of pages){
        visits++;onPage?.(page.page);
        yield {...page,rows:page.rows.slice()};
      }
    },
  };
  const live={blob,store,receipt,dependencyBasis,cancelled:false};
  const sink={
    async stage(row){stages.push(row);},
    async commit(manifest){commits.push(manifest);},
    async abort(e){aborts.push(e?.code||String(e));stages.length=0;},
  };
  const args={blob,store,receipt,dependencyBasis,
    paths:['/0','/1'],getCurrentContext:()=>live,sink,
    maxBatchBytes:chunkBudget};
  return {args,live,receipt,store,pages,get stages(){return stages;},
    get commits(){return commits;},get aborts(){return aborts;},
    get visits(){return visits;}};
}

test('P3B.1 reads only selected committed original spans once, with a source-only manifest',async()=>{
  const x=setup();
  const manifest=await readXml229SelectedOriginalValues(x.args);
  assert.equal(x.visits,3,'two committed pages plus one re-attestation page');
  assert.equal(manifest.schema,XML229_BOUNDED_READ_SCHEMA);
  assert.equal(manifest.pageCount,2);
  assert.equal(manifest.pagesScanned,2);
  assert.equal(manifest.valueCount,2);
  assert.equal(manifest.byteCount,14);
  assert.equal(manifest.complete,true);
  assert.equal(manifest.engineeringReady,false);
  assert.equal(manifest.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.deepEqual(x.stages.map(v=>new TextDecoder().decode(v.bytes)),['{"a":1}','{"a":2}']);
  assert.ok(x.stages.every(v=>v.complete===false&&v.engineeringReady===false));
  assert.ok(x.stages.every(v=>v.byteLength===x.receipt.byteLength),
    'each staged value must retain source receipt byteLength, not selected span length');
  assert.deepEqual(x.stages.map(v=>v.valueByteLength),[7,7],
    'per-value span has a separate non-colliding field');
  assert.equal(x.commits.length,1);
  assert.equal(x.aborts.length,0);
});
test('P3B.1 refuses a value budget overrun before exposing any value',async()=>{
  const x=setup({chunkBudget:10});
  await assert.rejects(readXml229SelectedOriginalValues({...x.args,maxValueBytes:7}),{code:'P3B_READ_RESOURCE_BOUND'});
  assert.equal(x.commits.length,0);
  assert.equal(x.stages.length,0);
  assert.equal(x.aborts.length,1);
});
test('P3B.1 refuses wrong source Blob identity even at same byte length',async()=>{
  const x=setup();
  x.live.blob=new Blob([doc]);
  await assert.rejects(readXml229SelectedOriginalValues(x.args),{code:'P3B_READ_SOURCE_STALE'});
  assert.equal(x.commits.length,0);
});
test('P3B.1 cancels and aborts staged data when selected dependency changes',async()=>{
  const x=setup();
  x.args.sink.stage=async(v)=>{
    x.stages.push(v);
    x.live.dependencyBasis={...x.live.dependencyBasis,selectionSha256:'f'.repeat(64)};
  };
  await assert.rejects(readXml229SelectedOriginalValues(x.args),{code:'P3B_READ_SOURCE_STALE'});
  assert.equal(x.stages.length,0);
  assert.equal(x.aborts.length,1);
  assert.equal(x.commits.length,0);
});
test('P3B.1 rejects missing or duplicate source pair without committing',async()=>{
  for(const corrupt of ['missing','duplicate']){
    const x=setup({corrupt});
    await assert.rejects(readXml229SelectedOriginalValues(x.args),{code:corrupt==='missing'?
      'P3B_READ_COMMITTED_PAGE_INVALID':'P3B_READ_SEAL_CONFLICT'});
    assert.equal(x.commits.length,0);
    assert.equal(x.aborts.length,1);
  }
});
test('P3B.1 rejects unbounded, root or duplicated JSON pointers',async()=>{
  for(const paths of [[''],['/0','/0'],['/0','/bad~2escape'],Array.from({length:33},(_,i)=>'/'+i)]){
    const x=setup();
    await assert.rejects(readXml229SelectedOriginalValues({...x.args,paths}),{
      code:paths.length>32?'P3B_READ_SELECTION_BOUND':'P3B_READ_ORIGINAL_POINTER_INVALID'});
    assert.equal(x.commits.length,0);
  }
});
test('P3B.1 refuses uncommitted Worker source receipts',async()=>{
  const x=setup();
  await assert.rejects(readXml229SelectedOriginalValues({
    ...x.args,receipt:{...x.receipt,phase:'INDEXING'},
  }),{code:'P3B_READ_SOURCE_RECEIPT_REQUIRED'});
});
test('P3B.1 rejects cancellation while reading committed pages',async()=>{
  const x=setup();
  await assert.rejects(readXml229SelectedOriginalValues({...x.args,
    yieldControl:async({pagesScanned})=>{if(pagesScanned===1)x.live.cancelled=true;},
  }),{code:'P3B_READ_SOURCE_STALE'});
  assert.equal(x.commits.length,0);
});
