// R08/U01 independent real R03->R05->R07 committed source oracle, RED before product.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createSourceSnapshotBuilder} from '../../source/source-snapshot.mjs';
import {streamJsonOccurrenceEvents} from '../../index/source-occurrence-index.mjs';
import {transferBoundedSourcePages} from '../../transport/execution/bounded-source-transfer.mjs';
import {createWorkerLifecycleSession} from '../../transport/lifecycle/lifecycle-session.mjs';
import {selectCommittedOccurrences} from './exact-occurrence-selection.mjs';

const original='[{"type":"BRANCH","name":"A","children":[{"type":"VALVE","name":"X"}]},{"type":"BRANCH","name":"B","children":[{"type":"VALVE","name":"Y"}]}]';
const goldenA=['/0','/0/type','/0/name','/0/children','/0/children/0','/0/children/0/type','/0/children/0/name'];
const goldenAll=['',...goldenA,'/1','/1/type','/1/name','/1/children','/1/children/0','/1/children/0/type','/1/children/0/name'];

async function committedFixture(){
  const raw=new TextEncoder().encode(original);
  const b=createSourceSnapshotBuilder({byteLength:raw.length,revision:'R08-real-source'});
  b.append(raw,0);
  const source=b.finalize();
  const jobId='R08-JOB-1',sourceRefId='R08-FILE';
  let worker;
  const session=createWorkerLifecycleSession({
    jobId,sourceRefId,sourceSha256:source.sha256,sourceRevision:source.revision,
    byteLength:source.byteLength,selectionDigest:'all',
    trustedWorkerCtor:Worker,
    createWorker:()=>{worker=new Worker(new URL('../../transport/lifecycle/lifecycle-worker-fixture.mjs',import.meta.url),{type:'module',workerData:{mode:'ready'}});return worker;}
  });
  const rows=[];
  assert.equal((await session.start()).kind,'ADMITTED');
  const tx=session.beginIndexTransaction({
    stagePage:async p=>{rows.push(...p);},
    commit:()=>{},
    abort:()=>{rows.length=0;}
  });
  const summary=await streamJsonOccurrenceEvents(source,{sourceRefId,onEventPage:tx.onEventPage,pageEvents:2});
  const receipt=await transferBoundedSourcePages({
    worker,trustedWorkerCtor:Worker,snapshot:source,jobId,sourceRefId,pageBytes:32,onConsumed:()=>{}
  });
  const completion=tx.commit(summary,receipt);
  assert.equal(completion.kind,'SOURCE_INDEX_COMPLETE');
  assert.equal(completion.engineeringReady,false);
  const opens=rows.filter(row=>row.kind==='OPEN');
  assert.deepEqual(opens.map(row=>row.path),goldenAll,'independent original-source pointer census');
  const view={
    manifest:summary,completion,
    async *readOrdered(){for(const row of opens)yield row;}
  };
  return {view,opens,async close(){await worker?.terminate();source.close();}};
}
async function select(view,query,pageRows=2){
  const staged=[];
  const result=await selectCommittedOccurrences(view,query,{
    pageRows,
    onSelectedPage:async p=>staged.push(...p)
  });
  return {result,paths:staged.map(row=>row.path),staged};
}
test('R08/U01: actual committed R05/R07 source selecting BRANCH A returns all and only A descendants',async()=>{
  const f=await committedFixture();
  try{
    const branch=f.opens.find(e=>e.path==='/0');
    const a=await select(f.view,{mode:'EXPLICIT',includes:[branch.occurrenceId],excludes:[]},1);
    assert.deepEqual(a.paths,goldenA);
    assert.equal(a.result.complete,true);
    assert.equal(a.result.selectedCount,goldenA.length);
    assert.equal(a.result.scannedCount,goldenAll.length);
    assert.equal(a.result.engineeringReady,false);
    assert.equal(a.result.rightsBasis,'SOURCE_FACTS_ONLY');
  }finally{await f.close();}
});
test('R08/U01: ALL selects complete original source; NONE selects nothing without inventing a new source',async()=>{
  const f=await committedFixture();
  try{
    const all=await select(f.view,{mode:'ALL',includes:[],excludes:[]},3);
    const none=await select(f.view,{mode:'NONE',includes:[],excludes:[]},1);
    assert.deepEqual(all.paths,goldenAll);
    assert.deepEqual(none.paths,[]);
    assert.equal(none.result.scannedCount,goldenAll.length);
    assert.equal(none.result.selectedCount,0);
    assert.equal(all.result.sourceSha256,f.view.manifest.sourceSha256);
  }finally{await f.close();}
});