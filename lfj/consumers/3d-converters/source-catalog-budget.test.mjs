/** Bounded source catalog budget API, no mocked fake source/golden. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {runPagedCompactResearch} from '../../qualification/experiments/consumer-sparse-b0/compact-paged-research.mjs';
const blob=new Blob(['[]'],{type:'application/json'});
const args={blob,databaseName:'lfj-a3-source-negative',generation:'test'};
for(const input of [0,-1,1,1999999,2000001,3500000,4000001,
  Number.MAX_SAFE_INTEGER,NaN,Infinity,{},'4000000']){
  test('source catalog rejects unbounded/unsupported maxValues '+String(input),async()=>{
    await assert.rejects(()=>runPagedCompactResearch({...args,maxValues:input}),
      error=>error?.code==='BUDGET_INVALID');
  });
}
test('missing Blob input is rejected before budget admission',async()=>{
  await assert.rejects(()=>runPagedCompactResearch({
    databaseName:'test',generation:'test',maxValues:4000000
  }),error=>error?.code==='INPUT_REQUIRED');
});
