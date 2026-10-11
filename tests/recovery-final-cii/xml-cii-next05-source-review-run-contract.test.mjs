// #212 NEXT-05: non-authorizing GC-PW source -> review -> final Run contract
// All masters/reviews below are deterministic NEGATIVE contract fixtures, not
// Owner-approved engineering, physical output or the missing 385-line master.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import {
  SCHEMA_VERSION, assertBasisDigest, assertContentDigest, assertCompletePopulation,
  canonicalJson, digestCanonical, digestUtf8, makeBasisRef, validateDecisionBatch,
  validateFactRecord, validateProposal, validateSnapshotRef,
} from '../../contracts/gc-pw-v1/contract.mjs';
import {
  buildXmlCiiSourceFactRecords, openPreviewFactReadModel,
} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-read-model.js';
import {
  inspectIndexedEngineeringRunAuthority, requireIndexedEngineeringRunAuthority,
  LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA,
} from '../../tabs/xml-cii-2019-standalone/integration/xml-cii-lfj-engineering-authority.js';
import { buildXmlCiiWorkflowJobFromUiState } from '../../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { buildOutputRunChecklist } from '../../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js';
import * as ports from '../../contracts/gc-pw-v1/contract.mjs';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const sha = (x) => x.repeat(64);
const SOURCE_ID = 'FirstpassXML';
const ORIGINAL_XML_SHA = 'feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38';
const ORIGINAL_JSON_SHA = '6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288';
const original = async () => {
  const xml = await readFile(new URL('../../Benchmarks/1885Sjson/FirstpassXML', import.meta.url), 'utf8');
  const json = await readFile(new URL('../../Benchmarks/1885Sjson/Sjson.json', import.meta.url), 'utf8');
  return { xml, json };
};
const negativeMaster = async ({ content='TEST-MASTER-A', mapping='TEST-MAPPING-A', revision=1 }={}) => ({
  datasetId:'NEXT05-TEST-ONLY', revision, sha256:await digestUtf8(content),
  mappingSha256:await digestUtf8(mapping),rowCount:2,
});
async function basisFor(changes={}) {
  const {xml,json}=await original();
  const master = await negativeMaster();
  return makeBasisRef({
    domainId:'xml-cii/2019',
    sourceRefs:[{sourceId:SOURCE_ID,sha256:await digestUtf8(xml),mediaType:'application/xml'}],
    selectionSha256:await digestCanonical({sourceId:SOURCE_ID,owner:'OWNER-A'}),
    stagedSourceSha256:await digestUtf8(json),
    masters:{pipingClass:master},
    configSha256:await digestCanonical({mode:'A',revision:1}),
    overridesSha256:await digestCanonical({reviewRevision:0}),
    scope:[{sourceId:SOURCE_ID,selectionRef:'OWNER-A'}],
    ...changes,
  });
}
const expected = [
  {subjectType:'node',sourceId:SOURCE_ID,occurrenceId:'branch/0/node/0'},
  {subjectType:'node',sourceId:SOURCE_ID,occurrenceId:'branch/0/node/1'},
];
function sourceProjection() {
  return {
    schemaVersion:SCHEMA_VERSION,domainId:'xml-cii/2019',
    branchCount:0,nodeCount:2,branches:[],
    nodes:expected.map((entry,i)=>({
      ...entry,nodeNumber:-1,componentType:'VALV',componentRefNo:'ref-'+i,
      endpoint:'A',provenance:[{sourceRef:SOURCE_ID,
        locator:'/Root/Branch[1]/Node['+(i+1)+']'}],
    })),
  };
}
const sourceFacts = basis => buildXmlCiiSourceFactRecords({
  basisId:basis.basisId,projection:sourceProjection(),
});
const rejects = async (f, code) => assert.rejects(f, { code });
const throws = (f, code) => assert.throws(f, { code });
function indexedRunState(basis) {
  const stagedJsonFile = new Blob(['original-selected-json-from-Firstpass']);
  const preview = Object.freeze({
    mode:'lfj-indexed-preview',status:'SOURCE_PINNED_PREVIEW_ONLY',
    sourceOnly:true,engineeringReady:false,downloadAuthorized:false,
    originalSha256:ORIGINAL_JSON_SHA,xmlSha256:ORIGINAL_XML_SHA,
    nodeWiseCsvSha256:sha('c'),evidenceTreeCsvSha256:sha('d'),
    selectionDigestSha256:basis.selectionSha256,selectedScopeId:'OWNER-A',
    xmlNodes:2,nodeWiseRows:[{nodeNumber:-1},{nodeNumber:-1}],
  });
  const receipt=Object.freeze({
    schema:'LFJ.A3.IndexedCsvReceipt.v1',preview,sourceFile:stagedJsonFile,
    originalSha256:preview.originalSha256,xmlSha256:preview.xmlSha256,
    nodeWiseCsvSha256:preview.nodeWiseCsvSha256,
    evidenceTreeCsvSha256:preview.evidenceTreeCsvSha256,
    selectionDigestSha256:preview.selectionDigestSha256,
    selectedScopeId:'OWNER-A',
  });
  return {
    resolverSourceMode:'lfj-indexed-preview',sourceKind:'xml',
    jsonTraceScopeId:'OWNER-A',stagedJsonFile,sourceFile:new Blob(['<Root/>']),
    lfjIndexedPreview:preview,lfjIndexedExportReceipt:receipt,
  };
}

test('NEXT-05 authentic untouched Firstpass source custody is content hashed, not a fabricated 30MiB positive',async()=>{
  const {xml,json}=await original();
  assert.equal(await digestUtf8(xml),ORIGINAL_XML_SHA);
  assert.equal(await digestUtf8(json),ORIGINAL_JSON_SHA);
  const basis=await basisFor();
  assert.equal(basis.sourceRefs[0].sha256,ORIGINAL_XML_SHA);
  assert.equal(basis.stagedSourceSha256,ORIGINAL_JSON_SHA);
  await assertContentDigest(xml,ORIGINAL_XML_SHA);
  await rejects(()=>assertContentDigest(xml.replace('Branch','BrancH'),ORIGINAL_XML_SHA),
    'CONTENT_DIGEST_MISMATCH');
  assert.equal((await assertBasisDigest(basis)).basisId,basis.basisId);
});
test('NEXT-05 Owner scope, staged bytes, same-length master content, map, revision, config, overrides bind separate bases',async()=>{
  const basis=await basisFor();
  const {xml,json}=await original();
  const mutations=[
    {scope:[{sourceId:SOURCE_ID,selectionRef:'OWNER-B'}]},
    {selectionSha256:await digestCanonical({sourceId:SOURCE_ID,owner:'OWNER-B'})},
    {stagedSourceSha256:await digestUtf8(json+' ')},
    {sourceRefs:[{...basis.sourceRefs[0],sha256:await digestUtf8(xml+' ')}]},
    {masters:{pipingClass:await negativeMaster({content:'TEST-MASTER-B'})}},
    {masters:{pipingClass:await negativeMaster({mapping:'TEST-MAPPING-B'})}},
    {masters:{pipingClass:await negativeMaster({revision:2})}},
    {configSha256:await digestCanonical({mode:'A',revision:2})},
    {overridesSha256:await digestCanonical({reviewRevision:1})},
  ];
  assert.equal('TEST-MASTER-A'.length,'TEST-MASTER-B'.length);
  for(const changed of mutations) {
    const next=await basisFor(changed);
    assert.notEqual(next.basisId,basis.basisId,JSON.stringify(changed));
    await assertBasisDigest(next);
    await rejects(()=>assertBasisDigest({...basis,...changed}), 'STALE_BASIS');
  }
});
test('NEXT-05 original -1 occurrences stay distinct; missing, duplicate, unselected and foreign-basis facts veto',async()=>{
  const basis=await basisFor();
  const records=sourceFacts(basis);
  assert.equal(records.filter(r=>r.fieldId==='source.occurrence').length,2);
  assert.deepEqual(records.filter(r=>r.fieldId==='source.nodeNumber').map(r=>r.value),[-1,-1]);
  assert.notEqual(records[2].occurrenceId,records[7].occurrenceId);
  const read=await openPreviewFactReadModel({basis,expectedOccurrences:expected,records,ports});
  assert.equal(read.info.expectedOccurrenceCount,2);
  assert.equal(read.info.engineeringReady,false);
  await rejects(()=>openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records:records.filter(r=>r.occurrenceId!==expected[1].occurrenceId),ports,
  }), 'INCOMPLETE_SELECTED_POPULATION');
  await rejects(()=>openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records:[...records,records[0]],ports,
  }), 'DUPLICATE_FIELD_FACT');
  await rejects(()=>openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records:[...records,
      {...records[0],occurrenceId:'branch/1/node/0'}],ports,
  }), 'UNSELECTED_OCCURRENCE');
  const other=await basisFor({scope:[{sourceId:SOURCE_ID,selectionRef:'OWNER-B'}]});
  await rejects(()=>openPreviewFactReadModel({
    basis:other,expectedOccurrences:expected,records,ports,
  }), 'CROSS_BASIS_FACT');
});
test('NEXT-05 completed page counts cannot promote source-only pages; scoped queries remain basis bound',async()=>{
  const basis=await basisFor();
  const read=await openPreviewFactReadModel({basis,expectedOccurrences:expected,records:sourceFacts(basis),ports});
  const pages=[];
  let cursor=null;
  do {
    const page=await read.getFacts({basisId:basis.basisId,limit:3,cursor});
    assert.equal(page.complete,false);
    pages.push(page);
    cursor=page.nextCursor;
  } while(cursor);
  assert.equal(pages.reduce((n,p)=>n+p.items.length,0),10);
  throws(()=>assertCompletePopulation(pages,basis.basisId,
    r=>r.sourceId+'/'+r.occurrenceId+'/'+r.fieldId,10), 'INCOMPLETE_BASIS');
  await rejects(()=>read.getFacts({basisId:sha('e')}), 'CROSS_BASIS_QUERY');
  await rejects(()=>read.getFacts({basisId:basis.basisId,cursor:JSON.stringify({offset:3})}),
    'STALE_OR_WRONG_CURSOR');
});
test('NEXT-05 unreviewed engineering proposals cannot promote Preview without mandatory fields and an external verifier',async()=>{
  const basis=await basisFor();
  const records=sourceFacts(basis);
  let called=0;
  await rejects(()=>openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records,ports,
    requiredEngineeringFields:{node:['rigid.massKg']},
    verifyEngineeringComplete:async()=>{called++;return true;},
  }), 'REQUIRED_ENGINEERING_FACT_MISSING');
  assert.equal(called,0);
  const proposed=expected.map((e,i)=>({
    schemaVersion:SCHEMA_VERSION,domainId:'xml-cii/2019',basisId:basis.basisId,
    ...e,fieldId:'rigid.massKg',value:i+1,unit:'kg',authority:'proposed',
    provenance:[{sourceRef:'TEST-MASTER-A',locator:'negative-fixture-row-'+i}],diagnostics:[],
  }));
  for(const item of proposed)validateFactRecord(item,basis.basisId);
  const model=await openPreviewFactReadModel({
    basis,expectedOccurrences:expected,records:[...records,...proposed],ports,
    requiredEngineeringFields:{node:['rigid.massKg']},
    verifyEngineeringComplete:async()=>{called++;return false;},
  });
  assert.equal(called,1);
  assert.equal(model.info.engineeringReady,false);
  assert.equal((await model.getFacts({basisId:basis.basisId})).complete,false);
});
test('NEXT-05 proposal/decision syntax never substitutes for approved Match-1 or independent Final Match-2',async()=>{
  const basis=await basisFor();
  const proposal={basisId:basis.basisId,occurrenceId:expected[0].occurrenceId,
    proposalId:'test-proposal',domainId:'xml-cii/2019',value:15,unit:'kg',
    method:'test-weight-ranker',ranking:0,qualified:false,
    eligibilityReasons:['negative unqualified fixture'],evidenceRefs:[],scoringRevision:'test-r1'};
  assert.equal(validateProposal(proposal,basis.basisId).qualified,false);
  const accept={commandId:'negative-accept',basisId:basis.basisId,
    scopeId:'OWNER-A',occurrenceId:expected[0].occurrenceId,
    expectedDecisionRevision:'rev-1',action:'accept-proposal',proposalId:'test-proposal'};
  validateDecisionBatch([accept],basis.basisId,'OWNER-A');
  throws(()=>validateDecisionBatch([accept],basis.basisId,'OWNER-B'), 'CROSS_SCOPE_DECISION');
  const s=indexedRunState(basis);
  s.weightReview={proposal,accept};
  s.rigidMatch1Approved=true;
  s.rigidMatch2Approved=true;
  throws(()=>requireIndexedEngineeringRunAuthority(s),'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
});
test('NEXT-05 Preview, Match-1 and Final Match-2 frozen snapshots have separate digests; syntax does not authenticate signoff',async()=>{
  const basis=await basisFor();
  const contents=[
    {stage:'preview',basisId:basis.basisId,value:'unreviewed-source-only'},
    {stage:'RigidMatch1',basisId:basis.basisId,value:'test-first-review'},
    {stage:'Rigidmatch2',basisId:basis.basisId,value:'test-final-review'},
  ];
  const refs=[];
  for(const content of contents) {
    const frozen={snapshotId:content.stage+'-test-1',basisId:basis.basisId,
      stage:content.stage,contentSha256:await digestCanonical(content),revision:'test-rev-1'};
    validateSnapshotRef(frozen,basis.basisId);
    refs.push(frozen);
  }
  assert.equal(new Set(refs.map(r=>r.contentSha256)).size,3);
  await rejects(()=>assertContentDigest(canonicalJson({...contents[1],value:'tampered'}),
    refs[1].contentSha256), 'CONTENT_DIGEST_MISMATCH');
  throws(()=>validateSnapshotRef({...refs[1],basisId:sha('e')},basis.basisId),
    'CROSS_BASIS_SNAPSHOT');
  throws(()=>validateSnapshotRef({...refs[2],stage:'RigidMatch3'},basis.basisId),
    'INVALID_FREEZE_STAGE');
  const s=indexedRunState(basis);
  s.previewSnapshot=refs[0];s.rigidWeightMatch1Snapshot=refs[1];s.finalMatch2Snapshot=refs[2];
  throws(()=>requireIndexedEngineeringRunAuthority(s),'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
});
test('NEXT-05 forged self-declared LFJ product receipt, and original file/scope drift, fail at real Run and checklist',async()=>{
  const basis=await basisFor();
  const s=indexedRunState(basis);
  assert.equal(inspectIndexedEngineeringRunAuthority(s).code,'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
  s.lfjEngineeringSourceBasis=Object.freeze({
    schema:LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA,
    originalSha256:s.lfjIndexedPreview.originalSha256,
    xmlSha256:s.lfjIndexedPreview.xmlSha256,selectedScopeId:'OWNER-A',
    selectionDigestSha256:s.lfjIndexedPreview.selectionDigestSha256,
    xmlNodes:2,engineeringReady:true,
  });
  throws(()=>requireIndexedEngineeringRunAuthority(s),'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
  const checklist=buildOutputRunChecklist(s);
  const authority=checklist.find(row=>row.id==='lfj-engineering-authority');
  assert.equal(authority?.blocking,true);
  await rejects(()=>buildXmlCiiWorkflowJobFromUiState(s),'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
  for(const drift of [
    {...s,stagedJsonFile:new Blob(['forged-same-shape'])},
    {...s,jsonTraceScopeId:'OWNER-B'},
    {...s,lfjIndexedExportReceipt:Object.freeze({...s.lfjIndexedExportReceipt,xmlSha256:sha('e')})},
  ]) {
    throws(()=>requireIndexedEngineeringRunAuthority(drift),'LFJ_ENGINEERING_SOURCE_DRIFT');
    await rejects(()=>buildXmlCiiWorkflowJobFromUiState(drift),'LFJ_ENGINEERING_SOURCE_DRIFT');
  }
});