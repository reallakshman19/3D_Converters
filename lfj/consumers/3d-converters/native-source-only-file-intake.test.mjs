// #1104 A05: local native-entry port and release-negative qualification.
// Mocked ports are NOT evidence for actual Worker, IndexedDB or docs origin.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runNativeSourceOnlyTypedFile} from './native-source-only-file-intake.mjs';

const basis=Object.freeze({sourceRefId:'original',sourceSha256:'abc123',
  sourceRevision:'source-v1',selectionDigest:'ALL',
  jobId:'job-1',dependencyRevision:'xml-master-v1',byteLength:5});
const code=x=>e=>{assert.equal(e?.code,x);return true;};
function casePorts({failAt=null,mutate=null,rights=false}={}){
  let current={...basis},opened=[],closed=[],aborted=[],sessionClose=0;
  const port=kind=>({kind,abort:async()=>aborted.push(kind),
    close:()=>closed.push(kind)});
  const result={
    schema:'LFJ.3D.SourceOnlyTypedSessionResult.v1',
    sourceReceipt:{selectedCount:1},publicationSerial:1,
    candidate:{rightsBasis:'SOURCE_ONLY_PROJECTED_CANDIDATE',
      engineeringReady:false},
    rightsBasis:'SOURCE_ONLY_PROJECTED_CANDIDATE',engineeringReady:false
  };
  const nativePorts={
    async openRecordStore(o){
      opened.push(o.kind);
      if(failAt===o.kind)throw Error('DB_'+o.kind+'_FAILED');
      if(mutate===o.kind)current.dependencyRevision='changed-master';
      return port(o.kind);
    },
    async openPairStore(o){
      opened.push('pairs');
      if(failAt==='pairs')throw Error('DB_PAIRS_FAILED');
      return port('pairs');
    },
    createPairedIndexStore({indexStore,pairPort}){
      assert.equal(indexStore.kind,'source');assert.equal(pairPort.kind,'pairs');
      return {paired:true};
    },
    async openSourceSession(o){
      opened.push('source-session');
      assert.equal(o.blob.size,5);assert.equal(o.expectedSha256,basis.sourceSha256);
      assert.equal(o.jobId,basis.jobId);assert.equal(o.indexStore.paired,true);
      assert.equal(o.selectedStore.kind,'selection');
      assert.equal(o.trustedWorkerCtor,FakeWorker);
      assert.equal(typeof o.createWorker,'function');
      if(failAt==='source-session')throw Error('WORKER_FAILED');
      return {close:()=>{sessionClose++}};
    },
    async runTypedSession(o){
      opened.push('typed');
      assert.equal(o.expectedBasis.dependencyRevision,basis.dependencyRevision);
      if(failAt==='typed')throw Error('APP_SOURCE_FAILED');
      return rights?{...result,engineeringReady:true}:result;
    }
  };
  return {nativePorts,getCurrentBasis:()=>({...current}),opened,closed,aborted,
    sessionClose:()=>sessionClose};
}
function FakeWorker(){}
const request=p=>({
  blob:new Blob(['abcde']),revision:'source-rev-label',
  expectedBasis:basis,selection:{mode:'ALL',includes:[],excludes:[]},
  databaseName:'lfj-a05-test',WorkerCtor:FakeWorker,indexedDB:{open(){}},
  getCurrentBasis:p.getCurrentBasis,nativePorts:p.nativePorts
});

test('A05 valid File/Blob source uses 3 stores, native Worker session and same-generation typed consumer',async()=>{
  const p=casePorts();
  const r=await runNativeSourceOnlyTypedFile(request(p));
  assert.equal(r.engineeringReady,false);
  assert.deepEqual(p.opened,['source','selection','pairs','source-session','typed']);
  assert.deepEqual(p.closed,['pairs','selection','source']);
  assert.deepEqual(p.aborted,[]);
});
test('A05 no Worker / no native IndexedDB rejects without creating ports',async()=>{
  const p=casePorts();
  await assert.rejects(runNativeSourceOnlyTypedFile({...request(p),WorkerCtor:null}),
    code('NATIVE_CONSUMER_PORT_REQUIRED'));
  await assert.rejects(runNativeSourceOnlyTypedFile({...request(p),indexedDB:null}),
    code('NATIVE_CONSUMER_PORT_REQUIRED'));
  assert.deepEqual(p.opened,[]);
});
test('A05 changed actual master while opening stores denies Worker intake',async()=>{
  const p=casePorts({mutate:'selection'});
  await assert.rejects(runNativeSourceOnlyTypedFile(request(p)),
    code('NATIVE_CONSUMER_BASIS_STALE'));
  assert.equal(p.opened.includes('source-session'),false);
  assert.deepEqual(p.closed,['selection','source']);
});
test('A05 fail closed if native Worker session opening fails after stores are staged',async()=>{
  const p=casePorts({failAt:'source-session'});
  await assert.rejects(runNativeSourceOnlyTypedFile(request(p)),/WORKER_FAILED/);
  assert.deepEqual(p.aborted,['pairs','selection','source']);
  assert.deepEqual(p.closed,['pairs','selection','source']);
});
test('A05 fail closed if app consumer throws after acquiring session',async()=>{
  const p=casePorts({failAt:'typed'});
  await assert.rejects(runNativeSourceOnlyTypedFile(request(p)),/APP_SOURCE_FAILED/);
  assert.equal(p.sessionClose(),1);
  assert.deepEqual(p.aborted,['pairs','selection','source']);
});
test('A05 injected consumer cannot promote engineering/export result',async()=>{
  const p=casePorts({rights:true});
  await assert.rejects(runNativeSourceOnlyTypedFile(request(p)),
    code('NATIVE_CONSUMER_RIGHTS_INVALID'));
  assert.deepEqual(p.aborted,['pairs','selection','source']);
});
test('A05 pre-cancelled input never opens original source',async()=>{
  const p=casePorts(),controller=new AbortController();controller.abort();
  await assert.rejects(runNativeSourceOnlyTypedFile({...request(p),signal:controller.signal}),
    code('NATIVE_CONSUMER_CANCELLED'));
  assert.deepEqual(p.opened,[]);
});
