import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {physicalOccurrenceId} from '../contracts/gc-pw-v1/occurrence-bridge.mjs';
import {createWeightReviewService,WEIGHT_SCHEMA} from '../converters/xml-cii2019-core/weight-facts-review-service.js';
import {legacyXmlCiiWeightFacts} from '../converters/xml-cii2019-core/weight-facts-xml-cii-adapter.js';
import {readVerifiedSharedWeightReconciliation,selectVerifiedWeightReconciliation}
 from '../converters/xml-cii2019-core/weight-facts-shared-reconciliation.js';

const sha=x=>createHash('sha256').update(x).digest('hex');
const b={schemaVersion:WEIGHT_SCHEMA,domainId:'xml-cii/2019',
 basisId:sha('same-gc-pw-source-master-and-scope'),
 sourceRefs:['one','two'].map(sourceId=>({sourceId,sha256:sha('bytes-'+sourceId),mediaType:'application/xml'})),
 selectionSha256:sha('exact selected branches'),stagedSourceSha256:null,
 masters:{weight:{datasetId:'weight-master',revision:'v1',sha256:sha('1595 rows'),mappingSha256:sha('mapping'),rowCount:1595}},
 configSha256:sha('config'),overridesSha256:sha('overrides'),
 scope:['one','two'].map(sourceId=>({sourceId,selectionRef:'selected'})),
};
const id=(sourceId,branchOccurrenceIndex,nodeOrdinal)=>physicalOccurrenceId({
 sourceId,branchOccurrenceIndex,nodeOrdinal,componentSignature:'VALV:1006649732/119364_2',
});
const a=id('one',0,0), valve=id('one',0,1),other=id('two',0,0);
function facts(sourceId,index,ordinal,weight=null){
 const rows=legacyXmlCiiWeightFacts([{
  branchOccurrenceIndex:index,nodeOrdinal:ordinal,branchName:'/ASIM/B4',
  nodeNumber:'-1',componentRefNo:'1006649732/119364_2',
  boreMm:200,rating:'300',lengthMm:112,nodeName:'VGT',
  componentType:'RIGID',originalWeight:weight,
 }],b,sourceId);
 return rows.map(row=>({...row,occurrenceId:id(sourceId,index,ordinal)}));
}
function score(records,basis){
 const identity=records[0].occurrenceId;
 const masses=identity===valve?[166,218]:[35];
 return masses.map((weight,i)=>({
  basisId:basis.basisId,domainId:basis.domainId,occurrenceId:identity,
  proposalId:identity+'--'+weight,unit:'kg',value:weight,
  method:'exact',ranking:i+1,qualified:i===0,
  scoringRevision:'source-facts-v1',
  eligibilityReasons:['master-bore-rating-length'],evidenceRefs:[basis.masters.weight.sha256],
 }));
}
function session(){
 const service=createWeightReviewService({score});
 const all=[...facts('one',0,0),...facts('one',0,1),...facts('two',0,0)];
 service.openBasis(b,{facts:all});
 return {basis:b,review:service,openedFacts:all.length};
}
test('same source-bound proposals appear identically for Match-1 and Final',()=>{
 const s=session(),snap=readVerifiedSharedWeightReconciliation(s);
 assert.equal(snap.physicalCount,3);
 assert.equal(snap.proposalCount,4);
 assert.equal(snap.engineeringAccepted,false);
 const m=selectVerifiedWeightReconciliation(snap,{stage:'RigidMatch1',sourceId:'one'});
 const f=selectVerifiedWeightReconciliation(snap,{stage:'Rigidmatch2',sourceId:'one'});
 assert.equal(m.rows.length,2);
 assert.strictEqual(m.rows[0],f.rows[0],'both stage views must share the exact row object');
 assert.deepEqual(m.rows[0].proposals,f.rows[0].proposals);
 assert.equal(m.rows[0].draftKg,35);
 assert.equal(m.rows[0].effectiveAcceptedKg,null);
 assert.deepEqual(m.rows[1].proposals.map(x=>x.kg),[166,218]);
 assert.equal(m.rows[1].draftKg,null);
 assert.equal(m.rows[1].draftStatus,'REVIEW_REQUIRED');
 assert.ok(Object.isFrozen(snap.rows[0]));
});
test('duplicate NodeNumber, endpoint and ordinal in a different source never alias',()=>{
 const snap=readVerifiedSharedWeightReconciliation(session());
 const x=snap.rows.filter(r=>r.nodeOrdinal===0);
 assert.equal(x.length,2);
 assert.notEqual(x[0].occurrenceId,x[1].occurrenceId);
 assert.notEqual(x[0].sourceId,x[1].sourceId);
 assert.equal(selectVerifiedWeightReconciliation(snap,{stage:'Rigidmatch2',sourceId:'two'}).rows.length,1);
});
test('Match-1 decisions are preserved, and candidate never becomes accepted Final',()=>{
 const s=session();
 const accepted=s.review.applyDecisions({basisId:b.basisId,scopeId:'two',stage:'RigidMatch1',commands:[{
   commandId:'one-accept-40',basisId:b.basisId,scopeId:'two',occurrenceId:other,
   expectedDecisionRevision:null,action:'enter-manual',value:40,unit:'kg',
 }]});
 assert.equal(accepted[0].state,'accepted');
 const snap=readVerifiedSharedWeightReconciliation(s);
 const row=snap.rows.find(r=>r.sourceId==='two');
 assert.equal(row.match1Kg,40);
 assert.equal(row.finalKg,null);
 assert.equal(row.effectiveAcceptedKg,40);
 assert.equal(row.draftKg,null);
 assert.equal(row.proposedKg,35);
});
test('stale engineering decisions during scoring invalidate entire projection',()=>{
 const s=session(),old=s.review.getProposals.bind(s.review);
 let changed=false;
 const wrapped={...s,review:{...s.review,getProposals:params=>{
  const p=old(params);
  if(!changed){
   changed=true;
   s.review.applyDecisions({basisId:b.basisId,scopeId:'two',stage:'RigidMatch1',commands:[{
    commandId:'mutate',basisId:b.basisId,scopeId:'two',occurrenceId:other,
    expectedDecisionRevision:null,action:'enter-manual',value:40,unit:'kg',
   }]});
  }
  return p;
 }}};
 assert.throws(()=>readVerifiedSharedWeightReconciliation(wrapped),e=>e.code==='STALE_WEIGHT_RECONCILIATION');
});
test('truncated/foreign/invalid candidate pages fail closed',()=>{
 for(const damage of [
  p=>({...p,basisId:sha('wrong')}),
  p=>({...p,totalCount:p.totalCount+1}),
  p=>({...p,items:p.items.map((x,i)=>i?x:{...x,occurrenceId:'source:fake'})}),
  p=>({...p,items:p.items.map((x,i)=>i?x:{...x,unit:'N'})}),
 ]){
  const s=session(),original=s.review.getProposals.bind(s.review);
  const wrapped={...s,review:{...s.review,getProposals:args=>damage(original(args))}};
  assert.throws(()=>readVerifiedSharedWeightReconciliation(wrapped));
 }
});
test('stage selection refuses unverified snapshots and foreign source',()=>{
 const snap=readVerifiedSharedWeightReconciliation(session());
 assert.throws(()=>selectVerifiedWeightReconciliation(snap,{stage:'preview'}));
 assert.throws(()=>selectVerifiedWeightReconciliation(snap,{stage:'RigidMatch1',sourceId:'unknown'}));
 assert.throws(()=>selectVerifiedWeightReconciliation({rows:[]},{stage:'Rigidmatch2'}));
});
test('all original physical occurrences are projected, even when no proposal exists',()=>{
 const s=session();const original=s.review.getProposals.bind(s.review);
 const wrapped={...s,review:{...s.review,getProposals:args=>{
  const page=original(args);
  const keep=page.items.filter(p=>p.occurrenceId!==other);
  return {...page,items:keep,totalCount:keep.length,nextCursor:null};
 }}};
 const snap=readVerifiedSharedWeightReconciliation(wrapped);
 assert.equal(snap.physicalCount,3);
 assert.equal(snap.rows.find(r=>r.occurrenceId===other).draftStatus,'NO_PROPOSAL');
});
test('root/served common snapshot is exactly mirrored',async()=>{
 const p='converters/xml-cii2019-core/weight-facts-shared-reconciliation.js';
 assert.deepEqual(await readFile(new URL('../'+p,import.meta.url)),
   await readFile(new URL('../docs/'+p,import.meta.url)));
});
