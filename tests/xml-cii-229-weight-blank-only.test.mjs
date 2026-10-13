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


async function t1StandaloneBridgeFixture(){
 const {installWeightBasisXmlDom}=await import('../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js');
 installWeightBasisXmlDom(globalThis);
 const parity=await import('../tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js');
 const {prepareStandaloneRigidWeightAuthority,applyStandaloneAcceptedRigidWeights}
  =await import('../tabs/xml-cii-2019-standalone/xml-cii-weight-output-authority.js');
 const branch='/SYS-1-8"-L-31441C4-X/B1',key=branch+'::20';
 const xml='<PipeStressExport><Pipe><Branch><Branchname>'+branch+'</Branchname>'
  +'<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><Endpoint>1</Endpoint><Position>0 0 0</Position></Node>'
  +'<Node><NodeNumber>20</NodeNumber><ComponentType>RIGID</ComponentType><Rigid>2</Rigid><Endpoint>2</Endpoint><ComponentRefNo>=A/20</ComponentRefNo><Position>112 0 0</Position><Weight>0</Weight></Node>'
  +'<Node><NodeNumber>30</NodeNumber><ComponentType>PIPE</ComponentType><Endpoint>1</Endpoint><Position>224 0 0</Position></Node>'
  +'</Branch></Pipe></PipeStressExport>';
 const config={
  rating:{tokenDelimiter:'-',pipingClassTokenIndex:5,ratingSequence:[['3','300']]},
  weight:{tokenDelimiter:'-',boreTokenIndex:3,masterRows:[{bore:25,rating:150,length:100,weight:3}],masterRevision:2},
 };
 const prep=(cfg,source)=>prepareStandaloneRigidWeightAuthority(
  parity,source,'',cfg,{splitCondensedValveFlange:true},{});
 const outputWeight=(source,authority)=>{
  const result=applyStandaloneAcceptedRigidWeights(source,authority);
  const doc=new DOMParser().parseFromString(result.xmlText,'application/xml');
  const target=[...doc.getElementsByTagName('Node')]
   .find(node=>node.getElementsByTagName('NodeNumber')[0]?.textContent==='20');
  assert.ok(target,'XML output still contains the same component identity');
  return Number(target.getElementsByTagName('Weight')[0]?.textContent);
 };
 const row=prep(config,xml).basisRows.find(x=>x.key===key);
 assert.ok(row,'real prepared geometry MUST include the original component');
 const metadata=buildXmlCiiRigidWeightMatch1Provenance(row,config,
  {selectedWeight:12.5,typeDesc:'RANKED-1'},{weightKg:12.5,acceptanceMethod:'candidate'});
 const saved={...config,overrides:{rigidWeight:{[key]:12.5},rigidWeightProposalMeta:{[key]:metadata}}};
 return {xml,key,config,saved,prep,outputWeight,changedXml:xml.replace('112 0 0','120 0 0')};
}

test('T1 bridge positive: unchanged suggestion and historic manual and Final maintain correct precedence',async()=>{
 const {xml,key,config,saved,prep,outputWeight,changedXml}=await t1StandaloneBridgeFixture();
 assert.equal(outputWeight(xml,prep(saved,xml)),12.5,
  'unchanged explicitly saved suggestion must remain usable');
 const historical={...config,overrides:{rigidWeight:{[key]:8.25}}};
 assert.equal(outputWeight(xml,prep(historical,xml)),8.25,
  'provenance-free historical manual overrides remain compatible');
 const final={...saved,overrides:{...saved.overrides,rigidWeightFinal:{[key]:17.75}}};
 assert.equal(outputWeight(changedXml,prep(final,changedXml)),17.75,
  'explicitly approved Final supersedes weaker stale suggestion');
});

test('T1 RED bridge geometry: changed source must not project a stale saved suggestion',async()=>{
 const {key,saved,prep,outputWeight,changedXml}=await t1StandaloneBridgeFixture();
 const updated=prep(saved,changedXml);
 assert.ok(updated.basisRows.some(x=>x.key===key),
  'same node identity survives geometry change; no false pass by vanished node');
 assert.equal(outputWeight(changedXml,updated),0,
  'stale provenance-bound accepted suggestion must not be projected to XML');
});

test('T1 RED bridge master: revised weight master must not project stale saved suggestion',async()=>{
 const {xml,config,saved,prep,outputWeight}=await t1StandaloneBridgeFixture();
 const revised={...saved,weight:{...config.weight,masterRevision:3}};
 assert.equal(outputWeight(xml,prep(revised,xml)),0,
  'stale suggestion must require review after master change');
});

test('T1 negative: corrupt, mismatched and missing-component legacy proposal provenance stays saved but cannot reach effective output',()=>{
 const key='/XML229-PROVENANCE/B1::20';
 const historicalKey='/XML229-PROVENANCE/B1::30';
 const issue={
  key,branchName:'/XML229-PROVENANCE/B1',nodeNumber:'20',endpoint:'2',
  componentType:'RIGID',componentRefNo:'=A/20',lengthMm:100,
  elementLengthSource:'geometry',boreMm:50,rating:'150',
 };
 const config={weight:{masterRevision:3,masterRows:[{weight:11.5}]}};
 const meta=buildXmlCiiRigidWeightMatch1Provenance(issue,config,{selectedWeight:11.5},{
  weightKg:11.5,acceptanceMethod:'candidate',
 });
 const saved={...config,overrides:{rigidWeight:{[key]:11.5,[historicalKey]:8.25},rigidWeightProposalMeta:{[key]:meta}}};
 const valid=buildXmlCiiValidatedRigidWeightLegacyView(saved,[issue]);
 assert.equal(valid.config.overrides.rigidWeight[key],11.5);
 assert.deepEqual(valid.validation.staleLegacyProposals,{});
 const scenarios=[
  ['missing-component',saved,[], 'component-not-found'],
  ['missing-provenance',{...saved,overrides:{...saved.overrides,rigidWeightProposalMeta:{[key]:{}}}},[issue],'invalid-proposal-provenance'],
  ['tampered-fingerprint',{...saved,overrides:{...saved.overrides,rigidWeightProposalMeta:{[key]:{...meta,fingerprint:'fnv1a:00000000'}}}},[issue],'invalid-proposal-fingerprint'],
  ['accepted-number-changed',{...saved,overrides:{...saved.overrides,rigidWeight:{[key]:13.5,[historicalKey]:8.25}}},[issue],'accepted-weight-changed'],
  ['rating-changed',saved,[{...issue,rating:'600'}],'basis-changed'],
  ['ref-changed',saved,[{...issue,componentRefNo:'=OTHER/20'}],'basis-changed'],
 ];
 for(const [label,input,issues,reason] of scenarios){
  const result=buildXmlCiiValidatedRigidWeightLegacyView(input,issues);
  assert.equal(result.config.overrides.rigidWeight[key],undefined,label+' must withhold saved candidate');
  assert.equal(result.config.overrides.rigidWeight[historicalKey],8.25,label+' must not affect historic no-metadata manual');
  assert.equal(result.validation.staleLegacyProposals[key]?.reason,reason,label+' must provide a review reason');
  assert.equal(input.overrides.rigidWeight[key],label==='accepted-number-changed'?13.5:11.5,
   label+' must retain original saved proposal for review');
  assert.ok(result.validation.suppressedLegacyKeys.includes(key),label+' flagged as withheld');
 }
});

test('T1 source/served rigid authority modules remain byte-for-byte identical',async()=>{
 const {readFile}=await import('node:fs/promises');
 const root=new URL('../converters/xml-cii2019-core/rigid-weight-authority.js',import.meta.url);
 const served=new URL('../docs/converters/xml-cii2019-core/rigid-weight-authority.js',import.meta.url);
 assert.equal(await readFile(root,'utf8'),await readFile(served,'utf8'));
});

test('T1 RED: Preview compatibility view must not re-enable an effective stale candidate suppressed by output authority',()=>{
 // Read the actual exported production Preview adapter used by the standalone UI.
 return import('../converters/xml-cii2019-core/rigid-weight-authority.js').then(({withXmlCiiEffectiveRigidWeightLegacyView})=>{
  const key='/XML229-PREVIEW/B1::20';
  const issue={key,branchName:'/XML229-PREVIEW/B1',nodeNumber:'20',
   endpoint:'2',componentType:'RIGID',componentRefNo:'=A/20',
   lengthMm:100,elementLengthSource:'geometry',boreMm:50,rating:'150'};
  const config={weight:{masterRevision:1,masterRows:[{weight:12.5}]}};
  const provenance=buildXmlCiiRigidWeightMatch1Provenance(issue,config,
   {selectedWeight:12.5},{weightKg:12.5,acceptanceMethod:'candidate'});
  const saved={...config,overrides:{
   rigidWeight:{[key]:12.5},
   rigidWeightProposalMeta:{[key]:provenance},
  }};
  const changedIssue={...issue,lengthMm:200};
  const validated=buildXmlCiiValidatedRigidWeightLegacyView(saved,[changedIssue]);
  assert.equal(validated.config.overrides.rigidWeight[key],undefined,
   'Run output authority now correctly withholds the stale suggestion');
  const preview=withXmlCiiEffectiveRigidWeightLegacyView(saved);
  assert.equal(preview.overrides.rigidWeight[key],undefined,
   'Preview raw compatibility path must never represent stale saved candidate as effective');
 });
});
