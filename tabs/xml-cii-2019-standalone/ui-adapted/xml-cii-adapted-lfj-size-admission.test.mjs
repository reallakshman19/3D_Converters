import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  LFJ_INDEXED_MAX_SOURCE_BYTES, LFJ_LARGE_CONTROL_BYTES,
  inspectIndexedSourceAdmission, requireIndexedSourceAdmission
} from './xml-cii-adapted-lfj-size-admission.js';
import { buildIndexedResolverPreview } from './xml-cii-adapted-lfj-indexed-preview.js';
import {runResolverJsonTraceFromUi} from './xml-cii-adapted-events.js';
import {createXmlCiiAdaptedWorkflowState,updateWorkflowState} from './xml-cii-adapted-state.js';

const MiB=1024*1024;
function fakeSize(size){
  let reads=0;
  const blob=new Blob(['{}']);
  Object.defineProperty(blob,'size',{value:size,configurable:true});
  Object.defineProperty(blob,'arrayBuffer',{value:async()=>{
    reads++;throw Error('Source bytes must not be read at admission');
  }});
  return {blob,reads:()=>reads};
}

test('size classes are precise: empty rejected, 30MiB admitted, 32MiB admitted, 90MiB rejected',()=>{
  assert.equal(LFJ_INDEXED_MAX_SOURCE_BYTES,32*MiB);
  assert.equal(LFJ_LARGE_CONTROL_BYTES.thirtyMiB,30*MiB);
  assert.equal(LFJ_LARGE_CONTROL_BYTES.ninetyMiB,90*MiB);
  for(const [bytes,accepted,code] of [
    [0,false,'LFJ_SOURCE_EMPTY'],
    [30*MiB,true,'LFJ_SOURCE_ADMITTED_SIZE_ONLY'],
    [32*MiB,true,'LFJ_SOURCE_ADMITTED_SIZE_ONLY'],
    [32*MiB+1,false,'LFJ_SOURCE_CAPACITY'],
    [90*MiB,false,'LFJ_SOURCE_CAPACITY']
  ]){
    const source=fakeSize(bytes);
    const result=inspectIndexedSourceAdmission(source.blob);
    assert.equal(result.accepted,accepted,String(bytes));
    assert.equal(result.code,code);
    assert.equal(result.sizeBytes,bytes);
    assert.equal(source.reads(),0);
    assert.equal(Object.isFrozen(result),true);
  }
});

test('missing/non-Blob input rejected before any Worker/crypto operation',()=>{
  for(const blob of [undefined,null,'{}',{}]){
    assert.equal(inspectIndexedSourceAdmission(blob).code,'LFJ_SOURCE_MISSING');
    assert.throws(()=>requireIndexedSourceAdmission(blob),e=>e.code==='LFJ_SOURCE_MISSING');
  }
});

test('distinct 90MiB has typed source limit and never calls arrayBuffer or creates a Worker',async()=>{
  const x=fakeSize(90*MiB);
  const previousWorker=globalThis.Worker;
  let created=0;
  globalThis.Worker=class{constructor(){created++;}};
  try{
    await assert.rejects(buildIndexedResolverPreview({
      blob:x.blob,xmlText:'<Root/>',config:{}
    }),e=>e.code==='LFJ_SOURCE_CAPACITY' &&
      e.limitBytes===32*MiB && e.sizeBytes===90*MiB);
    assert.equal(created,0);
    assert.equal(x.reads(),0);
  }finally{
    if(previousWorker===undefined)delete globalThis.Worker;
    else globalThis.Worker=previousWorker;
  }
});

test('a one-byte-over-cap source also rejects BEFORE hashing',async()=>{
  const x=fakeSize(32*MiB+1);
  await assert.rejects(buildIndexedResolverPreview({
    blob:x.blob,xmlText:'<Root/>'
  }),e=>e.code==='LFJ_SOURCE_CAPACITY');
  assert.equal(x.reads(),0);
});

test('real indexed UI Build fails closed for 90MiB, zero Worker, no CSV receipt',async()=>{
  const x=fakeSize(90*MiB);
  const previousWorker=globalThis.Worker;
  let created=0,renders=0;
  globalThis.Worker=class{constructor(){created++;}};
  try{
    const base=createXmlCiiAdaptedWorkflowState();
    const ref={current:updateWorkflowState(base,{
      sourceKind:'xml',sourceText:'<Root><Node/></Root>',
      stagedJsonFile:x.blob,stagedJsonText:'',
      resolverSourceMode:'lfj-indexed-preview',
      resolverJsonTraceConfig:{},supportConfigJson:'{}'
    })};
    const result=await runResolverJsonTraceFromUi(
      {querySelector:()=>null},ref,()=>renders++,false);
    assert.equal(result,null);
    assert.equal(ref.current.resolverJsonTraceRunning,false);
    assert.equal(ref.current.lfjIndexedPreview,null);
    assert.equal(ref.current.lfjIndexedExportReceipt,null);
    assert.equal(ref.current.lfjIndexedExportOptIn,false);
    assert.equal(ref.current.resolverJsonTraceAcceptedRevision,null);
    assert.match(ref.current.resolverJsonTraceExportStatus,/32 MiB/);
    assert.equal(created,0);
    assert.equal(x.reads(),0);
    assert.ok(renders>=2);
  }finally{
    if(previousWorker===undefined)delete globalThis.Worker;
    else globalThis.Worker=previousWorker;
  }
});
