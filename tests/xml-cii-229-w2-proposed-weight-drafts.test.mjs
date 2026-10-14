import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {proposeXmlCiiWeightDraft,explainXmlCiiBlankWeightFill}
  from '../converters/xml-cii2019-core/weight-proposal-draft-ui.js';
const candidate=(weight,extras={})=>({
  selectedWeight:weight,preferred:true,lengthQualified:true,ratingExact:true,
  weightMethod:'exact',...extras,
});
const issue=(key,candidates=[candidate(35)],extra={})=>({
  key,weight:null,mapped:false,staleMatch1:null,candidates,...extra,
});
const plan=(x,config={})=>proposeXmlCiiWeightDraft({issue:x,config});
test('35kg unique direct candidate is an editable display-only draft',()=>{
 const source=issue('RIGID300');
 const x=plan(source);
 assert.equal(x.status,'ELIGIBLE_DRAFT');
 assert.equal(x.draftKg,35);
 assert.equal(x.proposedKg,35);
 assert.equal(x.authority,'UNACCEPTED_DISPLAY_ONLY');
 assert.equal(x.accepted,false);
 assert.deepEqual(x.alternatives,[35]);
 assert.deepEqual(source.candidates,[candidate(35)]);
 assert.ok(Object.isFrozen(x));
});
test('166 vs 218kg valve alternatives appear but cannot auto-stage',()=>{
 const x=plan(issue('VALV309',[candidate(166),candidate(218,{preferred:false})]));
 assert.equal(x.status,'NEEDS_ENGINEERING_REVIEW');
 assert.equal(x.draftKg,null);
 assert.equal(x.proposedKg,166);
 assert.deepEqual(x.alternatives,[166,218]);
});
test('existing accepted source, Match-1, Final, proposal metadata and stale state cannot stage',()=>{
 const target=issue('RIGID350');
 for(const [config,changed] of [
  [{overrides:{rigidWeight:{RIGID350:35}}},target],
  [{overrides:{rigidWeightMatch1:{RIGID350:35}}},target],
  [{overrides:{rigidWeightFinal:{RIGID350:35}}},target],
  [{overrides:{rigidWeightProposalMeta:{RIGID350:{state:'stale'}}}},target],
  [{},issue('RIGID350',target.candidates,{weight:35,mapped:true})],
  [{},issue('RIGID350',target.candidates,{staleMatch1:{reason:'old basis'}})],
 ]){
  const x=plan(changed,config);
  assert.equal(x.status,'EXISTING_OR_STALE_AUTHORITY');
  assert.equal(x.draftKg,null);
 }
});
test('inferred or warning candidate cannot auto-stage even when first',()=>{
 for(const extras of [{preferred:false},{inferredWeight:true},{oddEntry:true},
 {specialFactorRule:true},{zeroFallback:true},{weightMethod:'extrapolated'}]){
  assert.notEqual(plan(issue('x',[candidate(35,extras)])).status,'ELIGIBLE_DRAFT');
 }
});
test('same-kg independent corroborations may stage, no candidate returns no draft',()=>{
 assert.equal(plan(issue('x',[candidate(35),candidate(35,{preferred:false})])).draftKg,35);
 assert.equal(plan(issue('x',[])).status,'NO_CANDIDATE');
});
test('blank-only accepted selection is unchanged and independent of displayed draft',()=>{
 const x=plan(issue('row'));
 assert.equal(x.draftKg,35);
 const i={value:'',dataset:{wmAccepted:'false'}};
 assert.equal(i.value,'','draft must not write accepted input');
});
test('blank-only rejection diagnostic has a row-level reason; does not alter selection',()=>{
 const fresh=issue('RIGID300');
 const input={value:'',dataset:{wmAccepted:'false'}};
 let result=explainXmlCiiBlankWeightFill({input,issue:fresh,config:{}});
 assert.equal(result.code,'ELIGIBLE');
 assert.equal(result.selection.weight,35);
 result=explainXmlCiiBlankWeightFill({input:{value:'35',dataset:{}},issue:fresh,config:{}});
 assert.equal(result.code,'NONBLANK_WEIGHT_INPUT');
 result=explainXmlCiiBlankWeightFill({input,issue:fresh,config:{
  overrides:{rigidWeightProposalMeta:{RIGID300:{acceptanceMethod:'candidate'}}},
 }});
 assert.equal(result.code,'STORED_DECISION_OR_PROPOSAL');
 result=explainXmlCiiBlankWeightFill({input,issue:issue('RIGID300',[candidate(35)],
  {staleMatch1:{reason:'master changed'}}),config:{}});
 assert.equal(result.code,'STALE_MATCH1');
 result=explainXmlCiiBlankWeightFill({input,issue:issue('RIGID300',[candidate(35)],
  {mapped:true,weight:35}),config:{}});
 assert.equal(result.code,'EXISTING_ACCEPTED_WEIGHT');
 result=explainXmlCiiBlankWeightFill({input,issue:issue('RIGID300',[]),config:{}});
 assert.equal(result.code,'NO_QUALIFIED_BLANK_FILL_CANDIDATE');
 assert.equal(result.eligible,false);
});

test('tab/docs mirrors are byte-equal',async()=>{
 for(const path of [
  'converters/xml-cii2019-core/weight-proposal-draft-ui.js',
  'tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js',
 ]){
  assert.deepEqual(await readFile(new URL('../'+path,import.meta.url)),
   await readFile(new URL('../docs/'+path,import.meta.url)));
 }
});
