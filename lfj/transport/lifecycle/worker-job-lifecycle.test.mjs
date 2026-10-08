// R07/U01 independent RED: native Worker cancellation is terminal and idempotent.
// Source, READY and page-ACK are NOT source completion or engineering rights.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createSourceSnapshotBuilder} from '../../source/source-snapshot.mjs';
import {transferBoundedSourcePages} from '../execution/bounded-source-transfer.mjs';
import {createWorkerJobLifecycle} from './worker-job-lifecycle.mjs';

const basis={jobId:'R07-U01',sourceRefId:'PL01',
 sourceRevision:'rev-r07:sha256:abcd',sourceSha256:'abcd',byteLength:8193};
const workerFor=mode=>new Worker(new URL('./lifecycle-worker-fixture.mjs',import.meta.url),
 {type:'module',workerData:{mode}});
function session(mode,onTerminal){
 let worker=null,created=0;
 const life=createWorkerJobLifecycle({...basis,trustedWorkerCtor:Worker,
  createWorker:()=>{created++;worker=workerFor(mode);return worker;},onTerminal});
 return {life,worker:()=>worker,created:()=>created};
}
const terminalCheck=(t)=>{assert.equal(t.status,'CANCELLED');
 assert.equal(t.terminal,true);assert.equal(t.complete,false);
 assert.equal(t.engineeringReady,false);assert.equal(t.jobId,basis.jobId);};

test('U01 RED: cancel before start must be terminal, create no Worker and remain idempotent',async()=>{
 const seen=[],s=session('no-ready',t=>seen.push(t));
 const term=await s.life.cancel();
 terminalCheck(term);assert.equal(s.created(),0);
 assert.strictEqual(await s.life.cancel(),term);
 await assert.rejects(()=>s.life.start(),e=>e?.code==='JOB_CANCELLED');
 assert.equal(s.created(),0);assert.equal(seen.length,1);
});
test('U01 RED: cancel during START refuses late READY, awaits Worker exit and publishes once',async()=>{
 const seen=[],s=session('late-ready',t=>seen.push(t));
 const starting=s.life.start();
 // Allow START to reach a real Worker before issuing cancellation.
 assert.equal(s.created(),1);
 const [a,b]=await Promise.all([s.life.cancel(),s.life.cancel()]);
 terminalCheck(a);assert.strictEqual(a,b);
 await assert.rejects(starting,e=>e?.code==='JOB_CANCELLED');
 assert.equal(s.worker().threadId,-1);
 assert.equal(s.life.status(),'CANCELLED');assert.equal(seen.length,1);
});
test('U01 RED: successful READY only admits Worker; cancel afterwards is terminal',async()=>{
 const seen=[],s=session('ready',t=>seen.push(t));
 try{
  const admit=await s.life.start();
  assert.equal(admit.kind,'READY');assert.equal(admit.status,'RUNNING');
  assert.equal(admit.complete,false);assert.equal(admit.engineeringReady,false);
  assert.strictEqual(admit.worker,s.worker());
  const term=await s.life.cancel();
  terminalCheck(term);assert.equal(s.worker().threadId,-1);
  assert.strictEqual(await s.life.cancel(),term);assert.equal(seen.length,1);
 }finally{await s.worker()?.terminate();}
});
test('U01 RED: cancel after source ACK but before consumption prevents another page',async()=>{
 const seen=[],s=session('ack-without-consume',t=>seen.push(t));
 const bytes=new Uint8Array(8193);
 for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
 const builder=createSourceSnapshotBuilder({byteLength:bytes.length,revision:'r07'});
 builder.append(bytes,0);
 const snapshot=builder.finalize(),reads=[],progress=[];
 const port=Object.freeze({...snapshot,
  readRange(...args){reads.push([args[0],args[1]]);return snapshot.readRange(...args);}
 });
 try{
  const admit=await s.life.start();
  let ackReceived;
  const ack=new Promise(resolve=>ackReceived=resolve);
  const listener=m=>{if(m?.kind==='SOURCE_ACK')ackReceived(m);};
  admit.worker.on('message',listener);
  const pending=transferBoundedSourcePages({
   worker:admit.worker,trustedWorkerCtor:Worker,snapshot:port,
   jobId:basis.jobId,sourceRefId:basis.sourceRefId,
   pageBytes:4096,ackTimeoutMs:2000,onConsumed:p=>progress.push(p),
  });
  await ack;
  admit.worker.off('message',listener);
  const terminal=await s.life.cancel();
  terminalCheck(terminal);assert.equal(s.worker().threadId,-1);
  await assert.rejects(pending,e=>e?.code==='WORKER_FAILED');
  assert.deepEqual(progress,[]);assert.deepEqual(reads,[[0,4096]]);
  assert.equal(seen.length,1);
 }finally{await s.worker()?.terminate();snapshot.close();}
});
