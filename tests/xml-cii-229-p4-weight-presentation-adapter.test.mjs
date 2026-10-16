import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 renderXml229WeightReviewPage,choiceForXml229WeightRow,
 xml229WeightReviewPageModel,xml229WeightReviewStatus,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-review-presentation.mjs';
import {xml229UnbuiltIndependentStage}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-run-readiness-presentation.mjs';

const row=()=>({
  sourceId:'SRC-TEST',occurrenceId:'exact-source::occ-01',
  branchOccurrenceIndex:7,nodeOrdinal:13,sourceKg:null,match1Kg:null,finalKg:null,
  proposedKg:47.488,match1View:{revision:'match1-r'},finalView:{revision:'final-r'},
  proposals:[{proposalId:'attested-master-1',ranking:1,value:47.488,qualified:false,method:'master-match'}],
});

test('source-bound Worker page reuses existing review styling and bounded verified rows',()=>{
 const x=row();
 const page={totalCount:423,rows:[x]};
 const html=renderXml229WeightReviewPage(page,0);
 assert.match(html,/mc-rigid-review-table-wrap/);
 assert.match(html,/mc-rigid-review-candidate/);
 assert.match(html,/data-p4-row="0"/);
 assert.match(html,/data-p4-occurrence="exact-source::occ-01"/);
 assert.match(html,/data-p4-proposal/);
 assert.match(html,/data-p4-candidate/);
 assert.match(html,/data-p4-accept-match1/);
 assert.match(html,/data-p4-accept-final/);
 assert.match(html,/data-p4-filter-unresolved/);
 assert.match(html,/423 components/);
 assert.match(html,/showing 1–1/);
 assert.match(html,/Suggestions are evidence, never automatically accepted/);
 assert.doesNotMatch(html,/XML mass resolved/);
 assert.equal(xml229WeightReviewPageModel(page,0).counts.unresolved,1);
});

test('rendered original occurrence and master candidate are escaped and can never inject HTML',()=>{
 const x=row();x.sourceId='<script>alert(1)</script>';
 x.proposals[0].method='<img src=x onerror=alert(1)>';
 const html=renderXml229WeightReviewPage({totalCount:1,rows:[x]});
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<img src=/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;img/);
});

test('candidate chip is a draft; only a selected source-bound candidate can create Match-1',()=>{
 const x=row();
 assert.deepEqual(choiceForXml229WeightRow(x,{
   stage:'match1',proposalId:'attested-master-1',reason:'Reviewed source candidate',
 }),{view:x.match1View,choice:{
   action:'accept-proposal',proposalId:'attested-master-1',reason:'Reviewed source candidate',
 }});
 assert.throws(()=>choiceForXml229WeightRow(x,{stage:'match1',proposalId:'invented'}),
   /does not belong/);
});

test('manual Match-1 and Final need explicit positive mass and engineering reason',()=>{
 const x=row();
 for(const stage of ['match1','final']){
   assert.throws(()=>choiceForXml229WeightRow(x,{stage,value:'',reason:'x'}),/positive/);
   assert.throws(()=>choiceForXml229WeightRow(x,{stage,value:'-2',reason:'x'}),/positive/);
   assert.throws(()=>choiceForXml229WeightRow(x,{stage,value:'40',reason:' '}),/reason/);
 }
 assert.deepEqual(choiceForXml229WeightRow(x,{stage:'match1',value:'35',reason:'Engineer checked'}),
   {view:x.match1View,choice:{action:'enter-manual',value:35,unit:'kg',reason:'Engineer checked'}});
 assert.deepEqual(choiceForXml229WeightRow(x,{stage:'final',value:'40',reason:'Independent final'}),
   {view:x.finalView,choice:{action:'final-override',value:40,unit:'kg',reason:'Independent final'}});
});

test('review stage semantics remain distinct, including source-only mass',()=>{
 const r=row();
 assert.equal(xml229WeightReviewStatus(r).kind,'unresolved');
 assert.equal(xml229WeightReviewStatus({...r,sourceKg:13}).kind,'source');
 assert.equal(xml229WeightReviewStatus({...r,match1Kg:14}).kind,'match1');
 assert.equal(xml229WeightReviewStatus({...r,finalKg:15}).kind,'final');
});

test('5 Run distinguishes unperformed independent stages but cannot admit a blocked stage',()=>{
 for(const id of ['support-mapper','resolver-json','manual-restraints']){
  const p=xml229UnbuiltIndependentStage(id,{status:'missing',blocking:'false'});
  assert.equal(p.status,'not-run');
  assert.equal(p.severity,'warning');
  assert.match(p.message,/Not run:/);
  assert.equal(xml229UnbuiltIndependentStage(id,{status:'missing',blocking:'true'}),null);
  assert.equal(xml229UnbuiltIndependentStage(id,{status:'ready',blocking:'false'}),null);
 }
 assert.equal(xml229UnbuiltIndependentStage('xml229-original-json-engineering-authority',
   {status:'held',blocking:'true'}),null);
 assert.equal(xml229UnbuiltIndependentStage('weight-match',{status:'pending',blocking:'false'}),null);
});

test('adapter uses Worker readPage/review and keeps native Run HOLD and full source custody',async()=>{
 const panel=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js',import.meta.url),'utf8');
 const run=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',import.meta.url),'utf8');
 assert.match(panel,/active\.readPage\(\{offset,limit:25\}\)/);
 assert.match(panel,/await active\.review\(\{view,choice\}\)/);
 assert.match(panel,/choiceForXml229WeightRow/);
 assert.match(panel,/getXml229CurrentWorkerHeldReview/);
 assert.match(run,/projectOriginalReviewIntoRunChecklist/);
 assert.match(run,/verifiedEngineering:/);
 assert(run.includes('paint(verifiedReport,latest)'), 'must paint one verified canonical report using the latest workflow state');
 assert.doesNotMatch(run,/tr\.children\[2\]\.textContent=status/,
   'verification must publish one report, never hand-edit a checklist cell');
});

test('served production route is byte-identical to owned root files',async()=>{
 for(const path of [
 'tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-review-presentation.mjs',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-run-readiness-presentation.mjs',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
 ]){
   const root=await readFile(new URL('../'+path,import.meta.url),'utf8');
   const served=await readFile(new URL('../docs/'+path,import.meta.url),'utf8');
   assert.equal(root,served,path);
 }
});
