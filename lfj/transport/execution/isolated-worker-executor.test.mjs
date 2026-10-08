// LFJ V4 R06/U01 independent real-Worker RED: no inline engine fallback.
// This proves isolated dispatch and a typed unavailable-Worker decision only;
// source-chunk backpressure, consumed-byte progress and crash/cancel are U02–U04.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker,isMainThread} from 'node:worker_threads';
import {createIsolatedWorkerExecutor} from './isolated-worker-executor.mjs';

const entryUrl=new URL('./fixtures/isolated-worker-probe.mjs',import.meta.url);
const job=Object.freeze({
  jobId:'LFJ-U01-JOB',sourceRefId:'PL01',
  sourceSha256:'a'.repeat(64),
  sourceRevision:'u01:sha256:'+'a'.repeat(64),
  byteLength:10485760,operation:'INDEX_JSON',
});
test('U01 RED: job accepted ONLY by an actual separate worker, never marked engineering-complete',async()=>{
  assert.equal(isMainThread,true);
  const executor=createIsolatedWorkerExecutor({WorkerCtor:Worker,entryUrl});
  let foregroundTurns=0;
  const t=setTimeout(()=>{foregroundTurns++;},0);
  try{
    const receipt=await executor.startJob(job);
    assert.equal(receipt.schema,'LFJ.WorkerExecutionReceipt.v1');
    assert.equal(receipt.state,'READY');
    assert.equal(receipt.jobId,job.jobId);
    assert.equal(receipt.sourceRefId,job.sourceRefId);
    assert.equal(receipt.sourceRevision,job.sourceRevision);
    assert.equal(receipt.sourceSha256,job.sourceSha256);
    assert.equal(receipt.complete,false);
    assert.equal(receipt.engineeringReady,false);
    assert.equal(receipt.isMainThread,false);
    assert.ok(receipt.threadId>0,'real worker_threads ID expected');
    assert.ok(foregroundTurns>=1,'foreground event loop must remain free during worker provisioning');
  }finally{clearTimeout(t);await executor.dispose();}
});
test('U01 RED: missing Worker never causes an inline JSON index fallback',async()=>{
  let inlineCalls=0;
  const executor=createIsolatedWorkerExecutor({
    WorkerCtor:null,entryUrl,
    inlineFallback:()=>{inlineCalls++;throw new Error('UNSAFE INLINE EXECUTION');},
  });
  try{
    await assert.rejects(()=>executor.startJob(job),e=>e?.code==='WORKER_UNAVAILABLE');
    assert.equal(inlineCalls,0);
  }finally{await executor.dispose();}
});
test('U01 RED: a throwing worker constructor fails closed without host execution',async()=>{
  let constructed=0;
  class DeniedWorker { constructor(){constructed++;throw new Error('worker creation blocked');} }
  const executor=createIsolatedWorkerExecutor({WorkerCtor:DeniedWorker,entryUrl});
  try{
    await assert.rejects(()=>executor.startJob(job),e=>e?.code==='WORKER_UNAVAILABLE');
    assert.equal(constructed,1);
  }finally{await executor.dispose();}
});
