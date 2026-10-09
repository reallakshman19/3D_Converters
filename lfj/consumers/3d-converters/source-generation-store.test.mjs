// #1104 A02-P2: first-party bounded atomic SOURCE-FACTS generation sink.
// No app UI claim, no engineering promotion, no durable IDB claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceFactsGenerationStore} from './source-generation-store.mjs';
import {consumeSelectedSourceFacts} from './source-facts-receiver.mjs';

const basis=Object.freeze({
  sourceRefId:'ORIGINAL-SOURCE',sourceSha256:'sha-of-original',
  sourceRevision:'source-revision-v1',selectionDigest:'all-selected',
  jobId:'worker-job-1',dependencyRevision:'xml-masters-config-v1',byteLength:48
});
const code=expected=>e=>{assert.equal(e?.code,expected);return true;};
const row=(ordinal,path,type='string')=>({
  kind:'OPEN',sourceRefId:basis.sourceRefId,sourceSha256:basis.sourceSha256,
  sourceRevision:basis.sourceRevision,ordinal,path,startByte:ordinal+1,type,
  occurrenceId:JSON.stringify([
    'lfj-json-value/v1',basis.sourceRefId,basis.sourceRevision,path
  ]),parentId:path===''?null:JSON.stringify([
    'lfj-json-value/v1',basis.sourceRefId,basis.sourceRevision,''
  ])
});
const fact=(n,path,value)=>Object.freeze({row:Object.freeze(row(n,path)),
  bytes:new TextEncoder().encode(JSON.stringify(value)),sourceOnly:true});
const receipt=(n)=>Object.freeze({
  schema:'LFJ.3D.ConsumerSourceFactsReceipt.v1',complete:true,...basis,
  selectedCount:n,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
});
const clone=v=>({...v});

test('A02P2 begin/stage are invisible; only whole basis-CAS commit publishes immutable generation',async()=>{
  let live=clone(basis);
  const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>live,maxFacts:10});
  const f=fact(0,'','é');
  await sink.transaction.begin({expectedBasis:basis,selectedCount:1,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  await sink.transaction.stage(f);
  assert.equal(sink.readPublished(),null,'uncommitted original bytes never visible');
  const publication=await sink.transaction.commit({
    receipt:receipt(1),expectedBasis:basis,getCurrentBasis:()=>live
  });
  assert.equal(publication.schema,'LFJ.3D.SourceFactsPublication.v1');
  assert.equal(publication.committed,true);
  assert.equal(publication.engineeringReady,false);
  assert.equal(publication.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.equal(publication.selectedCount,1);
  const visible=sink.readPublished();
  assert.equal(visible.receipt.selectedCount,1);
  assert.equal(visible.facts.length,1);
  assert.equal(new TextDecoder().decode(visible.facts[0].bytes),'"é"');
  // A TypedArray can still be mutated inside a frozen JS object: test defensive
  // byte copying BOTH on the caller ingress and every read egress.
  f.bytes.fill(0);
  visible.facts[0].bytes.fill(0);
  assert.equal(new TextDecoder().decode(sink.readPublished().facts[0].bytes),'"é"');
  live={...live,dependencyRevision:'changed-after-commit'};
  assert.equal(sink.readPublished(),null,'basis supersession hides all old published results');
});

test('A02P2 stale source/selection/master must reject before publication, then abort completely',async()=>{
  for(const patch of [
    {sourceSha256:'changed-but-same-size'},
    {selectionDigest:'other-hierarchy'},
    {dependencyRevision:'changed-master'},
    {jobId:'new-job'}
  ]){
    let live=clone(basis);
    const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>live,maxFacts:10});
    await sink.transaction.begin({expectedBasis:basis,selectedCount:1,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
    await sink.transaction.stage(fact(0,'','some'));
    live={...live,...patch};
    assert.throws(()=>sink.transaction.commit({
      receipt:receipt(1),expectedBasis:basis,getCurrentBasis:()=>live
    }),code('APP_GENERATION_STALE'));
    await sink.transaction.abort();
    assert.equal(sink.readPublished(),null);
    assert.throws(()=>sink.transaction.stage(fact(1,'/late','bad')),
      code('GENERATION_NOT_OPEN'));
  }
});

test('A02P2 a second generation cannot interleave before first commits/aborts',async()=>{
  let live=clone(basis);
  const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>live,maxFacts:2});
  const begin={expectedBasis:basis,selectedCount:1,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
  await sink.transaction.begin(begin);
  assert.throws(()=>sink.transaction.begin(begin),code('GENERATION_BUSY'));
  await sink.transaction.stage(fact(0,'','first'));
  assert.throws(()=>sink.transaction.stage(fact(1,'/overflow','second')),
    code('SOURCE_LIMIT'));
  await sink.transaction.abort();
  await sink.transaction.begin(begin);
  assert.equal(sink.readPublished(),null);
  await sink.transaction.abort();
  assert.equal(sink.readPublished(),null);
});

test('A02P2 forged receipts, shortened selections and unsafe rights never commit',async()=>{
  for(const patch of [
    {selectedCount:2},
    {sourceRevision:'forged-source'},
    {dependencyRevision:'forged-xml'},
    {engineeringReady:true},
    {rightsBasis:'ENGINEERING'}
  ]){
    const sink=createSourceFactsGenerationStore({
      getCurrentBasis:()=>clone(basis),maxFacts:10
    });
    await sink.transaction.begin({expectedBasis:basis,selectedCount:1,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
    await sink.transaction.stage(fact(0,'','one'));
    assert.throws(()=>sink.transaction.commit({
      receipt:{...receipt(1),...patch},expectedBasis:basis,
      getCurrentBasis:()=>clone(basis)
    }),code('GENERATION_RECEIPT_INVALID'));
    await sink.transaction.abort();
    assert.equal(sink.readPublished(),null);
  }
});

test('A02P2 receiver actually consumes 2 selected scalar values through FIRST-PARTY generation sink',async()=>{
  const original=new TextEncoder().encode('["é","B"]');
  const values=[
    {path:'',type:'array',startByte:0,bytes:null},
    {path:'/0',type:'string',startByte:1,bytes:new TextEncoder().encode('"é"')},
    {path:'/1',type:'string',startByte:6,bytes:new TextEncoder().encode('"B"')}
  ];
  const base={...basis,byteLength:original.byteLength};
  const ids=values.map((v,i)=>({
    ...row(i,v.path,v.type),startByte:v.startByte,
    sourceRefId:base.sourceRefId,sourceSha256:base.sourceSha256,
    sourceRevision:base.sourceRevision
  }));
  const session={
    schema:'LFJ.SourceSession.v1',
    completion:{kind:'SOURCE_INDEX_COMPLETE',complete:true,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false},
    pageManifest:{schema:'LFJ.CommittedSelectionPageManifest.v1',
      complete:true,sourceRefId:base.sourceRefId,sourceSha256:base.sourceSha256,
      sourceRevision:base.sourceRevision,selectionDigest:base.selectionDigest,
      jobEpoch:base.jobId,selectedCount:3,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false},
    async getCompletionManifest(){return {...base,
      sourceByteLength:base.byteLength,occurrenceCount:3,eventCount:6,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};},
    async readPage(){return {schema:'LFJ.CommittedSelectionPage.v1',
      complete:true,cursor:null,rows:ids,totalCount:3,
      ...{sourceRefId:base.sourceRefId,sourceSha256:base.sourceSha256,
        sourceRevision:base.sourceRevision,selectionDigest:base.selectionDigest,
        jobEpoch:base.jobId},rightsBasis:'SOURCE_FACTS_ONLY',
      engineeringReady:false};},
    async readOccurrence({occurrenceId}){
      const i=ids.findIndex(x=>x.occurrenceId===occurrenceId);
      const v=values[i];
      return {schema:'LFJ.SourceOccurrenceValue.v1',
        sourceRefId:base.sourceRefId,sourceSha256:base.sourceSha256,
        sourceRevision:base.sourceRevision,
        occurrenceId,ordinal:i,path:v.path,type:v.type,
        startByte:v.startByte,endByteExclusive:v.startByte+v.bytes.length,
        bytes:v.bytes,rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
    },
    async close(){this.closed=true}
  };
  let live={...base};
  const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>({...live}),maxFacts:8});
  const result=await consumeSelectedSourceFacts({session,
    expectedBasis:base,getCurrentBasis:()=>({...live}),transaction:sink.transaction,
    maxRows:8,maxScalarBytes:256,maxPageBytes:65536});
  assert.equal(session.closed,true);
  assert.equal(result.selectedCount,3);
  const visible=sink.readPublished();
  assert.deepEqual(visible.facts.map(x=>x.row.path),['','/0','/1']);
  assert.deepEqual(visible.facts.map(x=>x.bytes===null?null:new TextDecoder().decode(x.bytes)),
    [null,'"é"','"B"']);
  assert.equal(visible.receipt.engineeringReady,false);
  live={...live,sourceRevision:'superseded'};
  assert.equal(sink.readPublished(),null);
});


test('A02P2 aggregate budget must be bounded across individually valid UTF-8 scalar facts',()=>{
  const sink=createSourceFactsGenerationStore({
    getCurrentBasis:()=>({...basis}),maxFacts:2,maxTotalBytes:4
  });
  sink.transaction.begin({expectedBasis:basis,selectedCount:2,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  sink.transaction.stage(fact(0,'','A')); // 3 original UTF-8 bytes
  assert.throws(()=>sink.transaction.stage(fact(1,'/1','B')),
    code('SOURCE_LIMIT'),
    'two individually small scalars cannot bypass cumulative source byte budget');
  sink.transaction.abort();
  assert.equal(sink.readPublished(),null);
});


test('A02P2 RED: receiver commit callback may mutate authoritative app basis before publication',()=>{
  let current={...basis};
  const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>({...current}),maxFacts:2});
  sink.transaction.begin({expectedBasis:basis,selectedCount:1,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  sink.transaction.stage(fact(0,'','first'));
  assert.throws(()=>sink.transaction.commit({
    receipt:receipt(1),expectedBasis:basis,
    getCurrentBasis:()=>{
      // Adversarial reentrancy: app state is superseded while the receiver
      // callback is running; the callback returns its own old snapshot.
      current={...current,dependencyRevision:'changed-during-commit'};
      return {...basis};
    }
  }),code('APP_GENERATION_STALE'));
  assert.equal(sink.readPublished(),null);
  sink.transaction.abort();
});

test('A02P2 RED: consumer basis getter can reenter commit but cannot publish twice',()=>{
  let current={...basis};
  let sink,attempt=0,reentrantResult=null;
  const consumerGetter=()=>{
    if(attempt++===0){
      try{
        reentrantResult=sink.transaction.commit({
          receipt:receipt(1),expectedBasis:basis,
          getCurrentBasis:()=>({...basis})
        });
      }catch(e){reentrantResult=e.code;}
    }
    return {...current};
  };
  sink=createSourceFactsGenerationStore({getCurrentBasis:()=>({...current}),maxFacts:2});
  sink.transaction.begin({expectedBasis:basis,selectedCount:1,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  sink.transaction.stage(fact(0,'','first'));
  assert.throws(()=>sink.transaction.commit({
    receipt:receipt(1),expectedBasis:basis,getCurrentBasis:consumerGetter
  }),code('GENERATION_REENTRANT'));
  assert.equal(reentrantResult,'GENERATION_REENTRANT');
  assert.equal(sink.readPublished(),null);
  sink.transaction.abort();
});


test('A02P2 RED: duplicate original path/occurrence cannot be published with a new ordinal',()=>{
  const sink=createSourceFactsGenerationStore({getCurrentBasis:()=>({...basis}),maxFacts:3});
  sink.transaction.begin({expectedBasis:basis,selectedCount:2,
    rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false});
  sink.transaction.stage(fact(0,'','A'));
  // Same canonical R05 pointer/ID with artificially increased ordinal.
  assert.throws(()=>sink.transaction.stage(fact(1,'','B')),
    code('GENERATION_FACT_INVALID'));
  sink.transaction.abort();
  assert.equal(sink.readPublished(),null);
});
