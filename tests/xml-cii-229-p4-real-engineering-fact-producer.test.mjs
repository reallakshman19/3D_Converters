import './xml229-g3-candidate-readiness-reconciliation.test.mjs';
import './xml229-cross-worker-flow-trace.test.mjs';
import './xml229-cross-worker-flow-audit.test.mjs';
import './xml229-g3g4-local-aggregate-export.test.mjs';
import './xml229-g3-candidate-coverage.test.mjs';
import './xml-cii-preview-strict-line-authority.test.mjs';
import './xml-cii-229-independent-preview-worker.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {xmlCiiDryRunPreview} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js';
import {projectXmlCiiOccurrences} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import {createPreviewBasis} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-basis.js';
import {digestUtf8} from '../contracts/gc-pw-v1/contract.mjs';
import {openXml229EngineeringFactModel,XML229_ENGINEERING_FIELDS}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-preview-engineering-fact-producer.mjs';
import {createGcPwPreviewWorkerFactPort}
 from '../tabs/xml-cii-2019-standalone/integration/gc-pw-preview-worker-fact-port.js';
import {openGcPwPreviewWeightSession}
 from '../tabs/xml-cii-2019-standalone/integration/gc-pw-preview-weight-session.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
installWeightBasisXmlDom(globalThis);
const SOURCE_ID='ORIGINAL-P4';
const XML=`<?xml version="1.0"?>
<PipeStressExport><Pipe><Branch><Branchname>/ASIM-1836-8"-P8810021-31441C4-PP/B4</Branchname>
<Node><NodeNumber>280</NodeNumber><ComponentType>GASK</ComponentType>
<ElementLengthMm>2</ElementLengthMm><Position>0 0 0</Position></Node>
<Node><NodeNumber>300</NodeNumber><ComponentType>RIGID</ComponentType>
<ComponentRefNo>1006649732/119364</ComponentRefNo><Endpoint>2</Endpoint>
<BoreMm>200</BoreMm><Rigid>2</Rigid><ElementLengthMm>112</ElementLengthMm>
<Position>112 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>309</NodeNumber><ComponentType>VALV</ComponentType>
<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>
<BoreMm>200</BoreMm><ElementLengthMm>419</ElementLengthMm>
<Position>531 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>320</NodeNumber><ComponentType>INST</ComponentType>
<ComponentRefNo>1006649732/119369</ComponentRefNo><Endpoint>2</Endpoint>
<Position>650 0 0</Position><Weight>0</Weight></Node>
</Branch></Pipe></PipeStressExport>`;
const masters={weight:{datasetId:'valve-master',revision:'v1',
 rows:[{Rating:'300',Bore:200,Length:112,'RF/RTJ KG':35}],
 mapping:{weight:'RF/RTJ KG'}}};
const config={weight:{masterRows:masters.weight.rows},overrides:{}};
const selection=[{sourceId:SOURCE_ID,selectionRef:'all'}];
const live={sources:{[SOURCE_ID]:XML},masters,selection,stagedSource:null,config,overrides:{}};
const source=()=>projectXmlCiiOccurrences({xmlText:XML,sourceId:SOURCE_ID});
async function fixture(previewOverride=null,liveOverride={}){
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
   sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:XML}],
   masters,selection,config,overrides:{},sha256:digestUtf8});
 const real=xmlCiiDryRunPreview(XML,config,'');
 const original=source();
 const preview=previewOverride?previewOverride(real,original):real;
 const result={...preview,sourceOccurrences:original,
   engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false};
 return {basis,result,original,live:{...live,...liveOverride}};
}
const getCode=(code)=>err=>(assert.equal(err?.code,code,err?.stack),true);
test('actual XML Preview computation is independently assessed into COMPLETE source-bound facts',async()=>{
 const f=await fixture();
 const positive=await openXml229EngineeringFactModel({
  basis:f.basis,live:f.live,xmlText:XML,sourceId:SOURCE_ID,previewResult:f.result,
  expectedOriginalCount:f.original.branchCount+f.original.nodeCount});
 assert.equal(positive.workerResult.engineeringAcceptance,'VERIFIED');
 assert.equal(positive.workerResult.fullFactPopulationAccepted,true);
 assert.equal(positive.model.info.engineeringReady,true);
 assert.equal(positive.model.info.computationStage,'engineering-verified');
 assert.equal(positive.workerOriginalCount,5); // 1 branch + 4 original nodes, including dropped GASK
 assert.equal(positive.expectedOriginalCount,4);
 assert.equal(positive.physicalOccurrences.length,3); // GASK is not a physical weight owner
 assert.equal(positive.expectedPhysicalFactCount,3*XML229_ENGINEERING_FIELDS.length);
 // Native must consume this exact finalized PRE-acceptance geometry.
 assert.equal(positive.finalizedGeometry.schema,'XML229.FinalizedWeightGeometry.v1');
 assert.equal(positive.finalizedGeometry.basisId,f.basis.basisId);
 assert.equal(positive.finalizedGeometry.sourceXmlSha256,f.basis.sourceRefs[0].sha256);
 assert.equal(positive.finalizedGeometry.sha256,
   await digestUtf8(positive.finalizedGeometry.xmlText));
 assert.deepEqual(positive.finalizedGeometry.retainedSourceOrdinalsByBranch,
   [[1,2,3]],'Worker removes original GASK but retains physical source ordinals');
 assert.equal(positive.finalizedGeometry.originalNodeCount,4);
 assert.ok(!positive.finalizedGeometry.xmlText.includes('<ComponentType>GASK</ComponentType>'));
 assert.ok(positive.finalizedGeometry.xmlText.includes('<ComponentType>RIGID</ComponentType>'));
 assert.equal(positive.physicalOccurrences[0].nodeOrdinal,1);
 assert.equal(positive.physicalOccurrences[1].nodeOrdinal,2);
 assert.equal(positive.physicalOccurrences[2].nodeOrdinal,3);
 const all=await positive.model.getFacts({basisId:f.basis.basisId,subjectType:'physical-component',limit:100});
 assert.equal(all.totalCount,positive.expectedPhysicalFactCount);
 assert.equal(all.items.length,all.totalCount);
 const byId=new Map();
 for(const item of all.items){
  if(!byId.has(item.occurrenceId))byId.set(item.occurrenceId,[]);
  byId.get(item.occurrenceId).push(item);
 }
 assert.equal(byId.size,3);
 for(const items of byId.values()){
  assert.deepEqual(new Set(items.map(i=>i.fieldId)),new Set(XML229_ENGINEERING_FIELDS));
  assert(items.every(i=>i.provenance?.[0]?.sourceRef===SOURCE_ID));
 }
 const row300=byId.get(positive.physicalOccurrences[0].occurrenceId);
 assert.equal(row300.find(x=>x.fieldId==='length.mm').value,112);
 assert.equal(row300.find(x=>x.fieldId==='mass.kg').authority,'unresolved');
 assert.equal(row300.find(x=>x.fieldId==='mass.kg').value,null);
 assert.equal(positive.workerResult.branchRows.length,1);
});
test('nonpositive original node IDs receive source-ordinal-attested positive IDs before Final',async()=>{
 const xml=XML.replace('<NodeNumber>309</NodeNumber>','<NodeNumber>-1</NodeNumber>');
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
  sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml}],
  masters,selection,config,overrides:{},sha256:digestUtf8});
 const orig=projectXmlCiiOccurrences({xmlText:xml,sourceId:SOURCE_ID});
 const preview=xmlCiiDryRunPreview(xml,config,'');
 const open=await openXml229EngineeringFactModel({
  basis,live:{...live,sources:{[SOURCE_ID]:xml}},
  xmlText:xml,sourceId:SOURCE_ID,
  previewResult:{...preview,sourceOccurrences:orig,
    engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
  expectedOriginalCount:orig.branchCount+orig.nodeCount,
 });
 assert.deepEqual(open.finalizedGeometry.assignedNodeNumbers,[{
   branchOccurrenceIndex:0,sourceNodeOrdinal:2,
   sourceNodeNumber:'-1',finalNodeNumber:330,
 }]);
 assert.match(open.finalizedGeometry.xmlText,/<NodeNumber>330<\/NodeNumber>/);
 assert.equal(open.physicalOccurrences[1].nodeOrdinal,2,
   'mass owner retains the ORIGINAL ordinal, not the new engine NodeNumber');
 assert.equal(open.finalizedGeometry.sha256,
   await digestUtf8(open.finalizedGeometry.xmlText));
});

test('physical endpoint pairs are identified before accepting weights, without merging facts',async()=>{
 const pairedXml=XML
  .replace('<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>',
           '<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>1</Endpoint>')
  .replace('<ComponentType>INST</ComponentType>',
           '<ComponentType>VALV</ComponentType>')
  .replace('<ComponentRefNo>1006649732/119369</ComponentRefNo>',
           '<ComponentRefNo>1006649732/119367</ComponentRefNo>');
 assert.notEqual(pairedXml,XML);
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
   sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:pairedXml}],
   masters,selection,config,overrides:{},sha256:digestUtf8});
 const original=projectXmlCiiOccurrences({xmlText:pairedXml,sourceId:SOURCE_ID});
 const preview=xmlCiiDryRunPreview(pairedXml,config,'');
 const opened=await openXml229EngineeringFactModel({
  basis,live:{...live,sources:{[SOURCE_ID]:pairedXml}},
  xmlText:pairedXml,sourceId:SOURCE_ID,
  previewResult:{...preview,sourceOccurrences:original,
   engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
  expectedOriginalCount:original.branchCount+original.nodeCount,
 });
 const topology=opened.finalizedGeometry.physicalOwnerCardinality;
 assert.equal(topology.weightsAccepted,false);
 assert.equal(topology.sourcePhysicalNodeOccurrences,3);
 assert.equal(topology.reviewedPhysicalNodeOccurrences,2);
 assert.equal(opened.physicalOccurrences.length,2);
 assert.equal(topology.pairedEndpointPhysicalParts,1);
 assert.equal(topology.distinctPhysicalPartCandidates,2);
 assert.equal(topology.endpointPairs[0].firstIsWeightOwner,false);
 assert.equal(topology.endpointPairs[0].secondIsWeightOwner,true);
 assert.equal(topology.endpointPairs[0].componentType,'VALV');
 assert.equal(opened.finalizedGeometry.rigidEdgePromotions.length,1);
 assert.equal(opened.finalizedGeometry.rigidEdgePromotions[0].componentType,'VALV');
 assert(opened.finalizedGeometry.rigidEdgePromotions[0].distanceMm>6);
 assert.equal(topology.endpointPairs[0].componentRefNo,'1006649732/119367');
 assert.notEqual(topology.endpointPairs[0].firstOccurrenceId,
                 topology.endpointPairs[0].secondOccurrenceId);
 assert.equal(opened.finalizedGeometry.sha256,
              await digestUtf8(opened.finalizedGeometry.xmlText));
});

test('instrument pair suggests but never requires classification or modifies Rigid',async()=>{
 const xml=XML.replace('<ComponentType>VALV</ComponentType>',
                       '<ComponentType>INST</ComponentType>')
  .replace('<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>',
           '<ComponentRefNo>1006649732/119369</ComponentRefNo><Endpoint>1</Endpoint>');
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
  sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml}],
  masters,selection,config,overrides:{},sha256:digestUtf8});
 const original=projectXmlCiiOccurrences({xmlText:xml,sourceId:SOURCE_ID});
 const preview=xmlCiiDryRunPreview(xml,config,'');
 const opened=await openXml229EngineeringFactModel({
  basis,live:{...live,sources:{[SOURCE_ID]:xml}},xmlText:xml,
  sourceId:SOURCE_ID,
  previewResult:{...preview,sourceOccurrences:original,
   engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
  expectedOriginalCount:original.branchCount+original.nodeCount,
 });
 const final=opened.finalizedGeometry;
 assert.equal(final.instrumentModelingSuggestions.length,1);
 assert.equal(final.instrumentModelingSuggestions[0].status,'OPTIONAL_REVIEW');
 assert.equal(final.instrumentModelingSuggestions[0].approvalRequiredToView,false);
 assert.equal(final.instrumentModelingSuggestions[0].automaticClassificationApplied,false);
 assert.equal(final.instrumentModelingSuggestions[0].sourceWeightIsAccepted,false);
 assert.equal(final.rigidEdgePromotions.length,0);
 assert.equal(final.physicalOwnerCardinality.distinctPhysicalPartCandidates,2);
 assert.equal(opened.physicalOccurrences.length,2);
 assert.match(final.xmlText,/<ComponentType>INST<\/ComponentType>/);
 assert.equal(await digestUtf8(final.xmlText),final.sha256);
});

test('FLAN/VALV first-end witness delegates to existing same-ref RIGID mass owner before review',async()=>{
 const xml=XML.replace(
  '<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>',
  '<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>1</Endpoint>')
  .replace('<ComponentType>INST</ComponentType>','<ComponentType>RIGID</ComponentType>')
  .replace('<ComponentRefNo>1006649732/119369</ComponentRefNo>',
   '<ComponentRefNo>1006649732/119367</ComponentRefNo>')
  .replace('<Position>650 0 0</Position><Weight>0</Weight>',
   '<Position>650 0 0</Position><Rigid>2</Rigid><Weight>0</Weight>');
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
   sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml}],
   masters,selection,config,overrides:{},sha256:digestUtf8});
 const original=projectXmlCiiOccurrences({xmlText:xml,sourceId:SOURCE_ID});
 const preview=xmlCiiDryRunPreview(xml,config,'');
 const opened=await openXml229EngineeringFactModel({
  basis,live:{...live,sources:{[SOURCE_ID]:xml}},xmlText:xml,
  sourceId:SOURCE_ID,previewResult:{...preview,sourceOccurrences:original,
   engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
  expectedOriginalCount:original.branchCount+original.nodeCount,
 });
 const card=opened.finalizedGeometry.physicalOwnerCardinality;
 assert.equal(card.sourcePhysicalNodeOccurrences,3);
 assert.equal(card.reviewedPhysicalNodeOccurrences,2);
 assert.equal(card.pairedEndpointPhysicalParts,1);
 assert.equal(card.endpointPairs[0].componentType,'VALV');
 assert.equal(card.endpointPairs[0].firstIsWeightOwner,false);
 assert.equal(card.endpointPairs[0].secondIsWeightOwner,true);
 assert.equal(opened.physicalOccurrences.length,2);
 assert.deepEqual(opened.physicalOccurrences.map(x=>x.nodeOrdinal),[1,3]);
 assert.equal(opened.finalizedGeometry.rigidEdgePromotions.length,0,
   'the source RIGID is already the mass-bearing CII edge; no new marker');
});

test('actual verified Preview result enters GC-PW Weight session via the EXISTING strict port',async()=>{
 const f=await fixture();
 const prepared=await openXml229EngineeringFactModel({
  basis:f.basis,live:f.live,xmlText:XML,sourceId:SOURCE_ID,previewResult:f.result,
  expectedOriginalCount:f.original.branchCount+f.original.nodeCount});
 const bridge=createGcPwPreviewWorkerFactPort({
  startJob:({basis,requestId})=>({basisId:basis.basisId,requestId,
    promise:Promise.resolve(prepared.workerResult),cancel:()=>true}),
  openFactModel:()=>prepared.model,
  expectedOriginalOccurrences:prepared.sourceOccurrenceCensus,
  expectedOriginalCount:prepared.workerOriginalCount,
  expectedModelOccurrenceCount:prepared.expectedModelOccurrenceCount,
  expectedPhysicalFactCount:prepared.expectedPhysicalFactCount,pageSize:4,
 });
 const session=await openGcPwPreviewWeightSession({
  sources:[{sourceId:SOURCE_ID,text:XML,mediaType:'application/xml'}],
  masters,selection,config,overrides:{},
  originalOccurrences:prepared.originalOccurrences,
  expectedOriginalCount:prepared.expectedOriginalCount,
  physicalOccurrences:prepared.physicalOccurrences,
  requiredFieldIds:prepared.requiredFieldIds,requestId:'P4-real-original-preview',
  loadFactPages:bridge,
 });
 const ready=await session.awaitReady();
 assert.equal(ready.openedFacts,3*XML229_ENGINEERING_FIELDS.length);
 assert.equal(ready.review.getDecisionState({basisId:ready.basis.basisId,scopeId:SOURCE_ID,
  stage:'RigidMatch1'}).decisionRevision,null);
 assert.equal(ready.review.getDecisionState({basisId:ready.basis.basisId,scopeId:SOURCE_ID,
  stage:'Rigidmatch2'}).decisionRevision,null);
});
test('no fact population promotion if original source branch/node identities drift',async()=>{
 const f=await fixture();
 const wrong=structuredClone(f.result);wrong.sourceOccurrences.nodes[1].occurrenceId='fake-node';
 await assert.rejects(openXml229EngineeringFactModel({basis:f.basis,live:f.live,
  xmlText:XML,sourceId:SOURCE_ID,previewResult:wrong,expectedOriginalCount:5}),
  getCode('ORIGINAL_OCCURRENCE_ID_DRIFT'));
});
test('changed master bytes with same cardinality cannot claim VERIFIED',async()=>{
 const f=await fixture();
 const changed=structuredClone(masters);changed.weight.rows[0]['RF/RTJ KG']=88;
 await assert.rejects(openXml229EngineeringFactModel({basis:f.basis,
  live:{...f.live,masters:changed},xmlText:XML,sourceId:SOURCE_ID,
  previewResult:f.result,expectedOriginalCount:5}));
});
test('wrong original selection, out-of-scope source and omitted physical node fail closed',async()=>{
 const f=await fixture();
 const input={basis:f.basis,live:f.live,xmlText:XML,sourceId:SOURCE_ID,
  previewResult:f.result,expectedOriginalCount:5};
 await assert.rejects(openXml229EngineeringFactModel({...input,expectedOriginalCount:4}),
  getCode('INDEPENDENT_CENSUS_MISMATCH'));
 await assert.rejects(openXml229EngineeringFactModel({...input,maxPhysical:2}),
  getCode('PHYSICAL_POPULATION_LIMIT'));
 const bad=structuredClone(f.result);bad.branchRows=[];
 await assert.rejects(openXml229EngineeringFactModel({...input,previewResult:bad}),
  getCode('PREVIEW_COMPUTATION_INCOMPLETE'));
 const bad2=structuredClone(f.result);bad2.nodeRows.push({...bad2.nodeRows[0],sourceNodeOrdinal:3,
  componentType:'GASK'});
 await assert.rejects(openXml229EngineeringFactModel({...input,previewResult:bad2}));
});
test('source-only status remains unverified if purported Preview is already promoted without custody',async()=>{
 const f=await fixture();
 await assert.rejects(openXml229EngineeringFactModel({basis:f.basis,live:f.live,xmlText:XML,
  sourceId:SOURCE_ID,expectedOriginalCount:5,
  previewResult:{...f.result,engineeringAcceptance:'VERIFIED'}}),
 getCode('PREVIEW_INPUT_AUTHORITY_DRIFT'));
});
test('authentic repository Firstpass XML + staged JSON retains all original physical occurrences without inventing accepted mass',async()=>{
 const xmlText=await readFile(new URL('../Benchmarks/1885Sjson/FirstpassXML',import.meta.url),'utf8');
 const stagedSource=await readFile(new URL('../Benchmarks/1885Sjson/Sjson.json',import.meta.url),'utf8');
 assert(xmlText.length>100000);
 assert(stagedSource.length>500000);
 const sourceId='FIRSTPASS-AUTHENTIC';
 const selection=[{sourceId,selectionRef:'all'}];
 const actualMasters=structuredClone(masters);
 const actualConfig=structuredClone(config);
 const basis=await createPreviewBasis({domainId:'xml-cii/2019',
  sources:[{sourceId,mediaType:'application/xml',text:xmlText}],
  masters:actualMasters,selection,stagedSource,
  config:actualConfig,overrides:{},sha256:digestUtf8});
 const projection=projectXmlCiiOccurrences({xmlText,sourceId});
 const derived=xmlCiiDryRunPreview(xmlText,actualConfig,stagedSource);
 const result={...derived,sourceOccurrences:projection,
  engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false};
 const opened=await openXml229EngineeringFactModel({
  basis,live:{sources:{[sourceId]:xmlText},masters:actualMasters,
   selection,stagedSource,config:actualConfig,overrides:{}},
  xmlText,sourceId,previewResult:result,
  expectedOriginalCount:projection.branchCount+projection.nodeCount,
 });
 assert.equal(opened.workerResult.engineeringAcceptance,'VERIFIED');
 assert.equal(opened.expectedOriginalCount,projection.nodeCount);
 assert(opened.physicalOccurrences.length>0);
 assert.equal(opened.expectedPhysicalFactCount,
  opened.physicalOccurrences.length*XML229_ENGINEERING_FIELDS.length);
 const snap=await opened.model.getFacts({basisId:basis.basisId,
  subjectType:'physical-component',limit:100});
 assert.equal(snap.complete,true);
 assert.equal(snap.totalCount,opened.expectedPhysicalFactCount);
 assert(snap.items.every(item=>item.sourceId===sourceId));
});


test('optional INST suggestion excludes a pre-rigid first endpoint in actual producer',async()=>{
 const pair=XML.replace(
  '<Node><NodeNumber>320</NodeNumber><ComponentType>INST</ComponentType>',
  '<Node><NodeNumber>319</NodeNumber><ComponentType>INST</ComponentType>'+
  '<ComponentRefNo>1006649732/119369</ComponentRefNo><Endpoint>1</Endpoint>'+
  '<Position>550 0 0</Position><Weight>0</Weight></Node>\n'+
  '<Node><NodeNumber>320</NodeNumber><ComponentType>INST</ComponentType>');
 assert.notEqual(pair,XML);
 for(const preRigid of [false,true]){
  const xml=preRigid?pair.replace(
   '<Endpoint>1</Endpoint><Position>550 0 0</Position>',
   '<Endpoint>1</Endpoint><Rigid>2</Rigid><Position>550 0 0</Position>'):pair;
  const basis=await createPreviewBasis({domainId:'xml-cii/2019',
   sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml}],
   masters,selection,config,overrides:{},sha256:digestUtf8});
  const original=projectXmlCiiOccurrences({xmlText:xml,sourceId:SOURCE_ID});
  const preview=xmlCiiDryRunPreview(xml,config,'');
  const opened=await openXml229EngineeringFactModel({
   basis,live:{...live,sources:{[SOURCE_ID]:xml}},
   xmlText:xml,sourceId:SOURCE_ID,
   previewResult:{...preview,sourceOccurrences:original,
    engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
   expectedOriginalCount:original.branchCount+original.nodeCount,
  });
  assert.equal(opened.finalizedGeometry.instrumentModelingSuggestions.length,
   preRigid?0:1,'Only fully unclassified instrument pairs qualify');
  assert.equal(opened.finalizedGeometry.physicalOwnerCardinality.weightsAccepted,false);
 }
});


test('optional Python source revisions are accepted by actual Preview Worker without implicit kg',async()=>{
 // Two separate adjacent INST 1->2 pairs use the same source model as the
 // verified engineering producer. This runs the real companion CLI and the
 // real JS fact producer, not duplicate suggestion predicates.
 const onePair=XML.replace('<ComponentType>VALV</ComponentType>',
                           '<ComponentType>INST</ComponentType>')
  .replace('<ComponentRefNo>1006649732/119367</ComponentRefNo><Endpoint>2</Endpoint>',
           '<ComponentRefNo>1006649732/119369</ComponentRefNo><Endpoint>1</Endpoint>');
 assert.notEqual(onePair,XML);
 const secondPair='\n<Node><NodeNumber>330</NodeNumber><ComponentType>INST</ComponentType>'+
  '<ComponentRefNo>1006649732/119370</ComponentRefNo><Endpoint>1</Endpoint>'+
  '<Position>700 0 0</Position><Weight>0</Weight></Node>'+
  '\n<Node><NodeNumber>340</NodeNumber><ComponentType>INST</ComponentType>'+
  '<ComponentRefNo>1006649732/119370</ComponentRefNo><Endpoint>2</Endpoint>'+
  '<Position>830 0 0</Position><Weight>0</Weight></Node>\n';
 const original=onePair.replace('</Branch>',secondPair+'</Branch>');
 assert.notEqual(original,onePair);
 const dir=await mkdtemp(join(tmpdir(),'xml229-instrument-worker-'));
 try{
  const py=fileURLToPath(new URL(
   '../converters/scripts/xml229_instrument_source_revision.py',import.meta.url));
  const input=join(dir,'original.xml');
  await writeFile(input,original);
  for(const selected of [0,1,2]){
   const manifest=join(dir,'suggestions-'+selected+'.json');
   const revisedPath=join(dir,'revised-'+selected+'.xml');
   const receiptPath=join(dir,'receipt-'+selected+'.json');
   execFileSync('python3',[py,'inspect','--source',input,'--manifest',manifest],
    {encoding:'utf8',timeout:30000});
   const choices=JSON.parse(await readFile(manifest,'utf8'));
   assert.equal(choices.components.length,2);
   for(const item of choices.components.slice(0,selected))
    item.classification='RIGID';
   await writeFile(manifest,JSON.stringify(choices));
   execFileSync('python3',[py,'apply','--source',input,'--manifest',manifest,
    '--revised-source',revisedPath,'--receipt',receiptPath],
    {encoding:'utf8',timeout:30000});
   const xml=await readFile(revisedPath,'utf8');
   const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
   assert.equal(receipt.selectedCount,selected);
   assert.equal(receipt.remainingSuggestions,2-selected);
   assert.equal(receipt.approvalRequired,false);
   assert.equal(receipt.kilogramsAccepted,false);
   assert.equal(receipt.reusablePreviousWeightReview,selected===0);
   if(!selected)assert.equal(xml,original);
   assert.equal((xml.match(/<Rigid>2<\/Rigid>/g)||[]).length,
    (original.match(/<Rigid>2<\/Rigid>/g)||[]).length+selected);
   const basis=await createPreviewBasis({domainId:'xml-cii/2019',
    sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xml}],
    masters,selection,config,overrides:{},sha256:digestUtf8});
   const projected=projectXmlCiiOccurrences({xmlText:xml,sourceId:SOURCE_ID});
   const preview=xmlCiiDryRunPreview(xml,config,'');
   const opened=await openXml229EngineeringFactModel({
    basis,live:{...live,sources:{[SOURCE_ID]:xml}},xmlText:xml,
    sourceId:SOURCE_ID,previewResult:{...preview,sourceOccurrences:projected,
     engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
    expectedOriginalCount:projected.branchCount+projected.nodeCount});
   const geometry=opened.finalizedGeometry;
   assert.equal(geometry.instrumentModelingSuggestions.length,2-selected,
    'Worker eligibility must agree with the companion source revision');
   assert.equal(geometry.rigidEdgePromotions.length,0,
    'Worker must not auto-promote an instrument span');
   assert.equal(geometry.physicalOwnerCardinality.weightsAccepted,false);
   assert.equal(geometry.sourceXmlSha256,basis.sourceRefs[0].sha256);
   const facts=await opened.model.getFacts({basisId:basis.basisId,
    subjectType:'physical-component',limit:100});
   const mass=facts.items.filter(row=>row.fieldId==='mass.kg');
   assert.equal(mass.length,3,'one rigid plus two instrument mass owners');
   assert(mass.every(row=>row.value===null&&row.authority==='unresolved'),
    'source zero kg must not become accepted mass on selecting Rigid');
  }
 }finally{
  await rm(dir,{recursive:true,force:true});
 }
});

test('real 41-branch EF-05 Python 0/1/3/14 selections reconcile with JavaScript Worker',async()=>{
 // Actual public source, no fabricated engineering evidence or accepted kg.
 // Retest each new source revision as a NEW GC-PW basis (no old review reuse).
 const originalPath=fileURLToPath(new URL('../Benchmarks/EF-05-PRO.TEST.xml',import.meta.url));
 const originalBytes=await readFile(originalPath);
 const originalXml=originalBytes.toString('utf8');
 assert(originalXml.startsWith('\ufeff'));
 assert(originalXml.includes('<!-- Configuration information -->'));
 const cli=fileURLToPath(new URL(
  '../converters/scripts/xml229_instrument_source_revision.py',import.meta.url));
 const workspace=await mkdtemp(join(tmpdir(),'xml229-ef05-real-worker-'));
 try{
  const planPath=join(workspace,'all-pending.json');
  execFileSync('python3',[cli,'inspect','--source',originalPath,'--manifest',planPath],
   {encoding:'utf8',timeout:30000});
  const pending=JSON.parse(await readFile(planPath,'utf8'));
  assert.equal(pending.components.length,14);
  const originalTokens=(originalXml.match(/<Rigid>2<\/Rigid>/g)||[]).length;
  for(const count of [0,1,3,14]){
   const manifest=join(workspace,'review-'+count+'.json');
   const revision=join(workspace,'source-'+count+'.xml');
   const receiptPath=join(workspace,'receipt-'+count+'.json');
   const choices=structuredClone(pending);
   for(const row of choices.components.slice(0,count))
    row.classification='RIGID';
   await writeFile(manifest,JSON.stringify(choices));
   execFileSync('python3',[cli,'apply','--source',originalPath,
    '--manifest',manifest,'--revised-source',revision,'--receipt',receiptPath],
    {encoding:'utf8',timeout:30000});
   const revisedBytes=await readFile(revision);
   const xmlText=revisedBytes.toString('utf8');
   const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
   assert.equal(receipt.selectedCount,count);
   assert.equal(receipt.remainingSuggestions,14-count);
   assert.equal(receipt.sourceChanged,count>0);
   assert.equal(receipt.reusablePreviousWeightReview,count===0);
   assert.equal(receipt.kilogramsAccepted,false);
   assert.equal(receipt.engineeringApprovalVerified,false);
   assert(revisedBytes.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])));
   assert(xmlText.includes('<!-- Configuration information -->'));
   assert.equal((xmlText.match(/<Rigid>2<\/Rigid>/g)||[]).length,
    originalTokens+count);
   if(count===0)assert(revisedBytes.equals(originalBytes),
    'all 14 pending means no original XML byte changes');
   assert((await readFile(originalPath)).equals(originalBytes),
    'source must never be overwritten');
   // Fresh SHA-bound Preview / fact model on each *actual* revised source.
   const originalProjection=projectXmlCiiOccurrences({
    xmlText,sourceId:SOURCE_ID});
   const newBasis=await createPreviewBasis({domainId:'xml-cii/2019',
    sources:[{sourceId:SOURCE_ID,mediaType:'application/xml',text:xmlText}],
    masters,selection,config,overrides:{},sha256:digestUtf8});
   const preview=xmlCiiDryRunPreview(xmlText,config,'');
   const opened=await openXml229EngineeringFactModel({
    basis:newBasis,live:{...live,sources:{[SOURCE_ID]:xmlText}},
    xmlText,sourceId:SOURCE_ID,previewResult:{
     ...preview,sourceOccurrences:originalProjection,
     engineeringAcceptance:'NOT_ASSESSED',fullFactPopulationAccepted:false},
    expectedOriginalCount:
     originalProjection.branchCount+originalProjection.nodeCount});
   const g=opened.finalizedGeometry;
   assert.equal(originalProjection.branchCount,41);
   assert.equal(g.instrumentModelingSuggestions.length,14-count,
    'actual Worker must omit exactly the chosen rigid classifications');
   assert.equal(g.physicalOwnerCardinality.weightsAccepted,false);
   assert.equal(g.basisId,newBasis.basisId);
   assert.equal(g.sourceXmlSha256,newBasis.sourceRefs[0].sha256);
   // Remaining identities must match the original manifest, even across
   // the separately serialized, ordinal-preserving Worker Preview document.
   const expected=new Set(choices.components.slice(count).map(x=>
    JSON.stringify([x.branchOccurrenceIndex,x.endSourceNodeOrdinal,
     x.componentRefNo])));
   const observed=new Set(g.instrumentModelingSuggestions.map(x=>
    JSON.stringify([x.branchOccurrenceIndex,x.secondSourceNodeOrdinal,
     x.componentRefNo])));
   assert.deepEqual(observed,expected);
   // Instrument source Weight 0 is not an accepted mass; extracting the
   // originating physical facts is not a Final decision or CII release.
   // The fact-read contract caps each page at 200; verify the complete
   // full-source population through authenticated opaque-cursor paging.
   let cursor=null,pages=0;
   const mass=[];
   do{
    const page=await opened.model.getFacts({basisId:newBasis.basisId,
     subjectType:'physical-component',fieldId:'mass.kg',limit:200,cursor});
    assert.equal(page.complete,true);
    mass.push(...page.items);
    cursor=page.nextCursor;
    pages++;
    assert(pages<=10,'Full-source mass pages did not terminate');
   }while(cursor!==null);
   assert.equal(mass.length,g.physicalOwnerCardinality.distinctPhysicalPartCandidates);
   assert(mass.every(x=>x.authority==='source'||x.authority==='unresolved'));
  }
 }finally{
  await rm(workspace,{recursive:true,force:true});
 }
});

test('root and served docs producer are byte-for-byte identical',async()=>{
 const p='tabs/xml-cii-2019-standalone/integration/xml229-preview-engineering-fact-producer.mjs';
 assert.deepEqual(await readFile(new URL('../'+p,import.meta.url)),
   await readFile(new URL('../docs/'+p,import.meta.url)));
});
