import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createProjectionRetentionBudget,PROJECTION_RETENTION_LIMITS
} from './projection-retention-budget.mjs';

const denied=fn=>assert.throws(fn,e=>e?.code==='PROJECTION_RETENTION_LIMIT');
test('default retention limits explicitly bound paths, roots, and spatial entries',()=>{
  const b=createProjectionRetentionBudget();
  b.stagePath('$[0]');b.stagePath('$[0].children');
  b.rootBranch();b.spatialEntry({branch:'α',point:[1,2],tags:['A']});
  const s=b.summary();
  assert.equal(s.schema,'LFJ.A3.ProjectionRetention.v1');
  assert.equal(s.stagedPaths,2);
  assert.equal(s.stagedPathUtf8Bytes,new TextEncoder().encode('$[0]$[0].children').byteLength);
  assert.equal(s.rootBranches,1);
  assert.equal(s.spatialEntries,1);
  assert.ok(s.spatialEntryUtf8Bytes>0);
  assert.equal(Object.isFrozen(s),true);
  assert.equal(Object.isFrozen(s.limits),true);
  assert.deepEqual(s.limits,PROJECTION_RETENTION_LIMITS);
});
test('count limits fail on the first overflow and leave counters unchanged',()=>{
  const b=createProjectionRetentionBudget({
    stagedPaths:2,stagedPathUtf8Bytes:100,
    rootBranches:1,spatialEntries:1,spatialEntryUtf8Bytes:100
  });
  b.stagePath('a');b.stagePath('b');
  denied(()=>b.stagePath('c'));
  b.rootBranch();denied(()=>b.rootBranch());
  b.spatialEntry({branch:'A'});
  denied(()=>b.spatialEntry({branch:'B'}));
  assert.deepEqual(
    {paths:b.summary().stagedPaths,roots:b.summary().rootBranches,entries:b.summary().spatialEntries},
    {paths:2,roots:1,entries:1}
  );
});
test('UTF-8 capacity counts source paths and spatial record bytes, not characters',()=>{
  const b=createProjectionRetentionBudget({
    stagedPaths:8,stagedPathUtf8Bytes:4,
    rootBranches:8,spatialEntries:8,spatialEntryUtf8Bytes:18
  });
  b.stagePath('éé');
  assert.equal(b.summary().stagedPathUtf8Bytes,4);
  denied(()=>b.stagePath('x'));
  denied(()=>b.spatialEntry({long:'éééé'}));
  assert.equal(b.summary().spatialEntries,0);
});
test('configured budgets cannot exceed declared ceiling or be disabled',()=>{
  for(const [key,bad] of [
    ['stagedPaths',0],
    ['stagedPaths',Infinity],
    ['rootBranches',PROJECTION_RETENTION_LIMITS.rootBranches+1],
    ['spatialEntries',-1],
    ['stagedPathUtf8Bytes',2**31]
  ]){
    const limits={...PROJECTION_RETENTION_LIMITS,[key]:bad};
    assert.throws(()=>createProjectionRetentionBudget(limits),
      e=>e?.code==='PROJECTION_RETENTION_CONFIG');
  }
});
test('invalid source paths/spatial records fail before accounting',()=>{
  const b=createProjectionRetentionBudget();
  assert.throws(()=>b.stagePath(''),
    e=>e?.code==='PROJECTION_RETENTION_INPUT');
  assert.throws(()=>b.spatialEntry(undefined),
    e=>e?.code==='PROJECTION_RETENTION_INPUT');
  assert.equal(b.summary().spatialEntries,0);
  assert.equal(b.summary().stagedPaths,0);
});
