import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectXmlCiiFinalReviewRow}
  from '../converters/xml-cii2019-core/weight-final-review-reconciliation.js';

const exact=kg=>({selectedWeight:kg,preferred:true,lengthQualified:true,
  ratingExact:true,weightMethod:'master-exact'});
const issue=(key,candidates=[exact(35)],extras={})=>({
  key,originalWeight:null,staleMatch1:null,candidates,...extras,
});
const run=(row,config={})=>projectXmlCiiFinalReviewRow(row,config);

test('35kg unambiguous physical RIGID is display-only, never Final or Match-1',()=>{
 const row=run(issue('RIGID300'));
 assert.equal(row.draftKg,35);
 assert.equal(row.proposedKg,35);
 assert.equal(row.proposalStatus,'UNACCEPTED_DRAFT');
 assert.equal(row.engineeringAccepted,false);
 assert.equal(row.match1Kg,null);
 assert.equal(row.finalKg,null);
 assert.equal(row.proposalOrigin,'FINAL_REVIEW_LOCAL_RANKING_UNVERIFIED_MATCH1_PARITY');
 assert.ok(Object.isFrozen(row));
});
test('166 and 218 valve proposals visible but require explicit review',()=>{
 const row=run(issue('VALV309',[exact(166),{...exact(218),preferred:false}]));
 assert.equal(row.draftKg,null);
 assert.equal(row.proposedKg,166);
 assert.equal(row.proposalStatus,'CONFLICTING_CANDIDATES');
 assert.deepEqual(row.alternatives,[166,218]);
});
test('all source XML, accepted Match-1 and Final weights remain separate',()=>{
 const config={overrides:{
  rigidWeightMatch1:{RIGID300:40},
  rigidWeightFinal:{RIGID300:55},
  rigidWeight:{RIGID300:40},
 }};
 const row=run(issue('RIGID300',[exact(35)],{originalWeight:25}),config);
 assert.deepEqual([row.sourceKg,row.match1Kg,row.finalKg],[25,40,55]);
 assert.equal(row.proposedKg,35);
 assert.equal(row.draftKg,null);
 assert.equal(config.overrides.rigidWeightFinal.RIGID300,55);
});
test('stale Match-1 cannot display as accepted, nor auto-draft over provenance',()=>{
 const config={overrides:{rigidWeightMatch1:{RIGID300:40}}};
 const row=run(issue('RIGID300',[exact(35)],{staleMatch1:{reason:'changed master'}}),config);
 assert.equal(row.match1Kg,null);
 assert.equal(row.match1StoredKg,40);
 assert.equal(row.match1Stale,true);
 assert.equal(row.draftKg,null);
});
test('existing legacy saved mass, source mass, Final mass, and inferred weights block draft',()=>{
 assert.equal(run(issue('k'),{overrides:{rigidWeight:{k:35}}}).draftKg,null);
 assert.equal(run(issue('k',[exact(35)],{originalWeight:100})).draftKg,null);
 assert.equal(run(issue('k'),{overrides:{rigidWeightFinal:{k:35}}}).draftKg,null);
 assert.equal(run(issue('k',[{...exact(35),inferredWeight:true}])).draftKg,null);
});
test('root/docs mirrors match bytes exactly',async()=>{
 for(const path of [
  'converters/xml-cii2019-core/weight-final-review-reconciliation.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-rigid-review-mode-a.js',
 ]){
  const a=await readFile(new URL('../'+path,import.meta.url));
  const b=await readFile(new URL('../docs/'+path,import.meta.url));
  assert.deepEqual(a,b);
 }
});
