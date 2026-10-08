// R07/U03 independent native Worker: exact active source/dependency epoch
// must fence admission/publication even when source byte length is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createWorkerLifecycleSession} from './lifecycle-session.mjs';

const sourceA=Object.freeze({
  sourceRefId:'PL01',sourceRevision:'revision-A',
  sourceSha256:'a'.repeat(64),byteLength:8193,
  selectionDigest:'selection-A',dependencyRevision:'xml+config-A',
});
const sourceB=Object.freeze({...sourceA,sourceRevision:'revision-B',
  sourceSha256:'b'.repeat(64)});
function setup(mode='ready',overrides={}){
 let worker,created=0,active={...sourceA,...overrides};
 const notices=[];
 const session=createWorkerLifecycleSession({
  jobId:'R07-U03',...active,
  trustedWorkerCtor:Worker,
  getCurrentBasis:()=>({...active}),
  createWorker:()=>{
   created++;
   worker=new Worker(new URL('./lifecycle-worker-fixture.mjs',import.meta.url),
     {type:'module',workerData:{mode}});
   return worker;
  },
 });
 session.subscribe(e=>notices.push(e));
 return {session,notices,get worker(){return worker;},get created(){return created;},
  replace(next){active={...next};}};
}
const stale=(record)=>{
 assert.equal(record.kind,'STALE','superseded source must never re-admit');
 assert.equal(record.errorCode,'SOURCE_STALE');
 assert.equal(record.terminal,true);
 assert.equal(record.complete,false);
 assert.equal(record.engineeringReady,false);
};
test('U03 RED: same-length interior changed source SHA while READY delayed cannot publish A',async()=>{
 const j=setup('delayed');
 try{
  const old=j.session.start();
  assert.equal(j.created,1);
  j.replace(sourceB);
  stale(await old);
  stale(j.session.snapshot());
  assert.equal(j.worker.threadId,-1);
  assert.equal(j.notices.length,1);
  assert.deepEqual(j.notices,[j.session.snapshot()]);
 }finally{await j.worker?.terminate();}
});
test('U03 RED: unchanged JSON bytes, changed XML/config dependency during READY invalidates A',async()=>{
 const j=setup('delayed');
 try{
  const pending=j.session.start();
  j.replace({...sourceA,dependencyRevision:'xml+config-B'});
  stale(await pending);
  assert.equal(j.worker.threadId,-1);
  assert.equal(j.notices.length,1);
 }finally{await j.worker?.terminate();}
});
test('U03 RED: after admission changed selected scope rejects any accepted output snapshot',async()=>{
 const j=setup('ready');
 try{
  assert.equal((await j.session.start()).kind,'ADMITTED');
  j.replace({...sourceA,selectionDigest:'selection-B'});
  stale(j.session.snapshot());
  stale(await j.session.start());
  assert.equal(j.notices.length,1);
  assert.equal(j.session.snapshot().engineeringReady,false);
 }finally{await j.worker?.terminate();}
});
test('U03 RED: explicit epoch supersession is terminal and settles actual native Worker',async()=>{
 const j=setup('ready');
 try{
  assert.equal((await j.session.start()).kind,'ADMITTED');
  const out=await j.session.supersede(sourceB);
  stale(out);
  assert.equal(j.worker.threadId,-1,'supersede awaits Worker shutdown');
  assert.strictEqual(await j.session.cancel(),out,'late cancellation must not rewrite stale');
  assert.deepEqual(j.notices,[out]);
 }finally{await j.worker?.terminate();}
});
test('U03 RED: A completes later than B; A cannot override freshly selected B',async()=>{
 const a=setup('delayed'),b=setup('ready');
 try{
  const pendingA=a.session.start();
  a.replace(sourceB);
  b.replace(sourceA);
  const readyB=await b.session.start();
  assert.equal(readyB.kind,'ADMITTED');
  assert.equal(readyB.complete,false);
  stale(await pendingA);
  assert.equal(a.notices.length,1);
  assert.deepEqual(b.notices,[],'healthy current B not terminated by old A');
 }finally{await a.worker?.terminate();await b.worker?.terminate();}
});
test('U03 RED: exact unchanged source plus XML/config selection remains only ADMITTED',async()=>{
 const j=setup('ready');
 try{
  assert.equal((await j.session.start()).kind,'ADMITTED');
  assert.equal(j.session.snapshot().kind,'ADMITTED');
  assert.equal(j.session.snapshot().complete,false);
  assert.deepEqual(j.notices,[]);
  assert.equal((await j.session.cancel()).kind,'CANCELLED');
 }finally{await j.worker?.terminate();}
});
