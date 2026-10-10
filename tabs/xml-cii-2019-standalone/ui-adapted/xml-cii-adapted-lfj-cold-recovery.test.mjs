import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  indexedGenerationNames,indexedGenerationLockName,
  withIndexedGenerationCustody,recoverAbandonedIndexedGenerations,
  MAX_RECOVERY_GENERATIONS
} from './xml-cii-adapted-lfj-cold-recovery.js';
const ids=[
  '12345678-1234-4123-a123-123456789abc',
  '87654321-4321-4123-b123-123456789abc',
  'a2345678-1234-4123-a123-123456789abc'
];
function harness(){
  const names=new Set(),held=new Set(),deleted=[];
  const locks={
    async request(name,options,fn){
      if(options.ifAvailable&&held.has(name))return fn(null);
      if(held.has(name))throw Error('Unexpected lock contention in test');
      held.add(name);
      try{return await fn({name});}finally{held.delete(name);}
    }
  };
  const databaseFactory={
    async databases(){return [...names].map(name=>({name,version:1}));},
    deleteDatabase(name){
      deleted.push(name);
      const request={};
      queueMicrotask(()=>{names.delete(name);request.onsuccess();});
      return request;
    }
  };
  return {names,held,deleted,locks,databaseFactory};
}
test('generation names are strictly versioned UUID, distinct and lock-bound',()=>{
  const [a,b]=indexedGenerationNames(ids[0]);
  assert.match(a,/source-r2-/);
  assert.match(b,/projection-r2-/);
  assert.notEqual(a,b);
  assert.equal(indexedGenerationLockName(ids[0]),'lfj-a3-indexed-r2-'+ids[0]);
  for(const bad of ['','random','../../stuff',ids[0].toUpperCase()])
    assert.throws(()=>indexedGenerationNames(bad),e=>e.code==='LFJ_RECOVERY_GENERATION');
});
test('one complete and one partial orphan reclaimed, unversioned never deleted',async()=>{
  const h=harness();
  for(const n of indexedGenerationNames(ids[0]))h.names.add(n);
  h.names.add(indexedGenerationNames(ids[1])[0]);
  h.names.add('lfj-ui-preview-source-'+ids[2]); // old, no owner locks
  h.names.add('unrelated-owner-database');
  const result=await recoverAbandonedIndexedGenerations(h);
  assert.equal(result.recovered,2);
  assert.equal(result.liveSkipped,0);
  assert.equal(result.oldUnownedGenerationsIgnored,true);
  assert.equal(h.deleted.length,4); // delete missing partner is safe
  assert.deepEqual([...h.names].sort(),[
    'lfj-ui-preview-source-'+ids[2],
    'unrelated-owner-database'
  ].sort());
});
test('locked active tab cannot be scavenged and is reclaimable only after release',async()=>{
  const h=harness();
  for(const name of indexedGenerationNames(ids[0]))h.names.add(name);
  h.held.add(indexedGenerationLockName(ids[0]));
  const live=await recoverAbandonedIndexedGenerations(h);
  assert.equal(live.recovered,0);
  assert.equal(live.liveSkipped,1);
  assert.equal(h.deleted.length,0);
  h.held.clear();
  const recovered=await recoverAbandonedIndexedGenerations(h);
  assert.equal(recovered.recovered,1);
  assert.equal(h.names.size,0);
});
test('generation custody lock remains held THROUGH asynchronous cleanup',async()=>{
  const h=harness(),lock=indexedGenerationLockName(ids[0]);
  let finish,entered=false;
  const held=withIndexedGenerationCustody(ids[0],async()=>{
    entered=true;
    assert.equal(h.held.has(lock),true);
    await new Promise(resolve=>{finish=resolve});
    assert.equal(h.held.has(lock),true);
    return 42;
  },h);
  await Promise.resolve();
  assert.equal(entered,true);
  assert.equal(h.held.has(lock),true);
  finish();
  assert.equal(await held,42);
  assert.equal(h.held.has(lock),false);
});
test('missing locking/enumeration and excess generations fail closed before deletes',async()=>{
  const h=harness();
  await assert.rejects(recoverAbandonedIndexedGenerations({
    ...h,locks:null
  }),e=>e.code==='LFJ_RECOVERY_LOCKS_REQUIRED');
  await assert.rejects(recoverAbandonedIndexedGenerations({
    ...h,databaseFactory:{deleteDatabase(){}}
  }),e=>e.code==='LFJ_RECOVERY_ENUMERATION');
  for(let i=0;i<MAX_RECOVERY_GENERATIONS+1;i++){
    const suffix=i.toString(16).padStart(12,'0');
    h.names.add('lfj-ui-preview-source-r2-12345678-1234-4123-a123-'+suffix);
  }
  await assert.rejects(recoverAbandonedIndexedGenerations(h),
    e=>e.code==='LFJ_RECOVERY_BUDGET');
  assert.equal(h.deleted.length,0);
});
test('real blocked IDB delete rejects without deleting other generation',async()=>{
  const h=harness();
  for(const name of indexedGenerationNames(ids[0]))h.names.add(name);
  let count=0;
  h.databaseFactory.deleteDatabase=name=>{
    count++;
    const r={};
    queueMicrotask(()=>{
      if(count===1)r.onblocked();
      else {h.names.delete(name);r.onsuccess();}
    });
    return r;
  };
  await assert.rejects(
    recoverAbandonedIndexedGenerations({...h,timeoutMs:10}),
    e=>e.code==='LFJ_IDB_CLEANUP_BLOCKED');
  assert.equal(h.held.size,0);
});
