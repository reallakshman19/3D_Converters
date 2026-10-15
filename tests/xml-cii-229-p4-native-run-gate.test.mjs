import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requiresXml229CanonicalRunGate,checkXml229CanonicalRunGate}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-run-gate.js';
import {buildStandaloneOutputRunReadiness}
 from '../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js';

test('ordinary legacy XML without a P4/O1 selected source uses existing readiness',async()=>{
 const ref={current:{sourceText:'<xml/>',sourceKind:'xml'}};
 assert.equal(requiresXml229CanonicalRunGate(ref),false);
 const decision=await checkXml229CanonicalRunGate(ref);
 assert.equal(decision.applies,false);
 assert.equal(decision.authorized,null);
});
test('source-only O1 original index NEVER grants Run even if legacy reports 0 blockers',async()=>{
 const ref={current:{
   xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED',engineeringReady:false},
   outputRunReadinessReport:{summary:{blockingCount:0}},
 }};
 assert.equal(requiresXml229CanonicalRunGate(ref),true);
 const decision=await checkXml229CanonicalRunGate(ref);
 assert.equal(decision.applies,true);
 assert.equal(decision.authorized,false);
 assert.equal(decision.code,'ORIGINAL_SOURCE_REVIEW_MISSING');
 assert.match(decision.message,/CII Run HELD/);
});
test('partial or active Mode A source O1 index must be blocked before any batch conversion',async()=>{
 const ref={current:{sourceBatch:{sources:[
   {enabled:false,xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED'}},
   {enabled:true,workflow:{xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED'}}},
 ]}}};
 assert.equal(requiresXml229CanonicalRunGate(ref),true);
 assert.equal((await checkXml229CanonicalRunGate(ref)).authorized,false);
});
test('Mode A ref nesting cannot evade raw O1 source guard',async()=>{
 const raw={current:{xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED'}}};
 const view={modeABaseRef:raw,current:{sourceKind:'xml'}};
 assert.equal(requiresXml229CanonicalRunGate(view),true);
 assert.equal((await checkXml229CanonicalRunGate(view)).code,'ORIGINAL_SOURCE_REVIEW_MISSING');
});
test('disabled unrelated batch rows do not trigger a new engineering gate',()=>{
 const ref={current:{sourceBatch:{sources:[
  {enabled:false,xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED'}},
 ]}}};
 assert.equal(requiresXml229CanonicalRunGate(ref),false);
});
test('5 Run checklist reports a real BLOCKER for an original O1 source-only index',()=>{
 const state={sourceKind:'xml',sourceText:'<PipeStressExport/>',
   xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED',engineeringReady:false},
   outputRunReadinessReport:{summary:{blockingCount:0}}};
 const report=buildStandaloneOutputRunReadiness(state);
 const gate=report.checklistRows.find(x=>x.id==='xml229-original-source-final-release');
 assert.equal(gate?.blocking,true);
 assert.equal(gate?.severity,'error');
 assert.equal(gate?.status,'held');
 assert(report.summary.blockingCount>=1);
 assert.match(gate.message,/CII release is HELD/);
 const legacy=buildStandaloneOutputRunReadiness({sourceKind:'xml',
  sourceText:'<PipeStressExport/>'});
 assert.equal(legacy.checklistRows.some(x=>x.id===gate.id),false);
});
test('disabled source-only Mode A rows cannot affect unrelated Run checklist',()=>{
 const report=buildStandaloneOutputRunReadiness({
  sourceKind:'xml',sourceText:'<PipeStressExport/>',
  sourceBatch:{sources:[{enabled:false,xml229StagedSourceReceipt:{phase:'INDEX_COMMITTED'}}]},
 });
 assert.equal(report.checklistRows.some(x=>x.id==='xml229-original-source-final-release'),false);
});

test('served and root P4 Run execution code are byte-for-byte equal',async()=>{
 for(const p of [
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-run-gate.js',
  'tabs/xml-cii-2019-standalone/xml-cii-original-run-scope.js',
  'tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a-fast.js',
 ]){
  const root=await readFile(new URL('../'+p,import.meta.url));
  const served=await readFile(new URL('../docs/'+p,import.meta.url));
  assert.deepEqual(root,served);
 }
});
