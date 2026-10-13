import assert from 'node:assert/strict';
import test from 'node:test';
import { selectXmlCiiBlankWeightSuggestion as choose } from '../converters/xml-cii2019-core/weight-blank-fill-policy.js';
const issue=()=>({key:'branch-1/RIGID/04',mapped:false,weight:null,candidates:[
  {selectedWeight:12.5,preferred:true},
  {selectedWeight:13,preferred:false},
]});
const input=(value='',accepted='false')=>({value,dataset:{wmAccepted:accepted}});
const check=(opts)=>choose({input:input(),issue:issue(),config:{},...opts});

test('true blank row selects highest-ranked positive safe suggestion',()=>{
 const selected=check();assert.equal(selected?.weight,12.5);
 assert.equal(selected?.candidate.preferred,true);
});
test('nonblank typed/manual Weight(kg) NEVER changes, including a value equal to the suggestion',()=>{
 for(const value of ['12.5','99','0','-1','1e0','  0  '])assert.equal(check({input:input(value)}),null,value);
});
test('mapped, accepted, source-valued and stale Match-1 rows never accept a bulk overwrite',()=>{
 for(const patch of [{mapped:true},{weight:7.5},{staleMatch1:{reason:'basis-changed'}}]){
  assert.equal(check({issue:{...issue(),...patch}}),null,JSON.stringify(patch));
 }
 assert.equal(check({input:input('','true')}),null);
});
test('any existing legacy, Match-1, Final or saved provenance entry protects the row, even if equal',()=>{
 for(const bucket of ['rigidWeightFinal','rigidWeightMatch1','rigidWeight','rigidWeightProposalMeta','rigidWeightMatch1Provenance']){
  for(const value of [12.5,22,{acceptanceMethod:'manual'}]){
    assert.equal(check({config:{overrides:{[bucket]:{[issue().key]:value}}}}),null,bucket+':'+String(value));
  }
 }
});
test('top invalid, rejected, zero-fallback or odd candidate is ignored, next eligible rank used',()=>{
 const possibilities=[
 {selectedWeight:0,preferred:true},{selectedWeight:4,zeroFallback:true},
 {selectedWeight:6,rejectedReason:'length out of tolerance'},
 {selectedWeight:9,oddEntry:true},
 {selectedWeight:11.7},
 {selectedWeight:15},
 ];
 assert.equal(check({issue:{...issue(),candidates:possibilities}})?.weight,11.7);
 assert.equal(check({issue:{...issue(),candidates:possibilities.slice(0,4)}}),null);
});
test('missing config, missing key or missing candidate cannot write',()=>{
 assert.equal(check({issue:{...issue(),key:''}}),null);
 assert.equal(check({issue:{...issue(),candidates:[]}}),null);
 assert.equal(check({input:null}),null);
 assert.equal(check({issue:null}),null);
});
test('blank whitespace only is allowed unless saved nonblank weight, including stale matching value',()=>{
 assert.equal(check({input:input('  ')})?.weight,12.5);
 assert.equal(check({config:{overrides:{rigidWeight:{[issue().key]:' 12.5 '}}}}),null);
});

import {
  buildXmlCiiRigidWeightMatch1Provenance,
  buildXmlCiiValidatedRigidWeightLegacyView,
  withXmlCiiRigidWeightFinal,
} from '../converters/xml-cii2019-core/rigid-weight-authority.js';

// T1 RED oracle: an explicit accepted suggestion is saved to the legacy bucket
// with basis-bound proposal metadata, NOT the governed Match-1 bucket.
// No production behavior or historical no-metadata manual override is edited.
test('T1 RED: provenance-bearing legacy suggestion cannot survive changed physical basis',()=>{
 const key='/XML229-STALENESS/B1::20';
 const unchangedKey='/XML229-MANUAL/B1::30';
 const finalKey='/XML229-FINAL/B1::40';
 const issue={
  key,branchName:'/XML229-STALENESS/B1',nodeNumber:'20',endpoint:'2',
  componentType:'RIGID',componentRefNo:'=A/20',lengthMm:100,
  elementLengthSource:'geometry',boreMm:50,rating:'150',
 };
 const weight={masterRevision:1,masterRows:[{type:'RIGID',rating:150,bore:50,weight:12.5}]};
 const baseConfig={weight};
 const provenance=buildXmlCiiRigidWeightMatch1Provenance(issue,baseConfig,
  {selectedWeight:12.5,typeDesc:'ROW-1'}, {weightKg:12.5,acceptanceMethod:'candidate'});
 const saved={
  weight,
  overrides:{
   rigidWeight:{[key]:12.5,[unchangedKey]:8.25},
   rigidWeightProposalMeta:{[key]:provenance},
  },
 };
 const before=buildXmlCiiValidatedRigidWeightLegacyView(saved,[issue]);
 assert.equal(before.config.overrides.rigidWeight[key],12.5,'unchanged explicit saved suggestion remains available');
 const changedBasis=buildXmlCiiValidatedRigidWeightLegacyView(saved,[{...issue,lengthMm:200}]);
 assert.equal(changedBasis.config.overrides.rigidWeight[key],undefined,
  'basis-changed suggestion must not be projected solely from the legacy numeric override');
 assert.equal(changedBasis.config.overrides.rigidWeight[unchangedKey],8.25,
  'historical provenance-free manual override must keep its separate compatibility contract');
 const final=withXmlCiiRigidWeightFinal(saved,{[finalKey]:42});
 assert.equal(buildXmlCiiValidatedRigidWeightLegacyView(final,[{...issue,lengthMm:200}])
  .config.overrides.rigidWeight[finalKey],42,'governed Final remains higher authority');
});

test('T1 RED: master-revised saved suggestion must require renewed review',()=>{
 const key='/XML229-STALENESS/B1::21';
 const issue={key,branchName:'/XML229-STALENESS/B1',nodeNumber:'21',
  endpoint:'2',componentType:'RIGID',componentRefNo:'=B/21',lengthMm:100,
  elementLengthSource:'geometry',boreMm:50,rating:'150'};
 const config={weight:{masterRevision:1,masterRows:[{weight:12.5}]}};
 const provenance=buildXmlCiiRigidWeightMatch1Provenance(issue,config,
  {selectedWeight:12.5,typeDesc:'ROW-2'},{weightKg:12.5,acceptanceMethod:'candidate'});
 const accepted={...config,overrides:{
  rigidWeight:{[key]:12.5},
  rigidWeightProposalMeta:{[key]:provenance},
 }};
 assert.equal(buildXmlCiiValidatedRigidWeightLegacyView(accepted,[issue])
  .config.overrides.rigidWeight[key],12.5);
 const revised={...accepted,weight:{...config.weight,masterRevision:2}};
 assert.equal(buildXmlCiiValidatedRigidWeightLegacyView(revised,[issue])
  .config.overrides.rigidWeight[key],undefined,
  'stale saved suggestion must fail closed after master revision');
});
