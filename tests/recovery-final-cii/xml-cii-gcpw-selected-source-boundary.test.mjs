import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { ALL_SCOPE_ID, buildJsonHierarchyScopeIndex, materializeJsonHierarchyScope }
  from '../../tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js';
import { createPreviewButtonBasis }
  from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-button-session.js';
import { buildXmlCiiSourceFactRecords, openPreviewFactReadModel }
  from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-read-model.js';
import { executeXmlCiiPreviewLocally, PREVIEW_LOCAL_PROTOCOL }
  from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-local-execution.js';
import { inspectIndexedEngineeringRunAuthority, requireIndexedEngineeringRunAuthority,
  LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA }
  from '../../tabs/xml-cii-2019-standalone/integration/xml-cii-lfj-engineering-authority.js';
import { buildBoundedOriginalXmlSourceFacts }
  from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-source-fact-handoff.mjs';
import * as ports from '../../contracts/gc-pw-v1/contract.mjs';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const hex = c => c.repeat(64);
const config = () => ({
  linelist:{masterRows:[{Line:'A-1'}],fieldMap:{lineSeqNo:'Line'},revision:'1'},
  pipingClass:{masterRows:[{Code:'PC-1'}],revision:'1'},
  material:{mapRows:[{Code:'MAT-1'}],revision:'1'},
  weight:{masterRows:[{Weight:2}],revision:'1'},
  overrides:{}
});
const originalJson = JSON.stringify([
  {type:'SITE',name:'OWNER-A',children:[{type:'BRANCH',name:'A-1',NodeNumber:-1}]},
  {type:'SITE',name:'OWNER-B',children:[{type:'BRANCH',name:'B-1',NodeNumber:-1}]}
]);
const previewBasis = (changes={}) => createPreviewButtonBasis({
  xmlText:'<Root><Branch><NodeNumber>-1</NodeNumber></Branch></Root>',
  stagedJsonText:originalJson,sourceId:'source-firstpass',config:config(),...changes
});
function fakeWorker() {
  const events = new Map();
  let dispatched, terminated=false;
  return {
    addEventListener(kind,fn){events.set(kind,fn);},
    removeEventListener(kind){events.delete(kind);},
    postMessage(value){dispatched=value;},
    terminate(){terminated=true;},
    send(value){events.get('message')?.({data:value});},
    get dispatched(){return dispatched;},
    get terminated(){return terminated;}
  };
}
function indexedState() {
  const sourceFile=new Blob(['original-owner-json']);
  const preview=Object.freeze({
    mode:'lfj-indexed-preview',status:'SOURCE_PINNED_PREVIEW_ONLY',
    sourceOnly:true,engineeringReady:false,downloadAuthorized:false,
    originalSha256:hex('a'),xmlSha256:hex('b'),
    nodeWiseCsvSha256:hex('c'),evidenceTreeCsvSha256:hex('d'),
    selectedScopeId:'OWNER-A',selectionDigestSha256:hex('e'),
    xmlNodes:2,nodeWiseRows:[{xmlNodeNumber:-1},{xmlNodeNumber:-1}]
  });
  const receipt=Object.freeze({
    schema:'LFJ.A3.IndexedCsvReceipt.v1',preview,sourceFile,
    originalSha256:preview.originalSha256,xmlSha256:preview.xmlSha256,
    nodeWiseCsvSha256:preview.nodeWiseCsvSha256,
    evidenceTreeCsvSha256:preview.evidenceTreeCsvSha256,
    selectedScopeId:'OWNER-A',selectionDigestSha256:preview.selectionDigestSha256
  });
  return {resolverSourceMode:'lfj-indexed-preview',
    jsonTraceScopeId:'OWNER-A',lfjIndexedPreview:preview,
    lfjIndexedExportReceipt:receipt,stagedJsonFile:sourceFile};
}
test('NEXT-02 selected Owner scope never silently resolves to ALL for unknown or nonindexable JSON',()=>{
  const index=buildJsonHierarchyScopeIndex(originalJson);
  assert.deepEqual(index.scopes.map(s=>s.id),['OWNER-A','OWNER-B']);
  const selected=materializeJsonHierarchyScope(originalJson,index,'OWNER-A');
  assert.equal(selected.scopeId,'OWNER-A');
  assert.equal(selected.value.length,1);
  assert.throws(()=>materializeJsonHierarchyScope(originalJson,index,'UNKNOWN-OWNER'),
    /unknown.*scope/i);
  const nonindexable=JSON.stringify({type:'SITE',name:'OWNER-A',payload:{NodeNumber:-1}});
  const bad=buildJsonHierarchyScopeIndex(nonindexable);
  assert.equal(bad.indexable,false);
  assert.throws(()=>materializeJsonHierarchyScope(nonindexable,bad,'OWNER-A'),
    /not indexable|unsupported.*scope|cannot.*scope/i);
  assert.equal(materializeJsonHierarchyScope(originalJson,index,ALL_SCOPE_ID).value.length,2);
});
test('NEXT-02 actual Preview button Basis still selects ALL; this is a documented BLOCKED selected-Owner boundary, not a PASS',async()=>{
  const basis=await previewBasis();
  assert.equal(basis.schemaVersion,'gc-pw/1.0');
  assert.deepEqual(basis.scope,[{sourceId:'source-firstpass',selectionRef:'ALL'}]);
  assert.equal(basis.masters.linelist.rowCount,1);
  const source=await readFile(new URL('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-worker-entry.js',import.meta.url),'utf8');
  assert.match(source,/SCOPED_ENGINEERING_PENDING/);
  assert.match(source,/request\.scope\?\.selection != null/);
});
test('NEXT-02 InputBasis changes on original XML, JSON, master CONTENT and configuration revisions',async()=>{
  const first=await previewBasis();
  const same=await previewBasis();
  assert.equal(first.basisId,same.basisId);
  const editedXml=await previewBasis({xmlText:'<Root><Branch><NodeNumber>7</NodeNumber></Branch></Root>'});
  const editedJson=await previewBasis({stagedJsonText:originalJson+' '});
  const cfg1=config();cfg1.linelist.masterRows[0].Line='B-1';
  const editedMaster=await previewBasis({config:cfg1});
  const cfg2=config();cfg2.linelist.fieldMap.lineSeqNo='Other';
  const editedMap=await previewBasis({config:cfg2});
  const cfg3=config();cfg3.overrides={revision:2};
  const editedOverrides=await previewBasis({config:cfg3});
  for(const other of [editedXml,editedJson,editedMaster,editedMap,editedOverrides])
    assert.notEqual(first.basisId,other.basisId);
  await ports.assertBasisDigest(first);
  await assert.rejects(()=>ports.assertBasisDigest({...first,configSha256:hex('9')}),{code:'STALE_BASIS'});
});
test('NEXT-02 source FactRecords preserve independent occurrence identity even with repeated -1',async()=>{
  const basis=await previewBasis();
  const projection={schemaVersion:'gc-pw/1.0',domainId:'xml-cii/2019',
    branchCount:0,nodeCount:2,branches:[],nodes:[
      {subjectType:'node',sourceId:'source-firstpass',occurrenceId:'branch/0/node/0',
        provenance:[{sourceRef:'source-firstpass',locator:'/Root/Branch[1]/Node[1]'}],
        nodeNumber:-1,componentType:'Rigid',componentRefNo:'A',endpoint:'A'},
      {subjectType:'node',sourceId:'source-firstpass',occurrenceId:'branch/0/node/1',
        provenance:[{sourceRef:'source-firstpass',locator:'/Root/Branch[1]/Node[2]'}],
        nodeNumber:-1,componentType:'Rigid',componentRefNo:'B',endpoint:'B'},
    ]};
  const records=buildXmlCiiSourceFactRecords({basisId:basis.basisId,projection});
  const ids=records.filter(r=>r.fieldId==='source.nodeNumber');
  assert.deepEqual(ids.map(r=>r.value),[-1,-1]);
  assert.deepEqual(ids.map(r=>r.occurrenceId),['branch/0/node/0','branch/0/node/1']);
  assert.notEqual(ids[0].provenance[0].locator,ids[1].provenance[0].locator);
  const expectedOccurrences=projection.nodes.map(({subjectType,sourceId,occurrenceId})=>
    ({subjectType,sourceId,occurrenceId}));
  const read=await openPreviewFactReadModel({basis,expectedOccurrences,records,ports});
  assert.equal(read.info.engineeringReady,false);
  assert.equal(read.info.computationStage,'source-custody-only');
  assert.equal(read.info.expectedOccurrenceCount,2);
  const page=await read.getFacts({basisId:basis.basisId});
  assert.equal(page.complete,false);
  await assert.rejects(()=>read.getFacts({basisId:hex('f')}),{code:'CROSS_BASIS_QUERY'});
  await assert.rejects(()=>openPreviewFactReadModel({
    basis,expectedOccurrences,records:records.filter(r=>r.occurrenceId!=='branch/0/node/1'),
    ports}),{code:'INCOMPLETE_SELECTED_POPULATION'});
});
test('NEXT-02 local Worker transport rejects false full physical acceptance and stale basis',async()=>{
  const first=fakeWorker();
  const args={requestId:'next-02',basisId:hex('a'),xmlText:'<Root/>',config:config(),
    createWorker:()=>first};
  const job=executeXmlCiiPreviewLocally(args);
  assert.equal(first.dispatched.kind,'execute');
  first.send({protocol:PREVIEW_LOCAL_PROTOCOL,requestId:'next-02',basisId:hex('a'),
    state:'completed',result:{branchRows:[],nodeRows:[],sourceOccurrences:{nodeCount:0},
      fullFactPopulationAccepted:true}});
  await assert.rejects(job.promise,{code:'INCOMPLETE_WORKER_RESULT'});
  assert.equal(first.terminated,true);
  const second=fakeWorker();
  const stale=executeXmlCiiPreviewLocally({...args,createWorker:()=>second});
  second.send({protocol:PREVIEW_LOCAL_PROTOCOL,requestId:'next-02',basisId:hex('b'),
    state:'completed',result:{}});
  await assert.rejects(stale.promise,{code:'CORRUPT_WORKER_RESPONSE'});
});
test('NEXT-02 typed scoped Worker failure is propagated, not converted into ALL result',async()=>{
  const worker=fakeWorker();
  const job=executeXmlCiiPreviewLocally({
    requestId:'scope-boundary',basisId:hex('a'),xmlText:'<Root/>',
    stagedJsonText:originalJson,config:config(),scope:{selection:'OWNER-A'},
    createWorker:()=>worker
  });
  assert.equal(worker.dispatched.scope.selection,'OWNER-A');
  // Transport characterization of the actual Worker error code. The current
  // Worker source condition is separately checked above; no mock claims physical compute.
  worker.send({protocol:PREVIEW_LOCAL_PROTOCOL,requestId:'scope-boundary',basisId:hex('a'),
    state:'failed',error:{code:'SCOPED_ENGINEERING_PENDING',message:'Selected scope needs B1 adapter'}});
  await assert.rejects(job.promise,{code:'SCOPED_ENGINEERING_PENDING'});
});
test('NEXT-02 LFJ original ledger keeps -1 display values with separate JSON paths/ordinals',()=>{
  const records=[
    {xmlIndex:1,xmlNodeNumber:-1,xmlBranch:'B1',status:'RESOLVED_POS',matchType:'POS',
      sourcePaths:['$[0].children[0]'],positionMembers:[{jsonNodeNo:-1,sourcePath:'$[0].children[0]',sourceOrdinal:21}]},
    {xmlIndex:2,xmlNodeNumber:-1,xmlBranch:'B1',status:'RESOLVED_POS_PS',matchType:'POS_PS',
      sourcePaths:['$[0].children[1]'],positionMembers:[{jsonNodeNo:-1,sourcePath:'$[0].children[1]',sourceOrdinal:22}]}
  ];
  const result=buildBoundedOriginalXmlSourceFacts(records);
  assert.equal(result.available,true);
  assert.equal(result.code,'LFJ_SOURCE_ONLY_FACTS');
  assert.deepEqual(result.records.map(r=>r.xmlNodeNumber),[-1,-1]);
  assert.deepEqual(result.records.map(r=>r.sourceOccurrences[0].sourceOrdinal),[21,22]);
  assert.deepEqual(result.records.map(r=>r.sourcePaths[0]),['$[0].children[0]','$[0].children[1]']);
  assert.equal(buildBoundedOriginalXmlSourceFacts(records.slice(1)).code,'LFJ_FACT_XML_ORDER');
});
test('NEXT-02 valid source-only LFJ CSVs and forged approval cannot authorize indexed final Run',()=>{
  const state=indexedState();
  assert.equal(inspectIndexedEngineeringRunAuthority(state).code,'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
  state.lfjEngineeringSourceBasis={schema:LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA,
    originalSha256:state.lfjIndexedPreview.originalSha256,
    xmlSha256:state.lfjIndexedPreview.xmlSha256,selectedScopeId:'OWNER-A',
    selectionDigestSha256:state.lfjIndexedPreview.selectionDigestSha256,
    xmlNodes:2,engineeringReady:true};
  assert.throws(()=>requireIndexedEngineeringRunAuthority(state),
    {code:'LFJ_ENGINEERING_FACTS_NOT_ATTESTED'});
  assert.equal(inspectIndexedEngineeringRunAuthority({...state,jsonTraceScopeId:'OWNER-B'}).code,
    'LFJ_ENGINEERING_SOURCE_DRIFT');
});
