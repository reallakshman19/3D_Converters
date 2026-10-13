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

const XML229_A2_SOURCE='<PipeStressExport><Pipe><Branch><Branchname>/SYS-1-8&quot;-L-31441C4-X/B1</Branchname>'
 +'<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><Endpoint>1</Endpoint><Position>0 0 0</Position></Node>'
 +'<Node><NodeNumber>20</NodeNumber><ComponentType>RIGID</ComponentType><Rigid>2</Rigid><Endpoint>2</Endpoint><ComponentRefNo>=A/20</ComponentRefNo><Position>112 0 0</Position><Weight>0</Weight></Node>'
 +'<Node><NodeNumber>30</NodeNumber><ComponentType>PIPE</ComponentType><Endpoint>1</Endpoint><Position>224 0 0</Position></Node>'
 +'</Branch></Pipe></PipeStressExport>';
const XML229_A2_CONFIG={
 linelist:{masterRows:[]},pipingClass:{masterRows:[]},material:{mapRows:[]},
 rating:{tokenDelimiter:'-',pipingClassTokenIndex:5,ratingSequence:[['3','300']]},
 weight:{tokenDelimiter:'-',boreTokenIndex:3,masterRows:[{bore:25,rating:150,length:100,weight:3}],masterRevision:2},
};
const XML229_A2_BASIS='a'.repeat(64);
async function executeRealPreviewWorker({scope={},requestId='a2-real'}={}){
 const old={addEventListener:globalThis.addEventListener,postMessage:globalThis.postMessage,close:globalThis.close};
 let callback=null,closed=false;const events=[];
 globalThis.addEventListener=(kind,fn)=>{if(kind==='message')callback=fn;};
 globalThis.postMessage=(event)=>events.push(event);
 globalThis.close=()=>{closed=true;};
 try{
  await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-worker-entry.js?xml229-a2='+encodeURIComponent(requestId));
  assert.equal(typeof callback,'function','actual Preview Worker registers a message entrypoint');
  await callback({data:{
   protocol:'xml-cii-preview-local/1',kind:'execute',
   requestId,basisId:XML229_A2_BASIS,xmlText:XML229_A2_SOURCE,
   config:structuredClone(XML229_A2_CONFIG),stagedJsonText:'',scope,
  }});
  assert.equal(closed,true,'dedicated Worker closed after terminal event');
  return events;
 }finally{
  for(const [key,value] of Object.entries(old)){
   if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
 }
}
test('XML229 A2 real local Preview Worker emits source coverage but NOT governed Weight authority',async()=>{
 const events=await executeRealPreviewWorker({scope:{mode:'A',sourceId:'OWNER-1'}});
 const terminal=events.at(-1);
 assert.equal(terminal?.state,'completed',
  'actual unscoped worker must successfully compute source facts: '+JSON.stringify(terminal?.error));
 assert.equal(terminal?.result?.engineeringAcceptance,'NOT_ASSESSED');
 assert.equal(terminal?.result?.fullFactPopulationAccepted,false);
 assert.ok(terminal.result.sourceOccurrences.nodeCount>=3);
 assert.equal(terminal.result.coverage.engineeringBranchCount,
  terminal.result.coverage.sourceBranchCount);
 const {createGcPwPreviewWorkerFactPort}=await import('../tabs/xml-cii-2019-standalone/integration/gc-pw-preview-worker-fact-port.js');
 const port=createGcPwPreviewWorkerFactPort({
  startJob:({basis,requestId})=>({basisId:basis.basisId,requestId,
    promise:Promise.resolve(terminal.result),cancel:()=>{}}),
  openFactModel:()=>{throw new Error('MUST NOT read source-only worker as approved engineering facts');},
  expectedOriginalOccurrences:[
   {sourceId:'OWNER-1',subjectType:'branch',occurrenceId:JSON.stringify(['OWNER-1',0,null,''])},
   ...[0,1,2].map(n=>({sourceId:'OWNER-1',subjectType:'node',occurrenceId:JSON.stringify(['OWNER-1',0,n,''])})),
  ],
  expectedOriginalCount:4,expectedModelOccurrenceCount:5,expectedPhysicalFactCount:7,
 });
 const {webcrypto}=await import('node:crypto');
 if(!globalThis.crypto)globalThis.crypto=webcrypto;
 const {createPreviewBasis}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js');
 const {digestUtf8}=await import('../contracts/gc-pw-v1/contract.mjs');
 const basis=await createPreviewBasis({
  domainId:'xml-cii/2019',
  sources:[{sourceId:'OWNER-1',mediaType:'application/xml',text:XML229_A2_SOURCE}],
  selection:[{sourceId:'OWNER-1',selectionRef:'all'}],
  masters:{weight:{datasetId:'weight-fixture',revision:2,rows:XML229_A2_CONFIG.weight.masterRows,mapping:{}}},
  stagedSource:null,config:XML229_A2_CONFIG,overrides:{},sha256:digestUtf8,
 });
 await assert.rejects(port({
  basis,requestId:'A2-VERIFY',report:()=>{},isCancelled:()=>false,
 }),e=>e?.code==='ENGINEERING_NOT_VERIFIED',
  'source-only completed real Worker must not reach the fact reader or Weight review');
});
test('XML229 A2 actual local Preview Worker rejects selected-zone compute before falsely deriving ALL',async()=>{
 const events=await executeRealPreviewWorker({scope:{mode:'A',sourceId:'OWNER-1',selection:[{zone:'ZONE-1'}]},requestId:'a2-selected'});
 const terminal=events.at(-1);
 assert.equal(terminal?.state,'failed','selected source must fail closed without scoped adapter');
 assert.equal(terminal?.error?.code,'SCOPED_ENGINEERING_PENDING');
 assert.ok(!events.some(e=>e.state==='completed'));
});
