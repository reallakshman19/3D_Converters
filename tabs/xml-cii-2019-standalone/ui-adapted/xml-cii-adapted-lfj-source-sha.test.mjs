import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {hashOriginalBlobOffThread} from './xml-cii-adapted-lfj-source-sha.js';

const MiB=1024*1024;
const hash=x=>createHash('sha256').update(x).digest('hex');
test('Node-only small control SHA remains exact',async()=>{
  const data=Buffer.from('original\0json\n');
  const got=await hashOriginalBlobOffThread(new Blob([data]));
  assert.equal(got,hash(data));
});
test('no browser fallback is selected when a native Worker factory is supplied',async()=>{
  const blob=new Blob(['{"valid":"json"}']);
  let jobs=0,terminations=0;
  const factory=()=>({
    postMessage(message){
      jobs++;
      assert.equal(message.type,'HASH');
      assert.equal(message.blob,blob);
      queueMicrotask(()=>this.onmessage({data:{
        type:'DONE',sha256:hash('{"valid":"json"}'),sizeBytes:blob.size}}));
    },
    terminate(){terminations++;}
  });
  const got=await hashOriginalBlobOffThread(blob,{workerFactory:factory});
  assert.equal(got,hash('{"valid":"json"}'));
  assert.equal(jobs,1);
  assert.equal(terminations,1);
});
test('bad digest, source size, error type all reject and terminate',async()=>{
  const blob=new Blob(['content']);
  for(const result of [
    {type:'DONE',sha256:'z'.repeat(64),sizeBytes:blob.size},
    {type:'DONE',sha256:'a'.repeat(64),sizeBytes:99},
    {type:'DONE',sha256:'a'.repeat(64)},
    {type:'ERROR',code:'LFJ_SHA_WORKER_FAILED',message:'hash rejected'}
  ]){
    let terminated=false;
    await assert.rejects(hashOriginalBlobOffThread(blob,{
      workerFactory:()=>({
        postMessage(){queueMicrotask(()=>this.onmessage({data:result}));},
        terminate(){terminated=true;}
      })
    }),e=>/^LFJ_SHA_/.test(e.code));
    assert.equal(terminated,true);
  }
});
test('abort cancels active source hashing and terminates Worker',async()=>{
  const controller=new AbortController();
  let terminated=false;
  const pending=hashOriginalBlobOffThread(new Blob(['abc']),{
    signal:controller.signal,
    workerFactory:()=>({postMessage(){},terminate(){terminated=true;}})
  });
  controller.abort();
  await assert.rejects(pending,e=>e.code==='LFJ_SHA_CANCELLED');
  assert.equal(terminated,true);
});
test('timeout terminates hashing Worker and rejects without SHA',async()=>{
  let terminated=false;
  await assert.rejects(hashOriginalBlobOffThread(new Blob(['abc']),{
    timeoutMs:10,
    workerFactory:()=>({postMessage(){},terminate(){terminated=true;}})
  }),e=>e.code==='LFJ_SHA_TIMEOUT');
  assert.equal(terminated,true);
});
test('over-cap 90MiB source rejected before any hash Worker creation',async()=>{
  const x=new Blob(['a']);
  Object.defineProperty(x,'size',{value:90*MiB});
  let jobs=0;
  await assert.rejects(hashOriginalBlobOffThread(x,{
    workerFactory:()=>{jobs++;throw Error('must not create');}
  }),e=>e.code==='LFJ_SOURCE_CAPACITY');
  assert.equal(jobs,0);
});
