// R10/U03 RED before composition: real R06/R07 accepted index -> R08 -> R09.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {runCommittedSourceQuery} from './committed-worker-query.mjs';

const json='[{"name":"A","children":[{"name":"X"}]},{"name":"A","children":[{"name":"Y"}]}]';
const all=['','/0','/0/name','/0/children','/0/children/0','/0/children/0/name','/1','/1/name','/1/children','/1/children/0','/1/children/0/name'];
const branch=all.slice(1,6);
const bytes=new TextEncoder().encode(json),sha=createHash('sha256').update(bytes).digest('hex');
const sourceRefId='R10-FIXTURE',revision='original-source';
const sourceRevision=revision+':sha256:'+sha;
const id=path=>JSON.stringify(['lfj-json-value/v1',sourceRefId,sourceRevision,path]);

function sourceIndexStore(){
 let staged=[],accepted=null,reads=0,rollbacks=0;
 return {
  async stagePage(page){staged.push(...page);},
  commit(summary){accepted=summary;},
  abort(){rollbacks++;staged=[];accepted=null;},
  async *readOrdered(){
   reads++;
   if(!accepted)throw new Error('uncommitted reader');
   for(const r of staged)if(r.kind==='OPEN')yield r;
  },
  get reads(){return reads;},
  get rollbacks(){return rollbacks;},
  get committed(){return accepted!==null;}
 };
}
function selectedIndexedStore(){
 let staged=[],committed=null,reads=0,rollback=0;
 return {
  async stagePage(page){staged.push(...page);},
  async commit(manifest){committed={manifest,rows:staged.slice()};},
  async abort(){rollback++;staged=[];committed=null;},
  async readRange(start,count,byteLimit){
   reads++;
   if(!committed)throw Error('not committed');
   let out=[],sum=0;
   for(const row of committed.rows.slice(start)){
     const n=new TextEncoder().encode(JSON.stringify(row)).length;
     if(out.length===count||sum+n>byteLimit)break;
     out.push(row);sum+=n;
   }
   return out;
  },
  get reads(){return reads;},
  get rollback(){return rollback;}
 };
}
async function run({mode='EXPLICIT',indexStore=sourceIndexStore(),selectedStore=selectedIndexedStore(),
  expectedSha256=sha}={}){
 let worker;
 const result=await runCommittedSourceQuery({
  blob:new Blob([bytes]),revision,expectedSha256,sourceRefId,jobId:'R10-ACTUAL-JOB',
  selectionDigest:'exact-'+mode,selection:{mode,includes:mode==='EXPLICIT'?[id('/0')]:[],excludes:[]},
  trustedWorkerCtor:Worker,
  createWorker:()=>{worker=new Worker(new URL('./source-node-worker.mjs',import.meta.url),{type:'module'});return worker;},
  indexStore,selectedStore,pageEvents:2
 });
 return {result,indexStore,selectedStore,worker};
}
test('R10/U03 RED: actual Worker R06 consumed receipt + R07 index commit + R08 + R09 complete branch pages',async()=>{
 const f=await run();
 try{
  assert.equal(f.result.completion.kind,'SOURCE_INDEX_COMPLETE');
  assert.equal(f.result.receipt.workerConsumedBytes,bytes.length);
  assert.equal(f.result.summary.occurrenceCount,all.length);
  assert.equal(f.result.selectionSummary.selectedCount,branch.length);
  let cursor=null,paths=[];
  do{
   const page=await f.result.readPage({cursor,maxRows:1,maxBytes:65536});
   paths.push(...page.rows.map(r=>r.path));
   cursor=page.cursor;
  }while(cursor!==null);
  assert.deepEqual(paths,branch);
  assert.equal(f.indexStore.reads,1,'R08 must read committed index only once, not per cursor');
  assert.equal(f.selectedStore.reads,branch.length);
  assert.equal(f.result.completion.engineeringReady,false);
  assert.equal(f.result.pageManifest.rightsBasis,'SOURCE_FACTS_ONLY');
 }finally{await f.result.close();}
});
test('R10/U03 RED: ALL and NONE source scope are complete, not a clipped result',async()=>{
 for(const [mode,expected] of [['ALL',all],['NONE',[]]]){
  const f=await run({mode});
  try{
   let cursor=null,rows=[];
   do{
    const page=await f.result.readPage({cursor,maxRows:3,maxBytes:65536});
    rows.push(...page.rows.map(r=>r.path));cursor=page.cursor;
   }while(cursor!==null);
   assert.deepEqual(rows,expected);
   assert.equal(f.result.selectionSummary.selectedCount,expected.length);
  }finally{await f.result.close();}
 }
});
test('R10/U04 RED: source SHA mismatch aborts before any R07 indexed commit',async()=>{
 const indexStore=sourceIndexStore(),selectedStore=selectedIndexedStore();
 await assert.rejects(()=>run({expectedSha256:'0'.repeat(64),indexStore,selectedStore}),
   e=>e?.code==='SOURCE_HASH_MISMATCH');
 assert.equal(indexStore.committed,false);
});
test('R10/U04 RED: failed R07 synchronous index store commit cannot publish R09 results',async()=>{
 const store=sourceIndexStore(),selected=selectedIndexedStore();
 store.commit=()=>{throw Object.assign(new Error('disk fault'),{code:'TEST_STORE_CRASH'});};
 await assert.rejects(()=>run({indexStore:store,selectedStore:selected}));
 assert.equal(store.committed,false);
 assert.ok(store.rollbacks>0);
 assert.equal(selected.reads,0);
});
