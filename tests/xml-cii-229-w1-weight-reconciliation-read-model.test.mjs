import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {physicalOccurrenceId} from '../contracts/gc-pw-v1/occurrence-bridge.mjs';
import {projectVerifiedXmlCiiWeightReconciliation}
  from '../converters/xml-cii2019-core/weight-reconciliation-read-model.js';

const BASIS='a'.repeat(64);
const OTHER_BASIS='b'.repeat(64);
const SOURCE='source-1';
const other='source-2';
const id=(source,branch,node,signature='same-node-number-ref')=>
  physicalOccurrenceId({sourceId:source,branchOccurrenceIndex:branch,
    nodeOrdinal:node,componentSignature:signature});
const node300=id(SOURCE,0,0), node309=id(SOURCE,0,1), node320=id(SOURCE,0,2);
const p=(n,kg,qualified=true)=>({
  proposalId:'original-master-candidate-'+n,ranking:n,value:kg,
  unit:'kg',qualified,method:'exact',eligibilityReasons:['exact-bore-rating-length'],
});
const view=(occurrenceId,props={})=>({
  basisId:BASIS,sourceId:SOURCE,occurrenceId,stage:'Rigidmatch2',
  match1Revision:0,finalRevision:0,
  sourceKg:null,match1Kg:null,finalKg:null,
  proposals:[p(1,35)],...props,
});
function build(views,expected=views.map(v=>v.occurrenceId),sourceId=SOURCE,basisId=BASIS){
  return projectVerifiedXmlCiiWeightReconciliation({
    basisId,sourceId,expectedOccurrenceIds:expected,verifiedViews:views,
  });
}

test('35kg direct unique weight is shown as muted editable DRAFT, never accepted',()=>{
  const original=view(node300);
  const rows=build([original]);
  assert.equal(rows.engineeringAccepted,false);
  assert.equal(rows.rows[0].status,'PROPOSED_EDITABLE_DRAFT');
  assert.equal(rows.rows[0].draftKg,35);
  assert.equal(rows.rows[0].proposedKg,35);
  assert.equal(rows.rows[0].effectiveAcceptedKg,null);
  assert.equal(rows.rows[0].draftPersistence,'NONE');
  assert.equal(original.proposals.length,1,'original view remains unchanged');
  assert.ok(Object.isFrozen(rows.rows[0].candidateProposals[0]));
});

test('VALV 166kg vs 218kg alternates remain visible, editable but cannot auto-draft',()=>{
  const rows=build([view(node309,{proposals:[p(1,166),p(2,218)]})]);
  assert.equal(rows.rows[0].status,'PROPOSAL_REQUIRES_REVIEW');
  assert.equal(rows.rows[0].proposedKg,166);
  assert.equal(rows.rows[0].draftKg,null);
  assert.equal(rows.rows[0].needsReview,true);
  assert.deepEqual(rows.rows[0].candidateProposals.map(c=>c.kg),[166,218]);
});

test('single source duplicate NodeNumber/ref can still have separate original occurrence rows',()=>{
  const rows=build([view(node300),view(node320)], [node300,node320]);
  assert.equal(rows.expectedCount,2);
  assert.deepEqual(rows.rows.map(row=>row.originalNodeOrdinal),[0,2]);
  assert.deepEqual(rows.rows.map(row=>row.componentSignature),['same-node-number-ref','same-node-number-ref']);
});

test('a nonblank source, accepted Match-1, or accepted Final can never be overwritten by draft',()=>{
  for(const [override,expectedKg,status] of [
    [{sourceKg:10},10,'SOURCE_WEIGHT_PRESENT'],
    [{match1Kg:27},27,'MATCH1_ACCEPTED'],
    [{sourceKg:10,match1Kg:27,finalKg:45},45,'FINAL_REVIEWED'],
  ]){
    const rows=build([view(node300,override)]);
    assert.equal(rows.rows[0].draftKg,null);
    assert.equal(rows.rows[0].effectiveAcceptedKg,expectedKg);
    assert.equal(rows.rows[0].status,status);
    assert.equal(rows.rows[0].candidateProposals[0].kg,35);
  }
});

test('no qualification or two different corroborating masses => explicit review',()=>{
  assert.equal(build([view(node300,{proposals:[p(1,35,false)]})]).rows[0].draftKg,null);
  assert.equal(build([view(node300,{proposals:[p(1,35),p(2,35)]})]).rows[0].draftKg,35);
  assert.equal(build([view(node300,{proposals:[]})]).rows[0].status,'NO_PROPOSAL');
});

test('other source with identical physical component identity is a separate source and cannot alias',()=>{
  const s2=id(other,0,0);
  assert.throws(()=>build([view(s2)], [node300]),/physical source identity differs/i);
  const rows2=build([{...view(s2),sourceId:other}],[s2],other);
  assert.equal(rows2.rows[0].sourceId,other);
  assert.notEqual(rows2.rows[0].occurrenceId,node300);
});

test('reject input-basis changes, duplicate views and stale view provenance',()=>{
  assert.throws(()=>build([view(node300)], [node300],SOURCE,OTHER_BASIS),/basis/);
  assert.throws(()=>build([view(node300),view(node300)]),/duplicate/i);
  assert.throws(()=>build([view(node300)],[node300,node320]),/Full original selected/);
  assert.throws(()=>build([view(node300)], [node309]),/Unselected/);
  assert.throws(()=>build([view(node300,{finalRevision:-1})]),/decision revisions/);
});

test('fail closed on forged or missing ranks, mass, units, untrusted stage',()=>{
  for(const corrupt of [
    {proposals:[{...p(1,35),unit:'lb'}]},
    {proposals:[{...p(1,35),value:0}]},
    {proposals:[{...p(1,35),ranking:0}]},
    {proposals:[p(1,35),p(1,35)]},
    {proposals:[p(2,35),p(1,35)]},
    {stage:'preview'},
  ]){
    assert.throws(()=>build([view(node300,corrupt)]));
  }
});

test('W1 source and served mirror remain exactly identical',async()=>{
  const a=await readFile(new URL('../converters/xml-cii2019-core/weight-reconciliation-read-model.js',import.meta.url));
  const b=await readFile(new URL('../docs/converters/xml-cii2019-core/weight-reconciliation-read-model.js',import.meta.url));
  assert.deepEqual(a,b);
});
