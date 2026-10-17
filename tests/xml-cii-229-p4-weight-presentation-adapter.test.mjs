import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 renderXml229WeightReviewPage,choiceForXml229WeightRow,
 xml229WeightReviewPageModel,xml229WeightReviewStatus,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-review-presentation.mjs';
import {xml229UnbuiltIndependentStage}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-run-readiness-presentation.mjs';
import {planXml229UnqualifiedDrafts,formatXml229Match1Exclusions}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-unqualified-drafts.mjs';
import {matchesXml229WeightReviewFilter,xml229WeightReviewFilters}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-weight-page-filter.mjs';

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
 assert.match(html,/Candidate chips are draft evidence/);
 assert.equal((html.match(/<th style=/g)||[]).length,13);
 assert.match(html,/data-p4-bulk-plan/);
 assert.match(html,/data-p4-scope="rigid"/);
  assert.match(html,/data-p4-scope="blank-rigid"/);
  assert.match(html,/Filter Blank/);
  assert.match(html,/Auto Fill Match-1/);
  assert.match(html,/data-p4-draft-unqualified/);
  assert.match(html,/Fill unqualified drafts/);
  assert.match(html,/data-p4-draft-marker/);
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

test('Filter Blank shows only source-bound RIGID rows with no accepted mass',()=>{
 assert.deepEqual(xml229WeightReviewFilters,
  ['all','rigid','blank-rigid','needs-review']);
 const unresolved={componentType:'RIGID',sourceKg:null,match1State:'deferred',finalState:'rejected'};
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',unresolved),true);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,sourceKg:0}),true);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,sourceKg:NaN}),true);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,componentType:'PIPE'}),false);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,sourceKg:15}),false);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,match1State:'accepted'}),false);
 assert.equal(matchesXml229WeightReviewFilter('blank-rigid',{...unresolved,finalState:'accepted'}),false);
 assert.equal(matchesXml229WeightReviewFilter('needs-review',{...unresolved,componentType:'PIPE'}),true);
 assert.equal(matchesXml229WeightReviewFilter('rigid',{...unresolved,sourceKg:15}),true);
 assert.equal(matchesXml229WeightReviewFilter('all',{...unresolved,componentType:'PIPE'}),true);
 assert.throws(()=>matchesXml229WeightReviewFilter('unverified',unresolved),/Unknown/);
});

test('source-wide unqualified draft action plans all Worker pages without review writes',async()=>{
 const rows=Array.from({length:53},(_,i)=>({
   sourceId:'SOURCE',occurrenceId:'id-'+i,componentType:'RIGID',
   sourceKg:null,match1Kg:null,finalKg:null,
   match1View:{match1Revision:'m1',stageDecision:i===2?{state:'rejected'}:null},
   finalView:{finalRevision:'f1',stageDecision:null},
   proposals:i===0?[]:i===1?[{proposalId:'q',ranking:1,value:5,qualified:true}]:
     [{proposalId:'p-'+i,ranking:1,value:i+1,qualified:false}],
 }));
 const calls=[],writes=[];
 const session={receipt:{basisId:'b'.repeat(64),sourceId:'SOURCE'},async readPage(args){
   calls.push(args);
   return {basisId:this.receipt.basisId,offset:args.offset,
     totalCount:rows.length,complete:true,rows:rows.slice(args.offset,args.offset+args.limit)};
 },review:()=>writes.push('write')};
 const saved=new Map([['id-3',{value:'123',proposalId:'p-3',reason:'reviewer draft'}]]);
 const result=await planXml229UnqualifiedDrafts(session,{existingDrafts:saved});
 assert.equal(result.counts.blankRigid,53);
 assert.equal(result.counts.withoutProposal,1);
 assert.equal(result.counts.qualifiedPresent,1);
 assert.equal(result.counts.existingReview,1);
 assert.equal(result.counts.alreadyDrafted,1);
 assert.equal(result.counts.prepared,49);
 assert.equal(result.drafts.size,49);
 assert.deepEqual(calls.map(x=>x.offset),[0,25,50]);
 assert(calls.every(x=>x.filter==='blank-rigid'&&x.query===''&&x.limit===25));
 assert.equal(result.drafts.has('id-3'),false);
 assert.equal(result.drafts.has('id-2'),false);
 assert.equal(result.drafts.get('id-52').value,'53');
 assert.equal(result.drafts.get('id-52').proposalId,'p-52');
 assert.deepEqual(writes,[]);
 assert.equal(result.reviewDecisionsAuthorized,false);
 assert.equal(result.finalAcceptedAutomatically,false);
 assert.equal(result.nativeCiiReleaseAuthorized,false);
});

test('unqualified draft scan fails closed on stale Worker and changed review revision',async()=>{
 const mk=(revision='m1')=>({
   sourceId:'SOURCE',occurrenceId:'id-'+revision,componentType:'RIGID',
   match1View:{match1Revision:revision,stageDecision:null},
   finalView:{finalRevision:'f1',stageDecision:null},
   proposals:[{proposalId:'p',ranking:1,value:5,qualified:false}],
 });
 const receipt={basisId:'b'.repeat(64),sourceId:'SOURCE'};
 const stale={receipt,readPage:async()=>({
   basisId:'c'.repeat(64),offset:0,totalCount:1,complete:true,rows:[mk()],
 })};
 await assert.rejects(planXml229UnqualifiedDrafts(stale),{code:'UNQUALIFIED_DRAFT_PAGE_DRIFT'});
 let current=true;
 const closed={receipt,readPage:async()=>{current=false;return {
   basisId:receipt.basisId,offset:0,totalCount:1,complete:true,rows:[mk()],
 };}};
 await assert.rejects(planXml229UnqualifiedDrafts(closed,{isCurrent:()=>current}),
  {code:'UNQUALIFIED_DRAFT_STALE_SOURCE'});
 const drift={receipt,readPage:async({offset})=>({
   basisId:receipt.basisId,offset,totalCount:26,complete:true,
   rows:Array.from({length:Math.min(25,26-offset)},(_,i)=>({
     ...mk(offset? 'm2':'m1'),occurrenceId:'id-'+(offset+i),
   })),
 })};
 await assert.rejects(planXml229UnqualifiedDrafts(drift),{code:'UNQUALIFIED_DRAFT_REVIEW_DRIFT'});
});

test('Match-1 exclusion display describes disjoint reasons, never engineering acceptance',()=>{
 const report=formatXml229Match1Exclusions({qualified:0,exclusions:{
   sourceMassPresent:2,match1DecisionPresent:125,noRank1Proposal:88,
   topRankUnqualified:205,lowerRankQualified:3,
   finalDecisionPresent:0,conflictingQualifiedCandidates:2,
 }});
 assert.match(report,/No rank-1 proposal: 88/);
 assert.match(report,/Rank-1 not qualified: 205/);
 assert.match(report,/qualified only at lower rank: 3/);
 assert.match(report,/Existing Match-1 decision.*: 125/);
 assert.match(report,/ready for explicit confirmation/);
 assert.match(report,/Final\/native CII remain independent/);
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
  const worker=await readFile(new URL('../tabs/xml-cii-2019-standalone/integration/xml229-original-blob-gcpw-worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/matchesXml229WeightReviewFilter\(mode,/);
  assert.match(panel,/planQualifiedBlankFill/);
  assert.match(panel,/commitQualifiedBlankFill/);
 assert.match(panel,/(?:active|session)\.readPage\(\{offset,limit:25\}\)/,
   'Worker paging must stay source-bound; captured session prevents late cancelled responses from painting');
 assert.match(panel,/planQualifiedBlankFill/);
 assert.match(panel,/commitQualifiedBlankFill/);
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
