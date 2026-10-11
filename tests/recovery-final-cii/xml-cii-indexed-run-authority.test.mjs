import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA,
  inspectIndexedEngineeringRunAuthority,
  requireIndexedEngineeringRunAuthority,
} from '../../tabs/xml-cii-2019-standalone/integration/xml-cii-lfj-engineering-authority.js';
import { buildOutputRunChecklist } from '../../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js';
import { buildXmlCiiWorkflowJobFromUiState } from '../../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';

const hex = n => String(n).repeat(64);
function fixture() {
  const stagedJsonFile = new Blob(['{"foo":1}']);
  const preview=Object.freeze({
    mode:'lfj-indexed-preview',
    status:'SOURCE_PINNED_PREVIEW_ONLY',sourceOnly:true,
    engineeringReady:false,downloadAuthorized:false,
    originalSha256:hex('a'),xmlSha256:hex('b'),
    nodeWiseCsvSha256:hex('c'),evidenceTreeCsvSha256:hex('d'),
    selectedScopeId:'Owner-A',selectionDigestSha256:hex('e'),
    xmlNodes:1,nodeWiseRows:[{xmlNode:'-1'}]
  });
  const receipt=Object.freeze({
    schema:'LFJ.A3.IndexedCsvReceipt.v1',
    preview,sourceFile:stagedJsonFile,
    originalSha256:preview.originalSha256,
    xmlSha256:preview.xmlSha256,
    nodeWiseCsvSha256:preview.nodeWiseCsvSha256,
    evidenceTreeCsvSha256:preview.evidenceTreeCsvSha256,
    selectedScopeId:'Owner-A',selectionDigestSha256:preview.selectionDigestSha256,
  });
  return {resolverSourceMode:'lfj-indexed-preview',
    stagedJsonFile,jsonTraceScopeId:'Owner-A',
    lfjIndexedPreview:preview,lfjIndexedExportReceipt:receipt,
    sourceKind:'xml',sourceFile: new Blob(['<R/>'])};
}
test('212-T4 legacy non-indexed workflow remains outside LFJ receipt policy',()=>{
  assert.deepEqual(inspectIndexedEngineeringRunAuthority({resolverSourceMode:'legacy'}),{
    applicable:false,ready:true,code:'LFJ_LEGACY_MODE'
  });
  assert.doesNotThrow(()=>requireIndexedEngineeringRunAuthority({}));
});
test('212-T4 indexed mode never treats absent research Build as engineering authority',()=>{
  assert.equal(inspectIndexedEngineeringRunAuthority({resolverSourceMode:'lfj-indexed-preview'}).code,
    'LFJ_ENGINEERING_BUILD_REQUIRED');
});
test('212-T4 valid original indexed CSV receipt does not grant CII authority',()=>{
  const s=fixture();
  assert.equal(inspectIndexedEngineeringRunAuthority(s).code,
    'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
  assert.throws(()=>requireIndexedEngineeringRunAuthority(s),
    {code:'LFJ_ENGINEERING_FACTS_NOT_ATTESTED'});
});
test('212-T4 fake flags and self-declared engineering basis cannot promote research result',()=>{
  const s=fixture();
  s.lfjEngineeringSourceBasis={
    schema:LFJ_ENGINEERING_SOURCE_BASIS_SCHEMA,
    originalSha256:s.lfjIndexedPreview.originalSha256,
    xmlSha256:s.lfjIndexedPreview.xmlSha256,
    selectedScopeId:s.jsonTraceScopeId,
    selectionDigestSha256:s.lfjIndexedPreview.selectionDigestSha256,
    xmlNodes:s.lfjIndexedPreview.xmlNodes,
    engineeringReady:true,
  };
  assert.equal(inspectIndexedEngineeringRunAuthority(s).code,
    'LFJ_ENGINEERING_FACTS_NOT_ATTESTED');
});
test('212-T4 source File swap and wrong selected owner are independently vetoed',()=>{
  const s=fixture();
  assert.equal(inspectIndexedEngineeringRunAuthority({...s,stagedJsonFile:new Blob(['same?'])}).code,
    'LFJ_ENGINEERING_SOURCE_DRIFT');
  assert.equal(inspectIndexedEngineeringRunAuthority({...s,jsonTraceScopeId:'Owner-B'}).code,
    'LFJ_ENGINEERING_SOURCE_DRIFT');
});
test('212-T4 actual Run checklist has blocking indexed authority row but not legacy',()=>{
  const indexed=buildOutputRunChecklist(fixture());
  const row=indexed.find(x=>x.id==='lfj-engineering-authority');
  assert.equal(row?.blocking,true);
  assert.equal(row?.severity,'error');
  assert.equal(buildOutputRunChecklist({sourceKind:'xml'}).some(x=>x.id==='lfj-engineering-authority'),false);
});
test('212-T4 real final-job builder refuses unapproved indexed facts before reading original JSON',async()=>{
  const s=fixture();
  await assert.rejects(()=>buildXmlCiiWorkflowJobFromUiState(s),
    {code:'LFJ_ENGINEERING_FACTS_NOT_ATTESTED'});
});
