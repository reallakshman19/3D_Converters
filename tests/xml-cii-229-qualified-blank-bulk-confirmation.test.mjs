import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createWeightReviewService,WEIGHT_SCHEMA}
 from '../converters/xml-cii2019-core/weight-facts-review-service.js';
import {legacyXmlCiiWeightFacts}
 from '../converters/xml-cii2019-core/weight-facts-xml-cii-adapter.js';
import {planXml229QualifiedBlankFill,commitXml229QualifiedBlankFill}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-source-weight-bulk-review.mjs';
import {projectXml229WeightDecisionProvenance}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-weight-decision-provenance.mjs';

const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const basis={
 schemaVersion:WEIGHT_SCHEMA,domainId:'xml-cii/2019',
 basisId:hash('xml229-original-bulk-real-service'),
 sourceRefs:[{sourceId:'one',sha256:hash('one'),mediaType:'application/xml'}],
 selectionSha256:hash('full-original-source'),stagedSourceSha256:hash('original-json'),
 masters:{weight:{datasetId:'weight-master',revision:'1',sha256:hash('weight-master'),
  mappingSha256:hash('master-mapping'),rowCount:1595}},
 configSha256:hash('config'),overridesSha256:hash('no-overrides'),
 scope:[{sourceId:'one',selectionRef:'all'}],
};
const physical=i=>({
 key:'BR::'+i,branchName:'BR',nodeNumber:String(i),branchOccurrenceIndex:i,
 nodeOrdinal:0,boreMm:100,rating:'150',lengthMm:100,
 nodeName:'VGT-'+i,componentType:'VALV',dtxr:'GATE',
 originalWeight:i===0?59:null,
});
const id=i=>'one/branch:'+i+'/physical:0';
function harness(count=112){
 const facts=Array.from({length:count},(_,i)=>legacyXmlCiiWeightFacts(
  [physical(i)],basis,'one')).flat();
 const score=(rows,b)=>{
  const oid=rows[0].occurrenceId;
  const proposals=[{basisId:b.basisId,domainId:b.domainId,occurrenceId:oid,
   proposalId:oid+'/master-exact',unit:'kg',value:15,method:'exact-master',
   ranking:1,qualified:oid!==id(4),scoringRevision:'oracle-exact-v1',
   eligibilityReasons:['bore-rating-length'],evidenceRefs:[b.masters.weight.sha256]}];
  if(oid===id(5))proposals.push({...proposals[0],ranking:2,value:19,
    proposalId:oid+'/competing-qualified',qualified:true});
  return proposals;
 };
 const service=createWeightReviewService({score,
  digestReview:async data=>hash(JSON.stringify(data)),
 });
 service.openBasis(basis,{facts});
 const projection={proposals:ids=>{
  const found=new Map(ids.map(i=>[i,[]]));
  for(let cursor=null,loops=0;;loops++){
   assert(loops<15,'proposal pagination must terminate');
   const page=service.getProposals({basisId:basis.basisId,occurrenceIds:ids,
    cursor,limit:200});
   assert(page.complete,'partial proposal page cannot be accepted');
   for(const row of page.items)found.get(row.occurrenceId).push(row);
   if(page.nextCursor==null)break;
   cursor=page.nextCursor;
  }
  return found;
 }};
 const manual=service.applyDecisions({basisId:basis.basisId,scopeId:'one',
  stage:'RigidMatch1',commands:[{
   commandId:'explicit-manual-one',basisId:basis.basisId,scopeId:'one',
   occurrenceId:id(1),expectedDecisionRevision:null,action:'enter-manual',
   value:20,unit:'kg',reason:'Engineer separately reviewed original physical #1',
  }]})[0];
 assert.equal(manual.state,'accepted');
 assert.equal(service.getDecisionState({basisId:basis.basisId,scopeId:'one',
  stage:'RigidMatch1'}).decisions[id(1)].value,20);
 const final=service.applyDecisions({basisId:basis.basisId,scopeId:'one',
  stage:'Rigidmatch2',commands:[{
   commandId:'explicit-final-two',basisId:basis.basisId,scopeId:'one',
   occurrenceId:id(2),expectedDecisionRevision:null,action:'final-override',
   value:22,unit:'kg',reason:'Independent Final Match-2 reviewed mass',
  }]})[0];
 assert.equal(final.state,'accepted');
 assert.equal(service.getDecisionState({basisId:basis.basisId,scopeId:'one',
  stage:'Rigidmatch2'}).decisions[id(2)].value,22);
 return {service,projection};
}
const plan=(h,sequence=1)=>planXml229QualifiedBlankFill(
 h.service,h.projection,{basisId:basis.basisId,sourceId:'one',sequence});
const confirm=(h,pending,planId=pending?.planId)=>commitXml229QualifiedBlankFill(
 h.service,{basisId:basis.basisId,sourceId:'one',pending,planId});
const decisions=(h,stage)=>h.service.getDecisionState({
 basisId:basis.basisId,scopeId:'one',stage}).decisions;

test('Worker guarded source bulk: qualified off-page blanks commit only AFTER explicit planId; source and Final are untouched',()=>{
 const h=harness(),start=decisions(h,'RigidMatch1');
 assert.equal(Object.keys(start).length,1);
 const beforeFinal=structuredClone(decisions(h,'Rigidmatch2'));
 const prepared=plan(h,1);
 assert.equal(prepared.summary.physicalCount,112);
 assert.equal(prepared.summary.preservedSourceWeights,1);
 assert.equal(prepared.summary.alreadyReviewed,1);
 assert.equal(prepared.summary.excludedFinal,1);
 assert.equal(prepared.summary.ambiguousQualified,1);
 assert.equal(prepared.summary.unresolved,1);
 assert.equal(prepared.summary.qualified,107);
 assert.equal(prepared.summary.reviewStage,'RigidMatch1');
 assert.equal(prepared.summary.finalAcceptedAutomatically,false);
 assert.equal(Object.keys(decisions(h,'RigidMatch1')).length,1,
  'planning and showing a proposal cannot write any decision');
 assert.throws(()=>confirm(h,prepared.pending,'forged-plan-id'),e=>
  e.code==='BULK_PLAN_STALE');
 const committed=confirm(h,prepared.pending);
 assert.deepEqual(committed,{
  basisId:basis.basisId,acceptedCount:107,
  stage:'RigidMatch1',finalAcceptedAutomatically:false,
 });
 const all=decisions(h,'RigidMatch1');
 assert.equal(Object.keys(all).length,108);
 assert.equal(all[id(1)].value,20,'existing Match-1 preserved');
 for(const excluded of [0,2,4,5])assert.equal(all[id(excluded)],undefined,
  'source/Final/unqualified/ambiguous physical not bulk-filled: '+excluded);
 assert.equal(all[id(6)].value,15);
 assert.equal(all[id(111)].value,15,
  'qualified physical outside first visible 25 rows included');
 assert.deepEqual(decisions(h,'Rigidmatch2'),beforeFinal);
 assert.equal(plan(h,2).summary.qualified,0,'reviewed blanks never refilled');
});
test('stale Final revision fails the bulk confirmation with no Match-1 mutation',()=>{
 const h=harness(14),prepared=plan(h),before=structuredClone(decisions(h,'RigidMatch1'));
 h.service.applyDecisions({basisId:basis.basisId,scopeId:'one',
  stage:'Rigidmatch2',expectedDecisionRevision:'f1',commands:[{
   commandId:'separate-final-three',basisId:basis.basisId,scopeId:'one',
   occurrenceId:id(3),expectedDecisionRevision:'f1',action:'final-override',
   value:24,unit:'kg',reason:'Independent Final action invalidates old bulk plan',
  }]});
 assert.throws(()=>confirm(h,prepared.pending),e=>e.code==='BULK_FINAL_REVIEW_CHANGED');
 assert.deepEqual(decisions(h,'RigidMatch1'),before);
 assert.equal(decisions(h,'Rigidmatch2')[id(3)].value,24);
});
test('stale Match-1 revision refuses bulk without partial writes, replay without pending is rejected',()=>{
 const h=harness(12),prepared=plan(h);
 const beforeFinal=structuredClone(decisions(h,'Rigidmatch2'));
 h.service.applyDecisions({basisId:basis.basisId,scopeId:'one',
  stage:'RigidMatch1',expectedDecisionRevision:'m1',commands:[{
   commandId:'concurrent-human-reviewed-eleven',basisId:basis.basisId,scopeId:'one',
   occurrenceId:id(11),expectedDecisionRevision:'m1',action:'enter-manual',
   value:33,unit:'kg',reason:'New Match-1 human decision after plan',
  }]});
 assert.throws(()=>confirm(h,prepared.pending),e=>e.code==='STALE_DECISION');
 assert.equal(Object.keys(decisions(h,'RigidMatch1')).length,2,
  'no bulk acceptance after CAS conflict');
 assert.deepEqual(decisions(h,'Rigidmatch2'),beforeFinal);
 assert.throws(()=>confirm(h,null,prepared.summary.planId),e=>e.code==='BULK_PLAN_STALE');
});
test('worker sources import the same plan/confirm guards, and served root/docs are identical',async()=>{
 const worker=await readFile(new URL(
  '../tabs/xml-cii-2019-standalone/integration/xml229-original-blob-gcpw-worker.mjs',
  import.meta.url),'utf8');
 assert.match(worker,/planXml229QualifiedBlankFill\(review,weightProjection/);
 assert.match(worker,/commitXml229QualifiedBlankFill\(review/);
 assert.match(worker,/const pending=pendingBulk;pendingBulk=null/);
 const path='tabs/xml-cii-2019-standalone/integration/xml229-source-weight-bulk-review.mjs';
 const root=await readFile(new URL('../'+path,import.meta.url),'utf8');
 const docs=await readFile(new URL('../docs/'+path,import.meta.url),'utf8');
 assert.equal(root,docs);
});

test('same GC-PW command ledger proves 107 confirmed bulk, one manual Match-1, one independent Final; never proposals',async()=>{
 const h=harness(),prepared=plan(h,1);
 const before=await h.service.exportReviewState({basisId:basis.basisId});
 const beforeProof={basisId:basis.basisId,sourceId:'one',
  originalJsonSha256:basis.stagedSourceSha256,sourceGenerationId:'test-generation',
  verifiedPhysicalCount:112,verifiedFactCount:784,engineeringFactsVerified:true,
  ciiReleaseAuthorized:false,counts:{source:1,match1:1,final:1,unresolved:109}};
 const beforeAudit=projectXml229WeightDecisionProvenance({
  reviewState:before,basisId:basis.basisId,sourceId:'one',completion:beforeProof});
 assert.equal(beforeAudit.summary.manual,1);
 assert.equal(beforeAudit.summary.finalOverride,1);
 assert.equal(beforeAudit.summary.bulkConfirmed,0);
 assert.equal(beforeAudit.summary.auditedAcceptedDecisions,2);
 assert.equal(beforeAudit.summary.provenanceComplete,true);
 confirm(h,prepared.pending);
 const proof={...beforeProof,counts:{source:1,match1:108,final:1,unresolved:2}};
 const reviewState=await h.service.exportReviewState({basisId:basis.basisId});
 const verified=projectXml229WeightDecisionProvenance({
  reviewState,basisId:basis.basisId,sourceId:'one',completion:proof,
  confirmedBulkCommandIds:prepared.pending.plan.commands.map(c=>c.commandId),
 });
 assert.equal(verified.population.physicalCount,112);
 assert.equal(verified.population.factCount,784);
 assert.equal(verified.summary.bulkConfirmed,107);
 assert.equal(verified.summary.manual,1);
 assert.equal(verified.summary.finalOverride,1);
 assert.equal(verified.summary.acceptedMatch1All,108);
 assert.equal(verified.summary.effectiveMatch1Only,108);
 assert.equal(verified.summary.acceptedFinal,1);
 assert.equal(verified.summary.unverified,0);
 assert.equal(verified.summary.provenanceComplete,true);
 assert.equal(verified.rows.length,109);
 assert.equal(verified.rows.find(r=>r.occurrenceId===id(111)).provenanceKind,'bulk-confirmed');
 assert.equal(verified.rows.find(r=>r.occurrenceId===id(1)).kg,20);
 assert.equal(verified.rows.find(r=>r.occurrenceId===id(2)).stage,'Rigidmatch2');
 assert.equal(verified.summary.nativeCiiReleaseAuthorized,false);
 assert(!JSON.stringify(verified).includes('Engineer separately reviewed original physical #1'),
   'no raw engineering reason or original source bytes in exported audit');
});

test('bulk command ledger without same-Worker confirmation remains honestly unproven',async()=>{
 const h=harness(14),p=plan(h);confirm(h,p.pending);
 const proof={basisId:basis.basisId,sourceId:'one',
  originalJsonSha256:basis.stagedSourceSha256,sourceGenerationId:'test-generation',
  verifiedPhysicalCount:14,verifiedFactCount:98,engineeringFactsVerified:true,
  ciiReleaseAuthorized:false,counts:{source:1,match1:10,final:1,unresolved:2}};
 // 14 components: 1 source + 1 manual + 1 Final + 2 excluded
 // unqualified/ambiguous + 9 approved = 14, so Match-1 = 10.
 const envelope=await h.service.exportReviewState({basisId:basis.basisId});
 const audit=projectXml229WeightDecisionProvenance({
  reviewState:envelope,basisId:basis.basisId,sourceId:'one',completion:proof});
 assert.equal(audit.summary.bulkConfirmationUnknown,9);
 assert.equal(audit.summary.bulkConfirmed,0);
 assert.equal(audit.summary.provenanceComplete,false);
 assert(audit.summary.issues.includes('BULK_CONFIRMATION_NOT_PROVEN'));
 assert.equal(audit.summary.nativeCiiReleaseAuthorized,false);
});

test('audit fails closed for stale source, modified receipt and decision/completion census drift',async()=>{
 const h=harness(14),p=plan(h);confirm(h,p.pending);
 const envelope=await h.service.exportReviewState({basisId:basis.basisId});
 const proof={basisId:basis.basisId,sourceId:'one',
  verifiedPhysicalCount:14,verifiedFactCount:98,engineeringFactsVerified:true,
  ciiReleaseAuthorized:false,counts:{source:1,match1:10,final:1,unresolved:2}};
 assert.throws(()=>projectXml229WeightDecisionProvenance({
  reviewState:envelope,basisId:basis.basisId,sourceId:'another',completion:proof,
 }),e=>e.code==='PROVENANCE_SOURCE_PROOF_REQUIRED');
 assert.throws(()=>projectXml229WeightDecisionProvenance({
  reviewState:envelope,basisId:basis.basisId,sourceId:'one',
  completion:{...proof,verifiedFactCount:97},
 }),e=>e.code==='PROVENANCE_SOURCE_PROOF_REQUIRED');
 const drift=projectXml229WeightDecisionProvenance({
  reviewState:envelope,basisId:basis.basisId,sourceId:'one',
  completion:{...proof,counts:{source:0,match1:11,final:1,unresolved:2}},
 });
 assert.equal(drift.summary.provenanceComplete,false);
 assert(drift.summary.issues.includes('COMPLETION_DECISION_CENSUS_MISMATCH'));
});
