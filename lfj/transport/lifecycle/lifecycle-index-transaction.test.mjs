// R07/U02 positive complete R05 index commit and partial abort RED; independent original bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createSourceSnapshotBuilder} from '../../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../../index/source-occurrence-index.mjs';
import {transferBoundedSourcePages} from '../execution/bounded-source-transfer.mjs';
import {createWorkerLifecycleSession} from './lifecycle-session.mjs';
function open(mode='ready'){
 const raw=new TextEncoder().encode('[{"type":"BRANCH","children":[{"type":"VALVE","name":"Ä"}]}]');
 const b=createSourceSnapshotBuilder({byteLength:raw.length,revision:'source-one'});
 b.append(raw,0);const source=b.finalize();let worker;
 const s=createWorkerLifecycleSession({jobId:'IDX-ONE',sourceRefId:'S',sourceSha256:source.sha256,
   sourceRevision:source.revision,byteLength:source.byteLength,selectionDigest:'all',
   trustedWorkerCtor:Worker,createWorker:()=>{worker=new Worker(
    new URL('./lifecycle-worker-fixture.mjs',import.meta.url),{type:'module',workerData:{mode}});return worker;}});
 const history={staged:[],committed:[],aborts:0};
 const stager={stagePage:async p=>{history.staged.push(...p);},
  commit:summary=>{history.committed.push(summary);},abort:()=>{history.aborts++;history.staged=[];}};
 return {source,s,history,stager,get worker(){return worker;},async close(){await worker?.terminate();source.close();}};
}
test('U02 RED: genuine complete R05 events + independently Worker-consumed R06 receipt commit ONCE',async()=>{
 const j=open();
 try{
  assert.equal((await j.s.start()).kind,'ADMITTED');
  const tx=j.s.beginIndexTransaction(j.stager);
  const summary=await streamJsonOccurrenceEvents(j.source,{sourceRefId:'S',onEventPage:tx.onEventPage,pageEvents:3});
  const receipt=await transferBoundedSourcePages({worker:j.worker,trustedWorkerCtor:Worker,
   snapshot:j.source,jobId:'IDX-ONE',sourceRefId:'S',pageBytes:16,onConsumed:()=>{}});
  assert.equal(receipt.workerConsumedBytes,j.source.byteLength);
  const accepted=tx.commit(summary,receipt);
  assert.equal(accepted.kind,'SOURCE_INDEX_COMPLETE');
  assert.equal(accepted.complete,true);
  assert.equal(accepted.engineeringReady,false);
  assert.equal(j.history.committed.length,1);
  assert.equal(j.history.committed[0].occurrenceCount,summary.occurrenceCount);
  assert.equal(j.history.staged.length,summary.eventCount);
  assert.equal(j.s.snapshot(),accepted);
  assert.throws(()=>tx.commit(summary,receipt),e=>e?.code==='INDEX_ALREADY_TERMINAL');
 }finally{await j.close();}
});
test('U02 RED: cancel after provisional R05 page aborts without index commit',async()=>{
 const j=open();
 try{
  assert.equal((await j.s.start()).kind,'ADMITTED');
  j.stager.stagePage=async p=>{j.history.staged.push(...p);await j.s.cancel();};
  const tx=j.s.beginIndexTransaction(j.stager);
  await assert.rejects(()=>streamJsonOccurrenceEvents(j.source,
   {sourceRefId:'S',onEventPage:tx.onEventPage,pageEvents:2}));
  assert.equal(j.s.snapshot().kind,'CANCELLED');
  assert.equal(j.history.committed.length,0);
  assert.ok(j.history.aborts>=1);
 }finally{await j.close();}
});
test('U02 RED: rejected/incomplete source summary and ACK-only cannot commit',async()=>{
 const j=open();
 try{
  assert.equal((await j.s.start()).kind,'ADMITTED');
  const tx=j.s.beginIndexTransaction(j.stager);
  const summary=await streamJsonOccurrenceEvents(j.source,
   {sourceRefId:'S',onEventPage:tx.onEventPage,pageEvents:3});
  const bogus={schema:'LFJ.SourceTransferReceipt.v1',jobId:'IDX-ONE',sourceRefId:'S',
   sourceSha256:j.source.sha256,sourceRevision:j.source.revision,byteLength:j.source.byteLength,
   acknowledgedBytes:j.source.byteLength,pages:1,complete:false};
  assert.throws(()=>tx.commit(summary,bogus),e=>e?.code==='INDEX_TRANSPORT_UNVERIFIED');
  assert.throws(()=>tx.commit({...summary,complete:false},bogus),e=>e?.code==='INDEX_SUMMARY_INCOMPLETE');
  assert.equal(j.history.committed.length,0);
  await j.s.cancel();
  assert.ok(j.history.aborts>=1);
 }finally{await j.close();}
});
