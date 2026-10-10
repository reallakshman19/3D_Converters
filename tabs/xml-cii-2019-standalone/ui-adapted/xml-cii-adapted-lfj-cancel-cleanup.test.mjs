import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  beginIndexedBuild,cancelIndexedBuild,releaseIndexedBuild,isIndexedBuildCurrent
} from './xml-cii-adapted-lfj-build-lifecycle.js';
import {deleteIndexedBuildDatabases} from './xml-cii-adapted-lfj-db-cleanup.js';
import {
  cancelIndexedBuildFromUi,runResolverJsonTraceFromUi,replaceState
} from './xml-cii-adapted-events.js';
import {
  createXmlCiiAdaptedWorkflowState,updateWorkflowState
} from './xml-cii-adapted-state.js';

test('superseded controllers abort; stale release cannot clear latest ownership',()=>{
  const owner={};
  const a=beginIndexedBuild(owner);
  assert.equal(isIndexedBuildCurrent(owner,a),true);
  const b=beginIndexedBuild(owner);
  assert.equal(a.signal.aborted,true);
  assert.equal(isIndexedBuildCurrent(owner,a),false);
  assert.equal(releaseIndexedBuild(owner,a),false);
  assert.equal(isIndexedBuildCurrent(owner,b),true);
  assert.equal(cancelIndexedBuild(owner),true);
  assert.equal(b.signal.aborted,true);
  assert.equal(cancelIndexedBuild(owner),false);
  assert.equal(releaseIndexedBuild(owner,b),false);
});

const names=['lfj-ui-preview-source-1234abcd','lfj-ui-preview-projection-1234abcd'];
test('both actual IDB success events are required, no fire-and-forget delete',async()=>{
  const requests=[];
  const db={deleteDatabase(name){const r={};requests.push({name,r});return r;}};
  let settled=false;
  const pending=deleteIndexedBuildDatabases(names,{databaseFactory:db,timeoutMs:150})
    .then(result=>{settled=true;return result;});
  assert.equal(requests.length,2);
  requests[0].r.onsuccess();
  await Promise.resolve();
  assert.equal(settled,false,'one completed deletion cannot qualify both');
  requests[1].r.onsuccess();
  const result=await pending;
  assert.equal(result.verified,true);
  assert.equal(result.deleted,2);
});

test('transient blocked is not accepted until actual onsuccess',async()=>{
  const requests=[];
  const db={deleteDatabase(name){const r={};requests.push(r);return r;}};
  const pending=deleteIndexedBuildDatabases(names,{databaseFactory:db,timeoutMs:100});
  requests[0].onblocked();
  requests[0].onsuccess();
  requests[1].onsuccess();
  assert.equal((await pending).verified,true);
});

test('permanent blocked, failed deletion and timeout all fail closed',async()=>{
  for(const scenario of ['blocked','error','timeout']){
    const db={deleteDatabase(name){
      const r={};
      queueMicrotask(()=>{
        if(scenario==='blocked'){
          r.onblocked();
          if(name===names[0])return;
        }else if(scenario==='error'&&name===names[0]){
          r.onerror();return;
        }else if(scenario==='timeout'&&name===names[0])return;
        r.onsuccess();
      });
      return r;
    }};
    await assert.rejects(
      deleteIndexedBuildDatabases(names,{databaseFactory:db,timeoutMs:15}),
      e=>e.code===({
        blocked:'LFJ_IDB_CLEANUP_BLOCKED',
        error:'LFJ_IDB_CLEANUP_ERROR',
        timeout:'LFJ_IDB_CLEANUP_TIMEOUT'
      }[scenario]));
  }
});

test('invalid database names fail before any deletion',async()=>{
  let deleted=0;
  await assert.rejects(deleteIndexedBuildDatabases(
    ['lfj-ui-preview-source-1','not-owner'],
    {databaseFactory:{deleteDatabase(){deleted++;}}}),
    e=>e.code==='LFJ_IDB_CLEANUP_INPUT');
  assert.equal(deleted,0);
});

function state(){
  return updateWorkflowState(createXmlCiiAdaptedWorkflowState(),{
    sourceKind:'xml',sourceText:'<Root><Node/></Root>',
    stagedJsonFile:new Blob(['[{"type":"BRANCH","name":"B"}]']),
    stagedJsonText:'',resolverSourceMode:'lfj-indexed-preview',
    resolverJsonTraceConfig:{},supportConfigJson:'{}'
  });
}
const fakeUi={querySelector:()=>null};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function waitFor(check){
  for(let i=0;i<100;i++){
    if(check())return;
    await tick();
  }
  throw new Error('timed out waiting for mock native Worker');
}
function holdWorker(){
  const previous=globalThis.Worker;
  const workers=[];
  globalThis.Worker=class{
    constructor(url){this.url=String(url);this.terminated=false;workers.push(this);}
    postMessage(data){this.payload=data;}
    terminate(){this.terminated=true;}
  };
  return {
    workers,restore(){
      if(previous===undefined)delete globalThis.Worker;
      else globalThis.Worker=previous;
    }
  };
}
test('real UI Cancel immediately terminates active Worker and never authorizes exports',async()=>{
  const mock=holdWorker();
  try{
    const ref={current:state()};
    let renders=0;
    const pending=runResolverJsonTraceFromUi(fakeUi,ref,()=>renders++,false);
    await waitFor(()=>mock.workers.length===1);
    assert.equal(ref.current.resolverJsonTraceRunning,true);
    assert.equal(cancelIndexedBuildFromUi(ref,()=>renders++),true);
    assert.equal((await pending),null);
    assert.equal(mock.workers[0].terminated,true);
    assert.equal(ref.current.resolverJsonTraceRunning,false);
    assert.equal(ref.current.lfjIndexedExportReceipt,null);
    assert.equal(ref.current.lfjIndexedExportOptIn,false);
    assert.match(ref.current.resolverJsonTraceExportStatus,/cancelled/i);
    assert.equal(cancelIndexedBuildFromUi(ref,()=>{}),false);
    assert.ok(renders>0);
  }finally{mock.restore();}
});

test('source change aborts existing Worker and does not reinstate old table',async()=>{
  const mock=holdWorker();
  try{
    const ref={current:state()};
    const pending=runResolverJsonTraceFromUi(fakeUi,ref,()=>{},false);
    await waitFor(()=>mock.workers.length===1);
    replaceState(ref,updateWorkflowState(ref.current,{
      sourceText:'<Root><Node>new source</Node></Root>'
    }),()=>{});
    assert.equal(await pending,null);
    assert.equal(mock.workers[0].terminated,true);
    assert.equal(ref.current.lfjIndexedPreview,null);
    assert.equal(ref.current.lfjIndexedExportReceipt,null);
    assert.equal(ref.current.lfjIndexedExportOptIn,false);
  }finally{mock.restore();}
});

test('second Build aborts earlier Worker and new Build alone owns completion',async()=>{
  const mock=holdWorker();
  try{
    const ref={current:state()};
    const first=runResolverJsonTraceFromUi(fakeUi,ref,()=>{},false);
    await waitFor(()=>mock.workers.length===1);
    const second=runResolverJsonTraceFromUi(fakeUi,ref,()=>{},false);
    await waitFor(()=>mock.workers.length===2);
    assert.equal(mock.workers[0].terminated,true);
    assert.equal(await first,null);
    assert.equal(ref.current.resolverJsonTraceRunning,true);
    assert.equal(cancelIndexedBuildFromUi(ref,()=>{}),true);
    assert.equal(await second,null);
    assert.equal(mock.workers[1].terminated,true);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
  }finally{mock.restore();}
});
