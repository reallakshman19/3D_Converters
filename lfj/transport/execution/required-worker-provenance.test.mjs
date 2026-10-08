// R06/U01 independent source-level provenance RED.
// The previously accepted Worker-shaped object executes entirely on the
// caller's event loop. Names + async READY are not proof of isolation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {runRequiredWorkerJob} from './required-worker.mjs';

const job={
  jobId:'ISOLATION-PROVENANCE-RED',sourceRefId:'PL01',
  sourceRevision:'exact-original:sha256:abcd',sourceSha256:'abcd',
  byteLength:16,
};

test('U01 RED: fully shaped same-main-thread async READY cannot pass as a real Worker',async()=>{
  let dispatched=0,terminated=0;
  const subscriptions=new Map();
  const fake={
    on(kind,fn){subscriptions.set(kind,fn);return fake;},
    off(kind,fn){if(subscriptions.get(kind)===fn)subscriptions.delete(kind);return fake;},
    terminate(){terminated++;return Promise.resolve(0);},
    postMessage(message){
      dispatched++;
      queueMicrotask(()=>subscriptions.get('message')?.({
        schema:'LFJ.WorkerExecution.v1',kind:'READY',
        ...Object.fromEntries(['jobId','sourceRefId','sourceRevision','sourceSha256','byteLength']
          .map(key=>[key,message[key]])),
        threadId:1,isMainThread:false, // self-asserted fields are not proof
      }));
    },
  };
  assert.equal(fake instanceof Worker,false);
  await assert.rejects(()=>runRequiredWorkerJob({
    ...job,createWorker:()=>fake,trustedWorkerCtor:Worker,
  }),e=>e?.code==='INVALID_WORKER_PORT');
  assert.equal(dispatched,0,'reject untrusted port before calling postMessage');
  assert.equal(subscriptions.size,0,'do not subscribe to fake same-thread port');
});
